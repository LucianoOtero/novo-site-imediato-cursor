import { NextResponse, type NextRequest } from "next/server";

import { checkRateLimit, getClientIp, hashIp } from "@/lib/leads/security";
import { lerLeadId, propostaTransmitida, registrarPropostaSuhai, suhaiAmbiente } from "@/lib/leads/suhai-etapas";
import { GatewayError, transmitirProposta, type PropostaResultado } from "@/lib/suhai/gateway";
import { classificarRecusaSuhai } from "@/lib/suhai/mensagens-erro";
import { propostaInputSchema } from "@/lib/suhai/types";

/**
 * POST /api/suhai/proposta — transmite a proposta com boleto.
 *
 * A rota não fala com a Suhai. O gateway fixa `tp_pagamento` em boleto.
 * Sem gateway configurado a resposta é erro: proposta simulada não existe.
 * O mesmo protocolo não é transmitido duas vezes: o reenvio recebe a
 * proposta gravada no lead.
 */
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ipHash = hashIp(getClientIp(request.headers));
  const rateLimit = checkRateLimit(ipHash);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { erro: "indisponivel", mensagem: "Muitas tentativas. Aguarde alguns instantes." },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds ? { "Retry-After": String(rateLimit.retryAfterSeconds) } : undefined,
      },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ erro: "validacao", mensagem: "JSON inválido." }, { status: 422 });
  }

  const parsed = propostaInputSchema.safeParse(json);
  if (!parsed.success) {
    const campos: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const caminho = issue.path.join(".");
      if (caminho && !campos[caminho]) campos[caminho] = issue.message;
    }
    return NextResponse.json({ erro: "validacao", mensagem: "Dados incompletos.", campos }, { status: 422 });
  }

  const leadId = lerLeadId(json);
  const { aceite: _aceite, ...corpo } = parsed.data;

  const anterior = await propostaTransmitida(leadId, corpo.protocolo);
  if (anterior?.numeroProposta) {
    const resultado: PropostaResultado = {
      protocolo: String(anterior.protocolo),
      numeroProposta: anterior.numeroProposta,
      codMsgRet: "0",
      textoMsgRet: "Proposta já transmitida.",
    };
    return NextResponse.json(resultado);
  }

  const resumo = {
    ambiente: suhaiAmbiente(),
    protocolo: corpo.protocolo,
    cdCobertura: corpo.cdCobertura,
    formaPagamento: "boleto" as const,
    parcelas: corpo.parcelas,
    diaVencimento: corpo.diaVencimento,
    vigenciaInicio: corpo.vigenciaInicio,
  };

  try {
    const resultado = await transmitirProposta(corpo);
    await registrarPropostaSuhai(
      leadId,
      { ...resumo, status: "sucesso", numeroProposta: resultado.numeroProposta, geradoEm: new Date().toISOString() },
      corpo.email,
    );
    return NextResponse.json(resultado);
  } catch (error) {
    console.error("[api/suhai/proposta] falha ao transmitir", error);
    const recusaSuhai = error instanceof GatewayError && error.codigoSuhai;
    const recusa = recusaSuhai ? classificarRecusaSuhai(error.message) : null;
    await registrarPropostaSuhai(
      leadId,
      {
        ...resumo,
        status: "falha",
        erro: error instanceof Error ? error.message : String(error),
        codigoSuhai: error instanceof GatewayError ? error.codigoSuhai : null,
        motivo: recusa?.motivo,
        geradoEm: new Date().toISOString(),
      },
      corpo.email,
    );

    if (recusa?.motivo === "proposta_em_emissao") {
      return NextResponse.json(
        { erro: "proposta_existente", mensagem: recusa.mensagem, codigoSuhai: error instanceof GatewayError ? error.codigoSuhai : null },
        { status: 409 },
      );
    }

    if (error instanceof GatewayError && error.codigoSuhai) {
      return NextResponse.json(
        { erro: "suhai", mensagem: recusa?.mensagem ?? error.message, codigoSuhai: error.codigoSuhai },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { erro: "suhai", mensagem: "Não foi possível transmitir a proposta agora. Tente novamente em instantes." },
      { status: error instanceof GatewayError && error.status === 503 ? 503 : 502 },
    );
  }
}
