# 實作任務：重複檔案找出來

M1 僅修改 package.json、.gitignore、public/**、scripts/**、test/**、dist/**、HANDOFF.md、TASK-ENTRY.md、本工具 evidence/m1/**。六份規格及共同 docs 唯讀。不開 chat、不遞迴委派、不 npm install、不執行 browser/native UI、不部署或公開 GitHub。Node 24 ESM 原生 APIs；offline 合成資料。dev 只綁 127.0.0.1:4228（4180+48），port 衝突回報 parent，不殺程序。

## T00 — Scaffold

Prerequisite：讀本工具 AGENTS.md、START-HERE.md、HANDOFF.md、docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/DESIGN-SYSTEM.md 和六份規格。

Allowed：package.json、.gitignore、public/index.html、public/en/index.html、public/css/**、public/js/**、scripts/**、test/**。

建 private ESM package、兩份獨立雙語靜態頁、普通語言 anchor 及未匯出資料遺失警語、title/description、noindex、loopback-only static server、Node24 node:test/check/build skeleton。Server 只 serve public/，拒絕 traversal、非 GET/HEAD、未知 MIME。不得 remote resource、persistent storage、service worker。

scripts 建好後執行 node --version、npm test、npm run check、npm run build；不要 npm install。若 script 不存在先建立，不能標不存在命令為通過。

完成條件：Node major 24、dev/test/check/build 四個 scripts、127.0.0.1:4228、M1 noindex、clean dist 僅含 public；記錄實際命令和 exit；browser 未跑。

## T10 — Limits、hash、byte proof

Prerequisite：T00 gates 全通過。

Allowed：public/js/core/**、public/js/analysis-worker.js、test/**，必要時 scripts/check.mjs。

實作 count/size validation、SHA-256 adapter、size bucket、hash candidate、64 KiB byte comparator、stable groups/default keeper、JSON/TXT serializers。digestProvider 可注入模擬碰撞；production 用原生 SHA-256。測 D48-01–15、D48-18–23、D48-25 和 comparator 邊界；建立 all-or-nothing result 及 worker progress/cancel/epoch protocol。

執行 npm test、npm run check、npm run build。完成條件：SHA fixture、exact groups/stats、forced collision byte split、empty file、limits、schema/TXT escaping、無 partial results 全過；無 network。

## T20 — 雙語群組和 keeper UI

Prerequisite：T10 tests/check/build 通過。

Allowed：public/index.html、public/en/index.html、public/css/**、public/js/**、test/**。

建立 file input/drop、source order list/remove、hash/verify progress+cancel、duplicate groups/singletons、每組 keeper radio、summary、JSON/TXT downloads、empty/error/cancel/stale/reset states。source change 全面 invalidates 結果；keeper change 只重建報告。不提供檔案刪除操作。檔名以文字節點和 escape 顯示。語言 anchor 導頁會清除未下載結果並展示 warning；不做跨頁保存。

執行 npm test、npm run check、npm run build。完成條件：兩頁各自完整雙語文案；stale worker/keeper/reset cleanup 有自動測試；keeper 只能選同組成員；不設結果 auto-expiry。

## T30 — 邊界和 M1 收尾

Prerequisite：T20 gates 通過。

Allowed：public/**、scripts/**、test/**、dist/**、HANDOFF.md、TASK-ENTRY.md、evidence/m1/**。

補 200 files、32 MiB、128 MiB 上下界、same-name-different-content、hash collision、control/bidi/markup escaping、multi-chunk byte differences、worker read/digest error、cancel stale、report exact keys 和 no-auto-expiry checks。確認兩個語言頁、離頁警語、noindex、中英 title/description/H1/FAQ。build candidate；記錄 SHA-256、命令/exit、browser NOT_RUN 和剩餘限制。

執行 node --version、npm test、npm run check、npm run build；只依真實結果標 CLI PASS；browser 仍 NOT_RUN_USER_FOCUS_INCIDENT。完成條件：可操作雙語本機 candidate、byte-verified duplicates、keeper 選擇、JSON/TXT 報告、M1 CLI gates 通過；回報 parent。M2 另等 parent 放行。
