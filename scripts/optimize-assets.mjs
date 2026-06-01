import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "assets");
const outputDir = path.join(root, "assets-optimized");
const manifestPath = path.join(root, "asset-optimization-manifest.json");

const imageExtensions = new Set([".png", ".jpg", ".jpeg"]);

const qualityByKind = {
  gallery: 74,
  cover: 78,
  hero: 82,
  icon: 86,
  default: 78,
};

const maxWidthByKind = {
  gallery: 1500,
  cover: 1200,
  hero: 1600,
  icon: 720,
  default: 1400,
};

function kindFor(relativePath) {
  if (relativePath.includes("-proposal-pages/") || relativePath.includes("-proposal-pages-v2/")) return "gallery";
  if (relativePath.includes("proposal-cover") || relativePath.includes("portfolio-square")) return "cover";
  if (relativePath.includes("fitness-app") || relativePath.includes("content-growth") || relativePath.includes("ai-")) return "hero";
  if (relativePath.includes("oren-") || relativePath.includes("side-icon") || relativePath.includes("doodle")) return "icon";
  return "default";
}

function shouldKeepTransparency(metadata, relativePath) {
  if (!metadata.hasAlpha) return false;
  if (relativePath.includes("-proposal-pages/") || relativePath.includes("-proposal-pages-v2/")) return false;
  if (relativePath.includes("proposal-cover")) return false;
  return true;
}

async function collectImages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectImages(absolute)));
      continue;
    }

    if (imageExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(absolute);
    }
  }

  return files;
}

function outputRelativePath(inputRelativePath, format) {
  const parsed = path.parse(inputRelativePath);
  return path.join(parsed.dir, `${parsed.name}.${format}`);
}

async function optimizeFile(file) {
  const inputRelative = path.relative(sourceDir, file);
  const sourceStat = await fs.stat(file);
  const image = sharp(file, { failOn: "none" }).rotate();
  const metadata = await image.metadata();
  const kind = kindFor(inputRelative);
  const keepTransparency = shouldKeepTransparency(metadata, inputRelative);
  const format = keepTransparency ? "webp" : "jpg";
  const outputRelative = outputRelativePath(inputRelative, format);
  const outputAbsolute = path.join(outputDir, outputRelative);
  const maxWidth = maxWidthByKind[kind] || maxWidthByKind.default;
  const quality = qualityByKind[kind] || qualityByKind.default;

  await fs.mkdir(path.dirname(outputAbsolute), { recursive: true });

  const pipeline = sharp(file, { failOn: "none" })
    .rotate()
    .resize({
      width: metadata.width && metadata.width > maxWidth ? maxWidth : undefined,
      withoutEnlargement: true,
    });

  if (format === "webp") {
    await pipeline.webp({ quality, effort: 5 }).toFile(outputAbsolute);
  } else {
    await pipeline
      .flatten({ background: "#ffffff" })
      .jpeg({ quality, mozjpeg: true, progressive: true })
      .toFile(outputAbsolute);
  }

  const outputStat = await fs.stat(outputAbsolute);
  return {
    source: `assets/${inputRelative.split(path.sep).join("/")}`,
    optimized: `assets-optimized/${outputRelative.split(path.sep).join("/")}`,
    kind,
    format,
    width: metadata.width,
    height: metadata.height,
    originalBytes: sourceStat.size,
    optimizedBytes: outputStat.size,
    savedBytes: sourceStat.size - outputStat.size,
  };
}

async function main() {
  await fs.rm(outputDir, { recursive: true, force: true });
  const files = await collectImages(sourceDir);
  const results = [];

  for (const file of files) {
    results.push(await optimizeFile(file));
  }

  results.sort((a, b) => b.savedBytes - a.savedBytes);
  await fs.writeFile(manifestPath, `${JSON.stringify(results, null, 2)}\n`);

  const originalTotal = results.reduce((sum, item) => sum + item.originalBytes, 0);
  const optimizedTotal = results.reduce((sum, item) => sum + item.optimizedBytes, 0);
  const savedTotal = originalTotal - optimizedTotal;

  console.log(`Optimized ${results.length} images`);
  console.log(`Original: ${(originalTotal / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Optimized: ${(optimizedTotal / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Saved: ${(savedTotal / 1024 / 1024).toFixed(1)} MB`);
  console.log("Top savings:");
  results.slice(0, 12).forEach((item) => {
    console.log(
      `${(item.savedBytes / 1024 / 1024).toFixed(2)} MB  ${item.source} -> ${item.optimized}`
    );
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
