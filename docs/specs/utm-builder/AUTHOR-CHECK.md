# UTM 連結產生器 — 作者檢查

作者為 run 6 規格作者子代理，分支 `muse/spec-utm-builder-20261121`。登記、claim 與提交由家長執行（依任務簡報，本人未跑任何 registry / coordination 指令）。作者文件核對，待非作者 readiness；作者不得稱自己的文件為獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對 run 6 概念清單：最相近為概念 34 url-slug-generator（另案待派，網址 slug 美化）與 url-inspector（網址檢查解析）；差異寫進 SPEC scope 節——本工具是行銷追蹤參數附加，不改寫路徑、不做網址健檢。
- 18 筆字面案例：15 筆核心、3 筆 controller。`basic-social` 核對點為「基本社群連結，三個必填參數」。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。

## 第一種推導：手算

每個 expected 皆先依 SPEC 釘版規則手算，再以 script 獨立重算（見下節）。手算要點：

- 編碼表（`encodeURIComponent` 語義，不編碼的字元僅限 `A–Z a–z 0–9 - _ . ! ~ * ' ( )`）：空格 → `%20`；`/` → `%2F`；`%` → `%25`；`!` 不編碼。
  - `encoding-spaces-specials`：`meta ads` → `meta%20ads`；`social/post` → `social%2Fpost`；`summer sale 2026!` → `summer%20sale%202026!`。
  - `percent-in-value`：`50% off` → `50%25%20off`（`%` 不先解碼，故不產生雙重處理）。
- 中文 UTF-8 手算（`encoding-unicode`，十六進位大寫）：
  - 夏 U+590F = 0101 1001 0000 1111 → 三位元組 1110_0101 10_100100 10_001111 → E5 A4 8F → `%E5%A4%8F`
  - 季 U+5B63 = 0101 1011 0110 0011 → E5 AD A3 → `%E5%AD%A3`
  - 特 U+7279 = 0111 0010 0111 1001 → E7 89 B9 → `%E7%89%B9`
  - 價 U+50F9 = 0101 0000 1111 1001 → E5 83 B9 → `%E5%83%B9`
  - 合併：`夏季特價` → `%E5%A4%8F%E5%AD%A3%E7%89%B9%E5%83%B9`。
- 合併手算：`existing-query` 的 `?id=42&ref=home` 原樣保留在前，UTM 以 `&` 接續；`existing-fragment` 的 `#section2` 原樣移到 UTM 之後；`trimmed-values` 的網址與 source 前後空白先去除。
- 錯誤手算（依驗證順序：容量 → 網址解析／重複 → 逐欄）：
  - `duplicate-utm-error`：既有查詢含 `utm_source` → DUPLICATE_UTM / baseUrl。
  - `invalid-url-noscheme`：`example.com/page` 無 scheme，WHATWG URL 解析失敗 → INVALID_URL / baseUrl。
  - `invalid-url-ftp`：scheme 非 http/https → INVALID_URL / baseUrl。
  - `missing-campaign`：campaign 去空白後為空 → EMPTY / campaign。
  - `control-char`：campaign 含 Tab（U+0009）→ INVALID_CHAR / campaign。
  - `value-too-long`：campaign 為 101 個 `a`（10 個一組數 10 組再加 1 個），去空白後 101 > 上限 100 → VALUE_TOO_LONG / campaign。
- Controller 三案為狀態機手算，對照 SPEC userFlow 狀態表：dirty 立即撤銷舊結果與下載；cancel 後晚到的舊世代結果不得復活；新工作出錯後舊世代的成功不得覆寫目前錯誤。

## 第二種推導：獨立 script 重算

Script 為作者另寫的 `/tmp/utm-verify.mjs`（Node 24 built-ins，僅讀 fixtures.json；依 SPEC 規則獨立實作，以 `encodeURIComponent` + WHATWG URL 驗證，不取用產品程式）。比對為順序無關的深層比對（canonical JSON：object keys 排序後比較）。

- 結果：15 筆核心案例 15 passed、0 failed；3 筆 controller 案例以狀態表手算核對（script 跳過，見上節）。
- Script 另行印出 `value-too-long` 的 campaign raw 長度為 101，佐證手算的 101 個字元。
- 初次執行時 15 筆皆顯示 FAIL，原因僅為比對用的 `JSON.stringify` 受 object key 順序影響（值本身全部一致）；修正比對為 canonical 深層比對後全數通過。此為比對器問題，非 fixture 錯誤，已記錄於此。

## 刻意釘版的決定（供 reviewer 注意）

- 目標網址已含 `utm_*` 時拒絕（DUPLICATE_UTM），不覆寫、不合併去重。
- 剪貼簿：本工具明確允許在使用者點擊「複製連結」時呼叫 `navigator.clipboard.writeText`（只寫當次產出的 taggedUrl），失敗回 COPY_FAILED；這是本工具的交付動作，與 retry-budget 禁剪貼簿的選擇不同，是刻意的。
- 範本只填 source 與 medium、清空 term 與 content，campaign 保持原值不動。
- 輸出不補斜線、不做大小寫正規化；既有查詢與 fragment 皆原樣保留。
