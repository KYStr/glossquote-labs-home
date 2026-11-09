// 純 XML 解析與序列化：不碰 DOM，讓 Node 測試能直接驗證 SPEC 的解析/根元素規則。
export const SVG_NS = 'http://www.w3.org/2000/svg';
export const XHTML_NS = 'http://www.w3.org/1999/xhtml';
export const XLINK_NS = 'http://www.w3.org/1999/xlink';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';

const PREDEFINED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function lineCol(text, index) {
  let line = 1;
  let lastBreak = -1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === '\n') { line += 1; lastBreak = i; }
  }
  return { line, column: index - lastBreak };
}

class ParseFailure extends Error {
  constructor(message, index) {
    super(message);
    this.index = index;
  }
}

function fail(message, index) { throw new ParseFailure(message, index); }

function isLegalCodePoint(cp) {
  return cp === 0x9 || cp === 0xA || cp === 0xD
    || (cp >= 0x20 && cp <= 0xD7FF) || (cp >= 0xE000 && cp <= 0xFFFD)
    || (cp >= 0x10000 && cp <= 0x10FFFF);
}

// 解碼預定義實體與字元參照；未定義的具名實體依 XML 規則即格式錯誤。
function decodeEntities(raw, baseIndex) {
  let out = '';
  let i = 0;
  while (i < raw.length) {
    const amp = raw.indexOf('&', i);
    if (amp === -1) { out += raw.slice(i); break; }
    out += raw.slice(i, amp);
    const semi = raw.indexOf(';', amp);
    if (semi === -1) fail('unterminated entity reference', baseIndex + amp);
    const body = raw.slice(amp + 1, semi);
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const hex = body.slice(2);
      if (!/^[0-9a-fA-F]+$/.test(hex)) fail(`invalid character reference &${body};`, baseIndex + amp);
      const cp = parseInt(hex, 16);
      if (!isLegalCodePoint(cp)) fail(`illegal XML character reference &${body};`, baseIndex + amp);
      out += String.fromCodePoint(cp);
    } else if (body.startsWith('#')) {
      const dec = body.slice(1);
      if (!/^[0-9]+$/.test(dec)) fail(`invalid character reference &${body};`, baseIndex + amp);
      const cp = parseInt(dec, 10);
      if (!isLegalCodePoint(cp)) fail(`illegal XML character reference &${body};`, baseIndex + amp);
      out += String.fromCodePoint(cp);
    } else if (Object.prototype.hasOwnProperty.call(PREDEFINED, body)) {
      out += PREDEFINED[body];
    } else {
      fail(`undefined entity &${body};`, baseIndex + amp);
    }
    i = semi + 1;
  }
  return out;
}

function splitQName(qname, index) {
  const colon = qname.indexOf(':');
  if (colon === -1) return { prefix: null, localName: qname };
  const prefix = qname.slice(0, colon);
  const localName = qname.slice(colon + 1);
  if (!prefix || !localName || localName.includes(':')) fail(`invalid qualified name "${qname}"`, index);
  return { prefix, localName };
}

const NAME_STOP = new Set([' ', '\t', '\r', '\n', '<', '>', '/', '=', '?', '!', '"', "'"]);

// 嚴格 XML 解析：回傳 {ok:true, root} 或 {ok:false, error:{code:'parse', message, line, column}}。
export function parseXml(text) {
  try {
    return { ok: true, root: parseDocument(text) };
  } catch (err) {
    if (err instanceof ParseFailure) {
      const { line, column } = lineCol(text, Math.min(err.index, text.length));
      return { ok: false, error: { code: 'parse', message: err.message, line, column } };
    }
    throw err;
  }
}

function parseDocument(text) {
  const len = text.length;
  let i = 0;
  let root = null;
  const stack = []; // {node, scope:Map}
  const baseScope = new Map([['xml', XML_NS]]);

  const currentScope = () => (stack.length ? stack[stack.length - 1].scope : baseScope);
  const currentParent = () => (stack.length ? stack[stack.length - 1].node : null);

  function appendNode(node, index) {
    const parent = currentParent();
    if (parent) { parent.children.push(node); return; }
    if (node.type === 'element') {
      if (root) fail('multiple document elements', index);
      root = node;
    } else if (node.type === 'text') {
      if (node.value.trim() !== '') fail('text outside the document element', index);
    }
    // 根元素外的註解/PI 允許存在但不保留（序列化正規化的一部分）。
  }

  while (i < len) {
    if (text[i] !== '<') {
      let end = text.indexOf('<', i);
      if (end === -1) end = len;
      appendNode({ type: 'text', value: decodeEntities(text.slice(i, end), i) }, i);
      i = end;
      continue;
    }
    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      if (end === -1) fail('unterminated comment', i);
      appendNode({ type: 'comment', value: text.slice(i + 4, end) }, i);
      i = end + 3;
      continue;
    }
    if (text.startsWith('<![CDATA[', i)) {
      if (!currentParent()) fail('CDATA section outside the document element', i);
      const end = text.indexOf(']]>', i + 9);
      if (end === -1) fail('unterminated CDATA section', i);
      appendNode({ type: 'cdata', value: text.slice(i + 9, end) }, i);
      i = end + 3;
      continue;
    }
    if (text.startsWith('<!DOCTYPE', i)) {
      // 接受無內部子集的 DOCTYPE；帶實體宣告的內部子集一律拒絕（不讓輸入自帶實體展開）。
      let j = i + 9;
      let quote = null;
      let hasSubset = false;
      while (j < len) {
        const c = text[j];
        if (quote) { if (c === quote) quote = null; }
        else if (c === '"' || c === "'") quote = c;
        else if (c === '[') hasSubset = true;
        else if (c === '>') break;
        j += 1;
      }
      if (j >= len) fail('unterminated DOCTYPE', i);
      if (hasSubset) fail('DOCTYPE with an internal subset is not accepted', i);
      i = j + 1;
      continue;
    }
    if (text.startsWith('<?', i)) {
      const end = text.indexOf('?>', i + 2);
      if (end === -1) fail('unterminated processing instruction', i);
      const inner = text.slice(i + 2, end);
      const spaceAt = inner.search(/[\s]/);
      appendNode({
        type: 'pi',
        target: spaceAt === -1 ? inner : inner.slice(0, spaceAt),
        value: spaceAt === -1 ? '' : inner.slice(spaceAt + 1),
      }, i);
      i = end + 2;
      continue;
    }
    if (text.startsWith('</', i)) {
      const end = text.indexOf('>', i + 2);
      if (end === -1) fail('unterminated end tag', i);
      const qname = text.slice(i + 2, end).trim();
      const top = stack.pop();
      if (!top || top.node.qname !== qname) fail(`mismatched end tag </${qname}>`, i);
      i = end + 1;
      continue;
    }
    if (text.startsWith('<!', i)) fail('unsupported markup declaration', i);

    // 起始標籤或空元素標籤。
    let j = i + 1;
    const nameStart = j;
    while (j < len && !NAME_STOP.has(text[j])) j += 1;
    const qname = text.slice(nameStart, j);
    if (!qname) fail('missing element name', i);
    const rawAttrs = [];
    const seen = new Set();
    let selfClosing = false;
    for (;;) {
      while (j < len && /\s/.test(text[j])) j += 1;
      if (j >= len) fail(`unterminated start tag <${qname}>`, i);
      if (text[j] === '>') { j += 1; break; }
      if (text[j] === '/' && text[j + 1] === '>') { selfClosing = true; j += 2; break; }
      const attrStart = j;
      while (j < len && !NAME_STOP.has(text[j])) j += 1;
      const attrName = text.slice(attrStart, j);
      if (!attrName) fail('malformed attribute', j);
      if (seen.has(attrName)) fail(`duplicate attribute "${attrName}"`, attrStart);
      seen.add(attrName);
      while (j < len && /\s/.test(text[j])) j += 1;
      if (text[j] !== '=') fail(`attribute "${attrName}" is missing "="`, j);
      j += 1;
      while (j < len && /\s/.test(text[j])) j += 1;
      const quote = text[j];
      if (quote !== '"' && quote !== "'") fail(`attribute "${attrName}" value must be quoted`, j);
      const valueStart = j + 1;
      const valueEnd = text.indexOf(quote, valueStart);
      if (valueEnd === -1) fail(`unterminated value of attribute "${attrName}"`, valueStart);
      const rawValue = text.slice(valueStart, valueEnd);
      if (rawValue.includes('<')) fail(`"<" is not allowed in attribute "${attrName}"`, valueStart);
      rawAttrs.push({ qname: attrName, value: decodeEntities(rawValue, valueStart) });
      j = valueEnd + 1;
    }

    // 名稱空間解析：先套用本標籤的 xmlns 宣告，再解析元素與屬性前綴。
    const scope = new Map(currentScope());
    for (const attr of rawAttrs) {
      if (attr.qname === 'xmlns') scope.set('', attr.value);
      else if (attr.qname.startsWith('xmlns:')) scope.set(attr.qname.slice(6), attr.value);
    }
    const elemParts = splitQName(qname, i);
    let elemNs;
    if (elemParts.prefix) {
      elemNs = scope.get(elemParts.prefix);
      if (elemNs === undefined) fail(`undeclared namespace prefix "${elemParts.prefix}"`, i);
    } else {
      elemNs = scope.get('') ?? null;
    }
    const attrs = rawAttrs.map((attr) => {
      const parts = splitQName(attr.qname, i);
      let ns = null;
      if (attr.qname === 'xmlns' || attr.qname.startsWith('xmlns:')) ns = XMLNS_NS;
      else if (parts.prefix) {
        ns = scope.get(parts.prefix);
        if (ns === undefined) fail(`undeclared namespace prefix "${parts.prefix}"`, i);
      }
      return { qname: attr.qname, prefix: parts.prefix, localName: parts.localName, ns, value: attr.value };
    });
    const node = {
      type: 'element',
      qname,
      prefix: elemParts.prefix,
      localName: elemParts.localName,
      ns: elemNs,
      attrs,
      children: [],
    };
    appendNode(node, i);
    if (!selfClosing) stack.push({ node, scope });
    i = j;
  }
  if (stack.length) fail(`unclosed element <${stack[stack.length - 1].node.qname}>`, len);
  if (!root) fail('no document element', 0);
  return root;
}

function escapeText(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#xD;');
}

function escapeAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
    .replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;').replace(/\r/g, '&#xD;');
}

// 序列化：屬性順序與內容原樣保留，僅做 XML 序列化正規化（SPEC 第 4 節允許）。
export function serializeXml(node) {
  switch (node.type) {
    case 'text': return escapeText(node.value);
    case 'cdata': return escapeText(node.value);
    case 'comment': return `<!--${node.value}-->`;
    case 'pi': return node.value ? `<?${node.target} ${node.value}?>` : `<?${node.target}?>`;
    case 'element': {
      const attrs = node.attrs.map((a) => ` ${a.qname}="${escapeAttr(a.value)}"`).join('');
      if (!node.children.length) return `<${node.qname}${attrs}/>`;
      return `<${node.qname}${attrs}>${node.children.map(serializeXml).join('')}</${node.qname}>`;
    }
    default: throw new Error(`unknown node type ${node.type}`);
  }
}
