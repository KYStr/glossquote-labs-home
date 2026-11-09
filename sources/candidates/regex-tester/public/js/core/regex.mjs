// Pure core for the Regex Tester and Replacer (SPEC sections 2 and 4).
//
// No DOM access: the core assembles flags, runs match enumeration over
// the host ECMAScript RegExp engine, converts indices between UTF-16
// code units and Unicode code points, expands ECMAScript substitution
// strings, and returns plain result models. It never stores, sends or
// logs the pattern or the text.

export const LIMITS = Object.freeze({
  patternCodePoints: 500,
  textCodePoints: 50000,
  replacementCodePoints: 1000,
  matches: 1000,
});

export const FLAG_ORDER = "gimsuy";

function fail(code, params) {
  const error = new Error(code);
  error.code = code;
  if (params) error.params = params;
  throw error;
}

export function countCodePoints(text) {
  let count = 0;
  for (const _char of text) count += 1;
  return count;
}

// cpAtUnit[i] = number of code points in text.slice(0, i), for every
// UTF-16 code-unit index i in [0, text.length] — exactly the SPEC 4
// definition. The middle index of a surrogate pair (reachable when a
// non-u pattern matches one half on its own) counts the lone first
// half as one code point, because string iteration yields unpaired
// surrogates as single code points; so table[mid] = points + 1, the
// same value as at the end of the pair.
export function buildCodePointIndex(text) {
  const table = new Array(text.length + 1);
  let units = 0;
  let points = 0;
  table[0] = 0;
  for (const char of text) {
    const width = char.length;
    for (let step = 1; step < width; step += 1) {
      table[units + step] = points + 1;
    }
    units += width;
    points += 1;
    table[units] = points;
  }
  return table;
}

// Flags: the toggle set maps one-to-one to RegExp flags; the assembled
// string order is fixed as gimsuy filtered to enabled flags (SPEC 4).
export function assembleFlags(enabled) {
  let flags = "";
  for (const flag of FLAG_ORDER) {
    if (enabled && enabled[flag]) flags += flag;
  }
  return flags;
}

// Extract named capture groups in pattern order: [{number, name}].
// The scanner understands escapes and character classes well enough to
// ignore parentheses inside them; it only reports names, never validity
// (the engine's own SyntaxError is the validity contract).
export function namedGroupsOf(pattern) {
  const names = [];
  let groupNumber = 0;
  let index = 0;
  let inClass = false;
  while (index < pattern.length) {
    const char = pattern[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (inClass) {
      if (char === "]") inClass = false;
      index += 1;
      continue;
    }
    if (char === "[") {
      inClass = true;
      index += 1;
      continue;
    }
    if (char === "(") {
      if (pattern[index + 1] !== "?") {
        groupNumber += 1;
      } else if (pattern[index + 2] === "<" && pattern[index + 3] !== "=" && pattern[index + 3] !== "!") {
        groupNumber += 1;
        const close = pattern.indexOf(">", index + 3);
        if (close !== -1) {
          names.push({ number: groupNumber, name: pattern.slice(index + 3, close) });
          index = close + 1;
          continue;
        }
      }
      index += 1;
      continue;
    }
    index += 1;
  }
  return names;
}

// ECMAScript AdvanceStringIndex: move one code point forward when the
// unicode flag is set and the current position starts a surrogate pair,
// otherwise one code unit.
export function advanceStringIndex(text, index, unicode) {
  if (!unicode || index + 1 >= text.length) return index + 1;
  const first = text.charCodeAt(index);
  if (first < 0xd800 || first > 0xdbff) return index + 1;
  const second = text.charCodeAt(index + 1);
  if (second < 0xdc00 || second > 0xdfff) return index + 1;
  return index + 2;
}

function toMatchModel(raw, number, cpTable, nameByNumber) {
  const startUnit = raw.index;
  const endUnit = raw.index + raw[0].length;
  const groups = [];
  for (let n = 1; n < raw.length; n += 1) {
    groups.push({
      number: n,
      name: nameByNumber.get(n) ?? null,
      value: raw[n] === undefined ? null : raw[n],
    });
  }
  return {
    number,
    text: raw[0],
    startUnit,
    endUnit,
    startCp: cpTable[startUnit],
    endCp: cpTable[endUnit],
    zeroWidth: raw[0].length === 0,
    groups,
  };
}

function enumerateRaw(pattern, flagString, text, makeRegExp) {
  const re = makeRegExp(pattern, flagString);
  const globalLike = flagString.includes("g") || flagString.includes("y");
  const raws = [];
  let capped = false;
  if (!globalLike) {
    re.lastIndex = 0;
    const raw = re.exec(text);
    if (raw) raws.push(raw);
    return { raws, capped };
  }
  re.lastIndex = 0;
  for (;;) {
    const raw = re.exec(text);
    if (!raw) break;
    raws.push(raw);
    const zeroWidth = raw[0].length === 0;
    if (raws.length >= LIMITS.matches) {
      // Probe once past the cap (with the zero-width advance applied)
      // so the result can honestly say "stopped at 1,000" only when a
      // further match actually exists; exactly 1,000 is complete.
      if (zeroWidth) {
        re.lastIndex = advanceStringIndex(text, re.lastIndex, flagString.includes("u"));
      }
      capped = re.exec(text) !== null;
      break;
    }
    if (zeroWidth) {
      re.lastIndex = advanceStringIndex(text, re.lastIndex, flagString.includes("u"));
    }
  }
  return { raws, capped };
}

function checkLimits(pattern, text) {
  if (countCodePoints(pattern) > LIMITS.patternCodePoints) fail("PATTERN_TOO_LONG");
  if (countCodePoints(text) > LIMITS.textCodePoints) fail("TEXT_TOO_LONG");
}

// Match mode. Throws coded errors for limit violations; a SyntaxError
// from the RegExp constructor propagates untouched so the UI can show
// the engine's message verbatim (SPEC 3).
export function runMatch({ pattern, flags, text }, deps = {}) {
  checkLimits(pattern, text);
  const makeRegExp = deps.makeRegExp ?? ((p, f) => new RegExp(p, f));
  const now = deps.now ?? (() => performance.now());
  const flagString = assembleFlags(flags);
  const cpTable = buildCodePointIndex(text);
  const nameByNumber = new Map(namedGroupsOf(pattern).map((entry) => [entry.number, entry.name]));
  const started = now();
  const { raws, capped } = enumerateRaw(pattern, flagString, text, makeRegExp);
  const elapsedMs = Math.max(0, Math.round(now() - started));
  const matches = raws.map((raw, i) => toMatchModel(raw, i + 1, cpTable, nameByNumber));
  return { flagString, matches, capped, elapsedMs };
}

// ECMAScript GetSubstitution for one raw match. An unknown $<name> is
// a coded error naming the group (SPEC 4), not a silent literal.
export function expandReplacement(replacement, raw, text, groupNames) {
  let output = "";
  let index = 0;
  const groupCount = raw.length - 1;
  while (index < replacement.length) {
    const char = replacement[index];
    if (char !== "$" || index + 1 >= replacement.length) {
      output += char;
      index += 1;
      continue;
    }
    const next = replacement[index + 1];
    if (next === "$") {
      output += "$";
      index += 2;
      continue;
    }
    if (next === "&") {
      output += raw[0];
      index += 2;
      continue;
    }
    if (next === "`") {
      output += text.slice(0, raw.index);
      index += 2;
      continue;
    }
    if (next === "'") {
      output += text.slice(raw.index + raw[0].length);
      index += 2;
      continue;
    }
    if (next === "<") {
      const close = replacement.indexOf(">", index + 2);
      if (close === -1) {
        output += "$";
        index += 1;
        continue;
      }
      const name = replacement.slice(index + 2, close);
      if (!groupNames || !Object.prototype.hasOwnProperty.call(groupNames, name)) {
        fail("UNKNOWN_GROUP", { name });
      }
      const value = groupNames[name];
      output += value === undefined ? "" : value;
      index = close + 1;
      continue;
    }
    if (next >= "0" && next <= "9") {
      const twoDigit = replacement[index + 2];
      const hasTwo = twoDigit !== undefined && twoDigit >= "0" && twoDigit <= "9";
      const nn = hasTwo ? Number(next + twoDigit) : 0;
      if (hasTwo && nn >= 1 && nn <= groupCount) {
        const value = raw[nn];
        output += value === undefined ? "" : value;
        index += 3;
        continue;
      }
      const n = Number(next);
      if (n >= 1 && n <= groupCount) {
        const value = raw[n];
        output += value === undefined ? "" : value;
        index += 2;
        continue;
      }
      output += "$" + next + (hasTwo ? twoDigit : "");
      index += hasTwo ? 3 : 2;
      continue;
    }
    output += "$";
    index += 1;
  }
  return output;
}

// Replace mode. The result is built from the same enumeration as match
// mode, so the preview and the count cannot disagree (SPEC 4). When the
// enumeration is capped, no fabricated "result" is produced: the caller
// shows the cap state instead.
export function runReplace({ pattern, flags, text, replacement }, deps = {}) {
  checkLimits(pattern, text);
  if (countCodePoints(replacement) > LIMITS.replacementCodePoints) {
    fail("REPLACEMENT_TOO_LONG");
  }
  const makeRegExp = deps.makeRegExp ?? ((p, f) => new RegExp(p, f));
  const now = deps.now ?? (() => performance.now());
  const flagString = assembleFlags(flags);
  const started = now();
  const { raws, capped } = enumerateRaw(pattern, flagString, text, makeRegExp);
  const elapsedMs = Math.max(0, Math.round(now() - started));
  if (capped) fail("MATCH_LIMIT_REACHED");
  let result = "";
  let cursor = 0;
  for (const raw of raws) {
    result += text.slice(cursor, raw.index);
    result += expandReplacement(replacement, raw, text, raw.groups ?? null);
    cursor = raw.index + raw[0].length;
  }
  result += text.slice(cursor);
  return { flagString, result, count: raws.length, elapsedMs };
}

// Bundled presets (SPEC 2): constants shipped with the page; clicking
// one fills pattern and text only, flags stay as the user set them.
// Sample data is synthetic (example domains, fake log lines).
export const PRESETS = Object.freeze([
  Object.freeze({
    id: "email",
    pattern: String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`,
    text: "Contact sam@example.com or lee@sample.org for details.",
  }),
  Object.freeze({
    id: "date",
    pattern: String.raw`(\d{4})-(\d{2})-(\d{2})`,
    text: "due 2026-11-02, was 2025-01-30",
  }),
  Object.freeze({
    id: "order",
    pattern: String.raw`ORD-\d{6}`,
    text: "Orders ORD-104729 and ORD-208811 shipped; ref X-104729 is not an order.",
  }),
  Object.freeze({
    id: "log",
    pattern: String.raw`\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]`,
    text: "[2026-11-02 09:15:03] started worker\n[2026-11-02 09:15:04] ready",
  }),
]);

export function presetById(id) {
  return PRESETS.find((preset) => preset.id === id) ?? null;
}
