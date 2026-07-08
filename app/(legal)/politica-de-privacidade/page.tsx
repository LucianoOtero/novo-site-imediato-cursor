import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { buildPageMetadata } from "@/lib/metadata";
import { company } from "@/lib/company";

/**
 * `/politica-de-privacidade` — Política de Privacidade (item de
 * `docs/DADOS_OFICIAIS.md`, seção 64).
 *
 * Não existia texto oficial aprovado pelo Jurídico (confirmado pelo
 * cliente em 2026-07-03). A pedido explícito do cliente ("Pode redigir
 * versões genéricas com base no mercado e adotá-las"), o texto abaixo é
 * uma versão genérica, alinhada a práticas de mercado para corretoras de
 * seguros brasileiras e à LGPD (Lei 13.709/2018), adotada como conteúdo
 * oficial desta página. Não substitui uma revisão jurídica formal futura
 * — ver nota completa em `docs/DADOS_OFICIAIS.md`.
 */
export const metadata: Metadata = buildPageMetadata({
  title: "Política de Privacidade | Imediato Seguros",
  description: "Como a Imediato Seguros coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.",
  path: "/politica-de-privacidade",
});

export default function PoliticaDePrivacidadePage() {
  return (
    <Section>
      <Container className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-8 shrink-0 text-brand-500" aria-hidden="true" />
          <h1 className="font-display text-3xl font-bold text-neutral-900 md:text-4xl">Política de Privacidade</h1>
        </div>

        <div className="mt-6 space-y-6 text-neutral-900">
          <p>
            Esta Política de Privacidade descreve como a <strong>{company.legalName}</strong> ({company.tradeName}),
            inscrita no CNPJ {company.cnpj}, coleta, usa, armazena e protege os dados pessoais de quem visita este
            site ou solicita uma cotação de seguro, em conformidade com a Lei Geral de Proteção de Dados (Lei nº
            13.709/2018 — LGPD).
          </p>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">1. Quem somos</h2>
            <p className="mt-2">
              A {company.tradeName} é uma corretora de seguros devidamente registrada na SUSEP (registro{" "}
              {company.susep}), atuando como intermediária entre você e as seguradoras parceiras para cotação e
              contratação de seguros. Para fins da LGPD, somos a controladora dos dados pessoais coletados através
              deste site.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">2. Quais dados coletamos</h2>
            <p className="mt-2">Coletamos os dados que você nos fornece diretamente ao solicitar uma cotação, entre eles:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Nome completo;</li>
              <li>DDD e número de telefone/WhatsApp;</li>
              <li>CPF;</li>
              <li>CEP;</li>
              <li>Placa do veículo (quando aplicável ao tipo de seguro);</li>
              <li>Tipo de seguro de interesse e demais informações fornecidas no formulário de cotação.</li>
            </ul>
            <p className="mt-2">
              Também podemos coletar automaticamente dados de navegação (como páginas visitadas, origem do acesso e
              parâmetros de campanha), por meio de cookies e tecnologias semelhantes — ver a seção 6 abaixo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">3. Para que usamos seus dados</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Elaborar e enviar cotações de seguro junto às seguradoras parceiras;</li>
              <li>Entrar em contato com você por telefone, WhatsApp ou e-mail para dar continuidade ao atendimento;</li>
              <li>Cumprir obrigações legais e regulatórias aplicáveis à atividade de corretagem de seguros (SUSEP);</li>
              <li>Melhorar a experiência de navegação e medir a performance deste site (quando você consente com cookies de analytics/marketing).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">4. Bases legais</h2>
            <p className="mt-2">
              Tratamos seus dados com base no seu consentimento (ao preencher o formulário de cotação), na execução
              de procedimentos preliminares relacionados a um possível contrato de seguro do qual você é parte
              interessada, no cumprimento de obrigação legal/regulatória (SUSEP) e, quando aplicável, em nosso
              legítimo interesse em manter contato comercial, sempre respeitando seus direitos e expectativas.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">5. Com quem compartilhamos seus dados</h2>
            <p className="mt-2">Seus dados podem ser compartilhados com:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Seguradoras parceiras, para fins de cotação e eventual contratação do seguro escolhido por você;</li>
              <li>Prestadores de tecnologia que operam nosso CRM, sistemas de atendimento e infraestrutura (sob obrigação contratual de confidencialidade);</li>
              <li>Autoridades públicas, quando exigido por lei, regulação (SUSEP) ou ordem judicial.</li>
            </ul>
            <p className="mt-2">Não vendemos seus dados pessoais a terceiros.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">6. Cookies e tecnologias de rastreamento</h2>
            <p className="mt-2">
              Usamos cookies essenciais ao funcionamento do site e, mediante seu consentimento, cookies de analytics
              e marketing (para entender como o site é usado e personalizar anúncios). Você pode gerenciar suas
              preferências a qualquer momento pelo link &ldquo;Preferências de cookies&rdquo; no rodapé deste site.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">7. Armazenamento, segurança e retenção</h2>
            <p className="mt-2">
              Adotamos medidas técnicas e organizacionais razoáveis para proteger seus dados contra acesso não
              autorizado, perda ou uso indevido. Mantemos seus dados pelo tempo necessário para cumprir as
              finalidades descritas nesta política e as obrigações legais/regulatórias aplicáveis à atividade de
              corretagem de seguros, após o que são eliminados ou anonimizados, salvo exigência legal em contrário.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">8. Seus direitos</h2>
            <p className="mt-2">Nos termos da LGPD, você pode, a qualquer momento, solicitar:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Confirmação da existência de tratamento e acesso aos seus dados;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
              <li>Portabilidade dos dados a outro fornecedor de serviço, mediante requisição expressa;</li>
              <li>Revogação do consentimento e informação sobre as consequências da negativa;</li>
              <li>Oposição a tratamento realizado com base em outra hipótese legal, em caso de descumprimento da LGPD.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">9. Como exercer seus direitos</h2>
            <p className="mt-2">
              Para exercer qualquer um dos direitos acima, entre em contato pelo e-mail{" "}
              <a href={`mailto:${company.contact.email}`} className="font-medium text-brand-700 underline underline-offset-2">
                {company.contact.email}
              </a>{" "}
              ou pelo telefone {company.contact.phoneDisplay}.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">10. Alterações a esta política</h2>
            <p className="mt-2">
              Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças em nossas
              práticas ou na legislação aplicável. A data da última atualização estará sempre indicada nesta página.
            </p>
            <p className="mt-2 text-sm text-neutral-500">Última atualização: julho de 2026.</p>
          </section>
        </div>
      </Container>
    </Section>
  );
}
