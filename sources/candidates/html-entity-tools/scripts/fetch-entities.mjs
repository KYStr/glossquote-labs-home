// Authoring-time generator for the vendored WHATWG named character
// reference table (SPEC sections 2 and 5). Never run at product
// runtime and never run by tests: it reads the official entities
// list (a local copy path may be passed to avoid re-downloading),
// writes public/js/core/entities.mjs, and prints the values that
// PROVENANCE.md records. The project check re-derives the entry
// count and checksum from the shipped module and fails on drift.
//
// Usage: node scripts/fetch-entities.mjs [path-to-entities.json]
// Default source: https://html.spec.whatwg.org/entities.json

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ENTITIES_SOURCE_URL = "https://html.spec.whatwg.org/entities.json";

// The shipped table's checksum: SHA-256 over the sorted
// "key<TAB>characters" lines joined with LF, UTF-8 encoded. The
// project check recomputes exactly this from the shipped module.
export function tableChecksum(references) {
  const lines = Object.keys(references)
    .sort()
    .map((key) => `${key}\t${references[key]}`);
  return createHash("sha256").update(lines.join("\n"), "utf8").digest("hex");
}

async function main() {
  const sourcePath = process.argv[2];
  const raw = sourcePath
    ? await readFile(resolve(sourcePath))
    : Buffer.from(await (await fetch(ENTITIES_SOURCE_URL)).arrayBuffer());
  const sourceSha256 = createHash("sha256").update(raw).digest("hex");
  const parsed = JSON.parse(raw.toString("utf8"));

  const references = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!key.startsWith("&")) throw new Error(`Unexpected entities key: ${key}`);
    references[key.slice(1)] = value.characters;
  }
  const count = Object.keys(references).length;
  const semicolonForms = Object.keys(references).filter((key) => key.endsWith(";")).length;

  const sorted = {};
  for (const key of Object.keys(references).sort()) sorted[key] = references[key];
  const body = Object.entries(sorted)
    .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
    .join("\n");
  const moduleText = `// Generated data module — do not edit by hand.
// Source: the WHATWG HTML Standard named character reference list
// (its URL and hashes are recorded in PROVENANCE.md at the repo
// root), vendored per SPEC sections 2 and 5.
// Regenerate with: node scripts/fetch-entities.mjs
// Keys are the reference names as published, between the leading
// "&" and the end of the reference: semicolon forms end with ";",
// and the legacy semicolon-less forms are shipped verbatim too
// (they are never matched by the decoder, which requires the ";").

export const NAMED_REFERENCES = Object.freeze({
${body}
});
`;
  const target = resolve(fileURLToPath(new URL("../public/js/core/entities.mjs", import.meta.url)));
  await writeFile(target, moduleText, "utf8");
  process.stdout.write(
    `entries ${count}\nsemicolonForms ${semicolonForms}\nsourceSha256 ${sourceSha256}\ntableSha256 ${tableChecksum(references)}\n`,
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
