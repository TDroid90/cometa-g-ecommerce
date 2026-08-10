import { readFile } from "fs/promises";
import path from "path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { verifyAdminSecret } from "@/lib/adminAuth";
import { fetchDriveFile } from "@/lib/googleDrive";
import { normalizeImageUrl } from "@/lib/images";
import { CreativeType } from "@/lib/creatives/backgrounds";
import { buildCreativeData, CreativeCategoryKind, CreativeProductInput } from "@/lib/creatives/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1080;
const HEIGHT = 1350;
const CUTOUT_ERROR = "esta foto necesita recorte";

class CutoutRequiredError extends Error {
  constructor() {
    super(CUTOUT_ERROR);
  }
}

function absoluteImageUrl(url: string, origin: string) {
  const normalized = normalizeImageUrl(url) || "";
  if (normalized.startsWith("/")) return `${origin}${normalized}`;
  return normalized;
}

function extractDriveFileId(url: string) {
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  const openMatch = url.match(/[?&]id=([^&]+)/);
  const proxyMatch = url.match(/\/api\/drive-image\/([^/?]+)/);
  return fileMatch?.[1] || openMatch?.[1] || (proxyMatch?.[1] ? decodeURIComponent(proxyMatch[1]) : "");
}

async function fetchImageBuffer(url: string, origin: string) {
  const driveFileId = extractDriveFileId(url);
  if (driveFileId) {
    const file = await fetchDriveFile(driveFileId);
    return Buffer.from(file.body);
  }

  const response = await fetch(absoluteImageUrl(url, origin), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo leer una imagen del creativo. ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function imageDataUrl(input: {
  url: string;
  origin: string;
  width: number;
  height: number;
  fit: "cover" | "contain";
  requireAlpha?: boolean;
}) {
  const buffer = await fetchImageBuffer(input.url, input.origin);
  const metadata = await sharp(buffer).metadata();
  if (input.requireAlpha && !metadata.hasAlpha) {
    throw new CutoutRequiredError();
  }

  const png = await sharp(buffer)
    .resize({
      width: input.width,
      height: input.height,
      fit: input.fit,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  return `data:image/png;base64,${png.toString("base64")}`;
}

async function localLogoDataUrl() {
  const buffer = await readFile(path.join(process.cwd(), "public", "cometa-g-logo-cuadrado.png"));
  const png = await sharp(buffer)
    .resize({ width: 180, height: 180, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return `data:image/png;base64,${png.toString("base64")}`;
}

function normalizeCreativeType(value: unknown): CreativeType {
  if (value === "preventa" || value === "oferta" || value === "nuevo") return value;
  return "nuevo";
}

function errorResponse(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ error: message, ...extra }, { status });
}

function titleFontSize(productName: string, isCampaign: boolean) {
  const length = productName.length;
  if (isCampaign) {
    if (length > 34) return 58;
    if (length > 24) return 66;
    return 76;
  }

  if (length > 32) return 72;
  if (length > 24) return 82;
  return 92;
}

function productPlacement(kind: CreativeCategoryKind) {
  if (kind === "gpu") return { left: 84, top: 500, width: 900, height: 520, baseLeft: 148, baseTop: 960, baseWidth: 760 };
  if (kind === "cpu") return { left: 230, top: 450, width: 620, height: 650, baseLeft: 250, baseTop: 1010, baseWidth: 580 };
  if (kind === "gabinete") return { left: 360, top: 300, width: 560, height: 850, baseLeft: 340, baseTop: 1080, baseWidth: 620 };
  if (kind === "periferico") return { left: 190, top: 500, width: 720, height: 540, baseLeft: 220, baseTop: 1010, baseWidth: 640 };
  if (kind === "notebook-monitor") return { left: 130, top: 480, width: 820, height: 560, baseLeft: 190, baseTop: 1015, baseWidth: 700 };
  return { left: 120, top: 500, width: 840, height: 570, baseLeft: 170, baseTop: 1010, baseWidth: 740 };
}

function categoryAtmosphere(kind: CreativeCategoryKind) {
  if (kind === "cooling") {
    return {
      halo: "radial-gradient(circle at 58% 60%, rgba(0,224,255,0.30), rgba(119,77,255,0.17) 34%, rgba(0,0,0,0) 68%)",
      grid: "linear-gradient(115deg, rgba(0,224,255,0.10), rgba(255,69,189,0.05), rgba(0,0,0,0))"
    };
  }
  if (kind === "gpu") {
    return {
      halo: "radial-gradient(circle at 56% 65%, rgba(255,69,189,0.26), rgba(122,77,255,0.22) 32%, rgba(0,0,0,0) 70%)",
      grid: "linear-gradient(100deg, rgba(229,38,78,0.10), rgba(0,224,255,0.08), rgba(0,0,0,0))"
    };
  }
  if (kind === "cpu") {
    return {
      halo: "radial-gradient(circle at 50% 58%, rgba(0,224,255,0.22), rgba(255,69,189,0.13) 38%, rgba(0,0,0,0) 70%)",
      grid: "linear-gradient(145deg, rgba(0,224,255,0.09), rgba(0,0,0,0) 55%)"
    };
  }
  return {
    halo: "radial-gradient(circle at 55% 62%, rgba(255,69,189,0.22), rgba(0,224,255,0.11) 36%, rgba(0,0,0,0) 72%)",
    grid: "linear-gradient(120deg, rgba(255,69,189,0.08), rgba(122,77,255,0.08), rgba(0,0,0,0))"
  };
}

function campaignTopLabel(type: CreativeType) {
  if (type === "nuevo") return "NUEVO INGRESO";
  if (type === "preventa") return "RESERVA ANTICIPADA";
  return "STOCK DESTACADO";
}

export async function POST(request: Request) {
  try {
    verifyAdminSecret(request);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Clave admin invalida.", 401);
  }

  try {
    const body = (await request.json()) as {
      product?: CreativeProductInput;
      creativeType?: CreativeType;
      backgroundId?: string;
    };

    const creative = buildCreativeData({
      product: body.product || {},
      creativeType: normalizeCreativeType(body.creativeType),
      backgroundId: body.backgroundId
    });

    if (!creative.productCutoutUrl) {
      return errorResponse(CUTOUT_ERROR, 422, { needsCutout: true });
    }

    const origin = new URL(request.url).origin;
    const [backgroundUrl, productCutoutUrl, logoUrl] = await Promise.all([
      imageDataUrl({
        url: creative.backgroundUrl,
        origin,
        width: WIDTH,
        height: HEIGHT,
        fit: "cover"
      }),
      imageDataUrl({
        url: creative.productCutoutUrl,
        origin,
        width: 980,
        height: 980,
        fit: "contain",
        requireAlpha: true
      }),
      localLogoDataUrl()
    ]);

    const isCampaign = Boolean(creative.dominantLabel);
    const titleSize = titleFontSize(creative.productName, isCampaign);
    const placement = productPlacement(creative.categoryKind);
    const atmosphere = categoryAtmosphere(creative.categoryKind);

    return new ImageResponse(
      (
        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            backgroundColor: "#050509",
            color: "#ffffff",
            fontFamily: "Arial, Helvetica, sans-serif"
          }}
        >
          <img
            src={backgroundUrl}
            alt=""
            width={WIDTH}
            height={HEIGHT}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(5,5,9,0.88) 0%, rgba(5,5,9,0.40) 42%, rgba(5,5,9,0.90) 100%)"
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: atmosphere.grid
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 350,
              height: 780,
              background: atmosphere.halo
            }}
          />

          <div
            style={{
              position: "absolute",
              left: placement.baseLeft,
              top: placement.baseTop,
              width: placement.baseWidth,
              height: 52,
              borderRadius: "50%",
              background: "radial-gradient(ellipse at center, rgba(0,224,255,0.30), rgba(255,69,189,0.16) 38%, rgba(0,0,0,0) 72%)"
            }}
          />
          <img
            src={productCutoutUrl}
            alt=""
            width={980}
            height={980}
            style={{
              position: "absolute",
              left: placement.left,
              top: placement.top,
              width: placement.width,
              height: placement.height,
              objectFit: "contain",
              filter: "drop-shadow(0 46px 62px rgba(0,0,0,0.72)) drop-shadow(0 0 34px rgba(0,224,255,0.22))"
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 76,
              top: 78,
              display: "flex",
              alignItems: "center",
              gap: 18
            }}
          >
            <img src={logoUrl} alt="" width={86} height={86} style={{ width: 86, height: 86, objectFit: "contain" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, lineHeight: 1, fontWeight: 900, letterSpacing: -0.8 }}>{creative.brandLabel}</div>
              <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: "#b8bbc8" }}>Computacion Gamer</div>
            </div>
          </div>

          {creative.dominantLabel && (
            <div
              style={{
                position: "absolute",
                left: 74,
                top: creative.type === "preventa" ? 178 : 190,
                fontSize: creative.type === "preventa" ? 122 : 116,
                lineHeight: 0.86,
                fontWeight: 900,
                letterSpacing: -2.8,
                color: "#ffffff",
                textShadow: "0 0 36px rgba(255,69,189,0.42)"
              }}
            >
              {creative.dominantLabel}
            </div>
          )}

          <div
            style={{
              position: "absolute",
              left: 76,
              top: creative.dominantLabel ? 300 : 205,
              width: 730,
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div
              style={{
                display: "flex",
                marginBottom: 22,
                fontSize: 22,
                lineHeight: 1,
                fontWeight: 900,
                letterSpacing: 6,
                color: "#ff45bd"
              }}
            >
              {campaignTopLabel(creative.type)} / {creative.categoryLabel}
            </div>
            <div
              style={{
                display: "flex",
                maxWidth: 720,
                fontSize: titleSize,
                lineHeight: 0.88,
                fontWeight: 900,
                letterSpacing: -2.4,
                textTransform: "uppercase"
              }}
            >
              {creative.productName}
            </div>
          </div>

          {creative.attributes.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: 76,
                bottom: 174,
                display: "flex",
                gap: 12
              }}
            >
              {creative.attributes.map((attribute) => (
                <div
                  key={attribute}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 118,
                    height: 52,
                    padding: "0 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,69,189,0.42)",
                    background: "rgba(11,12,18,0.78)",
                    color: "#ffffff",
                    fontSize: 22,
                    fontWeight: 900,
                    letterSpacing: 0.5
                  }}
                >
                  {attribute}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              position: "absolute",
              left: 76,
              bottom: 78,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 172,
              height: 54,
              borderRadius: 14,
              background: "rgba(11,12,18,0.78)",
              border: "1px solid rgba(255,69,189,0.55)",
              color: "#ff45bd",
              fontSize: 22,
              fontWeight: 900
            }}
          >
            {creative.ctaLabel}
          </div>

          <div
            style={{
              position: "absolute",
              right: 64,
              bottom: 78,
              display: "flex",
              fontSize: 18,
              color: "#cfd2dc",
              letterSpacing: 3,
              fontWeight: 800
            }}
          >
            COMETAG.STORE
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `inline; filename="${creative.filename}"`,
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    if (error instanceof CutoutRequiredError) {
      return errorResponse(CUTOUT_ERROR, 422, { needsCutout: true });
    }
    return errorResponse(error instanceof Error ? error.message : "No se pudo generar el creativo.");
  }
}
