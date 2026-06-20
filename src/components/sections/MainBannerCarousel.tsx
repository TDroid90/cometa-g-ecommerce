"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BannerSlide = {
  eyebrow: string;
  title: string;
  text: string;
  image: string;
  href: string;
  button: string;
};

export function MainBannerCarousel({
  slides,
  autoplay = true
}: {
  slides: BannerSlide[];
  autoplay?: boolean;
}) {
  const validSlides = useMemo(
    () => slides.filter((slide) => slide.title || slide.image),
    [slides]
  );
  const [active, setActive] = useState(0);
  const slide = validSlides[active] || validSlides[0];

  useEffect(() => {
    if (!autoplay || validSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % validSlides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [autoplay, validSlides.length]);

  if (!slide) return null;

  return (
    <section className="bg-comet-black px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-xl border border-comet-border bg-comet-black shadow-lg md:aspect-[16/9] md:max-h-[640px]">
        <div className="absolute inset-y-0 right-0 hidden w-[64%] opacity-95 md:block">
          {slide.image && (
            <Image
              key={slide.image}
              src={slide.image}
              alt={slide.title || "COMETA G"}
              fill
              priority
              sizes="64vw"
              className="object-cover transition-opacity duration-500"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-comet-black via-comet-black/45 to-transparent" />
        </div>

        <div className="relative z-10 grid min-h-[420px] items-center px-6 py-12 sm:px-10 md:h-full md:min-h-0 lg:px-14">
          <div className="max-w-xl">
            {slide.eyebrow && (
              <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-comet-fuchsia">
                {slide.eyebrow}
              </p>
            )}
            {slide.title && (
              <h1 className="mt-4 text-4xl font-black leading-[1.03] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {slide.title}
              </h1>
            )}
            {slide.text && <p className="mt-5 max-w-lg text-base leading-7 text-zinc-300">{slide.text}</p>}
            {slide.href && slide.button && (
              <Link
                href={slide.href}
                className="mt-8 inline-flex h-12 items-center justify-center rounded-md comet-gradient px-6 text-sm font-extrabold text-white transition hover:brightness-110"
              >
                {slide.button}
              </Link>
            )}
          </div>
        </div>

        <div className="relative aspect-[16/9] md:hidden">
          {slide.image && (
            <Image
              src={slide.image}
              alt={slide.title || "COMETA G"}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
        </div>

        {validSlides.length > 1 && (
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {validSlides.slice(0, 8).map((item, index) => (
              <button
                key={`${item.title}-${index}`}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Ir al slide ${index + 1}`}
                className={index === active ? "h-2 w-8 rounded-full comet-gradient" : "h-2 w-2 rounded-full bg-white/35"}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
