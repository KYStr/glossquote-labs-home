// Authored bilingual static pages; build copies public without executing this.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { MESSAGES } from '../public/js/i18n.mjs';
import { WEEKDAYS } from '../public/js/core/report.mjs';

export function renderPage(locale) {
  const zh = locale === 'zh-Hant';
  const m = MESSAGES[locale];
  const t = (a, b) => zh ? a : b;
  const field = (id, label, help, attrs = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" ${attrs} aria-describedby="${id}-help ${id}-error"><p class="help" id="${id}-help">${help}</p><p class="field-error" id="${id}-error"></p></div>`;
  const questions = zh ? [
    ['它如何分配剩餘頁數？', '計算選定日期範圍內符合星期的可讀日，平均分配剩餘頁數；餘數由較早的可讀日先多分一頁。剩餘頁數較少時，後面的可讀日保留為彈性／休息日。'],
    ['落後後怎麼更新計畫？', '修改已讀頁數與新的開始日期，再按重新計算。工具不會自動追蹤閱讀或自動調整今天。'],
    ['會略過國定假日嗎？', '不會。工具只依你選取的星期安排日期，不查詢所在地假日或學校行事曆；請自行調整可讀星期與日期。'],
    ['我的書名與計畫會保存或上傳嗎？', '不需要帳號或雲端保存。資料只留在目前分頁；離開或重新載入後清除。複製與下載只會在你明確按下對應按鈕後執行。初次載入仍需要下載網站檔案，瀏覽器會管理你複製或下載的內容。']
  ] : [
    ['How are the remaining pages split?', 'The tool counts selected weekdays inside your date range and divides the remaining pages evenly. Earlier reading days receive the extra pages first. If fewer pages remain, later available dates become flexible / rest days.'],
    ['How do I update a plan after falling behind?', 'Change the completed page count and your new start date, then recalculate. The tool does not track reading or automatically move the start date to today.'],
    ['Does it skip public holidays?', 'No. It uses only the weekdays you select and does not check local holidays or school calendars. Adjust your dates and selected weekdays yourself.'],
    ['Are my book details saved or uploaded?', 'No account or cloud storage is used. Data stays in this tab and is cleared when you leave or reload. Copy and download happen only after you choose those actions. The initial load still downloads website files. Your browser manages copied or downloaded content.']
  ];
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="description" content="${t('輸入總頁數、已讀頁數、日期範圍與可讀星期，將剩餘頁數分配到各閱讀日。可檢查每日頁數上限；工具不追蹤實際閱讀。', 'Enter total and completed pages, a date range, and the weekdays you can read. Distribute remaining pages across those dates and check a daily page cap. The tool does not track reading.')}">
  <title>${t('閱讀進度規劃：依可讀日分配頁數｜GlossQuote Tools', 'Reading Plan: Set Pages by Reading Day | GlossQuote Tools')}</title>
  <link rel="stylesheet" href="/styles/app.css">
  <script type="module" src="/js/app.mjs"></script>
</head>
<body>
  <a class="skip-link" href="#main">${t('跳至閱讀規劃', 'Skip to reading planner')}</a>
  <header class="topbar">
    <a class="brand" href="https://glossquote.com/${zh ? '' : 'en/'}index.html">Gloss Tools <span>by GlossQuote</span></a>
    <a href="${zh ? '/en/index.html' : '/index.html'}" lang="${zh ? 'en' : 'zh-Hant'}" hreflang="${zh ? 'en' : 'zh-Hant'}">${t('English', '繁體中文')}</a>
  </header>
  <div class="page">
    <p class="language-note">${t('切換語言會清除目前輸入與計畫。', 'Changing language clears your inputs and plan.')}</p>
    <main id="main">
      <h1>${t('閱讀進度規劃', 'Plan your reading progress')}</h1>
      <p class="intro">${t('選擇你真正能閱讀的日期與星期，平均分配尚未讀完的頁數。若進度落後，更新已讀頁數與開始日期後重新計算。', 'Choose the dates and weekdays you can read, then split the remaining pages across them. If you fall behind, update the pages completed and the start date to calculate again.')}</p>
      <noscript><p class="notice">${t('請開啟 JavaScript 以在此分頁計算閱讀計畫。', 'Enable JavaScript to calculate a reading plan in this tab.')}</p></noscript>
      <div class="worksheet">
        <form id="reading-form" novalidate autocomplete="off">
          <fieldset id="input-controls" disabled>
          <h2>${t('書籍與可讀時間', 'Your book and reading days')}</h2>
          ${field('titleRaw', t('書名（選填）', 'Book title (optional)'), t('請使用簡短書名；前後空白不列入報告。', 'Use a short title. Outer spaces are omitted from the report.'), 'type="text" maxlength="256" spellcheck="false"')}
          <div class="field-pair">
            ${field('totalPagesRaw', t('總頁數', 'Total pages'), t('1–10000，僅用 0–9，不含逗號。', '1–10000; digits 0–9, no commas.'), 'type="text" inputmode="numeric" maxlength="256" required')}
            ${field('completedPagesRaw', t('已讀頁數', 'Pages completed'), t('0 至總頁數；未開始填 0。', '0 through total; enter 0 to start.'), 'type="text" inputmode="numeric" maxlength="256" value="0" required')}
          </div>
          <div class="date-controls"><h3>${t('日期範圍', 'Date range')}</h3><button type="button" class="quiet" id="date-mode" aria-pressed="false">${m.textDates}</button></div>
          <p id="date-help" class="help">${m.dateNativeHelp}</p>
          <p id="date-mode-error" class="field-error" role="status"></p>
          <div class="field-pair dates">
            ${field('startDateRaw', t('開始日期', 'Start date'), 'YYYY-MM-DD', 'type="date" inputmode="numeric" min="1900-01-01" max="2100-12-31" required')}
            ${field('endDateRaw', t('截止日期', 'End date'), 'YYYY-MM-DD', 'type="date" inputmode="numeric" min="1900-01-01" max="2100-12-31" required')}
          </div>
          <fieldset id="weekdays" aria-describedby="weekdays-help weekdays-error">
            <legend>${t('可讀星期', 'Weekdays you can read')}</legend>
            <p class="help" id="weekdays-help">${t('至少選一天；只依星期安排，不查詢假日。', 'Choose at least one. Holidays are not checked.')}</p>
            <div class="weekday-choices">${WEEKDAYS[locale].map((name, i) => `<label class="weekday-choice"><input type="checkbox" name="weekday" value="${i + 1}" ${i < 5 ? 'checked' : ''}><span>${name}</span></label>`).join('')}</div>
            <p class="field-error" id="weekdays-error"></p>
          </fieldset>
          ${field('dailyCapRaw', t('每日頁數上限（選填）', 'Daily page cap (optional)'), t('1–10000，僅用 0–9；留空不設上限。', '1–10000; digits 0–9. Leave blank for no cap.'), 'type="text" inputmode="numeric" maxlength="256"')}
          <div class="actions"><button id="create" type="submit" class="primary" disabled>${m.create}</button><button id="clear" type="button">${t('清除', 'Clear')}</button></div>
          <div id="errors" class="notice error-notice" hidden></div>
          <p class="privacy">${t('這只是一份計畫，不會追蹤你實際讀完的頁數。輸入只留在此分頁；離開或重新載入即清除。', 'This is a plan only; it does not track pages you actually read. Inputs stay in this tab and are cleared when you leave or reload.')}</p>
          </fieldset>
        </form>
        <div class="output-area">
          <p id="status" role="status" class="status">${m.initial}</p>
          <section id="result" aria-labelledby="result-title" hidden>
            <h2 id="result-title"></h2>
            <p id="book-name" class="book-name"></p>
            <p id="result-note" class="result-note"></p>
            <dl id="summary" class="summary"></dl>
            <ol id="schedule" class="schedule" aria-label="${t('逐日頁碼分配', 'Daily page assignments')}" hidden></ol>
          </section>
          <section id="exports" aria-labelledby="report-label" hidden>
            <label id="report-label" for="report">${t('純文字報告（唯讀）', 'Text report (read only)')}</label>
            <p class="help">${t('可選取文字手動複製；TXT 不含其他資料。', 'Select the text to copy manually. The TXT contains only this plan.')}</p>
            <textarea id="report" readonly rows="9" spellcheck="false" aria-describedby="copy-status"></textarea>
            <div class="actions"><button type="button" id="copy" disabled>${m.copy}</button><button type="button" id="download" disabled>${t('下載 TXT', 'Download TXT')}</button></div>
            <p id="copy-status" class="help" role="status"></p><p id="download-status" class="help" role="status"></p>
          </section>
        </div>
      </div>
      <section class="faq" aria-labelledby="faq-heading">
        <h2 id="faq-heading">${t('規劃方式與資料處理', 'Planning and your data')}</h2>
        ${questions.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('\n        ')}
      </section>
    </main>
    <footer><a href="https://glossquote.com/${zh ? '' : 'en/'}index.html">${t('返回 Gloss Tools 首頁', 'Back to Gloss Tools')}</a><span>${t('在此分頁運算 · 本版不保存資料', 'Calculated in this tab · No saved data')}</span></footer>
  </div>
  <dialog id="clear-dialog" aria-labelledby="clear-heading" aria-describedby="clear-description">
    <h2 id="clear-heading">${t('清除這本書的規劃？', 'Clear this book’s plan?')}</h2>
    <p id="clear-description">${t('要清除書名、頁數、日期、星期、計畫與報告嗎？', 'Clear the title, page counts, dates, weekdays, plan, and report?')}</p>
    <div class="actions"><button id="keep-data" type="button" autofocus>${t('保留目前內容', 'Keep current data')}</button><button id="confirm-clear" type="button" class="primary">${t('清除資料', 'Clear data')}</button></div>
  </dialog>
</body>
</html>
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeFile(new URL('../public/index.html', import.meta.url), renderPage('zh-Hant'));
  await writeFile(new URL('../public/en/index.html', import.meta.url), renderPage('en'));
}
