import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, ".env.local");
const IMAGE_ROOT = path.join(ROOT, ".tmp", "drive-product-image-migration");
const MANIFEST_FILE = path.join(IMAGE_ROOT, "manifest.csv");
const PRODUCT_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_PRODUCTOS_ID || "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY";
const PRODUCT_SHEET_NAME = "PRODUCTOS";
const DRIVE_PRODUCTS_FOLDER_ID =
  process.env.DRIVE_PRODUCTS_FOLDER_ID || "1Uj9mc_Rs6BzR6kKAbUxWStkypsI9sUpj";

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

async function getAccessToken() {
  if (process.argv.includes("--auth=clasp")) {
    return getClaspAccessToken();
  }

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
      scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets",
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

async function getClaspAccessToken() {
  const claspRc = path.join(process.env.USERPROFILE || process.env.HOME || "", ".clasprc.json");
  const config = JSON.parse(fs.readFileSync(claspRc, "utf8"));
  const credentials = config.tokens?.default;
  if (!credentials?.refresh_token || !credentials?.client_id || !credentials?.client_secret) {
    throw new Error("No encontre credenciales validas de clasp.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: credentials.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(text);
  return JSON.parse(text).access_token;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function readManifest() {
  const rows = fs.readFileSync(MANIFEST_FILE, "utf8").trim().split(/\r?\n/).slice(1);
  return rows.map((line) => {
    const [oldUrl, zipPath] = parseCsvLine(line);
    return { oldUrl, zipPath: zipPath.replace(/\//g, path.sep) };
  });
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
      fields: "nextPageToken,files(id,name,mimeType)",
      pageSize: "1000",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const result = await googleFetch(token, `https://www.googleapis.com/drive/v3/files?${params}`);
    files.push(...(result.files || []));
    pageToken = result.nextPageToken || "";
  } while (pageToken);
  return files;
}

async function createFolder(token, parentId, name) {
  return googleFetch(token, "https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      parents: [parentId],
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
}

async function getOrCreateFolder(token, parentId, name, cache) {
  const key = `${parentId}/${name}`;
  if (cache.has(key)) return cache.get(key);

  const existing = (await listDriveChildren(token, parentId)).find(
    (file) =>
      file.name === name && file.mimeType === "application/vnd.google-apps.folder",
  );
  const folder = existing || (await createFolder(token, parentId, name));
  cache.set(key, folder.id);
  return folder.id;
}

async function ensureFolderPath(token, relativePath, cache) {
  const parts = relativePath.split(/[\\/]/).filter(Boolean);
  let parentId = DRIVE_PRODUCTS_FOLDER_ID;
  for (const part of parts) {
    parentId = await getOrCreateFolder(token, parentId, part, cache);
  }
  return parentId;
}

async function uploadFile(token, parentId, localFile, driveName) {
  const boundary = `cometa_${crypto.randomBytes(12).toString("hex")}`;
  const metadata = Buffer.from(
    `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({
      name: driveName,
      parents: [parentId],
    })}\r\n--${boundary}\r\ncontent-type: image/webp\r\n\r\n`,
  );
  const footer = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([metadata, fs.readFileSync(localFile), footer]);

  return googleFetch(
    token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
    {
      method: "POST",
      headers: { "content-type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
}

async function makePublic(token, fileId) {
  try {
    await googleFetch(token, `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });
  } catch (error) {
    if (!String(error.message).includes("alreadyExists")) throw error;
  }
}

function driveImageUrl(fileId) {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

async function uploadImages(token) {
  await makePublic(token, DRIVE_PRODUCTS_FOLDER_ID);
  const folderCache = new Map();
  const urlByZipPath = new Map();
  const uniquePaths = [...new Set(readManifest().map((row) => row.zipPath))];

  let uploaded = 0;
  for (const zipPath of uniquePaths) {
    const localFile = path.join(IMAGE_ROOT, zipPath);
    if (!fs.existsSync(localFile)) continue;
    const relativeDir = path.dirname(zipPath);
    const fileName = path.basename(zipPath);
    const parentId = await ensureFolderPath(token, relativeDir, folderCache);
    const siblings = await listDriveChildren(token, parentId);
    const existing = siblings.find((file) => file.name === fileName);
    const file = existing || (await uploadFile(token, parentId, localFile, fileName));
    if (!existing) {
      await makePublic(token, file.id);
      uploaded += 1;
      if (uploaded % 25 === 0) console.log(`Subidas ${uploaded} imagenes...`);
    }
    urlByZipPath.set(zipPath, driveImageUrl(file.id));
  }
  return urlByZipPath;
}

async function updateProductSheet(token, urlByZipPath) {
  const manifest = readManifest();
  const replacementByOldUrl = new Map(
    manifest
      .map(({ oldUrl, zipPath }) => [oldUrl, urlByZipPath.get(zipPath)])
      .filter(([, url]) => Boolean(url)),
  );

  const range = `${PRODUCT_SHEET_NAME}!A1:AZ`;
  const response = await googleFetch(
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${PRODUCT_SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,
  );
  const values = response.values || [];
  if (!values.length) throw new Error("La hoja PRODUCTOS no tiene datos.");
  const headers = values[0];
  const imageColumns = headers
    .map((header, index) => ({ header: String(header || ""), index }))
    .filter(({ header }) => ["imagen_principal", "imagenes_extra"].includes(header));

  let replacements = 0;
  const updatedValues = values.map((row, rowIndex) => {
    if (rowIndex === 0) return row;
    const next = [...row];
    for (const { index } of imageColumns) {
      const value = String(next[index] || "");
      if (!value.includes("blob.vercel-storage.com")) continue;
      let updated = value;
      for (const [oldUrl, newUrl] of replacementByOldUrl.entries()) {
        if (updated.includes(oldUrl)) {
          updated = updated.split(oldUrl).join(newUrl);
          replacements += 1;
        }
      }
      next[index] = updated;
    }
    return next;
  });

  await googleFetch(
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${PRODUCT_SPREADSHEET_ID}/values/${encodeURIComponent(`${PRODUCT_SHEET_NAME}!A1`)}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ range: `${PRODUCT_SHEET_NAME}!A1`, values: updatedValues }),
    },
  );

  return { replacements, rows: updatedValues.length - 1 };
}

const token = await getAccessToken();
const urlByZipPath = await uploadImages(token);
const result = await updateProductSheet(token, urlByZipPath);
console.log(JSON.stringify({ uploadedOrFound: urlByZipPath.size, ...result }, null, 2));
