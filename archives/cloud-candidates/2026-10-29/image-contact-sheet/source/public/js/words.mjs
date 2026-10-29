// 完整雙語訊息；錯誤碼不直接呈現給一般使用者。
export const words = {
  'zh-Hant': {
    idle: '加入 JPEG 或 PNG，先排好順序，再建立總覽。', ready: n => `${n} 張圖片已就緒；可調整順序與版面。`,
    reading: (n,t) => `檢查格式與尺寸 ${n} / ${t}；圖片不會上傳。`, decoding: (n,t) => `建立縮圖 ${n} / ${t}；每次處理一張。`,
    generating: '正在建立 PNG 與完整檔名索引…', success: (n,w,h) => `已建立 ${n} 張總覽，${w} × ${h} px。下載 PNG 與檔名索引後即可保存。`,
    stale: '版面或順序已變更；舊結果已清除，請重新建立。', cancelled: '已取消，沒有新增圖片或輸出。', cancelling: '正在停止；等待目前的瀏覽器作業完成後清理。',
    cleared: '已清除圖片與結果。已下載的檔案不受影響。', up: '上移', down: '下移', remove: '移除', item: '圖片',
    moved: n => `已移至第 ${n} 張。`, removed: n => `已移除；剩下 ${n} 張。`, empty: '尚未建立總覽', layout: (w,h) => `預計 ${w} × ${h} px`,
    shortened: 'PNG 標籤可能截短；完整原始檔名在文字索引，控制字元以 JSON 跳脫表示。',
    errors: { DECODER_BUSY: '上一張原生解碼尚未結束；請稍後重試，若持續未完成可重新整理頁面。', DECODE_TIMEOUT: '圖片解碼超過 30 秒，未加入本次圖片；原生作業可能尚未結束。請換較小圖片或重新整理頁面。', COUNT: '每批至少 1 張，合計最多 30 張；請減少選取數量。', FILE_SIZE: '圖片不可為空檔，單檔最多 8 MiB（8,388,608 bytes）。', TOTAL_SIZE: '圖片合計最多 64 MiB（67,108,864 bytes）；請減少數量。', NAME: '檔名過長，請先縮短檔名。', FORMAT: '有圖片不是支援的完整 PNG 或 8-bit JPEG；本次新增未保留。請換成一般 PNG/JPEG。', ANIMATION: '不支援動態 PNG；請先另存靜態圖片。', DIMENSIONS: '單張最多 16 百萬像素、單邊 8192 px；請先縮小來源圖。', SETTINGS: '請檢查欄數、縮圖、間距與邊距的整數範圍。', OUTPUT_SIZE: '總覽超過 16 百萬像素或單邊 8192 px；請增加欄數或縮小縮圖。', DECODE: '瀏覽器無法解碼圖片；本次新增未保留。請換成一般 PNG/JPEG 或減少圖片。', ORIENTATION: '瀏覽器解碼尺寸與圖片方向資料不符，未保留本次新增。', MEMORY: '瀏覽器無法建立圖片；請減少圖片或縮小縮圖後重試。', UNSUPPORTED: '此瀏覽器缺少必要圖片功能；請改用支援 ImageBitmap 與 Canvas 的現代瀏覽器。', ENCODE: 'PNG 編碼失敗或超過限制；未提供下載，請減少圖片或縮小縮圖。' }
  },
  en: {
    idle: 'Add JPEG or PNG images, arrange them, then build your overview.', ready: n => `${n} images ready. Adjust the order and layout.`,
    reading: (n,t) => `Checking format and dimensions ${n} / ${t}. Images stay local.`, decoding: (n,t) => `Making thumbnail ${n} / ${t}. Processing one image at a time.`,
    generating: 'Building the PNG and full-filename index…', success: (n,w,h) => `Built ${n} images at ${w} × ${h} px. Download the PNG and filename index to keep them.`,
    stale: 'Layout or order changed. The old result was cleared; build it again.', cancelled: 'Cancelled. No images or output were added.', cancelling: 'Stopping. Waiting for the current browser operation to finish before cleanup.',
    cleared: 'Images and results cleared. Downloaded files are unchanged.', up: 'Move up', down: 'Move down', remove: 'Remove', item: 'Image',
    moved: n => `Moved to position ${n}.`, removed: n => `Removed. ${n} images remain.`, empty: 'No overview built yet', layout: (w,h) => `Estimated ${w} × ${h} px`,
    shortened: 'PNG labels may be shortened. The text index has complete original filenames, with control characters escaped as JSON.',
    errors: { DECODER_BUSY: 'The previous native decode is still running. Try again shortly, or reload the page if it does not finish.', DECODE_TIMEOUT: 'Image decoding exceeded 30 seconds. This batch was not added; native work may still be running. Try smaller images or reload the page.', COUNT: 'Choose at least 1 image, with no more than 30 in total.', FILE_SIZE: 'Images must be nonempty and no larger than 8 MiB (8,388,608 bytes) each.', TOTAL_SIZE: 'Images must total no more than 64 MiB (67,108,864 bytes). Remove some images.', NAME: 'A filename is too long. Shorten it first.', FORMAT: 'An image is not a supported complete PNG or 8-bit JPEG. This batch was not added. Try a standard PNG/JPEG.', ANIMATION: 'Animated PNG is unsupported. Save a static image first.', DIMENSIONS: 'Each image is limited to 16 million pixels and 8192 px per edge. Resize it first.', SETTINGS: 'Check the integer ranges for columns, thumbnail size, spacing and margin.', OUTPUT_SIZE: 'The overview exceeds 16 million pixels or 8192 px per edge. Use more columns or smaller thumbnails.', DECODE: 'The browser could not decode an image. This batch was not added. Try standard PNG/JPEG files or fewer images.', ORIENTATION: 'Decoded dimensions do not match image orientation metadata. This batch was not added.', MEMORY: 'The browser could not create the image. Try fewer images or smaller thumbnails.', UNSUPPORTED: 'Required image features are unavailable. Use a modern browser with ImageBitmap and Canvas support.', ENCODE: 'PNG encoding failed or exceeded the limit. No download is available. Try fewer images or smaller thumbnails.' }
  }
};
