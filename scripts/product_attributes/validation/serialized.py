from ..models import ValidationResult
from ..normalization.common import normalize_key


def validate_serialized_attributes(
    value: str,
    conflicts: dict[str, list[str]] | None = None,
) -> ValidationResult:
    errors: list[str] = []
    raw = str(value or "").strip()
    if not raw:
        errors.append("empty_string")
        return ValidationResult(valid=False, errors=errors)
    if raw.startswith("|"):
        errors.append("leading_separator")
    if raw.endswith("|"):
        errors.append("trailing_separator")
    if "||" in raw:
        errors.append("empty_segment")
    lowered = raw.casefold()
    if "undefined" in lowered:
        errors.append("undefined_value")
    if "null" in lowered:
        errors.append("null_value")

    seen: set[str] = set()
    for index, segment in enumerate(raw.split("|")):
        if not segment.strip():
            errors.append(f"empty_segment:{index}")
            continue
        if ":" not in segment:
            errors.append(f"invalid_segment:{index}")
            continue
        key, value_part = segment.split(":", 1)
        normalized_key = normalize_key(key)
        if not normalized_key or not value_part.strip():
            errors.append(f"invalid_segment:{index}")
        if normalized_key in seen:
            errors.append(f"duplicate_key:{normalized_key}")
        seen.add(normalized_key)

    for key in (conflicts or {}):
        errors.append(f"conflict:{key}")
    return ValidationResult(valid=not errors, errors=list(dict.fromkeys(errors)))
