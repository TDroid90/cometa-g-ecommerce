"use client";

import Link from "next/link";
import { Heart, Menu, Moon, Search, ShoppingCart, Sun, User, X } from "lucide-react";
import { useState } from "react";
import { LayoutSection } from "@/lib/types";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useTheme } from "@/components/theme/ThemeProvider";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/productos", label: "Productos" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/carrito", label: "Carrito" }
];

export function Header({ sections }: { sections: LayoutSection[] }) {
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();
  const { wishlist } = useWishlist();
  const { theme, toggleTheme } = useTheme();
  const nav = sections.find((section) => section.section_type === "navbar");
  const title = nav?.title || "COMETA G";
  const subtitle = nav?.subtitle || "Computación Gamer";

  return (
    <header className="sticky top-0 z-40 border-b border-comet-border/80 bg-comet-black/88 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md comet-gradient font-black text-white">
            G
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black tracking-wide text-white">{title}</span>
            <span className="block truncate text-xs text-zinc-400">{subtitle}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/productos"
            className="hidden h-10 w-10 place-items-center rounded-md border border-comet-border text-zinc-300 transition hover:border-comet-fuchsia hover:text-white sm:grid"
            aria-label="Buscar productos"
            title="Buscar productos"
          >
            <Search size={18} />
          </Link>
          <button
            onClick={toggleTheme}
            className="grid h-10 w-10 place-items-center rounded-md border border-comet-border text-zinc-300 transition hover:border-comet-violet hover:text-white"
            aria-label="Cambiar tema"
            title="Cambiar tema"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            href="/login"
            className="hidden h-10 w-10 place-items-center rounded-md border border-comet-border text-zinc-300 transition hover:border-comet-fuchsia hover:text-white sm:grid"
            aria-label="Mi cuenta"
            title="Mi cuenta"
          >
            <User size={18} />
          </Link>
          <Link
            href="/wishlist"
            className="relative grid h-10 w-10 place-items-center rounded-md border border-comet-border text-zinc-300 transition hover:border-comet-fuchsia hover:text-white"
            aria-label="Wishlist"
            title="Wishlist"
          >
            <Heart size={18} />
            {wishlist.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-comet-fuchsia px-1 text-[11px] font-bold text-white">
                {wishlist.length}
              </span>
            )}
          </Link>
          <Link
            href="/carrito"
            className="relative grid h-10 w-10 place-items-center rounded-md border border-comet-border text-zinc-300 transition hover:border-comet-red hover:text-white"
            aria-label="Carrito"
            title="Carrito"
          >
            <ShoppingCart size={18} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-comet-red px-1 text-[11px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setOpen((current) => !current)}
            className="grid h-10 w-10 place-items-center rounded-md border border-comet-border text-zinc-300 md:hidden"
            aria-label="Menu"
            title="Menu"
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-comet-border bg-comet-black px-4 py-3 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-3 text-sm text-zinc-200 hover:bg-white/5"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-3 text-sm text-zinc-200 hover:bg-white/5"
          >
            Mi cuenta
          </Link>
        </nav>
      )}
    </header>
  );
}
