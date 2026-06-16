import Link from "next/link";

export default async function CheckoutSuccessPage({
  searchParams
}: {
  searchParams?: Promise<{ orden?: string }>;
}) {
  const params = await searchParams;
  const orderId = params?.orden;

  return (
    <main className="mx-auto grid min-h-[60vh] w-full max-w-3xl place-items-center px-4 py-16 text-center">
      <div className="rounded-lg border border-comet-border bg-comet-panel p-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-comet-fuchsia">
          Pago recibido
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">Gracias por tu compra</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Payway confirmo la operacion. En breve te contactamos con los detalles del pedido.
        </p>
        {orderId && (
          <p className="mt-4 rounded-md border border-comet-border bg-black/30 px-4 py-3 text-sm font-bold text-white">
            Orden {orderId}
          </p>
        )}
        <Link
          href="/productos"
          className="mt-6 inline-flex h-11 items-center rounded-md comet-gradient px-5 text-sm font-black text-white"
        >
          Seguir comprando
        </Link>
      </div>
    </main>
  );
}
