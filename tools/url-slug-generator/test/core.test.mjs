// Core tests. Expected values come from the fixed SPEC fixtures
// (test/fixtures.json, copied verbatim from docs/specs/url-slug-generator)
// plus cases derived by hand from the SPEC rules and checked against the
// platform's own NFKD/lowercase behaviour — never from the core's output.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { run } from "../public/js/core/core.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8")
);
const coreCases = fixtures.cases.filter((c) => c.kind === "core");

for (const c of coreCases) {
  test(`fixture ${c.id}`, () => {
    assert.deepEqual(run(c.input), c.expected);
  });
}

test("output field order is slug, length, maxLength, truncated", () => {
  const { result } = run({ title: "Hello World", maxLength: "" });
  assert.deepEqual(Object.keys(result), ["slug", "length", "maxLength", "truncated"]);
});

test("boundary: maxLength 1 and 100 are legal, 101 is RANGE", () => {
  assert.deepEqual(run({ title: "Hello World", maxLength: "100" }), {
    ok: true,
    result: { slug: "hello-world", length: 11, maxLength: 100, truncated: false },
  });
  assert.deepEqual(run({ title: "Hello World", maxLength: "101" }), {
    ok: false,
    error: { code: "RANGE", field: "maxLength", row: null },
  });
});

test("boundary: title length 1000 is legal capacity-wise, 1001 is INPUT_LIMIT", () => {
  assert.deepEqual(run({ title: "a".repeat(1000), maxLength: "" }), {
    ok: true,
    result: { slug: "a".repeat(50), length: 50, maxLength: 50, truncated: true },
  });
  assert.deepEqual(run({ title: "a".repeat(1001), maxLength: "" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "title", row: null },
  });
  // Exactly 1000 units of a title that converts to nothing is EMPTY_SLUG,
  // not a capacity error.
  assert.deepEqual(run({ title: " ".repeat(1000), maxLength: "" }), {
    ok: false,
    error: { code: "EMPTY_SLUG", field: "title", row: null },
  });
});

test("maxLength grammar: leading zeros, spaces, signs, exponents are INTEGER_FORMAT", () => {
  for (const bad of ["00", "050", " 50", "50 ", "+50", "-50", "1e2", "50.0", "５０"]) {
    assert.deepEqual(
      run({ title: "Hello World", maxLength: bad }),
      { ok: false, error: { code: "INTEGER_FORMAT", field: "maxLength", row: null } },
      `expected INTEGER_FORMAT for ${JSON.stringify(bad)}`
    );
  }
  // "0" passes the integer grammar but is out of range 1-100.
  assert.deepEqual(run({ title: "Hello World", maxLength: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "maxLength", row: null },
  });
});

test("maxLength capacity: 9 raw units is INPUT_LIMIT, before grammar", () => {
  assert.deepEqual(run({ title: "Hello World", maxLength: "123456789" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "maxLength", row: null },
  });
  assert.deepEqual(run({ title: "Hello World", maxLength: "000000000" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "maxLength", row: null },
  });
  // Exactly 8 raw units is legal capacity-wise (value still range-checked).
  assert.equal(run({ title: "Hello World", maxLength: "00000050" }).error.code, "INTEGER_FORMAT");
  assert.equal(run({ title: "Hello World", maxLength: "12345678" }).error.code, "RANGE");
});

test("empty maxLength means unset and applies the default 50", () => {
  assert.deepEqual(run({ title: "Hello World", maxLength: "" }), {
    ok: true,
    result: { slug: "hello-world", length: 11, maxLength: 50, truncated: false },
  });
});

test("first error wins, in SPEC order", () => {
  // Capacity: title before maxLength.
  assert.deepEqual(run({ title: "a".repeat(1001), maxLength: "123456789" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "title", row: null },
  });
  // Grammar: title EMPTY before maxLength RANGE.
  assert.deepEqual(run({ title: "", maxLength: "0" }), {
    ok: false,
    error: { code: "EMPTY", field: "title", row: null },
  });
  // Grammar: title EMPTY before maxLength INTEGER_FORMAT.
  assert.deepEqual(run({ title: "", maxLength: "12.5" }), {
    ok: false,
    error: { code: "EMPTY", field: "title", row: null },
  });
  // Surrogate (step 2) before grammar (step 3): a lone surrogate is
  // UNICODE even though the title is otherwise non-empty.
  assert.deepEqual(run({ title: "\uD800", maxLength: "0" }), {
    ok: false,
    error: { code: "UNICODE", field: "title", row: null },
  });
});

test("schema: wrong types, missing/extra fields, accessors", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run("Hello"), schema);
  assert.deepEqual(run(["Hello", ""]), schema);
  assert.deepEqual(run({ title: "Hello" }), schema);
  assert.deepEqual(run({ title: "Hello", maxLength: 50 }), schema);
  assert.deepEqual(run({ title: "Hello", maxLength: "", extra: "1" }), schema);
  const withGetter = { maxLength: "" };
  Object.defineProperty(withGetter, "title", {
    enumerable: true,
    get() {
      return "Hello";
    },
  });
  assert.deepEqual(run(withGetter), schema);
  // A null-prototype object with exactly the two own data properties is
  // still a plain object for this interface.
  const nullProto = Object.create(null);
  nullProto.title = "Hello";
  nullProto.maxLength = "";
  assert.deepEqual(run(nullProto), {
    ok: true,
    result: { slug: "hello", length: 5, maxLength: 50, truncated: false },
  });
});

test("unicode: lone surrogate is UNICODE, after INPUT_LIMIT order", () => {
  assert.deepEqual(run({ title: "\uD800", maxLength: "" }), {
    ok: false,
    error: { code: "UNICODE", field: "title", row: null },
  });
  assert.deepEqual(run({ title: "a\uDC00b", maxLength: "" }), {
    ok: false,
    error: { code: "UNICODE", field: "title", row: null },
  });
  assert.deepEqual(run({ title: "\uD800" + "a".repeat(1000), maxLength: "" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "title", row: null },
  });
  // The surrogate check is title-only: a surrogate in maxLength fails
  // the integer grammar instead.
  assert.deepEqual(run({ title: "Hello", maxLength: "\uD800" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "maxLength", row: null },
  });
  // A paired surrogate is a valid character; an emoji is a separator.
  assert.deepEqual(run({ title: "Hello 😀 World", maxLength: "" }), {
    ok: true,
    result: { slug: "hello-world", length: 11, maxLength: 50, truncated: false },
  });
});

test("special Latin map: all 14 pinned items, both cases", () => {
  const pairs = [
    ["Æ æ", "ae-ae"],
    ["Œ œ", "oe-oe"],
    ["Ø ø", "o-o"],
    ["Đ đ", "d-d"],
    ["Ð ð", "d-d"],
    ["Þ þ", "th-th"],
    ["Ł ł", "l-l"],
    ["Straße", "strasse"],
    ["Æsop", "aesop"],
    ["Łódź", "lodz"],
  ];
  for (const [title, slug] of pairs) {
    assert.deepEqual(
      run({ title, maxLength: "" }),
      {
        ok: true,
        result: { slug, length: slug.length, maxLength: 50, truncated: false },
      },
      `expected ${slug} for ${JSON.stringify(title)}`
    );
  }
});

test("capital sharp-S ẞ is not in the table and is a separator", () => {
  // ẞ lowercases to ß, but the map runs before lowercasing and ß itself
  // is not [a-z0-9], so ẞ can never become "ss".
  assert.deepEqual(run({ title: "ẞ", maxLength: "" }), {
    ok: false,
    error: { code: "EMPTY_SLUG", field: "title", row: null },
  });
  assert.deepEqual(run({ title: "GROẞE", maxLength: "" }), {
    ok: true,
    result: { slug: "gro-e", length: 5, maxLength: 50, truncated: false },
  });
  assert.deepEqual(run({ title: "AẞB", maxLength: "" }), {
    ok: true,
    result: { slug: "a-b", length: 3, maxLength: 50, truncated: false },
  });
});

test("NFKD: ligatures, fullwidth, circled digits, fractions, dotted capital I", () => {
  assert.equal(run({ title: "ﬁsh", maxLength: "" }).result.slug, "fish");
  assert.equal(run({ title: "Ångström", maxLength: "" }).result.slug, "angstrom");
  assert.equal(run({ title: "① Top", maxLength: "" }).result.slug, "1-top");
  // ½ NFKD-decomposes to "1⁄2"; the fraction slash is a separator.
  assert.equal(run({ title: "½", maxLength: "" }).result.slug, "1-2");
  // İ NFKD-decomposes to I + U+0307, the mark is stripped, then "i".
  assert.equal(run({ title: "İ", maxLength: "" }).result.slug, "i");
  assert.equal(run({ title: "ﬀ", maxLength: "" }).result.slug, "ff");
});

test("separators: underscore, punctuation, emoji, dashes and spaces all fold", () => {
  assert.equal(run({ title: "a_b_c", maxLength: "" }).result.slug, "a-b-c");
  assert.equal(run({ title: "a.b/c\\d", maxLength: "" }).result.slug, "a-b-c-d");
  assert.equal(run({ title: "Hello—World", maxLength: "" }).result.slug, "hello-world");
  assert.equal(run({ title: "Hello 👋 World", maxLength: "" }).result.slug, "hello-world");
  assert.equal(run({ title: "  Hello  World  ", maxLength: "" }).result.slug, "hello-world");
  assert.equal(run({ title: "don't stop believin'", maxLength: "" }).result.slug, "don-t-stop-believin");
});

test("truncation cuts on a hyphen and strips it", () => {
  // Full slug "aa-bb-cc"; cutting at 3 leaves "aa-" → "aa".
  assert.deepEqual(run({ title: "aa bb cc", maxLength: "3" }), {
    ok: true,
    result: { slug: "aa", length: 2, maxLength: 3, truncated: true },
  });
  // Cutting at 5 lands exactly after "bb", no strip needed.
  assert.deepEqual(run({ title: "aa bb cc", maxLength: "5" }), {
    ok: true,
    result: { slug: "aa-bb", length: 5, maxLength: 5, truncated: true },
  });
  // Cutting at 2 leaves "aa".
  assert.deepEqual(run({ title: "aa bb cc", maxLength: "2" }), {
    ok: true,
    result: { slug: "aa", length: 2, maxLength: 2, truncated: true },
  });
  // Cutting at 6 leaves "aa-bb-" → "aa-bb".
  assert.deepEqual(run({ title: "aa bb cc", maxLength: "6" }), {
    ok: true,
    result: { slug: "aa-bb", length: 5, maxLength: 6, truncated: true },
  });
});

test("invariants: every accepted slug matches the slug grammar and fits the cap", () => {
  const re = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  const inputs = [
    { title: "Hello World: A Beginner's Guide!", maxLength: "" },
    { title: "Café au lait & crème brûlée", maxLength: "" },
    { title: "Æsop's Œuvre — Straße & Łódź", maxLength: "" },
    { title: "2026 台北 Taipei 旅行指南", maxLength: "" },
    { title: "---Hello---World___2026---", maxLength: "" },
    { title: "The Quick Brown Fox Jumps Over The Lazy Dog", maxLength: "20" },
    { title: "Hello World", maxLength: "1" },
    { title: "Top 10 Tips for 2026!", maxLength: "" },
    { title: "Ｈｅｌｌｏ Ｗｏｒｌｄ：ﬁle 2026", maxLength: "" },
    { title: "a_b_c d-e.f/g\\h", maxLength: "7" },
    { title: "½ ① ﬁsh & chips", maxLength: "10" },
    { title: "ẞ GROẞE", maxLength: "" },
  ];
  for (const input of inputs) {
    const { ok, result } = run(input);
    assert.equal(ok, true, JSON.stringify(input));
    assert.match(result.slug, re);
    assert.ok(result.length <= result.maxLength);
    assert.equal(result.length, result.slug.length);
  }
});
