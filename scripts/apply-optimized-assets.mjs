import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await fs.readFile(path.join(root, "asset-optimization-manifest.json"), "utf8"));
const files = ["editable-config.js", "overrides.js"];
const replacements = manifest
  .filter((item) => item.optimizedBytes < item.originalBytes)
  .map((item) => ({
    source: `./${item.source}`,
    optimized: `./${item.optimized}`,
  }));

for (const file of files) {
  const filePath = path.join(root, file);
  let source = await fs.readFile(filePath, "utf8");
  let count = 0;

  for (const item of replacements) {
    const escaped = item.source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`${escaped}(\\?v=[^"']+)?`, "g");
    source = source.replace(pattern, (match, suffix = "") => {
      count += 1;
      return `${item.optimized}${suffix}`;
    });
  }

  await fs.writeFile(filePath, source);
  console.log(`${file}: ${count} replacements`);
}
