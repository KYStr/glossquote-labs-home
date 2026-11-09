import { writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './files.mjs';
import zh from '../public/js/locales/zh-Hant.mjs';
import en from '../public/js/locales/en.mjs';

const escape = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function renderPage(locale) {
  const t = new Proxy(locale,{get:(object,key) => typeof object[key] === 'string' ? escape(object[key]) : object[key]});
  const fileField = (side,label) => `<div class="source-field"><label for="${side}-file">${label}</label><input id="${side}-file" type="file" accept="image/jpeg,image/png" aria-describedby="limits ${side}-info ${side}-error" disabled><p id="${side}-name" class="file-name">${t.noFile}</p><p id="${side}-info" class="source-info">${t.notInspected}</p><p id="${side}-error" class="field-error" hidden></p></div>`;
  return `<!doctype html>
<html lang="${t.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="description" content="${t.description}">
  <meta name="referrer" content="no-referrer">
  <title>${t.title}</title>
  <link rel="stylesheet" href="/styles/app.css">
  <script type="module" src="/js/app.mjs"></script>
</head>
<body>
  <a class="skip-link" href="#workspace">${t.skip}</a>
  <header class="topbar"><a class="brand" href="${t.homeURL}">Gloss Tools <span>by GlossQuote</span></a><nav aria-label="${t.home}"><a href="${t.homeURL}">${t.home}</a><a id="language-link" href="${t.otherURL}" lang="${t.otherLang}" hreflang="${t.otherLang}">${t.otherLanguage}</a></nav></header>
  <main id="workspace">
    <div class="intro"><h1>${t.heading}</h1><p>${t.intro}</p><p class="privacy">${t.privacy}</p></div>
    <section id="language-confirm" class="confirmation" aria-labelledby="language-prompt" hidden><p id="language-prompt">${t.languagePrompt}</p><div class="actions"><a id="language-proceed" class="button primary" href="${t.otherURL}">${t.languageProceed}</a><button id="language-stay" type="button">${t.stay}</button></div></section>
    <section id="sample-confirm" class="confirmation" aria-labelledby="sample-prompt" hidden><p id="sample-prompt">${t.samplePrompt}</p><div class="actions"><button id="sample-proceed" class="primary" type="button">${t.sampleProceed}</button><button id="sample-stay" type="button">${t.back}</button></div></section>
    <noscript><p class="notice">${t.noScript}</p></noscript>
    <p id="unsupported" class="notice" role="alert" hidden>${t.errors.UNSUPPORTED_BROWSER}</p>
    <section class="sources" aria-labelledby="sources-heading"><div class="section-heading"><h2 id="sources-heading">${t.sourceHeading}</h2><button id="sample" type="button" disabled>${t.sample}</button></div><div class="source-pair">${fileField('left',t.leftLabel)}${fileField('right',t.rightLabel)}</div><p id="limits" class="help">${t.limits}</p></section>
    <div class="comparison-controls">
      <fieldset id="mode-field"><legend>${t.mode}</legend><div class="mode-options"><label><input id="mode-blend" type="radio" name="mode" value="blend" checked disabled><span>${t.blend}</span></label><label><input id="mode-difference" type="radio" name="mode" value="difference" disabled><span>${t.difference}</span></label></div></fieldset>
      <div class="number-field"><label for="opacity">${t.opacity}</label><input id="opacity" type="number" min="0" max="100" step="1" value="50" inputmode="numeric" aria-describedby="opacity-help settings-error" disabled><small id="opacity-help">${t.opacityHelp}</small></div>
      <div class="number-field"><label for="threshold">${t.threshold}</label><input id="threshold" type="number" min="0" max="255" step="1" value="0" inputmode="numeric" aria-describedby="threshold-help settings-error" disabled><small id="threshold-help">${t.thresholdHelp}</small></div>
    </div>
    <p id="settings-error" class="field-error" hidden></p>
    <div class="action-status"><div class="actions"><button id="compare" class="primary" type="button" disabled>${t.compare}</button><button id="cancel" type="button" disabled>${t.cancel}</button><button id="clear" type="button" disabled>${t.clear}</button></div><p id="status" role="status" aria-live="polite" aria-atomic="true">${t.statusIdle}</p></div>
    <progress id="progress" max="100" value="0" aria-label="${t.statusComparing}" hidden></progress>
    <p class="help jpeg-note">${t.jpegNote}</p>
    <section class="canvas-section" aria-labelledby="canvas-heading"><div class="section-heading"><h2 id="canvas-heading">${t.canvasHeading}</h2><label class="view-label" for="view">${t.viewLabel}<select id="view" aria-describedby="view-help" disabled><option value="fit">${t.fit}</option><option value="actual">${t.actual}</option></select></label></div><div id="viewport" class="viewport" tabindex="0" role="region" aria-label="${t.canvasLabel}" aria-busy="false"><div id="empty" class="empty-state"><strong>${t.empty}</strong><p>${t.emptyHint}</p></div><canvas id="comparison" width="1" height="1" role="img" aria-label="${t.canvasLabel}" hidden>${t.canvasLabel}</canvas></div><p id="view-help" class="help">${t.viewHelp}</p><p id="legend" class="help legend" hidden>${t.legend}</p></section>
    <section id="results" class="results" aria-labelledby="result-heading" hidden><h2 id="result-heading">${t.resultHeading}</h2><dl class="statistics"><div><dt>${t.changed}</dt><dd id="changed"></dd></div><div><dt>${t.total}</dt><dd id="total"></dd></div><div><dt>${t.percent}</dt><dd id="percent"></dd></div><div><dt>${t.dimensions}</dt><dd id="dimensions"></dd></div><div><dt>${t.usedThreshold}</dt><dd id="used-threshold"></dd></div><div><dt>${t.usedMode}</dt><dd id="used-mode"></dd></div></dl></section>
    <div class="exports"><div class="actions"><button id="download-png" type="button" disabled>${t.png}</button><button id="download-json" type="button" disabled>${t.json}</button></div><p class="help">${t.reportHelp}</p></div>
    <section class="faq" aria-labelledby="faq-heading"><h2 id="faq-heading">${t.faqHeading}</h2>${locale.faqs.map(([question,answer]) => `<details><summary>${escape(question)}</summary><p>${escape(answer)}</p></details>`).join('')}</section>
  </main>
  <footer>Gloss Tools by GlossQuote · <a href="${t.homeURL}">${t.home}</a></footer>
</body>
</html>
`;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeFile(join(ROOT,'public/index.html'),renderPage(zh),'utf8');
  await writeFile(join(ROOT,'public/en/index.html'),renderPage(en),'utf8');
  process.stdout.write('Wrote two static language pages.\n');
}
