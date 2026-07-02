export function normalizeImageUrl(url?: string): string | undefined {
  if (!url) return undefined;

  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  const openMatch = url.match(/[?&]id=([^&]+)/);
  const id = fileMatch?.[1] || openMatch?.[1];

  if (url.includes("drive.google.com") && id) {
    return `/api/drive-image/${encodeURIComponent(id)}`;
  }

  return url;
}
