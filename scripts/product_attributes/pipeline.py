import atexit
import json
import subprocess
import threading
from pathlib import Path
from typing import Any

from .models import AttributeNormalizationResult, ParsedAttribute


REPO_ROOT = Path(__file__).resolve().parents[2]
BRIDGE_SCRIPT = REPO_ROOT / "scripts" / "product-attributes-cli.mjs"
_lock = threading.Lock()
_process: subprocess.Popen[str] | None = None


def _bridge() -> subprocess.Popen[str]:
    global _process
    if _process is None or _process.poll() is not None:
        _process = subprocess.Popen(
            ["node", str(BRIDGE_SCRIPT)],
            cwd=REPO_ROOT,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            bufsize=1,
        )
    return _process


def _close_bridge() -> None:
    global _process
    if _process and _process.poll() is None:
        _process.terminate()
    _process = None


atexit.register(_close_bridge)


def normalize_product_attributes(raw_attributes: Any, category: str, subcategory: str = "") -> AttributeNormalizationResult:
    """Use the same canonical JavaScript normalizer consumed by the Next.js LAB."""
    payload = json.dumps(
        {
            "rawAttributes": "" if raw_attributes is None else str(raw_attributes),
            "category": category,
            "subcategory": subcategory,
        },
        ensure_ascii=False,
    )
    with _lock:
        process = _bridge()
        assert process.stdin is not None and process.stdout is not None
        process.stdin.write(payload + "\n")
        process.stdin.flush()
        response_line = process.stdout.readline()
    if not response_line:
        stderr = process.stderr.read() if process.stderr else ""
        raise RuntimeError(f"Attribute normalizer bridge stopped unexpectedly. {stderr}".strip())
    response = json.loads(response_line)
    if response.get("error"):
        raise RuntimeError(response["error"])
    return AttributeNormalizationResult(
        raw_attributes=response["rawAttributes"],
        normalized_specs=response["normalizedSpecs"],
        serialized_attributes=response["serializedAttributes"],
        normalization_status=response["normalizationStatus"],
        schema=response.get("schema"),
        conflicts=response.get("conflicts", {}),
        unknown_attributes=[ParsedAttribute(**item) for item in response.get("unknownAttributes", [])],
        validation_errors=response.get("validationErrors", []),
    )
