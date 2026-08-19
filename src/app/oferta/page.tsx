import { CatalogClient } from "@/components/products/CatalogClient";
import { getProducts } from "@/lib/data";

export default async function OfferPage() {
  const products = await getProducts();

  return (
    <CatalogClient
      products={products}
      pageTitle="OFERTAS 🔥"
      initialOffer
      requiredOffer
      filtersPlacement="sidebar"
    />
  );
}
