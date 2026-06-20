import { NextRequest, NextResponse } from "next/server";
import { filterProducts, getProducts } from "@/lib/data";

export async function GET(request: NextRequest) {
  const products = await getProducts();
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") || "";
  const categoria = searchParams.get("categoria") || "";
  const subcategoria = searchParams.get("subcategoria") || "";
  const marca = searchParams.get("marca") || "";
  const disponibilidad = searchParams.get("disponibilidad") || "";
  const oferta = searchParams.get("oferta");
  const limit = Number(searchParams.get("limit") || 0);
  const filtered = filterProducts(products, {
    query,
    categoria,
    subcategoria,
    marca,
    disponibilidad: disponibilidad as "todos" | "disponible" | "sin_stock" | "preventa",
    oferta: oferta === "true" || oferta === "1"
  });

  return NextResponse.json({ data: limit > 0 ? filtered.slice(0, limit) : filtered });
}
