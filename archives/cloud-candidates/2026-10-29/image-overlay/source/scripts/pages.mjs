// HTML 只由受控雙語字典產生；所有插值仍做文字與屬性轉義。
import { locales } from '../public/js/locales.mjs';
export const escapeHTML = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
export function page(language) {
  const l = locales[language], e = escapeHTML, base = language === 'en' ? '../' : './';
  const file = (id, text) => `<label class="file-card" for="${id}"><strong>${e(text)}</strong><input id="${id}" type="file" accept="image/png,image/jpeg" aria-describedby="limits ${id}-meta"><span id="${id}-meta" class="file-meta">${e(l.empty)}</span></label>`;
  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="description" content="${e(l.description)}">
  <meta name="referrer" content="no-referrer">
  <title>${e(l.title)} · GlossQuote</title>
  <link rel="stylesheet" href="${base}styles/app.css">
  <script type="module" src="${base}js/app.mjs"></script>
</head>
<body>
  <header class="site-header"><a href="https://glossquote.com/${language === 'en' ? 'en/' : ''}index.html">${e(l.home)}</a><a id="language-link" href="${language === 'en' ? '../index.html' : './en/index.html'}" lang="${language === 'en' ? 'zh-Hant' : 'en'}">${e(l.switch)}</a></header>
  <main>
    <div class="hero"><p class="eyebrow">${e(l.eyebrow)}</p><h1>${e(l.title)}</h1><p class="intro">${e(l.intro)}</p><p class="privacy">${e(l.privacy)}</p></div>
    <noscript><p class="notice">${e(l.noScript)}</p></noscript>
    <section class="panel" aria-labelledby="choose-heading"><h2 id="choose-heading">${e(l.choose)}</h2><p id="limits" class="muted">${e(l.limits)}</p><div class="file-grid">${file('before', l.before)}${file('after', l.after)}</div></section>
    <section class="panel" aria-labelledby="adjust-heading"><h2 id="adjust-heading">${e(l.adjust)}</h2><fieldset id="settings"><legend>${e(l.mode)}</legend><div class="mode-row"><label><input type="radio" name="mode" value="overlay" checked> ${e(l.overlay)}</label><label><input type="radio" name="mode" value="difference"> ${e(l.difference)}</label></div><div class="opacity-label"><label for="opacity">${e(l.opacity)}</label><output id="opacity-value" for="opacity">50%</output></div><input id="opacity" type="range" min="0" max="100" step="1" value="50" aria-describedby="opacity-help"><p id="opacity-help" class="muted">${e(l.opacityHelp)}</p></fieldset><div class="actions"><button id="generate" type="button" disabled>${e(l.generate)}</button><button id="cancel" type="button" class="secondary" disabled>${e(l.cancel)}</button><button id="clear" type="button" class="quiet">${e(l.clear)}</button></div><p id="status" role="status" aria-live="polite" aria-atomic="true">${e(l.states.idle)}</p></section>
    <section id="result" class="panel result-panel" aria-labelledby="result-heading" aria-busy="false"><div class="result-heading"><h2 id="result-heading">${e(l.resultTitle)}</h2><label class="view-control"><input id="actual-size" type="checkbox"> ${e(l.actual)}</label></div><p id="empty-result" class="empty-result">${e(l.emptyResult)}</p><div id="canvas-wrap" class="canvas-wrap" tabindex="0" role="region" aria-label="${e(l.resultAlt)}" hidden><canvas id="preview" width="1" height="1" role="img" aria-label="${e(l.resultAlt)}">${e(l.resultAlt)}</canvas></div><p id="result-info" class="muted" hidden></p></section>
    <details class="help" open><summary>${e(l.methodTitle)}</summary><p>${e(l.method)}</p><p>${e(l.caveat)}</p><p>${e(l.cancelHelp)}</p></details>
  </main>
  <footer>${e(l.candidate)}</footer>
</body>
</html>
`;
}
