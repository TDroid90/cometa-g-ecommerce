"use client";

import { useState } from "react";
import { formatPrice, productPrice } from "@/lib/data";
import {
  CASHFLOW_RATE,
  effectiveCoefficient,
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
        <div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto pr-1">
          {PAYMENT_PLANS.map((plan) => {
            const total = financedTotal(subtotal, plan);
            const installment = installmentAmount(subtotal, plan);
            const active = plan.code === paymentPlan;

            return (
              <button
                key={plan.code}
                type="button"
                onClick={() => setPaymentPlan(plan.code)}
                className={`w-full rounded-md border p-3 text-left transition ${
                  active
                    ? "border-comet-fuchsia bg-comet-fuchsia/10"
                    : "border-comet-border bg-comet-black hover:border-comet-fuchsia/50"
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-black text-white">{plan.label}</span>
                    <span className="mt-1 block text-xs text-zinc-400">
                      Cuotas fijas de {formatPrice(installment)}. Interes total {effectiveInterestRate(plan)}%
                    </span>
                    <span className="mt-1 block text-[11px] text-zinc-500">
                      {plan.note}. Coef. Payway con IVA {plan.coefficientWithVat.toFixed(4)} + {CASHFLOW_RATE}%.
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-black text-white">
                      {plan.installments} x {formatPrice(installment)}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-400">
                      Total {formatPrice(total)}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 rounded border border-comet-border bg-comet-panel px-3 py-2 text-xs leading-5 text-zinc-300">
          Vas a pagar {selectedPlan.installments} cuota{selectedPlan.installments === 1 ? "" : "s"} fija
          {selectedPlan.planGobierno ? " bajo regimen MiPyME" : " comunes"} por{" "}
          <strong className="text-white">{formatPrice(fixedInstallment)}</strong>. Total informado a
          Payway: <strong className="text-white">{formatPrice(finalTotal)}</strong>. Interes total{" "}
          <strong className="text-white">{effectiveInterestRate(selectedPlan)}%</strong>, incluyendo{" "}
          tu {CASHFLOW_RATE}% por pronto pago a 10 dias.
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
