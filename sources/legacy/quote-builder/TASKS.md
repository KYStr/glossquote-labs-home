# 實作任務：報價單快速製作

狀態：規格，尚未實作。依序一次完成一項，失敗不可跳到後續任務。所有實作只限本工具 `AGENTS.md` 所允許的 `package.json`、`.gitignore`、`public/**`、`scripts/**`、`test/**`、`dist/**`、`HANDOFF.md`、`TASK-ENTRY.md` 及指定 `evidence/m1/**`；六份規格和共通契約在 M1 僅供閱讀。不得改兄弟工具、共用首頁、發布或系統設定。

## T00 — 建立 Node 24 scaffold

- 前置：讀完 `AGENTS.md`、六份規格及 `docs/` 共通契約；確認沒有使用者檔案作測資。
- Allowed paths：`package.json`, `.gitignore`, `public/**`, `scripts/**`, `test/**`, `TASK-ENTRY.md`。
- 建立 ESM/private package、Node `>=24` engines、四個 scripts，最小繁中/英文靜態頁、核心空模組、離線 node:test 起點、閉合 public allowlist build/check 及 loopback-only server skeleton；server 固定 `127.0.0.1:4237`。
- 驗收：`node --version` 顯示 24+；`npm test`、`npm run check`、`npm run build` 可執行；dev 僅監聽規定 loopback；此步只建立命令，不能假定預先存在。
- 完成：基底可重複建置，`TASK-ENTRY.md` 與 `HANDOFF.md` 記錄實際工具鏈及結果。

## T01 — 嚴格小數字串解析

- 前置：T00。
- Allowed paths：`public/js/core/decimal.mjs`, `test/decimal.test.mjs`。
- 實作 quantity/price/discount/tax rate 各自 scale 的純 parser；範圍先驗、拒負號/指數/逗號/空白/超精度，不經 Number。
- 驗收：固定 A07–A09、A11 及合法上下界 oracle；每個拒絕有穩定 code。
- 完成：所有 parse expected 以明確 BigInt 常數寫入測試並回寫 HANDOFF。

## T02 — 報價固定點核心

- 前置：T01。
- Allowed paths：`public/js/core/quote.mjs`, `test/quote.test.mjs`。
- 實作 schema 欄位驗證、逐項 BigInt half-up、固定折扣與一次稅額 rounding；不可混入 UI/DOM。
- 驗收：固定 A01–A06、A10、A12；另外測零列、滿列、總和超 `Number.MAX_SAFE_INTEGER` 仍精確。
- 完成：結果沒有浮點中間值，與手算 expected 完全一致；回寫 HANDOFF。

## T03 — 靜態 HTML/JSON 與嚴格匯入

- 前置：T02。
- Allowed paths：`public/js/core/safe-output.mjs`, `public/js/core/import.mjs`, `test/safe-output.test.mjs`, `test/import.test.mjs`。
- 固定模板、逐值 escape、JSON schema 1、bounded parser 與重複鍵偵測；一次序列化後實算 HTML+JSON bytes，上限 512 KiB 全有或全無。
- 驗收：固定 A13–A16；對 HTML 查無執行元素/外部資源；惡意值只當資料。
- 完成：import 不信任 computed totals，所有輸入重驗並由核心重算；回寫 HANDOFF。

## T04 — 雙語編輯與真預覽

- 前置：T03。
- Allowed paths：`public/index.html`, `public/en/index.html`, `public/styles/app.css`, `public/js/app.js`。
- 建立雙方、幣別、可新增/刪除的 1–50 品項、折扣、稅率、備註及 DOM 文字節點預覽；呈現所有指定狀態。預覽是實際報價，不以假示例替代。
- 驗收：鍵盤操作欄位、新列後焦點、錯誤欄位訊息、編輯後即時過期；雙語切換保留安全路由但不寫入輸入 URL。
- 完成：兩語可走完編輯與產生預覽；回寫 HANDOFF。

## T05 — 匯入、下載及清理生命週期

- 前置：T04。
- Allowed paths：`public/js/app.js`, `public/js/core/import.mjs`, `test/import.test.mjs`, `test/safe-output.test.mjs`。
- FileReader 讀取前檢查 512 KiB、可 abort/可取消匯入、整份確認取代；手動點下載才建立固定檔名 Blob URL，來源改動/清除/pagehide 立即撤銷。匯出 pair 為同版原子結果。
- 驗收：固定 A17–A20；取消及過期 generation 不改草稿/不復活舊輸出。
- 完成：無自動下載、無原生另存 API、清理流程和失敗復原已涵蓋；回寫 HANDOFF。

## T06 — 雙語內容與版面

- 前置：T04。
- Allowed paths：`public/index.html`, `public/en/index.html`, `public/styles/app.css`, `public/js/app.js`。
- 落實 `UX-SEO.md` 的實際雙語 title/description/H1/FAQ、產品 App 工作畫布、桌面兩欄和手機單欄頁籤；候選頁與 dist 加 `noindex,nofollow`，不自行設正式 canonical。
- 驗收：文件中的繁中/英文 copy 完整存在；320px、200% zoom、對比、focus、44px controls 由 browser gate 與可做的靜態檢查分開記錄。
- 完成：不虛構支援/合規聲明；回寫 HANDOFF。

## T07 — 安全 check/build/dev 收尾

- 前置：T00–T06。
- Allowed paths：`scripts/check.mjs`, `scripts/build.mjs`, `scripts/serve.mjs`, `test/**`, `package.json`, `.gitignore`。
- `check` 真正解析必要 ESM、資源和危險 DOM；build allowlist 拒 traversal/symlink/未知輸入，不清除不明輸出；dev 僅 loopback 並限制 method/Host/path，no SPA fallback。
- 驗收：`npm test`、`npm run check`、`npm run build`；offline HTTP 驗 GET/HEAD、404、405、Host/path traversal；先後按 repository Windows environment rules 記錄環境 fingerprint。不得開 browser 或殺非本工具程序。
- 完成：所有命令退出碼、Node 版本和偏差回寫 HANDOFF。

## T08 — M1 固定驗收與交接

- 前置：T00–T07。
- Allowed paths：`HANDOFF.md`, `TASK-ENTRY.md`, `evidence/m1/**`。
- 對照 `ACCEPTANCE.md` 每個 oracle 記 PASS/FAIL/NOT_RUN 和精確證據；browser、下載、Network/Storage、視覺 gate 按當前 focus incident 標 `NOT_RUN_USER_FOCUS_INCIDENT`，不得猜 PASS。
- 驗收：重跑最終 `npm test`、`npm run check`、`npm run build` 各一次；確認 diff 只含允許路徑；不 commit/push/deploy，不建立 production dist。
- 完成：交接實際檔案、命令/退出碼、NOT_RUN 項目、已知風險；等待主代理獨立檢查及 M2 指示。
