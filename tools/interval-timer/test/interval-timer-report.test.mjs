// Report tests for the Interval Timer: the downloaded report is the
// canonical compact JSON of the result (object keys sorted by UTF-16
// code units, recursively; array order kept) plus one trailing LF.
// Expected strings below are hand-written from the SPEC rule, not
// copied from the implementation's output.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { run, serializeReport, REPORT_FILENAME } from "../public/js/core/interval-timer.mjs";

describe("serializeReport()", () => {
  it("uses the fixed report filename", () => {
    assert.equal(REPORT_FILENAME, "interval-timer-report.json");
  });

  it("canonical JSON: sorted keys, compact, one trailing LF", () => {
    const outcome = run({
      prepareSeconds: "5",
      workSeconds: "90",
      restSeconds: "20",
      rounds: "1",
      finalRest: "include",
    });
    assert.equal(outcome.ok, true);
    const serialized = serializeReport(outcome.result);
    assert.equal(serialized.ok, true);
    // Hand-written canonical form of the single-round-final-rest result.
    const expected =
      '{"program":{"finalRest":"include","prepareSeconds":5,"restSeconds":20,"rounds":1,"workSeconds":90},"segmentCount":3,"segments":[{"durationSeconds":5,"endSeconds":5,"index":0,"kind":"prepare","round":null,"startSeconds":0},{"durationSeconds":90,"endSeconds":95,"index":1,"kind":"work","round":1,"startSeconds":5},{"durationSeconds":20,"endSeconds":115,"index":2,"kind":"rest","round":1,"startSeconds":95}],"totalSeconds":115}\n';
    assert.equal(serialized.text, expected);
    assert.equal(serialized.bytes, new TextEncoder().encode(expected).length);
    assert.ok(serialized.text.endsWith("\n"));
    assert.ok(!serialized.text.endsWith("\n\n"));
    assert.equal(JSON.parse(serialized.text).totalSeconds, 115);
  });

  it("report bytes stay far below the 2,097,152-byte limit at the ceiling", () => {
    const outcome = run({
      prepareSeconds: "3600",
      workSeconds: "3600",
      restSeconds: "3600",
      rounds: "99",
      finalRest: "include",
    });
    assert.equal(outcome.ok, true);
    const serialized = serializeReport(outcome.result);
    assert.equal(serialized.ok, true);
    assert.ok(serialized.bytes < 2097152);
    assert.equal(outcome.result.segmentCount, 199);
  });
});
