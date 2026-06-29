"use client";

import { useMemo, useState } from "react";
import { ProductGrid } from "@/components/products/ProductGrid";
import { sectionProducts } from "@/lib/data";
import { LayoutSection, Product } from "@/lib/types";

export function ProductTabsClient({
  section,
  products,
  tabs
}: {
  section: LayoutSection;
  products: Product[];
  tabs: string[][];
}) {
  const initialIndex = Math.max(0, tabs.findIndex((tab) => tab[2]?.toLowerCase() === "active"));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activeTab = tabs[activeIndex] || tabs[0] || [section.title || "Productos", "destacado"];

  const scopedProducts = useMemo(() => {
    const requestedFilter = activeTab?.[1] || section.taxonomies_filter || "destacado";
    const taxonomyFilters = new Set(["destacado", "nuevo", "latest", "oferta", "sale", "preventa"]);
    return sectionProducts(
      {
        ...section,
        taxonomies_filter: taxonomyFilters.has(requestedFilter.toLowerCase()) ? requestedFilter : "",
        category_filter: taxonomyFilters.has(requestedFilter.toLowerCase()) ? section.category_filter : requestedFilter
      },
      products
    ).slice(0, 10);
  }, [activeTab, products, section]);
  const activeLabel = activeTab?.[0] || section.title || "Productos";

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-center gap-7 border-b border-comet-border">
        {tabs.map(([label], index) => (
          <button
            key={`${label}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`relative pb-4 text-lg transition ${label.toLowerCase().includes("muebles") ? "hidden sm:inline-block" : ""} ${
              index === activeIndex ? "font-black text-white" : "font-medium text-zinc-400 hover:text-white"
            }`}
          >
            {label}
            {index === activeIndex && (
              <>
                <span className="absolute bottom-0 left-0 h-0.5 w-full comet-gradient" />
                <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-comet-fuchsia" />
              </>
            )}
          </button>
        ))}
      </div>
      {scopedProducts.length > 0 ? (
        <ProductGrid products={scopedProducts} desktopColumns={section.desktop_columns || 5} mobileColumns={section.mobile_columns || 2} />
      ) : (
        <div className="rounded-lg border border-comet-border bg-comet-card px-5 py-8 text-center text-sm font-semibold text-zinc-400">
          Todavia no hay productos activos en {activeLabel}.
        </div>
      )}
    </section>
  );
}
