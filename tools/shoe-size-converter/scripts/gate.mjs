// Shared data-provenance gate (SPEC section 4): the shipped tables must match
// the row counts and SHA-256 recorded in DATA-SOURCE.md. Used by the build,
// the static check and (independently re-implemented) the test suite.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function readRecord(toolRoot) {
  const text = readFileSync(path.join(toolRoot, "DATA-SOURCE.md"), "utf8");
  const grab = (pattern) => {
    const m = pattern.exec(text);
    return m ? m[1] : null;
  };
  return {
    adultRows: Number(grab(/Adult table rows:\s*(\d+)/)),
    kidsRows: Number(grab(/Kids table rows:\s*(\d+)/)),
    sha256: grab(/SHA-256:\s*([0-9a-f]{64})/),
  };
}

export async function verifyDataGate(toolRoot) {
  const problems = [];
  const record = readRecord(toolRoot);
  if (!record.sha256) problems.push("DATA-SOURCE.md: no SHA-256 recorded");
  if (!Number.isInteger(record.adultRows) || record.adultRows <= 0) {
    problems.push("DATA-SOURCE.md: no adult row count recorded");
  }
  if (!Number.isInteger(record.kidsRows) || record.kidsRows <= 0) {
    problems.push("DATA-SOURCE.md: no kids row count recorded");
  }
  const dataPath = path.join(toolRoot, "public/js/core/tables.mjs");
  const bytes = readFileSync(dataPath);
  const actualSha = createHash("sha256").update(bytes).digest("hex");
  if (record.sha256 && actualSha !== record.sha256) {
    problems.push(`tables.mjs SHA-256 mismatch: recorded ${record.sha256}, actual ${actualSha}`);
  }
  const tables = await import(pathToFileURL(dataPath).href);
  if (tables.ADULT_ROWS.length !== record.adultRows) {
    problems.push(`adult row count mismatch: recorded ${record.adultRows}, actual ${tables.ADULT_ROWS.length}`);
  }
  if (tables.KIDS_ROWS.length !== record.kidsRows) {
    problems.push(`kids row count mismatch: recorded ${record.kidsRows}, actual ${tables.KIDS_ROWS.length}`);
  }
  return { ok: problems.length === 0, problems, record, actualSha };
}
