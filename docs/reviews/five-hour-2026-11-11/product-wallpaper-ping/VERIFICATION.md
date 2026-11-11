# 離線產品驗證

Node v24.14.0。兩款皆執行 `node scripts/build.mjs --mode preview` 兩次，逐檔 bytes 與 SHA-256 相同。其後 `node --test`、`node scripts/check.mjs`、`node scripts/check-generated.mjs --mode preview` 均 exit 0。壁紙 58 項、坪數 61 項測試通過，0 失敗。壁紙首次靜態檢查發現舊 fixture 數量仍為 14，更新至 19 並鎖定新版 fixture SHA-256 後重跑通過。

另外從 repository root 執行下列命令。它將實際生成的 Worker 程式接到 Node Worker 訊息橋，並啟動、檢查及關閉兩個隔離 loopback 預覽程序。

```sh
node docs/reviews/five-hour-2026-11-11/product-wallpaper-ping/verify-worker-preview.mjs
```

壁紙六筆差異及坪數 100／30 坪兩筆均經生成的 Worker 程式核對。兩款的兩語頁與 Worker 資產均由 loopback HTTP 讀回等位元組。CSP、noindex、no-store、nosniff、無 Set-Cookie、拒絕 POST 均通過。以上證據未涵蓋真瀏覽器的 API 或畫面。

| 面向 | 壁紙離線證據 | 坪數離線證據 | 必要檢查尚缺 |
| --- | --- | --- | --- |
| functionality | 19 核心及 3 controller 字面案例。整幅、淨面積及三份 canonical 下載。 | 24 核心、3 controller、100 列速查及原 99-byte 下載。 | 兩語實際輸入與原生下載。 |
| boundaries | 超高、同高、列序、格式首錯、超量、短捲、取消與晚到結果。 | 小數位、容量、合法端點、tie、首錯、取消及晚到結果。 | 真頁面的欄位錯誤、取消及重設。 |
| privacy | 靜態能力掃描、loopback no-store、無 Set-Cookie 和 CSP connect-src none。 | 靜態能力掃描、loopback no-store、無 Set-Cookie 和 CSP connect-src none。 | 乾淨 profile 的 Network、Storage、URL 和 log。 |
| security | 純核心結構、容量、固定下載、離線控制器與 CSP。 | 惰性輸入、容量、固定下載、離線控制器與 CSP。 | 瀏覽器的惰性輸入、Worker／Blob 釋放。 |
| usability | 兩語文案、開口錯誤及等高修正後恢復結果。 | 雙語頁、畳概略、速查表、草稿與報告狀態。 | 真桌面與行動版流程。 |
| accessibility | 雙語 in-memory DOM 驗證列定位、焦點呼叫、ARIA 和狀態。 | 靜態 labels、錯誤區域及狀態。 | 鍵盤、實際焦點、輔具、320 px、200% 縮放、觸控、reduced motion。 |
| localization-seo | 雙語入口、同語回鏈、文案和 preview noindex。 | 雙語入口、同語回鏈、概略標示和 preview noindex。 | 正式 HTTPS／SEO 另驗。 |
| toolchain-provenance | 固定來源、Node 24、零依賴、生成檔重建相同。 | 固定來源、Node 24、零依賴、生成檔重建相同。 | 非作者核對固定 PR 候選。 |
| compatibility | 生成 Worker 訊息、控制器與 loopback HTTP。 | 生成 Worker 訊息、控制器與 loopback HTTP。 | 隔離 Chrome／Edge、兩語 reflow 及原生 Blob 下載。 |

必要瀏覽器、真機、輔具、Network／Storage、原生下載為 `NOT_RUN_USER_FOCUS_INCIDENT`。正式 SEO 和部署為 `NOT_RUN`。本階段 `requiredChecksComplete=false`。

