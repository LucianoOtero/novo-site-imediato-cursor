import assert from "node:assert/strict";
import { test } from "node:test";

import { niveisPorCobertura, tokensExigidos } from "./fipe-publica.ts";

const modelos = (...nomes) => nomes.map((nome, indice) => ({ codigo: String(indice + 1), nome }));
const nomesDoTopo = (lista, modelo) => (niveisPorCobertura(lista, tokensExigidos(modelo))[0] ?? []).map((item) => item.nome);

test("cobertura completa vem primeiro, como antes", () => {
  const lista = modelos("CG 160 FAN Flex", "CG 160 START", "CG 160 TITAN Flex", "CB 300F TWISTER");
  assert.deepEqual(nomesDoTopo(lista, "CG 160 FAN"), ["CG 160 FAN Flex"]);
});

test("abreviação de câmbio da placa (CVT, MCV) não elimina o modelo", () => {
  const honda = modelos("Fit EXL 1.5 Flex/Flexone 16V 5p Aut", "Fit LX 1.5 Flex/Flexone 16V 5p Mec.", "City EXL 1.5 Flex 16V 4p Aut.");
  assert.deepEqual(nomesDoTopo(honda, "FIT EXL CVT"), ["Fit EXL 1.5 Flex/Flexone 16V 5p Aut"]);

  const vw = modelos("up! take 1.0 Total Flex 12V 5p", "up! move 1.0 Total Flex 12V 5p", "Polo 1.0 Flex 12V 5p");
  assert.deepEqual(nomesDoTopo(vw, "UP TAKE MCV"), ["up! take 1.0 Total Flex 12V 5p"]);
});

test("letras grudadas em números (XTZ250, CRETA1TA, Fazer150)", () => {
  const yamaha = modelos("XTZ 250 LANDER 249cc/LANDER BLUEFLEX/ABS", "XTZ 150 CROSSER Z/ED FLEX", "FZ15 150 FAZER CONNECTED FLEX", "YS 250 FAZER");
  assert.deepEqual(nomesDoTopo(yamaha, "XTZ250 LANDER"), ["XTZ 250 LANDER 249cc/LANDER BLUEFLEX/ABS"]);
  assert.deepEqual(nomesDoTopo(yamaha, "Fazer150"), ["FZ15 150 FAZER CONNECTED FLEX"]);

  const hyundai = modelos("Creta Comfort 1.0 TB 12V Flex Aut.", "Creta Comfort Plus 1.0 TB 12V Flex Aut.", "Creta Limited 1.0 TB 12V Flex Aut.", "HB20 Comfort 1.0 Flex 12V Mec.");
  assert.deepEqual(nomesDoTopo(hyundai, "CRETA1TA COMFORT"), ["Creta Comfort 1.0 TB 12V Flex Aut.", "Creta Comfort Plus 1.0 TB 12V Flex Aut."]);
});

test("a família é obrigatória: outro modelo da marca não entra", () => {
  const vw = modelos("Gol 1.0 Flex 12V 5p", "Golf 1.0 TSI Flex Aut.", "Polo 1.0 Flex 12V 5p");
  assert.deepEqual(nomesDoTopo(vw, "GOL 1.0"), ["Gol 1.0 Flex 12V 5p"]);
  assert.deepEqual(niveisPorCobertura(vw, tokensExigidos("SAVEIRO CROSS")), []);
});

test("família por prefixo só quando nenhum nome a tem inteira", () => {
  const bmw = modelos("320iA 2.0 TB M Sport Flex Aut.", "X1 sDrive 20i 2.0 Aut.");
  assert.deepEqual(nomesDoTopo(bmw, "320I"), ["320iA 2.0 TB M Sport Flex Aut."]);
});
