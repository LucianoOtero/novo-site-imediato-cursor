# -*- coding: utf-8 -*-
"""Etapa 4 do teste de fidelidade RPA — compara local vs. site.

OBJETIVO DO TESTE (revisado 2026-07-17): verificar se, nas DUAS execucoes do
RPA (local e site), o fluxo percorre todas as etapas e apresenta o calculo
final — NAO comparar igualdade de valores. A diferenca de valor entre as
pontas e ESPERADA e legitima: quando o site envia poucos campos, o backend
estima o perfil (PH3A pelo CPF + defaults) e o premio muda; esses dados so
sao confirmados na formalizacao da proposta.

Cruza `resultado_local.json` (bateria do motor) com `resultado_site.json`
(bateria do Playwright no site novo) por `id` e classifica cada caso:

  - CALCULO_OK_AMBOS  : as duas pontas chegaram ao calculo final (status
                        success) — ALVO do teste.
  - MANUAL_AMBOS      : as duas cairam em calculo manual (comportamento
                        consistente, mas sem calculo final nos dois).
  - DIVERGENTE_STATUS : uma apresentou o calculo e a outra caiu em manual
                        (infidelidade de percurso).
  - FALHA_EXECUCAO    : erro/infra/timeout/bloqueio/nao executado numa ponta.

Os valores (recomendado/alternativo) sao gravados apenas como INFORMATIVO.

Gera `relatorio_fidelidade.md` + `.csv`.

Uso:
    python scripts/comparar_resultados.py
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parent.parent
RPA_ROOT = SITE_ROOT.parent / "imediatoseguros-rpa-playwright"
DATA_DIR = RPA_ROOT / "data" / "renovacao_teste_site_luciano"

LOCAL_JSON = DATA_DIR / "resultado_local.json"
SITE_JSON = DATA_DIR / "resultado_site.json"
OUT_MD = DATA_DIR / "relatorio_fidelidade.md"
OUT_CSV = DATA_DIR / "relatorio_fidelidade.csv"

# Desfechos de calculo.
STATUS_MANUAL = {"cotacao_manual"}
STATUS_SUCCESS = {"success"}
# Falhas de execucao (nao e desfecho de calculo). `erro_infra` = o site nao
# conseguiu nem chamar o RPA (ex.: start sem session_id) — nao e calculo manual.
STATUS_FALHA = {"erro", "erro_infra", "timeout", "bloqueado_site", "nao_executado"}

# Categorias consideradas fieis ao objetivo (percurso consistente).
CALCULO_OK = "CALCULO_OK_AMBOS"
MANUAL_AMBOS = "MANUAL_AMBOS"
DIVERGENTE_STATUS = "DIVERGENTE_STATUS"
FALHA = "FALHA_EXECUCAO"
CATEGORIAS = [CALCULO_OK, MANUAL_AMBOS, DIVERGENTE_STATUS, FALHA]


def normalizar_valor(v: str | None) -> str | None:
    """Normaliza um valor monetario para comparacao INFORMATIVA (nao pass/fail)."""
    if not v:
        return None
    s = re.sub(r"[^\d,.]", "", str(v))
    if not s:
        return None
    s = s.replace(".", "").replace(",", ".")
    try:
        return f"{float(s):.2f}"
    except ValueError:
        return None


def load(path: Path) -> dict:
    if not path.exists():
        raise SystemExit(f"Arquivo nao encontrado: {path}. Rode as etapas anteriores.")
    return json.loads(path.read_text(encoding="utf-8"))


def index_por_id(db: dict) -> dict[str, dict]:
    return {c["id"]: c for c in db.get("casos", [])}


def classificar(local: dict | None, site: dict | None) -> tuple[str, str]:
    if local is None or site is None:
        falta = "local" if local is None else "site"
        return FALHA, f"Sem resultado na ponta {falta}"

    ls = local.get("status")
    ss = site.get("status")

    if ls in STATUS_FALHA or ss in STATUS_FALHA:
        return FALHA, f"local={ls} / site={ss}"

    local_ok = ls in STATUS_SUCCESS
    site_ok = ss in STATUS_SUCCESS
    local_manual = ls in STATUS_MANUAL
    site_manual = ss in STATUS_MANUAL

    if local_ok and site_ok:
        # Ambos apresentaram o calculo final. Valores sao so informativos.
        rec_l = normalizar_valor(local.get("valor_recomendado"))
        rec_s = normalizar_valor(site.get("valor_recomendado"))
        iguais = rec_l == rec_s
        nota = "valores iguais" if iguais else f"valores diferentes (esperado): local={rec_l} site={rec_s}"
        return CALCULO_OK, nota

    if local_manual and site_manual:
        return MANUAL_AMBOS, "Ambos cairam em calculo manual"

    return DIVERGENTE_STATUS, f"local={ls} / site={ss}"


def main() -> None:
    local_db = load(LOCAL_JSON)
    site_db = load(SITE_JSON)
    local_idx = index_por_id(local_db)
    site_idx = index_por_id(site_db)

    ids = sorted(set(local_idx) | set(site_idx))

    linhas = []
    contagem: dict[str, int] = {c: 0 for c in CATEGORIAS}
    comparaveis = 0

    for cid in ids:
        loc = local_idx.get(cid)
        sit = site_idx.get(cid)
        categoria, detalhe = classificar(loc, sit)
        contagem[categoria] = contagem.get(categoria, 0) + 1
        if categoria != FALHA:
            comparaveis += 1
        linhas.append(
            {
                "id": cid,
                "ramo": (loc or sit or {}).get("ramo"),
                "categoria": categoria,
                "status_local": (loc or {}).get("status"),
                "status_site": (sit or {}).get("status"),
                "valor_rec_local": (loc or {}).get("valor_recomendado"),
                "valor_rec_site": (sit or {}).get("valor_recomendado"),
                "valor_alt_local": (loc or {}).get("valor_alternativo"),
                "valor_alt_site": (sit or {}).get("valor_alternativo"),
                "detalhe": detalhe,
            }
        )

    calculo_ok = contagem[CALCULO_OK]
    paridade = contagem[CALCULO_OK] + contagem[MANUAL_AMBOS]
    pct_calculo = (100.0 * calculo_ok / comparaveis) if comparaveis else 0.0
    pct_paridade = (100.0 * paridade / comparaveis) if comparaveis else 0.0

    # CSV
    campos = [
        "id",
        "ramo",
        "categoria",
        "status_local",
        "status_site",
        "valor_rec_local",
        "valor_rec_site",
        "valor_alt_local",
        "valor_alt_site",
        "detalhe",
    ]
    with OUT_CSV.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(linhas)

    # Markdown
    md = []
    md.append("# Relatorio de fidelidade RPA — local vs. site novo")
    md.append("")
    md.append("Objetivo: confirmar que as DUAS execucoes (local e site) percorrem")
    md.append("todas as etapas e apresentam o calculo final. A igualdade de valores")
    md.append("NAO e criterio — a diferenca de valor e esperada (o site estima parte")
    md.append("do perfil quando o payload e minimo; confirmado na formalizacao).")
    md.append("")
    md.append(f"- Casos comparados (excl. falhas): **{comparaveis}**")
    md.append(f"- **Calculo final apresentado nas duas pontas: {calculo_ok} ({pct_calculo:.1f}%)**")
    md.append(f"- Paridade de desfecho (calculo em ambos OU manual em ambos): {paridade} ({pct_paridade:.1f}%)")
    md.append("")
    md.append("## Resumo por categoria")
    md.append("")
    md.append("| Categoria | Qtde |")
    md.append("|---|---:|")
    for cat in CATEGORIAS:
        md.append(f"| {cat} | {contagem.get(cat, 0)} |")
    md.append("")
    md.append("> Os valores recomendado/alternativo abaixo sao **informativos**.")
    md.append("> Diferencas de valor entre local e site sao esperadas: quando o site")
    md.append("> envia poucos campos, o backend estima o perfil (PH3A + defaults).")
    md.append("")
    md.append("## Detalhe por caso")
    md.append("")
    md.append("| id | ramo | categoria | local | site | rec local | rec site | alt local | alt site |")
    md.append("|---|---|---|---|---|---|---|---|---|")
    for linha in linhas:
        md.append(
            "| {id} | {ramo} | {categoria} | {status_local} | {status_site} | "
            "{valor_rec_local} | {valor_rec_site} | {valor_alt_local} | {valor_alt_site} |".format(
                **{k: (v if v is not None else "") for k, v in linha.items()}
            )
        )
    md.append("")
    OUT_MD.write_text("\n".join(md), encoding="utf-8")

    print("OK")
    print(f"comparaveis={comparaveis}")
    print(f"calculo_final_ambos={calculo_ok} ({pct_calculo:.1f}%)")
    print(f"paridade_desfecho={paridade} ({pct_paridade:.1f}%)")
    print(f"contagem={contagem}")
    print(f"gravado: {OUT_MD}")
    print(f"gravado: {OUT_CSV}")


if __name__ == "__main__":
    main()
