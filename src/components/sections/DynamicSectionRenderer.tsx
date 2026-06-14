import Image from "next/image";
import Link from "next/link";
import { LayoutSection, Product } from "@/lib/types";
import { ProductGrid } from "@/components/products/ProductGrid";
import { sectionProducts, uniqueValues } from "@/lib/data";

export function DynamicSectionRenderer({
  sections,
  products
}: {
  sections: LayoutSection[];
  products: Product[];
}) {
  return (
    <div className="bg-[#f3f4f6]">
      {sections.map((section) => (
        <Section key={section.section_id} section={section} products={products} />
      ))}
    </div>
  );
}

function Section({ section, products }: { section: LayoutSection; products: Product[] }) {
  switch (section.section_type) {
    case "main_banner":
      return <MainBanner section={section} />;
    case "promo_strip":
      return <PromoStrip section={section} />;
    case "category_grid":
      return <CategoryGrid section={section} products={products} />;
    case "product_grid":
    case "carousel":
      return <ProductSection section={section} products={products} />;
    case "text_block":
      return <TextBlock section={section} />;
    default:
      return null;
  }
}

function SectionHeader({ section }: { section: LayoutSection }) {
  if (!section.title && !section.subtitle) return null;

  return (
    <div className="mb-5 flex flex-col gap-2 border-b border-zinc-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {section.title && <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900">{section.title}</h2>}
        <div className="mt-2 h-1 w-24 rounded-full comet-gradient" />
        {section.subtitle && <p className="mt-2 text-sm font-medium text-zinc-500">{section.subtitle}</p>}
      </div>
      {section.link_url && section.button_text && (
        <Link href={section.link_url} className="text-sm font-black text-comet-fuchsia hover:text-comet-red">
          {section.button_text}
        </Link>
      )}
    </div>
  );
}

function MainBanner({ section }: { section: LayoutSection }) {
  return (
    <section className="bg-[#f3f4f6] px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative mx-auto min-h-[500px] max-w-7xl overflow-hidden rounded-xl bg-comet-black shadow-lg">
        <div className="absolute inset-y-0 right-0 hidden w-[64%] opacity-95 md:block">
          {section.image_url && (
            <Image
              src={section.image_url}
              alt={section.title || "COMETA G"}
              fill
              priority
              sizes="64vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-comet-black via-comet-black/45 to-transparent" />
        </div>

        <div className="relative z-10 grid min-h-[500px] items-center px-6 py-12 sm:px-10 lg:px-14">
          <div className="max-w-xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-comet-fuchsia">
              {section.subtitle || "COMETA G"}
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[1.03] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {section.title}
            </h1>
            {section.text && <p className="mt-5 max-w-lg text-base leading-7 text-zinc-300">{section.text}</p>}
            {section.link_url && section.button_text && (
              <Link
                href={section.link_url}
                className="mt-8 inline-flex h-12 items-center justify-center rounded-md comet-gradient px-6 text-sm font-extrabold text-white transition hover:brightness-110"
              >
                {section.button_text}
              </Link>
            )}
          </div>
        </div>

        <div className="relative aspect-[4/3] md:hidden">
          {section.image_url && (
            <Image
              src={section.image_url}
              alt={section.title || "COMETA G"}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function PromoStrip({ section }: { section: LayoutSection }) {
  return (
    <section className="bg-[#f3f4f6] px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 rounded-lg border border-zinc-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-zinc-900">{section.title}</p>
          {section.text && <p className="mt-1 text-sm text-zinc-500">{section.text}</p>}
        </div>
        {section.link_url && section.button_text && (
          <Link href={section.link_url} className="text-sm font-black text-comet-fuchsia hover:text-comet-red">
            {section.button_text}
          </Link>
        )}
      </div>
    </section>
  );
}

function CategoryGrid({ section, products }: { section: LayoutSection; products: Product[] }) {
  const categories = uniqueValues(products, "categoria");

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader section={section} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category}
            href={`/productos?categoria=${encodeURIComponent(category)}`}
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-comet-fuchsia/40 hover:shadow-md"
          >
            <p className="text-sm font-black text-zinc-900">{category}</p>
            <p className="mt-2 text-xs text-zinc-500">
              {products.filter((product) => product.categoria === category).length} productos
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductSection({ section, products }: { section: LayoutSection; products: Product[] }) {
  const scopedProducts = sectionProducts(section, products);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader section={section} />
      <ProductGrid
        products={scopedProducts}
        desktopColumns={section.desktop_columns}
        mobileColumns={section.mobile_columns}
      />
    </section>
  );
}

function TextBlock({ section }: { section: LayoutSection }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        {section.title && <h2 className="text-2xl font-black text-zinc-900">{section.title}</h2>}
        {section.text && <p className="mt-3 text-sm leading-7 text-zinc-500">{section.text}</p>}
      </div>
    </section>
  );
}
