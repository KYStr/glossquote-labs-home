# 閱讀進度規劃發布契約

M1 只本機，preview noindex,nofollow。主代理明確通過固定 M1 才放行 M2；一次 milestone，未通過不得越級。

M2 原功能對話建立 production 工具鏈：固定 origin https://reading.glossquote.com；兩語 canonical /index.html 和 /en/index.html；reciprocal hreflang zh-Hant/en/x-default（fallback中文）；title/description/OG/WebApplication JSON-LD 內容須與實際功能一致。robots允許正式索引，sitemap只列兩個canonical，preview仍封鎖。404無工具成功頁、無SPA fallback。所有 headers/allowlist/static MIME 明確可測。production local model 127.0.0.1:5206。

沿用家族已審核 static-assets-only Wrangler 配置：worker glossquote-reading-plan，custom domain reading.glossquote.com，assets.directory=./dist-production，html_handling=none、not_found_handling=404-page，workers_dev=false、preview_urls=false、send_metrics=false、observability/logs/traces=false；沒有Worker script、binding、database、secret、遙測或runtime package。M2 只配置，不呼叫Cloudflare、不裝CLI、不讀token。正式標頭由 _headers 提供，JSON-LD用精確 CSP hash。

公開來源必須在 reviewed publishing copy（只本工具）進行。repo public KYStr/glossquote-labs-reading-plan，branch前綴codex/。不得包含 .runs、node_modules、秘密、帳戶資料、其他工具、使用者輸入。先讀 GIT-PUBLICATION-SAFETY.md。用專案 tool-projects/scripts/git-settings-guard.mjs 在發布前 capture、之後 verify，證據在根 .runs 自己的唯一目錄；該 guard 只讀 known config fingerprints，不輸出值。若 standalone checkout 尚無 guard，由主代理提供已審核副本，不能省略或自行搜尋憑證。

禁止 gh auth setup-git/login/refresh、git config --global/--system 寫入、變更使用者gitconfig、讀token、authtrace。既有CLI身份可正常發布；必要 helper 只 per-command git -c 且不寫持久設定。缺認證停並回報。清除child-process GIT_TRACE*/GIT_CURL_VERBOSE/GH_DEBUG 等debug選項，不改persistent環境。

M2 驗證公開visibility、remote commit、來源ZIP由固定git commit archive產生、每檔與git blob一致、SHA256/bytes、在乾淨副本跑必要test/check/build/production gates，產物與候選相符。所有命令exit和未驗項目寫HANDOFF，原始完整trace不得打包。

M3 由主代理驗收 M2 後，使用已授權 reviewed loader 免費部署，驗兩語live body/headers/SEO/404與核心流程，再把 catalog draft 轉published，重建/驗證/公開首頁來源/部署首頁/驗兩語入口。僅source push或local catalog更新不算發布。這裡的權限不含付費、040141.xyz、GlossGate、擴token權限。

交付標 awaiting-external-review；保留真機/完整NetworkStorage/原生未驗，不以HTTP/模擬替代。外部回報回原對話修正，主代理重驗、重發後，需外部確認才完成版本。

## M2 候選工具鏈實作說明（2026-10-16）

M1 已由主代理驗收並明確 GO。M2 增加 build:production / check:production / preview:production / release:check。public 九檔保持固定 M1 bytes/SHA；scripts/m1-oracle.mjs 是主驗通過的固定 oracle，不在 build 時重新產生。正式產物在 dist-production，恰 12 檔；preview dist 仍恰 9 檔且不索引。

正式 head 只在複製產物時加入，不修改 M1 HTML/UI。正式兩語 canonical、hreflang 與 sitemap 均只指向明確的 index.html / en/index.html。wrangler 設定是閉合的 static-assets-only config，沒有 handler/bindings/build command 或 CLI 安裝。production HTTP model 只綁 127.0.0.1:5206，不是 Cloudflare runtime。html_handling=none；本機 model 對 /、/en/、extensionless 或未知 URL 回真正 404/noindex，不作 SPA fallback；直接 /404.html 是存在的靜態頁且保持 noindex。M3 必須另核對實際 edge 路由、MIME 與 headers。

全域 _headers 包含 CSP（default/connect/form/object/base/frame deny，script/style/assets self；script 另僅兩個確切 JSON-LD hash）、nosniff、no-referrer、DENY、no-store 與必要 Permissions-Policy，不禁用 clipboard-write。全域 X-Robots-Tag 為 noindex,nofollow；兩個明確 canonical 路徑以 `! X-Robots-Tag` detach，此時 HTML meta 是 index,follow。這避免 Cloudflare 將多個同名 header 用逗號相接而留下 noindex。未知 404 路徑保留全域 noindex，404 HTML 本身也 noindex。兩語的 JSON-LD bytes 和 CSP 由獨立 literal golden 的測試驗證；兩個精確 hash 在候選交接紀錄另列。

production robots 明確開放兩個正式頁與渲染所需 /js/、/styles/，其餘 Disallow；sitemap 僅兩個 canonical，沒有假 lastmod。404 無表單/成功頁/JSON-LD/canonical。

scripts/source-policy.mjs 固定公開來源 allowlist：原生 code、tests、README 與必要產品/工程/安全/發布規格。內部 AGENTS、DISPATCH、project.json、TASK-ENTRY、HANDOFF、START-HERE、RELEASE-CANDIDATE 與 .runs 不進來源 repo/ZIP，避免發布 chat identifiers、帳戶路徑及本機證據。所有 source 檔必須 regular/non-linked；unknown publication file 是停點。生成物不納入 Git，但 clean copy 需重跑全部必要命令並比對 production manifest。

發布副本的所有 Git 變更只在 task-owned 副本執行；per-command identity/config/helper 與 child-only 乾淨環境不寫 global/system 設定。既有官方 gh CLI 認證可用，但不得直接讀 token。來源 commit 的 archive、每個 Git blob、source allowlist 與 ZIP bytes/SHA 互相核對。循環欄位（自己的 commit/ZIP hash）由 repo 外的根任務證據與本機 HANDOFF 作發布後 attestation，不把來源任意改成另一份未驗檔案。
