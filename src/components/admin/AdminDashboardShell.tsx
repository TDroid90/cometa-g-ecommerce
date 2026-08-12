"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Beaker, Boxes, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

const navigation = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/dashboard/productos", label: "Productos", icon: Boxes },
  { href: "/admin/dashboard/lab", label: "Laboratorio", icon: Beaker }
];

function sectionTitle(pathname: string) {
  if (pathname.includes("/productos")) return "Productos";
  if (pathname.includes("/lab")) return "Laboratorio";
  return "Dashboard";
}

export function AdminDashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [draftSecret, setDraftSecret] = useState("");
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const title = useMemo(() => sectionTitle(pathname), [pathname]);

  async function verify(value: string) {
    if (!value) {
      setChecking(false);
      setAuthorized(false);
      return;
    }
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", { headers: { "x-admin-secret": value }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Clave inválida.");
      window.localStorage.setItem("cometag-admin-secret", value);
      setSecret(value);
      setDraftSecret(value);
      setAuthorized(true);
    } catch (cause) {
      setAuthorized(false);
      setError(cause instanceof Error ? cause.message : "No se pudo validar la clave.");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    const stored = window.localStorage.getItem("cometag-admin-secret") || "";
    setDraftSecret(stored);
    void verify(stored);
  }, []);

  function logout() {
    window.localStorage.removeItem("cometag-admin-secret");
    setSecret("");
    setDraftSecret("");
    setAuthorized(false);
    router.refresh();
  }

  if (checking && !authorized) {
    return <div className="fixed inset-0 z-[200] grid place-items-center bg-[#090a0f] text-sm text-zinc-400">Validando acceso administrativo...</div>;
  }

  if (!authorized) {
    return (
      <div className="fixed inset-0 z-[200] grid place-items-center bg-[#090a0f] px-4">
        <form
          className="w-full max-w-md rounded-lg border border-comet-border bg-comet-panel p-7 shadow-glow"
          onSubmit={(event) => { event.preventDefault(); void verify(draftSecret); }}
        >
          <div className="mb-6 flex items-center gap-3">
            <img src="/cometa-g-logo-cuadrado.png" alt="COMETA G" className="h-11 w-11 rounded-md object-cover" />
            <div><p className="font-black text-white">COMETA G</p><p className="text-xs text-zinc-500">Panel administrativo</p></div>
          </div>
          <label className="text-xs font-black uppercase text-zinc-500">Clave administrativa</label>
          <input
            type="password"
            value={draftSecret}
            onChange={(event) => setDraftSecret(event.target.value)}
            autoFocus
            className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-white outline-none focus:border-comet-fuchsia"
          />
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <button disabled={checking} className="mt-5 h-11 w-full rounded-md bg-comet-gradient text-sm font-black text-white disabled:opacity-50">
            Ingresar al dashboard
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex overflow-hidden bg-[#090a0f] text-white">
      {sidebarOpen && <button aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-black/70 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-[#0e1017] transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Link href="/admin/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <img src="/cometa-g-logo-cuadrado.png" alt="COMETA G" className="h-10 w-10 rounded-md object-cover" />
            <div><p className="font-black">COMETA G</p><p className="text-[11px] text-zinc-500">Administración</p></div>
          </Link>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navigation.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition ${active ? "bg-comet-fuchsia/15 text-comet-fuchsia" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}>
                <Icon size={18} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3 text-xs text-zinc-600">Módulos preparados para crecer sin duplicar el admin.</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0e1017]/95 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-md border border-white/10 p-2 lg:hidden" aria-label="Abrir menú"><Menu size={18} /></button>
            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-comet-fuchsia">Administrador</p><h1 className="text-lg font-black">{title}</h1></div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white"><LogOut size={15} /> <span className="hidden sm:inline">Cerrar sesión</span></button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
