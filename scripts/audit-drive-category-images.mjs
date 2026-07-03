import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PRODUCT_SPREADSHEET_ID = "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY";
const PRODUCT_SHEET_NAME = "PRODUCTOS";
const CATEGORY_FOLDERS = {
  Coolers: "1A7TB_09mug9gmpHoqPpfqGrAkJlYa3V9",
  Fuentes: "14qghucdUYgFGwXhGv-1MZy_JveMEZxq9",
};
const IMAGE_RE = /^image\//i;
const FOLDER_MIME = "application/vnd.google-apps.folder";

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
      fields: "nextPageToken,files(id,name,mimeType,size)",
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

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\bWHT\b/g, "WHITE")
    .replace(/\bBLANCO\b/g, "WHITE")
    .replace(/\bNEGRO\b/g, "BLACK")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readProducts(token, category) {
  const response = await googleFetch(
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${PRODUCT_SPREADSHEET_ID}/values/${encodeURIComponent(PRODUCT_SHEET_NAME)}`,
  );
  const [headers, ...rows] = response.values || [];
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  const get = (row, key) => String(row[index[key]] || "").trim();
  return rows
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
        normalize(product.subcategoria) === normalize(category) &&
        product.visible &&
        product.stock > 1 &&
        normalize(product.stock_status) !== "SIN STOCK",
    );
}

async function collectDriveStructure(token, category) {
  const rootId = CATEGORY_FOLDERS[category];
  if (!rootId) throw new Error(`Categoria no soportada: ${category}`);
  const topChildren = await listChildren(token, rootId);
  const topImages = topChildren.filter((file) => IMAGE_RE.test(file.mimeType));
  const topFiles = topChildren.filter((file) => file.mimeType !== FOLDER_MIME && !IMAGE_RE.test(file.mimeType));
  const brandFolders = topChildren.filter((file) => file.mimeType === FOLDER_MIME);
  const brands = [];

  for (const brand of brandFolders) {
    const brandChildren = await listChildren(token, brand.id);
    const brandImages = brandChildren.filter((file) => IMAGE_RE.test(file.mimeType));
    const modelFolders = brandChildren.filter((file) => file.mimeType === FOLDER_MIME);
    const models = [];
    for (const model of modelFolders) {
      const modelChildren = await listChildren(token, model.id);
      const images = modelChildren.filter((file) => IMAGE_RE.test(file.mimeType));
      const folders = modelChildren.filter((file) => file.mimeType === FOLDER_MIME);
      models.push({
        name: model.name,
        id: model.id,
        images: images.map(({ id, name, mimeType, size }) => ({ id, name, mimeType, size })),
        nestedFolders: folders.map(({ id, name }) => ({ id, name })),
        otherFiles: modelChildren
          .filter((file) => file.mimeType !== FOLDER_MIME && !IMAGE_RE.test(file.mimeType))
          .map(({ id, name, mimeType }) => ({ id, name, mimeType })),
      });
    }
    brands.push({
      name: brand.name,
      id: brand.id,
      brandLevelImages: brandImages.map(({ id, name, mimeType, size }) => ({ id, name, mimeType, size })),
      modelFolders: models,
      otherFiles: brandChildren
        .filter((file) => file.mimeType !== FOLDER_MIME && !IMAGE_RE.test(file.mimeType))
        .map(({ id, name, mimeType }) => ({ id, name, mimeType })),
    });
  }

  return {
    rootId,
    topImages: topImages.map(({ id, name, mimeType, size }) => ({ id, name, mimeType, size })),
    topFiles: topFiles.map(({ id, name, mimeType }) => ({ id, name, mimeType })),
    brandFolders: brands,
  };
}

function scoreModelToProduct(brandName, modelName, product) {
  const source = normalize(`${brandName} ${modelName}`);
  const productText = normalize(`${product.marca} ${product.sku} ${product.nombre}`);
  const sku = normalize(product.sku);
  let score = 0;
  if (sku && source.includes(sku)) score += 500;
  if (sku && source.replace(/\s/g, "").includes(sku.replace(/\s/g, ""))) score += 500;
  for (const token of source.split(" ").filter((part) => part.length > 2)) {
    if (productText.includes(token)) score += token.length >= 4 ? 12 : 5;
  }
  const brand = normalize(brandName);
  if (brand && productText.includes(brand)) score += 80;
  return score;
}

function matchModels(structure, products) {
  const matches = [];
  const unmatchedModels = [];
  const usedRows = new Set();
  for (const brand of structure.brandFolders) {
    for (const model of brand.modelFolders) {
      if (!model.images.length) {
        unmatchedModels.push({ brand: brand.name, model: model.name, reason: "sin imagenes" });
        continue;
      }
      const candidates = products
        .filter((product) => !usedRows.has(product.rowNumber))
        .map((product) => ({ product, score: scoreModelToProduct(brand.name, model.name, product) }))
        .sort((a, b) => b.score - a.score);
      const best = candidates[0];
      const second = candidates[1];
      if (best && best.score >= 80 && (!second || best.score - second.score >= 8)) {
        usedRows.add(best.product.rowNumber);
        matches.push({ brand: brand.name, model: model.name, images: model.images.length, product: best.product, score: best.score });
      } else {
        unmatchedModels.push({
          brand: brand.name,
          model: model.name,
          images: model.images.length,
          best: best ? { score: best.score, sku: best.product.sku, nombre: best.product.nombre } : null,
          second: second ? { score: second.score, sku: second.product.sku, nombre: second.product.nombre } : null,
        });
      }
    }
  }
  const matchedRows = new Set(matches.map((match) => match.product.rowNumber));
  const productsWithoutImage = products.filter((product) => !product.imagen_principal);
  const productsWithoutMatchedFolder = products.filter((product) => !matchedRows.has(product.rowNumber));
  return { matches, unmatchedModels, productsWithoutImage, productsWithoutMatchedFolder };
}

async function main() {
  const categoryArg = process.argv.find((arg) => arg.startsWith("--category="));
  const category = categoryArg ? categoryArg.split("=")[1] : "Coolers";
  const token = await getAccessToken();
  const [products, structure] = await Promise.all([
    readProducts(token, category),
    collectDriveStructure(token, category),
  ]);
  const matching = matchModels(structure, products);
  const report = {
    category,
    generatedAt: new Date().toISOString(),
    rootId: structure.rootId,
    products: products.length,
    productsWithMainImage: products.filter((product) => product.imagen_principal).length,
    productsWithoutMainImage: matching.productsWithoutImage.map(({ sku, marca, nombre }) => ({ sku, marca, nombre })),
    topLevelLooseImages: structure.topImages,
    topLevelLooseFiles: structure.topFiles,
    brandFolders: structure.brandFolders.map((brand) => ({
      name: brand.name,
      id: brand.id,
      brandLevelImages: brand.brandLevelImages.length,
      modelFolders: brand.modelFolders.length,
      modelImageFolders: brand.modelFolders.filter((model) => model.images.length).length,
      modelsWithoutImages: brand.modelFolders.filter((model) => !model.images.length).map((model) => model.name),
    })),
    matchedModels: matching.matches.map((match) => ({
      brand: match.brand,
      model: match.model,
      images: match.images,
      sku: match.product.sku,
      nombre: match.product.nombre,
      rowNumber: match.product.rowNumber,
      score: match.score,
    })),
    unmatchedModels: matching.unmatchedModels,
    productsWithoutMatchedFolder: matching.productsWithoutMatchedFolder.map(({ sku, marca, nombre, imagen_principal }) => ({
      sku,
      marca,
      nombre,
      hasImage: Boolean(imagen_principal),
    })),
  };

  const outDir = path.join(ROOT, ".tmp", "drive-image-audit");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${category.toLowerCase()}-audit.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        category,
        products: report.products,
        productsWithMainImage: report.productsWithMainImage,
        productsWithoutMainImage: report.productsWithoutMainImage.length,
        topLevelLooseImages: report.topLevelLooseImages.length,
        brandFolders: report.brandFolders.length,
        matchedModels: report.matchedModels.length,
        unmatchedModels: report.unmatchedModels.length,
        productsWithoutMatchedFolder: report.productsWithoutMatchedFolder.length,
        outFile,
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
