# 日期工具 Cloudflare 部署

## 最新正式狀態：已部署並驗收（2026-10-06）

使用者完成受限Token交接，Wrangler 4.147.0已部署到https://date.glossquote.com/，exit0且Windows環境前後指紋不變。主代理正式HTTP24案例、10份產物位元組比對、雙語真瀏覽器計算及Cloudflare UI設定核對PASS；服務純Static Assets、版本短碼6e330129、0 bindings、Logs/Traces與workers.dev／Preview URLs全部關閉。zone與DNSSEC Active。公開GitHub9b7dc6d已同步正式網址，未接通Git自動部署，後續需再明確CLI部署。主代理未保存Token。T09必要驗收PASS；真機/AT等保留人工NOT_RUN，下方接入／憑證阻塞紀錄為歷史。

2026-10-06 T09。使用者已授權 Cloudflare 免費方案與網域接入。目標為 `https://date.glossquote.com/`，不是品牌首頁；單位換算器仍另行處理。

## 網域與權限狀態

- 註冊與續費仍在 Spaceship。Cloudflare 後台已建立 `glossquote.com`，Free Website / price 0；2026-10-06 API確認zone Active、DNSSEC Active。
- Cloudflare Nameserver：`gail.ns.cloudflare.com`、`rustam.ns.cloudflare.com`。
- 原 Nameserver：`launch1.spaceship.net`、`launch2.spaceship.net`。使用者登入並明確同意暫停舊DNSSEC後，主代理已移除舊DS、確認公開查詢無舊DS，再儲存Cloudflare NS。接入Active後啟用Cloudflare DNSSEC，於Spaceship存入新DS：key tag 2371、algorithm 13、digest type 2、digest `82D3661294BA5923ED4BBD14F14E11CF004BB5E15F869890F608FC5CD0E8E28E`。公開Cloudflare resolver DS與Google A查詢均AD=true；部分resolver舊負快取仍可能傳播。沒有收取密碼或Token，040141.xyz未改。
- 自動掃描發現原根網域兩筆 A 記錄，保留 DNS only；本輪不建品牌首頁、不操作郵件、不刪除既有紀錄。沒有替原停放站啟用反向代理。
- Cloudflare Bot Preference Sync 在接入時關閉，避免平台改寫本工具精確生成的 robots.txt；一般搜尋抓取維持允許。
- 連接器的建立 zone 操作因缺少 `com.cloudflare.api.account.zone.create` 被拒絕。使用者隨後明確要求使用電腦或 CLI，主代理經既有登入的 Cloudflare UI 完成 Free zone 設定；未修改 API 權限或讀取秘密。

## 產物契約

```sh
npm test
npm run check
npm run build -- --production --site-url https://date.glossquote.com/ --cloudflare
npm run check -- --production --site-url https://date.glossquote.com/ --cloudflare
```

Cloudflare 模式在一般正式產物上新增精確白名單 `_headers` 與 `_redirects`。只部署 `dist`，不能上傳專案根、測試、文檔、.codex 或本機證據。來源與無旗標建置仍為 noindex 預覽。

- 唯一語言 URL：`/index.html`、`/en/index.html`；`/`、`/en`、`/en/` 永久轉址到對應頁面。
- `html_handling: none`，避免平台將 canonical 指向的 index.html 自動轉成目錄網址；未知路徑回 404，不使用 SPA fallback。
- 同源 CSP、禁止連外 connect/表單/嵌入、nosniff、no-referrer，以及明確 JavaScript MIME。
- 沒有伺服器 Worker 程式、ASSETS binding、資料庫、分析或自訂日誌。Workers Logs/Traces 不啟用；專案隱私契約優先於外部技能的一般 observability 建議。託管商仍可能處理資源請求的連線資訊，不能宣稱沒有任何主機紀錄。
- 關閉 workers.dev 與 version preview URL，正式域名由 custom_domain route 設定。compatibility_date 為 2026-10-05（執行時 UTC 日期）；臺灣已為 10-06，但平台拒絕 UTC 未到的未來日期。首次 local dev 因 10-06 失敗，已依真實錯誤修正；不更改系統時鐘。
- wrangler 的 build.command 在部署前重建並檢查正式產物，避免把最後一次本機 preview build 誤部署。

## 驗收與交接

DNS接入／DNSSEC子階段已通過。既有GitHub連線可見日期工具倉庫；Workers Builds草案使用`npm test && npm run check`及`npx --yes wrangler@4.147.0 deploy`，預覽分支部署關閉，尚未部署。自動新增build token範圍過廣，未建立或使用其他專案token。另準備自訂token摘要（帳戶Workers Scripts:Edit；僅glossquote.com Workers Routes:Edit、Zone:Read），已獲使用者確認並建立，清單顯示Active。其帳戶級Workers權限可影響其他Worker，不能稱為單Worker隔離。最終建置命令仍須確保Cloudflare production build/check明確執行；真實主機驗收未開始。

部署工具使用官方 npm 的 Wrangler 4.147.0，隔離在工作區 `.runs/date-calculator/t09/deploy-tools`，以 --ignore-scripts 安裝；未加入產品依賴、未全域安裝、未升級 npm 或改 PATH。whoami 回未登入，未讀取 Token；dry-run 不需登入。CLI 本機模擬和 dry-run 不是正式部署。

本機測試／dry run 只能證明建置與設定，不能代替真實 Cloudflare 服務。完成必要本機檢查後同步獨立公開 GitHub；最後狀態與 commit 見 HANDOFF。

正式主機必要驗收：zone Active、有效 HTTPS、兩語 GET/HEAD 200、ESM/CSS MIME、三個別名永久轉址且無循環、未知資產 404、HTTP 安全標頭、robots/sitemap 與 metadata 一致、沒有 X-Robots-Tag noindex 衝突，以及真實瀏覽器兩語計算。尚未完成時保持 NOT_RUN；螢幕閱讀器、真機及其他人工保留項仍見 VERIFICATION。

## 參考

### 2026-10-06 憑證交接限制

使用者已同意並建立glossquote-date-build受限token，清單顯示Active、1 Account / 1 Zone及3權限。主代理未擷取或保存只顯示一次的secret。重新載入Workers Builds表單後仍只列既有class-connect build token；公開API的POST builds/tokens也要求build_token_secret，不能只用token ID登記。尚未建立Worker或按Deploy，未擴權或改用其他專案憑證。

改用已驗證的Wrangler CLI；瀏覽器憑證更新規則要求使用者親自Roll這個token。已開啟工作區.runs/date-calculator/t09/deploy-with-token.ps1的互動視窗，Read-Host -AsSecureString只將輸入放入子程序環境，無token檔案或持久環境修改。語法解析PASS，但互動部署仍未執行。腳本記錄部署exit code與前後環境指紋；使用者輸入後主代理仍須獨立檢查遠端設定、TLS/HTTP及兩語操作，exit0本身不是milestone驗收。此路徑為手動CLI部署，不宣稱GitHub自動部署已接通。


- [Static Assets 計費與限制](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)
- [Headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)
- [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Spaceship 自訂 Nameserver](https://www.spaceship.com/knowledgebase/connect-domain-custom-nameservers/)
