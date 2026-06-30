import { NextResponse } from "next/server";
import { appendSheetRow, readSheetValues, updateSheetRow } from "@/lib/googleSheets";
import { verifyAdminSecret } from "@/lib/adminAuth";

const PRODUCTS_SHEET = process.env.GOOGLE_SHEETS_PRODUCTOS_NAME || "PRODUCTOS";
const PRODUCTS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_PRODUCTOS_ID;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function slugify(value: string) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function rowToObject(headers: string[], row: string[]) {
  return Object.fromEntries(headers.map((header, index) => [header, clean(row[index])]));
}

async function readProductsSheet() {
  const values = await readSheetValues(PRODUCTS_SHEET, PRODUCTS_SPREADSHEET_ID);
  const headers = (values[0] || []).map(clean);
  const rows = values.slice(1);
  return { headers, rows };
}

function findProduct(headers: string[], rows: string[][], lookup: string) {
  const normalized = clean(lookup).toLowerCase();
  const idIndex = headers.indexOf("id");
  const skuIndex = headers.indexOf("sku");
  const slugIndex = headers.indexOf("slug");
  const nameIndex = headers.indexOf("nombre");

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const candidates = [idIndex, skuIndex, slugIndex, nameIndex]
      .filter((column) => column >= 0)
      .map((column) => clean(row[column]).toLowerCase());
    if (candidates.some((candidate) => candidate === normalized || candidate.includes(normalized))) {
      return { rowNumber: index + 2, product: rowToObject(headers, row) };
    }
  }

  return null;
}

export async function GET(request: Request) {
  try {
    verifyAdminSecret(request);
    const url = new URL(request.url);
    const lookup = clean(url.searchParams.get("lookup"));
    if (!lookup) {
      return NextResponse.json({ error: "Falta ID, SKU, slug o nombre." }, { status: 400 });
    }

    const { headers, rows } = await readProductsSheet();
    const match = findProduct(headers, rows, lookup);
    if (!match) {
      return NextResponse.json({
        found: false,
        headers,
        product: {
          id: lookup,
          sku: lookup,
          nombre: "",
          slug: slugify(lookup),
          visible: "TRUE",
          stock_status: "disponible"
        }
      });
    }

    return NextResponse.json({ found: true, headers, ...match });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo leer el producto." },
      { status: 401 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    verifyAdminSecret(request);
    const body = (await request.json()) as { rowNumber?: number; product?: Record<string, unknown> };
    const rowNumber = Number(body.rowNumber);
    const product = body.product || {};
    if (!rowNumber || rowNumber < 2) {
      return NextResponse.json({ error: "Fila invalida." }, { status: 400 });
    }

    const { headers, rows } = await readProductsSheet();
    const currentRow = rows[rowNumber - 2] || [];
    const nextRow = headers.map((header, index) =>
      Object.prototype.hasOwnProperty.call(product, header) ? clean(product[header]) : clean(currentRow[index])
    );

    await updateSheetRow(PRODUCTS_SHEET, rowNumber, nextRow, PRODUCTS_SPREADSHEET_ID);
    return NextResponse.json({ ok: true, rowNumber, product: rowToObject(headers, nextRow) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar el producto." },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    verifyAdminSecret(request);
    const body = (await request.json()) as { product?: Record<string, unknown> };
    const product = body.product || {};
    const { headers, rows } = await readProductsSheet();
    const id = clean(product.id || product.sku);
    const sku = clean(product.sku || product.id);
    const nombre = clean(product.nombre);
    const slug = clean(product.slug || slugify(nombre || id));
    if (!id || !sku || !nombre || !slug) {
      return NextResponse.json({ error: "Completa id, sku, nombre y slug." }, { status: 400 });
    }

    const duplicate = findProduct(headers, rows, id) || findProduct(headers, rows, sku) || findProduct(headers, rows, slug);
    if (duplicate) {
      return NextResponse.json({ error: "Ya existe un producto con ese ID, SKU o slug." }, { status: 409 });
    }

    const row = headers.map((header) => {
      if (header === "id") return id;
      if (header === "sku") return sku;
      if (header === "slug") return slug;
      if (header === "visible") return clean(product[header] || "TRUE");
      if (header === "stock_status") return clean(product[header] || "disponible");
      return clean(product[header]);
    });

    await appendSheetRow(PRODUCTS_SHEET, row, PRODUCTS_SPREADSHEET_ID);
    return NextResponse.json({ ok: true, rowNumber: rows.length + 2, product: rowToObject(headers, row) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear el producto." },
      { status: 400 }
    );
  }
}
