// Authoring-time generator for the vendored Unicode case folding
// table (SPEC sections 4 and 5). Never run at product runtime and
// never run by tests: it reads the Unicode CaseFolding.txt for the
// pinned version (a local copy path may be passed) and writes
// public/js/core/casefold.mjs, printing the values PROVENANCE.md
// records. The project check re-derives the entry count and
// checksum from the shipped module and fails on drift.
//
// Entry selection: SPEC section 4 names the fold "Unicode simple
// case folding" and states behaviourally that İ (U+0130) "has no
// simple fold mapping and is unchanged by the fold". In
// CaseFolding.txt, simple case folding is exactly the status C and
// S entries (S overrides C where both exist); İ carries only an F
// (full folding) entry, so it is correctly unchanged under C+S.
// The SPEC's parenthetical "(status C and F entries)" conflicts
// with its own İ statement and with the defined operation, so the
// behavioural statements win: this generator ships C+S. The
// conflict is documented in PROVENANCE.md and VERIFICATION.md for
// the bulk-review errata.
//
// Usage: node scripts/fetch-casefolding.mjs [path-to-CaseFolding.txt]
// Default source: https://www.unicode.org/Public/16.0.0/ucd/CaseFolding.txt

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CASEFOLDING_SOURCE_URL = "https://www.unicode.org/Public/16.0.0/ucd/CaseFolding.txt";
export const UNICODE_VERSION = "16.0.0";

// The shipped table's checksum: SHA-256 over the sorted
// "HEXKEY<TAB>folded string" lines joined with LF, UTF-8 encoded.
// The project check recomputes exactly this from the shipped module.
export function foldChecksum(table) {
  const lines = Object.keys(table)
    .sort()
    .map((key) => `${key}\t${table[key]}`);
  return createHash("sha256").update(lines.join("\n"), "utf8").digest("hex");
}

async function main() {
  const sourcePath = process.argv[2];
  const raw = sourcePath
    ? await readFile(resolve(sourcePath))
    : Buffer.from(await (await fetch(CASEFOLDING_SOURCE_URL)).arrayBuffer());
  const sourceSha256 = createHash("sha256").update(raw).digest("hex");
  const text = raw.toString("utf8");

  const common = {};
  const simple = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const fields = trimmed.split(";").map((field) => field.trim());
    const [code, status, mapping] = fields;
    if (status !== "C" && status !== "S") continue;
    const folded = mapping
      .split(/\s+/)
      .map((hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
      .join("");
    if (status === "C") common[code] = folded;
    else simple[code] = folded;
  }
  // Unicode simple case folding: the S mapping where one exists,
  // otherwise the C mapping, otherwise the code point itself.
  const table = { ...common, ...simple };
  const countC = Object.keys(common).length;
  const countS = Object.keys(simple).length;

  const sorted = {};
  for (const key of Object.keys(table).sort()) sorted[key] = table[key];
  const body = Object.entries(sorted)
    .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
    .join("\n");
  const moduleText = `// Generated data module — do not edit by hand.
// Source: the Unicode CaseFolding.txt for Unicode ${UNICODE_VERSION}
// (its URL and hashes are recorded in PROVENANCE.md at the repo
// root), vendored per SPEC sections 4 and 5. The shipped entries
// are the status C and S entries — Unicode simple case folding,
// with S overriding C where both exist (see PROVENANCE.md for the
// noted SPEC wording conflict this resolves).
// Keys are the source code point in uppercase hexadecimal;
// values are the folded string (usually one character).
// Regenerate with: node scripts/fetch-casefolding.mjs

export const CASE_FOLD = Object.freeze({
${body}
});
`;
  const target = resolve(fileURLToPath(new URL("../public/js/core/casefold.mjs", import.meta.url)));
  await writeFile(target, moduleText, "utf8");
  process.stdout.write(
    `entries ${Object.keys(table).length}\ncountC ${countC}\ncountS ${countS}\nsourceSha256 ${sourceSha256}\ntableSha256 ${foldChecksum(table)}\n`,
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
