// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-http-status-lookup-20261121, draft spec PR #400, SHA-256
// efe43e2f90d2d039995247b0544d63c08991ea5cd29d35042a3c4ab475a1c55f).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's §5 pinned table and §4 rules by hand, never from
// the implementation's output. The 64-row [code, reason, reference]
// list is a second, independent transcription of the SPEC §5 table
// (read from SPEC.md directly); it cross-checks the core table row
// by row.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  CATEGORIES,
  DEFAULTS,
  EXAMPLE,
  STATUS_TABLE,
  UNASSIGNED,
  UNASSIGNED_RANGES,
  run,
} from "../public/js/core/http-status.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-http-status-lookup-20261121");
assert.equal(coreCases.length, 17);

for (const fixture of coreCases) {
  test(`fixture ${fixture.id}`, () => {
    const actual = run(fixture.input);
    if (fixture.expected.ok) {
      assert.deepEqual(actual, { ok: true, result: fixture.expected.result });
    } else {
      assert.deepEqual(actual, { ok: false, error: fixture.expected.error });
    }
  });
}

// Independent transcription of the SPEC §5 table: code, official
// English name, reference. Written from SPEC.md by hand.
const EXPECTED_REASONS = [
  [100, "Continue", "RFC 9110 §15.2.1"],
  [101, "Switching Protocols", "RFC 9110 §15.2.2"],
  [102, "Processing", "RFC 2518"],
  [103, "Early Hints", "RFC 8297"],
  [104, "Upload Resumption Supported", "draft-ietf-httpbis-resumable-upload-05"],
  [200, "OK", "RFC 9110 §15.3.1"],
  [201, "Created", "RFC 9110 §15.3.2"],
  [202, "Accepted", "RFC 9110 §15.3.3"],
  [203, "Non-Authoritative Information", "RFC 9110 §15.3.4"],
  [204, "No Content", "RFC 9110 §15.3.5"],
  [205, "Reset Content", "RFC 9110 §15.3.6"],
  [206, "Partial Content", "RFC 9110 §15.3.7"],
  [207, "Multi-Status", "RFC 4918"],
  [208, "Already Reported", "RFC 5842"],
  [226, "IM Used", "RFC 3229"],
  [300, "Multiple Choices", "RFC 9110 §15.4.1"],
  [301, "Moved Permanently", "RFC 9110 §15.4.2"],
  [302, "Found", "RFC 9110 §15.4.3"],
  [303, "See Other", "RFC 9110 §15.4.4"],
  [304, "Not Modified", "RFC 9110 §15.4.5"],
  [305, "Use Proxy", "RFC 9110 §15.4.6"],
  [306, "(Unused)", "RFC 9110 §15.4.7"],
  [307, "Temporary Redirect", "RFC 9110 §15.4.8"],
  [308, "Permanent Redirect", "RFC 9110 §15.4.9"],
  [400, "Bad Request", "RFC 9110 §15.5.1"],
  [401, "Unauthorized", "RFC 9110 §15.5.2"],
  [402, "Payment Required", "RFC 9110 §15.5.3"],
  [403, "Forbidden", "RFC 9110 §15.5.4"],
  [404, "Not Found", "RFC 9110 §15.5.5"],
  [405, "Method Not Allowed", "RFC 9110 §15.5.6"],
  [406, "Not Acceptable", "RFC 9110 §15.5.7"],
  [407, "Proxy Authentication Required", "RFC 9110 §15.5.8"],
  [408, "Request Timeout", "RFC 9110 §15.5.9"],
  [409, "Conflict", "RFC 9110 §15.5.10"],
  [410, "Gone", "RFC 9110 §15.5.11"],
  [411, "Length Required", "RFC 9110 §15.5.12"],
  [412, "Precondition Failed", "RFC 9110 §15.5.13"],
  [413, "Content Too Large", "RFC 9110 §15.5.14"],
  [414, "URI Too Long", "RFC 9110 §15.5.15"],
  [415, "Unsupported Media Type", "RFC 9110 §15.5.16"],
  [416, "Range Not Satisfiable", "RFC 9110 §15.5.17"],
  [417, "Expectation Failed", "RFC 9110 §15.5.18"],
  [418, "(Unused)", "RFC 9110 §15.5.19"],
  [421, "Misdirected Request", "RFC 9110 §15.5.20"],
  [422, "Unprocessable Content", "RFC 9110 §15.5.21"],
  [423, "Locked", "RFC 4918"],
  [424, "Failed Dependency", "RFC 4918"],
  [425, "Too Early", "RFC 8470"],
  [426, "Upgrade Required", "RFC 9110 §15.5.22"],
  [428, "Precondition Required", "RFC 6585"],
  [429, "Too Many Requests", "RFC 6585"],
  [431, "Request Header Fields Too Large", "RFC 6585"],
  [451, "Unavailable For Legal Reasons", "RFC 7725"],
  [500, "Internal Server Error", "RFC 9110 §15.6.1"],
  [501, "Not Implemented", "RFC 9110 §15.6.2"],
  [502, "Bad Gateway", "RFC 9110 §15.6.3"],
  [503, "Service Unavailable", "RFC 9110 §15.6.4"],
  [504, "Gateway Timeout", "RFC 9110 §15.6.5"],
  [505, "HTTP Version Not Supported", "RFC 9110 §15.6.6"],
  [506, "Variant Also Negotiates", "RFC 2295"],
  [507, "Insufficient Storage", "RFC 4918"],
  [508, "Loop Detected", "RFC 5842"],
  [510, "Not Extended", "RFC 2774 (OBSOLETED)"],
  [511, "Network Authentication Required", "RFC 6585"],
];

test("the core table holds exactly the 64 assigned codes, each with the SPEC reason and reference", () => {
  assert.equal(STATUS_TABLE.length, 64);
  assert.equal(EXPECTED_REASONS.length, 64);
  const codes = STATUS_TABLE.map((row) => row.code);
  assert.deepEqual(codes, [...codes].sort((a, b) => a - b));
  assert.equal(new Set(codes).size, 64);
  for (const [code, reason, reference] of EXPECTED_REASONS) {
    const row = STATUS_TABLE.find((entry) => entry.code === code);
    assert.ok(row, `missing row ${code}`);
    assert.equal(row.reason, reason, `code ${code} reason`);
    assert.equal(row.reference, reference, `code ${code} reference`);
    // Every row carries the full fixed text set; nothing is blank.
    for (const field of [
      "reasonZh",
      "meaningZh",
      "meaningEn",
      "causeZh",
      "causeEn",
      "adviceZh",
      "adviceEn",
    ]) {
      assert.equal(typeof row[field], "string", `code ${code} ${field}`);
      assert.ok(row[field].length > 0, `code ${code} ${field} empty`);
    }
    const outcome = run({ code: String(code) });
    assert.equal(outcome.ok, true, `code ${code}`);
    assert.equal(outcome.result.assigned, true, `code ${code}`);
    assert.equal(outcome.result.reason, reason, `code ${code}`);
    assert.equal(outcome.result.reference, reference, `code ${code}`);
  }
});

test("temporary is true only for 104; obsolete is true only for 510", () => {
  for (const row of STATUS_TABLE) {
    assert.equal(row.temporary, row.code === 104, `code ${row.code} temporary`);
    assert.equal(row.obsolete, row.code === 510, `code ${row.code} obsolete`);
  }
  assert.equal(run({ code: "104" }).result.temporary, true);
  assert.equal(run({ code: "510" }).result.obsolete, true);
  assert.equal(run({ code: "200" }).result.temporary, false);
  assert.equal(run({ code: "200" }).result.obsolete, false);
});

test("306 and 418 are (Unused); 418 is not \"I'm a teapot\"", () => {
  for (const code of ["306", "418"]) {
    const outcome = run({ code });
    assert.equal(outcome.ok, true);
    assert.equal(outcome.result.assigned, true);
    assert.equal(outcome.result.reason, "(Unused)");
    assert.equal(outcome.result.reasonZh, "（未使用）");
  }
  // The teapot name appears only inside the explanatory cause text,
  // never as the official reason.
  assert.equal(run({ code: "418" }).result.reason, "(Unused)");
});

test("413 and 422 use the RFC 9110 current names, not the old ones", () => {
  assert.equal(run({ code: "413" }).result.reason, "Content Too Large");
  assert.equal(run({ code: "422" }).result.reason, "Unprocessable Content");
  assert.notEqual(run({ code: "413" }).result.reason, "Payload Too Large");
  assert.notEqual(run({ code: "422" }).result.reason, "Unprocessable Entity");
});

test("unassigned codes in every class return the fixed strings and null reason/reference", () => {
  const samples = [
    [105, 1, "informational"],
    [150, 1, "informational"],
    [209, 2, "success"],
    [250, 2, "success"],
    [309, 3, "redirection"],
    [350, 3, "redirection"],
    [419, 4, "client-error"],
    [450, 4, "client-error"],
    [509, 5, "server-error"],
    [550, 5, "server-error"],
  ];
  for (const [code, cls, key] of samples) {
    const outcome = run({ code: String(code) });
    assert.equal(outcome.ok, true, `code ${code}`);
    const result = outcome.result;
    assert.equal(result.code, code);
    assert.equal(result.assigned, false);
    assert.equal(result.reason, null);
    assert.equal(result.reasonZh, null);
    assert.equal(result.reference, null);
    assert.equal(result.temporary, false);
    assert.equal(result.obsolete, false);
    assert.equal(result.meaningZh, UNASSIGNED.meaningZh);
    assert.equal(result.meaningEn, UNASSIGNED.meaningEn);
    assert.equal(result.causeZh, UNASSIGNED.causeZh);
    assert.equal(result.causeEn, UNASSIGNED.causeEn);
    assert.equal(result.adviceZh, UNASSIGNED.adviceZh);
    assert.equal(result.adviceEn, UNASSIGNED.adviceEn);
    assert.equal(result.category.class, cls);
    assert.equal(result.category.key, key);
  }
});

test("the unassigned ranges string covers every gap between assigned codes", () => {
  assert.equal(
    UNASSIGNED_RANGES,
    "105–199、209–225、227–299、309–399、419–420、427、430、432–450、452–499、509、512–599",
  );
  // Every code in 100–599 that is not in the table is unassigned,
  // and every code in the table is assigned.
  const assigned = new Set(STATUS_TABLE.map((row) => row.code));
  for (let code = 100; code <= 599; code += 1) {
    assert.equal(run({ code: String(code) }).result.assigned, assigned.has(code), `code ${code}`);
  }
});

test("category derivation: class is the first digit, with the pinned summaries", () => {
  const expected = {
    1: ["informational", "資訊", "Informational", "100–199"],
    2: ["success", "成功", "Success", "200–299"],
    3: ["redirection", "重導向", "Redirection", "300–399"],
    4: ["client-error", "客戶端錯誤", "Client Error", "400–499"],
    5: ["server-error", "伺服器錯誤", "Server Error", "500–599"],
  };
  for (const [cls, [key, labelZh, labelEn, range]] of Object.entries(expected)) {
    const pinned = CATEGORIES[cls];
    assert.equal(pinned.key, key);
    assert.equal(pinned.labelZh, labelZh);
    assert.equal(pinned.labelEn, labelEn);
    assert.equal(pinned.range, range);
  }
  assert.equal(CATEGORIES[1].summaryZh, "請求已收到，繼續處理。");
  assert.equal(CATEGORIES[1].summaryEn, "Request received, continuing process.");
  assert.equal(CATEGORIES[2].summaryZh, "請求已成功接收、理解並接受。");
  assert.equal(CATEGORIES[2].summaryEn, "The action was successfully received, understood, and accepted.");
  assert.equal(CATEGORIES[3].summaryZh, "需要進一步動作才能完成請求。");
  assert.equal(CATEGORIES[3].summaryEn, "Further action must be taken in order to complete the request.");
  assert.equal(CATEGORIES[4].summaryZh, "請求語法錯誤或無法完成。");
  assert.equal(CATEGORIES[4].summaryEn, "The request contains bad syntax or cannot be fulfilled.");
  assert.equal(CATEGORIES[5].summaryZh, "伺服器無法完成看似有效的請求。");
  assert.equal(CATEGORIES[5].summaryEn, "The server failed to fulfill an apparently valid request.");
});

test("the example is the SPEC-pinned 200 (code-200-ok input)", () => {
  // The SPEC pins the example value 200; fixtures.json lists
  // code-100-continue first, so the example is matched to the
  // code-200-ok fixture by id, not by array position (HANDOFF.md
  // errata candidate 4).
  const exampleFixture = fixtures.cases.find((entry) => entry.id === "code-200-ok");
  assert.deepEqual(EXAMPLE, { code: "200" });
  assert.deepEqual(EXAMPLE, exampleFixture.input);
});

test("range endpoints are accepted; one unit outside is RANGE", () => {
  assert.equal(run({ code: "100" }).ok, true);
  assert.equal(run({ code: "599" }).ok, true);
  for (const bad of ["099", "000", "600", "999"]) {
    assert.deepEqual(run({ code: bad }), {
      ok: false,
      error: { code: "RANGE", field: "code", row: null },
    });
  }
});

test("grammar: exactly three ASCII digits; 099 and 99 fail differently", () => {
  // 099 passes the grammar but is below 100 (RANGE); 99 fails the
  // grammar (INTEGER_FORMAT). This is the SPEC tests section's
  // explicit pair.
  assert.deepEqual(run({ code: "099" }), {
    ok: false,
    error: { code: "RANGE", field: "code", row: null },
  });
  assert.deepEqual(run({ code: "99" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "code", row: null },
  });
  for (const bad of ["12.5", "404.0", "+404", "-404", " 404", "404 ", "0404", "1e2", "４０４", "abc", "4O4"]) {
    assert.deepEqual(run({ code: bad }), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "code", row: null },
    });
  }
  // "040" passes the grammar (three digits) but is below 100.
  assert.deepEqual(run({ code: "040" }), {
    ok: false,
    error: { code: "RANGE", field: "code", row: null },
  });
});

test("empty input is EMPTY; no trimming is applied", () => {
  assert.deepEqual(run({ code: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "code", row: null },
  });
  assert.deepEqual(run({ code: "   " }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "code", row: null },
  });
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  assert.deepEqual(run({ code: "123456789" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "code", row: null },
  });
  // 9 units including a lone surrogate: the limit still wins,
  // because capacity precedes the Unicode check in the SPEC order.
  assert.deepEqual(run({ code: "12345678\uD800" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "code", row: null },
  });
  // Exactly 8 units is within capacity, so the grammar decides.
  assert.deepEqual(run({ code: "12345678" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "code", row: null },
  });
});

test("lone surrogates are UNICODE within capacity", () => {
  assert.deepEqual(run({ code: "40\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "code", row: null },
  });
  assert.deepEqual(run({ code: "404\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "code", row: null },
  });
  // A paired surrogate is not a lone surrogate; it fails the grammar.
  assert.deepEqual(run({ code: "4\uD83D\uDE00" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "code", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("404"), schema);
  assert.deepEqual(run({}), schema);
  assert.deepEqual(run({ code: "404", extra: "x" }), schema);
  assert.deepEqual(run({ code: 404 }), schema);
  assert.deepEqual(run({ code: null }), schema);
  const withAccessor = {};
  Object.defineProperty(withAccessor, "code", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/http-status.mjs", import.meta.url));
  const inputs = coreCases.map((entry) => entry.input);
  const script = `
    import { run } from ${JSON.stringify(pathToFileURL(corePath).href)};
    const inputs = ${JSON.stringify(inputs)};
    const outputs = inputs.map((input) => run(input));
    process.stdout.write(JSON.stringify(outputs));
  `;
  const expected = JSON.stringify(inputs.map((input) => run(input)));
  for (const tz of ["UTC", "Asia/Taipei", "America/New_York", "Pacific/Kiritimati"]) {
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, TZ: tz },
      encoding: "utf8",
    });
    assert.equal(out, expected, `TZ=${tz}`);
  }
});
