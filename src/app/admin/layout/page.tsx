"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Box,
  Columns3,
  Grid3X3,
  Eye,
  EyeOff,
  Image,
  LayoutDashboard,
  Loader2,
  Monitor,
  Paintbrush,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Save,
  Search,
  Settings,
  Smartphone,
  Tablet,
  Type,
  Trash2
} from "lucide-react";
import {
  headerTemplateRows,
  LAYOUT_SIMPLE_COLUMNS,
  LayoutAdminRow,
  LayoutSimpleColumn
} from "@/lib/layoutAdmin";

type ApiResponse = {
  ok: boolean;
  rows: LayoutAdminRow[];
};

type LayoutAreaFilter = "header" | "body" | "footer";
type PreviewMode = "desktop" | "tablet" | "mobile";

const ADMIN_SESSION_KEY = "cometag-admin-session";
const LEGACY_SECRET_KEY = "cometag-admin-secret";
const ADMIN_SESSION_MS = 5 * 60 * 1000;

const areaTabs: Array<{ id: LayoutAreaFilter; label: string; icon: typeof LayoutDashboard }> = [
  { id: "header", label: "Header", icon: LayoutDashboard },
  { id: "body", label: "Body", icon: Paintbrush },
  { id: "footer", label: "Footer", icon: Settings }
];

const previewModes: Array<{ id: PreviewMode; label: string; icon: typeof Monitor }> = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Celular", icon: Smartphone }
];

const fontWeightLabels: Record<string, string> = {
  "300": "Light",
  "400": "Regular",
  "500": "Medium",
  "600": "Semi Bold",
  "700": "Bold",
  "800": "Ultra Bold",
  "900": "Black"
};

const blockTemplates: Array<{
  label: string;
  icon: typeof Box;
  preview: string;
  row: Partial<Record<LayoutSimpleColumn, string>>;
}> = [
  { label: "Container", icon: Box, preview: "Contenedor flexible para agrupar bloques.", row: { tipo: "container", titulo: "Contenedor", columnas_desktop: "1", columnas_mobile: "1", padding: "24", border: "none" } },
  { label: "Grid", icon: Grid3X3, preview: "Grilla con filas y columnas editables.", row: { tipo: "grid", titulo: "Grilla", columnas_desktop: "3", columnas_mobile: "1", padding: "24", border: "none" } },
  { label: "Heading", icon: Type, preview: "Titulo grande con peso y alineacion.", row: { tipo: "text_block", titulo: "Titulo nuevo", font_size: "32", font_weight: "900" } },
  { label: "Text Editor", icon: AlignLeft, preview: "Texto libre para parrafos o bajadas.", row: { tipo: "text_block", titulo: "Texto", texto: "Contenido nuevo", font_size: "16", font_weight: "400" } },
  { label: "Image", icon: Image, preview: "Imagen simple con URL o asset.", row: { tipo: "image", titulo: "Imagen", imagen: "", padding: "0" } },
  { label: "Button", icon: Box, preview: "Boton con texto y enlace.", row: { tipo: "button", titulo: "Boton", boton: "Comprar", enlace: "#" } },
  { label: "Divider", icon: Columns3, preview: "Linea separadora entre secciones.", row: { tipo: "divider", titulo: "Separador", border: "bottom" } },
  { label: "Tabs", icon: LayoutDashboard, preview: "Solapas para productos destacados, nuevos u ofertas.", row: { tipo: "tabs_productos", titulo: "Tabs", items: "Featured Products|destacado|active;Latest Products|nuevo|;Sale Products|oferta|" } },
  { label: "Banner", icon: Image, preview: "Hero con columnas, imagen, texto y carousel.", row: { tipo: "banner", titulo: "Banner nuevo", subtitulo: "COMETA G", texto: "Descripcion del banner", boton: "Ver mas", padding: "48", columnas_desktop: "2", columnas_mobile: "1" } },
  { label: "Carousel", icon: Columns3, preview: "Slider horizontal de banners o tarjetas.", row: { tipo: "banner", titulo: "Carousel nuevo", subtitulo: "COMETA G", texto: "Slide principal", boton: "Ver mas", carousel: "TRUE", autoplay: "TRUE", columnas_desktop: "1", columnas_mobile: "1" } },
  { label: "Productos", icon: Grid3X3, preview: "Listado dinamico desde PRODUCTOS.", row: { tipo: "grilla_productos", titulo: "Productos destacados", filtro: "destacado", columnas_desktop: "5", columnas_mobile: "1" } },
  { label: "Categorias", icon: Grid3X3, preview: "Grilla visual de categorias.", row: { tipo: "category_grid", titulo: "Categorias", columnas_desktop: "4", columnas_mobile: "2" } },
  { label: "Beneficios", icon: Columns3, preview: "Tira de beneficios con icono y texto.", row: { tipo: "beneficios", titulo: "Beneficios", items: "Envios|A todo el pais;Garantia|Compra segura;Soporte|Solo mensajes" } },
  { label: "Promo Cards", icon: Image, preview: "Tarjetas promocionales con imagen y link.", row: { tipo: "promociones", titulo: "Promociones", items: "Catch big|Hot deals|/logo-image-campus.png|/productos|Ver mas" } },
  { label: "Icon List", icon: Columns3, preview: "Lista compacta de iconos y textos.", row: { tipo: "beneficios", titulo: "Lista de iconos", items: "Stock|Actualizado;Pagos|Multiples medios;Envios|Todo el pais" } },
  { label: "Spacer", icon: Columns3, preview: "Espacio vertical configurable.", row: { tipo: "spacer", titulo: "Espaciador", padding: "32" } },
  { label: "Accordion", icon: LayoutDashboard, preview: "Bloque desplegable para FAQs.", row: { tipo: "accordion", titulo: "Preguntas frecuentes", items: "Pregunta 1|Respuesta 1;Pregunta 2|Respuesta 2" } },
  { label: "Social Icons", icon: Box, preview: "Redes sociales en fila.", row: { zona: "footer", tipo: "text_block", variante: "footer_social", titulo: "Redes", items: "Facebook|#,TikTok|#,Instagram|#" } },
  { label: "Newsletter", icon: Type, preview: "Formulario de email para footer o home.", row: { zona: "footer", tipo: "text_block", variante: "footer_newsletter", titulo: "Newsletter", texto: "Ofertas y novedades gamer.", boton: "Enviar" } },
  { label: "Login", icon: Box, preview: "Acceso de usuario.", row: { tipo: "button", titulo: "Login", boton: "Mi cuenta", enlace: "/login" } },
  { label: "Cart", icon: Box, preview: "Acceso al carrito.", row: { tipo: "button", titulo: "Carrito", boton: "Carrito", enlace: "/carrito" } },
  { label: "Checkout", icon: Box, preview: "Boton o link hacia checkout.", row: { tipo: "button", titulo: "Checkout", boton: "Pagar", enlace: "/carrito" } },
  { label: "Breadcrumbs", icon: Columns3, preview: "Ruta de navegacion.", row: { tipo: "text_block", titulo: "Breadcrumbs", texto: "Inicio > Categoria > Producto" } },
  { label: "Search", icon: Search, preview: "Buscador visual.", row: { tipo: "text_block", variante: "header_search", titulo: "Buscador", texto: "Buscar productos, marcas o SKU..." } },
  { label: "Menu", icon: LayoutDashboard, preview: "Menu de navegacion.", row: { tipo: "menu", titulo: "Menu", items: "Inicio|/,Productos|/productos,Preventa|/productos?disponibilidad=preventa" } }
];

const editableFields: Array<{
  key: LayoutSimpleColumn;
  label: string;
  type?: "text" | "textarea" | "color" | "select";
  options?: string[];
}> = [
  { key: "titulo", label: "Titulo" },
  { key: "subtitulo", label: "Subtitulo" },
  { key: "texto", label: "Texto", type: "textarea" },
  { key: "items", label: "Items / links", type: "textarea" },
  { key: "enlace", label: "Link" },
  { key: "boton", label: "Texto boton" },
  { key: "fondo", label: "Fondo" },
  { key: "color_texto", label: "Color texto" },
  { key: "acento", label: "Acento" },
  { key: "font_size", label: "Tamano texto" },
  { key: "font_weight", label: "Peso", type: "select", options: ["300", "400", "500", "600", "700", "800", "900"] },
  { key: "align", label: "Alineacion", type: "select", options: ["left", "center", "right"] },
  { key: "justify", label: "Ubicacion", type: "select", options: ["start", "center", "end", "between"] },
  { key: "visible", label: "Visible", type: "select", options: ["TRUE", "FALSE"] },
  { key: "orden", label: "Orden" }
];

function emptyRow(): LayoutAdminRow {
  const base = Object.fromEntries(LAYOUT_SIMPLE_COLUMNS.map((column) => [column, ""])) as Record<
    LayoutSimpleColumn,
    string
  >;

  return {
    ...base,
    rowNumber: 0,
    id: `custom_${Date.now()}`,
    zona: "header",
    tipo: "text_block",
    visible: "TRUE",
    label: "Bloque nuevo",
    description: "Bloque personalizado"
  };
}

function parseItems(items: string) {
  return items
    .split(",")
    .map((item) => {
      const [label, href] = item.split("|").map((part) => part.trim());
      return { label, href };
    })
    .filter((item) => item.label);
}

function fieldValue(row: LayoutAdminRow, key: LayoutSimpleColumn) {
  return row[key] ?? "";
}

function visualRank(row: LayoutAdminRow) {
  const areaRank: Record<string, number> = { header: 0, body: 1, footer: 2 };
  const headerRank: Record<string, number> = {
    header_top_left: 1,
    header_top_right: 2,
    brand: 3,
    header_search: 4,
    header_icons: 5,
    header_nav: 6
  };

  return `${areaRank[row.zona] ?? 9}-${String(headerRank[row.variante] ?? Number(row.orden || 999)).padStart(4, "0")}`;
}

function structuredKind(row?: LayoutAdminRow) {
  if (!row) return null;
  if (row.tipo === "banner" || row.tipo === "main_banner") return "hero";
  if (row.tipo === "grilla_productos" || row.tipo === "product_grid" || row.tipo === "category_grid") return "grid";
  if (row.tipo === "promociones" || row.tipo === "promo_tile_grid") return "promo";
  if (row.tipo === "beneficios" || row.tipo === "service_strip") return "benefit";
  if (row.tipo === "tabs_productos" || row.tipo === "product_tabs") return "tab";
  if (row.variante?.startsWith("footer_") || row.tipo === "links_footer") return "link";
  return null;
}

function modeWidth(mode: PreviewMode) {
  if (mode === "mobile") return "w-[390px]";
  if (mode === "tablet") return "w-[768px]";
  return "w-full";
}

function splitStructuredItems(value: string, minParts: number) {
  return (value || "")
    .split(";")
    .map((item) => {
      const parts = item.split("|").map((part) => part.trim());
      while (parts.length < minParts) parts.push("");
      return parts;
    })
    .filter((parts) => parts.some(Boolean));
}

function numberFrom(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function gridColumnsClass(columns: number) {
  if (columns <= 1) return "grid-cols-1";
  if (columns === 2) return "grid-cols-2";
  if (columns === 3) return "grid-cols-3";
  if (columns === 4) return "grid-cols-4";
  return "grid-cols-5";
}

function heroColumns(row: LayoutAdminRow) {
  const expected = numberFrom(row.columnas_desktop, 2);
  const existing = splitStructuredItems(row.items, 6);
  const base = existing.length
    ? existing
    : [
        ["text", row.titulo || "Banner nuevo", row.texto || "Descripcion del banner", "", row.boton || "Ver mas", row.enlace || ""],
        ["image", "Imagen", "", row.imagen || "/logo-image-campus.png", "", ""]
      ];

  while (base.length < expected) {
    base.push(["empty", `Columna ${base.length + 1}`, "", "", "", ""]);
  }

  return base.slice(0, Math.max(expected, base.length));
}

function VisualBlockEditor({
  row,
  onFieldChange
}: {
  row: LayoutAdminRow;
  onFieldChange: (key: LayoutSimpleColumn, value: string) => void;
}) {
  const kind = structuredKind(row);

  if (kind === "hero") {
    const columns = heroColumns(row);
    const desktopColumns = numberFrom(row.columnas_desktop, 2);
    const columnClass = gridColumnsClass(Math.min(desktopColumns, 4));

    function commitColumns(next: string[][]) {
      onFieldChange("items", next.map((item) => item.join("|")).join(";"));
      const firstText = next.find((item) => item[0] === "text") || next[0];
      const firstImage = next.find((item) => item[0] === "image" && item[3]);
      if (firstText) {
        onFieldChange("titulo", firstText[1] || row.titulo);
        onFieldChange("texto", firstText[2] || row.texto);
        onFieldChange("boton", firstText[4] || row.boton);
        onFieldChange("enlace", firstText[5] || row.enlace);
      }
      if (firstImage?.[3]) onFieldChange("imagen", firstImage[3]);
    }

    function updateColumn(index: number, partIndex: number, value: string) {
      const next = columns.map((item) => [...item]);
      next[index][partIndex] = value;
      commitColumns(next);
    }

    return (
      <div className="md:col-span-2 rounded-md border border-comet-border bg-comet-black p-4">
        <div
          className="mb-4 grid gap-4 rounded-md border border-comet-border bg-comet-card p-4"
          style={{ gridTemplateColumns: `repeat(${Math.min(desktopColumns, 4)}, minmax(0, 1fr))` }}
        >
          {columns.map((column, index) => (
            <div key={index} className="flex min-h-52 flex-col justify-center overflow-hidden rounded-md border border-comet-border bg-comet-black p-4">
              {column[0] === "image" ? (
                column[3] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={column[3]} alt="" className="h-full min-h-44 w-full object-contain" />
                ) : (
                  <div className="grid min-h-44 place-items-center text-sm text-zinc-600">Imagen columna {index + 1}</div>
                )
              ) : column[0] === "empty" ? (
                <div className="grid min-h-44 place-items-center rounded border border-dashed border-zinc-700 text-sm text-zinc-600">
                  Columna vacia {index + 1}
                </div>
              ) : (
                <>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-comet-fuchsia">{row.subtitulo || "COMETA G"}</p>
                  <h3 className="mt-3 text-3xl font-black leading-tight text-white">{column[1] || "Titulo"}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{column[2] || "Descripcion"}</p>
                  {column[4] && <span className="mt-5 inline-flex w-fit rounded-md comet-gradient px-4 py-2 text-sm font-black text-white">{column[4]}</span>}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          {[
            ["columnas_desktop", "Columnas desktop"],
            ["columnas_mobile", "Columnas mobile"],
            ["carousel", "Carousel TRUE/FALSE"],
            ["autoplay", "Autoplay TRUE/FALSE"],
            ["subtitulo", "Texto superior"],
          ].map(([key, label]) => (
            <label key={key} className={key === "texto" ? "md:col-span-2" : ""}>
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">{label}</span>
              <input
                value={fieldValue(row, key as LayoutSimpleColumn)}
                onChange={(event) => onFieldChange(key as LayoutSimpleColumn, event.target.value)}
                className="h-10 w-full rounded-md border border-comet-border bg-comet-black px-3 text-xs text-white outline-none focus:border-comet-fuchsia"
              />
            </label>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {columns.map((column, index) => (
            <div key={index} className="rounded-md border border-comet-border bg-comet-panel p-3">
              <p className="mb-3 text-sm font-black text-white">Columna {index + 1}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {["Tipo", "Titulo", "Texto", "Imagen URL", "Boton", "Link"].map((label, partIndex) => (
                  <label key={label} className={partIndex === 2 || partIndex === 3 ? "md:col-span-2" : ""}>
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">{label}</span>
                    {partIndex === 0 ? (
                      <select
                        value={column[partIndex] || "text"}
                        onChange={(event) => updateColumn(index, partIndex, event.target.value)}
                        className="h-9 w-full rounded-md border border-comet-border bg-comet-black px-2 text-xs text-white outline-none focus:border-comet-fuchsia"
                      >
                        <option value="text">Texto</option>
                        <option value="image">Imagen</option>
                        <option value="empty">Vacia</option>
                      </select>
                    ) : (
                      <input
                        value={column[partIndex] || ""}
                        onChange={(event) => updateColumn(index, partIndex, event.target.value)}
                        className="h-9 w-full rounded-md border border-comet-border bg-comet-black px-2 text-xs text-white outline-none focus:border-comet-fuchsia"
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "grid") {
    return (
      <div className="md:col-span-2 rounded-md border border-comet-border bg-comet-black p-4">
        <div className="mb-4 rounded-md border border-comet-border bg-comet-card p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-comet-fuchsia">{row.tipo}</p>
          <h3 className="mt-2 text-2xl font-black text-white">{row.titulo || "Grilla de productos"}</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Filtro: {row.filtro || "sin filtro"} · Categoria: {row.categoria || "todas"} · Marca: {row.marca || "todas"}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["titulo", "Titulo"],
            ["subtitulo", "Subtitulo"],
            ["filtro", "Filtro"],
            ["categoria", "Categoria"],
            ["marca", "Marca"],
            ["columnas_desktop", "Columnas desktop"],
            ["columnas_mobile", "Columnas mobile"],
            ["carousel", "Carousel"]
          ].map(([key, label]) => (
            <label key={key}>
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">{label}</span>
              <input
                value={fieldValue(row, key as LayoutSimpleColumn)}
                onChange={(event) => onFieldChange(key as LayoutSimpleColumn, event.target.value)}
                className="h-10 w-full rounded-md border border-comet-border bg-comet-black px-3 text-xs text-white outline-none focus:border-comet-fuchsia"
              />
            </label>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function StructuredItemsEditor({
  row,
  onChange
}: {
  row: LayoutAdminRow;
  onChange: (value: string) => void;
}) {
  const kind = structuredKind(row);
  if (kind !== "promo" && kind !== "benefit" && kind !== "tab" && kind !== "link") return null;

  const source = row.items || row.texto;
  const configMap = {
    promo: {
      title: "Promociones visuales",
      minParts: 5,
      labels: ["Arriba", "Titulo fuerte", "Imagen URL", "Link", "Boton"]
    },
    benefit: {
      title: "Beneficios",
      minParts: 2,
      labels: ["Titulo", "Subtitulo"]
    },
    tab: {
      title: "Tabs de productos",
      minParts: 3,
      labels: ["Nombre", "Filtro", "Estado"]
    },
    link: {
      title: "Links visuales",
      minParts: 2,
      labels: ["Texto", "Link"]
    }
  };
  const config = configMap[kind];

  const items = splitStructuredItems(source, config.minParts);

  function commit(next: string[][]) {
    onChange(next.map((item) => item.join("|")).join(";"));
  }

  function updateItem(index: number, partIndex: number, value: string) {
    const next = items.map((item) => [...item]);
    next[index][partIndex] = value;
    commit(next);
  }

  function addItem() {
    commit([...items, Array.from({ length: config.minParts }, () => "")]);
  }

  function removeItem(index: number) {
    commit(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="md:col-span-2 rounded-md border border-comet-border bg-comet-black p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-white">{config.title}</p>
          <p className="text-xs text-zinc-500">Edita cada pieza sin tocar separadores raros.</p>
        </div>
        <button onClick={addItem} className="inline-flex h-9 items-center gap-2 rounded-md border border-comet-border px-3 text-xs font-black">
          <Plus size={15} /> Agregar
        </button>
      </div>

      <div className={kind === "promo" ? "grid gap-3 lg:grid-cols-2" : "grid gap-3"}>
        {items.map((item, index) => (
          <div key={index} className="rounded-md border border-comet-border bg-comet-panel p-3">
            {kind === "promo" && (
              <div className="mb-3 grid min-h-28 grid-cols-[42%_1fr] items-center gap-3 rounded-md border border-comet-border bg-comet-card p-3">
                <div className="overflow-hidden rounded bg-comet-black">
                  {item[2] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item[2]} alt="" className="h-20 w-full object-cover" />
                  ) : (
                    <div className="grid h-20 place-items-center text-xs text-zinc-600">Imagen</div>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase text-zinc-400">{item[0] || "CATCH BIG"}</p>
                  <p className="text-sm font-black uppercase leading-4 text-white">{item[1] || "HOT DEALS"}</p>
                  <p className="mt-2 text-xs font-black text-comet-fuchsia">{item[4] || "Shop now"}</p>
                </div>
              </div>
            )}
            <div className="grid gap-2">
              {config.labels.map((label, partIndex) => (
                <label key={label}>
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">{label}</span>
                  <input
                    value={item[partIndex] || ""}
                    onChange={(event) => updateItem(index, partIndex, event.target.value)}
                    className="h-9 w-full rounded-md border border-comet-border bg-comet-black px-2 text-xs text-white outline-none focus:border-comet-fuchsia"
                  />
                </label>
              ))}
            </div>
            <button onClick={() => removeItem(index)} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-comet-fuchsia">
              <Trash2 size={14} /> Quitar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewHeader({ rows, mode }: { rows: LayoutAdminRow[]; mode: PreviewMode }) {
  const rowById = Object.fromEntries(rows.map((row) => [row.id, row]));
  const topLeft = rowById.header_top_left;
  const topRight = rowById.header_top_right;
  const brand = rowById["nav-principal"];
  const search = rowById.header_search;
  const nav = rowById["header-categorias"];
  const navItems = parseItems(nav?.items || nav?.texto || "");

  if (mode === "mobile") {
    return (
      <div className="overflow-hidden rounded-md border border-comet-border bg-comet-black text-white">
        <div className="border-b border-comet-border bg-[#18040d] px-3 py-2 text-[11px] text-zinc-300">
          {topLeft?.texto}
        </div>
        <div className="grid gap-3 px-3 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md comet-gradient font-black">G</span>
              <span>
                <span className="block text-lg font-black leading-none">{brand?.titulo || "COMETA G"}</span>
                <span className="text-xs text-zinc-400">{brand?.subtitulo || "Computacion Gamer"}</span>
              </span>
            </div>
            <div className="flex gap-2">
              {["U", "W", "C"].map((item) => (
                <span key={item} className="grid h-9 w-9 place-items-center rounded-md border border-comet-border text-xs">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="flex h-10 overflow-hidden rounded-md border border-comet-fuchsia/70 bg-comet-panel">
            <div className="flex-1 px-3 py-2 text-xs text-zinc-500">{search?.texto || "Buscar..."}</div>
            <div className="grid w-10 place-items-center comet-gradient">
              <Search size={16} />
            </div>
          </div>
        </div>
        <div className="flex overflow-x-auto bg-gradient-to-r from-comet-red via-comet-fuchsia to-comet-violet">
          <span className="shrink-0 border-r border-white/15 px-4 py-3 text-sm font-black">{nav?.boton || "Categorias"}</span>
          {navItems.map((item) => (
            <span key={item.label} className="shrink-0 border-r border-white/15 px-4 py-3 text-sm font-black">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const topGrid = mode === "tablet" ? "grid-cols-[1fr_1fr]" : "grid-cols-3";
  const brandGrid = mode === "tablet" ? "grid-cols-[1fr_1.4fr]" : "grid-cols-[1fr_2fr_1fr]";

  return (
    <div className="overflow-hidden rounded-md border border-comet-border bg-comet-black text-white">
      <div className={`grid ${topGrid} border-b border-comet-border bg-[#18040d] px-4 py-2 text-[11px] text-zinc-300`}>
        <div>{topLeft?.texto}</div>
        {mode === "desktop" && <div />}
        <div className="flex justify-end gap-4">
          {parseItems(topRight?.items || "").map((item) => (
            <span key={item.label}>{item.label}</span>
          ))}
        </div>
      </div>
      <div className={`grid ${brandGrid} items-center gap-5 px-4 py-5`}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md comet-gradient font-black">G</span>
          <span>
            <span className="block text-xl font-black leading-none">{brand?.titulo || "COMETA G"}</span>
            <span className="text-xs text-zinc-400">{brand?.subtitulo || "Computacion Gamer"}</span>
          </span>
        </div>
        <div className="flex h-11 overflow-hidden rounded-md border border-comet-fuchsia/70 bg-comet-panel">
          <div className="flex-1 px-4 py-3 text-sm text-zinc-500">{search?.texto || "Buscar..."}</div>
          <div className="border-l border-comet-border px-4 py-3 text-sm text-zinc-300">Todas</div>
          <div className="grid w-12 place-items-center comet-gradient">
            <Search size={17} />
          </div>
        </div>
        {mode === "desktop" && (
          <div className="flex justify-end gap-2">
            {["U", "W", "C"].map((item) => (
              <span key={item} className="grid h-10 w-10 place-items-center rounded-md border border-comet-border text-xs">
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex bg-gradient-to-r from-comet-red via-comet-fuchsia to-comet-violet px-4">
        <span className="border-x border-white/15 px-4 py-3 text-sm font-black">{nav?.boton || "Categorias"}</span>
        {navItems.map((item) => (
          <span key={item.label} className="border-r border-white/15 px-4 py-3 text-sm font-black">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PreviewSelectedBlock({ row, rows, mode }: { row?: LayoutAdminRow; rows: LayoutAdminRow[]; mode: PreviewMode }) {
  if (!row) return <PreviewHeader rows={rows} mode={mode} />;

  const kind = structuredKind(row);
  const items = splitStructuredItems(row.items || row.texto, kind === "promo" ? 5 : 3);

  if (kind === "hero") {
    const columns = heroColumns(row);
    const desktopColumns = row.carousel === "TRUE" ? 1 : numberFrom(row.columnas_desktop, 2);
    const visibleColumns = row.carousel === "TRUE" ? columns.slice(0, 1) : columns;
    return (
      <div className="rounded-md border border-comet-border bg-comet-card p-5">
        {row.carousel === "TRUE" && (
          <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-wide text-comet-fuchsia">
            <span>Carousel activo</span>
            <span>{row.autoplay === "TRUE" ? "Autoplay" : "Manual"}</span>
          </div>
        )}
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: mode === "mobile" ? "1fr" : `repeat(${Math.min(desktopColumns, 4)}, minmax(0, 1fr))` }}
        >
          {visibleColumns.map((column, index) => (
            <div key={index} className="flex min-h-52 flex-col justify-center overflow-hidden rounded-md bg-comet-black p-4">
              {column[0] === "image" ? (
                column[3] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={column[3]} alt="" className="h-full min-h-52 w-full object-contain" />
                ) : (
                  <div className="grid min-h-52 place-items-center text-xs text-zinc-600">Imagen</div>
                )
              ) : column[0] === "empty" ? (
                <div className="grid min-h-52 place-items-center rounded border border-dashed border-zinc-700 text-xs text-zinc-600">
                  Columna vacia
                </div>
              ) : (
                <>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-comet-fuchsia">{row.subtitulo}</p>
                  <h3 className={`${mode === "mobile" ? "text-3xl" : "text-5xl"} mt-3 font-black leading-tight text-white`}>
                    {column[1] || row.titulo || row.id}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{column[2] || row.texto}</p>
                  {(column[4] || row.boton) && (
                    <span className="mt-5 inline-flex w-fit rounded-md comet-gradient px-4 py-2 text-sm font-black text-white">
                      {column[4] || row.boton}
                    </span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "grid") {
    const columns = mode === "mobile" ? "grid-cols-1" : mode === "tablet" ? "grid-cols-3" : "grid-cols-5";
    return (
      <div className="rounded-md border border-comet-border bg-comet-card p-4">
        <div className="mb-4 flex items-end justify-between border-b border-comet-border pb-3">
          <div>
            <h3 className="text-xl font-black text-white">{row.titulo || "Productos"}</h3>
            {row.subtitulo && <p className="text-sm text-zinc-400">{row.subtitulo}</p>}
          </div>
          <span className="text-xs font-black uppercase text-comet-fuchsia">{row.filtro || row.categoria || "dinamico"}</span>
        </div>
        <div className={`grid gap-3 ${columns}`}>
          {Array.from({ length: mode === "mobile" ? 3 : 5 }).map((_, index) => (
            <div key={index} className="rounded-md border border-comet-border bg-comet-black p-3">
              <div className="mb-3 h-20 rounded bg-white/5" />
              <p className="text-xs text-zinc-500">Producto</p>
              <p className="mt-1 text-sm font-black text-white">Item destacado</p>
              <p className="mt-3 text-sm font-black text-white">$ 000.000</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "promo") {
    const promoGrid = mode === "mobile" ? "grid-cols-1" : mode === "tablet" ? "grid-cols-2" : "grid-cols-2";
    return (
      <div className={`grid gap-3 ${promoGrid}`}>
        {items.map((item, index) => (
          <div key={index} className="grid min-h-28 grid-cols-[42%_1fr] items-center gap-3 rounded-md border border-comet-border bg-comet-card p-3">
            <div className="overflow-hidden rounded bg-comet-black">
              {item[2] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item[2]} alt="" className="h-20 w-full object-cover" />
              ) : (
                <div className="grid h-20 place-items-center text-xs text-zinc-600">Imagen</div>
              )}
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-400">{item[0]}</p>
              <p className="text-lg font-black uppercase leading-5 text-white">{item[1]}</p>
              <p className="mt-2 text-sm font-black text-comet-fuchsia">{item[4]}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "benefit") {
    const benefitGrid = mode === "mobile" ? "grid-cols-1" : mode === "tablet" ? "grid-cols-2" : "grid-cols-5";
    return (
      <div className={`grid overflow-hidden rounded-md border border-comet-border bg-comet-card ${benefitGrid}`}>
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-[36px_1fr] items-center gap-3 border-b border-comet-border p-4 sm:border-r">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-comet-fuchsia/40 text-xs font-black text-comet-fuchsia">
              {index + 1}
            </span>
            <span>
              <span className="block text-sm font-black text-white">{item[0]}</span>
              <span className="text-xs text-zinc-400">{item[1]}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "tab") {
    return (
      <div className="flex flex-wrap justify-center gap-6 border-b border-comet-border">
        {items.map((item, index) => (
          <span key={index} className={`relative pb-4 text-lg ${index === 0 ? "font-black text-white" : "text-zinc-400"}`}>
            {item[0]}
            {index === 0 && <span className="absolute bottom-0 left-0 h-0.5 w-full comet-gradient" />}
          </span>
        ))}
      </div>
    );
  }

  if (kind === "link") {
    const linkItems = splitStructuredItems(row.items || row.texto, 2);
    const columns = mode === "mobile" ? "grid-cols-1" : "grid-cols-2";
    return (
      <div className={`grid gap-4 rounded-md border border-comet-border bg-comet-card p-5 ${columns}`}>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-comet-fuchsia">{row.variante || row.tipo}</p>
          <h3 className="mt-2 text-xl font-black text-white">{row.titulo || row.label}</h3>
          {row.texto && <p className="mt-2 text-sm leading-6 text-zinc-400">{row.texto}</p>}
        </div>
        <div className="flex flex-wrap content-start gap-2">
          {linkItems.map((item, index) => (
            <span key={`${item[0]}-${index}`} className="rounded-md border border-comet-border bg-comet-black px-3 py-2 text-xs font-black text-white">
              {item[0]}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (row.zona === "header") return <PreviewHeader rows={rows} mode={mode} />;

  return (
    <div className="rounded-md border border-comet-border bg-comet-card p-5">
      <p className="text-xs uppercase tracking-wide text-comet-fuchsia">{row.zona}</p>
      <h3 className="mt-2 text-xl font-black text-white">{row.titulo || row.id}</h3>
      {row.subtitulo && <p className="mt-1 text-sm text-zinc-400">{row.subtitulo}</p>}
      {row.texto && <p className="mt-4 text-sm leading-6 text-zinc-300">{row.texto}</p>}
    </div>
  );
}

export default function AdminLayoutPage() {
  const [secret, setSecret] = useState("");
  const [rows, setRows] = useState<LayoutAdminRow[]>([]);
  const [selectedId, setSelectedId] = useState("header_top_left");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeArea, setActiveArea] = useState<LayoutAreaFilter>("header");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newLayoutDirection, setNewLayoutDirection] = useState<"vertical" | "horizontal">("vertical");
  const [newRows, setNewRows] = useState("1");
  const [newColumns, setNewColumns] = useState("1");
  const [newPadding, setNewPadding] = useState("24");
  const [newBorder, setNewBorder] = useState("none");
  const [sessionExpiresAt, setSessionExpiresAt] = useState(0);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) || rows[0],
    [rows, selectedId]
  );
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => visualRank(a).localeCompare(visualRank(b))),
    [rows]
  );
  const visibleRows = useMemo(
    () => sortedRows.filter((row) => row.zona === activeArea),
    [activeArea, sortedRows]
  );

  function renewAdminSession(currentSecret = secret) {
    if (!currentSecret) return;
    const expiresAt = Date.now() + ADMIN_SESSION_MS;
    setSessionExpiresAt(expiresAt);
    window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ secret: currentSecret, expiresAt }));
    window.localStorage.removeItem(LEGACY_SECRET_KEY);
  }

  function expireAdminSession() {
    setSecret("");
    setRows([]);
    setSessionExpiresAt(0);
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    window.localStorage.removeItem(LEGACY_SECRET_KEY);
    setMessage("La sesion admin vencio por inactividad. Volve a cargar con la clave.");
  }

  function isAdminSessionExpired() {
    return Boolean(secret && sessionExpiresAt && Date.now() > sessionExpiresAt);
  }

  useEffect(() => {
    const savedSession = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession) as { secret?: string; expiresAt?: number };
        if (parsed.secret && parsed.expiresAt && parsed.expiresAt > Date.now()) {
          setSecret(parsed.secret);
          setSessionExpiresAt(parsed.expiresAt);
          return;
        }
      } catch {
        // Ignore invalid local admin session.
      }
    }

    const legacySecret = window.localStorage.getItem(LEGACY_SECRET_KEY);
    if (legacySecret) {
      setSecret(legacySecret);
      const expiresAt = Date.now() + ADMIN_SESSION_MS;
      setSessionExpiresAt(expiresAt);
      window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ secret: legacySecret, expiresAt }));
      window.localStorage.removeItem(LEGACY_SECRET_KEY);
    }
  }, []);

  useEffect(() => {
    if (!secret) return;

    const resetEvents = ["click", "keydown", "input", "change", "pointerdown"];
    const onActivity = () => renewAdminSession(secret);
    resetEvents.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));

    const interval = window.setInterval(() => {
      if (sessionExpiresAt && Date.now() > sessionExpiresAt) expireAdminSession();
    }, 10000);

    return () => {
      resetEvents.forEach((eventName) => window.removeEventListener(eventName, onActivity));
      window.clearInterval(interval);
    };
  }, [secret, sessionExpiresAt]);

  async function loadRows(currentSecret = secret) {
    if (currentSecret === secret && isAdminSessionExpired()) {
      expireAdminSession();
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/layout", {
        headers: { "x-admin-secret": currentSecret }
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.ok) throw new Error("No se pudo cargar el layout.");
      setRows(data.rows);
      setSelectedId((current) => data.rows.find((row) => row.id === current)?.id || data.rows.find((row) => row.zona === activeArea)?.id || data.rows[0]?.id || "");
      renewAdminSession(currentSecret);
    } catch {
      setRows(headerTemplateRows.map((row, index) => ({ ...row, rowNumber: 0 - index })));
      setMessage("No pude leer la Sheet. Te muestro la plantilla base para crearla.");
    } finally {
      setLoading(false);
    }
  }

  function updateSelected(key: LayoutSimpleColumn, value: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === selected?.id
          ? {
              ...row,
              [key]: value,
              label: key === "titulo" && value ? value : row.label
            }
          : row
      )
    );
  }

  async function saveSelected() {
    if (!selected) return;
    await saveRow(selected);
  }

  async function saveRow(rowToSave: LayoutAdminRow) {
    if (isAdminSessionExpired()) {
      expireAdminSession();
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/layout", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret
        },
        body: JSON.stringify({ rowNumber: rowToSave.rowNumber, row: rowToSave })
      });
      const data = (await response.json()) as { ok: boolean; mode?: string };
      if (!response.ok || !data.ok) throw new Error("No se pudo guardar.");
      setMessage(data.mode === "created" ? "Bloque creado en LAYOUT." : "Bloque actualizado.");
      await loadRows(secret);
    } catch {
      setMessage("No pude guardar. Revisa la clave admin y permisos de la Sheet.");
    } finally {
      setSaving(false);
    }
  }

  function addBlock(template = blockTemplates[0]) {
    const row = {
      ...emptyRow(),
      ...template.row,
      id: `custom_${template.label.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
      zona: (template.row.zona as LayoutAreaFilter) || activeArea,
      visible: "TRUE",
      label: template.label,
      description: `${template.row.tipo || "bloque"} / ${newLayoutDirection}`,
      columnas_desktop: template.row.columnas_desktop || newColumns,
      columnas_mobile: template.row.columnas_mobile || "1",
      padding: template.row.padding || newPadding,
      border: template.row.border || newBorder,
      texto: template.row.texto || `Layout ${newRows} fila(s) x ${newColumns} columna(s)`
    };
    setRows((current) => [row, ...current]);
    setSelectedId(row.id);
    setActiveArea(row.zona as LayoutAreaFilter);
    setAddOpen(false);
  }

  function chooseArea(area: LayoutAreaFilter) {
    setActiveArea(area);
    const next = sortedRows.find((row) => row.zona === area);
    if (next) setSelectedId(next.id);
  }

  async function toggleVisible(row: LayoutAdminRow) {
    const nextRow = { ...row, visible: row.visible === "FALSE" ? "TRUE" : "FALSE" };
    setRows((current) => current.map((item) => (item.id === row.id ? nextRow : item)));
    setMessage(nextRow.visible === "FALSE" ? "Seccion ocultada. Guardando..." : "Seccion visible. Guardando...");
    await saveRow(nextRow);
  }

  async function deleteSelected() {
    if (!selected) return;
    if (isAdminSessionExpired()) {
      expireAdminSession();
      return;
    }

    if (selected.rowNumber <= 1) {
      setRows((current) => current.filter((row) => row.id !== selected.id));
      setSelectedId(visibleRows.find((row) => row.id !== selected.id)?.id || "");
      setMessage("Bloque nuevo eliminado.");
      return;
    }

    const response = await fetch("/api/admin/layout", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({ rowNumber: selected.rowNumber })
    });

    if (!response.ok) {
      setMessage("No pude eliminar la seccion.");
      return;
    }

    setMessage("Seccion eliminada de LAYOUT.");
    await loadRows(secret);
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] text-zinc-100">
      <div className={`grid min-h-screen ${sidebarCollapsed ? "lg:grid-cols-[72px_1fr]" : "lg:grid-cols-[260px_1fr]"}`}>
        <aside className="border-r border-comet-border bg-[#111118]">
          <div className="border-b border-comet-border px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md comet-gradient font-black">G</span>
              {!sidebarCollapsed && <div>
                <p className="text-sm font-black">COMETA G CMS</p>
                <p className="text-xs text-zinc-500">Layout visual</p>
              </div>}
            </div>
          </div>
          <nav className="p-3">
            <button
              onClick={() => setSidebarCollapsed((current) => !current)}
              className="mb-3 flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-zinc-300 hover:bg-white/5"
              title={sidebarCollapsed ? "Expandir" : "Plegar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              {!sidebarCollapsed && "Plegar"}
            </button>
            {areaTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => chooseArea(id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-bold ${
                  activeArea === id ? "bg-comet-fuchsia/15 text-white" : "text-zinc-300 hover:bg-white/5"
                }`}
              >
                <Icon size={18} /> {!sidebarCollapsed && label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 border-b border-comet-border pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-comet-fuchsia">Administrador</p>
              <h1 className="mt-2 text-3xl font-black text-white">Editor de layout</h1>
              {sessionExpiresAt > Date.now() && (
                <p className="mt-1 text-xs text-zinc-500">Sesion activa: se renueva con clicks o cambios.</p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder="Clave admin"
                className="h-11 rounded-md border border-comet-border bg-comet-panel px-3 text-sm text-white outline-none"
              />
              <button
                onClick={() => loadRows()}
                disabled={loading || !secret}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-comet-border px-4 text-sm font-black text-white hover:border-comet-fuchsia disabled:opacity-50"
              >
                {loading ? <Loader2 size={17} className="animate-spin" /> : <Monitor size={17} />}
                Cargar
              </button>
            </div>
          </div>

          {message && (
            <div className="mb-5 rounded-md border border-comet-fuchsia/40 bg-comet-fuchsia/10 px-4 py-3 text-sm text-zinc-200">
              {message}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
            <section className="rounded-md border border-comet-border bg-comet-panel">
              <div className="flex items-center justify-between border-b border-comet-border px-4 py-3">
                <h2 className="text-sm font-black text-white">Bloques</h2>
                <button onClick={() => setAddOpen(true)} className="rounded-md border border-comet-border px-3 py-1.5 text-xs font-bold">
                  Nuevo
                </button>
              </div>
              <div className="max-h-[720px] overflow-auto p-2">
                {visibleRows.map((row) => (
                  <div
                    key={`${row.id}-${row.rowNumber}`}
                    className={`mb-2 w-full rounded-md border p-3 text-left transition ${
                      selectedId === row.id
                        ? "border-comet-fuchsia bg-comet-fuchsia/10"
                        : "border-comet-border bg-comet-black hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button onClick={() => setSelectedId(row.id)} className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-black text-white">{row.label}</p>
                        <p className="mt-1 text-xs text-zinc-500">{row.description}</p>
                      </button>
                      <button
                        onClick={() => toggleVisible(row)}
                        className={`grid h-8 w-8 place-items-center rounded-md border ${
                          row.visible === "FALSE" ? "border-zinc-700 text-zinc-600" : "border-comet-border text-zinc-300"
                        }`}
                        title={row.visible === "FALSE" ? "Mostrar seccion" : "Ocultar seccion"}
                      >
                        {row.visible === "FALSE" ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-md border border-comet-border bg-comet-panel">
              <div className="border-b border-comet-border px-5 py-4">
                <h2 className="text-lg font-black text-white">{selected?.label || "Selecciona un bloque"}</h2>
                <p className="mt-1 text-sm text-zinc-500">{selected?.id}</p>
              </div>

              {selected && (
                <div className="grid gap-4 p-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-comet-fuchsia">Edicion visual</p>
                  </div>

                  {["hero", "grid"].includes(structuredKind(selected) || "") && (
                    <VisualBlockEditor row={selected} onFieldChange={updateSelected} />
                  )}

                  {["promo", "benefit", "tab", "link"].includes(structuredKind(selected) || "") && (
                    <StructuredItemsEditor
                      row={selected}
                      onChange={(value) => updateSelected("items", value)}
                    />
                  )}

                  {!structuredKind(selected) && (
                    <div className="md:col-span-2 rounded-md border border-comet-border bg-comet-black p-4">
                      <p className="text-sm font-black text-white">{selected.titulo || selected.label}</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">{selected.texto || "Bloque simple. Usa la configuracion avanzada para editarlo."}</p>
                    </div>
                  )}

                  <div className="md:col-span-2 border-t border-comet-border pt-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Configuracion avanzada</p>
                  </div>

                  {editableFields
                    .filter((field) => {
                      const kind = structuredKind(selected);
                      if (kind && field.key === "items") return false;
                      if (kind === "hero" && ["titulo", "subtitulo", "texto", "imagen", "enlace", "boton"].includes(field.key)) return false;
                      if (kind === "grid" && ["titulo", "subtitulo", "filtro", "categoria", "marca", "columnas_desktop", "columnas_mobile", "carousel"].includes(field.key)) return false;
                      return true;
                    })
                    .map((field) => (
                    <label key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-zinc-500">
                        {field.label}
                      </span>
                      {field.type === "textarea" ? (
                        <textarea
                          value={fieldValue(selected, field.key)}
                          onChange={(event) => updateSelected(field.key, event.target.value)}
                          rows={4}
                          className="w-full rounded-md border border-comet-border bg-comet-black px-3 py-3 text-sm text-white outline-none focus:border-comet-fuchsia"
                        />
                      ) : field.type === "select" ? (
                        <select
                          value={fieldValue(selected, field.key)}
                          onChange={(event) => updateSelected(field.key, event.target.value)}
                          className="h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
                        >
                          <option value="">Sin definir</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option} style={field.key === "font_weight" ? { fontWeight: Number(option) } : undefined}>
                              {field.key === "font_weight" ? fontWeightLabels[option] || option : option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={fieldValue(selected, field.key)}
                          onChange={(event) => updateSelected(field.key, event.target.value)}
                          className="h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
                        />
                      )}
                    </label>
                  ))}

                  <div className="md:col-span-2 flex flex-wrap gap-2 border-t border-comet-border pt-4">
                    {[
                      ["left", AlignLeft],
                      ["center", AlignCenter],
                      ["right", AlignRight]
                    ].map(([value, Icon]) => (
                      <button
                        key={String(value)}
                        onClick={() => updateSelected("align", String(value))}
                        className={`grid h-10 w-10 place-items-center rounded-md border ${
                          selected.align === value ? "border-comet-fuchsia text-white" : "border-comet-border text-zinc-400"
                        }`}
                        title={String(value)}
                      >
                        <Icon size={18} />
                      </button>
                    ))}
                    <button
                      onClick={() => toggleVisible(selected)}
                      disabled={saving}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-comet-border px-4 text-sm font-black text-white disabled:opacity-60"
                    >
                      {selected.visible === "FALSE" ? <EyeOff size={16} /> : <Eye size={16} />}
                      {selected.visible === "FALSE" ? "Oculta" : "Visible"}
                    </button>
                    <button
                      onClick={deleteSelected}
                      disabled={saving}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-red-500/40 px-4 text-sm font-black text-red-200 disabled:opacity-60"
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                    <button
                      onClick={saveSelected}
                      disabled={saving}
                      className="ml-auto inline-flex h-10 items-center gap-2 rounded-md comet-gradient px-4 text-sm font-black text-white disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </section>

          </div>
        </main>
      </div>

      <div className="fixed right-3 top-1/2 z-40 grid -translate-y-1/2 gap-1 rounded-full border border-comet-border bg-comet-black/95 p-2 shadow-2xl">
        {previewModes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setPreviewMode(id);
              setPreviewOpen(true);
            }}
            title={`Preview ${label}`}
            className={`grid h-10 w-10 place-items-center rounded-full border ${
              previewMode === id && previewOpen ? "border-comet-fuchsia text-white" : "border-comet-border text-zinc-400"
            }`}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto flex max-h-full max-w-6xl flex-col overflow-hidden rounded-md border border-comet-border bg-comet-panel">
            <div className="flex items-center justify-between border-b border-comet-border px-5 py-4">
              <div>
                <h2 className="text-xl font-black text-white">Agregar seccion</h2>
                <p className="text-sm text-zinc-500">Elegi el bloque y la estructura base. Despues lo editas visualmente.</p>
              </div>
              <button onClick={() => setAddOpen(false)} className="h-10 rounded-md border border-comet-border px-4 text-sm font-black">
                Cerrar
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-5 overflow-auto p-5 lg:grid-cols-[280px_1fr]">
              <div className="rounded-md border border-comet-border bg-comet-black p-4">
                <p className="text-sm font-black text-white">Layout inicial</p>
                <div className="mt-4 grid gap-3">
                  <label>
                    <span className="mb-1 block text-xs font-black uppercase text-zinc-500">Direccion</span>
                    <select
                      value={newLayoutDirection}
                      onChange={(event) => setNewLayoutDirection(event.target.value as "vertical" | "horizontal")}
                      className="h-10 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm"
                    >
                      <option value="vertical">Vertical</option>
                      <option value="horizontal">Horizontal</option>
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-black uppercase text-zinc-500">Filas</span>
                    <input value={newRows} onChange={(event) => setNewRows(event.target.value)} className="h-10 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm" />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-black uppercase text-zinc-500">Columnas</span>
                    <input value={newColumns} onChange={(event) => setNewColumns(event.target.value)} className="h-10 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm" />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-black uppercase text-zinc-500">Padding</span>
                    <input value={newPadding} onChange={(event) => setNewPadding(event.target.value)} className="h-10 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm" />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-black uppercase text-zinc-500">Borde / bisel</span>
                    <select value={newBorder} onChange={(event) => setNewBorder(event.target.value)} className="h-10 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm">
                      <option value="none">Sin borde</option>
                      <option value="all">Borde completo</option>
                      <option value="top">Arriba</option>
                      <option value="bottom">Abajo</option>
                      <option value="soft">Bisel suave</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {blockTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.label}
                      onClick={() => addBlock(template)}
                      className="group relative min-h-32 rounded-md border border-comet-border bg-comet-black p-4 text-center hover:border-comet-fuchsia hover:bg-comet-fuchsia/10"
                    >
                      <Icon className="mx-auto text-zinc-500 group-hover:text-comet-fuchsia" size={30} />
                      <span className="mt-3 block text-sm font-black text-white">{template.label}</span>
                      <span className="mt-1 block text-xs text-zinc-500">{template.row.tipo}</span>
                      <span className="pointer-events-none absolute left-1/2 top-3 z-20 hidden w-64 -translate-x-1/2 -translate-y-full rounded-md border border-comet-fuchsia/50 bg-[#09090d] p-3 text-left shadow-2xl group-hover:block">
                        <span className="mb-3 grid h-24 overflow-hidden rounded border border-comet-border bg-comet-card p-2">
                          {template.label === "Banner" || template.label === "Carousel" ? (
                            <span className="grid grid-cols-[1fr_1fr] gap-2">
                              <span className="flex flex-col justify-center">
                                <span className="h-2 w-16 rounded bg-comet-fuchsia" />
                                <span className="mt-2 h-4 w-24 rounded bg-white/80" />
                                <span className="mt-2 h-2 w-20 rounded bg-white/25" />
                                <span className="mt-3 h-5 w-16 rounded comet-gradient" />
                              </span>
                              <span className="grid place-items-center rounded bg-comet-black text-lg font-black text-white/80">G</span>
                            </span>
                          ) : template.label === "Grid" || template.label === "Productos" || template.label === "Categorias" ? (
                            <span className="grid grid-cols-3 gap-2">
                              {Array.from({ length: 6 }).map((_, index) => <span key={index} className="rounded bg-white/10" />)}
                            </span>
                          ) : template.label === "Image" ? (
                            <span className="grid place-items-center rounded bg-comet-black text-2xl font-black text-white/80">G</span>
                          ) : (
                            <span className="flex flex-col justify-center gap-2">
                              <span className="h-3 w-28 rounded bg-white/70" />
                              <span className="h-2 w-40 rounded bg-white/20" />
                              <span className="h-2 w-32 rounded bg-white/20" />
                            </span>
                          )}
                        </span>
                        <span className="block text-xs font-black text-white">{template.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-zinc-400">{template.preview}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-md border border-comet-border bg-comet-panel">
            <div className="flex items-center justify-between border-b border-comet-border px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-white">Preview</h2>
                <p className="text-sm text-zinc-500">
                  {activeArea.charAt(0).toUpperCase() + activeArea.slice(1)} {previewMode}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {previewModes.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setPreviewMode(id)}
                    title={label}
                    className={`grid h-10 w-10 place-items-center rounded-md border ${
                      previewMode === id ? "border-comet-fuchsia text-white" : "border-comet-border text-zinc-500"
                    }`}
                  >
                    <Icon size={18} />
                  </button>
                ))}
                <button onClick={() => setPreviewOpen(false)} className="h-10 rounded-md border border-comet-border px-4 text-sm font-black text-white">
                  Cerrar
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-5">
              <div className={`${modeWidth(previewMode)} mx-auto min-h-[80vh] max-w-full rounded-md bg-comet-black p-4`}>
                <PreviewSelectedBlock row={selected} rows={rows} mode={previewMode} />
              </div>
              <p className="mx-auto mt-4 max-w-3xl text-center text-xs leading-5 text-zinc-500">
                El preview es orientativo. Al guardar se actualiza LAYOUT; la web toma los cambios desde Google Sheets.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
