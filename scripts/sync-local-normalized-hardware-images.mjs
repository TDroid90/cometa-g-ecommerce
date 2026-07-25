import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PRODUCT_SPREADSHEET_ID = "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY";
const PRODUCT_SHEET_NAME = "PRODUCTOS";
const DEFAULT_SOURCE = "C:\\COMETA_G_IMAGENES\\C - copia 1000 - copia_NORMALIZADO_READY";
const APPS_SCRIPT_UPLOAD_URL =
  process.env.APPS_SCRIPT_UPLOAD_URL ||
  "https://script.google.com/macros/s/AKfycbzqUkcyauxZ57SZ462Rr1CpvRPmSV5dFnYXqZ3YSziLTyK7qJn0-00AYgXXlqipCBUFkQ/exec";
const MIGRATION_WEB_KEY = "CometaG-Migrate-Drive-2026";
const IMAGE_RE = /\.webp$/i;

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    if (!arg.startsWith("--")) return [arg, true];
    const [key, ...rest] = arg.slice(2).split("=");
    return [key, rest.length ? rest.join("=") : true];
  }),
);

const SOURCE = String(args.source || DEFAULT_SOURCE);
const CATEGORY = String(args.category || "");
const LIMIT = Number(args.limit || 0);
const START = Number(args.start || 0);
const DRY_RUN = Boolean(args["dry-run"]);
const MISSING_ONLY = Boolean(args["missing-only"]);

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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] ||= value.replace(/\\n/g, "\n");
    }
  }
}

function serviceAccount() {
  loadEnv();
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const jsonPath = path.join(ROOT, "cometag-444803-c2bdba83753e.json");
  if (fs.existsSync(jsonPath)) return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  return {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  };
}

function base64Url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function accessToken() {
  const account = serviceAccount();
  if (!account.client_email || !account.private_key) throw new Error("Faltan credenciales de Google.");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  signer.end();
  const signature = signer
    .sign(account.private_key, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()).access_token;
}

async function googleFetch(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value) {
  return normalize(value).replace(/\s/g, "");
}

function localFiles(dir) {
  const files = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...localFiles(full));
    if (item.isFile() && IMAGE_RE.test(item.name)) files.push(full);
  }
  return files;
}

function collectGroups() {
  if (!fs.existsSync(SOURCE)) throw new Error(`No existe source: ${SOURCE}`);
  const groups = [];
  for (const category of fs.readdirSync(SOURCE, { withFileTypes: true }).filter((item) => item.isDirectory())) {
    if (CATEGORY && normalize(category.name) !== normalize(CATEGORY)) continue;
    const categoryPath = path.join(SOURCE, category.name);
    for (const brand of fs.readdirSync(categoryPath, { withFileTypes: true }).filter((item) => item.isDirectory())) {
      const brandPath = path.join(categoryPath, brand.name);
      for (const model of fs.readdirSync(brandPath, { withFileTypes: true }).filter((item) => item.isDirectory())) {
        const modelPath = path.join(brandPath, model.name);
        const images = localFiles(modelPath).sort((a, b) => {
          const aName = path.basename(a);
          const bName = path.basename(b);
          const aMain = /^0?1[_\s.-]/.test(aName) ? -1 : 0;
          const bMain = /^0?1[_\s.-]/.test(bName) ? -1 : 0;
          return aMain - bMain || aName.localeCompare(bName, "es", { numeric: true });
        });
        if (images.length) groups.push({ category: category.name, brand: brand.name, model: model.name, images });
      }
    }
  }
  return groups;
}

async function readProducts(token) {
  const data = await googleFetch(
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${PRODUCT_SPREADSHEET_ID}/values/${PRODUCT_SHEET_NAME}!A1:AZ5000`,
  );
  const [headers, ...rows] = data.values || [];
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  const get = (row, key) => String(row[index[key]] || "").trim();
  const products = rows.map((row, offset) => ({
    rowNumber: offset + 2,
    id: get(row, "id"),
    sku: get(row, "sku"),
    nombre: get(row, "nombre"),
    categoria: get(row, "categoria"),
    subcategoria: get(row, "subcategoria"),
    marca: get(row, "marca"),
    stock: Number(get(row, "stock").replace(",", ".")) || 0,
    visible: get(row, "visible").toUpperCase() !== "FALSE",
    stock_status: get(row, "stock_status"),
    imagen_principal: get(row, "imagen_principal"),
    imagenes_extra: get(row, "imagenes_extra"),
  })).filter((product) => product.visible && product.stock > 1 && normalize(product.stock_status) !== "SIN STOCK");
  return { headers, index, products };
}

function keyByCategory(value) {
  const text = normalize(value);
  if (/PLACA|VIDEO|VGA|RTX|GTX|RADEON|RX/.test(text)) return "PLACAS DE VIDEO";
  if (/MOTHER|BOARD|B\d{3}|A\d{3}|X\d{3}|Z\d{3}|H\d{3}/.test(text)) return "MOTHERBOARDS";
  if (/PROCESADOR|RYZEN|CORE|INTEL|AMD/.test(text)) return "PROCESADORES";
  return text;
}

function score(group, product) {
  if (keyByCategory(group.category) !== keyByCategory(product.subcategoria)) return -999;
  const source = normalize(`${group.brand} ${group.model}`);
  const productText = normalize(`${product.marca} ${product.sku} ${product.nombre}`);
  const sourceCompact = compact(source);
  const skuCompact = compact(product.sku);
  const categoryKey = keyByCategory(group.category);
  if (categoryKey === "MOTHERBOARDS" && (!skuCompact || !sourceCompact.includes(skuCompact))) return -999;
  let value = 0;
  if (normalize(group.brand) && productText.includes(normalize(group.brand))) value += 120;
  if (skuCompact && sourceCompact.includes(skuCompact)) value += 1200;
  for (const token of source.split(" ").filter((item) => item.length > 1)) {
    if (productText.includes(token)) value += token.length >= 4 ? 18 : 5;
  }
  for (const marker of ["V2", "S2H", "DS3H", "UD", "AX", "WIFI", "ICE", "WHITE", "BLACK", "TI", "XT", "16G", "8G", "AM4", "AM5", "LGA1700", "LGA1851"]) {
    const s = compact(source).includes(compact(marker));
    const p = compact(productText).includes(compact(marker));
    if (s && p) value += 50;
    if (s && !p) value -= 45;
  }
  return value;
}

function matchGroups(groups, products) {
  const candidates = [];
  for (const group of groups) {
    for (const product of products) {
      if (MISSING_ONLY && product.imagen_principal) continue;
      const currentScore = score(group, product);
      if (currentScore >= 140) candidates.push({ group, product, score: currentScore });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const usedGroups = new Set();
  const usedRows = new Set();
  const matches = [];
  for (const candidate of candidates) {
    const groupKey = `${candidate.group.category}/${candidate.group.brand}/${candidate.group.model}`;
    if (usedGroups.has(groupKey) || usedRows.has(candidate.product.rowNumber)) continue;
    usedGroups.add(groupKey);
    usedRows.add(candidate.product.rowNumber);
    matches.push(candidate);
  }
  return matches;
}

async function uploadViaAppsScript(file, product, group, index) {
  const payload = {
    key: MIGRATION_WEB_KEY,
    action: "uploadProductImage",
    base64: fs.readFileSync(file).toString("base64"),
    mimeType: "image/webp",
    fileName: path.basename(file),
    index,
    pathParts: [product.categoria || "Hardware", product.subcategoria || group.category, product.marca || group.brand, group.model],
    product: {
      id: product.id,
      sku: product.sku,
      slug: "",
      nombre: product.nombre,
      categoria: product.categoria,
      subcategoria: product.subcategoria,
    },
  };
  const response = await fetch(APPS_SCRIPT_UPLOAD_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90000),
  });
  const text = await response.text();
  const result = JSON.parse(text);
  if (!response.ok || !result.ok) throw new Error(text.slice(0, 500));
  return result.url;
}

async function updateRows(token, sheet, updates) {
  if (!updates.length) return;
  const mainColumn = columnName(sheet.index.imagen_principal + 1);
  const extraColumn = columnName(sheet.index.imagenes_extra + 1);
  const data = updates.flatMap((update) => [
    { range: `${PRODUCT_SHEET_NAME}!${mainColumn}${update.rowNumber}`, values: [[update.mainImage]] },
    { range: `${PRODUCT_SHEET_NAME}!${extraColumn}${update.rowNumber}`, values: [[update.extraImages.join("|")]] },
  ]);
  await googleFetch(token, `https://sheets.googleapis.com/v4/spreadsheets/${PRODUCT_SPREADSHEET_ID}/values:batchUpdate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ valueInputOption: "RAW", data }),
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

async function main() {
  const token = await accessToken();
  const sheet = await readProducts(token);
  const groups = collectGroups();
  let matches = matchGroups(groups, sheet.products);
  if (START || LIMIT) matches = matches.slice(START, LIMIT ? START + LIMIT : undefined);
  const updates = [];
  for (const [matchIndex, match] of matches.entries()) {
    console.log(`[${matchIndex + 1}/${matches.length}] ${match.group.category}/${match.group.brand}/${match.group.model} -> ${match.product.sku} ${match.product.nombre} (${match.group.images.length} fotos, score ${match.score})`);
    if (DRY_RUN) continue;
    const urls = [];
    for (const [imageIndex, image] of match.group.images.entries()) {
      urls.push(await uploadViaAppsScript(image, match.product, match.group, imageIndex + 1));
    }
    updates.push({ rowNumber: match.product.rowNumber, mainImage: urls[0] || "", extraImages: urls.slice(1) });
  }
  if (!DRY_RUN) await updateRows(token, sheet, updates);
  fs.mkdirSync(path.join(ROOT, ".tmp", "local-normalized-sync"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, ".tmp", "local-normalized-sync", "summary.json"),
    JSON.stringify({ source: SOURCE, groups: groups.length, products: sheet.products.length, matched: matches.length, updated: updates.length, dryRun: DRY_RUN }, null, 2),
  );
  console.log(JSON.stringify({ source: SOURCE, groups: groups.length, products: sheet.products.length, matched: matches.length, updated: updates.length, dryRun: DRY_RUN }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
