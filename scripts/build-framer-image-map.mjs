import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "framer-image-localization-manifest.json");
const outputPath = path.join(root, "framer-image-map.js");

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const map = {};

for (const item of manifest) {
  const url = new URL(item.remote.replaceAll("&amp;", "&"));
  const fileName = path.basename(url.pathname);
  const exactKey = url.search ? `${fileName}${url.search}` : fileName;

  if (!map[fileName]) map[fileName] = item.local;
  map[exactKey] = item.local;
}

const sortedMap = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
const source = `window.OREN_FRAMER_IMAGE_MAP = ${JSON.stringify(sortedMap, null, 2)};\n`;

await fs.writeFile(outputPath, source);
console.log(`Wrote ${Object.keys(sortedMap).length} Framer image mappings to framer-image-map.js`);
