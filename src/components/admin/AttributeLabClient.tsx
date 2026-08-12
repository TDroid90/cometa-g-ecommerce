"use client";

import { AlertTriangle, Beaker, Check, ChevronDown, FlaskConical, Search, Square, SquareCheckBig } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ProductSummary = {
  id: string;
  sku: string;
  nombre: string;
  categoria: string;
  subcategoria: string;
  marca: string;
  atributos: string;
};

type LabStatus = "normalized" | "partial" | "legacy" | "conflict";

type LabResult = {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  before: string;
  after: string;
  status: LabStatus;
  schema: string | null;
  warnings: string[];
  conflicts: Record<string, string[]>;
  segments: Array<{ label: string; value: string }>;
};

const STATUS_STYLES: Record<LabStatus, string> = {
  normalized: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  partial: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  legacy: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  conflict: "border-red-400/30 bg-red-400/10 text-red-300"
};

const REPRESENTATIVE_CATEGORIES = [
  "Procesadores", "Motherboards", "Memorias PC", "Placas de Video",
  "Almacenamiento", "Coolers", "Gabinetes", "Fuentes"
];
const MAX_VISIBLE_PRODUCTS = 120;

function pickRepresentativeSample(products: ProductSummary[], limit = 50) {
  const buckets = new Map<string, ProductSummary[]>();
  products.forEach((product) => {
    const taxonomy = `${product.categoria} ${product.subcategoria}`.toLocaleLowerCase("es");
    const match = REPRESENTATIVE_CATEGORIES.find((item) => taxonomy.includes(item.toLocaleLowerCase("es"))) || "Otros";
    buckets.set(match, [...(buckets.get(match) || []), product]);
  });
  const selected: ProductSummary[] = [];
  let cursor = 0;
  while (selected.length < limit) {
    let added = false;
    for (const category of [...REPRESENTATIVE_CATEGORIES, "Otros"]) {
      const item = buckets.get(category)?.[cursor];
      if (item) { selected.push(item); added = true; }
      if (selected.length >= limit) break;
    }
    if (!added) break;
    cursor += 1;
  }
  return selected;
}

export function AttributeLabClient() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<LabResult[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [resultStatus, setResultStatus] = useState<"" | LabStatus>("");
  const [warningFilter, setWarningFilter] = useState<"" | "with" | "without">("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const secret = typeof window === "undefined" ? "" : window.localStorage.getItem("cometag-admin-secret") || "";

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/admin/lab/products", { headers: { "x-admin-secret": window.localStorage.getItem("cometag-admin-secret") || "" }, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "No se pudo cargar el catálogo.");
        setProducts(payload.products);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo.");
      } finally {
        setLoading(false);
      }
    }
    void loadProducts();
  }, []);

  const categories = useMemo(() => [...new Set(products.map((product) => product.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [products]);
  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return products.filter((product) => {
      const matchesQuery = !needle || `${product.nombre} ${product.sku}`.toLocaleLowerCase("es").includes(needle);
      return matchesQuery && (!category || product.categoria === category);
    });
  }, [products, query, category]);
  const visibleProducts = useMemo(() => [...filteredProducts]
    .sort((left, right) => Number(selected.has(right.id)) - Number(selected.has(left.id)))
    .slice(0, MAX_VISIBLE_PRODUCTS), [filteredProducts, selected]);
  const filteredResults = useMemo(() => results.filter((result) => {
    if (resultStatus && result.status !== resultStatus) return false;
    if (warningFilter === "with" && !result.warnings.length) return false;
    if (warningFilter === "without" && result.warnings.length) return false;
    return true;
  }), [results, resultStatus, warningFilter]);

  function toggleProduct(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectSample() {
    setSelected(new Set(pickRepresentativeSample(products, 50).map((product) => product.id)));
    setResults([]);
  }

  async function runDryRun() {
    setRunning(true);
    setError("");
    try {
      const response = await fetch("/api/admin/lab/attributes/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ productIds: [...selected] })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo ejecutar el dry-run.");
      setResults(payload.results);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo ejecutar el dry-run.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-8 md:px-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-comet-fuchsia">Entorno seguro</p>
          <h2 className="mt-2 text-3xl font-black">Laboratorio de catálogo</h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">Prueba la normalización real de atributos sin escribir en Google Sheets ni modificar producción.</p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-300"><FlaskConical size={15} /> DRY RUN · SOLO LECTURA</div>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[390px_1fr]">
        <aside className="h-fit rounded-lg border border-comet-border bg-comet-panel p-4 xl:sticky xl:top-4">
          <div className="flex items-center justify-between"><h3 className="font-black">Productos reales</h3><span className="text-xs text-zinc-500">{products.length} disponibles</span></div>
          <div className="relative mt-4"><Search size={16} className="absolute left-3 top-3.5 text-zinc-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o SKU" className="h-11 w-full rounded-md border border-comet-border bg-comet-black pl-10 pr-3 text-sm outline-none focus:border-comet-fuchsia" /></div>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-3 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm outline-none focus:border-comet-fuchsia"><option value="">Todas las categorías</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={selectSample} className="rounded-md border border-comet-fuchsia/40 bg-comet-fuchsia/10 px-3 py-2 text-xs font-black text-comet-fuchsia">Muestra de 50</button>
            <button onClick={() => { setSelected(new Set()); setResults([]); }} className="rounded-md border border-comet-border px-3 py-2 text-xs font-black text-zinc-400">Limpiar</button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">{selected.size} seleccionados · máximo 100 por prueba</p>
          {filteredProducts.length > visibleProducts.length && <p className="mt-1 text-[11px] text-zinc-600">Mostrando {visibleProducts.length} de {filteredProducts.length}. Usa la búsqueda para acotar.</p>}
          <div className="mt-3 max-h-[510px] space-y-2 overflow-y-auto pr-1">
            {loading && <p className="py-8 text-center text-sm text-zinc-500">Cargando catálogo...</p>}
            {!loading && visibleProducts.map((product) => {
              const isSelected = selected.has(product.id);
              return (
                <button key={product.id} onClick={() => toggleProduct(product.id)} className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition ${isSelected ? "border-comet-fuchsia bg-comet-fuchsia/10" : "border-comet-border bg-comet-black hover:border-zinc-600"}`}>
                  {isSelected ? <SquareCheckBig size={17} className="mt-0.5 shrink-0 text-comet-fuchsia" /> : <Square size={17} className="mt-0.5 shrink-0 text-zinc-600" />}
                  <span className="min-w-0"><strong className="block truncate text-sm text-white">{product.nombre}</strong><span className="mt-1 block text-xs text-zinc-500">{product.sku} · {product.categoria}{product.subcategoria ? ` / ${product.subcategoria}` : ""}</span></span>
                </button>
              );
            })}
          </div>
          <button onClick={runDryRun} disabled={!selected.size || running} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-comet-gradient text-sm font-black disabled:opacity-40"><Beaker size={17} /> {running ? "Normalizando..." : "Ejecutar dry-run"}</button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </aside>

        <section className="min-w-0">
          <div className="rounded-lg border border-comet-border bg-comet-panel p-4">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div><h3 className="font-black">Resultados</h3><p className="mt-1 text-xs text-zinc-500">{filteredResults.length} de {results.length} visibles</p></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <select value={resultStatus} onChange={(event) => setResultStatus(event.target.value as "" | LabStatus)} className="h-10 rounded-md border border-comet-border bg-comet-black px-3 text-xs"><option value="">Todos los estados</option><option value="normalized">normalized</option><option value="partial">partial</option><option value="legacy">legacy</option><option value="conflict">conflict</option></select>
                <select value={warningFilter} onChange={(event) => setWarningFilter(event.target.value as "" | "with" | "without")} className="h-10 rounded-md border border-comet-border bg-comet-black px-3 text-xs"><option value="">Todos los warnings</option><option value="with">Con warnings</option><option value="without">Sin warnings</option></select>
              </div>
            </div>
          </div>

          {!results.length && <div className="mt-5 grid min-h-72 place-items-center rounded-lg border border-dashed border-comet-border text-center"><div><Beaker className="mx-auto text-zinc-700" size={34} /><p className="mt-3 font-bold text-zinc-400">Selecciona productos y ejecuta el dry-run</p><p className="mt-1 text-sm text-zinc-600">Nada se guardará en la hoja PRODUCTOS.</p></div></div>}

          <div className="mt-5 space-y-4">
            {filteredResults.map((result) => (
              <article key={result.id} className="overflow-hidden rounded-lg border border-comet-border bg-comet-panel">
                <div className="flex flex-col justify-between gap-3 border-b border-comet-border p-4 md:flex-row md:items-start">
                  <div><h4 className="font-black text-white">{result.name}</h4><p className="mt-1 text-xs text-zinc-500">SKU {result.sku} · {result.category}{result.subcategory ? ` / ${result.subcategory}` : ""} · {result.brand}</p></div>
                  <span className={`w-fit rounded border px-2 py-1 text-[11px] font-black uppercase ${STATUS_STYLES[result.status]}`}>{result.status}</span>
                </div>
                <div className="grid gap-px bg-comet-border lg:grid-cols-2">
                  <div className="bg-comet-panel p-4"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">Antes · columna S</p><p className="mt-3 break-words font-mono text-xs leading-6 text-zinc-400">{result.before || "Sin atributos"}</p></div>
                  <div className="bg-comet-panel p-4"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-comet-fuchsia">Después · dry-run</p><p className="mt-3 break-words font-mono text-xs leading-6 text-zinc-200">{result.after}</p></div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">Vista de tarjetas del frontend</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{result.segments.map((item, index) => <div key={`${item.label}-${index}`} className="rounded-md border border-comet-border bg-comet-black p-3"><span className="block text-[10px] uppercase text-zinc-600">{item.label}</span><strong className="mt-1 block text-sm text-white">{item.value}</strong></div>)}</div>
                  {result.warnings.length > 0 && <details className="mt-4 rounded-md border border-amber-400/20 bg-amber-400/5 p-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-black text-amber-300"><AlertTriangle size={14} /> {result.warnings.length} warning{result.warnings.length === 1 ? "" : "s"}<ChevronDown size={14} className="ml-auto" /></summary><ul className="mt-3 space-y-1 text-xs text-amber-100/70">{result.warnings.map((warning) => <li key={warning}>· {warning}</li>)}</ul></details>}
                  {!result.warnings.length && <p className="mt-4 flex items-center gap-2 text-xs text-emerald-400"><Check size={14} /> Sin warnings</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
