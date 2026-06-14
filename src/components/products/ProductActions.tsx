"use client";

import { Heart, ShoppingCart } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import { Product } from "@/lib/types";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";

export function ProductActions({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { hasItem, toggleItem } = useWishlist();
  const [quantity, setQuantity] = useState(1);
  const saved = hasItem(product.id);
  const disabled = product.stock_status === "sin_stock" && !product.preventa;
  const maxQuantity = product.stock > 0 ? product.stock : 99;

  function decrement() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increment() {
    setQuantity((current) => Math.min(maxQuantity, current + 1));
  }

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <div className="grid h-12 flex-1 grid-cols-[48px_1fr_48px] overflow-hidden rounded-md comet-gradient text-sm font-black text-white">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || quantity <= 1}
          className="border-r border-white/15 transition hover:bg-black/15 disabled:cursor-not-allowed disabled:text-white/40"
          aria-label="Restar unidad"
          title="Restar unidad"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => addItem(product, quantity)}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 px-3 transition hover:bg-black/10 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:bg-none disabled:text-zinc-400"
        >
          <ShoppingCart size={18} />
          {product.preventa ? `Reservar x${quantity}` : disabled ? "Sin stock" : `Agregar x${quantity}`}
        </button>
        <button
          type="button"
          onClick={increment}
          disabled={disabled || quantity >= maxQuantity}
          className="border-l border-white/15 transition hover:bg-black/15 disabled:cursor-not-allowed disabled:text-white/40"
          aria-label="Sumar unidad"
          title="Sumar unidad"
        >
          +
        </button>
      </div>
      <button
        onClick={() => toggleItem(product)}
        className={clsx(
          "inline-flex h-12 w-full items-center justify-center rounded-md border px-5 text-sm font-bold transition sm:w-14 sm:px-0",
          saved
            ? "border-comet-fuchsia bg-comet-fuchsia/15 text-comet-fuchsia"
            : "border-comet-border text-zinc-200 hover:border-comet-fuchsia"
        )}
        aria-label="Wishlist"
        title="Wishlist"
      >
        <Heart size={18} fill={saved ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
