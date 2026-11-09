const zh = {
  name: '物品名稱', quantity: '數量', weight: '單件重量（g）', packed: '已打包', remove: '刪除',
  fallback: n => `物品 ${n}`, unknown: '未知重量', known: '已填重量',
  empty: '還沒有物品。新增第一項，開始整理清單。', filterEmpty: '目前沒有未打包的物品。',
  added: '已新增物品。重量留白代表尚未量重。', deleted: '已刪除物品。',
  maxRows: '最多 100 列；請刪除一列後再新增。', rowCount: '清單列數', pieceCount: '物品件數',
  packedRows: '已打包列數', packedPieces: '已打包件數', total: '總重量', subtotal: '已知重量小計',
  emptySummary: '加入物品後，這裡會顯示打包進度與重量。',
  invalidSummary: '請修正欄位錯誤後再查看摘要或下載備份。清單尚未計算。',
  progress: (packed, rows, percent) => `${packed} / ${rows} 列已打包（${percent}%）`,
  unknownDetail: (rows, pieces) => `尚有 ${rows} 列（${pieces} 件）未填重量；目前只顯示已知重量小計。`,
  notSet: '尚未設定重量上限。', within: limit => `未超過你設定的 ${limit} g 上限。`,
  over: value => `總重量比你設定的上限多 ${value} g。`,
  minimumOver: value => `已知重量小計已超過上限至少 ${value} g；尚有未知重量，完整總重及實際超出量未知。`,
  uncertain: (rows, limit) => `有 ${rows} 列重量未知，因此目前無法判斷是否超過你設定的 ${limit} g。`,
  previewHeading: '檢查備份，確認後才取代',
  previewCount: (rows, pieces) => `備份包含 ${rows} 列、${pieces} 件；取代目前清單前請確認。`,
  previewEmpty: '備份是空清單；確認後會清空目前資料。',
  reading: '正在讀取本機備份…目前清單保持不變。', importCancelled: '已取消匯入，目前清單保持不變。',
  importInvalidated: '清單已變更；匯入預覽或讀取已取消。請重新選擇備份。',
  imported: '已以備份取代目前清單。', importFailure: '無法使用這份備份。請選擇 GlossQuote 行李清單匯出的有效 JSON 檔。',
  downloaded: '已交由瀏覽器下載備份。保存位置由瀏覽器決定。', downloadError: '無法產生下載，請再試一次。',
  exampleTitle: '以週末旅行範例取代清單？', exampleBody: '目前清單與重量上限會被取代。範例含衣物與充電器，共 800 g。',
  exampleConfirm: '載入範例並取代', exampleLoaded: '已載入週末旅行範例（示例資料，800 g）。',
  resetTitle: '清空目前清單？', resetBody: '所有物品、重量上限與匯入預覽都會清除。要保留請先下載備份。',
  resetConfirm: '清空清單', resetDone: '已清空清單。', cancel: '取消', cancelled: '已取消，目前清單保持不變。',
  errors: {
    INVALID_BYTES: '無法讀取檔案。', INPUT_TOO_LONG: '輸入最多 32 個字元，請縮短完整內容。',
    INTEGER_REQUIRED: '請輸入半形整數，不含符號、小數或逗號。',
    OUT_OF_RANGE: '數值超出範圍。', INVALID_NAME: '名稱最多 80 個 UTF-16 字元單位。',
    CONTROL_CHARACTER: '名稱不可含控制字元。', ROW_LIMIT: '清單最多 100 列。',
    DUPLICATE_ID: '物品識別碼重複。', INVALID_SCHEMA: '備份格式不符。', UNKNOWN_FIELD: '備份含不支援的欄位。',
    INVALID_UTF8: '備份必須是 UTF-8 文字。', FILE_TOO_LARGE: '備份不可超過 128 KiB。',
    INVALID_JSON: '備份不是有效 JSON。', INVALID_ROW: '物品欄位格式不符。', INVALID_LIMIT: '重量上限格式或範圍不符。'
  },
  ranges: { quantityRaw: '數量須為 1–99。', unitWeightGramsRaw: '單件重量須為 0–99,999 g，或留白表示未知。', limitGramsRaw: '上限須為 1–999,999,999 g，或留白。' }
};
const plural = (value, noun) => `${value} ${value === '1' ? noun : `${noun}s`}`;
const en = {
  name: 'Item name', quantity: 'Quantity', weight: 'Unit weight (g)', packed: 'Packed', remove: 'Delete',
  fallback: n => `Item ${n}`, unknown: 'Unknown weight', known: 'Weight entered',
  empty: 'No items yet. Add your first item to start a list.', filterEmpty: 'There are no unpacked items.',
  added: 'Item added. A blank weight means it has not been weighed yet.', deleted: 'Item deleted.',
  maxRows: 'The limit is 100 rows. Delete a row to add another.', rowCount: 'List rows', pieceCount: 'Item pieces',
  packedRows: 'Packed rows', packedPieces: 'Packed pieces', total: 'Total weight', subtotal: 'Known weight subtotal',
  emptySummary: 'Add an item to see packing progress and weight here.',
  invalidSummary: 'Fix the field error to see a summary or download a backup. The list has not been calculated.',
  progress: (packed, rows, percent) => `${packed} / ${rows} rows packed (${percent}%)`,
  unknownDetail: (rows, pieces) => `${plural(rows, 'row')} (${plural(pieces, 'piece')}) ${rows === '1' ? 'has' : 'have'} no weight. Only the known weight subtotal is shown.`,
  notSet: 'No weight limit set.', within: limit => `Within your ${limit} g limit.`,
  over: value => `Total weight exceeds your limit by ${value} g.`,
  minimumOver: value => `Known weight is at least ${value} g over your limit. Some weights are unknown, so the complete total and actual excess are unknown.`,
  uncertain: (rows, limit) => `${plural(rows, 'row')} ${rows === '1' ? 'has' : 'have'} unknown weight. It is not yet possible to tell whether the list exceeds your ${limit} g limit.`,
  previewHeading: 'Review the backup before replacing',
  previewCount: (rows, pieces) => `The backup contains ${plural(rows, 'row')}, ${plural(pieces, 'piece')}. Confirm before replacing your current list.`,
  previewEmpty: 'The backup is empty. Confirming will clear the current list.',
  reading: 'Reading the local backup…your current list is unchanged.', importCancelled: 'Import cancelled. Your current list is unchanged.',
  importInvalidated: 'The list changed. The import preview or reading was cancelled. Select the backup again.',
  imported: 'The backup has replaced your current list.', importFailure: 'This backup cannot be used. Select a valid JSON file exported by GlossQuote Packing List.',
  downloaded: 'The backup was passed to your browser for download. Your browser chooses where to save it.', downloadError: 'The download could not be created. Try again.',
  exampleTitle: 'Replace the list with a weekend example?', exampleBody: 'This replaces the current list and weight limit. The example contains clothes and a charger, totaling 800 g.',
  exampleConfirm: 'Load example and replace', exampleLoaded: 'Weekend example loaded (sample data, 800 g).',
  resetTitle: 'Clear the current list?', resetBody: 'This clears all items, the weight limit, and any import preview. Download a backup first if you want to keep them.',
  resetConfirm: 'Clear list', resetDone: 'List cleared.', cancel: 'Cancel', cancelled: 'Cancelled. Your current list is unchanged.',
  errors: {
    INVALID_BYTES: 'The file could not be read.', INPUT_TOO_LONG: 'Enter no more than 32 characters. Shorten the complete input.',
    INTEGER_REQUIRED: 'Enter an ASCII whole number without signs, decimals, or commas.',
    OUT_OF_RANGE: 'The number is outside the allowed range.', INVALID_NAME: 'Names must be at most 80 UTF-16 code units.',
    CONTROL_CHARACTER: 'Names cannot contain control characters.', ROW_LIMIT: 'A list can contain at most 100 rows.',
    DUPLICATE_ID: 'Item identifiers must be unique.', INVALID_SCHEMA: 'The backup format is not supported.', UNKNOWN_FIELD: 'The backup has unsupported fields.',
    INVALID_UTF8: 'The backup must be UTF-8 text.', FILE_TOO_LARGE: 'The backup must be at most 128 KiB.',
    INVALID_JSON: 'The backup is not valid JSON.', INVALID_ROW: 'The item fields are not valid.', INVALID_LIMIT: 'The weight limit format or range is not valid.'
  },
  ranges: { quantityRaw: 'Quantity must be 1–99.', unitWeightGramsRaw: 'Unit weight must be 0–99,999 g, or blank for unknown.', limitGramsRaw: 'The limit must be 1–999,999,999 g, or blank.' }
};
export const translations = { 'zh-Hant': zh, en };
export function createI18n(language) {
  const format = new Intl.NumberFormat(language === 'en' ? 'en-US' : 'zh-TW', { maximumFractionDigits: 0 });
  const copy = translations[language];
  return { copy, number: value => format.format(value),
    error: (code, field) => code === 'OUT_OF_RANGE' && copy.ranges[field] ? copy.ranges[field] : copy.errors[code] };
}
