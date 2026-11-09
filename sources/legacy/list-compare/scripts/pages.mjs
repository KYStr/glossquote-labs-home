const labels = {
  'zh-Hant': {
    title: '名單比對與合併：找出新增、移除與共同項目 | GlossQuote',
    description: '貼上兩份一行一筆的名單，在瀏覽器本機找出 A 獨有、B 獨有、共同項目與去重合併結果。可選前後空白與大小寫規則，不需上傳或建立帳號。',
    heading: '名單比對與合併', intro: '貼上兩份清單，快速知道哪些新增、哪些移除、哪些兩邊都有。',
    privacy: '只在此頁記憶體中處理，不上傳、不保存草稿。離頁或重新載入即清除。',
    skip: '跳到名單', language: 'English', languagePath: '/en/index.html', home: 'https://glossquote.com/index.html', homeLabel: '返回工具首頁',
    list: '名單', inputHint: '一行一筆；每側最多 5,000 筆非空項目、100,000 個 UTF-16 字元，每筆最多 200 個 Unicode 字碼。',
    rules: '比對規則', trim: '移除每筆前後空白', trimHint: '預設開啟。關閉時保留前後空白；全空白列一律忽略。',
    ignore: '忽略大小寫', ignoreHint: '預設關閉。開啟後 alice 與 ALICE 視為同一鍵，保留首次文字。',
    compare: '比對名單', example: '載入假資料範例', clear: '清除',
    results: '比對結果', note: '首次行號從 1 起算，包含空白列。出現次數包含首次項目；同一側的重複列只輸出一次。',
    stats: ['輸入行數', '忽略空白列', '非空項目', '去重後項目', '重複列'],
    resultNames: ['只在 A', '只在 B', '共同項目', '合併清單'],
    copy: '複製', manual: '手動複製此區完整清單', noItems: '沒有項目可複製', waiting: '比對後顯示結果。',
    faq: '使用說明', js: '請啟用 JavaScript，才能在本機比對名單。',
    questions: [
      ['是否逐行比較？', '不是。這裡比較每列項目是否也存在另一份名單中，兩側順序不需要相同；不是逐行文字 diff。'],
      ['什麼情況算相同？', '預設去掉每列前後空白，再以大小寫敏感方式比對。關閉移除空白會保留外側空白。開啟忽略大小寫使用 JavaScript 的 toLowerCase 小寫鍵，不做拼字、同義詞、NFC 或 NFKC 正規化；也不判斷兩筆資料是否是同一個人。'],
      ['同一側重複會怎樣？', '每側只保留首次項目的文字與行號，統計重複列。共同項目以 A 的首次文字顯示；合併依 A 的順序開始，再追加 B 中未見的項目。'],
      ['名單會上傳或保存嗎？', '名單只在此頁記憶體中計算，不上傳、不保存草稿。離頁或重載即清除。手動複製後的 OS 剪貼簿、瀏覽器擴充與複製目的地由你的使用環境管理。'],
      ['空結果代表失敗嗎？', '不是。合法名單可能沒有某類符合項目，甚至兩側都空白也能比對成功。空結果會顯示「沒有符合項目」，且沒有內容可複製。']
    ]
  },
  en: {
    title: 'Compare and Merge Lists: Find Added and Shared Items | GlossQuote',
    description: 'Paste two line-separated lists to find items unique to each side, shared items, and a stable merged list locally in your browser. Choose trimming and case rules; no upload or account is needed.',
    heading: 'Compare and merge lists', intro: 'Paste two lists to see what is new, what is missing, what they share, and a de-duplicated merge.',
    privacy: 'Processed in this page’s memory. No upload or saved drafts. Leaving or reloading clears the lists.',
    skip: 'Skip to lists', language: '繁體中文', languagePath: '/index.html', home: 'https://glossquote.com/en/index.html', homeLabel: 'All tools',
    list: 'List', inputHint: 'One item per line. Each list: up to 5,000 non-empty items and 100,000 UTF-16 characters. Each item: up to 200 Unicode code points.',
    rules: 'Comparison rules', trim: 'Trim spaces around each item', trimHint: 'On by default. Turn off to preserve outer spaces. Blank-only lines are always ignored.',
    ignore: 'Ignore case', ignoreHint: 'Off by default. When on, alice and ALICE share a key; the first spelling is kept.',
    compare: 'Compare lists', example: 'Load fictional example', clear: 'Clear',
    results: 'Comparison results', note: 'First line numbers start at 1 and include blank lines. Occurrences include the first item. Each list’s repeated items appear once.',
    stats: ['Input lines', 'Blank lines ignored', 'Non-empty items', 'Unique items', 'Duplicate lines'],
    resultNames: ['Only in A', 'Only in B', 'Shared items', 'Merged list'],
    copy: 'Copy', manual: 'Manually copy the entire list in this section', noItems: 'No items to copy', waiting: 'Results appear after comparison.',
    faq: 'How it works', js: 'Enable JavaScript to compare lists locally.',
    questions: [
      ['Does this compare line by line?', 'No. It checks whether each item exists in the other list. The two lists do not need the same order. This is not a line-by-line text diff.'],
      ['What makes two items match?', 'By default, outer spaces are trimmed and matching is case-sensitive. Turn trimming off to preserve outer spaces. Ignore case uses JavaScript’s toLowerCase key. It does not normalize spelling, synonyms, NFC, or NFKC, or decide whether records represent the same person.'],
      ['What happens to duplicates in one list?', 'Each list keeps the first item’s text and line number and counts duplicate lines. Shared items use A’s first spelling. The merged list keeps A’s order, then adds items from B that have not appeared in A.'],
      ['Are the lists uploaded or saved?', 'The lists are calculated in this page’s memory without uploading or saving drafts. Leaving or reloading clears them. Your environment manages the OS clipboard, browser extensions, and the destination where you paste copied text.'],
      ['Does an empty result mean failure?', 'No. Valid lists may have no items in a category. Even two blank lists are valid. Empty results say “No matching items” and have no content to copy.']
    ]
  }
};
const sections = ['aOnly', 'bOnly', 'intersection', 'merged'];
const stats = ['rawLineCount', 'blankLineCount', 'nonEmptyLineCount', 'uniqueCount', 'duplicateCount'];

export function renderPage(language) {
  const w = labels[language];
  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'">
  <title>${w.title}</title>
  <meta name="description" content="${w.description}">
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="/styles/app.css">
  <script type="module" src="/js/app.mjs"></script>
</head>
<body>
  <a class="skip-link" href="#lists">${w.skip}</a>
  <header class="topbar"><span class="brand">Gloss Tools by GlossQuote</span><nav aria-label="${language === 'en' ? 'Language' : '語言'}"><a href="${w.languagePath}" lang="${language === 'en' ? 'zh-Hant' : 'en'}" hreflang="${language === 'en' ? 'zh-Hant' : 'en'}">${w.language}</a></nav></header>
  <main id="lists" tabindex="-1">
    <h1>${w.heading}</h1>
    <p class="intro">${w.intro}</p>
    <p class="privacy">${w.privacy}</p>
    <noscript><p class="error-notice">${w.js}</p></noscript>
    <form id="compare-form" autocomplete="off" novalidate>
      <div class="inputs">
${['a', 'b'].map(side => `        <div class="field">
          <label for="${side}-text">${w.list} ${side.toUpperCase()}</label>
          <p class="hint" id="${side}-hint">${w.inputHint}</p>
          <textarea id="${side}-text" rows="8" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="${side}-hint ${side}-counter ${side}-error" aria-invalid="false"></textarea>
          <p class="counter" id="${side}-counter"></p>
          <p class="field-error" id="${side}-error" hidden></p>
        </div>`).join('\n')}
      </div>
      <fieldset><legend>${w.rules}</legend><div class="rules">
        <label class="choice"><input type="checkbox" id="trim-items" checked><span>${w.trim}<small>${w.trimHint}</small></span></label>
        <label class="choice"><input type="checkbox" id="ignore-case"><span>${w.ignore}<small>${w.ignoreHint}</small></span></label>
      </div></fieldset>
      <div class="actions"><button id="compare" class="primary" type="submit">${w.compare}</button><button id="example" type="button">${w.example}</button><button id="clear" type="button">${w.clear}</button></div>
      <p id="error-notice" class="error-notice" role="alert" hidden></p>
    </form>
    <section class="results" aria-labelledby="results-heading">
      <h2 id="results-heading">${w.results}</h2>
      <p id="comparison-status" class="status" role="status" aria-live="polite" aria-atomic="true"></p>
      <div id="input-summary" class="input-summary" hidden>
${['a', 'b'].map(side => `        <div class="side-summary"><h3>${w.list} ${side.toUpperCase()}</h3><dl>${stats.map((key, i) => `<dt>${w.stats[i]}</dt><dd id="${side}-${key}"></dd>`).join('')}</dl></div>`).join('\n')}
      </div>
      <p class="details-note">${w.note}</p>
      <div class="result-grid">
${sections.map((section, i) => `        <section class="result-section" aria-labelledby="${section}-title">
          <div class="result-head"><h3 id="${section}-title">${w.resultNames[i]} <span class="result-count" id="${section}-count">—</span></h3><button type="button" id="${section}-copy" aria-label="${w.copy}${language === 'en' ? ': ' : '：'}${w.resultNames[i]}" aria-describedby="${section}-hint" aria-busy="false" disabled>${w.copy}</button></div>
          <p class="copy-hint" id="${section}-hint">${w.noItems}</p>
          <p class="empty" id="${section}-empty">${w.waiting}</p>
          <ul class="result-rows" id="${section}-rows"></ul>
          <p class="copy-status" id="${section}-copy-status" role="status" aria-live="polite" aria-atomic="true"></p>
          <div class="fallback" id="${section}-fallback" hidden><label for="${section}-manual">${w.manual}</label><textarea id="${section}-manual" rows="5" readonly spellcheck="false" autocomplete="off"></textarea></div>
        </section>`).join('\n')}
      </div>
    </section>
    <section class="faq" aria-labelledby="faq-heading"><h2 id="faq-heading">${w.faq}</h2>
${w.questions.map(([q, a]) => `      <h3>${q}</h3><p>${a}</p>`).join('\n')}
    </section>
  </main>
  <footer><span>Gloss Tools by GlossQuote</span><a href="${w.home}">${w.homeLabel}</a></footer>
</body>
</html>
`;
}
