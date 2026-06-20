import hashlib
import io
import os
from pathlib import Path
from typing import Any

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
SERVICE_ACCOUNT_FILE = ROOT / "cometag-444803-c2bdba83753e.json"
PRODUCTS_SPREADSHEET_ID = os.environ.get("GOOGLE_SHEETS_PRODUCTOS_ID", "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY")
COMETA_DRIVE_FOLDER_ID = os.environ.get("COMETA_DRIVE_FOLDER_ID", "1NRLaZkwToHuK40JrjX6ddyASE32e0d9p")
MENU_SHEET = os.environ.get("GOOGLE_SHEETS_MENU_CATEGORIAS_NAME", "MENU_CAT_MAR")


def clean(value: Any) -> str:
    return str(value or "").strip()


def service(name: str, version: str, scopes: list[str]):
    creds = service_account.Credentials.from_service_account_file(str(SERVICE_ACCOUNT_FILE), scopes=scopes)
    return build(name, version, credentials=creds)


def find_or_create_folder(drive, name: str, parent_id: str) -> str:
    query = (
        f"name='{name}' and mimeType='application/vnd.google-apps.folder' "
        f"and '{parent_id}' in parents and trashed=false"
    )
    result = drive.files().list(q=query, fields="files(id,name)").execute().get("files", [])
    if result:
        return result[0]["id"]

    folder = drive.files().create(
        body={"name": name, "mimeType": "application/vnd.google-apps.folder", "parents": [parent_id]},
        fields="id",
    ).execute()
    return folder["id"]


def public_file_url(file_id: str) -> str:
    return f"https://drive.google.com/uc?export=view&id={file_id}"


def make_logo(brand: str) -> bytes:
    width, height = 220, 84
    digest = hashlib.sha256(brand.encode("utf-8")).digest()
    accent_a = (230, 43 + digest[0] % 60, 115 + digest[1] % 90)
    accent_b = (120 + digest[2] % 90, 64, 245)

    image = Image.new("RGBA", (width, height), (255, 255, 255, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, width - 1, height - 1), radius=16, fill=(255, 255, 255, 255))
    draw.rounded_rectangle((6, 6, width - 7, height - 7), radius=13, outline=accent_a + (255,), width=2)
    draw.ellipse((16, 18, 52, 54), fill=accent_a + (255,))
    draw.ellipse((30, 30, 66, 66), fill=accent_b + (210,))

    try:
        font_big = ImageFont.truetype("arialbd.ttf", 22)
        font_small = ImageFont.truetype("arial.ttf", 10)
    except OSError:
        font_big = ImageFont.load_default()
        font_small = ImageFont.load_default()

    text = brand[:18]
    while draw.textlength(text, font=font_big) > 134 and len(text) > 4:
        text = text[:-1]
    if text != brand[:18]:
        text = text.rstrip() + "."

    draw.text((76, 24), text, fill=(16, 16, 22, 255), font=font_big)
    draw.text((78, 52), "COMETA G", fill=(120, 120, 135, 255), font=font_small)

    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    return output.getvalue()


def upload_or_get_logo(drive, folder_id: str, brand: str) -> str:
    filename = f"{brand.lower().replace(' ', '-').replace('/', '-')}.png"
    query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
    result = drive.files().list(q=query, fields="files(id,name,webContentLink)").execute().get("files", [])
    if result:
        return public_file_url(result[0]["id"])

    media = MediaIoBaseUpload(io.BytesIO(make_logo(brand)), mimetype="image/png", resumable=False)
    created = drive.files().create(
        body={"name": filename, "parents": [folder_id]},
        media_body=media,
        fields="id",
    ).execute()
    file_id = created["id"]
    drive.permissions().create(fileId=file_id, body={"type": "anyone", "role": "reader"}).execute()
    return public_file_url(file_id)


def main() -> None:
    sheets = service("sheets", "v4", ["https://www.googleapis.com/auth/spreadsheets"])
    drive = service("drive", "v3", ["https://www.googleapis.com/auth/drive"])
    folder_id = find_or_create_folder(drive, "brand-logos", COMETA_DRIVE_FOLDER_ID)

    values = sheets.spreadsheets().values().get(
        spreadsheetId=PRODUCTS_SPREADSHEET_ID,
        range=f"{MENU_SHEET}!H2:J1000",
    ).execute().get("values", [])

    updated = []
    for row in values:
        brand = clean(row[0] if len(row) > 0 else "")
        canonical = clean(row[1] if len(row) > 1 else brand)
        logo = clean(row[2] if len(row) > 2 else "")
        if not brand:
            continue
        updated.append([brand, canonical, logo or upload_or_get_logo(drive, folder_id, canonical or brand)])

    if updated:
        sheets.spreadsheets().values().update(
            spreadsheetId=PRODUCTS_SPREADSHEET_ID,
            range=f"{MENU_SHEET}!H2",
            valueInputOption="USER_ENTERED",
            body={"values": updated},
        ).execute()

    print({"folder_id": folder_id, "logos": len(updated)})


if __name__ == "__main__":
    main()
