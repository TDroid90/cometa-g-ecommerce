import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/adminAuth";

function slugify(value: string) {
  return String(value || "producto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export async function POST(request: Request) {
  try {
    verifyAdminSecret(request);
    const formData = await request.formData();
    const file = formData.get("file");
    const productId = String(formData.get("productId") || "producto");
    const index = String(formData.get("index") || "1");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta archivo." }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pathname = `productos/manual/${slugify(productId)}/${String(index).padStart(2, "0")}-${uniqueSuffix}.${extension}`;
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return NextResponse.json({ ok: true, url: blob.url, pathname });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo subir la imagen." },
      { status: 400 }
    );
  }
}
