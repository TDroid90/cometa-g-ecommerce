"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Eye,
  EyeOff,
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

function VisualBlockEditor({
  row,
  onFieldChange
}: {
  row: LayoutAdminRow;
  onFieldChange: (key: LayoutSimpleColumn, value: string) => void;
}) {
  const kind = structuredKind(row);

  if (kind === "hero") {
    return (
      <div className="md:col-span-2 rounded-md border border-comet-border bg-comet-black p-4">
        <div className="mb-4 grid gap-4 rounded-md border border-comet-border bg-comet-card p-4 lg:grid-cols-[1fr_44%]">
          <div className="flex min-h-56 flex-col justify-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-comet-fuchsia">
              {row.subtitulo || "Subtitulo"}
            </p>
            <h3 className="mt-3 text-4xl font-black leading-tight text-white">{row.titulo || "Titulo del banner"}</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{row.texto || "Texto descriptivo del banner."}</p>
            <span className="mt-5 inline-flex w-fit rounded-md comet-gradient px-4 py-2 text-sm font-black text-white">
              {row.boton || "Boton"}
            </span>
          </div>
          <div className="overflow-hidden rounded-md border border-comet-border bg-comet-black">
            {row.imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.imagen} alt="" className="h-full min-h-56 w-full object-cover" />
            ) : (
              <div className="grid min-h-56 place-items-center text-sm text-zinc-600">Imagen principal</div>
            )}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["subtitulo", "Texto superior"],
            ["titulo", "Titulo"],
            ["texto", "Descripcion"],
            ["imagen", "Imagen URL"],
            ["enlace", "Link"],
            ["boton", "Boton"]
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
    const heroGrid = mode === "mobile" ? "grid-cols-1" : "grid-cols-[1fr_44%]";
    return (
      <div className={`grid gap-5 rounded-md border border-comet-border bg-comet-card p-5 ${heroGrid}`}>
        <div className="flex min-h-52 flex-col justify-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-comet-fuchsia">{row.subtitulo}</p>
          <h3 className={`${mode === "mobile" ? "text-3xl" : "text-5xl"} mt-3 font-black leading-tight text-white`}>
            {row.titulo || row.id}
          </h3>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{row.texto}</p>
          {row.boton && <span className="mt-5 inline-flex w-fit rounded-md comet-gradient px-4 py-2 text-sm font-black text-white">{row.boton}</span>}
        </div>
        <div className="overflow-hidden rounded-md border border-comet-border bg-comet-black">
          {row.imagen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.imagen} alt="" className="h-full min-h-52 w-full object-cover" />
          ) : (
            <div className="grid min-h-52 place-items-center text-xs text-zinc-600">Imagen</div>
          )}
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

  useEffect(() => {
    const saved = window.localStorage.getItem("cometag-admin-secret");
    if (saved) setSecret(saved);
  }, []);

  async function loadRows(currentSecret = secret) {
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
      window.localStorage.setItem("cometag-admin-secret", currentSecret);
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
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/layout", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret
        },
        body: JSON.stringify({ rowNumber: selected.rowNumber, row: selected })
      });
      const data = (await response.json()) as { ok: boolean; mode?: string };
      if (!response.ok || !data.ok) throw new Error("No se pudo guardar.");
      setMessage(data.mode === "created" ? "Bloque creado en LAYOUT_SIMPLE." : "Bloque actualizado.");
      await loadRows(secret);
    } catch {
      setMessage("No pude guardar. Revisa la clave admin y permisos de la Sheet.");
    } finally {
      setSaving(false);
    }
  }

  function addBlock() {
    const row = { ...emptyRow(), zona: activeArea };
    setRows((current) => [row, ...current]);
    setSelectedId(row.id);
  }

  function chooseArea(area: LayoutAreaFilter) {
    setActiveArea(area);
    const next = sortedRows.find((row) => row.zona === area);
    if (next) setSelectedId(next.id);
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

          <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
            <section className="rounded-md border border-comet-border bg-comet-panel">
              <div className="flex items-center justify-between border-b border-comet-border px-4 py-3">
                <h2 className="text-sm font-black text-white">Bloques</h2>
                <button onClick={addBlock} className="rounded-md border border-comet-border px-3 py-1.5 text-xs font-bold">
                  Nuevo
                </button>
              </div>
              <div className="max-h-[720px] overflow-auto p-2">
                {visibleRows.map((row) => (
                  <button
                    key={`${row.id}-${row.rowNumber}`}
                    onClick={() => setSelectedId(row.id)}
                    className={`mb-2 w-full rounded-md border p-3 text-left transition ${
                      selectedId === row.id
                        ? "border-comet-fuchsia bg-comet-fuchsia/10"
                        : "border-comet-border bg-comet-black hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">{row.label}</p>
                        <p className="mt-1 text-xs text-zinc-500">{row.description}</p>
                      </div>
                      {row.visible === "FALSE" ? <EyeOff size={16} /> : <Eye size={16} />}
                    </div>
                  </button>
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
                  {["hero", "grid"].includes(structuredKind(selected) || "") && (
                    <VisualBlockEditor row={selected} onFieldChange={updateSelected} />
                  )}

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
                            <option key={option} value={option}>
                              {option}
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

                  {["promo", "benefit", "tab", "link"].includes(structuredKind(selected) || "") && (
                    <StructuredItemsEditor
                      row={selected}
                      onChange={(value) => updateSelected("items", value)}
                    />
                  )}

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

            <section className="rounded-md border border-comet-border bg-comet-panel">
              <div className="flex items-center justify-between border-b border-comet-border px-5 py-4">
                <div>
                  <h2 className="text-lg font-black text-white">Preview</h2>
                  <p className="text-sm text-zinc-500">
                    {activeArea.charAt(0).toUpperCase() + activeArea.slice(1)} {previewMode}
                  </p>
                </div>
                <div className="flex gap-1">
                  {previewModes.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setPreviewMode(id)}
                      title={label}
                      className={`grid h-9 w-9 place-items-center rounded-md border ${
                        previewMode === id ? "border-comet-fuchsia text-white" : "border-comet-border text-zinc-500"
                      }`}
                    >
                      <Icon size={17} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-auto p-5">
                <div className={`${modeWidth(previewMode)} mx-auto max-w-full`}>
                  <PreviewSelectedBlock row={selected} rows={rows} mode={previewMode} />
                </div>
                <p className="mt-4 text-xs leading-5 text-zinc-500">
                  El preview es orientativo. Al guardar se actualiza `LAYOUT_SIMPLE`; la web toma los cambios desde Google Sheets.
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
