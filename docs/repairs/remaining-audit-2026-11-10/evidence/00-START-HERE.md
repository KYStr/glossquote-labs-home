# GlossQuote：剩餘工具驗收修正

本包處理外部回報的 **3 個根因、2 款工具**，修正版已更新現有檢查網站。這次沒有新增發布工具，也沒有把檢查版改成正式索引站。

| 工具 | 本次修正 | 狀態 |
| --- | --- | --- |
| [百分比計算](https://percentage-calculator.glossquote.com/index.html) | Worker 完成、驗證失敗、執行失敗皆會更新畫面；過期工作不覆蓋新結果 | 已修正部署，待外部複驗 |
| [加班費試算](https://overtime-pay-calculator.glossquote.com/index.html) | 改成逐日輸入、逐日計費後按月加總；日期重複提示；拒絕 accessor 且不執行 getter | 已修正部署，待外部複驗 |
| 朗讀／流動字級 | 此次外部回報確認上輪 Unicode 分句與語言切換缺陷已修好 | 該缺陷外部確認結案；非全工具通過 |

[190 款總表](STATUS.csv)、[機器可讀總表](STATUS.json)、[問題處置](RESOLUTION.json)。既有 47 款正式站、140 款檢查站、3 款保留／受阻項目不變；[雙語檢查目錄](https://review.glossquote.com/index.html)已指向兩款新來源。最新雲端提案不冒充已發布項目，另記於[雲端巡查](evidence/cloud-oversight.json)。

固定產品來源 `069bd37af1a6100f366afaebe5afb26aa953c5a3`，固定 [PR275](https://github.com/KYStr/glossquote-labs-home/pull/275) 候選 `56e11511d3c7f9053133bafb985ab175687da2a5`；Worker `46ddcbfb-19a5-4db3-a999-bc6c82e7682b`。凍結發布共 1,636 檔：相較前版 14 個既有檔更新、2 個新增 QA 檔，1,620 檔不變；其他 138 款工具、141 路由與 CSP 不變。[完整差異](evidence/release-diff.json)。QA 探針只供明確載入，不由產品 HTML 自動引用。

## 已驗證

- 主代理親閱實際 diff；兩工具共 102 項測試（56＋46）及各自 test/check/build:preview/check:generated:preview 通過；另做 307 組逐日金額／邊界對照及 7 個路由測試。
- 非作者重新驗固定 GitHub source blob、原失敗與修正後結果，重跑 102 項測試和必要命令，另做 18 組獨立加班費案例及 8 個路由檢查。
- 兩語真實網站與真 Blob Worker，在 Cloudflare 遠端隔離 Chromium 完成 22 個 DOM 驅動案例。百分比每語 4 個，加班費每語 7 個；390／1280 CSS px 無頁面橫溢。這不是本機桌面或真機測試。[非作者瀏覽器核對](evidence/independent-review/browser-evidence-check.json)。
- 主代理 31 個實站資產與 9 個轉址／錯誤頁檢查通過；非作者另核 43 項 HTTP 證據。部署第一輪曾觀察舊檔與百分比忙碌狀態，後續新版 bytes 與操作通過；完整失敗紀錄保留。遠端 API 曾回 429，改序列等待後完成，沒有當成產品通過。
- Windows 持久環境前後完全相同；Git 設定指紋核對相同。沒有操作桌面、鍵盤、IME、使用者分頁、剪貼簿或原生對話框。

加班費保留一般月薪制每日 8 小時適用範圍、逐日四捨五入至整元的明示估算規則。例：月薪 36,000，三天平日各 1 小時是 600 元；同一天 3 小時是 650 元；兩個符合加發條件且未調移的假日各 1 小時是 2,400 元。日別由使用者選擇，未替個案判定法定假日或法律適用。46 小時提醒同時說明 54／138 小時條件，非完整合法性判斷。

## 重跑與待驗

`sources/tools/` 含兩款完整修正版來源，Node 24 依各自 package.json 執行四個關卡；`sources/docs/` 包含逐日新版規格及標記歷史的原稿。`deployed-artifacts/` 是本輪 140 檢查站完整凍結產物；其他工具產品來源沿用其固定 GitHub 記錄，不重複複製。`scripts/` 是測試與探針原始碼；含工作區相對路徑的腳本為真實執行記錄，移位重跑需調整路徑，不得更換被驗來源。

[初步獨立審查](evidence/independent-review/PREDELIVERY-REVIEW.md)只評本次維護。最終 ZIP 核對與登記冊回執會另外提交 PR275 所連 GitHub 證據，避免 ZIP 雜湊自我引用。兩個實作子代理及一個非作者審查子代理皆明確要求 gpt-6.1-sol／medium；工具接受設定，後端模型身分未獨立驗證。

完整真機、原生下載、讀屏、320px／實際 200% 縮放、全量 Network／Storage、法律領域個案與完整產品驗收仍待驗。SEO 分享圖片、media 額外 307、租屋工具未使用的 blob Worker CSP 例外保留為低優先項，未宣稱已改。原始外部 ZIP 原封保留在 external-input，其腳本不因本包收錄而自動取得執行授權。

解壓後執行 `python verify-package.py` 核對每檔 bytes／SHA-256；FILES.json 自身除外。這一包的修正狀態是 **內部維護驗收通過、已部署、待外部複驗**。

## 最終包獨立驗證

[最終非作者覆核](independent-review/DELIVERY-REVIEW.md)、[ZIP 回執](archive-verification.json)、[完整核對](independent-review/delivery-verification.json)。此 GitHub 目錄保存證據；sources/deployed-artifacts/external-input/scripts 與 verify-package.py 在交付 ZIP 裡，產品與發布來源可由固定 candidate manifest 取得。
