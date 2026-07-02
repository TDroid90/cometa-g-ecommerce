import { NextRequest } from "next/server";
import { fetchDriveFile } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const revalidate = 604800;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return new Response("Imagen invalida", { status: 400 });
  }

  try {
    const file = await fetchDriveFile(fileId);
    return new Response(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800"
      }
    });
  } catch {
    return new Response("Imagen no disponible", { status: 404 });
  }
}
