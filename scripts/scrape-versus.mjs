import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "data", "versus");
const APPROVED_FILE = path.join(OUT_DIR, "versus-approved.json");
const REVIEW_FILE = path.join(OUT_DIR, "versus-needs-review.json");
const NO_MATCH_FILE = path.join(OUT_DIR, "versus-no-match.json");
const ERRORS_FILE = path.join(OUT_DIR, "versus-errors.json");

const args = parseArgs(process.argv.slice(2));
const dryRun = Boolean(args["dry-run"]);
const limit = Number(args.limit || 25);
const category = String(args.category || "").toLowerCase();
const onlyMissing = Boolean(args["only-missing"]);
const productsApi = String(args.productsApi || process.env.COMETA_PRODUCTS_API || "https://www.cometag.store/api/productos");
const delayMs = Number(args.delay || 1200);

function parseArgs(argv) {
  const parsed = {};
  for (const item of argv) {
    if (!item.startsWith("--")) continue;
    const [key, value] = item.slice(2).split("=");
    parsed[key] = value ?? true;
  }
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(value) {
  return normalizeProductName(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeProductName(name) {
  return String(name || "")
    .replace(/\b(COMETA|CG|DEMO|SKU|OEM|BOX|BULK|GARANTIA|GARANTÍA)\b/gi, " ")
    .replace(/\b(PROCESADOR|PLACA DE VIDEO|MOTHERBOARD|MOTHER|PLACA MADRE|MEMORIA RAM|MEMORIA|FUENTE|GABINETE|COOLER)\b/gi, " ")
    .replace(/\b\d+\s?(MESES|MES|AÑOS|ANOS)\b/gi, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productQueries(product) {
  const normalized = normalizeProductName(product.nombre);
  const queries = new Set([normalized]);
  const gpu = normalized.match(/\b(?:NVIDIA|GEFORCE|AMD|RADEON|MSI|ASUS|GIGABYTE|ZOTAC|PALIT|PNY|SAPPHIRE|ASROCK)?\s*(RTX|GTX|RX)\s?\d{3,4}\s?(?:TI|SUPER|XT)?\s?\d{0,2}\s?GB?/i);
  if (gpu?.[0]) queries.add(gpu[0].replace(/\s+/g, " ").trim());
  const cpu = normalized.match(/\b(?:AMD\s*)?RYZEN\s[3579]\s\d{4}[A-Z0-9]*|\bINTEL\sCORE\sI[3579][-\s]?\d{4,5}[A-Z]*/i);
  if (cpu?.[0]) queries.add(cpu[0].replace(/\s+/g, " ").trim());
  return Array.from(queries).filter(Boolean);
}

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function scoreMatch(localName, sourceName) {
  const localTokens = new Set(tokenize(normalizeProductName(localName)));
  const sourceTokens = new Set(tokenize(sourceName));
  if (!localTokens.size || !sourceTokens.size) return 0;
  const overlap = Array.from(localTokens).filter((token) => sourceTokens.has(token)).length;
  let score = overlap / localTokens.size;

  const dangerousPairs = [
    ["ti", "super"],
    ["x", "g"],
    ["xt", ""]
  ];
  for (const [a, b] of dangerousPairs) {
    if (localTokens.has(a) && b && !sourceTokens.has(a)) score -= 0.18;
    if (b && localTokens.has(b) && !sourceTokens.has(b)) score -= 0.18;
  }

  const localGb = String(localName).match(/\b(\d{1,2})\s?GB\b/i)?.[1];
  const sourceGb = String(sourceName).match(/\b(\d{1,2})\s?GB\b/i)?.[1];
  if (localGb && sourceGb && localGb !== sourceGb) score -= 0.25;

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

function statusFromConfidence(confidence) {
  if (confidence >= 0.9) return "auto_approved";
  if (confidence >= 0.75) return "needs_review";
  return "rejected";
}

async function readJson(file, fallback = []) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function robotsAllowsVersus() {
  const response = await fetch("https://versus.com/robots.txt", { headers: { "User-Agent": "CometaG-TechImporter/1.0" } });
  if (!response.ok) return false;
  const robots = await response.text();
  const disallowAll = /User-agent:\s*\*\s*[\s\S]*?Disallow:\s*\/\s*(?:\n|$)/i.test(robots);
  return !disallowAll;
}

async function fetchProducts() {
  const response = await fetch(productsApi, { headers: { "User-Agent": "CometaG-TechImporter/1.0" } });
  if (!response.ok) throw new Error(`No pude leer productos desde ${productsApi}: ${response.status}`);
  const payload = await response.json();
  const products = Array.isArray(payload.data) ? payload.data : [];
  return products.filter((product) => !category || String(product.categoria || product.subcategoria || "").toLowerCase().includes(category));
}

function htmlText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html) {
  return html.match(/<title>(.*?)<\/title>/i)?.[1]?.replace(/\s*\|\s*Versus.*$/i, "").trim() || "";
}

function extractSpecs(html, sourceUrl) {
  const text = htmlText(html);
  const specs = { source: "Versus", sourceUrl, updatedAt: new Date().toISOString() };
  const socket = text.match(/\b(AM4|AM5|LGA\s?1200|LGA\s?1700|LGA\s?1851)\b/i)?.[1];
  if (socket) specs.socket = socket.replace(/\s+/g, "").toUpperCase();
  const ramType = text.match(/\b(DDR3|DDR4|DDR5)\b/i)?.[1];
  if (ramType) specs.ramType = ramType.toUpperCase();
  const wattage = text.match(/\b(\d{3,4})\s?W\b/i)?.[1];
  if (wattage) specs.tdpWatts = Number(wattage);
  const cores = text.match(/\b(\d{1,2})\s+(?:nucleos|núcleos|cores)\b/i)?.[1];
  if (cores) specs.cpuCores = Number(cores);
  const threads = text.match(/\b(\d{1,2})\s+(?:hilos|threads)\b/i)?.[1];
  if (threads) specs.cpuThreads = Number(threads);
  const vram = text.match(/\b(\d{1,2})\s?GB\s?(?:GDDR|VRAM)/i)?.[1];
  if (vram) specs.gpuMemoryGb = Number(vram);
  return specs;
}

async function tryVersusMatch(product) {
  for (const query of productQueries(product)) {
    const url = `https://versus.com/es/${slugify(query)}`;
    const response = await fetch(url, { headers: { "User-Agent": "CometaG-TechImporter/1.0" }, signal: AbortSignal.timeout(12000) });
    if (response.status === 404) {
      await sleep(delayMs);
      continue;
    }
    if (!response.ok) throw new Error(`Versus respondio ${response.status} para ${url}`);
    const html = await response.text();
    const sourceName = extractTitle(html) || query;
    const confidence = scoreMatch(product.nombre, sourceName);
    return {
      localProductId: product.id,
      localProductName: product.nombre,
      source: "versus",
      sourceUrl: url,
      sourceProductName: sourceName,
      matchConfidence: confidence,
      matchStatus: statusFromConfidence(confidence),
      specs: extractSpecs(html, url),
      rawSpecs: { query },
      scrapedAt: new Date().toISOString()
    };
  }
  return null;
}

async function main() {
  console.log(`COMETA G Versus importer`);
  console.log(`Modo: ${dryRun ? "dry-run" : "write"} | limit=${limit} | onlyMissing=${onlyMissing}`);

  const allowed = await robotsAllowsVersus();
  if (!allowed) {
    console.log("robots.txt no permite scraping general. No se ejecuta scraping.");
    return;
  }

  const [approved, review, noMatch, errors] = await Promise.all([
    readJson(APPROVED_FILE),
    readJson(REVIEW_FILE),
    readJson(NO_MATCH_FILE),
    readJson(ERRORS_FILE)
  ]);
  const knownIds = new Set([...approved, ...review].map((item) => item.localProductId));
  const products = (await fetchProducts())
    .filter((product) => !onlyMissing || !knownIds.has(product.id))
    .slice(0, limit);

  const nextApproved = [...approved];
  const nextReview = [...review];
  const nextNoMatch = [...noMatch];
  const nextErrors = [...errors];

  for (const product of products) {
    try {
      console.log(`Buscando: ${product.nombre}`);
      const match = await tryVersusMatch(product);
      if (!match) {
        nextNoMatch.push({ localProductId: product.id, localProductName: product.nombre, searchedAt: new Date().toISOString() });
      } else if (match.matchStatus === "auto_approved") {
        nextApproved.push(match);
      } else if (match.matchStatus === "needs_review") {
        nextReview.push(match);
      } else {
        nextNoMatch.push(match);
      }
    } catch (error) {
      nextErrors.push({ localProductId: product.id, localProductName: product.nombre, error: String(error), at: new Date().toISOString() });
    }
    await sleep(delayMs);
  }

  if (!dryRun) {
    await Promise.all([
      writeJson(APPROVED_FILE, nextApproved),
      writeJson(REVIEW_FILE, nextReview),
      writeJson(NO_MATCH_FILE, nextNoMatch),
      writeJson(ERRORS_FILE, nextErrors)
    ]);
  }

  console.log(JSON.stringify({
    processed: products.length,
    approved: nextApproved.length,
    needsReview: nextReview.length,
    noMatch: nextNoMatch.length,
    errors: nextErrors.length,
    dryRun
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
