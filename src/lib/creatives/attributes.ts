export type AttributeEntry = {
  key: string;
  value: string;
};

const FORBIDDEN_KEYS = ["precio", "price", "iva", "moneda", "cuota", "descuento", "oferta"];

const PRIORITIES: Array<{ match: string[]; keys: string[] }> = [
  { match: ["procesador", "microprocesador"], keys: ["socket", "nucleo", "nucleos", "core", "cores", "frecuencia", "ghz"] },
  { match: ["placa de video", "vga", "gpu"], keys: ["vram", "memoria", "chip", "gpu", "interfaz", "interface"] },
  { match: ["motherboard", "mother", "motherboards"], keys: ["socket", "chipset", "formato", "factor de forma", "form factor"] },
  { match: ["notebook", "notebooks"], keys: ["procesador", "cpu", "ram", "memoria ram", "pantalla", "display"] },
  { match: ["cooler", "refrigeracion", "cooling"], keys: ["socket compatible", "socket", "radiador", "tamano de radiador", "ventilador", "ventiladores", "fan", "fans"] },
  { match: ["periferico", "perifericos", "accesorio", "accesorios"], keys: ["conexion", "switch", "tipo", "compatibilidad"] }
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function titleCaseKey(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compactValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function uppercaseClean(value: string) {
  return compactValue(value)
    .replace(/\s+mm$/i, " MM")
    .replace(/\s+gb$/i, " GB")
    .replace(/\s+ghz$/i, " GHz")
    .toUpperCase();
}

function firstSocket(value: string) {
  const match = value.match(/\b(AM\d|LGA\s*\d{3,5}|TR4|STRX4|SWRX8)\b/i);
  return match ? match[1].replace(/\s+/g, " ").toUpperCase() : "";
}

function firstRadiatorSize(value: string) {
  const match = value.match(/\b(120|140|240|280|360|420)\s*mm\b/i) || value.match(/\b(120|140|240|280|360|420)\b/);
  return match ? `${match[1]} MM` : "";
}

function firstFanCount(value: string) {
  const fanCount = value.match(/\b([1-9])\s*(fan|fans|ventilador|ventiladores)\b/i);
  if (fanCount) return `${fanCount[1]} FANS`;

  const radiator = Number(firstRadiatorSize(value).replace(/\D/g, ""));
  if (radiator >= 360) return "3 FANS";
  if (radiator >= 240) return "2 FANS";
  return "";
}

export function parseCreativeAttributes(raw?: string): AttributeEntry[] {
  const value = String(raw || "").trim();
  if (!value) return [];

  const chunks = value
    .replace(/\r?\n/g, "|")
    .split(/[|;]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks
    .map((chunk) => {
      const separatorIndex = chunk.indexOf(":");
      if (separatorIndex < 0) {
        return { key: "", value: compactValue(chunk) };
      }

      return {
        key: titleCaseKey(chunk.slice(0, separatorIndex)),
        value: compactValue(chunk.slice(separatorIndex + 1))
      };
    })
    .filter((entry) => entry.value && !FORBIDDEN_KEYS.some((key) => normalize(entry.key || entry.value).includes(key)));
}

export function selectCreativeAttributes(input: {
  categoria?: string;
  subcategoria?: string;
  atributos?: string;
}) {
  const attributes = parseCreativeAttributes(input.atributos);
  if (!attributes.length) return [];

  const taxonomy = normalize(`${input.categoria || ""} ${input.subcategoria || ""}`);
  const rule = PRIORITIES.find((item) => item.match.some((match) => taxonomy.includes(match)));
  if (!rule) return attributes.slice(0, 3).map(formatAttribute).filter(Boolean);

  const selected: AttributeEntry[] = [];
  const used = new Set<number>();

  for (const priorityKey of rule.keys) {
    const index = attributes.findIndex((entry, entryIndex) => {
      return !used.has(entryIndex) && normalize(entry.key || entry.value).includes(normalize(priorityKey));
    });
    if (index >= 0) {
      selected.push(attributes[index]);
      used.add(index);
    }
    if (selected.length === 3) break;
  }

  for (let index = 0; selected.length < 3 && index < attributes.length; index += 1) {
    if (!used.has(index)) {
      selected.push(attributes[index]);
      used.add(index);
    }
  }

  return selected.slice(0, 3).map(formatAttribute).filter(Boolean);
}

function formatAttribute(entry: AttributeEntry) {
  const key = normalize(entry.key);
  const value = compactValue(entry.value);
  const combined = `${entry.key} ${value}`;

  if (key.includes("socket")) return firstSocket(value) || uppercaseClean(value).slice(0, 18);
  if (key.includes("radiador")) return firstRadiatorSize(value) || uppercaseClean(value).slice(0, 18);
  if (key.includes("ventilador") || key === "fan" || key === "fans") return firstFanCount(combined) || uppercaseClean(value).slice(0, 18);
  if (key.includes("frecuencia") || key.includes("ghz")) {
    const match = value.match(/\b\d+(?:[.,]\d+)?\s*ghz\b/i);
    return match ? match[0].replace(",", ".").toUpperCase() : uppercaseClean(value).slice(0, 18);
  }
  if (key.includes("nucleo") || key.includes("core")) {
    const match = value.match(/\b\d+\b/);
    return match ? `${match[0]} CORES` : uppercaseClean(value).slice(0, 18);
  }
  if (key.includes("memoria") || key.includes("vram") || key.includes("ram")) return uppercaseClean(value).slice(0, 18);
  if (key.includes("chip") || key.includes("gpu")) return uppercaseClean(value).slice(0, 18);
  if (key.includes("interfaz") || key.includes("interface")) return uppercaseClean(value).slice(0, 18);
  if (key.includes("chipset")) return uppercaseClean(value).slice(0, 18);
  if (key.includes("formato") || key.includes("form factor")) return uppercaseClean(value).slice(0, 18);
  if (key.includes("conexion") || key.includes("compatibilidad") || key.includes("switch") || key === "tipo") return uppercaseClean(value).slice(0, 18);

  return uppercaseClean(value || entry.key).slice(0, 18);
}
