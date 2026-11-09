# 閱讀進度規劃任務證據（append-only）

## W16-26-M0 — 2026-10-16
目標：自包含規格與可重現驗收案例，實作交新原功能對話。
requested model gpt-6.1-sol/max；實際對話尚未建立，backend identity 未確認。
M1 本機、M2 GitHub、M3 hosting/首頁、外部驗收均 NOT_RUN。
原有其他工具、Windows/Git 設定與使用者變更均不可動。

後續每次追加 task ID、owner、allowed paths、實際檔案、命令/exit、測試/瀏覽器/guards/evidence，明列未驗項目。

## W16-26-M1 — 2026-10-16 — 原功能對話

Owner：thread 01a141fc-daf1-7980-aa82-93eb337a17b8，requested gpt-6.1-sol/max；backend identity 未獨立確認。沒有再委派或另開對話。

Deliverable：T00–T07 本機雙語單書閱讀規劃；核心 C01–C49、明確 plan/infeasible/invalid、所有輸入變更失效、可取消清除、日期備用模式、成功 plan 報告/複製/TXT、async/lifecycle 隔離；不做 M2/M3。

Allowed paths：本工具 package.json/.gitignore/public/**/scripts/*.mjs/test/**/dist/** 與 HANDOFF、START-HERE、project.json、docs/RELEASE-CANDIDATE、TASK-ENTRY 追加；證據只在根 .runs/reading-plan/W16-26-M1-01a141fc/。實際 23 個實作/測試/工具鏈檔及 9 個 dist 檔見固定 manifest；5 份狀態/交接檔另列於 HANDOFF。

主審 no-JS 隱私修正：兩語所有表單控制先包在 disabled fieldset，submit 自身也 disabled；raw book inputs 移除 name。submit preventDefault 與所有 handlers 安裝並 reset 完成後才啟用，最後設 data-ready。測試模組載入 404 的實際兩語瀏覽器證明欄位/submit 全 disabled、鍵盤跳過且沒有 query。noscript 提示保留。將介面 ASCII/UTF-16 技術用語換為可理解的數字/長度提示，核心規則不變。

最終命令：官方 node --version v24.14.0 / exit 0；npm test 83 PASS、0 FAIL/skip / exit 0；npm run check PASS / exit 0；npm run build PASS（9 files/60267 bytes）/ exit 0。先前開發 focused run 82 PASS；隱私修正後 affected UI/site 27 PASS。最終全 gate 只執行一次，未更改產品後重跑。

Chromium：Codex IAB User-Agent Chrome/155.0.0.0 Windows NT 10.0 x64；HTTP loopback 4206，預覽 exec session 8347 保留。兩語桌面與 320x720 emulation、native keyboard、所有欄位/7 weekdays 變更、plan/zero/infeasible、clear/日期 fallback/語言往返/metadata 通過；native Clipboard write fulfilled（沒有讀 clipboard）；native TXT 586 bytes 與報告相等。B12/B14/B15/B25 可控 handler 邏輯另用真正 app.mjs 的離線 harness，沒有冒稱原生回呼或 BFCache。

NOT_RUN：真繁中 IME、真 persisted BFCache、200% zoom、真機/虛擬鍵盤、低階/CPU 降速、完整 DevTools Network/Storage。M2 source/production、M3 hosting/首頁、外部驗收都未執行；Git settings guard M1 無 publication block，N/A。

Environment guard 前後 PASS，全 User/Machine PATH/type/length/完整 Environment fingerprint 完全相同；無 persistent/global Git/auth/env 操作。未改根、兄弟、首頁、M0 規格與既有外部包。

凍結候選 0.1.0-m1-rc1：manifest 5382 bytes / SHA-256 aae665490bc38b94217332c2864a306e841e77d8c4f1a5d09796da56490d64f2；source digest 08b3e29b134d45644827162c9423d99725eecff6cd05f0bf4257b649f12084fa。M1-ready-for-primary-review；主代理完成其最後獨立 gates 才可發 M2 GO。沒有 push/deploy 或產品 complete 宣稱。

## W16-26-M2 — 2026-10-16 — 原功能對話

Authority：主代理明確 M2 GO（先完成 M1 HANDOFF，再直接續做）；主審已親跑 M1 83/83、check/build 及 250 independent cases，詳根 .runs/new-tools-2026-10-16/26-m1-review.md。本輪無委派，M1 public 不改、不進 M3。

實際 published-source 變更：package.json 增 production/release 命令與 rc1；新增 wrangler.jsonc、scripts/m1-oracle.mjs、production.mjs、build-production.mjs、check-production.mjs、preview-production.mjs、source-policy.mjs、release-check.mjs、test/production.test.mjs；更新 README 與 append docs/RELEASE。其餘 public 9 檔、M1 舊 scripts/tests、M0 門檻規格完全保留。dist-production 12 檔獨立產出。5 份 local state/handoff 文件另行更新，不進 public source。

固定 origin/closed config 符合 GO；真實兩語 SEO/OG/WebApplication JSON-LD、精確兩個 CSP hashes、robots/sitemap/404、MIME/headers、loopback 5206 model。發佈測試以獨立 literal oracle 驗 metadata/config/HTTP，不從被測生成器取得 expected；故意加入未知檔/配置/links 的拒絕測試均為預期 PASS。

最終 root npm test 87 PASS/0 FAIL/skip，npm check/build/build:production/check:production/release:check 均 exit 0；四個 focused production tests 先通過。clean copy 同六命令全 exit 0，source/production manifest 逐檔相符。5206 真瀏覽器兩語 P5/metadata/CSP、zh infeasible/en flex，沒有 error/warn；actual HTTP 9 routes/headers/MIME/404 PASS。其餘 M1 browser 只依九檔 hash 未變重用，受限 manual 項繼續 NOT_RUN。

source copy：<LOCAL_WORKSPACE>/.runs/github-publish/glossquote-labs-reading-plan/W16-26-M2-01a141fc/source。只含 44 個 allowlisted source，排除 local chat/status/evidence/output/account data。Git block 前 capture、push 前及後 verify；只用既有官方 gh 認證與 per-command Git config/helper、child-only non-secret environment；沒有 global/system/auth/PATH 寫入或 token 讀取。新 repo 建立前 HTTP 404 是預期不存在分支，未有 gate failure。

PUBLIC https://github.com/KYStr/glossquote-labs-reading-plan；default branch codex/reading-plan-release；verified local/API/remote HEAD commit c529476f034b2b115968edc0ec14cbccbbc53bd5。ZIP .runs/reading-plan-m2/W16-26-M2-01a141fc/glossquote-labs-reading-plan-source.zip，123838 bytes / SHA-256 49a93dd78581837881a9586c623ddd1b7912c6c55b3a86edb9191fbe3002eec6；44 files/10 dirs，每檔和固定 Git blob 一致，CRC/decompression/path/commit comment 檢查 PASS。

M2 release manifest 11315 bytes / SHA-256 1e4284f60df775049886ef3e777ee980b1f2cbfd17769e498d84fe0bf78e8905；44 source/279218 bytes、M1 public9/60267、production12/65324。Windows完整前後 fingerprints 相同；Git settings guard PASS。M2 frozen、等待主代理獨立驗收與部署；沒有 Cloudflare invocation/deployment/homepage 修改/產品 complete 宣稱。兩個 owned preview sessions 8347/22836 保留。
