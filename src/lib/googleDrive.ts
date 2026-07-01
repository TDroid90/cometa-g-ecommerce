import { createSign } from "crypto";

type ServiceAccountConfig = {
  clientEmail: string;
  privateKey: string;
};

let cachedDriveToken: { accessToken: string; expiresAt: number } | null = null;

function clean(value?: string) {
  return (value || "").trim();
}

function base64Url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getServiceAccountConfig(): ServiceAccountConfig | null {
  const rawJson = clean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (rawJson) {
    const parsed = JSON.parse(rawJson) as { client_email?: string; private_key?: string };
    if (parsed.client_email && parsed.private_key) {
      return {
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, "\n")
      };
    }
  }

  const clientEmail = clean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const privateKey = clean(process.env.GOOGLE_PRIVATE_KEY).replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  return { clientEmail, privateKey };
}

async function getDriveAccessToken() {
  const serviceAccount = getServiceAccountConfig();
  if (!serviceAccount) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cachedDriveToken && cachedDriveToken.expiresAt - 60 > now) {
    return cachedDriveToken.accessToken;
  }

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64Url(
    JSON.stringify({
      iss: serviceAccount.clientEmail,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    })
  );
  const unsignedJwt = `${header}.${claimSet}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  signer.end();
  const signature = signer
    .sign(serviceAccount.privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedJwt}.${signature}`
    })
  });

  if (!response.ok) {
    throw new Error("No se pudo autenticar Google Drive.");
  }

  const token = (await response.json()) as { access_token: string; expires_in: number };
  cachedDriveToken = {
    accessToken: token.access_token,
    expiresAt: now + token.expires_in
  };
  return cachedDriveToken.accessToken;
}

async function findFolder(parentId: string, name: string, accessToken: string) {
  const query = [
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    `'${parentId}' in parents`,
    `name = '${name.replace(/'/g, "\\'")}'`
  ].join(" and ");

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) return null;
  const data = (await response.json()) as { files?: Array<{ id: string; name: string }> };
  return data.files?.[0]?.id || null;
}

async function createFolder(parentId: string, name: string, accessToken: string) {
  const existing = await findFolder(parentId, name, accessToken);
  if (existing) return existing;

  const response = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId]
    })
  });

  if (!response.ok) {
    throw new Error(`No se pudo crear carpeta ${name} en Drive.`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

function datePartsInBuenosAires() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  return {
    month: date.slice(0, 7),
    day: date
  };
}

export async function uploadPurchaseReceipt(input: {
  orderId: string;
  paymentId?: string;
  payload: unknown;
}) {
  const rootFolderId = clean(process.env.GOOGLE_DRIVE_COMPRAS_FOLDER_ID);
  if (!rootFolderId) return null;

  const accessToken = await getDriveAccessToken();
  if (!accessToken) return null;

  const { month, day } = datePartsInBuenosAires();
  const monthFolderId = await createFolder(rootFolderId, month, accessToken);
  const dayFolderId = await createFolder(monthFolderId, day, accessToken);
  const filename = `${input.orderId}-${input.paymentId || "payway"}.json`;
  const content = JSON.stringify(
    {
      order_id: input.orderId,
      payment_id: input.paymentId || "",
      created_at: new Date().toISOString(),
      payload: input.payload
    },
    null,
    2
  );
  const boundary = `cometag_${Date.now()}`;
  const metadata = {
    name: filename,
    parents: [dayFolderId],
    mimeType: "application/json"
  };
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    content,
    `--${boundary}--`
  ].join("\r\n");

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });

  if (!response.ok) {
    throw new Error("No se pudo subir el comprobante a Drive.");
  }

  return (await response.json()) as { id: string; name: string };
}

async function setPublicReadPermission(fileId: string, accessToken: string) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone"
    })
  });
}

function safeFileName(value: string) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "producto";
}

export async function uploadProductImageToDrive(input: {
  productId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const rootFolderId =
    clean(process.env.GOOGLE_DRIVE_PRODUCT_IMAGES_FOLDER_ID) ||
    clean(process.env.GOOGLE_DRIVE_COMETA_FOLDER_ID) ||
    clean(process.env.GOOGLE_DRIVE_COMPRAS_FOLDER_ID);
  if (!rootFolderId) {
    throw new Error("Blob esta suspendido y falta configurar GOOGLE_DRIVE_PRODUCT_IMAGES_FOLDER_ID.");
  }

  const accessToken = await getDriveAccessToken();
  if (!accessToken) {
    throw new Error("No se pudo autenticar Google Drive.");
  }

  const productFolderId = await createFolder(rootFolderId, "imagenes-productos", accessToken);
  const itemFolderId = await createFolder(productFolderId, safeFileName(input.productId), accessToken);
  const boundary = `cometag_product_${Date.now()}`;
  const metadata = {
    name: safeFileName(input.filename),
    parents: [itemFolderId],
    mimeType: input.mimeType
  };
  const body = Buffer.concat([
    Buffer.from(
      [
        `--${boundary}`,
        "Content-Type: application/json; charset=UTF-8",
        "",
        JSON.stringify(metadata),
        `--${boundary}`,
        `Content-Type: ${input.mimeType}`,
        "",
        "",
      ].join("\r\n")
    ),
    input.buffer,
    Buffer.from(`\r\n--${boundary}--`)
  ]);

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`No se pudo subir la imagen a Drive. ${response.status} ${detail}`.trim());
  }

  const file = (await response.json()) as { id: string; name: string };
  await setPublicReadPermission(file.id, accessToken);

  return {
    id: file.id,
    name: file.name,
    url: `https://drive.google.com/uc?export=view&id=${file.id}`
  };
}
