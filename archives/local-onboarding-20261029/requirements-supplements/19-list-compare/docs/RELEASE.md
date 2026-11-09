# 發布契約：名單比對與合併

目前任務 LIST-M2-T01 已由主代理正式放行。M1 source digest debf2c17d3130d9b78cb62a9f52263f8595637c9f87d1900bfb7748025ffaff2 已獨立驗收；此 M2 僅準備 production candidate 與 PUBLIC source，不部署。以下初始里程碑邊界仍適用。

M2 只有主代理明確放行後才建 public source repository KYStr/glossquote-labs-list-compare。使用 reviewed copy，排除 secrets、.runs、node_modules、其他產品與使用者資料。保留逐檔 bytes/hash manifest 和 ZIP；公開 URL、visibility、commit SHA 需由 GitHub 真實結果驗證後記錄。M2 不部署。

M3 僅主代理負責。正式候選為 https://lists.glossquote.com/index.html 與 /en/index.html；執行專案要求的固定 build、安全掃描、robots/sitemap、canonical/hreflang、HTTP headers/404 和真實網站雙語流程。免費 Cloudflare 部署後驗證 live bytes/headers/SEO；只有成功才在共用雙語首頁切成 published 並重建部署首頁。

任何失敗不得將預覽當 production、不得以來源 GitHub push 宣稱已部署，不得把 draft 改 published。交付使用者時標「等待外部驗收」，外部回報或必要修正未結案前，不標完成。不得花費、購買、增權或讀憑證。

## Production contract

`npm run build:production` 只產生 dist-production，來源 preview HTML/robots 保持 noindex/nofollow 與 Disallow:/。production 的 canonical/OG/zh-Hant/en/x-default 固定在 https://lists.glossquote.com/index.html 與 /en/index.html，WebApplication JSON-LD 只描述可見功能，沒有評價/價格/使用者數。JSON-LD 的兩個精確內容 hash 置入 CSP，不使用 unsafe-inline。body、所有 JS/CSS 和原 test bytes 由 frozen-behavior.mjs 逐檔保護。

Production 12 檔：兩語 HTML、5 個 ESM、CSS、robots、sitemap、404、_headers。_headers 是平台控制檔，不作公開資產；CSP connect-src none、nosniff、DENY、no-referrer、Permissions-Policy 禁止 camera/microphone/geolocation、HSTS、no-store。404 回應 noindex；正常兩頁可索引。預覽 server 仍送 noindex/nofollow。

Wrangler 配置名 glossquote-labs-list-compare，compatibility_date 2026-10-13，assets.directory ./dist-production，html_handling none、not_found_handling 404-page；無 Worker script、bindings、vars 或 credential。workers_dev/preview_urls 關閉，唯一候選 route 為 lists.glossquote.com。M2 不執行 route/DNS 變更。依明示隱私契約，logs/traces/observability 關閉；不採 skill 的一般啟用建議。

隔離 dry-run 使用既有 Wrangler 4.147.0，指定 --dry-run --autoconfig=false。只複製固定 config 與 dist-production 到新 task-owned state，給 child 臨時 home/config/cache/temp/log，環境僅 OS/tool-discovery 白名單；不繼承 credential，WRANGLER_SEND_METRICS=false，禁止自動讀 .env、不開 browser。無 npm install/npx 安裝。--help/schema 已用同一 pinned 版本核對。

官方依據（2026-10-13）：[HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)、[Custom 404](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)、[_headers](https://developers.cloudflare.com/workers/static-assets/headers/)。live routing/MIME/headers 與平台附加 header 仍必須由主代理 M3 實查。

## Source and archive

source-files.mjs 只允許本工具的明列文件、public 固定12檔、scripts/test/docs 的受限文字檔；排除 DISPATCH、.git、dist、dist-production、.runs、node_modules、憑證與他人產品。先掃描及核對精確bytes，產生新的 reviewed copy；僅在 copy 內執行 Git，core.autocrlf=false 為每命令 local 選項，不動 global/system config。source scan 不是完整個資判定；使用的範例均為既有離線假資料，發佈前仍人工核對 source allowlist。

固定 commit 以 git archive --format=zip 輸出；source-archive.mjs 有 ZIP 數量/大小/CRC、UTF-8 path/Windows collision/traversal/symlink 防護，逐檔對 commit 的 Git blob bytes，安全解壓到全新 evidence 子目錄。解壓副本重跑 npm test、check:production、build:production（含前置 build，確保沒有借用 workspace 產物），並比較原 production manifest。ZIP/commit/visibility/remote HEAD 實際證據只在驗證後記入工作目錄 HANDOFF，不以未完成狀態自我證明。
