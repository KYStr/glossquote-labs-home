// 測試只建立合成圖片與可控承諾，不讀取使用者檔案。
import { deflateSync } from 'node:zlib';
import { crc32 } from '../public/js/core/images.mjs';
export function chunk(type, data = new Uint8Array()) {
  const result = new Uint8Array(data.length + 12), view = new DataView(result.buffer);
  view.setUint32(0, data.length); result.set(new TextEncoder().encode(type), 4); result.set(data, 8);
  view.setUint32(8 + data.length, crc32(result.subarray(4, 8 + data.length))); return result;
}
export function png(width = 2, height = 1, extra = [], color = [80, 120, 170, 255]) {
  const ihdr = new Uint8Array(13), view = new DataView(ihdr.buffer);
  view.setUint32(0, width); view.setUint32(4, height); ihdr[8] = 8; ihdr[9] = 6;
  const rows = new Uint8Array(Math.min(10000, height * (width * 4 + 1)));
  if (width * height <= 2000) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) rows.set(color, y * (width * 4 + 1) + x * 4 + 1);
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), ...extra, chunk('IDAT', deflateSync(rows)), chunk('IEND')];
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result;
}
export function jpeg(width = 2, height = 1, marker = 192) {
  return new Uint8Array([255,216,255,marker,0,11,8,height>>8,height&255,width>>8,width&255,1,1,17,0,255,218,0,8,1,1,0,0,63,0,1,255,217]);
}
export const frame = (width = 2, height = 1, color = [40, 90, 120, 255]) => ({ width, height, data: Uint8ClampedArray.from(Array.from({ length: width * height }, () => color).flat()) });
export const file = (bytes = png(), name = 'test.png') => ({ name, size: bytes.length, arrayBuffer: async () => bytes.slice().buffer });
export const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
export const tick = () => new Promise(resolve => setImmediate(resolve));
