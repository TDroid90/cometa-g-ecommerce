export type CreativeType = "nuevo" | "preventa" | "oferta";

export type CreativeBackgroundGroup =
  | "procesadores"
  | "placas-video"
  | "notebooks-monitores"
  | "perifericos"
  | "gabinetes"
  | "cooling"
  | "ofertas"
  | "preventa"
  | "arma-tu-pc";

export type CreativeBackground = {
  id: string;
  label: string;
  group: CreativeBackgroundGroup;
  fileId: string;
  url: string;
};

function driveImage(fileId: string) {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

export const CREATIVE_BACKGROUNDS: CreativeBackground[] = [
  { id: "procesadores-1", label: "Procesadores (1)", group: "procesadores", fileId: "1xRse2FF81cVn3DvLuE3DSpIWFpZAXt7R", url: driveImage("1xRse2FF81cVn3DvLuE3DSpIWFpZAXt7R") },
  { id: "procesadores-2", label: "Procesadores (2)", group: "procesadores", fileId: "13Jpjpp_l9-fPHg7IhhIRJ0FeMDq2_5Xz", url: driveImage("13Jpjpp_l9-fPHg7IhhIRJ0FeMDq2_5Xz") },
  { id: "placas-video-1", label: "Placas de video (1)", group: "placas-video", fileId: "1zT3qZax5lZiWk6Rq8s4L9SoSyqCtGAdI", url: driveImage("1zT3qZax5lZiWk6Rq8s4L9SoSyqCtGAdI") },
  { id: "placas-video-2", label: "Placas de video (2)", group: "placas-video", fileId: "1OOw36ug8mvxy2hEtLSKImAFiBHns_nP0", url: driveImage("1OOw36ug8mvxy2hEtLSKImAFiBHns_nP0") },
  { id: "notebooks-monitores-1", label: "Notebooks-monitores (1)", group: "notebooks-monitores", fileId: "19KnbeFTd-byJutbZDW2WVFSwXeR57Ajl", url: driveImage("19KnbeFTd-byJutbZDW2WVFSwXeR57Ajl") },
  { id: "notebooks-monitores-2", label: "Notebooks-monitores (2)", group: "notebooks-monitores", fileId: "1SoN3zrBuG3AOImFxDvJUjfT7kTuWxRt7", url: driveImage("1SoN3zrBuG3AOImFxDvJUjfT7kTuWxRt7") },
  { id: "perifericos-1", label: "Perifericos (1)", group: "perifericos", fileId: "1JFyhAlhdVfpRlqsROg4D40w8AgblYqfU", url: driveImage("1JFyhAlhdVfpRlqsROg4D40w8AgblYqfU") },
  { id: "perifericos-2", label: "Perifericos (2)", group: "perifericos", fileId: "19qm1UdCKVTEq0OWC2HpvuHYovAzYX1O8", url: driveImage("19qm1UdCKVTEq0OWC2HpvuHYovAzYX1O8") },
  { id: "gabinetes-1", label: "Gabinetes (1)", group: "gabinetes", fileId: "1WMWfMMO5OXwZJ9yCHhMcXlHKio7DXuwj", url: driveImage("1WMWfMMO5OXwZJ9yCHhMcXlHKio7DXuwj") },
  { id: "gabinetes-2", label: "Gabinetes (2)", group: "gabinetes", fileId: "1f5rcvjeP2skEOHJ34FktsuBnWeDHx8xM", url: driveImage("1f5rcvjeP2skEOHJ34FktsuBnWeDHx8xM") },
  { id: "cooling-1", label: "Cooling (1)", group: "cooling", fileId: "1z4T35MW1zZYfVao_HeKFdiqLEvIoI5A_", url: driveImage("1z4T35MW1zZYfVao_HeKFdiqLEvIoI5A_") },
  { id: "cooling-2", label: "Cooling (2)", group: "cooling", fileId: "11kTYMENXm4T1t5YJhUbNb7F2GDz73O_x", url: driveImage("11kTYMENXm4T1t5YJhUbNb7F2GDz73O_x") },
  { id: "ofertas-1", label: "Ofertas (1)", group: "ofertas", fileId: "14CpBTEDifvSxCWrpw1DQHOPD3QmmVOAx", url: driveImage("14CpBTEDifvSxCWrpw1DQHOPD3QmmVOAx") },
  { id: "ofertas-2", label: "Ofertas (2)", group: "ofertas", fileId: "1zOpGWGCA6zeg9hqwrEfHJNqDadpivDsd", url: driveImage("1zOpGWGCA6zeg9hqwrEfHJNqDadpivDsd") },
  { id: "preventa-1", label: "Preventa (1)", group: "preventa", fileId: "153RgSwrUvsOoTmiPrLU0OWMDH4JP1tG9", url: driveImage("153RgSwrUvsOoTmiPrLU0OWMDH4JP1tG9") },
  { id: "preventa-2", label: "Preventa (2)", group: "preventa", fileId: "1R31Pf3tQzC5Ygy3Sk6Q9kf3GOumvKYip", url: driveImage("1R31Pf3tQzC5Ygy3Sk6Q9kf3GOumvKYip") },
  { id: "arma-tu-pc-1", label: "Arma tu PC (1)", group: "arma-tu-pc", fileId: "1Fgs7aTzDB_Ey-EEIuhnM6Db0WKyo7l8F", url: driveImage("1Fgs7aTzDB_Ey-EEIuhnM6Db0WKyo7l8F") },
  { id: "arma-tu-pc-2", label: "Arma tu PC (2)", group: "arma-tu-pc", fileId: "1ZNgWijiSWrwqZGLm89A1NQH6knW5WEJ8", url: driveImage("1ZNgWijiSWrwqZGLm89A1NQH6knW5WEJ8") }
];

function normalizeText(value?: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function findCreativeBackground(backgroundId?: string) {
  return CREATIVE_BACKGROUNDS.find((background) => background.id === backgroundId);
}

export function selectCreativeBackground(input: {
  creativeType: CreativeType;
  categoria?: string;
  subcategoria?: string;
  backgroundId?: string;
}) {
  const manual = findCreativeBackground(input.backgroundId);
  if (manual) return manual;

  if (input.creativeType === "preventa") return firstByGroup("preventa");
  if (input.creativeType === "oferta") return firstByGroup("ofertas");

  const taxonomy = normalizeText(`${input.categoria || ""} ${input.subcategoria || ""}`);

  if (taxonomy.includes("procesador") || taxonomy.includes("microprocesador")) return firstByGroup("procesadores");
  if (taxonomy.includes("placa de video") || taxonomy.includes("vga")) return firstByGroup("placas-video");
  if (taxonomy.includes("notebook") || taxonomy.includes("monitor")) return firstByGroup("notebooks-monitores");
  if (taxonomy.includes("periferico") || taxonomy.includes("accesorio")) return firstByGroup("perifericos");
  if (taxonomy.includes("gabinete")) return firstByGroup("gabinetes");
  if (taxonomy.includes("cooler") || taxonomy.includes("refrigeracion") || taxonomy.includes("cooling")) return firstByGroup("cooling");

  return firstByGroup("perifericos");
}

function firstByGroup(group: CreativeBackgroundGroup) {
  return CREATIVE_BACKGROUNDS.find((background) => background.group === group) || CREATIVE_BACKGROUNDS[0];
}
