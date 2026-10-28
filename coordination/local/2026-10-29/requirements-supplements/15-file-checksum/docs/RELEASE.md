# 檔案 SHA-256 校驗發布契約

已授權免費Cloudflare靜態發布與KYStr獨立PUBLIC source；主對話保留正式部署/首頁整合執行權，功能對話完成產品、公開source、可重現產物與待驗證清單。不新建付費服務、DNS管理權限/帳號或私人憑證。

2026-10-19 T05只公開固定41檔 reviewed source；runtime／build／tests／config保持主驗T04 bytes，只更新必要發布文件。使用既有gh授權及per-command credential helper，無global／system Git設定或持久環境寫入。實際remote commit／PUBLIC、Git source manifest、固定公開ZIP及SHA-256、完整解壓byte核對與before／after guards另記T05收據，原工作區HANDOFF記錄核實值；Git快照內不自引自己的commit／ZIP hash。主代理會從該固定ZIP跑全套142，本功能對話只在解壓副本驗check／兩模式build／production check／required releasegate及T04產物逐byte相等，不能把未執行的全套重驗稱PASS。正式hosting／首頁仍由主代理另行執行。

固定production origin **https://checksum.glossquote.com**（主代理2026-10-19 T04指示；舊規格的hash.glossquote.com是歷史值，不作為發布目標）。index.html與en/index.html各self canonical，兩頁都指向zh-Hant/en/x-default（x-default指中文）。locale/title/H1/description/OG/url及WebApplication JSON-LD一致，無虛构評分；sitemap列兩個canonical，robots允許正式頁並指本origin sitemap。不能從訪客Host/query推導canonical。

T04建立npm run build:production與npm run check:production；prod參數只接受固定origin，拒絕userinfo/query/hash/未知host。npm run build預設preview：noindex,nofollow、robots Disallow:/、沒有假正式canonical/sitemap可索引內容。兩模式產物分開記錄hash，不以source meta推定已部署。

2026-10-19 T04實作的命令與產物：

| 命令 | 可觀察的通過條件 |
|---|---|
| npm test | 原130項及release負例／HTTP model全部通過；不表示瀏覽器或Cloudflare PASS |
| npm run check | public十個preview來源、ESM語法、Worker bytes、固定package命令及static-only配置通過 |
| npm run build | 生成dist-preview十五個檔案；另保留相容的dist十個原preview資產 |
| npm run build:production | 生成dist-production十七個檔案；加入head SEO、移除預覽未發布片語與新增靜態發布檔，八個JS/CSS資產保持原bytes；兩語body只移除預覽未發布片語，其他bytes不變 |
| npm run check:production | 先驗來源與配置，再檢查完整allowlist、每個產物bytes及SHA-256 |
| npm run release:check | 必須同時存在完整preview與production；缺一即exit1，無skip選項。只代表本機產物gate |

buildPreview(root)保留T00/T01既有十檔copy API與安全測試。CLI預設build另建立完整dist-preview；Wrangler只指向dist-production，不能把相容dist或dist-preview當正式產物。兩個新輸出目錄也是生成物，T05來源公開副本以顯式allowlist排除它們，不能使用未審查的整個工作樹上傳。

preview十五檔＝十個原資產＋404.html／en/404.html／robots.txt／_headers／_redirects；production另加sitemap.xml與favicon.svg。固定SVG只含本地向量圖形，無script／href／foreignObject／事件；兩語production head明確rel=icon，/favicon.ico另以301導向SVG，避免瀏覽器預設icon請求404。不放寬img-src self。_headers與_redirects是兩個明列的根目錄控制檔，沒有放寬原validation.mjs的path／extension規則。目的樹在任何寫入前先驗完整allowlist、ancestor與hardlink／junction；過期／未知檔案拒絕並保留，不清目錄。來源和目的檔案都必須regular、single-link且bytes固定。

production HTML head加入固定SEO；body只移除中英預覽未發布片語，保留原切換語言提醒，其他bytes不變。兩段固定JSON-LD各有精確SHA-256 CSP hash，沒有unsafe-inline／unsafe-eval；仍保留default-src none、connect-src none、worker-src blob、無form／object／base／framing。preview額外送X-Robots-Tag noindex,nofollow。兩語404沒有JS、canonical或JSON-LD，meta固定noindex,nofollow，連回對應語言工具／家族首頁；未知request path不插入頁面。

靜態資產Workers配置只使用dist-production，沒有server運算。不能把套件/site整個根目錄部署。strict missing-path404要覆蓋根/巢狀/en，不能SPA回200或fallback到錯誤語言；正確CSS/ESM/HTML/TXT/XML MIME。build生成審查過的_headers與404，Cloudflare實際header由主對話驗證，不能以local serve冒充。

本工具wrangler.jsonc是無main／binding／build command的assets-only配置，assets.directory精確為./dist-production，html_handling=none及not_found_handling=404-page；workers.dev與preview URLs停用，單一checksum custom-domain route。send_metrics、dependencies_instrumentation及observability enabled／logs.enabled／traces.enabled都明確false；沒有安裝／執行Wrangler、讀取憑證或在T04部署。新的compatibility_date為2026-10-19。

依[HTML handling官方說明](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)，none保留明確的index.html URL；_redirects只將/、/en、/en/以301導向兩個canonical，不使用萬用SPA或未知path fallback。依[自訂404說明](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)，不存在的資產由最近404.html回404，en巢狀路徑應使用en/404.html。依[headers說明](https://developers.cloudflare.com/workers/static-assets/headers/)與[redirects說明](https://developers.cloudflare.com/workers/static-assets/redirects/)，控制檔由平台解析；301先於headers，本機HTTP model不宣稱平台實測。部署後仍須實際驗index.html及en/index.html的200／meta／CSP、四條301（含favicon alias）、根／nested／en的404、MIME與控制檔不可下載，並以隔離瀏覽器補正式產物操作驗收。

T04的HTTP model僅使用Node內建http、127.0.0.1隨機port和fake workspace，讀取生成的_headers／_redirects與實際產物bytes；它測GET／HEAD／405、各MIME、兩語404及私有path拒絕，不是Cloudflare模擬器或瀏覽器PASS。正式瀏覽器驗收由主代理已驗證的隔離機制執行，禁止Computer Use／本機互動旁路及OS dialogs；既有PARTIAL／NOT_RUN保留。

公開repo：https://github.com/KYStr/glossquote-labs-file-checksum。檢查現況與owner後用reviewed副本提交，不force push，不發布根孵化器。來源含本工具public/scripts/test/package/必要config/docs及真實發布manifest；無node_modules、dist、.runs、env/secrets/個資。PUBLIC不等於已授權特定開源license；不虛構第三方權重/套件授權，本MVP無runtime套件。

交接保存remote HEAD/visibility、source文件hash、production產物manifest、測試版本/exit/NOT_RUN、來源ZIP SHA256（ZIP含必要source/config/test，不含秘密或node_modules），以及候選雙語URL。若source-only提交README等差异，記source commit與部署commit分別值。

固定來源包必須保持Git blob原bytes。Windows的Git archive可受core.autocrlf影響；用單次命令`git -c core.autocrlf=false archive`或等價保留bytes方式，不能改User/System/Git全域設定。包好後實際解壓，所有檔案對固定remote tree的Git blob與source manifest逐檔核對，再從解壓副本build/check並記產物hash；只驗ZIP檔hash或發布工作樹不夠。修正包用新檔名保留舊失敗證據，不把不同bytes仍稱同一可重現包。

只有主代理讀修改+獨立驗收通過，才能部署正式工具並核實200/404/SEO/headers/主要操作；然後把首頁catalog從draft轉published，重建/驗兩語/更新home repo並部署。候選不出現在正式可用工具列表；不要自己改00-home。

之後為「已上線，待外部複驗」。收到外部報告回原功能對話修、重新驗證/推送/部署，由使用者或驗收者確認該版本才標完成。不聲稱Google已收錄/排名提升，只能驗設定。
