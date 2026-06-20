import argparse
import json
import re
from pathlib import Path
from urllib.parse import quote

from duckduckgo_search import DDGS
from google.oauth2 import service_account
from googleapiclient.discovery import build


ROOT = Path(__file__).resolve().parents[3]
SERVICE_ACCOUNT_FILE = ROOT / "cometag-444803-c2bdba83753e.json"
PRODUCTS_SPREADSHEET_ID = "1wIpaMAkOqMNHsSnMCroujwg98ZK0AV_53qESWtNkMqQ"
PRODUCTS_SHEET = "PRODUCTOS"
OUTPUT_SHEET = "IMAGENES_LOTE"

OUTPUT_COLUMNS = [
    "id",
    "sku",
    "nombre",
    "marca",
    "categoria",
    "subcategoria",
    "imagen_actual",
    "candidato_1_1000",
    "candidato_2_1000",
    "candidato_3_1000",
    "query",
    "estado",
]


def clean(value):
    return str(value or "").strip()


def slug_text(value: str) -> str:
    text = clean(value).lower()
    for source, target in {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n"}.items():
        text = text.replace(source, target)
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def sheets_service():
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    return build("sheets", "v4", credentials=credentials)


def rows_from_values(values):
    header = values[0]
    rows = []
    for row_index, cells in enumerate(values[1:], start=2):
        if not any(clean(cell) for cell in cells):
            continue
        row = {header[index]: clean(cells[index]) if index < len(cells) else "" for index in range(len(header))}
        row["_row"] = row_index
        rows.append(row)
    return rows


def read_products(service):
    values = service.spreadsheets().values().get(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        range=f"{PRODUCTS_SHEET}!A:AA",
    ).execute().get("values", [])
    return rows_from_values(values)


def ensure_sheet(service, sheet_name):
    meta = service.spreadsheets().get(spreadsheetId=PRODUCTS_SPREADSHEET_ID).execute()
    if any(sheet["properties"]["title"] == sheet_name for sheet in meta["sheets"]):
        return
    service.spreadsheets().batchUpdate(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        body={"requests": [{"addSheet": {"properties": {"title": sheet_name}}}]},
    ).execute()


def replace_values(service, sheet_name, rows):
    ensure_sheet(service, sheet_name)
    service.spreadsheets().values().clear(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        range=f"{sheet_name}!A:ZZ",
        body={},
    ).execute()
    service.spreadsheets().values().update(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        range=f"{sheet_name}!A1",
        valueInputOption="USER_ENTERED",
        body={"values": [OUTPUT_COLUMNS] + rows},
    ).execute()


def image_proxy(url: str) -> str:
    if not url:
        return ""
    if "wsrv.nl" in url or "images.weserv.nl" in url:
        return url
    return f"https://wsrv.nl/?url={quote(url, safe='')}&w=1000&h=1000&fit=cover&output=webp"


def image_candidates(product, max_results=12):
    name = product["nombre"]
    brand = product["marca"]
    sku = product["sku"]
    query = " ".join(filter(None, [brand, name, sku, "producto foto fondo blanco"]))
    seen = set()
    candidates = []

    current = product.get("imagen_principal", "")
    if current:
        candidates.append(image_proxy(current))
        seen.add(slug_text(current))

    status = "pendiente_revision"

    try:
        with DDGS() as ddgs:
            for result in ddgs.images(query, max_results=max_results):
                url = clean(result.get("image"))
                key = slug_text(url)
                if not url or key in seen:
                    continue
                if any(blocked in url.lower() for blocked in ["facebook.com", "instagram.com", "pinterest."]):
                    continue
                seen.add(key)
                candidates.append(image_proxy(url))
                if len(candidates) >= 3:
                    break
    except Exception as error:
        status = f"busqueda_limitada: {type(error).__name__}"

    while len(candidates) < 3:
        candidates.append("")

    return query, candidates[:3], status


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--limit", type=int, default=25)
    args = parser.parse_args()

    service = sheets_service()
    products = read_products(service)
    batch = products[args.offset:args.offset + args.limit]
    output = []

    for product in batch:
        query, candidates, status = image_candidates(product)
        output.append([
            product["id"],
            product["sku"],
            product["nombre"],
            product["marca"],
            product["categoria"],
            product["subcategoria"],
            product.get("imagen_principal", ""),
            candidates[0],
            candidates[1],
            candidates[2],
            query,
            status,
        ])

    replace_values(service, OUTPUT_SHEET, output)
    print(json.dumps({"sheet": OUTPUT_SHEET, "offset": args.offset, "limit": args.limit, "rows": len(output)}, indent=2))


if __name__ == "__main__":
    main()
