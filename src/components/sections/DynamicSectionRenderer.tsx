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
    <>
      {sections.map((section) => (
        <Section key={section.section_id} section={section} products={products} />
      ))}
    </>
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
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {section.subtitle && <p className="text-sm font-semibold text-comet-fuchsia">{section.subtitle}</p>}
        {section.title && <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white">{section.title}</h2>}
      </div>
      {section.link_url && section.button_text && (
        <Link href={section.link_url} className="text-sm font-bold text-zinc-300 hover:text-white">
          {section.button_text}
        </Link>
      )}
    </div>
  );
}

function MainBanner({ section }: { section: LayoutSection }) {
  return (
    <section
      className="relative overflow-hidden border-b border-comet-border bg-comet-black"
      style={{ backgroundColor: section.background_color || undefined, color: section.text_color || undefined }}
    >
      <div className="absolute inset-y-0 right-0 hidden w-[58%] opacity-90 md:block">
        {section.image_url && (
          <Image
            src={section.image_url}
            alt={section.title || "COMETA G"}
            fill
            priority
            sizes="58vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-comet-black via-comet-black/45 to-transparent" />
      </div>
      <div className="mx-auto grid min-h-[600px] w-full max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 lg:px-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-comet-fuchsia">
            {section.subtitle || "COMETA G"}
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-black leading-[1.03] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {section.title}
          </h1>
          {section.text && <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">{section.text}</p>}
          {section.link_url && section.button_text && (
            <Link
              href={section.link_url}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-md comet-gradient px-6 text-sm font-extrabold text-white transition hover:brightness-110"
            >
              {section.button_text}
            </Link>
          )}
        </div>
        <div className="relative z-10 aspect-[4/3] overflow-hidden rounded-md border border-comet-border bg-comet-panel shadow-glow md:hidden">
          {section.image_url ? (
            <Image
              src={section.image_url}
              alt={section.title || "COMETA G"}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 45vw"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-zinc-500">COMETA G</div>
          )}
        </div>
      </div>
    </section>
  );
}

function PromoStrip({ section }: { section: LayoutSection }) {
  return (
    <section className="border-b border-comet-border bg-comet-panel/70">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-black text-white">{section.title}</p>
          {section.text && <p className="mt-1 text-sm text-zinc-400">{section.text}</p>}
        </div>
        {section.link_url && section.button_text && (
          <Link href={section.link_url} className="text-sm font-bold text-comet-fuchsia hover:text-white">
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
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeader section={section} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category}
            href={`/productos?categoria=${encodeURIComponent(category)}`}
            className="rounded-lg border border-comet-border bg-comet-card p-4 transition hover:border-comet-fuchsia hover:bg-white/[.04]"
          >
            <p className="text-sm font-black text-white">{category}</p>
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
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
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
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl rounded-lg border border-comet-border bg-comet-panel p-6">
        {section.title && <h2 className="text-2xl font-black text-white">{section.title}</h2>}
        {section.text && <p className="mt-3 text-sm leading-7 text-zinc-400">{section.text}</p>}
      </div>
    </section>
  );
}
