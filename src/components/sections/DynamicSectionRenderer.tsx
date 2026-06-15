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
    <div className="bg-comet-black">
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
    case "promo_tile_grid":
      return <PromoTileGrid section={section} />;
    case "service_strip":
      return <ServiceStrip section={section} />;
    case "product_tabs":
      return <ProductTabs section={section} products={products} />;
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
    <div className="mb-5 flex flex-col gap-2 border-b border-comet-border pb-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {section.title && <h2 className="text-2xl font-extrabold tracking-tight text-white">{section.title}</h2>}
        <div className="mt-2 h-1 w-24 rounded-full comet-gradient" />
        {section.subtitle && <p className="mt-2 text-sm font-medium text-zinc-400">{section.subtitle}</p>}
      </div>
      {section.link_url && section.button_text && (
        <Link href={section.link_url} className="text-sm font-black text-comet-fuchsia hover:text-comet-red">
          {section.button_text}
        </Link>
      )}
    </div>
  );
}

function parseItems(text?: string): string[][] {
  return (text || "")
    .split(";")
    .map((item) => item.split("|").map((part) => part.trim()))
    .filter((parts) => parts.some(Boolean));
}

function MainBanner({ section }: { section: LayoutSection }) {
  return (
    <section className="bg-comet-black px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative mx-auto min-h-[500px] max-w-7xl overflow-hidden rounded-xl border border-comet-border bg-comet-black shadow-lg">
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

        {section.carousel_enabled && (
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            <span className="h-2 w-8 rounded-full comet-gradient" />
            <span className="h-2 w-2 rounded-full bg-white/35" />
            <span className="h-2 w-2 rounded-full bg-white/35" />
          </div>
        )}
      </div>
    </section>
  );
}

function PromoTileGrid({ section }: { section: LayoutSection }) {
  const items = parseItems(section.text);

  return (
    <section className="bg-comet-black px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map(([title, subtitle, image, href, button], index) => (
          <Link
            key={`${title}-${index}`}
            href={href || "/productos"}
            className="grid min-h-32 grid-cols-[42%_1fr] items-center gap-3 rounded-md border border-comet-border bg-comet-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-comet-fuchsia/50"
          >
            <div className="relative h-24">
              {image && (
                <Image src={image} alt={title} fill sizes="180px" className="object-contain" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium uppercase leading-5 text-zinc-400">{title}</p>
              {subtitle && <p className="text-lg font-black uppercase leading-5 text-white">{subtitle}</p>}
              {button && <p className="mt-3 text-sm font-black text-comet-fuchsia">{button}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ServiceStrip({ section }: { section: LayoutSection }) {
  const items = parseItems(section.text);

  return (
    <section className="bg-comet-black px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl overflow-hidden rounded-lg border border-comet-border bg-comet-card sm:grid-cols-2 lg:grid-cols-5">
        {items.map(([title, subtitle], index) => (
          <div
            key={`${title}-${index}`}
            className="grid min-h-24 grid-cols-[40px_1fr] items-center gap-4 border-b border-comet-border p-5 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:border-b-0 lg:[&:nth-child(2n)]:border-r lg:last:border-r-0"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full border border-comet-fuchsia/30 text-sm font-black text-comet-fuchsia">
              {index + 1}
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-black text-white">{title}</p>
              {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductTabs({ section, products }: { section: LayoutSection; products: Product[] }) {
  const tabs = parseItems(section.text);
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab[2]?.toLowerCase() === "active"));
  const activeTab = tabs[activeIndex] || tabs[0];
  const activeLabel = activeTab?.[0] || section.title || "Featured Products";
  const scopedProducts = sectionProducts(
    { ...section, taxonomies_filter: activeTab?.[1] || section.taxonomies_filter || "destacado" },
    products
  );

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-center gap-7 border-b border-comet-border">
        {(tabs.length ? tabs : [[activeLabel, "destacado"]]).map(([label], index) => (
          <span
            key={label}
            className={`relative pb-4 text-lg ${
              index === activeIndex ? "font-black text-white" : "font-medium text-zinc-400"
            }`}
          >
            {label}
            {index === activeIndex && (
              <>
                <span className="absolute bottom-0 left-0 h-0.5 w-full comet-gradient" />
                <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-comet-fuchsia" />
              </>
            )}
          </span>
        ))}
      </div>
      <ProductGrid products={scopedProducts} desktopColumns={section.desktop_columns || 5} mobileColumns={section.mobile_columns || 2} />
    </section>
  );
}

function PromoStrip({ section }: { section: LayoutSection }) {
  return (
    <section className="bg-comet-black px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 rounded-lg border border-comet-border bg-comet-card px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-white">{section.title}</p>
          {section.text && <p className="mt-1 text-sm text-zinc-400">{section.text}</p>}
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
            className="rounded-lg border border-comet-border bg-comet-card p-4 shadow-sm transition hover:border-comet-fuchsia/40 hover:shadow-md"
          >
            <p className="text-sm font-black text-white">{category}</p>
            <p className="mt-2 text-xs text-zinc-400">
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
      <div className="max-w-3xl rounded-lg border border-comet-border bg-comet-card p-6 shadow-sm">
        {section.title && <h2 className="text-2xl font-black text-white">{section.title}</h2>}
        {section.text && <p className="mt-3 text-sm leading-7 text-zinc-400">{section.text}</p>}
      </div>
    </section>
  );
}
