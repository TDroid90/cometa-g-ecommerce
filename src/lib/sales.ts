import { appendSheetRow, ensureSheetHeader, readSheetRows, updateSheetRow } from "@/lib/googleSheets";

export const SALES_COLUMNS = [
  "fecha_hora",
  "fecha",
  "order_id",
  "estado",
  "payment_id",
  "checkout_url",
  "total_real",
  "total_payway",
  "moneda",
  "sandbox",
  "plan_pago",
  "cuotas",
  "interes",
  "mipyme",
  "productos",
  "cantidades",
  "preventa",
  "cliente_email",
  "cliente_nombre",
  "payway_estado",
  "payway_payload",
  "updated_at"
] as const;

export const SALES_INDEX_COLUMNS = [
  "order_id",
  "fecha",
  "sheet_name",
  "payment_id",
  "checkout_url",
  "estado",
  "total_real",
  "total_payway",
  "created_at",
  "updated_at"
] as const;

type SaleInput = {
  orderId: string;
  paymentId?: string;
  checkoutUrl?: string;
  status: string;
  totalReal: number;
  totalPayway: number;
  currency: string;
  sandbox: boolean;
  paymentPlan?: {
    label: string;
    installments: number;
    interestRate: number;
    planGobierno: boolean;
  };
  products: Array<{
    id: string;
    sku?: string;
    nombre: string;
    precio: number;
    quantity: number;
    preventa?: boolean;
  }>;
  customer?: {
    email?: string;
    name?: string;
  };
  paywayStatus?: string;
  paywayPayload?: unknown;
};

type SaleUpdate = {
  orderId?: string;
  paymentId?: string;
  status: string;
  paywayStatus?: string;
  paywayPayload?: unknown;
};

function salesSpreadsheetId() {
  return process.env.GOOGLE_SHEETS_VENTAS_ID || process.env.GOOGLE_SHEETS_SALES_ID || process.env.GOOGLE_SHEETS_ID;
}

function nowIso() {
  return new Date().toISOString();
}

function dateInBuenosAires() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function salesSheetName(date = dateInBuenosAires()) {
  return `VENTAS_${date}`;
}

export function createOrderId() {
  const date = dateInBuenosAires().replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CG-${date}-${suffix}`;
}

export function extractPaywayPaymentId(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const fromUrl = raw.match(/\/checkout\/([^/?#]+)/i)?.[1];
  if (fromUrl) return fromUrl;

  return raw;
}

function productSummary(products: SaleInput["products"]) {
  return products
    .map((product) => `${product.sku || product.id} - ${product.nombre} x${product.quantity}`)
    .join(" | ");
}

function quantitySummary(products: SaleInput["products"]) {
  return products.map((product) => `${product.id}:${product.quantity}`).join(" | ");
}

function hasPreorder(products: SaleInput["products"]) {
  return products.some((product) => product.preventa);
}

function payloadText(payload: unknown) {
  if (!payload) return "";
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

function saleToValues(sale: SaleInput, sheetDate = dateInBuenosAires()) {
  const timestamp = nowIso();
  return [
    timestamp,
    sheetDate,
    sale.orderId,
    sale.status,
    sale.paymentId || "",
    sale.checkoutUrl || "",
    sale.totalReal,
    sale.totalPayway,
    sale.currency,
    sale.sandbox ? "TRUE" : "FALSE",
    sale.paymentPlan?.label || "",
    sale.paymentPlan?.installments || "",
    sale.paymentPlan?.interestRate ?? "",
    sale.paymentPlan?.planGobierno ? "TRUE" : "FALSE",
    productSummary(sale.products),
    quantitySummary(sale.products),
    hasPreorder(sale.products) ? "TRUE" : "FALSE",
    sale.customer?.email || "",
    sale.customer?.name || "",
    sale.paywayStatus || "",
    payloadText(sale.paywayPayload),
    timestamp
  ];
}

function indexToValues(sale: SaleInput, sheetName: string, sheetDate = dateInBuenosAires()) {
  const timestamp = nowIso();
  return [
    sale.orderId,
    sheetDate,
    sheetName,
    sale.paymentId || "",
    sale.checkoutUrl || "",
    sale.status,
    sale.totalReal,
    sale.totalPayway,
    timestamp,
    timestamp
  ];
}

export async function appendPendingSale(sale: SaleInput) {
  const spreadsheetId = salesSpreadsheetId();
  if (!spreadsheetId) return;

  const sheetDate = dateInBuenosAires();
  const sheetName = salesSheetName(sheetDate);

  await ensureSheetHeader(sheetName, SALES_COLUMNS, spreadsheetId);
  await appendSheetRow(sheetName, saleToValues(sale, sheetDate), spreadsheetId);

  await ensureSheetHeader("VENTAS_INDEX", SALES_INDEX_COLUMNS, spreadsheetId);
  await appendSheetRow("VENTAS_INDEX", indexToValues(sale, sheetName, sheetDate), spreadsheetId);
}

function findRow(rows: Record<string, string>[], predicate: (row: Record<string, string>) => boolean) {
  const index = rows.findIndex(predicate);
  return index >= 0 ? { row: rows[index], rowNumber: index + 2 } : null;
}

export async function updateSaleStatus(update: SaleUpdate) {
  const spreadsheetId = salesSpreadsheetId();
  if (!spreadsheetId) return false;

  await ensureSheetHeader("VENTAS_INDEX", SALES_INDEX_COLUMNS, spreadsheetId);
  const indexRows = await readSheetRows("VENTAS_INDEX", spreadsheetId).catch(() => []);
  const indexMatch = findRow(indexRows, (row) => {
    if (update.orderId && row.order_id === update.orderId) return true;
    if (update.paymentId && row.payment_id === update.paymentId) return true;
    return false;
  });

  if (!indexMatch) return false;

  const updatedAt = nowIso();
  await updateSheetRow(
    "VENTAS_INDEX",
    indexMatch.rowNumber,
    [
      indexMatch.row.order_id,
      indexMatch.row.fecha,
      indexMatch.row.sheet_name,
      indexMatch.row.payment_id,
      indexMatch.row.checkout_url,
      update.status,
      indexMatch.row.total_real,
      indexMatch.row.total_payway,
      indexMatch.row.created_at,
      updatedAt
    ],
    spreadsheetId
  );

  const sheetName = indexMatch.row.sheet_name;
  const saleRows = await readSheetRows(sheetName, spreadsheetId).catch(() => []);
  const saleMatch = findRow(saleRows, (row) => row.order_id === indexMatch.row.order_id);
  if (!saleMatch) return true;

  await updateSheetRow(
    sheetName,
    saleMatch.rowNumber,
    [
      saleMatch.row.fecha_hora,
      saleMatch.row.fecha,
      saleMatch.row.order_id,
      update.status,
      saleMatch.row.payment_id,
      saleMatch.row.checkout_url,
      saleMatch.row.total_real,
      saleMatch.row.total_payway,
      saleMatch.row.moneda,
      saleMatch.row.sandbox,
      saleMatch.row.plan_pago,
      saleMatch.row.cuotas,
      saleMatch.row.interes,
      saleMatch.row.mipyme,
      saleMatch.row.productos,
      saleMatch.row.cantidades,
      saleMatch.row.preventa,
      saleMatch.row.cliente_email,
      saleMatch.row.cliente_nombre,
      update.paywayStatus || saleMatch.row.payway_estado,
      payloadText(update.paywayPayload) || saleMatch.row.payway_payload,
      updatedAt
    ],
    spreadsheetId
  );

  return true;
}
