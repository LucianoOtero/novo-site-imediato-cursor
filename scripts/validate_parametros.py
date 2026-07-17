# -*- coding: utf-8 -*-
"""Valida os 50 parametros.json gerados contra o validador oficial do motor RPA.

Usa `utils/validacao_parametros.ValidadorParametros` do projeto
`imediatoseguros-rpa-playwright`. Reporta, por arquivo, se passou ou o motivo
da falha — sem executar o RPA.

Uso:
    python scripts/validate_parametros.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parent.parent
RPA_ROOT = SITE_ROOT.parent / "imediatoseguros-rpa-playwright"
PARAMS_DIR = RPA_ROOT / "data" / "renovacao_teste_site_luciano" / "parametros"

sys.path.insert(0, str(RPA_ROOT))

from utils.validacao_parametros import (  # noqa: E402
    ValidadorParametros,
    ValidacaoParametrosError,
)


def main() -> None:
    if not PARAMS_DIR.exists():
        raise SystemExit(f"Pasta não encontrada: {PARAMS_DIR}. Rode build_parametros_from_testdata.py antes.")

    arquivos = sorted(PARAMS_DIR.glob("parametros_*.json"))
    if not arquivos:
        raise SystemExit(f"Nenhum parametros_*.json em {PARAMS_DIR}")

    validador = ValidadorParametros()
    ok, falhas = 0, []
    for arq in arquivos:
        conteudo = arq.read_text(encoding="utf-8")
        try:
            validador.validar_json_string(conteudo)
            ok += 1
        except ValidacaoParametrosError as e:
            falhas.append((arq.name, str(e)))
        except Exception as e:  # noqa: BLE001
            falhas.append((arq.name, f"erro inesperado: {e}"))

    print(f"Validados: {len(arquivos)} | OK: {ok} | Falhas: {len(falhas)}")
    for nome, motivo in falhas:
        print(f"  [FALHA] {nome}: {motivo}")

    if falhas:
        sys.exit(1)


if __name__ == "__main__":
    main()
