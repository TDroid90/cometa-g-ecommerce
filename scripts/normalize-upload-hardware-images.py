from __future__ import annotations

import argparse
import base64
import csv
import json
import mimetypes
import os
import re
import shutil
import time
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path(r"C:\COMETA_G_IMAGENES\Hardware")
DEFAULT_OUTPUT = Path(r"C:\COMETA_G_IMAGENES\Hardware_NORMALIZADO")
DEFAULT_DRIVE_FOLDER_ID = "1ZTXCofnx7heiccLepdXTZJuyTfZZVl1h"
DEFAULT_PRODUCTS_API = "https://www.cometag.store/api/productos"
PRODUCT_SPREADSHEET_ID = "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY"
PRODUCT_SHEET_NAME = "PRODUCTOS"
DEFAULT_APPS_SCRIPT_UPLOAD_URL = (
    "https://script.google.com/macros/s/AKfycbzqUkcyauxZ57SZ462Rr1CpvRPmSV5dFnYXqZ3YSziLTyK7qJn0-00AYgXXlqipCBUFkQ/exec"
)
MIGRATION_WEB_KEY = "CometaG-Migrate-Drive-2026"
FOLDER_MIME = "application/vnd.google-apps.folder"
IMAGE_EXTENSIONS = {".webp", ".jpg", ".jpeg", ".png", ".jfif"}

CATEGORY_ALIASES = {
    "coolers": "Coolers",
    "fuentes": "Fuentes",
    "gabinetes": "Gabinetes",
    "microprocesadores": "Procesadores",
    "procesadores": "Procesadores",
    "motherboard": "Motherboards",
    "motherboards": "Motherboards",
    "mothers": "Motherboards",
    "placas de video": "Placas de Video",
    "placas de vídeo": "Placas de Video",
}

BRAND_ALIASES = {
    "asrock": "ASROCK",
    "asus": "ASUS",
    "asus rog": "ASUS",
    "asus tuf gaming": "ASUS",
    "aureox": "AUREOX",
    "cooler master": "COOLER MASTER",
    "corsair": "CORSAIR",
    "cromax": "CROMAX",
    "gigabyte": "GIGABYTE",
    "msi": "MSI",
    "raidmax": "RAIDMAX",
    "sfx": "SFX",
    "teros": "TEROS",
    "thermaltake": "THERMALTAKE",
    "trust": "TRUST",
    "amd": "AMD",
    "intel": "INTEL",
    "nvidia": "NVIDIA",
    "zotac": "ZOTAC",
    "sapphire": "SAPPHIRE",
    "powercolor": "POWERCOLOR",
    "power color": "POWERCOLOR",
    "evga": "EVGA",
    "adata": "ADATA",
    "kingston": "KINGSTON",
    "crucial": "CRUCIAL",
    "western digital": "WESTERN DIGITAL",
    "wd": "WESTERN DIGITAL",
    "seagate": "SEAGATE",
}

STOPWORDS = {
    "cooler",
    "water",
    "fuente",
    "gabinete",
    "mother",
    "motherboard",
    "microprocesador",
    "procesador",
    "placa",
    "video",
    "gamer",
    "gaming",
    "rgb",
    "argb",
    "atx",
    "am4",
    "am5",
    "lga",
    "ddr4",
    "ddr5",
    "plus",
}

MOTHERBOARD_IGNORE_TOKENS = {
    "am4",
    "am5",
    "lga",
    "lga1700",
    "lga1851",
    "ddr4",
    "ddr5",
    "ultra",
    "durable",
}


@dataclass
class Product:
    row: int
    id: str
    sku: str
    name: str
    category: str
    subcategory: str
    brand: str
    stock: float
    visible: bool
    status: str


@dataclass
class ImageGroup:
    category: str
    brand: str
    model_hint: str
    path: Path
    images: list[Path]


def load_dotenv() -> None:
    for name in [".env.local", ".env"]:
        path = ROOT / name
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            value = value.strip().strip("'\"").replace("\\n", "\n")
            os.environ.setdefault(key.strip(), value)


def credentials() -> service_account.Credentials:
    load_dotenv()
    scopes = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
    ]
    raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if raw:
        info = json.loads(raw)
    else:
        json_path = ROOT / "cometag-444803-c2bdba83753e.json"
        if json_path.exists():
            info = json.loads(json_path.read_text(encoding="utf-8"))
        else:
            info = {
                "client_email": os.environ.get("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
                "private_key": os.environ.get("GOOGLE_PRIVATE_KEY"),
                "token_uri": "https://oauth2.googleapis.com/token",
            }
    if not info.get("client_email") or not info.get("private_key"):
        raise RuntimeError("Faltan credenciales de Google.")
    return service_account.Credentials.from_service_account_info(info, scopes=scopes)


def access_token(creds: service_account.Credentials) -> str:
    if not creds.valid:
        creds.refresh(Request())
    return creds.token or ""


def google_request(creds: service_account.Credentials, method: str, url: str, **kwargs: Any) -> Any:
    token = access_token(creds)
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    response = requests.request(method, url, headers=headers, timeout=120, **kwargs)
    if not response.ok:
        raise RuntimeError(f"{response.status_code}: {response.text[:500]}")
    if response.text:
        return response.json()
    return None


def normalize_text(value: str) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.lower()
    text = text.replace("wht", "white").replace("blanco", "white").replace("negro", "black")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def slug(value: str, limit: int = 120) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-zA-Z0-9._-]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-._")
    return (text[:limit].strip("-._") or "producto")


def title_model(value: str) -> str:
    text = re.sub(r"^\d+[_\-. ]+", "", str(value or "")).strip()
    text = re.sub(r"\b(motherboard|mother|microprocesador|procesador|fuente|cooler|gabinete)\b", "", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip()
    return text or "Modelo"


def category_name(path_part: str) -> str | None:
    return CATEGORY_ALIASES.get(normalize_text(path_part))


def canonical_brand(value: str) -> str:
    key = normalize_text(value)
    return BRAND_ALIASES.get(key, str(value or "GENERICO").strip().upper())


def detect_brand(value: str) -> str | None:
    text = f" {normalize_text(value)} "
    matches = []
    for alias, brand in BRAND_ALIASES.items():
        alias_text = f" {normalize_text(alias)} "
        if alias_text in text:
            matches.append((len(alias_text), brand))
    if not matches:
        return None
    return sorted(matches, reverse=True)[0][1]


def product_category_match(product: Product, category: str) -> bool:
    return normalize_text(product.category) == "hardware" and normalize_text(product.subcategory) == normalize_text(category)


def read_products(creds: service_account.Credentials) -> list[Product]:
    url = (
        f"https://sheets.googleapis.com/v4/spreadsheets/{PRODUCT_SPREADSHEET_ID}"
        f"/values/{requests.utils.quote(PRODUCT_SHEET_NAME)}"
    )
    data = google_request(creds, "GET", url)
    rows = data.get("values", [])
    if not rows:
        return []
    headers = {name: i for i, name in enumerate(rows[0])}

    def cell(row: list[str], name: str) -> str:
        index = headers.get(name, -1)
        return str(row[index]).strip() if 0 <= index < len(row) else ""

    products: list[Product] = []
    for offset, row in enumerate(rows[1:], start=2):
        try:
            stock = float(cell(row, "stock").replace(",", ".") or 0)
        except ValueError:
            stock = 0
        product = Product(
            row=offset,
            id=cell(row, "id"),
            sku=cell(row, "sku"),
            name=cell(row, "nombre"),
            category=cell(row, "categoria"),
            subcategory=cell(row, "subcategoria"),
            brand=canonical_brand(cell(row, "marca")),
            stock=stock,
            visible=cell(row, "visible").upper() != "FALSE",
            status=cell(row, "stock_status"),
        )
        if product.visible and product.stock > 1 and normalize_text(product.status) != "sin stock":
            products.append(product)
    return products


def read_products_from_api(url: str) -> list[Product]:
    response = requests.get(url, timeout=45, headers={"User-Agent": "CometaG-ImageNormalizer/1.0"})
    response.raise_for_status()
    payload = response.json()
    raw_products = payload.get("data", payload if isinstance(payload, list) else [])
    products: list[Product] = []
    for offset, row in enumerate(raw_products, start=2):
        try:
            stock = float(str(row.get("stock", "0")).replace(",", ".") or 0)
        except ValueError:
            stock = 0
        product = Product(
            row=offset,
            id=str(row.get("id", "")).strip(),
            sku=str(row.get("sku", "")).strip(),
            name=str(row.get("nombre", "")).strip(),
            category=str(row.get("categoria", "")).strip(),
            subcategory=str(row.get("subcategoria", "")).strip(),
            brand=canonical_brand(str(row.get("marca", "")).strip()),
            stock=stock,
            visible=str(row.get("visible", "TRUE")).upper() != "FALSE",
            status=str(row.get("stock_status", "")).strip(),
        )
        if product.visible and product.stock > 1 and normalize_text(product.status) != "sin stock":
            products.append(product)
    return products


def image_sort_key(path: Path) -> tuple[int, str]:
    name = path.stem.lower()
    primary = 0 if re.match(r"^0?1(?:[_\-. ]|$)", name) else 1
    number = re.search(r"(\d+)", name)
    numeric = int(number.group(1)) if number else 9999
    return primary, f"{numeric:06d}-{name}"


def collect_groups(source: Path) -> list[ImageGroup]:
    groups: list[ImageGroup] = []
    for category_dir in sorted([p for p in source.iterdir() if p.is_dir()], key=lambda p: p.name.lower()):
        category = category_name(category_dir.name)
        if not category:
            continue
        for leaf in sorted([p for p in category_dir.rglob("*") if p.is_dir()], key=lambda p: str(p).lower()):
            images = sorted(
                [p for p in leaf.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS],
                key=image_sort_key,
            )
            if not images:
                continue
            rel_parts = leaf.relative_to(category_dir).parts
            if len(rel_parts) >= 2:
                brand = canonical_brand(rel_parts[0])
                model_hint = title_model(rel_parts[-1])
            elif len(rel_parts) == 1:
                model_hint = title_model(rel_parts[0])
                brand = detect_brand(model_hint) or "GENERICO"
            else:
                continue
            brand = detect_brand(" ".join(rel_parts)) or brand
            groups.append(ImageGroup(category=category, brand=brand, model_hint=model_hint, path=leaf, images=images))
    return groups


def text_tokens(value: str) -> set[str]:
    return {token for token in normalize_text(value).split() if len(token) > 1 and token not in STOPWORDS}


def compact_text(value: str) -> str:
    return normalize_text(value).replace(" ", "")


def cpu_model_key(value: str) -> str:
    text = normalize_text(value)
    amd = re.search(r"\bryzen\s*([3579])?\s*(\d{4,5})\s*(x3d|xt|gt|g|x|f|kf|k)?\b", text)
    if not amd:
        amd = re.search(r"\b([3579])\s+(\d{4,5})\s*(x3d|xt|gt|g|x|f|kf|k)?\b", text)
    if amd:
        tier = amd.group(1) or ""
        return f"amd-{tier}-{amd.group(2)}{amd.group(3) or ''}"
    intel = re.search(r"\b(?:core\s*)?i\s*([3579])\s*[- ]?\s*(\d{4,5})\s*(kf|f|k|t)?\b", text)
    if intel:
        return f"intel-i{intel.group(1)}-{intel.group(2)}{intel.group(3) or ''}"
    return ""


def gpu_model_key(value: str) -> str:
    text = compact_text(value)
    gpu = re.search(r"(rtx|gtx|rx)(\d{4})(xt|ti|super)?", text)
    if not gpu:
        return ""
    memory = re.search(r"(\d{1,2})gb", text)
    return f"{gpu.group(1)}-{gpu.group(2)}{gpu.group(3) or ''}-{memory.group(1) if memory else ''}gb"


def motherboard_model_key(value: str) -> str:
    tokens = [token for token in normalize_text(value).split() if token]
    normalized: list[str] = []
    skip_lga_number = False
    for token in tokens:
        if skip_lga_number and re.fullmatch(r"\d{4}", token):
            skip_lga_number = False
            continue
        skip_lga_number = False
        if token == "lga":
            skip_lga_number = True
            continue
        if token in MOTHERBOARD_IGNORE_TOKENS or token in {"mother", "motherboard", "asus", "asrock", "gigabyte", "msi"}:
            continue
        normalized.append(token)
    return "-".join(sorted(normalized))


def score_group(group: ImageGroup, product: Product) -> int:
    if not product_category_match(product, group.category):
        return -999
    product_brand = canonical_brand(product.brand)
    if group.brand != "GENERICO" and product_brand != group.brand:
        if not (group.brand == "ASUS" and product_brand == "ASUS"):
            return -999
    source = normalize_text(f"{group.brand} {group.model_hint} {group.path.name}")
    source_compact = source.replace(" ", "")
    product_text = normalize_text(f"{product.brand} {product.sku} {product.name}")
    product_compact = product_text.replace(" ", "")
    score = 0

    group_identity_text = f"{group.brand} {group.model_hint} {group.path.name}"
    product_identity_text = f"{product.brand} {product.sku} {product.name}"
    if normalize_text(group.category) == "procesadores":
        group_cpu = cpu_model_key(group_identity_text)
        product_cpu = cpu_model_key(product_identity_text)
        if group_cpu and product_cpu:
            if group_cpu != product_cpu:
                return -999
            score += 1400
    elif normalize_text(group.category) == "placas de video":
        group_gpu = gpu_model_key(group_identity_text)
        product_gpu = gpu_model_key(product_identity_text)
        if group_gpu and product_gpu:
            if group_gpu != product_gpu:
                return -999
            score += 1200
    elif normalize_text(group.category) == "motherboards":
        group_mother = motherboard_model_key(group_identity_text)
        product_mother = motherboard_model_key(product_identity_text)
        if group_mother and product_mother and group_mother == product_mother:
            score += 1200

    sku = normalize_text(product.sku)
    if sku and sku in source:
        score += 900
    if sku and sku.replace(" ", "") in source_compact:
        score += 900
    for token in text_tokens(source):
        if token in product_text:
            score += 18 if len(token) >= 4 else 7
    for marker in ["white", "black", "gold", "bronze", "platinum", "240", "280", "360", "550", "600", "650", "750", "850", "1000", "1200"]:
        source_has = marker in source
        product_has = marker in product_text
        if source_has and product_has:
            score += 50
        elif source_has and not product_has:
            score -= 40
    if source_compact and source_compact in product_compact:
        score += 300
    return score


def match_groups(groups: list[ImageGroup], products: list[Product]) -> tuple[list[tuple[ImageGroup, Product, int]], list[dict[str, Any]]]:
    candidates: list[tuple[int, ImageGroup, Product]] = []
    for group in groups:
        for product in products:
            score = score_group(group, product)
            if score >= 125:
                candidates.append((score, group, product))
    candidates.sort(key=lambda item: item[0], reverse=True)
    matched: list[tuple[ImageGroup, Product, int]] = []
    used_group_paths: set[Path] = set()
    used_product_rows: set[int] = set()
    for score, group, product in candidates:
        if group.path in used_group_paths or product.row in used_product_rows:
            continue
        matched.append((group, product, score))
        used_group_paths.add(group.path)
        used_product_rows.add(product.row)
    unmatched: list[dict[str, Any]] = []
    for group in groups:
        if group.path in used_group_paths:
            continue
        ranked = sorted(
            [(score_group(group, product), product) for product in products],
            key=lambda item: item[0],
            reverse=True,
        )[:3]
        unmatched.append(
            {
                "category": group.category,
                "brand": group.brand,
                "model_hint": group.model_hint,
                "path": str(group.path),
                "images": len(group.images),
                "best": [
                    {"score": score, "sku": product.sku, "name": product.name, "brand": product.brand}
                    for score, product in ranked
                    if score > -999
                ],
            }
        )
    return matched, unmatched


def normalize_image(input_path: Path, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(input_path) as raw:
        image = ImageOps.exif_transpose(raw).convert("RGBA")
        canvas = Image.new("RGBA", image.size, (255, 255, 255, 255))
        canvas.alpha_composite(image)
        canvas = canvas.convert("RGB")
        canvas.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
        final = Image.new("RGB", (1000, 1000), (255, 255, 255))
        x = (1000 - canvas.width) // 2
        y = (1000 - canvas.height) // 2
        final.paste(canvas, (x, y))
        final.save(output_path, "WEBP", quality=86, method=6)


def drive_list(creds: service_account.Credentials, parent_id: str) -> list[dict[str, Any]]:
    files: list[dict[str, Any]] = []
    page_token = ""
    while True:
        params = {
            "q": f"'{parent_id}' in parents and trashed=false",
            "fields": "nextPageToken,files(id,name,mimeType)",
            "pageSize": "1000",
            "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true",
        }
        if page_token:
            params["pageToken"] = page_token
        data = google_request(creds, "GET", "https://www.googleapis.com/drive/v3/files", params=params)
        files.extend(data.get("files", []))
        page_token = data.get("nextPageToken", "")
        if not page_token:
            return files


def drive_file_metadata(creds: service_account.Credentials, file_id: str) -> dict[str, Any]:
    return google_request(
        creds,
        "GET",
        f"https://www.googleapis.com/drive/v3/files/{file_id}",
        params={"fields": "id,name,mimeType,parents", "supportsAllDrives": "true"},
    )


def drive_folder(creds: service_account.Credentials, parent_id: str, name: str, cache: dict[tuple[str, str], str]) -> str:
    key = (parent_id, normalize_text(name))
    if key in cache:
        return cache[key]
    for item in drive_list(creds, parent_id):
        if item["mimeType"] == FOLDER_MIME and normalize_text(item["name"]) == normalize_text(name):
            cache[key] = item["id"]
            return item["id"]
    metadata = {"name": name, "mimeType": FOLDER_MIME, "parents": [parent_id]}
    data = google_request(
        creds,
        "POST",
        "https://www.googleapis.com/drive/v3/files",
        params={"supportsAllDrives": "true", "fields": "id"},
        json=metadata,
    )
    cache[key] = data["id"]
    return data["id"]


def set_public(creds: service_account.Credentials, file_id: str) -> None:
    try:
        google_request(
            creds,
            "POST",
            f"https://www.googleapis.com/drive/v3/files/{file_id}/permissions",
            params={"supportsAllDrives": "true"},
            json={"role": "reader", "type": "anyone"},
        )
    except Exception:
        pass


def trash_existing(creds: service_account.Credentials, parent_id: str, file_name: str) -> None:
    for item in drive_list(creds, parent_id):
        if item["mimeType"] != FOLDER_MIME and normalize_text(item["name"]) == normalize_text(file_name):
            google_request(
                creds,
                "PATCH",
                f"https://www.googleapis.com/drive/v3/files/{item['id']}",
                params={"supportsAllDrives": "true"},
                json={"trashed": True},
            )


def upload_file(creds: service_account.Credentials, parent_id: str, file_path: Path) -> dict[str, str]:
    trash_existing(creds, parent_id, file_path.name)
    token = access_token(creds)
    metadata = {"name": file_path.name, "parents": [parent_id], "mimeType": "image/webp"}
    files = {
        "metadata": ("metadata", json.dumps(metadata), "application/json; charset=UTF-8"),
        "file": (file_path.name, file_path.read_bytes(), mimetypes.guess_type(file_path.name)[0] or "image/webp"),
    }
    response = requests.post(
        "https://www.googleapis.com/upload/drive/v3/files",
        params={"uploadType": "multipart", "supportsAllDrives": "true", "fields": "id,name"},
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        timeout=180,
    )
    if not response.ok:
        raise RuntimeError(f"{response.status_code}: {response.text[:500]}")
    data = response.json()
    set_public(creds, data["id"])
    data["url"] = f"https://drive.google.com/uc?export=view&id={data['id']}"
    return data


def upload_file_via_apps_script(
    apps_script_url: str,
    file_path: Path,
    product: Product,
    group: ImageGroup,
    brand: str,
    model: str,
    image_index: int,
) -> dict[str, str]:
    payload = {
        "key": MIGRATION_WEB_KEY,
        "action": "uploadProductImage",
        "product": {
            "id": product.id,
            "sku": product.sku,
            "slug": product.sku,
            "nombre": product.name,
            "categoria": product.category,
            "subcategoria": product.subcategory,
        },
        "pathParts": [group.category, brand, model],
        "index": image_index,
        "mimeType": "image/webp",
        "fileName": file_path.name,
        "base64": base64.b64encode(file_path.read_bytes()).decode("ascii"),
    }
    response = requests.post(apps_script_url, json=payload, timeout=180)
    if not response.ok:
        raise RuntimeError(f"{response.status_code}: {response.text[:500]}")
    data = response.json()
    if not data.get("ok"):
        raise RuntimeError(json.dumps(data, ensure_ascii=False)[:500])
    return {"id": data.get("id", ""), "name": data.get("name", file_path.name), "url": data["url"]}


def drive_path_for_match(root_id: str, creds: service_account.Credentials, cache: dict[tuple[str, str], str], category: str, brand: str, model: str) -> str:
    category_id = drive_folder(creds, root_id, category, cache)
    brand_id = drive_folder(creds, category_id, brand, cache)
    return drive_folder(creds, brand_id, model, cache)


def write_report(output: Path, rows: list[dict[str, Any]], unmatched: list[dict[str, Any]], summary: dict[str, Any]) -> None:
    report_dir = ROOT / ".tmp" / "hardware-image-normalizer"
    report_dir.mkdir(parents=True, exist_ok=True)
    (report_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    (report_dir / "unmatched.json").write_text(json.dumps(unmatched, ensure_ascii=False, indent=2), encoding="utf-8")
    with (report_dir / "uploaded-map.csv").open("w", newline="", encoding="utf-8") as file:
        fieldnames = ["row", "category", "brand", "model", "sku", "product_name", "local_path", "drive_url", "is_main"]
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def column_name(index: int) -> str:
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def update_sheet_images(creds: service_account.Credentials, rows: list[dict[str, Any]]) -> dict[str, int]:
    if not rows:
        return {"updated_products": 0, "updated_ranges": 0}

    data = google_request(
        creds,
        "GET",
        f"https://sheets.googleapis.com/v4/spreadsheets/{PRODUCT_SPREADSHEET_ID}/values/{requests.utils.quote(PRODUCT_SHEET_NAME)}",
    )
    values = data.get("values", [])
    if not values:
        raise RuntimeError("La hoja PRODUCTOS esta vacia.")
    headers = {str(name).strip(): index for index, name in enumerate(values[0])}
    main_index = headers.get("imagen_principal")
    extra_index = headers.get("imagenes_extra")
    if main_index is None or extra_index is None:
        raise RuntimeError("Faltan columnas imagen_principal o imagenes_extra en PRODUCTOS.")

    by_row: dict[int, list[dict[str, Any]]] = {}
    for row in rows:
        if not row.get("drive_url") or not row.get("row"):
            continue
        by_row.setdefault(int(row["row"]), []).append(row)

    batch_data = []
    for row_number, product_images in sorted(by_row.items()):
        product_images.sort(key=lambda item: (0 if item.get("is_main") == "TRUE" else 1, str(item.get("local_path", ""))))
        urls = [str(item["drive_url"]) for item in product_images if item.get("drive_url")]
        if not urls:
            continue
        batch_data.append(
            {
                "range": f"{PRODUCT_SHEET_NAME}!{column_name(main_index + 1)}{row_number}",
                "values": [[urls[0]]],
            }
        )
        batch_data.append(
            {
                "range": f"{PRODUCT_SHEET_NAME}!{column_name(extra_index + 1)}{row_number}",
                "values": [["|".join(urls[1:])]],
            }
        )

    if batch_data:
        google_request(
            creds,
            "POST",
            f"https://sheets.googleapis.com/v4/spreadsheets/{PRODUCT_SPREADSHEET_ID}/values:batchUpdate",
            json={"valueInputOption": "RAW", "data": batch_data},
        )
    return {"updated_products": len(by_row), "updated_ranges": len(batch_data)}


def upload_normalized_tree(creds: service_account.Credentials, output: Path, drive_folder_id: str, limit: int = 0) -> dict[str, Any]:
    files = sorted(output.rglob("*.webp"), key=lambda item: str(item).lower())
    if limit:
        files = files[:limit]
    root_meta = drive_file_metadata(creds, drive_folder_id)
    print(f"Drive destino: {root_meta.get('name')} ({drive_folder_id})")
    folder_cache: dict[tuple[str, str], str] = {}
    uploaded_rows: list[dict[str, Any]] = []
    for index, file_path in enumerate(files, start=1):
        relative = file_path.relative_to(output)
        parent = drive_folder_id
        for part in relative.parts[:-1]:
            parent = drive_folder(creds, parent, part, folder_cache)
        result = upload_file(creds, parent, file_path)
        parts = relative.parts
        uploaded_rows.append(
            {
                "category": parts[0] if len(parts) > 0 else "",
                "brand": parts[1] if len(parts) > 1 else "",
                "model": parts[2] if len(parts) > 2 else "",
                "sku": "",
                "product_name": "",
                "local_path": str(file_path),
                "drive_url": result["url"],
                "is_main": "TRUE" if file_path.name.startswith("1_") else "FALSE",
            }
        )
        if index % 25 == 0 or index == len(files):
            print(f"Subidas {index}/{len(files)} imagenes")
    summary = {
        "output": str(output),
        "drive_folder": drive_folder_id,
        "uploaded_files": len(uploaded_rows),
        "mode": "upload_normalized",
    }
    write_report(output, uploaded_rows, [], summary)
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--drive-folder", default=DEFAULT_DRIVE_FOLDER_ID)
    parser.add_argument("--products-api", default=DEFAULT_PRODUCTS_API)
    parser.add_argument("--products-source", choices=["api", "sheet"], default="api")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--upload", action="store_true")
    parser.add_argument("--upload-via-apps-script", action="store_true")
    parser.add_argument("--apps-script-url", default=os.environ.get("APPS_SCRIPT_UPLOAD_URL", DEFAULT_APPS_SCRIPT_UPLOAD_URL))
    parser.add_argument("--upload-normalized", action="store_true")
    parser.add_argument("--update-sheet", action="store_true")
    parser.add_argument("--clean-output", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--category", default="")
    args = parser.parse_args()

    creds = credentials()
    if args.upload_normalized:
        print(json.dumps(upload_normalized_tree(creds, args.output, args.drive_folder, args.limit), ensure_ascii=False, indent=2))
        return

    products = read_products_from_api(args.products_api) if args.products_source == "api" else read_products(creds)
    groups = collect_groups(args.source)
    if args.category:
        groups = [group for group in groups if normalize_text(group.category) == normalize_text(args.category)]
    matches, unmatched = match_groups(groups, products)
    if args.start or args.limit:
        end = args.start + args.limit if args.limit else None
        matches = matches[args.start:end]

    if args.clean_output and args.output.exists() and not args.dry_run:
        shutil.rmtree(args.output)

    uploaded_rows: list[dict[str, Any]] = []
    folder_cache: dict[tuple[str, str], str] = {}
    by_category: dict[str, dict[str, int]] = {}
    for index, (group, product, score) in enumerate(matches, start=1):
        model = title_model(product.name)
        brand = canonical_brand(product.brand or group.brand)
        target_dir = args.output / group.category / brand / model
        by_category.setdefault(group.category, {"matched": 0, "images": 0})
        by_category[group.category]["matched"] += 1
        by_category[group.category]["images"] += len(group.images)
        print(f"[{index}/{len(matches)}] {group.category} / {brand} / {model} <- {group.path.name} ({len(group.images)} fotos, score {score})")
        drive_parent = ""
        if args.upload and not args.upload_via_apps_script and not args.dry_run:
            drive_parent = drive_path_for_match(args.drive_folder, creds, folder_cache, group.category, brand, model)
        for image_index, image in enumerate(sorted(group.images, key=image_sort_key), start=1):
            output_name = f"{image_index}_{slug(model)}.webp"
            output_path = target_dir / output_name
            if not args.dry_run:
                normalize_image(image, output_path)
            drive_url = ""
            if args.upload and not args.dry_run:
                if args.upload_via_apps_script:
                    result = upload_file_via_apps_script(args.apps_script_url, output_path, product, group, brand, model, image_index)
                else:
                    result = upload_file(creds, drive_parent, output_path)
                drive_url = result["url"]
                time.sleep(0.08)
            uploaded_rows.append(
                {
                    "row": product.row,
                    "category": group.category,
                    "brand": brand,
                    "model": model,
                    "sku": product.sku,
                    "product_name": product.name,
                    "local_path": str(output_path),
                    "drive_url": drive_url,
                    "is_main": "TRUE" if image_index == 1 else "FALSE",
                }
            )

    sheet_update = {"updated_products": 0, "updated_ranges": 0}
    if args.update_sheet and not args.dry_run:
        sheet_update = update_sheet_images(creds, uploaded_rows)

    summary = {
        "source": str(args.source),
        "output": str(args.output),
        "drive_folder": args.drive_folder,
        "dry_run": args.dry_run,
        "upload": args.upload,
        "products_read": len(products),
        "groups_read": len(groups),
        "matched_groups": len(matches),
        "unmatched_groups": len(unmatched),
        "images_processed": len(uploaded_rows),
        "sheet_update": sheet_update,
        "by_category": by_category,
    }
    write_report(args.output, uploaded_rows, unmatched, summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
