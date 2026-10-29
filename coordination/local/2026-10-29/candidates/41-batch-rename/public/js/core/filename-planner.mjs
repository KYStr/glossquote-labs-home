export const LIMITS = Object.freeze({ count: 100, fileBytes: 16 * 1048576, totalBytes: 64 * 1048576, sourceUnits: 1024, nameBytes: 180, sequence: 999999999 });

export class RenameError extends Error {
  constructor(code) { super(code); this.name = 'RenameError'; this.code = code; }
}
const fail = code => { throw new RenameError(code); };
const own = (object, key) => Object.hasOwn(object, key);
function record(value) {
  return value !== null && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

// A code-unit cap MUST precede this scalar scan, normalization and encoding.
export function scalarCount(text, maxUnits = LIMITS.sourceUnits, code = 'SOURCE_NAME') {
  if (typeof text !== 'string') fail(code);
  if (text.length > maxUnits) fail(code);
  let count = 0;
  for (let i = 0; i < text.length; i++, count++) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail('UNICODE');
      i++;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) fail('UNICODE');
  }
  return count;
}

export function inspectItems(items) {
  const errors = [];
  if (!Array.isArray(items) || items.length > LIMITS.count) return { errors: [{ code: 'COUNT' }], totalBytes: 0 };
  let totalBytes = 0;
  // All size gates precede any name scan. No bytes are read by this module.
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (!record(item) || !own(item, 'size') || !Number.isSafeInteger(item.size) || item.size < 0) errors.push({ code: 'SIZE', index });
    else if (item.size > LIMITS.fileBytes) errors.push({ code: 'FILE_LIMIT', index });
    else totalBytes += item.size;
  }
  if (totalBytes > LIMITS.totalBytes) errors.push({ code: 'TOTAL_LIMIT' });
  if (errors.length) return { errors, totalBytes };
  for (let index = 0; index < items.length; index++) {
    try {
      if (!own(items[index], 'name') || items[index].name === '') fail('SOURCE_NAME');
      scalarCount(items[index].name);
    } catch (error) { errors.push({ code: error.code ?? 'SOURCE_NAME', index }); }
  }
  return { errors, totalBytes };
}

export function parseDecimal(text, min, max, code = 'START') {
  if (typeof text !== 'string' || text.length === 0 || text.length > 9) fail(code);
  let value = 0;
  for (let index = 0; index < text.length; index++) {
    const digit = text.charCodeAt(index) - 48;
    if (digit < 0 || digit > 9) fail(code);
    value = value * 10 + digit;
  }
  if (value < min || value > max) fail(code);
  return value;
}

function fieldText(value, minimum, maximum, code) {
  const count = scalarCount(value, maximum * 2, code);
  if (count < minimum || count > maximum) fail(code);
}

export function validateRule(rule, count = 0) {
  if (!record(rule)) fail('RULE_SCHEMA');
  const keys = Reflect.ownKeys(rule);
  if (keys.some(key => typeof key !== 'string' || !('value' in Object.getOwnPropertyDescriptor(rule, key)))) fail('RULE_SCHEMA');
  const sequence = rule.mode === 'sequence';
  const replace = rule.mode === 'replace';
  if (!sequence && !replace) fail('RULE_SCHEMA');
  const allowed = sequence ? ['mode', 'base', 'start', 'width'] : ['mode', 'find', 'replacement', 'prefix'];
  const required = sequence ? allowed : ['mode', 'find', 'replacement'];
  if (keys.some(key => !allowed.includes(key)) || required.some(key => !own(rule, key))) fail('RULE_SCHEMA');
  if (sequence) {
    fieldText(rule.base, 1, 80, 'BASE');
    if (!Number.isSafeInteger(rule.start) || rule.start < 1 || rule.start > LIMITS.sequence) fail('START');
    if (!Number.isSafeInteger(rule.width) || rule.width < 1 || rule.width > 9) fail('WIDTH');
    if (count > 0 && rule.start + count - 1 > LIMITS.sequence) fail('SEQUENCE_END');
  } else {
    fieldText(rule.find, 1, 80, 'FIND');
    fieldText(rule.replacement, 0, 80, 'REPLACEMENT');
    if (own(rule, 'prefix')) fieldText(rule.prefix, 0, 40, 'PREFIX');
  }
}

export function splitFilename(name) {
  scalarCount(name);
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return { stem: name, extension: '' };
  return { stem: name.slice(0, dot), extension: name.slice(dot) };
}

export function replaceNonOverlapping(stem, find, replacement) {
  scalarCount(stem);
  fieldText(find, 1, 80, 'FIND');
  fieldText(replacement, 0, 80, 'REPLACEMENT');
  let result = '';
  let cursor = 0;
  let next;
  while ((next = stem.indexOf(find, cursor)) !== -1) {
    result += stem.slice(cursor, next) + replacement;
    cursor = next + find.length;
  }
  return result + stem.slice(cursor);
}

export function validateOutputName(candidate) {
  // Maximum expanded literal replacement: 1024 source units * 160 replacement
  // units plus prefix. This bound prevents direct callers from scanning infinity.
  scalarCount(candidate, LIMITS.sourceUnits * 160 + 80, 'NAME_LENGTH');
  const normalizedName = candidate.normalize('NFC');
  if (normalizedName === '' || normalizedName === '.' || normalizedName === '..') fail('NAME_EMPTY');
  for (const char of normalizedName) {
    const point = char.codePointAt(0);
    if (point <= 31 || point === 127 || '/\\<>:"|?*'.includes(char)) fail('NAME_UNSAFE');
  }
  if (normalizedName.endsWith(' ') || normalizedName.endsWith('.')) fail('NAME_TRAILING');
  let component = normalizedName.split('.', 1)[0];
  while (component.endsWith(' ') || component.endsWith('.')) component = component.slice(0, -1);
  let asciiUpper = '';
  for (const char of component) {
    const point = char.codePointAt(0);
    asciiUpper += point >= 97 && point <= 122 ? String.fromCharCode(point - 32) : char;
  }
  if (['CON', 'PRN', 'AUX', 'NUL'].includes(asciiUpper) ||
      (asciiUpper.length === 4 && ['COM', 'LPT'].includes(asciiUpper.slice(0, 3)) && '123456789¹²³'.includes(asciiUpper[3]))) fail('NAME_DEVICE');
  const utf8Length = new TextEncoder().encode(normalizedName).length;
  if (utf8Length > LIMITS.nameBytes) fail('NAME_LENGTH');
  return { normalizedName, utf8Length };
}

export function collisionKey(normalizedName) { return normalizedName.toUpperCase(); }

export function planRenames(items, rule) {
  const inspected = inspectItems(items);
  if (inspected.errors.length) return { rows: [], errors: inspected.errors, canBuild: false };
  try { validateRule(rule, items.length); }
  catch (error) { return { rows: [], errors: [{ code: error.code ?? 'RULE_SCHEMA' }], canBuild: false }; }
  const errors = [];
  const rows = items.map((item, index) => {
    const { stem, extension } = splitFilename(item.name);
    const next = rule.mode === 'sequence' ? `${rule.base}-${String(rule.start + index).padStart(rule.width, '0')}` : `${rule.prefix ?? ''}${replaceNonOverlapping(stem, rule.find, rule.replacement)}`;
    const row = { index, originalName: item.name, outputName: next + extension, size: item.size, errors: [] };
    try { row.outputName = validateOutputName(row.outputName).normalizedName; }
    catch (error) { row.errors.push(error.code); errors.push({ code: error.code, index }); }
    return row;
  });
  if (!errors.length) {
    const keys = new Map();
    for (const row of rows) {
      const key = collisionKey(row.outputName);
      if (keys.has(key)) {
        const first = rows[keys.get(key)];
        for (const entry of [first, row]) if (!entry.errors.includes('COLLISION')) {
          entry.errors.push('COLLISION'); errors.push({ code: 'COLLISION', index: entry.index });
        }
      } else keys.set(key, row.index);
    }
  }
  return { rows, errors, canBuild: items.length > 0 && errors.length === 0 };
}
