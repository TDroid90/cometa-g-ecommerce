"use client";

import { useState } from "react";
import { CartItem } from "@/lib/types";

export function CheckoutButton({ items }: { items: CartItem[] }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
          }))
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
