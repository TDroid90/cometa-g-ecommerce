import unittest

from scripts.product_attributes import normalize_product_attributes, validate_serialized_attributes


class ProductAttributesPipelineTests(unittest.TestCase):
    def normalize_cpu(self, raw: str):
        return normalize_product_attributes(raw, "Hardware", "Procesadores")

    def test_cpu_prose_is_normalized_in_schema_order(self):
        result = self.normalize_cpu(
            "Arquitectura: ZEN 4. Familia: Ryzen 5. Socket: AM5. "
            "Núcleos totales: 6. Hilos totales: 12. TDP: 65W."
        )

        self.assertEqual(
            result.serialized_attributes,
            "Arquitectura:Zen 4|Familia:Ryzen 5|Socket:AM5|Núcleos:6|Hilos:12|TDP:65 W",
        )
        self.assertEqual(result.normalization_status, "normalized")

    def test_duplicate_aliases_collapse_to_one_attribute(self):
        result = self.normalize_cpu(
            "Socket:AM5|CPU Socket Type:Socket AM5|Tipo de RAM:DDR5"
        )

        self.assertEqual(
            result.serialized_attributes,
            "Socket:AM5|Tipo de memoria RAM:DDR5",
        )
        self.assertEqual(result.normalization_status, "normalized")

    def test_empty_segments_are_removed(self):
        result = self.normalize_cpu("Socket:AM5||Tipo RAM:DDR5|")

        self.assertEqual(
            result.serialized_attributes,
            "Socket:AM5|Tipo de memoria RAM:DDR5",
        )
        self.assertTrue(validate_serialized_attributes(result.serialized_attributes).valid)

    def test_conflicting_aliases_are_reported_without_silent_overwrite(self):
        result = self.normalize_cpu("Socket:AM4|CPU Socket:AM5")

        self.assertEqual(result.normalization_status, "conflict")
        self.assertEqual(result.conflicts["socket"], ["AM4", "AM5"])
        self.assertEqual(result.serialized_attributes, "Socket:AM4 / AM5")
        self.assertIn("conflict:socket", result.validation_errors)

    def test_unlabelled_cpu_values_are_extracted_safely(self):
        result = self.normalize_cpu("Socket AM 5 / DDR 5")

        self.assertEqual(
            result.serialized_attributes,
            "Socket:AM5|Tipo de memoria RAM:DDR5",
        )

    def test_unsupported_category_uses_non_empty_legacy_fallback(self):
        result = normalize_product_attributes(
            "Conexión:USB|Compatibilidad:Windows",
            "Periféricos",
            "Mouses",
        )

        self.assertEqual(result.normalization_status, "legacy")
        self.assertEqual(result.serialized_attributes, "Conexión:USB|Compatibilidad:Windows")

    def test_motherboard_aliases_and_values_are_normalized(self):
        result = normalize_product_attributes(
            "CPU Socket Type:Socket AM 5|Form Factor:Micro-ATX|Memory Types:DDR 5",
            "Hardware",
            "Motherboards",
        )

        self.assertEqual(
            result.serialized_attributes,
            "Socket:AM5|Formato:MATX|Tipo de memoria RAM:DDR5",
        )
        self.assertEqual(result.schema, "motherboard_v1")

    def test_memory_pc_schema_normalizes_speed_and_boolean(self):
        result = normalize_product_attributes(
            "Memory Type:DDR5 DRAM|Bus:6000 MT/s|RGB:Yes",
            "Hardware",
            "Memorias PC",
        )

        self.assertEqual(
            result.serialized_attributes,
            "Tipo de memoria RAM:DDR5|Velocidad:6000 MT/s|RGB:Sí",
        )
        self.assertEqual(result.schema, "memory_pc_v1")

    def test_null_and_undefined_are_never_serialized(self):
        result = normalize_product_attributes(
            "Socket:null|Dato:undefined",
            "Periféricos",
            "Accesorios",
        )

        self.assertEqual(result.serialized_attributes, "Información técnica:No disponible")
        self.assertNotIn("null", result.serialized_attributes.casefold())
        self.assertNotIn("undefined", result.serialized_attributes.casefold())


if __name__ == "__main__":
    unittest.main()
