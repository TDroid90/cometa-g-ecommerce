"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, MessageCircle, PackagePlus, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice, productPrice } from "@/lib/data";
import { normalizeImageUrl } from "@/lib/images";
import { Product } from "@/lib/types";

type SlotKey = "cpu" | "motherboard" | "ram" | "gpu" | "storage" | "psu" | "case" | "cooler" | "monitor" | "peripherals";

type BuilderSlot = {
  key: SlotKey;
  title: string;
  description: string;
  required?: boolean;
};

const slots: BuilderSlot[] = [
  { key: "cpu", title: "Procesador", description: "Ryzen, Intel Core y CPUs compatibles.", required: true },
  { key: "motherboard", title: "Motherboard", description: "Socket, chipset y formato.", required: true },
  { key: "ram", title: "Memoria RAM", description: "DDR4, DDR5, frecuencia y capacidad.", required: true },
  { key: "gpu", title: "Placa de video", description: "GPU dedicada y fuente recomendada." },
  { key: "storage", title: "Almacenamiento", description: "SSD, HDD o NVMe.", required: true },
  { key: "psu", title: "Fuente", description: "Potencia y certificacion.", required: true },
  { key: "case", title: "Gabinete", description: "Formato ATX, Micro ATX o Mini ITX.", required: true },
  { key: "cooler", title: "Cooler / refrigeracion", description: "Air cooler o water cooler." },
  { key: "monitor", title: "Monitor", description: "Pantalla para completar el setup." },
  { key: "peripherals", title: "Perifericos", description: "Teclado, mouse, audio y accesorios." }
];

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function productHaystack(product: Product) {
  return normalize(`${product.nombre} ${product.categoria} ${product.subcategoria} ${product.marca} ${product.tags.join(" ")}`);
}

function productMatchesSlot(product: Product, slot: SlotKey) {
  const text = productHaystack(product);
  if (slot === "cpu") return includesAny(text, ["procesador", "cpu", "ryzen", "core i3", "core i5", "core i7", "core i9"]);
  if (slot === "motherboard") return includesAny(text, ["mother", "motherboard", "placa madre", "mainboard"]);
  if (slot === "ram") return includesAny(text, ["memoria", " ram", "ddr4", "ddr5", "dimm"]);
  if (slot === "gpu") return includesAny(text, ["placa de video", "gpu", "geforce", "rtx", "gtx", "radeon", "rx "]);
  if (slot === "storage") return includesAny(text, ["almacenamiento", "ssd", "nvme", "hdd", "disco"]);
  if (slot === "psu") return includesAny(text, ["fuente", "psu", "power supply"]);
  if (slot === "case") return includesAny(text, ["gabinete", "case", "chasis"]);
  if (slot === "cooler") return includesAny(text, ["cooler", "refrigeracion", "refrigeración", "water cooler", "fan"]);
  if (slot === "monitor") return includesAny(text, ["monitor", "pantalla"]);
  return includesAny(text, ["periferico", "periférico", "teclado", "mouse", "auricular", "parlante", "webcam", "joystick"]);
}

function commercialLabel(product: Product) {
  if (product.stockLocal && product.stockLocal > 0) return "STOCK LOCAL";
  if (product.preventa || product.commercialStatus === "preventa") return "PREVENTA";
  if (product.oferta || product.precio_oferta || product.commercialStatus === "oferta") return "OFERTA";
  if (product.commercialStatus === "a_pedido") return "A PEDIDO";
  return product.stock_status === "sin_stock" ? "SIN STOCK" : "REGULAR";
}

function ProductSummary({ product }: { product: Product }) {
  const imageUrl = normalizeImageUrl(product.imagen_principal);
  return (
    <div className="mt-3 rounded-md border border-comet-border bg-comet-black p-3">
      <div className="flex gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-white">
          {imageUrl ? (
            <Image src={imageUrl} alt={product.nombre} fill sizes="64px" className="object-contain p-1.5" />
          ) : (
            <div className="grid h-full place-items-center text-[10px] text-zinc-500">Sin imagen</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-black text-zinc-300">
              {commercialLabel(product)}
            </span>
            {product.stockLocal && product.stockLocal > 0 && (
              <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-black text-zinc-950">LOCAL</span>
            )}
          </div>
          <Link href={`/producto/${product.slug}`} className="mt-1 line-clamp-2 text-sm font-black text-white hover:text-comet-fuchsia">
            {product.nombre}
          </Link>
          <p className="mt-1 text-sm font-black text-white">{formatPrice(productPrice(product))}</p>
        </div>
      </div>
    </div>
  );
}

function compatibilityWarnings(selection: Partial<Record<SlotKey, Product>>) {
  const warnings: string[] = [];
  const cpu = selection.cpu;
  const motherboard = selection.motherboard;
  const ram = selection.ram;
  const pcCase = selection.case;
  const gpu = selection.gpu;
  const psu = selection.psu;

  if (cpu?.techSpecs?.socket && motherboard?.techSpecs?.socket && cpu.techSpecs.socket !== motherboard.techSpecs.socket) {
    warnings.push("El procesador seleccionado puede no ser compatible con la motherboard. Revisa el socket antes de comprar.");
  }

  if (motherboard?.techSpecs?.ramType && ram?.techSpecs?.ramType && motherboard.techSpecs.ramType !== ram.techSpecs.ramType) {
    warnings.push("La memoria RAM seleccionada no coincide con el tipo soportado por la motherboard.");
  }

  const boardFormat = motherboard?.techSpecs?.motherboardFormFactor;
  const caseFormats = pcCase?.techSpecs?.supportedMotherboardFormats;
  if (boardFormat && caseFormats?.length && !caseFormats.includes(boardFormat)) {
    warnings.push("Verifica que el gabinete soporte el formato de la motherboard seleccionada.");
  }

  const recommendedPsu = gpu?.techSpecs?.recommendedPsuWattage;
  const wattage = psu?.techSpecs?.wattage;
  if (recommendedPsu && wattage && wattage < recommendedPsu) {
    warnings.push("La fuente seleccionada podria ser insuficiente para esta placa de video.");
  }

  return warnings;
}

export function PcBuilderClient({ products }: { products: Product[] }) {
  const { addItem } = useCart();
  const [selection, setSelection] = useState<Partial<Record<SlotKey, Product>>>({});

  const productsBySlot = useMemo(() => {
    return Object.fromEntries(
      slots.map((slot) => [
        slot.key,
        products
          .filter((product) => product.stock_status !== "sin_stock" || product.preventa)
          .filter((product) => productMatchesSlot(product, slot.key))
          .sort((a, b) => productPrice(a) - productPrice(b))
          .slice(0, 120)
      ])
    ) as Record<SlotKey, Product[]>;
  }, [products]);

  const selectedProducts = Object.values(selection).filter(Boolean) as Product[];
  const total = selectedProducts.reduce((sum, product) => sum + productPrice(product), 0);
  const warnings = compatibilityWarnings(selection);
  const completedRequired = slots.filter((slot) => slot.required).every((slot) => selection[slot.key]);

  function addBuildToCart() {
    selectedProducts.forEach((product) => addItem(product));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="grid gap-4">
        {slots.map((slot) => {
          const options = productsBySlot[slot.key];
          const selected = selection[slot.key];
          return (
            <article key={slot.key} className="rounded-lg border border-comet-border bg-comet-panel p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-white">{slot.title}</h2>
                    {slot.required && <span className="rounded-full bg-comet-fuchsia/15 px-2 py-0.5 text-[10px] font-black text-comet-fuchsia">OBLIGATORIO</span>}
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">{slot.description}</p>
                </div>
                <select
                  value={selected?.id || ""}
                  onChange={(event) => {
                    const next = options.find((product) => product.id === event.target.value);
                    setSelection((current) => ({ ...current, [slot.key]: next }));
                  }}
                  className="h-11 min-w-0 rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia md:w-[340px]"
                >
                  <option value="">Seleccionar producto</option>
                  {options.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.nombre} - {formatPrice(productPrice(product))}
                    </option>
                  ))}
                </select>
              </div>
              {selected ? (
                <ProductSummary product={selected} />
              ) : (
                <p className="mt-3 rounded-md border border-dashed border-comet-border px-3 py-4 text-sm text-zinc-500">
                  {options.length ? `${options.length} opciones disponibles para esta categoria.` : "No hay productos activos para esta categoria."}
                </p>
              )}
            </article>
          );
        })}
      </section>

      <aside className="h-fit rounded-lg border border-comet-border bg-comet-panel p-5 lg:sticky lg:top-24">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-comet-fuchsia">Resumen</p>
        <h2 className="mt-2 text-2xl font-black text-white">Tu armado</h2>
        <div className="mt-5 space-y-3">
          {selectedProducts.length ? (
            selectedProducts.map((product) => (
              <div key={product.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="line-clamp-2 text-zinc-300">{product.nombre}</span>
                <span className="shrink-0 font-black text-white">{formatPrice(productPrice(product))}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">Selecciona componentes para calcular el total.</p>
          )}
        </div>
        <div className="mt-5 border-t border-comet-border pt-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-zinc-400">Total estimado</span>
            <span className="text-2xl font-black text-white">{formatPrice(total)}</span>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {warnings.length ? (
            warnings.map((warning) => (
              <div key={warning} className="flex gap-3 rounded-md border border-yellow-300/30 bg-yellow-300/10 p-3 text-sm text-zinc-200">
                <AlertTriangle className="mt-0.5 shrink-0 text-yellow-300" size={18} />
                <span>{warning}</span>
              </div>
            ))
          ) : (
            <div className="flex gap-3 rounded-md border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-zinc-200">
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={18} />
              <span>No hay alertas de compatibilidad con los datos disponibles.</span>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3">
          <button
            onClick={addBuildToCart}
            disabled={!selectedProducts.length}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-comet-red via-comet-fuchsia to-comet-violet px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart size={18} />
            Agregar armado al carrito
          </button>
          <a
            href={`https://wa.me/5492964696717?text=${encodeURIComponent(`Hola COMETA G, quiero consultar este armado: ${selectedProducts.map((product) => product.nombre).join(" | ")}`)}`}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-comet-border px-5 py-3 text-sm font-black text-zinc-200 hover:border-emerald-400 hover:text-white"
          >
            <MessageCircle size={18} />
            Consultar armado
          </a>
        </div>

        {!completedRequired && (
          <p className="mt-4 flex gap-2 text-xs leading-6 text-zinc-500">
            <PackagePlus size={16} className="mt-0.5 shrink-0" />
            Para una PC completa, prioriza procesador, motherboard, RAM, almacenamiento, fuente y gabinete.
          </p>
        )}
      </aside>
    </div>
  );
}
