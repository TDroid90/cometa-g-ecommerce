"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Product } from "@/lib/types";

type WishlistContextValue = {
  wishlist: Product[];
  hasItem: (productId: string) => boolean;
  toggleItem: (product: Product) => void;
  removeItem: (productId: string) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "cometag-wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<Product[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setWishlist(JSON.parse(saved));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlist,
      hasItem(productId) {
        return wishlist.some((product) => product.id === productId);
      },
      toggleItem(product) {
        setWishlist((current) =>
          current.some((item) => item.id === product.id)
            ? current.filter((item) => item.id !== product.id)
            : [...current, product]
        );
      },
      removeItem(productId) {
        setWishlist((current) => current.filter((item) => item.id !== productId));
      }
    }),
    [wishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist debe usarse dentro de WishlistProvider");
  return context;
}
