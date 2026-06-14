"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import clsx from "clsx";
import { Product } from "@/lib/types";
import { formatPrice, productPrice } from "@/lib/data";
import { normalizeImageUrl } from "@/lib/images";
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
  const imageUrl = normalizeImageUrl(product.imagen_principal);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-md border border-comet-border bg-comet-card shadow-sm transition hover:-translate-y-0.5 hover:border-comet-fuchsia/50 hover:shadow-lg">
      <div className="absolute left-3 top-3 z-10 rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-black text-white">
        {statusLabel(product)}
      </div>

      <button
        onClick={() => toggleItem(product)}
        className={clsx(
          "absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border bg-comet-panel transition",
          isSaved
            ? "border-comet-fuchsia text-comet-fuchsia"
            : "border-comet-border text-zinc-400 hover:text-comet-fuchsia"
        )}
        aria-label="Guardar en wishlist"
        title="Guardar en wishlist"
      >
        <Heart size={17} fill={isSaved ? "currentColor" : "none"} />
      </button>

      <Link href={`/producto/${product.slug}`} className="relative block aspect-square overflow-hidden bg-[#101014] p-5">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.nombre}
            fill
            sizes="(max-width: 768px) 50vw, 20vw"
            className="object-contain p-7 transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-zinc-500">Sin imagen</div>
        )}
      </Link>

      <div className="flex flex-1 flex-col border-t border-comet-border p-4">
        <p className="text-xs font-semibold text-zinc-400">{product.categoria || product.marca}</p>
        <Link
          href={`/producto/${product.slug}`}
          className="mt-2 line-clamp-2 min-h-10 text-sm font-extrabold leading-5 text-zinc-100 hover:text-comet-fuchsia"
        >
          {product.nombre}
        </Link>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            {product.precio_oferta && (
              <p className="text-xs text-zinc-400 line-through">{formatPrice(product.precio)}</p>
            )}
            <p className={clsx("text-lg font-black", product.precio_oferta ? "text-emerald-400" : "text-white")}>
              {formatPrice(productPrice(product))}
            </p>
          </div>
          <button
            onClick={() => addItem(product)}
            disabled={disabled}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-comet-panel text-zinc-400 transition hover:bg-comet-fuchsia hover:text-white disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
            aria-label={product.preventa ? "Reservar" : "Comprar"}
            title={product.preventa ? "Reservar" : "Comprar"}
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
