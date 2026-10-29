// 限制單檔、邊長與像素，避免壓縮小檔造成巨大解碼配置。
export const LIMITS = Object.freeze({ bytes: 10 * 1024 * 1024, edge: 4096, pixels: 4_000_000 });
// 統一以可翻譯的代碼回報錯誤，不顯示瀏覽器內部訊息。
const fail = code => { throw new Error(code); };
// 只接受正整數尺寸，且乘積不超過候選的記憶體預算。
export function checkDimensions(width, height) {
  if (![width, height].every(v => Number.isSafeInteger(v) && v > 0)) fail('CORRUPT');
  if (width > LIMITS.edge || height > LIMITS.edge || width * height > LIMITS.pixels) fail('DIMENSIONS');
  return { width, height };
}
// 產生 PNG CRC 查表；只使用標準數值運算。
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let bit = 0; bit < 8; bit++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
// 驗證區塊型別與資料的 CRC，可拒絕損壞標頭而不先交給解碼器。
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
// 檔名與 MIME 僅供顯示；真正的格式判斷取自檔案內容。
export function inspectImage(bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length) fail('EMPTY');
  if (bytes.length > LIMITS.bytes) fail('FILE_SIZE');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.every((byte, i) => bytes[i] === byte)) {
    let offset = 8, shape = null, data = false, endedData = false, palette = false, color;
    while (offset < bytes.length) {
      if (offset + 12 > bytes.length) fail('CORRUPT');
      const length = view.getUint32(offset);
      if (length > bytes.length - offset - 12) fail('CORRUPT');
      const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      if (!/^[A-Za-z]{4}$/.test(type) || (bytes[offset + 6] & 32)) fail('CORRUPT');
      if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== view.getUint32(offset + 8 + length)) fail('CORRUPT');
      if (offset === 8) {
        if (type !== 'IHDR' || length !== 13) fail('CORRUPT');
        shape = checkDimensions(view.getUint32(offset + 8), view.getUint32(offset + 12));
        const depth = bytes[offset + 16]; color = bytes[offset + 17];
        const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
        if (!depths[color]?.includes(depth) || bytes[offset + 18] || bytes[offset + 19] || bytes[offset + 20] > 1) fail('CORRUPT');
      } else if (type === 'IHDR') fail('CORRUPT');
      if (['acTL', 'fcTL', 'fdAT'].includes(type)) fail('FORMAT');
      if (!(bytes[offset + 4] & 32) && !['IHDR', 'PLTE', 'IDAT', 'IEND'].includes(type)) fail('FORMAT');
      if (type === 'PLTE') {
        if (palette || data || !length || length > 768 || length % 3 || [0, 4].includes(color)) fail('CORRUPT');
        palette = true;
      }
      if (type === 'IDAT') {
        if (endedData || color === 3 && !palette) fail('CORRUPT');
        data = true;
      } else if (data) endedData = true;
      offset += length + 12;
      if (type === 'IEND') {
        if (length || !data || offset !== bytes.length) fail('CORRUPT');
        return { ...shape, mime: 'image/png' };
      }
    }
    fail('CORRUPT');
  }
  if (bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2, shape = null, sawScan = false;
    while (offset < bytes.length) {
      if (bytes[offset++] !== 255) fail('CORRUPT');
      while (bytes[offset] === 255) offset++;
      if (offset >= bytes.length) fail('CORRUPT');
      const marker = bytes[offset++];
      if (marker === 217) {
        if (!shape || !sawScan || offset !== bytes.length) fail('CORRUPT');
        return { ...shape, mime: 'image/jpeg' };
      }
      if ([0, 1, 216].includes(marker) || marker >= 208 && marker <= 215) fail('CORRUPT');
      // 不接受延後改變行數或階層式影像，以免解碼時擴大先前尺寸。
      if ([220, 222].includes(marker)) fail('FORMAT');
      if (offset + 2 > bytes.length) fail('CORRUPT');
      const length = view.getUint16(offset);
      if (length < 2 || length > bytes.length - offset) fail('CORRUPT');
      if (marker >= 192 && marker <= 207 && ![196, 200, 204].includes(marker)) {
        if (![192, 194].includes(marker) || length < 8 || bytes[offset + 2] !== 8) fail('FORMAT');
        const components = bytes[offset + 7];
        if (![1, 3, 4].includes(components) || length !== 8 + 3 * components || shape) fail('CORRUPT');
        shape = checkDimensions(view.getUint16(offset + 5), view.getUint16(offset + 3));
      }
      if (marker === 218) {
        const components = bytes[offset + 2];
        if (!shape || length < 6 || components < 1 || components > 4 || length !== 6 + 2 * components) fail('CORRUPT');
        sawScan = true; offset += length;
        // 掃過 entropy bytes 的 stuffing/restart，仍檢查後續所有標記。
        // 不能在第一個 SOS 就返回：後段 SOF/DNL 可能改變記憶體需求。
        while (offset < bytes.length) {
          if (bytes[offset] !== 255) { offset++; continue; }
          const start = offset;
          while (bytes[offset] === 255) offset++;
          if (offset >= bytes.length) fail('CORRUPT');
          const next = bytes[offset];
          if (next === 0 || next >= 208 && next <= 215) { offset++; continue; }
          offset = start; break;
        }
        continue;
      }
      offset += length;
    }
    fail('CORRUPT');
  }
  fail(bytes[0] === 137 || bytes[0] === 255 ? 'CORRUPT' : 'FORMAT');
}
// 兩張圖必須是瀏覽器解碼與方向處理後的相同尺寸，絕不偷偷縮放。
export function checkPair(a, b) {
  if (!a || !b) fail('NEED_TWO');
  checkDimensions(a.width, a.height); checkDimensions(b.width, b.height);
  if (a.width !== b.width || a.height !== b.height) fail('MISMATCH');
  return { width: a.width, height: a.height };
}
// 控制項雖有 HTML 邊界，核心仍重新驗證外部傳入值。
export function checkSettings(settings) {
  if (!settings || !['overlay', 'difference'].includes(settings.mode)) fail('SETTINGS');
  if (!Number.isInteger(settings.opacity) || settings.opacity < 0 || settings.opacity > 100) fail('SETTINGS');
  return { mode: settings.mode, opacity: settings.opacity };
}
// 白底合成採最近整數，透明像素的隱藏 RGB 不影響結果。
export function whiteChannel(value, alpha) { return Math.round((value * alpha + 255 * (255 - alpha)) / 255); }
// 純像素演算法分塊讓出執行緒；每一塊前後檢查取消，不提交舊結果。
export async function renderPixels(a, b, settings, current = () => true, yieldTask = () => new Promise(resolve => setTimeout(resolve, 0))) {
  const shape = checkPair(a, b), options = checkSettings(settings), length = shape.width * shape.height * 4;
  if (![a, b].every(frame => frame.data instanceof Uint8ClampedArray && frame.data.length === length)) fail('CORRUPT');
  if (!current()) fail('CANCELLED');
  const data = new Uint8ClampedArray(length);
  for (let start = 0; start < length; start += 262144) {
    await yieldTask();
    if (!current()) fail('CANCELLED');
    const end = Math.min(length, start + 262144);
    for (let i = start; i < end; i += 4) {
      for (let channel = 0; channel < 3; channel++) {
        const left = whiteChannel(a.data[i + channel], a.data[i + 3]);
        const right = whiteChannel(b.data[i + channel], b.data[i + 3]);
        data[i + channel] = options.mode === 'difference' ? Math.abs(left - right) : Math.round((left * (100 - options.opacity) + right * options.opacity) / 100);
      }
      data[i + 3] = 255;
    }
  }
  if (!current()) fail('CANCELLED');
  return { ...shape, data };
}
