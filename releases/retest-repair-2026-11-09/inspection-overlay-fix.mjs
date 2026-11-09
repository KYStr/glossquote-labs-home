import assert from 'node:assert/strict';

const slug = 'fluid-typography';
const origin = 'https://fluid-typography.glossquote.com';
const pages = {
  'index.html': {
    lang: 'zh-Hant',
    originalLink: '<a id="language" href="en/" lang="en" hreflang="en">English</a>',
  },
  'en/index.html': {
    lang: 'en',
    originalLink: '<a id="language" href="../" lang="zh-Hant" hreflang="zh-Hant">繁體中文</a>',
  },
};
const noticeLinks = new Map([
  ['zh-Hant', ' · <a lang="en" href="/en/index.html">English</a>'],
  ['en', ' · <a lang="zh-Hant" href="/index.html">繁體中文</a>'],
]);
const noticePattern = /<aside class="gq-inspection-notice" lang="(zh-Hant|en)" aria-label="[^"]+"><p>[^<]*<\/p><nav>[^]*?<\/nav><\/aside>/gu;

function countExact(text, value) {
  return text.split(value).length - 1;
}

// Migrate an already-rendered inspection artifact. A changed input shape must
// be reviewed before retrying; there is no generic language-link removal.
export function removeFluidLanguageLinks(html, { slug: siteSlug }) {
  if (siteSlug !== slug) return html;
  assert.equal(typeof html, 'string');
  const canonicalMatches = Object.keys(pages).filter(pagePath =>
    html.includes('<link rel="canonical" href="' + origin + '/' + pagePath + '">'));
  assert.equal(canonicalMatches.length, 1, 'Expected a Fluid Typography locale canonical URL');
  const [pagePath] = canonicalMatches;
  const { lang, originalLink } = pages[pagePath];
  assert.equal(countExact(html, '<html lang="' + lang + '">'), 1, 'Unexpected page language');
  assert.equal(countExact(html, '<link rel="canonical" href="' + origin + '/' + pagePath + '">'), 1,
    'Unexpected canonical URL');
  assert.equal(countExact(html, 'id="language"'), 1, 'Expected exactly one original language control');
  assert.equal(countExact(html, originalLink), 1, 'Unexpected original language control');

  const notices = [...html.matchAll(noticePattern)];
  assert.equal(countExact(html, '<aside class="gq-inspection-notice"'), 2, 'Expected both notice asides');
  assert.deepEqual(notices.map(notice => notice[1]), ['zh-Hant', 'en'], 'Unexpected notice locale pair');
  assert(html.includes('<body>' + notices[0][0] + notices[1][0]), 'Unexpected notice placement');
  const linkCount = notices.map(([notice, noticeLang]) => {
    const link = noticeLinks.get(noticeLang);
    const count = countExact(notice, link);
    assert(count <= 1 && count === countExact(html, link), 'Unexpected language link count');
    assert.equal(countExact(notice, '<a '), 2 + count, 'Unexpected notice anchors');
    if (count === 1) {
      assert(notice.endsWith(link + '</nav></aside>'), 'Unexpected notice language link placement');
    }
    return count;
  });
  if (linkCount.every(count => count === 0)) {
    return html;
  }
  assert.deepEqual(linkCount, [1, 1], 'Both notice language links must be present before removal');

  return html.replace(noticePattern, (notice, lang) => notice.replace(noticeLinks.get(lang), ''));
}
