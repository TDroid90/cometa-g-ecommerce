"use client";

import { useState } from "react";
import { normalizeImageUrl } from "@/lib/images";

type ProductImageProps = {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  loading?: "eager" | "lazy";
};

export function ProductImage({
  src,
  alt,
  className,
  fallbackClassName,
  loading = "lazy"
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const imageUrl = normalizeImageUrl(src);

  if (!imageUrl || failed) {
    return (
      <div
        className={`bg-white ${fallbackClassName || "grid h-full w-full place-items-center text-xs text-zinc-500"}`}
      >
        Sin imagen
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      className={`bg-white ${className || ""}`}
    />
  );
}
