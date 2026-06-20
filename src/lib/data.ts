import { readCategoryMenuFromGoogleSheets, readLayoutFromGoogleSheets, readProductsFromGoogleSheets } from "@/lib/googleSheets";
import { generateDemoProducts } from "@/lib/demoProducts";
import { seedLayout, seedProducts } from "@/lib/seedData";
import { CategoryMenuItem, LayoutSection, Product, ProductFilters } from "@/lib/types";

export async function getLayoutSections(): Promise<LayoutSection[]> {
  try {
    const sheetLayout = await readLayoutFromGoogleSheets();
    return (sheetLayout?.length ? sheetLayout : seedLayout)
      .filter((section) => section.visible)
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error(error);
    return seedLayout.filter((section) => section.visible).sort((a, b) => a.order - b.order);
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const sheetProducts = await readProductsFromGoogleSheets();
    const baseProducts = sheetProducts?.length ? sheetProducts : seedProducts;
    const visibleProducts = baseProducts
      .filter((product) => product.visible)
      .sort((a, b) => a.orden - b.orden);

    if (visibleProducts.length >= 100) return visibleProducts;

    return [...visibleProducts, ...generateDemoProducts(visibleProducts, 100)].sort(
      (a, b) => a.orden - b.orden
    );
  } catch (error) {
    console.error(error);
    const visibleProducts = seedProducts
      .filter((product) => product.visible)
      .sort((a, b) => a.orden - b.orden);

    return [...visibleProducts, ...generateDemoProducts(visibleProducts, 100)].sort(
      (a, b) => a.orden - b.orden
    );
  }
}

export async function getCategoryMenu(): Promise<CategoryMenuItem[]> {
  try {
    const [items, products] = await Promise.all([readCategoryMenuFromGoogleSheets(), getProducts()]);
    const visibleProducts = products.filter((product) => product.visible && product.stock > 1);
    const counts = new Map<string, number>();

    for (const product of visibleProducts) {
      if (!product.categoria) continue;
      const subcategory = product.subcategoria || "";
      const key = `${product.categoria}|||${subcategory}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const dynamicItems = Array.from(counts.entries()).map(([key, count]) => {
      const [categoria, subcategoria] = key.split("|||");
      const params = new URLSearchParams({ categoria });
      if (subcategoria) params.set("subcategoria", subcategoria);
      return {
        categoria,
        subcategoria,
        cantidad_productos: count,
        link: `/productos?${params.toString()}`,
        orden: 999,
        visible: true
      };
    });

    if (!items?.length) {
      return dynamicItems.sort((a, b) => a.categoria.localeCompare(b.categoria) || a.subcategoria.localeCompare(b.subcategoria));
    }

    return items
      .map((item) => {
        const key = `${item.categoria}|||${item.subcategoria}`;
        return { ...item, cantidad_productos: counts.get(key) || 0 };
      })
      .filter((item) => item.visible && item.cantidad_productos > 0)
      .sort((a, b) => a.orden - b.orden || a.categoria.localeCompare(b.categoria) || a.subcategoria.localeCompare(b.subcategoria));
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((product) => product.slug === slug);
}

export function productPrice(product: Product): number {
  return product.precio_oferta && product.precio_oferta > 0 ? product.precio_oferta : product.precio;
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  const query = filters.query?.toLowerCase().trim();

  return products.filter((product) => {
    const price = productPrice(product);
    const normalizedCategory = filters.categoria?.toLowerCase();
    const normalizedSubcategory = filters.subcategoria?.toLowerCase();
    const matchesQuery =
      !query ||
      [product.nombre, product.descripcion_corta, product.sku, product.categoria, product.marca]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);

    const matchesCategory =
      !normalizedCategory ||
      product.categoria?.toLowerCase() === normalizedCategory ||
      product.subcategoria?.toLowerCase() === normalizedCategory;
    const matchesSubcategory = !normalizedSubcategory || product.subcategoria?.toLowerCase() === normalizedSubcategory;
    const matchesBrand = !filters.marca || product.marca === filters.marca;
    const matchesAvailability =
      !filters.disponibilidad ||
      filters.disponibilidad === "todos" ||
      product.stock_status === filters.disponibilidad;
    const matchesOffer =
      !filters.oferta ||
      product.oferta ||
      Boolean(product.precio_oferta && product.precio_oferta > 0);
    const matchesMin = !filters.minPrice || price >= filters.minPrice;
    const matchesMax = !filters.maxPrice || price <= filters.maxPrice;

    return (
      matchesQuery &&
      matchesCategory &&
      matchesSubcategory &&
      matchesBrand &&
      matchesAvailability &&
      matchesOffer &&
      matchesMin &&
      matchesMax
    );
  });
}

export function sectionProducts(section: LayoutSection, products: Product[]): Product[] {
  let scoped = products;

  if (section.taxonomies_filter === "destacado") {
    scoped = scoped.filter((product) => product.destacado);
  }

  if (section.taxonomies_filter === "nuevo" || section.taxonomies_filter === "latest") {
    scoped = scoped.filter((product) => product.nuevo).sort((a, b) => b.orden - a.orden);
  }

  if (section.taxonomies_filter === "oferta" || section.taxonomies_filter === "sale") {
    scoped = scoped.filter((product) => product.oferta || Boolean(product.precio_oferta && product.precio_oferta > 0));
  }

  if (section.taxonomies_filter === "preventa") {
    scoped = scoped.filter((product) => product.preventa);
  }

  if (section.category_filter) {
    scoped = scoped.filter((product) => product.categoria === section.category_filter);
  }

  if (section.brand_filter) {
    scoped = scoped.filter((product) => product.marca === section.brand_filter);
  }

  return scoped;
}

export function uniqueValues(products: Product[], key: "categoria" | "marca"): string[] {
  return Array.from(new Set(products.map((product) => product[key]).filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b));
}
