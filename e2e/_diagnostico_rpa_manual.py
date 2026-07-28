"""Fase 2 — reexecuta o RPA (API rpaimediatoseguros.com.br → Tô Segurado)
para as placas que falharam no site na bateria EspoCRM 2026-07-28.

Mesmo endpoint que o website usa. Se falhar de novo = limitação Tô Segurado;
se passar = suspeita no website/integração.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = "https://rpaimediatoseguros.com.br"
CASES = Path(
    r"c:\Users\Luciano\OneDrive - Imediato Soluções em Seguros\Imediato"
    r"\imediatoseguros-rpa-playwright\data\renovacao_teste_site_luciano\casos.elegiveis.json"
)
OUT = Path(
    r"c:\Users\Luciano\OneDrive - Imediato Soluções em Seguros\Imediato"
    r"\Novo Site Imediato Cursor\e2e\testes-espocrm.diagnostico-rpa.json"
)

# Placas com desfecho "manual" na bateria do site
PLACAS = ["DBO7B72", "EZO3977", "EJP8H57", "SWA4F78", "EJM2020"]


def http_json(method: str, url: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    raw = json.loads(CASES.read_text(encoding="utf-8"))
    casos = raw["casos"] if isinstance(raw, dict) else raw
    by_placa = {c["formFields"]["placa"]: c for c in casos if c.get("formFields", {}).get("placa")}

    resultados = []
    for placa in PLACAS:
        caso = by_placa.get(placa)
        if not caso:
            resultados.append({"placa": placa, "veredito": "caso_nao_encontrado"})
            continue
        ff = caso["formFields"]
        payload = dict(caso.get("rpaStartPayload") or {})
        # Enriquecer com veículo (mesmo que o site faz via Placa Fipe) —
        # sem isso o backend cotaria veículo padrão.
        if ff.get("veiculoMarca"):
            payload["marca"] = ff["veiculoMarca"]
        if ff.get("veiculoModelo"):
            payload["modelo"] = ff["veiculoModelo"]
        ano = ff.get("veiculoAnoModelo") or ff.get("veiculoAnoFabricacao")
        if ano:
            payload["ano"] = ano
        payload["tipo_veiculo"] = "carro"
        payload.setdefault("produto", "auto")

        print(f"\n=== {placa} start ===", flush=True)
        started = time.time()
        entry: dict = {
            "placa": placa,
            "id": caso.get("id"),
            "veiculo": f"{ff.get('veiculoMarca')} {ff.get('veiculoModelo')}",
        }
        try:
            start = http_json("POST", f"{BASE}/api/rpa/start", payload)
            sid = start.get("session_id") or start.get("sessionId")
            entry["session_id"] = sid
            entry["start_http_ok"] = True
            if not sid:
                entry["veredito"] = "erro_infra"
                entry["detalhe"] = f"start sem session_id: {start}"
                resultados.append(entry)
                continue

            last = {}
            terminal = False
            for i in range(300):  # 10 min @ 2s
                time.sleep(2)
                prog_wrap = http_json("GET", f"{BASE}/api/rpa/progress/{sid}")
                last = prog_wrap.get("progress") or prog_wrap
                status = (last.get("status") or "").lower()
                if i % 15 == 0:
                    print(f"  poll {i}: status={status} msg={last.get('mensagem')}", flush=True)
                if status in ("success", "sucesso", "completed", "complete", "error", "erro", "failed", "falha"):
                    terminal = True
                    break
                # Heurística: dados_extra / resultados_finais indicam sucesso
                if last.get("dados_extra") or last.get("resultados_finais"):
                    terminal = True
                    status = "success"
                    break

            entry["duracao_s"] = round(time.time() - started)
            entry["last_status"] = last.get("status")
            entry["last_mensagem"] = last.get("mensagem")
            entry["polls"] = i + 1

            st = (last.get("status") or "").lower()
            has_result = bool(last.get("dados_extra") or last.get("resultados_finais"))
            if has_result or st in ("success", "sucesso", "completed", "complete"):
                entry["veredito"] = "tosegurado_ok_suspeita_site"
                entry["detalhe"] = "RPA manual via API concluiu com sucesso — site pode ter falhado por outro motivo"
            elif st in ("error", "erro", "failed", "falha") or (terminal and not has_result):
                entry["veredito"] = "tosegurado"
                entry["detalhe"] = f"RPA falhou de novo contra Tô Segurado: status={last.get('status')} msg={last.get('mensagem')}"
            else:
                entry["veredito"] = "timeout"
                entry["detalhe"] = "Sem desfecho em 10 min"

        except urllib.error.HTTPError as e:
            entry["veredito"] = "erro_infra"
            entry["detalhe"] = f"HTTP {e.code}: {e.read()[:300]!r}"
            entry["duracao_s"] = round(time.time() - started)
        except Exception as e:  # noqa: BLE001
            entry["veredito"] = "erro_infra"
            entry["detalhe"] = str(e)
            entry["duracao_s"] = round(time.time() - started)

        print(f"=== {placa} => {entry['veredito']} ({entry.get('duracao_s')}s) ===", flush=True)
        resultados.append(entry)
        OUT.write_text(
            json.dumps({"geradoEm": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "casos": resultados}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    print("\nDONE", OUT, flush=True)


if __name__ == "__main__":
    main()
