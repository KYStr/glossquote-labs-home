import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const pageCopy = {
  'zh-Hant': {
    title: '成績目標試算｜Gloss Tools by GlossQuote', h1: '成績目標試算',
    description: '輸入已評分項目、百分比權重與目標，試算尚未評分項目合計需達到的加權平均。成績規則以學校官方說明為準。',
    intro: '已拿到部分成績，想知道剩下的項目平均至少要多少？輸入各項權重與已評分成績，查看已取得的總成績貢獻，以及剩餘項目所需的加權平均。',
    notice: '權重必須合計為 100%。成績空白代表尚未評分；輸入 0 代表已評分且得 0 分。此工具只按你輸入的資料試算，不代表學校官方算分規則。',
    home: '返回繁中首頁', homeURL: 'https://glossquote.com/index.html', switch: 'English', other: '/en/index.html',
    target: '目標分數', total: '權重合計', components: '評分項目', count: '1 / 40 項', name: '項目名稱', weight: '權重（%）', score: '成績（0–100）', remove: '移除',
    item: '項目 1', ungraded: '尚未評分（留白）', decimal: '插入小數點', rules: '數字使用半形數字與句點，最多兩位小數；例如 70、70.5。不要輸入空白或逗號。',
    add: '新增項目', example: '載入範例', clear: '清除表單', calculate: '試算', result: '試算結果', empty: '填好目標和評分項目後，按「試算」查看結果。',
    copy: '複製結果', download: '下載報告', report: '純文字報告（可選取複製）', select: '選取報告文字',
    precision: '目標比較使用未四捨五入的精確值；畫面上的已取得貢獻四捨五入至小數兩位。',
    average: '這是剩餘項目依權重合併後所需的平均，不表示每一項都要達到這個分數。',
    data: '輸入只在目前頁面處理；本版不保存。第一次載入仍需下載網站檔案。',
    init: '正在準備表單…', fail: '表單未能啟用。請重新載入此頁。 / The form could not start. Reload this page.',
    dialog: '確認操作', cancel: '取消', confirm: '清除表單', faq: '使用說明',
    faqs: [
      ['剩下的項目平均要多少才會達到目標？', '工具先算已評分項目的加權貢獻，再用尚未評分的權重求出所需加權平均，向上取至 0.01 分。只適用於你輸入的分數與權重。'],
      ['成績空白和輸入 0 有什麼不同？', '空白表示尚未評分，不會當成 0 分；輸入 0 表示已評分且得 0 分。'],
      ['所需平均是否代表每個剩餘項目都必須達到這個分數？', '不是。這是依剩餘權重合併後的平均，不代表個別項目的最低分；實際結果仍取決於權重與分數。'],
      ['如果工具說目標不可達，代表什麼？', '即使所有空白項目都得到 100，依目前權重和已知分數算出的最高總成績仍低於目標。請核對輸入與學校官方規則。'],
      ['工具會替我套用學校的計分規則嗎？', '不會。工具不連接校務系統，也不知道曲線、類別權重、補考或其他校規；請以學校公布的規則為準。']
    ]
  },
  en: {
    title: 'Grade Target Calculator | Gloss Tools by GlossQuote', h1: 'Grade Target Calculator',
    description: "Enter graded components, percentage weights and a target to estimate the weighted average needed across ungraded components. Check your school's official grading rules.",
    intro: "Already have some grades? Enter each component's weight and any score you have. See your earned contribution to the final grade and the weighted average needed across the remaining components.",
    notice: "Weights must total exactly 100%. Leave a score blank if it is not graded yet; enter 0 for a graded score of zero. This calculator follows your inputs and may not match your school's official grading rules.",
    home: 'Back to English home', homeURL: 'https://glossquote.com/en/index.html', switch: '繁體中文', other: '/index.html',
    target: 'Target grade', total: 'Total weight', components: 'Grading components', count: '1 / 40 components', name: 'Component name', weight: 'Weight (%)', score: 'Score (0–100)', remove: 'Remove',
    item: 'Component 1', ungraded: 'Not graded (leave blank)', decimal: 'Insert decimal point', rules: 'Use ASCII digits and a period, with up to two decimal places; for example 70 or 70.5. Do not enter spaces or commas.',
    add: 'Add component', example: 'Load example', clear: 'Clear form', calculate: 'Calculate', result: 'Calculation result', empty: 'Enter a target and grading components, then select Calculate to see the result.',
    copy: 'Copy result', download: 'Download report', report: 'Plain text report (selectable for copying)', select: 'Select report text',
    precision: 'Target status uses the exact, unrounded value. The earned contribution shown here is rounded to two decimal places.',
    average: 'This is the weighted average across all ungraded components, not a minimum score for each component.',
    data: 'Your inputs are processed in this page and are not saved. The first page load still downloads the website files.',
    init: 'Preparing the form…', fail: '表單未能啟用。請重新載入此頁。 / The form could not start. Reload this page.',
    dialog: 'Confirm action', cancel: 'Cancel', confirm: 'Clear form', faq: 'How to use this calculator',
    faqs: [
      ['What average do I need on the remaining components?', 'The calculator totals the weighted contribution from graded components, then calculates the weighted average needed across the ungraded weights. It rounds that required average up to 0.01. The result only reflects your inputs.'],
      ['Is a blank score the same as zero?', 'No. A blank score means the component has not been graded. Enter 0 when it has been graded and the score is zero.'],
      ['Does the required average mean every remaining component must reach that score?', 'No. It is the weighted average across all remaining components, not a minimum for each one. Actual results still depend on component weights and scores.'],
      ['What does an unreachable target mean?', "Even if every ungraded component receives 100, the maximum final grade calculated from your current weights and scores is below the target. Check your inputs and your school's official rules."],
      ["Does this calculator know my school's grading rules?", 'No. It does not connect to school systems or know about curves, category weights, retakes or other rules. Check the rules published by your school.']
    ]
  }
};
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
export function renderPage(language) {
  const t = pageCopy[language];
  const field = (key, label, numeric = false) => `<div class="field"><label for="row-1-${key}">${label}</label><div class="input-line"><input id="row-1-${key}" data-field="${key}" type="text"${numeric ? ' inputmode="decimal"' : ''} autocomplete="off" spellcheck="false" aria-describedby="${key === 'scoreRaw' ? 'score-rule ' : ''}row-1-${key}-error">${numeric ? `<button type="button" class="decimal" data-decimal="row-1-${key}" aria-label="${t.decimal}: ${label}" title="${t.decimal}" disabled>.</button>` : ''}</div><p class="field-error" id="row-1-${key}-error" hidden></p></div>`;
  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="description" content="${escape(t.description)}">
  <title>${t.title}</title>
  <link rel="stylesheet" href="/styles/app.css">
  <script type="module" src="/js/app.js"></script>
</head>
<body>
  <a class="skip-link" href="#main">${language === 'en' ? 'Skip to calculator' : '跳到試算表單'}</a>
  <header class="topbar"><a class="brand" href="${t.homeURL}">Gloss Tools <span>by GlossQuote</span></a><nav aria-label="${language === 'en' ? 'Language and home' : '語言與首頁'}"><button id="language" type="button" disabled>${t.switch}</button><a id="home-link" href="${t.homeURL}">${t.home}</a></nav></header>
  <main id="main">
    <h1>${t.h1}</h1><p class="intro">${t.intro}</p>
    <p id="privacy-note" class="data-note">${t.data}</p>
    <p id="initialization" role="status">${t.init}</p>
    <noscript><p class="error-summary">${t.fail}</p></noscript>
    <form id="calculator" method="post" action="/" autocomplete="off" novalidate>
      <fieldset id="work" disabled>
        <legend class="visually-hidden">${t.h1}</legend>
        <div class="target-bar"><div class="field target-field"><label for="target">${t.target}</label><div class="input-line"><input id="target" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-describedby="number-rule target-error"><span class="unit">/ 100</span><button type="button" class="decimal" data-decimal="target" aria-label="${t.decimal}: ${t.target}" title="${t.decimal}" disabled>.</button></div><p id="target-error" class="field-error" hidden></p></div><p class="weight-total"><span>${t.total}</span><output id="weight-total">0.00 / 100.00%</output></p></div>
        <p id="number-rule" class="help">${t.rules} ${t.decimal}: <strong>.</strong></p>
        <div class="section-heading"><h2>${t.components}</h2><span id="row-count">${t.count}</span></div>
        <p id="score-rule" class="notice">${t.notice}</p>
        <div id="rows"><section class="grade-row" data-row-id="row-1" aria-labelledby="row-1-title"><h3 id="row-1-title">${t.item}</h3>${field('nameRaw', t.name)}${field('weightRaw', t.weight, true)}${field('scoreRaw', t.score, true)}<div class="row-actions"><p class="score-status">${t.ungraded}</p><button type="button" data-remove disabled>${t.remove}</button></div></section></div>
        <p id="rows-error" class="field-error" hidden></p>
        <div class="add-line"><button id="add" type="button" disabled>+ ${t.add}</button><span id="row-limit" class="help"></span></div>
        <p id="example-note" class="help" hidden></p>
        <div id="error-summary" class="error-summary" role="alert" tabindex="-1" hidden></div>
        <div class="action-bar"><div class="secondary-actions"><button id="example" type="button" disabled>${t.example}</button><button id="clear" type="button" disabled>${t.clear}</button></div><button id="calculate" type="submit" class="primary" disabled>${t.calculate}</button></div>
      </fieldset>
    </form>
    <section class="result-area" aria-labelledby="result-title"><h2 id="result-title">${t.result}</h2><p id="result-empty" class="help">${t.empty}</p><div id="result" hidden><p id="result-status" role="status" class="result-status"></p><dl id="result-values"></dl><p id="unreachable-note"></p><p class="help">${t.precision}</p><p>${t.average}</p><details id="report-details"><summary>${t.report}</summary><textarea id="report-text" readonly aria-label="${t.report}" rows="12"></textarea><button id="select-report" type="button" disabled>${t.select}</button></details></div><div class="result-actions"><button id="copy" type="button" disabled>${t.copy}</button><button id="download" type="button" disabled>${t.download}</button></div><p id="copy-note" role="status"></p><p id="download-note" role="status"></p></section>
    <section class="faq" aria-labelledby="faq-title"><h2 id="faq-title">${t.faq}</h2>${t.faqs.map(([q,a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>
  </main>
  <footer>Gloss Tools by GlossQuote · ${t.data}</footer>
  <dialog id="confirmation" aria-labelledby="confirmation-title" aria-describedby="confirmation-text"><h2 id="confirmation-title">${t.dialog}</h2><p id="confirmation-text"></p><div class="dialog-actions"><button id="confirmation-cancel" type="button" autofocus disabled>${t.cancel}</button><button id="confirmation-accept" type="button" disabled>${t.confirm}</button></div></dialog>
</body>
</html>
`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [language, file] of [['zh-Hant', 'public/index.html'], ['en', 'public/en/index.html']]) {
    await mkdir(new URL('../public/en/', import.meta.url), { recursive: true });
    await writeFile(root + file, renderPage(language));
  }
}
