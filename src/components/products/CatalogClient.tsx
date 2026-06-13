"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Product } from "@/lib/types";
import { filterProducts, productPrice, uniqueValues } from "@/lib/data";
import { ProductGrid } from "@/components/products/ProductGrid";

export function CatalogClient({
  products,
  initialCategory,
  initialAvailability
}: {
  products: Product[];
  initialCategory?: string;
  initialAvailability?: string;
}) {
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState(initialCategory || "");
  const [marca, setMarca] = useState("");
  const [disponibilidad, setDisponibilidad] = useState(initialAvailability || "todos");
  const [maxPrice, setMaxPrice] = useState("");
  const categories = uniqueValues(products, "categoria");
  const brands = uniqueValues(products, "marca");
  const highestPrice = Math.max(...products.map(productPrice), 0);

  const filtered = useMemo(
    () =>
      filterProducts(products, {
        query,
        categoria: categoria || undefined,
        marca: marca || undefined,
        disponibilidad: disponibilidad as "todos" | "disponible" | "sin_stock" | "preventa",
        maxPrice: maxPrice ? Number(maxPrice) : undefined
      }),
    [products, query, categoria, marca, disponibilidad, maxPrice]
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-comet-fuchsia">Catalogo</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Productos gamer</h1>
      </div>

      <div className="mb-6 grid gap-3 rounded-lg border border-comet-border bg-comet-panel p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
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
          onChange={(event) => setCategoria(event.target.value)}
          className="h-11 rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
        >
          <option value="">Todas las categorias</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={marca}
          onChange={(event) => setMarca(event.target.value)}
          className="h-11 rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
        >
          <option value="">Todas las marcas</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
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
      </div>

      <div className="mb-5 flex items-center justify-between text-sm text-zinc-400">
        <span>{filtered.length} productos encontrados</span>
        <button
          onClick={() => {
            setQuery("");
            setCategoria("");
            setMarca("");
            setDisponibilidad("todos");
            setMaxPrice("");
          }}
          className="font-bold text-zinc-300 hover:text-white"
        >
          Limpiar filtros
        </button>
      </div>

      <ProductGrid products={filtered} />
    </div>
  );
}
