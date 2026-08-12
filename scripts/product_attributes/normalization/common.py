import re
import unicodedata
from typing import Any


TRUE_VALUES = {"1", "si", "sí", "yes", "true", "verdadero", "incluido", "incluye"}
FALSE_VALUES = {"0", "no", "false", "falso", "sin", "no incluido", "no incluye"}


def normalize_key(value: Any) -> str:
    text = unicodedata.normalize("NFD", str(value or "").strip().casefold())
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.replace("#", " cantidad ")
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def clean_text(value: Any) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip(" .;|:-")
    return text


def _first_number(value: Any) -> float | None:
    match = re.search(r"-?\d+(?:[.,]\d+)?", clean_text(value))
    return float(match.group(0).replace(",", ".")) if match else None


def _number_text(value: float | int) -> str:
    return str(int(value)) if float(value).is_integer() else f"{value:g}"


def normalize_boolean(value: Any) -> bool | None:
    normalized = normalize_key(value)
    if normalized in {normalize_key(item) for item in TRUE_VALUES}:
        return True
    if normalized in {normalize_key(item) for item in FALSE_VALUES}:
        return False
    return None


def normalize_socket(value: Any) -> str:
    text = clean_text(value).upper().replace("SOCKET", " ").replace("ZÓCALO", " ").replace("ZOCALO", " ")
    match = re.search(r"(?:FC)?LGA\s*-?\s*(\d{3,5})", text)
    if match:
        return f"LGA{match.group(1)}"
    match = re.search(r"\b(AM|FM|TR|SP)\s*-?\s*(\d+)\b", text)
    if match:
        return f"{match.group(1)}{match.group(2)}"
    return re.sub(r"\s+", "", text).strip("-/")


def normalize_memory_types(value: Any) -> list[str]:
    matches = re.findall(r"\b(?:LP)?DDR\s*-?\s*\d\b", clean_text(value).upper())
    normalized = [re.sub(r"[\s-]+", "", item) for item in matches]
    return list(dict.fromkeys(normalized))


def normalize_form_factor(value: Any) -> str:
    normalized = normalize_key(value)
    aliases = {
        "micro atx": "MATX",
        "m atx": "MATX",
        "matx": "MATX",
        "mini itx": "Mini-ITX",
        "mitx": "Mini-ITX",
        "atx": "ATX",
        "eatx": "E-ATX",
        "e atx": "E-ATX",
    }
    return aliases.get(normalized, clean_text(value))


def normalize_title(value: Any) -> str:
    text = clean_text(value)
    if not text:
        return ""
    words = []
    for word in text.split():
        upper = word.upper()
        if upper in {"AMD", "INTEL", "DDR3", "DDR4", "DDR5", "PCI", "PCIE"}:
            words.append(upper.replace("PCIE", "PCIe"))
        elif upper == "ZEN":
            words.append("Zen")
        else:
            words.append(word[:1].upper() + word[1:].lower())
    return " ".join(words)


def normalize_value(kind: str, value: Any) -> Any:
    text = clean_text(value)
    if not text:
        return None
    if kind == "socket":
        return normalize_socket(text) or None
    if kind == "memory_types":
        return normalize_memory_types(text) or None
    if kind == "form_factor":
        return normalize_form_factor(text) or None
    if kind == "boolean":
        return normalize_boolean(text)
    if kind == "integer":
        number = _first_number(text)
        return int(number) if number is not None else None
    if kind in {"ghz", "mb", "nm", "pcie"}:
        return _first_number(text)
    if kind == "mts":
        number = _first_number(text)
        return int(number) if number is not None else None
    if kind == "watts":
        number = _first_number(text)
        return int(number) if number is not None else None
    if kind == "title":
        return normalize_title(text)
    return text


def display_value(kind: str, value: Any) -> str:
    if isinstance(value, bool):
        return "Sí" if value else "No"
    if isinstance(value, list):
        return ", ".join(str(item) for item in value)
    if kind == "ghz":
        return f"{_number_text(value)} GHz"
    if kind == "mb":
        return f"{_number_text(value)} MB"
    if kind == "mts":
        return f"{_number_text(value)} MT/s"
    if kind == "pcie":
        return f"PCIe {_number_text(value)}"
    if kind == "watts":
        return f"{_number_text(value)} W"
    if kind == "nm":
        return f"{_number_text(value)} nm"
    return clean_text(value)
