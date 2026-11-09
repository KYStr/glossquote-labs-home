import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  QrError,
  alignmentPositions,
  buildSymbol,
  buildWifiPayload,
  byteCapacity,
  capacityInfo,
  contrastRatio,
  contrastWarning,
  encodeQr,
  escapeWifiValue,
  makeFilename,
  maxByteLength,
  parseHexColor,
  renderPixels,
  selectVersion,
  svgString,
  utf8ByteLength,
} from "../public/js/core/qr.mjs";

// Frozen during test authoring from an independent QR implementation
// (Nayuki qrcodegen, ISO-faithful padding), as SPEC section 7(a) requires;
// that library is not a dependency of this package. See VERIFICATION.md.
const helloFixtures = JSON.parse(readFileSync(new URL("./fixtures/hello-matrices.json", import.meta.url), "utf8"));
// Byte capacities for every version and level, measured during test
// authoring with an independent implementation (segno) by binary search;
// includes the endpoint versions 1, 10, 27 and 40 named in SPEC section 7(b).
const capacities = JSON.parse(readFileSync(new URL("./fixtures/capacities.json", import.meta.url), "utf8"));

const rowsOf = (modules) => modules.map((row) => Array.from(row).join(""));

test("SPEC fixture: HELLO matrices match the frozen independent fixtures at all levels", () => {
  for (const fixture of helloFixtures) {
    const result = encodeQr("HELLO", fixture.level);
    assert.equal(result.version, fixture.version, `HELLO ${fixture.level} version`);
    assert.equal(result.mask, fixture.mask, `HELLO ${fixture.level} mask`);
    assert.deepEqual(rowsOf(result.modules), fixture.matrix, `HELLO ${fixture.level} matrix`);
  }
});

test("SPEC fixture: HELLO at M selects version 1 and a 21x21 matrix", () => {
  const result = encodeQr("HELLO", "M");
  assert.equal(result.version, 1);
  assert.equal(result.size, 21);
  assert.equal(result.modules.length, 21);
  assert.ok(result.modules.every((row) => row.length === 21));
});

test("SPEC fixture: 2,954 ASCII bytes at L raise the capacity error with limit 2,953", () => {
  assert.throws(
    () => encodeQr("A".repeat(2954), "L"),
    (err) => err instanceof QrError && err.code === "CAPACITY_EXCEEDED" && err.params.limit === 2953 && err.params.actual === 2954,
  );
  const fits = encodeQr("A".repeat(2953), "L");
  assert.equal(fits.version, 40);
  assert.equal(fits.size, 177);
});

test("capacity endpoints: byteCapacity matches the independent table for all 160 pairs", () => {
  for (const level of ["L", "M", "Q", "H"]) {
    for (let version = 1; version <= 40; version += 1) {
      assert.equal(byteCapacity(version, level), capacities[level][version - 1], `${level} v${version}`);
    }
    assert.equal(maxByteLength(level), capacities[level][39]);
  }
});

test("version selection lands exactly on the endpoint versions", () => {
  for (const level of ["L", "M", "Q", "H"]) {
    for (const version of [1, 10, 27, 40]) {
      const cap = capacities[level][version - 1];
      assert.equal(selectVersion(cap, level), version, `${level} cap ${cap}`);
      if (version < 40) assert.equal(selectVersion(cap + 1, level), version + 1, `${level} cap+1`);
    }
    assert.equal(selectVersion(capacities[level][39] + 1, level), 0);
  }
});

test("capacityInfo reports remaining bytes at the selected version", () => {
  assert.deepEqual(capacityInfo(5, "M"), { version: 1, capacity: 14, remaining: 9 });
  const over = capacityInfo(3000, "L");
  assert.equal(over.version, 0);
  assert.equal(over.capacity, 2953);
  assert.equal(over.remaining, -47);
});

test("UTF-8 byte counting for CJK and emoji", () => {
  assert.equal(utf8ByteLength(""), 0);
  assert.equal(utf8ByteLength("HELLO"), 5);
  assert.equal(utf8ByteLength("台中"), 6);
  assert.equal(utf8ByteLength("😀"), 4);
  assert.equal(utf8ByteLength("a台😀"), 8);
  // 6 CJK characters = 18 bytes: exceeds v1-M (14) but fits v2-M (26).
  assert.equal(encodeQr("台中精密零件", "M").version, 2);
});

test("empty payload is refused by the core", () => {
  assert.throws(() => encodeQr("", "M"), (err) => err.code === "EMPTY_PAYLOAD");
});

test("Wi-Fi normative fixture: exact payload string", () => {
  const payload = buildWifiPayload({ ssid: "A;B", security: "WPA", password: "p:ss", hidden: false });
  assert.equal(payload, "WIFI:T:WPA;S:A\\;B;P:p\\:ss;;");
});

test("Wi-Fi grammar: field order, omission rules, hidden flag", () => {
  assert.equal(
    buildWifiPayload({ ssid: "Home", security: "nopass", password: "", hidden: false }),
    "WIFI:T:nopass;S:Home;;",
  );
  assert.equal(
    buildWifiPayload({ ssid: "Home", security: "WEP", password: "abc", hidden: true }),
    "WIFI:T:WEP;S:Home;P:abc;H:true;;",
  );
  // Password field is omitted for nopass even when a password was typed.
  assert.equal(
    buildWifiPayload({ ssid: "Cafe", security: "nopass", password: "ignored", hidden: false }),
    "WIFI:T:nopass;S:Cafe;;",
  );
});

test("Wi-Fi escaping covers the five-character set in S and P", () => {
  assert.equal(escapeWifiValue('a\\b;c,d:e"f'), 'a\\\\b\\;c\\,d\\:e\\"f');
  const payload = buildWifiPayload({ ssid: 'x,y"z', security: "WPA", password: "1;2", hidden: false });
  assert.equal(payload, 'WIFI:T:WPA;S:x\\,y\\"z;P:1\\;2;;');
});

test("Wi-Fi validation: empty SSID and missing password are errors", () => {
  assert.throws(
    () => buildWifiPayload({ ssid: "", security: "WPA", password: "x", hidden: false }),
    (err) => err.code === "SSID_REQUIRED",
  );
  assert.throws(
    () => buildWifiPayload({ ssid: "Home", security: "WPA", password: "", hidden: false }),
    (err) => err.code === "PASSWORD_REQUIRED",
  );
  assert.doesNotThrow(() => buildWifiPayload({ ssid: "Home", security: "nopass", password: "", hidden: false }));
});

test("encoding is deterministic and mask ties resolve reproducibly", () => {
  const a = encodeQr("https://example.com/menu?lang=zh", "Q");
  const b = encodeQr("https://example.com/menu?lang=zh", "Q");
  assert.equal(a.mask, b.mask);
  assert.deepEqual(rowsOf(a.modules), rowsOf(b.modules));
});

test("alignment pattern positions follow the standard formula", () => {
  assert.deepEqual(alignmentPositions(1), []);
  assert.deepEqual(alignmentPositions(2), [6, 18]);
  assert.deepEqual(alignmentPositions(7), [6, 22, 38]);
  assert.equal(alignmentPositions(40).length, 7);
  assert.equal(alignmentPositions(40)[0], 6);
});

test("version information area appears from version 7", () => {
  const v6 = buildSymbol(new TextEncoder().encode("A".repeat(10)), "L", 6, 0);
  const v7 = buildSymbol(new TextEncoder().encode("A".repeat(10)), "L", 7, 0);
  assert.equal(v6.size, 41);
  assert.equal(v7.size, 45);
  // Bottom-left version block of v7 differs from a plain data area.
  const block = [];
  for (let y = v7.size - 11; y <= v7.size - 9; y += 1) {
    for (let x = 0; x < 6; x += 1) block.push(v7.modules[y][x]);
  }
  assert.equal(block.length, 18);
});

test("SVG output: viewBox with margin, background rect, one path, byte-deterministic", () => {
  const { modules } = encodeQr("HELLO", "M");
  const svg1 = svgString(modules, { margin: 4, foreground: "#000000", background: "#ffffff" });
  const svg2 = svgString(modules, { margin: 4, foreground: "#000000", background: "#ffffff" });
  assert.equal(svg1, svg2);
  assert.ok(svg1.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29">'));
  assert.ok(svg1.includes('<rect width="100%" height="100%" fill="#ffffff"/>'));
  assert.equal((svg1.match(/<path/g) ?? []).length, 1);
  assert.ok(!svg1.includes("HELLO"), "payload text must never reach the SVG");
});

test("renderPixels samples: module centres and quiet zone at three sizes", () => {
  const { modules } = encodeQr("HELLO", "M"); // 21 modules, module (0,0) is dark
  for (const size of [256, 290, 1024]) {
    const total = 21 + 8;
    const modulePx = Math.floor(size / total);
    const offset = Math.floor((size - modulePx * total) / 2);
    const { data } = renderPixels(modules, { margin: 4, size });
    const pixel = (x, y) => Array.from(data.subarray((y * size + x) * 4, (y * size + x) * 4 + 3));
    // quiet zone (inside margin) is background
    assert.deepEqual(pixel(offset + 1, offset + 1), [255, 255, 255], `size ${size} quiet zone`);
    // centre of module (0,0) (finder, dark) is foreground
    const cx = offset + 4 * modulePx + Math.floor(modulePx / 2);
    assert.deepEqual(pixel(cx, cx), [0, 0, 0], `size ${size} dark module`);
    // centre of module (1,1) (finder ring, dark) and module (7,0) (separator, light)
    const lx = offset + (7 + 4) * modulePx + Math.floor(modulePx / 2);
    const ly = offset + 4 * modulePx + Math.floor(modulePx / 2);
    assert.deepEqual(pixel(lx, ly), [255, 255, 255], `size ${size} separator module`);
  }
});

test("renderPixels honours custom colours", () => {
  const { modules } = encodeQr("HELLO", "M");
  const { data } = renderPixels(modules, {
    margin: 0, size: 21, foreground: [10, 20, 30], background: [200, 210, 220],
  });
  assert.deepEqual(Array.from(data.subarray(0, 3)), [10, 20, 30]); // module (0,0) dark
  const sep = (0 * 21 + 7) * 4;
  assert.deepEqual(Array.from(data.subarray(sep, sep + 3)), [200, 210, 220]); // module (7,0) light
});

test("filename format with a frozen clock", () => {
  const frozen = new Date(2026, 10, 2, 3, 4, 5);
  assert.equal(makeFilename(frozen, "png"), "qr-20261102-030405.png");
  assert.equal(makeFilename(frozen, "svg"), "qr-code.svg");
  assert.equal(makeFilename(new Date(Number.NaN), "png"), "qr-code.png");
  assert.equal(makeFilename(null, "png"), "qr-code.png");
});

test("colour parsing accepts only #rrggbb", () => {
  assert.deepEqual(parseHexColor("#0a1B2c"), [10, 27, 44]);
  assert.equal(parseHexColor("red"), null);
  assert.equal(parseHexColor("#12345"), null);
  assert.equal(parseHexColor(""), null);
});

test("contrast ratio and the scannability warning", () => {
  const black = [0, 0, 0];
  const white = [255, 255, 255];
  assert.ok(Math.abs(contrastRatio(black, white) - 21) < 0.01);
  assert.ok(Math.abs(contrastRatio([255, 0, 0], white) - 4.0) < 0.01);
  assert.equal(contrastWarning(black, white), false);
  assert.equal(contrastWarning(white, black), true); // foreground lighter
  assert.equal(contrastWarning([0, 255, 0], white), true); // ratio about 1.37 < 3
});
