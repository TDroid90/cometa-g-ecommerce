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
from google.oauth2 import service_account
from googleapiclient.discovery import build


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
    if category in {"Outlet", "Combos", "Cables"}:
        return normalize_text(category)
    if ("cables" in haystack or re.search(r"\bcable[s]?\b", haystack)) and not re.search(r"\bwiz\b|\bhue\b|\bphilips\b|\blightstrip\b|\bled smart\b|\bsmart led\b", haystack):
        return "cables"
    return ""


def recategorize_product(category: str, subcategory: str, name: str, brand: str) -> tuple[str, str]:
    haystack = normalize_text(" ".join([category, subcategory, name, brand]))
    name_text = normalize_text(name)
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


def products_for_store(consolidated: list[list[str]]) -> list[list[str]]:
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
        price_usd = str(round(consolidated_usd_price(row), 2))
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
            "TRUE" if offer_usd else "FALSE",
            "FALSE",
            "",
            "TRUE",
            str(index),
        ])

    return products


def build_menu_rows(consolidated: list[list[str]]) -> list[list[str]]:
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
        ])
    return accepted, rejected


def normalize_nb(rows: list[dict[str, str]], now: str) -> tuple[list[list[str]], list[list[str]]]:
    accepted: list[list[str]] = []
    rejected: list[list[str]] = []
    for row in rows:
        categoria, subcategoria = split_category(row.get("CATEGORIA_USUARIO") or row.get("CATEGORIA", ""))
        nombre = clean(row.get("DETALLE_USUARIO") or row.get("DETALLE"))
        marca = canonical_brand(row.get("MARCA"))
        categoria, subcategoria = recategorize_product(categoria, subcategoria, nombre, marca)
        reason = should_reject(categoria, subcategoria, nombre, marca, row.get("ATRIBUTOS", ""))
        reason = reason or should_reject_normalized(categoria, subcategoria, nombre, marca, row.get("ATRIBUTOS", ""))
        code = clean(row.get("CODIGO"))
        precio_usd = price_to_number(row.get("PRECIO FINAL") or row.get("PRECIO"))
        precio_ars = price_to_number(row.get("PRECIO PESOS CON IVA"))
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
            clean(row.get("ATRIBUTOS")),
            clean(row.get("PESO")),
            clean(row.get("ALTO")),
            clean(row.get("ANCHO")),
            clean(row.get("LARGO")),
            "TRUE",
            now,
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
        ])

    return accepted, rejected


def sheets_service():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    return build("sheets", "v4", credentials=creds)


def ensure_sheet(service, title: str, min_rows: int = 1000, min_cols: int = 26) -> None:
    meta = service.spreadsheets().get(spreadsheetId=PRODUCTS_SPREADSHEET_ID).execute()
    existing = {s["properties"]["title"]: s["properties"] for s in meta.get("sheets", [])}
    if title in existing:
        props = existing[title]
        grid = props.get("gridProperties", {})
        row_count = int(grid.get("rowCount", 0))
        col_count = int(grid.get("columnCount", 0))
        if row_count >= min_rows and col_count >= min_cols:
            return
        service.spreadsheets().batchUpdate(
            spreadsheetId=PRODUCTS_SPREADSHEET_ID,
            body={
                "requests": [
                    {
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
                    }
                ]
            },
        ).execute()
        return
    service.spreadsheets().batchUpdate(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        body={
            "requests": [
                {
                    "addSheet": {
                        "properties": {
                            "title": title,
                            "gridProperties": {"rowCount": min_rows, "columnCount": min_cols},
                        }
                    }
                }
            ]
        },
    ).execute()


def replace_values(service, sheet: str, headers: list[str], rows: list[list[str]]) -> None:
    ensure_sheet(service, sheet, min_rows=max(len(rows) + 10, 1000), min_cols=max(len(headers) + 2, 26))
    service.spreadsheets().values().clear(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        range=f"{sheet}!A:ZZ",
        body={},
    ).execute()
    values = [headers] + rows
    for index in range(0, len(values), 500):
        chunk = values[index:index + 500]
        start = index + 1
        service.spreadsheets().values().update(
            spreadsheetId=PRODUCTS_SPREADSHEET_ID,
            range=f"{sheet}!A{start}",
            valueInputOption="USER_ENTERED",
            body={"values": chunk},
        ).execute()


def read_cell(service, sheet: str, cell: str) -> str:
    result = service.spreadsheets().values().get(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        range=f"{sheet}!{cell}",
    ).execute()
    values = result.get("values", [])
    return clean(values[0][0]) if values and values[0] else ""


def build_brand_rows(consolidated: list[list[str]]) -> list[list[str]]:
    brands = sorted({clean(row[7]) for row in consolidated if clean(row[7])})
    return [[brand, canonical_brand(brand)] for brand in brands]


def replace_menu_values(
    service,
    sheet: str,
    headers: list[str],
    rows: list[list[str]],
    brand_rows: list[list[str]],
) -> None:
    ensure_sheet(service, sheet, min_rows=max(len(rows) + 10, 1000), min_cols=12)
    current_rate = read_cell(service, sheet, "G1")
    rate = current_rate or os.environ.get("CATALOG_USD_RATE", DEFAULT_USD_RATE) or DEFAULT_USD_RATE
    service.spreadsheets().values().clear(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        range=f"{sheet}!A:I",
        body={},
    ).execute()
    values = [headers] + rows
    for index in range(0, len(values), 500):
        chunk = values[index:index + 500]
        start = index + 1
        service.spreadsheets().values().update(
            spreadsheetId=PRODUCTS_SPREADSHEET_ID,
            range=f"{sheet}!A{start}",
            valueInputOption="USER_ENTERED",
            body={"values": chunk},
        ).execute()
    service.spreadsheets().values().update(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        range=f"{sheet}!G1:I1",
        valueInputOption="USER_ENTERED",
        body={"values": [[rate, "marca", "marca_canonica"]]},
    ).execute()
    if brand_rows:
        service.spreadsheets().values().update(
            spreadsheetId=PRODUCTS_SPREADSHEET_ID,
            range=f"{sheet}!H2",
            valueInputOption="USER_ENTERED",
            body={"values": brand_rows},
        ).execute()


def color_consolidated_rows(service, sheet: str) -> None:
    meta = service.spreadsheets().get(spreadsheetId=PRODUCTS_SPREADSHEET_ID).execute()
    sheet_props = next(
        s["properties"] for s in meta.get("sheets", []) if s["properties"]["title"] == sheet
    )
    sheet_id = sheet_props["sheetId"]
    rows = service.spreadsheets().values().get(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        range=f"{sheet}!A2:W",
    ).execute().get("values", [])

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
        service.spreadsheets().batchUpdate(
            spreadsheetId=PRODUCTS_SPREADSHEET_ID,
            body={"requests": requests[index:index + 500]},
        ).execute()


def format_menu_sheet(service, sheet: str) -> None:
    meta = service.spreadsheets().get(spreadsheetId=PRODUCTS_SPREADSHEET_ID).execute()
    sheet_props = next(
        s["properties"] for s in meta.get("sheets", []) if s["properties"]["title"] == sheet
    )
    sheet_id = sheet_props["sheetId"]
    service.spreadsheets().batchUpdate(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        body={
            "requests": [
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
            ]
        },
    ).execute()


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
    consolidated = consolidate_products(elit, nb, invid)
    store_products = products_for_store(consolidated)
    menu_rows = build_menu_rows(consolidated)
    brand_rows = build_brand_rows(consolidated)

    service = sheets_service()
    replace_values(service, "CATALOGO_ELIT", OUTPUT_COLUMNS, elit)
    replace_values(service, "CATALOGO_NB", OUTPUT_COLUMNS, nb)
    replace_values(service, "CATALOGO_INVID", OUTPUT_COLUMNS, invid)
    replace_values(service, "CATALOGO_CONSOLIDADO", CONSOLIDATED_COLUMNS, consolidated)
    color_consolidated_rows(service, "CATALOGO_CONSOLIDADO")
    replace_values(service, "PRODUCTOS", ECOMMERCE_PRODUCT_COLUMNS, store_products)
    replace_menu_values(service, MENU_SHEET, MENU_COLUMNS, menu_rows, brand_rows)
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
        "PRODUCTOS": len(store_products),
        "MENU_CAT_MAR": len(menu_rows),
        "total_importados": len(elit) + len(nb) + len(invid),
        "total_rechazados": len(rejected),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
