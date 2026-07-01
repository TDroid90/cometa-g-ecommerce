import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/adminAuth";
import { uploadProductImageToDrive } from "@/lib/googleDrive";

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
    try {
      const blob = await put(pathname, file, {
        access: "public",
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });

      return NextResponse.json({ ok: true, storage: "blob", url: blob.url, pathname });
    } catch (blobError) {
      const message = blobError instanceof Error ? blobError.message : "";
      const shouldFallback =
        message.toLowerCase().includes("suspended") ||
        message.toLowerCase().includes("inactive") ||
        message.toLowerCase().includes("threshold") ||
        message.toLowerCase().includes("quota");

      if (!shouldFallback) throw blobError;

      const buffer = Buffer.from(await file.arrayBuffer());
      const driveFile = await uploadProductImageToDrive({
        productId,
        filename: `${String(index).padStart(2, "0")}-${uniqueSuffix}.${extension}`,
        mimeType: file.type || "application/octet-stream",
        buffer
      });

      return NextResponse.json({
        ok: true,
        storage: "drive",
        url: driveFile.url,
        pathname,
        warning: "Blob suspendido; imagen subida a Google Drive."
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo subir la imagen." },
      { status: 400 }
    );
  }
}
