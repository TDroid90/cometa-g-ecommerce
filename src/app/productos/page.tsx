import { CatalogClient } from "@/components/products/CatalogClient";
import { getProducts } from "@/lib/data";

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; categoria?: string; subcategoria?: string; marca?: string; disponibilidad?: string; oferta?: string }>;
}) {
  const [products, params] = await Promise.all([getProducts(), searchParams]);
  const offerPage = params.oferta === "true" || params.oferta === "1";
  const pageTitle = offerPage
    ? "OFERTAS 🔥"
    : params.disponibilidad === "preventa"
      ? "LO QUE VIENE EN CAMINO 🚀"
      : "Productos gamer";

  return (
    <CatalogClient
      products={products}
      pageTitle={pageTitle}
      initialQuery={params.q}
      initialCategory={params.categoria}
      initialSubcategory={params.subcategoria}
      initialBrand={params.marca}
      initialAvailability={params.disponibilidad}
      initialOffer={offerPage}
    />
  );
}
