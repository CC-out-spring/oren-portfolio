import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "index.html");
const outputDir = path.join(root, "assets-optimized", "framer-remote");
const manifestPath = path.join(root, "framer-image-localization-manifest.json");

const imageUrlPattern = /https:\/\/framerusercontent\.com\/images\/[^"'\s<>)]+/g;

function htmlDecodeUrl(rawUrl) {
  return rawUrl.replaceAll("&amp;", "&");
}

function extensionForContentType(contentType, fallback = ".bin") {
  if (contentType.includes("image/png")) return ".png";
  if (contentType.includes("image/jpeg")) return ".jpg";
  if (contentType.includes("image/webp")) return ".webp";
  if (contentType.includes("image/gif")) return ".gif";
  return fallback;
}

function isHeadAsset(html, index) {
  const headEnd = html.indexOf("</head>");
  return headEnd !== -1 && index < headEnd;
}

function localNameFor(rawUrl, format) {
  const decoded = htmlDecodeUrl(rawUrl);
  const url = new URL(decoded);
  const originalName = path.basename(url.pathname);
  const parsed = path.parse(originalName);
  const safeBase = parsed.name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64) || "image";
  const hash = crypto.createHash("sha1").update(rawUrl).digest("hex").slice(0, 10);
  return `${safeBase}-${hash}.${format}`;
}

function requestedWidth(rawUrl) {
  const url = new URL(htmlDecodeUrl(rawUrl));
  const scaleDown = Number(url.searchParams.get("scale-down-to"));
  const width = Number(url.searchParams.get("width"));
  if (Number.isFinite(scaleDown) && scaleDown > 0) return scaleDown;
  if (Number.isFinite(width) && width > 0) return width;
  return undefined;
}

async function fetchBytes(rawUrl) {
  const url = htmlDecodeUrl(rawUrl);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "",
  };
}

async function optimize(rawUrl, html, firstIndex) {
  const decoded = htmlDecodeUrl(rawUrl);
  const inputExt = path.extname(new URL(decoded).pathname).toLowerCase();
  const { bytes, contentType } = await fetchBytes(rawUrl);
  const detectedExt = extensionForContentType(contentType, inputExt || ".bin");

  if (detectedExt === ".gif") {
    const fileName = localNameFor(rawUrl, "gif");
    const outputPath = path.join(outputDir, fileName);
    await fs.writeFile(outputPath, bytes);
    return {
      remote: rawUrl,
      local: `./assets-optimized/framer-remote/${fileName}`,
      originalBytes: bytes.length,
      optimizedBytes: bytes.length,
      format: "gif",
      headAsset: isHeadAsset(html, firstIndex),
    };
  }

  const image = sharp(bytes, { failOn: "none" }).rotate();
  const metadata = await image.metadata();
  const headAsset = isHeadAsset(html, firstIndex);
  const hasAlpha = Boolean(metadata.hasAlpha);
  const format = headAsset
    ? detectedExt.replace(".", "") || "png"
    : hasAlpha
      ? "webp"
      : "jpg";
  const fileName = localNameFor(rawUrl, format === "jpeg" ? "jpg" : format);
  const outputPath = path.join(outputDir, fileName);
  const targetWidth = Math.min(requestedWidth(rawUrl) || metadata.width || 1600, headAsset ? 1200 : 1600);

  let pipeline = sharp(bytes, { failOn: "none" })
    .rotate()
    .resize({
      width: metadata.width && metadata.width > targetWidth ? targetWidth : undefined,
      withoutEnlargement: true,
    });

  if (format === "webp") {
    await pipeline.webp({ quality: 82, effort: 5 }).toFile(outputPath);
  } else if (format === "jpg" || format === "jpeg") {
    await pipeline
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: headAsset ? 82 : 78, mozjpeg: true, progressive: true })
      .toFile(outputPath);
  } else if (format === "png") {
    await pipeline.png({ compressionLevel: 9, palette: bytes.length > 200_000 }).toFile(outputPath);
  } else {
    await fs.writeFile(outputPath, bytes);
  }

  const stat = await fs.stat(outputPath);
  return {
    remote: rawUrl,
    local: `./assets-optimized/framer-remote/${fileName}`,
    width: metadata.width,
    height: metadata.height,
    originalBytes: bytes.length,
    optimizedBytes: stat.size,
    savedBytes: bytes.length - stat.size,
    format,
    headAsset,
  };
}

async function runQueue(items, workerCount, worker) {
  const results = [];
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      results.push(await worker(item));
    }
  }

  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
}

async function main() {
  const html = await fs.readFile(indexPath, "utf8");
  const matches = Array.from(html.matchAll(imageUrlPattern));
  const firstIndexByUrl = new Map();

  for (const match of matches) {
    if (!firstIndexByUrl.has(match[0])) {
      firstIndexByUrl.set(match[0], match.index || 0);
    }
  }

  await fs.mkdir(outputDir, { recursive: true });

  const rawUrls = Array.from(firstIndexByUrl.keys());
  const results = await runQueue(rawUrls, 6, (rawUrl) =>
    optimize(rawUrl, html, firstIndexByUrl.get(rawUrl) || 0)
  );

  let nextHtml = html;
  for (const item of results) {
    nextHtml = nextHtml.split(item.remote).join(item.local);
  }

  results.sort((a, b) => (b.savedBytes || 0) - (a.savedBytes || 0));
  await fs.writeFile(indexPath, nextHtml);
  await fs.writeFile(manifestPath, `${JSON.stringify(results, null, 2)}\n`);

  const originalTotal = results.reduce((sum, item) => sum + item.originalBytes, 0);
  const optimizedTotal = results.reduce((sum, item) => sum + item.optimizedBytes, 0);

  console.log(`Localized ${results.length} Framer image URLs`);
  console.log(`Original downloaded variants: ${(originalTotal / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Local optimized variants: ${(optimizedTotal / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Saved: ${((originalTotal - optimizedTotal) / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
