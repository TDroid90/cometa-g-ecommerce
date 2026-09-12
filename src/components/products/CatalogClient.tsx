"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Product } from "@/lib/types";
import { filterProducts, productPrice, uniqueValues } from "@/lib/data";
import { ProductGrid } from "@/components/products/ProductGrid";

type CatalogSort = "default" | "price_asc" | "price_desc";

function normalizeFilterText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function productFilterText(product: Product): string {
  return normalizeFilterText(
    [
      product.nombre,
      product.categoria,
      product.subcategoria,
      product.descripcion_corta,
      product.descripcion_larga,
      ...Object.entries(product.atributos || {}).flat()
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function technicalFilterOptions(category: string, subcategory: string) {
  const taxonomy = normalizeFilterText(`${category} ${subcategory}`);
  if (/almacenamiento|disco.*ssd/.test(taxonomy)) {
    return [
      { value: "storage_m2", label: "M.2 / NVMe" },
      { value: "storage_sata", label: "SATA" }
    ];
  }
  if (/teclado/.test(taxonomy)) {
    return [
      { value: "keyboard_mechanical", label: "Mecánico" },
      { value: "keyboard_semi", label: "Semi-mecánico" },
      { value: "keyboard_membrane", label: "Membrana" }
    ];
  }
  return [];
}

function matchesTechnicalFilter(product: Product, filter: string): boolean {
  if (!filter) return true;
  const text = productFilterText(product);
  if (filter === "storage_m2") return /\bssd\b/.test(text) && (/\bnvme\b/.test(text) || /\bm\.?\s*2\b/.test(text));
  if (filter === "storage_sata") return /\bssd\b/.test(text) && /\bsata\b|2\.5/.test(text);
  if (filter === "keyboard_semi") return /semi[ -]?mecanic/.test(text);
  if (filter === "keyboard_mechanical") return /\bmecanic/.test(text) && !/semi[ -]?mecanic/.test(text);
  if (filter === "keyboard_membrane") return /\bmembrana\b|\bmembrane\b/.test(text);
  return true;
}

export function CatalogClient({
  products,
  pageTitle,
  initialQuery,
  initialCategory,
  initialSubcategory,
  initialBrand,
  initialAvailability,
  initialSort,
  initialTechnicalFilter,
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
  initialSort?: CatalogSort;
  initialTechnicalFilter?: string;
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
  const [sortOrder, setSortOrder] = useState<CatalogSort>(initialSort || "default");
  const [technicalFilter, setTechnicalFilter] = useState(initialTechnicalFilter || "");
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
    setSortOrder(initialSort || "default");
    setTechnicalFilter(initialTechnicalFilter || "");
  }, [initialQuery, initialCategory, initialSubcategory, initialBrand, initialAvailability, initialOffer, initialPreventa, initialSort, initialTechnicalFilter]);

  const optionFilters = {
    query,
    disponibilidad: disponibilidad as "todos" | "disponible" | "sin_stock" | "preventa",
    oferta: effectiveOffer,
    preventa: effectivePreventa
  };
  const categoryProducts = useMemo(
    () => filterProducts(products, optionFilters),
    [products, query, disponibilidad, effectiveOffer, effectivePreventa]
  );
  const categories = uniqueValues(categoryProducts, "categoria");
  const subcategoryProducts = useMemo(
    () => filterProducts(products, { ...optionFilters, categoria: categoria || undefined }),
    [products, query, categoria, disponibilidad, effectiveOffer, effectivePreventa]
  );
  const subcategories = Array.from(
    new Set(subcategoryProducts.map((product) => product.subcategoria).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));
  const brandProducts = useMemo(
    () => filterProducts(products, { ...optionFilters, categoria: categoria || undefined, subcategoria: subcategoria || undefined }),
    [products, query, categoria, subcategoria, disponibilidad, effectiveOffer, effectivePreventa]
  );
  const brands = uniqueValues(brandProducts, "marca");

  const activeTechnicalOptions = useMemo(
    () => technicalFilterOptions(categoria, subcategoria),
    [categoria, subcategoria]
  );

  const filtered = useMemo(() => {
    const matches = filterProducts(products, {
        query,
        categoria: categoria || undefined,
        subcategoria: subcategoria || undefined,
        marca: marca || undefined,
        disponibilidad: disponibilidad as "todos" | "disponible" | "sin_stock" | "preventa",
        oferta: effectiveOffer,
        preventa: effectivePreventa
      }).filter((product) => matchesTechnicalFilter(product, technicalFilter));
    if (sortOrder === "price_asc") return matches.sort((left, right) => productPrice(left) - productPrice(right));
    if (sortOrder === "price_desc") return matches.sort((left, right) => productPrice(right) - productPrice(left));
    return matches;
  }, [products, query, categoria, subcategoria, marca, disponibilidad, effectiveOffer, effectivePreventa, technicalFilter, sortOrder]);

  useEffect(() => {
    if (categoria && !categories.includes(categoria)) setCategoria("");
  }, [categoria, categories]);

  useEffect(() => {
    if (subcategoria && !subcategories.includes(subcategoria)) setSubcategoria("");
  }, [subcategoria, subcategories]);

  useEffect(() => {
    if (marca && !brands.includes(marca)) setMarca("");
  }, [marca, brands]);

  useEffect(() => {
    if (technicalFilter && !activeTechnicalOptions.some((option) => option.value === technicalFilter)) {
      setTechnicalFilter("");
    }
  }, [technicalFilter, activeTechnicalOptions]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (categoria) params.set("categoria", categoria);
    if (subcategoria) params.set("subcategoria", subcategoria);
    if (marca) params.set("marca", marca);
    if (disponibilidad !== "todos") params.set("disponibilidad", disponibilidad);
    if (effectiveOffer && !requiredOffer) params.set("oferta", "1");
    if (effectivePreventa && !requiredPreventa) params.set("preventa", "1");
    if (sortOrder !== "default") params.set("orden", sortOrder);
    if (technicalFilter) params.set("filtro", technicalFilter);
    const queryString = params.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [query, categoria, subcategoria, marca, disponibilidad, effectiveOffer, effectivePreventa, requiredOffer, requiredPreventa, sortOrder, technicalFilter]);

  const clearFilters = () => {
    setQuery("");
    setCategoria("");
    setSubcategoria("");
    setMarca("");
    setDisponibilidad("todos");
    if (!requiredOffer) setOferta(false);
    if (!requiredPreventa) setPreventa(false);
    setSortOrder("default");
    setTechnicalFilter("");
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
          setTechnicalFilter("");
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
          setTechnicalFilter("");
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

      {activeTechnicalOptions.length > 0 && (
        <select
          value={technicalFilter}
          onChange={(event) => setTechnicalFilter(event.target.value)}
          className="h-11 rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
        >
          <option value="">Características</option>
          {activeTechnicalOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      )}

      <select
        value={sortOrder}
        onChange={(event) => setSortOrder(event.target.value as CatalogSort)}
        className="h-11 rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-comet-fuchsia"
      >
        <option value="default">Ordenar por</option>
        <option value="price_asc">Precio: menor a mayor</option>
        <option value="price_desc">Precio: mayor a menor</option>
      </select>

      {!requiredOffer && (
        <label className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-comet-border bg-comet-black px-3 text-sm font-bold text-white">
          <input type="checkbox" checked={oferta} onChange={(event) => setOferta(event.target.checked)} className="accent-comet-fuchsia" />
          Oferta
        </label>
      )}
    </>
  );

  const filters = (
    <div className={`grid gap-3 rounded-lg border border-comet-border bg-comet-panel p-4 ${filtersPlacement === "sidebar" ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-4"}`}>
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
