import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "index.html");
const fontsDir = path.join(root, "fonts");

function localNameFor(url) {
  const parsed = new URL(url);
  const originalName = path.basename(parsed.pathname);
  const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 10);
  return `${parsed.hostname.replace(/[^a-z0-9]+/gi, "-")}-${hash}-${originalName}`;
}

async function downloadFont(url, outputPath) {
  try {
    await fs.access(outputPath);
    return;
  } catch {
    // Continue and download below.
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, bytes);
}

let html = await fs.readFile(htmlPath, "utf8");
const fontUrls = [...new Set(html.match(/https:\/\/[^"')\s]+\.woff2/g) || [])];

await fs.mkdir(fontsDir, { recursive: true });

for (const url of fontUrls) {
  const localName = localNameFor(url);
  const localPath = path.join(fontsDir, localName);
  await downloadFont(url, localPath);
  html = html.split(url).join(`./fonts/${localName}`);
}

html = html.replace(/@font-face\s*{[^}]*}/g, (block) => {
  if (/font-display\s*:/.test(block)) return block;
  return block.replace(/\s*}$/, "; font-display: swap }");
});

await fs.writeFile(htmlPath, html);
console.log(`Localized ${fontUrls.length} font files into fonts/`);
