// Pure core for the Blood Pressure Checker
// (spec-blood-pressure-checker-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind. The
// category rules are the SPEC's literal §5 pinned AHA/ACC 2017 table,
// applied in the SPEC's order (first match wins, which is exactly the
// "higher category applies" rule):
//   crisis  if systolic > 180 or diastolic > 120 (strictly greater);
//   stage2  if systolic >= 140 or diastolic >= 90;
//   stage1  if systolic >= 130 or diastolic >= 80;
//   elevated if systolic >= 120 (diastolic is then necessarily < 80);
//   normal  otherwise.
// The result shape follows fixtures.json exactly: {systolic,
// diastolic, category, categoryZh, categoryEn}. The SPEC §4 text
// also lists adviceZh/adviceEn in the result, but all 17 literal
// core fixtures omit them; the implementation follows the fixtures
// (the deep-equal acceptance contract) and renders the pinned advice
// in the UI from the CATEGORIES table below. Recorded as a
// spec-errata candidate in HANDOFF.md.

export const FIELDS = ["systolic", "diastolic"];

export const DEFAULTS = { systolic: "", diastolic: "" };

// The worked example is fixtures.json case 1 (normal-typical)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = { systolic: "118", diastolic: "76" };

export const MAX_RAW_UNITS = 4;

export const SYSTOLIC_MIN = 40;
export const SYSTOLIC_MAX = 300;
export const DIASTOLIC_MIN = 20;
export const DIASTOLIC_MAX = 200;

// Pinned §5 category table (AHA/ACC 2017), verbatim: names and the
// one general reminder per category, in both languages.
export const CATEGORIES = {
  normal: {
    categoryZh: "正常",
    categoryEn: "Normal",
    adviceZh: "維持健康生活型態，定期量測血壓。",
    adviceEn: "Maintain a healthy lifestyle and check your blood pressure regularly.",
  },
  elevated: {
    categoryZh: "偏高",
    categoryEn: "Elevated",
    adviceZh: "建議調整生活型態，3–6 個月後再量測。",
    adviceEn: "Consider lifestyle changes and recheck in 3–6 months.",
  },
  stage1: {
    categoryZh: "第一期高血壓",
    categoryEn: "Stage 1 Hypertension",
    adviceZh: "建議調整生活型態，評估心血管風險，必要時諮詢醫師。",
    adviceEn:
      "Consider lifestyle changes, assess cardiovascular risk, and consult a physician if needed.",
  },
  stage2: {
    categoryZh: "第二期高血壓",
    categoryEn: "Stage 2 Hypertension",
    adviceZh: "建議諮詢醫師，討論生活型態調整與藥物治療。",
    adviceEn: "Consult a physician to discuss lifestyle changes and medication.",
  },
  crisis: {
    categoryZh: "高血壓危象",
    categoryEn: "Hypertensive Crisis",
    adviceZh: "血壓極高，請盡快就醫；若出現胸痛、呼吸困難、視力變化等症狀，請立即就醫或撥打 119。",
    adviceEn:
      "Blood pressure is very high — seek medical care promptly. If you have chest pain, shortness of breath, or vision changes, seek emergency care or call 119.",
  },
};

// Pinned §5 disclaimer (verbatim, both languages). Shown in the
// results area of both pages.
export const DISCLAIMER_ZH =
  "本工具僅供參考，不能取代專業醫療建議、診斷或治療。如有疑慮，請諮詢醫師或醫療專業人員。";
export const DISCLAIMER_EN =
  "This tool is for reference only and is not a substitute for professional medical advice, diagnosis, or treatment. If you have concerns, consult a physician or healthcare professional.";

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the two
// fields.
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length) return null;
  const raw = {};
  for (const field of FIELDS) {
    if (!keys.includes(field)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    raw[field] = descriptor.value;
  }
  return raw;
}

function hasLoneSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Per-field validation in the SPEC's order: capacity, unpaired
// surrogate, empty, grammar, range. Returns the parsed integer or an
// { error } outcome.
function validateField(field, value, min, max) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field) };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    return { error: failure("RANGE", field) };
  }
  return { value: parsed };
}

function classify(systolic, diastolic) {
  if (systolic > 180 || diastolic > 120) return "crisis";
  if (systolic >= 140 || diastolic >= 90) return "stage2";
  if (systolic >= 130 || diastolic >= 80) return "stage1";
  if (systolic >= 120) return "elevated";
  return "normal";
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const checked = {};
  const limits = {
    systolic: [SYSTOLIC_MIN, SYSTOLIC_MAX],
    diastolic: [DIASTOLIC_MIN, DIASTOLIC_MAX],
  };
  for (const field of FIELDS) {
    const [min, max] = limits[field];
    const outcome = validateField(field, raw[field], min, max);
    if (outcome.error) return outcome.error;
    checked[field] = outcome.value;
  }

  // Cross-field: diastolic must not exceed systolic. Equal is legal.
  if (checked.diastolic > checked.systolic) return failure("RANGE", "diastolic");

  const category = classify(checked.systolic, checked.diastolic);
  const pinned = CATEGORIES[category];
  return {
    ok: true,
    result: {
      systolic: checked.systolic,
      diastolic: checked.diastolic,
      category,
      categoryZh: pinned.categoryZh,
      categoryEn: pinned.categoryEn,
    },
  };
}

// Fixed report download: blood-pressure-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, safe integers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "blood-pressure-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("report values must be safe integers");
    }
    return String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeValue(entry)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    // Default string sort compares UTF-16 code units, as the SPEC pins.
    const keys = Object.keys(value).sort();
    const parts = keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new Error("report objects must hold plain data only");
      }
      return `${JSON.stringify(key)}:${serializeValue(descriptor.value)}`;
    });
    return `{${parts.join(",")}}`;
  }
  throw new Error("unsupported report value");
}

export function buildReport(result) {
  if (!isPlainObject(result)) {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  let text;
  try {
    text = `${serializeValue(result)}\n`;
  } catch {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, filename: REPORT_FILENAME, text, byteLength };
}
