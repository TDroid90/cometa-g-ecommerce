import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PRODUCTS_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_PRODUCTOS_ID || "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY";
const AUDIT_SPREADSHEET_ID = "1T3O1_BR2Nhuv-sz16z96WdG0PwDxwoDpfgxITRq0CmQ";
const PRODUCTS_SHEET = "PRODUCTOS";
const AUDIT_SHEET = "Sin fotos";
const DEFAULT_SOURCE =
  "C:\\Users\\TD\\Downloads\\COMETA_G_DESCARGADOR_TOTAL_v3\\cometa_g_descargador_total";
const APPS_SCRIPT_UPLOAD_URL =
  process.env.APPS_SCRIPT_UPLOAD_URL ||
  "https://script.google.com/macros/s/AKfycbzqUkcyauxZ57SZ462Rr1CpvRPmSV5dFnYXqZ3YSziLTyK7qJn0-00AYgXXlqipCBUFkQ/exec";
const MIGRATION_WEB_KEY = "CometaG-Migrate-Drive-2026";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.length ? rest.join("=") : true];
  }),
);
const SOURCE = String(args.source || DEFAULT_SOURCE);
const DRY_RUN = Boolean(args["dry-run"]);
const LIMIT = Math.max(0, Number(args.limit || 0));
const START = Math.max(0, Number(args.start || 0));
const CHECKPOINT_PATH = path.join(ROOT, ".tmp", "downloaded-product-images", "checkpoint.json");
const REPORT_DIR = path.dirname(CHECKPOINT_PATH);

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
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
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

async function googleJson(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((item) => item !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const [headers = [], ...data] = rows;
  return data.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function readCsv(name) {
  return parseCsv(fs.readFileSync(path.join(SOURCE, name), "utf8").replace(/^\uFEFF/, ""));
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function splitImages(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
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

function collectGroups() {
  const photoRoot = path.join(SOURCE, "COMETA_G_FOTOS");
  const groups = [];
  for (const category of fs.readdirSync(photoRoot, { withFileTypes: true }).filter((item) => item.isDirectory())) {
    const categoryPath = path.join(photoRoot, category.name);
    for (const subcategory of fs
      .readdirSync(categoryPath, { withFileTypes: true })
      .filter((item) => item.isDirectory())) {
      const subcategoryPath = path.join(categoryPath, subcategory.name);
      for (const brand of fs
        .readdirSync(subcategoryPath, { withFileTypes: true })
        .filter((item) => item.isDirectory())) {
        const brandPath = path.join(subcategoryPath, brand.name);
        for (const model of fs
          .readdirSync(brandPath, { withFileTypes: true })
          .filter((item) => item.isDirectory())) {
          const modelPath = path.join(brandPath, model.name);
          const files = fs
            .readdirSync(modelPath, { withFileTypes: true })
            .filter((item) => item.isFile() && /\.(webp|png|jpe?g)$/i.test(item.name))
            .map((item) => path.join(modelPath, item.name))
            .sort((left, right) => {
              const leftName = path.basename(left, path.extname(left));
              const rightName = path.basename(right, path.extname(right));
              const leftMain = normalize(leftName) === normalize(model.name) ? -2 : /(^|[^0-9])0?1([^0-9]|$)/.test(leftName) ? -1 : 0;
              const rightMain = normalize(rightName) === normalize(model.name) ? -2 : /(^|[^0-9])0?1([^0-9]|$)/.test(rightName) ? -1 : 0;
              return leftMain - rightMain || leftName.localeCompare(rightName, "es", { numeric: true });
            });
          if (files.length) {
            groups.push({
              category: category.name,
              subcategory: subcategory.name,
              brand: brand.name,
              model: model.name,
              skuKey: normalize(model.name),
              files,
            });
          }
        }
      }
    }
  }
  return groups;
}

async function readSheet(token, spreadsheetId, range) {
  const encodedRange = encodeURIComponent(range);
  const data = await googleJson(
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
  );
  return data.values || [];
}

async function readProducts(token) {
  const values = await readSheet(token, PRODUCTS_SPREADSHEET_ID, `${PRODUCTS_SHEET}!A1:AE5000`);
  const [headers = [], ...rows] = values;
  const index = Object.fromEntries(headers.map((header, position) => [header, position]));
  const get = (row, key) => String(row[index[key]] || "").trim();
  return {
    headers,
    index,
    products: rows.map((row, offset) => ({
      rowNumber: offset + 2,
      id: get(row, "id"),
      sku: get(row, "sku"),
      nombre: get(row, "nombre"),
      categoria: get(row, "categoria"),
      subcategoria: get(row, "subcategoria"),
      marca: get(row, "marca"),
      imagen_principal: get(row, "imagen_principal"),
      imagenes_extra: get(row, "imagenes_extra"),
    })),
  };
}

async function readAudit(token) {
  const rows = await readSheet(token, AUDIT_SPREADSHEET_ID, `'${AUDIT_SHEET}'!A6:O1000`);
  return rows
    .filter((row) => row[3] || row[9])
    .map((row, offset) => ({
      auditRow: offset + 6,
      categoria: String(row[0] || ""),
      subcategoria: String(row[1] || ""),
      marca: String(row[2] || ""),
      sku: String(row[3] || ""),
      producto: String(row[4] || ""),
      stock: String(row[5] || ""),
      disponibilidad: String(row[6] || ""),
      productRow: Number(row[7] || 0),
      productUrl: String(row[8] || ""),
      id: String(row[9] || ""),
    }));
}

function makeMatches(groups, products, auditRows, pendingRows) {
  const pendingKeys = new Set(pendingRows.map((row) => normalize(row.sku)));
  const groupBySku = new Map(groups.map((group) => [group.skuKey, group]));
  const productsById = new Map(products.map((product) => [normalize(product.id), product]));
  const productsBySku = new Map();
  for (const product of products) {
    const key = normalize(product.sku);
    if (!productsBySku.has(key)) productsBySku.set(key, []);
    productsBySku.get(key).push(product);
  }

  const matches = [];
  const missing = [];
  for (const audit of auditRows) {
    const key = normalize(audit.sku);
    const pending = pendingKeys.has(key);
    const group = groupBySku.get(key);
    let product = productsById.get(normalize(audit.id));
    if (!product && audit.productRow > 1) product = products.find((item) => item.rowNumber === audit.productRow);
    if (!product) {
      const candidates = productsBySku.get(key) || [];
      if (candidates.length === 1) product = candidates[0];
    }

    if (pending) {
      missing.push({ ...audit, motivo: "Pendiente informado por el descargador" });
    } else if (!group) {
      missing.push({ ...audit, motivo: "Sin carpeta de imágenes descargadas" });
    } else if (!product) {
      missing.push({ ...audit, motivo: "No se encontró una fila única en PRODUCTOS" });
    } else {
      matches.push({ audit, group, product });
    }
  }
  return { matches, missing };
}

function readCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_PATH)) return {};
  return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf8"));
}

function writeCheckpoint(checkpoint) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2));
}

async function uploadImage(file, match, index) {
  const payload = {
    key: MIGRATION_WEB_KEY,
    action: "uploadProductImage",
    base64: fs.readFileSync(file).toString("base64"),
    mimeType: path.extname(file).toLowerCase() === ".webp" ? "image/webp" : "image/jpeg",
    fileName: path.basename(file),
    index,
    pathParts: [
      match.audit.categoria || match.product.categoria || match.group.category,
      match.audit.subcategoria || match.product.subcategoria || match.group.subcategory,
      match.audit.marca || match.product.marca || match.group.brand,
      match.audit.sku || match.product.sku || match.group.model,
    ],
    product: {
      id: match.product.id,
      sku: match.product.sku,
      nombre: match.product.nombre,
      categoria: match.product.categoria,
      subcategoria: match.product.subcategoria,
    },
  };
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(APPS_SCRIPT_UPLOAD_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(120000),
      });
      const text = await response.text();
      const result = JSON.parse(text);
      if (!response.ok || !result.ok || !result.url) throw new Error(text.slice(0, 500));
      return result.url;
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw new Error("No se pudo subir la imagen.");
}

async function updateProductRows(token, updates) {
  if (!updates.length) return;
  const mainColumn = columnName(updates[0].sheet.index.imagen_principal + 1);
  const extraColumn = columnName(updates[0].sheet.index.imagenes_extra + 1);
  for (let start = 0; start < updates.length; start += 80) {
    const chunk = updates.slice(start, start + 80);
    const data = chunk.flatMap(({ match, mainImage, extraImages }) => [
      { range: `${PRODUCTS_SHEET}!${mainColumn}${match.product.rowNumber}`, values: [[mainImage]] },
      { range: `${PRODUCTS_SHEET}!${extraColumn}${match.product.rowNumber}`, values: [[extraImages.join("|")]] },
    ]);
    await googleJson(
      token,
      `https://sheets.googleapis.com/v4/spreadsheets/${PRODUCTS_SPREADSHEET_ID}/values:batchUpdate`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ valueInputOption: "RAW", data }),
      },
    );
  }
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsv(fileName, rows, headers) {
  const content = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\r\n");
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, fileName), `\uFEFF${content}`);
}

async function main() {
  const token = await accessToken();
  const sheet = await readProducts(token);
  const auditRows = await readAudit(token);
  const groups = collectGroups();
  const pendingRows = readCsv("pendientes.csv");
  const resultRows = readCsv("resultado_descarga.csv");
  const { matches: allMatches, missing } = makeMatches(groups, sheet.products, auditRows, pendingRows);
  const okKeys = new Set(resultRows.filter((row) => row.estado === "OK").map((row) => normalize(row.sku)));
  const unexpected = allMatches.filter((match) => !okKeys.has(normalize(match.audit.sku)));
  if (unexpected.length) throw new Error(`Hay ${unexpected.length} carpetas que no figuran como OK en resultado_descarga.csv.`);

  let matches = allMatches.slice(START, LIMIT ? START + LIMIT : undefined);
  writeCsv("faltantes-reales.csv", missing, [
    "categoria",
    "subcategoria",
    "marca",
    "sku",
    "producto",
    "id",
    "productRow",
    "productUrl",
    "motivo",
  ]);
  writeCsv(
    "vinculaciones-plan.csv",
    allMatches.map(({ audit, group, product }) => ({
      id: product.id,
      sku: product.sku,
      producto: product.nombre,
      fila_productos: product.rowNumber,
      fila_auditoria: audit.auditRow,
      carpeta: [group.category, group.subcategory, group.brand, group.model].join("/"),
      imagenes: group.files.length,
    })),
    ["id", "sku", "producto", "fila_productos", "fila_auditoria", "carpeta", "imagenes"],
  );

  console.log(
    JSON.stringify({
      auditRows: auditRows.length,
      downloadedGroups: groups.length,
      plannedMatches: allMatches.length,
      selectedMatches: matches.length,
      missing: missing.length,
      images: matches.reduce((sum, match) => sum + match.group.files.length, 0),
      dryRun: DRY_RUN,
    }),
  );
  if (DRY_RUN) return;

  const checkpoint = readCheckpoint();
  const updates = [];
  for (const [position, match] of matches.entries()) {
    const checkpointKey = normalize(match.product.id || match.product.sku);
    let urls = checkpoint[checkpointKey]?.urls || [];
    if (urls.length !== match.group.files.length) {
      urls = [];
      for (let imageStart = 0; imageStart < match.group.files.length; imageStart += 4) {
        const imageChunk = match.group.files.slice(imageStart, imageStart + 4);
        const uploadedChunk = await Promise.all(
          imageChunk.map((file, chunkIndex) =>
            uploadImage(file, match, imageStart + chunkIndex + 1),
          ),
        );
        urls.push(...uploadedChunk);
      }
      checkpoint[checkpointKey] = {
        id: match.product.id,
        sku: match.product.sku,
        files: match.group.files,
        urls,
        completedAt: new Date().toISOString(),
      };
      writeCheckpoint(checkpoint);
    }

    const merged = urls.filter((url, index, items) => items.indexOf(url) === index);
    updates.push({
      sheet,
      match,
      mainImage: merged[0] || "",
      extraImages: merged.slice(1),
    });
    console.log(
      `[${position + 1}/${matches.length}] ${match.product.sku} -> ${urls.length} imágenes`,
    );
  }
  await updateProductRows(token, updates);

  writeCsv(
    "vinculaciones-completadas.csv",
    updates.map(({ match, mainImage, extraImages }) => ({
      categoria: match.audit.categoria,
      subcategoria: match.audit.subcategoria,
      marca: match.audit.marca,
      sku: match.audit.sku,
      producto: match.audit.producto,
      id: match.product.id,
      fila_productos: match.product.rowNumber,
      fila_auditoria: match.audit.auditRow,
      imagen_principal: mainImage,
      imagenes_extra: extraImages.join("|"),
      cantidad_imagenes: 1 + extraImages.length,
    })),
    [
      "categoria",
      "subcategoria",
      "marca",
      "sku",
      "producto",
      "id",
      "fila_productos",
      "fila_auditoria",
      "imagen_principal",
      "imagenes_extra",
      "cantidad_imagenes",
    ],
  );
  console.log(JSON.stringify({ updatedProducts: updates.length, checkpoint: CHECKPOINT_PATH }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
