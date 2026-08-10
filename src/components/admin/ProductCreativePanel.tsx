"use client";

import { Download, ImageIcon, Loader2, Scissors } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CREATIVE_BACKGROUNDS, CreativeType, selectCreativeBackground } from "@/lib/creatives/backgrounds";

type ProductRecord = Record<string, string>;
type BackgroundMode = "auto" | "manual";

function truthy(value?: string) {
  return ["true", "1", "si", "sí", "yes", "y"].includes(String(value || "").trim().toLowerCase());
}

function suggestedType(product: ProductRecord): CreativeType {
  if (truthy(product.preventa)) return "preventa";
  if (truthy(product.oferta)) return "oferta";
  return "nuevo";
}

function extractFilename(disposition?: string | null) {
  const match = String(disposition || "").match(/filename="?([^"]+)"?/i);
  return match?.[1] || "cometag-creativo-1080x1350.png";
}

async function errorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string; needsCutout?: boolean };
    if (payload.needsCutout) return "esta foto necesita recorte";
    return payload.error || "No se pudo generar el creativo.";
  } catch {
    return "No se pudo generar el creativo.";
  }
}

function productCutoutUrl(product: ProductRecord) {
  return (
    product.productCutoutUrl ||
    product.product_cutout_url ||
    product.recorte_url ||
    product.imagen_recortada ||
    ""
  ).trim();
}

export function ProductCreativePanel({ product, secret }: { product: ProductRecord; secret: string }) {
  const [creativeType, setCreativeType] = useState<CreativeType>("nuevo");
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("auto");
  const [backgroundId, setBackgroundId] = useState(CREATIVE_BACKGROUNDS[0]?.id || "");
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCreativeType(suggestedType(product));
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
  }, [product.id, product.sku, product.slug, product.preventa, product.oferta]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const automaticBackground = useMemo(() => {
    return selectCreativeBackground({
      creativeType,
      categoria: product.categoria,
      subcategoria: product.subcategoria
    });
  }, [creativeType, product.categoria, product.subcategoria]);

  const cutoutUrl = productCutoutUrl(product);
  const missing = [
    !product.nombre ? "nombre" : "",
    !product.imagen_principal ? "imagen_principal" : "",
    !secret ? "clave admin" : ""
  ].filter(Boolean);
  const needsCutout = Boolean(product.imagen_principal) && !cutoutUrl;
  const disabled = missing.length > 0 || needsCutout || loading;

  async function requestCreative(download: boolean) {
    if (needsCutout) {
      setMessage("esta foto necesita recorte");
      return;
    }

    if (disabled) {
      setMessage(`Falta ${missing.join(", ")}.`);
      return;
    }

    setLoading(true);
    setMessage(download ? "Preparando descarga..." : "Generando vista previa...");

    try {
      const response = await fetch("/api/admin/creative", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret
        },
        body: JSON.stringify({
          product,
          creativeType,
          backgroundId: backgroundMode === "manual" ? backgroundId : undefined
        })
      });

      if (!response.ok) throw new Error(await errorMessage(response));

      const blob = await response.blob();
      if (blob.type !== "image/png") throw new Error("La respuesta no es PNG.");
      const nextUrl = URL.createObjectURL(blob);

      if (download) {
        const link = document.createElement("a");
        link.href = nextUrl;
        link.download = extractFilename(response.headers.get("content-disposition"));
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(nextUrl), 1000);
        setMessage("PNG descargado.");
        return;
      }

      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });
      setMessage("Vista previa generada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar el creativo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-comet-border bg-comet-panel p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">Creativos</h2>
          <p className="mt-1 text-xs text-zinc-500">Instagram Feed 1080x1350. Sin precios, cuotas ni descuentos.</p>
        </div>
        <div className="rounded-full border border-comet-border px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-zinc-400">
          4:5 PNG
        </div>
      </div>

      {needsCutout && (
        <div className="mb-4 flex gap-3 rounded-md border border-comet-fuchsia/45 bg-comet-fuchsia/10 p-3 text-sm text-zinc-200">
          <Scissors size={18} className="mt-0.5 shrink-0 text-comet-fuchsia" />
          <div>
            <p className="font-black text-white">esta foto necesita recorte</p>
            <p className="mt-1 text-xs text-zinc-400">
              Para evitar una placa pegada sobre fondo blanco, el creativo premium requiere una imagen recortada con transparencia en
              <span className="font-bold text-zinc-200"> productCutoutUrl</span>. La foto original queda para la ficha del producto.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.08em] text-zinc-500">Tipo de creativo</span>
            <select
              value={creativeType}
              onChange={(event) => setCreativeType(event.target.value as CreativeType)}
              className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
            >
              <option value="nuevo">Nuevo ingreso</option>
              <option value="preventa">Preventa</option>
              <option value="oferta">Oferta</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.08em] text-zinc-500">Fondo</span>
            <select
              value={backgroundMode}
              onChange={(event) => setBackgroundMode(event.target.value as BackgroundMode)}
              className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
            >
              <option value="auto">Automatico: {automaticBackground.label}</option>
              <option value="manual">Manual</option>
            </select>
          </label>

          {backgroundMode === "manual" && (
            <label className="block md:col-span-2">
              <span className="text-[11px] font-black uppercase tracking-[0.08em] text-zinc-500">Biblioteca de fondos</span>
              <select
                value={backgroundId}
                onChange={(event) => setBackgroundId(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
              >
                {CREATIVE_BACKGROUNDS.map((background) => (
                  <option key={background.id} value={background.id}>
                    {background.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid gap-2 md:col-span-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => requestCreative(false)}
              className="flex h-12 items-center justify-center gap-2 rounded-md border border-comet-border bg-comet-black px-4 text-sm font-black text-white hover:border-comet-fuchsia disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              Generar vista previa
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => requestCreative(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-md bg-comet-gradient px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Descargar PNG
            </button>
          </div>

          {(message || missing.length > 0 || needsCutout) && (
            <div className="rounded-md border border-comet-border bg-comet-black px-3 py-2 text-xs text-zinc-300 md:col-span-2">
              {needsCutout ? "No se genera PNG final hasta cargar un recorte real del producto." : missing.length > 0 ? `Para generar falta: ${missing.join(", ")}.` : message}
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-[240px]">
          <div className="aspect-[4/5] overflow-hidden rounded-md border border-comet-border bg-comet-black">
            {previewUrl ? (
              <img src={previewUrl} alt="Vista previa del creativo" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center px-5 text-center text-xs text-zinc-500">
                {needsCutout ? "esta foto necesita recorte" : "Genera una vista previa para verla aca."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
