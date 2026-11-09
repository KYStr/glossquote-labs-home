# 任務與里程碑：名單比對與合併

目前只允許 M1/T00。M2、M3 僅作後續契約，不代表現在放行。

## M1/T00：本機雙語 MVP

目標：完成 TECHNICAL.md 的核心、雙語靜態 UI、精確 A 案例、check/build 和 ACCEPTANCE.md 的必要 B 流程，固定供主代理審查。

允許修改：本資料夾內 public/index.html、public/en/index.html、public/robots.txt、public/styles/**、public/js/**、scripts/**、test/**、package.json、.gitignore、僅有需要才增加的 M1 設定檔；進度/交接可更新本資料夾 README.md、START-HERE.md、TASK-ENTRY.md、HANDOFF.md、project.json 與 docs/RELEASE-CANDIDATE.md；證據只在本工具專用根 .runs/list-compare/m1-<date>-<id>/**。不得在 repo 根執行 git 操作。

必要命令：Node.js 24.x；npm test、npm run check、npm run build；npm run dev 優先綁定 127.0.0.1:4199。若該埠已被佔用，不得停止或重用未知程序；用 `server.listen({host:'127.0.0.1',port:0})` 讓作業系統指派可用 ephemeral port，並在 HANDOFF 與證據中記錄實際埠及 URL。Spike 優先用 5199，佔用時同樣使用該 listen 方式取得 OS 指派的 loopback ephemeral port。長測前後執行根 AGENTS 的 Windows environment guard，記錄 fingerprint，不改持久環境。

非目標：發布、正式 sitemap/canonical、Cloudflare、首頁更新、根索引、外部驗收。

停止條件：測試或需求有矛盾、越權路徑、需新增依賴/網路/檔案儲存、欲改輸入語義、OS 指派的 loopback port 仍無法啟動、environment drift、不能安全清理輸入、任何秘密意外出現。不得為解決埠衝突終止既有程序。保存證據後停止回報，不自行修根目錄。

## M1 主驗與凍結

實作者提交實際 diff、命令、B 觀察和 NOT_RUN 後釋放 owner。主代理審查 code/tests/spec mapping 並在可用瀏覽器親跑精確例子。只有主代理確認固定 source scope、安全與必要 gate 後才可進 M2；不得由實作者自我授權。

## M2：公開來源與 production candidate（尚未放行）

只有主代理明確放行才開始。目標是固定 production build 與 reviewed source 的獨立公開 GitHub repo，不是部署網站。

Allowed paths：M1 已凍結核心演算法與功能行為，不得修改 public/js/core/** 或其語義測試。M2 可新增/修正必要的 package.json、scripts/** production release helpers、project.json、HANDOFF.md、docs/RELEASE.md、docs/RELEASE-CANDIDATE.md、wrangler.jsonc；允許為正式發佈修改 public/index.html 與 public/en/index.html 的 SEO head、同語首頁連結，新增/修正 public/404.html、public/_headers、public/robots.txt、public/sitemap.xml 或其生成器；不得藉此改核心工具行為、輸入語義或 UI 流程。產物只在本工具 dist-production/**；證據及 reviewed source archive 只在孵化器根 .runs/github-publish/glossquote-labs-list-compare/**。可發布檔案只從此工具 allowlist source copy 產生；不得改根 git、首頁或別的工具。

Commands：npm test、npm run check、npm run build、npm run build:production、npm run check:production、node scripts/manifest.mjs；從 archive 解壓的乾淨副本再跑 npm test、npm run check:production、npm run build:production。固定 commit ZIP 可用 git -C <reviewed-repo-copy> -c core.autocrlf=false archive --format=zip --output <archive.zip> <commit>，或等效方式；不得改 global/system git 設定。解壓後逐檔核對 source ZIP bytes/hash 與該 commit 的 Git blob，再從解壓副本重建 production tree。

Exact acceptance：preview 仍 noindex/nofollow、robots 禁止索引；production origin 固定為 https://lists.glossquote.com，不由 Host/query 控制 canonical；zh-Hant/en 頁面、互返 hreflang/x-default、JSON-LD、robots/sitemap 只指兩頁且一致。production 404 真 404、無 SPA fallback；正常 HTML/CSS/JS/XML/TXT MIME 與安全 headers 符合發布契約。所有必要命令 exit 0；公開 repository URL 為 https://github.com/KYStr/glossquote-labs-list-compare，實查 PUBLIC、remote HEAD 等於記錄 commit；ZIP 解壓 build/check 符合固定 tree。記錄每項實際 evidence。

Non-goals：Cloudflare 部署、DNS、homepage catalog 或正式 URL 上線。Stop：任一命令失敗、source ZIP/blob 不等、repo 非 PUBLIC/HEAD 不符、production host 不固定、scan 發現個資/secrets/.runs/dist/node_modules/兄弟檔、需要新增憑證或權限。保留失敗證據並交主代理，不可用 force push 或重寫 Git 全域設定。

## M3：免費主機、首頁與交付（尚未放行）

僅主代理負責；使用既有免費 Cloudflare 子網域授權，候選 host lists.glossquote.com。主代理先以同一 fixed commit/build 做正式候選，再經已批准部署 workflow 發布靜態 dist-production；不由功能 chat 讀取/擴張 credential。

Allowed paths：本工具 deploy/release config（若 M2 已準備且經審查）、project.json、HANDOFF.md、docs/RELEASE-CANDIDATE.md；部署平台固定 site 資產；共享首頁只由主代理序列修改 tool-projects/00-home/catalog.json 與該專案必要 build/release files。不可改其他工具或 040141.xyz。

Commands/checks：npm run check:production；使用 root approved Cloudflare release workflow 的實際部署命令並將 literal command/tool、exit/version記錄；live HTTPS GET/HEAD 對中英 /index.html 都須 200，未知路徑須真正404且沒有SPA fallback；核對 content type、CSP、安全 headers、固定 origin/canonical/hreflang/robots/sitemap 與候選產物 bytes。再以主代理真瀏覽器完成兩語主要比對、改值結果失效、copy 行為。只有工具已 live 驗證後才在首頁增加 published catalog，從首頁執行 `npm.cmd run build:production`、`npm.cmd run check:generated:production`、`npm.cmd run prepare:production`，發布 homepage source copy 並用相同 approved workflow 部署；雙語首頁都須顯示本工具正確的雙語入口並回鏈到正確語言。

Exact acceptance：日期、公開 commit、實際 deploy version、production files、正式 URL、首頁 source/deploy version 各自記錄；工具和首頁都在 HTTPS 真實回應驗證通過，首頁 draft→published 發生於工具 live gate 之後。交付使用者時狀態 awaiting external review，附雙語 URLs、public source ZIP、測試、限制和外驗模板。

Non-goals：付費服務、改 DNS/domain、讀/新增/擴張 credentials、改 040141.xyz、其他產品/首頁條目。Stop：部署工具要求新 permission/token、費用、正式 DNS變更、live bytes/headers/SEO不符或首頁source/deploy不一致；保留狀態與證據，通知主代理。外審確認前不得標 complete。
