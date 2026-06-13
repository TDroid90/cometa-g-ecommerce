import { DynamicSectionRenderer } from "@/components/sections/DynamicSectionRenderer";
import { getLayoutSections, getProducts } from "@/lib/data";

export default async function HomePage() {
  const [sections, products] = await Promise.all([getLayoutSections(), getProducts()]);
  const bodySections = sections.filter((section) => section.area === "body");

  return <DynamicSectionRenderer sections={bodySections} products={products} />;
}
