// Canonical report encoding (SPEC §3.3). The report is a canonical
// JSON encoding of { tool, version: 1, weight, durationMinutes,
// activities, rows, totalKcal } where weight and durationMinutes are the
// accepted raw input strings and activities is the accepted code array.
// Canonical form: object keys sorted by UTF-16 code unit at every level,
// arrays kept in order, no insignificant whitespace, exactly the strings
// and integers of the result (no floats), UTF-8 without BOM, one
// trailing LF. If the encoded bytes exceed 2 MiB (OUTPUT_LIMIT) the
// download is refused and no partial file is produced.

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "calories-burned-report.json";
export const REPORT_TOOL = "calories-burned-calculator";
export const REPORT_VERSION = 1;

function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Serialize the accepted input together with its result. `input` is the
// accepted raw input ({ weight, durationMinutes, activities }); `result`
// is the result object of §2.5 ({ rows, totalKcal }).
export function serializeReport(input, result) {
  const report = {
    tool: REPORT_TOOL,
    version: REPORT_VERSION,
    weight: input.weight,
    durationMinutes: input.durationMinutes,
    activities: input.activities,
    rows: result.rows,
    totalKcal: result.totalKcal,
  };
  const text = `${canonicalJson(report)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
