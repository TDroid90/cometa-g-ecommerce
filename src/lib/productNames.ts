import { Product } from "@/lib/types";

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalized(value?: string) {
  return clean(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-AR");
}

function withPrefix(name: string, prefix: string, patterns: RegExp[]) {
  let remainder = clean(name);
  for (const pattern of patterns) remainder = remainder.replace(pattern, "").trim();
  return clean(`${prefix} ${remainder}`);
}

/** Normaliza solamente el nombre visible. IDs, slugs y datos del proveedor no cambian. */
export function displayProductName(product: Product) {
  const name = clean(product.nombre || "Producto");
  const taxonomy = normalized(`${product.categoria} ${product.subcategoria}`);
  const brand = clean(product.marca || "");

  if (taxonomy.includes("monitor") || normalized(name).startsWith("monitor ")) {
    return withPrefix(name, "Monitor", [/^monitores?\s+/i, /^pantalla\s+/i]);
  }
  if (taxonomy.includes("placas de video") || /^(placa(?:s)? de video|vga)\b/i.test(name)) {
    return withPrefix(name, "Placa de Video", [/^placa(?:s)? de video\s+/i, /^vga\s+/i]);
  }
  if (taxonomy.includes("discos internos ssd") || /^(disco interno ssd|disco ssd|ssd)\b/i.test(name)) {
    return withPrefix(name, "Disco Interno SSD", [/^disco interno ssd\s+/i, /^disco ssd\s+/i, /^ssd\s+/i]);
  }
  if ((taxonomy.includes("discos internos") && !taxonomy.includes("ssd")) || /^(disco duro int|disco interno hdd|disco hdd)\b/i.test(name)) {
    return withPrefix(name, "Disco Interno HDD", [/^disco duro interno?\s*/i, /^disco interno hdd\s+/i, /^disco hdd\s+/i, /^disco interno\s+/i]);
  }
  if (taxonomy.includes("fuente") || /^(fuente|psu)\b/i.test(name)) {
    return withPrefix(name, "Fuente", [/^fuentes?\s+/i, /^psu\s+/i]);
  }
  if (taxonomy.includes("motherboard") || /^(motherboard|mother|placa madre)\b/i.test(name)) {
    return withPrefix(name, "Mother", [/^motherboards?\s+/i, /^mother\s+/i, /^placa madre\s+/i]);
  }
  if (taxonomy.includes("gabinete") || /^gabinete\b/i.test(name)) {
    return withPrefix(name, "Gabinete", [/^gabinetes?\s+/i]);
  }
  if (taxonomy.includes("procesador") || /^procesador\b/i.test(name)) {
    return withPrefix(name, "Procesador", [/^procesadores?\s+/i]);
  }
  if (taxonomy.includes("cooler")) {
    const withoutGenericPrefix = name.replace(/^(water cooler|air cooler|cooler cpu|cpu cooler)\s+/i, "").trim();
    if (brand && !normalized(withoutGenericPrefix).startsWith(normalized(brand))) return clean(`${brand} ${withoutGenericPrefix}`);
    return withoutGenericPrefix;
  }

  return name;
}
