import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { messages } from '../public/js/i18n.js';

const root = new URL('../public/', import.meta.url);
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
for (const lang of ['zh-Hant', 'en']) {
  const m = messages[lang];
  const prefix = lang === 'en' ? '../' : './';
  const home = lang === 'en' ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html';
  const language = lang === 'en' ? '../index.html' : './en/index.html';
  const html = `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="description" content="${escape(m.description)}">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; media-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <title>${m.title}</title>
  <link rel="stylesheet" href="${prefix}css/app.css">
  <script type="module" src="${prefix}js/app.js"></script>
</head>
<body>
  <header class="topbar"><a href="${home}">Gloss Tools</a><span class="product-name">${m.name}</span><span class="badge">${m.candidate}</span></header>
  <nav class="language" aria-label="${lang === 'en' ? 'Language' : '語言'}"><a href="${language}" lang="${lang === 'en' ? 'zh-Hant' : 'en'}" aria-describedby="language-warning">${m.language}</a><span id="language-warning">${m.languageWarning}</span></nav>
  <main>
    <h1>${m.heading}</h1>
    <p class="intro">${m.intro}</p>
    <p class="privacy">${m.privacy}</p>
    <noscript><p>${m.noScript}</p></noscript>
    <section class="source-area" aria-labelledby="source-heading">
      <h2 id="source-heading">${m.source}</h2>
      <label for="audio-file">${m.audioLabel}</label>
      <input id="audio-file" type="file" accept="audio/*" aria-describedby="audio-help error">
      <p class="help" id="audio-help">${m.audioHelp}</p>
      <p id="source-info" class="source-info">${m.noSource}</p>
      <div id="metadata" hidden>
        <form id="metadata-form" novalidate>
          <div class="metadata-fields">
            <div><label for="source-title">${m.sourceTitle}</label><input id="source-title" type="text" aria-describedby="metadata-help error" autocomplete="off"></div>
            <div><label for="source-duration">${m.duration}</label><input id="source-duration" class="time-input" type="text" inputmode="text" aria-describedby="metadata-help error" autocomplete="off"></div>
          </div>
          <p id="metadata-help" class="help">${m.metadataHelp}</p>
          <button id="save-metadata" type="submit">${m.saveMetadata}</button>
        </form>
        <p id="duration-info" class="help"></p>
        <p id="duration-mismatch" class="notice" hidden>${m.mismatch}</p>
        <button id="adopt-duration" type="button" hidden>${m.adopt}</button>
      </div>
      <audio id="audio" controls preload="metadata" aria-label="${m.player}"></audio>
      <p id="playback-state" role="status">${m.status.empty}</p>
      <div class="capture-bar"><button id="capture" class="primary" type="button" disabled>${m.capture}</button><span>${m.position} <output id="position" class="time">—</output></span></div>
      <p id="capture-help" class="help">${m.captureHelp}</p>
      <p id="over-timeline" class="notice" hidden>${m.overTimeline}</p>
      <section id="editor" class="editor" aria-labelledby="editor-heading" hidden>
        <h3 id="editor-heading">${m.newNote}</h3><p id="draft-time" class="time"></p>
        <form id="note-form" novalidate>
          <label for="note-text">${m.noteText}</label><textarea id="note-text" rows="4" aria-describedby="note-help error"></textarea>
          <p id="note-help" class="help">${m.noteHelp}</p>
          <div class="actions"><button id="save-note" class="primary" type="submit">${m.saveNote}</button><button id="cancel-editor" type="button">${m.cancel}</button></div>
        </form>
      </section>
      <p id="error" class="error" role="alert" hidden></p>
      <p id="feedback" role="status" class="help"></p>
      <div class="file-actions"><div><label for="import-file">${m.importLabel}</label><input id="import-file" type="file" accept=".json,application/json" aria-describedby="import-help error"><p id="import-help" class="help">${m.importHelp}</p></div><button id="clear" class="quiet" type="button" disabled>${m.clear}</button></div>
    </section>
    <section id="confirmation" class="confirmation" aria-labelledby="confirmation-heading" tabindex="-1" hidden>
      <h2 id="confirmation-heading"></h2><p id="confirmation-detail"></p><p id="confirmation-summary" class="plain-text"></p><p id="confirmation-mismatch" class="notice" hidden></p>
      <div id="confirmation-actions" class="actions"></div>
    </section>
    <section class="notes-area" aria-labelledby="notes-heading">
      <h2 id="notes-heading" tabindex="-1">${m.notes}</h2><p id="quota" class="help">${m.noteQuota} 0 / 1,000 · ${m.bytesQuota} 0 / 1,048,576 bytes</p>
      <p id="empty-notes">${m.emptyNotes}</p><ol id="notes"></ol>
    </section>
    <section class="export-area" aria-labelledby="export-heading"><h2 id="export-heading">${m.exportHeading}</h2><p class="help">${m.exportHelp}</p><div class="actions"><button id="export-markdown" type="button" disabled>${m.markdown}</button><button id="export-json" type="button" disabled>${m.json}</button></div></section>
    <section class="faq" aria-labelledby="faq-heading"><h2 id="faq-heading">${m.faqHeading}</h2>${m.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>
  </main>
  <footer><p>${m.previewNotice}</p><a href="${home}">${m.home}</a><span>Gloss Tools by GlossQuote</span></footer>
</body>
</html>
`;
  const target = new URL(lang === 'en' ? 'en/index.html' : 'index.html', root);
  await mkdir(fileURLToPath(new URL('.', target)), { recursive: true });
  await writeFile(target, html, { encoding: 'utf8', flag: 'w' });
}
console.log('Generated both static language pages. No browser or server started.');
