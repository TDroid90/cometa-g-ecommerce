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
    const [sheetProducts, menuItems] = await Promise.all([
      readProductsFromGoogleSheets(),
      readCategoryMenuFromGoogleSheets().catch(() => null)
    ]);
    const baseProducts = sheetProducts?.length ? sheetProducts : seedProducts;
    const visibleProducts = baseProducts
      .filter(
        (product) =>
          product.visible &&
          isProductTaxonomyVisible(product, menuItems) &&
          !isProductHiddenFromStore(product)
      )
      .sort((a, b) => a.orden - b.orden);

    if (visibleProducts.length >= 100) return visibleProducts;

    return [...visibleProducts, ...generateDemoProducts(visibleProducts, 100)].sort(
      (a, b) => a.orden - b.orden
    );
  } catch (error) {
    console.error(error);
    const visibleProducts = seedProducts
      .filter((product) => product.visible && !isProductHiddenFromStore(product))
      .sort((a, b) => a.orden - b.orden);

    return [...visibleProducts, ...generateDemoProducts(visibleProducts, 100)].sort(
      (a, b) => a.orden - b.orden
    );
  }
}

function normalizeProductText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function isProductHiddenFromStore(product: Product): boolean {
  const text = normalizeProductText(
    [
      product.nombre,
      product.sku,
      product.descripcion_corta,
      product.descripcion_larga,
      product.categoria,
      product.subcategoria,
      product.marca,
      ...product.tags,
      ...Object.entries(product.atributos || {}).flat()
    ]
      .filter(Boolean)
      .join(" ")
  );
  const hasImage = Boolean(product.imagen_principal?.trim());
  const isOutlet = /\bOUTLET\b|CONDICION\s+OUTLET/.test(text);
  const isKit = /\bKIT\b/.test(text);
  const isCaseWithPsu =
    /\bGABINETE\b/.test(text) &&
    (/\bFUENTE\b/.test(text) || /\bPSU\b/.test(text) || /\b[2-9][0-9]{2,3}\s*W\b/.test(text));

  return !hasImage || isOutlet || isKit || isCaseWithPsu;
}

export function isProductTaxonomyVisible(
  product: Product,
  menuItems: CategoryMenuItem[] | null
): boolean {
  const categoryItems = (menuItems || []).filter(
    (item) => item.tipo !== "marca" && item.categoria === product.categoria
  );
  if (!menuItems?.length) return true;
  if (!categoryItems.length) return false;

  const exact = categoryItems.find(
    (item) => item.subcategoria === (product.subcategoria || "")
  );
  if (exact) return exact.visible;

  const categoryRoot = categoryItems.find((item) => !item.subcategoria);
  if (categoryRoot) return categoryRoot.visible;

  return categoryItems.some((item) => item.visible);
}

export function formatStockQuantity(stock: number, noun = "unidades"): string {
  if (stock > 10) return `+10 ${noun}`;
  return `${Math.max(0, stock)} ${noun}`;
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

    const brandCounts = new Map<string, number>();
    for (const product of visibleProducts) {
      if (!product.marca) continue;
      brandCounts.set(product.marca, (brandCounts.get(product.marca) || 0) + 1);
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
        visible: true,
        tipo: "categoria" as const
      };
    });

    const allowedSheetBrands = items?.length
      ? new Set(
          items
            .filter((item) => item.tipo === "marca" && item.visible)
            .map((item) => item.subcategoria.toUpperCase())
        )
      : null;

    const dynamicBrandItems = Array.from(brandCounts.entries())
      .filter(([brand]) => !allowedSheetBrands || allowedSheetBrands.has(brand.toUpperCase()))
      .map(([brand, count]) => ({
      categoria: "Marcas",
      subcategoria: brand,
      cantidad_productos: count,
      link: `/productos?marca=${encodeURIComponent(brand)}`,
      orden: 998,
      visible: true,
      tipo: "marca" as const
    }));

    if (!items?.length) {
      return [...dynamicItems, ...dynamicBrandItems].sort(
        (a, b) => a.orden - b.orden || a.categoria.localeCompare(b.categoria) || a.subcategoria.localeCompare(b.subcategoria)
      );
    }

    const sheetItems = items
      .map((item) => {
        const key = `${item.categoria}|||${item.subcategoria}`;
        return { ...item, cantidad_productos: counts.get(key) || 0 };
      })
      .filter((item) => item.visible && item.cantidad_productos > 0)
      .sort((a, b) => a.orden - b.orden || a.categoria.localeCompare(b.categoria) || a.subcategoria.localeCompare(b.subcategoria));

    return [...sheetItems, ...dynamicBrandItems].sort(
      (a, b) => a.orden - b.orden || a.categoria.localeCompare(b.categoria) || a.subcategoria.localeCompare(b.subcategoria)
    );
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getProducts();
  const normalizedSlug = normalizeSlugLookup(slug);
  return products.find((product) => normalizeSlugLookup(product.slug) === normalizedSlug);
}

function normalizeSlugLookup(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  return decoded
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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
    const matchesBrand = !filters.marca || product.marca?.toLowerCase() === filters.marca.toLowerCase();
    const matchesAvailability =
      !filters.disponibilidad ||
      filters.disponibilidad === "todos" ||
      product.stock_status === filters.disponibilidad;
    const matchesOffer =
      !filters.oferta ||
      product.oferta ||
      Boolean(product.precio_oferta && product.precio_oferta > 0);
    const matchesPreventa = !filters.preventa || product.preventa;
    const matchesMin = !filters.minPrice || price >= filters.minPrice;
    const matchesMax = !filters.maxPrice || price <= filters.maxPrice;

    return (
      matchesQuery &&
      matchesCategory &&
      matchesSubcategory &&
      matchesBrand &&
      matchesAvailability &&
      matchesOffer &&
      matchesPreventa &&
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
    const target = section.category_filter.toLowerCase();
    scoped = scoped.filter(
      (product) =>
        product.categoria?.toLowerCase() === target ||
        product.subcategoria?.toLowerCase() === target
    );
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
