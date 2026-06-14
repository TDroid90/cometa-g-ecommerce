"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SessionUser = {
  email: string;
  nombre?: string;
  apellido?: string;
  direccion?: string;
  telefono?: string;
  profile_complete: boolean;
};

export function AuthForm({ mode }: { mode: "login" | "registro" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch(isLogin ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const payload = (await response.json()) as { user?: SessionUser; error?: string };
    setLoading(false);

    if (!response.ok || !payload.user) {
      setError(payload.error || "No se pudo completar la operacion.");
      return;
    }

    window.localStorage.setItem("cometag-user", JSON.stringify(payload.user));
    router.push(payload.user.profile_complete ? "/" : "/perfil");
  }

  return (
    <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-md place-items-center px-4 py-10">
      <form
        onSubmit={submit}
        className="w-full rounded-lg border border-comet-border bg-comet-panel p-6 shadow-glow"
      >
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-comet-fuchsia">
          {isLogin ? "Acceso" : "Cuenta nueva"}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">
          {isLogin ? "Ingresar" : "Registro"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {isLogin
            ? "Entrá con tu email y contraseña."
            : "Creá tu usuario. Después te pedimos los datos de perfil para agilizar compras."}
        </p>

        <label className="mt-6 block">
          <span className="text-xs font-bold text-zinc-400">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
            required
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-bold text-zinc-400">Contraseña</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            minLength={6}
            className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
            required
          />
        </label>

        {error && (
          <div className="mt-5 rounded-md border border-comet-red/50 bg-comet-red/10 p-3 text-sm text-zinc-100">
            {error}
          </div>
        )}

        <button
          disabled={loading}
          className="mt-6 h-12 w-full rounded-md comet-gradient text-sm font-black text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? "Procesando..." : isLogin ? "Ingresar" : "Crear cuenta"}
        </button>

        <p className="mt-5 text-center text-sm text-zinc-400">
          {isLogin ? "No tenes cuenta?" : "Ya tenes cuenta?"}{" "}
          <Link href={isLogin ? "/registro" : "/login"} className="font-bold text-comet-fuchsia hover:text-white">
            {isLogin ? "Registrate" : "Ingresar"}
          </Link>
        </p>
      </form>
    </div>
  );
}
