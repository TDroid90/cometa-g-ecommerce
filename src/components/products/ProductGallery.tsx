"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { normalizeImageUrl } from "@/lib/images";

export function ProductGallery({
  name,
  mainImage,
  extraImages
}: {
  name: string;
  mainImage?: string;
  extraImages: string[];
}) {
  const images = useMemo(
    () => [mainImage, ...extraImages].map(normalizeImageUrl).filter(Boolean) as string[],
    [mainImage, extraImages]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const active = images[activeIndex] || images[0];

  function selectImage(index: number) {
    if (index === activeIndex) return;
    setDirection(index > activeIndex ? "next" : "prev");
    setActiveIndex(index);
  }

  if (!images.length) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-lg border border-comet-border bg-comet-panel text-zinc-500">
        Sin imagen
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-comet-border bg-comet-panel">
        <Image
          key={active}
          src={active || images[0]}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className={clsx("object-cover", direction === "next" ? "gallery-slide-next" : "gallery-slide-prev")}
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              className={clsx(
                "relative aspect-square overflow-hidden rounded-md border bg-comet-panel transition",
                activeIndex === index ? "border-comet-fuchsia" : "border-comet-border hover:border-comet-violet"
              )}
              onClick={() => selectImage(index)}
              aria-label={`Ver imagen ${index + 1} de ${name}`}
              title={`Imagen ${index + 1}`}
            >
              <Image src={image} alt={`${name} ${index + 1}`} fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
