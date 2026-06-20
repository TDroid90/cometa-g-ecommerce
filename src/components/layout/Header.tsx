"use client";

import Link from "next/link";
import { ChevronRight, Heart, LocateFixed, Menu, PackageCheck, Search, ShoppingCart, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CategoryMenuItem, LayoutSection, Product } from "@/lib/types";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";

const defaultNavItems = [
  { href: "/productos?oferta=true", label: "Ofertas" },
  { href: "/productos?disponibilidad=preventa", label: "Preventa" },
  { href: "/mecanica-de-compra", label: "Mecánica de compra" },
  { href: "/arma-tu-pc", label: "ARMA TU PC" }
];

const defaultTopLinks = [
  { href: "#", label: "Store locator" },
  { href: "#", label: "Seguir pedido" },
  { href: "/perfil", label: "Mi cuenta" }
];

const megaMenuRoots = [
  { label: "Componentes", categories: ["Hardware", "Almacenamiento", "Memorias"] },
  { label: "Computos", categories: ["Computadoras", "Monitores"] },
  { label: "Perifericos", categories: ["Perifericos", "Audio", "Conectividad", "Unidad de Energia"] },
  {
    label: "Otros",
    categories: [
      "Electro",
      "Estuches",
      "Seguridad",
      "Casa Inteligente",
      "Muebles",
      "Soportes",
      "Accesorios",
      "Marcas",
    ]
  }
];

function parseNavItems(text?: string, fallback = defaultNavItems) {
  const items = (text || "")
    .split(",")
    .map((item) => {
      const [label, href] = item.split("|").map((part) => part.trim());
      return label ? { label, href: href || "#" } : null;
    })
    .filter(Boolean) as { label: string; href: string }[];

  const labels = new Set(items.map((item) => item.label.toLowerCase()));
  if (labels.has("inicio") || labels.has("productos") || labels.has("placas de video")) {
    return fallback;
  }

  return items.length ? items : fallback;
}

function parseList(text?: string) {
  return (text || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sectionStyle(section?: LayoutSection): React.CSSProperties {
  return {
    background: section?.background_color && section.background_color !== "gradient" ? section.background_color : undefined,
    color: section?.text_color || undefined,
    fontSize: section?.font_size ? `${section.font_size}px` : undefined,
    fontWeight: section?.font_weight || undefined,
    textAlign: (section?.align as React.CSSProperties["textAlign"]) || undefined
  };
}

function sectionByVariant(sections: LayoutSection[], variant: string) {
  return sections.find((section) => section.layout_variant === variant && section.visible);
}

function buildCategoryHref(group: { category: string; items: CategoryMenuItem[] }) {
  if (group.category === "Marcas") return "/productos";
  return `/productos?categoria=${encodeURIComponent(group.category)}`;
}

function formatQuickPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}

export function Header({
  sections,
  categoryMenu
}: {
  sections: LayoutSection[];
  categoryMenu?: CategoryMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [activeMegaRoot, setActiveMegaRoot] = useState(megaMenuRoots[0].label);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const { itemCount } = useCart();
  const { wishlist } = useWishlist();
  const nav = sections.find((section) => section.section_type === "navbar");
  const categoryNav = sections.find((section) => section.section_type === "category_nav" && section.visible);
  const topLeft = sectionByVariant(sections, "header_top_left");
  const topRight = sectionByVariant(sections, "header_top_right");
  const searchSection = sectionByVariant(sections, "header_search");
  const iconsSection = sections.find((section) => section.layout_variant === "header_icons");

  const navItems = parseNavItems(categoryNav?.text);
  const topLinks = parseNavItems(topRight?.text, defaultTopLinks);
  const searchItems = parseList(searchSection?.text);
  const categories =
    searchItems.length > 1
      ? searchItems
      : ["Placas de video", "Procesadores", "Monitores", "Perifericos"];
  const placeholder =
    searchSection?.text && searchItems.length <= 1
      ? searchSection.text
      : "Buscar productos, marcas o SKU...";
  const showIcons = iconsSection?.visible !== false;
  const title = nav?.title || "COMETA G";
  const subtitle = nav?.subtitle || "Computacion Gamer";
  const groupedMenu = useMemo(() => {
    const groups = new Map<string, CategoryMenuItem[]>();
    for (const item of categoryMenu || []) {
      const current = groups.get(item.categoria) || [];
      current.push(item);
      groups.set(item.categoria, current);
    }

    return Array.from(groups.entries()).map(([category, items]) => ({
      category,
      total: items.reduce((sum, item) => sum + item.cantidad_productos, 0),
      items: items
        .filter((item) => item.subcategoria.toLowerCase() !== "ver todo")
        .filter((item) => item.subcategoria)
        .sort((a, b) => a.subcategoria.localeCompare(b.subcategoria))
    }));
  }, [categoryMenu]);
  const megaMenu = useMemo(() => {
    const byCategory = new Map(groupedMenu.map((group) => [group.category, group]));
    const usedCategories = new Set<string>();

    const roots = megaMenuRoots.map((root) => {
      const groups = root.categories
        .map((category) => byCategory.get(category))
        .filter(Boolean) as typeof groupedMenu;
      groups.forEach((group) => usedCategories.add(group.category));
      return { ...root, groups };
    });

    const uncategorized = groupedMenu.filter((group) => !usedCategories.has(group.category));
    const otherRoot = roots.find((root) => root.label === "Otros");
    if (otherRoot) {
      otherRoot.groups = [...otherRoot.groups, ...uncategorized];
    }

    return roots.filter((root) => root.groups.length > 0);
  }, [groupedMenu]);
  const selectedMegaRoot = megaMenu.find((root) => root.label === activeMegaRoot) || megaMenu[0];

  useEffect(() => {
    const cleaned = query.trim();
    if (cleaned.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: cleaned, limit: "6" });
        if (selectedCategory) params.set("categoria", selectedCategory);
        const response = await fetch(`/api/productos?${params.toString()}`, {
          signal: controller.signal
        });
        const payload = (await response.json()) as { data?: Product[] };
        setSuggestions(payload.data || []);
      } catch (error) {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query, selectedCategory]);

  return (
    <header className="sticky top-0 z-40 border-b border-comet-border bg-comet-black/95 font-sans backdrop-blur">
      <div className="border-b border-comet-border/70 bg-[#18040d]" style={sectionStyle(topLeft)}>
        <div className="mx-auto flex h-9 w-full max-w-7xl items-center justify-between px-4 text-xs text-zinc-300 sm:px-6 lg:px-8">
          <p className="truncate">
            {topLeft?.text || "Hardware gamer, preventas y componentes seleccionados para tu setup"}
          </p>
          <div className="hidden items-center gap-5 md:flex">
            {topLinks.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                className="inline-flex items-center gap-1.5 hover:text-white"
                style={sectionStyle(topRight)}
              >
                {index === 0 && <LocateFixed size={14} />}
                {index === 1 && <PackageCheck size={14} />}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid min-h-20 w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[260px_1fr_auto] lg:px-8">
        <Link href={nav?.link_url || "/"} className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-comet-panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="" className="h-full w-full object-cover" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-2xl font-black leading-none tracking-tight text-white" style={sectionStyle(nav)}>
              {title}<span className="text-comet-fuchsia">.</span>
            </span>
            <span className="block truncate text-xs font-semibold text-zinc-400">{subtitle}</span>
          </span>
        </Link>

        <div className="relative order-3 col-span-2 lg:order-none lg:col-span-1">
          <form action="/productos" className="flex h-12 overflow-hidden rounded-md border border-comet-fuchsia/70 bg-comet-panel">
            <input
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-zinc-500"
            />
            <select
              name="categoria"
              className="hidden border-l border-comet-border bg-comet-panel px-3 text-sm text-zinc-300 outline-none md:block"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              aria-label="Categoria"
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button className="grid h-12 w-14 place-items-center comet-gradient text-white" aria-label="Buscar" title="Buscar">
              <Search size={20} />
            </button>
          </form>

          {query.trim().length >= 3 && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-md border border-comet-border bg-[#09090d] shadow-2xl">
              {searching && <div className="px-4 py-3 text-sm text-zinc-400">Buscando...</div>}
              {!searching && suggestions.length === 0 && (
                <div className="px-4 py-3 text-sm text-zinc-400">Sin resultados para "{query.trim()}".</div>
              )}
              {!searching &&
                suggestions.map((product) => (
                  <Link
                    key={product.id}
                    href={`/producto/${product.slug}`}
                    onClick={() => {
                      setQuery("");
                      setSuggestions([]);
                    }}
                    className="grid grid-cols-[52px_1fr_auto] items-center gap-3 border-b border-comet-border px-3 py-3 last:border-b-0 hover:bg-white/5"
                  >
                    <span className="overflow-hidden rounded bg-comet-panel">
                      {product.imagen_principal ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imagen_principal} alt="" className="h-12 w-12 object-cover" />
                      ) : (
                        <span className="grid h-12 w-12 place-items-center text-xs font-black text-comet-fuchsia">G</span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-white">{product.nombre}</span>
                      <span className="block truncate text-xs text-zinc-500">
                        {product.marca} {product.sku ? `- ${product.sku}` : ""}
                      </span>
                    </span>
                    <span className="text-sm font-black text-white">
                      {formatQuickPrice(product.precio_oferta && product.precio_oferta > 0 ? product.precio_oferta : product.precio)}
                    </span>
                  </Link>
                ))}
            </div>
          )}
        </div>

        {showIcons && (
          <div className="flex items-center justify-end gap-2">
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
        )}
      </div>

      <nav className="hidden bg-gradient-to-r from-comet-red via-comet-fuchsia to-comet-violet lg:block">
        <div className="mx-auto flex h-12 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div
            className="relative mr-2"
            onMouseEnter={() => {
              setMegaOpen(true);
              if (!selectedMegaRoot && megaMenu[0]) setActiveMegaRoot(megaMenu[0].label);
            }}
            onMouseLeave={() => setMegaOpen(false)}
          >
            <button
              type="button"
              onClick={() => setMegaOpen((current) => !current)}
              className="inline-flex h-12 items-center gap-2 border-x border-white/15 px-4 text-sm font-black text-white transition hover:bg-black/15"
            >
              <Menu size={18} /> {categoryNav?.button_text || "Categorias"}
            </button>

            {megaOpen && selectedMegaRoot && (
              <div className="absolute left-0 top-12 z-50 w-[min(1120px,calc(100vw-48px))] overflow-hidden rounded-b-md border border-comet-border bg-[#08080c] shadow-2xl shadow-black/50">
                <div className="grid min-h-[360px] grid-cols-[230px_1fr]">
                  <div className="border-r border-comet-border bg-white/[0.03] py-3">
                    {megaMenu.map((root) => (
                      <button
                        key={root.label}
                        type="button"
                        onMouseEnter={() => setActiveMegaRoot(root.label)}
                        onFocus={() => setActiveMegaRoot(root.label)}
                        className={`flex w-full items-center justify-between px-5 py-3 text-left text-sm font-black transition ${
                          selectedMegaRoot.label === root.label
                            ? "bg-comet-fuchsia text-white"
                            : "text-zinc-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span>{root.label}</span>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                  </div>

                  <div className="max-h-[520px] overflow-y-auto bg-[#f2f3f5] p-5 text-zinc-900">
                    <div className="grid grid-cols-2 gap-x-10 gap-y-6 xl:grid-cols-4">
                      {selectedMegaRoot.groups.map((group) => (
                        <div key={group.category}>
                          <Link
                            href={buildCategoryHref(group)}
                            onClick={() => setMegaOpen(false)}
                            className="mb-2 block border-b border-zinc-300 pb-1 text-sm font-black text-zinc-800 hover:text-comet-fuchsia"
                          >
                            {group.category}
                          </Link>
                          <div className="space-y-1">
                            {group.items.map((item) => (
                              <Link
                                key={`${item.categoria}-${item.subcategoria}`}
                                href={item.link}
                                onClick={() => setMegaOpen(false)}
                                className="block rounded px-1 py-0.5 text-sm text-zinc-700 hover:bg-white hover:text-comet-fuchsia"
                              >
                                {item.subcategoria}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-12 items-center border-r border-white/15 px-4 text-sm font-black text-white transition hover:bg-black/15"
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
