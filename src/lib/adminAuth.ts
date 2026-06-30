export function verifyAdminSecret(request: Request) {
  const expected =
    process.env.ADMIN_UPLOAD_SECRET ||
    process.env.ADMIN_API_KEY ||
    process.env.CATALOG_ADMIN_TOKEN ||
    "";
  const provided = request.headers.get("x-admin-secret") || "";

  if (!expected) {
    throw new Error("Falta configurar ADMIN_UPLOAD_SECRET en Vercel.");
  }

  if (!provided || provided !== expected) {
    throw new Error("Clave admin invalida.");
  }
}
