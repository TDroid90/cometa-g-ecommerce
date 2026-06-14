import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, ShieldCheck, Truck } from "lucide-react";
import { ProductActions } from "@/components/products/ProductActions";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductGrid } from "@/components/products/ProductGrid";
import { formatPrice, getProductBySlug, getProducts, productPrice } from "@/lib/data";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const products = await getProducts();
  const relatedProducts = products
    .filter((item) => item.id !== product.id && item.categoria === product.categoria)
    .sort((a, b) => b.orden - a.orden)
    .slice(0, 5);

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
            <span className="text-zinc-300">{product.subcategoria}</span>
          </>
        )}
        {product.marca && (
          <>
            <span>&gt;</span>
            <span className="font-semibold text-comet-fuchsia">{product.marca}</span>
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
          </div>

          <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">{product.nombre}</h1>
          <p className="mt-3 text-sm text-zinc-500">SKU {product.sku || product.id}</p>
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
            </div>
            {product.marca && (
              <div className="rounded-md border border-comet-border bg-comet-panel p-3">
                <p className="text-xs uppercase text-zinc-500">Marca</p>
                <p className="mt-1 text-sm font-bold text-white">{product.marca}</p>
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

      {relatedProducts.length > 0 && (
        <section className="mt-10">
          <div className="mb-5 border-b border-comet-border pb-3">
            <h2 className="text-xl font-black text-white">Productos relacionados</h2>
            <p className="mt-1 text-sm text-zinc-400">Últimos cargados en {product.categoria}</p>
          </div>
          <ProductGrid products={relatedProducts} desktopColumns={5} mobileColumns={2} />
        </section>
      )}
    </div>
  );
}
