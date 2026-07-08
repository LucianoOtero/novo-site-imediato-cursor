import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { buildPageMetadata } from "@/lib/metadata";
import { company } from "@/lib/company";

/**
 * `/termos` — Termos de Uso (item de `docs/DADOS_OFICIAIS.md`, seção 64).
 *
 * Não existia texto oficial aprovado pelo Jurídico (confirmado pelo
 * cliente em 2026-07-03). A pedido explícito do cliente ("Pode redigir
 * versões genéricas com base no mercado e adotá-las"), o texto abaixo é
 * uma versão genérica, alinhada a práticas de mercado para corretoras de
 * seguros brasileiras, adotada como conteúdo oficial desta página. Não
 * substitui uma revisão jurídica formal futura — ver nota completa em
 * `docs/DADOS_OFICIAIS.md`.
 */
export const metadata: Metadata = buildPageMetadata({
  title: "Termos de Uso | Imediato Seguros",
  description: "Condições de uso do site da Imediato Seguros e do serviço de cotação de seguros.",
  path: "/termos",
});

export default function TermosPage() {
  return (
    <Section>
      <Container className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <FileText className="size-8 shrink-0 text-brand-500" aria-hidden="true" />
          <h1 className="font-display text-3xl font-bold text-neutral-900 md:text-4xl">Termos de Uso</h1>
        </div>

        <div className="mt-6 space-y-6 text-neutral-900">
          <p>
            Estes Termos de Uso regulam o acesso e uso deste site, de propriedade da{" "}
            <strong>{company.legalName}</strong> ({company.tradeName}), CNPJ {company.cnpj}. Ao acessar este site ou
            solicitar uma cotação, você concorda com os termos descritos abaixo.
          </p>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">1. Sobre a {company.tradeName}</h2>
            <p className="mt-2">
              A {company.tradeName} é uma corretora de seguros registrada na SUSEP (registro {company.susep}), que
              atua intermediando a contratação de seguros entre você e seguradoras parceiras. A {company.tradeName}{" "}
              não é uma seguradora — a contratação e a apólice em si são sempre firmadas com a seguradora escolhida,
              conforme as condições gerais e particulares dela.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">2. Uso do site</h2>
            <p className="mt-2">
              Este site destina-se a fornecer informações institucionais e permitir a solicitação de cotações de
              seguro. Você concorda em fornecer informações verdadeiras, completas e atualizadas ao preencher
              qualquer formulário, e em não utilizar o site para fins ilícitos, fraudulentos ou que possam prejudicar
              seu funcionamento ou o de terceiros.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">3. Cotação sem compromisso</h2>
            <p className="mt-2">
              A solicitação de cotação através deste site é gratuita e não gera, por si só, nenhuma obrigação de
              contratação para você. A cotação apresentada é uma estimativa, sujeita a análise de risco e condições
              definidas pela seguradora escolhida — os valores e coberturas finais só são confirmados no momento da
              efetiva contratação da apólice.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">4. Propriedade intelectual</h2>
            <p className="mt-2">
              Todo o conteúdo deste site — incluindo textos, layout, marca e logotipo — é de propriedade da{" "}
              {company.tradeName} ou de seus licenciantes, sendo protegido pela legislação de propriedade
              intelectual aplicável. É vedada a reprodução, distribuição ou uso comercial deste conteúdo sem
              autorização prévia e expressa.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">5. Links para sites de terceiros</h2>
            <p className="mt-2">
              Este site pode conter links para sites de terceiros (por exemplo, seguradoras parceiras ou redes
              sociais). A {company.tradeName} não se responsabiliza pelo conteúdo, práticas de privacidade ou
              disponibilidade desses sites externos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">6. Limitação de responsabilidade</h2>
            <p className="mt-2">
              Empregamos esforços razoáveis para manter as informações deste site atualizadas e precisas, mas não
              garantimos a ausência total de erros ou interrupções. A {company.tradeName} não se responsabiliza por
              danos decorrentes do uso indevido do site ou de decisões tomadas exclusivamente com base nas
              informações aqui disponibilizadas, sem confirmação junto aos nossos canais oficiais de atendimento.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">7. Privacidade</h2>
            <p className="mt-2">
              O tratamento de dados pessoais coletados através deste site segue nossa{" "}
              <a href={company.legalUrls.privacyPolicy} className="font-medium text-brand-700 underline underline-offset-2">
                Política de Privacidade
              </a>
              , parte integrante destes Termos de Uso.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">8. Alterações a estes termos</h2>
            <p className="mt-2">
              Estes Termos de Uso podem ser atualizados periodicamente. O uso continuado do site após uma atualização
              constitui aceitação dos novos termos. A data da última atualização estará sempre indicada nesta página.
            </p>
            <p className="mt-2 text-sm text-neutral-500">Última atualização: julho de 2026.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-neutral-900">9. Legislação aplicável e contato</h2>
            <p className="mt-2">
              Estes Termos de Uso são regidos pela legislação brasileira. Em caso de dúvidas, entre em contato pelo
              e-mail{" "}
              <a href={`mailto:${company.contact.email}`} className="font-medium text-brand-700 underline underline-offset-2">
                {company.contact.email}
              </a>{" "}
              ou pelo telefone {company.contact.phoneDisplay}.
            </p>
          </section>
        </div>
      </Container>
    </Section>
  );
}
