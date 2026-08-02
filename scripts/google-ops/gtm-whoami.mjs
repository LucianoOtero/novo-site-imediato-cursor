/**
 * Lista contas / containers / workspaces acessíveis com o token atual.
 * Confirma que OAuth + Tag Manager API estão ok.
 */
import fs from "node:fs";
import { getAuthorizedClient, getTagManager } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const TARGET_PUBLIC_ID = "GTM-PD6J398";

try {
  const auth = await getAuthorizedClient();
  const tagmanager = getTagManager(auth);

  const accountsRes = await tagmanager.accounts.list();
  const accounts = accountsRes.data.account || [];

  if (!accounts.length) {
    console.log("Nenhuma conta GTM visível para este usuário OAuth.");
    process.exit(1);
  }

  console.log("Contas GTM:\n");
  let match = null;

  for (const account of accounts) {
    console.log(`- ${account.name}  (${account.path})`);
    const containersRes = await tagmanager.accounts.containers.list({
      parent: account.path,
    });
    const containers = containersRes.data.container || [];
    for (const c of containers) {
      const mark = c.publicId === TARGET_PUBLIC_ID ? "  ← alvo" : "";
      console.log(
        `    · ${c.publicId}  ${c.name || ""}  path=${c.path}${mark}`,
      );
      if (c.publicId === TARGET_PUBLIC_ID) {
        match = { account, container: c };
        const wsRes = await tagmanager.accounts.containers.workspaces.list({
          parent: c.path,
        });
        const workspaces = wsRes.data.workspace || [];
        for (const w of workspaces) {
          console.log(`        workspace: ${w.name}  (${w.path})`);
        }
      }
    }
  }

  if (!match) {
    console.error(
      `\nContainer ${TARGET_PUBLIC_ID} não encontrado. Confirme a conta Google usada no login.`,
    );
    process.exit(1);
  }

  const config = {
    gtmPublicId: TARGET_PUBLIC_ID,
    accountPath: match.account.path,
    containerPath: match.container.path,
    accountId: match.account.accountId,
    containerId: match.container.containerId,
    note: "Gerado por gtm-whoami.mjs — pode editar workspacePath manualmente",
  };

  if (fs.existsSync(CONFIG_PATH)) {
    const prev = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    Object.assign(config, prev, {
      gtmPublicId: TARGET_PUBLIC_ID,
      accountPath: match.account.path,
      containerPath: match.container.path,
      accountId: match.account.accountId,
      containerId: match.container.containerId,
    });
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  console.log(`\nConfig gravada em ${CONFIG_PATH}`);
  console.log("Próximo: npm run gtm:inspect");
} catch (err) {
  console.error(err.message || err);
  if (err.response?.data) {
    console.error(JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
}
