import assert from "node:assert/strict";
import { test } from "node:test";

import { catalogoSemRegistro, grafiaDoCatalogo } from "./catalogo-suhai.ts";

const candidato = { nome: "Onix 1.0 Flex", codFipe: "004458-0" };

test("código presente no catálogo usa a grafia e a categoria da Suhai", () => {
  const grafia = grafiaDoCatalogo(candidato, "CHEVROLET", [
    { codFipe: "004458-0", marca: "GM - Chevrolet", modelo: "ONIX HATCH 1.0 12V Flex 5p Mec.", codCategoria: 1 },
  ]);
  assert.deepEqual(grafia, {
    marca: "GM - Chevrolet",
    modelo: "ONIX HATCH 1.0 12V Flex 5p Mec.",
    codFipe: "004458-0",
    categoria: "auto",
  });
});

test("catálogo vazio descarta a versão: a Suhai recusaria o código", () => {
  assert.equal(grafiaDoCatalogo(candidato, "CHEVROLET", []), null);
});

test("catálogo fora do ar mantém a grafia pública", () => {
  assert.deepEqual(grafiaDoCatalogo(candidato, "CHEVROLET", "indisponivel"), {
    marca: "CHEVROLET",
    modelo: "Onix 1.0 Flex",
    codFipe: "004458-0",
  });
});

test("crítica de código sem registro equivale ao catálogo vazio; login inválido não", () => {
  assert.equal(catalogoSemRegistro("Não foi encontrado nenhum registro para os critérios utilizados."), true);
  assert.equal(catalogoSemRegistro("Veículo não encontrado"), true);
  assert.equal(catalogoSemRegistro("Login ou senha inválidos"), false);
  assert.equal(catalogoSemRegistro(undefined), false);
});

test("item sem marca e modelo não substitui a grafia pública", () => {
  const grafia = grafiaDoCatalogo(candidato, "CHEVROLET", [{ codFipe: null, marca: "", modelo: "", codCategoria: null }]);
  assert.equal(grafia?.modelo, "Onix 1.0 Flex");
});
