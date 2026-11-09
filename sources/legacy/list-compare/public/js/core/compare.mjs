export const LIMITS = Object.freeze({ inputUnits: 100000, items: 5000, itemPoints: 200 });
const fields = ['aText', 'bText', 'trimItems', 'ignoreCase'];
const controlCharacter = /[\u0000-\u001f\u007f-\u009f]/u;

function failure(code, side = null, line = null) {
  return { ok: false, error: { code, side, line } };
}

function readRequest(request) {
  if (request === null || typeof request !== 'object') return null;
  try {
    const proto = Object.getPrototypeOf(request);
    if (proto !== Object.prototype && proto !== null) return null;
    const keys = Reflect.ownKeys(request);
    if (keys.length !== fields.length || keys.some(key => !fields.includes(key))) return null;
    const snapshot = {};
    for (const [index, key] of fields.entries()) {
      const descriptor = Object.getOwnPropertyDescriptor(request, key);
      if (descriptor?.enumerable !== true || !Object.hasOwn(descriptor, 'value')
        || typeof descriptor.value !== (index < 2 ? 'string' : 'boolean')) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

export function physicalLines(text) {
  return text.replace(/\r\n?/g, '\n').split('\n');
}

function parseSide(raw, side, trimItems, ignoreCase) {
  const lines = physicalLines(raw);
  const unique = new Map();
  let blankLineCount = 0;
  let nonEmptyLineCount = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const row = lines[index];
    const trimmed = row.trim();
    if (trimmed === '') { blankLineCount += 1; continue; }
    nonEmptyLineCount += 1;
    const line = index + 1;
    if (nonEmptyLineCount > LIMITS.items) return failure('TOO_MANY_ITEMS', side, line);
    const text = trimItems ? trimmed : row;
    let points = 0;
    for (const unused of text) {
      points += 1;
      if (points > LIMITS.itemPoints) return failure('ITEM_TOO_LONG', side, line);
    }
    if (controlCharacter.test(text)) return failure('CONTROL_CHARACTER', side, line);
    const key = ignoreCase ? text.toLowerCase() : text;
    const previous = unique.get(key);
    if (previous) previous.occurrences += 1;
    else unique.set(key, { key, text, firstLine: line, occurrences: 1 });
  }
  return {
    ok: true,
    value: {
      side, rawLineCount: lines.length, blankLineCount, nonEmptyLineCount,
      uniqueCount: unique.size, duplicateCount: nonEmptyLineCount - unique.size,
      items: [...unique.values()]
    }
  };
}

function sourced(item, source) {
  return { text: item.text, source, firstLine: item.firstLine, occurrences: item.occurrences, key: item.key };
}

export function compareLists(request) {
  // Capture descriptors once, without invoking user-defined accessors.
  const snapshot = readRequest(request);
  if (!snapshot) return failure('INVALID_REQUEST');
  const { aText, bText, trimItems, ignoreCase } = snapshot;
  if (aText.length > LIMITS.inputUnits) return failure('INPUT_TOO_LONG', 'A');
  if (bText.length > LIMITS.inputUnits) return failure('INPUT_TOO_LONG', 'B');
  const parsedA = parseSide(aText, 'A', trimItems, ignoreCase);
  if (!parsedA.ok) return parsedA;
  const parsedB = parseSide(bText, 'B', trimItems, ignoreCase);
  if (!parsedB.ok) return parsedB;
  const a = parsedA.value;
  const b = parsedB.value;
  const aKeys = new Set(a.items.map(item => item.key));
  const bItems = new Map(b.items.map(item => [item.key, item]));
  const aOnly = [];
  const intersection = [];
  for (const item of a.items) {
    const match = bItems.get(item.key);
    if (!match) aOnly.push(sourced(item, 'A'));
    else intersection.push({
      text: item.text, aFirstLine: item.firstLine, bFirstLine: match.firstLine,
      aOccurrences: item.occurrences, bOccurrences: match.occurrences, key: item.key
    });
  }
  const bOnly = b.items.filter(item => !aKeys.has(item.key)).map(item => sourced(item, 'B'));
  const merged = [...a.items.map(item => sourced(item, 'A')), ...bOnly.map(item => ({ ...item }))];
  return { ok: true, value: {
    a, b,
    summary: { aOnlyCount: aOnly.length, bOnlyCount: bOnly.length, intersectionCount: intersection.length, mergedCount: merged.length },
    results: { aOnly, bOnly, intersection, merged }
  } };
}
