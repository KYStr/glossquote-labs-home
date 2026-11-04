// 全部使用者可見字串集中管理，兩種語言保有相同欄位。
export const locales = {
  'zh-Hant': {
    title: '兩張圖片疊合校稿', description: '在瀏覽器內疊合兩張相同尺寸圖片，調整透明度並查看像素差異。圖片不上傳。',
    eyebrow: 'GLOSSQUOTE LABS · 候選工具', intro: '把修改前與修改後放在一起，讓細微改動浮現。',
    privacy: '圖片只在此瀏覽器處理，不會上傳或儲存。', home: '回到工具首頁', switch: 'English',
    choose: '01 / 選擇兩個版本', before: 'A · 修改前', after: 'B · 修改後', empty: '尚未選取圖片',
    limits: '每張接受靜態 PNG 或 JPEG，最多 10 MiB、4 百萬像素，單邊不超過 4096 px。方向處理後的寬與高必須相同；不會自動縮放。',
    adjust: '02 / 設定校稿方式', mode: '顯示模式', overlay: '透明疊合', difference: '絕對差異', opacity: 'B 圖透明疊合比例',
    opacityHelp: '0% 只顯示 A；100% 只顯示 B。差異模式不使用此比例。', generate: '產生預覽', cancel: '取消處理', clear: '清除全部',
    resultTitle: '03 / 校稿預覽', emptyResult: '選擇兩張圖片並產生預覽。變更來源或設定會立即清除舊結果。', actual: '以 1:1 像素顯示（可捲動）',
    resultAlt: '校稿結果', resultInfo: '顯示尺寸', pixels: '像素',
    methodTitle: '如何閱讀差異？', method: '兩張圖片各自先合成到白底，再計算每個 RGB 色頻的絕對差。黑色代表該像素在白底上的顏色相同；越亮表示該色頻差異越大。透明疊合也使用這兩張白底影像。',
    caveat: '這是視覺校稿，不是圖片真偽檢測。透明區域的隱藏顏色、白底不可見的透明度差異、原始位元組及中繼資料不在比較範圍。瀏覽器解碼與色彩轉換可能影響結果；不保證印刷色準。',
    cancelHelp: '取消後不會提交舊結果；原生圖片解碼未必能立即停止。新工作會等待上一個解碼完成，不會同時堆疊。若瀏覽器長時間無回應，請重新載入頁面。',
    candidate: '未發布候選 · 不使用帳號、追蹤、雲端處理或瀏覽器儲存。', noScript: '此工具需要啟用 JavaScript；圖片仍只在此瀏覽器處理。',
    unsupported: '此瀏覽器缺少必要的 Canvas 或圖片解碼能力，請改用支援這些功能的瀏覽器。',
    states: { idle: '等待兩張圖片。', ready: '來源已更新；請產生新的預覽。', loading: '正在讀取圖片，或等待前一個原生解碼結束…', rendering: '正在產生預覽…', success: '預覽已更新。', error: '無法完成。' },
    errors: { EMPTY: '檔案是空的。', FILE_SIZE: '單檔不能超過 10 MiB。', DIMENSIONS: '圖片超過 4096 px 單邊或 4 百萬像素限制。', CORRUPT: '圖片損壞、內容不完整或尺寸異常。', FORMAT: '僅接受靜態 PNG 或 8-bit baseline/progressive JPEG；不接受動畫、SVG、WebP 或 HEIC。', COUNT: '每個版本請選擇一張圖片。', MISMATCH: '兩張圖片的方向處理後尺寸不同；請選擇相同寬高的版本。', NEED_TWO: '請先選好兩張圖片。', SETTINGS: '請檢查顯示模式與 0–100 的整數比例。', CANCELLED: '已取消；不保留舊預覽。', DECODE: '瀏覽器無法解碼此圖片；請檢查檔案或嘗試較小圖片。', RENDER: '無法產生預覽；請嘗試較小圖片或重新載入。' }
  },
  en: {
    title: 'Image Overlay Proofing', description: 'Overlay two equal-sized images, adjust opacity and inspect pixel differences in your browser. Images are not uploaded.',
    eyebrow: 'GLOSSQUOTE LABS · CANDIDATE', intro: 'Bring before and after together, and let small changes stand out.',
    privacy: 'Images stay in this browser. Nothing is uploaded or saved.', home: 'All tools', switch: '繁體中文',
    choose: '01 / Choose two versions', before: 'A · Before', after: 'B · After', empty: 'No image selected',
    limits: 'Static PNG or JPEG only. Each file: up to 10 MiB, 4 million pixels and 4096 px per edge. Oriented width and height must match. Images are never resized.',
    adjust: '02 / Set up your comparison', mode: 'Display mode', overlay: 'Opacity overlay', difference: 'Absolute difference', opacity: 'Image B blend percentage',
    opacityHelp: '0% shows only A; 100% shows only B. Difference mode does not use this percentage.', generate: 'Create preview', cancel: 'Cancel processing', clear: 'Clear all',
    resultTitle: '03 / Proofing preview', emptyResult: 'Choose two images and create a preview. Changing a source or setting immediately clears the old result.', actual: 'Show at 1:1 pixels (scrollable)',
    resultAlt: 'Proofing result', resultInfo: 'Rendered dimensions', pixels: 'pixels',
    methodTitle: 'How do I read the difference?', method: 'Each image is composited onto white first. Difference mode takes the absolute difference of each RGB channel. Black means equal colors on white; brighter channels mean larger differences. Overlay uses these same white-backed images.',
    caveat: 'A visual proofing aid, not an authenticity test. Hidden transparent colors, transparency differences invisible on white, original file bytes and metadata are not compared. Browser decoding and color conversion can affect results; print color accuracy is not guaranteed.',
    cancelHelp: 'Cancel prevents stale results from appearing, but native image decoding may not stop immediately. New work waits for the previous decoder rather than overlapping. Reload the page if the browser remains unresponsive.',
    candidate: 'Unpublished candidate · No account, tracking, cloud processing or browser storage.', noScript: 'This tool needs JavaScript. Images are still processed only in this browser.',
    unsupported: 'This browser lacks the required Canvas or image-decoding capabilities. Please use a browser that supports them.',
    states: { idle: 'Waiting for two images.', ready: 'Sources updated. Create a fresh preview.', loading: 'Reading the image, or waiting for the previous native decoder…', rendering: 'Creating preview…', success: 'Preview updated.', error: 'Unable to complete.' },
    errors: { EMPTY: 'The file is empty.', FILE_SIZE: 'Each file must be no larger than 10 MiB.', DIMENSIONS: 'The image exceeds 4096 px per edge or 4 million pixels.', CORRUPT: 'The image is damaged, incomplete or has unexpected dimensions.', FORMAT: 'Use static PNG or 8-bit baseline/progressive JPEG. Animated images, SVG, WebP and HEIC are not supported.', COUNT: 'Choose one image for each version.', MISMATCH: 'The oriented image dimensions differ. Choose versions with matching width and height.', NEED_TWO: 'Choose both images first.', SETTINGS: 'Check the mode and an integer blend percentage from 0 to 100.', CANCELLED: 'Cancelled. The previous preview is cleared.', DECODE: 'The browser could not decode the image. Check the file or try a smaller image.', RENDER: 'The preview could not be created. Try smaller images or reload the page.' }
  }
};
