import { Product } from "@/lib/types";

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function normalizeProductPayload(input: Record<string, FormDataEntryValue | null>) {
  const nombre = String(input.nombre || "").trim();
  const sku = String(input.sku || "").trim();
  const generatedSlug = slugify(nombre || sku || `producto-${Date.now()}`);

  return {
    id: String(input.id || "").trim() || sku || generatedSlug,
    sku,
    nombre,
    slug: String(input.slug || "").trim() || generatedSlug,
    descripcion_corta: String(input.descripcion_corta || "").trim(),
    descripcion_larga: String(input.descripcion_larga || "").trim(),
    precio: String(input.precio || "0").trim(),
    precio_oferta: String(input.precio_oferta || "").trim(),
    stock: String(input.stock || "0").trim(),
    stock_status: String(input.stock_status || "disponible").trim(),
    categoria: String(input.categoria || "").trim(),
    subcategoria: String(input.subcategoria || "").trim(),
    marca: String(input.marca || "").trim(),
    tags: String(input.tags || "").trim(),
    atributos: String(input.atributos || "").trim(),
    variables: String(input.variables || "").trim(),
    color: String(input.color || "").trim(),
    garantia: String(input.garantia || "").trim(),
    destacado: String(input.destacado || "FALSE").toUpperCase() === "TRUE" ? "TRUE" : "FALSE",
    nuevo: String(input.nuevo || "FALSE").toUpperCase() === "TRUE" ? "TRUE" : "FALSE",
    oferta: String(input.oferta || "FALSE").toUpperCase() === "TRUE" ? "TRUE" : "FALSE",
    preventa: String(input.preventa || "FALSE").toUpperCase() === "TRUE" ? "TRUE" : "FALSE",
    fecha_lanzamiento: String(input.fecha_lanzamiento || "").trim(),
    visible: String(input.visible || "TRUE").toUpperCase() === "FALSE" ? "FALSE" : "TRUE",
    orden: String(input.orden || "999").trim()
  };
}

export function productPath(product: Pick<Product, "slug">, index: number, file: File): string {
  const safeName = slugify(file.name.replace(/\.[^.]+$/, "")) || `imagen-${index + 1}`;
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "webp";
  return `productos/${product.slug}/${String(index + 1).padStart(2, "0")}-${safeName}.${ext}`;
}
