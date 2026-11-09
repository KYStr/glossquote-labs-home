// SPEC 第 4 節封閉式淨化契約的可稽核資料與實作；清單只在這裡出現一次。
import { XHTML_NS } from './xml.mjs';

// 禁止元素（以 local name 比對，另加整個 XHTML 名稱空間的元素）。
export const BANNED_ELEMENTS = Object.freeze([
  'script', 'foreignObject', 'iframe', 'frame', 'frameset', 'embed', 'object',
  'applet', 'link', 'meta', 'base', 'form', 'input', 'button', 'audio', 'video',
  'source', 'track',
]);

// href 允許的 data: 圖檔前綴（其後必須是 ';' 或 ','，避免 data:image/pngx 之類偽裝）。
export const ALLOWED_DATA_PREFIXES = Object.freeze([
  'data:image/png', 'data:image/jpeg', 'data:image/gif', 'data:image/webp',
]);

export function isAllowedReference(value) {
  const trimmed = String(value).trim();
  if (trimmed.startsWith('#')) return true;
  const lower = trimmed.toLowerCase();
  return ALLOWED_DATA_PREFIXES.some((prefix) => {
    if (!lower.startsWith(prefix)) return false;
    const next = lower[prefix.length];
    return next === ';' || next === ',';
  });
}

// 從 CSS 文字移除 @import 規則與指向不允許目標的 url() 宣告；回傳 {css, removed}。
export function cleanCssText(css) {
  let removed = 0;
  let out = String(css);

  // @import：整條規則（到深度 0 的分號為止）移除，每條計 1。
  for (;;) {
    const match = /@import\b/i.exec(out);
    if (!match) break;
    const start = match.index;
    let j = start;
    let depth = 0;
    let quote = null;
    while (j < out.length) {
      const c = out[j];
      if (quote) { if (c === quote) quote = null; }
      else if (c === '"' || c === "'") quote = c;
      else if (c === '(') depth += 1;
      else if (c === ')') depth -= 1;
      else if (c === ';' && depth === 0) { j += 1; break; }
      j += 1;
    }
    out = out.slice(0, start) + out.slice(j);
    removed += 1;
  }

  // url(...)：目標不合允許清單時，移除其所屬宣告，每個宣告計 1。
  let cursor = 0;
  for (;;) {
    const rest = out.slice(cursor);
    const match = /url\s*\(/i.exec(rest);
    if (!match) break;
    const urlStart = cursor + match.index;
    let j = urlStart + match[0].length;
    while (j < out.length && /\s/.test(out[j])) j += 1;
    let target = '';
    if (out[j] === '"' || out[j] === "'") {
      const quote = out[j];
      j += 1;
      const targetStart = j;
      while (j < out.length && out[j] !== quote) j += 1;
      target = out.slice(targetStart, j);
      j += 1;
      while (j < out.length && out[j] !== ')') j += 1;
    } else {
      const targetStart = j;
      while (j < out.length && out[j] !== ')') j += 1;
      target = out.slice(targetStart, j);
    }
    const urlEnd = Math.min(j + 1, out.length);
    if (isAllowedReference(target)) { cursor = urlEnd; continue; }
    // 往回找宣告起點：略過成對括號內的分號（data: URL 內的 ';' 不算分隔）。
    let declStart = urlStart;
    let depth = 0;
    while (declStart > 0) {
      const c = out[declStart - 1];
      if (c === ')') depth += 1;
      else if (c === '(') depth -= 1;
      else if (depth === 0 && (c === ';' || c === '{' || c === '}')) break;
      declStart -= 1;
    }
    let declEnd = urlEnd;
    while (declEnd < out.length && out[declEnd] !== ';' && out[declEnd] !== '}') declEnd += 1;
    if (out[declEnd] === ';') declEnd += 1;
    out = out.slice(0, declStart) + out.slice(declEnd);
    removed += 1;
    cursor = declStart;
  }
  return { css: out, removed };
}

// 就地淨化已解析文件；回傳分類計數 {elements:[{name,count}], eventAttributes, references, styleItems, total}。
export function sanitizeDocument(root) {
  const counts = { elements: [], eventAttributes: 0, references: 0, styleItems: 0, total: 0 };
  const bumpElement = (name) => {
    const entry = counts.elements.find((e) => e.name === name);
    if (entry) entry.count += 1;
    else counts.elements.push({ name, count: 1 });
    counts.total += 1;
  };

  const visit = (element) => {
    const keptAttrs = [];
    for (const attr of element.attrs) {
      if (attr.localName.toLowerCase().startsWith('on')) {
        counts.eventAttributes += 1;
        counts.total += 1;
        continue;
      }
      if (attr.localName === 'href') {
        if (!isAllowedReference(attr.value)) {
          counts.references += 1;
          counts.total += 1;
          continue;
        }
        keptAttrs.push(attr);
        continue;
      }
      if (attr.localName === 'style') {
        const cleaned = cleanCssText(attr.value);
        if (cleaned.removed > 0) {
          counts.styleItems += cleaned.removed;
          counts.total += cleaned.removed;
          keptAttrs.push({ ...attr, value: cleaned.css });
          continue;
        }
        keptAttrs.push(attr);
        continue;
      }
      keptAttrs.push(attr);
    }
    element.attrs = keptAttrs;

    if (element.localName === 'style') {
      const raw = element.children.filter((n) => n.type === 'text' || n.type === 'cdata')
        .map((n) => n.value).join('');
      if (raw) {
        const cleaned = cleanCssText(raw);
        if (cleaned.removed > 0) {
          counts.styleItems += cleaned.removed;
          counts.total += cleaned.removed;
          element.children = cleaned.css ? [{ type: 'text', value: cleaned.css }] : [];
        }
      }
    }

    const keptChildren = [];
    for (const child of element.children) {
      if (child.type === 'element') {
        if (BANNED_ELEMENTS.includes(child.localName) || child.ns === XHTML_NS) {
          bumpElement(child.localName);
          continue; // 連同子樹移除，子樹內不再另計。
        }
        visit(child);
      }
      keptChildren.push(child);
    }
    element.children = keptChildren;
  };

  visit(root);
  return counts;
}
