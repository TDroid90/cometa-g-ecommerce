import { Product } from "@/lib/types";
import { ProductCard } from "@/components/products/ProductCard";

export function ProductGrid({
  products,
  desktopColumns = 4,
  mobileColumns = 2
}: {
  products: Product[];
  desktopColumns?: number;
  mobileColumns?: number;
}) {
  const mobileClass = mobileColumns === 1 ? "grid-cols-1" : "grid-cols-2";
  const desktopClass =
    desktopColumns === 2
      ? "lg:grid-cols-2"
      : desktopColumns === 3
        ? "lg:grid-cols-3"
        : desktopColumns === 5
          ? "lg:grid-cols-5"
          : "lg:grid-cols-4";

  return (
    <div className={`grid ${mobileClass} gap-3 sm:gap-4 md:grid-cols-3 ${desktopClass}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
