export type LayoutArea = "header" | "body" | "footer";

export type SectionType =
  | "navbar"
  | "main_banner"
  | "carousel"
  | "product_grid"
  | "category_grid"
  | "promo_strip"
  | "text_block"
  | "footer_links"
  | "footer_contact";

export type StockStatus = "disponible" | "sin_stock" | "preventa";

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
};

export type Product = {
  id: string;
  sku?: string;
  nombre: string;
  slug: string;
  descripcion_corta?: string;
  descripcion_larga?: string;
  precio: number;
  precio_oferta?: number;
  stock: number;
  stock_status: StockStatus;
  categoria?: string;
  subcategoria?: string;
  marca?: string;
  tags: string[];
  imagen_principal?: string;
  imagenes_extra: string[];
  atributos?: Record<string, string>;
  variables?: Record<string, string[]>;
  color?: string;
  garantia?: string;
  destacado: boolean;
  preventa: boolean;
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
  marca?: string;
  disponibilidad?: "todos" | "disponible" | "sin_stock" | "preventa";
  minPrice?: number;
  maxPrice?: number;
};
