import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ProductActions } from "@/components/products/ProductActions";
import { formatPrice, getProductBySlug, getProducts, productPrice } from "@/lib/data";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/productos" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ChevronLeft size={17} />
        Volver al catalogo
      </Link>

      <div className="grid gap-8 md:grid-cols-[1fr_.9fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-comet-border bg-comet-panel">
          {product.imagen_principal ? (
            <Image
              src={product.imagen_principal}
              alt={product.nombre}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-zinc-500">Sin imagen</div>
          )}
        </div>

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
            <p className="text-3xl font-black text-white">{formatPrice(productPrice(product))}</p>
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
            {product.garantia && (
              <div className="rounded-lg border border-comet-border bg-comet-panel p-4">
                <p className="text-xs uppercase text-zinc-500">Garantia</p>
                <p className="mt-1 text-sm font-bold text-white">{product.garantia}</p>
              </div>
            )}
            {product.marca && (
              <div className="rounded-lg border border-comet-border bg-comet-panel p-4">
                <p className="text-xs uppercase text-zinc-500">Marca</p>
                <p className="mt-1 text-sm font-bold text-white">{product.marca}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-10 rounded-lg border border-comet-border bg-comet-panel p-6">
        <h2 className="text-xl font-black text-white">Descripcion</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-400">
          {product.descripcion_larga || product.descripcion_corta}
        </p>

        {product.atributos && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(product.atributos).map(([key, value]) => (
              <div key={key} className="rounded-md border border-comet-border bg-comet-black p-3">
                <p className="text-xs text-zinc-500">{key}</p>
                <p className="mt-1 text-sm font-bold text-zinc-100">{value}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
