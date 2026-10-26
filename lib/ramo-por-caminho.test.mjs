import assert from "node:assert/strict";
import { test } from "node:test";

import { RAMOS_POR_CAMINHO, ramoPorCaminho } from "./ramo-por-caminho.ts";
import { getSeguroRamoSlugs, ramos } from "./ramos.ts";

test("listas batem com lib/ramos.ts", () => {
  assert.deepEqual([...RAMOS_POR_CAMINHO.SLUGS_SEGURO].sort(), getSeguroRamoSlugs().sort());
  const proprios = ramos
    .filter((ramo) => ramo.seo.canonicalPath !== `/seguro-${ramo.slug}`)
    .map((ramo) => [ramo.seo.canonicalPath, ramo.slug]);
  assert.deepEqual(Object.fromEntries(proprios), RAMOS_POR_CAMINHO.CAMINHOS_PROPRIOS);
});

test("página de ramo devolve o slug", () => {
  assert.equal(ramoPorCaminho("/seguro-pet"), "pet");
  assert.equal(ramoPorCaminho("/seguro-moto/"), "moto");
  assert.equal(ramoPorCaminho("/seguro-uber?utm_source=x"), "uber");
  assert.equal(ramoPorCaminho("/fianca"), "fianca");
  assert.equal(ramoPorCaminho("/assistencia-24-horas"), "assistencia-24-horas");
});

test("outras páginas ficam sem ramo", () => {
  for (const caminho of ["/", "/contato", "/seguro-inexistente", "/a-imediato/equipe", "", null, undefined]) {
    assert.equal(ramoPorCaminho(caminho), undefined, String(caminho));
  }
});
