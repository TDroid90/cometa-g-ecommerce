const PLACEHOLDERS = new Set(["", "sin descripcion", "sin descripción", "n/a", "na", "null", "undefined", "-"]);

const TRUE_VALUES = new Set(["1", "si", "sí", "yes", "true", "verdadero", "incluido", "incluye"]);
const FALSE_VALUES = new Set(["0", "no", "false", "falso", "sin", "no incluido", "no incluye"]);

const definitions = {
  cpu_v1: [
    ["brand", "Marca", ["marca", "brand"], "title"],
    ["model", "Modelo", ["modelo", "model"], "text"],
    ["architecture", "Arquitectura", ["arquitectura", "architecture"], "title"],
    ["family", "Familia", ["familia", "family", "familia de productos"], "title"],
    ["socket", "Socket", ["socket", "cpu socket", "cpu socket type", "zócalo", "zócalos compatibles", "socket de cpu"], "socket"],
    ["cores", "Núcleos", ["núcleos", "cantidad de núcleos", "núcleos totales", "# of cores", "cores"], "integer"],
    ["threads", "Hilos", ["hilos", "hilos totales", "subprocesos", "threads", "# of threads"], "integer"],
    ["base_clock_ghz", "Frecuencia base", ["frecuencia base", "base clock", "processor base frequency"], "ghz"],
    ["boost_clock_ghz", "Frecuencia máxima", ["frecuencia máxima", "frecuencia maxima", "boost clock", "max boost clock", "frecuencia turbo"], "ghz"],
    ["cache_l3_mb", "Caché L3", ["caché l3", "cache l3", "l3 cache", "caché total l3"], "mb"],
    ["memory_types", "Tipo de memoria RAM", ["tipo de ram", "tipo ram", "tipo de memoria ram", "memory type", "memory types"], "memory_types"],
    ["max_memory_speed_mts", "Velocidad máxima de memoria RAM", ["velocidad máxima de memoria ram", "velocidad maxima de memoria ram", "max memory speed", "memory speed"], "mts"],
    ["pcie_version", "Versión PCI Express", ["versión pci express", "version pci express", "pci express", "pcie version", "pci-e"], "pcie"],
    ["integrated_gpu", "Gráficos integrados", ["gráficos integrados", "graficos integrados", "integrated graphics", "integrated gpu", "igpu"], "boolean"],
    ["integrated_gpu_model", "Modelo gráficos integrados", ["modelo gráficos integrados", "modelo graficos integrados", "graphics model", "gpu model"], "text"],
    ["cooler_included", "CPU cooler incluido", ["cpu cooler incluido", "cooler incluido", "incluye cooler", "thermal solution"], "boolean"],
    ["tdp_w", "TDP", ["tdp", "default tdp", "thermal design power"], "watts"],
    ["lithography_nm", "Litografía", ["litografía", "litografia", "lithography", "process technology"], "nm"]
  ],
  motherboard_v1: [
    ["brand", "Marca", ["marca", "brand"], "title"],
    ["model", "Modelo", ["modelo", "model"], "text"],
    ["socket", "Socket", ["socket", "cpu socket", "cpu socket type", "zócalo", "socket de cpu"], "socket"],
    ["chipset", "Chipset", ["chipset", "chipset principal", "north bridge"], "text"],
    ["form_factor", "Formato", ["formato", "factor de forma", "form factor"], "form_factor"],
    ["memory_types", "Tipo de memoria RAM", ["tipo de ram", "tipo ram", "tipo de memoria ram", "memory type", "memory types"], "memory_types"],
    ["memory_slots", "Ranuras de memoria RAM", ["ranuras de memoria ram", "ranuras de memoria", "memory slots", "dimm slots"], "integer"],
    ["max_memory_speed_mts", "Velocidad máxima de memoria RAM", ["velocidad máxima de memoria ram", "velocidad maxima de memoria ram", "max memory speed", "memory speed"], "mts"],
    ["pcie_version", "Versión PCI Express", ["versión pci express", "version pci express", "pci express", "pcie version", "pci-e"], "pcie"],
    ["wifi", "WiFi", ["wifi", "wi-fi", "wireless lan"], "boolean"],
    ["bluetooth", "Bluetooth", ["bluetooth"], "boolean"]
  ],
  memory_pc_v1: [
    ["brand", "Marca", ["marca", "brand"], "title"],
    ["model", "Modelo", ["modelo", "model"], "text"],
    ["memory_types", "Tipo de memoria RAM", ["tipo de ram", "tipo ram", "tipo de memoria ram", "memory type", "memory types", "tecnología de memoria"], "memory_types"],
    ["capacity", "Capacidad", ["capacidad", "capacity", "capacidad total"], "text"],
    ["speed_mts", "Velocidad", ["velocidad", "memory speed", "frecuencia", "bus"], "mts"],
    ["latency", "Latencia", ["latencia", "latency", "cas latency", "cl"], "text"],
    ["voltage", "Voltaje", ["voltaje", "voltage"], "text"],
    ["form_factor", "Formato", ["formato", "factor de forma", "form factor"], "form_factor"],
    ["modules", "Cantidad de módulos", ["cantidad de módulos", "cantidad de modulos", "modules", "kit"], "integer"],
    ["rgb", "RGB", ["rgb", "iluminación rgb", "iluminacion rgb"], "boolean"]
  ]
};

export function normalizeAttributeKey(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/#/g, " cantidad ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").replace(/^[ .;|:-]+|[ .;|:-]+$/g, "");
}

function cleanRawText(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|tr|li|div|table)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function parseAttributes(value) {
  let text = cleanRawText(value);
  if (PLACEHOLDERS.has(text.toLocaleLowerCase("es"))) return [];
  text = text.replace(/\.\s+(?=[^:|;\r\n]{1,80}:)/g, "|");
  return text.split(/[|;\r\n]+/).flatMap((part) => {
    const cleaned = part.replace(/\s+/g, " ").replace(/^[ .|;-]+|[ .|;-]+$/g, "");
    if (!cleaned.includes(":")) return [];
    const separator = cleaned.indexOf(":");
    const key = cleaned.slice(0, separator).trim();
    const attributeValue = cleaned.slice(separator + 1).trim();
    if (!key || !attributeValue || PLACEHOLDERS.has(attributeValue.toLocaleLowerCase("es"))) return [];
    return [{ key, value: attributeValue }];
  });
}

function resolveSchema(category, subcategory = "") {
  const taxonomy = normalizeAttributeKey(`${category} ${subcategory}`);
  const words = new Set(taxonomy.split(" "));
  if (words.has("cpu") || taxonomy.includes("procesador")) return "cpu_v1";
  if (taxonomy.includes("motherboard") || taxonomy.includes("placa madre")) return "motherboard_v1";
  if (taxonomy.includes("memorias pc") || taxonomy.includes("memoria pc") || taxonomy.includes("ram pc")) return "memory_pc_v1";
  return null;
}

function firstNumber(value) {
  const match = cleanText(value).match(/-?\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : null;
}

function normalizeSocket(value) {
  const text = cleanText(value).toUpperCase().replace(/SOCKET|ZÓCALO|ZOCALO/g, " ");
  const lga = text.match(/(?:FC)?LGA\s*-?\s*(\d{3,5})/);
  if (lga) return `LGA${lga[1]}`;
  const amd = text.match(/\b(AM|FM|TR|SP)\s*-?\s*(\d+)\b/);
  if (amd) return `${amd[1]}${amd[2]}`;
  return text.replace(/\s+/g, "").replace(/^[-/]+|[-/]+$/g, "");
}

function normalizeMemoryTypes(value) {
  const matches = cleanText(value).toUpperCase().match(/\b(?:LP)?DDR\s*-?\s*\d\b/g) || [];
  return [...new Set(matches.map((item) => item.replace(/[\s-]+/g, "")))];
}

function normalizeFormFactor(value) {
  const aliases = new Map([
    ["micro atx", "MATX"], ["m atx", "MATX"], ["matx", "MATX"],
    ["mini itx", "Mini-ITX"], ["mitx", "Mini-ITX"], ["atx", "ATX"],
    ["eatx", "E-ATX"], ["e atx", "E-ATX"]
  ]);
  return aliases.get(normalizeAttributeKey(value)) || cleanText(value);
}

function normalizeTitle(value) {
  return cleanText(value).split(" ").map((word) => {
    const upper = word.toUpperCase();
    if (["AMD", "INTEL", "DDR3", "DDR4", "DDR5", "PCI"].includes(upper)) return upper;
    if (upper === "PCIE") return "PCIe";
    if (upper === "ZEN") return "Zen";
    return word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

function normalizeValue(kind, value) {
  const text = cleanText(value);
  if (!text) return null;
  if (kind === "socket") return normalizeSocket(text) || null;
  if (kind === "memory_types") return normalizeMemoryTypes(text);
  if (kind === "form_factor") return normalizeFormFactor(text);
  if (kind === "boolean") {
    const normalized = normalizeAttributeKey(text);
    if ([...TRUE_VALUES].some((item) => normalizeAttributeKey(item) === normalized)) return true;
    if ([...FALSE_VALUES].some((item) => normalizeAttributeKey(item) === normalized)) return false;
    return null;
  }
  if (["integer", "mts", "watts"].includes(kind)) {
    const number = firstNumber(text);
    return number === null ? null : Math.trunc(number);
  }
  if (["ghz", "mb", "nm", "pcie"].includes(kind)) return firstNumber(text);
  if (kind === "title") return normalizeTitle(text);
  return text;
}

function numberText(value) {
  return Number.isInteger(Number(value)) ? String(Math.trunc(Number(value))) : String(Number(value));
}

function displayValue(kind, value) {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (kind === "ghz") return `${numberText(value)} GHz`;
  if (kind === "mb") return `${numberText(value)} MB`;
  if (kind === "mts") return `${numberText(value)} MT/s`;
  if (kind === "pcie") return `PCIe ${numberText(value)}`;
  if (kind === "watts") return `${numberText(value)} W`;
  if (kind === "nm") return `${numberText(value)} nm`;
  return cleanText(value);
}

function segment(label, value) {
  const safeLabel = cleanText(label).replace(/\|/g, "/").replace(/:/g, "-");
  const safeValue = cleanText(value).replace(/\|/g, "/");
  if (/\b(?:null|undefined)\b/i.test(`${safeLabel} ${safeValue}`)) return "";
  return safeLabel && safeValue ? `${safeLabel}:${safeValue}` : "";
}

export function serializeLegacyAttributes(rawAttributes) {
  const seen = new Set();
  const pieces = [];
  for (const attribute of parseAttributes(rawAttributes)) {
    const key = normalizeAttributeKey(attribute.key);
    if (!key || seen.has(key)) continue;
    const piece = segment(attribute.key, attribute.value);
    if (piece) pieces.push(piece);
    seen.add(key);
  }
  if (pieces.length) return pieces.join("|");
  const text = cleanRawText(rawAttributes).replace(/\b(?:null|undefined)\b/gi, "").replace(/\s+/g, " ").replace(/^[ .|;:-]+|[ .|;:-]+$/g, "");
  if (!text || ["sin descripcion", "n a", "na"].includes(normalizeAttributeKey(text))) return "Información técnica:No disponible";
  if (cleanRawText(rawAttributes).includes(":")) return "Información técnica:No disponible";
  return segment("Descripción técnica", text.slice(0, 500));
}

export function validateSerializedAttributes(value, conflicts = {}) {
  const errors = [];
  const raw = String(value ?? "").trim();
  if (!raw) return { valid: false, errors: ["empty_string"] };
  if (raw.startsWith("|")) errors.push("leading_separator");
  if (raw.endsWith("|")) errors.push("trailing_separator");
  if (raw.includes("||")) errors.push("empty_segment");
  if (/undefined/i.test(raw)) errors.push("undefined_value");
  if (/null/i.test(raw)) errors.push("null_value");
  const seen = new Set();
  raw.split("|").forEach((piece, index) => {
    if (!piece.trim()) return errors.push(`empty_segment:${index}`);
    if (!piece.includes(":")) return errors.push(`invalid_segment:${index}`);
    const separator = piece.indexOf(":");
    const key = normalizeAttributeKey(piece.slice(0, separator));
    const itemValue = piece.slice(separator + 1).trim();
    if (!key || !itemValue) errors.push(`invalid_segment:${index}`);
    if (seen.has(key)) errors.push(`duplicate_key:${key}`);
    seen.add(key);
  });
  Object.keys(conflicts).forEach((key) => errors.push(`conflict:${key}`));
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

function valuesMatch(left, right) {
  if (Array.isArray(left) && Array.isArray(right)) {
    return JSON.stringify([...left].map(normalizeAttributeKey).sort()) === JSON.stringify([...right].map(normalizeAttributeKey).sort());
  }
  return normalizeAttributeKey(displayValue("text", left)) === normalizeAttributeKey(displayValue("text", right));
}

function extractUnlabelled(raw, schema, specs) {
  if (!schema) return;
  if (!("socket" in specs)) {
    const match = raw.match(/\b(?:(?:FC)?LGA\s*-?\s*\d{3,5}|(?:AM|FM|TR|SP)\s*-?\s*\d+)\b/i);
    if (match) specs.socket = normalizeSocket(match[0]);
  }
  if (!("memory_types" in specs)) {
    const values = normalizeMemoryTypes(raw);
    if (values.length) specs.memory_types = values;
  }
}

export function normalizeProductAttributes(rawAttributes, category, subcategory = "") {
  const raw = cleanRawText(rawAttributes);
  const schema = resolveSchema(category, subcategory);
  if (!schema) {
    const serializedAttributes = serializeLegacyAttributes(raw);
    return {
      rawAttributes: raw,
      normalizedSpecs: {},
      serializedAttributes,
      normalizationStatus: "legacy",
      schema: null,
      conflicts: {},
      unknownAttributes: [],
      validationErrors: validateSerializedAttributes(serializedAttributes).errors
    };
  }

  const schemaDefinitions = definitions[schema];
  const aliasMap = new Map();
  schemaDefinitions.forEach(([key, label, aliases, normalizer]) => {
    aliases.forEach((alias) => aliasMap.set(normalizeAttributeKey(alias), { key, label, normalizer }));
  });

  const specs = {};
  const conflicts = {};
  const unknownAttributes = [];
  for (const attribute of parseAttributes(raw)) {
    const definition = aliasMap.get(normalizeAttributeKey(attribute.key));
    if (!definition) {
      unknownAttributes.push(attribute);
      continue;
    }
    const value = normalizeValue(definition.normalizer, attribute.value);
    if (value === null || value === "" || (Array.isArray(value) && !value.length)) {
      unknownAttributes.push(attribute);
      continue;
    }
    if (!(definition.key in specs)) {
      specs[definition.key] = value;
      continue;
    }
    if (valuesMatch(specs[definition.key], value)) continue;
    const current = displayValue(definition.normalizer, specs[definition.key]);
    const next = displayValue(definition.normalizer, value);
    conflicts[definition.key] = [...new Set([...(conflicts[definition.key] || [current]), next])];
  }

  extractUnlabelled(raw, schema, specs);
  if (!Object.keys(specs).length && !Object.keys(conflicts).length) {
    const serializedAttributes = serializeLegacyAttributes(raw);
    return {
      rawAttributes: raw,
      normalizedSpecs: {},
      serializedAttributes,
      normalizationStatus: "legacy",
      schema,
      conflicts: {},
      unknownAttributes,
      validationErrors: validateSerializedAttributes(serializedAttributes).errors
    };
  }

  const pieces = [];
  const seenLabels = new Set();
  schemaDefinitions.forEach(([key, label, , normalizer]) => {
    const value = conflicts[key]?.length ? conflicts[key].join(" / ") : specs[key] == null ? "" : displayValue(normalizer, specs[key]);
    const piece = segment(label, value);
    if (piece) pieces.push(piece);
    seenLabels.add(normalizeAttributeKey(label));
  });
  unknownAttributes.forEach((attribute) => {
    const key = normalizeAttributeKey(attribute.key);
    if (!key || seenLabels.has(key)) return;
    const piece = segment(attribute.key, attribute.value);
    if (piece) pieces.push(piece);
    seenLabels.add(key);
  });

  const serializedAttributes = pieces.join("|") || serializeLegacyAttributes(raw);
  const validationErrors = validateSerializedAttributes(serializedAttributes, conflicts).errors;
  const normalizationStatus = Object.keys(conflicts).length ? "conflict" : unknownAttributes.length ? "partial" : "normalized";
  return {
    rawAttributes: raw,
    normalizedSpecs: specs,
    serializedAttributes,
    normalizationStatus,
    schema,
    conflicts,
    unknownAttributes,
    validationErrors
  };
}

export function attributeSegments(serializedAttributes) {
  return String(serializedAttributes || "").split("|").flatMap((piece) => {
    const separator = piece.indexOf(":");
    if (separator < 1) return [];
    return [{ label: piece.slice(0, separator).trim(), value: piece.slice(separator + 1).trim() }];
  }).filter((item) => item.label && item.value);
}
