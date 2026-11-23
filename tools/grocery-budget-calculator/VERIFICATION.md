# Grocery Budget Calculator — VERIFICATION

- 工具：`tools/grocery-budget-calculator/`
- 規格：`spec-grocery-budget-calculator-20261121`，規格 PR #379，登記 rev 1742
- 規格來源 commit：`354c16abacab2d9d935667f032f401834f8ccf9f`
- 工作分支：`muse/grocery-budget-calculator-production-20261121`
- 基底：`codex/initial-publication`（clone 時 head `8c265267`）
- 環境：Node v24.22.1（`node --version`）
- PR：#421（DRAFT，OPEN）— https://github.com/KYStr/glossquote-labs-home/pull/421
- 生產 commit：`ca718a13989cc271c7aa773a0eb1d00ea2930f66`（工具本體）；PR head SHA 以 `gh pr view` 在最後一次 push 後讀回、記在 parent report；本檔的補登 commit 亦為 head 的一部分。

## 命令與結果

- `node --test`：54 pass / 54 total，0 fail（2026-11-23，Node v24.22.1，duration 約 1.0 秒）。
- `node scripts/check.mjs`：pass（檔案、package 契約、fixtures hash、核心欄位／預設／範圍／表值／調整因子／範例、參照家庭每週 236.50／每月 1024.80、雙語頁、語法、worker 串接、禁能掃描、核心純度）。
- `node scripts/build.mjs --mode preview`（第一次）：9 files 寫入 `dist-preview/`，BUILD-MANIFEST.json SHA-256 `4a262f7832fde05691e6e9489225f4c4937bbd3dca33ec94aa75f972b32e0285`。
- `node scripts/build.mjs --mode preview`（第二次）：同一 SHA-256 `4a262f7832fde05691e6e9489225f4c4937bbd3dca33ec94aa75f972b32e0285`，manifest diff 為空，byte-identical。
- `node scripts/check-generated.mjs --mode preview`：pass（9 files、hash 吻合、雙語 metadata、worker source 與固定來源一致、robots.txt 拒絕全部）。
- `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 冒煙測試：GET `/` 200（text/html; charset=utf-8）、GET `/en/index.html` 200、GET `/js/worker-source.js` 200（內容為本工具產生的 worker source）、GET 不存在路徑 404、traversal `/../../etc/passwd` 404、HEAD 200、POST 405；回應標頭含 SPEC 的 CSP（default-src 'none'、script-src 'self'、style-src 'self'、worker-src blob:、img-src 'self'、connect-src 'none'、object-src 'none'、base-uri 'none'、form-action 'none'、frame-ancestors 'none'）、X-Robots-Tag: noindex, nofollow、nosniff、no-referrer、Permissions-Policy camera/microphone/geolocation 空。測試後已停止該伺服器（僅處理自己建立的程序）。註：第一次啟動的日誌中曾出現一筆 EADDRINUSE，但以 `/proc/<pid>/cmdline` 與 cwd 核實後，佔用 4173 的行程（pid 5655）即本次啟動的本工具伺服器，且回應內容逐項核對為本工具 `dist-preview/` 的 bytes；該筆 EADDRINUSE 的來源未完全查明，不影響上述已核實的回應證據。

## 測試覆蓋

- 14 筆字面核心案例（9 筆有效、5 筆錯誤）全數 deep equal；3 筆 controller 案例按 SPEC 驅動順序驗證。
- 獨立 BigInt 有理數重算：15 組 × 兩計畫 × 人數 1／10，以及戶人數 1–7、20 的邊界。
- 報告逐字比對：參考四口之家（617 bytes）與七人戶（含負調整 −43.70 美元，916 bytes）皆與 Python 獨立 canonicalizer 的輸出逐字一致。
- 另測：$143.55 half-up 邊界、戶 20／21 人、單欄 10／11 人、每月總額與明細小計和的捨入差、文法／EMPTY／INPUT_LIMIT／UNICODE／SCHEMA、時區不變性（UTC、Asia/Taipei、America/New_York、Pacific/Kiritimati）。

## NOT_RUN（未驗項，須由 reviewer 補）

- 真實隔離瀏覽器（Chrome／Edge）兩語流程：範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes；1280×800 及 320 CSS px；真實 200% zoom、reduced motion、Tab／Shift+Tab、Enter／Space、focus、狀態與錯誤、正文對比 ≥ 4.5:1、控制／大字 ≥ 3:1、主要觸控 ≥ 44×44。
- Network／Storage：乾淨隔離 profile 下初始請求、處理與重設的零工作 request、local／sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console；離線計算。
- 原生選檔／OS 下載對話：只列人工 NOT_RUN。
- 正式 HTTPS／SEO（canonical、hreflang、sitemap、robots.txt、正式 origin）：候選為 preview noindex，正式 gate 另驗。
- 九面向產品分數皆 null（未獨評前不計分）。

## 已知限制

- 實作不走登記系統（照第五輪模式），不做 registry 生產登記。
- 絕不 merge、絕不 publish；PR 為 DRAFT。
- Errata candidates 見 HANDOFF.md（共 4 條：無算術 errata；`plan` 容量／空字串未釘；25 列分頁永不觸發；SPEC 的 `src/` 路徑與任務格式不一致）。
