from dataclasses import dataclass, field
from typing import Any, Literal, TypedDict


NormalizationStatus = Literal["normalized", "partial", "legacy", "conflict"]


class CpuTechnicalSpecs(TypedDict, total=False):
    brand: str | None
    model: str | None
    architecture: str | None
    family: str | None
    socket: str | None
    cores: int | None
    threads: int | None
    base_clock_ghz: float | None
    boost_clock_ghz: float | None
    cache_l3_mb: float | None
    memory_types: list[str]
    max_memory_speed_mts: int | None
    pcie_version: float | None
    integrated_gpu: bool | None
    integrated_gpu_model: str | None
    cooler_included: bool | None
    tdp_w: int | None
    lithography_nm: float | None


@dataclass(frozen=True)
class ParsedAttribute:
    key: str
    value: str


@dataclass(frozen=True)
class AttributeDefinition:
    key: str
    label: str
    aliases: tuple[str, ...]
    normalizer: str = "text"


@dataclass(frozen=True)
class AttributeSchema:
    name: str
    definitions: tuple[AttributeDefinition, ...]


@dataclass
class ValidationResult:
    valid: bool
    errors: list[str] = field(default_factory=list)


@dataclass
class AttributeNormalizationResult:
    raw_attributes: str
    normalized_specs: dict[str, Any]
    serialized_attributes: str
    normalization_status: NormalizationStatus
    schema: str | None = None
    conflicts: dict[str, list[str]] = field(default_factory=dict)
    unknown_attributes: list[ParsedAttribute] = field(default_factory=list)
    validation_errors: list[str] = field(default_factory=list)
