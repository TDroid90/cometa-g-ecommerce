"use client";

import {
  AlertTriangle,
  Check,
  ChevronRight,
  Circle,
  Cpu,
  Fan,
  Gamepad2,
  HardDrive,
  MemoryStick,
  MessageCircle,
  Minus,
  Monitor,
  Mouse,
  PackagePlus,
  Plus,
  Power,
  ShoppingCart,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { ProductImage } from "@/components/products/ProductImage";
import { formatPrice, productPrice } from "@/lib/data";
import { displayProductName } from "@/lib/productNames";
import { Product } from "@/lib/types";

type SlotKey = "cpu" | "motherboard" | "cooler" | "ram" | "gpu" | "ssd" | "hdd" | "case" | "psu" | "monitor" | "peripherals" | "accessories";
type PeripheralKind = "mouse" | "keyboard" | "audio";
type SelectionKey = Exclude<SlotKey, "peripherals"> | PeripheralKind;

type BuilderSlot = {
  key: SlotKey;
  title: string;
  description: string;
  optional?: boolean;
  icon: typeof Cpu;
};

const slots: BuilderSlot[] = [
  { key: "cpu", title: "Procesador", description: "Elegi primero AMD o Intel.", icon: Cpu },
  { key: "motherboard", title: "Mother", description: "Solo mothers compatibles con el socket elegido.", icon: Cpu },
  { key: "cooler", title: "Cooler", description: "Water cooler, air cooler y refrigeracion liquida para CPU.", optional: true, icon: Fan },
  { key: "ram", title: "Memorias RAM", description: "Filtradas por el tipo de memoria de la mother.", icon: MemoryStick },
  { key: "gpu", title: "Placa de video", description: "Solo productos identificados como Placa de Video.", optional: true, icon: Gamepad2 },
  { key: "ssd", title: "Disco SSD", description: "Discos internos SSD para sistema y programas.", icon: HardDrive },
  { key: "hdd", title: "Disco HDD", description: "Discos internos HDD para almacenamiento adicional.", optional: true, icon: HardDrive },
  { key: "case", title: "Gabinete", description: "Solo gabinetes sin fuente incluida.", icon: PackagePlus },
  { key: "psu", title: "Fuente", description: "Fuentes con potencia suficiente para el equipo.", icon: Power },
  { key: "monitor", title: "Monitor", description: "Solo productos cuyo nombre comienza con Monitor.", optional: true, icon: Monitor },
  { key: "peripherals", title: "Perifericos", description: "Elegi mouse, teclado y audio por separado.", optional: true, icon: Mouse },
  { key: "accessories", title: "Accesorios", description: "Cables, fichas, hubs, adaptadores y complementos.", optional: true, icon: Plus },
];

const slotByKey = Object.fromEntries(slots.map((slot) => [slot.key, slot])) as Record<SlotKey, BuilderSlot>;
const peripheralLabels: Record<PeripheralKind, string> = { mouse: "Mouse", keyboard: "Teclado", audio: "Audio" };
const coreSelectionKeys: SelectionKey[] = ["cpu", "motherboard", "cooler", "ram", "gpu", "ssd", "hdd", "case", "psu", "monitor", "mouse", "keyboard", "audio", "accessories"];

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-AR")
    .replace(/\s+/g, " ")
    .trim();
}

function startsWithAny(text: string, prefixes: string[]) {
  return prefixes.some((prefix) => text.startsWith(prefix));
}

function productHaystack(product: Product) {
  const tags = Array.isArray(product.tags) ? product.tags : [];
  return normalize(`${product.nombre} ${product.categoria} ${product.subcategoria} ${product.marca} ${tags.join(" ")} ${Object.entries(product.atributos || {}).flat().join(" ")}`);
}

function productTaxonomy(product: Product) {
  return normalize(`${product.categoria} ${product.subcategoria}`);
}

function peripheralKind(product: Product): PeripheralKind | null {
  const name = normalize(product.nombre);
  const text = productHaystack(product);
  if (startsWithAny(name, ["mouse ", "mousse "]) || /\bmouse\b/.test(text)) return "mouse";
  if (startsWithAny(name, ["teclado "]) || /\bteclado\b/.test(text)) return "keyboard";
  if (/\b(auricular|headset|parlante|microfono|audio)\b/.test(text)) return "audio";
  return null;
}

function productMatchesSlot(product: Product, slot: SlotKey, peripheral?: PeripheralKind) {
  const name = normalize(product.nombre);
  const taxonomy = productTaxonomy(product);

  if (slot === "cpu") return taxonomy.includes("procesadores") && startsWithAny(name, ["procesador ", "amd ", "intel "]);
  if (slot === "motherboard") return taxonomy.includes("motherboard") && startsWithAny(name, ["mother ", "motherboard "]);
  if (slot === "ram") return taxonomy.includes("memorias pc") && startsWithAny(name, ["memoria ", "memoria ram "]);
  if (slot === "gpu") return startsWithAny(name, ["placa de video "]);
  if (slot === "ssd") return startsWithAny(name, ["disco interno ssd ", "disco ssd "]);
  if (slot === "hdd") return !name.includes("ssd") && startsWithAny(name, ["disco duro int", "disco interno ", "disco hdd "]);
  if (slot === "case") return taxonomy.includes("gabinete") && startsWithAny(name, ["gabinete "]) && !/\b(con fuente|\d{3,4}\s?w)\b/.test(name);
  if (slot === "psu") return taxonomy.includes("fuente") && startsWithAny(name, ["fuente "]);
  if (slot === "monitor") return startsWithAny(name, ["monitor "]);
  if (slot === "cooler") {
    const isCpuCooling = /\b(water cooler|air cooler|cooler cpu|cpu cooler|refrigeracion liquida|liquid cooler|disipador cpu)\b/.test(name);
    const excluded = /\b(pasta|grasa|silicon|fan chasis|cooler gabinete|gabinete|con fuente|hub|bracket|soporte)\b/.test(name);
    return taxonomy.includes("cooler") && isCpuCooling && !excluded;
  }
  if (slot === "peripherals") return peripheralKind(product) === peripheral;
  if (slot === "accessories") {
    const isCore = (["cpu", "motherboard", "cooler", "ram", "gpu", "ssd", "hdd", "case", "psu", "monitor"] as SlotKey[]).some((key) => productMatchesSlot(product, key));
    return !isCore && (taxonomy.includes("accesorio") || taxonomy.includes("periferico") || /\b(cable|ficha|adaptador|hub|conector|pasta|grasa|silicon|fan|ventilador|bracket|soporte)\b/.test(name));
  }
  return false;
}

function socketOf(product?: Product) {
  if (!product) return undefined;
  return product.techSpecs?.socket || productHaystack(product).match(/\b(am4|am5|lga\s?1200|lga\s?1700|lga\s?1851)\b/i)?.[1]?.toUpperCase().replace(/\s/g, "");
}

function hasIncludedCooler(product?: Product) {
  if (!product) return false;
  if (product.techSpecs?.coolerIncluded !== undefined) return product.techSpecs.coolerIncluded;
  const text = productHaystack(product);
  if (/\b(sin cooler|s\/c|tray)\b/.test(text)) return false;
  return /\b(con cooler|incluye cooler|wraith|boxed)\b/.test(text);
}

function commercialLabel(product: Product) {
  if (product.stockLocal && product.stockLocal > 0) return "STOCK LOCAL";
  if (product.preventa || product.commercialStatus === "preventa") return "PREVENTA";
  if (product.oferta || product.precio_oferta || product.commercialStatus === "oferta") return "OFERTA";
  return "DISPONIBLE";
}

function highlights(product: Product, slot: SlotKey) {
  const attrs = Object.entries(product.atributos || {}).filter(([, value]) => Boolean(value));
  const preferred = slot === "cpu" ? ["socket", "nucle", "frecuencia", "tdp"] : slot === "motherboard" ? ["socket", "chipset", "formato", "memoria"] : slot === "ram" ? ["capacidad", "memoria", "frecuencia", "ddr"] : slot === "gpu" ? ["memoria", "gpu", "chip", "consumo"] : slot === "psu" ? ["potencia", "watt", "certificacion"] : slot === "ssd" || slot === "hdd" ? ["capacidad", "interfaz", "lectura"] : slot === "cooler" ? ["socket", "radiador", "ventilador"] : ["modelo", "tipo", "compatibilidad"];
  const selected = preferred.flatMap((needle) => attrs.filter(([key]) => normalize(key).includes(needle))).slice(0, 2);
  return (selected.length ? selected : attrs.slice(0, 2)).map(([key, value]) => `${key}: ${value}`).slice(0, 2);
}

function compatibilityWarnings(selection: Partial<Record<SelectionKey, Product>>) {
  const warnings: string[] = [];
  const cpu = selection.cpu;
  const motherboard = selection.motherboard;
  const ram = selection.ram;
  const pcCase = selection.case;
  const gpu = selection.gpu;
  const psu = selection.psu;
  if (cpu?.techSpecs?.socket && motherboard?.techSpecs?.socket && cpu.techSpecs.socket !== motherboard.techSpecs.socket) warnings.push("El procesador y la mother no comparten socket.");
  if (motherboard?.techSpecs?.ramType && ram?.techSpecs?.ramType && motherboard.techSpecs.ramType !== ram.techSpecs.ramType) warnings.push("La RAM no coincide con el tipo soportado por la mother.");
  if (motherboard?.techSpecs?.motherboardFormFactor && pcCase?.techSpecs?.supportedMotherboardFormats?.length && !pcCase.techSpecs.supportedMotherboardFormats.includes(motherboard.techSpecs.motherboardFormFactor)) warnings.push("El gabinete no declara soporte para el formato de la mother.");
  if (gpu?.techSpecs?.recommendedPsuWattage && psu?.techSpecs?.wattage && psu.techSpecs.wattage < gpu.techSpecs.recommendedPsuWattage) warnings.push("La fuente puede ser insuficiente para la placa de video.");
  return warnings;
}

function ProductCard({ product, slot, selected, onSelect }: { product: Product; slot: SlotKey; selected: boolean; onSelect: () => void }) {
  const name = displayProductName(product);
  return (
    <button type="button" onClick={onSelect} className={`group relative flex min-h-40 gap-3 rounded-lg border p-3 text-left transition ${selected ? "border-comet-fuchsia bg-comet-fuchsia/10" : "border-comet-border bg-comet-panel hover:border-comet-fuchsia hover:bg-white/[0.025]"}`}>
      <div className="absolute right-3 top-3 text-emerald-400">{selected && <Check size={17} strokeWidth={3} />}</div>
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded bg-white"><ProductImage src={product.imagen_principal} alt={name} className="h-full w-full object-contain p-1" /></div>
      <div className="min-w-0 flex-1 pr-4">
        <span className="text-[10px] font-black text-emerald-400">{commercialLabel(product)}</span>
        <p className="mt-1 line-clamp-3 text-sm font-black leading-5 text-white group-hover:text-comet-fuchsia">{name}</p>
        <div className="mt-2 space-y-1 text-[11px] text-zinc-400">{highlights(product, slot).map((detail) => <p key={detail} className="truncate">{detail}</p>)}</div>
        <p className="mt-2 text-sm font-black text-white">{formatPrice(productPrice(product))}</p>
      </div>
    </button>
  );
}

export function PcBuilderClient({ products }: { products: Product[] }) {
  const { addItem } = useCart();
  const [selection, setSelection] = useState<Partial<Record<SelectionKey, Product>>>({});
  const [quantities, setQuantities] = useState<Partial<Record<SelectionKey, number>>>({});
  const [activeSlot, setActiveSlot] = useState<SlotKey>("cpu");
  const [activePeripheral, setActivePeripheral] = useState<PeripheralKind>("mouse");
  const [brandFilters, setBrandFilters] = useState<Partial<Record<SlotKey, string>>>({});

  const base = useMemo(() => products.filter((product) => product.visible && (product.stock_status !== "sin_stock" || product.preventa)), [products]);
  const activeOptionsBeforeBrand = useMemo(() => {
    const cpuSocket = socketOf(selection.cpu);
    const boardRam = selection.motherboard?.techSpecs?.ramType;
    const boardFormat = selection.motherboard?.techSpecs?.motherboardFormFactor;
    const recommendedPsu = selection.gpu?.techSpecs?.recommendedPsuWattage;
    let options = base.filter((product) => productMatchesSlot(product, activeSlot, activePeripheral));
    if (activeSlot === "motherboard" && cpuSocket) options = options.filter((product) => socketOf(product) === cpuSocket);
    if (activeSlot === "ram" && boardRam) options = options.filter((product) => product.techSpecs?.ramType === boardRam || productHaystack(product).includes(normalize(boardRam)));
    if (activeSlot === "cooler" && cpuSocket) options = options.filter((product) => socketOf(product) === cpuSocket || !socketOf(product));
    if (activeSlot === "case" && boardFormat) options = options.filter((product) => !product.techSpecs?.supportedMotherboardFormats?.length || product.techSpecs.supportedMotherboardFormats.includes(boardFormat));
    if (activeSlot === "psu" && recommendedPsu) options = options.filter((product) => !product.techSpecs?.wattage || product.techSpecs.wattage >= recommendedPsu);
    return options;
  }, [activePeripheral, activeSlot, base, selection.cpu, selection.gpu, selection.motherboard]);

  const brandOptions = useMemo(() => Array.from(new Set(activeOptionsBeforeBrand.map((product) => product.marca).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "es")), [activeOptionsBeforeBrand]);
  const activeBrand = brandFilters[activeSlot] || "all";
  const activeOptions = useMemo(() => activeOptionsBeforeBrand.filter((product) => activeBrand === "all" || normalize(product.marca) === normalize(activeBrand)).sort((a, b) => productPrice(a) - productPrice(b)).slice(0, 100), [activeBrand, activeOptionsBeforeBrand]);
  const coolerIncluded = hasIncludedCooler(selection.cpu);
  const selectionKey: SelectionKey = activeSlot === "peripherals" ? activePeripheral : activeSlot;
  const selectedEntries = coreSelectionKeys.flatMap((key) => selection[key] ? [{ key, product: selection[key]!, quantity: quantities[key] || 1 }] : []);
  const total = selectedEntries.reduce((sum, entry) => sum + productPrice(entry.product) * entry.quantity, 0);
  const watts = (selection.cpu?.techSpecs?.tdpWatts || 0) + (selection.gpu?.techSpecs?.tdpWatts || 0);
  const warnings = compatibilityWarnings(selection);
  const completedCore = ["cpu", "motherboard", "ram", "ssd", "case", "psu"].every((key) => selection[key as SelectionKey]);

  function slotHasSelection(slot: SlotKey) {
    return slot === "peripherals" ? Boolean(selection.mouse || selection.keyboard || selection.audio) : Boolean(selection[slot]);
  }

  function isAvailable(slot: BuilderSlot) {
    const index = slots.findIndex((item) => item.key === slot.key);
    if (index === 0) return true;
    const previous = slots[index - 1];
    return slotHasSelection(previous.key) || previous.optional || (previous.key === "cooler" && coolerIncluded);
  }

  function nextSlot(current: SlotKey, nextSelection: Partial<Record<SelectionKey, Product>>) {
    const index = slots.findIndex((slot) => slot.key === current);
    for (const slot of slots.slice(index + 1)) {
      if (slot.key === "cooler" && hasIncludedCooler(nextSelection.cpu)) continue;
      setActiveSlot(slot.key);
      return;
    }
  }

  function chooseProduct(slot: SlotKey, product: Product) {
    const key: SelectionKey = slot === "peripherals" ? activePeripheral : slot;
    const next = { ...selection, [key]: product };
    if (slot === "cpu") { delete next.motherboard; delete next.cooler; delete next.ram; }
    if (slot === "motherboard") { delete next.ram; delete next.case; }
    if (slot === "gpu") delete next.psu;
    setSelection(next);
    setQuantities((current) => ({ ...current, [key]: current[key] || 1 }));
    if (slot !== "peripherals") nextSlot(slot, next);
  }

  function skipSlot(slot: SlotKey) {
    nextSlot(slot, selection);
  }

  function changeQuantity(key: SelectionKey, delta: number) {
    setQuantities((current) => ({ ...current, [key]: Math.max(1, Math.min(10, (current[key] || 1) + delta)) }));
  }

  function addBuildToCart() {
    selectedEntries.forEach(({ product, quantity }) => addItem(product, quantity));
  }

  const active = slotByKey[activeSlot];

  return (
    <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
      <aside className="h-fit rounded-lg border border-comet-border bg-comet-panel p-3 xl:sticky xl:top-24">
        <p className="px-2 pb-3 text-xs font-black uppercase tracking-[0.16em] text-comet-fuchsia">Tu armado</p>
        <nav className="space-y-1">
          {slots.map((slot, index) => {
            const Icon = slot.icon;
            const selected = slotHasSelection(slot.key);
            const available = isAvailable(slot);
            const isCurrent = activeSlot === slot.key;
            const skippedCooler = slot.key === "cooler" && coolerIncluded;
            return <button key={slot.key} type="button" disabled={!available && !selected && !skippedCooler} onClick={() => setActiveSlot(slot.key)} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition ${isCurrent ? "bg-comet-fuchsia text-white" : selected || skippedCooler ? "bg-emerald-400/10 text-emerald-200" : available ? "text-zinc-300 hover:bg-white/[0.04]" : "cursor-not-allowed text-zinc-700"}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded border border-current/30 text-xs font-black">{selected || skippedCooler ? <Check size={15} /> : index + 1}</span><Icon size={16} className="shrink-0" /><span className="min-w-0 flex-1 truncate text-sm font-bold">{slot.title}</span>{isCurrent && <ChevronRight size={16} />}</button>;
          })}
        </nav>
        <div className="mt-4 border-t border-comet-border px-2 pt-4 text-center"><p className="text-xs text-zinc-500">Consumo estimado</p><p className="mt-1 text-lg font-black text-white">{watts ? `${watts} W` : "-- W"}</p><p className="mt-3 text-xs text-zinc-500">Total</p><p className="mt-1 text-xl font-black text-white">{formatPrice(total)}</p></div>
      </aside>

      <section className="min-w-0 rounded-lg border border-comet-border bg-comet-panel">
        <header className="border-b border-comet-border p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-comet-fuchsia">Paso {slots.findIndex((slot) => slot.key === activeSlot) + 1} de {slots.length}</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-black text-white">{active.title}</h2><p className="mt-1 text-sm text-zinc-400">{active.description}</p></div>{active.optional && <button type="button" onClick={() => skipSlot(active.key)} className="rounded-md border border-comet-border px-3 py-2 text-xs font-black text-zinc-300 hover:border-comet-fuchsia hover:text-white">Omitir por ahora</button>}</div>
          {activeSlot === "peripherals" && <div className="mt-4 flex flex-wrap gap-2">{(Object.keys(peripheralLabels) as PeripheralKind[]).map((kind) => <button key={kind} type="button" onClick={() => { setActivePeripheral(kind); setBrandFilters((current) => ({ ...current, peripherals: "all" })); }} className={`rounded-md border px-4 py-2 text-xs font-black ${activePeripheral === kind ? "border-comet-fuchsia bg-comet-fuchsia/15 text-white" : "border-comet-border text-zinc-400 hover:text-white"}`}>{peripheralLabels[kind]}{selection[kind] ? " ✓" : ""}</button>)}</div>}
          {brandOptions.length > 1 && <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setBrandFilters((current) => ({ ...current, [activeSlot]: "all" }))} className={`rounded-md border px-3 py-2 text-xs font-black ${activeBrand === "all" ? "border-comet-fuchsia bg-comet-fuchsia/15 text-white" : "border-comet-border text-zinc-400"}`}>Todas</button>{brandOptions.map((brand) => <button key={brand} type="button" onClick={() => setBrandFilters((current) => ({ ...current, [activeSlot]: brand }))} className={`rounded-md border px-3 py-2 text-xs font-black ${activeBrand === brand ? "border-comet-fuchsia bg-comet-fuchsia/15 text-white" : "border-comet-border text-zinc-400 hover:text-white"}`}>{brand}</button>)}</div>}
        </header>

        {activeSlot === "cooler" && coolerIncluded ? <div className="p-6"><div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-5 text-sm text-emerald-100">El procesador seleccionado declara cooler incluido. Podes continuar sin sumar otro.</div><button type="button" onClick={() => skipSlot("cooler")} className="mt-4 rounded-md bg-gradient-to-r from-comet-red via-comet-fuchsia to-comet-violet px-4 py-3 text-sm font-black text-white">Continuar con el armado</button></div> : <div className="grid gap-3 p-5 md:grid-cols-2">{activeOptions.map((product) => <ProductCard key={product.id} product={product} slot={activeSlot} selected={selection[selectionKey]?.id === product.id} onSelect={() => chooseProduct(activeSlot, product)} />)}{!activeOptions.length && <p className="rounded-md border border-dashed border-comet-border p-5 text-sm text-zinc-500">No encontramos productos que cumplan las reglas de esta etapa.</p>}</div>}
      </section>

      <aside className="h-fit rounded-lg border border-comet-border bg-comet-panel p-5 xl:sticky xl:top-24">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-comet-fuchsia">Resumen</p><h2 className="mt-2 text-2xl font-black text-white">Tu PC</h2>
        <div className="mt-4 divide-y divide-comet-border">
          {slots.flatMap((slot) => {
            const keys: SelectionKey[] = slot.key === "peripherals" ? ["mouse", "keyboard", "audio"] : [slot.key];
            return keys.map((key) => {
              const product = selection[key];
              const skipped = slot.key === "cooler" && coolerIncluded && !product;
              const label = slot.key === "peripherals" ? peripheralLabels[key as PeripheralKind] : slot.title;
              return <div key={key} className="flex gap-2 py-3"><button type="button" onClick={() => { setActiveSlot(slot.key); if (slot.key === "peripherals") setActivePeripheral(key as PeripheralKind); }} className="flex min-w-0 flex-1 gap-2 text-left"><Circle size={12} className={`mt-1 shrink-0 ${product || skipped ? "fill-emerald-400 text-emerald-400" : "text-zinc-700"}`} /><span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-zinc-500">{label}</span><span className={`mt-0.5 block line-clamp-2 text-xs ${product ? "font-bold text-white" : "text-zinc-600"}`}>{product ? displayProductName(product) : skipped ? "Incluido con procesador" : "Sin elegir"}</span>{product && <span className="mt-1 block text-xs font-black text-white">{formatPrice(productPrice(product) * (quantities[key] || 1))}</span>}</span></button>{product && <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => changeQuantity(key, -1)} className="grid h-7 w-7 place-items-center rounded border border-comet-border text-zinc-300"><Minus size={12} /></button><span className="w-5 text-center text-xs font-black text-white">{quantities[key] || 1}</span><button type="button" onClick={() => changeQuantity(key, 1)} className="grid h-7 w-7 place-items-center rounded border border-comet-border text-zinc-300"><Plus size={12} /></button></div>}</div>;
            });
          })}
        </div>
        <div className="mt-4 border-t border-comet-border pt-4"><div className="flex items-end justify-between gap-3"><span className="text-sm text-zinc-400">Total estimado</span><span className="text-2xl font-black text-white">{formatPrice(total)}</span></div><p className="mt-2 text-xs text-zinc-500">Consumo estimado: {watts ? `${watts} W` : "sin datos suficientes"}</p></div>
        <div className="mt-4 space-y-2">{warnings.map((warning) => <div key={warning} className="flex gap-2 rounded-md border border-yellow-300/30 bg-yellow-300/10 p-3 text-xs text-yellow-100"><AlertTriangle size={16} className="shrink-0" />{warning}</div>)}{!warnings.length && selectedEntries.length > 1 && <div className="flex gap-2 rounded-md border border-emerald-400/25 bg-emerald-400/10 p-3 text-xs text-emerald-100"><Check size={16} className="shrink-0" />Sin alertas con los datos tecnicos disponibles.</div>}</div>
        <button type="button" onClick={addBuildToCart} disabled={!selectedEntries.length} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-comet-red via-comet-fuchsia to-comet-violet px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><ShoppingCart size={17} />Agregar armado al carrito</button>
        <a href={`https://wa.me/5492964696717?text=${encodeURIComponent(`Hola COMETA G, quiero consultar este armado: ${selectedEntries.map(({ product, quantity }) => `${quantity}x ${displayProductName(product)}`).join(" | ")}`)}`} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-comet-border px-4 py-3 text-sm font-black text-zinc-200 hover:border-emerald-400 hover:text-white"><MessageCircle size={17} />Consultar armado</a>
        {!completedCore && <p className="mt-4 flex gap-2 text-xs leading-5 text-zinc-500"><PackagePlus size={15} className="mt-0.5 shrink-0" />Para una PC base completa elegi procesador, mother, RAM, SSD, gabinete y fuente.</p>}
      </aside>
    </div>
  );
}
