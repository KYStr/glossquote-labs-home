const zh = {
  idle: '貼上文字並選擇上限，再按分段。',
  changed: '文字或設定已變更，舊片段已清除。按「分段」產生新片段。',
  composing: '正在輸入文字；完成組字後再按分段。',
  success: n => `已分成 ${n} 段。逐段核對後複製。`,
  sourceCount: (cp, units) => `${cp} code points；${units} UTF-16 code units`,
  rawCount: units => `${units} UTF-16 code units / 100,000 上限`,
  resultCount: (cp, n) => `來源 ${cp} code points，共 ${n} 段。`,
  chunk: n => `第 ${n} 段`, copy: n => `複製第 ${n} 段`,
  count: n => `${n} code points`,
  busy: n => `正在複製第 ${n} 段；請等待瀏覽器回應。編輯暫時鎖定。`,
  copied: n => `第 ${n} 段已複製。`,
  fallback: n => `瀏覽器未允許自動複製；第 ${n} 段文字已選取，請使用複製指令。`,
  page: (from, to, total) => `顯示第 ${from}–${to} 段，共 ${total} 段`,
  pageOption: (page, from, to) => `第 ${page} 頁：${from}–${to} 段`,
  errors: {
    INVALID_REQUEST: '無法處理這次設定，請重新輸入並分段。',
    INVALID_SOURCE: '請在文字欄輸入文字。',
    SOURCE_EMPTY: '請先貼入文字。',
    SOURCE_TOO_LONG: '文字超過 100,000 UTF-16 code units；未產生部分結果。',
    INVALID_UNICODE: '文字含不完整的 Unicode 字元；請修正或重新貼入文字。',
    INPUT_TOO_LONG: '上限欄超過 32 個字元，請輸入 1–10,000 的整數。',
    INTEGER_REQUIRED: '請用半形數字輸入 1–10,000 的整數；不接受符號、小數或指數。',
    OUT_OF_RANGE: '每段上限必須是 1–10,000 的整數。',
    INVALID_MODE: '請選擇「依上限直接切」或「優先在換行處切」。',
    CHUNK_LIMIT_EXCEEDED: '會超過 1,000 段，沒有輸出部分結果。請提高每段上限或縮短文字。'
  }
};
const en = {
  idle: 'Paste text, choose a limit, then press Split text.',
  changed: 'Text or settings changed. Previous chunks were cleared. Press Split text to create new chunks.',
  composing: 'Text entry is in progress. Finish composing, then press Split text.',
  success: n => `Split into ${n} ${n === '1' ? 'chunk' : 'chunks'}. Review each chunk before copying.`,
  sourceCount: (cp, units) => `${cp} code points; ${units} UTF-16 code units`,
  rawCount: units => `${units} UTF-16 code units / 100,000 maximum`,
  resultCount: (cp, n) => `Source: ${cp} code points. ${n} ${n === '1' ? 'chunk' : 'chunks'} in total.`,
  chunk: n => `Chunk ${n}`, copy: n => `Copy chunk ${n}`,
  count: n => `${n} code points`,
  busy: n => `Copying chunk ${n}. Waiting for the browser; editing is temporarily locked.`,
  copied: n => `Chunk ${n} copied.`,
  fallback: n => `The browser did not allow automatic copying. Chunk ${n} is selected; use your copy command.`,
  page: (from, to, total) => `Showing chunks ${from}–${to} of ${total}`,
  pageOption: (page, from, to) => `Page ${page}: chunks ${from}–${to}`,
  errors: {
    INVALID_REQUEST: 'These settings could not be processed. Enter them again and split the text.',
    INVALID_SOURCE: 'Enter text in the text field.',
    SOURCE_EMPTY: 'Paste some text first.',
    SOURCE_TOO_LONG: 'Text exceeds 100,000 UTF-16 code units. No partial results were produced.',
    INVALID_UNICODE: 'Text contains an incomplete Unicode character. Correct it or paste the text again.',
    INPUT_TOO_LONG: 'The limit field exceeds 32 characters. Enter an integer from 1 to 10,000.',
    INTEGER_REQUIRED: 'Use ASCII digits for an integer from 1 to 10,000; signs, decimals and exponents are not accepted.',
    OUT_OF_RANGE: 'The per-chunk limit must be an integer from 1 to 10,000.',
    INVALID_MODE: 'Choose Strict limit or Prefer line breaks.',
    CHUNK_LIMIT_EXCEEDED: 'This would exceed 1,000 chunks. No partial results were produced. Raise the limit or shorten the text.'
  }
};
export const messages = { 'zh-Hant': zh, en };
