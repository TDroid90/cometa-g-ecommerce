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
