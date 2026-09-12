import { CatalogClient } from "@/components/products/CatalogClient";
import { getProducts } from "@/lib/data";

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; categoria?: string; subcategoria?: string; marca?: string; disponibilidad?: string; oferta?: string; orden?: string; filtro?: string }>;
}) {
  const [products, params] = await Promise.all([getProducts(), searchParams]);
  const offerPage = params.oferta === "true" || params.oferta === "1";
  const pageTitle = offerPage
    ? "OFERTAS 🔥"
    : params.disponibilidad === "preventa"
      ? "LO QUE VIENE EN CAMINO 🚀"
      : "Productos gamer";

  const catalogStateKey = [
    params.q,
    params.categoria,
    params.subcategoria,
    params.marca,
    params.disponibilidad,
    params.orden,
    params.filtro,
    offerPage ? "oferta" : ""
  ].join("|");

  return (
    <CatalogClient
      key={catalogStateKey}
      products={products}
      pageTitle={pageTitle}
      initialQuery={params.q}
      initialCategory={params.categoria}
      initialSubcategory={params.subcategoria}
      initialBrand={params.marca}
      initialAvailability={params.disponibilidad}
      initialSort={params.orden === "price_asc" || params.orden === "price_desc" ? params.orden : "default"}
      initialTechnicalFilter={params.filtro}
      initialOffer={offerPage}
    />
  );
}
