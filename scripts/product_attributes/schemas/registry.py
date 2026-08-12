from ..models import AttributeSchema
from ..normalization.common import normalize_key
from .cpu import CPU_SCHEMA
from .memory import MEMORY_SCHEMA
from .motherboard import MOTHERBOARD_SCHEMA


def resolve_schema(category: str, subcategory: str) -> AttributeSchema | None:
    taxonomy = normalize_key(f"{category} {subcategory}")
    taxonomy_words = set(taxonomy.split())
    if "cpu" in taxonomy_words or any(token in taxonomy for token in ("procesador", "procesadores")):
        return CPU_SCHEMA
    if any(token in taxonomy for token in ("motherboard", "motherboards", "placa madre")):
        return MOTHERBOARD_SCHEMA
    if any(token in taxonomy for token in ("memorias pc", "memoria pc", "ram pc")):
        return MEMORY_SCHEMA
    return None
