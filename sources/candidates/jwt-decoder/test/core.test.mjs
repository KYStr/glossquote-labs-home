import assert from "node:assert/strict";
import test from "node:test";

import { decodeJwt, decodePartBytes, relativeDelta } from "../public/js/core/jwt.mjs";

// All fixtures are synthetic. The section 4 fixture's signature segment
// is a dummy string, not a real HMAC — the SPEC says so, and so does
// every surface that shows the fixture.

const FIXTURE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMzQiLCJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjoiZ2xvc3NxdW90ZS1sYWJzIiwiaWF0IjoxNzYyMDAwMDAwLCJuYmYiOjE3NjIwMDAwMDAsImV4cCI6MTc2MjAwMzYwMCwianRpIjoiZml4dHVyZS0wMDAxIiwic2NvcGUiOiJyZWFkOmRlbW8ifQ.ZHVtbXktc2lnbmF0dXJlLWZvci1maXh0dXJlLW9ubHk";
const HEADER = { alg: "HS256", typ: "JWT" };
const b64u = (text) => Buffer.from(text, "utf8").toString("base64url");
const b64uJson = (value) => b64u(JSON.stringify(value));
const makeToken = (header, payload, signature = "ZHVtbXk") =>
  `${b64uJson(header)}.${b64uJson(payload)}.${signature}`;

function expectCode(tokenText, now, code, params = {}) {
  assert.throws(
    () => decodeJwt(tokenText, now),
    (error) => {
      assert.equal(error.code, code);
      for (const [key, value] of Object.entries(params)) {
        assert.equal(error.params[key], value);
      }
      return true;
    },
  );
}

test("SPEC fixture decodes exactly at 2025-11-01T13:00:00Z", () => {
  const model = decodeJwt(FIXTURE, 1762002000);
  assert.equal(model.empty, false);
  assert.equal(model.status, "WITHIN_STATED_WINDOW");
  assert.equal(model.signatureBytes, 32);
  assert.equal(model.headerJson, '{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
  assert.equal(
    model.payloadJson,
    '{\n  "sub": "user-1234",\n  "iss": "https://issuer.example",\n  "aud": "glossquote-labs",\n  "iat": 1762000000,\n  "nbf": 1762000000,\n  "exp": 1762003600,\n  "jti": "fixture-0001",\n  "scope": "read:demo"\n}',
  );
  const byName = new Map(model.claims.map((row) => [row.name, row]));
  assert.equal(byName.get("iat").time.utc, "2025-11-01T12:26:40.000Z");
  assert.equal(byName.get("exp").time.utc, "2025-11-01T13:26:40.000Z");
  assert.deepEqual(byName.get("exp").time.relative, { unit: "minutes", value: 26 });
  assert.deepEqual(byName.get("iat").time.relative, { unit: "minutes", value: 33 });
  assert.equal(byName.get("exp").time.tense, "future");
  assert.equal(byName.get("iat").time.tense, "past");
  assert.deepEqual(byName.get("aud").audience, { list: false, count: 1 });
  assert.deepEqual(model.headerSummary, [
    { name: "alg", value: "HS256", isString: true },
    { name: "typ", value: "JWT", isString: true },
  ]);
});

test("SPEC fixture pinned exactly at exp is EXPIRED (boundary rule)", () => {
  assert.equal(decodeJwt(FIXTURE, 1762003600).status, "EXPIRED");
  assert.equal(decodeJwt(FIXTURE, 1762003599).status, "WITHIN_STATED_WINDOW");
});

test("empty and whitespace-only input is the empty state, not an error", () => {
  assert.deepEqual(decodeJwt("", 0), { empty: true });
  assert.deepEqual(decodeJwt("  \t\n ", 0), { empty: true });
  const padded = decodeJwt(`  ${FIXTURE}\n`, 1762002000);
  assert.equal(padded.status, "WITHIN_STATED_WINDOW");
});

test("part-count errors name the count; five parts get the JWE message", () => {
  expectCode("abc", 0, "PART_COUNT", { count: 1 });
  expectCode("a.b", 0, "PART_COUNT", { count: 2 });
  expectCode("a.b.c.d", 0, "PART_COUNT", { count: 4 });
  expectCode("a.b.c.d.e", 0, "JWE_LIKELY", { count: 5 });
  expectCode("a.b.c.d.e.f", 0, "PART_COUNT", { count: 6 });
});

test("empty header or payload part is an error; empty signature is fine", () => {
  expectCode(`.${b64uJson({ a: 1 })}.ZHVtbXk`, 0, "EMPTY_PART", { part: "header" });
  expectCode(`${b64uJson(HEADER)}..ZHVtbXk`, 0, "EMPTY_PART", { part: "payload" });
  const model = decodeJwt(`${b64uJson(HEADER)}.${b64uJson({ sub: "x" })}.`, 0);
  assert.equal(model.signatureBytes, 0);
  assert.equal(model.signatureText, "");
});

test("size cap and interior whitespace", () => {
  expectCode("a".repeat(16385), 0, "TOO_LONG", { limit: 16384 });
  expectCode("a".repeat(16384), 0, "PART_COUNT", { count: 1 });
  expectCode(`${b64uJson(HEADER)} .${b64uJson({})}.ZHVtbXk`, 0, "WHITESPACE_INSIDE");
});

test("decoder strictness: alphabet, misplaced padding, mod-4 length", () => {
  expectCode(`+abc.${b64uJson({})}.ZHVtbXk`, 0, "INVALID_CHARACTER", { part: "header", position: 1 });
  expectCode(`${b64uJson(HEADER)}.ab/d.ZHVtbXk`, 0, "INVALID_CHARACTER", { part: "payload", position: 3 });
  expectCode(`${b64uJson(HEADER)}.ab=c.ZHVtbXk`, 0, "INVALID_CHARACTER", { part: "payload", position: 3 });
  expectCode(`${b64uJson(HEADER)}.${b64uJson({})}.ab+`, 0, "INVALID_CHARACTER", { part: "signature", position: 3 });
  expectCode(`abcde.${b64uJson({})}.ZHVtbXk`, 0, "INVALID_LENGTH", { part: "header" });
  expectCode(`${b64uJson(HEADER)}.${b64uJson({})}.abcde`, 0, "INVALID_LENGTH", { part: "signature" });
});

test("padding acceptance: zero, one or two trailing = when they complete the length", () => {
  const headerPart = b64uJson({ a: 1 });
  assert.equal(headerPart, "eyJhIjoxfQ");
  const body = `${headerPart}.${headerPart}.ZHVtbXk`;
  assert.equal(decodeJwt(body, 0).header.a, 1);
  assert.equal(decodeJwt(`${headerPart}==.${headerPart}==.ZHVtbXk=`, 0).header.a, 1);
  expectCode(`${headerPart}=.${headerPart}.ZHVtbXk`, 0, "INVALID_PADDING", { part: "header" });
  expectCode(`${headerPart}===.${headerPart}.ZHVtbXk`, 0, "INVALID_PADDING", { part: "header" });
  assert.throws(() => decodePartBytes("payload", "ab==="), (e) => e.code === "INVALID_PADDING");
});

test("UTF-8 failure and non-object JSON tops are named errors", () => {
  const head = b64uJson(HEADER);
  expectCode(`${head}.__4.ZHVtbXk`, 0, "INVALID_UTF8", { part: "payload" });
  expectCode(`${head}.WzFd.ZHVtbXk`, 0, "NOT_JSON_OBJECT", { part: "payload" });
  expectCode(`${head}.Ingi.ZHVtbXk`, 0, "NOT_JSON_OBJECT", { part: "payload" });
  expectCode(`${head}.MTIz.ZHVtbXk`, 0, "NOT_JSON_OBJECT", { part: "payload" });
  expectCode(`${head}.${b64u("{oops")}.ZHVtbXk`, 0, "INVALID_JSON", { part: "payload" });
});

test("duplicate keys follow JSON.parse semantics (last wins)", () => {
  const model = decodeJwt(`${b64uJson(HEADER)}.${b64u('{"a":1,"a":2}')}.ZHVtbXk`, 0);
  assert.equal(model.payload.a, 2);
});

test("time-status truth table", () => {
  const now = 1000000;
  const statusOf = (payload) => decodeJwt(makeToken(HEADER, payload), now).status;
  assert.equal(statusOf({ exp: 999999 }), "EXPIRED");
  assert.equal(statusOf({ exp: 1000000 }), "EXPIRED");
  assert.equal(statusOf({ exp: 1000001 }), "WITHIN_STATED_WINDOW");
  assert.equal(statusOf({ nbf: 1000001 }), "NOT_YET_VALID");
  assert.equal(statusOf({ nbf: 1000000 }), "WITHIN_STATED_WINDOW");
  assert.equal(statusOf({ exp: 1000001, nbf: 1000001 }), "NOT_YET_VALID");
  assert.equal(statusOf({ exp: 999999, nbf: 1000001 }), "EXPIRED");
  assert.equal(statusOf({ sub: "x" }), "NO_TIME_CLAIMS");
  assert.equal(statusOf({ iat: 999999 }), "NO_TIME_CLAIMS");
});

test("non-NumericDate exp warns on the row and derives no status", () => {
  const model = decodeJwt(makeToken(HEADER, { exp: "999999" }), 1000000);
  assert.equal(model.status, "NO_TIME_CLAIMS");
  assert.equal(model.claims[0].warning, "NOT_NUMERICDATE");
  assert.equal(model.claims[0].time, undefined);
});

test("relative phrase unit selection at the SPEC thresholds", () => {
  assert.deepEqual(relativeDelta(0), { unit: "seconds", value: 0 });
  assert.deepEqual(relativeDelta(59), { unit: "seconds", value: 59 });
  assert.deepEqual(relativeDelta(60), { unit: "minutes", value: 1 });
  assert.deepEqual(relativeDelta(7199), { unit: "minutes", value: 119 });
  assert.deepEqual(relativeDelta(7200), { unit: "hours", value: 2 });
  assert.deepEqual(relativeDelta(172799), { unit: "hours", value: 47 });
  assert.deepEqual(relativeDelta(172800), { unit: "days", value: 2 });
  assert.deepEqual(relativeDelta(86400 * 3 + 3600), { unit: "days", value: 3 });
});

test("aud as a list is annotated with its count; alg non-string is flagged", () => {
  const model = decodeJwt(makeToken({ alg: 123, kid: "k-1" }, { aud: ["a", "b", "c"] }), 0);
  assert.deepEqual(model.claims[0].audience, { list: true, count: 3 });
  assert.deepEqual(model.headerSummary[0], { name: "alg", value: 123, isString: false });
  assert.deepEqual(model.headerSummary[1], { name: "kid", value: "k-1", isString: true });
});
