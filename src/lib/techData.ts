import { readFile } from "fs/promises";
import path from "path";
import { getProductBySlug, getProducts } from "@/lib/data";
import { Product, ProductTechSpecs, ScrapedProductTechData } from "@/lib/types";

const APPROVED_PATH = path.join(process.cwd(), "data", "versus", "versus-approved.json");

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function firstMatchNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = Number(match[1].replace(",", "."));
      if (Number.isFinite(value)) return value;
    }
  }
  return undefined;
}

function firstMatchText(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].toUpperCase().replace(/\s+/g, " ").trim();
  }
  return undefined;
}

function normalizeFormFactor(value?: string): ProductTechSpecs["motherboardFormFactor"] {
  const text = cleanText(value).toUpperCase();
  if (/MINI[-\s]?ITX/.test(text)) return "Mini ITX";
  if (/MICRO[-\s]?ATX|M[-\s]?ATX/.test(text)) return "Micro ATX";
  if (/\bATX\b/.test(text)) return "ATX";
  return undefined;
}

function inferSupportedFormats(text: string): string[] | undefined {
  const formats = new Set<string>();
  if (/\bATX\b/i.test(text)) formats.add("ATX");
  if (/MICRO[-\s]?ATX|M[-\s]?ATX/i.test(text)) formats.add("Micro ATX");
  if (/MINI[-\s]?ITX/i.test(text)) formats.add("Mini ITX");
  return formats.size ? Array.from(formats) : undefined;
}

export function inferTechSpecs(product: Product): ProductTechSpecs {
  const attrs = Object.entries(product.atributos || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ");
  const text = `${product.nombre} | ${product.descripcion_corta || ""} | ${product.descripcion_larga || ""} | ${attrs}`.toUpperCase();
  const specs: ProductTechSpecs = {};

  const socket = firstMatchText(text, [/\b(AM4|AM5|LGA\s?1200|LGA\s?1700|LGA\s?1851)\b/i]);
  if (socket) specs.socket = socket.replace(/\s+/g, "");

  const ramType = firstMatchText(text, [/\b(DDR3|DDR4|DDR5)\b/i]) as ProductTechSpecs["ramType"];
  if (ramType) specs.ramType = ramType;

  const gpuMemoryGb = firstMatchNumber(text, [/\b(\d{1,2})\s?GB\s?(?:GDDR|VRAM)/i, /\bRTX\s?\d{4}\D+(\d{1,2})\s?GB/i]);
  if (gpuMemoryGb) specs.gpuMemoryGb = gpuMemoryGb;

  const recommendedPsuWattage = firstMatchNumber(text, [/FUENTE RECOMENDADA\D+(\d{3,4})\s?W/i, /PSU RECOMENDADA\D+(\d{3,4})\s?W/i]);
  if (recommendedPsuWattage) specs.recommendedPsuWattage = recommendedPsuWattage;

  const wattage = firstMatchNumber(text, [/\b(\d{3,4})\s?W\b/i]);
  if (wattage && /FUENTE|POWER SUPPLY|PSU/.test(text)) specs.wattage = wattage;

  const capacityGb = firstMatchNumber(text, [/\b(\d{3,5})\s?GB\b/i, /\b(\d{1,2})\s?TB\b/i]);
  if (capacityGb) specs.capacityGb = /\b\d{1,2}\s?TB\b/i.test(text) ? capacityGb * 1024 : capacityGb;

  if (/\bNVME\b|M\.2/i.test(text)) specs.storageType = "NVMe";
  else if (/\bSSD\b/i.test(text)) specs.storageType = "SSD";
  else if (/\bHDD\b|DISCO RIGIDO/i.test(text)) specs.storageType = "HDD";

  const formFactor = normalizeFormFactor(text);
  if (formFactor && /MOTHER|MOTHERBOARD|MAINBOARD|PLACA MADRE/.test(text)) specs.motherboardFormFactor = formFactor;

  const supportedMotherboardFormats = inferSupportedFormats(text);
  if (supportedMotherboardFormats && /GABINETE|CASE|CHASIS/.test(text)) specs.supportedMotherboardFormats = supportedMotherboardFormats;

  return specs;
}

async function readApprovedTechData(): Promise<ScrapedProductTechData[]> {
  try {
    const raw = await readFile(APPROVED_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeSpecs(base?: ProductTechSpecs, inferred?: ProductTechSpecs, scraped?: ProductTechSpecs): ProductTechSpecs | undefined {
  const merged = { ...(inferred || {}), ...(base || {}), ...(scraped || {}) };
  return Object.keys(merged).length ? merged : undefined;
}

export async function enrichProductsWithTechData(products: Product[]): Promise<Product[]> {
  const approved = await readApprovedTechData();
  const byProductId = new Map(approved.map((item) => [item.localProductId, item]));

  return products.map((product) => {
    const scraped = byProductId.get(product.id);
    const techSpecs = mergeSpecs(product.techSpecs, inferTechSpecs(product), scraped?.specs);
    return {
      ...product,
      techSpecs,
      externalRefs: scraped
        ? {
            ...product.externalRefs,
            versusUrl: scraped.sourceUrl,
            versusMatchedName: scraped.sourceProductName,
            confidence: scraped.matchConfidence,
            lastScrapedAt: scraped.scrapedAt
          }
        : product.externalRefs
    };
  });
}

export async function getProductsWithTechData(): Promise<Product[]> {
  return enrichProductsWithTechData(await getProducts());
}

export async function getProductBySlugWithTechData(slug: string): Promise<Product | undefined> {
  const product = await getProductBySlug(slug);
  if (!product) return undefined;
  return (await enrichProductsWithTechData([product]))[0];
}
