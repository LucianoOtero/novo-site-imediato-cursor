/**
 * Gera os blur placeholders (LQIP) dos heros — projeto "itens de conversão"
 * (2026-07-20).
 *
 * Para cada `public/hero/*.webp`, produz uma miniatura de 16px de largura em
 * WebP, codificada como data URI base64 (~200–400 bytes), e grava o mapa em
 * `lib/hero-blur.generated.ts`. O `Hero` aplica a miniatura como
 * `background-image` do `<img>` — prévia desfocada instantânea (viaja no
 * próprio HTML) enquanto a foto real baixa.
 *
 * Rodar sempre que os arquivos de `public/hero/` mudarem:
 *   node scripts/generate-hero-blur.mjs
 */
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const HERO_DIR = path.resolve("public/hero");
const OUT_FILE = path.resolve("lib/hero-blur.generated.ts");

const files = (await readdir(HERO_DIR)).filter((f) => f.endsWith(".webp")).sort();

const entries = [];
for (const file of files) {
  const buffer = await sharp(path.join(HERO_DIR, file))
    .resize({ width: 16 })
    .webp({ quality: 30 })
    .toBuffer();
  entries.push([`/hero/${file}`, `data:image/webp;base64,${buffer.toString("base64")}`]);
}

const body = entries.map(([key, uri]) => `  "${key}": "${uri}",`).join("\n");
const content = `/**
 * ARQUIVO GERADO — não editar à mão.
 * Fonte: scripts/generate-hero-blur.mjs (rodar de novo se public/hero/ mudar).
 * Miniaturas 16px em WebP (data URI) usadas como LQIP no Hero.
 */
export const HERO_BLUR: Record<string, string> = {
${body}
};
`;

await writeFile(OUT_FILE, content, "utf8");
console.log(`${entries.length} blur placeholders gerados em lib/hero-blur.generated.ts`);
