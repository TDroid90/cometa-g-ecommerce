import { NextRequest } from "next/server";
import { fetchDriveFile } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const revalidate = 604800;

function placeholderSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="#ffffff"/><text x="500" y="500" text-anchor="middle" dominant-baseline="middle" fill="#777" font-family="Arial, sans-serif" font-size="34">Sin imagen</text></svg>`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return new Response(placeholderSvg(), {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300"
      }
    });
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
    return new Response(placeholderSvg(), {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300"
      }
    });
  }
}
