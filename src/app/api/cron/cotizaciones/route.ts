import { NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/googleSheets";

const DEFAULT_PRODUCTS_SPREADSHEET_ID = "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY";
const NB_API_BASE_URL = "https://api.nb.com.ar/v1";

function clean(value: unknown): string {
  return String(value ?? "").trim();
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

function splitCsvLine(line: string, delimiter = ";"): string[] {
  const cells: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(field);
      field = "";
    } else {
      field += char;
    }
  }

  cells.push(field);
  return cells.map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

function median(values: number[]): number {
  const cleaned = values.filter((value) => value > 0).sort((a, b) => a - b);
  if (!cleaned.length) return 0;
  const middle = Math.floor(cleaned.length / 2);
  return cleaned.length % 2 ? cleaned[middle] : (cleaned[middle - 1] + cleaned[middle]) / 2;
}

async function fetchNbRate(): Promise<number> {
  const url = await getNbCsvUrl();
  if (!url) return 0;

  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "CometaG-Cron/1.0" }
  });
  if (!response.ok) return 0;

  const text = await response.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return 0;

  const headers = splitCsvLine(lines[0]).map((header) => header.toUpperCase());
  const rateIndex = headers.findIndex((header) => header.includes("COTIZACION") && header.includes("DOLAR"));
  if (rateIndex < 0) return 0;

  const rates = lines.slice(1, 500).map((line) => toNumber(splitCsvLine(line)[rateIndex], 0));
  return median(rates);
}

async function getNbCsvUrl(): Promise<string> {
  const username = clean(process.env.NB_USERNAME);
  const password = clean(process.env.NB_PASSWORD);
  if (username && password) {
    try {
      const login = await fetch(`${NB_API_BASE_URL}/auth/login`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "CometaG-Cron/1.0"
        },
        body: JSON.stringify({ user: username, password, mode: "web" })
      });
      if (login.ok) {
        const loginPayload = (await login.json()) as { token?: string };
        if (loginPayload.token) {
          const list = await fetch(`${NB_API_BASE_URL}/priceListCsv`, {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${loginPayload.token}`,
              "User-Agent": "CometaG-Cron/1.0"
            }
          });
          if (list.ok) {
            const listPayload = (await list.json()) as { pathExcel?: string };
            if (listPayload.pathExcel) return listPayload.pathExcel;
          }
        }
      }
    } catch {
      // If NB changes auth temporarily, keep the rest of the cron alive.
    }
  }

  return clean(process.env.NB_PRICE_LIST_CSV_URL);
}

async function scrapeRate(url: string): Promise<number> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 CometaG-Cron/1.0" }
    });
    if (!response.ok) return 0;
    const text = (await response.text()).slice(0, 250000).replace(/\s+/g, " ");
    const patterns = [
      /(?:USD|U\$S|DOLAR|DÓLAR|COTIZACION|COTIZACIÓN)[^0-9]{0,30}([0-9]+(?:[\.,][0-9]+)?)/i,
      /([0-9]+(?:[\.,][0-9]+)?)[^0-9]{0,20}(?:ARS|PESOS)/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      const value = toNumber(match?.[1], 0);
      if (value >= 500 && value <= 5000) return value;
    }
  } catch {
    return 0;
  }
  return 0;
}

async function readExistingRates(accessToken: string, spreadsheetId: string, sheetName: string) {
  const range = encodeURIComponent(`${sheetName}!E2:E4`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) return { ELIT: 0, NB: 0, INVID: 0 };
  const payload = (await response.json()) as { values?: unknown[][] };
  return {
    ELIT: toNumber(payload.values?.[0]?.[0], 0),
    NB: toNumber(payload.values?.[1]?.[0], 0),
    INVID: toNumber(payload.values?.[2]?.[0], 0)
  };
}

async function updateRatesInSheet(rates: Record<string, number>) {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) throw new Error("No esta configurada la service account de Google.");

  const spreadsheetId = process.env.GOOGLE_SHEETS_PRODUCTOS_ID || DEFAULT_PRODUCTS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_CATALOGO_LOG_NAME || "CATALOGO_LOG";
  const range = encodeURIComponent(`${sheetName}!E1:E4`);
  const values = [
    ["cotizacion_usd"],
    [String(rates.ELIT)],
    [String(rates.NB)],
    [String(rates.INVID)]
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values })
    }
  );

  if (!response.ok) {
    throw new Error(`No se pudo actualizar CATALOGO_LOG: ${await response.text()}`);
  }
}

export async function GET(request: Request) {
  const configuredSecret = clean(process.env.CRON_SECRET);
  const authorization = request.headers.get("authorization") || "";
  if (configuredSecret && authorization !== `Bearer ${configuredSecret}`) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const defaultRate = toNumber(process.env.CATALOG_USD_RATE, 1470);
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) throw new Error("No esta configurada la service account de Google.");
  const spreadsheetId = process.env.GOOGLE_SHEETS_PRODUCTOS_ID || DEFAULT_PRODUCTS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_CATALOGO_LOG_NAME || "CATALOGO_LOG";
  const existingRates = await readExistingRates(accessToken, spreadsheetId, sheetName);
  const nbRate = await fetchNbRate();
  const elitRate =
    toNumber(process.env.ELIT_USD_RATE, 0) ||
    (process.env.SCRAPE_PROVIDER_RATES === "TRUE" ? await scrapeRate("https://www.elit.com.ar") : 0);
  const invidRate =
    toNumber(process.env.INVID_USD_RATE, 0) ||
    (process.env.SCRAPE_PROVIDER_RATES === "TRUE" ? await scrapeRate("https://www.invidcomputers.com") : 0);

  const rates = {
    ELIT: elitRate || nbRate || existingRates.ELIT || defaultRate,
    NB: nbRate || existingRates.NB || defaultRate,
    INVID: invidRate || nbRate || existingRates.INVID || defaultRate
  };

  await updateRatesInSheet(rates);
  return NextResponse.json({ ok: true, rates, updated_at: new Date().toISOString() });
}
