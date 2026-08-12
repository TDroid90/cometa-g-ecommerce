declare module "@/lib/productAttributes.mjs" {
  export type NormalizationStatus = "normalized" | "partial" | "legacy" | "conflict";
  export type ParsedAttribute = { key: string; value: string };
  export type AttributeNormalizationResult = {
    rawAttributes: string;
    normalizedSpecs: Record<string, unknown>;
    serializedAttributes: string;
    normalizationStatus: NormalizationStatus;
    schema: string | null;
    conflicts: Record<string, string[]>;
    unknownAttributes: ParsedAttribute[];
    validationErrors: string[];
  };
  export function normalizeProductAttributes(raw: unknown, category: string, subcategory?: string): AttributeNormalizationResult;
  export function validateSerializedAttributes(value: string, conflicts?: Record<string, string[]>): { valid: boolean; errors: string[] };
  export function attributeSegments(value: string): Array<{ label: string; value: string }>;
  export function serializeLegacyAttributes(value: string): string;
  export function normalizeAttributeKey(value: unknown): string;
}
