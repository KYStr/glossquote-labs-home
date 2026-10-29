// HTML 只由受版本控制的靜態文案建立；不含任何使用者輸入。
export function page(language) {
  const zh = language === 'zh-Hant';
  const text = zh ? {
    title:'照片聯絡表｜縮圖總覽與檔名索引',description:'在瀏覽器把最多 30 張 JPEG 或 PNG 整理成編號縮圖，下載 PNG 與完整檔名文字索引，不上傳圖片。',
    home:'全部工具',switch:'English',heading:'照片聯絡表',intro:'把一批照片排成總覽，按編號找回原圖。',choose:'加入 JPEG / PNG',privacy:'圖片只在目前頁面處理，不會上傳。重新整理或切換語言會清除工作。',
    sources:'圖片與順序',settings:'版面設定',columns:'每列欄數',tile:'縮圖最大邊長（px）',gap:'圖片間距（0–64 px）',margin:'頁面邊距（0–96 px）',labels:'在 PNG 顯示檔名',
    labelNote:'編號一律保留。PNG 檔名可能截短，完整原名請下載文字索引。檔名可能含個人資料，分享前請檢查。',build:'建立總覽',clear:'清除全部',cancel:'取消處理',png:'下載 PNG',index:'下載檔名索引',
    preview:'總覽預覽',empty:'加入圖片並建立總覽後，結果會顯示在這裡。',limits:'格式與使用限制',limitsText:'最多 30 張；單檔 8 MiB，原始檔案合計 64 MiB。每張最多 1600 萬像素、單邊 8192 px。支援靜態 PNG 與 8-bit baseline / progressive JPEG；不支援 APNG、GIF、WebP、SVG、HEIC 或 CMYK JPEG。瀏覽器支援與可用記憶體不同，符合限制仍可能失敗。',
    outputText:'總覽最多 1600 萬像素、單邊 8192 px、PNG 64 MiB。不裁切、不放大原圖；透明區域以白色呈現。這是縮圖總覽，不是保存原畫質的相簿。原檔不會被修改。',
    faq:'使用說明',q1:'完整檔名在哪裡？',a1:'下載 PNG 之後，也請下載檔名索引。索引每行是編號、Tab 和完整檔名的 JSON 字串；換行與控制字元會跳脫表示。編號對應目前順序，檔名不必唯一。',
    q2:'照片方向與色彩會完全相同嗎？',a2:'工具讀取支援的 EXIF 方向，再由瀏覽器解碼；尺寸不符會停止。不同瀏覽器的方向、色彩與字型仍可能不同，請檢查預覽。輸出不複製原始照片 metadata，不保證色彩或 DPI 保真。',
    q3:'取消或清除代表安全抹除嗎？',a3:'不是。取消會停止後續工作，但不能立即打斷原生解碼；目前作業完成後丟棄結果。清除會釋放頁面的圖片引用，不會刪除已下載檔案，也不能保證瀏覽器或作業系統記憶體抹除。',
    previewNote:'未發布候選 · 本機預覽不供搜尋引擎收錄',noscript:'此工具需要 JavaScript；圖片運算只在你的瀏覽器進行。',skip:'跳至工具'
  } : {
    title:'Photo Contact Sheet | Thumbnails and Filename Index',description:'Arrange up to 30 JPEG or PNG images into numbered thumbnails in your browser. Download a PNG overview and full-filename text index without uploading images.',
    home:'All tools',switch:'繁體中文',heading:'Photo contact sheet',intro:'Make one overview of your photos. Find the originals by number.',choose:'Add JPEG / PNG',privacy:'Images are processed only in this page, without uploads. Reloading or switching language clears your work.',
    sources:'Images and order',settings:'Layout settings',columns:'Columns per row',tile:'Thumbnail maximum edge (px)',gap:'Image spacing (0–64 px)',margin:'Page margin (0–96 px)',labels:'Show filenames in PNG',
    labelNote:'Numbers always remain visible. PNG filenames may be shortened; download the index for complete names. Names may contain personal information. Review before sharing.',build:'Build overview',clear:'Clear all',cancel:'Cancel processing',png:'Download PNG',index:'Download filename index',
    preview:'Overview preview',empty:'Add images and build your overview to see the result here.',limits:'Format and usage limits',limitsText:'Up to 30 images; 8 MiB each and 64 MiB combined original file size. Each image may have up to 16 million pixels and an 8192 px edge. Supports static PNG and 8-bit baseline / progressive JPEG. No APNG, GIF, WebP, SVG, HEIC or CMYK JPEG. Browser support and available memory vary; images within these limits may still fail.',
    outputText:'Output is limited to 16 million pixels, 8192 px per edge and a 64 MiB PNG. Images are not cropped or enlarged; transparency appears white. This is a thumbnail overview, not a full-quality photo archive. Originals are not modified.',
    faq:'How it works',q1:'Where are the complete filenames?',a1:'Download the filename index as well as the PNG. Each index line contains a number, a Tab and the complete filename as a JSON string. Newlines and control characters are escaped. Numbers follow the current order; filenames need not be unique.',
    q2:'Will orientation and colors match exactly?',a2:'The tool reads supported EXIF orientation before browser decoding and stops on dimension mismatches. Orientation, colors and fonts may still vary by browser. Inspect the preview. Original photo metadata is not copied; color or DPI fidelity is not guaranteed.',
    q3:'Does cancelling or clearing securely erase data?',a3:'No. Cancellation stops further work but cannot interrupt native decoding immediately; its result is discarded when it finishes. Clearing releases page references, not downloaded files. Browser or operating-system memory erasure is not guaranteed.',
    previewNote:'Unpublished candidate · Local preview is not indexed',noscript:'This tool needs JavaScript. Image processing takes place only in your browser.',skip:'Skip to tool'
  };
  const prefix = zh ? './' : '../';
  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="description" content="${text.description}">
  <title>${text.title}</title>
  <link rel="stylesheet" href="${prefix}styles/app.css">
  <script type="module" src="${prefix}js/app.mjs"></script>
</head>
<body>
<a class="skip" href="#tool">${text.skip}</a>
<header><a class="brand" data-leave href="https://glossquote.com/${zh ? '' : 'en/'}index.html">Gloss Tools <span>by GlossQuote</span></a><nav aria-label="${text.home}"><a data-leave href="https://glossquote.com/${zh ? '' : 'en/'}index.html">${text.home}</a><a data-leave href="${zh ? './en/index.html' : '../index.html'}" lang="${zh ? 'en' : 'zh-Hant'}">${text.switch}</a></nav></header>
<main id="tool">
  <div class="intro"><h1>${text.heading}</h1><p>${text.intro}</p></div>
  <p class="privacy">${text.privacy}</p>
  <noscript><p class="error">${text.noscript}</p></noscript>
  <div class="workspace">
    <section class="rail" aria-labelledby="settings-heading">
      <h2 id="settings-heading">${text.settings}</h2>
      <form id="settings">
        <label for="columns">${text.columns}</label><input id="columns" type="number" min="1" max="6" step="1" value="4" required disabled>
        <label for="tile">${text.tile}</label><select id="tile" disabled><option>120</option><option>180</option><option selected>240</option><option>320</option></select>
        <details><summary>${zh ? '間距與標籤' : 'Spacing and labels'}</summary><div class="advanced">
          <label for="gap">${text.gap}</label><input id="gap" type="number" min="0" max="64" step="1" value="16" required disabled>
          <label for="margin">${text.margin}</label><input id="margin" type="number" min="0" max="96" step="1" value="24" required disabled>
          <label class="checkbox" for="labels"><input id="labels" type="checkbox" checked disabled>${text.labels}</label>
        </div></details>
        <p class="small">${text.labelNote}</p>
        <p id="estimate" class="measure"></p>
        <button id="build" class="primary" type="submit" disabled>${text.build}</button>
      </form>
      <button id="clear" type="button" disabled>${text.clear}</button>
    </section>
    <div class="canvas-region">
      <section aria-labelledby="sources-heading">
        <div class="section-heading"><h2 id="sources-heading">${text.sources}</h2><span id="count" class="measure">0 / 30</span></div>
        <label class="file-label" for="files">${text.choose}</label><input id="files" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" multiple disabled aria-describedby="file-note">
        <p id="file-note" class="small">${zh ? '最多 30 張；每張 8 MiB、合計 64 MiB。以加入的順序開始排列。' : 'Up to 30 images; 8 MiB each, 64 MiB total. Starts in the selected order.'}</p>
        <ol id="items"></ol>
      </section>
      <p id="status" role="status" aria-live="polite" aria-atomic="true"></p><button id="cancel" type="button" hidden disabled>${text.cancel}</button>
      <section class="result" aria-labelledby="preview-heading">
        <div class="section-heading"><h2 id="preview-heading">${text.preview}</h2></div>
        <div class="actions"><button id="png" type="button" disabled>${text.png}</button><button id="index" type="button" disabled>${text.index}</button></div>
        <p id="empty" class="empty">${text.empty}</p><div id="preview"></div>
      </section>
    </div>
  </div>
  <section class="help" aria-labelledby="help-heading"><h2 id="help-heading">${text.faq}</h2>
    <details><summary>${text.limits}</summary><p>${text.limitsText}</p><p>${text.outputText}</p></details>
    <details><summary>${text.q1}</summary><p>${text.a1}</p></details>
    <details><summary>${text.q2}</summary><p>${text.a2}</p></details>
    <details><summary>${text.q3}</summary><p>${text.a3}</p></details>
  </section>
</main>
<dialog id="confirmation" aria-labelledby="confirm-heading" aria-describedby="confirm-note"><h2 id="confirm-heading">${zh ? '捨棄目前工作？' : 'Discard current work?'}</h2><p id="confirm-note">${zh ? '圖片與尚未下載的結果會清除，無法復原。若要保存，請先取消並下載。' : 'Images and undownloaded results will be cleared and cannot be restored. Cancel and download first if you want to keep them.'}</p><div class="actions"><button id="keep" type="button">${zh ? '保留工作' : 'Keep working'}</button><button id="discard" type="button">${zh ? '捨棄並繼續' : 'Discard and continue'}</button></div></dialog>
<footer>${text.previewNote}</footer>
</body>
</html>\n`;
}
