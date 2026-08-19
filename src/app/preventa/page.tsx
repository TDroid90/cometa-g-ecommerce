import { CatalogClient } from "@/components/products/CatalogClient";
import { getProducts } from "@/lib/data";

export default async function PreorderPage() {
  const products = await getProducts();

  return (
    <CatalogClient
      products={products}
      pageTitle="LO QUE VIENE EN CAMINO 🚀"
      initialAvailability="preventa"
      initialPreventa
      requiredPreventa
      filtersPlacement="sidebar"
    />
  );
}
