export type LayoutArea = "header" | "body" | "footer";

export type SectionType =
  | "navbar"
  | "category_nav"
  | "main_banner"
  | "carousel"
  | "product_grid"
  | "category_grid"
  | "promo_tile_grid"
  | "service_strip"
  | "product_tabs"
  | "promo_strip"
  | "text_block"
  | "footer_links"
  | "footer_contact";

export type StockStatus = "disponible" | "sin_stock" | "preventa";
export type CommercialStatus = "regular" | "preventa" | "oferta" | "a_pedido";

export type ProductTechSpecs = {
  socket?: string;
  chipset?: string;
  ramType?: "DDR3" | "DDR4" | "DDR5";
  ramCapacityGb?: number;
  ramSpeedMhz?: number;
  cpuCores?: number;
  cpuThreads?: number;
  baseClockGhz?: number;
  boostClockGhz?: number;
  tdpWatts?: number;
  gpuMemoryGb?: number;
  gpuMemoryType?: string;
  recommendedPsuWattage?: number;
  storageType?: "SSD" | "HDD" | "NVMe";
  capacityGb?: number;
  interface?: string;
  motherboardFormFactor?: "ATX" | "Micro ATX" | "Mini ITX";
  supportedMotherboardFormats?: string[];
  wattage?: number;
  efficiencyRating?: string;
  benchmarkScore?: number;
  versusScore?: number;
  source?: string;
  sourceUrl?: string;
  updatedAt?: string;
};

export type ProductExternalRefs = {
  versusUrl?: string;
  versusMatchedName?: string;
  confidence?: number;
  lastScrapedAt?: string;
};

export type ScrapedProductTechData = {
  localProductId: string;
  localProductName: string;
  source: "versus";
  sourceUrl: string;
  sourceProductName: string;
  matchConfidence: number;
  matchStatus: "auto_approved" | "needs_review" | "rejected";
  specs: ProductTechSpecs;
  rawSpecs?: Record<string, unknown>;
  scrapedAt: string;
};

export type LayoutSection = {
  section_id: string;
  area: LayoutArea;
  section_type: SectionType;
  title?: string;
  subtitle?: string;
  text?: string;
  image_url?: string;
  link_url?: string;
  button_text?: string;
  order: number;
  visible: boolean;
  background_color?: string;
  text_color?: string;
  accent_color?: string;
  layout_variant?: string;
  desktop_columns?: number;
  mobile_columns?: number;
  carousel_enabled?: boolean;
  autoplay?: boolean;
  taxonomies_filter?: string;
  category_filter?: string;
  brand_filter?: string;
  font_size?: string;
  font_weight?: string;
  align?: string;
  justify?: string;
  padding?: string;
  border?: string;
};

export type Product = {
  id: string;
  sku?: string;
  nombre: string;
  slug: string;
  descripcion_corta?: string;
  descripcion_larga?: string;
  precio_usd?: number;
  precio: number;
  precio_oferta_usd?: number;
  precio_oferta?: number;
  stock: number;
  stockLocal?: number;
  stock_status: StockStatus;
  categoria?: string;
  subcategoria?: string;
  marca?: string;
  marca_logo_url?: string;
  tags: string[];
  imagen_principal?: string;
  imagenes_extra: string[];
  atributos?: Record<string, string>;
  variables?: Record<string, string[]>;
  color?: string;
  garantia?: string;
  destacado: boolean;
  nuevo?: boolean;
  oferta?: boolean;
  preventa: boolean;
  commercialStatus?: CommercialStatus;
  estimatedDeliveryDays?: number;
  techSpecs?: ProductTechSpecs;
  externalRefs?: ProductExternalRefs;
  fecha_lanzamiento?: string;
  visible: boolean;
  orden: number;
};

export type CartItem = {
  product: Product;
  quantity: number;
  preorder: boolean;
};

export type ProductFilters = {
  query?: string;
  categoria?: string;
  subcategoria?: string;
  marca?: string;
  disponibilidad?: "todos" | "disponible" | "sin_stock" | "preventa";
  oferta?: boolean;
  minPrice?: number;
  maxPrice?: number;
};

export type CategoryMenuItem = {
  categoria: string;
  subcategoria: string;
  cantidad_productos: number;
  link: string;
  orden: number;
  visible: boolean;
  tipo?: "categoria" | "marca";
};
