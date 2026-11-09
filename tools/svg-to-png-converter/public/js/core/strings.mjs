// 雙語動態字串（錯誤、事實、移除摘要）。靜態介面文字在 HTML 兩頁各自落地，這裡只管程式產生的文字。

export const STRINGS = {
  zh: {
    errInputCapChars: '貼上的內容超過上限：{size} 字元，上限是 {limit} 字元。請縮短後再試。',
    errInputCapBytes: '檔案超過上限：{size} 位元組，上限是 {limit} 位元組。',
    errParse: '這不是格式正確的 XML（第 {line} 行第 {column} 欄：{message}）。',
    errRootSvgNoNs: '根元素是 <svg>，但缺少 SVG 名稱空間（xmlns="http://www.w3.org/2000/svg"），無法當作 SVG 處理。',
    errRootOther: '根元素是 <{found}>，不是 <svg>，無法當作 SVG 處理。',
    errUndeterminable: '無法判定原始尺寸：沒有可用的 width／height，也沒有 viewBox。',
    errOutputCap: '輸出尺寸 {width}×{height} 超過上限（任一邊最多 8192 px、總像素最多 33,554,432）。請調小寬度、高度或比例。',
    errInvalidDimension: '寬度／高度必須是 16 到 8192 的整數。',
    errInvalidScale: '比例必須是 10 到 1000，最多一位小數。',
    errInvalidColor: '自訂背景色必須是 #RRGGBB 格式（例如 #3366CC）。',
    errExport: '瀏覽器拒絕匯出 PNG，無法產生下載檔案。',
    errFileRead: '讀取檔案失敗，請再試一次。',
    intrinsicLabel: '原始尺寸：{width} × {height} px',
    rule1: '由 width／height 屬性決定',
    rule2: '由單邊屬性與 viewBox 比例推算',
    rule3: '由 viewBox 決定（1 單位 = 1 px）',
    outputLabel: '輸出尺寸：{width} × {height} px',
    sanitizedSize: '淨化後 SVG 大小：{bytes} 位元組',
    previewAlt: '你的 SVG 在輸出尺寸下的預覽',
    ready: '已就緒，可以下載 PNG。',
    empty: '貼上 SVG 內容或選擇 .svg 檔後，這裡會顯示預覽。',
  },
  en: {
    errInputCapChars: 'Pasted input is over the cap: {size} characters, limit {limit}. Please shorten it and try again.',
    errInputCapBytes: 'File is over the cap: {size} bytes, limit {limit}.',
    errParse: 'This is not well-formed XML (line {line}, column {column}: {message}).',
    errRootSvgNoNs: 'The root element is <svg> but lacks the SVG namespace (xmlns="http://www.w3.org/2000/svg"), so it cannot be treated as SVG.',
    errRootOther: 'The root element is <{found}>, not <svg>, so it cannot be treated as SVG.',
    errUndeterminable: 'Intrinsic size cannot be determined: no usable width/height and no viewBox.',
    errOutputCap: 'Output size {width}x{height} exceeds the caps (each side at most 8192 px, at most 33,554,432 pixels in total). Reduce the width, height or scale.',
    errInvalidDimension: 'Width/height must be an integer from 16 to 8192.',
    errInvalidScale: 'Scale must be from 10 to 1000, with at most one decimal place.',
    errInvalidColor: 'Custom background must be a #RRGGBB hex colour (for example #3366CC).',
    errExport: 'The browser refused the PNG export, so no download could be produced.',
    errFileRead: 'Reading the file failed. Please try again.',
    intrinsicLabel: 'Intrinsic size: {width} x {height} px',
    rule1: 'determined by the width/height attributes',
    rule2: 'derived from one attribute and the viewBox ratio',
    rule3: 'determined by the viewBox (1 unit = 1 px)',
    outputLabel: 'Output size: {width} x {height} px',
    sanitizedSize: 'Sanitised SVG size: {bytes} bytes',
    previewAlt: 'Preview of your SVG at the output size',
    ready: 'Ready. You can download the PNG.',
    empty: 'Paste SVG markup or choose an .svg file to see the preview here.',
  },
};

export function t(lang, key, params = {}) {
  const table = STRINGS[lang] ?? STRINGS.zh;
  let text = table[key] ?? STRINGS.zh[key] ?? key;
  for (const [name, value] of Object.entries(params)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

// 移除摘要：分類逐項列出，與 SPEC 第 3 節的範例句型一致。
export function removalSummary(lang, counts) {
  if (counts.total === 0) return '';
  const parts = [];
  const elementTotal = counts.elements.reduce((sum, e) => sum + e.count, 0);
  if (lang === 'en') {
    if (elementTotal === 1 && counts.elements.length === 1) {
      parts.push(`1 ${counts.elements[0].name} element`);
    } else if (elementTotal > 0) {
      const detail = counts.elements.map((e) => `${e.name} ×${e.count}`).join(', ');
      parts.push(`${elementTotal} elements (${detail})`);
    }
    if (counts.eventAttributes) parts.push(`${counts.eventAttributes} event-handler attribute${counts.eventAttributes === 1 ? '' : 's'}`);
    if (counts.references) parts.push(`${counts.references} unsafe or unsupported reference${counts.references === 1 ? '' : 's'}`);
    if (counts.styleItems) parts.push(`${counts.styleItems} unsupported style item${counts.styleItems === 1 ? '' : 's'}`);
    if (counts.unsupportedItems) parts.push(`${counts.unsupportedItems} unsupported attribute or markup item${counts.unsupportedItems === 1 ? '' : 's'}`);
    return `removed ${counts.total} item${counts.total === 1 ? '' : 's'}: ${parts.join(', ')}`;
  }
  if (elementTotal === 1 && counts.elements.length === 1) {
    parts.push(`1 個 ${counts.elements[0].name} 元素`);
  } else if (elementTotal > 0) {
    const detail = counts.elements.map((e) => `${e.name} ×${e.count}`).join('、');
    parts.push(`${elementTotal} 個元素（${detail}）`);
  }
  if (counts.eventAttributes) parts.push(`${counts.eventAttributes} 個事件處理屬性`);
  if (counts.references) parts.push(`${counts.references} 個不安全或不支援的參照`);
  if (counts.styleItems) parts.push(`${counts.styleItems} 個不支援的樣式項目`);
  if (counts.unsupportedItems) parts.push(`${counts.unsupportedItems} 個不支援的屬性或標記項目`);
  return `已移除 ${counts.total} 個項目：${parts.join('、')}`;
}
