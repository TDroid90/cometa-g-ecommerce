import argparse
import csv
import importlib.util
import json
import re
import time
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

import requests
from duckduckgo_search import DDGS
from PIL import Image, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[1]
IMPORT_SCRIPT = REPO_ROOT / "scripts" / "import-catalogs-to-sheets.py"
OUTPUT_ROOT = REPO_ROOT / "data" / "product-images"

OFFICIAL_DOMAINS = {
    "AMD": ["amd.com"],
    "INTEL": ["intel.com"],
    "ASROCK": ["asrock.com"],
    "ASUS": ["asus.com", "dlcdnwebimgs.asus.com"],
    "COOLER MASTER": ["coolermaster.com"],
    "CORSAIR": ["corsair.com"],
    "GIGABYTE": ["gigabyte.com"],
    "MSI": ["msi.com"],
    "NZXT": ["nzxt.com"],
    "RAIDMAX": ["raidmax.com"],
    "THERMALTAKE": ["thermaltake.com"],
    "TRUST": ["trust.com"],
}


def load_importer():
    spec = importlib.util.spec_from_file_location("import_catalogs", IMPORT_SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    module.load_local_env()
    return module


def clean(value):
    return str(value or "").strip()


def safe_name(value):
    text = clean(value).normalize("NFD") if hasattr(clean(value), "normalize") else clean(value)
    text = re.sub(r"[^\w\s.-]+", "", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:120] or "producto"


def ascii_slug(value):
    import unicodedata

    text = unicodedata.normalize("NFD", clean(value))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-")
    return text[:90] or "producto"


def allowed_url(url, brand):
    host = urlparse(url).netloc.lower()
    return any(domain in host for domain in OFFICIAL_DOMAINS.get(brand, []))


def image_query(product, kind):
    brand = product["marca"]
    sku = product["sku"]
    name = product["nombre"]
    domains = OFFICIAL_DOMAINS.get(brand, [])
    domain_part = f" site:{domains[0]}" if domains else ""
    if kind == "processor":
        return f"{brand} {sku} {name} box official product image{domain_part}"
    if kind == "gpu":
        return f"{brand} {sku} {name} graphics card official product images{domain_part}"
    return f"{brand} {sku} {name} official product images{domain_part}"


def search_images(product, kind, needed):
    brand = product["marca"]
    query = image_query(product, kind)
    found = []
    seen = set()
    with DDGS() as ddgs:
        for result in ddgs.images(query, max_results=30):
            url = clean(result.get("image"))
            if not url or url in seen or not allowed_url(url, brand):
                continue
            seen.add(url)
            found.append(url)
            if len(found) >= needed:
                break
    return query, found


def download_image(url):
    response = requests.get(url, timeout=30, headers={"User-Agent": "CometaG/1.0"})
    response.raise_for_status()
    image = Image.open(BytesIO(response.content)).convert("RGB")
    image = ImageOps.exif_transpose(image)
    image.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (1000, 1000), (8, 8, 12))
    x = (1000 - image.width) // 2
    y = (1000 - image.height) // 2
    canvas.paste(image, (x, y))
    return canvas


def read_products(importer, subcategory):
    service = importer.sheets_service()
    values = service.spreadsheets().values().get(
        spreadsheetId=importer.PRODUCTS_SPREADSHEET_ID,
        range="PRODUCTOS!A1:AC2000",
    ).execute().get("values", [])
    headers = values[0]
    rows = [dict(zip(headers, row + [""] * (len(headers) - len(row)))) for row in values[1:]]
    return [
        row for row in rows
        if row.get("categoria") == "Hardware"
        and row.get("subcategoria") == subcategory
        and row.get("visible", "").upper() != "FALSE"
        and row.get("marca") in OFFICIAL_DOMAINS
    ]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--subcategory", required=True, choices=["Coolers", "Procesadores", "Placas de Video"])
    parser.add_argument("--limit", type=int, default=999)
    parser.add_argument("--offset", type=int, default=0)
    args = parser.parse_args()

    importer = load_importer()
    products = read_products(importer, args.subcategory)[args.offset:args.offset + args.limit]
    kind = "processor" if args.subcategory == "Procesadores" else "gpu" if args.subcategory == "Placas de Video" else "cooler"
    images_per_product = 1 if kind == "processor" else 5 if kind == "gpu" else 3
    batch_name = f"{kind}_{args.offset}_{args.offset + len(products)}"
    manifest_path = OUTPUT_ROOT / f"{batch_name}_manifest.csv"
    rows = []

    for product in products:
        query = ""
        urls = []
        try:
            query, urls = search_images(product, kind, images_per_product)
        except Exception as error:
            rows.append({
                "product_id": product["id"],
                "name": product["nombre"],
                "model": product["sku"],
                "brand": product["marca"],
                "source_page": "",
                "source_image": "",
                "local_file": "",
                "source_w": "",
                "source_h": "",
                "status": f"search_error:{type(error).__name__}",
                "query": query,
            })
            continue

        product_dir = OUTPUT_ROOT / "Hardware" / args.subcategory / f"{safe_name(product['nombre'])}_{safe_name(product['sku'])}_{safe_name(product['marca'])}"
        product_dir.mkdir(parents=True, exist_ok=True)
        saved = 0
        for index, url in enumerate(urls, start=1):
            try:
                image = download_image(url)
                file_path = product_dir / f"{safe_name(product['nombre'])}_{safe_name(product['sku'])}_{safe_name(product['marca'])}_{index}.webp"
                image.save(file_path, "WEBP", quality=82, method=6)
                rows.append({
                    "product_id": product["id"],
                    "name": product["nombre"],
                    "model": product["sku"],
                    "brand": product["marca"],
                    "source_page": "",
                    "source_image": url,
                    "local_file": str(file_path),
                    "source_w": "1000",
                    "source_h": "1000",
                    "status": "ok",
                    "query": query,
                })
                saved += 1
            except Exception as error:
                rows.append({
                    "product_id": product["id"],
                    "name": product["nombre"],
                    "model": product["sku"],
                    "brand": product["marca"],
                    "source_page": "",
                    "source_image": url,
                    "local_file": "",
                    "source_w": "",
                    "source_h": "",
                    "status": f"download_error:{type(error).__name__}",
                    "query": query,
                })
        print(json.dumps({"id": product["id"], "saved": saved, "needed": images_per_product}, ensure_ascii=False))
        time.sleep(0.8)

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    headers = ["product_id", "name", "model", "brand", "source_page", "source_image", "local_file", "source_w", "source_h", "status", "query"]
    with manifest_path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps({"manifest": str(manifest_path), "products": len(products), "rows": len(rows)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
