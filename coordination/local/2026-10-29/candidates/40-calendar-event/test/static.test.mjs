import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { messages } from '../public/js/i18n.mjs';
import { auditText } from '../scripts/check.mjs';

// Deliberately a static tag reader, not a DOM or browser rendering substitute.
function tags(html) {
  return [...html.matchAll(/<([a-z][\w-]*)\b([^<>]*)>/gi)].map(match => ({
    name: match[1].toLowerCase(), raw: match[2],
    attrs: Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]])),
  }));
}
const expected = [
  { path: '../public/index.html', lang: 'zh-Hant', home: 'https://glossquote.com/index.html', title: '行事曆檔產生器：活動時間轉 ICS｜GlossQuote Labs', h1: '把活動時間做成行事曆檔', description: '輸入單次活動、日期與時區，在瀏覽器產生 ICS 行事曆檔。支援全天活動與夏令時間檢查，不需登入。' },
  { path: '../public/en/index.html', lang: 'en', home: 'https://glossquote.com/en/index.html', title: 'Calendar Event to ICS File | GlossQuote Labs', h1: 'Turn event details into a calendar file', description: 'Create an ICS file for one event with dates and a time zone. Preview timed or all-day events locally, with daylight-saving checks and no sign-in.' },
];
const zoneIds = ['UTC', 'Asia/Taipei', 'Asia/Tokyo', 'Asia/Hong_Kong', 'Asia/Singapore', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Australia/Sydney'];

for (const spec of expected) test(`Static structure only: ${spec.lang} complete metadata, labels, empty defaults, links, bounded controls`, async () => {
  const html = await readFile(new URL(spec.path, import.meta.url), 'utf8'); const parsed = tags(html);
  const identified = parsed.filter(t => t.attrs.id); const ids = identified.map(t => t.attrs.id); assert.equal(new Set(ids).size, ids.length);
  const find = id => identified.find(t => t.attrs.id === id);
  assert.equal(parsed.find(t => t.name === 'html').attrs.lang, spec.lang);
  assert.equal(html.match(/<title>([^<]*)<\/title>/)[1], spec.title);
  assert.equal(html.match(/<h1>([^<]*)<\/h1>/)[1], spec.h1); assert.equal(parsed.filter(t => t.name === 'h1').length, 1);
  assert.equal(parsed.find(t => t.name === 'meta' && t.attrs.name === 'description').attrs.content, spec.description);
  assert.equal(parsed.find(t => t.name === 'meta' && t.attrs.name === 'robots').attrs.content, 'noindex, nofollow');
  assert.equal(parsed.some(t => t.name === 'link' && ['canonical', 'alternate'].includes(t.attrs.rel)), false);
  const homes = parsed.filter(t => t.name === 'a' && t.attrs.href?.startsWith('https:')); assert.equal(homes.length, 3); homes.forEach(t => assert.equal(t.attrs.href, spec.home));
  assert.ok(/\bdisabled\b/.test(find('app-controls').raw)); assert.ok(/\bhidden\b/.test(find('all-day-fields').raw)); assert.ok(/\bdisabled\b/.test(find('all-day-fields').raw));
  assert.ok(/\bchecked\b/.test(find('mode-timed').raw)); assert.equal(find('download').attrs.href, undefined); assert.equal(find('download').attrs['aria-disabled'], 'true');
  for (const control of parsed.filter(t => ['input', 'select', 'textarea'].includes(t.name))) {
    if (control.attrs.type === 'radio') continue;
    assert.ok(parsed.some(t => t.name === 'label' && t.attrs.for === control.attrs.id), control.attrs.id);
    assert.equal(control.attrs.value, undefined, control.attrs.id);
    for (const id of (control.attrs['aria-describedby'] ?? '').split(' ').filter(Boolean)) assert.ok(ids.includes(id), id);
  }
  assert.equal(find('event-form').attrs.autocomplete, 'off'); assert.equal(find('title').attrs.maxlength, '240');
  assert.equal(find('location').attrs.maxlength, '400'); assert.equal(find('notes').attrs.maxlength, '8000');
  const options = parsed.filter(t => t.name === 'option'); assert.deepEqual(options.map(t => t.attrs.value), zoneIds);
  assert.equal(options.find(t => /\bselected\b/.test(t.raw)).attrs.value, 'Asia/Taipei');
  assert.equal(parsed.filter(t => t.name === 'h3').length, 4);
  assert.ok(/role="status" aria-live="polite" aria-atomic="true"/.test(html));
  auditText(spec.lang === 'en' ? 'en/index.html' : 'index.html', html);
});

test('Both dictionaries supply the same complete fixed error/status/field/zone keys', () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages['zh-Hant']).sort());
  for (const child of ['errors', 'fields', 'cities']) assert.deepEqual(Object.keys(messages.en[child]).sort(), Object.keys(messages['zh-Hant'][child]).sort());
  assert.deepEqual(Object.keys(messages.en.cities).sort(), [...zoneIds].sort());
  for (const dictionary of Object.values(messages)) for (const value of Object.values(dictionary.errors)) assert.ok(typeof value === 'string' && value.length > 0);
});
test('Static guard rejects source mutations, external resources, unsafe APIs and preview canonical claims', async () => {
  const source = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const mutated of [source.replace('noindex, nofollow', 'index, follow'), source.replace('/js/app.mjs', 'https://invalid.example/a.js'), source.replace('/styles/app.css', '//invalid.example/a.css'),
    source.replace('</head>', '<link rel="canonical" href="https://calendar.glossquote.com/">\n</head>'), source.replace('<input id="title"', '<input onclick="alert(1)" id="title"'),
    source.replace('</head>', '<script>1</script></head>')]) assert.throws(() => auditText('index.html', mutated));
  for (const snippet of ['fetch("/fake")', 'localStorage.setItem("x", "y")', 'element.innerHTML = text', 'console.log(text)', 'navigator.clipboard.writeText(text)', 'import("https://invalid.example/a.js")', 'import x from "https://invalid.example/x.mjs"']) assert.throws(() => auditText('js/app.mjs', snippet));
  assert.throws(() => auditText('styles/app.css', '@import "https://invalid.example/font.css";'));
  assert.throws(() => auditText('js/core/date.mjs', 'window.value = 1;'));
});
test('Static styling prerequisites and independently computed contrast (rendering remains NOT_RUN)', async () => {
  const css = await readFile(new URL('../public/styles/app.css', import.meta.url), 'utf8');
  for (const required of ['@media (min-width: 48rem)', '@media (min-width: 75rem)', 'prefers-reduced-motion', ':focus-visible', 'min-height: 44px', '[hidden]', 'minmax(0,', 'overflow-x: auto']) assert.ok(css.includes(required), required);
  function luminance(hex) {
    const channels = hex.match(/\w\w/g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  }
  for (const [front, back, minimum] of [['111410', 'f3f0e8', 4.5], ['55594f', 'f3f0e8', 4.5], ['55594f', 'ffffff', 4.5], ['111410', 'c8f56a', 4.5], ['245c16', 'ffffff', 4.5], ['713f00', 'fff0d5', 4.5], ['8f2119', 'ffe6e1', 4.5], ['60645c', 'ffffff', 3], ['60645c', 'f3f0e8', 3]]) {
    const values = [luminance(front), luminance(back)].sort((a, b) => a - b); assert.ok((values[1] + .05) / (values[0] + .05) >= minimum);
  }
});
