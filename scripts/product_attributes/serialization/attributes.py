import re
from typing import Any

from ..models import AttributeSchema, ParsedAttribute
from ..normalization.common import clean_text, display_value, normalize_key
from ..parsers.generic import clean_raw_text, parse_attribute_text
from ..schemas.cpu import CPU_SCHEMA


def _segment(label: str, value: str) -> str:
    safe_label = clean_text(label).replace("|", "/").replace(":", "-")
    safe_value = clean_text(value).replace("|", "/")
    if re.search(r"\b(?:null|undefined)\b", f"{safe_label} {safe_value}", flags=re.I):
        return ""
    return f"{safe_label}:{safe_value}" if safe_label and safe_value else ""


def serialize_attributes(
    schema: AttributeSchema,
    specs: dict[str, Any],
    conflicts: dict[str, list[str]] | None = None,
    unknown_attributes: list[ParsedAttribute] | None = None,
) -> str:
    conflicts = conflicts or {}
    pieces: list[str] = []
    seen_labels: set[str] = set()

    for definition in schema.definitions:
        values = conflicts.get(definition.key)
        if values:
            rendered = " / ".join(dict.fromkeys(values))
        else:
            value = specs.get(definition.key)
            if value is None or value == "" or value == []:
                continue
            rendered = display_value(definition.normalizer, value)
        segment = _segment(definition.label, rendered)
        if segment:
            pieces.append(segment)
            seen_labels.add(normalize_key(definition.label))

    for attribute in unknown_attributes or []:
        label_key = normalize_key(attribute.key)
        if not label_key or label_key in seen_labels:
            continue
        segment = _segment(attribute.key, attribute.value)
        if segment:
            pieces.append(segment)
            seen_labels.add(label_key)

    return "|".join(pieces)


def serialize_cpu_attributes(
    specs: dict[str, Any],
    conflicts: dict[str, list[str]] | None = None,
    unknown_attributes: list[ParsedAttribute] | None = None,
) -> str:
    return serialize_attributes(CPU_SCHEMA, specs, conflicts, unknown_attributes)


def serialize_legacy_attributes(raw_attributes: str) -> str:
    parsed = parse_attribute_text(raw_attributes)
    pieces: list[str] = []
    seen: dict[str, str] = {}
    for attribute in parsed:
        key = normalize_key(attribute.key)
        value = clean_text(attribute.value)
        if not key or not value:
            continue
        if key in seen:
            if seen[key] == value:
                continue
            continue
        seen[key] = value
        segment = _segment(attribute.key, value)
        if segment:
            pieces.append(segment)

    if pieces:
        return "|".join(pieces)

    if ":" in clean_raw_text(raw_attributes):
        return "Información técnica:No disponible"

    text = re.sub(r"\b(?:null|undefined)\b", "", clean_raw_text(raw_attributes), flags=re.I)
    text = re.sub(r"\s+", " ", text).strip(" .|;:-")
    if not text or normalize_key(text) in {"sin descripcion", "n a", "na", "null", "undefined"}:
        return "Información técnica:No disponible"
    return _segment("Descripción técnica", text[:500])
