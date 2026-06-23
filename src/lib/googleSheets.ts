import { createSign } from "crypto";
import { CategoryMenuItem, LayoutSection, Product, StockStatus } from "@/lib/types";

type SheetRow = Record<string, string>;
type GoogleToken = { accessToken: string; expiresAt: number };

export const PRODUCT_COLUMNS = [
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
] as const;

const TRUE_VALUES = new Set(["true", "1", "si", "sí", "yes", "y"]);
const DEFAULT_PRODUCTS_SPREADSHEET_ID = "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY";
const DEFAULT_MENU_SHEET_NAME = "MENU_CAT_MAR";
let cachedGoogleToken: GoogleToken | null = null;

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function toBool(value: unknown, fallback = false): boolean {
  const raw = clean(value).toLowerCase();
  if (!raw) return fallback;
  return TRUE_VALUES.has(raw);
}

function toNumber(value: unknown, fallback = 0): number {
  const rawValue = clean(value);
  const raw =
    rawValue.includes(",")
      ? rawValue.replace(/\./g, "").replace(",", ".")
      : rawValue.includes(".") && /^\d+\.\d{1,2}$/.test(rawValue)
        ? rawValue
        : rawValue.replace(/\./g, "");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toList(value: unknown): string[] {
  return clean(value)
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseKeyValue(value: unknown): Record<string, string> | undefined {
  const raw = clean(value);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).map(([key, val]) => [key, String(val)])
      );
    }
  } catch {
    // Also supports "RAM:16GB|SSD:1TB" for fast sheet editing.
  }

  const cleanAttributeKey = (key: string) => {
    let next = key.trim();
    if (/^otal output/i.test(next)) next = `T${next}`;
    if (/^input power$/i.test(next)) next = "Input power";
    if (/^package contents$/i.test(next)) next = "Package contents";
    return next;
  };

  const cleanAttributeValue = (val: string) => val.trim().replace(/^A,\s*W:\s*/i, "");

  const entries = raw
    .replace(/\s*\|\s*/g, "|")
    .replace(/\r?\n/g, "|")
    .split(/[|;]/)
    .map((pair) => {
      const separatorIndex = pair.indexOf(":");
      if (separatorIndex < 0) return ["", ""];
      return [
        cleanAttributeKey(pair.slice(0, separatorIndex)),
        cleanAttributeValue(pair.slice(separatorIndex + 1))
      ];
    })
    .filter(([key, val]) => key && val && !/^(a,\s*w|w)$/i.test(key));

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function parseVariables(value: unknown): Record<string, string[]> | undefined {
  const raw = clean(value);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).map(([key, val]) => [
          key,
          Array.isArray(val) ? val.map(String) : toList(val)
        ])
      );
    }
  } catch {
    // Also supports "Color:Negro,Blanco|Memoria:16GB,32GB".
  }

  const entries = raw
    .split("|")
    .map((pair) => pair.split(":").map((part) => part.trim()))
    .filter(([key, val]) => key && val)
    .map(([key, val]) => [key, toList(val)] as const);

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function rowsFromValues(values: unknown[][]): SheetRow[] {
  const [headerRow = [], ...dataRows] = values;
  const headers = headerRow.map((header) => clean(header));

  return dataRows
    .filter((cells) => cells.some((cell) => clean(cell)))
    .map((cells) =>
      Object.fromEntries(headers.map((header, index) => [header, clean(cells[index])]))
    );
}

function columnName(index: number): string {
  let name = "";
  let current = index + 1;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode("A".charCodeAt(0) + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
}

function parseCsv(csv: string): SheetRow[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rowsFromValues(rows);
}

function base64Url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getServiceAccountConfig(): { clientEmail: string; privateKey: string } | null {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (rawJson && rawJson.trim() !== "") {
    const parsed = JSON.parse(rawJson);
    return {
      clientEmail: clean(parsed.client_email),
      privateKey: clean(parsed.private_key).replace(/\\n/g, "\n")
    };
  }

  const clientEmail = clean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const privateKey = clean(process.env.GOOGLE_PRIVATE_KEY).replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) return null;
  return { clientEmail, privateKey };
}

async function getGoogleAccessToken(): Promise<string | null> {
  const serviceAccount = getServiceAccountConfig();
  if (!serviceAccount) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cachedGoogleToken && cachedGoogleToken.expiresAt - 60 > now) {
    return cachedGoogleToken.accessToken;
  }

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64Url(
    JSON.stringify({
      iss: serviceAccount.clientEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    })
  );
  const unsignedJwt = `${header}.${claimSet}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  signer.end();
  const signature = signer
    .sign(serviceAccount.privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedJwt}.${signature}`
    })
  });

  if (!response.ok) {
    throw new Error("No se pudo autenticar la service account de Google.");
  }

  const token = (await response.json()) as { access_token: string; expires_in: number };
  cachedGoogleToken = {
    accessToken: token.access_token,
    expiresAt: now + token.expires_in
  };

  return cachedGoogleToken.accessToken;
}

export async function readSheetRows(sheetName: string, spreadsheetIdOverride?: string): Promise<SheetRow[]> {
  const rows = await fetchPrivateSheetRows("", sheetName, spreadsheetIdOverride);
  if (!rows) {
    throw new Error(`No hay credenciales privadas para leer ${sheetName}.`);
  }

  return rows;
}

export async function appendSheetRow(
  sheetName: string,
  values: unknown[],
  spreadsheetIdOverride?: string
): Promise<void> {
  const spreadsheetId = spreadsheetIdOverride || process.env.GOOGLE_SHEETS_ID;
  const accessToken = await getGoogleAccessToken();
  if (!spreadsheetId || !accessToken) {
    throw new Error(`No hay credenciales privadas para escribir ${sheetName}.`);
  }

  const encodedRange = encodeURIComponent(`${sheetName}!A:ZZ`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values: [values] })
    }
  );

  if (!response.ok) {
    throw new Error(`No se pudo escribir en ${sheetName}.`);
  }
}

export async function ensureSheetHeader(
  sheetName: string,
  headers: readonly string[],
  spreadsheetIdOverride?: string
): Promise<void> {
  const spreadsheetId = spreadsheetIdOverride || process.env.GOOGLE_SHEETS_ID;
  const accessToken = await getGoogleAccessToken();
  if (!spreadsheetId || !accessToken) {
    throw new Error(`No hay credenciales privadas para preparar ${sheetName}.`);
  }

  async function writeHeader() {
    const lastColumn = columnName(headers.length - 1);
    const encodedRange = encodeURIComponent(`${sheetName}!A1:${lastColumn}1`);
    return fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ values: [headers] })
      }
    );
  }

  let response = await writeHeader();
  if (response.ok) return;

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: sheetName } } }]
    })
  });

  response = await writeHeader();
  if (!response.ok) {
    throw new Error(`No se pudo preparar ${sheetName}.`);
  }
}

export async function appendProductRow(product: Record<string, unknown>): Promise<void> {
  await appendSheetRow(
    process.env.GOOGLE_SHEETS_PRODUCTOS_NAME || "PRODUCTOS",
    PRODUCT_COLUMNS.map((column) => product[column] ?? ""),
    process.env.GOOGLE_SHEETS_PRODUCTOS_ID || DEFAULT_PRODUCTS_SPREADSHEET_ID
  );
}

export async function updateSheetRow(
  sheetName: string,
  rowNumber: number,
  values: unknown[],
  spreadsheetIdOverride?: string
): Promise<void> {
  const spreadsheetId = spreadsheetIdOverride || process.env.GOOGLE_SHEETS_ID;
  const accessToken = await getGoogleAccessToken();
  if (!spreadsheetId || !accessToken) {
    throw new Error(`No hay credenciales privadas para actualizar ${sheetName}.`);
  }

  const lastColumn = columnName(values.length - 1);
  const encodedRange = encodeURIComponent(`${sheetName}!A${rowNumber}:${lastColumn}${rowNumber}`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values: [values] })
    }
  );

  if (!response.ok) {
    throw new Error(`No se pudo actualizar ${sheetName}.`);
  }
}

export async function clearSheetRow(sheetName: string, rowNumber: number): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const accessToken = await getGoogleAccessToken();
  if (!spreadsheetId || !accessToken) {
    throw new Error(`No hay credenciales privadas para borrar ${sheetName}.`);
  }

  const encodedRange = encodeURIComponent(`${sheetName}!A${rowNumber}:ZZ${rowNumber}`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:clear`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    }
  );

  if (!response.ok) {
    throw new Error(`No se pudo borrar la fila ${rowNumber} en ${sheetName}.`);
  }
}

async function fetchPrivateSheetRows(
  sheetNameEnv: string,
  fallbackName: string,
  spreadsheetIdOverride?: string
): Promise<SheetRow[] | null> {
  const spreadsheetId = spreadsheetIdOverride || process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) return null;

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return null;

  const sheetName = process.env[sheetNameEnv] || fallbackName;
  const encodedRange = encodeURIComponent(`${sheetName}!A:ZZ`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
    {
      next: { revalidate: toNumber(process.env.GOOGLE_SHEETS_REVALIDATE_SECONDS, 60) },
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!response.ok) {
    throw new Error(`No se pudo leer ${fallbackName} desde Google Sheets privado.`);
  }

  const payload = (await response.json()) as { values?: unknown[][] };
  return rowsFromValues(payload.values ?? []);
}

async function fetchPrivateSheetCell(
  sheetNameEnv: string,
  fallbackName: string,
  cell: string,
  spreadsheetIdOverride?: string
): Promise<string | null> {
  const spreadsheetId = spreadsheetIdOverride || process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) return null;

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return null;

  const sheetName = process.env[sheetNameEnv] || fallbackName;
  const encodedRange = encodeURIComponent(`${sheetName}!${cell}`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
    {
      next: { revalidate: toNumber(process.env.GOOGLE_SHEETS_REVALIDATE_SECONDS, 60) },
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!response.ok) return null;

  const payload = (await response.json()) as { values?: unknown[][] };
  return clean(payload.values?.[0]?.[0]);
}

async function readUsdRateFromMenu(): Promise<number> {
  const value =
    (await fetchPrivateSheetCell(
      "GOOGLE_SHEETS_MENU_CATEGORIAS_NAME",
      DEFAULT_MENU_SHEET_NAME,
      "L2",
      process.env.GOOGLE_SHEETS_PRODUCTOS_ID || DEFAULT_PRODUCTS_SPREADSHEET_ID
    ).catch(() => null)) ||
    (await fetchPrivateSheetCell(
    "GOOGLE_SHEETS_MENU_CATEGORIAS_NAME",
    DEFAULT_MENU_SHEET_NAME,
    "G1",
    process.env.GOOGLE_SHEETS_PRODUCTOS_ID || DEFAULT_PRODUCTS_SPREADSHEET_ID
    ).catch(() => null));

  return toNumber(value, toNumber(process.env.CATALOG_USD_RATE, 1470));
}

async function readBrandLogoMapFromMenu(): Promise<Map<string, string>> {
  const rows = await fetchPrivateSheetRows(
    "GOOGLE_SHEETS_MENU_CATEGORIAS_NAME",
    DEFAULT_MENU_SHEET_NAME,
    process.env.GOOGLE_SHEETS_PRODUCTOS_ID || DEFAULT_PRODUCTS_SPREADSHEET_ID
  ).catch(() => null);

  const map = new Map<string, string>();
  for (const row of rows || []) {
    const brand = clean(row.marca || row.marca_canonica).toUpperCase();
    const logo = clean(row.logo_url);
    if (brand && logo) map.set(brand, logo);
  }
  return map;
}

function sheetUrl(sheetNameEnv: string, urlEnv: string, fallbackName: string): string | null {
  const directUrl = process.env[urlEnv];
  if (directUrl) return directUrl;

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) return null;

  const sheetName = process.env[sheetNameEnv] || fallbackName;
  const encodedName = encodeURIComponent(sheetName);
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodedName}`;
}

async function fetchSheetRows(
  sheetNameEnv: string,
  urlEnv: string,
  fallbackName: string
): Promise<SheetRow[] | null> {
  const privateRows = await fetchPrivateSheetRows(sheetNameEnv, fallbackName);
  if (privateRows) return privateRows;

  const url = sheetUrl(sheetNameEnv, urlEnv, fallbackName);
  if (!url) return null;

  const revalidate = toNumber(process.env.GOOGLE_SHEETS_REVALIDATE_SECONDS, 60);
  const response = await fetch(url, {
    next: { revalidate },
    headers: { "User-Agent": "CometaG-Ecommerce/1.0" }
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer ${fallbackName} desde Google Sheets.`);
  }

  return parseCsv(await response.text());
}

export async function readLayoutFromGoogleSheets(): Promise<LayoutSection[] | null> {
  const simpleRows = await fetchSheetRows("GOOGLE_SHEETS_LAYOUT_NAME", "GOOGLE_SHEETS_LAYOUT_URL", "LAYOUT").catch(
    () => null
  );
  if (simpleRows?.length) {
    return simpleRows
      .map((row) => {
        const text = clean(row.items) || clean(row.texto) || clean(row.text);
        return {
          section_id: clean(row.id) || clean(row.section_id),
          area: normalizeLayoutArea(clean(row.zona) || clean(row.area)),
          section_type: normalizeSectionType(clean(row.tipo) || clean(row.section_type)),
          title: clean(row.titulo) || clean(row.title),
          subtitle: clean(row.subtitulo) || clean(row.subtitle),
          text,
          image_url: clean(row.imagen) || clean(row.image_url),
          link_url: clean(row.enlace) || clean(row.link_url),
          button_text: clean(row.boton) || clean(row.button_text),
          order: toNumber(row.orden || row.order, 0),
          visible: toBool(row.visible, true),
          background_color: clean(row.fondo) || clean(row.background_color),
          text_color: clean(row.color_texto) || clean(row.text_color),
          accent_color: clean(row.acento) || clean(row.accent_color),
          layout_variant: clean(row.variante) || clean(row.layout_variant),
          desktop_columns: toNumber(row.columnas_desktop || row.desktop_columns, 4),
          mobile_columns: toNumber(row.columnas_mobile || row.mobile_columns, 2),
          carousel_enabled: toBool(row.carousel),
          autoplay: toBool(row.autoplay),
          taxonomies_filter: clean(row.filtro) || clean(row.taxonomies_filter),
          category_filter: clean(row.categoria) || clean(row.category_filter),
          brand_filter: clean(row.marca) || clean(row.brand_filter),
          font_size: clean(row.font_size),
          font_weight: clean(row.font_weight),
          align: clean(row.align),
          justify: clean(row.justify),
          padding: clean(row.padding),
          border: clean(row.border)
        };
      })
      .filter((section) => section.section_id && section.section_type)
      .sort((a, b) => a.order - b.order);
  }

  const rows = await fetchSheetRows(
    "GOOGLE_SHEETS_LAYOUT_NAME",
    "GOOGLE_SHEETS_LAYOUT_URL",
    "LAYOUT"
  );

  if (!rows) return null;

  return rows
    .map((row) => ({
      section_id: clean(row.section_id),
      area: (clean(row.area).toLowerCase() || "body") as LayoutSection["area"],
      section_type: clean(row.section_type).toLowerCase() as LayoutSection["section_type"],
      title: clean(row.title),
      subtitle: clean(row.subtitle),
      text: clean(row.text),
      image_url: clean(row.image_url),
      link_url: clean(row.link_url),
      button_text: clean(row.button_text),
      order: toNumber(row.order, 0),
      visible: toBool(row.visible, true),
      background_color: clean(row.background_color),
      text_color: clean(row.text_color),
      accent_color: clean(row.accent_color),
      layout_variant: clean(row.layout_variant),
      desktop_columns: toNumber(row.desktop_columns, 4),
      mobile_columns: toNumber(row.mobile_columns, 2),
      carousel_enabled: toBool(row.carousel_enabled),
      autoplay: toBool(row.autoplay),
      taxonomies_filter: clean(row.taxonomies_filter),
      category_filter: clean(row.category_filter),
      brand_filter: clean(row.brand_filter),
      font_size: clean(row.font_size),
      font_weight: clean(row.font_weight),
      align: clean(row.align),
      justify: clean(row.justify),
      padding: clean(row.padding),
      border: clean(row.border)
    }))
    .filter((section) => section.section_id && section.section_type)
    .sort((a, b) => a.order - b.order);
}

function normalizeLayoutArea(value: string): LayoutSection["area"] {
  const raw = value.toLowerCase();
  if (raw === "header" || raw === "encabezado") return "header";
  if (raw === "footer" || raw === "pie") return "footer";
  return "body";
}

function normalizeSectionType(value: string): LayoutSection["section_type"] {
  const raw = value.toLowerCase();
  const aliases: Record<string, LayoutSection["section_type"]> = {
    nav: "navbar",
    menu: "category_nav",
    categorias_header: "category_nav",
    banner: "main_banner",
    hero: "main_banner",
    promociones: "promo_tile_grid",
    tarjetas_promo: "promo_tile_grid",
    beneficios: "service_strip",
    servicios: "service_strip",
    tabs_productos: "product_tabs",
    productos_tabs: "product_tabs",
    grilla_productos: "product_grid",
    categorias: "category_grid",
    texto: "text_block",
    links_footer: "footer_links",
    contacto_footer: "footer_contact"
  };

  return aliases[raw] || (raw as LayoutSection["section_type"]);
}

export async function readProductsFromGoogleSheets(): Promise<Product[] | null> {
  const rows =
    (await fetchPrivateSheetRows(
      "GOOGLE_SHEETS_PRODUCTOS_NAME",
      "PRODUCTOS",
      process.env.GOOGLE_SHEETS_PRODUCTOS_ID || DEFAULT_PRODUCTS_SPREADSHEET_ID
    ).catch(() => null)) ||
    (await fetchSheetRows(
      "GOOGLE_SHEETS_PRODUCTOS_NAME",
      "GOOGLE_SHEETS_PRODUCTOS_URL",
      "PRODUCTOS"
    ));

  if (!rows) return null;
  const [usdRate, brandLogoMap] = await Promise.all([readUsdRateFromMenu(), readBrandLogoMapFromMenu()]);

  return rows
    .map((row) => {
      const preventa = toBool(row.preventa);
      const explicitStatus = clean(row.stock_status).toLowerCase() as StockStatus;
      const stock = toNumber(row.stock, 0);
      const precioUsd = toNumber(row.precio_usd, 0);
      const precioOfertaUsd = toNumber(row.precio_oferta_usd, 0);
      const precio = precioUsd > 0 ? Math.round(precioUsd * usdRate) : toNumber(row.precio, 0);
      const precioOferta = precioOfertaUsd > 0
        ? Math.round(precioOfertaUsd * usdRate)
        : toNumber(row.precio_oferta);
      const stockStatus: StockStatus =
        preventa ? "preventa" : explicitStatus || (stock > 0 ? "disponible" : "sin_stock");

      return {
        id: clean(row.id) || clean(row.sku) || clean(row.slug),
        sku: clean(row.sku),
        nombre: clean(row.nombre),
        slug: clean(row.slug),
        descripcion_corta: clean(row.descripcion_corta),
        descripcion_larga: clean(row.descripcion_larga),
        precio_usd: precioUsd || undefined,
        precio,
        precio_oferta_usd: precioOfertaUsd || undefined,
        precio_oferta: precioOferta > 0 ? precioOferta : undefined,
        stock,
        stock_status: stockStatus,
        categoria: clean(row.categoria),
        subcategoria: clean(row.subcategoria),
        marca: clean(row.marca),
        marca_logo_url: brandLogoMap.get(clean(row.marca).toUpperCase()),
        tags: toList(row.tags),
        imagen_principal: clean(row.imagen_principal),
        imagenes_extra: toList(row.imagenes_extra),
        atributos: parseKeyValue(row.atributos),
        variables: parseVariables(row.variables),
        color: clean(row.color),
        garantia: clean(row.garantia),
        destacado: toBool(row.destacado),
        nuevo: toBool(row.nuevo),
        oferta: toBool(row.oferta) || toNumber(row.precio_oferta) > 0 || precioOfertaUsd > 0,
        preventa,
        fecha_lanzamiento: clean(row.fecha_lanzamiento),
        visible: toBool(row.visible, true),
        orden: toNumber(row.orden, 0)
      };
    })
    .filter((product) => product.id && product.nombre && product.slug)
    .sort((a, b) => a.orden - b.orden);
}

export async function readCategoryMenuFromGoogleSheets(): Promise<CategoryMenuItem[] | null> {
  const rows = await fetchPrivateSheetRows(
    "GOOGLE_SHEETS_MENU_CATEGORIAS_NAME",
    DEFAULT_MENU_SHEET_NAME,
    process.env.GOOGLE_SHEETS_PRODUCTOS_ID || DEFAULT_PRODUCTS_SPREADSHEET_ID
  ).catch(() => null);

  if (!rows) return null;

  return rows
    .map((row) => ({
      categoria: clean(row.categoria),
      subcategoria: clean(row.subcategoria),
      cantidad_productos: toNumber(row.cantidad_productos, 0),
      link: clean(row.link),
      orden: toNumber(row.orden, 999),
      visible: toBool(row.visible, true),
      tipo: clean(row.tipo) === "marca" ? ("marca" as const) : ("categoria" as const)
    }))
    .filter((item) => item.visible && item.categoria)
    .sort((a, b) => a.orden - b.orden || a.categoria.localeCompare(b.categoria) || a.subcategoria.localeCompare(b.subcategoria));
}
