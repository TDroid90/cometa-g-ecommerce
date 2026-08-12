import { NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/adminAuth";

export async function GET(request: Request) {
  try {
    verifyAdminSecret(request);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Acceso administrativo denegado." },
      { status: 401 }
    );
  }
}
