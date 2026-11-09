import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, requireNode24 } from './assets.mjs';
import { COPY } from '../public/js/strings.mjs';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function renderPage(language) {
  const t = COPY[language];
  const en = language === 'en';
  const prefix = en ? '..' : '.';
  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <title>${escape(t.title)}</title>
  <meta name="description" content="${escape(t.description)}">
  <link rel="stylesheet" href="${prefix}/styles/app.css">
  <script type="module" src="${prefix}/js/app.js"></script>
</head>
<body>
  <a class="skip-link" href="#workspace">${escape(t.skip)}</a>
  <header class="topbar">
    <a class="family" href="https://glossquote.com/${en ? 'en/' : ''}index.html">Gloss Tools <span>by GlossQuote</span></a>
    <span class="product-name">${escape(t.name)}</span>
    <nav aria-label="${en ? 'Language and data' : '語言與資料'}"><a href="${en ? '../index.html' : './en/index.html'}" hreflang="${en ? 'zh-Hant' : 'en'}" lang="${en ? 'zh-Hant' : 'en'}">${escape(t.language)}</a><button id="reset" type="button" class="quiet">${escape(t.reset)}</button></nav>
  </header>
  <div class="work-shell">
    <nav class="step-nav" aria-label="${escape(t.stepNav)}">
      <a href="#source-section">${escape(t.sourceTitle)}</a>
      <a href="#template-section">${escape(t.templateTitle)}</a>
      <a href="#review-section">${escape(t.reviewTitle)}</a>
      <a href="#preview-section">${escape(t.previewTitle)}</a>
      <p>${escape(t.languageHint)}</p>
    </nav>
    <main id="workspace" tabindex="-1">
      <div class="page-heading"><h1>${escape(t.h1)}</h1><p>${escape(t.intro)}</p></div>
      <noscript><p class="notice warning">${escape(t.noscript)}</p></noscript>
      <section id="source-section" aria-labelledby="source-heading">
        <div class="section-heading"><h2 id="source-heading">${escape(t.sourceTitle)}</h2><button type="button" id="sample">${escape(t.sample)}</button></div>
        <p class="help">${escape(t.sampleHelp)}</p>
        <label for="csv">${escape(t.sourceLabel)}</label>
        <p id="source-help" class="help">${escape(t.sourceHelp)}</p>
        <textarea id="csv" rows="5" spellcheck="false" autocomplete="off" autocapitalize="off" aria-describedby="source-help source-status validation-error" placeholder="${escape(t.sourcePlaceholder)}"></textarea>
        <div class="file-field"><label for="csv-file">${escape(t.fileLabel)}</label><input type="file" id="csv-file" accept=".csv,text/csv" aria-describedby="file-help source-status validation-error"><p id="file-help" class="help">${escape(t.fileHelp)}</p></div>
        <p id="source-status" class="source-status"></p>
        <button id="reuse-paste" type="button" hidden>${escape(t.reusePaste)}</button>
      </section>
      <section id="template-section" aria-labelledby="template-heading">
        <h2 id="template-heading">${escape(t.templateTitle)}</h2>
        <div class="label-row"><label for="template">${escape(t.templateLabel)}</label><span id="template-count" class="count">0 / 32,768</span></div>
        <p id="template-help" class="help">${escape(t.templateHelp)}</p>
        <textarea id="template" rows="8" spellcheck="false" autocomplete="off" autocapitalize="off" aria-describedby="template-help template-count validation-error" placeholder="${escape(t.templatePlaceholder)}"></textarea>
        <details class="field-inspector"><summary>${escape(t.fieldTitle)}</summary><p class="help">${escape(t.fieldHint)}</p><ul id="fields" class="field-list"><li>${escape(t.fieldEmpty)}</li></ul></details>
      </section>
      <section id="review-section" aria-labelledby="review-heading">
        <h2 id="review-heading">${escape(t.reviewTitle)}</h2>
        <div class="check-field"><input id="allow-blank" type="checkbox" aria-describedby="allow-help blank-warning"><label for="allow-blank">${escape(t.allowBlank)}</label></div>
        <p id="allow-help" class="help">${escape(t.allowHelp)}</p>
        <p id="literal-warning" class="notice warning" hidden>${escape(t.literal)}</p>
        <p id="blank-warning" class="notice warning" hidden></p>
        <p id="validation-error" class="notice warning" hidden></p>
        <div id="unknown-fields" class="notice warning" hidden></div>
        <div id="missing" class="missing-summary"></div>
        <p id="stale-notice" class="notice warning" hidden>${escape(t.stale)}</p>
        <div class="action-bar"><button id="generate" type="button" class="primary" disabled>${escape(t.generateIdle)}</button><button id="cancel" type="button" hidden>${escape(t.cancel)}</button></div>
        <p id="status" class="notice" role="status" aria-live="polite" aria-atomic="true">${escape(t.idle)}</p>
      </section>
      <section id="preview-section" class="preview-section" aria-labelledby="preview-heading">
        <h2 id="preview-heading">${escape(t.previewTitle)}</h2>
        <p id="preview-empty" class="empty-state">${escape(t.previewEmpty)}</p>
        <div id="preview-content" hidden>
          <div class="preview-toolbar"><p id="row-label" aria-live="polite"></p><div class="row-navigation"><button id="previous" type="button" disabled>${escape(t.previous)}</button><button id="next" type="button" disabled>${escape(t.next)}</button></div></div>
          <div class="jump-control"><label for="row-number">${escape(t.jumpLabel)}</label><input id="row-number" type="number" inputmode="numeric" min="1" max="1" step="1" disabled><button id="jump" type="button" disabled>${escape(t.jump)}</button></div>
          <pre id="preview" tabindex="0" aria-labelledby="preview-heading row-label"></pre>
          <p id="blank-record" class="notice warning" hidden></p>
          <div class="action-bar"><button id="copy" type="button" disabled>${escape(t.copy)}</button><a id="download-txt" class="button" hidden>${escape(t.txt)}</a><a id="download-json" class="button" hidden>${escape(t.json)}</a></div>
          <p id="copy-status" role="status" aria-live="polite"></p>
          <div id="copy-fallback" hidden><label for="copy-text">${escape(t.copyFallbackLabel)}</label><textarea id="copy-text" rows="6" readonly spellcheck="false" aria-describedby="copy-status"></textarea><button id="select-text" type="button">${escape(t.selectText)}</button></div>
          <p id="export-size" class="help"></p>
          <p class="help">${escape(t.outputNote)}</p>
        </div>
      </section>
      <aside class="privacy" aria-labelledby="privacy-heading"><h2 id="privacy-heading">${escape(t.privacyTitle)}</h2><p>${escape(t.privacy)}</p></aside>
      <details class="format-help"><summary>${escape(t.limitsTitle)}</summary><p>${escape(t.limits)}</p></details>
      <section class="faq" aria-labelledby="faq-heading"><h2 id="faq-heading">${escape(t.faqTitle)}</h2>${t.faqs.map(([q, a]) => `<details><summary>${escape(q)}</summary><p>${escape(a)}</p></details>`).join('\n')}</section>
      <footer><span>${escape(t.footer)}</span><a href="https://glossquote.com/${en ? 'en/' : ''}index.html">${escape(t.home)}</a></footer>
    </main>
  </div>
</body>
</html>
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  requireNode24();
  if (process.argv[2] !== '--write') throw new Error('Use --write to materialize both static pages.');
  await mkdir(path.join(ROOT, 'public/en'), { recursive: true });
  for (const [language, file] of [['zh-Hant', 'index.html'], ['en', 'en/index.html']]) await writeFile(path.join(ROOT, 'public', file), renderPage(language));
  process.stdout.write('Wrote complete zh-Hant and en static pages.\n');
}
