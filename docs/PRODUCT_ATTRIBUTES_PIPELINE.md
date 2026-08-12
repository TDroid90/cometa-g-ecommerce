# Product Attributes Pipeline

## Purpose

`PRODUCTOS.atributos` (Google Sheets column S) remains a string with this contract:

```text
Etiqueta:Valor|Etiqueta:Valor
```

The storefront depends on that contract. This pipeline normalizes supplier data before the `PRODUCTOS` write; it does not use Sheet formulas or frontend cleanup.

## Previous flow

The catalog update is orchestrated by `scripts/import-catalogs-to-sheets.py`:

1. ELIT is read from its API or CSV.
2. NB is read from its API or CSV fallback.
3. INVID is read from its API or normalized local cache.
4. Each supplier is converted to the positional `OUTPUT_COLUMNS` format.
5. NB and ELIT are consolidated by `consolidate_public_catalog()`.
6. `products_for_store_with_markup()` converts consolidated rows to `ECOMMERCE_PRODUCT_COLUMNS`.
7. Existing manual edits from `PRODUCTOS` are restored by `apply_product_overrides()`.
8. `replace_existing_values()` writes the final rows to `PRODUCTOS`.

Column S was previously assembled in supplier adapters and passed through a small `normalize_attributes()` helper that only split HTML, newlines, pipes and semicolons. It did not understand aliases, normalize values, report conflicts, or guarantee a valid final string.

## New flow

```text
Raw supplier attributes
  -> generic parser
  -> category schema and aliases
  -> deterministic value normalization
  -> structured technical object
  -> conflict and format validation
  -> ordered serializer
  -> PRODUCTOS column S
```

The canonical entrypoint is now shared by the Next.js backend and the importer:

```text
src/lib/productAttributes.mjs -> normalizeProductAttributes(...)
```

The Python importer keeps `normalize_product_attributes(...)` as its public interface, but delegates each request to a persistent Node bridge. This prevents the administrative LAB and catalog import from drifting into two implementations.

It returns an `AttributeNormalizationResult` containing:

- `raw_attributes`
- `normalized_specs`
- `serialized_attributes`
- `normalization_status`
- `schema`
- `conflicts`
- `unknown_attributes`
- `validation_errors`

The importer applies it in every supplier adapter, once again when creating storefront rows, and to preserved manual attribute edits. This final defensive pass runs before the Sheet write.

## Modules

```text
scripts/product_attributes/
  models.py
  pipeline.py
  parsers/generic.py
  normalization/common.py
  schemas/cpu.py
  schemas/motherboard.py
  schemas/memory.py
  schemas/registry.py
  serialization/attributes.py
  validation/serialized.py

src/lib/productAttributes.mjs
scripts/product-attributes-cli.mjs
```

## Schemas and ordering

V1 has explicit schemas for:

- Procesadores (`cpu_v1`)
- Motherboards (`motherboard_v1`)
- Memorias PC (`memory_pc_v1`)

The CPU serializer follows the requested fixed order from Marca through Litografía and omits null fields. Motherboard and memory schemas establish the same ordered-definition pattern for their initial technical fields.

## Aliases

Aliases belong to an `AttributeDefinition` inside a category schema. They are normalized for case, accents and punctuation before matching. This keeps mappings category-aware and avoids blind global replacements.

To add an alias, append it to the relevant definition:

```python
AttributeDefinition(
    "socket",
    "Socket",
    ("socket", "cpu socket", "socket de cpu", "new supplier key"),
    "socket",
)
```

## Value normalization

Shared deterministic normalizers cover:

- sockets (`AM 5` -> `AM5`, `FCLGA1700` -> `LGA1700`)
- memory types (`DDR 5 DRAM` -> `DDR5`)
- form factors (`Micro-ATX`, `mATX` -> `MATX`)
- booleans in Spanish and English
- integers and units for GHz, MB, MT/s, W, nm and PCIe

No missing technical data is inferred.

## Serialization and validation

Serializers produce only non-empty `Etiqueta:Valor` segments joined by one `|`. They prevent leading/trailing separators, `||`, duplicate keys, empty values, `null` and `undefined`.

`validate_serialized_attributes()` reports malformed segments, duplicate keys, forbidden values and known normalization conflicts.

## Duplicates and conflicts

Aliases with the same normalized value collapse into one field.

Aliases with different values do not overwrite one another. The result receives status `conflict`, retains all values in `conflicts`, serializes them visibly for debugging, and records a validation error such as `conflict:socket`.

## Statuses

- `normalized`: recognized schema fields were normalized without leftovers.
- `partial`: recognized fields were normalized and safe unrecognized fields were preserved.
- `legacy`: no supported schema or no safe structured fields were found.
- `conflict`: aliases for one canonical field supplied different values.

## Legacy fallback

Unsupported categories keep a cleaned, pipe-delimited legacy representation. If the source contains no usable attribute, the non-empty fallback is:

```text
Información técnica:No disponible
```

This iteration does not backfill the current Sheet. Existing products will be processed by the normal catalog update after deployment.

## Adding a category

1. Add a schema under `scripts/product_attributes/schemas/`.
2. Define ordered canonical fields, labels, aliases and normalizer types.
3. Register taxonomy matching in `schemas/registry.py`.
4. Add representative normalization, duplicate, conflict and fallback tests.
5. Run `npm run test:attributes` and `npm run build`.

## Frontend compatibility

`src/lib/googleSheets.ts` still parses the column S string with `parseKeyValue()`, and the product page still renders the resulting key/value object. No frontend contract changed.
