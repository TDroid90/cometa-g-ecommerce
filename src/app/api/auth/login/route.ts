import { NextResponse } from "next/server";
import { loginUser } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const user = await loginUser(body.email || "", body.password || "");
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo ingresar." },
      { status: 401 }
    );
  }
}
