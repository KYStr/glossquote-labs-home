import assert from "node:assert/strict";
import test from "node:test";
import { inflateSync } from "node:zlib";

import { adler32, crc32, encodePng } from "../public/js/core/png.mjs";
import { encodeQr, renderPixels } from "../public/js/core/qr.mjs";

test("crc32 and adler32 match their standard check values", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  assert.equal(adler32(new TextEncoder().encode("Wikipedia")), 0x11e60398);
});

function parseChunks(png) {
  const chunks = [];
  let offset = 8;
  while (offset < png.length) {
    const length = new DataView(png.buffer, png.byteOffset + offset).getUint32(0);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    const data = png.subarray(offset + 8, offset + 8 + length);
    const storedCrc = new DataView(png.buffer, png.byteOffset + offset + 8 + length).getUint32(0);
    chunks.push({ type, data, storedCrc });
    offset += 12 + length;
  }
  return chunks;
}

test("PNG structure: signature, IHDR/IDAT/IEND only, valid chunk CRCs, no metadata chunks", () => {
  const { modules } = encodeQr("HELLO", "M");
  const pixels = renderPixels(modules, { margin: 4, size: 256 });
  const png = encodePng(pixels.width, pixels.height, pixels.data);
  assert.deepEqual(Array.from(png.subarray(0, 8)), [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunks = parseChunks(png);
  assert.deepEqual(chunks.map((c) => c.type), ["IHDR", "IDAT", "IEND"]);
  for (const c of chunks) {
    const crcInput = new Uint8Array(4 + c.data.length);
    for (let i = 0; i < 4; i += 1) crcInput[i] = c.type.charCodeAt(i);
    crcInput.set(c.data, 4);
    assert.equal(crc32(crcInput), c.storedCrc, `${c.type} CRC`);
  }
  const ihdr = new DataView(chunks[0].data.buffer, chunks[0].data.byteOffset);
  assert.equal(ihdr.getUint32(0), 256);
  assert.equal(ihdr.getUint32(4), 256);
  assert.equal(chunks[0].data[8], 8); // bit depth
  assert.equal(chunks[0].data[9], 6); // RGBA
});

test("PNG round trip: inflating IDAT reproduces the exact filtered scanlines", () => {
  const { modules } = encodeQr("WIFI:T:WPA;S:A\\;B;P:p\\:ss;;", "M");
  const pixels = renderPixels(modules, { margin: 2, size: 300 });
  const png = encodePng(pixels.width, pixels.height, pixels.data);
  const idat = parseChunks(png).find((c) => c.type === "IDAT").data;
  const raw = inflateSync(idat); // also validates the zlib header and Adler-32
  const stride = pixels.width * 4;
  assert.equal(raw.length, pixels.height * (stride + 1));
  for (let y = 0; y < pixels.height; y += 1) {
    assert.equal(raw[y * (stride + 1)], 0, "filter byte");
    assert.deepEqual(
      raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)),
      Buffer.from(pixels.data.buffer, pixels.data.byteOffset + y * stride, stride),
    );
  }
});

test("PNG encoding is byte-deterministic across runs", () => {
  const { modules } = encodeQr("deterministic", "Q");
  const pixels = renderPixels(modules, { margin: 4, size: 512 });
  const a = encodePng(pixels.width, pixels.height, pixels.data);
  const b = encodePng(pixels.width, pixels.height, pixels.data);
  assert.deepEqual(a, b);
});
