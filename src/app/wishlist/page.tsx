"use client";

import Link from "next/link";
import { ProductGrid } from "@/components/products/ProductGrid";
import { useWishlist } from "@/components/wishlist/WishlistProvider";

export default function WishlistPage() {
  const { wishlist } = useWishlist();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-comet-fuchsia">Guardados</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Wishlist</h1>
      </div>

      {wishlist.length === 0 ? (
        <div className="rounded-lg border border-comet-border bg-comet-panel p-8 text-center">
          <p className="text-zinc-300">Todavia no guardaste productos.</p>
          <Link href="/productos" className="mt-5 inline-flex h-11 items-center rounded-md comet-gradient px-5 text-sm font-black text-white">
            Explorar catalogo
          </Link>
        </div>
      ) : (
        <ProductGrid products={wishlist} />
      )}
    </div>
  );
}
