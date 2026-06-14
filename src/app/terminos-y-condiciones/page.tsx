export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black text-white">Términos y condiciones</h1>
      <section id="garantia" className="mt-8 rounded-lg border border-comet-border bg-comet-panel p-5">
        <h2 className="text-xl font-black text-white">Garantía *</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-400">
          La garantía depende de la marca, el producto y las condiciones informadas al momento de la compra.
          Los productos deben conservar embalaje, accesorios y comprobante. La revisión técnica define si
          corresponde cambio, reparación o gestión con fabricante.
        </p>
      </section>
    </main>
  );
}
