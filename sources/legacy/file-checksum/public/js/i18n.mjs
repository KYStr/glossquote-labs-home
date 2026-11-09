const zh = {
  phases: { idle: '選擇檔案，最多 128 MiB。', ready: '已選檔，按「計算 SHA-256」開始。', reading: '正在讀取檔案…', hashing: '正在計算 SHA-256…', done: 'SHA-256 計算完成。', cancelled: '已取消，可重新計算。' },
  comparisons: { pending: '待計算', 'not-provided': '未提供預期校驗碼', invalid: '預期校驗碼格式錯誤', match: '✓ 校驗碼相符', mismatch: '! 校驗碼不符' },
  output: { idle: '', 'copy-pending': '正在複製…', copied: '已複製 64 位校驗碼。', 'copy-denied': '無法存取剪貼簿。校驗碼已選取，請手動複製。', 'download-requested': '已請求下載 glossquote-sha256.txt。', 'download-failed': '無法請求下載。請再試一次，或複製校驗碼。' },
  errors: {
    FILE_REQUIRED: '請先選擇檔案。', SIZE_INVALID: '無法確認檔案大小，請重新選擇檔案。', SIZE_LIMIT: '檔案超過 128 MiB（134,217,728 bytes），請選擇較小的檔案。',
    EXPECTED_LENGTH: '預期碼超過 256 個字元。請只貼上 64 位 SHA-256，輸入不會被截短。', EXPECTED_FORMAT: '請只貼上 64 位十六進位 SHA-256，不含前綴、檔名或內部空白。',
    HASH_FORMAT: '校驗碼結果無效，請重新計算。', HASH_LENGTH: '校驗碼結果不完整，請重新計算。',
    UNSUPPORTED_ENVIRONMENT: '此環境不支援所需功能。請使用支援 Web Crypto 與 Worker 的安全瀏覽器頁面。',
    WORKER_START_FAILED: '無法開始計算工作，請再試一次。', WORKER_PROTOCOL: '計算工作的通訊資料無效，請重新計算或重新載入頁面。',
    WORKER_FAILED: '計算工作失敗，請再試一次。', WORKER_MESSAGE_FAILED: '無法接收計算結果，請再試一次。',
    READ_FAILED: '無法讀取檔案，請重新選擇檔案。', READ_SIZE_MISMATCH: '檔案讀取不完整，請重新選擇檔案。',
    HASH_FAILED: '無法計算 SHA-256，請再試一次。', TIMEOUT: '計算超過 60 秒，工作已停止。請重試或選擇較小的檔案。',
  },
  size: (bytes, mib) => `${bytes} bytes（${mib} MiB）`,
};
const en = {
  phases: { idle: 'Choose a file, up to 128 MiB.', ready: 'File selected. Choose Calculate SHA-256 to begin.', reading: 'Reading file…', hashing: 'Calculating SHA-256…', done: 'SHA-256 calculation complete.', cancelled: 'Cancelled. You can calculate again.' },
  comparisons: { pending: 'Awaiting calculation', 'not-provided': 'No expected checksum', invalid: 'Invalid expected checksum', match: '✓ Checksums match', mismatch: '! Checksums do not match' },
  output: { idle: '', 'copy-pending': 'Copying…', copied: 'Copied the 64-character checksum.', 'copy-denied': 'Clipboard access failed. The checksum is selected; copy it manually.', 'download-requested': 'Requested download of glossquote-sha256.txt.', 'download-failed': 'Could not request the download. Try again or copy the checksum.' },
  errors: {
    FILE_REQUIRED: 'Choose a file first.', SIZE_INVALID: 'Could not confirm the file size. Choose the file again.', SIZE_LIMIT: 'This file exceeds 128 MiB (134,217,728 bytes). Choose a smaller file.',
    EXPECTED_LENGTH: 'The expected checksum exceeds 256 characters. Paste only the 64-character SHA-256; your input is not truncated.', EXPECTED_FORMAT: 'Paste only a 64-character hexadecimal SHA-256, without a prefix, filename, or internal spaces.',
    HASH_FORMAT: 'The checksum result is invalid. Calculate again.', HASH_LENGTH: 'The checksum result is incomplete. Calculate again.',
    UNSUPPORTED_ENVIRONMENT: 'This environment lacks the required features. Use a secure browser page that supports Web Crypto and Worker.',
    WORKER_START_FAILED: 'Could not start the calculation. Try again.', WORKER_PROTOCOL: 'The calculation returned invalid communication data. Calculate again or reload the page.',
    WORKER_FAILED: 'The calculation failed. Try again.', WORKER_MESSAGE_FAILED: 'Could not receive the calculation result. Try again.',
    READ_FAILED: 'Could not read the file. Choose the file again.', READ_SIZE_MISMATCH: 'The file was not read completely. Choose the file again.',
    HASH_FAILED: 'Could not calculate SHA-256. Try again.', TIMEOUT: 'The calculation exceeded 60 seconds and was stopped. Retry or choose a smaller file.',
  },
  size: (bytes, mib) => `${bytes} bytes (${mib} MiB)`,
};
export const LOCALES = Object.freeze({ 'zh-Hant': Object.freeze(zh), en: Object.freeze(en) });
export function getLocale(language) { return LOCALES[language === 'en' ? 'en' : 'zh-Hant']; }
