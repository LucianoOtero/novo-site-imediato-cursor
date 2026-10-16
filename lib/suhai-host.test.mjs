import assert from "node:assert/strict";
import { test } from "node:test";

import { destinoHostSuhai } from "./suhai-host.ts";

const SUHAI = "suhai.segurosimediato.com.br";

test("outros hosts seguem sem alteração", () => {
  for (const host of ["www.segurosimediato.com.br", "segurosimediato.com.br", "novo.example.com", null]) {
    assert.deepEqual(destinoHostSuhai(host, "/"), { acao: "seguir" });
    assert.deepEqual(destinoHostSuhai(host, "/cotacao"), { acao: "seguir" });
  }
});

test("raiz do host Suhai reescreve para a landing", () => {
  assert.deepEqual(destinoHostSuhai(SUHAI, "/"), { acao: "rewrite", pathname: "/marca-suhai" });
  assert.deepEqual(destinoHostSuhai(`${SUHAI}:443`, "/"), { acao: "rewrite", pathname: "/marca-suhai" });
  assert.deepEqual(destinoHostSuhai("SUHAI.SegurosImediato.com.br", "/"), {
    acao: "rewrite",
    pathname: "/marca-suhai",
  });
});

test("subpáginas da Suhai seguem, com ou sem barra final", () => {
  for (const caminho of ["/marca-suhai", "/marca-suhai/moto", "/marca-suhai/carro/", "/marca-suhai/caminhao"]) {
    assert.deepEqual(destinoHostSuhai(SUHAI, caminho), { acao: "seguir" });
  }
});

test("APIs e arquivos seguem direto", () => {
  for (const caminho of ["/api/lead", "/_next/data/x.json", "/robots.txt", "/opengraph-image", "/marca-suhai/hero.webp"]) {
    assert.deepEqual(destinoHostSuhai(SUHAI, caminho), { acao: "seguir" });
  }
});

test("demais caminhos do host Suhai redirecionam para a raiz", () => {
  for (const caminho of ["/cotacao", "/seguro-moto", "/marca-suhai/outra"]) {
    assert.deepEqual(destinoHostSuhai(SUHAI, caminho), { acao: "redirect", pathname: "/" });
  }
});
