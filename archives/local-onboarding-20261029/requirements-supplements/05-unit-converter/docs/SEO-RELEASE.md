# 雙語 SEO 與發布前交接

2026-09-29。這份文件是網站發布準備規格；使用者已授權並完成 GitHub 公開原始碼交付，網站尚未部署。網站是原生 HTML/CSS/ESM，數值換算在瀏覽器執行，不需遠端運算服務。

## 已選定的語言與路由

| 語言 | 原始檔／建置檔相對路徑 | 本機開啟路徑 |
|---|---|---|
| 繁體中文 zh-Hant | index.html | /index.html |
| English en | en/index.html | /en/index.html |

兩頁以原生可見連結互通，完整翻譯介面、錯誤、公式、教學、支援單位與常見問題。切換會清空輸入；不自動依瀏覽器語言跳轉，不將數值放入網址或持久化語言偏好。中文與英文共用同一套數值核心，十進位點、小寫/大寫 e 科學記號與最多 12 位有效數字的 ASCII 顯示相同。

每頁有獨立 title、description、唯一 H1、可在模組失敗時閱讀的 HTML 說明；工作表單優先，搜尋內容在其後。不為每組單位生成重複頁，不捏造使用量、評分、認證或排名。FAQ 為實際產品說明；目前沒有加入結構化評分或宣稱 rich result 資格。

## 預覽與搜尋收錄的界線

兩頁保留 robots=noindex,nofollow，尚無正式網域，因此沒有 canonical、head hreflang 或 sitemap。導覽 anchor 的 hreflang 只是語言連結標記，不能替代正式搜尋引擎語言版本 annotations。不要把 localhost、假域名或未選定路徑填入這些欄位。

現在可驗收的是雙語內容與靜態 SEO 結構；收錄、Google 選用的摘要、排名、Core Web Vitals 的正式環境數據均未驗證，不能承諾結果。

## 取得發布授權與真實網址後

1. 擁有者確認正式 HTTPS 網域、部署根路徑，以及兩語唯一 URL（可沿用檔名路徑，也可由靜態主機提供穩定目錄網址；不可同時留下無策略的重複版本）。此步需要新的發布範圍，不能由代理猜域名或自行購買。
2. 為每一頁加入指向自身正式絕對 URL 的 canonical。兩頁 head 加入相同的 alternate hreflang 集合，包含 zh-Hant 與 en，兩者都含自身和對方；若新增 x-default，必須指定實際預設入口。
3. 產生只包含正式可收錄 URL 的 sitemap.xml；若採用 sitemap 語言版本標記，須與 head 集合一致。提交 Search Console 屬另行授權的外部帳號操作。
4. 完成人工補驗及安全／可用性缺陷修正，再移除頁面 noindex；同時確認主機沒有 X-Robots-Tag:noindex 或 robots.txt 意外封鎖。不能一邊保留 noindex，一邊宣稱已做完公開收錄設定。
5. 以實際部署 URL 檢查兩頁 HTTP 200、正確 UTF-8 MIME、相對 CSS/ESM 與所有深層路徑、404 行為及 HTTPS。保持無第三方字型、analytics、外部腳本或表單請求；將 CSP 以適合主機的回應標頭落實並核對與現有 meta 一致。
6. 用搜尋引擎的 URL 檢查功能確認讀到對應語言、canonical、hreflang、title/description；等待真實收錄結果。搜尋引擎可能改寫標題／摘要，不以本機測試保證呈現或排名。

新增 sitemap 或部署設定需擴充相應任務 allowed paths，並調整現有 public 副檔名檢查器；本輪沒有越過此邊界。

## 稽核 E-01／E-02／S-01：正式部署前仍須完成

這三項不因 F-01 數值修正或公開 GitHub 就自動通過。目前沒有正式 origin／主機選擇；以下是下一個網站發布任務的必要驗收，不能宣稱已部署或已可收錄。

- E-01：預覽維持 noindex。確認正式兩語唯一網址與人工缺陷狀態後，才移除禁止收錄的 meta，核對主機 X-Robots-Tag 及 robots.txt；保留可見的語言連結。
- E-02：checkHtml 現在把所有 href 當成本地資產，絕對 canonical／head hreflang 因而被拒。發布任務須針對 head 中這兩種 SEO link 驗證確定的 HTTPS origin、路徑和語言配對，其他腳本、樣式及資產的本地限制繼續生效。不得直接允許所有外部 href 或關掉掃描。
- E-02：check/build 現只接受 html/css/js/mjs；加入 sitemap.xml 或 robots.txt 時需同步加精確檔案白名單與內容檢查。新增測試須包含正確正式設定可通過、異源／錯誤語言／多餘檔案仍拒絕，以及 build 產物確實包含這些檔案。JSON-LD 與分享圖屬選做；未需要就不先放寬 inline script 或圖片規則。
- S-01：build 只複製檔案，不攜帶開發伺服器標頭。正式主機須送出 CSP HTTP header，保留既有 script-src、自源樣式、connect-src 'none' 等限制，加 frame-ancestors 'none'；不能依賴 meta 或 default-src 達成禁止嵌入。[MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors) 已於 2026-09-29 核對。
- S-01：以真實 HTTPS 網址驗證 HTML／CSS／mjs 的200回應與正確 MIME、X-Content-Type-Options: nosniff、Referrer-Policy: no-referrer、404與重新導向、雙語深層路徑及無非預期第三方資產。HSTS 需根據實際網域策略決定，不預先啟用 includeSubDomains／preload。

手機 decimal 鍵盤是否能輸入負號與 e/E、螢幕閱讀器有效結果在 change/blur 時才通知的體驗，仍屬真機／AT 待驗；本輪沒有實測，不把推測列為已確認缺陷或已修正。

## 人工待驗與操作方式

- 兩語各以真實瀏覽器選單設 200% 縮放，換算、互換、清除，確認不需整頁水平捲動；紀錄版本及 viewport。不能用縮小 viewport 代替縮放。
- DevTools Network 清空紀錄後換算／互換／清除：應無新請求、無外部流量。檢查 Application/Storage 無工作數值；重新整理為初始空狀態。斷網後在已載入頁面換算；不宣稱首次離線可載入。
- 螢幕閱讀器檢查 label、錯誤關聯、結果播報節制，並檢查真正 BFCache 返回的行為。其它瀏覽器與真實行動裝置也須各自記錄，不能由 IAB 推論。
- 禁用 JS 或令模組失敗時，兩語静態說明仍可讀，控制項保持 disabled；無虛假結果。2026-09-29 中文模組失敗路徑已實測，後續紀錄見 VERIFICATION.md。

## 參考依據

查閱 2026-09-29。不同語言使用獨立 URL、完整內容翻譯、可見語言連結及避免強制跳轉，依 Google Search Central 的[多語言網站指南](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)。絕對 URL、互相回指及包含自己的語言版本標記，依[localized versions 指南](https://developers.google.com/search/docs/specialty/international/localized-versions)。標題與摘要由頁面內容及搜尋引擎共同決定，參考[標題連結](https://developers.google.com/search/docs/appearance/title-link)與[摘要](https://developers.google.com/search/docs/appearance/snippet)。
