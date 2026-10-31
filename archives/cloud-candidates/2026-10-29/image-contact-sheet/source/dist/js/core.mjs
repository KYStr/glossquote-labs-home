// 所有限制集中定義，介面與測試共用同一個契約。
export const LIMITS = Object.freeze({ count: 30, fileBytes: 8 * 1024 ** 2, totalBytes: 64 * 1024 ** 2, edge: 8192, pixels: 16_000_000, outputBytes: 64 * 1024 ** 2 });
// 使用穩定錯誤碼，原始輸入及瀏覽器例外不進入紀錄。
export function fail(code) { throw new Error(code); }
// 檔案大小在讀取或解碼之前檢查，副檔名不是格式依據。
export function validateSelection(files, existingCount = 0, existingBytes = 0) {
  if (!files.length || files.length + existingCount > LIMITS.count) fail('COUNT');
  let total = existingBytes;
  for (const file of files) {
    if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > LIMITS.fileBytes) fail('FILE_SIZE');
    if (typeof file.name !== 'string' || file.name.length > 4096) fail('NAME');
    total += file.size;
  }
  if (total > LIMITS.totalBytes) fail('TOTAL_SIZE');
  return total;
}
// EXIF 僅讀取 IFD0 方向，不保存 GPS、拍攝時間或其他欄位。
export function readOrientation(bytes) {
  if (bytes.length < 8) fail('FORMAT');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const little = bytes[0] === 73 && bytes[1] === 73;
  if (!little && !(bytes[0] === 77 && bytes[1] === 77)) fail('FORMAT');
  const u16 = p => { if (p < 0 || p + 2 > bytes.length) fail('FORMAT'); return view.getUint16(p, little); };
  const u32 = p => { if (p < 0 || p + 4 > bytes.length) fail('FORMAT'); return view.getUint32(p, little); };
  if (u16(2) !== 42) fail('FORMAT');
  const start = u32(4);
  if (start < 8) fail('FORMAT');
  const count = u16(start);
  if (start + 2 + count * 12 + 4 > bytes.length) fail('FORMAT');
  let orientation = 1;
  let seen = false;
  for (let index = 0; index < count; index++) {
    const p = start + 2 + index * 12;
    if (u16(p) !== 0x112) continue;
    if (seen || u16(p + 2) !== 3 || u32(p + 4) !== 1) fail('FORMAT');
    orientation = u16(p + 8);
    if (orientation < 1 || orientation > 8) fail('FORMAT');
    seen = true;
  }
  return orientation;
}
// 尺寸在原生解碼前判定；限制不等於所有裝置都能成功配置記憶體。
function dimensions(format, width, height, orientation) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > LIMITS.edge || height > LIMITS.edge || width * height > LIMITS.pixels) fail('DIMENSIONS');
  return { format, rawWidth: width, rawHeight: height, orientation, width: orientation >= 5 ? height : width, height: orientation >= 5 ? width : height };
}
// PNG 逐塊走訪，拒絕 APNG 與不完整 framing；像素有效性由原生解碼器再確認。
export function inspectImage(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 8) fail('FORMAT');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if ([137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v)) {
    let p = 8, width, height, orientation = 1, ended = false, data = false, exif = false;
    while (p + 12 <= bytes.length) {
      const length = view.getUint32(p);
      const kind = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
      if (p + length + 12 > bytes.length) fail('FORMAT');
      if (p === 8) {
        if (kind !== 'IHDR' || length !== 13) fail('FORMAT');
        width = view.getUint32(p + 8); height = view.getUint32(p + 12);
        dimensions('png', width, height, 1);
      } else if (kind === 'IHDR') fail('FORMAT');
      if (kind === 'acTL' || kind === 'fcTL' || kind === 'fdAT') fail('ANIMATION');
      if (kind === 'eXIf') { if (exif || data) fail('FORMAT'); orientation = readOrientation(bytes.subarray(p + 8, p + 8 + length)); exif = true; }
      if (kind === 'IDAT') data = true;
      p += length + 12;
      if (kind === 'IEND') { if (length !== 0 || !data || p !== bytes.length) fail('FORMAT'); ended = true; break; }
    }
    if (!ended) fail('FORMAT');
    return dimensions('png', width, height, orientation);
  }
  // JPEG 只接受 8-bit baseline/progressive，一次掃描到第一個 SOS。
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) fail('FORMAT');
  let p = 2, width, height, orientation = 1, exif = false;
  while (p < bytes.length - 2) {
    if (bytes[p++] !== 255) fail('FORMAT');
    while (bytes[p] === 255) p++;
    const marker = bytes[p++];
    if (marker === 0 || marker === 0xd8 || marker === 0xd9 || marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) fail('FORMAT');
    if (p + 2 > bytes.length) fail('FORMAT');
    const length = view.getUint16(p);
    if (length < 2 || p + length > bytes.length - 2) fail('FORMAT');
    if (marker === 0xe1 && length >= 8 && [69,120,105,102,0,0].every((v, i) => bytes[p + 2 + i] === v)) {
      if (exif) fail('FORMAT');
      orientation = readOrientation(bytes.subarray(p + 8, p + length)); exif = true;
    }
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4,0xc8,0xcc].includes(marker)) {
      if (![0xc0,0xc2].includes(marker) || width !== undefined || length < 11 || bytes[p + 2] !== 8) fail('FORMAT');
      const components = bytes[p + 7];
      if (![1,3].includes(components) || length !== 8 + 3 * components) fail('FORMAT');
      height = view.getUint16(p + 3); width = view.getUint16(p + 5);
      dimensions('jpeg', width, height, orientation);
    }
    if (marker === 0xda) {
      if (width === undefined || length < 6) fail('FORMAT');
      return dimensions('jpeg', width, height, orientation);
    }
    p += length;
  }
  fail('FORMAT');
}
// 所有參數必須是整數；不靜默改寫無效設定。
export function layout(count, options) {
  if (!Number.isInteger(count) || count < 1 || count > LIMITS.count) fail('COUNT');
  const { columns, tile, gap, margin, labels } = options;
  if (!Number.isInteger(columns) || columns < 1 || columns > 6 || ![120,180,240,320].includes(tile) || !Number.isInteger(gap) || gap < 0 || gap > 64 || !Number.isInteger(margin) || margin < 0 || margin > 96 || typeof labels !== 'boolean') fail('SETTINGS');
  const usedColumns = Math.min(count, columns);
  const rows = Math.ceil(count / columns);
  const labelHeight = labels ? 52 : 28;
  const cellHeight = tile + labelHeight;
  const width = margin * 2 + usedColumns * tile + (usedColumns - 1) * gap;
  const height = margin * 2 + rows * cellHeight + (rows - 1) * gap;
  if (width > LIMITS.edge || height > LIMITS.edge || width * height > LIMITS.pixels) fail('OUTPUT_SIZE');
  const cells = Array.from({length: count}, (_, index) => ({ number: index + 1, x: margin + (index % columns) * (tile + gap), y: margin + Math.floor(index / columns) * (cellHeight + gap) }));
  return { width, height, tile, labelHeight, cells };
}
// 置中等比例縮放，不裁切，也不放大原始尺寸。
export function contain(width, height, box) {
  if (![width,height,box].every(v => Number.isFinite(v) && v > 0)) fail('DIMENSIONS');
  const scale = Math.min(1, box / width, box / height);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  return { width: w, height: h, x: Math.floor((box - w) / 2), y: Math.floor((box - h) / 2) };
}
// 純排序函式不改寫來源陣列，供鍵盤按鈕共用。
export function move(items, from, to) {
  if (![from,to].every(i => Number.isInteger(i) && i >= 0 && i < items.length)) fail('ORDER');
  const result = [...items]; const [item] = result.splice(from, 1); result.splice(to, 0, item); return result;
}
// 索引使用 JSON 字串表示完整檔名；控制字元跳脫，避免假造新索引列。
export function filenameIndex(items, language = 'en') {
  const heading = language === 'zh-Hant' ? '照片聯絡表 — 完整檔名以 JSON 字串表示' : 'Photo contact sheet — filenames as JSON strings';
  return heading + '\n' + items.map((item, i) => `${i + 1}\t${JSON.stringify(item.name)}`).join('\n') + '\n';
}
// 圖面上的單行標示去除控制/雙向控制字元；完整原名仍在文字索引。
export function displayName(name) { return name.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu, '\uFFFD'); }
