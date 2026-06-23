import csv
import io
import json
import os
import re
import time
from html import unescape
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account


ROOT = Path(__file__).resolve().parents[3]
REPO_ROOT = Path(__file__).resolve().parents[1]
SERVICE_ACCOUNT_FILE = ROOT / "cometag-444803-c2bdba83753e.json"
PRODUCTS_SPREADSHEET_ID = os.environ.get("GOOGLE_SHEETS_PRODUCTOS_ID", "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY")
INVID_AUTH_URL = "https://www.invidcomputers.com/api/v1/auth.php"
INVID_ARTICLE_URL = "https://www.invidcomputers.com/api/v1/articulo.php"

ELIT_CSV = ROOT / "elit-tiendanube-196-515.csv"
NB_CSV_FALLBACK = ROOT / "nb-price-list.csv"

OUTPUT_COLUMNS = [
    "proveedor",
    "proveedor_codigo",
    "sku",
    "nombre",
    "categoria",
    "subcategoria",
    "marca",
    "precio_usd",
    "precio_ars",
    "precio_oferta_ars",
    "moneda_original",
    "stock",
    "stock_status",
    "garantia",
    "imagen_principal",
    "imagenes_extra",
    "atributos",
    "peso",
    "alto",
    "ancho",
    "largo",
    "visible",
    "fecha_actualizacion",
    "oferta",
]

CONSOLIDATED_COLUMNS = [
    "id",
    "proveedor",
    "proveedor_codigo",
    "sku",
    "nombre",
    "categoria",
    "subcategoria",
    "marca",
    "precio_usd",
    "precio_ars",
    "precio_oferta_ars",
    "moneda_original",
    "stock",
    "stock_status",
    "garantia",
    "imagen_principal",
    "imagenes_extra",
    "atributos",
    "peso",
    "alto",
    "ancho",
    "largo",
    "visible",
    "fecha_actualizacion",
    "oferta",
]

INTERNAL_BUY_COLUMNS = [
    "id_publico",
    "sku",
    "nombre",
    "categoria",
    "subcategoria",
    "marca",
    "proveedor_web",
    "precio_web_usd",
    "precio_web_ars",
    "proveedor_recomendado",
    "proveedor_codigo_recomendado",
    "precio_recomendado_usd",
    "precio_recomendado_ars",
    "ahorro_usd",
    "ahorro_pct",
    "accion",
]

ECOMMERCE_PRODUCT_COLUMNS = [
    "id",
    "sku",
    "nombre",
    "slug",
    "descripcion_corta",
    "descripcion_larga",
    "precio_usd",
    "precio",
    "precio_oferta_usd",
    "precio_oferta",
    "stock",
    "stock_status",
    "categoria",
    "subcategoria",
    "marca",
    "tags",
    "imagen_principal",
    "imagenes_extra",
    "atributos",
    "variables",
    "color",
    "garantia",
    "destacado",
    "nuevo",
    "oferta",
    "preventa",
    "fecha_lanzamiento",
    "visible",
    "orden",
]

REJECT_COLUMNS = [
    "proveedor",
    "proveedor_codigo",
    "nombre",
    "categoria",
    "subcategoria",
    "marca",
    "motivo",
    "fecha_actualizacion",
]

EXCLUDED_PATTERNS = [
    (r"\boutlet\b|\bsuper ofertas?\b", "outlet"),
    (r"\bkit[s]?\s*y\s*bundle[s]?\b|\bbundle[s]?\b|\bcombo[s]?\b", "combos internos"),
    (r"\bcable[s]?\b", "cables"),
    (r"\bsmart\s*watch\b|\bsmartwatch\b|\breloj inteligente\b", "smartwatches"),
    (r"\bimpresor", "impresoras"),
    (r"\bplotter", "impresoras"),
    (r"\bscanner\b|\besc[áa]ner", "escaners"),
    (r"\btinta\b|\btintas\b|\btoner\b|\btoners\b|\bcartucho|\bcartuchos|\bcilindro|\bcintas?\b|\brollos?\b", "tintas/insumos impresion"),
    (r"\bresma\b|\bpapel\b|\bhojas?\b|\blapicera|\bboligrafo|\bbolígrafo", "insumos oficina"),
    (r"\btelevisor|\btelevisores|\btv\b", "televisores"),
    (r"\bcelular|\bcelulares|\bsmartphone|\btelefon", "celulares/telefonia"),
    (r"\bsistema operativo|\blicencia|\blicencias|\bsoftware\b|\bwindows\b|\boffice\b", "software/licencias"),
    (r"\brobot|\brobotica", "robotica"),
    (r"\bconsola|\bconsolas|\bplaystation|\bxbox\b|\bnintendo\b", "consolas"),
    (r"\bjuego\b|\bjuegos\b|\bgames\b|\bvideojuego", "juegos"),
    (r"contadora.*billete|clasificadora.*billete|billetes", "contadoras de billetes"),
    (r"\bdisketera|\bdisquetera|\bfloppy", "disketeras/floppy"),
    (r"\btablet|\btablets\b", "tablets"),
    (r"\bsintonizadora|\bcodificador|\bcodificadores", "sintonizadoras/codificadores"),
    (r"\btrituradora|\btrituradoras", "trituradoras"),
    (r"\bcandado|\bcandados", "candados"),
    (r"\brepuesto|\brepuestos", "repuestos"),
]

BRAND_ALIASES = {
    "WD": "WESTERN DIGITAL",
    "W.D.": "WESTERN DIGITAL",
    "WESTERN DIGITAL": "WESTERN DIGITAL",
    "HP INC.": "HP",
    "HEWLETT PACKARD": "HP",
    "KINGSTON TECHNOLOGY": "KINGSTON",
    "LOGITECH G": "LOGITECH",
    "MERCUSYS": "MERCUSYS",
}

CATEGORY_ALIASES = {
    "ACCESORIOS": ("Accesorios", "Varios"),
    "ALMACENAMIENTO": ("Almacenamiento", ""),
    "HARDWARE": ("Hardware", ""),
    "AUDIO": ("Audio", ""),
    "COMPUTADORAS": ("Computadoras", ""),
    "IMAGEN": ("Monitores", ""),
    "PERIFERICOS": ("Perifericos", ""),
    "PERIFÉRICOS": ("Perifericos", ""),
    "MUEBLES": ("Muebles", ""),
    "UNIDAD DE ENERGIA": ("Unidad de Energia", ""),
    "UNIDAD DE ENERGÍA": ("Unidad de Energia", ""),
    "SIMULADORES": ("Perifericos", "Simuladores"),
    "DISCOS SSD": ("Almacenamiento", "Discos Internos SSD"),
    "DISCOS HDD": ("Almacenamiento", "Discos Internos"),
    "DISCOS EXTERNOS": ("Almacenamiento", "Discos Externos"),
    "MEMORIAS": ("Memorias", "Memorias PC"),
    "MEMORIAS USB": ("Almacenamiento", "Memorias Flash"),
    "COOLERS": ("Hardware", "Coolers"),
    "FUENTES": ("Hardware", "Fuentes"),
    "GABINETE": ("Hardware", "Gabinetes"),
    "GABINETE GAMER": ("Hardware", "Gabinetes"),
    "PLACA DE VIDEO": ("Hardware", "Placas de Video"),
    "PROCESADORES": ("Hardware", "Procesadores"),
    "MOTHER ASROCK": ("Hardware", "Motherboards"),
    "MOTHER ASUS": ("Hardware", "Motherboards"),
    "MOTHER GIGABYTE": ("Hardware", "Motherboards"),
    "NOTEBOOKS Y PORTATILES": ("Computadoras", "Notebooks"),
    "PC DE ESCRITORIO AMD": ("Computadoras", "PC de Escritorio"),
    "PC DE ESCRITORIO INTEL": ("Computadoras", "PC de Escritorio"),
    "MONITORES": ("Monitores", "Monitores"),
    "MOUSES": ("Perifericos", "Mouses"),
    "MOUSEPADS": ("Perifericos", "Mouse Pads"),
    "TECLADOS": ("Perifericos", "Teclados"),
    "JOYSTICKS": ("Perifericos", "Joysticks"),
    "AURICULARES": ("Audio", "Auriculares"),
    "MICROFONOS": ("Audio", "Microfonos"),
    "PARLANTES": ("Audio", "Parlantes"),
    "CONECTIVIDAD": ("Conectividad", ""),
    "ACCESORIOS": ("Accesorios", ""),
    "FUNDAS - MOCHILAS": ("Estuches", "Mochilas"),
    "SILLAS GAMER - ESCRITORIOS GAMERS": ("Muebles", "Sillas y Escritorios"),
    "UPS Y ESTABILIZADORES": ("Unidad de Energia", "UPS y Estabilizadores"),
    "WEBCAMS": ("Perifericos", "Camaras Web"),
    "MOUSE": ("Perifericos", "Mouses"),
    "PROYECTORES": ("Monitores", "Proyectores"),
    "SOPORTES": ("Soportes", "Soportes"),
    "HOGAR": ("Casa Inteligente", "Hogar"),
    "CASA INTELIGENTE": ("Casa Inteligente", "Hogar"),
    "ELECTRODOMESTICOS": ("Electro", "Electrodomesticos"),
    "ELECTRODOMÃ‰STICOS": ("Electro", "Electrodomesticos"),
    "CAMARAS IP": ("Seguridad", "Camaras IP"),
    "KITS Y BUNDLES": ("Combos", "Kits y Bundles"),
    "OUTLET": ("Outlet", "Ofertas"),
    "SUPER OFERTAS": ("Outlet", "Ofertas"),
}

MENU_CATEGORY_ORDER = {
    "Hardware": 10,
    "Almacenamiento": 20,
    "Memorias": 30,
    "Computadoras": 40,
    "Monitores": 50,
    "Perifericos": 60,
    "Audio": 70,
    "Conectividad": 80,
    "Unidad de Energia": 90,
    "Electro": 100,
    "Estuches": 110,
    "Soportes": 120,
    "Seguridad": 130,
    "Casa Inteligente": 140,
    "Muebles": 150,
    "Accesorios": 160,
}

SUBCATEGORY_ALIASES = {
    "DISCOS INTERNOS SSD": "Discos Internos SSD",
    "DISCOS INTERNOS SSD ": "Discos Internos SSD",
    "DISCOS INTERNOS SSDD": "Discos Internos SSD",
    "DISCOS INTERNOS SSD ": "Discos Internos SSD",
    "DISCOS INTERNOS SSD": "Discos Internos SSD",
    "DISCOS INTERNOS SSD": "Discos Internos SSD",
    "DISCOS EXTERNOS SSD": "Discos Externos SSD",
    "PLACAS DE VIDEO": "Placas de Video",
    "PLACAS DE RED": "Placas de Red",
    "MEMORIAS PC": "Memorias PC",
    "MINI PC": "Mini PC",
    "PC DE ESCRITORIO": "PC de Escritorio",
    "NOTEBOOKS CONSUMO": "Notebooks Consumo",
    "NOTEBOOKS CORPORATIVO": "Notebooks Corporativo",
    "CAMARAS WEB": "Camaras Web",
    "CÁMARAS WEB": "Camaras Web",
    "CAMARAS IP": "Camaras IP",
    "CÁMARAS IP": "Camaras IP",
    "CAMARAS WIFI": "Camaras WiFi",
    "CÁMARAS WIFI": "Camaras WiFi",
    "MICROFONOS": "Microfonos",
    "MICRÓFONOS": "Microfonos",
    "PERIFERICOS": "Perifericos",
    "PERIFÉRICOS": "Perifericos",
    "UNIDAD DE ENERGIA": "Unidad de Energia",
    "UNIDAD DE ENERGÍA": "Unidad de Energia",
    "KITS Y BUNDLES": "Kits y Bundles",
    "SILLAS Y ESCRITORIOS": "Sillas y Escritorios",
    "SILLAS GAMER": "Sillas Gamer",
    "ESCRITORIOS": "Escritorios",
    "ELECTRODOMESTICOS": "Electrodomesticos",
    "ELECTRODOMÃ‰STICOS": "Electrodomesticos",
    "COCINA": "Cocina",
    "LIMPIEZA": "Limpieza",
    "TEMPERATURA": "Temperatura",
    "UPS": "UPS",
    "UPS Y ESTABILIZADORES": "UPS y Estabilizadores",
    "ESTABILIZADORES": "UPS y Estabilizadores",
    "PROTECTORES": "UPS y Estabilizadores",
    "BATERIAS": "UPS y Estabilizadores",
    "CARGADORES PORTATILES": "UPS y Estabilizadores",
    "CARGADORES PORTÁTILES": "UPS y Estabilizadores",
    "MEMORIAS NOTEBOOK": "Memorias Notebook",
    "NAS": "NAS",
    "MOUSE": "Mouses",
}

MENU_COLUMNS = [
    "categoria",
    "subcategoria",
    "cantidad_productos",
    "link",
    "orden",
    "visible",
    "markup_multiplicador",
]

MENU_SHEET = "MENU_CAT_MAR"
DEFAULT_USD_RATE = "1470"


def clean(value: Any) -> str:
    return str(value or "").strip()


def load_local_env() -> None:
    env_path = REPO_ROOT / ".env.local"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)


def normalize_text(value: Any) -> str:
    text = clean(value).lower()
    replacements = {
        "á": "a",
        "é": "e",
        "í": "i",
        "ó": "o",
        "ú": "u",
        "ñ": "n",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return re.sub(r"\s+", " ", text)


def should_reject(*values: str) -> str:
    haystack = normalize_text(" ".join(values))
    for pattern, reason in EXCLUDED_PATTERNS:
        if re.search(pattern, haystack, re.IGNORECASE):
            # Keep gamer controls, which are useful even if providers classify them near games.
            if reason in {"consolas", "juegos"} and re.search(r"joystick|gamepad|control|volante", haystack):
                continue
            if reason == "cables" and re.search(r"\bwiz\b|\bhue\b|\bphilips\b|\blightstrip\b|\bled smart\b|\bsmart led\b", haystack):
                continue
            if reason == "robotica" and re.search(r"\baspiradora\b|\blimpieza\b|\btrap\b", haystack):
                continue
            return reason
    return ""


def should_reject_normalized(category: str, subcategory: str, name: str, brand: str, extra: str = "") -> str:
    haystack = normalize_text(" ".join([category, subcategory, name, brand, extra]))
    if category in {"Combos", "Cables"}:
        return normalize_text(category)
    if re.search(r"\bcondici[oó]n\s+outlet\b|\bcondicion\s+outlet\b|\boutlet\b", haystack):
        return "outlet"
    if ("cables" in haystack or re.search(r"\bcable[s]?\b", haystack)) and not re.search(r"\bwiz\b|\bhue\b|\bphilips\b|\blightstrip\b|\bled smart\b|\bsmart led\b", haystack):
        return "cables"
    return ""


def is_offer_product(category: str, subcategory: str, name: str, extra: str = "") -> bool:
    haystack = normalize_text(" ".join([category, subcategory, name, extra]))
    if re.search(r"\boutlet\b|\bcondicion\s+outlet\b|\bcondici[oó]n\s+outlet\b", haystack):
        return False
    return bool(re.search(r"\bsuper oferta\b|\bsuper ofertas\b|\boferta\b", haystack))


def clean_offer_name(name: str) -> str:
    return re.sub(r"^\s*(outlet|super oferta|super ofertas)\s+", "", clean(name), flags=re.I).strip()


def recategorize_product(category: str, subcategory: str, name: str, brand: str) -> tuple[str, str]:
    haystack = normalize_text(" ".join([category, subcategory, name, brand]))
    name_text = normalize_text(name)
    if category == "Outlet":
        if re.search(r"\bmonitor\b", haystack):
            return "Monitores", "Monitores"
        if re.search(r"\bsilla\b|\bescritorio\b|\bestante\b", haystack):
            return "Muebles", "Escritorios" if re.search(r"\bescritorio\b|\bestante\b", haystack) else "Sillas Gamer"
        if re.search(r"\bfuente\b", haystack):
            return "Hardware", "Fuentes"
        if re.search(r"\bmother\b|\bmotherboard\b", haystack):
            return "Hardware", "Motherboards"
        if re.search(r"\bprocesador\b|\bath?lon\b|\bryzen\b|\bintel\b", haystack):
            return "Hardware", "Procesadores"
        if re.search(r"\bmemoria\b|\bddr\b|\bsodimm\b", haystack):
            return "Memorias", "Memorias Notebook" if re.search(r"\bsodimm\b|\bnotebook\b", haystack) else "Memorias PC"
        if re.search(r"\bdisco\b|\bhdd\b|\bssd\b", haystack):
            return "Almacenamiento", "Discos Internos SSD" if "ssd" in haystack else "Discos Internos"
        if re.search(r"\brouter\b|\bplaca usb\b|\bplaca de red\b|\bnetwork\b", haystack):
            return "Conectividad", "Routers" if "router" in haystack else "Placas de Red"
        if re.search(r"\bauricular\b|\bmicrofono\b|\bparlante\b", haystack):
            return "Audio", "Auriculares" if "auricular" in haystack else "Microfonos" if "microfono" in haystack else "Parlantes"
        if re.search(r"\bmouse\b|\bteclado\b|\bjoystick\b|\bkeycap\b", haystack):
            return "Perifericos", "Mouses" if "mouse" in haystack else "Teclados" if "teclado" in haystack or "keycap" in haystack else "Joysticks"
        if re.search(r"\bcafetera\b|\bcafe\b|\bhorno\b|\banafe\b|\bmicroondas\b|\bpava\b|\bfreidora\b|\blicuadora\b|\btostadora\b|\bbatidora\b|\bsandwichera\b", haystack):
            return "Electro", "Cocina"
        return "Accesorios", "Accesorios"
    if re.search(r"\bcafetera\b|\bcafe\b|\bhorno\b|\banafe\b|\bmicroondas\b|\bpava\b|\bfreidora\b|\blicuadora\b|\btostadora\b|\bbatidora\b|\bsandwichera\b", haystack):
        return "Electro", "Cocina"
    if re.search(r"\baspiradora\b|\blimpieza\b|\btrap\b", haystack):
        return "Electro", "Limpieza"
    if re.search(r"\bventilador\b|\bventiladores\b|\bcaloventor\b|\bcalefactor\b|\bestufa\b|\bclimatizador\b", haystack):
        return "Electro", "Temperatura"
    if category == "Electro" or re.search(r"\belectrodomestico\b|\belectrodomesticos\b", haystack):
        return "Electro", subcategory or "Electrodomesticos"
    if category == "Casa Inteligente" or re.search(r"\bdomotica\b|\bsmart home\b|\btapo\b|\bhue\b|\bwiz\b|\bphilips\b|\blampara\b|\blamparas\b|\bled smart\b|\bsmart led\b|\blightstrip\b", haystack):
        if re.search(r"\bhub\b|\bbridge\b|\bpuente\b", haystack):
            return "Casa Inteligente", "Hubs"
        if re.search(r"\bwiz\b|\bhue\b|\bphilips\b|\blampara\b|\blamparas\b|\bled\b|\blightstrip\b", haystack):
            return "Casa Inteligente", "Luces"
        return "Casa Inteligente", "Domotica"
    if category == "Muebles":
        if re.search(r"\bescritorio\b|\bescritorios\b|\bestante\b", name_text):
            return "Muebles", "Escritorios"
        if re.search(r"\bsilla\b|\bsillas\b", name_text):
            return "Muebles", "Sillas Gamer"
        return "Muebles", subcategory or "Escritorios"
    if category == "Accesorios" and not subcategory:
        return "Accesorios", "Accesorios"
    if category == "Soportes" and not subcategory:
        return "Soportes", "Soportes"
    if category == "Memorias" and re.search(r"\bsodimm\b|\bso\s*dimm\b|\bnotebook\b", haystack):
        return "Memorias", "Memorias Notebook"
    if "placas de red" in haystack or re.search(r"\bplaca[s]?\s+de\s+red\b", haystack):
        return "Conectividad", "Placas de Red"
    if category == "Unidad de Energia":
        return "Unidad de Energia", "UPS y Estabilizadores"
    if re.search(r"\bsoporte[s]?\b|\bmount\b|\bbase monitor\b|\bbrazo\b", haystack):
        if canonical_brand(brand) in {"TEROS", "RAZER", "INTELAID", "TRUST"} or "monitor" in haystack:
            return "Soportes", "Soportes"
    return category, subcategory


def price_to_number(value: Any) -> str:
    raw = clean(value).replace("$", "").replace("U$S", "").replace("USD", "").strip()
    if not raw:
        return ""
    if "," in raw and "." in raw:
        raw = raw.replace(".", "").replace(",", ".")
    elif "," in raw:
        raw = raw.replace(",", ".")
    elif raw.count(".") > 1 or re.search(r"\.\d{3}($|\D)", raw):
        raw = raw.replace(".", "")
    try:
        return str(round(float(raw), 2))
    except ValueError:
        return clean(value)


def parse_price(value: Any) -> float:
    try:
        return float(price_to_number(value) or "0")
    except ValueError:
        return 0


def has_enough_stock(row: list[str]) -> bool:
    stock = parse_price(row[11]) if len(row) > 11 else 0
    status = normalize_text(row[12] if len(row) > 12 else "")
    return stock > 1 and "sin stock" not in status


def reject_low_stock(catalog: list[list[str]], now: str) -> tuple[list[list[str]], list[list[str]]]:
    accepted: list[list[str]] = []
    rejected: list[list[str]] = []
    for row in catalog:
        if has_enough_stock(row):
            accepted.append(row)
        else:
            rejected.append([row[0], row[1], row[3], row[4], row[5], row[6], "stock <= 1", now])
    return accepted, rejected


def strip_html(value: Any) -> str:
    text = unescape(clean(value))
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</(p|tr|li|div|table)>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_attributes(value: Any, limit: int = 12) -> str:
    text = unescape(clean(value))
    if not text:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</(p|tr|li|div|table)>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    parts = re.split(r"[\r\n|;]+", text)

    pieces: list[str] = []
    seen: set[str] = set()
    for part in parts:
        part = re.sub(r"\s+", " ", part).strip(" |-")
        if ":" not in part:
            continue
        key, val = [piece.strip(" |-") for piece in part.split(":", 1)]
        if normalize_text(key).startswith("otal output"):
            key = f"T{key}"
        if normalize_text(key) in {"a, w", "w"}:
            continue
        val = re.sub(r"^A,\s*W:\s*", "", val, flags=re.I)
        if key and val and key.lower() not in seen:
            seen.add(key.lower())
            pieces.append(f"{key}:{val}")
        if len(pieces) >= limit:
            break

    if pieces:
        return "|".join(pieces)
    return strip_html(value)[:500]


def canonical_brand(value: Any) -> str:
    brand = clean(value).upper()
    brand = re.sub(r"\s+", " ", brand).strip()
    return BRAND_ALIASES.get(brand, brand)


def normalize_category(category: str, subcategory: str = "") -> tuple[str, str]:
    category = strip_html(category)
    subcategory = strip_html(subcategory)
    original_category = clean(category)
    if normalize_text(original_category).startswith("gaming,"):
        _, real_category = original_category.split(",", 1)
        return normalize_category(real_category.strip(), subcategory)

    raw = normalize_text(category).upper()
    raw = re.sub(r"^GAMING,\s*", "", raw)
    raw = raw.replace("PERIFERICOS", "PERIFERICOS").replace("PERIFÉRICOS", "PERIFERICOS")
    if raw in CATEGORY_ALIASES:
        mapped_category, mapped_subcategory = CATEGORY_ALIASES[raw]
        return mapped_category, normalize_subcategory(mapped_subcategory or subcategory)
    if "," in clean(category):
        first, rest = [part.strip() for part in clean(category).split(",", 1)]
        return normalize_category(first, rest or subcategory)
    return title_category(category), normalize_subcategory(subcategory)


def title_category(value: str) -> str:
    normalized = normalize_text(value)
    aliases = {
        "perifericos": "Perifericos",
        "unidad de energia": "Unidad de Energia",
        "camaras ip": "Seguridad",
    }
    return aliases.get(normalized, clean(value).title())


def normalize_subcategory(value: str) -> str:
    raw = normalize_text(value).upper()
    raw = raw.replace("PERIFERICOS", "PERIFERICOS").replace("PERIFÉRICOS", "PERIFERICOS")
    raw = raw.replace("SSD", "SSD").strip()
    if not raw:
        return ""
    if raw in SUBCATEGORY_ALIASES:
        return SUBCATEGORY_ALIASES[raw]
    text = clean(value).replace("Ssd", "SSD").replace("Nas", "NAS").replace("Wifi", "WiFi")
    return text.title().replace("Ssd", "SSD").replace("Nas", "NAS").replace("Wifi", "WiFi")


def normalize_sku(value: Any) -> str:
    sku = clean(value).upper()
    if "-" in sku and sku.startswith("WDS"):
        # WD often appends regional/revision suffixes after the base model.
        return sku.split("-", 1)[0]
    return sku


def slugify(value: str) -> str:
    text = normalize_text(value)
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:80] or "producto"


def image_proxy(url: str) -> str:
    if not clean(url):
        return ""
    if "wsrv.nl" in url or "images.weserv.nl" in url:
        return url
    return f"https://wsrv.nl/?url={quote(url, safe='')}&w=1000&h=1000&fit=cover&output=webp"


def product_key(row: list[str]) -> str:
    brand = canonical_brand(row[6])
    by_name = normalize_text(f"{brand} {row[3]}")
    by_name = re.sub(r"\b(negro|black|blanco|white|gris|gray|rgb|gamer|usb|wireless)\b", "", by_name)
    by_name = re.sub(r"[^a-z0-9]+", " ", by_name).strip()
    sku = normalize_text(normalize_sku(row[2]))
    if sku and len(sku) >= 4:
        return f"{brand}:sku:{sku}"
    return f"name:{by_name}"


def comparable_usd_price(row: list[str]) -> float:
    usd_price = parse_price(row[7]) if len(row) > 7 else 0
    if usd_price > 0:
        return usd_price

    ars_price = parse_price(row[8]) if len(row) > 8 else 0
    usd_rate = parse_price(os.environ.get("CATALOG_USD_RATE", DEFAULT_USD_RATE)) or parse_price(DEFAULT_USD_RATE)
    return ars_price / usd_rate if ars_price and usd_rate else 0


def consolidated_usd_price(row: list[str]) -> float:
    return parse_price(row[8]) if len(row) > 8 else 0


def menu_markup_key(category: str, subcategory: str) -> str:
    return f"{normalize_text(category)}|{normalize_text(subcategory)}"


def markup_for(row: list[str], markups: dict[str, str] | None = None) -> float:
    if not markups:
        return 1.0
    raw = markups.get(menu_markup_key(row[5], row[6])) or markups.get(menu_markup_key(row[5], ""))
    value = parse_price(raw)
    return value if value > 0 else 1.0


def consolidate_products(*catalogs: list[list[str]]) -> list[list[str]]:
    best: dict[str, list[str]] = {}
    for catalog in catalogs:
        for row in catalog:
            key = product_key(row)
            current = best.get(key)
            if current is None or comparable_usd_price(row) < comparable_usd_price(current):
                best[key] = row

    consolidated = []
    for index, row in enumerate(best.values(), start=1):
        provider = row[0]
        provider_code = row[1]
        sku = row[2] or provider_code
        name = row[3]
        product_id = f"{provider.lower()}-{provider_code or index}"
        consolidated.append([
            product_id,
            provider,
            provider_code,
            sku,
            name,
            row[4],
            row[5],
            row[6],
            row[7],
            row[8],
            row[9],
            row[10],
            row[11],
            row[12],
            row[13],
            row[14],
            row[15],
            row[16],
            row[17],
            row[18],
            row[19],
            row[20],
            row[21],
            row[22],
            row[23] if len(row) > 23 else "",
        ])

    return sorted(
        consolidated,
        key=lambda item: (
            normalize_text(item[5]),
            normalize_text(item[6]),
            normalize_text(item[7]),
            normalize_text(item[4]),
            consolidated_usd_price(item),
        ),
    )


def cheapest_by_key(catalog: list[list[str]]) -> dict[str, list[str]]:
    best: dict[str, list[str]] = {}
    for row in catalog:
        key = product_key(row)
        current = best.get(key)
        if current is None or comparable_usd_price(row) < comparable_usd_price(current):
            best[key] = row
    return best


def consolidate_public_catalog(nb: list[list[str]], elit: list[list[str]]) -> tuple[list[list[str]], list[list[str]]]:
    nb_by_key = cheapest_by_key(nb)
    elit_by_key = cheapest_by_key(elit)
    public_rows: list[list[str]] = []
    internal_rows: list[list[str]] = []

    ordered_keys = sorted(
        set(nb_by_key) | set(elit_by_key),
        key=lambda key: (
            0 if key in nb_by_key else 1,
            normalize_text((nb_by_key.get(key) or elit_by_key[key])[4]),
        ),
    )

    for index, key in enumerate(ordered_keys, start=1):
        public_source = nb_by_key.get(key) or elit_by_key[key]
        row = public_source
        provider = row[0]
        provider_code = row[1]
        sku = row[2] or provider_code
        name = row[3]
        product_id = f"{provider.lower()}-{provider_code or index}"
        public_row = [
            product_id,
            provider,
            provider_code,
            sku,
            name,
            row[4],
            row[5],
            row[6],
            row[7],
            row[8],
            row[9],
            row[10],
            row[11],
            row[12],
            row[13],
            row[14],
            row[15],
            row[16],
            row[17],
            row[18],
            row[19],
            row[20],
            row[21],
            row[22],
            row[23] if len(row) > 23 else "",
        ]
        public_rows.append(public_row)

        elit_match = elit_by_key.get(key)
        if provider == "NB" and elit_match:
            web_usd = comparable_usd_price(row)
            recommended_usd = comparable_usd_price(elit_match)
            if web_usd > 0 and recommended_usd > 0 and recommended_usd < web_usd:
                savings = web_usd - recommended_usd
                savings_pct = (savings / web_usd) * 100
                internal_rows.append([
                    product_id,
                    sku,
                    name,
                    row[4],
                    row[5],
                    row[6],
                    provider,
                    str(round(web_usd, 2)),
                    row[8],
                    "ELIT",
                    elit_match[1],
                    str(round(recommended_usd, 2)),
                    elit_match[8],
                    str(round(savings, 2)),
                    str(round(savings_pct, 2)),
                    "Comprar en ELIT si confirma stock al momento de cerrar la orden.",
                ])

    public_rows = sorted(
        public_rows,
        key=lambda item: (
            normalize_text(item[5]),
            normalize_text(item[6]),
            normalize_text(item[7]),
            normalize_text(item[4]),
            consolidated_usd_price(item),
        ),
    )
    return public_rows, internal_rows


def products_for_store(consolidated: list[list[str]]) -> list[list[str]]:
    return products_for_store_with_markup(consolidated, {})


def products_for_store_with_markup(consolidated: list[list[str]], markups: dict[str, str]) -> list[list[str]]:
    products: list[list[str]] = []
    used_slugs: dict[str, int] = {}

    for index, row in enumerate(consolidated, start=1):
        product_id = row[0]
        provider = row[1]
        sku = row[3] or product_id
        name = row[4]
        category = row[5]
        subcategory = row[6]
        brand = row[7]
        markup = markup_for(row, markups)
        price_usd = str(round(consolidated_usd_price(row) * markup, 2))
        usd_rate = parse_price(os.environ.get("CATALOG_USD_RATE", DEFAULT_USD_RATE)) or parse_price(DEFAULT_USD_RATE)
        price_ars = str(round(parse_price(price_usd) * usd_rate, 2))
        offer_usd = ""
        offer_ars = ""
        if parse_price(row[10]) > 0 and parse_price(row[9]) > 0 and consolidated_usd_price(row) > 0:
            offer_usd = str(round(parse_price(row[10]) / (parse_price(row[9]) / consolidated_usd_price(row)), 2))
            offer_ars = str(round(parse_price(offer_usd) * usd_rate, 2))
        stock = row[12]
        stock_status = row[13]
        warranty = row[14]
        image = image_proxy(row[15])
        extra_images = "|".join(image_proxy(url) for url in row[16].split("|") if clean(url))
        attributes = row[17]
        source_offer = clean(row[24] if len(row) > 24 else "")
        base_slug = slugify(f"{brand} {name}" if brand else name)
        slug_count = used_slugs.get(base_slug, 0)
        used_slugs[base_slug] = slug_count + 1
        slug = base_slug if slug_count == 0 else f"{base_slug}-{slug_count + 1}"
        short_description = f"{brand} {subcategory or category}".strip()
        long_description = f"{brand} {subcategory or category}".strip() or f"Producto de {category}."
        tags = "|".join(filter(None, [provider, category, subcategory, brand]))

        products.append([
            product_id,
            sku,
            name,
            slug,
            short_description,
            long_description,
            price_usd,
            price_ars,
            offer_usd,
            offer_ars,
            stock,
            stock_status,
            category,
            subcategory,
            brand,
            tags,
            image,
            extra_images,
            attributes,
            "",
            "",
            warranty,
            "TRUE" if index <= 24 else "FALSE",
            "FALSE",
            "TRUE" if source_offer.upper() == "TRUE" or offer_usd else "FALSE",
            "FALSE",
            "",
            "TRUE",
            str(index),
        ])

    return products


def build_menu_rows(consolidated: list[list[str]], markups: dict[str, str] | None = None) -> list[list[str]]:
    counts: dict[tuple[str, str], int] = {}
    for row in consolidated:
        category = row[5]
        subcategory = row[6]
        if not category:
            continue
        counts[(category, subcategory)] = counts.get((category, subcategory), 0) + 1

    rows = []
    for (category, subcategory), count in counts.items():
        params = f"categoria={requests.utils.quote(category)}"
        if subcategory:
            params += f"&subcategoria={requests.utils.quote(subcategory)}"
        order = MENU_CATEGORY_ORDER.get(category, 999)
        rows.append([
            category,
            subcategory,
            str(count),
            f"/productos?{params}",
            str(order),
            "TRUE",
            (markups or {}).get(menu_markup_key(category, subcategory), "1.00"),
        ])

    return sorted(rows, key=lambda item: (int(item[4]), item[0], item[1]))


def read_csv_path(path: Path, delimiter: str = ",") -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file, delimiter=delimiter))


def read_csv_url(url: str, delimiter: str = ";") -> list[dict[str, str]]:
    response = requests.get(url, timeout=90)
    response.raise_for_status()
    content = response.content.decode("utf-8-sig", errors="replace")
    return list(csv.DictReader(io.StringIO(content), delimiter=delimiter))


def read_invid_articles(username: str, password: str) -> list[dict[str, Any]]:
    auth_response = requests.post(
        INVID_AUTH_URL,
        json={"username": username, "password": password},
        timeout=30,
    )
    auth_response.raise_for_status()
    token = auth_response.json().get("access_token")
    if not token:
        raise RuntimeError("INVID no devolvio access_token.")

    headers = {"Authorization": f"Bearer {token}"}
    articles: list[dict[str, Any]] = []
    offset = 0

    while True:
        response = requests.get(INVID_ARTICLE_URL, params={"offset": offset}, headers=headers, timeout=90)
        if response.status_code == 429:
            wait_seconds = int(response.headers.get("Retry-After") or "60")
            print(f"INVID rate limit en offset {offset}. Reintentando en {wait_seconds}s...")
            time.sleep(wait_seconds)
            continue
        response.raise_for_status()
        payload = response.json()
        data = payload.get("data") or []
        if isinstance(data, dict):
            data = [data]
        articles.extend(data)
        if not payload.get("next_page_url") or len(data) < 100:
            break
        offset += 100

    return articles


def read_normalized_catalog(path: Path) -> list[list[str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))
    normalized_rows = []
    for row in rows:
        values = [clean(row.get(column)) for column in OUTPUT_COLUMNS]
        category, subcategory = normalize_category(values[4], values[5])
        values[4] = category
        values[5] = subcategory
        values[16] = strip_html(values[16])
        normalized_rows.append(values)
    return normalized_rows


def read_rejected_catalog(path: Path) -> list[list[str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))
    return [[clean(row.get(column)) for column in REJECT_COLUMNS] for row in rows]


def split_category(value: str) -> tuple[str, str]:
    parts = [part.strip() for part in re.split(r">|/|\|", clean(value)) if part.strip()]
    if not parts:
        return "", ""
    return normalize_category(parts[0], " > ".join(parts[1:]))


def normalize_elit(rows: list[dict[str, str]], now: str) -> tuple[list[list[str]], list[list[str]]]:
    accepted: list[list[str]] = []
    rejected: list[list[str]] = []
    for row in rows:
        categoria, subcategoria = split_category(row.get("Categorías", ""))
        nombre = clean(row.get("Nombre"))
        marca = canonical_brand(row.get("Marca"))
        source_offer = is_offer_product(categoria, subcategoria, nombre, row.get("Tags", ""))
        if source_offer:
            nombre = clean_offer_name(nombre)
        categoria, subcategoria = recategorize_product(categoria, subcategoria, nombre, marca)
        reason = should_reject(categoria, subcategoria, nombre, marca, row.get("Tags", ""))
        reason = reason or should_reject_normalized(categoria, subcategoria, nombre, marca, row.get("Tags", ""))
        code = clean(row.get("SKU")) or clean(row.get("Identificador de URL"))
        precio_ars = price_to_number(row.get("Precio"))
        precio_oferta_ars = price_to_number(row.get("Precio promocional"))
        precio_usd = ""
        if precio_ars:
            usd_rate = parse_price(os.environ.get("CATALOG_USD_RATE", "1470")) or 1470
            precio_usd = str(round(parse_price(precio_ars) / usd_rate, 2))
        if reason:
            rejected.append(["ELIT", code, nombre, categoria, subcategoria, marca, reason, now])
            continue
        stock = clean(row.get("Stock"))
        accepted.append([
            "ELIT",
            code,
            normalize_sku(row.get("SKU")),
            nombre,
            categoria,
            subcategoria,
            marca,
            precio_usd,
            precio_ars,
            precio_oferta_ars,
            "ARS",
            stock,
            "disponible" if stock and stock != "0" else "sin_stock",
            "",
            clean(row.get("Imagen")) or clean(row.get("Imagen principal")),
            "",
            clean(row.get("Descripción")) or clean(row.get("Tags")),
            clean(row.get("Peso (kg)")),
            "",
            "",
            "",
            "TRUE",
            now,
            "TRUE" if source_offer or parse_price(precio_oferta_ars) > 0 else "FALSE",
        ])
    return accepted, rejected


def normalize_nb(rows: list[dict[str, str]], now: str) -> tuple[list[list[str]], list[list[str]]]:
    accepted: list[list[str]] = []
    rejected: list[list[str]] = []
    for row in rows:
        categoria, subcategoria = split_category(row.get("CATEGORIA_USUARIO") or row.get("CATEGORIA", ""))
        nombre = clean(row.get("DETALLE_USUARIO") or row.get("DETALLE"))
        marca = canonical_brand(row.get("MARCA"))
        source_offer = is_offer_product(categoria, subcategoria, nombre, row.get("ATRIBUTOS", ""))
        if source_offer:
            nombre = clean_offer_name(nombre)
        categoria, subcategoria = recategorize_product(categoria, subcategoria, nombre, marca)
        reason = should_reject(categoria, subcategoria, nombre, marca, row.get("ATRIBUTOS", ""))
        reason = reason or should_reject_normalized(categoria, subcategoria, nombre, marca, row.get("ATRIBUTOS", ""))
        code = clean(row.get("CODIGO"))
        precio_usd = price_to_number(row.get("PRECIO"))
        precio_ars = price_to_number(row.get("PRECIO PESOS SIN IVA") or row.get("PRECIO PESOS CON IVA"))
        if reason:
            rejected.append(["NB", code, nombre, categoria, subcategoria, marca, reason, now])
            continue
        stock = clean(row.get("STOCK"))
        accepted.append([
            "NB",
            code,
            normalize_sku(row.get("ID FABRICANTE")),
            nombre,
            categoria,
            subcategoria,
            marca,
            precio_usd,
            precio_ars,
            "",
            clean(row.get("MONEDA")) or "ARS",
            stock,
            "disponible" if stock and stock != "0" else "sin_stock",
            clean(row.get("GARANTIA")),
            clean(row.get("IMAGEN")),
            "",
            normalize_attributes(row.get("ATRIBUTOS")),
            clean(row.get("PESO")),
            clean(row.get("ALTO")),
            clean(row.get("ANCHO")),
            clean(row.get("LARGO")),
            "TRUE",
            now,
            "TRUE" if source_offer else "FALSE",
        ])
    return accepted, rejected


def invid_category(row: dict[str, Any]) -> tuple[str, str]:
    categories = row.get("CATEGORIES") or []
    primary = next((item for item in categories if item.get("IS_PRIMARY")), None)
    selected = primary or (categories[0] if categories else {})
    parent = selected.get("PARENT") or {}
    parent_name = clean(parent.get("NAME"))
    category_name = clean(selected.get("NAME")) or clean(row.get("CATEGORY"))
    if parent_name:
        return normalize_category(parent_name, category_name)
    return normalize_category(category_name, "")


def invid_attributes(row: dict[str, Any]) -> str:
    pieces = []
    for key, value in (row.get("TAGS") or {}).items():
        if isinstance(value, list):
            pieces.append(f"{key}:{', '.join(clean(item) for item in value if clean(item))}")
        elif clean(value):
            pieces.append(f"{key}:{clean(value)}")
    if row.get("IVA_PERCENT") is not None:
        pieces.append(f"IVA:{row.get('IVA_PERCENT')}%")
    if row.get("INTERNAL_TAX_PERCENT") is not None:
        pieces.append(f"Impuesto interno:{row.get('INTERNAL_TAX_PERCENT')}%")
    return "|".join(piece for piece in pieces if piece and not piece.endswith(":"))


def normalize_invid(rows: list[dict[str, Any]], now: str) -> tuple[list[list[str]], list[list[str]]]:
    accepted: list[list[str]] = []
    rejected: list[list[str]] = []
    usd_rate = parse_price(os.environ.get("CATALOG_USD_RATE", "1470")) or 1470

    for row in rows:
        categoria, subcategoria = invid_category(row)
        nombre = clean(row.get("TITLE"))
        marca = canonical_brand(row.get("BRAND"))
        categoria, subcategoria = recategorize_product(categoria, subcategoria, nombre, marca)
        code = clean(row.get("ID"))
        sku = normalize_sku(row.get("PART_NUMBER")) or code
        reason = should_reject(categoria, subcategoria, nombre, marca, strip_html(row.get("DESCRIPTION")))
        reason = reason or should_reject_normalized(categoria, subcategoria, nombre, marca, strip_html(row.get("DESCRIPTION")))
        final_price = price_to_number(row.get("FINAL_PRICE") or row.get("PRICE"))
        currency = clean(row.get("CURRENCY")).upper() or "USD"
        price = parse_price(final_price)
        if not reason and price <= 0:
            reason = "precio 0"
        if reason:
            rejected.append(["INVID", code, nombre, categoria, subcategoria, marca, reason, now])
            continue

        if currency == "USD":
            precio_usd = final_price
            precio_ars = str(round(price * usd_rate, 2))
        else:
            precio_usd = str(round(price / usd_rate, 2)) if price else ""
            precio_ars = final_price

        stock_raw = row.get("STOCK")
        stock = price_to_number(stock_raw) if stock_raw is not None else ""
        status_text = normalize_text(row.get("STOCK_STATUS"))
        stock_status = "sin_stock" if "sin stock" in status_text else "disponible"
        accepted.append([
            "INVID",
            code,
            sku,
            nombre,
            categoria,
            subcategoria,
            marca,
            precio_usd,
            precio_ars,
            "",
            currency,
            stock,
            stock_status,
            "",
            clean(row.get("IMAGE_URL")),
            "",
            invid_attributes(row) or strip_html(row.get("LONG_DESCRIPTION"))[:1500],
            price_to_number(row.get("WEIGHT")),
            price_to_number(row.get("HEIGHT")),
            price_to_number(row.get("WIDTH")),
            price_to_number(row.get("LENGTH")),
            "TRUE",
            now,
            "FALSE",
        ])

    return accepted, rejected


def sheets_service():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    creds.refresh(Request())
    return creds.token


def sheets_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def sheets_get(token: str, path: str, **params: Any) -> dict[str, Any]:
    response = requests.get(
        f"https://sheets.googleapis.com/v4/spreadsheets/{PRODUCTS_SPREADSHEET_ID}{path}",
        headers=sheets_headers(token),
        params=params,
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


def sheets_post(token: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    response = requests.post(
        f"https://sheets.googleapis.com/v4/spreadsheets/{PRODUCTS_SPREADSHEET_ID}{path}",
        headers=sheets_headers(token),
        json=body or {},
        timeout=90,
    )
    response.raise_for_status()
    return response.json() if response.content else {}


def sheets_put(token: str, path: str, body: dict[str, Any] | None = None, **params: Any) -> dict[str, Any]:
    response = requests.put(
        f"https://sheets.googleapis.com/v4/spreadsheets/{PRODUCTS_SPREADSHEET_ID}{path}",
        headers=sheets_headers(token),
        params=params,
        json=body or {},
        timeout=90,
    )
    response.raise_for_status()
    return response.json() if response.content else {}


def values_get(token: str, range_name: str) -> list[list[str]]:
    return sheets_get(token, f"/values/{requests.utils.quote(range_name, safe='!:$')}").get("values", [])


def values_clear(token: str, range_name: str) -> None:
    sheets_post(token, f"/values/{requests.utils.quote(range_name, safe='!:$')}:clear", {})


def values_batch_clear(token: str, ranges: list[str]) -> None:
    sheets_post(token, "/values:batchClear", {"ranges": ranges})


def values_update(token: str, range_name: str, values: list[list[str]]) -> None:
    sheets_put(
        token,
        f"/values/{requests.utils.quote(range_name, safe='!:$')}",
        {"values": values},
        valueInputOption="USER_ENTERED",
    )


def values_batch_update(token: str, updates: list[tuple[str, list[list[str]]]]) -> None:
    if not updates:
        return
    sheets_post(
        token,
        "/values:batchUpdate",
        {
            "valueInputOption": "USER_ENTERED",
            "data": [{"range": range_name, "values": values} for range_name, values in updates],
        },
    )


def batch_update(token: str, requests_body: list[dict[str, Any]]) -> None:
    if requests_body:
        sheets_post(token, "/:batchUpdate", {"requests": requests_body})


def ensure_sheet(service, title: str, min_rows: int = 1000, min_cols: int = 26) -> None:
    meta = sheets_get(service, "")
    existing = {s["properties"]["title"]: s["properties"] for s in meta.get("sheets", [])}
    if title in existing:
        props = existing[title]
        grid = props.get("gridProperties", {})
        row_count = int(grid.get("rowCount", 0))
        col_count = int(grid.get("columnCount", 0))
        if row_count >= min_rows and col_count >= min_cols:
            return
        batch_update(service, [{
            "updateSheetProperties": {
                "properties": {
                    "sheetId": props["sheetId"],
                    "gridProperties": {
                        "rowCount": max(row_count, min_rows),
                        "columnCount": max(col_count, min_cols),
                    },
                },
                "fields": "gridProperties(rowCount,columnCount)",
            }
        }])
        return
    batch_update(service, [{
        "addSheet": {
            "properties": {
                "title": title,
                "gridProperties": {"rowCount": min_rows, "columnCount": min_cols},
            }
        }
    }])


def replace_values(service, sheet: str, headers: list[str], rows: list[list[str]]) -> None:
    ensure_sheet(service, sheet, min_rows=max(len(rows) + 10, 1000), min_cols=max(len(headers) + 2, 26))
    values_clear(service, f"{sheet}!A:ZZ")
    values = [headers] + rows
    updates = []
    for index in range(0, len(values), 500):
        chunk = values[index:index + 500]
        start = index + 1
        updates.append((f"{sheet}!A{start}", chunk))
    values_batch_update(service, updates)


def replace_existing_values(service, sheet: str, headers: list[str], rows: list[list[str]]) -> None:
    values_clear(service, f"{sheet}!A:ZZ")
    values = [headers] + rows
    updates = []
    for index in range(0, len(values), 500):
        chunk = values[index:index + 500]
        start = index + 1
        updates.append((f"{sheet}!A{start}", chunk))
    values_batch_update(service, updates)


def read_cell(service, sheet: str, cell: str) -> str:
    values = values_get(service, f"{sheet}!{cell}")
    return clean(values[0][0]) if values and values[0] else ""


def build_brand_rows(consolidated: list[list[str]]) -> list[list[str]]:
    brands = sorted({clean(row[7]) for row in consolidated if clean(row[7])})
    return [[brand, canonical_brand(brand)] for brand in brands]


def read_menu_markups(service, sheet: str) -> dict[str, str]:
    rows = values_get(service, f"{sheet}!A1:G1000")
    if not rows:
        return {}
    headers = [normalize_text(cell) for cell in rows[0]]
    try:
        markup_index = headers.index("markup_multiplicador")
    except ValueError:
        markup_index = 6

    markups: dict[str, str] = {}
    for row in rows[1:]:
        if len(row) <= markup_index:
            continue
        category = clean(row[0] if len(row) > 0 else "")
        subcategory = clean(row[1] if len(row) > 1 else "")
        markup = clean(row[markup_index])
        if category and markup:
            markups[menu_markup_key(category, subcategory)] = markup
    return markups


def replace_menu_values(
    service,
    sheet: str,
    headers: list[str],
    rows: list[list[str]],
    brand_rows: list[list[str]],
) -> None:
    ensure_sheet(service, sheet, min_rows=max(len(rows) + 10, 1000), min_cols=14)
    current_rate = read_cell(service, sheet, "L2") or read_cell(service, sheet, "G1")
    rate = current_rate or os.environ.get("CATALOG_USD_RATE", DEFAULT_USD_RATE) or DEFAULT_USD_RATE
    current_brand_values = values_get(service, f"{sheet}!H2:J1000")
    logo_by_brand = {
        clean(row[0]).upper(): clean(row[2])
        for row in current_brand_values
        if len(row) >= 3 and clean(row[0]) and clean(row[2])
    }
    values_clear(service, f"{sheet}!A:N")
    values = [headers] + rows
    updates = []
    for index in range(0, len(values), 500):
        chunk = values[index:index + 500]
        start = index + 1
        updates.append((f"{sheet}!A{start}", chunk))
    updates.append((f"{sheet}!H1:N1", [["marca", "marca_canonica", "logo_url", "config", "cotizacion_usd", "nota", ""]]))
    updates.append((f"{sheet}!L2", [[rate]]))
    if brand_rows:
        brand_rows = [
            [brand, canonical, logo_by_brand.get(brand.upper(), "")]
            for brand, canonical in brand_rows
        ]
        updates.append((f"{sheet}!H2", brand_rows))
    values_batch_update(service, updates)


def color_consolidated_rows(service, sheet: str) -> None:
    meta = sheets_get(service, "")
    sheet_props = next(
        s["properties"] for s in meta.get("sheets", []) if s["properties"]["title"] == sheet
    )
    sheet_id = sheet_props["sheetId"]
    rows = values_get(service, f"{sheet}!A2:W")

    requests = [
        {
            "repeatCell": {
                "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1},
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": {"red": 0.06, "green": 0.06, "blue": 0.08},
                        "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}},
                    }
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat)",
            }
        },
        {
            "updateSheetProperties": {
                "properties": {
                    "sheetId": sheet_id,
                    "gridProperties": {"frozenRowCount": 1},
                },
                "fields": "gridProperties.frozenRowCount",
            }
        },
    ]

    for index, row in enumerate(rows, start=1):
        provider = row[1] if len(row) > 1 else ""
        if provider == "ELIT":
            color = {"red": 1.0, "green": 0.93, "blue": 0.86}
        elif provider == "NB":
            color = {"red": 0.88, "green": 0.94, "blue": 1.0}
        elif provider == "INVID":
            color = {"red": 0.84, "green": 1.0, "blue": 1.0}
        else:
            color = {"red": 1, "green": 1, "blue": 1}
        requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sheet_id,
                    "startRowIndex": index,
                    "endRowIndex": index + 1,
                },
                "cell": {"userEnteredFormat": {"backgroundColor": color}},
                "fields": "userEnteredFormat.backgroundColor",
            }
        })

    for index in range(0, len(requests), 500):
        batch_update(service, requests[index:index + 500])


def format_menu_sheet(service, sheet: str) -> None:
    meta = sheets_get(service, "")
    sheet_props = next(
        s["properties"] for s in meta.get("sheets", []) if s["properties"]["title"] == sheet
    )
    sheet_id = sheet_props["sheetId"]
    batch_update(service, [
        {
            "repeatCell": {
                "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1},
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": {"red": 0.06, "green": 0.06, "blue": 0.08},
                        "textFormat": {
                            "bold": True,
                            "foregroundColor": {"red": 1, "green": 1, "blue": 1},
                        },
                    }
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat)",
            }
        },
        {
            "updateSheetProperties": {
                "properties": {
                    "sheetId": sheet_id,
                    "gridProperties": {"frozenRowCount": 1},
                },
                "fields": "gridProperties.frozenRowCount",
            }
        },
    ])


def main() -> None:
    load_local_env()
    nb_csv_url = os.environ.get("NB_PRICE_LIST_CSV_URL")
    if not nb_csv_url and not NB_CSV_FALLBACK.exists():
        raise RuntimeError("Falta NB_PRICE_LIST_CSV_URL en .env.local o variables de entorno.")
    invid_username = os.environ.get("INVID_USERNAME")
    invid_password = os.environ.get("INVID_PASSWORD")
    invid_cache = REPO_ROOT / "data" / "catalogos" / "catalogo_invid_normalizado.csv"
    invid_rejected_cache = REPO_ROOT / "data" / "catalogos" / "catalogo_invid_rechazados.csv"
    if not invid_cache.exists() and (not invid_username or not invid_password):
        raise RuntimeError("Faltan INVID_USERNAME / INVID_PASSWORD en .env.local o variables de entorno.")

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    elit_rows = read_csv_path(ELIT_CSV)
    nb_rows = read_csv_url(nb_csv_url) if nb_csv_url else read_csv_path(NB_CSV_FALLBACK, delimiter=";")
    invid_rows = [] if invid_cache.exists() else read_invid_articles(invid_username, invid_password)

    elit, elit_rejected = normalize_elit(elit_rows, now)
    nb, nb_rejected = normalize_nb(nb_rows, now)
    if invid_cache.exists():
        invid = read_normalized_catalog(invid_cache)
        invid_rejected = read_rejected_catalog(invid_rejected_cache)
    else:
        invid, invid_rejected = normalize_invid(invid_rows, now)
    elit, elit_stock_rejected = reject_low_stock(elit, now)
    nb, nb_stock_rejected = reject_low_stock(nb, now)
    invid, invid_stock_rejected = reject_low_stock(invid, now)
    rejected = (
        elit_rejected
        + nb_rejected
        + invid_rejected
        + elit_stock_rejected
        + nb_stock_rejected
        + invid_stock_rejected
    )
    consolidated, internal_buy = consolidate_public_catalog(nb, elit)
    service = sheets_service()
    existing_markups = read_menu_markups(service, MENU_SHEET)
    store_products = products_for_store_with_markup(consolidated, existing_markups)
    menu_rows = build_menu_rows(consolidated, existing_markups)
    brand_rows = build_brand_rows(consolidated)
    quick_publish = os.environ.get("CATALOG_QUICK_PUBLISH", "TRUE").upper() != "FALSE"
    if not quick_publish:
        replace_values(service, "CATALOGO_ELIT", OUTPUT_COLUMNS, elit)
        replace_values(service, "CATALOGO_NB", OUTPUT_COLUMNS, nb)
        replace_values(service, "CATALOGO_INVID", OUTPUT_COLUMNS, invid)
    replace_existing_values(service, "PRODUCTOS", ECOMMERCE_PRODUCT_COLUMNS, store_products)
    replace_menu_values(service, MENU_SHEET, MENU_COLUMNS, menu_rows, brand_rows)
    replace_values(service, "COMPRA_INTERNA_RECOMENDADA", INTERNAL_BUY_COLUMNS, internal_buy)
    if not quick_publish:
        replace_existing_values(service, "CATALOGO_CONSOLIDADO", CONSOLIDATED_COLUMNS, consolidated)
    if not quick_publish:
        color_consolidated_rows(service, "CATALOGO_CONSOLIDADO")
        format_menu_sheet(service, MENU_SHEET)
        replace_values(service, "CATALOGO_RECHAZADOS", REJECT_COLUMNS, rejected)
        replace_values(
            service,
            "CATALOGO_LOG",
            ["fecha", "proveedor", "importados", "rechazados"],
            [
                [now, "ELIT", str(len(elit)), str(len(elit_rejected) + len(elit_stock_rejected))],
                [now, "NB", str(len(nb)), str(len(nb_rejected) + len(nb_stock_rejected))],
                [now, "INVID", str(len(invid)), str(len(invid_rejected) + len(invid_stock_rejected))],
            ],
        )

    print(json.dumps({
        "ELIT_importados": len(elit),
        "ELIT_rechazados": len(elit_rejected) + len(elit_stock_rejected),
        "NB_importados": len(nb),
        "NB_rechazados": len(nb_rejected) + len(nb_stock_rejected),
        "INVID_importados": len(invid),
        "INVID_rechazados": len(invid_rejected) + len(invid_stock_rejected),
        "CONSOLIDADO": len(consolidated),
        "COMPRA_INTERNA_RECOMENDADA": len(internal_buy),
        "PRODUCTOS": len(store_products),
        "MENU_CAT_MAR": len(menu_rows),
        "total_importados": len(elit) + len(nb) + len(invid),
        "total_rechazados": len(rejected),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
