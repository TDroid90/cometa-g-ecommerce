import { NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/adminAuth";
import { readAdminProductsSheet } from "@/lib/adminProducts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    verifyAdminSecret(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autorizado." },
      { status: 401 }
    );
  }

  try {
    const { products } = await readAdminProductsSheet();
    const result = products.map(({ product }) => ({
      id: product.id,
      sku: product.sku,
      nombre: product.nombre,
      categoria: product.categoria,
      subcategoria: product.subcategoria,
      marca: product.marca,
      atributos: product.atributos || ""
    })).filter((product) => product.id && product.nombre);
    return NextResponse.json({ products: result, total: result.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo leer el catálogo." },
      { status: 500 }
    );
  }
}
