export default function PcBuilderPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-comet-fuchsia">Próximamente</p>
      <h1 className="mt-3 text-4xl font-black text-white">ARMA TU PC</h1>
      <div className="mt-8 rounded-lg border border-comet-border bg-comet-panel p-6 text-zinc-300">
        <p className="text-lg font-bold text-white">Estamos preparando el armador compatible de COMETA G.</p>
        <p className="mt-4 leading-7">
          La idea es validar procesador, mother, memoria, fuente, gabinete y placa de video con reglas reales de
          compatibilidad. Lo vamos a trabajar con banderas y una tabla más detallada para que no haya combinaciones
          incorrectas.
        </p>
      </div>
    </main>
  );
}
