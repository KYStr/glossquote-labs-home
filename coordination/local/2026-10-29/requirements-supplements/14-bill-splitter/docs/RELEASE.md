# 分帳與墊款結算發布契約

已授權免費Cloudflare靜態發布與KYStr獨立PUBLIC source；主對話保留正式部署/首頁整合執行權，功能對話完成產品、公開source、可重現產物與待驗證清單。不新建付費服務、DNS管理權限/帳號或私人憑證。

固定production origin https://split.glossquote.com。index.html與en/index.html各self canonical，兩頁都指向zh-Hant/en/x-default（x-default指中文）。locale/title/H1/description/OG/url及WebApplication JSON-LD一致，無虛构評分；sitemap列兩個canonical，robots允許正式頁並指本origin sitemap。不能從訪客Host/query推導canonical。

T04建立npm run build:production與npm run check:production；prod參數只接受固定origin，拒絕userinfo/query/hash/未知host。npm run build預設preview：noindex,nofollow、robots Disallow:/、沒有假正式canonical/sitemap可索引內容。兩模式產物分開記錄hash，不以source meta推定已部署。

推薦靜態資產Workers配置只使用dist，沒有server運算。不能把套件/site整個根目錄部署。strict missing-path404要覆蓋根/巢狀/en，不能SPA回200或fallback到錯誤語言；正確CSS/ESM/HTML/TXT/XML MIME。build複製審查過的_headers與404，Cloudflare實際header由主對話驗證，不能以local serve冒充。

公開repo：https://github.com/KYStr/glossquote-labs-bill-splitter。檢查現況與owner後用reviewed副本提交，不force push，不發布根孵化器。來源含本工具public/scripts/test/package/必要config/docs及真實發布manifest；無node_modules、dist、.runs、env/secrets/個資。PUBLIC不等於已授權特定開源license；不虛構第三方權重/套件授權，本MVP無runtime套件。

交接保存remote HEAD/visibility、source文件hash、production產物manifest、測試版本/exit/NOT_RUN、來源ZIP SHA256（ZIP含必要source/config/test，不含秘密或node_modules），以及候選雙語URL。若source-only提交README等差异，記source commit與部署commit分別值。

只有主代理讀修改+獨立驗收通過，才能部署正式工具並核實200/404/SEO/headers/主要操作；然後把首頁catalog從draft轉published，重建/驗兩語/更新home repo並部署。候選不出現在正式可用工具列表；不要自己改00-home。

之後為「已上線，待外部複驗」。收到外部報告回原功能對話修、重新驗證/推送/部署，由使用者或驗收者確認該版本才標完成。不聲稱Google已收錄/排名提升，只能驗設定。

## T04 實作與官方依據（2026-10-12）

`npm run build`產生preview noindex；`npm run build:production`產生固定origin SEO；`npm run check:production`精確比對dist內容與allowlist。`checkDist()`回傳每個資產bytes/SHA256可重現manifest，不把manifest/docs/tests部署。所有內容先驗後取代有界dist；tests為避免共用dist競爭採test-concurrency=1。

Wrangler設定：assets.directory=./dist、html_handling=none、not_found_handling=404-page；無main或binding。`_headers`按靜態資產套用；本對話沒有安裝新套件、沒有deploy/dry-run，主對話須用已審查的隔離Wrangler/runtime/schema/loader驗證並發布。observability=false遵守專案不追蹤規則，優先於通用技能建議啟用logs/traces；沒有nodejs_compat或型別生成需求。正式root/深層/en404與實際Cloudflare headers/MIME仍須live測，不以本機server代替。

官方來源：[Static assets](https://developers.cloudflare.com/workers/static-assets/)（nearest404行為）、[Headers](https://developers.cloudflare.com/workers/static-assets/headers/)（靜態_headers與MIME）、[Workers assets config API](https://developers.cloudflare.com/api/resources/workers/)（html_handling none / not_found_handling 404-page）。部分configuration正文取得失敗，改用官方static-assets與API資料；未虛稱已驗target Wrangler schema。
