"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import clsx from "clsx";

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
    () => [mainImage, ...extraImages].filter(Boolean) as string[],
    [mainImage, extraImages]
  );
  const [active, setActive] = useState(images[0]);

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
          src={active || images[0]}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              onClick={() => setActive(image)}
              className={clsx(
                "relative aspect-square overflow-hidden rounded-md border bg-comet-panel transition",
                active === image ? "border-comet-fuchsia" : "border-comet-border hover:border-comet-violet"
              )}
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
