"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Product } from "@/lib/types";
import { filterProducts, productPrice, uniqueValues } from "@/lib/data";
import { ProductGrid } from "@/components/products/ProductGrid";

export function CatalogClient({
  products,
  pageTitle,
  initialQuery,
  initialCategory,
  initialSubcategory,
  initialBrand,
  initialAvailability,
  initialOffer,
  initialPreventa,
  requiredOffer = false,
  requiredPreventa = false,
  filtersPlacement = "top"
}: {
  products: Product[];
  pageTitle?: string;
  initialQuery?: string;
  initialCategory?: string;
  initialSubcategory?: string;
  initialBrand?: string;
  initialAvailability?: string;
  initialOffer?: boolean;
  initialPreventa?: boolean;
  requiredOffer?: boolean;
  requiredPreventa?: boolean;
  filtersPlacement?: "top" | "sidebar";
}) {
  const [query, setQuery] = useState(initialQuery || "");
  const [categoria, setCategoria] = useState(initialCategory || "");
  const [subcategoria, setSubcategoria] = useState(initialSubcategory || "");
  const [marca, setMarca] = useState(initialBrand || "");
  const [disponibilidad, setDisponibilidad] = useState(initialAvailability || "todos");
  const [oferta, setOferta] = useState(Boolean(initialOffer));
  const [preventa, setPreventa] = useState(Boolean(initialPreventa));
  const [maxPrice, setMaxPrice] = useState("");
  const highestPrice = Math.max(...products.map(productPrice), 0);
  const effectiveOffer = requiredOffer || oferta;
  const effectivePreventa = requiredPreventa || preventa;

  useEffect(() => {
    setQuery(initialQuery || "");
    setCategoria(initialCategory || "");
    setSubcategoria(initialSubcategory || "");
    setMarca(initialBrand || "");
    setDisponibilidad(initialAvailability || "todos");
    setOferta(Boolean(initialOffer));
    setPreventa(Boolean(initialPreventa));
    setMaxPrice("");
  }, [initialQuery, initialCategory, initialSubcategory, initialBrand, initialAvailability, initialOffer, initialPreventa]);

  const optionFilters = {
    query,
    disponibilidad: disponibilidad as "todos" | "disponible" | "sin_stock" | "preventa",
    oferta: effectiveOffer,
    preventa: effectivePreventa,
    maxPrice: maxPrice ? Number(maxPrice) : undefined
  };
  const categoryProducts = useMemo(
    () => filterProducts(products, optionFilters),
    [products, query, disponibilidad, effectiveOffer, effectivePreventa, maxPrice]
  );
  const categories = uniqueValues(categoryProducts, "categoria");
  const subcategoryProducts = useMemo(
    () => filterProducts(products, { ...optionFilters, categoria: categoria || undefined }),
    [products, query, categoria, disponibilidad, effectiveOffer, effectivePreventa, maxPrice]
  );
  const subcategories = Array.from(
    new Set(subcategoryProducts.map((product) => product.subcategoria).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));
  const brandProducts = useMemo(
    () => filterProducts(products, { ...optionFilters, categoria: categoria || undefined, subcategoria: subcategoria || undefined }),
    [products, query, categoria, subcategoria, disponibilidad, effectiveOffer, effectivePreventa, maxPrice]
  );
  const brands = uniqueValues(brandProducts, "marca");

  const filtered = useMemo(
    () =>
      filterProducts(products, {
        query,
        categoria: categoria || undefined,
        subcategoria: subcategoria || undefined,
        marca: marca || undefined,
        disponibilidad: disponibilidad as "todos" | "disponible" | "sin_stock" | "preventa",
        oferta: effectiveOffer,
        preventa: effectivePreventa,
        maxPrice: maxPrice ? Number(maxPrice) : undefined
      }),
    [products, query, categoria, subcategoria, marca, disponibilidad, effectiveOffer, effectivePreventa, maxPrice]
  );

  useEffect(() => {
    if (categoria && !categories.includes(categoria)) setCategoria("");
  }, [categoria, categories]);

  useEffect(() => {
    if (subcategoria && !subcategories.includes(subcategoria)) setSubcategoria("");
  }, [subcategoria, subcategories]);

  useEffect(() => {
    if (marca && !brands.includes(marca)) setMarca("");
  }, [marca, brands]);

  const clearFilters = () => {
    setQuery("");
    setCategoria("");
    setSubcategoria("");
    setMarca("");
    setDisponibilidad("todos");
    if (!requiredOffer) setOferta(false);
    if (!requiredPreventa) setPreventa(false);
    setMaxPrice("");
  };

  const filterControls = (
    <>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={17} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, SKU o marca"
          className="h-11 w-full rounded-md border border-comet-border bg-comet-black pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-comet-fuchsia"
        />
      </label>

      <select
        value={categoria}
        onChange={(event) => {
          setCategoria(event.target.value);
          setSubcategoria("");
          setMarca("");
        }}
        className="h-11 rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
      >
        <option value="">Todas las categorias</option>
        {categories.map((category) => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>

      <select
        value={subcategoria}
        onChange={(event) => {
          setSubcategoria(event.target.value);
          setMarca("");
        }}
        className="h-11 rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
      >
        <option value="">Subcategorias</option>
        {subcategories.map((subcategory) => (
          <option key={subcategory} value={subcategory}>{subcategory}</option>
        ))}
      </select>

      <select
        value={marca}
        onChange={(event) => setMarca(event.target.value)}
        className="h-11 rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
      >
        <option value="">Todas las marcas</option>
        {brands.map((brand) => (
          <option key={brand} value={brand}>{brand}</option>
        ))}
      </select>

      <select
        value={disponibilidad}
        onChange={(event) => setDisponibilidad(event.target.value)}
        className="h-11 rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
      >
        <option value="todos">Disponibilidad</option>
        <option value="disponible">Disponible</option>
        <option value="preventa">Preventa</option>
        <option value="sin_stock">Sin stock</option>
      </select>

      <input
        value={maxPrice}
        onChange={(event) => setMaxPrice(event.target.value)}
        type="number"
        min={0}
        max={highestPrice}
        placeholder="Precio max."
        className="h-11 rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-comet-fuchsia"
      />

      {!requiredOffer && (
        <label className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-comet-border bg-comet-black px-3 text-sm font-bold text-white">
          <input type="checkbox" checked={oferta} onChange={(event) => setOferta(event.target.checked)} className="accent-comet-fuchsia" />
          Oferta
        </label>
      )}
    </>
  );

  const filters = (
    <div className={`grid gap-3 rounded-lg border border-comet-border bg-comet-panel p-4 ${filtersPlacement === "sidebar" ? "grid-cols-1" : "md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto]"}`}>
      {filterControls}
      {filtersPlacement === "sidebar" && (
        <button onClick={clearFilters} className="h-11 rounded-md border border-comet-border text-sm font-bold text-zinc-300 hover:border-comet-fuchsia hover:text-white">
          Limpiar filtros
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-comet-fuchsia">Catalogo</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">{pageTitle || "Productos gamer"}</h1>
      </div>

      {filtersPlacement === "top" ? (
        <>
          <div className="mb-6">{filters}</div>
          <div className="mb-5 flex items-center justify-between text-sm text-zinc-400">
            <span>{filtered.length} productos encontrados</span>
            <button onClick={clearFilters} className="font-bold text-zinc-300 hover:text-white">Limpiar filtros</button>
          </div>
          <ProductGrid products={filtered} />
        </>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-28">{filters}</aside>
          <div>
            <div className="mb-5 flex items-center justify-between text-sm text-zinc-400">
              <span>{filtered.length} productos encontrados</span>
            </div>
            <ProductGrid products={filtered} />
          </div>
        </div>
      )}
    </div>
  );
}
