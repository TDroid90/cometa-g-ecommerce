"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatPrice, productPrice } from "@/lib/data";
import { normalizeImageUrl } from "@/lib/images";
import { useCart } from "@/components/cart/CartProvider";
import { CheckoutButton } from "@/components/cart/CheckoutButton";

export default function CartPage() {
  const { items, subtotal, hasPreorder, updateQuantity, removeItem, clearCart } = useCart();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-comet-fuchsia">Compra</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Carrito</h1>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-comet-border bg-comet-panel p-8 text-center">
          <p className="text-zinc-300">Tu carrito esta vacio.</p>
          <Link href="/productos" className="mt-5 inline-flex h-11 items-center rounded-md comet-gradient px-5 text-sm font-black text-white">
            Ver productos
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.product.id} className="grid gap-4 rounded-lg border border-comet-border bg-comet-panel p-4 sm:grid-cols-[110px_1fr_auto]">
                <div className="relative aspect-square overflow-hidden rounded-md bg-comet-black">
                  {item.product.imagen_principal && (
                    <Image src={normalizeImageUrl(item.product.imagen_principal) || item.product.imagen_principal} alt={item.product.nombre} fill sizes="110px" className="object-cover" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-black text-white">{item.product.nombre}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.product.sku}</p>
                  {item.preorder && <p className="mt-2 text-xs font-bold text-comet-violet">Producto de preventa</p>}
                  <p className="mt-3 text-sm font-bold text-zinc-200">{formatPrice(productPrice(item.product))}</p>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <div className="flex h-10 items-center rounded-md border border-comet-border">
                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="grid h-10 w-10 place-items-center text-zinc-300" aria-label="Restar" title="Restar">
                      <Minus size={16} />
                    </button>
                    <span className="w-9 text-center text-sm font-bold text-white">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="grid h-10 w-10 place-items-center text-zinc-300" aria-label="Sumar" title="Sumar">
                      <Plus size={16} />
                    </button>
                  </div>
                  <button onClick={() => removeItem(item.product.id)} className="grid h-10 w-10 place-items-center rounded-md border border-comet-border text-zinc-400 hover:border-comet-red hover:text-white" aria-label="Quitar" title="Quitar">
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-lg border border-comet-border bg-comet-panel p-5">
            <h2 className="text-lg font-black text-white">Resumen</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span className="font-bold text-white">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Envio</span>
                <span>A definir</span>
              </div>
            </div>
            {hasPreorder && (
              <div className="mt-5 rounded-md border border-comet-violet/40 bg-comet-violet/10 p-3 text-xs leading-5 text-zinc-300">
                Este carrito contiene productos en preventa. La reserva queda preparada para integrarse con pago o confirmacion manual.
              </div>
            )}
            <CheckoutButton items={items} />
            <button onClick={clearCart} className="mt-3 h-11 w-full rounded-md border border-comet-border text-sm font-bold text-zinc-300 hover:text-white">
              Vaciar carrito
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
