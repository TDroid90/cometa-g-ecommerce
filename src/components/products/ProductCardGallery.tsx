"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductImage } from "@/components/products/ProductImage";
import { normalizeImageUrl } from "@/lib/images";
import { Product } from "@/lib/types";

const IMAGE_INTERVAL_MS = 850;

export function ProductCardGallery({ product }: { product: Product }) {
  const images = useMemo(
    () =>
      [product.imagen_principal, ...product.imagenes_extra]
        .map(normalizeImageUrl)
        .filter((image, index, all): image is string => Boolean(image) && all.indexOf(image) === index),
    [product.imagen_principal, product.imagenes_extra]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!hovered || images.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, IMAGE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [hovered, images.length]);

  function stopPreview() {
    setHovered(false);
    setActiveIndex(0);
  }

  return (
    <span
      className="relative block h-full w-full bg-white"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={stopPreview}
      onFocus={() => setHovered(true)}
      onBlur={stopPreview}
    >
      {images.map((image, index) => (
        <ProductImage
          key={`${product.id}-${image}`}
          src={image}
          alt={index === 0 ? product.nombre : `${product.nombre} - imagen ${index + 1}`}
          className={`absolute inset-0 h-full w-full bg-white object-contain p-7 transition-[opacity,transform] duration-100 ease-linear group-hover:scale-105 ${
            index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
      ))}
    </span>
  );
}
