// 動態雙語只含固定文案；不把原始例外拼入錯誤。
export const messages = Object.freeze({
  'zh-Hant': Object.freeze({
    ready: '貼上 CSV，再開始練習。', dirty: '輸入已變更；舊練習已清除，請重新開始。',
    sample: '已載入三張示範卡；尚未開始練習。', started: '練習已開始。先想答案，再顯示答案並自評。',
    shown: '答案已顯示，現在可自評。', moved: '已切換卡片；答案先隱藏。', rated: '已更新這張卡的自評。',
    downloaded: '已要求瀏覽器下載；請檢查瀏覽器的下載結果。', cleared: '本頁資料已清除。已下載的檔案不受影響。',
    start: '開始練習', restart: '重新開始（重設自評）', unreviewed: '尚未自評', again: '需要再練習', remembered: '已想起',
    position: (position, count, id) => `第 ${position} / ${count} 張 · 來源卡 #${id}`,
    summary: (total, remembered, again) => `${total} 張卡 · 已想起 ${remembered} · 再練習 ${again} · 尚未自評 ${total - remembered - again}`,
    currentRating: rating => `目前自評：${rating}`, record: value => ` CSV 第 ${value} 筆記錄。`,
    sampleCSV: 'question,answer\n法國首都是哪裡？,巴黎\n"逗號、引號如何寫？","逗號用引號包住；引號寫成兩個 ""。"\n"兩行範例\n第二行",換行也可以放在引號內',
    errors: Object.freeze({ SCHEMA: '資料結構無效，請重新開始。', TOO_LARGE: '原始輸入超過 200,000 UTF-16 單位或 262,144 UTF-8 bytes；請縮小整份內容。', UNICODE: '文字含未配對的 Unicode surrogate，請重新貼上完整字元。', UNSUPPORTED: '瀏覽器缺少必要的本機處理能力，輸入未送出。', HEADER: '第一筆必須是兩欄標頭 question,answer；大小寫與空白須完全相同。', CARD_COUNT: '標頭後需要 1 至 200 張卡，不接受額外空白記錄。', COLUMNS: '每筆 CSV 必須剛好兩欄；不接受空白記錄。', CSV: 'CSV 引號格式不正確；雙引號內的引號請寫兩次。', FACE: '每面須有非空白內容、最多 2,000 Unicode 碼點；除 Tab 與換行外不可含 C0/C1 控制碼。', RANDOM: '無法取得可用亂數；舊練習已清除。可重試或取消洗牌，沒有改用其他亂數來源。', DOWNLOAD: '無法建立下載；練習仍保留。可選取可列印文字自行保存。', DOWNLOAD_LIMIT: '已有 4 個暫存下載，請等候最長 60 秒後再試。', DIALOG: '此瀏覽器無法開啟清除確認；資料未刪除。' })
  }),
  en: Object.freeze({
    ready: 'Paste CSV, then start practicing.', dirty: 'Inputs changed. The previous practice was cleared; start again.',
    sample: 'Three sample cards loaded. Practice has not started.', started: 'Practice started. Recall the answer, then reveal it and rate yourself.',
    shown: 'Answer revealed. You can now rate your recall.', moved: 'Card changed; the answer is hidden.', rated: 'This card’s rating was updated.',
    downloaded: 'Download requested. Check your browser’s download result.', cleared: 'This page was cleared. Downloaded files are not affected.',
    start: 'Start practice', restart: 'Restart (reset ratings)', unreviewed: 'Not rated', again: 'Practice again', remembered: 'Remembered',
    position: (position, count, id) => `Card ${position} / ${count} · source #${id}`,
    summary: (total, remembered, again) => `${total} cards · remembered ${remembered} · again ${again} · not rated ${total - remembered - again}`,
    currentRating: rating => `Current rating: ${rating}`, record: value => ` CSV record ${value}.`,
    sampleCSV: 'question,answer\nWhat is the capital of France?,Paris\n"How do commas and quotes work?","Quote commas and double each "" inside a quoted field."\n"Two-line example\nSecond line",Newlines can appear inside quoted fields',
    errors: Object.freeze({ SCHEMA: 'The data structure is invalid. Start again.', TOO_LARGE: 'Raw input exceeds 200,000 UTF-16 units or 262,144 UTF-8 bytes. Reduce the entire input.', UNICODE: 'The text contains an unpaired Unicode surrogate. Paste complete characters again.', UNSUPPORTED: 'This browser lacks a required local capability. No input was sent.', HEADER: 'The first record must contain exactly question,answer, with matching case and no extra spaces.', CARD_COUNT: 'Provide 1 to 200 cards after the header. Extra blank records are not accepted.', COLUMNS: 'Every CSV record must have exactly two fields. Blank records are not accepted.', CSV: 'CSV quoting is invalid. Double each quote inside a quoted field.', FACE: 'Each face must contain non-whitespace text and at most 2,000 Unicode code points. C0/C1 controls other than Tab and line feed are not allowed.', RANDOM: 'Random values are unavailable; the previous practice was cleared. Retry or turn off shuffle. No fallback randomness was used.', DOWNLOAD: 'The download could not be created. Practice is retained; you can select and save the printable text.', DOWNLOAD_LIMIT: 'Four download URLs are still active. Wait up to 60 seconds and try again.', DIALOG: 'This browser could not open the clear confirmation. Nothing was deleted.' })
  })
});
