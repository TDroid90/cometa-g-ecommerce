import { CreativeType, selectCreativeBackground } from "@/lib/creatives/backgrounds";
import { selectCreativeAttributes } from "@/lib/creatives/attributes";

export type CreativeProductInput = Record<string, string | number | boolean | undefined | null>;

export type CreativeCategoryKind =
  | "cooling"
  | "gpu"
  | "cpu"
  | "motherboard"
  | "gabinete"
  | "periferico"
  | "notebook-monitor"
  | "default";

export type CreativeData = {
  type: CreativeType;
  categoryKind: CreativeCategoryKind;
  dominantLabel?: "PREVENTA" | "OFERTA";
  categoryLabel: string;
  productName: string;
  attributes: string[];
  productImageUrl: string;
  productCutoutUrl: string;
  backgroundUrl: string;
  backgroundLabel: string;
  ctaLabel: "Ver producto";
  brandLabel: "COMETA G.";
  filename: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalize(value: unknown) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function slugify(value: string) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "producto";
}

function field(product: CreativeProductInput, keys: string[]) {
  for (const key of keys) {
    const value = clean(product[key]);
    if (value) return value;
  }
  return "";
}

function taxonomyText(product: CreativeProductInput) {
  return normalize(`${product.categoria || ""} ${product.subcategoria || ""} ${product.nombre || ""}`);
}

export function creativeCategoryKind(product: CreativeProductInput): CreativeCategoryKind {
  const taxonomy = taxonomyText(product);
  if (taxonomy.includes("cooler") || taxonomy.includes("refrigeracion") || taxonomy.includes("water")) return "cooling";
  if (taxonomy.includes("placa de video") || taxonomy.includes("vga") || taxonomy.includes("geforce") || taxonomy.includes("radeon")) return "gpu";
  if (taxonomy.includes("procesador") || taxonomy.includes("microprocesador") || taxonomy.includes("ryzen") || taxonomy.includes("intel core")) return "cpu";
  if (taxonomy.includes("motherboard") || taxonomy.includes("mother ")) return "motherboard";
  if (taxonomy.includes("gabinete")) return "gabinete";
  if (taxonomy.includes("notebook") || taxonomy.includes("monitor")) return "notebook-monitor";
  if (taxonomy.includes("periferico") || taxonomy.includes("accesorio")) return "periferico";
  return "default";
}

export function creativeCategoryLabel(product: CreativeProductInput) {
  const kind = creativeCategoryKind(product);
  const taxonomy = taxonomyText(product);

  if (kind === "cooling") return taxonomy.includes("water") || taxonomy.includes("liquid") ? "WATER COOLER" : "COOLING";
  if (kind === "gpu") return "VGA";
  if (kind === "cpu") return "PROCESADOR";
  if (kind === "motherboard") return "MOTHERBOARD";
  if (kind === "gabinete") return "GABINETE";
  if (kind === "notebook-monitor") return normalize(product.subcategoria).includes("monitor") ? "MONITOR" : "NOTEBOOK";
  if (kind === "periferico") return clean(product.subcategoria || product.categoria || "PERIFERICOS").toUpperCase();

  return clean(product.subcategoria || product.categoria || "PRODUCTO").toUpperCase();
}

function removeWords(value: string, words: string[]) {
  let output = value;
  for (const word of words) {
    output = output.replace(new RegExp(`\\b${word}\\b`, "gi"), " ");
  }
  return output.replace(/\s+/g, " ").trim();
}

function removeBrandPrefix(value: string, brand: string) {
  if (!brand) return value;
  return value.replace(new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"), "").trim();
}

function cleanupCommercialName(value: string) {
  return value
    .replace(/\bARGB\b/gi, " ")
    .replace(/\bRGB\b/gi, " ")
    .replace(/\bGDDR[0-9X]+\b/gi, " ")
    .replace(/\bDDR[0-9]\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function creativeProductName(product: CreativeProductInput) {
  const kind = creativeCategoryKind(product);
  const brand = clean(product.marca);
  let name = clean(product.nombre);

  if (!name) return "";
  name = removeBrandPrefix(name, brand);

  if (kind === "cooling") {
    name = removeWords(name, ["water", "cooler", "refrigeracion", "liquida", "asus", "asrock", "cooler", "master"]);
    name = cleanupCommercialName(name);
    const match = name.match(/\b(ROG\s+RYUO\s+IV\s+360|RYUO\s+IV\s+360|CHALLENGER\s+360|PRIME\s+LC\s+\d{3}|H\d{2,3}|ML\d{2,3}|I?CUE\s+H\d{2,3})\b/i);
    return (match?.[1] || name).toUpperCase().slice(0, 34);
  }

  if (kind === "gpu") {
    name = removeWords(name, ["placa", "placas", "video", "de", "vga", brand]);
    const match = name.match(/\b((GEFORCE|RADEON|RTX|GTX|RX)\s+[A-Z0-9\s-]+)\b/i);
    return cleanupCommercialName(match?.[1] || name).toUpperCase().slice(0, 38);
  }

  if (kind === "cpu") {
    name = removeWords(name, ["procesador", "microprocesador", "processor"]);
    return cleanupCommercialName(name).toUpperCase().slice(0, 34);
  }

  if (kind === "motherboard") {
    name = removeWords(name, ["motherboard", "mother", brand]);
    return cleanupCommercialName(name).toUpperCase().slice(0, 34);
  }

  if (kind === "gabinete") {
    name = removeWords(name, ["gabinete", brand]);
    return cleanupCommercialName(name).toUpperCase().slice(0, 34);
  }

  return cleanupCommercialName(removeBrandPrefix(name, brand)).toUpperCase().slice(0, 36);
}

export function buildCreativeData(input: {
  product: CreativeProductInput;
  creativeType: CreativeType;
  backgroundId?: string;
}) {
  const catalogName = clean(input.product.nombre);
  const productImageUrl = clean(input.product.imagen_principal);
  const productCutoutUrl = field(input.product, ["productCutoutUrl", "product_cutout_url", "recorte_url", "imagen_recortada"]);
  if (!catalogName) throw new Error("Falta nombre del producto.");
  if (!productImageUrl) throw new Error("Falta imagen_principal del producto.");

  const categoria = clean(input.product.categoria);
  const subcategoria = clean(input.product.subcategoria);
  const background = selectCreativeBackground({
    creativeType: input.creativeType,
    categoria,
    subcategoria,
    backgroundId: input.backgroundId
  });

  const dominantLabel =
    input.creativeType === "preventa" ? "PREVENTA" :
      input.creativeType === "oferta" ? "OFERTA" :
        undefined;

  const filenameType = input.creativeType === "nuevo" ? "nuevo-ingreso" : input.creativeType;
  const productName = creativeProductName(input.product) || catalogName;

  return {
    type: input.creativeType,
    categoryKind: creativeCategoryKind(input.product),
    dominantLabel,
    categoryLabel: creativeCategoryLabel(input.product),
    productName,
    attributes: selectCreativeAttributes({
      categoria,
      subcategoria,
      atributos: clean(input.product.atributos)
    }),
    productImageUrl,
    productCutoutUrl,
    backgroundUrl: background.url,
    backgroundLabel: background.label,
    ctaLabel: "Ver producto",
    brandLabel: "COMETA G.",
    filename: `cometag-${filenameType}-${slugify(productName)}-1080x1350.png`
  } satisfies CreativeData;
}
