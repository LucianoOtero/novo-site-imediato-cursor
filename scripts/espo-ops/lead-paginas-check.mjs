/**
 * Somente leitura: confere se os leads do site criados no Espo PROD desde
 * `--desde` chegaram com "Página da captura" (cPaginaCaptura) e "Página de
 * entrada" (cLandingPage), no Lead e na Oportunidade ligada (cLeadId).
 * Imprime só IDs, datas, host + caminho das páginas e booleanos.
 *
 *   ESPOCRM_API_CONFIG=<secret> node scripts/espo-ops/lead-paginas-check.mjs [--desde 2026-11-04T21:00:00Z]
 *
 * Grava o resultado em scripts/espo-ops/logs/lead-paginas-*.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { espoListAll, isTestLead, resolveEspoConfig, siteBucket } from "./lib/espo-client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argDesde = process.argv.indexOf("--desde");
const desde = new Date(argDesde > -1 ? process.argv[argDesde + 1] : Date.now() - 24 * 3600 * 1000);
if (Number.isNaN(desde.getTime())) throw new Error("--desde inválido");
const desdeEspo = desde.toISOString().slice(0, 19).replace("T", " ");

const pagina = (v) => (v ? String(v).split(/[?#]/)[0].slice(0, 120) : null);

async function main() {
  const espo = resolveEspoConfig({ prefer: "prod" });
  const leads = await espoListAll(espo, "Lead", {
    select: ["id", "createdAt", "name", "emailAddress", "cWebpage", "cPaginaCaptura", "cLandingPage"],
    where: [{ type: "after", attribute: "createdAt", value: desdeEspo }],
    orderBy: "createdAt",
    order: "asc",
  });

  const linhas = [];
  for (const l of leads) {
    const opps = await espoListAll(espo, "Opportunity", {
      select: ["id", "createdAt", "cPaginaCaptura", "cLandingPage"],
      where: [{ type: "equals", attribute: "cLeadId", value: l.id }],
      maxPages: 2,
    });
    linhas.push({
      lead: l.id,
      criadoEm: l.createdAt,
      teste: isTestLead(l),
      origem: siteBucket(l.cWebpage),
      leadPaginaCaptura: pagina(l.cPaginaCaptura),
      leadPaginaEntrada: pagina(l.cLandingPage),
      oportunidades: opps.length,
      oppComPaginaCaptura: opps.filter((o) => o.cPaginaCaptura).length,
      oppComPaginaEntrada: opps.filter((o) => o.cLandingPage).length,
    });
  }

  const reais = linhas.filter((r) => !r.teste);
  const completos = reais.filter(
    (r) =>
      r.leadPaginaCaptura &&
      r.leadPaginaEntrada &&
      r.oportunidades > 0 &&
      r.oppComPaginaCaptura === r.oportunidades &&
      r.oppComPaginaEntrada === r.oportunidades
  );
  const resumo = {
    verificadoEm: new Date().toISOString(),
    espo: espo.source,
    desde: desde.toISOString(),
    leads: linhas.length,
    leadsDeTeste: linhas.length - reais.length,
    leadsReais: reais.length,
    leadsReaisCompletos: completos.length,
    veredito:
      reais.length === 0
        ? "sem leads reais no período"
        : completos.length === reais.length
          ? "OK: todos os leads reais com as duas páginas no Lead e na Oportunidade"
          : `ATENÇÃO: ${reais.length - completos.length} de ${reais.length} lead(s) real(is) sem alguma das páginas`,
  };

  const out = { ...resumo, detalhes: linhas };
  const dir = path.join(__dirname, "logs");
  fs.mkdirSync(dir, { recursive: true });
  const arquivo = path.join(dir, `lead-paginas-${resumo.verificadoEm.slice(0, 16).replace(/[:T]/g, "-")}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  console.log(`Log: ${arquivo}`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
