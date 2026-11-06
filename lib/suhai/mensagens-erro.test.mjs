import assert from "node:assert/strict";
import { test } from "node:test";

import { classificarRecusaSuhai, MENSAGEM_CALCULO_PELA_EQUIPE, MENSAGEM_PROPOSTA_EXISTENTE } from "./mensagens-erro.ts";

const em2026 = new Date("2026-11-05T12:00:00");

test("proposta já em emissão vira mensagem de acompanhamento pela equipe", () => {
  const recusa = classificarRecusaSuhai(
    "Há outra proposta em emissão. Para retransmitir será necessário cancelar a anterior - ServiceApplication",
  );
  assert.equal(recusa?.motivo, "proposta_em_emissao");
  assert.equal(recusa?.mensagem, MENSAGEM_PROPOSTA_EXISTENTE);
  assert.equal(recusa?.campo, undefined);
});

test("ano de fabricação aponta a etapa do veículo com o ano corrente", () => {
  const recusa = classificarRecusaSuhai(
    "O ano de fabricação do veículo é obrigatório e tem que ser inferior ou igual ao ano atual",
    em2026,
  );
  assert.equal(recusa?.motivo, "ano_fabricacao");
  assert.equal(recusa?.campo, "veiculo");
  assert.match(recusa?.mensagem ?? "", /posterior a 2026/);
});

test("FIPE, veículo e modelo recusados pedem outra versão", () => {
  for (const [texto, motivo] of [
    ["Código FIPE informado está incorreto", "fipe_incorreto"],
    ["ATENÇÃO: O Veículo não foi localizado", "veiculo_nao_localizado"],
    ["Modelo informado está incorreto", "modelo_incorreto"],
  ]) {
    const recusa = classificarRecusaSuhai(texto);
    assert.equal(recusa?.motivo, motivo);
    assert.equal(recusa?.campo, "veiculo");
    assert.match(recusa?.mensagem ?? "", /outra versão/);
  }
});

test("zero km antigo usa a mesma orientação do formulário", () => {
  const recusa = classificarRecusaSuhai("Não é possível definir Zero KM para veículos com anos anteriores a 2025", em2026);
  assert.equal(recusa?.motivo, "zero_km");
  assert.match(recusa?.mensagem ?? "", /2025 ou mais novo/);
});

test("resposta inválida de pergunta encaminha à equipe sem voltar etapa", () => {
  const recusa = classificarRecusaSuhai("Resposta da pergunta 4 é inválida");
  assert.equal(recusa?.motivo, "pergunta_invalida");
  assert.equal(recusa?.mensagem, MENSAGEM_CALCULO_PELA_EQUIPE);
  assert.equal(recusa?.campo, undefined);
});

test("texto desconhecido ou vazio não é traduzido", () => {
  assert.equal(classificarRecusaSuhai("CPF inválido"), null);
  assert.equal(classificarRecusaSuhai(""), null);
  assert.equal(classificarRecusaSuhai(undefined), null);
});
