import { put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const envPath = path.join(repoRoot, ".env.local");
const manifestPath = path.resolve(process.argv[2] || "data/brand-logos/brand_logos_manifest.csv");
const outPath = path.resolve(process.argv[3] || "data/brand-logos/brand_logos_blob_manifest.csv");

async function loadLocalEnv() {
  try {
    const raw = await fs.readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.trim().replace(/^"(.*)"$/, "$1");
    }
  } catch {
    // Environment can also be provided by Vercel/CI.
  }
}

function csvParseLine(line) {
  const out = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current);
  return out;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function readCsv(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.trim().split(/\r?\n/);
  const headers = csvParseLine(lines.shift());
  return lines.map((line) => {
    const values = csvParseLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

async function writeCsv(filePath, rows) {
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  const body = [headers.join(",")].concat(rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")));
  await fs.writeFile(filePath, `${body.join("\n")}\n`, "utf8");
}

function safePart(value) {
  return String(value || "marca")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

await loadLocalEnv();

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("Falta BLOB_READ_WRITE_TOKEN en .env.local o entorno.");
}

const rows = await readCsv(manifestPath);
const uploaded = [];

for (const row of rows) {
  const filePath = path.resolve(row.local_file);
  const data = await fs.readFile(filePath);
  const pathname = `brand-logos/${safePart(row.brand)}.png`;
  const blob = await put(pathname, data, {
    access: process.env.BLOB_ACCESS || "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  uploaded.push({ ...row, blob_path: pathname, blob_url: blob.url });
  console.log(`OK ${row.brand}`);
}

await writeCsv(outPath, uploaded);
console.log(`UPLOADED ${uploaded.length}`);
console.log(outPath);
