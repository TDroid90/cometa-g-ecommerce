"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [direction, setDirection] = useState<1 | -1>(1);
  const slide = validSlides[active] || validSlides[0];

  function goTo(index: number) {
    if (validSlides.length <= 1 || index === active) return;
    setDirection(index > active ? 1 : -1);
    setActive(index);
  }

  function goNext() {
    if (validSlides.length <= 1) return;
    setDirection(1);
    setActive((current) => (current + 1) % validSlides.length);
  }

  function goPrev() {
    if (validSlides.length <= 1) return;
    setDirection(-1);
    setActive((current) => (current - 1 + validSlides.length) % validSlides.length);
  }

  useEffect(() => {
    if (!autoplay || validSlides.length <= 1) return;
    const timer = window.setInterval(goNext, 5200);
    return () => window.clearInterval(timer);
  }, [autoplay, validSlides.length]);

  if (!slide) return null;

  return (
    <section className="bg-comet-black px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative mx-auto w-full max-w-7xl overflow-hidden rounded-xl border border-comet-border bg-comet-black shadow-lg md:aspect-[16/9] md:max-h-[640px]">
        <div className="absolute inset-0 opacity-80 md:inset-y-0 md:left-auto md:right-0 md:w-[64%] md:opacity-95">
          {slide.image && (
            <Image
              key={`${slide.image}-${active}`}
              src={slide.image}
              alt={slide.title || "COMETA G"}
              fill
              priority
              sizes="(min-width: 768px) 64vw, 100vw"
              className={`object-cover motion-safe:animate-[heroSlide_520ms_ease-out] ${
                direction === 1 ? "[--slide-from:24px]" : "[--slide-from:-24px]"
              }`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-comet-black via-comet-black/75 to-comet-black/35 md:bg-gradient-to-r md:from-comet-black md:via-comet-black/45 md:to-transparent" />
        </div>

        <div className="relative z-10 grid min-h-[420px] items-center px-6 py-12 sm:px-10 md:h-full md:min-h-0 lg:px-14">
          <div
            key={`${slide.title}-${active}`}
            className={`max-w-xl motion-safe:animate-[heroSlide_520ms_ease-out] ${
              direction === 1 ? "[--slide-from:18px]" : "[--slide-from:-18px]"
            }`}
          >
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

        {validSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Slide anterior"
              className="absolute left-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/20 text-white/70 opacity-70 backdrop-blur transition hover:border-comet-fuchsia/50 hover:bg-black/45 hover:text-white hover:opacity-100 md:left-5"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Slide siguiente"
              className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/20 text-white/70 opacity-70 backdrop-blur transition hover:border-comet-fuchsia/50 hover:bg-black/45 hover:text-white hover:opacity-100 md:right-5"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {validSlides.slice(0, 8).map((item, index) => (
                <button
                  key={`${item.title}-${index}`}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Ir al slide ${index + 1}`}
                  className={index === active ? "h-2 w-8 rounded-full comet-gradient" : "h-2 w-2 rounded-full bg-white/35"}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
