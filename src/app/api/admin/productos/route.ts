import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { appendProductRow } from "@/lib/googleSheets";
import { normalizeProductPayload, productPath } from "@/lib/adminProduct";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_UPLOAD_SECRET;
  if (!expected) return false;
  const header = request.headers.get("x-admin-secret");
  return header === expected;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
      return NextResponse.json(
        { error: "Falta configurar Blob: BLOB_STORE_ID o BLOB_READ_WRITE_TOKEN." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const product = normalizeProductPayload({
      id: formData.get("id"),
      sku: formData.get("sku"),
      nombre: formData.get("nombre"),
      slug: formData.get("slug"),
      descripcion_corta: formData.get("descripcion_corta"),
      descripcion_larga: formData.get("descripcion_larga"),
      precio: formData.get("precio"),
      precio_oferta: formData.get("precio_oferta"),
      stock: formData.get("stock"),
      stock_status: formData.get("stock_status"),
      categoria: formData.get("categoria"),
      subcategoria: formData.get("subcategoria"),
      marca: formData.get("marca"),
      tags: formData.get("tags"),
      atributos: formData.get("atributos"),
      variables: formData.get("variables"),
      color: formData.get("color"),
      garantia: formData.get("garantia"),
      destacado: formData.get("destacado"),
      preventa: formData.get("preventa"),
      fecha_lanzamiento: formData.get("fecha_lanzamiento"),
      visible: formData.get("visible"),
      orden: formData.get("orden")
    });

    if (!product.nombre || !product.precio) {
      return NextResponse.json({ error: "Nombre y precio son obligatorios." }, { status: 400 });
    }

    const files = formData
      .getAll("images")
      .filter((item): item is File => item instanceof File && item.size > 0);

    const uploadedUrls: string[] = [];
    for (const [index, file] of files.entries()) {
      const blob = await put(productPath(product, index, file), file, {
        access: "public",
        addRandomSuffix: false,
        contentType: file.type || "image/webp"
      });
      uploadedUrls.push(blob.url);
    }

    const productRow = {
      ...product,
      imagen_principal: uploadedUrls[0] || String(formData.get("imagen_principal") || "").trim(),
      imagenes_extra: uploadedUrls.slice(1).join("|") || String(formData.get("imagenes_extra") || "").trim()
    };

    await appendProductRow(productRow);

    return NextResponse.json({
      ok: true,
      product: productRow,
      urls: uploadedUrls,
      product_url: `/producto/${product.slug}`
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear el producto." },
      { status: 500 }
    );
  }
}
