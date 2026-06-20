import { CatalogClient } from "@/components/products/CatalogClient";
import { getProducts } from "@/lib/data";

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; categoria?: string; subcategoria?: string; disponibilidad?: string; oferta?: string }>;
}) {
  const [products, params] = await Promise.all([getProducts(), searchParams]);

  return (
    <CatalogClient
      products={products}
      initialQuery={params.q}
      initialCategory={params.categoria}
      initialSubcategory={params.subcategoria}
      initialAvailability={params.disponibilidad}
      initialOffer={params.oferta === "true" || params.oferta === "1"}
    />
  );
}
