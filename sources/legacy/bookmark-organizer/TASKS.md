# 實作任務：書籤匯出整理

M1 只改 package.json、.gitignore、public/**、scripts/**、test/**、dist/**、HANDOFF.md、TASK-ENTRY.md、本工具 evidence/m1/**。六份規格和共同 docs 唯讀。不開 chat、不遞迴委派、不 npm install、不執行 browser/native UI、不部署/公開 GitHub。Node24原生ESM；offline合成exports。dev只綁127.0.0.1:4229（4180+49）；port conflict 回報 parent，不殺程序。

## T00 — Scaffold

Prerequisite：讀本工具 AGENTS.md、START-HERE.md、HANDOFF.md、docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/DESIGN-SYSTEM.md 和六份規格。

Allowed：package.json、.gitignore、public/index.html、public/en/index.html、public/css/**、public/js/**、scripts/**、test/**。

建立 private ESM、兩個獨立語言頁、普通語言 anchor 和未匯出狀態遺失警語、title/description、noindex、loopback static server、Node24 test/check/build scripts。Server 僅 serve public/，拒絕 traversal、非 GET/HEAD、未知 MIME；禁止 remote resources、storage、service worker。建立後執行 node --version、npm test、npm run check、npm run build；不 npm install，scripts 不存在時先建好再執行。

完成條件：Node major 24、四個 scripts、server 127.0.0.1:4229、兩頁 noindex、clean dist 只含 public；記錄命令/exit。Browser 尚未執行。

## T10 — Bounded tokenizer、parser 與 safety oracle

Prerequisite：T00 gates 通過。

Allowed：public/js/core/**、public/js/parse-worker.js、test/**，必要時 scripts/check.mjs。

實作 fatal UTF-8 decoder、2 MiB byte cap、wrapper token allowlist、DL/DT/H3/A/P tokenizer/parser、attribute/entity allowlists、tree/path builder、URL safety parser 和 exact href groups。Parser worker 接 jobId/cancel; parse error all-or-nothing。增加 K49-01–21、K49-26、K49-29、K49-30。使用合成 Firefox-like、Chrome-like、Safari-like fixtures。

執行 npm test、npm run check、npm run build。完成條件：三種 profile fixture 驗明確 allowlist；unknown tag/entity/attr/structure 全拒，零 partial output；URL tests證明不 fetch；Node tests offline。

## T20 — 手動整理與輸出

Prerequisite：T10 oracle 全過。

Allowed：public/index.html、public/en/index.html、public/css/**、public/js/**、test/**。

實作完整 tree preview、精確 duplicate group、included defaults、suggested keeper、group keeper、經確認排除、手動 move/new folder、HTML export、JSON backup、重選/reset/cancel/error states。所有 folder/title/href 作文字；HTML escape 分 context，A title &lt;img...&gt; 解碼一次、preview plain text、輸出 escape 一次回 &lt;img...&gt;；測試不得看到 &amp;lt; 或建立 img。JSON 包含排除列。HTML只輸出included列。中英文獨立 pages，不跨頁保存。

執行 npm test、npm run check、npm run build。完成條件：K49-22–25通過；輸出 HTML 可由本工具 parser 重新解析為等價 included tree；生成檔只由下載按鈕。

## T30 — 惡意邊界、SEO 和 M1 收尾

Prerequisite：T20 checks 通過。

Allowed：public/**、scripts/**、test/**、dist/**、HANDOFF.md、TASK-ENTRY.md、evidence/m1/**。

補足 2MiB、3000 links、12 levels、UTF8 errors、unknown token/attr/entity、credential/unsafe URLs、amp/markup escaping、folder move/include confirm、partial failure、pagehide cleanup tests。確認 noindex、兩語 Title/Description/H1/FAQ、跨頁 warning、browser NOT_RUN。build candidate並記錄 SHA-256、每條CLI命令/exit、未驗 gates/限制。

執行 node --version、npm test、npm run check、npm run build；只依實際結果標 CLI gate PASS。browser 維持 NOT_RUN_USER_FOCUS_INCIDENT。M1完成條件：可操作本機 bilingual candidate、exactURL groups、手動 tree/include editor、有效 HTML/JSON outputs、CLI checks 通過；回報 parent。M2 需 parent 另行放行。
