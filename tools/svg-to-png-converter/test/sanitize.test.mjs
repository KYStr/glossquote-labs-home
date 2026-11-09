// SPEC 第 4 節淨化契約：F6 字面計數、逐項禁止元素/屬性/參照類別、style 規則、良性文件零移除。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseXml, serializeXml } from '../public/js/core/xml.mjs';
import { sanitizeDocument, cleanCssText, isAllowedReference, BANNED_ELEMENTS } from '../public/js/core/sanitize.mjs';
import { removalSummary } from '../public/js/core/strings.mjs';

const NS = 'xmlns="http://www.w3.org/2000/svg"';
function clean(svg) {
  const parsed = parseXml(svg);
  assert.equal(parsed.ok, true, parsed.ok ? '' : parsed.error.message);
  const counts = sanitizeDocument(parsed.root);
  return { counts, serialized: serializeXml(parsed.root) };
}

test('F6: script 元素 + onclick 屬性 + https 參照 → 恰移除 3 項，逐項相符', () => {
  const { counts, serialized } = clean(
    `<svg ${NS} viewBox="0 0 24 24"><script>alert(1)</script>`
    + '<rect width="24" height="24" onclick="evil()"/>'
    + '<image href="https://example.com/x.png" width="24" height="24"/></svg>',
  );
  assert.equal(counts.total, 3);
  assert.deepEqual(counts.elements, [{ name: 'script', count: 1 }]);
  assert.equal(counts.eventAttributes, 1);
  assert.equal(counts.references, 1);
  assert.equal(counts.styleItems, 0);
  // SPEC 第 3 節英文摘要句型逐字相符。
  assert.equal(removalSummary('en', counts),
    'removed 3 items: 1 script element, 1 event-handler attribute, 1 external reference');
  assert.equal(removalSummary('zh', counts), '已移除 3 個項目：1 個 script 元素、1 個事件處理屬性、1 個外部參照');
  assert.ok(!serialized.includes('script'));
  assert.ok(!serialized.includes('onclick'));
  assert.ok(!serialized.includes('example.com'));
  assert.ok(serialized.includes('<image')); // 元素保留，只移除 href
});

test('每個禁止元素都被移除並計 1（含子樹只計 1）', () => {
  for (const name of BANNED_ELEMENTS) {
    const { counts, serialized } = clean(`<svg ${NS} viewBox="0 0 10 10"><${name}><rect width="1" height="1"/></${name}><circle r="2"/></svg>`);
    assert.equal(counts.total, 1, name);
    assert.deepEqual(counts.elements, [{ name, count: 1 }], name);
    assert.ok(!serialized.includes(`<${name}`), name);
    assert.ok(serialized.includes('<circle'), name);
  }
});

test('XHTML 名稱空間元素一律移除', () => {
  const { counts, serialized } = clean(
    `<svg ${NS} viewBox="0 0 10 10"><x:div xmlns:x="http://www.w3.org/1999/xhtml"><x:p>hi</x:p></x:div><rect width="1" height="1"/></svg>`,
  );
  assert.equal(counts.total, 1);
  assert.deepEqual(counts.elements, [{ name: 'div', count: 1 }]);
  assert.ok(!serialized.includes('div'));
});

test('on* 屬性（含大小寫混合與根元素）移除；非 on 開頭保留', () => {
  const { counts, serialized } = clean(
    `<svg ${NS} viewBox="0 0 10 10" onload="boot()"><rect width="1" height="1" ONCLICK="x()" data-on="keep"/></svg>`,
  );
  assert.equal(counts.eventAttributes, 2);
  assert.equal(counts.total, 2);
  assert.ok(!serialized.toLowerCase().includes('onclick'));
  assert.ok(!serialized.includes('onload'));
  assert.ok(serialized.includes('data-on="keep"'));
});

test('href 允許清單：fragment 與四種 raster data 可留，其餘移除', () => {
  const cases = [
    ['#frag', true],
    ['  #frag  ', true],
    ['data:image/png;base64,AAAA', true],
    ['data:image/jpeg;base64,AAAA', true],
    ['data:image/gif;base64,AAAA', true],
    ['data:image/webp;base64,AAAA', true],
    ['data:image/svg+xml;base64,AAAA', false],
    ['data:image/pngx;base64,AAAA', false],
    ['https://example.com/x.png', false],
    ['http://example.com/x.png', false],
    ['javascript:alert(1)', false],
    ['x.png', false],
    ['//example.com/x.png', false],
  ];
  for (const [value, allowed] of cases) {
    assert.equal(isAllowedReference(value), allowed, value);
    const { counts } = clean(`<svg ${NS} viewBox="0 0 10 10"><image href="${value}" width="1" height="1"/></svg>`);
    assert.equal(counts.references, allowed ? 0 : 1, value);
    assert.equal(counts.total, allowed ? 0 : 1, value);
  }
});

test('xlink:href 同受允許清單約束', () => {
  const { counts, serialized } = clean(
    `<svg ${NS} viewBox="0 0 10 10"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="https://example.com/a.svg#x"/></svg>`,
  );
  assert.equal(counts.references, 1);
  assert.ok(!serialized.includes('example.com'));
  const ok = clean(
    `<svg ${NS} viewBox="0 0 10 10"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#shape"/></svg>`,
  );
  assert.equal(ok.counts.total, 0);
});

test('style 元素：@import 移除計 1；外部 url() 宣告移除計 1；fragment url 保留', () => {
  const { counts, serialized } = clean(
    `<svg ${NS} viewBox="0 0 10 10"><style>@import url("https://example.com/x.css"); .a { fill: url(https://example.com/y.png); stroke: #000; background: url(#grad); }</style><rect class="a" width="1" height="1"/></svg>`,
  );
  assert.equal(counts.styleItems, 2);
  assert.equal(counts.total, 2);
  assert.ok(!serialized.includes('example.com'));
  assert.ok(serialized.includes('stroke: #000'));
  assert.ok(serialized.includes('url(#grad)'));
});

test('style 屬性：外部 url() 宣告移除；data url 宣告保留且不誤傷前後宣告', () => {
  const { counts, serialized } = clean(
    `<svg ${NS} viewBox="0 0 10 10"><rect width="1" height="1" style="fill: url(data:image/png;base64,AAAA); stroke: url(https://example.com/z.png); opacity: 0.5"/></svg>`,
  );
  assert.equal(counts.styleItems, 1);
  assert.equal(counts.total, 1);
  assert.ok(serialized.includes('url(data:image/png;base64,AAAA)'));
  assert.ok(serialized.includes('opacity: 0.5'));
  assert.ok(!serialized.includes('example.com'));
});

test('cleanCssText: @import 字串形式與 url 形式各計 1', () => {
  assert.deepEqual(cleanCssText('@import "a.css"; .x { fill: red; }').removed, 1);
  assert.equal(cleanCssText('.x { fill: red; }').removed, 0);
});

test('良性文件（漸層 fragment、use、text）零移除，序列化穩定', () => {
  const benign = `<svg ${NS} width="10" height="10" viewBox="0 0 10 10"><defs><linearGradient id="g"><stop offset="0" stop-color="#ffffff"/></linearGradient></defs><rect width="10" height="10" fill="url(#g)"/><use href="#g"/><text x="1" y="5">Hi</text></svg>`;
  const first = clean(benign);
  assert.equal(first.counts.total, 0);
  const second = clean(first.serialized);
  assert.equal(second.counts.total, 0);
  assert.equal(second.serialized, first.serialized);
});
