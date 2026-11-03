#!/usr/bin/env node
/**
 * Resumo de uma campanha (somente leitura): status, orçamento, grupos,
 * palavras-chave, anúncios com revisão, negativas, critérios, assets e metas
 * (incluindo a meta personalizada, quando a campanha usa uma).
 *
 *   node ads-verify-campaign.mjs --campaign-id=123
 */
import { adsSession, argValue, searchAll } from "./lib/ads-rest.mjs";

const id = String(argValue("campaign-id") || "").replace(/\D/g, "");
if (!id) {
  console.error("Uso: node ads-verify-campaign.mjs --campaign-id=<id>");
  process.exit(1);
}

const s = await adsSession();
const rn = `customers/${s.ads.customerId}/campaigns/${id}`;

const [camp] = await searchAll(
  s,
  `SELECT campaign.id, campaign.name, campaign.status, campaign.serving_status,
     campaign.bidding_strategy_type, campaign.network_settings.target_search_network,
     campaign.network_settings.target_content_network, campaign_budget.amount_micros
   FROM campaign WHERE campaign.id = ${id}`,
);
const grupos = await searchAll(
  s,
  `SELECT ad_group.name, ad_group.status FROM ad_group
   WHERE ad_group.campaign = '${rn}' AND ad_group.status != 'REMOVED'`,
);
const keywords = await searchAll(
  s,
  `SELECT ad_group.name, ad_group_criterion.keyword.match_type FROM ad_group_criterion
   WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.negative = FALSE
     AND ad_group_criterion.status != 'REMOVED' AND campaign.id = ${id}`,
);
const anuncios = await searchAll(
  s,
  `SELECT ad_group.name, ad_group_ad.status, ad_group_ad.policy_summary.review_status,
     ad_group_ad.policy_summary.approval_status, ad_group_ad.ad.final_urls
   FROM ad_group_ad WHERE ad_group_ad.status != 'REMOVED' AND campaign.id = ${id}`,
);
const criterios = await searchAll(
  s,
  `SELECT campaign_criterion.type, campaign_criterion.negative FROM campaign_criterion
   WHERE campaign_criterion.campaign = '${rn}'`,
);
const assets = await searchAll(
  s,
  `SELECT campaign_asset.field_type, campaign_asset.status FROM campaign_asset
   WHERE campaign_asset.campaign = '${rn}' AND campaign_asset.status != 'REMOVED'`,
);
const metas = await searchAll(
  s,
  `SELECT campaign_conversion_goal.category, campaign_conversion_goal.origin, campaign_conversion_goal.biddable
   FROM campaign_conversion_goal WHERE campaign_conversion_goal.campaign = '${rn}'`,
);
const [goalConfig] = await searchAll(
  s,
  `SELECT conversion_goal_campaign_config.goal_config_level, conversion_goal_campaign_config.custom_conversion_goal
   FROM conversion_goal_campaign_config WHERE conversion_goal_campaign_config.campaign = '${rn}'`,
);
const customGoalRn = goalConfig?.conversionGoalCampaignConfig?.customConversionGoal;
let metaPersonalizada = null;
if (customGoalRn) {
  const [g] = await searchAll(
    s,
    `SELECT custom_conversion_goal.name, custom_conversion_goal.status, custom_conversion_goal.conversion_actions
     FROM custom_conversion_goal WHERE custom_conversion_goal.resource_name = '${customGoalRn}'`,
  );
  const acoesRn = g?.customConversionGoal?.conversionActions || [];
  const nomes = acoesRn.length
    ? await searchAll(
        s,
        `SELECT conversion_action.name FROM conversion_action
         WHERE conversion_action.resource_name IN (${acoesRn.map((r) => `'${r}'`).join(", ")})`,
      )
    : [];
  metaPersonalizada = {
    nome: g?.customConversionGoal?.name,
    status: g?.customConversionGoal?.status,
    acoes: nomes.map((n) => n.conversionAction.name),
  };
}

const contar = (linhas, chave) =>
  linhas.reduce((acc, l) => {
    const k = chave(l);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

console.log(
  JSON.stringify(
    {
      campanha: camp && {
        id: camp.campaign.id,
        nome: camp.campaign.name,
        status: camp.campaign.status,
        servingStatus: camp.campaign.servingStatus,
        lance: camp.campaign.biddingStrategyType,
        parceirosPesquisa: camp.campaign.networkSettings?.targetSearchNetwork ?? false,
        display: camp.campaign.networkSettings?.targetContentNetwork ?? false,
        orcamentoDia: Number(camp.campaignBudget?.amountMicros || 0) / 1e6,
      },
      grupos: grupos.map((g) => `${g.adGroup.name} (${g.adGroup.status})`),
      keywordsPorGrupo: contar(keywords, (k) => `${k.adGroup.name} | ${k.adGroupCriterion.keyword.matchType}`),
      anuncios: anuncios.map((a) => ({
        grupo: a.adGroup.name,
        status: a.adGroupAd.status,
        revisao: a.adGroupAd.policySummary?.reviewStatus,
        aprovacao: a.adGroupAd.policySummary?.approvalStatus,
        url: a.adGroupAd.ad.finalUrls?.[0],
      })),
      criterios: contar(criterios, (c) => `${c.campaignCriterion.type}${c.campaignCriterion.negative ? " (negativa)" : ""}`),
      assets: contar(assets, (a) => a.campaignAsset.fieldType),
      metasNoLance: metas
        .filter((m) => m.campaignConversionGoal.biddable)
        .map((m) => `${m.campaignConversionGoal.category}|${m.campaignConversionGoal.origin}`),
      nivelDasMetas: goalConfig?.conversionGoalCampaignConfig?.goalConfigLevel,
      metaPersonalizada,
    },
    null,
    2,
  ),
);
