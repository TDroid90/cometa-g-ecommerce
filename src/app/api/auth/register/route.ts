import { NextResponse } from "next/server";
import { registerUser } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const user = await registerUser(body.email || "", body.password || "");
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo registrar." },
      { status: 400 }
    );
  }
}
