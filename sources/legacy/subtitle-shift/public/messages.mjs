const zh = {
  idle: '貼上 SRT，選擇方向與秒數後平移。', edited: '草稿已變更，請重新平移以取得結果。', working: '正在平移整份字幕…', cancelled: '已取消本次處理，草稿保留。',
  success: count => `已平移 ${count} 列字幕。請檢查完整輸出後再下載。`,
  location: (line, cue) => `${cue === null ? '' : `第 ${cue} 列字幕。`}${line === null ? '' : `輸入第 ${line} 行。`}`,
  edge: edge => `索引 ${edge.indexRaw}：${edge.start} → ${edge.end}`,
  confirmClearTitle: '清除目前草稿？', confirmClearBody: '繼續會丟棄目前草稿與結果，並撤銷尚有效的下載連結。', confirmClearAction: '清除草稿',
  confirmLanguageTitle: '切換至 English？', confirmLanguageBody: '切換語言會丟棄目前草稿與結果；英文頁會從空白開始。', confirmLanguageAction: '切換至 English',
  errors: {
    ROOT_NOT_PLAIN_OBJECT: '無法讀取本次輸入。請重新提交。', SYMBOL_KEY: '輸入結構不支援。請重新提交。', UNKNOWN_FIELD: '輸入包含不支援的欄位。請重新提交。', MISSING_FIELD: '缺少必要欄位。請重新提交。', ACCESSOR_PROPERTY: '輸入結構不支援。請重新提交。', NON_ENUMERABLE_PROPERTY: '輸入結構不支援。請重新提交。',
    SRT_RAW_TYPE: '請貼上 SRT 文字。', RAW_CODE_UNITS_HIGH: '輸入超過 1,048,576 個 UTF-16 單位。請縮小整份字幕後重試。', NUL_NOT_ALLOWED: '輸入含有不支援的 NUL 字元。請在文字編輯器移除後重試。', UNPAIRED_SURROGATE: '輸入含有不完整的 Unicode 字元。請在文字編輯器修正後重試。', UTF8_BYTES_HIGH: '原始文字的 UTF-8 大小超過 1,048,576 bytes。請縮小字幕後重試。',
    DIRECTION_INVALID: '請選擇提前或延後。', SECONDS_TYPE: '請以文字輸入秒數。', SECONDS_FORMAT: '秒數需為 ASCII 數字，最多四位整數及三位小數，例如 1.25。不要加空格或正負號。', SECONDS_RANGE: '秒數必須介於 0 與 3,600，含端點。',
    NO_CUES: '沒有可處理的字幕。請貼上包含索引、時間行及文字的 SRT。', CUE_COUNT_HIGH: '字幕超過 2,000 列。請縮小字幕後重試。', INDEX_FORMAT: '索引行需為一至六個 ASCII 數字。請檢查索引與空白分隔行。', INDEX_RANGE: '字幕索引需為 1 至 999999。', INDEX_NOT_INCREASING: '索引數值必須依輸入順序嚴格遞增；可跳號。', TIMING_LINE_MISSING: '索引後缺少時間行。請加入起始與結束時間。', TIMING_FORMAT: '時間行需為 HH:MM:SS,mmm --> HH:MM:SS,mmm，箭頭兩側需有 ASCII 空格或 tab，不可附加設定或周圍空格。', TIMESTAMP_RANGE: '時間的分與秒需為 00 至 59，小時需為兩位 00 至 99。', CUE_START_NOT_BEFORE_END: '每列起始時間必須早於結束時間。', CUE_TEXT_MISSING: '時間行後需有至少一行字幕文字。', CUE_TEXT_LINES_HIGH: '每列字幕最多十行文字。請縮短該列後重試。', CUE_TEXT_LINE_TOO_LONG: '每行字幕最多 1,000 個 Unicode 字元。請縮短該行後重試。', MISSING_CUE_SEPARATOR: '疑似新字幕列之前缺少空白分隔行。「數字索引行後接時間行」不可當作字幕文字。', SHIFT_OUT_OF_BOUNDS: '平移後時間超出 00:00:00,000 至 99:59:59,999。整份未輸出，請減少秒數或改變方向。',
    WORKER_UNAVAILABLE: '此瀏覽器無法啟動字幕處理。草稿仍留在此頁；請使用支援的瀏覽器重試。', WORKER_FAILED: '此瀏覽器未能完成處理。草稿保留，沒有部分結果；可重新平移。', WORKER_INVALID: '未能取得有效處理結果。草稿保留，沒有部分結果；可重新平移。', WORKER_TIMEOUT: '本次計算已逾時。草稿保留，沒有部分結果；可縮小字幕後重試。', DOWNLOAD_CAPACITY: '尚有八個有效下載連結，未建立新下載。請稍後重試；舊連結各自於建立後 30 秒到期。', DOWNLOAD_FAILED: '未能建立下載。完整結果仍在此頁，請稍後重試。'
  }
};
const en = {
  idle: 'Paste SRT, choose a direction and amount, then shift.', edited: 'Draft changed. Shift again to create a current result.', working: 'Shifting the complete subtitle text…', cancelled: 'Processing cancelled. Your draft is preserved.',
  success: count => `Shifted ${count} cues. Review the complete output before downloading.`,
  location: (line, cue) => `${cue === null ? '' : `Cue ${cue}. `}${line === null ? '' : `Input line ${line}. `}`,
  edge: edge => `Index ${edge.indexRaw}: ${edge.start} → ${edge.end}`,
  confirmClearTitle: 'Clear this draft?', confirmClearBody: 'Continuing discards your draft and result, and revokes all active download links.', confirmClearAction: 'Clear draft',
  confirmLanguageTitle: 'Switch to 繁體中文?', confirmLanguageBody: 'Changing language discards your draft and result. The Traditional Chinese page starts empty.', confirmLanguageAction: 'Switch to 繁體中文',
  errors: {
    ROOT_NOT_PLAIN_OBJECT: 'The input could not be read. Submit again.', SYMBOL_KEY: 'The input structure is unsupported. Submit again.', UNKNOWN_FIELD: 'The input has an unsupported field. Submit again.', MISSING_FIELD: 'A required field is missing. Submit again.', ACCESSOR_PROPERTY: 'The input structure is unsupported. Submit again.', NON_ENUMERABLE_PROPERTY: 'The input structure is unsupported. Submit again.',
    SRT_RAW_TYPE: 'Paste SRT text.', RAW_CODE_UNITS_HIGH: 'Input exceeds 1,048,576 UTF-16 units. Reduce the subtitle text and try again.', NUL_NOT_ALLOWED: 'The input contains an unsupported NUL character. Remove it in a text editor and try again.', UNPAIRED_SURROGATE: 'The input has an incomplete Unicode character. Repair it in a text editor and try again.', UTF8_BYTES_HIGH: 'Raw UTF-8 text exceeds 1,048,576 bytes. Reduce the subtitle text and try again.',
    DIRECTION_INVALID: 'Choose earlier or later.', SECONDS_TYPE: 'Enter seconds as text.', SECONDS_FORMAT: 'Use ASCII digits, up to four integer digits and three decimal places, such as 1.25. Omit spaces and signs.', SECONDS_RANGE: 'Seconds must be between 0 and 3,600, inclusive.',
    NO_CUES: 'No subtitle cues found. Paste SRT with an index, timing line and text.', CUE_COUNT_HIGH: 'There are more than 2,000 cues. Reduce the subtitle text and try again.', INDEX_FORMAT: 'An index must contain one to six ASCII digits. Check indexes and blank separators.', INDEX_RANGE: 'Cue indexes must be from 1 to 999999.', INDEX_NOT_INCREASING: 'Index values must strictly increase in input order. Gaps are allowed.', TIMING_LINE_MISSING: 'A timing line is missing after the index. Add start and end times.', TIMING_FORMAT: 'Use HH:MM:SS,mmm --> HH:MM:SS,mmm with ASCII spaces or tabs around the arrow. Omit settings and surrounding spaces.', TIMESTAMP_RANGE: 'Minutes and seconds must be 00 to 59; hours must be two digits, 00 to 99.', CUE_START_NOT_BEFORE_END: 'Each start time must be earlier than its end time.', CUE_TEXT_MISSING: 'At least one subtitle text line must follow the timing line.', CUE_TEXT_LINES_HIGH: 'Each cue can have up to ten text lines. Shorten this cue and try again.', CUE_TEXT_LINE_TOO_LONG: 'Each text line can have up to 1,000 Unicode characters. Shorten this line and try again.', MISSING_CUE_SEPARATOR: 'A possible new cue is missing a blank separator. A numeric index followed by a timing line is not supported as subtitle text.', SHIFT_OUT_OF_BOUNDS: 'Shifted time is outside 00:00:00,000 to 99:59:59,999. The entire result was rejected. Reduce the amount or change direction.',
    WORKER_UNAVAILABLE: 'This browser cannot start subtitle processing. Your draft remains on this page. Try a supported browser.', WORKER_FAILED: 'This browser could not complete processing. Your draft is preserved, with no partial result. Try shifting again.', WORKER_INVALID: 'A valid result could not be obtained. Your draft is preserved, with no partial result. Try shifting again.', WORKER_TIMEOUT: 'Processing timed out. Your draft is preserved, with no partial result. Reduce the subtitle text and try again.', DOWNLOAD_CAPACITY: 'Eight download links are still active. No new download was created. Try again later; each old link expires 30 seconds after creation.', DOWNLOAD_FAILED: 'A download could not be created. Your complete result remains on this page. Try again later.'
  }
};
export const messages = Object.freeze({ 'zh-Hant': zh, en });
export function describeError(locale, error) {
  const copy = messages[locale];
  return copy.location(error.line ?? null, error.cueIndex ?? null) + (copy.errors[error.code] ?? copy.errors.WORKER_FAILED);
}
