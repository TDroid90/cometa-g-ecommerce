import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = REPO_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))
SPEC = importlib.util.spec_from_file_location(
    "catalog_import",
    SCRIPTS_DIR / "import-catalogs-to-sheets.py",
)
catalog_import = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(catalog_import)


def provider_row(provider: str, code: str, sku: str, name: str) -> list[str]:
    return [
        provider,
        code,
        sku,
        name,
        "Hardware",
        "Procesadores",
        "AMD",
        "100",
        "153500",
        "",
        "USD",
        "5",
        "disponible",
        "12 meses",
        "https://example.com/product.jpg",
        "",
        "Socket:AM5",
        "",
        "",
        "",
        "",
        "TRUE",
        "2026-08-31 10:00:00",
        "FALSE",
    ]


class CatalogImportTests(unittest.TestCase):
    def test_store_products_are_visible_by_default(self):
        source = [provider_row("INVID", "invid-1", "INVID-SKU", "Procesador INVID")]
        consolidated, _ = catalog_import.consolidate_public_catalog([], [], source)

        products = catalog_import.products_for_store(consolidated)
        visible_index = catalog_import.ECOMMERCE_PRODUCT_COLUMNS.index("visible")

        self.assertEqual(products[0][visible_index], "TRUE")

    def test_menu_visibility_is_preserved_during_rebuild(self):
        product = [""] * len(catalog_import.ECOMMERCE_PRODUCT_COLUMNS)
        indexes = {
            column: index
            for index, column in enumerate(catalog_import.ECOMMERCE_PRODUCT_COLUMNS)
        }
        product[indexes["id"]] = "test-1"
        product[indexes["categoria"]] = "Seguridad"
        product[indexes["subcategoria"]] = "Camaras IP"
        product[indexes["imagen_principal"]] = "https://example.com/product.jpg"
        product[indexes["stock"]] = "5"
        product[indexes["visible"]] = "TRUE"
        settings = {
            catalog_import.menu_markup_key("Seguridad", "Camaras IP"): {
                "normal": "1.5",
                "offer": "1.5",
                "visible": "FALSE",
            }
        }

        rows = catalog_import.build_menu_rows([product], settings)

        self.assertEqual(rows[0][5], "FALSE")
        self.assertEqual(rows[0][6], "1.5")

    def test_new_subcategory_inherits_fully_hidden_category(self):
        settings = {
            catalog_import.menu_markup_key("Electro", "Cocina"): {"visible": "FALSE"},
            catalog_import.menu_markup_key("Electro", "Limpieza"): {"visible": "FALSE"},
        }

        visible = catalog_import.menu_visibility_for(settings, "Electro", "Nuevo proveedor")

        self.assertEqual(visible, "FALSE")

    def test_provider_taxonomies_map_to_public_catalog(self):
        cases = {
            ("Discos Rígidos / Ssd", "Disco SSD M2"): ("Almacenamiento", "Discos Internos SSD"),
            ("Memoria Sodimm", "Ddr5"): ("Memorias", "Memorias Notebook"),
            ("Memorias Ram", "Memoria Ddr4"): ("Memorias", "Memorias PC"),
            ("Microprocesadores", "Amd"): ("Hardware", "Procesadores"),
            ("Mothers", "Plataforma Intel"): ("Hardware", "Motherboards"),
            ("Placas De Video", "Línea Nvidia Geforce"): ("Hardware", "Placas de Video"),
        }

        for source, expected in cases.items():
            with self.subTest(source=source):
                self.assertEqual(catalog_import.normalize_category(*source), expected)

    def test_unknown_and_consumable_categories_are_rejected(self):
        self.assertEqual(
            catalog_import.should_reject_normalized("Categoria inventada", "DDR7", "Producto", "Marca"),
            "taxonomia no permitida",
        )
        self.assertEqual(
            catalog_import.should_reject_normalized("Consumibles", "Consumibles Hp", "Cartucho", "HP"),
            "tintas/insumos impresion",
        )

    def test_printer_filter_does_not_reject_product_descriptions_with_generic_words(self):
        accepted = [
            "Auricular Logitech G335 Mint",
            "Auricular JBL Endurance Dive",
            "Parlante Bluetooth 12W Cilindro RGB",
            "Mouse HyperX Pulsefire Haste 2 Mini White",
        ]

        for name in accepted:
            with self.subTest(name=name):
                self.assertEqual(catalog_import.should_reject("Perifericos", "", name), "")

        self.assertEqual(
            catalog_import.should_reject("Consumibles", "Impresion", "Cartucho de tinta HP"),
            "tintas/insumos impresion",
        )
        self.assertEqual(
            catalog_import.should_reject("Consumibles", "", "Cilindro Laserjet"),
            "tintas/insumos impresion",
        )

    def test_uncategorized_hubs_and_notebook_supports_are_recategorized(self):
        self.assertEqual(
            catalog_import.recategorize_product("", "Varios", "Hub Genius UH-500 5 en 1", "GENIUS"),
            ("Conectividad", "Hubs"),
        )
        self.assertEqual(
            catalog_import.recategorize_product("", "Varios", "Soporte de Notebook Genius M-200", "GENIUS"),
            ("Perifericos", "Bases Notebook"),
        )

    def test_menu_settings_reader_includes_visibility(self):
        original_values_get = catalog_import.values_get
        catalog_import.values_get = lambda _service, _range: [
            catalog_import.MENU_COLUMNS,
            ["Seguridad", "Camaras IP", "10", "/productos", "130", "FALSE", "1.5", "1.5"],
        ]
        try:
            settings = catalog_import.read_menu_settings(object(), "MENU_CAT_MAR")
        finally:
            catalog_import.values_get = original_values_get

        key = catalog_import.menu_markup_key("Seguridad", "Camaras IP")
        self.assertEqual(settings[key]["visible"], "FALSE")

    def test_invid_unique_products_reach_public_catalog(self):
        nb = [provider_row("NB", "nb-1", "DUPLICATE-SKU", "Procesador compartido")]
        elit = [provider_row("ELIT", "elit-1", "ELIT-SKU", "Procesador ELIT")]
        invid = [
            provider_row("INVID", "invid-duplicate", "DUPLICATE-SKU", "Procesador compartido"),
            provider_row("INVID", "invid-unique", "INVID-SKU", "Procesador INVID"),
        ]

        public_rows, _ = catalog_import.consolidate_public_catalog(nb, elit, invid)
        providers_by_sku = {row[3]: row[1] for row in public_rows}

        self.assertEqual(providers_by_sku["DUPLICATE-SKU"], "NB")
        self.assertEqual(providers_by_sku["ELIT-SKU"], "ELIT")
        self.assertEqual(providers_by_sku["INVID-SKU"], "INVID")

    def test_catalog_cache_is_replaced_and_can_be_read_back(self):
        row = provider_row("INVID", "invid-1", "INVID-SKU", "Procesador INVID")
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "catalogo_invid_normalizado.csv"
            catalog_import.write_catalog_cache(
                path,
                catalog_import.OUTPUT_COLUMNS,
                [row],
            )

            cached_rows = catalog_import.read_normalized_catalog(path)

        self.assertEqual(len(cached_rows), 1)
        self.assertEqual(cached_rows[0][0], "INVID")
        self.assertEqual(cached_rows[0][2], "INVID-SKU")

    def test_provider_sheet_can_be_used_as_remote_source_fallback(self):
        source_row = provider_row("ELIT", "elit-1", "ELIT-SKU", "Procesador ELIT")
        original_values_get = catalog_import.values_get
        catalog_import.values_get = lambda _service, _range: [
            catalog_import.OUTPUT_COLUMNS,
            source_row,
        ]
        try:
            rows = catalog_import.read_normalized_sheet_catalog(object(), "CATALOGO_ELIT")
        finally:
            catalog_import.values_get = original_values_get

        self.assertEqual(rows, [source_row])


if __name__ == "__main__":
    unittest.main()
