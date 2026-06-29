import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, ShieldCheck, Truck } from "lucide-react";
import { ProductActions } from "@/components/products/ProductActions";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductGrid } from "@/components/products/ProductGrid";
import { formatPrice, getProducts, productPrice } from "@/lib/data";
import { getProductBySlugWithTechData } from "@/lib/techData";
import { Product, ProductTechSpecs } from "@/lib/types";

function seededValue(seed: string) {
  return Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function mixedProducts(products: Product[], current: Product): Product[] {
  const byCategory = new Map<string, Product[]>();
  for (const item of products) {
    if (item.id === current.id || item.stock <= 1) continue;
    const category = item.categoria || "Otros";
    const currentItems = byCategory.get(category) || [];
    currentItems.push(item);
    byCategory.set(category, currentItems);
  }

  return Array.from(byCategory.entries())
    .sort(([a], [b]) => seededValue(`${current.slug}-${a}`) - seededValue(`${current.slug}-${b}`))
    .map(([category, items]) => {
      const sorted = [...items].sort(
        (a, b) => seededValue(`${category}-${current.slug}-${a.id}`) - seededValue(`${category}-${current.slug}-${b.id}`)
      );
      return sorted[0];
    })
    .slice(0, 5);
}

const techLabels: Partial<Record<keyof ProductTechSpecs, string>> = {
  socket: "Socket",
  chipset: "Chipset",
  ramType: "Tipo de RAM",
  ramCapacityGb: "Capacidad RAM",
  ramSpeedMhz: "Velocidad RAM",
  cpuCores: "Nucleos",
  cpuThreads: "Hilos",
  baseClockGhz: "Frecuencia base",
  boostClockGhz: "Frecuencia turbo",
  tdpWatts: "TDP",
  gpuMemoryGb: "Memoria GPU",
  gpuMemoryType: "Tipo memoria GPU",
  recommendedPsuWattage: "Fuente recomendada",
  storageType: "Tipo de almacenamiento",
  capacityGb: "Capacidad",
  interface: "Interfaz",
  motherboardFormFactor: "Formato",
  supportedMotherboardFormats: "Formatos soportados",
  wattage: "Potencia",
  efficiencyRating: "Certificacion",
  benchmarkScore: "Benchmark",
  versusScore: "Versus score"
};

function formatTechValue(key: keyof ProductTechSpecs, value: ProductTechSpecs[keyof ProductTechSpecs]) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") {
    if (key === "ramCapacityGb" || key === "gpuMemoryGb" || key === "capacityGb") return `${value} GB`;
    if (key === "ramSpeedMhz") return `${value} MHz`;
    if (key === "baseClockGhz" || key === "boostClockGhz") return `${value} GHz`;
    if (key === "tdpWatts" || key === "recommendedPsuWattage" || key === "wattage") return `${value} W`;
  }
  return String(value);
}

function technicalEntries(specs?: ProductTechSpecs) {
  if (!specs) return [];
  return (Object.entries(techLabels) as Array<[keyof ProductTechSpecs, string]>)
    .map(([key, label]) => {
      const value = specs[key];
      return value === undefined || value === "" ? null : { key, label, value: formatTechValue(key, value) };
    })
    .filter(Boolean) as Array<{ key: keyof ProductTechSpecs; label: string; value: string }>;
}

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlugWithTechData(slug);
  if (!product) notFound();
  const products = await getProducts();
  const relatedProducts = mixedProducts(products, product);
  const hasLocalStock = Boolean(product.stockLocal && product.stockLocal > 0);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-zinc-500" aria-label="Breadcrumb">
        <Link href="/productos" className="hover:text-white">Productos</Link>
        {product.categoria && (
          <>
            <span>&gt;</span>
            <Link href={`/productos?categoria=${encodeURIComponent(product.categoria)}`} className="hover:text-white">
              {product.categoria}
            </Link>
          </>
        )}
        {product.subcategoria && (
          <>
            <span>&gt;</span>
            <Link
              href={`/productos?subcategoria=${encodeURIComponent(product.subcategoria)}`}
              className="hover:text-white"
            >
              {product.subcategoria}
            </Link>
          </>
        )}
        {product.marca && (
          <>
            <span>&gt;</span>
            <Link
              href={`/productos?marca=${encodeURIComponent(product.marca)}`}
              className="font-semibold text-comet-fuchsia"
            >
              {product.marca}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 md:grid-cols-[1fr_.9fr]">
        <ProductGallery
          name={product.nombre}
          mainImage={product.imagen_principal}
          extraImages={product.imagenes_extra}
        />

        <section>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-comet-fuchsia/15 px-3 py-1 text-xs font-bold text-comet-fuchsia">
              {product.categoria}
            </span>
            <span className="rounded-md bg-white/5 px-3 py-1 text-xs font-bold text-zinc-300">
              {product.preventa ? "Preventa" : product.stock_status === "sin_stock" ? "Sin stock" : "Disponible"}
            </span>
            {hasLocalStock && (
              <span className="rounded-md bg-yellow-300 px-3 py-1 text-xs font-black text-zinc-950">
                STOCK LOCAL
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">{product.nombre}</h1>
          <p className="mt-3 text-sm text-zinc-500">SKU {product.sku || product.id}</p>
          <p className="mt-1 text-xs lowercase text-zinc-500">imagen ilustrativa</p>
          {product.descripcion_corta && (
            <p className="mt-5 text-base leading-7 text-zinc-300">{product.descripcion_corta}</p>
          )}

          <div className="mt-6">
            {product.precio_oferta && (
              <p className="text-sm text-zinc-500 line-through">{formatPrice(product.precio)}</p>
            )}
            <p className={`text-3xl font-black ${product.precio_oferta ? "text-emerald-400" : "text-white"}`}>
              {formatPrice(productPrice(product))}
            </p>
          </div>

          {product.preventa && (
            <div className="mt-5 rounded-lg border border-comet-violet/40 bg-comet-violet/10 p-4 text-sm text-zinc-200">
              Producto en preventa
              {product.fecha_lanzamiento && (
                <span className="block text-zinc-400">
                  Fecha estimada de lanzamiento: {product.fecha_lanzamiento}
                </span>
              )}
            </div>
          )}

          <ProductActions product={product} />

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-comet-border bg-comet-panel p-3">
              <p className="text-xs uppercase text-zinc-500">Stock</p>
              <p className="mt-1 text-sm font-bold text-white">
                {product.preventa
                  ? `Preventa${product.stock > 0 ? ` - ${product.stock} disponibles` : ""}`
                  : product.stock > 0
                    ? `${product.stock} unidades`
                    : "Sin stock"}
              </p>
              {hasLocalStock && (
                <p className="mt-1 text-xs font-bold text-yellow-300">
                  Stock local: {product.stockLocal} unidades
                </p>
              )}
            </div>
            {product.marca && (
              <div className="rounded-md border border-comet-border bg-comet-panel p-3">
                <p className="text-xs uppercase text-zinc-500">Marca</p>
                <div className="mt-2 flex items-center gap-2">
                  {product.marca_logo_url && (
                    <img
                      src={product.marca_logo_url}
                      alt={`Logo ${product.marca}`}
                      className="h-7 max-w-[150px] rounded bg-white object-contain px-2 py-1"
                    />
                  )}
                  <p className="text-sm font-bold text-white">{product.marca}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-md border border-comet-border bg-comet-panel p-3 text-sm text-zinc-200">
              <ShieldCheck size={19} className="text-comet-fuchsia" />
              <span className="font-bold">Garantía</span>
              <Link
                href="/terminos-y-condiciones#garantia"
                className="inline-flex items-center gap-1 text-zinc-400 hover:text-white"
                aria-label="Ver términos de garantía"
                title="Ver términos de garantía"
              >
                <Eye size={17} />
                <span>*</span>
              </Link>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-comet-border bg-comet-panel p-3 text-sm text-zinc-200">
              <Truck size={19} className="text-comet-violet" />
              <span className="font-bold">Envíos a todo el País</span>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-10 rounded-lg border border-comet-border bg-comet-panel p-4 sm:p-5">
        <h2 className="text-xl font-black text-white">Descripción</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-400">
          {product.descripcion_larga || product.descripcion_corta}
        </p>

        {product.atributos && (
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(product.atributos).map(([key, value]) => (
              <div key={key} className="rounded-md border border-comet-border bg-comet-black px-3 py-2.5">
                <p className="text-xs text-zinc-500">{key}</p>
                <p className="mt-1 text-sm font-bold text-zinc-100">{value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {technicalEntries(product.techSpecs).length > 0 && (
        <section className="mt-10 rounded-lg border border-comet-border bg-comet-panel p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Ficha tecnica</h2>
              <p className="mt-1 text-sm text-zinc-400">Datos tecnicos de referencia para comparar compatibilidad.</p>
            </div>
            {product.externalRefs?.versusUrl && (
              <a
                href={product.externalRefs.versusUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-bold text-comet-fuchsia hover:text-white"
              >
                Fuente tecnica: Versus
              </a>
            )}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {technicalEntries(product.techSpecs).map((entry) => (
              <div key={entry.key} className="rounded-md border border-comet-border bg-comet-black px-3 py-2.5">
                <p className="text-xs text-zinc-500">{entry.label}</p>
                <p className="mt-1 text-sm font-bold text-zinc-100">{entry.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-zinc-500">
            Los datos tecnicos son de referencia y pueden variar segun fabricante, revision del producto o proveedor.
            Verifica la compatibilidad final antes de comprar.
          </p>
        </section>
      )}

      {relatedProducts.length > 0 && (
        <section className="mt-10">
          <div className="mb-5 border-b border-comet-border pb-3">
            <h2 className="text-xl font-black text-white">Más Productos</h2>
            <p className="mt-1 text-sm text-zinc-400">Una selección variada de distintas categorías</p>
          </div>
          <ProductGrid products={relatedProducts} desktopColumns={5} mobileColumns={2} />
        </section>
      )}
    </div>
  );
}
