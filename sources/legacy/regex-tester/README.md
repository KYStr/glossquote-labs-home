# 正規表示式測試與取代 · Regex Tester and Replacer

完全在本機瀏覽器運算的正規表示式工具：使用瀏覽器內建的 ECMAScript（JavaScript）
RegExp 引擎，輸入樣式與旗標後即時看到每個符合的位置、擷取群組（具名群組以
名稱列出）與取代預覽——與你的 JavaScript 程式實際行為一致。零 runtime 依賴、
不連網、不儲存，樣式不寫入網址，關閉分頁後不留任何東西。

A regex tool that runs entirely in the browser, on the browser's own ECMAScript
(JavaScript) RegExp engine: matches are highlighted in place with their
positions, capture groups are listed (named groups by name), and replace mode
previews the exact result and count — the same behaviour your JavaScript
program would produce. Zero runtime dependencies, no network, no storage;
the pattern never enters the URL, and closing the tab leaves nothing.

## 功能 · Features

- 符合模式：標示結果、逐筆列出符合（碼元與碼點雙軌位置、群組表）、符合筆數與
  實測毫秒數；樣式錯誤顯示引擎原始訊息，與「沒有符合」明確區分
  Match mode: highlighted text, a per-match list (positions in both UTF-16 code
  units and Unicode code points, group table), match count and measured
  evaluation time; a pattern error shows the engine's message verbatim and is
  never confused with "no matches"
- 旗標 g、i、m、s、u、y 逐一開關，組裝順序固定為 gimsuy，不受點選次序影響
  Flag toggles g, i, m, s, u, y; the assembled flag string is always the
  filtered gimsuy order, independent of click order
- 取代模式：完整的 ECMAScript GetSubstitution 語義（$$、$&、$`、$'、$1…$99、
  $<name>），結果與筆數由同一次列舉產生，不可能不一致；引用不存在的具名群組
  是具名錯誤，不會悄悄當成字面文字
  Replace mode: full ECMAScript GetSubstitution semantics; the preview and the
  count come from the same enumeration, so they cannot disagree; an unknown
  $<name> is a named error state, never a silent literal
- 四組內建範例（電子郵件、ISO 日期、訂單編號、日誌時間戳），點選只填樣式與文字
  Four bundled presets (email-like address, ISO date, order number, log
  timestamp) that fill pattern and text only
- 列舉上限 1,000 筆：達到上限會明說「已停止」並標示清單為部分結果；
  零寬度符合以插入符記號呈現，未參與群組與空字串群組分開標示
  Enumeration caps at 1,000 matches and says so, labelling the list partial;
  zero-width matches render as caret markers; non-participating groups are
  shown distinctly from groups that matched the empty string
- 明白的風險提示：病態樣式可能凍結分頁，因為 JavaScript regex 無法中途喊停；
  本工具不宣稱有「逾時」或「安全模式」，輸入上限（樣式 500、文字 50,000、
  取代字串 1,000 碼點）是唯一緩解措施，超限是具名錯誤，不會靜默截斷
  Honest risk note: a pathological pattern can freeze the tab because a
  JavaScript regex cannot be interrupted; there is no "timeout" or "safe
  mode" claim — the input limits (500 / 50,000 / 1,000 code points) are the
  only mitigation, and exceeding them is a named error, never silent
  truncation

## 本機開發 · Local development

```sh
npm run dev    # serve the preview at http://127.0.0.1:4173
npm test       # node:test suites (core fixtures and controller via DOM shim)
npm run check  # project check (structure, CSP, forbidden APIs, normative fixtures)
npm run build  # copy public/ to dist/ byte-identically (preview only; production is refused)
```

## 隱私與安全 · Privacy and security

樣式與測試文字只以文字節點呈現，符合標示由 result model 逐段建成 `<mark>`
元素，使用者字串不存在任何 innerHTML 路徑；不寫入 URL、標題、日誌或任何
儲存。剪貼簿只有在按下「複製取代結果」時才寫入，而且只複製畫面上顯示的結果。

Patterns and test text render only as text nodes; highlighting is built from
the result model as `<mark>` elements, and there is no innerHTML path for user
strings. Nothing is written to the URL, title, logs, or any storage. The
clipboard is written only by the copy button's user gesture, and only with
exactly the displayed replace result.
