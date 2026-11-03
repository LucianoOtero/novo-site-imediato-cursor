/**
 * Cria uma campanha Search de seguradora a partir de uma spec JSON (molde da Porto).
 *
 * Uso:
 *   node ads-create-insurer-campaign.mjs --spec=ads-suhai-campaign-spec.json            # dry-run
 *   node ads-create-insurer-campaign.mjs --spec=ads-suhai-campaign-spec.json --apply    # cria PAUSADA
 *   node ads-create-insurer-campaign.mjs --spec=ads-suhai-campaign-spec.json --apply --enable
 *
 * Retomável: cada etapa confere o que já existe (campanha, grupos, anúncios, negativas, assets,
 * metas) e cria só o que falta. A criação nunca ativa a campanha; --enable só vale para uma
 * campanha que já existia antes desta execução.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OPS_ROOT } from "./lib/paths.mjs";
import {
  adsSession,
  argValue,
  chunk,
  gaqlString,
  mutate,
  normKeyword,
  searchAll,
  writeLog,
} from "./lib/ads-rest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const ENABLE = process.argv.includes("--enable");
const MODE = APPLY ? "apply" : "dry-run";

const LIMITS = {
  headline: 30,
  description: 90,
  path: 15,
  callout: 25,
  snippetValue: 25,
  keywordChars: 80,
  keywordWords: 10,
};

function fail(msg) {
  throw new Error(`TRAVA: ${msg}`);
}

function assertUrl(url, allowedHosts) {
  let u;
  try {
    u = new URL(url);
  } catch {
    fail(`URL inválida: ${url}`);
  }
  if (u.protocol !== "https:") fail(`URL sem https: ${url}`);
  if (!allowedHosts.includes(u.hostname)) {
    fail(`host ${u.hostname} fora de allowedHosts (${allowedHosts.join(", ")})`);
  }
}

function words(t) {
  return normKeyword(t).split(" ").filter(Boolean);
}

function containsSequence(hay, needle) {
  if (!needle.length || needle.length > hay.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    if (needle.every((w, j) => hay[i + j] === w)) return true;
  }
  return false;
}

/** A negativa bloquearia a busca idêntica à palavra-chave positiva? */
function negativeBlocks(neg, positiveText) {
  const p = words(positiveText);
  const n = words(neg.text);
  if (neg.matchType === "EXACT") return n.join(" ") === p.join(" ");
  if (neg.matchType === "PHRASE") return containsSequence(p, n);
  return n.every((w) => p.includes(w));
}

function loadSpec() {
  const specArg = argValue("spec");
  if (!specArg) fail("informe --spec=<arquivo.json>");
  const specPath = path.isAbsolute(specArg) ? specArg : path.join(__dirname, specArg);
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  spec.__path = specPath;
  return spec;
}

function adGroupsOf(spec) {
  return (spec.adGroups || []).map((g) => ({
    ...g,
    finalUrl: g.finalUrl || spec.finalUrl,
    rsa: g.rsa || spec.rsa,
    path1: g.path1 ?? spec.path1,
    path2: g.path2 ?? spec.path2,
  }));
}

function validateSpec(spec) {
  const errors = [];
  const hosts = spec.allowedHosts || [];
  if (!spec.campaignName) errors.push("campaignName ausente");
  if (!hosts.length) errors.push("allowedHosts vazio");
  if (!(Number(spec.budgetDailyBrl) > 0)) errors.push("budgetDailyBrl inválido");
  const groups = adGroupsOf(spec);
  if (!groups.length) errors.push("adGroups vazio");

  for (const g of groups) {
    try {
      assertUrl(g.finalUrl, hosts);
    } catch (e) {
      errors.push(`${g.name}: ${e.message}`);
    }
    const hs = g.rsa?.headlines || [];
    const ds = g.rsa?.descriptions || [];
    if (hs.length < 3 || hs.length > 15) errors.push(`${g.name}: ${hs.length} títulos (3 a 15)`);
    if (ds.length < 2 || ds.length > 4) errors.push(`${g.name}: ${ds.length} descrições (2 a 4)`);
    const seen = new Set();
    for (const h of hs) {
      const t = String(h.text);
      if (t.length > LIMITS.headline) errors.push(`título > ${LIMITS.headline} (${t.length}): ${t}`);
      if (seen.has(t.toLowerCase())) errors.push(`título repetido: ${t}`);
      seen.add(t.toLowerCase());
    }
    for (const d of ds) {
      const t = String(d.text);
      if (t.length > LIMITS.description) errors.push(`descrição > ${LIMITS.description} (${t.length}): ${t}`);
    }
    for (const p of [g.path1, g.path2]) {
      if (p && String(p).length > LIMITS.path) errors.push(`path > ${LIMITS.path}: ${p}`);
    }
    if (!(g.keywords || []).length) errors.push(`${g.name}: sem palavras-chave`);
    for (const k of g.keywords || []) {
      if (!["EXACT", "PHRASE", "BROAD"].includes(k.matchType)) errors.push(`matchType inválido: ${k.text}`);
      if (k.text.length > LIMITS.keywordChars) errors.push(`palavra-chave longa: ${k.text}`);
      if (words(k.text).length > LIMITS.keywordWords) errors.push(`palavra-chave com mais de 10 palavras: ${k.text}`);
    }
  }

  for (const c of spec.assets?.callouts || []) {
    if (c.length > LIMITS.callout) errors.push(`frase de destaque > ${LIMITS.callout} (${c.length}): ${c}`);
  }
  for (const s of spec.assets?.structuredSnippets || []) {
    if ((s.values || []).length < 3) errors.push(`snippet ${s.header}: mínimo 3 valores`);
    for (const v of s.values || []) {
      if (v.length > LIMITS.snippetValue) errors.push(`snippet > ${LIMITS.snippetValue}: ${v}`);
    }
  }
  if (errors.length) fail(`spec inválida:\n - ${errors.join("\n - ")}`);
}

function loadImportedNegatives(spec) {
  const imp = spec.importNegatives;
  if (!imp?.snapshot) return [];
  const p = path.join(OPS_ROOT, imp.snapshot);
  if (!fs.existsSync(p)) fail(`snapshot de negativas ausente (${p}); rode ads-snapshot-campaign.mjs`);
  const snap = JSON.parse(fs.readFileSync(p, "utf8"));
  const exclude = (imp.excludeContaining || []).map(normKeyword);
  const excludeTexts = new Set((imp.excludeTexts || []).map(normKeyword));
  return (snap.campaignNegatives || [])
    .map((n) => ({ text: normKeyword(n.text), matchType: n.matchType || "BROAD", source: "import" }))
    .filter((n) => !excludeTexts.has(n.text) && !exclude.some((x) => n.text.includes(x)));
}

/** Negativas da campanha; as importadas que bloqueariam uma positiva são descartadas, as da spec travam. */
function buildNegatives(spec) {
  const positives = adGroupsOf(spec).flatMap((g) => g.keywords || []);
  const own = (spec.campaignNegatives || []).map((n) => ({
    text: normKeyword(n.text),
    matchType: n.matchType,
    source: "spec",
  }));
  const conflicts = [];
  for (const n of own) {
    const hit = positives.find((p) => negativeBlocks(n, p.text));
    if (hit) conflicts.push(`${n.text} [${n.matchType}] bloqueia ${hit.text} [${hit.matchType}]`);
  }
  if (conflicts.length) fail(`negativas da spec bloqueiam positivas:\n - ${conflicts.join("\n - ")}`);

  const dropped = [];
  const imported = loadImportedNegatives(spec).filter((n) => {
    const hit = positives.find((p) => negativeBlocks(n, p.text));
    if (hit) dropped.push({ negative: n.text, matchType: n.matchType, blocks: hit.text });
    return !hit;
  });

  const map = new Map();
  for (const n of [...own, ...imported]) {
    const key = `${n.text}|${n.matchType}`;
    if (!map.has(key)) map.set(key, n);
  }
  return { negatives: [...map.values()], dropped };
}

function rsaPayload(g) {
  const pin = (x) => {
    const o = { text: x.text };
    if (x.pinnedField) o.pinnedField = x.pinnedField;
    return o;
  };
  return {
    headlines: g.rsa.headlines.map(pin),
    descriptions: g.rsa.descriptions.map(pin),
    path1: g.path1 || undefined,
    path2: g.path2 || undefined,
  };
}

async function findCampaign(s, name) {
  const rows = await searchAll(
    s,
    `SELECT campaign.id, campaign.status, campaign.resource_name
     FROM campaign
     WHERE campaign.name = '${gaqlString(name)}' AND campaign.status != 'REMOVED'`,
  );
  if (rows.length > 1) fail(`há ${rows.length} campanhas com o nome ${name}`);
  return rows[0]?.campaign || null;
}

async function createCampaign(s, spec, report) {
  const amountMicros = String(Math.round(Number(spec.budgetDailyBrl) * 1e6));
  const budgetRes = await mutate(s, "campaignBudgets", {
    operations: [
      {
        create: {
          name: `${spec.campaignName} - budget`,
          amountMicros,
          deliveryMethod: "STANDARD",
          explicitlyShared: false,
        },
      },
    ],
  });
  const budgetRn = budgetRes.results[0].resourceName;
  report.steps.push({ step: "budget", resourceName: budgetRn });

  const campRes = await mutate(s, "campaigns", {
    operations: [
      {
        create: {
          name: spec.campaignName,
          status: "PAUSED",
          advertisingChannelType: "SEARCH",
          campaignBudget: budgetRn,
          networkSettings: spec.networkSettings,
          biddingStrategyType: "MAXIMIZE_CONVERSIONS",
          maximizeConversions: {},
          geoTargetTypeSetting: spec.geoTargetTypeSetting,
          trackingUrlTemplate: spec.trackingUrlTemplate,
          finalUrlSuffix: spec.finalUrlSuffix,
          containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
        },
      },
    ],
  });
  const campaignRn = campRes.results[0].resourceName;
  report.steps.push({ step: "campaign", resourceName: campaignRn, status: "PAUSED" });

  const critOps = [
    ...(spec.geoTargetConstants || []).map((g) => ({
      create: { campaign: campaignRn, location: { geoTargetConstant: g } },
    })),
    ...(spec.excludedGeoTargetConstants || []).map((g) => ({
      create: { campaign: campaignRn, negative: true, location: { geoTargetConstant: g } },
    })),
    ...(spec.languageConstants || []).map((l) => ({
      create: { campaign: campaignRn, language: { languageConstant: l } },
    })),
    ...(spec.adSchedule || []).map((x) => ({
      create: {
        campaign: campaignRn,
        adSchedule: {
          dayOfWeek: x.dayOfWeek,
          startHour: x.startHour,
          endHour: x.endHour,
          startMinute: x.startMinute || "ZERO",
          endMinute: x.endMinute || "ZERO",
        },
      },
    })),
  ];
  if (critOps.length) {
    await mutate(s, "campaignCriteria", { operations: critOps });
    report.steps.push({ step: "campaign_criteria_base", count: critOps.length });
  }
  return { resourceName: campaignRn, id: campaignRn.split("/").pop(), status: "PAUSED" };
}

async function ensureAdGroups(s, spec, campaign, report) {
  const existing = campaign
    ? await searchAll(
        s,
        `SELECT ad_group.name, ad_group.resource_name
         FROM ad_group
         WHERE ad_group.campaign = '${campaign.resourceName}' AND ad_group.status != 'REMOVED'`,
      )
    : [];
  const byName = new Map(existing.map((r) => [r.adGroup.name, r.adGroup.resourceName]));

  for (const g of adGroupsOf(spec)) {
    let adGroupRn = byName.get(g.name);
    if (!adGroupRn) {
      if (!APPLY) {
        report.steps.push({ step: "would_create_ad_group", name: g.name, keywords: g.keywords.length, finalUrl: g.finalUrl });
        continue;
      }
      const agRes = await mutate(s, "adGroups", {
        operations: [
          {
            create: {
              name: g.name,
              campaign: campaign.resourceName,
              status: "ENABLED",
              type: "SEARCH_STANDARD",
              cpcBidMicros: g.cpcBidMicros || "10000",
            },
          },
        ],
      });
      adGroupRn = agRes.results[0].resourceName;
      const kwOps = g.keywords.map((k) => ({
        create: { adGroup: adGroupRn, status: "ENABLED", keyword: { text: k.text, matchType: k.matchType } },
      }));
      for (const part of chunk(kwOps, 50)) await mutate(s, "adGroupCriteria", { operations: part });
      report.steps.push({ step: "ad_group", name: g.name, resourceName: adGroupRn, keywords: kwOps.length });
    }

    const ads = APPLY || byName.has(g.name)
      ? await searchAll(
          s,
          `SELECT ad_group_ad.ad.id
           FROM ad_group_ad
           WHERE ad_group.resource_name = '${adGroupRn}' AND ad_group_ad.status != 'REMOVED'`,
        )
      : [];
    if (ads.length) continue;
    if (!APPLY) {
      report.steps.push({ step: "would_create_rsa", adGroup: g.name, finalUrl: g.finalUrl });
      continue;
    }
    await mutate(s, "adGroupAds", {
      operations: [
        {
          create: {
            adGroup: adGroupRn,
            status: "ENABLED",
            ad: { finalUrls: [g.finalUrl], responsiveSearchAd: rsaPayload(g) },
          },
        },
      ],
    });
    report.steps.push({ step: "rsa", adGroup: g.name, finalUrl: g.finalUrl });
  }
}

async function ensureNegatives(s, campaign, negatives, report) {
  if (campaign) {
    const rows = await searchAll(
      s,
      `SELECT campaign_criterion.criterion_id
       FROM campaign_criterion
       WHERE campaign_criterion.campaign = '${campaign.resourceName}'
         AND campaign_criterion.type = 'KEYWORD' AND campaign_criterion.negative = TRUE`,
    );
    if (rows.length) {
      report.steps.push({ step: "skip_negatives", existing: rows.length });
      return;
    }
  }
  if (!APPLY) {
    report.steps.push({ step: "would_add_negatives", count: negatives.length });
    return;
  }
  const ops = negatives.map((n) => ({
    create: { campaign: campaign.resourceName, negative: true, keyword: { text: n.text, matchType: n.matchType } },
  }));
  for (const part of chunk(ops, 50)) await mutate(s, "campaignCriteria", { operations: part });
  report.steps.push({ step: "campaign_negatives", count: ops.length });
}

async function ensureAssets(s, spec, campaign, report) {
  const callouts = spec.assets?.callouts || [];
  const snippets = spec.assets?.structuredSnippets || [];
  if (!callouts.length && !snippets.length) return;

  const linked = campaign
    ? await searchAll(
        s,
        `SELECT campaign_asset.field_type
         FROM campaign_asset
         WHERE campaign_asset.campaign = '${campaign.resourceName}' AND campaign_asset.status != 'REMOVED'`,
      )
    : [];
  const have = new Set(linked.map((r) => r.campaignAsset.fieldType));

  const plan = [];
  if (callouts.length && !have.has("CALLOUT")) {
    for (const text of callouts) plan.push({ fieldType: "CALLOUT", asset: { calloutAsset: { calloutText: text } } });
  }
  if (snippets.length && !have.has("STRUCTURED_SNIPPET")) {
    for (const sn of snippets) {
      plan.push({
        fieldType: "STRUCTURED_SNIPPET",
        asset: { structuredSnippetAsset: { header: sn.header, values: sn.values } },
      });
    }
  }
  if (!plan.length) {
    report.steps.push({ step: "skip_assets", existing: [...have] });
    return;
  }
  if (!APPLY) {
    report.steps.push({ step: "would_add_assets", count: plan.length });
    return;
  }
  const created = await mutate(s, "assets", { operations: plan.map((p) => ({ create: p.asset })) });
  await mutate(s, "campaignAssets", {
    operations: created.results.map((r, i) => ({
      create: { campaign: campaign.resourceName, asset: r.resourceName, fieldType: plan[i].fieldType },
    })),
  });
  report.steps.push({ step: "assets", count: plan.length });
}

/** Deixa como lance só as metas (categoria + origem) listadas na spec. */
async function ensureConversionGoals(s, spec, campaign, report) {
  const wanted = spec.biddableConversionGoals;
  if (!wanted?.length) return;
  const want = new Set(wanted.map((g) => `${g.category}|${g.origin}`));
  if (!campaign) {
    report.steps.push({ step: "would_set_conversion_goals", biddable: [...want] });
    return;
  }
  const rows = await searchAll(
    s,
    `SELECT campaign_conversion_goal.resource_name, campaign_conversion_goal.category,
       campaign_conversion_goal.origin, campaign_conversion_goal.biddable
     FROM campaign_conversion_goal
     WHERE campaign_conversion_goal.campaign = '${campaign.resourceName}'`,
  );
  const ops = [];
  for (const r of rows) {
    const g = r.campaignConversionGoal;
    const biddable = want.has(`${g.category}|${g.origin}`);
    if (Boolean(g.biddable) !== biddable) {
      ops.push({ update: { resourceName: g.resourceName, biddable }, updateMask: "biddable" });
    }
  }
  const missing = [...want].filter((k) => !rows.some((r) => `${r.campaignConversionGoal.category}|${r.campaignConversionGoal.origin}` === k));
  if (missing.length) report.warnings.push({ conversionGoalsWithoutAction: missing });
  if (!ops.length) {
    report.steps.push({ step: "skip_conversion_goals" });
    return;
  }
  if (!APPLY) {
    report.steps.push({ step: "would_update_conversion_goals", count: ops.length });
    return;
  }
  await mutate(s, "campaignConversionGoals", { operations: ops });
  report.steps.push({ step: "conversion_goals", updated: ops.length, biddable: [...want] });
}

async function main() {
  const spec = loadSpec();
  validateSpec(spec);
  const { negatives, dropped } = buildNegatives(spec);

  const s = await adsSession();
  const report = {
    ranAt: new Date().toISOString(),
    mode: MODE,
    spec: path.basename(spec.__path),
    customerId: s.ads.customerId,
    campaignName: spec.campaignName,
    plan: {
      budgetDailyBrl: spec.budgetDailyBrl,
      adGroups: adGroupsOf(spec).map((g) => ({ name: g.name, keywords: g.keywords.length, finalUrl: g.finalUrl })),
      negatives: negatives.length,
      importedNegativesDropped: dropped,
    },
    steps: [],
    warnings: [],
  };

  let campaign = await findCampaign(s, spec.campaignName);
  const existedBefore = Boolean(campaign);
  if (campaign) {
    report.steps.push({ step: "campaign_exists", id: String(campaign.id), status: campaign.status });
  } else if (APPLY) {
    campaign = await createCampaign(s, spec, report);
  } else {
    report.steps.push({ step: "would_create_campaign", status: "PAUSED" });
  }

  await ensureAdGroups(s, spec, campaign, report);
  await ensureNegatives(s, campaign, negatives, report);
  await ensureAssets(s, spec, campaign, report);
  await ensureConversionGoals(s, spec, campaign, report);

  if (ENABLE) {
    if (!existedBefore) {
      report.warnings.push("--enable ignorado: a campanha foi criada nesta execução; revise e ative em outro passo");
    } else if (campaign.status !== "ENABLED") {
      if (APPLY) {
        await mutate(s, "campaigns", {
          operations: [{ update: { resourceName: campaign.resourceName, status: "ENABLED" }, updateMask: "status" }],
        });
        report.steps.push({ step: "enable", ok: true });
      } else {
        report.steps.push({ step: "would_enable" });
      }
    }
  }

  const prefix = `${normKeyword(spec.logPrefix || "insurer").replace(/\s/g, "-")}-campaign-create`;
  writeLog(prefix, report);
  console.log(
    `${MODE} | ${spec.campaignName} | grupos=${report.plan.adGroups.length} | negativas=${negatives.length} | descartadas=${dropped.length}`,
  );
  for (const st of report.steps) console.log(` - ${st.step}${st.count != null ? ` (${st.count})` : ""}`);
  for (const w of report.warnings) console.log(` ! ${typeof w === "string" ? w : JSON.stringify(w)}`);
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.data) console.error(JSON.stringify(err.data, null, 2).slice(0, 4000));
  process.exit(1);
});
