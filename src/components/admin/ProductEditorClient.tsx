"use client";

import { Upload, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ProductRecord = Record<string, string>;

const mainFields = [
  "id",
  "sku",
  "nombre",
  "slug",
  "categoria",
  "subcategoria",
  "marca",
  "precio_usd",
  "precio",
  "precio_oferta",
  "stock",
  "stock_status",
  "visible",
  "oferta",
  "preventa"
];

const editorialFields = [
  "descripcion_corta",
  "descripcion_larga",
  "imagen_principal",
  "imagenes_extra",
  "atributos",
  "techSpecs",
  "externalRefs",
  "garantia",
  "tags"
];

function splitImages(value = "") {
  return value.split(/[|,]/).map((item) => item.trim()).filter(Boolean);
}

function generateDescription(product: ProductRecord) {
  const brand = product.marca || "Marca seleccionada";
  const category = product.subcategoria || product.categoria || "producto";
  const name = product.nombre || "Producto";
  const attrs = (product.atributos || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  const highlights = attrs.length
    ? ` Sus puntos clave son: ${attrs.join(", ")}.`
    : " Ideal para actualizar o completar tu setup con informacion clara de stock y compatibilidad.";

  return `${name} de ${brand}, pensado para configuraciones gamer, trabajo diario o upgrades de hardware dentro de la categoria ${category}.${highlights} Revisar compatibilidad con el resto de los componentes antes de confirmar la compra.`;
}

export function ProductEditorClient() {
  const [secret, setSecret] = useState("");
  const [lookup, setLookup] = useState("");
  const [rowNumber, setRowNumber] = useState<number | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [product, setProduct] = useState<ProductRecord>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSecret(window.localStorage.getItem("cometag-admin-secret") || "");
  }, []);

  const images = useMemo(() => {
    return [product.imagen_principal, ...splitImages(product.imagenes_extra)].filter(Boolean) as string[];
  }, [product.imagen_principal, product.imagenes_extra]);

  function saveSecret(value: string) {
    setSecret(value);
    window.localStorage.setItem("cometag-admin-secret", value);
  }

  function updateField(field: string, value: string) {
    setProduct((current) => ({ ...current, [field]: value }));
  }

  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret,
        ...(init?.headers || {})
      }
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Error inesperado.");
    return payload as T;
  }

  async function openProduct() {
    setLoading(true);
    setMessage("Buscando producto...");
    try {
      const payload = await request<{ found: boolean; headers: string[]; rowNumber?: number; product: ProductRecord }>(
        `/api/admin/productos?lookup=${encodeURIComponent(lookup)}`
      );
      setHeaders(payload.headers);
      setRowNumber(payload.rowNumber || null);
      setProduct(payload.product || {});
      setMessage(payload.found ? "Producto abierto." : "No existe todavia. Completa datos y toca Crear producto.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo abrir.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProduct() {
    if (!rowNumber) {
      setMessage("Este producto todavia no existe. Usa Crear producto.");
      return;
    }
    setLoading(true);
    setMessage("Guardando...");
    try {
      const payload = await request<{ product: ProductRecord; rowNumber: number }>("/api/admin/productos", {
        method: "PATCH",
        body: JSON.stringify({ rowNumber, product })
      });
      setProduct(payload.product);
      setRowNumber(payload.rowNumber);
      setMessage("Producto guardado en Google Sheets.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  }

  async function createProduct() {
    setLoading(true);
    setMessage("Creando producto...");
    try {
      const payload = await request<{ product: ProductRecord; rowNumber: number }>("/api/admin/productos", {
        method: "POST",
        body: JSON.stringify({ product })
      });
      setProduct(payload.product);
      setRowNumber(payload.rowNumber);
      setMessage("Producto creado en Google Sheets.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage(file: File, target: "main" | "gallery") {
    setLoading(true);
    setMessage("Subiendo imagen a Blob...");
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("productId", product.id || product.sku || lookup || "producto");
      formData.set("index", target === "main" ? "1" : String(images.length + 1));
      const response = await fetch("/api/admin/upload-product-image", {
        method: "POST",
        headers: { "x-admin-secret": secret },
        body: formData
      });
      const payload = (await response.json()) as { url?: string; error?: string; storage?: string; warning?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "No se pudo subir.");
      if (target === "main") {
        updateField("imagen_principal", payload.url);
      } else {
        const next = [...splitImages(product.imagenes_extra), payload.url].join("|");
        updateField("imagenes_extra", next);
      }
      setMessage(`${payload.warning || `Imagen subida a ${payload.storage || "storage"}.`} Toca Guardar producto para fijarla en la Sheet.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo subir.");
    } finally {
      setLoading(false);
    }
  }

  function fieldControl(field: string) {
    const value = product[field] || "";
    const isLong = ["descripcion_larga", "imagenes_extra", "atributos", "techSpecs", "externalRefs", "tags"].includes(field);
    return (
      <label key={field} className="block">
        <span className="text-[11px] font-black uppercase tracking-[0.08em] text-zinc-500">{field}</span>
        {isLong ? (
          <textarea
            value={value}
            onChange={(event) => updateField(field, event.target.value)}
            rows={field === "descripcion_larga" ? 6 : 4}
            className="mt-2 w-full rounded-md border border-comet-border bg-comet-black px-3 py-2 text-sm text-white outline-none focus:border-comet-fuchsia"
          />
        ) : (
          <input
            value={value}
            onChange={(event) => updateField(field, event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
          />
        )}
      </label>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-comet-fuchsia">Administrador</p>
        <h1 className="mt-2 text-3xl font-black text-white">Editor de productos</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Abri un producto por ID, SKU, slug o nombre. Edita fotos, descripcion, atributos y ficha tecnica; al guardar se actualiza la hoja PRODUCTOS.
        </p>
      </div>

      <div className="mb-5 grid gap-3 rounded-lg border border-comet-border bg-comet-panel p-4 lg:grid-cols-[1fr_1fr_auto_auto]">
        <input
          type="password"
          value={secret}
          onChange={(event) => saveSecret(event.target.value)}
          placeholder="Clave admin"
          className="h-11 rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
        />
        <input
          value={lookup}
          onChange={(event) => setLookup(event.target.value)}
          placeholder="ID, SKU, slug o nombre"
          className="h-11 rounded-md border border-comet-border bg-comet-black px-3 text-sm text-white outline-none focus:border-comet-fuchsia"
        />
        <button onClick={openProduct} disabled={loading} className="rounded-md bg-white px-5 text-sm font-black text-black disabled:opacity-50">
          Abrir
        </button>
        <button onClick={createProduct} disabled={loading} className="rounded-md bg-comet-gradient px-5 text-sm font-black text-white disabled:opacity-50">
          Crear producto
        </button>
      </div>

      {message && <div className="mb-5 rounded-md border border-comet-border bg-comet-panel px-4 py-3 text-sm text-zinc-200">{message}</div>}

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="h-fit rounded-lg border border-comet-border bg-comet-panel p-4">
          <div className="aspect-square overflow-hidden rounded-md border border-comet-border bg-comet-black">
            {product.imagen_principal ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imagen_principal} alt="" className="h-full w-full object-contain" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-zinc-600">Sin imagen principal</div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {images.slice(0, 8).map((image) => (
              <div key={image} className="aspect-square overflow-hidden rounded border border-comet-border bg-comet-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" className="h-full w-full object-contain" />
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-comet-border bg-comet-black px-3 py-3 text-sm font-black text-white hover:border-comet-fuchsia">
              <Upload size={16} /> Subir principal
              <input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && uploadImage(event.target.files[0], "main")} />
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-comet-border bg-comet-black px-3 py-3 text-sm font-black text-white hover:border-comet-fuchsia">
              <Upload size={16} /> Subir a galeria
              <input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && uploadImage(event.target.files[0], "gallery")} />
            </label>
            <button
              type="button"
              onClick={() => updateField("descripcion_larga", generateDescription(product))}
              className="flex items-center justify-center gap-2 rounded-md border border-comet-fuchsia/50 bg-comet-fuchsia/10 px-3 py-3 text-sm font-black text-comet-fuchsia"
            >
              <Wand2 size={16} /> Generar descripcion base
            </button>
            <button onClick={saveProduct} disabled={loading || !rowNumber} className="rounded-md bg-comet-gradient px-5 py-3 text-sm font-black text-white disabled:opacity-50">
              Guardar producto
            </button>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="rounded-lg border border-comet-border bg-comet-panel p-4">
            <h2 className="mb-4 text-lg font-black text-white">Datos principales</h2>
            <div className="grid gap-3 md:grid-cols-3">{mainFields.map(fieldControl)}</div>
          </div>

          <div className="rounded-lg border border-comet-border bg-comet-panel p-4">
            <h2 className="mb-4 text-lg font-black text-white">Fotos, descripcion y ficha tecnica</h2>
            <div className="grid gap-3 md:grid-cols-2">{editorialFields.map(fieldControl)}</div>
          </div>

          <details className="rounded-lg border border-comet-border bg-comet-panel p-4">
            <summary className="cursor-pointer text-sm font-black text-zinc-300">Todos los campos de la hoja</summary>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {headers.filter((field) => !mainFields.includes(field) && !editorialFields.includes(field)).map(fieldControl)}
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
