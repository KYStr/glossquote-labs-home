# 開始：閱讀進度規劃

2026-10-16：M1 已由主代理獨立通過並發 M2 GO；M2 候選 0.1.0-rc1 已完成公開來源與固定 ZIP，凍結等待主代理 M2 獨立驗收。87 tests、check/build、build:production/check:production/release:check 與獨立發布副本的全部六項命令 exit 0。M1 public 九檔未改；M2 production 12 檔/65324 bytes。hosting、首頁及外部驗收尚未執行；不代表 live。

閱讀順序：AGENTS.md → PRODUCT.md → TECHNICAL.md → UX-SEO.md → ACCEPTANCE.md → TASKS.md → docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/DESIGN-SYSTEM.md、docs/RELEASE.md。HANDOFF.md 與 TASK-ENTRY.md 記錄實際進度，project.json 記錄固定版本。

原功能對話已完成 M1 與獲 GO 的 M2。公開 repo：https://github.com/KYStr/glossquote-labs-reading-plan；PUBLIC，default branch codex/reading-plan-release，verified commit c529476f034b2b115968edc0ec14cbccbbc53bd5。M3 部署及共用首頁由主代理處理，本對話不進 M3。使用 C:/Program Files/nodejs 下 Node 24.14.0 與 npm.cmd；ESM/built-ins，無需安裝依賴。公開來源排除本機狀態/聊天識別/交接及 .runs；發布後 attestation 留在本機 HANDOFF 與根證據，不改固定 commit。

M1 預覽：http://127.0.0.1:4206/index.html 及 /en/index.html；exec session 8347 保留，dist/noindex。M2 HTTP model：http://127.0.0.1:5206/index.html 及 /en/index.html；exec session 22836 保留，不是 Cloudflare runtime。M2 證據：根 .runs/reading-plan-m2/W16-26-M2-01a141fc/，含 release-manifest.json（11315 bytes / SHA-256 1e4284f60df775049886ef3e777ee980b1f2cbfd17769e498d84fe0bf78e8905）。正式網址 reading.glossquote.com 未部署；不得提前進首頁 published 清單。
