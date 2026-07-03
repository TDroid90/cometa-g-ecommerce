import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, ".env.local");
const TMP_ROOT = path.join(ROOT, ".tmp", "cooler-drive-image-sync");
const SOURCE_ROOT_FOLDER_ID = "1A7TB_09mug9gmpHoqPpfqGrAkJlYa3V9";
const PRODUCT_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_PRODUCTOS_ID || "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY";
const PRODUCT_SHEET_NAME = "PRODUCTOS";
const APPS_SCRIPT_UPLOAD_URL =
  process.env.APPS_SCRIPT_UPLOAD_URL ||
  "https://script.google.com/macros/s/AKfycbybOypl9vMJ6J3CyUivttppmT4lWYaUJUum9rfI1U3z341KF1VE8v2dilAZ4nxhQNFyqA/exec";
const MIGRATION_WEB_KEY = "CometaG-Migrate-Drive-2026";
const BRAND_FOLDERS = new Set([
  "ASRock",
  "ASUS",
  "ASUS ROG",
  "ASUS TUF Gaming",
  "Cooler Master",
  "Corsair",
]);
const IMAGE_MIME_RE = /^image\//i;
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1] || 0) : 0;
const START_ARG = process.argv.find((arg) => arg.startsWith("--start="));
const START = START_ARG ? Number(START_ARG.split("=")[1] || 0) : 0;
const MANUAL_SKU_BY_LABEL = new Map(
  Object.entries({
    [normalize("ASUS ROG ROG Ryujin III 360 ARGB Extreme")]: "RYUJIN III 360 ARGB EXTREME",
    [normalize("ASUS ROG ROG Strix LC III 360 ARGB White Edition")]: "ROG STRIX LC III 360 ARGB WHITE",
    [normalize("Cooler Master LED Controller A1")]: "MFY-ACBN-NNUNN-R2",
    [normalize("Cooler Master SickleFlow Edge SickleFlow Edge 120 ARGB")]: "MFX-B2DN-25NP2-R2",
    [normalize("Cooler Master SickleFlow Edge SickleFlow Edge 120 ARGB White Edition")]: "MFX-B2DW-25NP2-R2",
    [normalize("Cooler Master Ventiladores MF120 Lite ARGB")]: "MFW-B2DN-17NPA-R1",
    [normalize("Cooler Master Ventiladores MF120 Lite ARGB White")]: "MFW-B2DW-17NPA-R1",
    [normalize("Cooler Master Ventiladores MF120 Lite ARGB White 3-Pack")]: "MFW-B2DW-173PA-R1",
    [normalize("Corsair iCUE LINK TITAN 240 RX RGB")]: "CW-9061016-WW",
    [normalize("Corsair iCUE LINK TITAN 240 RX RGB White")]: "CW-9061020-WW",
  }),
);
const SKIP_LABELS = new Set([
  normalize("Cooler Master SickleFlow Edge SickleFlow Edge 120 ARGB 3-pack Fan Kit White Edition"),
]);

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 0) continue;
    const key = line.slice(0, index);
    let value = line.slice(index + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value.replace(/\\n/g, "\n");
  }
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken(scope) {
  loadEnv(ENV_FILE);
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !privateKey) {
    throw new Error("Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY en .env.local");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${claim}`)
    .sign(privateKey, "base64")
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
  const text = await response.text();
  if (!response.ok) throw new Error(text);
  return JSON.parse(text).access_token;
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

async function listDriveChildren(token, parentId) {
  const files = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `'${parentId}' in parents and trashed=false`,
      fields: "nextPageToken,files(id,name,mimeType,size)",
      pageSize: "1000",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const result = await googleFetch(token, `https://www.googleapis.com/drive/v3/files?${params}`);
    files.push(...(result.files || []));
    pageToken = result.nextPageToken || "";
  } while (pageToken);
  return files.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

async function downloadDriveFile(token, fileId) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
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

const STOP_TOKENS = new Set([
  "WATER",
  "COOLER",
  "CPU",
  "ASUS",
  "ROG",
  "TUF",
  "GAMING",
  "MASTER",
  "COOLER",
  "CORSAIR",
  "ASROCK",
  "ARGB",
  "RGB",
  "PWM",
  "FAN",
  "LIQUID",
  "EDITION",
  "W",
  "R",
  "1",
]);

function tokens(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_TOKENS.has(token));
}

function tokenScore(source, product) {
  const productTokens = tokens(`${product.sku} ${product.nombre}`);
  const sourceText = normalize(source);
  const productText = normalize(`${product.id} ${product.sku} ${product.nombre}`);
  const sourceTokens = new Set(tokens(source));
  let score = 0;
  for (const token of productTokens) {
    if (sourceText.includes(token)) score += token.length >= 4 ? 8 : 4;
    if (sourceTokens.has(token)) score += token.length >= 4 ? 12 : 6;
  }
  const sku = normalize(product.sku);
  const leaf = normalize(source);
  if (sku && leaf.includes(sku)) score += 180;
  if (sku && normalize(source).replace(/\s/g, "").includes(sku.replace(/\s/g, ""))) score += 220;
  if (normalize(product.nombre).includes(normalize(source).split(" ").slice(-4).join(" "))) score += 30;
  if (String(product.id || "").toLowerCase().startsWith("nb-")) score += 7;

  for (const marker of ["WHITE", "BLACK", "LCD", "PIXEL", "VRM", "NEX", "CORE II", "MIKU"]) {
    const sourceHas = sourceText.includes(marker);
    const productHas = productText.includes(marker);
    if (sourceHas && productHas) score += 55;
    if (sourceHas && !productHas) score -= 75;
    if (!sourceHas && productHas && ["WHITE", "BLACK", "LCD", "PIXEL", "VRM", "NEX", "MIKU"].includes(marker)) {
      score -= 45;
    }
  }
  for (const size of ["120", "240", "360"]) {
    if (sourceText.includes(size) && productText.includes(size)) score += 35;
    if (sourceText.includes(size) && !productText.includes(size)) score -= 35;
  }
  return score;
}

function brandMatches(sourceBrand, product) {
  const productText = normalize(`${product.marca} ${product.nombre} ${product.sku}`);
  const brand = normalize(sourceBrand);
  if (brand === "ASUS ROG") return productText.includes("ASUS") && productText.includes("ROG");
  if (brand === "ASUS TUF GAMING") return productText.includes("ASUS") && productText.includes("TUF");
  if (brand === "ASUS") return productText.includes("ASUS") && !productText.includes("ROG") && !productText.includes("TUF");
  return productText.includes(brand);
}

function safeName(value) {
  return String(value || "producto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "producto";
}

async function collectLeafImageFolders(token) {
  const rootChildren = await listDriveChildren(token, SOURCE_ROOT_FOLDER_ID);
  const brandRoots = rootChildren.filter(
    (file) => file.mimeType === "application/vnd.google-apps.folder" && BRAND_FOLDERS.has(file.name),
  );
  const leaves = [];

  async function walk(folder, parts, brand) {
    const children = await listDriveChildren(token, folder.id);
    const images = children.filter((file) => IMAGE_MIME_RE.test(file.mimeType));
    const folders = children.filter((file) => file.mimeType === "application/vnd.google-apps.folder");
    if (images.length) {
      leaves.push({
        brand,
        pathParts: parts,
        folderId: folder.id,
        label: parts.join(" "),
        images,
      });
    }
    for (const child of folders) {
      await walk(child, [...parts, child.name], brand);
    }
  }

  for (const brandFolder of brandRoots) {
    await walk(brandFolder, [brandFolder.name], brandFolder.name);
  }
  return leaves;
}

async function readProducts(token) {
  const response = await googleFetch(
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${PRODUCT_SPREADSHEET_ID}/values/${encodeURIComponent(PRODUCT_SHEET_NAME)}`,
  );
  const [headers, ...rows] = response.values || [];
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  return {
    headers,
    index,
    rows: rows.map((row, offset) => ({ rowNumber: offset + 2, row })),
  };
}

function rowValue(item, index, key) {
  return item.row[index[key]] || "";
}

function coolerProducts(sheet) {
  return sheet.rows
    .map((item) => ({
      ...item,
      id: rowValue(item, sheet.index, "id"),
      sku: rowValue(item, sheet.index, "sku"),
      nombre: rowValue(item, sheet.index, "nombre"),
      categoria: rowValue(item, sheet.index, "categoria"),
      subcategoria: rowValue(item, sheet.index, "subcategoria"),
      marca: rowValue(item, sheet.index, "marca"),
      stock: Number(rowValue(item, sheet.index, "stock") || 0),
      visible: String(rowValue(item, sheet.index, "visible") || "").toUpperCase() !== "FALSE",
    }))
    .filter(
      (product) =>
        normalize(product.categoria) === "HARDWARE" &&
        normalize(product.subcategoria) === "COOLERS" &&
        product.visible &&
        product.stock > 1,
    );
}

function matchLeavesToProducts(leaves, products) {
  const matches = [];
  const unmatchedLeaves = [];
  const usedProducts = new Set();

  for (const leaf of leaves) {
    const manualSku = MANUAL_SKU_BY_LABEL.get(normalize(leaf.label));
    if (SKIP_LABELS.has(normalize(leaf.label))) {
      unmatchedLeaves.push({ label: leaf.label, brand: leaf.brand, images: leaf.images.length, skipped: true });
      continue;
    }
    if (manualSku) {
      const product = products.find(
        (candidate) =>
          !usedProducts.has(candidate.rowNumber) && normalize(candidate.sku) === normalize(manualSku),
      );
      if (product) {
        matches.push({ leaf, product, score: 999 });
        usedProducts.add(product.rowNumber);
        continue;
      }
    }

    const candidates = products
      .filter((product) => !usedProducts.has(product.rowNumber) && brandMatches(leaf.brand, product))
      .map((product) => ({ product, score: tokenScore(leaf.label, product) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aNb = String(a.product.id || "").toLowerCase().startsWith("nb-") ? 1 : 0;
        const bNb = String(b.product.id || "").toLowerCase().startsWith("nb-") ? 1 : 0;
        return bNb - aNb;
      });
    const best = candidates[0];
    const second = candidates[1];
    if (best && best.score >= 45 && (!second || best.score - second.score >= 8)) {
      matches.push({ leaf, product: best.product, score: best.score });
      usedProducts.add(best.product.rowNumber);
    } else {
      unmatchedLeaves.push({
        label: leaf.label,
        brand: leaf.brand,
        images: leaf.images.length,
        best: best ? { rowNumber: best.product.rowNumber, sku: best.product.sku, nombre: best.product.nombre, score: best.score } : null,
        second: second ? { rowNumber: second.product.rowNumber, sku: second.product.sku, nombre: second.product.nombre, score: second.score } : null,
      });
    }
  }

  return { matches, unmatchedLeaves };
}

async function normalizeImage(inputBuffer, outputFile) {
  const metadata = await sharp(inputBuffer, { failOn: "none" }).metadata();
  const { width = 1000, height = 1000, hasAlpha } = metadata;
  let background = { r: 255, g: 255, b: 255, alpha: 1 };
  if (!hasAlpha) {
    try {
      const sample = await sharp(inputBuffer, { failOn: "none" })
        .extract({ left: 0, top: 0, width: 1, height: 1 })
        .removeAlpha()
        .raw()
        .toBuffer();
      background = { r: sample[0], g: sample[1], b: sample[2], alpha: 1 };
    } catch {
      background = { r: 255, g: 255, b: 255, alpha: 1 };
    }
  }
  await sharp(inputBuffer, { failOn: "none" })
    .rotate()
    .flatten({ background })
    .resize({
      width: 1000,
      height: 1000,
      fit: "contain",
      background,
      withoutEnlargement: false,
    })
    .webp({ quality: 82, effort: 5 })
    .toFile(outputFile);
  return { width, height };
}

async function uploadViaAppsScript(file, product, index) {
  const response = await fetch(APPS_SCRIPT_UPLOAD_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      key: MIGRATION_WEB_KEY,
      action: "uploadProductImage",
      base64: fs.readFileSync(file).toString("base64"),
      mimeType: "image/webp",
      fileName: path.basename(file),
      index,
      product: {
        id: product.id,
        sku: product.sku,
        slug: "",
        nombre: product.nombre,
        categoria: product.categoria,
        subcategoria: product.subcategoria,
      },
    }),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Apps Script no devolvio JSON: ${text.slice(0, 300)}`);
  }
  if (!response.ok || !json.ok) throw new Error(`Upload fallido: ${text}`);
  return json;
}

async function updateProductImages(token, sheet, updates) {
  const mainIndex = sheet.index.imagen_principal;
  const extraIndex = sheet.index.imagenes_extra;
  const data = [];
  for (const update of updates) {
    data.push({
      range: `${PRODUCT_SHEET_NAME}!${columnName(mainIndex + 1)}${update.rowNumber}`,
      values: [[update.mainImage]],
    });
    data.push({
      range: `${PRODUCT_SHEET_NAME}!${columnName(extraIndex + 1)}${update.rowNumber}`,
      values: [[update.extraImages.join("|")]],
    });
  }
  if (!data.length) return;
  await googleFetch(
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${PRODUCT_SPREADSHEET_ID}/values:batchUpdate`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ valueInputOption: "RAW", data }),
    },
  );
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
  fs.mkdirSync(TMP_ROOT, { recursive: true });
  const token = await getAccessToken(
    "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets",
  );
  const leaves = await collectLeafImageFolders(token);
  const sheet = await readProducts(token);
  const products = coolerProducts(sheet);
  const { matches, unmatchedLeaves } = matchLeavesToProducts(leaves, products);
  const selectedMatches = LIMIT > 0 ? matches.slice(START, START + LIMIT) : matches.slice(START);

  const report = {
    dryRun: DRY_RUN,
    sourceFolders: leaves.length,
    coolerProducts: products.length,
    matched: matches.length,
    start: START,
    selected: selectedMatches.length,
    unmatchedLeaves,
    matches: matches.map(({ leaf, product, score }) => ({
      source: leaf.label,
      brand: leaf.brand,
      images: leaf.images.length,
      rowNumber: product.rowNumber,
      sku: product.sku,
      nombre: product.nombre,
      score,
    })),
    uploaded: [],
    updatedRows: [],
  };

  if (!DRY_RUN) {
    for (const [matchIndex, match] of selectedMatches.entries()) {
      const uploadedUrls = [];
      const productDir = path.join(TMP_ROOT, safeName(match.product.sku || match.product.id));
      fs.mkdirSync(productDir, { recursive: true });
      console.log(
        `[${matchIndex + 1}/${selectedMatches.length}] ${match.leaf.label} -> ${match.product.sku} ${match.product.nombre}`,
      );
      for (const [imageIndex, image] of match.leaf.images.entries()) {
        const source = await downloadDriveFile(token, image.id);
        const outputFile = path.join(
          productDir,
          `${safeName(match.product.sku || match.product.id)}-${String(imageIndex + 1).padStart(2, "0")}.webp`,
        );
        const sourceMeta = await normalizeImage(source, outputFile);
        const result = await uploadViaAppsScript(outputFile, match.product, imageIndex + 1);
        uploadedUrls.push(result.url);
        report.uploaded.push({
          sourceFile: image.name,
          productSku: match.product.sku,
          driveId: result.id,
          url: result.url,
          sourceMeta,
        });
      }
      report.updatedRows.push({
        rowNumber: match.product.rowNumber,
        sku: match.product.sku,
        mainImage: uploadedUrls[0] || "",
        extraImages: uploadedUrls.slice(1),
      });
    }
    await updateProductImages(token, sheet, report.updatedRows);
  }

  const reportFile = path.join(TMP_ROOT, "report.json");
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    dryRun: report.dryRun,
    sourceFolders: report.sourceFolders,
    coolerProducts: report.coolerProducts,
    matched: report.matched,
    selected: report.selected,
    uploaded: report.uploaded.length,
    updatedRows: report.updatedRows.length,
    reportFile,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
