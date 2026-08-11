import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const STORE_URL = process.env.STORE_PRODUCTS_URL || "https://www.cometag.store/productos";
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_PRODUCTOS_ID || "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY";
const PRODUCTS_SHEET = "PRODUCTOS";
const PROVIDER_SHEET = "FULL_CATALOGO";
const REPORT_SHEET = "STOCK_SIN_FOTO";
const APPS_SCRIPT_UPLOAD_URL = process.env.APPS_SCRIPT_UPLOAD_URL || "https://script.google.com/macros/s/AKfycbzqUkcyauxZ57SZ462Rr1CpvRPmSV5dFnYXqZ3YSziLTyK7qJn0-00AYgXXlqipCBUFkQ/exec";
const MIGRATION_WEB_KEY = "CometaG-Migrate-Drive-2026";
const REPAIR = process.argv.includes("--repair");
const DRY_RUN = process.argv.includes("--dry-run");
const CONCURRENCY = 6;
const HEADERS = [
  "id_producto", "proveedor", "sku", "producto", "url_tienda", "url_proveedor",
  "imagen_actual", "estado_imagen", "fila_productos", "id_proveedor", "detectado_en", "estado_proceso",
];

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) continue;
    for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const index = line.indexOf("=");
      if (index < 0) continue;
      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[key] ||= value.replace(/\\n/g, "\n");
    }
  }
}

function base64Url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function accessToken() {
  loadEnv();
  let account;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) account = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  else {
    const localJson = path.join(ROOT, "cometag-444803-c2bdba83753e.json");
    account = fs.existsSync(localJson)
      ? JSON.parse(fs.readFileSync(localJson, "utf8"))
      : { client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: process.env.GOOGLE_PRIVATE_KEY };
  }
  if (!account?.client_email || !account?.private_key) throw new Error("Faltan credenciales de Google.");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  signer.end();
  const signature = signer.sign(account.private_key, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwtResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!jwtResponse.ok) throw new Error(await jwtResponse.text());
  return (await jwtResponse.json()).access_token;
}

async function googleJson(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { authorization: `Bearer ${token}`, ...(options.headers || {}) },
    signal: AbortSignal.timeout(60000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function readSheet(token, range) {
  const result = await googleJson(token, `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`);
  return result.values || [];
}

function tableFromValues(values) {
  const [headers = [], ...rows] = values;
  const index = Object.fromEntries(headers.map((header, position) => [String(header), position]));
  return { headers, index, rows };
}

function cell(row, index, name) {
  return String(row[index[name]] ?? "").trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function unwrapStoreImage(value) {
  const decoded = decodeHtml(value);
  try {
    const url = new URL(decoded, STORE_URL);
    if (url.hostname === "wsrv.nl" && url.searchParams.get("url")) return url.searchParams.get("url");
    return url.href;
  } catch {
    return decoded;
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/127 Safari/537.36" },
    redirect: "follow",
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

function parseStoreCards(html) {
  const cards = [];
  for (const match of html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)) {
    const block = match[1];
    const href = block.match(/href="(\/producto\/[^"]+)"/i)?.[1];
    const image = block.match(/<img\b[^>]*\bsrc="([^"]+)"[^>]*\balt="([^"]*)"/i);
    if (!href || !image) continue;
    cards.push({
      siteUrl: new URL(decodeHtml(href), STORE_URL).href,
      slug: decodeHtml(href).split("/").filter(Boolean).pop(),
      imageUrl: unwrapStoreImage(image[1]),
      name: decodeHtml(image[2]),
    });
  }
  return cards;
}

async function imageWorks(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0", range: "bytes=0-8191" },
        redirect: "follow",
        signal: AbortSignal.timeout(25000),
      });
      const contentType = response.headers.get("content-type") || "";
      if (response.ok && contentType.toLowerCase().startsWith("image/")) return true;
      if (response.ok && contentType.toLowerCase().startsWith("application/octet-stream") && /\.(?:avif|gif|jpe?g|png|webp)(?:\?|$)/i.test(url)) return true;
      if (![408, 425, 429, 500, 502, 503, 504].includes(response.status)) return false;
    } catch {
      // Retry transient network and proxy failures before marking the image as broken.
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return false;
}

async function mapLimit(items, limit, fn) {
  const result = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await fn(items[index], index);
    }
  }));
  return result;
}

function providerFor(product) {
  const id = product.id.toLowerCase();
  if (id.startsWith("elit-")) return "ELIT";
  if (id.startsWith("nb-")) return "NB";
  return "";
}

function buildCatalogIndexes(table) {
  const bySku = new Map();
  const byId = new Map();
  for (const row of table.rows) {
    const provider = cell(row, table.index, "proveedor").toUpperCase();
    const sku = cell(row, table.index, "codigo_producto");
    const id = cell(row, table.index, "id");
    if (provider && sku) bySku.set(`${provider}:${normalize(sku)}`, row);
    if (provider && id) byId.set(`${provider}:${normalize(id)}`, row);
  }
  return { bySku, byId };
}

function supplierInfo(product, catalog, indexes) {
  const provider = providerFor(product);
  const externalId = product.id.replace(/^[^-]+-/, "");
  const row = indexes.bySku.get(`${provider}:${normalize(product.sku)}`) || indexes.byId.get(`${provider}:${normalize(externalId)}`);
  if (row) {
    return {
      provider,
      externalId: cell(row, catalog.index, "id") || externalId,
      url: cell(row, catalog.index, "link"),
    };
  }
  if (provider === "NB") {
    return { provider, externalId, url: `https://www.nb.com.ar/${slugify(product.nombre)}_-_${externalId}` };
  }
  return { provider, externalId, url: "" };
}

function extractImageCandidates(html, pageUrl, provider) {
  const raw = [];
  for (const match of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)/gi)) raw.push(match[1]);
  for (const match of html.matchAll(/<(?:img|source)\b[^>]*(?:src|data-src|data-lazy-src|srcset)=["']([^"']+)/gi)) raw.push(...match[1].split(",").map((part) => part.trim().split(/\s+/)[0]));

  const urls = [];
  for (const candidate of raw) {
    try {
      let resolved = new URL(decodeHtml(candidate), pageUrl);
      if (resolved.pathname === "/_next/image" && resolved.searchParams.get("url")) resolved = new URL(resolved.searchParams.get("url"), pageUrl);
      const href = resolved.href;
      const allowed = provider === "ELIT" ? /images\.elit\.com\.ar\/p\//i : /static\.nb\.com\.ar\/i\//i;
      if (allowed.test(href) && !/_s\.(?:webp|jpe?g|png)(?:\?|$)/i.test(href) && !/_h20_/i.test(href)) urls.push(href);
    } catch {
      // Ignore malformed decorative URLs.
    }
  }
  return [...new Set(urls)].slice(0, 24);
}

async function downloadBestImage(urls) {
  const images = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" }, redirect: "follow", signal: AbortSignal.timeout(30000) });
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const imageResponse = contentType.startsWith("image/") || (contentType.startsWith("application/octet-stream") && /\.(?:avif|gif|jpe?g|png|webp)(?:\?|$)/i.test(url));
      if (!response.ok || !imageResponse) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height || metadata.width < 300 || metadata.height < 300) continue;
      images.push({ url, buffer, area: metadata.width * metadata.height });
    } catch {
      // Continue with the next gallery image.
    }
  }
  return images.sort((left, right) => right.area - left.area)[0] || null;
}

async function uploadViaAppsScript(buffer, product) {
  const normalized = await sharp(buffer)
    .rotate()
    .resize({ width: 1000, height: 1000, fit: "contain", background: "#ffffff" })
    .webp({ quality: 88, effort: 5 })
    .toBuffer();
  const payload = {
    key: MIGRATION_WEB_KEY,
    action: "uploadProductImage",
    base64: normalized.toString("base64"),
    mimeType: "image/webp",
    fileName: `${slugify(product.sku || product.id)}.webp`,
    index: 1,
    pathParts: [product.categoria || "Sin categoria", product.subcategoria || "Sin subcategoria", product.marca || "Generico", product.sku || product.id],
    product: { id: product.id, sku: product.sku, nombre: product.nombre, categoria: product.categoria, subcategoria: product.subcategoria },
  };
  const response = await fetch(APPS_SCRIPT_UPLOAD_URL, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(120000),
  });
  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch { throw new Error(`Respuesta invalida del uploader: ${text.slice(0, 160)}`); }
  if (!response.ok || !result.ok || !result.url) throw new Error(result.error || "No se pudo subir la imagen a Drive.");
  return result.url;
}

async function updateProductImage(token, productsTable, product, imageUrl) {
  const imageColumn = productsTable.index.imagen_principal;
  if (imageColumn === undefined) throw new Error("No existe imagen_principal en PRODUCTOS.");
  const column = columnName(imageColumn + 1);
  await googleJson(token, `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(`${PRODUCTS_SHEET}!${column}${product.rowNumber}`)}?valueInputOption=RAW`, {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: [[imageUrl]] }),
  });
}

function columnName(index) {
  let name = "";
  while (index > 0) {
    const mod = (index - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    index = Math.floor((index - mod) / 26);
  }
  return name;
}

async function writeReport(token, rows) {
  if (DRY_RUN) return;
  const range = `${REPORT_SHEET}!A1:L1000`;
  await googleJson(token, `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:clear`, { method: "POST" });
  await googleJson(token, `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(`${REPORT_SHEET}!A1`)}?valueInputOption=RAW`, {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: [HEADERS, ...rows] }),
  });
}

async function main() {
  const token = await accessToken();
  const [productsValues, catalogValues, storeHtml] = await Promise.all([
    readSheet(token, `${PRODUCTS_SHEET}!A1:AI5000`),
    readSheet(token, `${PROVIDER_SHEET}!A1:Z10000`),
    fetchText(STORE_URL),
  ]);
  const productsTable = tableFromValues(productsValues);
  const catalogTable = tableFromValues(catalogValues);
  const catalogIndexes = buildCatalogIndexes(catalogTable);
  const products = productsTable.rows.map((row, offset) => ({
    rowNumber: offset + 2,
    id: cell(row, productsTable.index, "id"), sku: cell(row, productsTable.index, "sku"),
    slug: cell(row, productsTable.index, "slug"), nombre: cell(row, productsTable.index, "nombre"),
    categoria: cell(row, productsTable.index, "categoria"), subcategoria: cell(row, productsTable.index, "subcategoria"),
    marca: cell(row, productsTable.index, "marca"),
  }));
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const cards = parseStoreCards(storeHtml);
  const checks = await mapLimit(cards, CONCURRENCY, async (card) => ({ card, works: await imageWorks(card.imageUrl) }));
  const missing = checks.filter(({ works }) => !works).map(({ card }) => ({ card, product: bySlug.get(card.slug) })).filter(({ product }) => product);
  if (DRY_RUN) {
    for (const { card, product } of missing.slice(0, 20)) console.log(`Falta: ${product.id} | ${card.imageUrl}`);
  }
  const now = new Date().toISOString();
  const report = [];

  for (const item of missing) {
    const info = supplierInfo(item.product, catalogTable, catalogIndexes);
    let status = REPAIR ? "SIN_REPARAR" : "PENDIENTE";
    if (REPAIR && info.url && !DRY_RUN) {
      try {
        const supplierHtml = await fetchText(info.url);
        const candidates = extractImageCandidates(supplierHtml, info.url, info.provider);
        const best = await downloadBestImage(candidates);
        if (!best) throw new Error("El proveedor no entrego una imagen valida.");
        const driveUrl = await uploadViaAppsScript(best.buffer, item.product);
        await updateProductImage(token, productsTable, item.product, driveUrl);
        status = "REPARADO_PENDIENTE_REVALIDACION";
        console.log(`Reparado: ${item.product.nombre}`);
      } catch (error) {
        status = `ERROR: ${String(error.message).slice(0, 120)}`;
        console.error(`No se pudo reparar ${item.product.nombre}: ${error.message}`);
      }
    }
    report.push([
      item.product.id, info.provider, item.product.sku, item.product.nombre, item.card.siteUrl, info.url,
      item.card.imageUrl, "IMAGEN_ROTA_EN_SITIO", item.product.rowNumber, info.externalId, now, status,
    ]);
  }
  await writeReport(token, report);
  console.log(`Auditadas ${cards.length} tarjetas. Imagenes rotas: ${missing.length}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
