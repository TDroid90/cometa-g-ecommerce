import { NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/adminAuth";
import { readAdminProductsSheet } from "@/lib/adminProducts";
import { attributeSegments, normalizeProductAttributes } from "@/lib/productAttributes.mjs";

export const dynamic = "force-dynamic";

const MAX_DRY_RUN_PRODUCTS = 100;

export async function POST(request: Request) {
  try {
    verifyAdminSecret(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autorizado." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as { productIds?: unknown };
    if (!Array.isArray(body.productIds) || !body.productIds.length) {
      return NextResponse.json({ error: "Selecciona al menos un producto." }, { status: 400 });
    }
    const productIds = new Set(body.productIds.slice(0, MAX_DRY_RUN_PRODUCTS).map((id) => String(id)));
    const { products } = await readAdminProductsSheet();
    const selected = products.filter(({ product }) => productIds.has(product.id));
    const results = selected.map(({ product }) => {
      const normalization = normalizeProductAttributes(product.atributos, product.categoria, product.subcategoria);
      const warnings = [
        ...normalization.unknownAttributes.map((attribute) => `Alias desconocido: ${attribute.key}`),
        ...normalization.validationErrors.map((warning) => warning.replace(/_/g, " "))
      ];
      return {
        id: product.id,
        sku: product.sku,
        name: product.nombre,
        category: product.categoria,
        subcategory: product.subcategoria,
        brand: product.marca,
        before: product.atributos || "",
        after: normalization.serializedAttributes,
        status: normalization.normalizationStatus,
        schema: normalization.schema,
        warnings: [...new Set(warnings)],
        conflicts: normalization.conflicts,
        segments: attributeSegments(normalization.serializedAttributes)
      };
    });
    return NextResponse.json({ mode: "dry-run", results, requested: productIds.size, processed: results.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo ejecutar el dry-run." },
      { status: 500 }
    );
  }
}
