# 發布契約：行李清單與重量試算

狀態：M1 R1 已主驗放行；M2 正式候選可建置，source 的 verified commit/ZIP 在交接證據記錄。本文不宣稱 live deployment。

## M2 建置與安全檢查

`npm test`、`npm run check`、`npm run build`、`npm run build:production`、`npm run check:production`、`npm run check:release`。Node24+、零runtime/dev依賴，無須npm install。public的7個原始HTML/JS/CSS bytes保持主驗版本；只加 preview robots.txt（Disallow:/），原4202服務保留且頁面仍noindex。正式12個資產由 scripts/production-build.mjs 產生在 dist-production/，不覆寫preview頁面。

正式頁面含自己的canonical、互返zh-Hant/en/x-default、OG與對應可見文字的WebApplication JSON-LD、matching-language首頁回鏈；正式robots允許抓取並只列兩語sitemap。CSP禁connect/worker/inline eval，JSON-LD用sha256 hash白名單；_headers精確給4個.mjs MIME，避免把missing404誤標成JavaScript。Cloudflare assets使用404-page與none HTML handling，沒有SPA fallback或Worker程式。logs/traces/logpush與Wrangler send_metrics/dependency instrumentation關閉；不宣稱能關閉平台必需的彙總計費量測。

本機production-serve只是驗證adapter，真正unknown route回404、兩語404與正確MIME/headers；不是Cloudflare live證據。部署與live HTTP/headers/首頁由主代理M3驗。官方參考：[404路由](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)、[headers](https://developers.cloudflare.com/workers/static-assets/headers/)、[Wrangler配置](https://developers.cloudflare.com/workers/wrangler/configuration/)。

Reviewed source只列SOURCE_FILES，排除HANDOFF/TASK-ENTRY/project/DISPATCH、.runs、產物、下載、cache和憑證。README在publishing copy生成公開用途與重現命令；公開repo不是授權聲明，不自行加LICENSE。commit固定後由git archive生成ZIP，先驗每個Gitblob/SHA/CRC/mode/path，再安全解壓到新目錄、重跑全部gates、對比production輸出。任一形狀、symlink、traversal、未知檔、hash或設定漂移拒絕。

發布僅使用已登入官方gh與每命令git-c，禁止auth setup-git/login/refresh、global/system config寫入或讀取token。incubator的git-settings-guard capture/verify及Windows Environment前後guard均必要；獨立publishing copy、非force push、PUBLIC可見性與remote HEAD必須實驗。

預定正式 origin https://packing.glossquote.com；中文 URL /index.html、英文 /en/index.html。預定 host 為免費 Cloudflare 子網域，這是使用者先前已授權的工具家族發布路徑，不代表本產品已部署或正式網址可用。

M1 不產生 production SEO、不發布。主代理親自驗收 M1 後，M2 才可固定 origin allowlist、production canonical/hreflang/x-default、robots/sitemap、與可見頁一致的 WebApplication JSON-LD、404、MIME、安全 headers，以及 production build/check。Preview 永遠 noindex/nofollow/Disallow:/；preview 不得混入 production canonical 或 sitemap。

必要 source repo：https://github.com/KYStr/glossquote-labs-packing-list，public。沿用已授權來源發布，使用獨立 reviewed copy，不操作孵化器根 repo。先跑所有必要 checks，檢查 diff/path/秘密與輸入資料，無 force push；驗 repo visibility、remote HEAD、commit SHA。source ZIP 必須由固定 Git blobs 產生，解壓逐 blob 比對、在解壓副本重新 build/check，記錄 manifest 與 commands。不得把 .runs、dist、node_modules/cache、使用者匯入 JSON、憑證或其他工具帶入 ZIP。

M3 由主代理部署 Cloudflare free static output，核對雙語真實頁、HTTP status/MIME/headers/404、SEO互返、主要操作與首頁雙語導覽後才能由主代理更新 catalog 並發布首頁。功能對話不得部署、改 homepage 或把 draft 標 published。source public 不是開源授權，沒有明確 license 前不加自行挑選的 LICENSE。

外驗前狀態為「已上線，待外部複驗」；外驗未回覆不算完成。
