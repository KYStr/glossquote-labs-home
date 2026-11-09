# 網址參數檢視與整理發布契約

已授權免費Cloudflare靜態發布與KYStr獨立PUBLIC source；主對話保留正式部署/首頁整合執行權，功能對話完成產品、公開source、可重現產物與待驗證清單。不新建付費服務、DNS管理權限/帳號或私人憑證。

固定production origin https://urls.glossquote.com。index.html與en/index.html各self canonical，兩頁都指向zh-Hant/en/x-default（x-default指中文）。locale/title/H1/description/OG/url及WebApplication JSON-LD一致，無虛构評分；sitemap列兩個canonical，robots允許正式頁並指本origin sitemap。不能從訪客Host/query推導canonical。

T04建立npm run build:production與npm run check:production；prod參數只接受固定origin，拒絕userinfo/query/hash/未知host。npm run build預設preview：noindex,nofollow、robots Disallow:/、沒有假正式canonical/sitemap可索引內容。兩模式產物分開記錄hash，不以source meta推定已部署。

推薦靜態資產Workers配置只使用dist，沒有server運算。不能把套件/site整個根目錄部署。strict missing-path404要覆蓋根/巢狀/en，不能SPA回200或fallback到錯誤語言；正確CSS/ESM/HTML/TXT/XML MIME。build複製審查過的_headers與404，Cloudflare實際header由主對話驗證，不能以local serve冒充。

公開repo：https://github.com/KYStr/glossquote-labs-url-inspector。檢查現況與owner後用reviewed副本提交，不force push，不發布根孵化器。來源含本工具public/scripts/test/package/必要config/docs及真實發布manifest；無node_modules、dist、.runs、env/secrets/個資。PUBLIC不等於已授權特定開源license；不虛構第三方權重/套件授權，本MVP無runtime套件。

交接保存remote HEAD/visibility、source文件hash、production產物manifest、測試版本/exit/NOT_RUN、來源ZIP SHA256（ZIP含必要source/config/test，不含秘密或node_modules），以及候選雙語URL。若source-only提交README等差异，記source commit與部署commit分別值。

只有主代理讀修改+獨立驗收通過，才能部署正式工具並核實200/404/SEO/headers/主要操作；然後把首頁catalog從draft轉published，重建/驗兩語/更新home repo並部署。候選不出現在正式可用工具列表；不要自己改00-home。

之後為「已上線，待外部複驗」。收到外部報告回原功能對話修、重新驗證/推送/部署，由使用者或驗收者確認該版本才標完成。不聲稱Google已收錄/排名提升，只能驗設定。

## 2026-10-12 已建立的工具鏈

production/preview產物皆精確12個檔案；asset-manifest.json涵蓋其他11檔SHA256，沒有時間戳。來源manifest由`node scripts/source-manifest.mjs`產生，使用明確root/public/scripts/test/docs集合及內容掃描；manifest不自雜湊。公開copy依該manifest逐檔hash核對，只在專用copy git提交。

build拒絕既有hardlink目的檔與未核准stale dist；檢查source/dist所有祖先junction；在同owned directory用唯一wx暫存檔，rename目的entry。沒有recursive root清理。若dist有不認識的檔案，先檢查來源並手動處理；不要自動刪除來繞過gate。build的固定origin參數不接受其他host、userinfo、query/hash、尾斜線。

wrangler.jsonc只設定dist assets、html_handling=none、not_found_handling=404-page，以及候選custom_domain=urls.glossquote.com；没有main/bindings/server運算。正式執行仍由主對話處理既有授權loader，功能對話不讀token、不部署。技能的Worker Logs/Traces建議不套用本無Worker-script且禁止telemetry的靜態產品，observability.enabled=false；沒有加入付費能力。

2026-10-12核對官方：[HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)說明none保留.html精確網址；[SSG與custom404](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)說明404-page找最近404.html並回404；[headers](https://developers.cloudflare.com/workers/static-assets/headers/)說明_headers僅對static asset套用、文件本身不公開。正式效果必須由主對話測HTTP，local serve不是Wrangler/runtime驗證。

預覽noindex與prod可索引是產物狀態，不是聲稱候選正式網域已部署、已收錄或隱私全驗。候選包仍含[人工補驗](TEST-RESULTS.md)。

## 固定來源封裝規則（2026-10-12修復）

Git archive可能套用安裝/使用者的core.autocrlf；不能只靠commit ID與ZIP hash聲稱輸出是原Git bytes。每次在reviewed copy用單命令 `git -c core.autocrlf=false archive --format=zip --output=<new-absolute-path.zip> <verified-commit>`，不改任何持久Git/Windows設定。新包必須新檔名，保留舊證據；ZIP檔集合需等於指定commit的tracked blobs，解壓後來源SHA256對SOURCE-MANIFEST，全部檔（含manifest本身）以Git blob SHA1及size對独立取得remote tree核對。再从實際解壓來源跑check/build:production/check:production。不能由workspace/copy先前PASS代替。

首包352394...的43檔因CRLF轉換全數不符，已撤回其可交付主張；有效修正包0df8cb23...對固定c5f21708 commit的42 manifest/43 remote blobs全數匹配，真ZIP產物manifest仍be2871ab...，見RELEASE-CANDIDATE。來源repo Gitblobs本身未受影響。

## 正式整合結果（主代理来源，2026-10-12）

主對話已完成工具及雙語首頁免費Cloudflare發布、有界HTTP/瀏覽器/往返驗收。工具固定實作c5f21708b0630e703b4cf5b6bbdb2a2899726f8c、version b0af355e-a06b-4ce7-b72d-5d4f28ca15d0、兩語正式URL已驗；首頁source PUBLIC3cc725927fd9b60983f771b824223d6f5fa1d325、version22519ef6-ed78-4fab-bf76-d8a8c3f13425，URL工具出現在兩語11工具列表，Bill仍draft。細項/未驗範圍见RELEASE-CANDIDATE与TEST-RESULTS；不是功能對話親跑或完整Network PASS。後續source docs-only HEAD不改實際部署commit/產物hash。

原chat在使用者/外部報告回來後處理必要修正與再公開；版本未獲外部確認不complete。現在停止等待循環，保持所有manual gap與既有程序，不新建產品改動。
