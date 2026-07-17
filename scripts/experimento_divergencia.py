# -*- coding: utf-8 -*-
"""Isola a causa da divergencia local vs. site chamando o backend RPA direto.

Para o MESMO caso, dispara duas execucoes no backend
`rpaimediatoseguros.com.br/api/rpa/start` e compara os valores finais:

  A) payload MINIMO  = os 7 campos que o site novo envia hoje (buildRpaPayload)
  B) payload COMPLETO = o parametros.json completo do caso (como a bateria local)

Se B reproduzir o valor local (e A nao), a causa e a assimetria de payload
(o site manda pouco e o backend reconstroi o resto com defaults proprios).

NAO modifica o backend/motor — apenas o chama (mesmo endpoint do site).

Uso:
    python scripts/experimento_divergencia.py --id ren-002-marcelo-jose-da-silva
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import requests

SITE_ROOT = Path(__file__).resolve().parent.parent
RPA_ROOT = SITE_ROOT.parent / "imediatoseguros-rpa-playwright"
DATA_DIR = RPA_ROOT / "data" / "renovacao_teste_site_luciano"
MANIFEST = DATA_DIR / "selecao_50.json"
PARAMS_DIR = DATA_DIR / "parametros"
OUT = DATA_DIR / "experimento_divergencia.json"

BASE_URL = "https://rpaimediatoseguros.com.br"
POLL_INTERVAL_S = 2
MAX_POLLS = 300  # 10 min


def achar_planos(obj, achados=None):
    """Busca recursiva por plano_recomendado/plano_alternativo em qualquer nivel."""
    if achados is None:
        achados = {}
    if isinstance(obj, dict):
        for chave in ("plano_recomendado", "plano_alternativo"):
            if chave in obj and isinstance(obj[chave], dict) and "valor" in obj[chave]:
                achados.setdefault(chave, obj[chave])
        for v in obj.values():
            achar_planos(v, achados)
    elif isinstance(obj, list):
        for v in obj:
            achar_planos(v, achados)
    return achados


def executar(nome: str, payload: dict) -> dict:
    print(f"\n=== Cenario {nome}: POST /api/rpa/start ({len(payload)} campos) ===")
    r = requests.post(f"{BASE_URL}/api/rpa/start", json=payload, timeout=30)
    r.raise_for_status()
    body = r.json()
    session_id = body.get("session_id") or body.get("sessionId")
    print(f"  start http={r.status_code} success={body.get('success')} session_id={session_id}")
    if not session_id:
        return {"cenario": nome, "status": "erro_start", "resposta": body}

    ultimo = {}
    for i in range(MAX_POLLS):
        time.sleep(POLL_INTERVAL_S)
        pr = requests.get(f"{BASE_URL}/api/rpa/progress/{session_id}", timeout=30)
        if pr.status_code != 200:
            continue
        data = pr.json()
        progress = data.get("progress") or {}
        ultimo = progress
        status = str(progress.get("status", "")).lower()
        fase = progress.get("fase_atual") or progress.get("etapa_atual")
        if i % 5 == 0 or status in ("success", "error", "failed"):
            print(f"  poll {i}: status={status} fase={fase} msg={progress.get('mensagem')}")
        # Terminal de sucesso = status "success" (fase 16), igual ao site
        # (isRpaSuccessStatus). "concluido"/"executando" ainda nao trazem os
        # valores finais ("Aguardando calculo completo").
        if status == "success":
            planos = achar_planos(data)
            return {
                "cenario": nome,
                "status": "success",
                "session_id": session_id,
                "polls": i + 1,
                "valor_recomendado": (planos.get("plano_recomendado") or {}).get("valor"),
                "valor_alternativo": (planos.get("plano_alternativo") or {}).get("valor"),
                "planos": planos,
            }
        if status in ("error", "failed") or "manual" in str(progress.get("mensagem", "")).lower():
            return {
                "cenario": nome,
                "status": "cotacao_manual_ou_erro",
                "session_id": session_id,
                "polls": i + 1,
                "mensagem": progress.get("mensagem"),
            }
    return {"cenario": nome, "status": "timeout", "session_id": session_id, "ultimo": ultimo}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", default="ren-002-marcelo-jose-da-silva")
    args = ap.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    caso = next((c for c in manifest["casos"] if c["id"] == args.id), None)
    if not caso:
        raise SystemExit(f"Caso {args.id} nao encontrado no manifesto.")

    payload_min = dict(caso["rpaStartPayload"])  # 7 campos, como o site novo
    params_full = json.loads((PARAMS_DIR / f"parametros_{args.id}.json").read_text(encoding="utf-8"))
    # Remove blocos que sao so do runner local (nao fazem sentido no payload web).
    payload_full = {k: v for k, v in params_full.items() if k not in ("configuracao", "autenticacao", "url")}

    # Cenario C: completo SEM o bloco demografico do segurado (data de
    # nascimento/sexo/estado civil) — testa se a cotacao por veiculo ocorre
    # sem depender da PH3A (que preenche esses campos quando ausentes).
    payload_sem_demo = {
        k: v for k, v in payload_full.items() if k not in ("data_nascimento", "sexo", "estado_civil")
    }

    # Cenario D: C sem o bloco do condutor (para decidir se e necessario
    # enviar dados de condutor — evitando hardcodar PII de terceiro no site).
    _condutor_keys = {
        "nome_condutor",
        "cpf_condutor",
        "data_nascimento_condutor",
        "sexo_condutor",
        "estado_civil_condutor",
    }
    payload_sem_condutor = {k: v for k, v in payload_sem_demo.items() if k not in _condutor_keys}

    resultados = {
        "id": args.id,
        "D_sem_condutor": executar("D_sem_condutor", payload_sem_condutor),
    }
    OUT.write_text(json.dumps(resultados, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n================ RESUMO ================")
    for k in resultados:
        if k == "id":
            continue
        r = resultados[k]
        print(f"{k}: status={r.get('status')} rec={r.get('valor_recomendado')} alt={r.get('valor_alternativo')}")
    print(f"(local ground-truth ren-002: rec=R$696,24 alt=R$950,47)")
    print(f"gravado: {OUT}")


if __name__ == "__main__":
    main()
