const PRODUCT_SHEET_NAME = "PRODUCTOS";
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
    .addToUi();
}

function showProductEditor() {
  const html = HtmlService.createHtmlOutputFromFile("ProductEditor")
    .setTitle("Editor de producto")
    .setWidth(440);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getProductSheet_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(PRODUCT_SHEET_NAME);
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
