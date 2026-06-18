"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice, productPrice } from "@/lib/data";
import {
  effectiveInterestRate,
  financedTotal,
  installmentAmount,
  PAYMENT_PLANS,
  PaymentPlanCode
} from "@/lib/financing";
import { CartItem } from "@/lib/types";

type PaymentTab = "credit" | "debit" | "wallet";
type SessionUser = {
  email: string;
  nombre?: string;
  apellido?: string;
  direccion?: string;
  telefono?: string;
  profile_complete: boolean;
};

export function CheckoutButton({ items }: { items: CartItem[] }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlanCode>("one");
  const [paymentTab, setPaymentTab] = useState<PaymentTab>("credit");
  const [paymentMenuOpen, setPaymentMenuOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem("cometag-user");
    return saved ? (JSON.parse(saved) as SessionUser) : null;
  });
  const subtotal = items.reduce((total, item) => total + productPrice(item.product) * item.quantity, 0);
  const selectedPlan = PAYMENT_PLANS.find((plan) => plan.code === paymentPlan) || PAYMENT_PLANS[0];
  const finalTotal = financedTotal(subtotal, selectedPlan);
  const fixedInstallment = installmentAmount(subtotal, selectedPlan);
  const selectedInterest = effectiveInterestRate(selectedPlan);
  const transferPhone = "+54 11 5555-0000";

  async function startCheckout() {
    setLoading(true);
    setMessage(null);

    try {
      const checkoutPlan = paymentTab === "credit" ? paymentPlan : "one";
      const response = await fetch("/api/payway/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.product.id,
            quantity: item.quantity
          })),
          paymentPlan: checkoutPlan,
          customerEmail: user?.email
        })
      });
      const data = (await response.json()) as {
        ok?: boolean;
        checkoutUrl?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok || !data.checkoutUrl) {
        setMessage(data.message || "No se pudo crear el checkout de Payway.");
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setMessage("No se pudo conectar con Payway.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      {(!user || !user.profile_complete) && (
        <div className="mb-4 rounded-md border border-comet-fuchsia bg-comet-fuchsia/10 p-3 text-sm leading-6 text-zinc-200">
          {!user
            ? "Para comprar necesitas iniciar sesion."
            : "Para comprar necesitas completar tu perfil con telefono y direccion."}
          <Link
            href={!user ? "/login" : "/perfil"}
            className="mt-3 grid h-11 place-items-center rounded-md comet-gradient text-sm font-black text-white"
          >
            {!user ? "Iniciar sesion" : "Completar perfil"}
          </Link>
        </div>
      )}

      <div className="mb-4 rounded-md border border-comet-border bg-black/25 p-3">
        <div className="grid grid-cols-3 overflow-hidden rounded-md border border-comet-border bg-comet-black text-[11px] font-black text-zinc-400">
          {[
            { id: "credit", label: "Tar. Credito" },
            { id: "debit", label: "Tar. Debito" },
            { id: "wallet", label: "BVirtuales" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setPaymentTab(tab.id as PaymentTab);
                setPaymentMenuOpen(false);
              }}
              className={`h-10 transition ${
                paymentTab === tab.id
                  ? "bg-gradient-to-r from-comet-fuchsia to-comet-violet text-white"
                  : "hover:bg-comet-panel hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {paymentTab === "credit" && (
          <>
            <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.12em] text-comet-fuchsia">
              Elegi la forma de pago
            </label>
            <div className="relative mt-2">
              <button
                type="button"
                onClick={() => setPaymentMenuOpen((open) => !open)}
                className="flex h-12 w-full items-center justify-between gap-3 rounded-md border border-comet-border bg-comet-black px-3 text-left text-sm font-black text-white outline-none transition hover:border-comet-fuchsia"
              >
                <span>
                  {selectedPlan.installments === 1
                    ? `1 pago - Interes ${selectedInterest}%`
                    : `${selectedPlan.installments} cuotas - Interes ${selectedInterest}%`}
                  {selectedPlan.planGobierno && (
                    <strong className="ml-1 text-comet-fuchsia">- MiPyME</strong>
                  )}
                </span>
                <span className="text-zinc-500">v</span>
              </button>

              {paymentMenuOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-md border border-comet-border bg-comet-black shadow-2xl">
                  {PAYMENT_PLANS.map((plan) => {
                    const interest = effectiveInterestRate(plan);
                    const active = plan.code === paymentPlan;

                    return (
                      <button
                        key={plan.code}
                        type="button"
                        onClick={() => {
                          setPaymentPlan(plan.code);
                          setPaymentMenuOpen(false);
                        }}
                        className={`flex h-10 w-full items-center justify-between px-3 text-left text-sm transition ${
                          active
                            ? "bg-comet-fuchsia/20 text-white"
                            : "text-zinc-300 hover:bg-comet-panel hover:text-white"
                        }`}
                      >
                        <span className="font-bold">
                          {plan.installments === 1
                            ? `1 pago - Interes ${interest}%`
                            : `${plan.installments} cuotas - Interes ${interest}%`}
                          {plan.planGobierno && (
                            <strong className="ml-1 text-comet-fuchsia">- MiPyME</strong>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              className={`mt-3 rounded-md border p-3 ${
                selectedPlan.planGobierno
                  ? "border-comet-fuchsia bg-gradient-to-r from-comet-fuchsia/25 to-comet-violet/25 shadow-[0_0_22px_rgba(236,72,153,0.18)]"
                  : "border-comet-border bg-comet-panel"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-white">
                    {selectedPlan.installments === 1
                      ? "1 pago"
                      : `${selectedPlan.installments} cuotas fijas`}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Interes total {selectedInterest}%
                    {selectedPlan.planGobierno && (
                      <strong className="ml-2 rounded bg-comet-fuchsia px-2 py-0.5 text-[10px] uppercase text-white">
                        MiPyME
                      </strong>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white">
                    {selectedPlan.installments} x {formatPrice(fixedInstallment)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">Total {formatPrice(finalTotal)}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded border border-comet-border bg-black/20 px-3 py-2 text-xs leading-5 text-zinc-300">
              Vas a pagar {selectedPlan.installments} cuota{selectedPlan.installments === 1 ? "" : "s"} de{" "}
              <strong className="text-white">{formatPrice(fixedInstallment)}</strong>. Total:{" "}
              <strong className="text-white">{formatPrice(finalTotal)}</strong>.
            </div>
          </>
        )}

        {paymentTab === "debit" && (
          <>
            <div className="mt-4 rounded-md border border-comet-border bg-comet-panel p-4">
              <p className="text-sm font-black text-white">Tarjeta de debito</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Pagas online en un solo pago. Total:{" "}
                <strong className="text-white">{formatPrice(subtotal)}</strong>.
              </p>
            </div>

            <div className="mt-3 rounded-md border border-comet-fuchsia bg-gradient-to-r from-comet-fuchsia/20 to-comet-violet/20 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-white">Transferencias</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Para transferencias, llamanos al{" "}
                <a href={`tel:${transferPhone.replaceAll(" ", "")}`} className="font-black text-white">
                  {transferPhone}
                </a>
                .
              </p>
            </div>
          </>
        )}

        {paymentTab === "wallet" && (
          <div className="mt-4 rounded-md border border-comet-border bg-comet-panel p-4">
            <p className="text-sm font-black text-white">Billeteras virtuales con QR</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Pagas con QR desde el checkout. Total:{" "}
              <strong className="text-white">{formatPrice(subtotal)}</strong>.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={startCheckout}
        disabled={loading || !user || !user.profile_complete}
        className="h-12 w-full rounded-md comet-gradient text-sm font-black text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? "Creando checkout..." : "Pagar"}
      </button>
      {message && <p className="mt-3 text-xs leading-5 text-comet-fuchsia">{message}</p>}
    </div>
  );
}
