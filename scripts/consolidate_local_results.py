# -*- coding: utf-8 -*-
"""Consolida os resultados da bateria local do RPA (Etapa 2).

Le o manifesto selecao_50.json e, para cada caso, coleta de
`imediatoseguros-rpa-playwright/rpa_data/`:
  - result_ren_<id>.json  (dados_finais / status)
  - progress_ren_<id>.json (mensagem final; deteccao de cotacao manual)

Gera resultado_local.json + resultado_local.csv (uma linha por caso) com:
  status normalizado (success | cotacao_manual | erro | nao_executado),
  valores dos planos recomendado/alternativo e coberturas principais.

Uso:
    python scripts/consolidate_local_results.py
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parent.parent
RPA_ROOT = SITE_ROOT.parent / "imediatoseguros-rpa-playwright"
DATA_DIR = RPA_ROOT / "data" / "renovacao_teste_site_luciano"
MANIFEST = DATA_DIR / "selecao_50.json"
RPA_DATA = RPA_ROOT / "rpa_data"

OUT_JSON = DATA_DIR / "resultado_local.json"
OUT_CSV = DATA_DIR / "resultado_local.csv"

MANUAL_KEYWORDS = ("cotação manual", "cotacao manual", "manual necess")


def classificar(result: dict | None, progress: dict | None) -> str:
    """Normaliza o status: success | cotacao_manual | erro | nao_executado."""
    if result is None and progress is None:
        return "nao_executado"

    msg = ""
    status_prog = ""
    if progress:
        msg = str(progress.get("mensagem", "")).lower()
        status_prog = str(progress.get("status", "")).lower()
    status_res = str((result or {}).get("status", "")).lower()

    if any(k in msg for k in MANUAL_KEYWORDS):
        return "cotacao_manual"
    if status_res in ("cotacao_manual",):
        return "cotacao_manual"
    if status_res == "success":
        return "success"
    if status_prog == "success":
        return "success"
    if status_res in ("error", "erro", "failed", "failure") or status_prog in ("error", "erro"):
        # Sem palavra-chave de manual: erro genérico.
        return "erro"
    return "erro" if (result or progress) else "nao_executado"


def plano_resumo(plano: dict | None) -> dict:
    if not isinstance(plano, dict):
        return {}
    return {
        "valor": plano.get("valor"),
        "forma_pagamento": plano.get("forma_pagamento"),
        "valor_franquia": plano.get("valor_franquia"),
        "tipo_franquia": plano.get("tipo_franquia"),
        "valor_mercado": plano.get("valor_mercado"),
        "assistencia": plano.get("assistencia"),
        "vidros": plano.get("vidros"),
        "carro_reserva": plano.get("carro_reserva"),
        "danos_materiais": plano.get("danos_materiais"),
        "danos_corporais": plano.get("danos_corporais"),
        "danos_morais": plano.get("danos_morais"),
        "morte_invalidez": plano.get("morte_invalidez"),
    }


def load_json(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return None


def main() -> None:
    if not MANIFEST.exists():
        raise SystemExit(f"Manifesto nao encontrado: {MANIFEST}")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    linhas = []
    contagem = {"success": 0, "cotacao_manual": 0, "erro": 0, "nao_executado": 0}

    for caso in manifest["casos"]:
        cid = caso["id"]
        session = caso["session_id"]
        result = load_json(RPA_DATA / f"result_{session}.json")
        progress = load_json(RPA_DATA / f"progress_{session}.json")

        status = classificar(result, progress)
        contagem[status] = contagem.get(status, 0) + 1

        dados_finais = (result or {}).get("dados_finais") or {}
        recomendado = plano_resumo(dados_finais.get("plano_recomendado"))
        alternativo = plano_resumo(dados_finais.get("plano_alternativo"))

        linhas.append(
            {
                "id": cid,
                "session_id": session,
                "ramo": caso.get("ramo"),
                "tipo_veiculo": caso.get("tipo_veiculo"),
                "placa": caso.get("formFields", {}).get("placa"),
                "status": status,
                "cotacao_manual": status == "cotacao_manual",
                "mensagem": (progress or {}).get("mensagem"),
                "valor_recomendado": recomendado.get("valor"),
                "valor_alternativo": alternativo.get("valor"),
                "plano_recomendado": recomendado,
                "plano_alternativo": alternativo,
            }
        )

    out = {
        "meta": {
            "fonte": "execucao local (motor RPA)",
            "n": len(linhas),
            "contagem": contagem,
        },
        "casos": linhas,
    }
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    campos = [
        "id",
        "session_id",
        "ramo",
        "tipo_veiculo",
        "placa",
        "status",
        "cotacao_manual",
        "valor_recomendado",
        "valor_alternativo",
        "mensagem",
    ]
    with OUT_CSV.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore")
        writer.writeheader()
        for linha in linhas:
            writer.writerow(linha)

    print("OK")
    print(f"casos: {len(linhas)} | contagem: {contagem}")
    print(f"gravado: {OUT_JSON}")
    print(f"gravado: {OUT_CSV}")


if __name__ == "__main__":
    main()
