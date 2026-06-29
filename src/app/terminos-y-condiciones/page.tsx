import { CreditCard, Database, PackageSearch, ReceiptText, ShieldCheck, Truck, Undo2 } from "lucide-react";

const sections = [
  {
    id: "uso",
    title: "Uso del sitio",
    icon: ReceiptText,
    text: "El sitio de COMETA G permite consultar productos, precios, disponibilidad y condiciones comerciales. La información se publica de buena fe y puede actualizarse por cambios de proveedores, stock o logística."
  },
  {
    id: "disponibilidad",
    title: "Disponibilidad de productos",
    icon: PackageSearch,
    text: "La disponibilidad puede corresponder a stock general informado por proveedores o warehouses externos, y en algunos casos a stock local de COMETA G. La compra queda sujeta a confirmación operativa cuando intervienen terceros."
  },
  {
    id: "precios",
    title: "Precios",
    icon: ReceiptText,
    text: "Los precios se expresan en pesos argentinos salvo indicación distinta. Pueden variar por cotización, promociones, disponibilidad, modalidad de pago o actualización del catálogo."
  },
  {
    id: "pagos",
    title: "Medios de pago",
    icon: CreditCard,
    text: "El sistema de pago es externo a nuestra web. COMETA G no almacena datos de tarjetas de crédito, débito ni información financiera sensible. Los pagos se procesan mediante plataformas externas y seguras."
  },
  {
    id: "envios",
    title: "Envíos y tiempos de entrega",
    icon: Truck,
    text: "Los tiempos informados son estimados y pueden variar por disponibilidad del proveedor, ubicación del warehouse, operador logístico, destino o situaciones ajenas a COMETA G."
  },
  {
    id: "garantia",
    title: "Cambios, devoluciones y garantías",
    icon: ShieldCheck,
    text: "La garantía depende de la marca, el producto y las condiciones informadas al momento de la compra. El producto debe conservar embalaje, accesorios y comprobante. La revisión técnica define si corresponde cambio, reparación o gestión con fabricante."
  },
  {
    id: "datos",
    title: "Protección de datos",
    icon: Database,
    text: "Los datos de contacto y perfil se usan para gestionar pedidos, atención comercial y comunicaciones relacionadas con COMETA G. No solicitamos ni guardamos datos financieros sensibles dentro de la web."
  }
];

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-comet-border bg-comet-panel p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-comet-fuchsia">COMETA G</p>
        <h1 className="mt-3 text-4xl font-black text-white">Términos y condiciones</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
          Estas condiciones buscan explicar de forma clara cómo operamos. No reemplazan la comunicación directa ante
          casos particulares, pero ordenan las reglas generales de uso, compra, pagos, envíos y garantías.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <article
              id={section.id}
              key={section.id}
              className="scroll-mt-24 rounded-lg border border-comet-border bg-comet-panel p-5"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-comet-fuchsia/15 text-comet-fuchsia">
                  <Icon size={21} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{section.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">{section.text}</p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-lg border border-yellow-300/30 bg-yellow-300/10 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Undo2 className="text-yellow-300" size={22} />
          <div>
            <h2 className="text-lg font-black text-white">Importante sobre pagos externos</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-300">
              Al avanzar con una compra, el pago puede redirigirse o procesarse en una plataforma externa. Esa plataforma
              es la responsable del procesamiento financiero seguro. COMETA G no ve ni almacena números completos de
              tarjeta, códigos de seguridad ni credenciales bancarias.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
