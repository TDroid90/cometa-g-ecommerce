"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import clsx from "clsx";
import { Product } from "@/lib/types";
import { formatPrice, productPrice } from "@/lib/data";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";

function statusLabel(product: Product): string {
  if (product.preventa || product.stock_status === "preventa") return "Preventa";
  if (product.stock_status === "sin_stock") return "Sin stock";
  return "Disponible";
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { hasItem, toggleItem } = useWishlist();
  const disabled = product.stock_status === "sin_stock" && !product.preventa;
  const isSaved = hasItem(product.id);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-comet-border bg-comet-card shadow-sm transition hover:border-comet-fuchsia/60 hover:shadow-glow">
      <Link href={`/producto/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-zinc-950">
        {product.imagen_principal ? (
          <Image
            src={product.imagen_principal}
            alt={product.nombre}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-zinc-500">Sin imagen</div>
        )}
        <span
          className={clsx(
            "absolute left-3 top-3 rounded-md px-2.5 py-1 text-xs font-bold text-white",
            product.preventa ? "bg-comet-violet" : disabled ? "bg-zinc-700" : "bg-comet-red"
          )}
        >
          {statusLabel(product)}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="min-h-20">
          <p className="text-xs uppercase tracking-wide text-zinc-500">{product.marca}</p>
          <Link href={`/producto/${product.slug}`} className="mt-1 block text-sm font-bold leading-5 text-white hover:text-comet-fuchsia">
            {product.nombre}
          </Link>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{product.descripcion_corta}</p>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            {product.precio_oferta && (
              <p className="text-xs text-zinc-500 line-through">{formatPrice(product.precio)}</p>
            )}
            <p className="text-base font-black text-white">{formatPrice(productPrice(product))}</p>
          </div>
          <button
            onClick={() => toggleItem(product)}
            className={clsx(
              "grid h-10 w-10 shrink-0 place-items-center rounded-md border transition",
              isSaved
                ? "border-comet-fuchsia bg-comet-fuchsia/15 text-comet-fuchsia"
                : "border-comet-border text-zinc-300 hover:border-comet-fuchsia hover:text-white"
            )}
            aria-label="Guardar en wishlist"
            title="Guardar en wishlist"
          >
            <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
          </button>
        </div>

        <button
          onClick={() => addItem(product)}
          disabled={disabled}
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-black text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          <ShoppingCart size={17} />
          {product.preventa ? "Reservar" : disabled ? "Sin stock" : "Comprar"}
        </button>
      </div>
    </article>
  );
}
