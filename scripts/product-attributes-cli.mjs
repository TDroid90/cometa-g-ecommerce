import readline from "node:readline";
import { normalizeProductAttributes } from "../src/lib/productAttributes.mjs";

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

input.on("line", (line) => {
  try {
    const request = JSON.parse(line);
    const result = normalizeProductAttributes(request.rawAttributes, request.category, request.subcategory || "");
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ error: error instanceof Error ? error.message : "normalization_error" })}\n`);
  }
});
