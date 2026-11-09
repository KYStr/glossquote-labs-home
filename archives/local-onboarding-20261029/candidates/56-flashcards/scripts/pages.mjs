import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './files.mjs';
import zh from '../public/js/locales/zh-Hant.mjs';
import en from '../public/js/locales/en.mjs';
import { escapeHtml } from '../public/js/core/export.mjs';

export function page(copy) {
  const t = Object.fromEntries(Object.entries(copy.ui).map(([key, value]) => [key, escapeHtml(value)]));
  const english = copy.locale === 'en', prefix = english ? '..' : '.', languagePath = english ? '../index.html' : './en/index.html';
  const button = (id, label, kind = '') => `<button type="button" id="${id}"${kind ? ` class="${kind}"` : ''} disabled>${label}</button>`;
  return `<!doctype html>
<html lang="${copy.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="description" content="${t.description}"><title>${t.title}</title><link rel="stylesheet" href="${prefix}/styles/app.css"></head>
<body><a class="skip-link" href="#workspace">${t.skip}</a>
<header class="topbar"><span class="brand">Gloss Tools <span>by GlossQuote</span></span><nav aria-label="${t.nav}"><a href="https://glossquote.com/${english ? 'en/' : ''}index.html">${t.home}</a><a id="languageLink" href="${languagePath}" lang="${english ? 'zh-Hant' : 'en'}">${t.language}</a></nav></header>
<main id="workspace"><div class="page-heading"><h1>${t.h1}</h1><p class="candidate">${t.preview}</p></div><p class="intro">${t.intro}</p><p class="privacy">${t.privacy}</p>
<p id="unsupported" class="notice">${t.startup}</p><noscript><p class="error">${t.unsupported}</p></noscript>
<section id="languageConfirm" class="notice" aria-labelledby="languageHeading" hidden><h2 id="languageHeading" tabindex="-1">${t.languageWarning}</h2><div class="actions"><a class="button" href="${languagePath}">${t.languageContinue}</a>${button('stayLanguage', t.stay)}</div></section>
<div class="workspace"><aside class="source" aria-labelledby="sourceTitle"><h2 id="sourceTitle">${t.sourceTitle}</h2>
<label for="csvFile">${t.csvFile}</label><input id="csvFile" type="file" accept=".csv,text/csv" aria-describedby="limits error" disabled>
<label for="source">${t.csv}</label><textarea id="source" rows="9" spellcheck="false" autocomplete="off" autocapitalize="off" aria-describedby="csvHelp limits error" disabled></textarea><p id="csvHelp" class="help">${t.csvHelp}</p><p id="limits" class="help">${t.limits}</p>
<label class="check"><input id="header" type="checkbox" checked disabled>${t.header}</label>${button('inspect', t.inspect)}
<div class="column-pair"><div><label for="questionColumn">${t.questionColumn}</label><select id="questionColumn" aria-describedby="error" disabled><option value="0">${t.column} 1</option><option value="1">${t.column} 2</option></select></div><div><label for="answerColumn">${t.answerColumn}</label><select id="answerColumn" aria-describedby="error" disabled><option value="0">${t.column} 1</option><option value="1" selected>${t.column} 2</option></select></div></div>
<label class="check"><input id="shuffle" type="checkbox" disabled>${t.shuffle}</label><label for="seed">${t.seed}</label><input id="seed" type="text" inputmode="numeric" autocomplete="off" aria-describedby="seedHelp error" disabled><p id="seedHelp" class="help">${t.seedHelp}</p>
${button('start', t.start, 'primary full')}${button('edit', t.edit, 'full')}<p class="help">${t.editHelp}</p>${button('sample', t.sample, 'quiet')}<p class="help">${t.sampleNote}</p>
<details id="importDetails"><summary>${t.importTitle}</summary><label for="jsonFile">${t.jsonFile}</label><input id="jsonFile" type="file" accept=".json,application/json" aria-describedby="jsonHelp error" disabled><label for="jsonText">${t.jsonText}</label><textarea id="jsonText" rows="5" spellcheck="false" autocomplete="off" autocapitalize="off" aria-describedby="jsonHelp error" disabled></textarea><p id="jsonHelp" class="help">${t.jsonHelp}</p>${button('previewImport', t.previewImport)}</details>${button('clear', t.clear, 'quiet danger')}</aside>
<section class="task" aria-label="${t.studyTitle}"><p id="status" class="status" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(copy.messages.idle)}</p><p id="error" class="error" role="alert" tabindex="-1" hidden></p>
<div id="busy" class="notice" hidden><p>${t.busy}</p>${button('cancelRead', t.cancelRead)}</div>
<section id="confirmation" class="notice" aria-labelledby="confirmTitle" hidden><h2 id="confirmTitle" tabindex="-1"></h2><p id="confirmBody"></p><div class="actions">${button('confirm', t.confirmResetButton, 'primary')}${button('cancelConfirm', t.cancel)}</div></section>
<section id="importPreview" class="notice" aria-labelledby="importHeading" hidden><h2 id="importHeading" tabindex="-1">${t.importHeading}</h2><p id="importSource"></p><p>${t.importWarning}</p><p>${t.importSummary} <strong id="incomingCounts"></strong></p><dl id="incomingCards" class="preview-list"></dl><div class="actions">${button('confirmImport', t.replace, 'primary')}${button('cancelImport', t.cancel)}</div></section>
<section id="empty" class="empty"><h2>${t.idleTitle}</h2><p>${t.idleBody}</p></section>
<section id="practice" hidden><div class="study-meta"><h2 id="studyHeading" tabindex="-1">${t.studyTitle}</h2><span id="cardNumber" class="number"></span></div>
<div id="card" class="study-card"><p class="face-label">${t.question}</p><p id="question" class="face" dir="auto"></p><p id="hiddenAnswer" class="help">${t.hiddenAnswer}</p><div id="answerPanel" class="answer" hidden><p class="face-label">${t.answer}</p><p id="answer" class="face" dir="auto"></p></div></div>
<div id="recallActions" class="recall-actions">${button('reveal', t.reveal, 'primary')}<div id="assessment" hidden><p class="help">${t.selfAssess}</p><div class="actions">${button('assessKnown', t.knownButton, 'primary')}${button('assessReview', t.reviewButton)}</div></div></div>
<section id="roundEnd" class="empty" hidden><h3 id="roundTitle"></h3><p id="roundBody"></p>${button('restart', t.restart, 'primary')}</section><div class="navigation actions">${button('previous', t.previous)}${button('next', t.next, 'quiet')}</div>
<section class="progress" aria-labelledby="progressTitle"><h2 id="progressTitle">${t.progressTitle}</h2><dl class="counts"><div><dt>${t.total}</dt><dd id="totalCount">0</dd></div><div><dt>${t.known}</dt><dd id="knownCount">0</dd></div><div><dt>${t.review}</dt><dd id="reviewCount">0</dd></div><div><dt>${t.batch}</dt><dd id="batchCount">0</dd></div></dl><label for="mode">${t.mode}</label><select id="mode" aria-describedby="batchHelp" disabled><option value="all">${t.allMode}</option><option value="review">${t.reviewMode}</option></select><p id="batchHelp" class="help">${t.batchHelp}</p>
<details><summary>${t.orderTitle}</summary><label for="practiceSeed">${t.practiceSeed}</label><input id="practiceSeed" type="text" inputmode="numeric" autocomplete="off" aria-describedby="orderHelp error" disabled><p id="orderHelp" class="help">${t.seedHelp} ${t.orderHelp}</p>${button('reshuffle', t.reshuffle)}</details>${button('reset', t.reset, 'quiet')}</section>
<section class="output" aria-labelledby="outputTitle"><h2 id="outputTitle">${t.outputTitle}</h2><label for="outputType">${t.outputType}</label><select id="outputType" aria-describedby="outputHelp" disabled><option value="json">${t.jsonOption}</option><option value="html">${t.htmlOption}</option></select><p id="outputHelp" class="help">${t.outputHelp}</p>${button('prepare', t.prepare)}
<div id="prepared" hidden><h3>${t.readyTitle}</h3><p>${t.filename}: <strong id="filename" class="number"></strong><br><span id="fileBytes" class="number"></span> ${t.bytes}</p><div id="printPreview" hidden><h3>${t.exportPreview}</h3><dl id="printCards" class="preview-list"></dl></div>${button('download', t.download, 'primary')}<details><summary>${t.contents}</summary><label for="outputText">${t.contentsLabel}</label><textarea id="outputText" rows="8" readonly spellcheck="false"></textarea></details></div></section></section></section></div>
<section class="faq" aria-labelledby="faqTitle"><h2 id="faqTitle">${t.faq}</h2><div class="faq-grid"><div><h3>${t.faqGradeQ}</h3><p>${t.faqGradeA}</p><h3>${t.faqSaveQ}</h3><p>${t.faqSaveA}</p></div><div><h3>${t.faqPrintQ}</h3><p>${t.faqPrintA}</p><h3>${t.faqFormatQ}</h3><p>${t.faqFormatA}</p></div></div></section>
</main><footer>${t.footer}</footer><script type="module" src="${prefix}/js/app.mjs"></script></body></html>\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const copy of [zh, en]) writeFileSync(join(ROOT, 'public', copy.locale === 'en' ? 'en/index.html' : 'index.html'), page(copy));
}
