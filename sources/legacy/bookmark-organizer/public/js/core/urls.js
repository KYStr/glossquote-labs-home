import { fail } from './errors.js';
export function validateHref(value, offset = 0) {
  if (!value || /^[\t\n\r ]|[\t\n\r ]$/.test(value) || /[\u0000-\u001f\u007f-\u009f]/.test(value) || /%(?![0-9a-f]{2})/i.test(value)) fail('INVALID_URL', offset);
  let parsed;
  try { parsed = new URL(value); } catch { fail('INVALID_URL', offset); }
  if (!['http:', 'https:'].includes(parsed.protocol)) fail('UNSAFE_URL', offset);
  if (parsed.username || parsed.password) fail('UNSAFE_URL', offset);
  // The WHATWG parser validates; its canonical serialization is never used as data.
  return value;
}
