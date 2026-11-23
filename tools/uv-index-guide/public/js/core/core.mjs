// UV Index Guide — pure core.
// Exact integer arithmetic on tenths of a UV index unit (BigInt); no
// floating-point math on operands or results (string lengths and indexes
// excepted), per SPEC. run(input) is a synchronous pure data transform:
//   input  {uvIndex, skinType?} — uvIndex is a decimal string, skinType is
//            one of "I".."VI" and defaults to "III" when omitted.
//   output {ok:true, result:{uvIndex, uvIndexRounded, category, ...}}
//        | {ok:false, error:{code, field, row}} — row is always null here.
// Category is judged on uvIndexRounded = floor(uvIndex + 0.5) (half-up).
// Time to redness uses the UNROUNDED uvIndex: minutesToRedness =
// round-half-up(MED / (1.5 x uvIndex)); uvIndex 0 gives null; values
// above 180 are capped to 180 with capped = true. The estimate is never
// a safe exposure time: WHO states reporting burn times is not
// recommended, so the result always carries the verbatim disclaimer.

export const MAX_RAW_LENGTH = 8;
export const UV_MAX_TENTHS = 200n;
export const REPORT_FILENAME = "uv-index-guide-report.json";
export const MAX_REPORT_BYTES = 2097152;

export const DISCLAIMER_ZH =
  "本工具僅供一般參考，不構成醫療建議。曬紅時間為估計值，個人差異很大；防曬請以官方建議為準。";
export const DISCLAIMER_EN =
  "This tool is for general reference only and is not medical advice. Time-to-redness is an estimate; individual variation is large. Follow official sun-protection guidance.";

// Grammar: integer part "0" or a non-zero-leading integer, optional
// fraction of exactly one digit. "8", "8.5", "0.5" are legal; "08",
// "8.55", "1e1", "-1", ".5", "5." are rejected.
const UV_RE = /^(0|[1-9][0-9]*)(\.[0-9])?$/;

const SKIN_TYPES = ["I", "II", "III", "IV", "V", "VI"];

// MED (minimal erythema dose, J/m^2): rounded typical values pinned by
// the SPEC — group planning estimates, not personal thresholds.
const SKIN = {
  I: { medJPerM2: 200, skinNoteZh: "總是曬傷、從不曬黑。", skinNoteEn: "Always burns, never tans." },
  II: { medJPerM2: 250, skinNoteZh: "容易曬傷、很少曬黑。", skinNoteEn: "Burns easily, tans minimally." },
  III: { medJPerM2: 300, skinNoteZh: "有時曬傷、逐漸曬黑。", skinNoteEn: "Sometimes burns, tans gradually." },
  IV: { medJPerM2: 450, skinNoteZh: "很少曬傷、容易曬黑。", skinNoteEn: "Rarely burns, tans easily." },
  V: { medJPerM2: 600, skinNoteZh: "極少曬傷、很容易曬黑。", skinNoteEn: "Very rarely burns, tans very easily." },
  VI: { medJPerM2: 1000, skinNoteZh: "幾乎不曬傷。", skinNoteEn: "Almost never burns." },
};

// WHO thresholds (Chinese names per CWA, English names and colours per
// WHO); advice strings are verbatim from SPEC inputsOutputs §3.
const CATEGORIES = [
  {
    min: 0,
    max: 2,
    code: "low",
    zh: "低量級",
    en: "Low",
    color: "green",
    pms: "PMS 375",
    protectionRequired: false,
    avoidMidday: false,
    spfMinimum: 15,
    reapplyMinutes: null,
    cwaBurnTimeMinutes: null,
    adviceZh: "可安心待在戶外；晴天戴太陽眼鏡，容易曬傷者可擦廣效性 SPF 15+ 防曬乳。",
    adviceEn:
      "You can safely stay outside; wear sunglasses on bright days. If you burn easily, use broad-spectrum SPF 15+ sunscreen.",
  },
  {
    min: 3,
    max: 5,
    code: "moderate",
    zh: "中量級",
    en: "Moderate",
    color: "yellow",
    pms: "PMS 102",
    protectionRequired: true,
    avoidMidday: false,
    spfMinimum: 30,
    reapplyMinutes: 120,
    cwaBurnTimeMinutes: null,
    adviceZh: "中午時段找遮蔭；穿衣、擦防曬乳、戴帽子。",
    adviceEn: "Seek shade during midday hours; cover up and wear sunscreen and a hat.",
  },
  {
    min: 6,
    max: 7,
    code: "high",
    zh: "高量級",
    en: "High",
    color: "orange",
    pms: "PMS 151",
    protectionRequired: true,
    avoidMidday: false,
    spfMinimum: 30,
    reapplyMinutes: 120,
    cwaBurnTimeMinutes: 30,
    adviceZh: "中午時段找遮蔭；穿衣、擦防曬乳、戴帽子，減少 10–16 時戶外時間。",
    adviceEn:
      "Seek shade during midday hours; cover up and wear sunscreen and a hat, and reduce time outdoors between 10:00 and 16:00.",
  },
  {
    min: 8,
    max: 10,
    code: "very-high",
    zh: "過量級",
    en: "Very high",
    color: "red",
    pms: "PMS 032",
    protectionRequired: true,
    avoidMidday: true,
    spfMinimum: 50,
    reapplyMinutes: 120,
    cwaBurnTimeMinutes: 20,
    adviceZh: "中午避免待在戶外；遮蔭、衣物、防曬乳、帽子缺一不可。",
    adviceEn:
      "Avoid being outside during midday hours; shade, clothing, sunscreen and a hat are a must.",
  },
  {
    min: 11,
    max: 20,
    code: "extreme",
    zh: "危險級",
    en: "Extreme",
    color: "purple",
    pms: "PMS 265",
    protectionRequired: true,
    avoidMidday: true,
    spfMinimum: 50,
    reapplyMinutes: 120,
    cwaBurnTimeMinutes: 15,
    adviceZh: "盡量避免中午待在戶外；遮蔭、衣物、防曬乳、帽子缺一不可。",
    adviceEn:
      "Try to avoid the sun during midday hours; shade, clothing, sunscreen and a hat are a must.",
  },
];

function fail(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasUnpairedSurrogate(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Parse a grammar-valid UV index string into tenths (BigInt).
// Returns null when the grammar does not match.
function parseTenths(raw) {
  if (!UV_RE.test(raw)) return null;
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "0" : raw.slice(dot + 1);
  return BigInt(intPart) * 10n + BigInt(fracPart);
}

// Normalized echo of a grammar-valid input string: trailing fraction
// zero trimmed ("5.0" -> "5", "0.5" -> "0.5"). Null when invalid.
export function normalizeEcho(raw) {
  if (typeof raw !== "string" || !UV_RE.test(raw)) return null;
  const dot = raw.indexOf(".");
  if (dot === -1) return raw;
  const intPart = raw.slice(0, dot);
  const fracPart = raw.slice(dot + 1);
  if (fracPart === "0") return intPart;
  return intPart + "." + fracPart;
}

// Round the exact non-negative rational p/q (q > 0) half-up to an integer.
// p and q are BigInt; inputs here are all non-negative.
function roundHalfUp(p, q) {
  return (2n * p + q) / (2n * q);
}

function isPlainObject(x) {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

export function run(input) {
  // SCHEMA: plain object, only the known own data properties.
  if (!isPlainObject(input)) return fail("SCHEMA", null);
  for (const key of Object.keys(input)) {
    if (key !== "uvIndex" && key !== "skinType") return fail("SCHEMA", null);
    const desc = Object.getOwnPropertyDescriptor(input, key);
    if (!desc || !("value" in desc)) return fail("SCHEMA", null);
  }

  // uvIndex: missing or empty is EMPTY (SPEC §1). Wrong type is SCHEMA.
  if (!Object.hasOwn(input, "uvIndex")) return fail("EMPTY", "uvIndex");
  const rawUv = input.uvIndex;
  if (typeof rawUv !== "string") return fail("SCHEMA", "uvIndex");
  // Capacity, then surrogate, then grammar, then range — SPEC order.
  if (rawUv.length > MAX_RAW_LENGTH) return fail("INPUT_LIMIT", "uvIndex");
  if (hasUnpairedSurrogate(rawUv)) return fail("UNICODE", "uvIndex");
  if (rawUv === "") return fail("EMPTY", "uvIndex");
  const tenths = parseTenths(rawUv);
  if (tenths === null) return fail("FORMAT", "uvIndex");
  if (tenths < 0n || tenths > UV_MAX_TENTHS) return fail("RANGE", "uvIndex");

  // skinType: omitted defaults to "III"; empty or outside I–VI is SCHEMA.
  let skinType = "III";
  if (Object.hasOwn(input, "skinType")) {
    const rawSkin = input.skinType;
    if (typeof rawSkin !== "string") return fail("SCHEMA", "skinType");
    if (hasUnpairedSurrogate(rawSkin)) return fail("UNICODE", "skinType");
    if (!SKIN_TYPES.includes(rawSkin)) return fail("SCHEMA", "skinType");
    skinType = rawSkin;
  }

  // uvIndexRounded = floor(uvIndex + 0.5), half-up; uvIndex >= 0 so this
  // equals floor((tenths + 5) / 10).
  const uvIndexRounded = Number((tenths + 5n) / 10n);
  const category = CATEGORIES.find((c) => uvIndexRounded >= c.min && uvIndexRounded <= c.max);
  const skin = SKIN[skinType];

  // Time to redness from the UNROUNDED uvIndex:
  // minutes = MED / (1.5 x uvIndex) = 20 x MED / (3 x tenths), half-up.
  // uvIndex 0 gives null; a rounded value above 180 is capped to 180.
  let minutesToRedness = null;
  let capped = false;
  if (tenths > 0n) {
    const minutes = roundHalfUp(20n * BigInt(skin.medJPerM2), 3n * tenths);
    if (minutes > 180n) {
      minutesToRedness = 180;
      capped = true;
    } else {
      minutesToRedness = Number(minutes);
    }
  }

  return {
    ok: true,
    result: {
      uvIndex: Number(tenths) / 10,
      uvIndexRounded,
      category: {
        code: category.code,
        zh: category.zh,
        en: category.en,
        color: category.color,
        pms: category.pms,
      },
      protectionRequired: category.protectionRequired,
      avoidMidday: category.avoidMidday,
      spfMinimum: category.spfMinimum,
      reapplyMinutes: category.reapplyMinutes,
      cwaBurnTimeMinutes: category.cwaBurnTimeMinutes,
      burnEstimate: {
        skinType,
        medJPerM2: skin.medJPerM2,
        minutesToRedness,
        capped,
      },
      adviceZh: category.adviceZh,
      adviceEn: category.adviceEn,
      skinNoteZh: skin.skinNoteZh,
      skinNoteEn: skin.skinNoteEn,
      disclaimerZh: DISCLAIMER_ZH,
      disclaimerEn: DISCLAIMER_EN,
    },
  };
}

// --- Report serialization -------------------------------------------------
// Compact JSON, object own keys sorted ascending by UTF-16 code units
// recursively, array order preserved, one trailing LF, UTF-8 without BOM.
// Built from primitives only; never calls an input's toJSON.

function compareUtf16(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function stableStringify(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort(compareUtf16);
    return (
      "{" +
      keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

export function buildReport(result) {
  const text = stableStringify(result) + "\n";
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > MAX_REPORT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
