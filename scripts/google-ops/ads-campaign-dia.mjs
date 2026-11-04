#!/usr/bin/env node
/**
 * Somente leitura: desempenho de uma campanha num intervalo de datas.
 * Por dia (impressões, cliques, custo, conversões), por grupo, termos de
 * pesquisa e conversões por ação (na campanha e na conta inteira).
 *
 *   node ads-campaign-dia.mjs --campaign-id=24433459330
 *   node ads-campaign-dia.mjs --campaign-id=24433459330 --start=2026-11-04 --end=2026-11-05
 */
import { adsSession, argValue, searchAll } from "./lib/ads-rest.mjs";

const id = String(argValue("campaign-id") || "").replace(/\D/g, "");
if (!id) {
  console.error("Uso: node ads-campaign-dia.mjs --campaign-id=<id> [--start=AAAA-MM-DD] [--end=AAAA-MM-DD]");
  process.exit(1);
}
const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const start = argValue("start") || hoje;
const end = argValue("end") || hoje;
const periodo = `segments.date BETWEEN '${start}' AND '${end}'`;

const s = await adsSession();
const rn = `customers/${s.ads.customerId}/campaigns/${id}`;
const reais = (micros) => Math.round(Number(micros || 0) / 1e4) / 100;
const num = (v) => Math.round(Number(v || 0) * 100) / 100;

const dias = await searchAll(
  s,
  `SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros,
     metrics.conversions, metrics.all_conversions, metrics.search_impression_share,
     metrics.search_budget_lost_impression_share, metrics.search_rank_lost_impression_share
   FROM campaign WHERE campaign.id = ${id} AND ${periodo} ORDER BY segments.date`,
);
const grupos = await searchAll(
  s,
  `SELECT ad_group.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
   FROM ad_group WHERE ad_group.campaign = '${rn}' AND ${periodo}`,
);
const termos = await searchAll(
  s,
  `SELECT search_term_view.search_term, search_term_view.status, ad_group.name,
     metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
   FROM search_term_view WHERE campaign.id = ${id} AND ${periodo}
   ORDER BY metrics.impressions DESC LIMIT 40`,
);
const porAcaoCampanha = await searchAll(
  s,
  `SELECT segments.conversion_action_name, metrics.conversions, metrics.all_conversions
   FROM campaign WHERE campaign.id = ${id} AND ${periodo}`,
);
const porAcaoConta = await searchAll(
  s,
  `SELECT segments.conversion_action_name, metrics.all_conversions
   FROM customer WHERE ${periodo} AND segments.conversion_action_name LIKE 'Suhai%'`,
);

console.log(
  JSON.stringify(
    {
      periodo: { start, end },
      dias: dias.map((d) => ({
        data: d.segments.date,
        impressoes: Number(d.metrics.impressions || 0),
        cliques: Number(d.metrics.clicks || 0),
        custo: reais(d.metrics.costMicros),
        conversoes: num(d.metrics.conversions),
        todasConversoes: num(d.metrics.allConversions),
        parcelaImpressoes: d.metrics.searchImpressionShare ?? null,
        perdaPorOrcamento: d.metrics.searchBudgetLostImpressionShare ?? null,
        perdaPorClassificacao: d.metrics.searchRankLostImpressionShare ?? null,
      })),
      grupos: grupos.map((g) => ({
        grupo: g.adGroup.name,
        impressoes: Number(g.metrics.impressions || 0),
        cliques: Number(g.metrics.clicks || 0),
        custo: reais(g.metrics.costMicros),
        conversoes: num(g.metrics.conversions),
      })),
      termos: termos.map((t) => ({
        termo: t.searchTermView.searchTerm,
        status: t.searchTermView.status,
        grupo: t.adGroup.name,
        impressoes: Number(t.metrics.impressions || 0),
        cliques: Number(t.metrics.clicks || 0),
        custo: reais(t.metrics.costMicros),
        conversoes: num(t.metrics.conversions),
      })),
      conversoesPorAcaoNaCampanha: porAcaoCampanha.map((c) => ({
        acao: c.segments.conversionActionName,
        conversoes: num(c.metrics.conversions),
        todas: num(c.metrics.allConversions),
      })),
      acoesSuhaiNaConta: porAcaoConta.map((c) => ({
        acao: c.segments.conversionActionName,
        todas: num(c.metrics.allConversions),
      })),
    },
    null,
    2,
  ),
);
