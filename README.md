# COMETA G - Computación Gamer

Tienda online básica, rápida y escalable para una marca gamer, construida con Next.js, React, Tailwind CSS y Google Sheets como panel inicial.

## Qué incluye

- Home dinámica desde la hoja `LAYOUT`.
- Catálogo desde la hoja `PRODUCTOS`.
- Página individual de producto.
- Buscador y filtros por categoría, marca, precio máximo y disponibilidad.
- Carrito con `localStorage`, totales y aviso de preventa.
- Wishlist con `localStorage`.
- Login y registro básicos preparados para ampliar.
- API routes en `/api/layout` y `/api/productos`.
- Modo oscuro nativo y modo claro secundario.
- Datos de ejemplo si todavía no conectaste Google Sheets.

## Ejecutar en local

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000`.

## Conectar Google Sheets

1. Creá una Google Sheet con dos pestañas: `LAYOUT` y `PRODUCTOS`.
2. En Google Sheets, usá `Archivo > Compartir > Publicar en la web` o compartí la hoja para lectura pública.
3. Copiá `.env.example` como `.env.local`.
4. Configurá una de estas opciones:

### Opción A: ID de la planilla

```env
GOOGLE_SHEETS_ID=tu_spreadsheet_id
GOOGLE_SHEETS_LAYOUT_NAME=LAYOUT
GOOGLE_SHEETS_PRODUCTOS_NAME=PRODUCTOS
```

### Opción B: URLs CSV publicadas

```env
GOOGLE_SHEETS_LAYOUT_URL=https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv
GOOGLE_SHEETS_PRODUCTOS_URL=https://docs.google.com/spreadsheets/d/e/.../pub?gid=123&single=true&output=csv
```

Si no hay variables configuradas, la app usa datos de respaldo en `src/lib/seedData.ts`.

## Columnas esperadas

### LAYOUT

`section_id`, `area`, `section_type`, `title`, `subtitle`, `text`, `image_url`, `link_url`, `button_text`, `order`, `visible`, `background_color`, `text_color`, `accent_color`, `layout_variant`, `desktop_columns`, `mobile_columns`, `carousel_enabled`, `autoplay`, `taxonomies_filter`, `category_filter`, `brand_filter`

Sectores soportados en esta primera versión:

- `navbar`
- `main_banner`
- `carousel`
- `product_grid`
- `category_grid`
- `promo_strip`
- `text_block`
- `footer_links`
- `footer_contact`

Reglas:

- `visible = FALSE` oculta el sector.
- `order` define el orden visual.
- `area` define si se renderiza en `header`, `body` o `footer`.
- `taxonomies_filter = destacado` muestra productos destacados.
- `taxonomies_filter = preventa` muestra productos en preventa.
- `category_filter` y `brand_filter` filtran grillas de productos.

### PRODUCTOS

`id`, `sku`, `nombre`, `slug`, `descripcion_corta`, `descripcion_larga`, `precio`, `precio_oferta`, `stock`, `stock_status`, `categoria`, `subcategoria`, `marca`, `tags`, `imagen_principal`, `imagenes_extra`, `atributos`, `variables`, `color`, `garantia`, `destacado`, `preventa`, `fecha_lanzamiento`, `visible`, `orden`

Notas:

- `tags` e `imagenes_extra` aceptan valores separados por coma o `|`.
- `atributos` acepta JSON (`{"RAM":"16GB"}`) o formato simple (`RAM:16GB|SSD:1TB`).
- `variables` acepta JSON o formato simple (`Color:Negro,Blanco|Memoria:16GB,32GB`).
- Si `preventa = TRUE`, el estado pasa a `preventa`, el botón dice `Reservar` y el carrito marca el producto como preventa.

## Preparado para crecer

La integración de pago queda concentrada en el resumen del carrito. Desde ahí se puede conectar Mercado Pago, Stripe, transferencia bancaria o una reserva manual. La autenticación está aislada en `src/components/auth/AuthForm.tsx` para reemplazar el flujo simulado por un proveedor real sin tocar el catálogo.
