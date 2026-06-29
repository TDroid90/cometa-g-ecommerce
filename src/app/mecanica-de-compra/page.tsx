import Link from "next/link";
import { BadgePercent, CalendarClock, Clock3, PackageCheck, PackagePlus, Rocket, Truck } from "lucide-react";

const modes = [
  {
    title: "Compras regulares",
    badge: "Stock general",
    time: "Hasta 10 días hábiles",
    icon: PackageCheck,
    accent: "text-comet-fuchsia",
    text: "Comprás durante la semana, nosotros consolidamos los pedidos y los jueves realizamos la solicitud al proveedor. Los viernes se despacha desde el warehouse correspondiente, ya sea Mendoza o Buenos Aires."
  },
  {
    title: "Preventa",
    badge: "PREVENTA",
    time: "Hasta 30 días corridos",
    icon: Rocket,
    accent: "text-comet-violet",
    text: "Los productos en preventa son artículos que están próximos a ingresar al warehouse. Al comprarlos, reservás el producto antes de su disponibilidad final."
  },
  {
    title: "Ofertas",
    badge: "OFERTA",
    time: "Stock limitado",
    icon: BadgePercent,
    accent: "text-emerald-400",
    text: "Las ofertas son productos disponibles con precio reducido por tiempo limitado o hasta agotar stock. La disponibilidad puede variar según el proveedor o el stock local."
  },
  {
    title: "A pedido",
    badge: "A PEDIDO",
    time: "Hasta 15 días",
    icon: PackagePlus,
    accent: "text-yellow-300",
    text: "Los productos a pedido se gestionan especialmente luego de realizada la compra. Una vez abonado el producto, realizamos la solicitud correspondiente."
  }
];

const steps = [
  "Elegís el producto y revisás modalidad, stock, precio y medios de pago.",
  "Confirmás la compra y el pago se procesa en una plataforma externa segura.",
  "Consolidamos pedidos y validamos disponibilidad con el proveedor o warehouse.",
  "Despachamos según modalidad y te informamos el avance del pedido."
];

export default function PurchaseFlowPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-lg border border-comet-border bg-comet-panel">
        <div className="grid gap-0 lg:grid-cols-[1fr_.85fr]">
          <div className="p-6 sm:p-10">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-comet-fuchsia">COMETA G</p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-5xl">Mecánica de compra</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-300">
              Trabajamos con stock general de proveedores, stock local, preventas, ofertas y productos a pedido. Cada
              modalidad tiene tiempos y condiciones visibles para que sepas qué estás comprando.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-comet-border bg-comet-black p-4">
                <Clock3 className="text-comet-fuchsia" size={20} />
                <p className="mt-3 text-sm font-black text-white">Regulares</p>
                <p className="text-xs text-zinc-400">hasta 10 días hábiles</p>
              </div>
              <div className="rounded-md border border-comet-border bg-comet-black p-4">
                <Rocket className="text-comet-violet" size={20} />
                <p className="mt-3 text-sm font-black text-white">Preventa</p>
                <p className="text-xs text-zinc-400">hasta 30 días corridos</p>
              </div>
              <div className="rounded-md border border-comet-border bg-comet-black p-4">
                <PackagePlus className="text-yellow-300" size={20} />
                <p className="mt-3 text-sm font-black text-white">A pedido</p>
                <p className="text-xs text-zinc-400">hasta 15 días</p>
              </div>
            </div>
          </div>
          <div className="relative min-h-[300px] bg-[url('https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=1100&q=80')] bg-cover bg-center">
            <div className="absolute inset-0 bg-gradient-to-r from-comet-panel via-comet-panel/20 to-transparent lg:bg-gradient-to-l" />
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <article key={mode.title} className="rounded-lg border border-comet-border bg-comet-panel p-5">
              <div className="flex items-start justify-between gap-4">
                <div className={`grid h-11 w-11 place-items-center rounded-md bg-white/5 ${mode.accent}`}>
                  <Icon size={21} />
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-black text-zinc-200">{mode.badge}</span>
              </div>
              <h2 className="mt-5 text-xl font-black text-white">{mode.title}</h2>
              <p className={`mt-2 text-sm font-black ${mode.accent}`}>{mode.time}</p>
              <p className="mt-4 text-sm leading-7 text-zinc-400">{mode.text}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <div className="rounded-lg border border-comet-border bg-comet-panel p-5">
          <CalendarClock className="text-comet-fuchsia" size={24} />
          <h2 className="mt-4 text-2xl font-black text-white">Cierre semanal</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            Los pedidos regulares se consolidan durante la semana. Los jueves realizamos la solicitud al proveedor
            correspondiente y los viernes se despacha desde el warehouse asignado, ya sea Mendoza o Buenos Aires.
          </p>
          <p className="mt-4 rounded-md border border-comet-fuchsia/30 bg-comet-fuchsia/10 p-4 text-sm font-bold text-zinc-200">
            Si comprás después del cierre semanal, tu pedido puede pasar a la siguiente tanda de gestión.
          </p>
        </div>

        <div className="rounded-lg border border-comet-border bg-comet-panel p-5">
          <h2 className="text-2xl font-black text-white">Proceso de compra</h2>
          <div className="mt-5 grid gap-3">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-md border border-comet-border bg-comet-black p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-comet-fuchsia/50 text-sm font-black text-comet-fuchsia">
                  {index + 1}
                </span>
                <p className="text-sm leading-7 text-zinc-300">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-comet-border bg-comet-panel p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Stock general vs. stock local</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
              El stock general corresponde a disponibilidad informada por proveedores o warehouses externos. El stock
              local indica productos físicamente disponibles por COMETA G. Cuando exista stock local, lo vas a ver marcado
              con una etiqueta amarilla.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-yellow-300 px-4 py-2 text-xs font-black text-zinc-950">
            STOCK LOCAL
          </span>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-comet-border bg-comet-panel p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <Truck className="mt-1 text-comet-violet" size={24} />
            <div>
              <h2 className="text-xl font-black text-white">Plazos estimados</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                Los plazos pueden variar por disponibilidad del proveedor, logística, ubicación del warehouse, destino o
                eventos externos. Siempre intentamos informar el estado del pedido con la mayor claridad posible.
              </p>
            </div>
          </div>
          <Link
            href="/productos"
            className="rounded-md bg-gradient-to-r from-comet-red via-comet-fuchsia to-comet-violet px-5 py-3 text-center text-sm font-black text-white"
          >
            Ver productos
          </Link>
        </div>
      </section>
    </main>
  );
}
