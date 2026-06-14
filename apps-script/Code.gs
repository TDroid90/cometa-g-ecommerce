const COMETA_ADMIN_CONFIG = {
  apiUrlProperty: "COMETA_ADMIN_API_URL",
  secretProperty: "COMETA_ADMIN_SECRET"
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("COMETA G")
    .addItem("Crear producto", "showProductSidebar")
    .addSeparator()
    .addItem("Configurar API", "showConfigPrompt")
    .addToUi();
}

function showProductSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("Crear producto")
    .setWidth(430);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showConfigPrompt() {
  const ui = SpreadsheetApp.getUi();
  const apiUrl = ui.prompt(
    "URL API",
    "Pegá la URL completa. Ejemplo: https://tu-dominio.com/api/admin/productos",
    ui.ButtonSet.OK_CANCEL
  );
  if (apiUrl.getSelectedButton() !== ui.Button.OK) return;

  const secret = ui.prompt(
    "Clave admin",
    "Pegá el mismo valor que pusiste en Vercel como ADMIN_UPLOAD_SECRET",
    ui.ButtonSet.OK_CANCEL
  );
  if (secret.getSelectedButton() !== ui.Button.OK) return;

  PropertiesService.getDocumentProperties().setProperties({
    [COMETA_ADMIN_CONFIG.apiUrlProperty]: apiUrl.getResponseText().trim(),
    [COMETA_ADMIN_CONFIG.secretProperty]: secret.getResponseText().trim()
  });

  ui.alert("Configuración guardada.");
}

function getAdminConfig() {
  const props = PropertiesService.getDocumentProperties();
  return {
    apiUrl: props.getProperty(COMETA_ADMIN_CONFIG.apiUrlProperty) || "",
    hasSecret: Boolean(props.getProperty(COMETA_ADMIN_CONFIG.secretProperty))
  };
}

function createProductFromSidebar(payload) {
  const props = PropertiesService.getDocumentProperties();
  const apiUrl = props.getProperty(COMETA_ADMIN_CONFIG.apiUrlProperty);
  const secret = props.getProperty(COMETA_ADMIN_CONFIG.secretProperty);

  if (!apiUrl || !secret) {
    throw new Error("Falta configurar la API. Usá COMETA G > Configurar API.");
  }

  const boundary = `----CometaG${Date.now()}`;
  const chunks = [];
  const pushText = (text) => {
    pushBytes(Utilities.newBlob(text).getBytes());
  };
  const pushBytes = (bytes) => {
    bytes.forEach((byte) => chunks.push(byte));
  };

  Object.keys(payload.fields).forEach((key) => {
    pushText(`--${boundary}\r\n`);
    pushText(`Content-Disposition: form-data; name="${key}"\r\n\r\n`);
    pushText(`${payload.fields[key] || ""}\r\n`);
  });

  (payload.images || []).forEach((image) => {
    const bytes = Utilities.base64Decode(image.base64);
    pushText(`--${boundary}\r\n`);
    pushText(`Content-Disposition: form-data; name="images"; filename="${image.name}"\r\n`);
    pushText(`Content-Type: ${image.type || "image/webp"}\r\n\r\n`);
    pushBytes(bytes);
    pushText("\r\n");
  });

  pushText(`--${boundary}--\r\n`);

  const response = UrlFetchApp.fetch(apiUrl, {
    method: "post",
    muteHttpExceptions: true,
    headers: {
      "x-admin-secret": secret,
      "Content-Type": `multipart/form-data; boundary=${boundary}`
    },
    payload: chunks
  });

  const text = response.getContentText();
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error(`API ${status}: ${text}`);
  }

  return JSON.parse(text);
}
