from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps


SOURCE = Path(r"C:\COMETA_G_IMAGENES\C - copia 1000 - copia")
OUTPUT = Path(r"C:\COMETA_G_IMAGENES\C - copia 1000 - copia_NORMALIZADO")
EXTRA_CATEGORY_ROOTS = [
    (Path(r"C:\COMETA_G_IMAGENES\Hardware\Placas de video"), "Placas de Video", "MANUAL"),
]

PROVIDER_PRIORITY = {"NB": 0, "ELIT": 1, "INVID": 2}

BRANDS = [
    "ASUS TUF GAMING",
    "ASUS ROG",
    "COOLER MASTER",
    "POWER COLOR",
    "POWERCOOLER",
    "POWER COLOR",
    "WESTERN DIGITAL",
    "THERMALTAKE",
    "GIGABYTE",
    "POWERCOLOR",
    "SAPPHIRE",
    "ASROCK",
    "CORSAIR",
    "NVIDIA",
    "INNO3D",
    "KINGSTON",
    "CRUCIAL",
    "PATRIOT",
    "ADATA",
    "INTEL",
    "AMD",
    "ASUS",
    "MSI",
    "EVGA",
    "ZOTAC",
    "XFX",
    "PNY",
    "TUF",
]

CATEGORY_ALIASES = {
    "microprocesadores": "Microprocesadores",
    "microprocesador": "Microprocesadores",
    "procesadores": "Microprocesadores",
    "procesador": "Microprocesadores",
    "motherboard": "Motherboard",
    "motherboards": "Motherboard",
    "mothers": "Motherboard",
    "placas de video": "Placas de Video",
    "placa de video": "Placas de Video",
    "video": "Placas de Video",
    "vga": "Placas de Video",
}


@dataclass
class ProductFolder:
    provider: str
    category: str
    brand: str
    model: str
    key: str
    source: Path
    images: list[Path]


def strip_accents(value: str) -> str:
    return "".join(
        char
        for char in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(char)
    )


def clean_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def slug(value: str) -> str:
    value = strip_accents(value).lower()
    value = value.replace("+", " plus ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-") or "sin-modelo"


def title_model(value: str) -> str:
    keep_upper = {
        "amd",
        "intel",
        "asus",
        "rog",
        "tuf",
        "msi",
        "rtx",
        "gtx",
        "rx",
        "xt",
        "x3d",
        "am4",
        "am5",
        "lga",
        "ddr4",
        "ddr5",
        "oc",
        "gb",
        "wifi",
        "wi-fi",
    }
    out = []
    for part in clean_spaces(value).split(" "):
        plain = strip_accents(part).lower()
        if plain in keep_upper or re.search(r"\d", part):
            out.append(part.upper())
        else:
            out.append(part.capitalize())
    return clean_spaces(" ".join(out))


def normalize_category(value: str) -> str | None:
    key = strip_accents(value).lower().strip()
    return CATEGORY_ALIASES.get(key)


def normalize_brand(value: str) -> str:
    raw = strip_accents(value).upper()
    for brand in sorted(BRANDS, key=len, reverse=True):
        if strip_accents(brand).upper() in raw:
            normalized = brand.upper().replace("POWER COLOR", "POWERCOLOR")
            if normalized == "ASUS TUF GAMING":
                return "ASUS"
            if normalized == "ASUS ROG":
                return "ASUS"
            if normalized == "TUF":
                return "ASUS"
            return normalized
    if re.search(r"\bRYZEN\b|\bRADEON\b", raw):
        return "AMD"
    if re.search(r"\bCORE\b|\bI[3579][- ]?\d", raw):
        return "INTEL"
    return "GENERICO"


def remove_brand_words(text: str, brand: str) -> str:
    variants = {brand, brand.replace(" ", ""), brand.replace("POWERCOLOR", "POWER COLOR")}
    for item in variants:
        text = re.sub(re.escape(item), " ", text, flags=re.IGNORECASE)
    return text


def normalize_model_name(name: str, category: str, brand: str) -> str:
    text = strip_accents(name).lower()
    text = re.sub(r"^\d+[\s_.-]+", " ", text)
    text = text.replace("_", " ").replace("-", " ")
    text = re.sub(r"\b(g)\s+(hz)\b", r"\1\2", text)
    text = re.sub(r"\bwi\s*fi\b", "wifi", text)
    text = re.sub(r"\bge\s*force\b", "geforce", text)
    text = remove_brand_words(text, brand)

    noise = [
        "microprocesador",
        "procesador",
        "processor",
        "motherboard",
        "mother board",
        "mother",
        "placa de video",
        "placa video",
        "placa",
        "video",
        "grafica",
        "tarjeta",
        "vga",
        "nvidia",
        "intel",
        "amd",
    ]
    for word in noise:
        text = re.sub(rf"\b{re.escape(word)}\b", " ", text)

    if category == "Microprocesadores":
        text = re.sub(r"\b(c|con)\s+cooler\b", " con cooler ", text)
        text = re.sub(r"\b(s|sin)\s+cooler\b", " sin cooler ", text)
        # Keep suffixes attached: 5600 g -> 5600g, 5600 x -> 5600x, 5600 gt -> 5600gt.
        text = re.sub(r"\b(\d{4,5})\s+(x3d|xt|gt|g|x|f|kf|k)\b", r"\1\2", text)

    text = clean_spaces(text)
    return title_model(text)


def source_index(name: str) -> str:
    match = re.match(r"^(\d+)[\s_.-]+", name.strip())
    return match.group(1) if match else ""


def is_ambiguous_processor(model: str) -> bool:
    raw = strip_accents(model).lower()
    has_amd_model = re.search(r"\b\d{4,5}(x3d|xt|gt|g|x|f|kf|k)?\b", raw)
    has_intel_model = re.search(r"\bi[3579][-\s]?\d{4,5}[a-z]*\b", raw)
    return not (has_amd_model or has_intel_model)


def disambiguate_model_if_needed(model: str, source_name: str, category: str) -> str:
    index = source_index(source_name)
    if category == "Microprocesadores" and index and is_ambiguous_processor(model):
        return clean_spaces(f"{model} {index}")
    return model


def dedupe_key(category: str, brand: str, model: str) -> str:
    if category == "Motherboard":
        return f"{category}|{brand}|{motherboard_key(model)}"
    key = slug(model)
    key = re.sub(r"\bcon-cooler\b", "c-cooler", key)
    key = re.sub(r"\bsin-cooler\b", "s-cooler", key)
    return f"{category}|{brand}|{key}"


def motherboard_key(model: str) -> str:
    raw = slug(model)
    tokens = [token for token in raw.split("-") if token]
    remove = {
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
    normalized: list[str] = []
    skip_next_lga_number = False
    for token in tokens:
        if skip_next_lga_number and re.fullmatch(r"\d{4}", token):
            skip_next_lga_number = False
            continue
        skip_next_lga_number = False
        if token == "lga":
            skip_next_lga_number = True
            continue
        if token in remove:
            continue
        normalized.append(token)
    return "-".join(sorted(normalized))


def image_sort_key(path: Path, category: str) -> tuple[int, str]:
    name = strip_accents(path.stem).lower()
    priority = 50
    if category == "Microprocesadores":
        if re.search(r"\b(1|box|caja|package|packaging)\b", name):
            priority = 0
        elif re.search(r"\b(cpu|processor|procesador|chip)\b", name):
            priority = 1
        elif re.search(r"\b(cooler|fan|wraith|ventilador)\b", name):
            priority = 2
    else:
        if name.startswith("1_") or re.match(r"^1[\s_.-]", name):
            priority = 0
        elif "box" in name or "caja" in name:
            priority = 1
    return (priority, name)


def find_images(folder: Path) -> list[Path]:
    return sorted(
        [
            p
            for p in folder.rglob("*")
            if p.is_file() and p.suffix.lower() in {".webp", ".jpg", ".jpeg", ".png", ".jfif"}
        ]
    )


def iter_product_folders() -> list[ProductFolder]:
    products: list[ProductFolder] = []
    for provider_dir in SOURCE.iterdir():
        if not provider_dir.is_dir():
            continue
        provider = provider_dir.name.upper()
        for category_dir in provider_dir.iterdir():
            if not category_dir.is_dir():
                continue
            category = normalize_category(category_dir.name)
            if not category:
                continue

            children = [p for p in category_dir.iterdir() if p.is_dir()]
            brand_like = [p for p in children if normalize_brand(p.name) != "GENERICO"]
            starts_as_brand_level = bool(brand_like) and len(brand_like) >= max(1, len(children) // 3)

            if starts_as_brand_level:
                for brand_dir in children:
                    brand_from_dir = normalize_brand(brand_dir.name)
                    if brand_from_dir == "GENERICO":
                        candidate_dirs = [brand_dir]
                    else:
                        candidate_dirs = [p for p in brand_dir.iterdir() if p.is_dir()] or [brand_dir]
                    for product_dir in candidate_dirs:
                        images = find_images(product_dir)
                        if not images:
                            continue
                        brand = brand_from_dir if brand_from_dir != "GENERICO" else normalize_brand(product_dir.name)
                        model = normalize_model_name(product_dir.name, category, brand)
                        model = disambiguate_model_if_needed(model, product_dir.name, category)
                        products.append(
                            ProductFolder(provider, category, brand, model, dedupe_key(category, brand, model), product_dir, images)
                        )
            else:
                for product_dir in children:
                    images = find_images(product_dir)
                    if not images:
                        continue
                    brand = normalize_brand(product_dir.name)
                    model = normalize_model_name(product_dir.name, category, brand)
                    model = disambiguate_model_if_needed(model, product_dir.name, category)
                    products.append(
                        ProductFolder(provider, category, brand, model, dedupe_key(category, brand, model), product_dir, images)
                    )
    for category_root, category, provider in EXTRA_CATEGORY_ROOTS:
        if not category_root.exists():
            continue
        for product_dir in category_root.iterdir():
            if not product_dir.is_dir():
                continue
            name = strip_accents(product_dir.name).lower()
            searchable_name = re.sub(r"[^a-z0-9]+", " ", name)
            if re.search(r"\b(cable|riser|soporte|holder)\b", searchable_name):
                continue
            if not re.search(r"\b(placa|video|vga|gpu|rtx|gtx|geforce|radeon|rx\d|nvidia)\b", searchable_name):
                continue
            images = find_images(product_dir)
            if not images:
                continue
            brand = normalize_brand(product_dir.name)
            model = normalize_model_name(product_dir.name, category, brand)
            products.append(
                ProductFolder(provider, category, brand, model, dedupe_key(category, brand, model), product_dir, images)
            )
    return sorted(products, key=lambda p: (PROVIDER_PRIORITY.get(p.provider, 99), p.category, p.brand, p.model))


def render_square_webp(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGBA")
        image.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (1000, 1000), (255, 255, 255, 255))
        left = (1000 - image.width) // 2
        top = (1000 - image.height) // 2
        canvas.alpha_composite(image, (left, top))
        canvas.convert("RGB").save(target, "WEBP", quality=86, method=6)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--clean-output", action="store_true")
    args = parser.parse_args()

    if args.clean_output and OUTPUT.exists() and not args.dry_run:
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir(parents=True, exist_ok=True)

    products = iter_product_folders()
    seen: dict[str, ProductFolder] = {}
    rows: list[dict[str, str | int]] = []
    summary: dict[str, dict[str, int]] = {}

    for product in products:
        duplicate_of = seen.get(product.key)
        is_duplicate = duplicate_of is not None
        if not is_duplicate:
            seen[product.key] = product

        if is_duplicate:
            base = OUTPUT / "DUPLICADOS" / product.category / product.brand / product.model
        else:
            base = OUTPUT / product.category / product.brand / product.model
        sorted_images = sorted(product.images, key=lambda p: image_sort_key(p, product.category))
        model_slug = slug(product.model)

        if not args.dry_run:
            for index, image in enumerate(sorted_images, start=1):
                suffix = "" if len(sorted_images) == 1 else f"_{index:02d}"
                render_square_webp(image, base / f"{model_slug}{suffix}.webp")

        status = "DUPLICADO" if is_duplicate else "ACTIVO"
        summary.setdefault(product.category, {"activos": 0, "duplicados": 0, "imagenes": 0})
        summary[product.category]["duplicados" if is_duplicate else "activos"] += 1
        summary[product.category]["imagenes"] += len(sorted_images)
        rows.append(
            {
                "estado": status,
                "proveedor": product.provider,
                "categoria": product.category,
                "marca": product.brand,
                "modelo": product.model,
                "clave": product.key,
                "imagenes": len(sorted_images),
                "origen": str(product.source),
                "destino": str(base),
                "duplicado_de": duplicate_of.provider if duplicate_of else "",
                "modelo_duplicado_de": duplicate_of.model if duplicate_of else "",
            }
        )

    if not args.dry_run:
        report = OUTPUT / "REPORT_normalizacion.csv"
        with report.open("w", newline="", encoding="utf-8-sig") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()) if rows else [])
            writer.writeheader()
            writer.writerows(rows)
        (OUTPUT / "REPORT_resumen.json").write_text(
            json.dumps({"source": str(SOURCE), "output": str(OUTPUT), "summary": summary}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    print(json.dumps({"productos": len(products), "unicos": len(seen), "duplicados": len(products) - len(seen), "summary": summary}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
