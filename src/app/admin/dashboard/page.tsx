import Link from "next/link";
import { ArrowRight, Beaker, Boxes } from "lucide-react";

const modules = [
  {
    href: "/admin/dashboard/productos",
    title: "Productos",
    description: "Abre, edita y crea productos del catálogo conectado a Google Sheets.",
    icon: Boxes
  },
  {
    href: "/admin/dashboard/lab",
    title: "Laboratorio",
    description: "Prueba transformaciones del catálogo en modo seguro antes de aplicarlas.",
    icon: Beaker
  }
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-comet-fuchsia">Panel central</p>
      <h2 className="mt-2 text-3xl font-black">Dashboard</h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">Gestiona los módulos internos de COMETA G desde un único lugar.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href} className="group rounded-lg border border-comet-border bg-comet-panel p-5 transition hover:border-comet-fuchsia/60 hover:shadow-glow">
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-md bg-comet-fuchsia/10 text-comet-fuchsia"><Icon size={22} /></div>
                <ArrowRight size={18} className="text-zinc-600 transition group-hover:translate-x-1 group-hover:text-comet-fuchsia" />
              </div>
              <h3 className="mt-5 text-xl font-black">{module.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{module.description}</p>
            </Link>
          );
        })}
      </div>
      <div className="mt-8 rounded-lg border border-dashed border-comet-border px-5 py-4 text-sm text-zinc-500">La navegación queda preparada para sumar Catálogo, Importadores, Imágenes, Publicaciones, Logs y Configuración.</div>
    </div>
  );
}
