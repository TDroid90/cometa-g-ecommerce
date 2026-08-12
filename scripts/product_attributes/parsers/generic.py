import re
from html import unescape
from typing import Any

from ..models import ParsedAttribute


PLACEHOLDERS = {"", "sin descripcion", "sin descripción", "n/a", "na", "null", "undefined", "-"}


def clean_raw_text(value: Any) -> str:
    text = unescape(str(value or "")).strip()
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</(p|tr|li|div|table)>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"[ \t]+", " ", text).strip()


def parse_attribute_text(value: Any) -> list[ParsedAttribute]:
    text = clean_raw_text(value)
    if text.casefold() in PLACEHOLDERS:
        return []

    # Provider prose frequently separates key/value pairs with full stops.
    text = re.sub(r"\.\s+(?=[^:|;\r\n]{1,80}:)", "|", text)
    parts = re.split(r"[|;\r\n]+", text)
    attributes: list[ParsedAttribute] = []
    for part in parts:
        part = re.sub(r"\s+", " ", part).strip(" .|;-")
        if ":" not in part:
            continue
        key, raw_value = part.split(":", 1)
        key = re.sub(r"\s+", " ", key).strip(" .|;-")
        raw_value = re.sub(r"\s+", " ", raw_value).strip(" .|;-")
        if not key or not raw_value or raw_value.casefold() in PLACEHOLDERS:
            continue
        attributes.append(ParsedAttribute(key=key, value=raw_value))
    return attributes
