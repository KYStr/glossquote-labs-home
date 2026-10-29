export const MAX_MASKS = 50;

export function exactRecord(value, keys) {
  try {
    if (value === null || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
    const own = Reflect.ownKeys(value);
    return own.length === keys.length && own.every(key => typeof key === 'string' && keys.includes(key) && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
  } catch { return false; }
}
const failure = (code, path) => ({ ok: false, error: path ? { code, path } : { code } });
const validDimensions = (width, height) => Number.isSafeInteger(width) && Number.isSafeInteger(height) && width >= 1 && height >= 1 && width <= 8192 && height <= 8192 && width * height <= 16_000_000;
const maskKeys = ['id', 'x', 'y', 'width', 'height'];

export function normalizeMask(raw, visualWidth, visualHeight) {
  if (!exactRecord(raw, maskKeys)) return failure('MASK_INVALID', 'mask');
  if (!validDimensions(visualWidth, visualHeight)) return failure('MASK_INVALID', 'dimensions');
  if (typeof raw.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(raw.id)) return failure('MASK_INVALID', 'id');
  for (const key of ['x', 'y', 'width', 'height']) if (!Number.isSafeInteger(raw[key])) return failure('MASK_INVALID', key);
  for (const key of ['width', 'height']) if (raw[key] <= 0) return failure('MASK_ZERO_AREA', key);
  if (raw.x < 0 || raw.x + raw.width > visualWidth || !Number.isSafeInteger(raw.x + raw.width)) return failure('MASK_OUT_OF_BOUNDS', 'x');
  if (raw.y < 0 || raw.y + raw.height > visualHeight || !Number.isSafeInteger(raw.y + raw.height)) return failure('MASK_OUT_OF_BOUNDS', 'y');
  return { ok: true, mask: { id: raw.id, x: raw.x, y: raw.y, width: raw.width, height: raw.height } };
}
export function validateMaskList(masks, visualWidth, visualHeight) {
  try {
    if (!Array.isArray(masks) || Object.getPrototypeOf(masks) !== Array.prototype ||
        Reflect.ownKeys(masks).length !== masks.length + 1 ||
        !Array.from({ length: masks.length }, (_, index) => Object.getOwnPropertyDescriptor(masks, String(index))).every(descriptor => descriptor && Object.hasOwn(descriptor, 'value')) ||
        !masks.every(mask => exactRecord(mask, maskKeys))) return failure('MASK_INVALID', 'masks');
    if (masks.length > MAX_MASKS) return failure('MASK_LIMIT', 'masks');
    if (!validDimensions(visualWidth, visualHeight)) return failure('MASK_INVALID', 'dimensions');
    const ids = new Set(), normalized = [];
    for (let index = 0; index < masks.length; index++) {
      const result = normalizeMask(masks[index], visualWidth, visualHeight);
      if (!result.ok) return failure(result.error.code, `masks.${index}.${result.error.path}`);
      if (ids.has(result.mask.id)) return failure('MASK_INVALID', `masks.${index}.id`);
      ids.add(result.mask.id); normalized.push(result.mask);
    }
    return { ok: true, masks: normalized };
  } catch { return failure('MASK_INVALID', 'masks'); }
}
export function mapPointerRect(start, end, imageRect, visualWidth, visualHeight) {
  if (!exactRecord(start, ['x', 'y']) || !exactRecord(end, ['x', 'y']) || !exactRecord(imageRect, ['left', 'top', 'width', 'height']) ||
      !validDimensions(visualWidth, visualHeight) || !Object.values(start).every(Number.isFinite) || !Object.values(end).every(Number.isFinite) ||
      !Object.values(imageRect).every(Number.isFinite) || imageRect.width <= 0 || imageRect.height <= 0) return failure('MASK_INVALID');
  const a = { x: (start.x - imageRect.left) * visualWidth / imageRect.width, y: (start.y - imageRect.top) * visualHeight / imageRect.height };
  const b = { x: (end.x - imageRect.left) * visualWidth / imageRect.width, y: (end.y - imageRect.top) * visualHeight / imageRect.height };
  if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) return failure('MASK_INVALID');
  if (a.x === b.x || a.y === b.y) return failure('MASK_ZERO_AREA');
  const clamp = (value, limit) => Math.max(0, Math.min(limit, value));
  const x0 = clamp(Math.floor(Math.min(a.x, b.x)), visualWidth), y0 = clamp(Math.floor(Math.min(a.y, b.y)), visualHeight);
  const x1 = clamp(Math.ceil(Math.max(a.x, b.x)), visualWidth), y1 = clamp(Math.ceil(Math.max(a.y, b.y)), visualHeight);
  if (x1 <= x0 || y1 <= y0) return failure('MASK_ZERO_AREA');
  return { ok: true, rect: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } };
}
