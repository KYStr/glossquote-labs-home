import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processInput } from '../public/js/core/process.mjs';
import { parseXml, SVG_NS } from '../public/js/core/xml.mjs';
import { removalSummary } from '../public/js/core/strings.mjs';

const XLINK = 'http://www.w3.org/1999/xlink';
const CANARY = 'https://outside.invalid/asset';
const wrap = (body, root = '') => `<svg xmlns="${SVG_NS}" width="20" height="20" ${root}>${body}</svg>`;
const paste = text => processInput(text, { size: text.length, capUnit: 'chars' });
const clean = text => {
  const result = paste(text);
  assert.equal(result.status, 'ok', JSON.stringify(result.error));
  const parsed = parseXml(result.serialized);
  assert.equal(parsed.ok, true, JSON.stringify(parsed.error));
  return { ...result, root: parsed.root };
};

test('F6 removes a script, handler and external image reference with a bilingual count', () => {
  const { counts, serialized } = clean(wrap(
    `<script>alert(1)</script><rect width="20" height="20" onclick="evil()"/><image href="${CANARY}"/>`,
  ));
  assert.equal(counts.total, 3);
  assert.deepEqual(counts.elements, [{ name: 'script', count: 1 }]);
  assert.equal(counts.eventAttributes, 1);
  assert.equal(counts.references, 1);
  assert.equal(counts.styleItems, 0);
  assert.equal(removalSummary('en', counts), 'removed 3 items: 1 script element, 1 event-handler attribute, 1 unsafe or unsupported reference');
  assert.equal(removalSummary('zh', counts), '已移除 3 個項目：1 個 script 元素、1 個事件處理屬性、1 個不安全或不支援的參照');
  assert.doesNotMatch(serialized, /script|onclick|outside\.invalid/);
  assert.match(serialized, /<image\/>/);
});

test('all stylesheet bodies are omitted, including escaped, commented and malformed imports', () => {
  const cases = [
    `@import "${CANARY}.css"; rect { fill: red }`,
    String.raw`@im\70 ort "${CANARY}.css"; rect { fill: red }`,
    `@import/**/url("${CANARY}.css"); rect { fill: red }`,
    `@import url("${CANARY}.css"; rect { fill: red`,
    `@font-face{font-family:x;src:url("${CANARY}.woff2")}`,
    'rect { fill: red }',
  ];
  for (const css of cases) {
    const { counts, root, serialized } = clean(wrap(`<style><![CDATA[${css}]]></style><rect width="2"/>`));
    assert.equal(counts.styleItems, 1, css);
    assert.deepEqual(root.children.map(child => child.localName), ['rect'], css);
    assert.doesNotMatch(serialized, /outside\.invalid/, css);
    assert.match(removalSummary('en', counts), /unsupported style item/);
    assert.match(removalSummary('zh', counts), /不支援的樣式項目/);
  }
});

test('inline CSS rebuilds only known declarations and cannot keep resource indirection', () => {
  const malformed = [
    String.raw`fill:u\72l(${CANARY});`,
    String.raw`f\69ll:url(${CANARY});`,
    `fill:u/**/rl(${CANARY});`,
    `fill:url(&quot;${CANARY};`,
    `fill:url(/*foo*/${CANARY});`,
    '/*;fill:red;*/',
    'fill: url(#gradient));',
  ];
  for (const css of malformed) {
    const { counts, root, serialized } = clean(wrap(`<rect style="${css}stroke: #000; opacity: 0.5"/>`));
    assert.equal(counts.styleItems, 1, css);
    assert.deepEqual(root.children[0].attrs, [], css);
    assert.doesNotMatch(serialized, /outside\.invalid/, css);
  }
  const cases = [
    `fill:&quot;${CANARY}&quot;;`,
    'fill:&quot;odd;fill:red;word&quot;;',
    `fill:image-set(url(${CANARY}) 1x);`,
    `fill:image-set(&quot;${CANARY}&quot; 1x);`,
    `--asset:url(${CANARY}); fill:var(--asset);`,
    `fill:url(&#104;ttps://outside.invalid/asset);`,
    `fill:url(#gradient) url(${CANARY});`,
    `background:url(${CANARY});`,
  ];
  for (const css of cases) {
    const { counts, root, serialized } = clean(wrap(`<rect style="${css}stroke: #000; opacity: 0.5"/>`));
    assert.ok(counts.styleItems > 0, css);
    assert.equal(root.children[0].attrs.find(attr => attr.qname === 'style').value, 'stroke: #000; opacity: 0.5', css);
    assert.doesNotMatch(serialized, /outside\.invalid/, css);
  }
});

test('presentation attributes retain only plain colors or vetted local fragments', () => {
  for (const name of ['fill', 'stroke', 'filter', 'clip-path', 'mask', 'marker-start', 'marker-mid', 'marker-end', 'cursor']) {
    for (const value of [`url(${CANARY}#id)`, String.raw`u\72l(${CANARY})`, `url(${CANARY}) red`, 'var(--paint)']) {
      const { counts, root, serialized } = clean(wrap(`<path d="M0 0L10 10" ${name}="${value}"/>`));
      assert.equal(counts.references, 1, name);
      assert.deepEqual(root.children[0].attrs.map(attr => attr.qname), ['d'], name);
      assert.doesNotMatch(serialized, /outside\.invalid/, name);
    }
  }
});

test('href, namespace aliases, xml:base and changing href after sanitation are constrained', () => {
  const input = wrap(`
    <use href="${CANARY}"/>
    <use href="/relative.svg#id"/>
    <use xlink:href="//outside.invalid/asset#id"/>
    <use e:href="#id"/>
    <foreign:rect width="2" xmlns:foreign="urn:foreign"/>
    <svg xmlns=""><rect width="2"/></svg>
    <g xml:base="${CANARY}/" resource="${CANARY}" src="${CANARY}" ONLOAD="x()">
      <use href="#id"><animate attributeName="href" values="#id;${CANARY}"/><set attributeName="xlink:href" to="${CANARY}"/></use>
      <?xml-stylesheet href="${CANARY}.css"?>
    </g>`, `xmlns:xlink="${XLINK}" xmlns:e="urn:outside"`);
  const { counts, serialized } = clean(input);
  assert.doesNotMatch(serialized, /outside\.invalid|urn:|xml:base|animate|<set|xml-stylesheet|ONLOAD|src=|resource=/);
  assert.match(serialized, /<use href="#id"\/>/);
  assert.equal(counts.references, 4);
  assert.equal(counts.eventAttributes, 1);
  assert.equal(counts.unsupportedItems, 5);
  assert.deepEqual(counts.elements.map(entry => entry.name), ['rect', 'svg', 'animate', 'set']);
});

test('accepted SVG namespace aliases canonicalize without letting unsupported attrs or contents survive', () => {
  const original = `<s:svg xmlns:s="${SVG_NS}" xmlns:l="${XLINK}" width="20" height="20">
    <s:defs><s:linearGradient id="g"><s:stop offset="0" stop-color="#fff"/></s:linearGradient>
      <s:clipPath id="clip"><s:circle r="8"/></s:clipPath>
      <s:mask id="mask"><s:rect width="20" height="20" fill="white"/></s:mask>
      <s:path id="shape" d="M0,0 L20,0 L20,20 z"/></s:defs>
    <s:rect width="20" height="20" fill="url(#g)" clip-path="url(&quot;#clip&quot;)" mask="url('#mask')" style="stroke: rgb(0, 0, 0); fill: url(#g)"/>
    <s:use l:href="#shape" x="2" y="3"/>
    <s:text x="2" y="10" xml:space="preserve">Hi &lt;script&gt;</s:text>
  </s:svg>`;
  const first = clean(original);
  assert.equal(first.counts.total, 0);
  assert.match(first.serialized, /<svg xmlns="/);
  assert.match(first.serialized, /xlink:href="#shape"/);
  assert.match(first.serialized, /fill="url\(#g\)"/);
  assert.match(first.serialized, /clip-path="url\(&quot;#clip&quot;\)"/);
  assert.match(first.serialized, /mask="url\('#mask'\)"/);
  assert.match(first.serialized, /style="stroke: rgb\(0, 0, 0\); fill: url\(#g\)"/);
  assert.match(first.serialized, /Hi &lt;script&gt;/);
  assert.equal(clean(first.serialized).serialized, first.serialized);
});

test('image data allows matching raster signatures and rejects active, spoofed, external and misplaced URLs', () => {
  const raster = [
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/n2sAAAAASUVORK5CYII=',
    'data:image/jpeg;base64,/9j/2Q==',
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==',
  ];
  for (const url of raster) {
    const { counts, serialized } = clean(wrap(`<image width="1" height="1" href="${url}"/>`));
    assert.equal(counts.total, 0, url);
    assert.ok(serialized.includes(url), url);
  }
  for (const url of [CANARY, '#shape', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,PHN2Zz4=',
    'data:image/png;base64,iVBORw0KGgo===', 'data:image/png,AAAA', 'data:image/pngx;base64,iVBORw0KGgo=',
    'data:image/jpeg;base64,iVBORw0KGgo=']) {
    const { counts, serialized } = clean(wrap(`<image href="${url}"/>`));
    assert.equal(counts.references, 1, url);
    assert.ok(!serialized.includes(url), url);
  }
  assert.equal(clean(wrap(`<use href="${raster[0]}"/>`)).counts.references, 1);
});

test('external DTDs and processing instructions cannot be serialized and very deep input stays bounded', () => {
  const external = `<?xml-stylesheet href="${CANARY}.css"?><!DOCTYPE svg SYSTEM "${CANARY}.dtd">`;
  assert.doesNotMatch(clean(external + wrap('<rect/>')).serialized, /outside\.invalid|DOCTYPE|xml-stylesheet/);
  const result = clean(wrap('<g>'.repeat(5000) + '<rect/>' + '</g>'.repeat(5000)));
  assert.deepEqual(result.counts.elements, [{ name: 'g', count: 1 }]);
  assert.doesNotMatch(result.serialized, /<rect/);
});
