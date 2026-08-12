import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def source(path: str) -> str:
    return (REPO_ROOT / path).read_text(encoding="utf-8")


class AdminDashboardContractTests(unittest.TestCase):
    def test_legacy_products_route_redirects_to_dashboard(self):
        page = source("src/app/admin/productos/page.tsx")
        self.assertIn('redirect("/admin/dashboard/productos")', page)

    def test_admin_routes_use_existing_secret_verifier(self):
        routes = (
            "src/app/api/admin/session/route.ts",
            "src/app/api/admin/lab/products/route.ts",
            "src/app/api/admin/lab/attributes/normalize/route.ts",
        )
        for route in routes:
            with self.subTest(route=route):
                route_source = source(route)
                self.assertIn('from "@/lib/adminAuth"', route_source)
                self.assertIn("verifyAdminSecret(request)", route_source)

    def test_lab_normalize_route_is_read_only(self):
        route = source("src/app/api/admin/lab/attributes/normalize/route.ts")
        forbidden_writes = (
            "appendSheetRow",
            "updateSheetRow",
            "replaceSheet",
            "values_update",
            'method: "PATCH"',
        )
        for operation in forbidden_writes:
            with self.subTest(operation=operation):
                self.assertNotIn(operation, route)
        self.assertIn('mode: "dry-run"', route)
        self.assertIn("normalizeProductAttributes", route)

    def test_lab_loads_real_products_from_productos_reader(self):
        route = source("src/app/api/admin/lab/products/route.ts")
        reader = source("src/lib/adminProducts.ts")
        self.assertIn("readAdminProductsSheet", route)
        self.assertIn('process.env.GOOGLE_SHEETS_PRODUCTOS_NAME || "PRODUCTOS"', reader)

    def test_python_importer_delegates_to_shared_normalizer(self):
        pipeline = source("scripts/product_attributes/pipeline.py")
        bridge = source("scripts/product-attributes-cli.mjs")
        self.assertIn("product-attributes-cli.mjs", pipeline)
        self.assertIn("normalizeProductAttributes", bridge)


if __name__ == "__main__":
    unittest.main()
