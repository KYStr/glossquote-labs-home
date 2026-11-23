// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-image-file-size-calculator-20261121, spec candidate commit
// 8c510a9a8a8fcf1658b94e8743d84d4e09885c54, draft spec PR #407,
// SHA-256
// 68f16b6decd4518d843d484a667f17ada8862eba9f5c7eed578e047b621c2a1e).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's pinned formulas and rules by hand, never from the
// implementation's output.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { run } from "../public/js/core/image-file-size.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-image-file-size-calculator-20261121");
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

// Independent re-derivation of the computation, written separately
// from the implementation: ceiling division via remainder, half-up
// rounding via remainder comparison (not the implementation's
// (2n + d) / 2d form), and two-decimal formatting via integer
// division and padding. Cross-checks every success fixture again.
function expectedResult(widthPx, heightPx, bitDepth, format) {
  const factors = {
    uncompressed: [1n, 1n],
    jpeg: [1n, 10n],
    png: [2n, 5n],
    "webp-lossy": [7n, 100n],
    "webp-lossless": [3n, 10n],
    gif: [1n, 4n],
    avif: [1n, 20n],
  };
  const w = BigInt(widthPx);
  const h = BigInt(heightPx);
  const d = BigInt(bitDepth);
  const totalPixels = w * h;
  const ceilDiv = (n, m) => (n % m === 0n ? n / m : n / m + 1n);
  const uncompressedBytes = ceilDiv(totalPixels * d, 8n);
  const effectiveBitDepth = format === "gif" ? (d < 8n ? d : 8n) : d;
  const effectiveBytes = ceilDiv(totalPixels * effectiveBitDepth, 8n);
  const [num, den] = factors[format];
  const scaled = effectiveBytes * num;
  // Half-up via remainder comparison: round up exactly when the
  // remainder is at least half the denominator.
  const quotient = scaled / den;
  const remainder = scaled % den;
  const estimatedBytes = remainder * 2n >= den ? quotient + 1n : quotient;
  const twoDp = (numerator, denominator) => {
    const cents = numerator * 100n;
    const q = cents / denominator;
    const r = cents % denominator;
    const rounded = r * 2n >= denominator ? q + 1n : q;
    return `${rounded / 100n}.${(rounded % 100n).toString().padStart(2, "0")}`;
  };
  const megapixels = twoDp(totalPixels, 1000000n);
  const sizeKB = twoDp(estimatedBytes, 1024n);
  const sizeMB = twoDp(estimatedBytes, 1048576n);
  const displaySize =
    estimatedBytes < 1024n
      ? `${estimatedBytes} B`
      : estimatedBytes < 1048576n
        ? `${sizeKB} KB`
        : `${sizeMB} MB`;
  return {
    displaySize,
    effectiveBitDepth: effectiveBitDepth.toString(),
    estimatedBytes: Number(estimatedBytes),
    format,
    megapixels,
    sizeKB,
    sizeMB,
    totalPixels: Number(totalPixels),
    uncompressedBytes: Number(uncompressedBytes),
  };
}

test("independent re-derivation matches every success fixture", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    const { widthPx, heightPx, bitDepth, format } = fixture.input;
    assert.deepEqual(
      expectedResult(widthPx, heightPx, bitDepth, format),
      fixture.expected.result,
      fixture.id,
    );
  }
});

test("validation order: widthPx is checked before heightPx", () => {
  assert.deepEqual(
    run({ widthPx: "0", heightPx: "abc", bitDepth: "24", format: "jpeg" }),
    { ok: false, error: { code: "RANGE", field: "widthPx", row: null } },
  );
  assert.deepEqual(
    run({ widthPx: "1920", heightPx: "0", bitDepth: "12", format: "tiff" }),
    { ok: false, error: { code: "RANGE", field: "heightPx", row: null } },
  );
  assert.deepEqual(
    run({ widthPx: "1920", heightPx: "1080", bitDepth: "12", format: "tiff" }),
    { ok: false, error: { code: "ENUM", field: "bitDepth", row: null } },
  );
});

test("capacity precedes grammar: a 9-unit value is INPUT_LIMIT", () => {
  assert.deepEqual(
    run({ widthPx: "123456789", heightPx: "1080", bitDepth: "24", format: "jpeg" }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "widthPx", row: null } },
  );
  assert.deepEqual(
    run({ widthPx: "1920", heightPx: "1080", bitDepth: "24", format: "jpegjpegjpeg" }),
    { ok: false, error: { code: "ENUM", field: "format", row: null } },
  );
  // Format has no SPEC-pinned capacity (its legal values run to 13
  // units), so a long unknown format is ENUM, not INPUT_LIMIT.
});

test("integer grammar: leading zeros, signs, spaces and exponents are INTEGER_FORMAT", () => {
  for (const bad of ["007", "+1920", "-1920", " 1920", "1920 ", "1e3", "19_20"]) {
    assert.deepEqual(
      run({ widthPx: bad, heightPx: "1080", bitDepth: "24", format: "jpeg" }),
      { ok: false, error: { code: "INTEGER_FORMAT", field: "widthPx", row: null } },
      bad,
    );
  }
  assert.deepEqual(
    run({ widthPx: "1920", heightPx: "1080", bitDepth: "24.0", format: "jpeg" }),
    { ok: false, error: { code: "INTEGER_FORMAT", field: "bitDepth", row: null } },
  );
});

test("empty fields are EMPTY, in field order", () => {
  assert.deepEqual(
    run({ widthPx: "", heightPx: "", bitDepth: "24", format: "jpeg" }),
    { ok: false, error: { code: "EMPTY", field: "widthPx", row: null } },
  );
  assert.deepEqual(
    run({ widthPx: "1920", heightPx: "1080", bitDepth: "", format: "jpeg" }),
    { ok: false, error: { code: "EMPTY", field: "bitDepth", row: null } },
  );
  assert.deepEqual(
    run({ widthPx: "1920", heightPx: "1080", bitDepth: "24", format: "" }),
    { ok: false, error: { code: "EMPTY", field: "format", row: null } },
  );
});

test("dimension range endpoints 1 and 100000 are legal, 0 and 100001 are RANGE", () => {
  assert.equal(run({ widthPx: "1", heightPx: "1", bitDepth: "1", format: "uncompressed" }).ok, true);
  assert.equal(
    run({ widthPx: "100000", heightPx: "1", bitDepth: "8", format: "png" }).ok,
    true,
  );
  assert.deepEqual(
    run({ widthPx: "100001", heightPx: "1", bitDepth: "24", format: "jpeg" }),
    { ok: false, error: { code: "RANGE", field: "widthPx", row: null } },
  );
  assert.deepEqual(
    run({ widthPx: "1", heightPx: "0", bitDepth: "24", format: "jpeg" }),
    { ok: false, error: { code: "RANGE", field: "heightPx", row: null } },
  );
});

test("total pixels exactly 1,000,000,000 is legal; one more is RANGE on heightPx", () => {
  const exact = run({ widthPx: "100000", heightPx: "10000", bitDepth: "8", format: "png" });
  assert.equal(exact.ok, true);
  assert.equal(exact.result.totalPixels, 1000000000);
  assert.deepEqual(
    run({ widthPx: "100000", heightPx: "10001", bitDepth: "8", format: "png" }),
    { ok: false, error: { code: "RANGE", field: "heightPx", row: null } },
  );
});

test("every bit depth in the enumeration is accepted; 0 and 64-adjacent values are ENUM", () => {
  for (const depth of ["1", "8", "16", "24", "32", "48", "64"]) {
    assert.equal(
      run({ widthPx: "10", heightPx: "10", bitDepth: depth, format: "jpeg" }).ok,
      true,
      depth,
    );
  }
  for (const depth of ["0", "2", "12", "65"]) {
    assert.deepEqual(
      run({ widthPx: "10", heightPx: "10", bitDepth: depth, format: "jpeg" }),
      { ok: false, error: { code: "ENUM", field: "bitDepth", row: null } },
      depth,
    );
  }
});

test("every format in the enumeration is accepted; case and neighbours are ENUM", () => {
  for (const format of ["uncompressed", "jpeg", "png", "webp-lossy", "webp-lossless", "gif", "avif"]) {
    assert.equal(
      run({ widthPx: "10", heightPx: "10", bitDepth: "24", format }).ok,
      true,
      format,
    );
  }
  for (const format of ["JPEG", "Jpeg", "webp", "jpg", "tiff"]) {
    assert.deepEqual(
      run({ widthPx: "10", heightPx: "10", bitDepth: "24", format }),
      { ok: false, error: { code: "ENUM", field: "format", row: null } },
      format,
    );
  }
});

test("gif caps the effective bit depth at 8, even at 48-bit", () => {
  const outcome = run({ widthPx: "100", heightPx: "100", bitDepth: "48", format: "gif" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.effectiveBitDepth, "8");
  assert.equal(outcome.result.uncompressedBytes, 60000);
  assert.equal(outcome.result.estimatedBytes, 2500);
});

test("1-bit with an odd total bit count rounds up to a whole byte", () => {
  const outcome = run({ widthPx: "3", heightPx: "1", bitDepth: "1", format: "uncompressed" });
  assert.deepEqual(outcome, {
    ok: true,
    result: {
      displaySize: "1 B",
      effectiveBitDepth: "1",
      estimatedBytes: 1,
      format: "uncompressed",
      megapixels: "0.00",
      sizeKB: "0.00",
      sizeMB: "0.00",
      totalPixels: 3,
      uncompressedBytes: 1,
    },
  });
});

test("half-up tie on the 2-decimal KB display: 128 bytes is 0.13 KB, not 0.12", () => {
  const outcome = run({ widthPx: "320", heightPx: "1", bitDepth: "32", format: "jpeg" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.estimatedBytes, 128);
  assert.equal(outcome.result.sizeKB, "0.13");
  assert.equal(outcome.result.sizeMB, "0.00");
  assert.equal(outcome.result.displaySize, "128 B");
});

test("display-size unit boundaries: 1023 B, 1024 bytes, 1048575 bytes, 1048576 bytes", () => {
  const b1023 = run({ widthPx: "1023", heightPx: "1", bitDepth: "8", format: "uncompressed" });
  assert.equal(b1023.result.displaySize, "1023 B");
  const kb1 = run({ widthPx: "1024", heightPx: "1", bitDepth: "8", format: "uncompressed" });
  assert.equal(kb1.result.displaySize, "1.00 KB");
  const kbTop = run({ widthPx: "13981", heightPx: "25", bitDepth: "24", format: "uncompressed" });
  assert.equal(kbTop.result.estimatedBytes, 1048575);
  assert.equal(kbTop.result.displaySize, "1024.00 KB");
  const mb1 = run({ widthPx: "32768", heightPx: "32", bitDepth: "8", format: "uncompressed" });
  assert.equal(mb1.result.estimatedBytes, 1048576);
  assert.equal(mb1.result.displaySize, "1.00 MB");
});

test("estimated bytes never exceed effective bytes times the factor rounded up, and never exceed effective bytes", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    const { estimatedBytes, uncompressedBytes } = fixture.expected.result;
    const effectiveBytes =
      fixture.input.format === "gif"
        ? Math.ceil(
            (Number(fixture.input.widthPx) *
              Number(fixture.input.heightPx) *
              Math.min(Number(fixture.input.bitDepth), 8)) /
              8,
          )
        : uncompressedBytes;
    assert.ok(estimatedBytes <= effectiveBytes, fixture.id);
  }
});

test("SCHEMA: unknown, missing, mistyped, accessor and non-object inputs are refused", () => {
  const base = { widthPx: "1920", heightPx: "1080", bitDepth: "24", format: "jpeg" };
  assert.deepEqual(run({ ...base, extra: "x" }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  const missing = { ...base };
  delete missing.format;
  assert.deepEqual(run(missing), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  assert.deepEqual(run({ ...base, widthPx: 1920 }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  assert.deepEqual(run(null), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  assert.deepEqual(run("1920"), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  assert.deepEqual(run([base]), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  const withAccessor = { ...base };
  Object.defineProperty(withAccessor, "widthPx", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
});

test("UNICODE: a lone surrogate in any field is refused before grammar", () => {
  const lone = "\uD800";
  assert.deepEqual(
    run({ widthPx: lone, heightPx: "1080", bitDepth: "24", format: "jpeg" }),
    { ok: false, error: { code: "UNICODE", field: "widthPx", row: null } },
  );
  assert.deepEqual(
    run({ widthPx: "1920", heightPx: "1080", bitDepth: "24", format: lone }),
    { ok: false, error: { code: "UNICODE", field: "format", row: null } },
  );
  // A well-formed surrogate pair is not a lone surrogate: it reaches
  // grammar instead (an emoji is not an integer).
  assert.deepEqual(
    run({ widthPx: "😀", heightPx: "1080", bitDepth: "24", format: "jpeg" }),
    { ok: false, error: { code: "INTEGER_FORMAT", field: "widthPx", row: null } },
  );
});

test("hostile strings stay inert data: markup in a field is a validation error, never code", () => {
  for (const hostile of ["<script>alert(1)</script>", "{{7*7}}", "1920; DROP TABLE x"]) {
    const outcome = run({ widthPx: hostile, heightPx: "1080", bitDepth: "24", format: "jpeg" });
    assert.equal(outcome.ok, false, hostile);
    assert.equal(outcome.error.field, "widthPx");
  }
});
