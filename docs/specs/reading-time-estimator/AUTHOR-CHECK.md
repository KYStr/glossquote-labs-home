# 閱讀時間估算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（run 5 規格作者，本件由上層統籌登記與送審，作者未執行任何 registry/coordination 指令）。作者文件核對，待非作者 readiness。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。格式對齊 docs/SPECIFICATION-STOCK.md 與模板規格 docs/specs/retry-budget/。

- 去重比對：本批盤點中最相近者兩件，差異已寫入 SPEC scope 並在此確認——
  - `word-frequency`（字詞頻率）：交付逐詞／逐字頻率表、排名、百分比與篩選，屬統計分析；其分詞以 Unicode 字母連續段＋內部撇號切詞並做大小寫摺疊。本工具只輸出總計數換算時間，不列任何單項，且分詞刻意簡化為「空白分詞＋token 含 ASCII 字母或數字」（`well-known` 在該工具是 2 詞、在本工具釘版為 1 詞），理由是估算規則必須可手算重現。交付物不重疊。
  - `text-to-speech-reader`（語音朗讀器）：以 Web Speech API 實際播放語音、含播放狀態機。本工具只估算朗讀秒數、不發聲。交付物不重疊。

- 速度預設的依據（四值皆為「公開常見範圍內選定的可調慣例值」，SPEC 與 FAQ 均如此標示，不宣稱為常數）：
  - 中文靜讀 400 字/分：概念備註 #32 釘版值；成人中文靜讀速率在公開研究與工具慣例中常見約 400–600 字/分，取範圍下限作保守預設。
  - 中文朗讀 240 字/分：概念備註 #32 釘版值；中文簡報／朗讀語速常見約 240–300 字/分，取下限。
  - 英文靜讀 200 詞/分：Brysbaert (2019, Journal of Memory and Language) 英文靜讀統合分析平均約 238 wpm；200 在常見 200–250 wpm 範圍內，取保守整數。
  - 英文朗讀 150 詞/分：英語公開演說／朗讀常用 130–160 wpm 範圍（口語溝通教學的通行值），取中段 150。

- 計數單位的刻意不一致已雙重釘版：本文上限以 UTF-16 單位計（100,000）、計數以 code point 計；`astral-cjk` 案例（U+20000 佔 2 單位、計 1 字）與 `input-limit` 案例分別釘住兩邊。

- 字面案例 20 筆：17 核心＋3 controller。每筆 expected 先由作者依 SPEC 規則手算（第一推導），再以獨立撰寫的 Python 腳本照釘版規則重算（精確 `Fraction` 有理數、half-up 只對總秒數作用一次、空白集合與漢字區段逐項照 SPEC 常數），17/17 核心案例全數相符才寫入 fixtures；controller 案例的 lateResult 直接取已驗證的核心結果。手算要點（逐字核對）：
  - `zh-basic`「閱讀時間估算」：閱、讀、時、間、估、算共 6 字；靜讀 6×60/400 = 0.9 → 1 秒；朗讀 6×60/240 = 1.5 → half-up 2 秒。
  - `mixed-sum-rounding`「我想學 English words 每天」：漢字逐字為 我(1) 想(2) 學(3)，`English`、`words` 兩 token 各含 ASCII 字母計 2 詞，每(4) 天(5)，漢字共 5；靜讀 5×60/400 + 2×60/200 = 0.75 + 0.6 = 1.35 → 1 秒（若逐項先捨入得 1 + 1 = 2 秒，此案例專門釘住「只捨入一次」）；朗讀 1.25 + 0.8 = 2.05 → 2 秒。
  - `cjk-punctuation`「你好，世界！這是測試。」：計字者為 你、好、世、界、這、是、測、試共 8 字；，（U+FF0C）、！（U+FF01）、。（U+3002）皆不在漢字區段；全文無空白故只有 1 個 token，且不含 ASCII 字母數字，詞數 0。
  - `apostrophe-date-tokens`：token 依序為 `don't`（含字母，1）、`count`（1）、`2026-11-09`（含數字，1；連字號不切分）、`twice`（1），共 4 詞。
  - `fullwidth-not-normalised`「ＡＢＣ １２３ 中」：ＡＢＣ（U+FF21–FF23）與 １２３（U+FF11–FF13）不是 ASCII，不令 token 成詞，也不入漢字區段；中（U+4E2D）計 1 字。靜讀 0.15 秒、朗讀 0.25 秒皆捨入為 0，顯示 `0:00`——非零計數可以得到 0:00，是刻意釘版的顯示語義。
  - `astral-cjk`「𐀀😀好」：𐀀 = U+20000（擴展 B，計 1 字、2 個 UTF-16 單位）、😀 = U+1F600（不計）、好 = U+597D（計 1 字），漢字 2；朗讀 2×60/240 = 0.5 → half-up 1 秒；靜讀 0.3 → 0 秒。
  - `half-up-ties`「一二三四五六七八九十」10 字：靜讀 1.5 → 2、朗讀 2.5 → 3；2.5 進位為 3 釘住 half-up（銀行家捨入會給 2）。
  - `hours-format`：本文為「字」重複 3000 次（建構即計數：3000 字，獨立腳本覆核同值）；靜讀速度改 50 字/分 → 3000×60/50 = 3600 秒整，顯示 `1:00:00`；朗讀 3000×60/240 = 750 秒 = `12:30`。
  - `kana-hangul-not-cjk`「カタカナ test test 한글 test」：カタカナ（片假名）與 한글（韓文音節）兩 token 皆不計；`test` ×3 計 3 詞；靜讀 3×60/200 = 0.9 → 1、朗讀 3×60/150 = 1.2 → 1。
  - `input-limit`：本文為 `a` 重複 100,001 次，UTF-16 單位 100,001 > 100,000 → INPUT_LIMIT（field `text`），先於任何計數。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
