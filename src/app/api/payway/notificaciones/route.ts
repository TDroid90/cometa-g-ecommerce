import { NextRequest, NextResponse } from "next/server";
import { extractPaywayPaymentId, updateSaleStatus } from "@/lib/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));

  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const nested =
    data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : {};
  const paymentId = extractPaywayPaymentId(
    data.payment_id ||
      data.payment_link ||
      data.id ||
      data.hash ||
      nested.payment_id ||
      nested.payment_link ||
      nested.id ||
      nested.hash
  );
  const orderId = String(data.order_id || data.site_transaction_id || nested.order_id || "").trim();
  const rawStatus = String(
    data.status ||
      data.payment_status ||
      data.estado ||
      nested.status ||
      nested.payment_status ||
      ""
  ).toLowerCase();

  if (!paymentId && !orderId) {
    console.warn("Payway notification without identifiers");
    return NextResponse.json({ ok: false, updated: false, error: "missing_identifiers" }, { status: 400 });
  }

  const status = rawStatus.includes("approved") || rawStatus.includes("aprob")
    ? "aprobado"
    : rawStatus.includes("reject") || rawStatus.includes("rechaz")
      ? "rechazado"
      : rawStatus.includes("cancel")
        ? "cancelado"
        : rawStatus || "notificado";

  console.info("Payway notification", { orderId, paymentId, status });

  const updated = await updateSaleStatus({
    orderId,
    paymentId,
    status,
    paywayStatus: rawStatus,
    paywayPayload: payload
  }).catch((error) => {
    console.error("No se pudo actualizar venta desde Payway", error);
    return false;
  });

  return NextResponse.json({ ok: true, updated });
}

export async function GET() {
  return NextResponse.json({ ok: true, name: "COMETA G Payway notifications" });
}
