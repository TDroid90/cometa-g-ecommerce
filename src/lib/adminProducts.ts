import { readSheetValues } from "@/lib/googleSheets";

export type AdminProductRecord = Record<string, string>;

const PRODUCTS_SHEET = process.env.GOOGLE_SHEETS_PRODUCTOS_NAME || "PRODUCTOS";
const PRODUCTS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_PRODUCTOS_ID;

export function cleanAdminValue(value: unknown) {
  return String(value ?? "").trim();
}

export function adminProductRowToObject(headers: string[], row: string[]): AdminProductRecord {
  return Object.fromEntries(headers.map((header, index) => [header, cleanAdminValue(row[index])]));
}

export async function readAdminProductsSheet() {
  const values = await readSheetValues(PRODUCTS_SHEET, PRODUCTS_SPREADSHEET_ID);
  const headers = (values[0] || []).map(cleanAdminValue);
  const rows = values.slice(1);
  const products = rows.map((row, index) => ({
    rowNumber: index + 2,
    product: adminProductRowToObject(headers, row)
  }));
  return { headers, rows, products, sheetName: PRODUCTS_SHEET, spreadsheetId: PRODUCTS_SPREADSHEET_ID };
}

export function findAdminProduct(
  headers: string[],
  rows: string[][],
  lookup: string
) {
  const normalized = cleanAdminValue(lookup).toLocaleLowerCase("es");
  const indexes = ["id", "sku", "slug", "nombre"].map((field) => headers.indexOf(field)).filter((index) => index >= 0);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const candidates = indexes.map((column) => cleanAdminValue(row[column]).toLocaleLowerCase("es"));
    if (candidates.some((candidate) => candidate === normalized || candidate.includes(normalized))) {
      return { rowNumber: index + 2, product: adminProductRowToObject(headers, row) };
    }
  }
  return null;
}
