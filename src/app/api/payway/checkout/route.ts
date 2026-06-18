import { NextRequest, NextResponse } from "next/server";
import { getProducts, productPrice } from "@/lib/data";
import { effectiveInterestRate, financedTotal, getPaymentPlan } from "@/lib/financing";
import { appendPendingSale, createOrderId, extractPaywayPaymentId } from "@/lib/sales";

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

function optionalNumber(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function paywayEnvironment() {
  return (process.env.PAYWAY_ENVIRONMENT || "developer") as
    | "developer"
    | "production"
    | "desarrollo"
    | "qa";
}

function productNumericId(id: string, fallback: number) {
  const numeric = Number(id.replace(/\D/g, "").slice(-8));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function findCheckoutId(result: Record<string, unknown>) {
  const nested = result.data && typeof result.data === "object" ? (result.data as Record<string, unknown>) : {};
  return (
    result.payment_id ||
    result.payment_link ||
    result.id ||
    result.hash ||
    nested.payment_id ||
    nested.id ||
    nested.hash
  );
}

function findCheckoutUrl(result: Record<string, unknown>, environment: string) {
  const nested = result.data && typeof result.data === "object" ? (result.data as Record<string, unknown>) : {};
  const directUrl =
    result.url || result.link || result.payment_link || nested.url || nested.link || nested.payment_link;

  const checkoutId =
    typeof directUrl === "string" && directUrl.startsWith("http")
      ? directUrl.match(/\/web\/checkout\/([^/?#]+)/i)?.[1] || findCheckoutId(result)
      : findCheckoutId(result);
  if (!checkoutId) return null;

  const base =
    environment === "production"
      ? "https://live.decidir.com/web/checkout"
      : "https://developers.decidir.com/web/checkout";

  return `${base}/${checkoutId}`;
}

function checkoutEndpoint(environment: string) {
  if (environment === "production") {
    return "https://ventasonline.payway.com.ar/api/v1/checkout-payment-button/link";
  }

  return "https://developers.decidir.com/api/v1/checkout-payment-button/link";
}

function xSourceHeader(company: string, user: string) {
  return Buffer.from(
    JSON.stringify({
      service: "SDK-NODE",
      grouper: company,
      developer: user
    })
  ).toString("base64");
}

function hasMissingCheckoutFields(result: Record<string, unknown>) {
  const validationErrors = Array.isArray(result.validation_errors) ? result.validation_errors : [];
  return validationErrors.some((error) => {
    if (!error || typeof error !== "object") return false;
    const param = String((error as Record<string, unknown>).param || "");
    return param === "total_price" || param === "products[].value";
  });
}

function paymentDescription(args: Record<string, unknown>) {
  const products = Array.isArray(args.products) ? args.products : [];
  const productCount = products.reduce((total, item) => {
    if (!item || typeof item !== "object") return total;
    return total + (Number((item as Record<string, unknown>).quantity) || 1);
  }, 0);

  return `Compra COMETA G${productCount ? ` - ${productCount} producto${productCount === 1 ? "" : "s"}` : ""}`;
}

async function paywayCheckout(args: Record<string, unknown>) {
  const environment = paywayEnvironment();
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

  const baseHeaders = {
    apikey: privateKey,
    "X-Source": xSourceHeader(company, user)
  };
  const endpoint = checkoutEndpoint(environment);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...baseHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args)
  });

  let result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  let paywayStatus = response.status;

  if (!response.ok && hasMissingCheckoutFields(result)) {
    const simpleArgs = {
      ...args,
      products: undefined,
      payment_description: paymentDescription(args)
    };
    const simpleResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...baseHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(simpleArgs)
    });

    result = (await simpleResponse.json().catch(() => ({}))) as Record<string, unknown>;
    paywayStatus = simpleResponse.status;
  }

  const checkoutUrl = findCheckoutUrl(result, environment);

  return {
    ok: Boolean(checkoutUrl),
    status: checkoutUrl ? 200 : 502,
    body: {
      ok: Boolean(checkoutUrl),
      checkoutUrl,
      payway: result,
      paywayStatus
    }
  };
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

  const body = (await request.json()) as { items?: CheckoutItem[]; paymentPlan?: string };
  const selectedPlan = getPaymentPlan(body.paymentPlan);
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
  const saleProducts: Array<{
    id: string;
    sku?: string;
    nombre: string;
    precio: number;
    quantity: number;
    preventa?: boolean;
  }> = [];
  const lines = requestedItems
    .map((item, index) => {
      const product = products.find((entry) => entry.id === item.id);
      if (!product) return null;

      const value = productPrice(product);
      saleProducts.push({
        id: product.id,
        sku: product.sku,
        nombre: product.nombre,
        precio: value,
        quantity: item.quantity,
        preventa: product.preventa
      });

      return {
        id: productNumericId(product.id, index + 1),
        value: value.toFixed(2),
        description: product.nombre.slice(0, 120),
        quantity: item.quantity
      };
    })
    .filter(Boolean) as Array<{ id: number; value: string; description: string; quantity: number }>;

  if (!lines.length) {
    return NextResponse.json({ ok: false, error: "products_not_found" }, { status: 400 });
  }

  const totalPrice = Number(
    lines.reduce((total, item) => total + Number(item.value) * item.quantity, 0).toFixed(2)
  );
  const isSandbox = paywayEnvironment() !== "production";
  const paywayLines = lines;
  const paywayTotalPrice = financedTotal(totalPrice, selectedPlan);
  const orderId = createOrderId();
  const origin =
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.cometag.store";

  const args = {
    id: orderId,
    origin_platform: "SDK-Node",
    currency: "ARS",
    products: effectiveInterestRate(selectedPlan) > 0 ? undefined : paywayLines,
    payment_description:
      effectiveInterestRate(selectedPlan) > 0
        ? `Compra COMETA G - ${selectedPlan.label}`
        : undefined,
    total_price: paywayTotalPrice,
    site,
    success_url: `${origin}/checkout/exito?orden=${orderId}`,
    redirect_url: `${origin}/checkout/estado?orden=${orderId}`,
    cancel_url: `${origin}/carrito?checkout=cancelado`,
    notifications_url: `${origin}/api/payway/notificaciones`,
    template_id: Number(process.env.PAYWAY_TEMPLATE_ID || "1"),
    installments: [selectedPlan.installments],
    id_payment_method: optionalNumber(process.env.PAYWAY_PAYMENT_METHOD_ID),
    plan_gobierno: selectedPlan.planGobierno,
    establishment_number: optionalNumber(process.env.PAYWAY_ESTABLISHMENT_NUMBER || process.env.PAYWAY_TERMINAL_ID),
    cuit: process.env.PAYWAY_CUIT?.trim() || undefined,
    public_apikey: publicKey,
    auth_3ds: process.env.PAYWAY_AUTH_3DS !== "false"
  };

  const response = await paywayCheckout(args);
  const checkoutBody = response.body as Record<string, unknown>;

  if (response.ok && typeof checkoutBody.checkoutUrl === "string") {
    await appendPendingSale({
      orderId,
      paymentId: extractPaywayPaymentId(checkoutBody.checkoutUrl),
      checkoutUrl: checkoutBody.checkoutUrl,
      status: "pendiente",
      totalReal: totalPrice,
      totalPayway: paywayTotalPrice,
      currency: "ARS",
      sandbox: isSandbox,
      paymentPlan: {
        label: selectedPlan.label,
        installments: selectedPlan.installments,
        interestRate: effectiveInterestRate(selectedPlan),
        planGobierno: selectedPlan.planGobierno
      },
      products: saleProducts,
      paywayStatus: String(checkoutBody.paywayStatus || ""),
      paywayPayload: checkoutBody.payway
    }).catch((error) => {
      console.error("No se pudo registrar la venta pendiente", error);
    });
  }

  return NextResponse.json(
    {
      ...checkoutBody,
      orderId
    },
    { status: response.status }
  );
}
