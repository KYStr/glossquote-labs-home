# 打字速度測驗 · Typing Speed Test

完全在本機瀏覽器運算的打字測驗：30 或 60 秒，英文與繁體中文文章各六篇，
照著文章逐字鍵入。計分公式固定且公開在頁面與本文件：逐位置比對（漏一字，
後面全錯位，直到退格修正）、第一個送出的字元開始計時、注音拼音組字不計分。
英文以 WPM 計、中文以 CPM 計，中文成績絕不冠上 WPM。零 runtime 依賴、
不連網、不儲存，測驗只存在於記憶體。

A typing test that runs entirely in your browser: 30 or 60 seconds,
six English and six Traditional Chinese passages bundled. The scoring
formulas are fixed and published on the page and here: strictly
positional comparison (a missed character poisons every later
position until you backspace and fix it), the timer starts at the
first committed character, and IME composition is never scored.
English scores in WPM, Chinese in CPM — a Chinese result never
carries a WPM headline. Zero runtime dependencies, no network, no
storage; the attempt exists in memory only.

## 計分公式 · Scoring formulas

- 英文：總 WPM ＝ 總字元 ÷ 5 ÷ 分鐘；淨 WPM ＝ 正確字元 ÷ 5 ÷ 分鐘
  （淨值直接由正確字元定義，不用總值乘準確率，避免捨入不一致）。
- 中文：總／淨 CPM ＝ 總／正確字元 ÷ 分鐘，標題為「字元/分鐘 (CPM)」。
- 準確率 ＝ 正確 ÷ 總字元（百分比，小數一位）；速度整數四捨五入（0.5 進位）。
- 時間到以完整選定秒數計；提前打完以實際用時（0.1 秒）計。

- English: gross WPM = total characters ÷ 5 ÷ minutes; net WPM =
  correct characters ÷ 5 ÷ minutes (defined directly from correct
  characters, never gross × accuracy, so rounding cannot disagree).
- Chinese: gross/net CPM = total / correct characters ÷ minutes,
  headlined as characters per minute (CPM).
- Accuracy = correct ÷ total (percent, one decimal); speeds round to
  integers, halves away from zero.
- Expiry uses the full chosen duration; completion uses the actual
  elapsed time to one decimal.

## 文章 · Passages

六篇英文（600–900 字元）與六篇中文（300–500 字元）皆為本工具原創，
出處清單與內容規則見 `PASSAGES.md`，由測試逐篇驗證（字元集、長度、
單一空格、BMP 限定）。自動化測試使用另一組短 fixture 文章
（`test/fixtures/passages.mjs`），不與產品文章混用。

All twelve passages are original for this tool; see `PASSAGES.md`
for the source lines and content rules, validated passage by passage
in the test suite. Automated tests use a separate short fixture set
(`test/fixtures/passages.mjs`), never the product passages.

## 本機執行 · Run locally

```sh
npm run dev     # 本機靜態伺服（public/）
npm test        # node:test 核心與控制器測試
npm run check   # 專案檢查（結構、CSP、禁用能力、文章契約、規格 fixture）
npm run build   # 產生 preview dist（重跑應逐字節相同）
```

Node 24、零 npm 依賴。正式站台網址尚未核准，production build 一律拒絕
（見 `scripts/release.mjs`）。

Node 24, zero npm dependencies. No production site URL has been
approved, so production builds are refused by design (see
`scripts/release.mjs`); the preview build is what this candidate ships.

## 規格 · Specification

實作依 `KYStr/glossquote-labs-home` 的 `docs/specs/typing-speed-test/SPEC.md`
（spec PR #34）。驗證證據見 `VERIFICATION.md`，候選凍結清單見
`CANDIDATE-MANIFEST.json`，製作模式見 `PRODUCTION-STATUS.md`。

Built to `docs/specs/typing-speed-test/SPEC.md` in
`KYStr/glossquote-labs-home` (spec PR #34). Evidence:
`VERIFICATION.md`; frozen candidate inventory:
`CANDIDATE-MANIFEST.json`; build mode: `PRODUCTION-STATUS.md`.

注意：規格 §4 稱其範例文章為 45 字元，但引用的字串實際為 44 字元；
本實作保留字串原文並以公式為準（完成 fixture 的淨 WPM 為 26 而非
規格所寫的 27），詳見 `VERIFICATION.md` 的規格缺陷記錄。

Note: section 4 of the specification calls its fixture passage
45 characters, but the quoted string has 44; this build keeps the
string verbatim and follows the formulas (the completion fixture's
net is 26, not the specification's 27) — see the defect record in
`VERIFICATION.md`.
