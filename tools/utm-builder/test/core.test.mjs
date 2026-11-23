// Core tests. Expected values come from the fixed SPEC fixtures
// (test/fixtures.json, copied verbatim from docs/specs/utm-builder)
// plus cases derived by hand from the SPEC rules — never from the
// core's output. Hand derivations were checked against the platform's
// own encodeURIComponent and WHATWG URL behaviour, not the product.

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

const BASE = {
  baseUrl: "https://example.com/",
  source: "facebook",
  medium: "social",
  campaign: "launch",
  term: "",
  content: "",
};

test("output shape: taggedUrl first, params key/value in fixed order", () => {
  const { result } = run({ ...BASE, term: "shoes", content: "top" });
  assert.deepEqual(Object.keys(result), ["taggedUrl", "params"]);
  assert.deepEqual(
    result.params.map((p) => p.key),
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]
  );
  for (const p of result.params) assert.deepEqual(Object.keys(p), ["key", "value"]);
  assert.equal(
    result.taggedUrl,
    "https://example.com/?utm_source=facebook&utm_medium=social&utm_campaign=launch&utm_term=shoes&utm_content=top"
  );
});

test("boundary: value trimmed 100 is legal, 101 is VALUE_TOO_LONG", () => {
  assert.equal(run({ ...BASE, campaign: "a".repeat(100) }).ok, true);
  assert.deepEqual(run({ ...BASE, campaign: "a".repeat(101) }), {
    ok: false,
    error: { code: "VALUE_TOO_LONG", field: "campaign", row: null },
  });
  // Surrounding ASCII whitespace is trimmed before the 100 check.
  assert.equal(run({ ...BASE, campaign: `  ${"a".repeat(100)}  ` }).ok, true);
  assert.deepEqual(run({ ...BASE, campaign: `  ${"a".repeat(101)}  ` }), {
    ok: false,
    error: { code: "VALUE_TOO_LONG", field: "campaign", row: null },
  });
});

test("boundary: value raw 200 passes capacity, 201 is INPUT_LIMIT", () => {
  // 200 raw units pass capacity, then fail the trimmed 100 cap.
  assert.deepEqual(run({ ...BASE, source: "a".repeat(200) }), {
    ok: false,
    error: { code: "VALUE_TOO_LONG", field: "source", row: null },
  });
  assert.deepEqual(run({ ...BASE, source: "a".repeat(201) }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "source", row: null },
  });
});

test("boundary: baseUrl raw 2048 is legal capacity-wise, 2049 is INPUT_LIMIT", () => {
  const okUrl = "https://example.com/" + "a".repeat(2028); // exactly 2048
  assert.equal(okUrl.length, 2048);
  assert.equal(run({ ...BASE, baseUrl: okUrl }).ok, true);
  const longUrl = "https://example.com/" + "a".repeat(2029); // 2049
  assert.equal(longUrl.length, 2049);
  assert.deepEqual(run({ ...BASE, baseUrl: longUrl }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "baseUrl", row: null },
  });
});

test("first error wins, in SPEC order", () => {
  // Capacity: baseUrl before source.
  assert.deepEqual(run({ ...BASE, baseUrl: "x".repeat(2049), source: "y".repeat(201) }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "baseUrl", row: null },
  });
  // Capacity: source before medium.
  assert.deepEqual(run({ ...BASE, source: "y".repeat(201), medium: "z".repeat(201) }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "source", row: null },
  });
  // URL/duplicate before per-field: duplicate beats an empty campaign.
  assert.deepEqual(
    run({ ...BASE, baseUrl: "https://example.com/?utm_source=old", campaign: "" }),
    { ok: false, error: { code: "DUPLICATE_UTM", field: "baseUrl", row: null } }
  );
  // Invalid URL before per-field: bad scheme beats an empty campaign.
  assert.deepEqual(run({ ...BASE, baseUrl: "ftp://example.com/x", campaign: "" }), {
    ok: false,
    error: { code: "INVALID_URL", field: "baseUrl", row: null },
  });
  // Per-field order: source before medium before campaign.
  assert.deepEqual(run({ ...BASE, source: "", medium: "", campaign: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "source", row: null },
  });
  assert.deepEqual(run({ ...BASE, medium: "   ", campaign: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "medium", row: null },
  });
  // EMPTY before INVALID_CHAR within the same field order: an empty
  // source wins over a control character in the medium.
  assert.deepEqual(run({ ...BASE, source: " ", medium: "a\tb" }), {
    ok: false,
    error: { code: "EMPTY", field: "source", row: null },
  });
  // INVALID_CHAR before VALUE_TOO_LONG: a 102-unit value with a tab.
  assert.deepEqual(run({ ...BASE, campaign: "a\t" + "b".repeat(100) }), {
    ok: false,
    error: { code: "INVALID_CHAR", field: "campaign", row: null },
  });
});

test("schema: wrong types, missing/extra fields, accessors", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run("https://example.com/"), schema);
  assert.deepEqual(run(["https://example.com/"]), schema);
  assert.deepEqual(run({ ...BASE, term: undefined }), schema);
  const missing = { ...BASE };
  delete missing.content;
  assert.deepEqual(run(missing), schema);
  assert.deepEqual(run({ ...BASE, extra: "1" }), schema);
  assert.deepEqual(run({ ...BASE, campaign: 42 }), schema);
  const withGetter = { ...BASE };
  Object.defineProperty(withGetter, "source", {
    enumerable: true,
    get() {
      return "facebook";
    },
  });
  assert.deepEqual(run(withGetter), schema);
  // A null-prototype object with exactly the six own data properties is
  // still a plain object for this interface.
  const nullProto = Object.create(null);
  for (const [k, v] of Object.entries(BASE)) nullProto[k] = v;
  assert.deepEqual(run(nullProto), {
    ok: true,
    result: {
      taggedUrl:
        "https://example.com/?utm_source=facebook&utm_medium=social&utm_campaign=launch",
      params: [
        { key: "utm_source", value: "facebook" },
        { key: "utm_medium", value: "social" },
        { key: "utm_campaign", value: "launch" },
      ],
    },
  });
});

test("unicode: lone surrogate is UNICODE, paired surrogate encodes", () => {
  assert.deepEqual(run({ ...BASE, campaign: "\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "campaign", row: null },
  });
  assert.deepEqual(run({ ...BASE, source: "a\uDC00b" }), {
    ok: false,
    error: { code: "UNICODE", field: "source", row: null },
  });
  assert.deepEqual(run({ ...BASE, baseUrl: "https://example.com/\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "baseUrl", row: null },
  });
  // A lone surrogate loses to capacity: a 2049-unit baseUrl is
  // INPUT_LIMIT even with a surrogate inside.
  assert.deepEqual(run({ ...BASE, baseUrl: "\uD800" + "x".repeat(2048) }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "baseUrl", row: null },
  });
  // A paired surrogate (emoji) is a valid character and UTF-8 encodes.
  // U+1F600 -> F0 9F 98 80.
  assert.deepEqual(run({ ...BASE, campaign: "sale \uD83D\uDE00" }), {
    ok: true,
    result: {
      taggedUrl:
        "https://example.com/?utm_source=facebook&utm_medium=social&utm_campaign=sale%20%F0%9F%98%80",
      params: [
        { key: "utm_source", value: "facebook" },
        { key: "utm_medium", value: "social" },
        { key: "utm_campaign", value: "sale \uD83D\uDE00" },
      ],
    },
  });
});

test("control characters: TAB, NUL and DEL are INVALID_CHAR", () => {
  assert.deepEqual(run({ ...BASE, term: "a\x01b" }), {
    ok: false,
    error: { code: "INVALID_CHAR", field: "term", row: null },
  });
  assert.deepEqual(run({ ...BASE, source: "a\x00b" }), {
    ok: false,
    error: { code: "INVALID_CHAR", field: "source", row: null },
  });
  assert.deepEqual(run({ ...BASE, campaign: "a\x7fb" }), {
    ok: false,
    error: { code: "INVALID_CHAR", field: "campaign", row: null },
  });
  // A trailing control character that is also ASCII whitespace is
  // trimmed away first, so "sale\t" is a plain value.
  assert.equal(run({ ...BASE, campaign: "sale\t" }).ok, true);
});

test("encoding: reserved characters encoded, pinned set left alone", () => {
  // encodeURIComponent semantics, hand-computed.
  assert.deepEqual(run({ ...BASE, medium: "a?b&c=d#e+f/g" }), {
    ok: true,
    result: {
      taggedUrl:
        "https://example.com/?utm_source=facebook&utm_medium=a%3Fb%26c%3Dd%23e%2Bf%2Fg&utm_campaign=launch",
      params: [
        { key: "utm_source", value: "facebook" },
        { key: "utm_medium", value: "a?b&c=d#e+f/g" },
        { key: "utm_campaign", value: "launch" },
      ],
    },
  });
  // The pinned unencoded set: A-Z a-z 0-9 - _ . ! ~ * ' ( )
  const plain = "AZaz09-_.!~*'()";
  assert.equal(run({ ...BASE, source: plain }).result.taggedUrl.includes(`utm_source=${plain}`), true);
  // A lone percent sign encodes as %25, never decoded first.
  assert.equal(
    run({ ...BASE, campaign: "100%" }).result.taggedUrl,
    "https://example.com/?utm_source=facebook&utm_medium=social&utm_campaign=100%25"
  );
  // Uppercase hex in UTF-8 percent-encoding: U+00E9 -> %C3%A9.
  assert.equal(
    run({ ...BASE, campaign: "caf\u00e9" }).result.taggedUrl,
    "https://example.com/?utm_source=facebook&utm_medium=social&utm_campaign=caf%C3%A9"
  );
});

test("url validation: scheme, host, credentials", () => {
  const invalid = { ok: false, error: { code: "INVALID_URL", field: "baseUrl", row: null } };
  assert.deepEqual(run({ ...BASE, baseUrl: "" }), invalid);
  assert.deepEqual(run({ ...BASE, baseUrl: "   " }), invalid);
  assert.deepEqual(run({ ...BASE, baseUrl: "https://user@example.com/" }), invalid);
  assert.deepEqual(run({ ...BASE, baseUrl: "https://:pass@example.com/" }), invalid);
  assert.deepEqual(run({ ...BASE, baseUrl: "https://" }), invalid);
  assert.deepEqual(run({ ...BASE, baseUrl: "http://?x=1" }), invalid);
  assert.deepEqual(run({ ...BASE, baseUrl: "mailto:a@example.com" }), invalid);
  // WHATWG parsing reads "https:///path" as host "path": host is
  // non-empty, so it is valid and the raw string is kept verbatim.
  assert.equal(
    run({ ...BASE, baseUrl: "https:///path" }).result.taggedUrl,
    "https:///path?utm_source=facebook&utm_medium=social&utm_campaign=launch"
  );
  // Uppercase scheme and host parse fine and are kept verbatim: no
  // case normalization, no added slash.
  assert.deepEqual(run({ ...BASE, baseUrl: "HTTPS://Example.COM/Path" }), {
    ok: true,
    result: {
      taggedUrl:
        "HTTPS://Example.COM/Path?utm_source=facebook&utm_medium=social&utm_campaign=launch",
      params: [
        { key: "utm_source", value: "facebook" },
        { key: "utm_medium", value: "social" },
        { key: "utm_campaign", value: "launch" },
      ],
    },
  });
  // No slash is added after a bare host; the port is kept verbatim.
  assert.equal(
    run({ ...BASE, baseUrl: "https://example.com" }).result.taggedUrl,
    "https://example.com?utm_source=facebook&utm_medium=social&utm_campaign=launch"
  );
  assert.equal(
    run({ ...BASE, baseUrl: "https://example.com:8080/p" }).result.taggedUrl,
    "https://example.com:8080/p?utm_source=facebook&utm_medium=social&utm_campaign=launch"
  );
  // CRLF/space trimming uses the pinned ASCII set.
  assert.equal(
    run({ ...BASE, baseUrl: "\r\nhttps://example.com/blog\r\n" }).result.taggedUrl,
    "https://example.com/blog?utm_source=facebook&utm_medium=social&utm_campaign=launch"
  );
});

test("merge: empty query, empty fragment, fragment with a question mark", () => {
  const expected = (url) => ({
    ok: true,
    result: {
      taggedUrl: url,
      params: [
        { key: "utm_source", value: "facebook" },
        { key: "utm_medium", value: "social" },
        { key: "utm_campaign", value: "launch" },
      ],
    },
  });
  // An empty existing query counts as no query: no empty segment left.
  assert.deepEqual(
    run({ ...BASE, baseUrl: "https://example.com/p?" }),
    expected("https://example.com/p?utm_source=facebook&utm_medium=social&utm_campaign=launch")
  );
  // An empty fragment ("#" with nothing after) is kept verbatim.
  assert.deepEqual(
    run({ ...BASE, baseUrl: "https://example.com/p#" }),
    expected("https://example.com/p?utm_source=facebook&utm_medium=social&utm_campaign=launch#")
  );
  assert.deepEqual(
    run({ ...BASE, baseUrl: "https://example.com/p?#" }),
    expected("https://example.com/p?utm_source=facebook&utm_medium=social&utm_campaign=launch#")
  );
  // A "?" inside the fragment is fragment text, not a query delimiter.
  assert.deepEqual(
    run({ ...BASE, baseUrl: "https://example.com/p?a=1#frag?x=1" }),
    expected(
      "https://example.com/p?a=1&utm_source=facebook&utm_medium=social&utm_campaign=launch#frag?x=1"
    )
  );
  // Query and fragment together, fragment last.
  assert.deepEqual(
    run({ ...BASE, baseUrl: "https://example.com/p?a=1&b=2#top" }),
    expected(
      "https://example.com/p?a=1&b=2&utm_source=facebook&utm_medium=social&utm_campaign=launch#top"
    )
  );
});

test("duplicate check: every utm_* key, case-sensitive, raw keys only", () => {
  const dup = { ok: false, error: { code: "DUPLICATE_UTM", field: "baseUrl", row: null } };
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    assert.deepEqual(run({ ...BASE, baseUrl: `https://example.com/?${key}=x` }), dup, key);
  }
  // A duplicate in the middle of the query still rejects.
  assert.deepEqual(
    run({ ...BASE, baseUrl: "https://example.com/?a=1&utm_content=x&b=2" }),
    dup
  );
  // A bare key segment (no "=") still counts.
  assert.deepEqual(run({ ...BASE, baseUrl: "https://example.com/?utm_source" }), dup);
  // A utm_* name as a VALUE does not count.
  assert.equal(run({ ...BASE, baseUrl: "https://example.com/?x=utm_source" }).ok, true);
  // Comparison is case-sensitive: UTM_SOURCE is not a duplicate.
  assert.deepEqual(run({ ...BASE, baseUrl: "https://example.com/?UTM_SOURCE=x" }), {
    ok: true,
    result: {
      taggedUrl:
        "https://example.com/?UTM_SOURCE=x&utm_source=facebook&utm_medium=social&utm_campaign=launch",
      params: [
        { key: "utm_source", value: "facebook" },
        { key: "utm_medium", value: "social" },
        { key: "utm_campaign", value: "launch" },
      ],
    },
  });
  // Keys are compared raw, with no decoding: %75tm_source is not utm_source.
  assert.equal(
    run({ ...BASE, baseUrl: "https://example.com/?%75tm_source=x" }).ok,
    true
  );
  // A duplicate inside the fragment is not a query parameter.
  assert.equal(
    run({ ...BASE, baseUrl: "https://example.com/p#utm_source=x" }).ok,
    true
  );
});

test("values: case kept, whitespace trimmed, optional blanks omitted", () => {
  assert.deepEqual(run({ ...BASE, source: "FaceBook", campaign: "Summer_SALE" }), {
    ok: true,
    result: {
      taggedUrl:
        "https://example.com/?utm_source=FaceBook&utm_medium=social&utm_campaign=Summer_SALE",
      params: [
        { key: "utm_source", value: "FaceBook" },
        { key: "utm_medium", value: "social" },
        { key: "utm_campaign", value: "Summer_SALE" },
      ],
    },
  });
  assert.equal(run({ ...BASE, source: "  google  " }).result.params[0].value, "google");
  assert.deepEqual(run({ ...BASE, term: " ", content: "\t" }), {
    ok: true,
    result: {
      taggedUrl:
        "https://example.com/?utm_source=facebook&utm_medium=social&utm_campaign=launch",
      params: [
        { key: "utm_source", value: "facebook" },
        { key: "utm_medium", value: "social" },
        { key: "utm_campaign", value: "launch" },
      ],
    },
  });
});

test("invariants: every accepted output re-parses and holds exactly the expected query", () => {
  const inputs = [
    BASE,
    { ...BASE, baseUrl: "https://example.com/p?id=42&ref=home", term: "running shoes" },
    { ...BASE, baseUrl: "https://example.com/page#section2", content: "banner_top" },
    { ...BASE, source: "line", campaign: "夏季特價" },
    { ...BASE, baseUrl: "https://example.com", campaign: "50% off" },
    { ...BASE, baseUrl: "HTTPS://Example.COM/Path?a=b#frag", term: "x y" },
  ];
  for (const input of inputs) {
    const { ok, result } = run(input);
    assert.equal(ok, true, JSON.stringify(input));
    const parsed = new URL(result.taggedUrl);
    // Every emitted param round-trips through WHATWG parsing.
    for (const { key, value } of result.params) {
      assert.equal(parsed.searchParams.get(key), value);
    }
    // No utm_* parameter other than the emitted ones is present.
    const utmKeys = [...parsed.searchParams.keys()].filter((k) => k.startsWith("utm_"));
    assert.deepEqual(utmKeys, result.params.map((p) => p.key));
    // The tagged URL still starts with the trimmed raw base prefix.
    const base = input.baseUrl.trim();
    const hashAt = base.indexOf("#");
    const main = hashAt === -1 ? base : base.slice(0, hashAt);
    assert.ok(result.taggedUrl.startsWith(main.split("?")[0]));
  }
});
