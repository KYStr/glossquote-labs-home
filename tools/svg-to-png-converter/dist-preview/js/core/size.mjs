// SPEC 第 4 節：固有尺寸解析、四捨五入（half away from zero）、輸出尺寸與上限、控制值驗證。

export const MAX_SIDE = 8192;
export const MAX_PIXELS = 33554432;
export const MIN_DIMENSION = 16;
export const MIN_SCALE = 10;
export const MAX_SCALE = 1000;

// width/height 屬性：只有純數字或數字 + px，且 > 0 才算存在；其他單位或百分比視同缺席。
export function parseLengthAttr(value) {
  if (value == null) return null;
  const match = /^(\d+\.?\d*|\.\d+)(px)?$/.exec(String(value).trim());
  if (!match) return null;
  const number = Number(match[1]);
  return number > 0 ? number : null;
}

const NUMBER_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

// viewBox：四個數字；寬或高 <= 0 視同缺席，格式不合也視同缺席。
export function parseViewBox(value) {
  if (value == null) return null;
  const parts = String(value).trim().split(/[\s,]+/).filter((p) => p !== '');
  if (parts.length !== 4 || !parts.every((p) => NUMBER_RE.test(p))) return null;
  const [minX, minY, width, height] = parts.map(Number);
  if (!(width > 0) || !(height > 0)) return null;
  return { minX, minY, width, height };
}

// 四條固有尺寸規則；回傳 {ok:true, width, height, rule, source} 或 {ok:false, code:'undeterminable'}。
export function resolveIntrinsic({ widthAttr, heightAttr, viewBoxAttr }) {
  const width = parseLengthAttr(widthAttr);
  const height = parseLengthAttr(heightAttr);
  const viewBox = parseViewBox(viewBoxAttr);
  if (width !== null && height !== null) {
    return { ok: true, width, height, rule: 1, source: 'attributes' };
  }
  if (width !== null && viewBox) {
    return { ok: true, width, height: (width * viewBox.height) / viewBox.width, rule: 2, source: 'derived' };
  }
  if (height !== null && viewBox) {
    return { ok: true, width: (height * viewBox.width) / viewBox.height, height, rule: 2, source: 'derived' };
  }
  if (viewBox) {
    return { ok: true, width: viewBox.width, height: viewBox.height, rule: 3, source: 'viewBox' };
  }
  return { ok: false, code: 'undeterminable' };
}

export function roundHalfAwayFromZero(x) {
  return Math.sign(x) * Math.floor(Math.abs(x) + 0.5);
}

// 依模式計算輸出尺寸（尚未查上限）；未選維度以交叉比例換算、四捨五入、下限 1。
export function computeOutputSize(intrinsic, mode, value) {
  if (mode === 'width') {
    return { width: value, height: Math.max(1, roundHalfAwayFromZero((value * intrinsic.height) / intrinsic.width)) };
  }
  if (mode === 'height') {
    return { width: Math.max(1, roundHalfAwayFromZero((value * intrinsic.width) / intrinsic.height)), height: value };
  }
  if (mode === 'scale') {
    const factor = value / 100;
    return {
      width: Math.max(1, roundHalfAwayFromZero(intrinsic.width * factor)),
      height: Math.max(1, roundHalfAwayFromZero(intrinsic.height * factor)),
    };
  }
  throw new Error(`unknown sizing mode ${mode}`);
}

// 渲染前硬上限：任一邊 > 8192 或總像素 > 33,554,432 即 over-cap。
export function checkOutputCaps(size) {
  if (size.width > MAX_SIDE || size.height > MAX_SIDE || size.width * size.height > MAX_PIXELS) {
    return { code: 'output-over-cap', width: size.width, height: size.height };
  }
  return null;
}

// 寬/高模式輸入：整數 16–8192。scale：10–1000，最多一位小數。
export function validateDimensionInput(raw, mode) {
  const text = String(raw).trim();
  if (mode === 'scale') {
    if (!/^\d+(\.\d)?$/.test(text)) return { ok: false, code: 'invalid-scale' };
    const value = Number(text);
    if (value < MIN_SCALE || value > MAX_SCALE) return { ok: false, code: 'invalid-scale' };
    return { ok: true, value };
  }
  if (!/^\d+$/.test(text)) return { ok: false, code: 'invalid-dimension' };
  const value = Number(text);
  if (value < MIN_DIMENSION || value > MAX_SIDE) return { ok: false, code: 'invalid-dimension' };
  return { ok: true, value };
}

export function isValidHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value).trim());
}

export function outputFileName(width, height) {
  return `svg-converted-${width}x${height}.png`;
}
