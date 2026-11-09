// Pure core for the Cron Expression Explainer: five-field Vixie/POSIX
// cron parsing to value sets, the DOM/DOW day-matching rule, next-run
// enumeration over local time, the structured explanation model, and
// builder canonicalisation (SPEC section 4). Zero DOM access. The core
// never concatenates final prose: explanations are structured models
// that the UI renders from per-language templates, which is what keeps
// the two languages semantically identical (SPEC section 5).

function fail(code, params) {
  const error = new Error(code);
  error.code = code;
  if (params) error.params = params;
  throw error;
}

export const FIELD_DEFS = Object.freeze([
  Object.freeze({ key: "minute", index: 1, min: 0, max: 59, fullSize: 60, names: null }),
  Object.freeze({ key: "hour", index: 2, min: 0, max: 23, fullSize: 24, names: null }),
  Object.freeze({ key: "dom", index: 3, min: 1, max: 31, fullSize: 31, names: null }),
  Object.freeze({
    key: "month", index: 4, min: 1, max: 12, fullSize: 12,
    names: Object.freeze({ JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 }),
  }),
  Object.freeze({
    key: "dow", index: 5, min: 0, max: 7, fullSize: 7,
    names: Object.freeze({ SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 }),
  }),
]);

// The seven supported macros (SPEC section 4). @reboot and every other
// @… input is an error listing these.
export const MACROS = Object.freeze({
  "@hourly": "0 * * * *",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@weekly": "0 0 * * 0",
  "@monthly": "0 0 1 * *",
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
});

function fieldError(def, code, token) {
  fail(code, { field: def.key, index: def.index, token });
}

// Quartz tokens are a specific dialect error (SPEC sections 2 and 4):
// ? or # anywhere in a field, and the L / W forms as whole items or
// value suffixes. Valid names that merely contain those letters (WED,
// JUL) are names, not dialect tokens, and never reach this check
// because they resolve as names first in the caller's sweep — the
// item-level patterns below only match non-name shapes.
function checkDialect(rawField, items, def) {
  if (rawField.includes("?") || rawField.includes("#")) {
    fieldError(def, "DIALECT_TOKEN", rawField);
  }
  for (const item of items) {
    const base = item.split("/")[0];
    if (/^L(-\d+)?$/.test(base) || /^W$/.test(base) || /^\d+[LW]$/.test(base) ||
        base === "LW" || base === "WL") {
      fieldError(def, "DIALECT_TOKEN", item);
    }
  }
}

function resolveValue(token, def, itemRaw) {
  if (/^[0-9]+$/.test(token)) return Number(token);
  if (/^[A-Za-z]+$/.test(token)) {
    const named = def.names ? def.names[token.toUpperCase()] : undefined;
    if (named !== undefined) return named;
    fieldError(def, "UNKNOWN_NAME", itemRaw);
  }
  fieldError(def, "ITEM_INVALID", itemRaw);
  return 0; // unreachable
}

function checkRange(value, def, itemRaw) {
  if (value < def.min || value > def.max) {
    fieldError(def, "VALUE_RANGE", itemRaw);
  }
}

// Parse one field's text into { raw, starred, items, set }.
// A field is starred when its text begins with "*" (SPEC section 4).
export function parseField(raw, def) {
  const rawItems = raw.split(",");
  checkDialect(raw, rawItems, def);
  const items = [];
  const values = new Set();
  for (const itemRaw of rawItems) {
    if (itemRaw === "") fieldError(def, "EMPTY_ITEM", raw);
    let baseText = itemRaw;
    let step = null;
    const slash = itemRaw.indexOf("/");
    if (slash !== -1) {
      baseText = itemRaw.slice(0, slash);
      const stepText = itemRaw.slice(slash + 1);
      if (!/^[0-9]+$/.test(stepText) || Number(stepText) < 1) {
        fieldError(def, "STEP_INVALID", itemRaw);
      }
      step = Number(stepText);
    }
    let base;
    let lo;
    let hi;
    if (baseText === "*") {
      base = { type: "star" };
      lo = def.min;
      hi = def.key === "dow" ? 6 : def.max;
    } else if (baseText.includes("-")) {
      const [aText, bText, extra] = baseText.split("-");
      if (extra !== undefined || aText === "" || bText === "") {
        fieldError(def, "ITEM_INVALID", itemRaw);
      }
      const a = resolveValue(aText, def, itemRaw);
      const b = resolveValue(bText, def, itemRaw);
      checkRange(a, def, itemRaw);
      checkRange(b, def, itemRaw);
      if (a > b) fieldError(def, "RANGE_ORDER", itemRaw);
      base = { type: "range", a, b };
      lo = a;
      hi = b;
    } else {
      const a = resolveValue(baseText, def, itemRaw);
      checkRange(a, def, itemRaw);
      base = { type: "single", a };
      // For DOW, 7 is Sunday and normalises to 0 before any a/n
      // expansion, so 7/2 steps over 0,2,4,6 rather than nothing.
      lo = def.key === "dow" && a === 7 ? 0 : a;
      // a/n means a-max/n (Vixie behaviour, SPEC section 4).
      hi = step !== null ? (def.key === "dow" ? 6 : def.max) : lo;
    }
    for (let v = lo; v <= hi; v += step ?? 1) {
      values.add(def.key === "dow" && v === 7 ? 0 : v);
    }
    items.push({ base, step, raw: itemRaw });
  }
  const set = [...values].sort((x, y) => x - y);
  return { raw, starred: raw.startsWith("*"), items, set, def };
}

export function parseExpression(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (trimmed.startsWith("@")) {
    const expansion = MACROS[trimmed.toLowerCase()];
    if (expansion === undefined) {
      fail("MACRO_UNKNOWN", {
        token: trimmed,
        supported: Object.keys(MACROS).join(" "),
      });
    }
    const parsed = parseExpression(expansion);
    return { ...parsed, macro: trimmed.toLowerCase(), text: expansion };
  }
  const parts = trimmed === "" ? [] : trimmed.split(/[ \t]+/);
  if (parts.length !== 5) fail("FIELD_COUNT", { count: parts.length });
  return {
    fields: parts.map((raw, i) => parseField(raw, FIELD_DEFS[i])),
    macro: null,
    text: parts.join(" "),
  };
}

// --- Day matching (SPEC section 4, normative) ---
// Both day fields restricted (unstarred): DOM matches OR DOW matches.
// In every other case: DOM matches AND DOW matches, each by its value
// set (a plain "*" set is the full range, so it matches every day).

export function dayMatches(parsed, date) {
  const dom = parsed.fields[2];
  const dow = parsed.fields[4];
  const domMatch = dom.set.includes(date.getDate());
  const dowMatch = dow.set.includes(date.getDay());
  if (!dom.starred && !dow.starred) return domMatch || dowMatch;
  return domMatch && dowMatch;
}

export function matchesAt(parsed, date) {
  return (
    parsed.fields[0].set.includes(date.getMinutes()) &&
    parsed.fields[1].set.includes(date.getHours()) &&
    parsed.fields[3].set.includes(date.getMonth() + 1) &&
    dayMatches(parsed, date)
  );
}

// --- Next-run enumeration (SPEC section 4) ---
// Firings occur at second 0 of matching minutes. Enumeration begins
// at the first minute boundary strictly after the start and advances
// minute by minute in local time; the search span is 4 years + 1 day.

export function nextRuns(parsed, start, count = 10) {
  const runs = [];
  const cursor = new Date(start.getTime());
  cursor.setSeconds(0, 0);
  if (cursor.getTime() <= start.getTime()) {
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  const end = new Date(start.getTime());
  end.setFullYear(end.getFullYear() + 4);
  end.setDate(end.getDate() + 1);
  const endMs = end.getTime();
  const minuteSet = new Set(parsed.fields[0].set);
  const hourSet = new Set(parsed.fields[1].set);
  const monthSet = new Set(parsed.fields[3].set);
  while (cursor.getTime() <= endMs && runs.length < count) {
    if (
      minuteSet.has(cursor.getMinutes()) &&
      hourSet.has(cursor.getHours()) &&
      monthSet.has(cursor.getMonth() + 1) &&
      dayMatches(parsed, cursor)
    ) {
      runs.push(new Date(cursor.getTime()));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return { runs, exhausted: runs.length < count };
}

// --- Explanation model (SPEC section 4: structured, prose-free) ---

export function describeField(field) {
  const { def, items, set } = field;
  if (set.length === def.fullSize) return { kind: "every" };
  if (set.length === 1) return { kind: "single", value: set[0] };
  if (items.length === 1 && items[0].step !== null) {
    const item = items[0];
    if (item.base.type === "star") return { kind: "step", base: "all", step: item.step };
    if (item.base.type === "range") {
      return { kind: "step", base: "range", a: item.base.a, b: item.base.b, step: item.step };
    }
    return { kind: "step", base: "from", a: item.base.a, step: item.step };
  }
  if (items.length === 1 && items[0].base.type === "range") {
    return { kind: "range", a: items[0].base.a, b: items[0].base.b };
  }
  if (set.length <= 6) return { kind: "list", values: [...set] };
  return { kind: "summary", count: set.length };
}

export function buildExplanation(parsed, { neverFires = false } = {}) {
  return {
    fields: parsed.fields.map((field) => describeField(field)),
    // The OR-rule sentence is mandatory whenever both day fields are
    // restricted (SPEC section 4).
    bothDayRestricted: !parsed.fields[2].starred && !parsed.fields[4].starred,
    neverFires,
  };
}

// --- Builder canonical form (SPEC section 4) ---
// A field built by the controls is written as "*" when its set is the
// full range; otherwise comma-joined items where maximal consecutive
// runs of length >= 3 collapse to a-b and runs of 2 stay a,b.

export function canonicalFromValues(set, def) {
  const sorted = [...set].sort((x, y) => x - y);
  if (sorted.length === def.fullSize) return "*";
  const parts = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j += 1;
    const runLength = j - i + 1;
    if (runLength >= 3) parts.push(`${sorted[i]}-${sorted[j]}`);
    else for (let k = i; k <= j; k += 1) parts.push(String(sorted[k]));
    i = j + 1;
  }
  return parts.join(",");
}

export function canonicalFromRange(a, b, def) {
  const full = def.key === "dow" ? a === 0 && b >= 6 : a === def.min && b === def.max;
  if (full) return "*";
  if (a === b) return String(a);
  return `${a}-${b}`;
}

export function canonicalFromStep(base, step, def) {
  if (step === 1) {
    // A step of 1 is just the base set; write it canonically.
    if (base.type === "star") return "*";
    if (base.type === "range") return canonicalFromRange(base.a, base.b, def);
    const max = def.key === "dow" ? 6 : def.max;
    return canonicalFromRange(base.a, max, def);
  }
  if (base.type === "star") return `*/${step}`;
  if (base.type === "range") return `${base.a}-${base.b}/${step}`;
  return `${base.a}/${step}`;
}

// Classify a parsed field into a builder shape (SPEC section 3): the
// builder reflects the field exactly when it matches a builder shape,
// and reports "custom" when it does not.
export function classifyShape(field) {
  const { def, items, set } = field;
  if (set.length === def.fullSize) return { mode: "every" };
  // A DOW range touching the raw 7 wraps through Sunday; checkboxes
  // represent its set exactly, a 0-6 range control cannot.
  const touchesSeven =
    def.key === "dow" &&
    items.some(
      (item) =>
        (item.base.type === "range" && (item.base.a === 7 || item.base.b === 7)) ||
        (item.base.type === "single" && item.base.a === 7),
    );
  if (items.length === 1 && !touchesSeven) {
    const item = items[0];
    if (item.step !== null) return { mode: "step", base: item.base, step: item.step };
    if (item.base.type === "range") return { mode: "range", a: item.base.a, b: item.base.b };
    if (item.base.type === "star") return { mode: "every" };
    return { mode: "values" };
  }
  if (items.every((item) => item.step === null && item.base.type === "single")) {
    return { mode: "values" };
  }
  if (items.length === 1 && touchesSeven && items[0].step === null) {
    return { mode: "values" };
  }
  return { mode: "custom" };
}
