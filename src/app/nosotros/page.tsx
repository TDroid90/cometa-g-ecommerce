import Link from "next/link";
import { Cpu, Gamepad2, PackageCheck, ShieldCheck, Sparkles, Truck } from "lucide-react";

const pillars = [
  {
    title: "Tecnología clara",
    text: "Mostramos productos, stock y condiciones de compra con información simple para decidir mejor.",
    icon: Cpu
  },
  {
    title: "Hardware y gaming",
    text: "Trabajamos componentes, periféricos, accesorios, equipos y soluciones informáticas para distintos usos.",
    icon: Gamepad2
  },
  {
    title: "Proveedores mayoristas",
    text: "Integramos disponibilidad de warehouses y proveedores para ampliar variedad sin perder control comercial.",
    icon: PackageCheck
  },
  {
    title: "Compra acompañada",
    text: "Buscamos que cada cliente sepa qué está comprando, cómo se gestiona y cuáles son los tiempos estimados.",
    icon: ShieldCheck
  }
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-lg border border-comet-border bg-comet-panel">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_.95fr]">
          <div className="p-6 sm:p-10 lg:p-12">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-comet-fuchsia">Nosotros</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl">
              Tecnología, hardware y gaming con información clara.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
              COMETA G es una tienda orientada a acercar tecnología, hardware, periféricos y productos gamer a clientes
              que buscan precio, variedad y asesoramiento claro.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              Trabajamos con proveedores mayoristas y disponibilidad actualizada para ofrecer productos de informática,
              componentes, accesorios y soluciones tecnológicas. Nuestro objetivo es que cada compra sea entendible desde
              el primer clic hasta la entrega.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/productos"
                className="rounded-md bg-gradient-to-r from-comet-red via-comet-fuchsia to-comet-violet px-5 py-3 text-sm font-black text-white"
              >
                Ver catálogo
              </Link>
              <Link
                href="/mecanica-de-compra"
                className="rounded-md border border-comet-border px-5 py-3 text-sm font-black text-zinc-200 hover:border-comet-fuchsia"
              >
                Cómo comprar
              </Link>
            </div>
          </div>

          <div className="relative min-h-[320px] bg-[url('https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center">
            <div className="absolute inset-0 bg-gradient-to-r from-comet-panel via-comet-panel/40 to-transparent lg:bg-gradient-to-l" />
            <div className="absolute bottom-5 left-5 right-5 rounded-md border border-white/10 bg-black/45 p-4 backdrop-blur">
              <div className="flex items-center gap-3 text-white">
                <Sparkles size={20} className="text-comet-fuchsia" />
                <p className="text-sm font-bold">Precio, variedad y procesos visibles para comprar con confianza.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <article key={pillar.title} className="rounded-lg border border-comet-border bg-comet-panel p-5">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-comet-fuchsia/15 text-comet-fuchsia">
                <Icon size={21} />
              </div>
              <h2 className="mt-5 text-lg font-black text-white">{pillar.title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{pillar.text}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-comet-border bg-comet-panel p-5 lg:col-span-2">
          <h2 className="text-2xl font-black text-white">Qué buscamos</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            Queremos que comprar tecnología sea menos confuso. Por eso ordenamos catálogo, categorías, marcas, stock,
            preventas y ofertas para que el cliente pueda comparar y consultar con una base clara.
          </p>
        </div>
        <div className="rounded-lg border border-comet-border bg-comet-panel p-5">
          <Truck className="text-comet-violet" size={24} />
          <h2 className="mt-4 text-xl font-black text-white">Logística coordinada</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Los pedidos se organizan por warehouse y proveedor, con tiempos estimados visibles antes de comprar.
          </p>
        </div>
      </section>
    </main>
  );
}
