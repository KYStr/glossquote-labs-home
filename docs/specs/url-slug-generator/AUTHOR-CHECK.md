# 網址 slug 產生器 — 作者檢查

作者為 run 6 規格作者子代理，分支 `muse/spec-url-slug-generator-20261121`。登記、claim 與提交由家長執行（依任務簡報，本人未跑任何 registry / coordination 指令）。作者文件核對，待非作者 readiness；作者不得稱自己的文件為獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對 run 6 概念清單：最相近為概念 33 utm-builder（同批另案進行中，行銷追蹤參數附加）與 url-inspector（網址檢查解析）、placeholder-text-generator（填充文字）；差異寫進 SPEC scope 節——本工具是「標題變路徑文字」，不產生完整網址、不附加查詢參數、不做網址健檢、不生產填充文字。
- 19 筆字面案例：16 筆核心、3 筆 controller。`basic-title` 核對點為「基本標題轉 slug（大小寫、標點、所有格）」。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。

## 第一種推導：手算

每個 expected 皆先依 SPEC 釘版規則手算，再以 script 獨立重算（見下節）。長度一律以 UTF-16 code units 計；slug 已全為 ASCII，故等於字元數。

- `basic-title`：`Hello World: A Beginner's Guide!` → 小寫 → 分隔字元段（空白、`:`、所有格 `'`、`!`）各折為一個 `-` → 記號 hello｜world｜a｜beginner｜s｜guide → `hello-world-a-beginner-s-guide`。長度 5+1+5+1+1+1+8+1+1+1+5 = 30；maxLength 空字串 → 預設 50；30 ≤ 50 → truncated false。
- `accent-fold`：NFKD 拆解 é → e + U+0301、û → u + U+0302、è → e + U+0300，移除結合符號後得 `cafe au lait & creme brulee` → `cafe-au-lait-creme-brulee`。長度 4+1+2+1+4+1+5+1+6 = 25。
- `special-latin-map`：Æ → AE、所有格 `'` 為分隔、Œ → OE、em dash 為分隔、ß → ss、Ł → L、ó → o（NFKD 拆解去符號）、ź → z（NFKD 拆解去符號）→ 記號 aesop｜s｜oeuvre｜strasse｜lodz → `aesop-s-oeuvre-strasse-lodz`。長度 5+1+1+1+6+1+7+1+4 = 27。注意所有格使 `Æsop's` 成為 `aesop-s` 兩段，不是 `aesops`。
- `chinese-dropped`：`2026 台北 Taipei 旅行指南` 中 `台北`、`旅行指南` 各為一段分隔字元（與空白合併，不留多餘連字號）→ `2026-taipei`。長度 4+1+6 = 11。
- `chinese-only-empty`：`你好世界` 四字全為分隔字元，去頭尾連字號後為空 → EMPTY_SLUG / title。
- `hyphen-collapse-trim`：`---Hello---World___2026---`，連續分隔字元（含底線 `___`）各併為一個 `-`，去頭尾連字號 → `hello-world-2026`。長度 5+1+5+1+4 = 16。
- `truncate-clean`：全 slug 為 `the-quick-brown-fox-jumps-over-the-lazy-dog-near-the-river-bank`，長度 3+1+5+1+5+1+3+1+5+1+4+1+3+1+4+1+3+1+4+1+3+1+5+1+4 = 63 > 20。截為前 20 字元得 `the-quick-brown-fox-`（第 20 字元恰為 `-`），去除尾端連字號 → `the-quick-brown-fox`，長度 19，truncated true。
- `truncate-exact`：`hello-world` 長度 11，恰等於 maxLength 11，不大於 → 不截斷，truncated false。
- `truncate-tiny`：maxLength 1，截為 `h`，長度 1，truncated true。
- `numbers-kept`：`Top 10 Tips for 2026!` → `top-10-tips-for-2026`。長度 3+1+2+1+4+1+3+1+4 = 20。
- `fullwidth-and-ligature`：NFKD 折疊全形 `Ｈｅｌｌｏ` → `Hello`、`Ｗｏｒｌｄ` → `World`，連字 ﬁ U+FB01 → `fi`，全形冒號為分隔 → `hello-world-file-2026`。長度 5+1+5+1+4+1+4 = 21。
- 錯誤手算（依驗證順序：容量 → surrogate → 逐欄文法 → 轉換後空 slug）：
  - `empty-title`：title 為空字串 → EMPTY / title（文法步驟，未進轉換）。
  - `maxlength-zero-range`：`0` 通過整數格式（`0` 或非零開頭），但超出範圍 1–100 → RANGE / maxLength。
  - `maxlength-noninteger`：`12.5` 不符 `^(0|[1-9][0-9]*)$` → INTEGER_FORMAT / maxLength。
  - `title-too-long`：title 為 1001 個 `a`（10 個一組數 100 組再加 1 個，產生器印出長度 1001 佐證），1001 > 上限 1000 → INPUT_LIMIT / title（容量最先檢查）。
  - `whitespace-only-slug`：raw `   ` 非空，通過 EMPTY 檢查；轉換後全為分隔字元、去頭尾後為空 → EMPTY_SLUG / title。與 `empty-title` 的區別即在此。
- Controller 三案為狀態機手算，對照 SPEC userFlow 狀態表：dirty 立即撤銷舊結果與下載；cancel 後晚到的舊世代結果不得復活，重設回預設 `{"title":"","maxLength":"50"}`；新工作出錯後舊世代的成功不得覆寫目前錯誤。

## 第二種推導：獨立 script 重算

Script 為作者另寫的 `/tmp/slug-verify.mjs`（Node v24.22.1 built-ins，僅讀 fixtures.json；依 SPEC 規則獨立實作 NFKD + 結合符號移除 + 特殊字母表 + 分隔折疊 + 截斷，不取用產品程式）。比對為順序無關的深層比對（canonical JSON：object keys 排序後比較）。

- 結果：16 筆核心案例 16 passed、0 failed；3 筆 controller 案例以狀態表手算核對（script 跳過，見上節）。
- Script 另行印出 `title-too-long` 的 title raw 長度為 1001，佐證手算的 1001 個字元。
- 初次執行即全數通過，無需修正 fixture。

## 刻意釘版的決定（供 reviewer 注意）

- 中文不做拼音轉寫：零依賴離線工具沒有拼音字典；拼音需分詞、聲調與多音字表，無法以釘版小規則窮舉、結果不可重現；保留原字會破壞「ASCII-only slug」承諾，百分比編碼後不可讀。捨棄是唯一能用小規則完整釘版的選擇。純中文標題回 EMPTY_SLUG，不 fallback 成 `untitled`，避免不同文章撞同一個 slug。
- 特殊字母對照表為封閉表，僅 14 項（大小寫成對，ß 只有小寫）；大寫 ẞ U+1E9E 不在表內，視為分隔字元。其他所有非 ASCII 字母、emoji、符號皆為分隔字元。
- 底線是分隔字元（變連字號），不是保留字元；數字保留；全形字母數字與連字由 NFKD 步驟處理。
- maxLength 預設 50、範圍 1–100；空字串視為未提供、套用預設 50。截斷後去除尾端連字號；長度恰等於上限不截斷。
- 剪貼簿：本工具明確允許在使用者點擊「複製 slug」時呼叫 `navigator.clipboard.writeText`（只寫當次產出的 slug），失敗回 COPY_FAILED；這是本工具的交付動作，與 retry-budget 禁剪貼簿的選擇不同，是刻意的（與 utm-builder 相同選擇）。
- 與 utm-builder 的差異已寫進 scope：utm-builder 是「連結加追蹤參數」（路徑原樣保留），本工具是「標題變路徑文字」（不產生完整網址、不附加查詢參數）。
