import argparse
import csv
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import unicodedata
from io import BytesIO
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import requests
from duckduckgo_search import DDGS
from google.oauth2 import service_account
from googleapiclient.discovery import build
from PIL import Image, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[1]
SERVICE_ACCOUNT_FILE = REPO_ROOT.parents[1] / "cometag-444803-c2bdba83753e.json"
PRODUCTS_SPREADSHEET_ID = "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY"
PRODUCTS_SHEET = "PRODUCTOS"
OUTPUT_ROOT = REPO_ROOT / "data" / "provider-images"

PROVIDER_HOSTS = {
    "nb": ["static.nb.com.ar", "nb.com.ar"],
    "elit": ["elit.com.ar"],
}

BRAND_DOMAINS = {
    "TRUST": ["trust.com"],
    "ASUS": ["asus.com"],
    "COOLER MASTER": ["coolermaster.com"],
    "MSI": ["msi.com"],
    "GIGABYTE": ["gigabyte.com"],
    "THERMALTAKE": ["thermaltake.com"],
    "RAZER": ["razer.com"],
    "ZOWIE": ["zowie.benq.com", "benq.com"],
}

IMAGE_COUNT_BY_CATEGORY = {
    "Almacenamiento": 2,
    "Audio": 3,
    "Casa Inteligente": 3,
    "Computadoras": 3,
    "Conectividad": 3,
    "Electro": 3,
    "Estuches": 5,
    "Memorias": 1,
    "Monitores": 3,
    "Muebles": 3,
    "Perifericos": 5,
    "Seguridad": 3,
    "Soportes": 3,
    "Unidad de Energia": 1,
    "Accesorios": 3,
}

IMAGE_COUNT_BY_HARDWARE_SUBCATEGORY = {
    "Coolers": 3,
    "Fuentes": 5,
    "Gabinetes": 5,
    "Motherboards": 3,
    "Placas de Video": 5,
    "Procesadores": 1,
}


def clean(value):
    return str(value or "").strip()


def load_env():
    env_path = REPO_ROOT / ".env.local"
    if not env_path.exists():
      return
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key, value.strip().strip('"'))


def slug(value):
    text = unicodedata.normalize("NFD", clean(value))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:90] or "producto"


def sheets_service():
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    return build("sheets", "v4", credentials=credentials)


def rows_from_values(values):
    headers = values[0]
    rows = []
    for index, cells in enumerate(values[1:], start=2):
        if not any(clean(cell) for cell in cells):
            continue
        rows.append({
            "_row": index,
            **{headers[i]: clean(cells[i]) if i < len(cells) else "" for i in range(len(headers))}
        })
    return headers, rows


def source_from_wsrv(url):
    if not url:
        return ""
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    if "url" in query:
        return unquote(query["url"][0])
    return url


def product_provider(product):
    product_id = product.get("id", "").lower()
    if product_id.startswith("nb-"):
        return "nb"
    if product_id.startswith("elit-"):
        return "elit"
    image = source_from_wsrv(product.get("imagen_principal", "")).lower()
    for provider, hosts in PROVIDER_HOSTS.items():
        if any(host in image for host in hosts):
            return provider
    return ""


def wanted_count(product):
    if product.get("categoria") == "Hardware":
        return IMAGE_COUNT_BY_HARDWARE_SUBCATEGORY.get(product.get("subcategoria"), 3)
    return IMAGE_COUNT_BY_CATEGORY.get(product.get("categoria"), 3)


def search_images(product, provider, needed):
    name = product["nombre"]
    brand = product["marca"]
    sku = product["sku"]
    current = source_from_wsrv(product.get("imagen_principal", ""))
    urls = [current] if current else []
    query = f"{brand} {sku} {name} product images white background"
    provider_domain = "nb.com.ar" if provider == "nb" else "elit.com.ar"
    search_queries = [f"{query} site:{provider_domain}"]
    search_queries.extend(f"{query} site:{domain}" for domain in BRAND_DOMAINS.get(brand.upper(), []))
    search_queries.append(query)

    seen = {url.lower() for url in urls if url}
    used_query = search_queries[0]
    for search_query in search_queries:
        used_query = search_query
        try:
            with DDGS() as ddgs:
                for result in ddgs.images(search_query, max_results=40):
                    url = clean(result.get("image"))
                    if not url or url.lower() in seen:
                        continue
                    if any(blocked in url.lower() for blocked in ["facebook.com", "instagram.com", "pinterest."]):
                        continue
                    seen.add(url.lower())
                    urls.append(url)
                    if len(urls) >= needed:
                        return urls[:needed], used_query
        except Exception:
            continue

    return urls[:needed], used_query


def download_and_square(url):
    response = requests.get(
        url,
        timeout=35,
        headers={"User-Agent": "Mozilla/5.0 CometaG Image Normalizer"},
    )
    response.raise_for_status()
    image = Image.open(BytesIO(response.content))
    image = ImageOps.exif_transpose(image).convert("RGBA")

    background = Image.new("RGBA", image.size, (255, 255, 255, 255))
    background.alpha_composite(image)
    image = background.convert("RGB")

    image.thumbnail((920, 920), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (1000, 1000), (255, 255, 255))
    canvas.paste(image, ((1000 - image.width) // 2, (1000 - image.height) // 2))
    return canvas


def write_local_image(product, index, image):
    folder = OUTPUT_ROOT / slug(product["categoria"]) / slug(product["subcategoria"]) / slug(product["marca"])
    folder.mkdir(parents=True, exist_ok=True)
    file_path = folder / f"{slug(product['nombre'])}_{slug(product['sku'])}_{index}.webp"
    image.save(file_path, "WEBP", quality=84, method=6)
    return file_path


def upload_to_blob(file_path, product, index):
    blob_path = "/".join([
        "productos",
        slug(product["categoria"]),
        slug(product["subcategoria"]),
        slug(product["marca"]),
        slug(product["sku"] or product["id"]),
        f"{index}.webp",
    ])
    script = f"""
import {{ put }} from '@vercel/blob';
import fs from 'node:fs/promises';
const data = await fs.readFile({json.dumps(str(file_path))});
const blob = await put({json.dumps(blob_path)}, data, {{
  access: process.env.BLOB_ACCESS || 'public',
  contentType: 'image/webp',
  addRandomSuffix: false,
  allowOverwrite: true,
  token: process.env.BLOB_READ_WRITE_TOKEN
}});
console.log(blob.url);
"""
    temp_dir = REPO_ROOT / ".tmp"
    temp_dir.mkdir(exist_ok=True)
    with tempfile.NamedTemporaryFile("w", suffix=".mjs", dir=temp_dir, delete=False, encoding="utf-8") as file:
        file.write(script)
        temp_script = file.name
    try:
        result = subprocess.run(
            ["node", temp_script],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
            env=os.environ.copy(),
        )
        return result.stdout.strip().splitlines()[-1]
    finally:
        Path(temp_script).unlink(missing_ok=True)


def update_products(service, updates):
    data = []
    for row_number, urls in updates:
        main = urls[0] if urls else ""
        extras = "|".join(urls[1:])
        data.append({"range": f"{PRODUCTS_SHEET}!Q{row_number}:R{row_number}", "values": [[main, extras]]})
    if not data:
        return
    service.spreadsheets().values().batchUpdate(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        body={"valueInputOption": "USER_ENTERED", "data": data},
    ).execute()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", choices=["nb", "elit", "all"], default="nb")
    parser.add_argument("--brand", default="")
    parser.add_argument("--subcategory", default="")
    parser.add_argument("--name-contains", default="")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--search-extra", action="store_true")
    parser.add_argument("--update-sheet", action="store_true")
    args = parser.parse_args()

    load_env()
    if not os.environ.get("BLOB_READ_WRITE_TOKEN"):
        raise RuntimeError("Falta BLOB_READ_WRITE_TOKEN.")

    service = sheets_service()
    values = service.spreadsheets().values().get(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        range=f"{PRODUCTS_SHEET}!A1:AC2500",
    ).execute().get("values", [])
    _, rows = rows_from_values(values)

    selected = []
    for product in rows:
        provider = product_provider(product)
        if args.provider != "all" and provider != args.provider:
            continue
        if args.provider == "all" and not provider:
            continue
        if args.brand and product.get("marca", "").upper() != args.brand.upper():
            continue
        if args.subcategory and product.get("subcategoria", "").lower() != args.subcategory.lower():
            continue
        if args.name_contains and args.name_contains.lower() not in product.get("nombre", "").lower():
            continue
        selected.append(product)

    batch = selected[args.offset:args.offset + args.limit]
    manifest = []
    sheet_updates = []

    for product in batch:
        provider = product_provider(product)
        needed = wanted_count(product)
        uploaded_urls = []
        if args.search_extra:
            source_urls, query = search_images(product, provider, needed)
        else:
            source_urls = [product.get("imagen_principal", "")]
            query = "catalog_image_only"
        for index, url in enumerate(source_urls, start=1):
            try:
                image = download_and_square(url)
                file_path = write_local_image(product, index, image)
                blob_url = upload_to_blob(file_path, product, index)
                uploaded_urls.append(blob_url)
                manifest.append({
                    "id": product["id"],
                    "sku": product["sku"],
                    "nombre": product["nombre"],
                    "proveedor": provider,
                    "marca": product["marca"],
                    "categoria": product["categoria"],
                    "subcategoria": product["subcategoria"],
                    "source_url": url,
                    "blob_url": blob_url,
                    "status": "ok",
                    "query": query,
                })
            except Exception as error:
                manifest.append({
                    "id": product["id"],
                    "sku": product["sku"],
                    "nombre": product["nombre"],
                    "proveedor": provider,
                    "marca": product["marca"],
                    "categoria": product["categoria"],
                    "subcategoria": product["subcategoria"],
                    "source_url": url,
                    "blob_url": "",
                    "status": f"error:{type(error).__name__}:{error}",
                    "query": query,
                })
        if uploaded_urls and args.update_sheet:
            sheet_updates.append((product["_row"], uploaded_urls))
            if len(sheet_updates) >= 25:
                update_products(service, sheet_updates)
                sheet_updates = []
        print(json.dumps({"id": product["id"], "uploaded": len(uploaded_urls), "needed": needed}, ensure_ascii=False))
        time.sleep(0.4)

    if args.update_sheet and sheet_updates:
        update_products(service, sheet_updates)

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    out = OUTPUT_ROOT / f"manifest_{args.provider}_{slug(args.brand or 'all')}_{slug(args.subcategory or args.name_contains or 'all')}_{args.offset}_{args.offset + len(batch)}.csv"
    headers = ["id", "sku", "nombre", "proveedor", "marca", "categoria", "subcategoria", "source_url", "blob_url", "status", "query"]
    with out.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=headers)
        writer.writeheader()
        writer.writerows(manifest)
    print(json.dumps({"selected": len(selected), "processed": len(batch), "manifest": str(out)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
