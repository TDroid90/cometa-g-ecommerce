from typing import Any

from ..models import AttributeSchema, ValidationResult


def validate_normalized_specs(
    schema: AttributeSchema,
    specs: dict[str, Any],
    conflicts: dict[str, list[str]] | None = None,
) -> ValidationResult:
    errors: list[str] = []
    known_keys = {definition.key for definition in schema.definitions}

    for key, value in specs.items():
        if key not in known_keys:
            errors.append(f"unknown_spec:{key}")
        if value is None or value == "" or value == []:
            errors.append(f"empty_spec:{key}")

    for key, values in (conflicts or {}).items():
        if key not in known_keys:
            errors.append(f"unknown_conflict:{key}")
        if len(values) < 2:
            errors.append(f"invalid_conflict:{key}")
        else:
            errors.append(f"conflict:{key}")

    return ValidationResult(valid=not errors, errors=list(dict.fromkeys(errors)))
