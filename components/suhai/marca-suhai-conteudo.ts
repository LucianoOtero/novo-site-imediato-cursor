export type CardSuhai = { titulo: string; texto: string };
export type PerguntaSuhai = { question: string; answer: string };

export const NOTA_PRECO =
  "O preço nesta página sai de três planos: Essencial, só roubo e furto; Completo, roubo e furto mais perda total; e Completo + Terceiros. A assistência entra à parte: sem guincho, guincho até 200 km ou até 500 km. A cobertura completa, com conserto de batida menor, é como a Suhai descreve essa opção. O plano Completo da cotação não inclui esse conserto.";

export const PASSOS: CardSuhai[] = [
  { titulo: "Peça sua cotação", texto: "Preencha seus dados e receba a cotação do seu seguro, grátis e sem compromisso" },
  { titulo: "Escolha suas coberturas", texto: "Selecione as coberturas que fazem sentido para você" },
  { titulo: "Finalize e aprove sua apólice", texto: "Receba sua apólice digital e comece a aproveitar sua proteção" },
];

const PARCELAMENTO =
  "Até 12 vezes no boleto ou no cartão, direto para a Suhai. No cartão, a parcela do mês entra na fatura, com opção de até 3 vezes sem juros.";

export const COBERTURAS: CardSuhai[] = [
  {
    titulo: "Roubo e furto",
    texto: "Se o veículo for roubado ou furtado e não for recuperado, a indenização usa a tabela FIPE.",
  },
  {
    titulo: "Perda total",
    texto: "Cobre o caso em que colisão, incêndio ou alagamento deixa o veículo sem conserto.",
  },
  {
    titulo: "Danos a terceiros",
    texto: "Cobre dano material, corporal ou moral causado a outra pessoa ou a outro veículo num acidente de sua responsabilidade.",
  },
  {
    titulo: "Cobertura completa",
    texto: "Reúne roubo e furto, perda total e também o conserto em batida menor.",
  },
];

export const COBERTURAS_MOTO: CardSuhai[] = [
  COBERTURAS[0],
  {
    titulo: "Perda total",
    texto: "Cobre o caso em que colisão, incêndio ou alagamento deixa a moto sem conserto.",
  },
  {
    titulo: "Danos a terceiros",
    texto: "Cobre dano material, corporal ou moral causado a outra pessoa ou a outro veículo num acidente de sua responsabilidade.",
  },
  {
    titulo: "Assistência 24h",
    texto: "Guincho até 500 km, chaveiro, socorro mecânico, troca de pneu e transporte até em casa ou ao destino.",
  },
];

export const ASSISTENCIA: CardSuhai[] = [
  {
    titulo: "Guincho 24 horas (até 500 km)",
    texto: "Busca o veículo se ele parar por pane ou batida, em qualquer lugar do Brasil.",
  },
  {
    titulo: "Auxílio mecânico",
    texto: "Um técnico tenta resolver no local um problema mecânico ou a bateria descarregada.",
  },
  {
    titulo: "Chaveiro e troca de pneu",
    texto: "Troca o pneu furado ou ajuda quando a chave some.",
  },
  {
    titulo: "Transporte até o destino",
    texto: "Se o veículo for de guincho, há transporte de volta para casa ou até o destino.",
  },
];

export const ASSISTENCIA_CAMINHAO: CardSuhai[] = [
  {
    titulo: "Guincho 24 horas (até 500 km)",
    texto: "Busca o caminhão, a van ou o VUC parado por pane ou batida, com socorro preparado para veículo pesado e utilitário.",
  },
  {
    titulo: "Auxílio mecânico",
    texto: "Um técnico tenta resolver no local, para a entrega seguir o quanto antes.",
  },
  {
    titulo: "Chaveiro e troca de pneu",
    texto: "Troca o pneu furado ou ajuda com a chave, para a viagem não perder o prazo.",
  },
  {
    titulo: "Transporte até o destino",
    texto: "Se o veículo for de guincho, há transporte de volta para casa ou até o destino.",
  },
];

export const MOTIVOS_CARRO: CardSuhai[] = [
  {
    titulo: "Maior aceitação",
    texto: "Carro novo, antigo, elétrico ou modificado, de qualquer ano, no lazer ou no trabalho, inclusive aplicativo.",
  },
  {
    titulo: "Seguro sob medida",
    texto: "Dá para combinar só as coberturas que fazem sentido, sem pagar o que não vai usar.",
  },
  {
    titulo: "Preço justo e sem surpresa",
    texto: "O que está contratado fica claro. Não há taxa escondida.",
  },
  {
    titulo: "Contratação online",
    texto: "A cotação começa no celular ou no computador, sem papelada.",
  },
  {
    titulo: "Atendimento humano 24h",
    texto: "Na emergência, o contato é com gente, a qualquer hora.",
  },
];

export const MOTIVOS_MOTO: CardSuhai[] = [
  {
    titulo: "Maior aceitação",
    texto: "Moto de qualquer modelo, ano ou uso, no lazer ou no trabalho.",
  },
  {
    titulo: "Proteção sob medida",
    texto: "As coberturas se combinam, e o pagamento fica no que é essencial.",
  },
  {
    titulo: "Preço justo e sem surpresa",
    texto: "O valor cabe no bolso e a cobertura é explicada sem letra miúda.",
  },
  {
    titulo: "Contratação digital",
    texto: "O processo é rápido e sem papelada, de onde você estiver.",
  },
  {
    titulo: "Quem entende de moto",
    texto: "O atendimento é de uma equipe que trata de seguro de moto.",
  },
];

export const MOTIVOS_CAMINHAO: CardSuhai[] = [
  {
    titulo: "Aceitação para o transporte",
    texto: "Caminhão, van e VUC de qualquer marca ou ano, novo ou antigo.",
  },
  {
    titulo: "Feito para quem trabalha",
    texto: "O plano leva as coberturas da rotina, sem item que não entra no frete.",
  },
  {
    titulo: "Preço que cabe no orçamento",
    texto: "Plano acessível e transparente, sem comer o valor da viagem.",
  },
  {
    titulo: "Contratação sem papelada",
    texto: "Tudo digital, com gente para orientar cada passo.",
  },
  {
    titulo: "Assistência nas estradas",
    texto: "Socorro 24h no Brasil, para o veículo não ficar parado.",
  },
];

export const FESTIVAL_MOTO: CardSuhai = {
  titulo: "Suhai Festival Interlagos",
  texto:
    "A Suhai se apresenta como patrocinadora do festival e como seguradora líder em motos no Brasil. A página de moto usa esse lugar para mostrar que a proteção acompanha quem vive sobre duas rodas.",
};

export const PERGUNTAS_HOME: PerguntaSuhai[] = [
  {
    question: "Como funciona a contratação do seguro Suhai?",
    answer:
      "A cotação é gratuita e sem compromisso. Você informa o veículo e alguns dados e recebe uma proposta com o valor e as coberturas do seu perfil.",
  },
  {
    question: "Quais veículos a Suhai aceita?",
    answer:
      "Moto, carro e caminhão de marcas, anos e modelos diferentes, inclusive antigo, modificado, blindado e de uso profissional. A ideia é proteger do 0km ao usado.",
  },
  {
    question: "A Suhai é confiável?",
    answer:
      "Sim. É uma seguradora autorizada e regulada pela SUSEP. Publica mais de 1,5 milhão de clientes e se apresenta pela transparência e pelo atendimento próximo. A reputação pública dela está no bloco desta página e na página da Suhai no Reclame Aqui.",
  },
  {
    question: "Quanto tempo leva para aprovar o seguro?",
    answer:
      "A aprovação costuma sair em até 24 horas, depois do envio dos dados e documentos. Com tudo validado, a apólice digital é emitida.",
  },
  {
    question: "Como funciona o sinistro?",
    answer:
      "Em roubo, furto, colisão ou perda total, o contato é com a Suhai. O time orienta do registro à indenização, com acompanhamento até a resolução.",
  },
];

export const PERGUNTAS_CARRO: PerguntaSuhai[] = [
  {
    question: "A Suhai aceita carros antigos, importados ou de qualquer ano?",
    answer:
      "Sim. Aceita marca, modelo e ano diversos, inclusive carro antigo, de coleção e importado que outras seguradoras recusam.",
  },
  {
    question: "Posso contratar se eu for motorista de aplicativo?",
    answer: "Sim. O seguro de carro atende quem usa o veículo para trabalhar, inclusive Uber e 99.",
  },
  {
    question: "Qual a diferença entre perda total e cobertura completa?",
    answer:
      "A perda total cobre o carro sem conserto, depois de batida grave, incêndio ou alagamento, e também o roubo sem recuperação. A cobertura completa, como a Suhai descreve, inclui isso e o conserto de batida menor. Na cotação desta página, o plano Completo é roubo e furto mais perda total.",
  },
  {
    question: "Como funciona o parcelamento?",
    answer: PARCELAMENTO,
  },
  {
    question: "A Suhai aceita carro modificado, rebaixado ou tunado?",
    answer: "Sim. Aceita modificação e customização, com proteção para rodar.",
  },
];

export const PERGUNTAS_MOTO: PerguntaSuhai[] = [
  {
    question: "A Suhai aceita moto de qualquer ano ou modelo?",
    answer: "Sim. Protege marca, cilindrada e ano diversos, nova, antiga ou de coleção.",
  },
  {
    question: "Posso contratar se usar a moto para entrega?",
    answer: "Sim. Inclui uso profissional e aplicativo de entrega.",
  },
  {
    question: "O seguro cobre moto modificada ou customizada?",
    answer: "Sim. Aceita alteração e customização.",
  },
  {
    question: "Quais são as formas de pagamento?",
    answer: PARCELAMENTO,
  },
  {
    question: "O que acontece se a moto for roubada e não voltar?",
    answer:
      "Se o veículo não for localizado, a indenização segue o plano contratado e pode chegar a 100% da tabela FIPE.",
  },
];

export const PERGUNTAS_CAMINHAO: PerguntaSuhai[] = [
  {
    question: "A Suhai aceita caminhão e van de qualquer ano ou modelo?",
    answer: "Sim. Aceita pesado, leve e utilitário de qualquer marca ou ano, inclusive modelo antigo.",
  },
  {
    question: "Posso contratar para frota ou uso profissional?",
    answer: "Sim. Atende motorista autônomo, pequena frota e entrega urbana com VUC.",
  },
  {
    question: "O que a cobertura completa muda para o meu veículo?",
    answer:
      "O plano mais enxuto foca em roubo, furto ou perda total. A cobertura completa, como a Suhai descreve, também cobre o conserto em batida menor. Na cotação desta página, o plano Completo é roubo e furto mais perda total.",
  },
  {
    question: "Como funciona o guincho para veículo pesado?",
    answer:
      "A assistência 24h da Suhai inclui guincho em todo o Brasil, até 500 km, e socorro para problema mecânico ou elétrico. Na cotação, a assistência é escolhida à parte: sem guincho, até 200 km ou até 500 km.",
  },
  {
    question: "Como parcelar trabalhando por conta própria?",
    answer: PARCELAMENTO,
  },
];
