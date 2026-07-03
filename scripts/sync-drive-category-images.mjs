import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const TMP_ROOT = path.join(ROOT, ".tmp", "drive-category-image-sync");
const PRODUCT_SPREADSHEET_ID = "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY";
const PRODUCT_SHEET_NAME = "PRODUCTOS";
const APPS_SCRIPT_UPLOAD_URL =
  process.env.APPS_SCRIPT_UPLOAD_URL ||
  "https://script.google.com/macros/s/AKfycbzqUkcyauxZ57SZ462Rr1CpvRPmSV5dFnYXqZ3YSziLTyK7qJn0-00AYgXXlqipCBUFkQ/exec";
const MIGRATION_WEB_KEY = "CometaG-Migrate-Drive-2026";
const CATEGORY_FOLDERS = {
  Coolers: "1A7TB_09mug9gmpHoqPpfqGrAkJlYa3V9",
  Fuentes: "14qghucdUYgFGwXhGv-1MZy_JveMEZxq9",
};
const FOLDER_MIME = "application/vnd.google-apps.folder";
const IMAGE_RE = /^image\//i;
const DRY_RUN = process.argv.includes("--dry-run");
const CLEANUP = process.argv.includes("--cleanup");
const MISSING_ONLY = process.argv.includes("--missing-only");
const CATEGORY_ARG = process.argv.find((arg) => arg.startsWith("--category="));
const CATEGORY = CATEGORY_ARG ? CATEGORY_ARG.split("=")[1] : "Coolers";
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1] || 0) : 0;
const START_ARG = process.argv.find((arg) => arg.startsWith("--start="));
const START = START_ARG ? Number(START_ARG.split("=")[1] || 0) : 0;
const MAX_IMAGES_BY_CATEGORY = {
  Coolers: 3,
  Fuentes: 5,
};
const KNOWN_BRANDS = [
  "ASROCK",
  "ASUS",
  "AUREOX",
  "COOLER MASTER",
  "CORSAIR",
  "CROMAX",
  "GIGABYTE",
  "MSI",
  "RAIDMAX",
  "TEROS",
  "THERMALTAKE",
];
const SOURCE_BRAND_ALIASES = [
  { token: "TUF", brand: "ASUS" },
  { token: "ROG", brand: "ASUS" },
  { token: "PRIME", brand: "ASUS" },
  { token: "AORUS", brand: "GIGABYTE" },
];

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) continue;
    for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const index = line.indexOf("=");
      if (index < 0) continue;
      const key = line.slice(0, index);
      let value = line.slice(index + 1);
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.replace(/\\n/g, "\n");
    }
  }
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken() {
  loadEnv();
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const serviceAccount = raw
    ? JSON.parse(raw)
    : {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY,
      };
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Faltan credenciales de Google en .env.local");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  signer.end();
  const signature = signer
    .sign(serviceAccount.private_key, "base64")
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
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function listChildren(token, parentId) {
  const files = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `'${parentId}' in parents and trashed=false`,
      fields: "nextPageToken,files(id,name,mimeType,size,parents)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const result = await googleFetch(token, `https://www.googleapis.com/drive/v3/files?${params}`);
    files.push(...(result.files || []));
    pageToken = result.nextPageToken || "";
  } while (pageToken);
  return files.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

async function trashFile(token, fileId) {
  await googleFetch(token, `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
}

async function createFolder(token, parentId, name) {
  const existing = (await listChildren(token, parentId)).find(
    (file) => file.mimeType === FOLDER_MIME && normalize(file.name) === normalize(name),
  );
  if (existing) return existing.id;
  const result = await googleFetch(token, "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    }),
  });
  return result.id;
}

async function moveFolder(token, folderId, fromParentId, toParentId) {
  if (fromParentId === toParentId) return false;
  const params = new URLSearchParams({
    addParents: toParentId,
    removeParents: fromParentId,
    fields: "id,parents",
    supportsAllDrives: "true",
  });
  await googleFetch(token, `https://www.googleapis.com/drive/v3/files/${folderId}?${params}`, {
    method: "PATCH",
  });
  return true;
}

async function setPublic(token, fileId) {
  try {
    await googleFetch(token, `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });
  } catch {
    // If the permission already exists or the shared drive blocks duplicate writes, the direct API proxy still works.
  }
}

async function downloadFile(token, fileId) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}

async function uploadFile(token, parentId, localFile, name) {
  const existing = (await listChildren(token, parentId)).filter(
    (file) => file.mimeType !== FOLDER_MIME && normalize(file.name) === normalize(name),
  );
  for (const file of existing) {
    await trashFile(token, file.id);
  }

  const boundary = `cometag_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const metadata = { name, parents: [parentId], mimeType: "image/webp" };
  const body = Buffer.concat([
    Buffer.from(
      [
        `--${boundary}`,
        "Content-Type: application/json; charset=UTF-8",
        "",
        JSON.stringify(metadata),
        `--${boundary}`,
        "Content-Type: image/webp",
        "",
        "",
      ].join("\r\n"),
    ),
    fs.readFileSync(localFile),
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const result = await googleFetch(
    token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
    {
      method: "POST",
      headers: { "content-type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  await setPublic(token, result.id);
  return result;
}

async function uploadViaAppsScript(localFile, product, leaf, index) {
  const modelName = leaf.pathParts[leaf.pathParts.length - 1] || product.sku || product.nombre;
  const payload = {
    key: MIGRATION_WEB_KEY,
    action: "uploadProductImage",
    base64: fs.readFileSync(localFile).toString("base64"),
    mimeType: "image/webp",
    fileName: path.basename(localFile),
    index,
    pathParts: [product.categoria || "Hardware", product.subcategoria || CATEGORY, product.marca || "Generico", modelName],
    product: {
      id: product.id,
      sku: product.sku,
      slug: "",
      nombre: product.nombre,
      categoria: product.categoria,
      subcategoria: product.subcategoria,
    },
  };
  return postAppsScript(payload, "Upload Apps Script");
}

async function trashViaAppsScript(fileIds) {
  if (!fileIds.length) return { ok: true, trashed: 0 };
  return postAppsScript({
    key: MIGRATION_WEB_KEY,
    action: "trashDriveFiles",
    fileIds,
  }, "Cleanup Apps Script");
}

async function postAppsScript(payload, label) {
  let lastText = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(APPS_SCRIPT_UPLOAD_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    lastText = await response.text();
    try {
      const result = JSON.parse(lastText);
      if (response.ok && result.ok) return result;
      lastText = JSON.stringify(result);
    } catch {
      // Google sometimes returns an HTML quota/throttle page. Back off and retry.
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 7000));
  }
  throw new Error(`${label} fallido: ${lastText.slice(0, 300)}`);
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\bWHT\b/g, "WHITE")
    .replace(/\bBLANCO\b/g, "WHITE")
    .replace(/\bNEGRO\b/g, "BLACK")
    .replace(/\bCM\b/g, "COOLER MASTER")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeName(value) {
  return String(value || "producto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 130) || "producto";
}

async function readProducts(token) {
  const response = await googleFetch(
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${PRODUCT_SPREADSHEET_ID}/values/${encodeURIComponent(PRODUCT_SHEET_NAME)}`,
  );
  const [headers, ...rows] = response.values || [];
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  const get = (row, key) => String(row[index[key]] || "").trim();
  const products = rows
    .map((row, offset) => ({
      rowNumber: offset + 2,
      id: get(row, "id"),
      sku: get(row, "sku"),
      nombre: get(row, "nombre"),
      categoria: get(row, "categoria"),
      subcategoria: get(row, "subcategoria"),
      marca: get(row, "marca"),
      stock: Number(get(row, "stock").replace(",", ".")) || 0,
      stock_status: get(row, "stock_status"),
      visible: get(row, "visible").toUpperCase() !== "FALSE",
      imagen_principal: get(row, "imagen_principal"),
      imagenes_extra: get(row, "imagenes_extra"),
    }))
    .filter(
      (product) =>
        normalize(product.categoria) === "HARDWARE" &&
        normalize(product.subcategoria) === normalize(CATEGORY) &&
        product.visible &&
        product.stock > 1 &&
        normalize(product.stock_status) !== "SIN STOCK" &&
        (!MISSING_ONLY || !product.imagen_principal),
    );
  return { headers, index, products };
}

async function updateProductRows(token, sheet, updates) {
  if (!updates.length) return;
  const data = [];
  const mainColumn = columnName(sheet.index.imagen_principal + 1);
  const extraColumn = columnName(sheet.index.imagenes_extra + 1);
  for (const update of updates) {
    data.push({ range: `${PRODUCT_SHEET_NAME}!${mainColumn}${update.rowNumber}`, values: [[update.mainImage]] });
    data.push({ range: `${PRODUCT_SHEET_NAME}!${extraColumn}${update.rowNumber}`, values: [[update.extraImages.join("|")]] });
  }
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

async function collectLeafFolders(token, rootId) {
  const leaves = [];
  async function walk(folder, pathParts, parentId) {
    const children = await listChildren(token, folder.id);
    const images = children.filter((file) => IMAGE_RE.test(file.mimeType));
    const folders = children.filter((file) => file.mimeType === FOLDER_MIME);
    const generatedOnly = images.length > 0 && images.every((image) => /-\d{2}\.webp$/i.test(image.name));
    if (images.length && !generatedOnly) {
      leaves.push({
        id: folder.id,
        name: folder.name,
        parentId,
        pathParts,
        images,
      });
    }
    for (const child of folders) {
      await walk(child, [...pathParts, child.name], folder.id);
    }
  }
  const top = (await listChildren(token, rootId)).filter((file) => file.mimeType === FOLDER_MIME);
  for (const child of top) {
    await walk(child, [child.name], rootId);
  }
  return leaves;
}

function tokens(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !["FUENTE", "COOLER", "WATER", "GAMING", "ARGB", "RGB", "PLUS"].includes(token));
}

function scoreLeaf(leaf, product) {
  const source = normalize(leaf.pathParts.join(" "));
  const productText = normalize(`${product.marca} ${product.sku} ${product.nombre}`);
  const sku = normalize(product.sku);
  let score = 0;
  if (sku && source.includes(sku)) score += 600;
  if (sku && source.replace(/\s/g, "").includes(sku.replace(/\s/g, ""))) score += 650;
  if (normalize(product.marca) && source.includes(normalize(product.marca))) score += 120;
  for (const token of tokens(source)) {
    if (productText.includes(token)) score += token.length >= 4 ? 14 : 5;
  }
  for (const marker of ["WHITE", "BLACK", "PLATINUM", "GOLD", "BRONZE", "240", "360", "650", "750", "850", "1000", "1200"]) {
    const sourceHas = source.includes(marker);
    const productHas = productText.includes(marker);
    if (sourceHas && productHas) score += 45;
    if (sourceHas && !productHas) score -= 40;
  }
  return score;
}

function matchLeaves(leaves, products) {
  const candidates = [];
  const matches = [];
  const unmatched = [];
  const usedLeaves = new Set();
  const usedRows = new Set();
  for (const leaf of leaves) {
    for (const product of products) {
      if (!brandCompatible(leaf, product)) continue;
      const score = scoreLeaf(leaf, product);
      if (score >= 95) candidates.push({ leaf, product, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  for (const candidate of candidates) {
    if (usedLeaves.has(candidate.leaf.id) || usedRows.has(candidate.product.rowNumber)) continue;
    matches.push(candidate);
    usedLeaves.add(candidate.leaf.id);
    usedRows.add(candidate.product.rowNumber);
  }

  for (const leaf of leaves) {
    if (usedLeaves.has(leaf.id)) continue;
    const ranked = products
      .filter((product) => brandCompatible(leaf, product))
      .map((product) => ({ product, score: scoreLeaf(leaf, product) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const second = ranked[1];
    unmatched.push({
      path: leaf.pathParts.join(" / "),
      images: leaf.images.length,
      best: best ? { sku: best.product.sku, nombre: best.product.nombre, score: best.score } : null,
      second: second ? { sku: second.product.sku, nombre: second.product.nombre, score: second.score } : null,
    });
  }
  return { matches, unmatched };
}

function brandCompatible(leaf, product) {
  const source = normalize(leaf.pathParts.join(" "));
  const productBrand = normalize(product.marca);
  const sourceAlias = SOURCE_BRAND_ALIASES.find(({ token }) => source.includes(token));
  if (sourceAlias) return productBrand.includes(sourceAlias.brand);
  const explicitSourceBrand = KNOWN_BRANDS.find((brand) => source.includes(brand));
  if (!explicitSourceBrand) return true;
  if (explicitSourceBrand === "ASUS") return productBrand.includes("ASUS");
  if (explicitSourceBrand === "GIGABYTE") return productBrand.includes("GIGABYTE");
  return productBrand.includes(explicitSourceBrand);
}

async function normalizeImage(inputBuffer, outputFile) {
  let background = { r: 255, g: 255, b: 255, alpha: 1 };
  const image = sharp(inputBuffer, { failOn: "none" }).rotate();
  try {
    const metadata = await image.metadata();
    if (!metadata.hasAlpha) {
      const sample = await sharp(inputBuffer, { failOn: "none" })
        .rotate()
        .extract({ left: 0, top: 0, width: 1, height: 1 })
        .removeAlpha()
        .raw()
        .toBuffer();
      background = { r: sample[0], g: sample[1], b: sample[2], alpha: 1 };
    }
  } catch {
    background = { r: 255, g: 255, b: 255, alpha: 1 };
  }
  await sharp(inputBuffer, { failOn: "none" })
    .rotate()
    .flatten({ background })
    .resize({ width: 1000, height: 1000, fit: "contain", background })
    .webp({ quality: 84, effort: 5 })
    .toFile(outputFile);
}

async function processMatch(token, rootId, match, index, total) {
  const product = match.product;
  const moved = false;
  const dir = path.join(TMP_ROOT, safeName(CATEGORY), safeName(product.sku || product.id));
  fs.mkdirSync(dir, { recursive: true });
  const uploaded = [];
  const selectedImages = match.leaf.images.slice(0, MAX_IMAGES_BY_CATEGORY[CATEGORY] || 5);
  console.log(`[${index}/${total}] ${match.leaf.pathParts.join(" / ")} -> ${product.sku} (${selectedImages.length} fotos)`);
  for (const [imageIndex, image] of selectedImages.entries()) {
    const source = await downloadFile(token, image.id);
    const fileName = `${safeName(product.sku || product.id)}-${String(imageIndex + 1).padStart(2, "0")}.webp`;
    const outputFile = path.join(dir, fileName);
    await normalizeImage(source, outputFile);
    const result = await uploadViaAppsScript(outputFile, product, match.leaf, imageIndex + 1);
    uploaded.push(result.url);
  }
  if (CLEANUP) {
    const idsToTrash = match.leaf.images.map((image) => image.id);
    if (match.leaf.parentId === rootId) idsToTrash.push(match.leaf.id);
    await trashViaAppsScript(idsToTrash);
  }
  return {
    rowNumber: product.rowNumber,
    sku: product.sku,
    nombre: product.nombre,
    moved,
    mainImage: uploaded[0] || "",
    extraImages: uploaded.slice(1),
  };
}

async function main() {
  fs.mkdirSync(TMP_ROOT, { recursive: true });
  const rootId = CATEGORY_FOLDERS[CATEGORY];
  if (!rootId) throw new Error(`Categoria no soportada: ${CATEGORY}`);
  const token = await getAccessToken();
  const [sheet, leaves] = await Promise.all([readProducts(token), collectLeafFolders(token, rootId)]);
  const { matches, unmatched } = matchLeaves(leaves, sheet.products);
  const selected = LIMIT ? matches.slice(START, START + LIMIT) : matches.slice(START);
  const report = {
    category: CATEGORY,
    dryRun: DRY_RUN,
    cleanup: CLEANUP,
    missingOnly: MISSING_ONLY,
    generatedAt: new Date().toISOString(),
    products: sheet.products.length,
    leaves: leaves.length,
    matched: matches.length,
    selected: selected.length,
    unmatched,
    matches: matches.map(({ leaf, product, score }) => ({
      path: leaf.pathParts.join(" / "),
      images: leaf.images.length,
      rowNumber: product.rowNumber,
      sku: product.sku,
      nombre: product.nombre,
      marca: product.marca,
      score,
    })),
    updated: [],
  };

  if (!DRY_RUN) {
    for (const [i, match] of selected.entries()) {
      const update = await processMatch(token, rootId, match, i + 1, selected.length);
      report.updated.push(update);
      await updateProductRows(token, sheet, [update]);
    }
  }

  const reportFile = path.join(TMP_ROOT, `${CATEGORY.toLowerCase()}-sync-report.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        category: CATEGORY,
        dryRun: DRY_RUN,
        cleanup: CLEANUP,
        products: report.products,
        leaves: report.leaves,
        matched: report.matched,
        selected: report.selected,
        updated: report.updated.length,
        unmatched: report.unmatched.length,
        reportFile,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
