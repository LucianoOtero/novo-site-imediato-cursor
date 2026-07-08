#!/usr/bin/env node
/**
 * scripts/check-hardcoded-business-data.mjs — Issue 23B.
 * Fonte: PLANO_IMPLEMENTACAO.md, Issue 23B ("Auditoria anti-hardcode"),
 * seções 48/55/56/58 da ESPECIFICACAO v3.md.
 *
 * Varre `app/`, `components/`, `lib/` em busca de dados institucionais,
 * comerciais e regulatórios que só podem vir de `lib/company.ts` /
 * `lib/ramos.ts` / variáveis de ambiente — nunca hardcoded em JSX,
 * helpers ou arquivos duplicados.
 *
 * Uso: `npm run check:hardcode` (falha com exit code 1 se encontrar
 * qualquer ocorrência fora da allowlist — pensado para bloquear PR/CI).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components", "lib"];
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

/**
 * Únicos arquivos, dentro de `SCAN_DIRS`, autorizados a conter os
 * padrões abaixo (são a FONTE oficial dos dados, não uma cópia
 * proibida). `.env.example` e `docs/**` já ficam fora do escopo do scan
 * (SCAN_DIRS não os inclui), então não precisam constar aqui.
 *
 * `lib/whatsapp.ts` (Issue 19) é o builder único de URLs `wa.me` —
 * conter o literal "wa.me" ali é a implementação canônica, não uma
 * cópia proibida; o objetivo do padrão é impedir que *outros* arquivos
 * montem a URL na mão em vez de importar esse helper.
 */
const ALLOWLIST_PATHS = new Set(["lib/company.ts", "lib/ramos.ts", "lib/whatsapp.ts"]);

const ALLOWLIST_PATH_PATTERNS = [/\.test\.[tj]sx?$/, /\.spec\.[tj]sx?$/, /(^|\/)__tests__\//];

/** Padrões proibidos — lista literal da Issue 23B do PLANO_IMPLEMENTACAO.md. */
const FORBIDDEN_PATTERNS = [
  { label: "Telefone principal (fragmento)", regex: /\(11\)\s*3230/ },
  { label: "Telefone principal (fragmento)", regex: /3230-1422/ },
  { label: "Telefone de emergência (fragmento)", regex: /95328-8466/ },
  { label: "Telefone da ouvidoria (fragmento)", regex: /97668-7668/ },
  { label: "CNPJ (fragmento)", regex: /45\.998\.165/ },
  { label: "Registro SUSEP", regex: /252174522/ },
  { label: "Preço hardcoded (R$ 79)", regex: /R\$\s*79\b/ },
  { label: "Preço hardcoded (R$ 49)", regex: /R\$\s*49\b/ },
  { label: "Preço hardcoded (R$ 99)", regex: /R\$\s*99\b/ },
  { label: "Link wa.me hardcoded (use lib/whatsapp.ts)", regex: /wa\.me/ },
  { label: "Link g.page hardcoded (use lib/company.ts)", regex: /g\.page/ },
  { label: "Link Google Maps hardcoded (use lib/company.ts)", regex: /google\.com\/maps/ },
  { label: "Domínio hardcoded (use lib/env.ts)", regex: /segurosimediato\.com\.br/ },
  { label: "E-mail comercial hardcoded (use lib/company.ts)", regex: /contato@imediatoseguros\.com\.br/ },
  { label: "E-mail comercial hardcoded (use lib/company.ts)", regex: /lrotero@gmail\.com/ },
];

function toPosix(path) {
  return path.split(sep).join("/");
}

function isAllowlisted(relPath) {
  if (ALLOWLIST_PATHS.has(relPath)) return true;
  return ALLOWLIST_PATH_PATTERNS.some((pattern) => pattern.test(relPath));
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else if (SCAN_EXTENSIONS.has(entry.slice(entry.lastIndexOf(".")))) {
      files.push(fullPath);
    }
  }
  return files;
}

function main() {
  const violations = [];

  for (const dir of SCAN_DIRS) {
    const dirPath = join(ROOT, dir);
    let files;
    try {
      files = walk(dirPath);
    } catch {
      continue; // diretório ainda não existe nesta fase do projeto — ok ignorar
    }

    for (const filePath of files) {
      const relPath = toPosix(relative(ROOT, filePath));
      if (isAllowlisted(relPath)) continue;

      const content = readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        for (const { label, regex } of FORBIDDEN_PATTERNS) {
          if (regex.test(line)) {
            violations.push({ file: relPath, line: index + 1, label, snippet: line.trim() });
          }
        }
      });
    }
  }

  if (violations.length === 0) {
    console.log("[check:hardcode] OK — nenhum dado institucional/comercial hardcoded encontrado fora das fontes permitidas.");
    return;
  }

  console.error(`[check:hardcode] FALHOU — ${violations.length} ocorrência(s) de dado hardcoded fora da allowlist:\n`);
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line} — ${violation.label}`);
    console.error(`    ${violation.snippet}`);
  }
  console.error(
    "\nDados institucionais/comerciais/regulatórios só podem vir de lib/company.ts, lib/ramos.ts ou variáveis de ambiente (.env). Corrija o(s) arquivo(s) acima antes de abrir o PR."
  );
  process.exitCode = 1;
}

main();
