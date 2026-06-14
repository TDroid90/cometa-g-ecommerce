"use client";

import Link from "next/link";
import {
  Heart,
  LocateFixed,
  Menu,
  Moon,
  PackageCheck,
  Search,
  ShoppingCart,
  Sun,
  User,
  X
} from "lucide-react";
import { useState } from "react";
import { LayoutSection } from "@/lib/types";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useTheme } from "@/components/theme/ThemeProvider";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/productos", label: "Productos" },
  { href: "/productos?categoria=Placas%20de%20video", label: "Placas de video" },
  { href: "/productos?categoria=Procesadores", label: "Procesadores" },
  { href: "/productos?categoria=Monitores", label: "Monitores" },
  { href: "/productos?disponibilidad=preventa", label: "Preventa" }
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
    <header className="sticky top-0 z-40 border-b border-comet-border bg-comet-black/95 backdrop-blur">
      <div className="border-b border-comet-border/70 bg-comet-red/10">
        <div className="mx-auto flex h-9 w-full max-w-7xl items-center justify-between px-4 text-xs text-zinc-300 sm:px-6 lg:px-8">
          <p className="truncate">Hardware gamer, preventas y componentes seleccionados para tu setup</p>
          <div className="hidden items-center gap-5 md:flex">
            <span className="inline-flex items-center gap-1.5"><LocateFixed size={14} /> Store locator</span>
            <span className="inline-flex items-center gap-1.5"><PackageCheck size={14} /> Seguir pedido</span>
            <Link href="/perfil" className="hover:text-white">Mi cuenta</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto grid min-h-20 w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[260px_1fr_auto] lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md comet-gradient font-black text-white">
            G
          </span>
          <span className="min-w-0">
            <span className="block truncate text-2xl font-extrabold leading-none text-white">
              {title}<span className="text-comet-fuchsia">.</span>
            </span>
            <span className="block truncate text-xs font-semibold text-zinc-400">{subtitle}</span>
          </span>
        </Link>

        <form action="/productos" className="order-3 col-span-2 flex h-12 overflow-hidden rounded-md border border-comet-fuchsia/60 bg-comet-panel lg:order-none lg:col-span-1">
          <input
            name="q"
            placeholder="Buscar productos, marcas o SKU..."
            className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-zinc-500"
          />
          <select
            name="categoria"
            className="hidden border-l border-comet-border bg-comet-panel px-3 text-sm text-zinc-300 outline-none md:block"
            defaultValue=""
            aria-label="Categoría"
          >
            <option value="">Todas</option>
            <option value="Placas de video">Placas de video</option>
            <option value="Procesadores">Procesadores</option>
            <option value="Monitores">Monitores</option>
            <option value="Perifericos">Periféricos</option>
          </select>
          <button className="grid h-12 w-14 place-items-center comet-gradient text-white" aria-label="Buscar" title="Buscar">
            <Search size={20} />
          </button>
        </form>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={toggleTheme}
            className="grid h-10 w-10 place-items-center rounded-md border border-comet-border text-zinc-300 transition hover:border-comet-violet hover:text-white"
            aria-label="Cambiar tema"
            title="Cambiar tema"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            href="/perfil"
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
            className="grid h-10 w-10 place-items-center rounded-md border border-comet-border text-zinc-300 lg:hidden"
            aria-label="Menu"
            title="Menu"
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      <nav className="hidden border-t border-comet-border bg-comet-panel lg:block">
        <div className="mx-auto flex h-12 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <button className="mr-2 inline-flex h-12 items-center gap-2 border-x border-comet-border px-4 text-sm font-bold text-white">
            <Menu size={18} /> Categorías
          </button>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-12 items-center border-r border-comet-border px-4 text-sm font-bold text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {open && (
        <nav className="border-t border-comet-border bg-comet-black px-4 py-3 lg:hidden">
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
            Ingresar
          </Link>
        </nav>
      )}
    </header>
  );
}
