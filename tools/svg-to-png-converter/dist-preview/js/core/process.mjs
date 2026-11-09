// 輸入管線：上限 → XML 解析 → 根元素檢查 → 淨化 → 序列化 → 固有尺寸。全程純函式（字串進出）。
import { parseXml, serializeXml, SVG_NS } from './xml.mjs';
import { sanitizeDocument } from './sanitize.mjs';
import { resolveIntrinsic } from './size.mjs';

export const PASTE_CHAR_CAP = 200000;
export const FILE_BYTE_CAP = 2000000;

function attrValue(element, localName) {
  const attr = element.attrs.find((a) => a.localName === localName && a.prefix === null);
  return attr ? attr.value : null;
}

// text：輸入全文；size/capUnit：paste 以字元數 200,000 為上限，file 以位元組 2,000,000 為上限。
export function processInput(text, { size, capUnit }) {
  const limit = capUnit === 'bytes' ? FILE_BYTE_CAP : PASTE_CHAR_CAP;
  if (size > limit) {
    return { status: 'error', error: { code: 'input-over-cap', capUnit, size, limit } };
  }
  const parsed = parseXml(text);
  if (!parsed.ok) {
    return { status: 'error', error: { ...parsed.error, code: 'not-well-formed' } };
  }
  const root = parsed.root;
  if (root.localName !== 'svg' || root.ns !== SVG_NS) {
    return {
      status: 'error',
      error: {
        code: 'root',
        found: root.localName,
        foundNamespace: root.ns,
      },
    };
  }
  const counts = sanitizeDocument(root);
  const serialized = serializeXml(root);
  const intrinsic = resolveIntrinsic({
    widthAttr: attrValue(root, 'width'),
    heightAttr: attrValue(root, 'height'),
    viewBoxAttr: attrValue(root, 'viewBox'),
  });
  if (!intrinsic.ok) {
    return { status: 'error', error: { code: 'undeterminable' } };
  }
  return {
    status: 'ok',
    serialized,
    serializedBytes: new TextEncoder().encode(serialized).length,
    counts,
    intrinsic,
  };
}
