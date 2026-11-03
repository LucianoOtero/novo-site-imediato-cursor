#!/usr/bin/env node
/**
 * Meta personalizada "Suhai - Lance" (Contato Suhai + Proposta Suhai + venda
 * offline 303889427) ligada só à campanha Suhai. As outras campanhas seguem
 * nas metas da conta.
 *
 *   node ads-suhai-custom-goal.mjs            → dry-run
 *   node ads-suhai-custom-goal.mjs --apply
 *   node ads-suhai-custom-goal.mjs --remove   → campanha volta às metas por categoria
 *                                               (SUBMIT_LEAD_FORM e PURCHASE); meta REMOVED
 */
import { lerAcoesSuhai } from "./ads-suhai-conversion-actions.mjs";
import { adsSession, argValue, gaqlString, mutate, searchAll, writeLog } from "./lib/ads-rest.mjs";

const APPLY = process.argv.includes("--apply");
const REMOVE = process.argv.includes("--remove");
const CAMPAIGN_ID = String(argValue("campaign-id") || "24433459330").replace(/\D/g, "");
const GOAL_NAME = "Suhai - Lance";
const OFFLINE_ACTION_ID = "303889427";

async function lerConfig(s, campaignRn) {
  const [row] = await searchAll(
    s,
    `SELECT conversion_goal_campaign_config.resource_name, conversion_goal_campaign_config.goal_config_level,
       conversion_goal_campaign_config.custom_conversion_goal
     FROM conversion_goal_campaign_config WHERE conversion_goal_campaign_config.campaign = '${campaignRn}'`,
  );
  return row?.conversionGoalCampaignConfig;
}

async function lerMeta(s) {
  const [row] = await searchAll(
    s,
    `SELECT custom_conversion_goal.resource_name, custom_conversion_goal.name, custom_conversion_goal.status,
       custom_conversion_goal.conversion_actions
     FROM custom_conversion_goal WHERE custom_conversion_goal.name = '${gaqlString(GOAL_NAME)}'
       AND custom_conversion_goal.status != 'REMOVED'`,
  );
  return row?.customConversionGoal;
}

async function main() {
  const s = await adsSession();
  const cid = s.ads.customerId;
  const campaignRn = `customers/${cid}/campaigns/${CAMPAIGN_ID}`;
  const report = { ranAt: new Date().toISOString(), mode: REMOVE ? "remove" : APPLY ? "apply" : "dry-run", steps: [] };

  const antes = { config: await lerConfig(s, campaignRn), meta: await lerMeta(s) };
  report.antes = antes;

  if (REMOVE) {
    if (antes.config?.customConversionGoal) {
      await mutate(s, "conversionGoalCampaignConfigs", {
        operations: [
          {
            update: { resourceName: antes.config.resourceName, goalConfigLevel: "CAMPAIGN" },
            updateMask: "goalConfigLevel,customConversionGoal",
          },
        ],
      });
      report.steps.push({ step: "campaign_back_to_campaign_category_goals" });
    }
    if (antes.meta) {
      await mutate(s, "customConversionGoals", {
        operations: [{ update: { resourceName: antes.meta.resourceName, status: "REMOVED" }, updateMask: "status" }],
      });
      report.steps.push({ step: "goal_removed" });
    }
  } else {
    const acoes = await lerAcoesSuhai(s);
    const contato = acoes.get("Suhai - Contato inicial");
    const proposta = acoes.get("Suhai - Proposta enviada");
    const desejadas = [contato?.resourceName, proposta?.resourceName, `customers/${cid}/conversionActions/${OFFLINE_ACTION_ID}`];
    report.acoesDaMeta = desejadas;
    if (!contato || !proposta) {
      report.steps.push({ step: "blocked", reason: "ações Suhai ainda não existem (ads-suhai-conversion-actions.mjs --apply)" });
    } else if (APPLY) {
      let metaRn = antes.meta?.resourceName;
      if (!metaRn) {
        const r = await mutate(s, "customConversionGoals", {
          operations: [{ create: { name: GOAL_NAME, conversionActions: desejadas, status: "ENABLED" } }],
        });
        metaRn = r.results[0].resourceName;
        report.steps.push({ step: "goal_created", resourceName: metaRn });
      } else {
        await mutate(s, "customConversionGoals", {
          operations: [{ update: { resourceName: metaRn, conversionActions: desejadas }, updateMask: "conversionActions" }],
        });
        report.steps.push({ step: "goal_updated", resourceName: metaRn });
      }
      await mutate(s, "conversionGoalCampaignConfigs", {
        operations: [
          {
            update: {
              resourceName: `customers/${cid}/conversionGoalCampaignConfigs/${CAMPAIGN_ID}`,
              goalConfigLevel: "CAMPAIGN",
              customConversionGoal: metaRn,
            },
            updateMask: "goalConfigLevel,customConversionGoal",
          },
        ],
      });
      report.steps.push({ step: "campaign_uses_custom_goal" });
    } else {
      report.steps.push({ step: antes.meta ? "would_update_goal" : "would_create_goal" }, { step: "would_link_campaign" });
    }
  }

  report.depois = { config: await lerConfig(s, campaignRn), meta: await lerMeta(s) };
  writeLog("suhai-custom-goal", report);
  console.log(JSON.stringify({ mode: report.mode, antes: report.antes, steps: report.steps, depois: report.depois }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
