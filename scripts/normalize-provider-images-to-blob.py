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
from html import unescape
from io import BytesIO
from pathlib import Path
from urllib.parse import parse_qs, unquote, urljoin, urlparse

import requests
from duckduckgo_search import DDGS
from google.oauth2 import service_account
from google.auth.transport.requests import Request
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
    "AEROCOOL": ["aerocool.io"],
    "ANTEC": ["antec.com"],
    "ARCTIC": ["arctic.de"],
    "ASROCK": ["asrock.com"],
    "BE QUIET": ["bequiet.com"],
    "COUGAR": ["cougargaming.com"],
    "CORSAIR": ["corsair.com"],
    "DEEPCOOL": ["deepcool.com"],
    "EVGA": ["evga.com"],
    "ID-COOLING": ["idcooling.com"],
    "INTEL": ["intel.com"],
    "LIAN LI": ["lian-li.com"],
    "NOCTUA": ["noctua.at"],
    "NZXT": ["nzxt.com"],
    "RAIDMAX": ["raidmax.com"],
    "SCYTHE": ["scytheus.com", "scythe-eu.com"],
    "SENTEY": ["sentey.com"],
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


def sheets_access_token():
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    credentials.refresh(Request())
    return credentials.token


def read_sheet_values(range_name):
    token = sheets_access_token()
    response = requests.get(
        f"https://sheets.googleapis.com/v4/spreadsheets/{PRODUCTS_SPREADSHEET_ID}/values/{range_name}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=60,
    )
    response.raise_for_status()
    return response.json().get("values", [])


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


def stock_number(product):
    try:
        return int(float(clean(product.get("stock", "0")).replace(",", ".")))
    except ValueError:
        return 0


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


def official_image_search(product, needed):
    name = product["nombre"]
    brand = product["marca"]
    sku = product["sku"]
    domains = BRAND_DOMAINS.get(brand.upper(), [])
    urls = []
    seen = set()
    query = f"{brand} {sku} {name} official product images white background"

    for domain in domains:
        search_query = f"{query} site:{domain}"
        official_pages = official_page_candidates(product)

        for page_url in official_pages:
            for image_url in images_from_official_page(page_url, product):
                if image_url.lower() in seen:
                    continue
                seen.add(image_url.lower())
                urls.append(image_url)
                if len(urls) >= needed:
                    return urls[:needed], search_query

    return urls[:needed], query


def official_page_candidates(product):
    brand = product["marca"].upper()
    name = product["nombre"]
    sku = product["sku"]
    combined = f"{sku} {name}"
    base_slug = slug(
        combined
        .replace("COOLER", "")
        .replace("ASUS", "")
        .replace("COOLER MASTER", "")
        .replace("THERMALTAKE", "")
        .replace("CORSAIR", "")
        .replace("GIGABYTE", "")
        .replace("MSI", "")
        .replace("NZXT", "")
        .replace("TRUST", "")
    )
    name_slug = slug(name)
    sku_slug = slug(sku)
    candidate_slugs = [item for item in [sku_slug, base_slug, name_slug] if item and item != "producto"]
    candidate_slugs = list(dict.fromkeys(candidate_slugs))[:2]
    candidates = []

    if brand == "ASUS":
        lowered = name.lower()
        series = []
        if "prime" in lowered:
            series.append("prime")
        if "ryujin" in lowered:
            series.append("rog-ryujin")
        if "ryuo" in lowered:
            series.append("rog-ryuo")
        if "strix" in lowered:
            series.append("rog-strix-lc")
        if "tuf" in lowered:
            series.append("tuf-gaming")
        if not series:
            series = ["prime", "rog-ryujin", "rog-ryuo", "rog-strix-lc", "tuf-gaming"]
        for serie in series:
            for product_slug in candidate_slugs:
                candidates.append(f"https://www.asus.com/us/motherboards-components/cooling/{serie}/{product_slug}/")
                candidates.append(f"https://www.asus.com/motherboards-components/cooling/{serie}/{product_slug}/")
    elif brand == "COOLER MASTER":
        for product_slug in candidate_slugs:
            candidates.append(f"https://www.coolermaster.com/en-global/products/{product_slug}/")
            candidates.append(f"https://www.coolermaster.com/en-us/products/{product_slug}/")
    elif brand == "NZXT":
        for product_slug in candidate_slugs:
            candidates.append(f"https://nzxt.com/product/{product_slug}")
    elif brand == "MSI":
        for product_slug in candidate_slugs:
            candidates.append(f"https://www.msi.com/Liquid-Cooling/{product_slug}")
            candidates.append(f"https://www.msi.com/PC-Component/{product_slug}")
    elif brand == "GIGABYTE":
        for product_slug in candidate_slugs:
            candidates.append(f"https://www.gigabyte.com/CPU-Cooler/{product_slug}")
    elif brand == "THERMALTAKE":
        for product_slug in candidate_slugs:
            candidates.append(f"https://www.thermaltake.com/{product_slug}.html")
    elif brand == "CORSAIR":
        for product_slug in candidate_slugs:
            candidates.append(f"https://www.corsair.com/us/en/p/cpu-coolers/{product_slug}")

    return list(dict.fromkeys(candidates))


def images_from_official_page(page_url, product):
    try:
        html = fetch_url_bytes(page_url).decode("utf-8", errors="ignore")
    except Exception:
        return []

    candidates = []
    patterns = [
        r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\']',
        r'<img[^>]+(?:src|data-src)=["\']([^"\']+)["\']',
        r'<source[^>]+srcset=["\']([^"\']+)["\']',
    ]
    for pattern in patterns:
        for match in re.findall(pattern, html, flags=re.IGNORECASE):
            raw = unescape(match).split(",")[0].strip().split(" ")[0]
            if not raw or raw.startswith("data:"):
                continue
            image_url = urljoin(page_url, raw)
            parsed = urlparse(image_url)
            if parsed.scheme not in {"http", "https"}:
                continue
            lower = image_url.lower()
            if any(token in lower for token in ["logo", "icon", "favicon", "sprite", "avatar", "lense", ".css", ".mp4", ".vtt", ".svg"]):
                continue
            if not any(ext in lower for ext in [".jpg", ".jpeg", ".png", ".webp", "/image/", "media", "/gain/"]):
                continue
            candidates.append(image_url)

    product_tokens = [
        token.lower()
        for token in re.split(r"[^a-zA-Z0-9]+", f"{product.get('sku','')} {product.get('nombre','')}")
        if len(token) >= 3
    ]

    def score(url):
        lower = url.lower()
        return sum(1 for token in product_tokens if token in lower)

    return sorted(dict.fromkeys(candidates), key=score, reverse=True)


def download_and_square(url):
    image = Image.open(BytesIO(fetch_url_bytes(url)))
    image = ImageOps.exif_transpose(image).convert("RGBA")

    background = Image.new("RGBA", image.size, (255, 255, 255, 255))
    background.alpha_composite(image)
    image = background.convert("RGB")

    image.thumbnail((920, 920), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (1000, 1000), (255, 255, 255))
    canvas.paste(image, ((1000 - image.width) // 2, (1000 - image.height) // 2))
    return canvas


def fetch_url_bytes(url):
    temp_dir = REPO_ROOT / ".tmp"
    temp_dir.mkdir(exist_ok=True)
    temp_file = temp_dir / f"download-{abs(hash(url))}.bin"
    try:
        subprocess.run(
            [
                "curl.exe",
                "-L",
                "--max-time",
                "12",
                "-A",
                "Mozilla/5.0 CometaG Image Normalizer",
                url,
                "-o",
                str(temp_file),
            ],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        return temp_file.read_bytes()
    except Exception:
        response = requests.get(
            url,
            timeout=10,
            headers={"User-Agent": "Mozilla/5.0 CometaG Image Normalizer"},
        )
        response.raise_for_status()
        return response.content
    finally:
        temp_file.unlink(missing_ok=True)


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


def update_products(updates):
    data = []
    for row_number, urls in updates:
        main = urls[0] if urls else ""
        extras = "|".join(urls[1:])
        data.append({"range": f"{PRODUCTS_SHEET}!Q{row_number}:R{row_number}", "values": [[main, extras]]})
    if not data:
        return
    token = sheets_access_token()
    response = requests.post(
        f"https://sheets.googleapis.com/v4/spreadsheets/{PRODUCTS_SPREADSHEET_ID}/values:batchUpdate",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"valueInputOption": "USER_ENTERED", "data": data},
        timeout=60,
    )
    response.raise_for_status()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", choices=["nb", "elit", "all"], default="nb")
    parser.add_argument("--brand", default="")
    parser.add_argument("--subcategory", default="")
    parser.add_argument("--name-contains", default="")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--min-stock", type=int, default=2)
    parser.add_argument("--search-extra", action="store_true")
    parser.add_argument("--official-only", action="store_true")
    parser.add_argument("--update-sheet", action="store_true")
    args = parser.parse_args()

    load_env()
    if not os.environ.get("BLOB_READ_WRITE_TOKEN"):
        raise RuntimeError("Falta BLOB_READ_WRITE_TOKEN.")

    values = read_sheet_values(f"{PRODUCTS_SHEET}!A1:AC2500")
    _, rows = rows_from_values(values)

    selected = []
    for product in rows:
        if product.get("visible", "").upper() == "FALSE":
            continue
        if stock_number(product) < args.min_stock:
            continue
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
        if args.official_only:
            source_urls, query = official_image_search(product, needed)
        elif args.search_extra:
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
                update_products(sheet_updates)
                sheet_updates = []
        print(json.dumps({"id": product["id"], "uploaded": len(uploaded_urls), "needed": needed}, ensure_ascii=False))
        time.sleep(0.4)

    if args.update_sheet and sheet_updates:
        update_products(sheet_updates)

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
