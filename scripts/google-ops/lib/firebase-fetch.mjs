import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Download leads_backup via firebase-tools (read-only). */
export function fetchFirebaseBackup(projectId) {
  const tmp = path.join(
    os.tmpdir(),
    `leads_backup_${projectId}_${Date.now()}.json`,
  );
  try {
    execFileSync(
      "npx",
      [
        "firebase-tools",
        "database:get",
        "/leads_backup",
        "--project",
        projectId,
        "-o",
        tmp,
      ],
      { stdio: ["ignore", "pipe", "pipe"], shell: true },
    );
    const raw = JSON.parse(fs.readFileSync(tmp, "utf8") || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}
