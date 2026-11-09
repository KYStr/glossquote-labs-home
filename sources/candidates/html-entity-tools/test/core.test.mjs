import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalNameFor,
  codePointLabel,
  convertText,
  decodeText,
  encodeText,
} from "../public/js/core/convert.mjs";
import { NAMED_REFERENCES } from "../public/js/core/entities.mjs";

test("encode fixture: the mandatory five in named style", () => {
  const result = encodeText(`Tom & "Jerry" <3 'ok'`, { nonAscii: false, style: "named" });
  assert.equal(result.output, "Tom &amp; &quot;Jerry&quot; &lt;3 &apos;ok&apos;");
  assert.equal(result.changes.length, 6);
  assert.deepEqual(result.changes[0], { index: 4, source: "&", output: "&amp;", notes: [] });
});

test("encode fixture: non-ASCII named style, with decimal and hex styles", () => {
  assert.equal(
    encodeText("café —", { nonAscii: true, style: "named" }).output,
    "caf&eacute; &mdash;",
  );
  assert.equal(
    encodeText("café —", { nonAscii: true, style: "decimal" }).output,
    "caf&#233; &#8212;",
  );
  assert.equal(
    encodeText("café —", { nonAscii: true, style: "hex" }).output,
    "caf&#xE9; &#x2014;",
  );
  // With the option off, non-ASCII passes through untouched.
  assert.equal(
    encodeText("café —", { nonAscii: false, style: "named" }).output,
    "café —",
  );
  // The mandatory five are named in every style.
  assert.equal(encodeText("&", { nonAscii: true, style: "hex" }).output, "&amp;");
  // An input reference is data: its ampersand encodes again.
  const again = encodeText("&amp;", { nonAscii: false, style: "named" });
  assert.equal(again.output, "&amp;amp;");
  assert.equal(again.changes.length, 1);
  // C0 controls other than tab/LF/CR escape when the option is on.
  assert.equal(encodeText("ab", { nonAscii: true, style: "decimal" }).output, "a&#11;b");
  assert.equal(encodeText("a\tb\nc", { nonAscii: true, style: "decimal" }).output, "a\tb\nc");
});

test("canonical name choice: shortest wins, ties break lexicographically", () => {
  assert.equal(canonicalNameFor(0x2260), "ne"); // beats NotEqual
  assert.equal(canonicalNameFor(0x00a0), "nbsp"); // beats NonBreakingSpace
  assert.equal(canonicalNameFor(0x00a9), "COPY"); // ties with copy, lexicographic first
  assert.equal(canonicalNameFor(0x00e9), "eacute");
  assert.equal(canonicalNameFor(0x2014), "mdash");
  assert.equal(canonicalNameFor(0x10ffff), null); // no name exists
});

test("decode fixtures: named references, including prefix-sensitivity", () => {
  assert.equal(decodeText("&notin;").output, "∉");
  assert.equal(decodeText("&notin;").changes[0].output.codePointAt(0), 0x2209);
  assert.equal(decodeText("&not;").output, "¬");
  assert.equal(codePointLabel("∉"), "U+2209");
});

test("decode fixture: unknown name is unresolved and unchanged", () => {
  const result = decodeText("&notreal;");
  assert.equal(result.output, "&notreal;");
  assert.equal(result.changes.length, 0);
  assert.deepEqual(result.unresolved, [
    { index: 0, source: "&notreal;", reason: "UNKNOWN_NAME" },
  ]);
});

test("decode fixtures: C1 remap, surrogate and zero rules are noted", () => {
  const c1 = decodeText("&#150;");
  assert.equal(c1.output, "–");
  assert.deepEqual(c1.changes[0].notes, ["C1_REMAP"]);
  const surrogate = decodeText("&#xD800;");
  assert.equal(surrogate.output, "�");
  assert.deepEqual(surrogate.changes[0].notes, ["SURROGATE_REPLACEMENT"]);
  const zero = decodeText("&#0;");
  assert.equal(zero.output, "�");
  assert.deepEqual(zero.changes[0].notes, ["ZERO_REPLACEMENT"]);
});

test("decode fixture: double-encoded input converts once and raises the hint", () => {
  const result = decodeText("&amp;lt;");
  assert.equal(result.output, "&lt;");
  assert.equal(result.doubleEncoded, true);
  assert.equal(decodeText("&lt;").doubleEncoded, false);
  assert.equal(decodeText("plain").doubleEncoded, false);
});

test("decode fixture: a bare ampersand is ordinary text", () => {
  const result = decodeText("Fish & Chips");
  assert.equal(result.output, "Fish & Chips");
  assert.equal(result.changes.length, 0);
  assert.equal(result.unresolved.length, 0);
  const lone = decodeText("&");
  assert.equal(lone.output, "&");
  assert.equal(lone.unresolved.length, 0);
  const noSemi = decodeText("&amp");
  assert.equal(noSemi.output, "&amp");
  assert.equal(noSemi.unresolved.length, 0);
});

test("numeric boundary sweep with expected code points and rule notes", () => {
  const cases = [
    ["&#0;", 0xfffd, ["ZERO_REPLACEMENT"]],
    ["&#127;", 0x007f, []],
    ["&#128;", 0x20ac, ["C1_REMAP"]],
    ["&#159;", 0x0178, ["C1_REMAP"]],
    ["&#160;", 0x00a0, []],
    ["&#55295;", 0xd7ff, []],
    ["&#55296;", 0xfffd, ["SURROGATE_REPLACEMENT"]],
    ["&#57343;", 0xfffd, ["SURROGATE_REPLACEMENT"]],
    ["&#1114111;", 0x10ffff, []],
    ["&#1114112;", 0xfffd, ["RANGE_REPLACEMENT"]],
    ["&#x10FFFF;", 0x10ffff, []],
    ["&#X41;", 0x0041, []],
  ];
  for (const [input, cp, notes] of cases) {
    const result = decodeText(input);
    assert.equal(result.output.codePointAt(0), cp, input);
    assert.deepEqual(result.changes[0].notes, notes, input);
  }
});

// The Standard's C1 mapping, transcribed here independently of the
// shipped data module (SPEC section 7c): all 32 entries.
test("C1 table: all 32 entries decode to the Standard's mapping", () => {
  const expected = {
    0x80: 0x20ac, 0x81: 0x0081, 0x82: 0x201a, 0x83: 0x0192,
    0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
    0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039,
    0x8c: 0x0152, 0x8d: 0x008d, 0x8e: 0x017d, 0x8f: 0x008f,
    0x90: 0x0090, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201c,
    0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
    0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a,
    0x9c: 0x0153, 0x9d: 0x009d, 0x9e: 0x017e, 0x9f: 0x0178,
  };
  for (const [value, cp] of Object.entries(expected)) {
    const result = decodeText(`&#${value};`);
    assert.equal(result.output.codePointAt(0), cp, `C1 ${value}`);
    assert.deepEqual(result.changes[0].notes, ["C1_REMAP"]);
  }
});

test("named table conformance: count and a 50-name sample across the alphabet", () => {
  assert.equal(Object.keys(NAMED_REFERENCES).length, 2231);
  assert.equal(
    Object.keys(NAMED_REFERENCES).filter((key) => key.endsWith(";")).length,
    2125,
  );
  // Sample expectations derived from the official WHATWG entities
  // list at authoring time (see PROVENANCE.md), spread evenly across
  // the sorted semicolon-form names.
  const sample = {
    AElig: "Æ", Cedilla: "¸", Dopf: "𝔻", Egrave: "È", GreaterTilde: "≳",
    Jfr: "𝔍", LeftUpVector: "↿", Ncy: "Н", NotReverseElement: "∌", Ouml: "Ö",
    RightAngleBracket: "⟩", ShortUpArrow: "↑", TildeFullEqual: "≅", VDash: "⊫",
    Zfr: "ℨ", angst: "Å", bfr: "𝔟", boxUL: "╝", bsolb: "⧅", circledast: "⊛",
    cupdot: "⊍", diams: "♦", ecaron: "ě", equiv: "≡", frac35: "⅗",
    gnapprox: "⪊", hoarr: "⇿", intlarhk: "⨗", lHar: "⥢", leftarrow: "←",
    lmoust: "⎰", lsquo: "‘", minusd: "∸", ncongdot: "⩭̸", nles: "⩽̸",
    nsim: "≁", nvrArr: "⤃", or: "∨", plusacir: "⨣", qfr: "𝔮",
    rbrke: "⦌", rmoustache: "⎱", sdot: "⋅", smte: "⪬", subne: "⊊",
    supsim: "⫈", trade: "™", ultri: "◸", varsupsetneq: "⊋︀", xhArr: "⟺",
  };
  assert.equal(Object.keys(sample).length, 50);
  for (const [name, characters] of Object.entries(sample)) {
    assert.equal(NAMED_REFERENCES[`${name};`], characters, `&${name};`);
    assert.equal(decodeText(`&${name};`).output, characters, `&${name};`);
  }
  // A two-code-point reference decodes in full.
  const two = decodeText("&NotEqualTilde;");
  assert.deepEqual([...two.output].map((c) => c.codePointAt(0)), [8770, 824]);
});

test("unresolved taxonomy: malformed numeric forms are reported, not converted", () => {
  const bad = decodeText("&#xZZ;");
  assert.equal(bad.output, "&#xZZ;");
  assert.deepEqual(bad.unresolved, [
    { index: 0, source: "&#xZZ;", reason: "INVALID_NUMBER" },
  ]);
  const empty = decodeText("&#;");
  assert.deepEqual(empty.unresolved, [
    { index: 0, source: "&#;", reason: "INVALID_NUMBER" },
  ]);
  // Semicolon-less legacy named forms stay literal by design (SPEC
  // section 2): no conversion, no unresolved entry.
  const legacy = decodeText("&notin");
  assert.equal(legacy.output, "&notin");
  assert.equal(legacy.unresolved.length, 0);
});

test("missing-semicolon numeric references convert and are flagged", () => {
  const atEnd = decodeText("&#150");
  assert.equal(atEnd.output, "–");
  assert.deepEqual(atEnd.changes[0].notes, ["C1_REMAP", "MISSING_SEMICOLON"]);
  const midText = decodeText("&#65x");
  assert.equal(midText.output, "Ax");
  assert.deepEqual(midText.changes[0].notes, ["MISSING_SEMICOLON"]);
  const hex = decodeText("&#x41");
  assert.equal(hex.output, "A");
  assert.deepEqual(hex.changes[0].notes, ["MISSING_SEMICOLON"]);
});

test("change-list positions are code-point indices, astral-safe", () => {
  const result = decodeText("😀&#150;");
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0].index, 1);
  const named = decodeText("😀&notin;");
  assert.equal(named.changes[0].index, 1);
});

test("round trip: encode then decode is an identity over a mixed corpus", () => {
  const corpus = [
    `<p class="x">Tom & Jerry's "show"</p>`,
    "café — naïve… fin",
    "中文混排 ∉ 符號 &copy; 與 &#x4E2D;",
    "😀 astral plane & 𐀀 text",
    "already &amp; encoded &lt;bits&gt;",
    "5 > 3 & 2 < 4",
  ];
  for (const options of [
    { nonAscii: true, style: "named" },
    { nonAscii: true, style: "decimal" },
    { nonAscii: true, style: "hex" },
    { nonAscii: false, style: "named" },
  ]) {
    for (const text of corpus) {
      const encoded = encodeText(text, options);
      assert.equal(decodeText(encoded.output).output, text, JSON.stringify(options));
    }
  }
});

test("size cap: 100,000 characters convert, 100,001 are refused with the count", () => {
  const atCap = convertText("decode", "a".repeat(100000));
  assert.equal(atCap.ok, true);
  const over = convertText("decode", "a".repeat(100001));
  assert.equal(over.ok, false);
  assert.equal(over.code, "INPUT_TOO_LARGE");
  assert.equal(over.count, 100001);
});
