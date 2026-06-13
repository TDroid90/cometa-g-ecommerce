"use client";

import Link from "next/link";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "registro" }) {
  const [done, setDone] = useState(false);
  const isLogin = mode === "login";

  return (
    <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-md place-items-center px-4 py-10">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setDone(true);
        }}
        className="w-full rounded-lg border border-comet-border bg-comet-panel p-6 shadow-glow"
      >
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-comet-fuchsia">
          {isLogin ? "Acceso" : "Cuenta nueva"}
        </p>
        <h1 className="mt-2 text-3xl font-black text-white">
          {isLogin ? "Ingresar" : "Registro"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Formulario local listo para conectar con NextAuth, Supabase, Firebase o un backend propio.
        </p>

        {!isLogin && (
          <label className="mt-6 block">
            <span className="text-xs font-bold text-zinc-400">Nombre</span>
            <input className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia" required />
          </label>
        )}

        <label className="mt-4 block">
          <span className="text-xs font-bold text-zinc-400">Email</span>
          <input type="email" className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia" required />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-bold text-zinc-400">Contraseña</span>
          <input type="password" className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia" required />
        </label>

        {done && (
          <div className="mt-5 rounded-md border border-comet-violet/40 bg-comet-violet/10 p-3 text-sm text-zinc-200">
            Flujo simulado correctamente. El siguiente paso es conectar proveedor de autenticacion.
          </div>
        )}

        <button className="mt-6 h-12 w-full rounded-md comet-gradient text-sm font-black text-white transition hover:brightness-110">
          {isLogin ? "Ingresar" : "Crear cuenta"}
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
