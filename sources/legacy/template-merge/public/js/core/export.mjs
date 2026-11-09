import { LIMITS, ToolError } from './errors.mjs';

export const FILENAMES = Object.freeze({ txt: 'personalized-text.txt', json: 'personalized-text.json' });

export function serializeBatch(result, { template, headers, allowBlank = false, language = 'zh-Hant' }, {
  maxCombinedBytes = LIMITS.maxCombinedBytes,
} = {}) {
  if (!Number.isSafeInteger(maxCombinedBytes) || maxCombinedBytes < 1 || maxCombinedBytes > LIMITS.maxCombinedBytes) throw new TypeError('Invalid export limit.');
  if (!['zh-Hant', 'en'].includes(language)) throw new TypeError('Invalid export language.');
  const records = result.records;
  const counts = {
    records: records.length,
    blankCells: records.reduce((sum, record) => sum + record.blankFields.length, 0),
    recordsWithBlanks: records.filter(record => record.blankFields.length).length,
  };
  const document = {
    schemaVersion: 1, tool: 'template-merge', template, headers,
    options: { allowBlank, language }, records, counts,
  };
  const encoder = new TextEncoder();
  const txt = encoder.encode(records.map(record => `${language === 'en' ? `--- Row ${record.row} ---` : `--- 第 ${record.row} 筆 ---`}\n${record.text}`).join('\n\n') + (records.length ? '\n' : ''));
  const json = encoder.encode(JSON.stringify(document));
  const combinedBytes = txt.byteLength + json.byteLength;
  if (combinedBytes > maxCombinedBytes) throw new ToolError('OUTPUT_TOO_LARGE', { maxCombinedBytes });
  return { txt, json, combinedBytes, counts };
}
