import { NextRequest, NextResponse } from "next/server";
import { appendSheetRow, clearSheetRow, ensureSheetHeader, readSheetRows, updateSheetRow } from "@/lib/googleSheets";
import {
  headerTemplateRows,
  LAYOUT_SIMPLE_COLUMNS,
  LayoutSimpleColumn,
  normalizeAdminRow,
  rowToValues
} from "@/lib/layoutAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHEET_NAME = process.env.GOOGLE_SHEETS_LAYOUT_NAME || "LAYOUT";

function isAuthorized(request: NextRequest) {
  const expected = process.env.ADMIN_UPLOAD_SECRET;
  const provided = request.headers.get("x-admin-secret");
  return Boolean(expected && provided && expected === provided);
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function templateFor(id: string) {
  return headerTemplateRows.find((row) => row.id === id);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  const rows = await readSheetRows(SHEET_NAME).catch(() => []);
  const normalizedRows = rows.map((row, index) => {
    const fallback = templateFor(row.id);
    return normalizeAdminRow(row, index + 2, fallback);
  });

  const existingIds = new Set(normalizedRows.map((row) => row.id));
  const missingHeaderRows = headerTemplateRows
    .filter((row) => !existingIds.has(row.id))
    .map((row, index) => normalizeAdminRow(row, 0 - index, row));

  return NextResponse.json({
    ok: true,
    columns: LAYOUT_SIMPLE_COLUMNS,
    rows: [...missingHeaderRows, ...normalizedRows].sort(
      (a, b) => Number(a.orden || 0) - Number(b.orden || 0)
    )
  });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  const payload = (await request.json()) as {
    rowNumber?: number;
    row?: Partial<Record<LayoutSimpleColumn, unknown>>;
  };
  const row = payload.row || {};
  const rowNumber = Number(payload.rowNumber);

  if (!row.id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const values = rowToValues(row);

  await ensureSheetHeader(SHEET_NAME, LAYOUT_SIMPLE_COLUMNS);

  if (rowNumber > 1) {
    await updateSheetRow(SHEET_NAME, rowNumber, values);
    return NextResponse.json({ ok: true, mode: "updated" });
  }

  await appendSheetRow(SHEET_NAME, values);
  return NextResponse.json({ ok: true, mode: "created" });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  const payload = (await request.json()) as { rowNumber?: number };
  const rowNumber = Number(payload.rowNumber);

  if (rowNumber <= 1) {
    return NextResponse.json({ ok: false, error: "missing_row" }, { status: 400 });
  }

  await clearSheetRow(SHEET_NAME, rowNumber);
  return NextResponse.json({ ok: true, mode: "deleted" });
}
