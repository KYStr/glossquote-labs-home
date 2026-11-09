import { fail } from './errors.js';
const NAMED = Object.freeze({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' });
export function decodeEntities(raw, offset = 0) {
  let output = '';
  let start = 0;
  for (let index = raw.indexOf('&'); index !== -1; index = raw.indexOf('&', start)) {
    output += raw.slice(start, index);
    const end = raw.indexOf(';', index + 1);
    if (end === -1 || end - index > 32) fail('INVALID_ENTITY', offset + index);
    const entity = raw.slice(index + 1, end);
    if (Object.hasOwn(NAMED, entity)) output += NAMED[entity];
    else {
      let value;
      if (/^#[0-9]+$/.test(entity)) value = Number(entity.slice(1));
      else if (/^#x[0-9a-f]+$/i.test(entity)) value = Number.parseInt(entity.slice(2), 16);
      else fail('INVALID_ENTITY', offset + index);
      if (!Number.isSafeInteger(value) || value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) fail('INVALID_ENTITY', offset + index);
      output += String.fromCodePoint(value);
    }
    start = end + 1;
  }
  return output + raw.slice(start);
}
