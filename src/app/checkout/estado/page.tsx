import Link from "next/link";

export default function CheckoutStatusPage() {
  return (
    <main className="mx-auto grid min-h-[60vh] w-full max-w-3xl place-items-center px-4 py-16 text-center">
      <div className="rounded-lg border border-comet-border bg-comet-panel p-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-comet-fuchsia">
          Estado del pago
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">Operacion procesada</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Recibimos la respuesta de Payway. Si el pago fue aprobado, el pedido queda listo para
          preparacion.
        </p>
        <Link
          href="/productos"
          className="mt-6 inline-flex h-11 items-center rounded-md comet-gradient px-5 text-sm font-black text-white"
        >
          Volver al catalogo
        </Link>
      </div>
    </main>
  );
}
