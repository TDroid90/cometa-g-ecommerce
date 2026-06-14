import { CatalogClient } from "@/components/products/CatalogClient";
import { getProducts } from "@/lib/data";

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; categoria?: string; disponibilidad?: string }>;
}) {
  const [products, params] = await Promise.all([getProducts(), searchParams]);

  return (
    <CatalogClient
      products={products}
      initialQuery={params.q}
      initialCategory={params.categoria}
      initialAvailability={params.disponibilidad}
    />
  );
}
