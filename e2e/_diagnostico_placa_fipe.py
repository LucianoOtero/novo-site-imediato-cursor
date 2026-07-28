#!/usr/bin/env python3
"""Diagnóstico Placa Fipe — 10 placas com rpa_desabilitado na bateria EspoCRM.

Testa dois caminhos:
  A) API do site (mesmo que o LeadForm): POST /api/validate/placa
  B) Proxy Cloud Run direto (legado DEV)

Mede latência com timeouts crescentes para distinguir demora vs falha.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path

PLACAS = [
    "RNW7D14",
    "FQF3C11",
    "EKJ4I85",
    "BLP7E56",
    "FXG1E20",
    "CLL7A22",
    "ONF1E36",
    "DZD9G36",
    "PEF5A69",
    "KIQ0882",
]

ENDPOINTS = {
    "site_api": "https://comparaseguroonline.com.br/api/validate/placa",
    "cloud_run_dev": "https://placa-validate-dev-6r55ex3u6q-rj.a.run.app/",
}

# Um timeout generoso por tentativa (o site não define AbortSignal).
TIMEOUT_S = 60
OUT = Path(__file__).with_name("testes-espocrm.diagnostico-placa-fipe.json")


def post_json(url: str, body: dict, timeout: float) -> dict:
    t0 = time.perf_counter()
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            ms = round((time.perf_counter() - t0) * 1000)
            data = json.loads(raw) if raw.strip() else {}
            return {"http": resp.status, "ms": ms, "data": data, "erro": None, "raw_len": len(raw)}
    except urllib.error.HTTPError as e:
        ms = round((time.perf_counter() - t0) * 1000)
        body_txt = e.read().decode("utf-8", errors="replace")[:500]
        return {"http": e.code, "ms": ms, "data": None, "erro": f"HTTP {e.code}: {body_txt}", "raw_len": len(body_txt)}
    except Exception as e:  # noqa: BLE001
        ms = round((time.perf_counter() - t0) * 1000)
        return {"http": None, "ms": ms, "data": None, "erro": f"{type(e).__name__}: {e}", "raw_len": 0}


def interpret_site(data: dict | None) -> dict:
    if not data:
        return {"ok": False, "marca": None, "modelo": None, "ano": None}
    return {
        "ok": bool(data.get("ok")),
        "marca": data.get("marca"),
        "modelo": data.get("modelo"),
        "anoFabricacao": data.get("anoFabricacao"),
        "anoModelo": data.get("anoModelo"),
        "marcaModelo": data.get("marcaModelo"),
    }


def interpret_cloud_run(data: dict | None) -> dict:
    if not data:
        return {"ok": False, "marca": None, "modelo": None, "ano": None}
    ok = data.get("codigo") == 1 or data.get("success") is True
    info = data.get("informacoes_veiculo") if isinstance(data.get("informacoes_veiculo"), dict) else data
    return {
        "ok": bool(ok),
        "marca": info.get("marca"),
        "modelo": info.get("modelo"),
        "ano": info.get("ano"),
        "ano_modelo": info.get("ano_modelo"),
        "codigo": data.get("codigo"),
        "success": data.get("success"),
    }


def main() -> None:
    resultados = []
    for placa in PLACAS:
        print(f"\n=== {placa} ===", flush=True)
        entry = {"placa": placa, "caminhos": {}}
        for name, url in ENDPOINTS.items():
            print(f"  -> {name} ...", flush=True)
            r = post_json(url, {"placa": placa}, TIMEOUT_S)
            if name == "site_api":
                parsed = interpret_site(r["data"])
            else:
                parsed = interpret_cloud_run(r["data"])
            row = {
                "url": url,
                "http": r["http"],
                "ms": r["ms"],
                "erro": r["erro"],
                **parsed,
            }
            entry["caminhos"][name] = row
            print(
                f"     {r['ms']}ms http={r['http']} ok={parsed.get('ok')} "
                f"{parsed.get('marca')} {parsed.get('modelo')} err={r['erro']}",
                flush=True,
            )
        # Veredito por placa
        site_ok = entry["caminhos"]["site_api"].get("ok")
        cr_ok = entry["caminhos"]["cloud_run_dev"].get("ok")
        site_ms = entry["caminhos"]["site_api"].get("ms") or 0
        if site_ok and site_ms >= 15000:
            entry["veredito"] = "ok_lento"
        elif site_ok:
            entry["veredito"] = "ok_rapido"
        elif cr_ok and not site_ok:
            entry["veredito"] = "cloud_run_ok_site_falhou"
        elif entry["caminhos"]["site_api"].get("erro") and "timed out" in str(entry["caminhos"]["site_api"].get("erro")).lower():
            entry["veredito"] = "timeout"
        else:
            entry["veredito"] = "falha_api"
        print(f"  VEREDITO: {entry['veredito']}", flush=True)
        resultados.append(entry)
        OUT.write_text(
            json.dumps(
                {"geradoEm": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "casos": resultados},
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    print("\n========== RESUMO ==========")
    for e in resultados:
        s = e["caminhos"]["site_api"]
        print(f"{e['placa']}: {e['veredito']:22} site={s.get('ms')}ms ok={s.get('ok')} {s.get('marca')} {s.get('modelo')}")
    print("\nGravado:", OUT)


if __name__ == "__main__":
    main()
