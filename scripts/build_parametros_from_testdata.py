# -*- coding: utf-8 -*-
"""Etapa 1 do teste de fidelidade RPA (local vs. site novo).

Seleciona 50 casos de `testdata/rpa/renovacao-teste-site-luciano.elegiveis.json`
(amostragem determinística estratificada por ramo), substitui e-mail/telefone
do cliente por dados de teste (para não gerar comunicação real do Tô Segurado),
e gera:

  - 50 arquivos `parametros.json` completos no repo do RPA (gitignored, com PII);
  - um manifesto `selecao_50.json` (usado pelas duas pontas do teste) contendo,
    por caso, os `formFields` (para o Playwright preencher o site) e o
    `rpaStartPayload`, ambos já com e-mail/telefone substituídos.

Uso:
    python scripts/build_parametros_from_testdata.py [--n 50] [--seed 42]
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

# --- Caminhos -------------------------------------------------------------
SITE_ROOT = Path(__file__).resolve().parent.parent
ELEGIVEIS = SITE_ROOT / "testdata" / "rpa" / "renovacao-teste-site-luciano.elegiveis.json"

RPA_ROOT = (
    SITE_ROOT.parent / "imediatoseguros-rpa-playwright"
)
RPA_DATA_DIR = RPA_ROOT / "data" / "renovacao_teste_site_luciano"
PARAMS_DIR = RPA_DATA_DIR / "parametros"

# parametros.json atual do projeto RPA — base dos "demais dados" (condutor
# adicional, garagem, portao, uso do veiculo, etc.). Cada caso sobrescreve
# apenas os campos especificos (veiculo/segurado) e o contato de teste.
REFERENCE_PARAMS = RPA_ROOT / "parametros.json"

# Manifesto gravado nas duas pontas (ambas gitignored).
MANIFEST_SITE = SITE_ROOT / "testdata" / "rpa" / "selecao_50.json"
MANIFEST_RPA = RPA_DATA_DIR / "selecao_50.json"

# --- Substituição obrigatória de contato ---------------------------------
TEST_EMAIL = "lrotero@gmail.com"
TEST_DDD = "11"
TEST_CELULAR9 = "976687668"          # 9 dígitos (site: campo celular)
TEST_CELULAR_FULL = "11976687668"    # 11 dígitos (parametros.json local)

# --- Credenciais Tô Segurado (reaproveitadas dos exemplos do projeto RPA) --
AUTENTICACAO = {
    "email_login": "aleximediatoseguros@gmail.com",
    "senha_login": "Lrotero1$",
    "manter_login_atual": True,
}

URL_TOSEGURADO = "https://app.tosegurado.com.br/imediatosolucoes"

CONFIGURACAO = {
    "log": True,
    "display": True,
    "log_rotacao_dias": 90,
    "log_nivel": "INFO",
    "tempo_estabilizacao": 0.5,
    "tempo_carregamento": 0.5,
    "tempo_estabilizacao_tela5": 2,
    "tempo_carregamento_tela5": 5,
    "tempo_estabilizacao_tela15": 3,
    "tempo_carregamento_tela15": 5,
    "inserir_log": True,
    "visualizar_mensagens": True,
    "eliminar_tentativas_inuteis": True,
    "modo_silencioso": False,
}

# Fallback dos "demais dados" caso o parametros.json de referencia nao exista
# (copia fiel do parametros.json atual do projeto RPA, sem os campos que sao
# sobrescritos por caso). Inclui o condutor adicional e o perfil de risco.
FALLBACK_BASE = {
    "configuracao": CONFIGURACAO,
    "autenticacao": AUTENTICACAO,
    "url": URL_TOSEGURADO,
    "zero_km": False,
    "veiculo_segurado": "Não",
    "uso_veiculo": "Pessoal",
    "condutor_principal": True,
    "nome_condutor": "SANDRA LOUREIRO",
    "cpf_condutor": "25151787829",
    "data_nascimento_condutor": "28/08/1975",
    "sexo_condutor": "Feminino",
    "estado_civil_condutor": "Casado ou Uniao Estavel",
    "local_de_trabalho": False,
    "estacionamento_proprio_local_de_trabalho": False,
    "local_de_estudo": False,
    "estacionamento_proprio_local_de_estudo": False,
    "garagem_residencia": True,
    "portao_eletronico": "Eletronico",
    "reside_18_26": "Não",
    "sexo_do_menor": "N/A",
    "faixa_etaria_menor_mais_novo": "N/A",
    "kit_gas": False,
    "blindado": False,
    "financiado": False,
    "continuar_com_corretor_anterior": True,
}

# Campos sobrescritos por caso (ficha do veiculo/segurado) e pelo contato de
# teste — todo o RESTO e herdado do parametros.json de referencia.
CAMPOS_SOBRESCRITOS_POR_CASO = {
    "tipo_veiculo",
    "placa",
    "marca",
    "modelo",
    "ano",
    "combustivel",
    "cep",
    "endereco_completo",
    "endereco",
    "nome",
    "cpf",
    "data_nascimento",
    "sexo",
    "estado_civil",
    "email",
    "celular",
    "autenticacao",
    "url",
}


def carregar_base() -> dict:
    """Le o parametros.json atual do RPA como base dos 'demais dados'.

    Cai no FALLBACK_BASE se o arquivo nao existir.
    """
    if REFERENCE_PARAMS.exists():
        try:
            return json.loads(REFERENCE_PARAMS.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            pass
    return dict(FALLBACK_BASE)

# Valores aceitos pelo validador do motor.
SEXO_VALIDO = {"Masculino", "Feminino"}
ESTADO_CIVIL_VALIDO = {
    "Solteiro",
    "Casado",
    "Divorciado",
    "Viuvo",
    "Uniao Estavel",
    "Casado ou Uniao Estavel",
    "Separado",
}


def combustivel_por_tipo(tipo_veiculo: str, ramo: str) -> str:
    """Combustível não existe na planilha — suposição por tipo de veículo."""
    if ramo == "caminhao" or tipo_veiculo == "caminhao":
        return "Diesel"
    if ramo == "moto" or tipo_veiculo == "moto":
        return "Gasolina"
    return "Flex"


def tipo_veiculo_motor(tags: list[str], ramo: str) -> str:
    """O motor só aceita 'carro' ou 'moto'. Caminhão -> carro."""
    if "moto" in tags or ramo == "moto":
        return "moto"
    return "carro"


def format_cep(cep_digits: str) -> str:
    d = re.sub(r"\D", "", cep_digits or "")
    return f"{d[:5]}-{d[5:]}" if len(d) == 8 else (cep_digits or "")


def build_endereco_completo(cep_fmt: str, cidade: str, uf: str) -> str:
    if cidade and uf:
        return f"CEP {cep_fmt} - {cidade}, {uf}"
    return f"CEP {cep_fmt}" if cep_fmt else ""


def normalize_sexo(v: str) -> str:
    return v if v in SEXO_VALIDO else "Masculino"


def normalize_estado_civil(v: str) -> str:
    return v if v in ESTADO_CIVIL_VALIDO else "Casado"


def normalize_data_nascimento(v: str | None) -> str:
    if v and re.match(r"^\d{2}/\d{2}/\d{4}$", v):
        return v
    return "01/01/1990"


def stratified_sample(casos: list[dict], n: int, seed: int) -> list[dict]:
    """Amostragem determinística estratificada por ramo, preservando proporção."""
    import random

    rng = random.Random(seed)
    por_ramo: dict[str, list[dict]] = defaultdict(list)
    for c in casos:
        ramo = c["formFields"].get("ramo", "auto")
        por_ramo[ramo].append(c)

    total = len(casos)
    selecionados: list[dict] = []
    # Cota proporcional por ramo (ao menos 1 de cada ramo presente).
    cotas: dict[str, int] = {}
    for ramo, grupo in por_ramo.items():
        cotas[ramo] = max(1, round(n * len(grupo) / total))

    # Ajuste para bater exatamente n.
    while sum(cotas.values()) > n:
        maior = max(cotas, key=lambda r: cotas[r])
        cotas[maior] -= 1
    while sum(cotas.values()) < n:
        menor = min(cotas, key=lambda r: cotas[r])
        cotas[menor] += 1

    for ramo, grupo in por_ramo.items():
        indices = list(range(len(grupo)))
        rng.shuffle(indices)
        qtd = min(cotas.get(ramo, 0), len(grupo))
        for i in indices[:qtd]:
            selecionados.append(grupo[i])

    # Ordena por índice original para estabilidade do relatório.
    selecionados.sort(key=lambda c: c.get("index", 0) if "index" in c else c["id"])
    return selecionados[:n]


def build_parametros(caso: dict, base: dict) -> dict:
    """Parte do parametros.json de referencia (base) e sobrescreve apenas os
    campos especificos do caso (ficha veiculo/segurado) e o contato de teste.

    Todos os "demais dados" (condutor adicional, garagem, portao, uso do
    veiculo, perfil de risco, configuracao, etc.) sao herdados da base.
    """
    import copy

    ff = caso["formFields"]
    tags = caso.get("tags", [])
    ramo = ff.get("ramo", "auto")
    tipo_veiculo = tipo_veiculo_motor(tags, ramo)
    cep_digits = ff.get("cep", "")
    cep_fmt = format_cep(cep_digits)
    cidade = ff.get("cidade", "")
    uf = ff.get("uf", "")

    params = copy.deepcopy(base)

    # --- Campos especificos do caso (planilha) ---
    params["tipo_veiculo"] = tipo_veiculo
    params["placa"] = ff.get("placa", "")
    params["marca"] = ff.get("veiculoMarca", "")
    params["modelo"] = ff.get("veiculoModelo", "")
    params["ano"] = str(ff.get("veiculoAnoModelo") or ff.get("veiculoAnoFabricacao") or "")
    params["combustivel"] = combustivel_por_tipo(tipo_veiculo, ramo)
    params["cep"] = cep_fmt
    params["endereco_completo"] = build_endereco_completo(cep_fmt, cidade, uf)
    params["endereco"] = build_endereco_completo(cep_fmt, cidade, uf)
    params["nome"] = ff.get("nome", "")
    params["cpf"] = ff.get("cpf", "")
    params["data_nascimento"] = normalize_data_nascimento(ff.get("dataNascimento"))
    params["sexo"] = normalize_sexo(ff.get("sexo", ""))
    params["estado_civil"] = normalize_estado_civil(ff.get("estadoCivil", ""))

    # --- Contato de teste (evita comunicacao real do To Segurado) ---
    params["email"] = TEST_EMAIL
    params["celular"] = TEST_CELULAR_FULL

    # --- Credenciais/url fixas do teste ---
    params["autenticacao"] = AUTENTICACAO
    params["url"] = URL_TOSEGURADO

    return params


def build_site_form_fields(caso: dict) -> dict:
    """formFields para o Playwright preencher no site, com contato substituído."""
    ff = dict(caso["formFields"])
    ff["email"] = TEST_EMAIL
    ff["ddd"] = TEST_DDD
    ff["celular"] = TEST_CELULAR9
    return ff


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=50)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if not ELEGIVEIS.exists():
        raise SystemExit(f"Fonte não encontrada: {ELEGIVEIS}")

    db = json.loads(ELEGIVEIS.read_text(encoding="utf-8"))
    casos = db["casos"]
    if len(casos) < args.n:
        raise SystemExit(f"Base tem {len(casos)} casos, menos que os {args.n} pedidos.")

    selecionados = stratified_sample(casos, args.n, args.seed)

    base = carregar_base()

    PARAMS_DIR.mkdir(parents=True, exist_ok=True)
    RPA_DATA_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_SITE.parent.mkdir(parents=True, exist_ok=True)

    manifest_casos = []
    distrib: dict[str, int] = defaultdict(int)
    for caso in selecionados:
        cid = caso["id"]
        params = build_parametros(caso, base)
        params_path = PARAMS_DIR / f"parametros_{cid}.json"
        params_path.write_text(
            json.dumps(params, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        ramo = caso["formFields"].get("ramo", "auto")
        distrib[ramo] += 1

        site_form = build_site_form_fields(caso)
        rpa_start = dict(caso.get("rpaStartPayload", {}))
        rpa_start["DDD-CELULAR"] = f"{TEST_DDD}-{TEST_CELULAR9}"
        rpa_start["CELULAR"] = TEST_CELULAR9

        manifest_casos.append(
            {
                "id": cid,
                "ramo": ramo,
                "tipo_veiculo": params["tipo_veiculo"],
                "combustivel_suposto": params["combustivel"],
                "session_id": f"ren_{cid}",
                "parametros_file": str(params_path),
                "formFields": site_form,
                "rpaStartPayload": rpa_start,
            }
        )

    manifest = {
        "meta": {
            "fonte": str(ELEGIVEIS.name),
            "geradoEm": datetime.now().isoformat(timespec="seconds"),
            "n": len(manifest_casos),
            "seed": args.seed,
            "distribuicaoPorRamo": dict(distrib),
            "substituicao": {
                "email": TEST_EMAIL,
                "ddd": TEST_DDD,
                "celular": TEST_CELULAR9,
            },
            "baseParametros": str(REFERENCE_PARAMS),
            "camposHerdadosDaBase": "demais dados do parametros.json atual (condutor adicional, garagem, portao, uso_veiculo, perfil de risco, configuracao)",
            "camposSobrescritosPorCaso": sorted(CAMPOS_SOBRESCRITOS_POR_CASO),
            "notas": [
                "demais dados (condutor adicional etc.) herdados do parametros.json atual do RPA.",
                "combustivel e suposto por tipo de veiculo (nao existe na planilha).",
                "tipo_veiculo caminhao -> carro (motor so aceita carro/moto).",
                "Contem PII real — NAO versionar.",
            ],
        },
        "casos": manifest_casos,
    }
    payload = json.dumps(manifest, ensure_ascii=False, indent=2)
    MANIFEST_SITE.write_text(payload, encoding="utf-8")
    MANIFEST_RPA.write_text(payload, encoding="utf-8")

    print("OK")
    print(f"gerados {len(manifest_casos)} parametros.json em {PARAMS_DIR}")
    print(f"distribuicao por ramo: {dict(distrib)}")
    print(f"manifesto: {MANIFEST_SITE}")
    print(f"manifesto: {MANIFEST_RPA}")


if __name__ == "__main__":
    main()
