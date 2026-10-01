"use client";

import { Hero } from "@/components/home/Hero";
import { CredBar } from "@/components/social/CredBar";
import { CotacaoSuhaiExperiencia } from "@/components/suhai/CotacaoSuhaiExperiencia";

/**
 * Hero da cotação Suhai no visual da Imediato e, depois do cálculo, os planos.
 * A CredBar mobile fica entre os dois, como na home.
 */
export function CotacaoSuhaiBloco() {
  return (
    <CotacaoSuhaiExperiencia
      cabecalho={(formulario) => (
        <>
          <Hero
            ramoSlug="auto"
            partnerLogo={{
              src: "/logos/seguradoras/suhai.svg",
              alt: "Suhai Seguros",
              className: "h-14 w-auto md:h-16",
              semMoldura: true,
            }}
            eyebrow="Seguro contra roubo e furto"
            headline={"Veja o preço agora\nsem esperar retorno"}
            subheadline={"Três etapas curtas: placa, CEP e CPF.\nO plano você escolhe em seguida."}
            badge="Preço na hora · sem compromisso"
            form={formulario}
          />
          <div className="lg:hidden">
            <CredBar variant="complementar" omitirParceiras />
          </div>
        </>
      )}
    />
  );
}
