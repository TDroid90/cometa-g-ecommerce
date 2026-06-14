import { NextResponse } from "next/server";
import { updateUserProfile } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      nombre?: string;
      apellido?: string;
      direccion?: string;
      telefono?: string;
    };
    const user = await updateUserProfile({
      email: body.email || "",
      nombre: body.nombre || "",
      apellido: body.apellido || "",
      direccion: body.direccion || "",
      telefono: body.telefono || ""
    });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar el perfil." },
      { status: 400 }
    );
  }
}
