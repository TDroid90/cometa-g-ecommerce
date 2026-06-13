"use client";

import { Heart, ShoppingCart } from "lucide-react";
import clsx from "clsx";
import { Product } from "@/lib/types";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";

export function ProductActions({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { hasItem, toggleItem } = useWishlist();
  const saved = hasItem(product.id);
  const disabled = product.stock_status === "sin_stock" && !product.preventa;

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <button
        onClick={() => addItem(product)}
        disabled={disabled}
        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md comet-gradient px-5 text-sm font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:bg-none disabled:text-zinc-400"
      >
        <ShoppingCart size={18} />
        {product.preventa ? "Reservar preventa" : disabled ? "Sin stock" : "Agregar al carrito"}
      </button>
      <button
        onClick={() => toggleItem(product)}
        className={clsx(
          "inline-flex h-12 items-center justify-center gap-2 rounded-md border px-5 text-sm font-bold transition",
          saved
            ? "border-comet-fuchsia bg-comet-fuchsia/15 text-comet-fuchsia"
            : "border-comet-border text-zinc-200 hover:border-comet-fuchsia"
        )}
      >
        <Heart size={18} fill={saved ? "currentColor" : "none"} />
        Wishlist
      </button>
    </div>
  );
}
