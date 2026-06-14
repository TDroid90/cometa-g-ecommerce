"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SessionUser = {
  email: string;
  nombre?: string;
  apellido?: string;
  direccion?: string;
  telefono?: string;
  profile_complete: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    direccion: "",
    telefono: ""
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("cometag-user");
    if (!saved) {
      router.push("/login");
      return;
    }

    const parsed = JSON.parse(saved) as SessionUser;
    setUser(parsed);
    setForm({
      nombre: parsed.nombre || "",
      apellido: parsed.apellido || "",
      direccion: parsed.direccion || "",
      telefono: parsed.telefono || ""
    });
  }, [router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage("");
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, ...form })
    });
    const payload = (await response.json()) as { user?: SessionUser; error?: string };
    setSaving(false);

    if (!response.ok || !payload.user) {
      setMessage(payload.error || "No se pudo guardar el perfil.");
      return;
    }

    window.localStorage.setItem("cometag-user", JSON.stringify(payload.user));
    setUser(payload.user);
    setMessage("Perfil guardado. Ya podés comprar con tus datos cargados.");
  }

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-comet-fuchsia">Mi cuenta</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">Completá tu perfil</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Usamos estos datos para preparar compras, reservas y contacto. Tu email ya queda tomado del registro.
        </p>
      </div>

      {!user.profile_complete && (
        <div className="mb-5 rounded-lg border border-comet-violet/40 bg-comet-violet/10 p-4 text-sm text-zinc-200">
          Te falta completar el perfil para dejar tu cuenta lista.
        </div>
      )}

      <form onSubmit={submit} className="rounded-lg border border-comet-border bg-comet-panel p-5 shadow-glow">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold text-zinc-400">Email</span>
            <input
              value={user.email}
              disabled
              className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-zinc-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-zinc-400">Teléfono de contacto</span>
            <input
              value={form.telefono}
              onChange={(event) => setForm((current) => ({ ...current, telefono: event.target.value }))}
              className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-zinc-400">Nombre</span>
            <input
              value={form.nombre}
              onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
              className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-zinc-400">Apellido</span>
            <input
              value={form.apellido}
              onChange={(event) => setForm((current) => ({ ...current, apellido: event.target.value }))}
              className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
              required
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-zinc-400">Dirección de casa</span>
            <input
              value={form.direccion}
              onChange={(event) => setForm((current) => ({ ...current, direccion: event.target.value }))}
              className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
              required
            />
          </label>
        </div>

        {message && <p className="mt-5 text-sm text-zinc-300">{message}</p>}

        <button
          disabled={saving}
          className="mt-6 h-12 rounded-md comet-gradient px-6 text-sm font-black text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
        >
          {saving ? "Guardando..." : "Guardar perfil"}
        </button>
      </form>
    </div>
  );
}
