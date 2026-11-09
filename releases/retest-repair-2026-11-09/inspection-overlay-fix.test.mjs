import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { removeFluidLanguageLinks } from './inspection-overlay-fix.mjs';

const fixture = page => fs.readFileSync(new URL(
  'baseline-release/assets/__sites/fluid-typography/' + page, import.meta.url), 'utf8');
const options = { slug: 'fluid-typography' };
const duplicatedLinks = [
  ' · <a lang="en" href="/en/index.html">English</a>',
  ' · <a lang="zh-Hant" href="/index.html">繁體中文</a>',
];

for (const [page, homeSuffix, originalLink] of [
  ['index.html', 'index.html', '<a id="language" href="en/" lang="en" hreflang="en">English</a>'],
  ['en/index.html', 'en/index.html', '<a id="language" href="../" lang="zh-Hant" hreflang="zh-Hant">繁體中文</a>'],
]) {
  test(page + ' removes only the duplicate links from the two notices', () => {
    const before = fixture(page);
    for (const anchor of duplicatedLinks) assert.equal(before.split(anchor).length, 2);
    const [head, noticesAndBody] = before.split('<body>');
    const [notices, body] = noticesAndBody.split('<header>');
    const expectedNotices = duplicatedLinks.reduce((html, anchor) => html.replace(anchor, ''), notices);
    const after = removeFluidLanguageLinks(before, options);
    assert.equal(after, head + '<body>' + expectedNotices + '<header>' + body);
    assert.equal(after.split('id="language"').length, 2);
    assert(after.includes(originalLink));
    assert(expectedNotices.includes('href="https://glossquote.com/' + homeSuffix + '"'));
    assert(expectedNotices.includes('href="https://review.glossquote.com/' + homeSuffix + '"'));
    assert(head.includes('http-equiv="Content-Security-Policy"'));
    assert.equal(removeFluidLanguageLinks(after, options), after);
  });
}

test('overlay guard leaves every other slug unchanged', () => {
  const before = fixture('index.html');
  assert.equal(removeFluidLanguageLinks(before, { slug: 'date-calculator' }), before);
});

test('overlay guard rejects partially changed notices and missing original controls', () => {
  const before = fixture('index.html');
  assert.throws(() => removeFluidLanguageLinks(before.replace(duplicatedLinks[0], ''), options),
    /both notice language links/i);
  assert.throws(() => removeFluidLanguageLinks(before.replace('id="language"', 'id="other"'), options),
    /original language control/i);
  assert.throws(() => removeFluidLanguageLinks(before.replace(duplicatedLinks[0],
    ' · <a href="/en/index.html">English</a>'), options), /notice anchors/i);
  assert.throws(() => removeFluidLanguageLinks(before.replace('/index.html">繁體中文</a>',
    '/index.html">繁體中文</a>' + duplicatedLinks[1]), options), /language link count/i);
  assert.throws(() => removeFluidLanguageLinks(before.replace(
    'https://fluid-typography.glossquote.com/index.html', 'https://example.invalid/index.html'), options),
  /canonical/i);
});
