const number = locale => new Intl.NumberFormat(locale).format;
const zh = number('zh-Hant');
const en = number('en');

export const WORDING = {
  'zh-Hant': {
    count: n => `${zh(n)} 項`,
    inputCount: (units, lines) => `${zh(units)} / 100,000 字元（UTF-16） · ${zh(lines)} 行`,
    waiting: '比對後顯示結果。', empty: '沒有符合項目', nothing: '沒有項目可複製',
    ready: '可複製此區完整清單。', pending: '正在複製…', copied: '已複製此區完整清單。',
    fallback: '無法使用剪貼簿。請選取下方唯讀文字，再手動複製。',
    source: item => `${item.source} 第 ${zh(item.firstLine)} 行 · 出現 ${zh(item.occurrences)} 次`,
    sharedSource: item => `A 第 ${zh(item.aFirstLine)} 行（${zh(item.aOccurrences)} 次） / B 第 ${zh(item.bFirstLine)} 行（${zh(item.bOccurrences)} 次）`,
    summary: s => `比對完成：只在 A ${zh(s.aOnlyCount)} 項，只在 B ${zh(s.bOnlyCount)} 項，共同 ${zh(s.intersectionCount)} 項，合併 ${zh(s.mergedCount)} 項。`,
    location: error => `名單 ${error.side}${error.line === null ? '' : `，第 ${zh(error.line)} 行`}：`,
    errors: {
      INVALID_REQUEST: '無法讀取比對規則，請清除後再試。',
      INPUT_TOO_LONG: '超過 100,000 個 UTF-16 字元。請縮短名單後再比對。',
      TOO_MANY_ITEMS: '超過 5,000 筆非空項目。請減少項目後再比對。',
      ITEM_TOO_LONG: '超過每筆 200 個 Unicode 字碼的上限。請縮短這一行。',
      CONTROL_CHARACTER: '含不支援的控制字元。請移除控制字元後再比對。'
    }
  },
  en: {
    count: n => `${en(n)} ${n === 1 ? 'item' : 'items'}`,
    inputCount: (units, lines) => `${en(units)} / 100,000 characters (UTF-16) · ${en(lines)} ${lines === 1 ? 'line' : 'lines'}`,
    waiting: 'Results appear after comparison.', empty: 'No matching items', nothing: 'No items to copy',
    ready: 'Copy the entire list in this section.', pending: 'Copying…', copied: 'Copied the entire list in this section.',
    fallback: 'Clipboard unavailable. Select the read-only text below, then copy it manually.',
    source: item => `${item.source} line ${en(item.firstLine)} · ${en(item.occurrences)} ${item.occurrences === 1 ? 'occurrence' : 'occurrences'}`,
    sharedSource: item => `A line ${en(item.aFirstLine)} (${en(item.aOccurrences)}) / B line ${en(item.bFirstLine)} (${en(item.bOccurrences)})`,
    summary: s => `Comparison ready: ${en(s.aOnlyCount)} only in A, ${en(s.bOnlyCount)} only in B, ${en(s.intersectionCount)} shared, ${en(s.mergedCount)} merged.`,
    location: error => `List ${error.side}${error.line === null ? '' : `, line ${en(error.line)}`}: `,
    errors: {
      INVALID_REQUEST: 'The comparison rules could not be read. Clear the lists and try again.',
      INPUT_TOO_LONG: 'Over 100,000 UTF-16 characters. Shorten this list, then compare again.',
      TOO_MANY_ITEMS: 'Over 5,000 non-empty items. Remove some items, then compare again.',
      ITEM_TOO_LONG: 'Over the limit of 200 Unicode code points per item. Shorten this line.',
      CONTROL_CHARACTER: 'Contains an unsupported control character. Remove it, then compare again.'
    }
  }
};
