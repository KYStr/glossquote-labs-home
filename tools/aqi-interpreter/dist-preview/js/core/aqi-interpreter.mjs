// Pure core for the AQI Interpreter (spec-aqi-interpreter-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// Two input modes: a direct AQI integer (0-500), or 1-7 pollutant
// concentrations converted to sub-indices by the SPEC's pinned
// piecewise-linear interpolation
//   Ip = ((Ihi - Ilo) / (BPhi - BPLo)) * (Cp - BPLo) + Ilo
// with the maximum sub-index as the AQI. Two breakpoint systems:
// Taiwan (MOENV, default) and US EPA (TAD 2024 Table 6). The result
// shape follows fixtures.json exactly.
//
// Decimal discipline (SPEC inputsOutputs): every concentration is
// normalized by decimal-string arithmetic only, never binary float.
// Taiwan rounds half-up (0.5 up); the US truncates toward zero, both
// to the pinned precision per pollutant. Interpolation itself is
// exact rational arithmetic on milli-unit BigInts, rounded half-up
// to an integer sub-index. A concentration that equals a breakpoint
// yields exactly the corresponding index value.

export const FIELDS = ["mode", "system", "aqi", "rows"];

export const DEFAULTS = { mode: "aqi", system: "TW", aqi: "", rows: [] };

// The worked example is fixtures.json case 1 (aqi-direct-good)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = { mode: "aqi", system: "TW", aqi: "35", rows: [] };

export const MAX_AQI_RAW_UNITS = 3;
export const MAX_VALUE_RAW_UNITS = 10;
export const MAX_ROWS = 7;

export const POLLUTANTS = ["PM2.5", "PM10", "O3-8h", "O3-1h", "CO", "SO2", "NO2"];

// Pinned per-pollutant precision (decimals) and absolute input caps
// (SPEC inputsOutputs). The caps are author-defined guard rails, not
// official numbers (AUTHOR-CHECK.md).
export const POLLUTANT_INFO = {
  "PM2.5": { decimals: 1, cap: "999.9" },
  PM10: { decimals: 0, cap: "999" },
  "O3-8h": { decimals: 3, cap: "1.000" },
  "O3-1h": { decimals: 3, cap: "1.000" },
  CO: { decimals: 1, cap: "99.9" },
  SO2: { decimals: 0, cap: "9999" },
  NO2: { decimals: 0, cap: "9999" },
};

// Pinned six levels (SPEC section 5). Both systems share the level
// ranges, names, colours and advice text; only the concentration
// breakpoints differ. The result carries the Chinese text (as the
// fixtures pin); the English text is rendered by the UI from this
// same table by level.
export const LEVELS = {
  good: {
    levelZh: "良好",
    levelEn: "Good",
    color: "green",
    colorZh: "綠",
    hex: "#00E400",
    healthImpactZh: "空氣品質為良好，污染程度低或無污染。",
    healthImpactEn: "Air quality is good, with little or no pollution.",
    adviceGeneralZh: "正常戶外活動。",
    adviceGeneralEn: "Normal outdoor activities.",
    adviceSensitiveZh: "正常戶外活動。",
    adviceSensitiveEn: "Normal outdoor activities.",
  },
  moderate: {
    levelZh: "普通",
    levelEn: "Moderate",
    color: "yellow",
    colorZh: "黃",
    hex: "#FFFF00",
    healthImpactZh: "空氣品質普通；但對非常少數之極敏感族群產生輕微影響。",
    healthImpactEn:
      "Air quality is moderate; a very small number of unusually sensitive people may feel slight effects.",
    adviceGeneralZh: "正常戶外活動。",
    adviceGeneralEn: "Normal outdoor activities.",
    adviceSensitiveZh: "極特殊敏感族群建議注意可能產生的咳嗽或呼吸急促症狀，但仍可正常戶外活動。",
    adviceSensitiveEn:
      "Extremely sensitive people should watch for possible coughing or shortness of breath, but may still do normal outdoor activities.",
  },
  usg: {
    levelZh: "對敏感族群不健康",
    levelEn: "Unhealthy for Sensitive Groups",
    color: "orange",
    colorZh: "橘",
    hex: "#FF7E00",
    healthImpactZh: "空氣污染物可能會對敏感族群的健康造成影響，但是對一般大眾的影響不明顯。",
    healthImpactEn:
      "Air pollutants may affect the health of sensitive groups, but effects on the general public are not obvious.",
    adviceGeneralZh:
      "1.一般民眾如果有不適，如眼痛，咳嗽或喉嚨痛等，應該考慮減少戶外活動。2.學生仍可進行戶外活動，但建議減少長時間劇烈運動。",
    adviceGeneralEn:
      "1. If you feel discomfort such as eye pain, coughing or a sore throat, consider reducing outdoor activities. 2. Students may still do outdoor activities, but should reduce prolonged strenuous exercise.",
    adviceSensitiveZh:
      "1.有心臟、呼吸道及心血管疾病患者、孩童及老年人，建議減少體力消耗活動及戶外活動，必要外出應配戴口罩。2.具有氣喘的人可能需增加使用吸入劑的頻率。",
    adviceSensitiveEn:
      "1. People with heart, respiratory or cardiovascular disease, children and older adults should reduce physical exertion and outdoor activities, and wear a mask if going out is necessary. 2. People with asthma may need to use their inhaler more often.",
  },
  unhealthy: {
    levelZh: "對所有族群不健康",
    levelEn: "Unhealthy",
    color: "red",
    colorZh: "紅",
    hex: "#FF0000",
    healthImpactZh: "對所有人的健康開始產生影響，對於敏感族群可能產生較嚴重的健康影響。",
    healthImpactEn:
      "Health effects begin for everyone, and may be more serious for sensitive groups.",
    adviceGeneralZh:
      "1.一般民眾如果有不適，如眼痛，咳嗽或喉嚨痛等，應減少體力消耗，特別是減少戶外活動。2.學生應避免長時間劇烈運動，進行其他戶外活動時應增加休息時間。",
    adviceGeneralEn:
      "1. If you feel discomfort such as eye pain, coughing or a sore throat, reduce physical exertion, especially outdoor activities. 2. Students should avoid prolonged strenuous exercise and take more breaks during other outdoor activities.",
    adviceSensitiveZh:
      "1.有心臟、呼吸道及心血管疾病患者、孩童及老年人，建議留在室內並減少體力消耗活動，必要外出應配戴口罩。2.具有氣喘的人可能需增加使用吸入劑的頻率。",
    adviceSensitiveEn:
      "1. People with heart, respiratory or cardiovascular disease, children and older adults should stay indoors and reduce physical exertion, and wear a mask if going out is necessary. 2. People with asthma may need to use their inhaler more often.",
  },
  "very-unhealthy": {
    levelZh: "非常不健康",
    levelEn: "Very Unhealthy",
    color: "purple",
    colorZh: "紫",
    hex: "#99004C",
    healthImpactZh: "健康警報：所有人都可能產生較嚴重的健康影響。",
    healthImpactEn: "Health alert: everyone may experience more serious health effects.",
    adviceGeneralZh:
      "1.一般民眾應減少戶外活動。2.學生應立即停止戶外活動，並將課程調整於室內進行。",
    adviceGeneralEn:
      "1. The general public should reduce outdoor activities. 2. Students should stop outdoor activities immediately and move classes indoors.",
    adviceSensitiveZh:
      "1.有心臟、呼吸道及心血管疾病患者、孩童及老年人應留在室內並減少體力消耗活動，必要外出應配戴口罩。2.具有氣喘的人應增加使用吸入劑的頻率。",
    adviceSensitiveEn:
      "1. People with heart, respiratory or cardiovascular disease, children and older adults should stay indoors and reduce physical exertion, and wear a mask if going out is necessary. 2. People with asthma should use their inhaler more often.",
  },
  hazardous: {
    levelZh: "危害",
    levelEn: "Hazardous",
    color: "maroon",
    colorZh: "褐紅",
    hex: "#7E0023",
    healthImpactZh: "健康威脅達到緊急，所有人都可能受到影響。",
    healthImpactEn: "Health threat is at emergency level; everyone may be affected.",
    adviceGeneralZh:
      "1.一般民眾應避免戶外活動，室內應緊閉門窗，必要外出應配戴口罩等防護用具。2.學生應立即停止戶外活動，並將課程調整於室內進行。",
    adviceGeneralEn:
      "1. The general public should avoid outdoor activities, keep windows and doors closed indoors, and wear a mask and other protection if going out is necessary. 2. Students should stop outdoor activities immediately and move classes indoors.",
    adviceSensitiveZh:
      "1.有心臟、呼吸道及心血管疾病患者、孩童及老年人應留在室內並避免體力消耗活動，必要外出應配戴口罩。2.具有氣喘的人應增加使用吸入劑的頻率。",
    adviceSensitiveEn:
      "1. People with heart, respiratory or cardiovascular disease, children and older adults should stay indoors and avoid physical exertion, and wear a mask if going out is necessary. 2. People with asthma should use their inhaler more often.",
  },
};

// Pinned disclaimer (SPEC section 5), both languages, shown under
// the results area on both pages.
export const DISCLAIMER_ZH =
  "本工具僅提供空氣品質資訊解讀與一般性活動建議，不構成醫療建議；如有呼吸道或心血管症狀，請諮詢醫師。";
export const DISCLAIMER_EN =
  "This tool provides air-quality information and general activity guidance only. It is not medical advice; consult a physician if you have respiratory or cardiovascular symptoms.";

// Pinned breakpoint tables (SPEC section 5). Each band is
// [Ilo, Ihi, BPLo, BPHi] with the concentration bounds as decimal
// strings (at most 3 decimals, so milli-unit integers are exact).
// A "—" cell in the SPEC table is an absent band: the pollutant has
// no defined band there.
//   - O3-1h has no 0-50 / 51-100 bands (below its lowest defined
//     band a concentration is undefined).
//   - O3-8h has no 301+ bands (SPEC note 2: AQI 301+ uses 1-hour O3).
//   - SO2 1h has no bands above 151-200 (SPEC note 3: AQI 200+ uses
//     the 24-hour SO2 value; this tool only accepts the 1-hour
//     value, so SO2 1h above 304 ppb is undefined, not 500).
// Taiwan table: MOENV current page (PM2.5 Good top 12.4, PM10 Good
// top 30, O3-1h sensitive band 0.101-0.134). US table: EPA TAD 2024
// Table 6 (PM2.5 Good top 9.0 after the 2024 revision; hazardous is
// a single 301-500 band).
const BREAKPOINTS = {
  TW: {
    "PM2.5": [
      [0, 50, "0.0", "12.4"],
      [51, 100, "12.5", "30.4"],
      [101, 150, "30.5", "50.4"],
      [151, 200, "50.5", "125.4"],
      [201, 300, "125.5", "225.4"],
      [301, 400, "225.5", "325.4"],
      [401, 500, "325.5", "500.4"],
    ],
    PM10: [
      [0, 50, "0", "30"],
      [51, 100, "31", "75"],
      [101, 150, "76", "190"],
      [151, 200, "191", "354"],
      [201, 300, "355", "424"],
      [301, 400, "425", "504"],
      [401, 500, "505", "604"],
    ],
    "O3-8h": [
      [0, 50, "0.000", "0.054"],
      [51, 100, "0.055", "0.070"],
      [101, 150, "0.071", "0.085"],
      [151, 200, "0.086", "0.105"],
      [201, 300, "0.106", "0.200"],
    ],
    "O3-1h": [
      [101, 150, "0.101", "0.134"],
      [151, 200, "0.135", "0.204"],
      [201, 300, "0.205", "0.404"],
      [301, 400, "0.405", "0.504"],
      [401, 500, "0.505", "0.604"],
    ],
    CO: [
      [0, 50, "0", "4.4"],
      [51, 100, "4.5", "9.4"],
      [101, 150, "9.5", "12.4"],
      [151, 200, "12.5", "15.4"],
      [201, 300, "15.5", "30.4"],
      [301, 400, "30.5", "40.4"],
      [401, 500, "40.5", "50.4"],
    ],
    SO2: [
      [0, 50, "0", "8"],
      [51, 100, "9", "65"],
      [101, 150, "66", "160"],
      [151, 200, "161", "304"],
    ],
    NO2: [
      [0, 50, "0", "21"],
      [51, 100, "22", "100"],
      [101, 150, "101", "360"],
      [151, 200, "361", "649"],
      [201, 300, "650", "1249"],
      [301, 400, "1250", "1649"],
      [401, 500, "1650", "2049"],
    ],
  },
  US: {
    "PM2.5": [
      [0, 50, "0.0", "9.0"],
      [51, 100, "9.1", "35.4"],
      [101, 150, "35.5", "55.4"],
      [151, 200, "55.5", "125.4"],
      [201, 300, "125.5", "225.4"],
      [301, 500, "225.5", "325.4"],
    ],
    PM10: [
      [0, 50, "0", "54"],
      [51, 100, "55", "154"],
      [101, 150, "155", "254"],
      [151, 200, "255", "354"],
      [201, 300, "355", "424"],
      [301, 500, "425", "604"],
    ],
    "O3-8h": [
      [0, 50, "0.000", "0.054"],
      [51, 100, "0.055", "0.070"],
      [101, 150, "0.071", "0.085"],
      [151, 200, "0.086", "0.105"],
      [201, 300, "0.106", "0.200"],
    ],
    "O3-1h": [
      [101, 150, "0.125", "0.164"],
      [151, 200, "0.165", "0.204"],
      [201, 300, "0.205", "0.404"],
      [301, 500, "0.405", "0.604"],
    ],
    CO: [
      [0, 50, "0", "4.4"],
      [51, 100, "4.5", "9.4"],
      [101, 150, "9.5", "12.4"],
      [151, 200, "12.5", "15.4"],
      [201, 300, "15.5", "30.4"],
      [301, 500, "30.5", "50.4"],
    ],
    SO2: [
      [0, 50, "0", "35"],
      [51, 100, "36", "75"],
      [101, 150, "76", "185"],
      [151, 200, "186", "304"],
    ],
    NO2: [
      [0, 50, "0", "53"],
      [51, 100, "54", "100"],
      [101, 150, "101", "360"],
      [151, 200, "361", "649"],
      [201, 300, "650", "1249"],
      [301, 500, "1250", "2049"],
    ],
  },
};

// Pollutants whose concentration above the table top caps at 500
// with an ABOVE_TABLE_TOP notice (SPEC inputsOutputs step 5).
// O3-8h and SO2 are not in this set: above their top they are
// undefined (notes 2 and 3) and the row is skipped instead.
const ABOVE_TOP_POLLUTANTS = new Set(["PM2.5", "PM10", "O3-1h", "CO", "NO2"]);

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,6})?$/;

function failure(code, field, row = null) {
  return { ok: false, error: { code, field, row } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads one own data property as a string without invoking
// accessors. Returns the string, or null when the key is absent, an
// accessor, or not a string.
function readOwnString(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (descriptor === undefined || !("value" in descriptor)) return null;
  if (typeof descriptor.value !== "string") return null;
  return descriptor.value;
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

// Exact decimal-string to integer scaling. `text` is a validated
// decimal literal (digits with an optional single point, at most 6
// fractional digits); returns value * 10^scale as a BigInt.
function decimalToScaled(text, scale) {
  const dot = text.indexOf(".");
  const intPart = dot === -1 ? text : text.slice(0, dot);
  const fracPart = dot === -1 ? "" : text.slice(dot + 1);
  return BigInt(intPart) * 10n ** BigInt(scale) + BigInt(fracPart.padEnd(scale, "0") || "0");
}

// A decimal literal string to milli-units (value * 1000) as a BigInt.
// The literal has at most 3 fractional digits.
function decimalToMilli(text) {
  return decimalToScaled(text, 3);
}

// Normalizes a validated concentration string to the pinned
// precision by decimal-string arithmetic. Taiwan: half-up (0.5 up).
// US: truncate toward zero. Returns { text, milli } where text is
// the canonical normalized decimal string and milli is value * 1000.
function normalizeConcentration(value, decimals, system) {
  const dot = value.indexOf(".");
  const intPart = dot === -1 ? value : value.slice(0, dot);
  const fracPart = dot === -1 ? "" : value.slice(dot + 1);
  let roundedInt = intPart;
  let roundedFrac = fracPart;
  if (fracPart.length > decimals) {
    const keep = fracPart.slice(0, decimals);
    if (system === "TW" && fracPart[decimals] >= "5") {
      const combined = (BigInt(intPart + keep) + 1n).toString().padStart(decimals + 1, "0");
      roundedInt = decimals === 0 ? combined : combined.slice(0, combined.length - decimals);
      roundedFrac = decimals === 0 ? "" : combined.slice(combined.length - decimals);
    } else {
      roundedFrac = keep;
    }
  } else {
    roundedFrac = fracPart.padEnd(decimals, "0");
  }
  const text = decimals === 0 ? roundedInt : `${roundedInt}.${roundedFrac}`;
  const fracMilli = decimals === 0 ? "000" : roundedFrac.padEnd(3, "0");
  const milli = BigInt(roundedInt) * 1000n + BigInt(fracMilli);
  return { text, milli };
}

// Exact piecewise-linear interpolation on milli-unit BigInts.
// Returns the sub-index rounded half-up to an integer, or null when
// the concentration falls in no defined band. A concentration above
// the table top returns 500 only for the pollutants in
// ABOVE_TOP_POLLUTANTS; the caller handles the notice.
function subIndexFor(milli, pollutant, system) {
  const bands = BREAKPOINTS[system][pollutant];
  for (const [ilo, ihi, loText, hiText] of bands) {
    const lo = decimalToMilli(loText);
    const hi = decimalToMilli(hiText);
    if (milli >= lo && milli <= hi) {
      const numerator =
        BigInt(ihi - ilo) * (milli - lo) + BigInt(ilo) * (hi - lo);
      const denominator = hi - lo;
      // Round half-up: floor((2 * numerator + denominator) /
      // (2 * denominator)); all terms are non-negative.
      return Number((2n * numerator + denominator) / (2n * denominator));
    }
  }
  const top = decimalToMilli(bands[bands.length - 1][3]);
  if (milli > top && ABOVE_TOP_POLLUTANTS.has(pollutant)) return 500;
  return null;
}

function levelFor(aqi) {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "usg";
  if (aqi <= 200) return "unhealthy";
  if (aqi <= 300) return "very-unhealthy";
  return "hazardous";
}

function buildResult(system, mode, aqi, dominantPollutant, subIndices, notices) {
  const level = levelFor(aqi);
  const pinned = LEVELS[level];
  return {
    system,
    mode,
    aqi,
    level,
    levelZh: pinned.levelZh,
    levelEn: pinned.levelEn,
    color: pinned.color,
    colorZh: pinned.colorZh,
    hex: pinned.hex,
    healthImpact: pinned.healthImpactZh,
    adviceGeneral: pinned.adviceGeneralZh,
    adviceSensitive: pinned.adviceSensitiveZh,
    dominantPollutant,
    subIndices,
    notices,
  };
}

// Validates the direct-AQI string in the SPEC's order: capacity,
// unpaired surrogate, empty, grammar, range.
function validateAqi(value) {
  if (value.length > MAX_AQI_RAW_UNITS) return { error: failure("INPUT_LIMIT", "aqi") };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", "aqi") };
  if (value.length === 0) return { error: failure("EMPTY", "aqi") };
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", "aqi") };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 500) {
    return { error: failure("RANGE", "aqi") };
  }
  return { value: parsed };
}

// Validates one concentration row (1-based rowNumber for errors).
// Pollutant first (key order), then the value: capacity, unpaired
// surrogate, empty, grammar, absolute range (checked on the raw
// value, not the normalized one, so US truncation cannot hide an
// over-cap raw value). Returns { pollutant, value } on success.
function validateRow(row, rowNumber) {
  if (!isPlainObject(row)) return { error: failure("SCHEMA", null, null) };
  const keys = Object.keys(row);
  if (keys.length !== 2 || !keys.includes("pollutant") || !keys.includes("value")) {
    return { error: failure("SCHEMA", null, null) };
  }
  const pollutant = readOwnString(row, "pollutant");
  if (pollutant === null) return { error: failure("SCHEMA", null, null) };
  if (!POLLUTANTS.includes(pollutant)) {
    return { error: failure("ENUM", "rows", rowNumber) };
  }
  const value = readOwnString(row, "value");
  if (value === null) return { error: failure("SCHEMA", null, null) };
  if (value.length > MAX_VALUE_RAW_UNITS) {
    return { error: failure("INPUT_LIMIT", "rows", rowNumber) };
  }
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", "rows", rowNumber) };
  if (value.length === 0) return { error: failure("EMPTY", "rows", rowNumber) };
  if (!DECIMAL_PATTERN.test(value)) {
    return { error: failure("DECIMAL_FORMAT", "rows", rowNumber) };
  }
  const info = POLLUTANT_INFO[pollutant];
  if (decimalToScaled(value, 6) > decimalToScaled(info.cap, 6)) {
    return { error: failure("RANGE", "rows", rowNumber) };
  }
  return { pollutant, value };
}

export function run(input) {
  if (!isPlainObject(input)) return failure("SCHEMA", null, null);
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length || !FIELDS.every((field) => keys.includes(field))) {
    return failure("SCHEMA", null, null);
  }
  const mode = readOwnString(input, "mode");
  if (mode === null) return failure("SCHEMA", null, null);
  if (mode !== "aqi" && mode !== "concentration") return failure("ENUM", "mode", null);
  const system = readOwnString(input, "system");
  if (system === null) return failure("SCHEMA", null, null);
  if (system !== "TW" && system !== "US") return failure("ENUM", "system", null);

  if (mode === "aqi") {
    const rowsDescriptor = Object.getOwnPropertyDescriptor(input, "rows");
    if (
      rowsDescriptor === undefined ||
      !("value" in rowsDescriptor) ||
      !Array.isArray(rowsDescriptor.value) ||
      rowsDescriptor.value.length !== 0
    ) {
      return failure("SCHEMA", null, null);
    }
    const aqiRaw = readOwnString(input, "aqi");
    if (aqiRaw === null) return failure("SCHEMA", null, null);
    const checked = validateAqi(aqiRaw);
    if (checked.error) return checked.error;
    return {
      ok: true,
      result: buildResult(system, "aqi", checked.value, null, [], []),
    };
  }

  const aqiDescriptor = Object.getOwnPropertyDescriptor(input, "aqi");
  if (aqiDescriptor === undefined || !("value" in aqiDescriptor) || aqiDescriptor.value !== "") {
    return failure("SCHEMA", null, null);
  }
  const rowsDescriptor = Object.getOwnPropertyDescriptor(input, "rows");
  if (rowsDescriptor === undefined || !("value" in rowsDescriptor)) {
    return failure("SCHEMA", null, null);
  }
  const rows = rowsDescriptor.value;
  if (!Array.isArray(rows)) return failure("SCHEMA", null, null);
  if (rows.length === 0) return failure("EMPTY", "rows", null);
  if (rows.length > MAX_ROWS) return failure("ROW_LIMIT", "rows", null);

  const checkedRows = [];
  for (let index = 0; index < rows.length; index += 1) {
    const rowDescriptor = Object.getOwnPropertyDescriptor(rows, String(index));
    const row = rowDescriptor !== undefined && "value" in rowDescriptor ? rowDescriptor.value : undefined;
    const outcome = validateRow(row, index + 1);
    if (outcome.error) return outcome.error;
    checkedRows.push(outcome);
  }

  const seen = new Set();
  for (let index = 0; index < checkedRows.length; index += 1) {
    const pollutant = checkedRows[index].pollutant;
    if (seen.has(pollutant)) return failure("DUPLICATE", "rows", index + 1);
    seen.add(pollutant);
  }

  const subIndices = [];
  const notices = [];
  for (const { pollutant, value } of checkedRows) {
    const info = POLLUTANT_INFO[pollutant];
    const normalized = normalizeConcentration(value, info.decimals, system);
    const sub = subIndexFor(normalized.milli, pollutant, system);
    if (sub === null) {
      notices.push({ code: "SKIPPED_UNDEFINED", pollutant });
      continue;
    }
    const bands = BREAKPOINTS[system][pollutant];
    if (
      ABOVE_TOP_POLLUTANTS.has(pollutant) &&
      normalized.milli > decimalToMilli(bands[bands.length - 1][3])
    ) {
      notices.push({ code: "ABOVE_TABLE_TOP", pollutant });
    }
    subIndices.push({
      pollutant,
      concentration: Number(normalized.text),
      subIndex: sub,
      level: levelFor(sub),
    });
  }
  if (subIndices.length === 0) return failure("UNDEFINED_BAND", "rows", 1);

  let best = subIndices[0];
  for (const entry of subIndices) {
    if (entry.subIndex > best.subIndex) {
      best = entry;
    } else if (entry.subIndex === best.subIndex) {
      // Tie: the fixed pollutant order wins, not input order.
      if (POLLUTANTS.indexOf(entry.pollutant) < POLLUTANTS.indexOf(best.pollutant)) {
        best = entry;
      }
    }
  }
  return {
    ok: true,
    result: buildResult(system, "concentration", best.subIndex, best.pollutant, subIndices, notices),
  };
}

// Fixed report download: aqi-interpreter-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, finite numbers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "aqi-interpreter-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("report values must be finite numbers");
    }
    return JSON.stringify(value);
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
