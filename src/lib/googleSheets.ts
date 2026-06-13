import { LayoutSection, Product, StockStatus } from "@/lib/types";

type SheetRow = Record<string, string>;

const TRUE_VALUES = new Set(["true", "1", "si", "sí", "yes", "y"]);

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function toBool(value: unknown, fallback = false): boolean {
  const raw = clean(value).toLowerCase();
  if (!raw) return fallback;
  return TRUE_VALUES.has(raw);
}

function toNumber(value: unknown, fallback = 0): number {
  const raw = clean(value).replace(/\./g, "").replace(",", ".");
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

  const entries = raw
    .split("|")
    .map((pair) => pair.split(":").map((part) => part.trim()))
    .filter(([key, val]) => key && val);

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

  const headers = (rows.shift() ?? []).map((header) => clean(header));
  return rows
    .filter((cells) => cells.some((cell) => clean(cell)))
    .map((cells) =>
      Object.fromEntries(headers.map((header, index) => [header, clean(cells[index])]))
    );
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
      brand_filter: clean(row.brand_filter)
    }))
    .filter((section) => section.section_id && section.section_type)
    .sort((a, b) => a.order - b.order);
}

export async function readProductsFromGoogleSheets(): Promise<Product[] | null> {
  const rows = await fetchSheetRows(
    "GOOGLE_SHEETS_PRODUCTOS_NAME",
    "GOOGLE_SHEETS_PRODUCTOS_URL",
    "PRODUCTOS"
  );

  if (!rows) return null;

  return rows
    .map((row) => {
      const preventa = toBool(row.preventa);
      const explicitStatus = clean(row.stock_status).toLowerCase() as StockStatus;
      const stock = toNumber(row.stock, 0);
      const stockStatus: StockStatus =
        preventa ? "preventa" : explicitStatus || (stock > 0 ? "disponible" : "sin_stock");

      return {
        id: clean(row.id) || clean(row.sku) || clean(row.slug),
        sku: clean(row.sku),
        nombre: clean(row.nombre),
        slug: clean(row.slug),
        descripcion_corta: clean(row.descripcion_corta),
        descripcion_larga: clean(row.descripcion_larga),
        precio: toNumber(row.precio, 0),
        precio_oferta: row.precio_oferta ? toNumber(row.precio_oferta) : undefined,
        stock,
        stock_status: stockStatus,
        categoria: clean(row.categoria),
        subcategoria: clean(row.subcategoria),
        marca: clean(row.marca),
        tags: toList(row.tags),
        imagen_principal: clean(row.imagen_principal),
        imagenes_extra: toList(row.imagenes_extra),
        atributos: parseKeyValue(row.atributos),
        variables: parseVariables(row.variables),
        color: clean(row.color),
        garantia: clean(row.garantia),
        destacado: toBool(row.destacado),
        preventa,
        fecha_lanzamiento: clean(row.fecha_lanzamiento),
        visible: toBool(row.visible, true),
        orden: toNumber(row.orden, 0)
      };
    })
    .filter((product) => product.id && product.nombre && product.slug)
    .sort((a, b) => a.orden - b.orden);
}
