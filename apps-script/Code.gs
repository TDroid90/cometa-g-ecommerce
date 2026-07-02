const PRODUCT_SHEET_NAME = "PRODUCTOS";
const PRODUCT_SPREADSHEET_ID = "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY";
const PRODUCT_IMAGES_FOLDER_ID = "1Uj9mc_Rs6BzR6kKAbUxWStkypsI9sUpj";
const PRODUCT_IMAGES_ZIP_ID = "1s_I-ilVyrvkngXA63cXW_zghxufcwtso";
const MIGRATION_WEB_KEY = "CometaG-Migrate-Drive-2026";
const EDITABLE_PRODUCT_FIELDS = [
  "id",
  "sku",
  "nombre",
  "slug",
  "descripcion_corta",
  "descripcion_larga",
  "precio_usd",
  "precio",
  "precio_oferta_usd",
  "precio_oferta",
  "stock",
  "stock_status",
  "categoria",
  "subcategoria",
  "marca",
  "tags",
  "imagen_principal",
  "imagenes_extra",
  "atributos",
  "variables",
  "color",
  "garantia",
  "destacado",
  "nuevo",
  "oferta",
  "preventa",
  "fecha_lanzamiento",
  "visible",
  "orden"
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("COMETA G")
    .addItem("Editor de producto", "showProductEditor")
    .addSeparator()
    .addItem("Importar ZIP imagenes a Drive", "importProductImageZipToDrive")
    .addItem("Migrar 20 imagenes Blob a Drive", "migrateBlobImagesBatch")
    .addItem("Migrar 20 imagenes remotas a Drive", "migrateRemoteImagesBatch")
    .addItem("Reiniciar migracion de imagenes", "resetBlobImageMigration")
    .addItem("Reiniciar migracion remota", "resetRemoteImageMigration")
    .addToUi();
}

function showProductEditor() {
  const html = HtmlService.createHtmlOutputFromFile("ProductEditor")
    .setTitle("Editor de producto")
    .setWidth(440);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(PRODUCT_SPREADSHEET_ID);
}

function toast_(message) {
  getSpreadsheet_().toast(message, "COMETA G");
}

function getProductSheet_() {
  const sheet = getSpreadsheet_().getSheetByName(PRODUCT_SHEET_NAME);
  if (!sheet) throw new Error("No existe la hoja PRODUCTOS.");
  return sheet;
}

function getHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
  const indexByHeader = {};
  headers.forEach((header, index) => {
    if (header) indexByHeader[header] = index;
  });
  return { headers, indexByHeader };
}

function rowToProduct_(headers, row) {
  const product = {};
  headers.forEach((header, index) => {
    if (header) product[header] = row[index] || "";
  });
  return product;
}

function findProductByLookup(lookup) {
  const value = String(lookup || "").trim().toLowerCase();
  if (!value) throw new Error("Ingresa un ID, SKU o slug.");

  const sheet = getProductSheet_();
  const { headers, indexByHeader } = getHeaders_(sheet);
  const idIndex = indexByHeader.id;
  const skuIndex = indexByHeader.sku;
  const slugIndex = indexByHeader.slug;
  const values = sheet.getDataRange().getValues();

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const matches = [idIndex, skuIndex, slugIndex].some((index) => {
      if (index === undefined) return false;
      return String(row[index] || "").trim().toLowerCase() === value;
    });
    if (matches) {
      return {
        found: true,
        rowNumber: rowIndex + 1,
        fields: EDITABLE_PRODUCT_FIELDS,
        product: rowToProduct_(headers, row)
      };
    }
  }

  return {
    found: false,
    rowNumber: null,
    fields: EDITABLE_PRODUCT_FIELDS,
    product: { id: lookup, visible: "TRUE", stock_status: "disponible" }
  };
}

function saveProduct(payload) {
  const rowNumber = Number(payload && payload.rowNumber);
  const product = (payload && payload.product) || {};
  if (!rowNumber || rowNumber < 2) throw new Error("Primero abri un producto existente.");

  const sheet = getProductSheet_();
  const { indexByHeader } = getHeaders_(sheet);
  EDITABLE_PRODUCT_FIELDS.forEach((field) => {
    const index = indexByHeader[field];
    if (index !== undefined && Object.prototype.hasOwnProperty.call(product, field)) {
      sheet.getRange(rowNumber, index + 1).setValue(product[field]);
    }
  });

  return { ok: true, message: "Producto guardado.", rowNumber };
}

function createProduct(product) {
  const sheet = getProductSheet_();
  const { headers } = getHeaders_(sheet);
  const id = String((product && product.id) || "").trim();
  const name = String((product && product.nombre) || "").trim();
  const slug = String((product && product.slug) || "").trim();
  if (!id || !name || !slug) {
    throw new Error("Para crear, completa al menos id, nombre y slug.");
  }

  const exists = findProductByLookup(id);
  if (exists.found) throw new Error("Ya existe un producto con ese ID.");

  const row = headers.map((header) => {
    if (!header) return "";
    if (Object.prototype.hasOwnProperty.call(product, header)) return product[header];
    if (header === "visible") return "TRUE";
    if (header === "stock_status") return "disponible";
    return "";
  });
  sheet.appendRow(row);
  return { ok: true, message: "Producto creado.", rowNumber: sheet.getLastRow() };
}

function safeName_(value) {
  return String(value || "producto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "producto";
}

function getOrCreateFolder_(parent, name) {
  const safe = safeName_(name);
  const iterator = parent.getFoldersByName(safe);
  if (iterator.hasNext()) return iterator.next();
  return parent.createFolder(safe);
}

function driveImageUrl_(fileId) {
  return "https://drive.google.com/uc?export=view&id=" + fileId;
}

function uploadProductImage(payload) {
  if (!payload || !payload.base64) throw new Error("Falta imagen.");

  const product = payload.product || {};
  const category = product.categoria || "sin-categoria";
  const subcategory = product.subcategoria || "sin-subcategoria";
  const productName = product.sku || product.id || product.slug || product.nombre || "producto";
  const index = payload.index || "1";
  const mimeType = payload.mimeType || "image/webp";
  const extension = (payload.fileName || "").split(".").pop() || mimeType.split("/").pop() || "webp";

  const root = DriveApp.getFolderById(PRODUCT_IMAGES_FOLDER_ID);
  const categoryFolder = getOrCreateFolder_(root, category);
  const subcategoryFolder = getOrCreateFolder_(categoryFolder, subcategory);
  const productFolder = getOrCreateFolder_(subcategoryFolder, productName);
  const bytes = Utilities.base64Decode(payload.base64);
  const filename = safeName_(productName) + "-" + String(index).padStart(2, "0") + "." + safeName_(extension).toLowerCase();
  const blob = Utilities.newBlob(bytes, mimeType, filename);
  const file = productFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    ok: true,
    id: file.getId(),
    name: file.getName(),
    url: driveImageUrl_(file.getId())
  };
}

function isBlobImageUrl_(url) {
  return /\.blob\.vercel-storage\.com\//i.test(String(url || ""));
}

function isDriveImageUrl_(url) {
  return /drive\.google\.com/i.test(String(url || ""));
}

function isMigratableImageUrl_(url) {
  const text = String(url || "").trim();
  return /^https?:\/\//i.test(text) && !isDriveImageUrl_(text);
}

function splitImageList_(value) {
  return String(value || "")
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function fileExtensionFrom_(url, contentType) {
  const cleanUrl = String(url || "").split("?")[0];
  const match = cleanUrl.match(/\.([a-z0-9]{2,5})$/i);
  if (match) return match[1].toLowerCase();
  if (/png/i.test(contentType)) return "png";
  if (/jpe?g/i.test(contentType)) return "jpg";
  if (/webp/i.test(contentType)) return "webp";
  return "webp";
}

function sourceImageUrl_(url) {
  const text = String(url || "");
  if (/^https?:\/\/wsrv\.nl\//i.test(text)) {
    const match = text.match(/[?&]url=([^&]+)/i);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return text;
}

function migrateBlobImageUrl_(url, product, index) {
  if (!isBlobImageUrl_(url)) return url;
  return migrateRemoteImageUrl_(url, product, index);
}

function migrateRemoteImageUrl_(url, product, index) {
  if (!isMigratableImageUrl_(url)) return url;

  const sourceUrl = sourceImageUrl_(url);
  const response = UrlFetchApp.fetch(sourceUrl, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      "User-Agent": "Mozilla/5.0 CometaGImageMigrator/1.0"
    }
  });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) return url;

  const category = product.categoria || "sin-categoria";
  const subcategory = product.subcategoria || "sin-subcategoria";
  const productName = product.sku || product.id || product.slug || product.nombre || "producto";
  const root = DriveApp.getFolderById(PRODUCT_IMAGES_FOLDER_ID);
  const categoryFolder = getOrCreateFolder_(root, category);
  const subcategoryFolder = getOrCreateFolder_(categoryFolder, subcategory);
  const productFolder = getOrCreateFolder_(subcategoryFolder, productName);
  const contentType = response.getHeaders()["Content-Type"] || "image/webp";
  const extension = fileExtensionFrom_(sourceUrl, contentType);
  const filename = safeName_(productName) + "-" + String(index).padStart(2, "0") + "." + extension;
  const existing = productFolder.getFilesByName(filename);
  const file = existing.hasNext()
    ? existing.next()
    : productFolder.createFile(response.getBlob().setName(filename));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return driveImageUrl_(file.getId());
}

function resetRemoteImageMigration() {
  PropertiesService.getScriptProperties().deleteProperty("REMOTE_IMAGE_MIGRATION_ROW");
  toast_("Migracion remota reiniciada. Ejecuta de nuevo el lote.");
}

function migrateRemoteImagesBatch(limit) {
  const sheet = getProductSheet_();
  const { headers, indexByHeader } = getHeaders_(sheet);
  const mainIndex = indexByHeader.imagen_principal;
  const extraIndex = indexByHeader.imagenes_extra;
  if (mainIndex === undefined && extraIndex === undefined) throw new Error("No encuentro columnas de imagenes.");

  const props = PropertiesService.getScriptProperties();
  const startRow = Number(props.getProperty("REMOTE_IMAGE_MIGRATION_ROW") || "2");
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const batchLimit = Math.max(1, Number(limit || 20));
  if (startRow > lastRow) {
    props.deleteProperty("REMOTE_IMAGE_MIGRATION_ROW");
    return { ok: true, migrated: 0, startRow, nextRow: startRow, totalRows: lastRow - 1, done: true };
  }

  const endRow = Math.min(lastRow, startRow + batchLimit - 1);
  const values = sheet.getRange(startRow, 1, endRow - startRow + 1, lastColumn).getValues();
  let migrated = 0;

  values.forEach((row) => {
    const product = rowToProduct_(headers, row);
    let imageIndex = 1;
    if (mainIndex !== undefined && isMigratableImageUrl_(row[mainIndex])) {
      const nextUrl = migrateRemoteImageUrl_(row[mainIndex], product, imageIndex);
      if (nextUrl !== row[mainIndex]) migrated += 1;
      row[mainIndex] = nextUrl;
      imageIndex += 1;
    }
    if (extraIndex !== undefined) {
      const urls = splitImageList_(row[extraIndex]);
      const nextUrls = urls.map((url) => {
        const nextUrl = migrateRemoteImageUrl_(url, product, imageIndex);
        if (nextUrl !== url) migrated += 1;
        imageIndex += 1;
        return nextUrl;
      });
      row[extraIndex] = nextUrls.join("|");
    }
  });

  sheet.getRange(startRow, 1, values.length, lastColumn).setValues(values);
  const nextRow = endRow + 1;
  if (nextRow > lastRow) {
    props.deleteProperty("REMOTE_IMAGE_MIGRATION_ROW");
  } else {
    props.setProperty("REMOTE_IMAGE_MIGRATION_ROW", String(nextRow));
  }
  const result = {
    ok: true,
    migrated,
    startRow,
    endRow,
    nextRow,
    totalRows: lastRow - 1,
    done: nextRow > lastRow
  };
  toast_("Migradas " + migrated + " imagenes remotas. Proxima fila: " + (result.done ? "fin" : nextRow));
  return result;
}

function resetBlobImageMigration() {
  PropertiesService.getScriptProperties().deleteProperty("BLOB_IMAGE_MIGRATION_ROW");
  toast_("Migracion reiniciada. Ejecuta de nuevo el lote.");
}

function migrateBlobImagesBatch() {
  const sheet = getProductSheet_();
  const { headers, indexByHeader } = getHeaders_(sheet);
  const mainIndex = indexByHeader.imagen_principal;
  const extraIndex = indexByHeader.imagenes_extra;
  if (mainIndex === undefined && extraIndex === undefined) throw new Error("No encuentro columnas de imagenes.");

  const props = PropertiesService.getScriptProperties();
  const startRow = Number(props.getProperty("BLOB_IMAGE_MIGRATION_ROW") || "2");
  const lastRow = sheet.getLastRow();
  const maxImages = 20;
  let migrated = 0;
  let rowNumber = startRow;

  for (; rowNumber <= lastRow && migrated < maxImages; rowNumber += 1) {
    const row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
    const product = rowToProduct_(headers, row);
    let changed = false;

    if (mainIndex !== undefined && isBlobImageUrl_(row[mainIndex])) {
      row[mainIndex] = migrateBlobImageUrl_(row[mainIndex], product, 1);
      changed = true;
      migrated += 1;
    }

    if (extraIndex !== undefined && migrated < maxImages) {
      const images = splitImageList_(row[extraIndex]);
      const nextImages = images.map((image, imageIndex) => {
        if (migrated >= maxImages || !isBlobImageUrl_(image)) return image;
        migrated += 1;
        changed = true;
        return migrateBlobImageUrl_(image, product, imageIndex + 2);
      });
      row[extraIndex] = nextImages.join("|");
    }

    if (changed) {
      sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).setValues([row]);
    }
  }

  if (rowNumber > lastRow) {
    props.deleteProperty("BLOB_IMAGE_MIGRATION_ROW");
  } else {
    props.setProperty("BLOB_IMAGE_MIGRATION_ROW", String(rowNumber));
  }

  toast_("Migradas " + migrated + " imagenes. Proxima fila: " + (rowNumber > lastRow ? "fin" : rowNumber));
}

function parseCsvLine_(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function getOrCreatePathFolder_(root, zipPath) {
  const parts = String(zipPath || "").split("/").filter(Boolean);
  parts.pop();
  let folder = root;
  parts.forEach((part) => {
    folder = getOrCreateFolder_(folder, part);
  });
  return folder;
}

function importProductImageZipToDrive() {
  return importProductImageZipBatch(1000);
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.key !== MIGRATION_WEB_KEY) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "forbidden" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (params.reset === "1") {
    if (params.action === "remote") {
      PropertiesService.getScriptProperties().deleteProperty("REMOTE_IMAGE_MIGRATION_ROW");
    } else {
      PropertiesService.getScriptProperties().deleteProperty("ZIP_IMPORT_INDEX");
    }
  }
  const result = params.action === "remote"
    ? migrateRemoteImagesBatch(Number(params.limit || 20))
    : importProductImageZipBatch(Number(params.limit || 80));
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function importProductImageZipBatch(limit) {
  const zipFile = DriveApp.getFileById(PRODUCT_IMAGES_ZIP_ID);
  const zipBlobs = Utilities.unzip(zipFile.getBlob());
  const blobByName = {};
  let manifestText = "";

  zipBlobs.forEach((blob) => {
    const name = blob.getName();
    if (name === "manifest.csv") {
      manifestText = blob.getDataAsString("UTF-8");
    } else if (/^productos\//.test(name) && /\.(webp|png|jpe?g)$/i.test(name)) {
      blobByName[name] = blob;
    }
  });

  if (!manifestText) throw new Error("El ZIP no tiene manifest.csv.");

  const root = DriveApp.getFolderById(PRODUCT_IMAGES_FOLDER_ID);
  const urlMap = {};
  const lines = manifestText.split(/\r?\n/).filter(Boolean).slice(1);
  const props = PropertiesService.getScriptProperties();
  const startIndex = Number(props.getProperty("ZIP_IMPORT_INDEX") || "0");
  const endIndex = Math.min(lines.length, startIndex + Math.max(1, Number(limit || 80)));
  let imported = 0;

  lines.slice(startIndex, endIndex).forEach((line) => {
    const parts = parseCsvLine_(line);
    const oldUrl = parts[0];
    const zipPath = parts[1];
    const blob = blobByName[zipPath];
    if (!oldUrl || !zipPath || !blob) return;

    const parent = getOrCreatePathFolder_(root, zipPath);
    const fileName = zipPath.split("/").pop();
    const existing = parent.getFilesByName(fileName);
    const file = existing.hasNext() ? existing.next() : parent.createFile(blob.copyBlob().setName(fileName));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    urlMap[oldUrl] = driveImageUrl_(file.getId());
    imported += 1;
  });

  replaceProductImageUrls_(urlMap);
  if (endIndex >= lines.length) {
    props.deleteProperty("ZIP_IMPORT_INDEX");
  } else {
    props.setProperty("ZIP_IMPORT_INDEX", String(endIndex));
  }
  const result = {
    ok: true,
    imported,
    startIndex,
    endIndex,
    total: lines.length,
    done: endIndex >= lines.length
  };
  toast_("Importadas/vinculadas " + imported + " imagenes desde ZIP. " + endIndex + "/" + lines.length);
  return result;
}

function replaceProductImageUrls_(urlMap) {
  const sheet = getProductSheet_();
  const { indexByHeader } = getHeaders_(sheet);
  const mainIndex = indexByHeader.imagen_principal;
  const extraIndex = indexByHeader.imagenes_extra;
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2) return;

  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  let changedRows = 0;

  values.forEach((row) => {
    let changed = false;
    [mainIndex, extraIndex].forEach((index) => {
      if (index === undefined) return;
      let text = String(row[index] || "");
      Object.keys(urlMap).forEach((oldUrl) => {
        if (text.indexOf(oldUrl) !== -1) {
          text = text.split(oldUrl).join(urlMap[oldUrl]);
          changed = true;
        }
      });
      row[index] = text;
    });
    if (changed) changedRows += 1;
  });

  sheet.getRange(2, 1, values.length, lastColumn).setValues(values);
  toast_("Filas de PRODUCTOS actualizadas: " + changedRows);
}
