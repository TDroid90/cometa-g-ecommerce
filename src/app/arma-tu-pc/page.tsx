import { PcBuilderClient } from "@/components/pc-builder/PcBuilderClient";
import { getProductsWithTechData } from "@/lib/techData";

export default async function PcBuilderPage() {
  const products = await getProductsWithTechData();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-8 rounded-lg border border-comet-border bg-comet-panel p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-comet-fuchsia">COMETA G</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-5xl">ARMA TU PC</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
          Elegi componentes, revisa compatibilidades basicas y consulta tu armado. El sistema usa datos propios cacheados
          y especificaciones tecnicas disponibles; no depende de scraping en tiempo real.
        </p>
      </section>

      <PcBuilderClient products={products} />
    </main>
  );
}
