import { NextRequest, NextResponse } from "next/server";
import { sdk as PaywaySdk } from "sdk-node-payway";
import { getProducts, productPrice } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutItem = {
  id: string;
  quantity: number;
};

function requiredEnv(name: string) {
  return process.env[name]?.trim();
}

function parseInstallments(value?: string) {
  const installments = (value || "1")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);

  return installments.length ? installments : [1];
}

function productNumericId(id: string, fallback: number) {
  const numeric = Number(id.replace(/\D/g, "").slice(-8));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function findCheckoutId(result: Record<string, unknown>) {
  const nested = result.data && typeof result.data === "object" ? (result.data as Record<string, unknown>) : {};
  return (
    result.payment_id ||
    result.id ||
    result.hash ||
    nested.payment_id ||
    nested.id ||
    nested.hash
  );
}

function findCheckoutUrl(result: Record<string, unknown>, environment: string) {
  const nested = result.data && typeof result.data === "object" ? (result.data as Record<string, unknown>) : {};
  const directUrl = result.url || result.link || nested.url || nested.link;

  if (typeof directUrl === "string" && directUrl.startsWith("http")) return directUrl;

  const checkoutId = findCheckoutId(result);
  if (!checkoutId) return null;

  const base =
    environment === "production"
      ? "https://live.decidir.com/web/checkout"
      : "https://developers.decidir.com/web/checkout";

  return `${base}/${checkoutId}`;
}

function paywayCheckout(args: Record<string, unknown>) {
  const environment = (process.env.PAYWAY_ENVIRONMENT || "developer") as
    | "developer"
    | "production"
    | "desarrollo"
    | "qa";
  const publicKey = requiredEnv("PAYWAY_PUBLIC_KEY");
  const privateKey = requiredEnv("PAYWAY_PRIVATE_KEY");
  const company = process.env.PAYWAY_COMPANY || "COMETA G";
  const user = process.env.PAYWAY_USER || "COMETA G Web";

  if (!publicKey || !privateKey) {
    return Promise.resolve({
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "payway_not_configured",
        message: "Faltan PAYWAY_PUBLIC_KEY y/o PAYWAY_PRIVATE_KEY en Vercel."
      }
    });
  }

  const sdk = new PaywaySdk(environment, publicKey, privateKey, company, user);

  return new Promise<{ ok: boolean; status: number; body: Record<string, unknown> }>((resolve) => {
    sdk.checkout(args, (result, error) => {
      if (error) {
        resolve({
          ok: false,
          status: 502,
          body: { ok: false, error: "payway_error", detail: error }
        });
        return;
      }

      const checkoutUrl = findCheckoutUrl(result, environment);
      resolve({
        ok: Boolean(checkoutUrl),
        status: checkoutUrl ? 200 : 502,
        body: {
          ok: Boolean(checkoutUrl),
          checkoutUrl,
          payway: result
        }
      });
    });
  });
}

export async function POST(request: NextRequest) {
  const site = requiredEnv("PAYWAY_SITE_ID");
  const publicKey = requiredEnv("PAYWAY_PUBLIC_KEY");

  if (!site || !publicKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "payway_not_configured",
        message: "Faltan PAYWAY_SITE_ID y/o PAYWAY_PUBLIC_KEY en Vercel."
      },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { items?: CheckoutItem[] };
  const requestedItems = (body.items || [])
    .map((item) => ({
      id: String(item.id || ""),
      quantity: Math.max(1, Number(item.quantity) || 1)
    }))
    .filter((item) => item.id);

  if (!requestedItems.length) {
    return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 });
  }

  const products = await getProducts();
  const lines = requestedItems
    .map((item, index) => {
      const product = products.find((entry) => entry.id === item.id);
      if (!product) return null;

      const value = productPrice(product);
      return {
        id: productNumericId(product.id, index + 1),
        value,
        description: product.nombre.slice(0, 120),
        quantity: item.quantity
      };
    })
    .filter(Boolean) as Array<{ id: number; value: number; description: string; quantity: number }>;

  if (!lines.length) {
    return NextResponse.json({ ok: false, error: "products_not_found" }, { status: 400 });
  }

  const totalPrice = Number(
    lines.reduce((total, item) => total + item.value * item.quantity, 0).toFixed(2)
  );
  const origin =
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.cometag.store";

  const args = {
    origin_platform: "SDK-Node",
    currency: "ARS",
    products: lines,
    total_price: totalPrice,
    site,
    success_url: `${origin}/checkout/exito`,
    redirect_url: `${origin}/checkout/estado`,
    cancel_url: `${origin}/carrito?checkout=cancelado`,
    notifications_url: `${origin}/api/payway/notificaciones`,
    template_id: Number(process.env.PAYWAY_TEMPLATE_ID || "1"),
    installments: parseInstallments(process.env.PAYWAY_INSTALLMENTS),
    plan_gobierno: process.env.PAYWAY_PLAN_GOBIERNO === "true",
    public_apikey: publicKey,
    auth_3ds: process.env.PAYWAY_AUTH_3DS !== "false"
  };

  const response = await paywayCheckout(args);
  return NextResponse.json(response.body, { status: response.status });
}
