"use client";

import { useState } from "react";
import { formatPrice, productPrice } from "@/lib/data";
import {
  effectiveInterestRate,
  financedTotal,
  installmentAmount,
  PAYMENT_PLANS,
  PaymentPlanCode
} from "@/lib/financing";
import { CartItem } from "@/lib/types";

export function CheckoutButton({ items }: { items: CartItem[] }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlanCode>("one");
  const subtotal = items.reduce((total, item) => total + productPrice(item.product) * item.quantity, 0);
  const selectedPlan = PAYMENT_PLANS.find((plan) => plan.code === paymentPlan) || PAYMENT_PLANS[0];
  const finalTotal = financedTotal(subtotal, selectedPlan);
  const fixedInstallment = installmentAmount(subtotal, selectedPlan);
  const selectedInterest = effectiveInterestRate(selectedPlan);

  async function startCheckout() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/payway/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.product.id,
            quantity: item.quantity
          })),
          paymentPlan
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
      <div className="mb-4 rounded-md border border-comet-border bg-black/25 p-3">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-comet-fuchsia">
          Financiacion
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-zinc-300">
          <span className="rounded border border-comet-border px-2 py-1">Tarjetas de credito</span>
          <span className="rounded border border-comet-border px-2 py-1">Naranja X</span>
          <span className="rounded border border-comet-border px-2 py-1">Billeteras virtuales con QR</span>
        </div>

        <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.12em] text-zinc-500">
          Elegi la forma de pago
        </label>
        <select
          value={paymentPlan}
          onChange={(event) => setPaymentPlan(event.target.value as PaymentPlanCode)}
          className="mt-2 h-12 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm font-black text-white outline-none transition focus:border-comet-fuchsia"
        >
          {PAYMENT_PLANS.map((plan) => {
            const interest = effectiveInterestRate(plan);
            const suffix = plan.planGobierno ? " - MiPyME" : "";

            return (
              <option key={plan.code} value={plan.code}>
                {plan.installments === 1
                  ? `1 pago - Interes ${interest}%`
                  : `${plan.installments} cuotas - Interes ${interest}%${suffix}`}
              </option>
            );
          })}
        </select>

        <div
          className={`mt-3 rounded-md border p-3 ${
            selectedPlan.planGobierno
              ? "border-comet-fuchsia bg-gradient-to-r from-comet-fuchsia/20 to-comet-violet/20"
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
      </div>
      <button
        onClick={startCheckout}
        disabled={loading}
        className="h-12 w-full rounded-md comet-gradient text-sm font-black text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? "Creando checkout..." : "Pagar"}
      </button>
      {message && <p className="mt-3 text-xs leading-5 text-comet-fuchsia">{message}</p>}
    </div>
  );
}
