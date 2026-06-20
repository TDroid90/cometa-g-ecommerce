export default function PurchaseFlowPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-comet-fuchsia">COMETA G</p>
      <h1 className="mt-3 text-4xl font-black text-white">Mecánica de compra</h1>
      <div className="mt-8 rounded-lg border border-comet-border bg-comet-panel p-6 text-zinc-300">
        <p className="text-lg font-bold text-white">
          Los pedidos se cierran los jueves a última hora y se despachan los viernes.
        </p>
        <p className="mt-4 leading-7">
          Así podemos confirmar stock, coordinar proveedores y preparar cada pedido con precios claros. Si comprás
          después del cierre semanal, tu pedido entra en la siguiente tanda de despacho.
        </p>
      </div>
    </main>
  );
}
