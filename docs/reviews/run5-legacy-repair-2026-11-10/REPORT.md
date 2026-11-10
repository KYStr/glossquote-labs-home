# Run 5 舊候選維修交接

這次協助補正規則調整前的雲端成果。40 份規格與 12 份實作的原 PR、作者與固定 head 都保留；維修由獨立 maintenance task 承接，沒有假裝先前 12 份已有製作 claim。原作者報告的 607 項與本輪主代理重跑的 616 項分開記錄。

## 已修正

- 薪資容量優先錯誤順序、整元年度基薪不變量。
- 年齡短二月需兩次借位的規格與四組固定案例；保留既有日曆演算法，不宣稱法律資格。
- 料理單位 ENUM 案例改用容量內 oz；另驗 liter 的容量錯誤，不再跳過或覆寫 fixtures 預期。
- 工作日 400 行與原 4096 容量矛盾改為 8192，接受 LF/CRLF，修正 -0 文法及反向日期的組成條件。將主執行緒排程改為專用 module Worker，修正 blob: CSP，驗證取消及過期回覆清理。
- 餐費等分明示稅／小費與平均分攤用途，與既有個人墊款結算區隔。完賽預測撤除對既有 running-pace 功能的錯誤比較；保留自訂目標與直接預測用途，未因此取得完整產品放行。
- 體感、露點、服裝、生理週期的四筆無法解析完整 spec SHA 改為實際固定 head。
- 露點保留 17.27/237.7 的既定近似，撤除未支持的誤差保證與 Lawrence 歸屬。明示 6.112 與 BoM 6.105 正規化不同；沒有以 fixtures 通過冒充科學精度。
- 健保第 1 級政府負擔 238 與 MET 八筆間接來源已補官方直接證據。單一欄位／八筆證據不等於整份資料或規格驗收。

## 主代理實際驗證

以下 12 款均由主代理執行 Node 24 測試、靜態檢查、preview 建置、generated 檢查及兩次建置 bytes 比對。另有 25 組主代理固定算術與控制器案例。Worker 的 Node thread 與假事件均不是 Chrome/Edge 瀏覽器證據。

| 工具 | 原 PR | 本輪 Node 測試 | check / build / generated / 重建 | 完整產品驗收／發布 |
| --- | --- | ---: | --- | --- |
| bill-split-calculator | #265 | 49/49 | PASS | NOT_RUN |
| salary-converter | #266 | 43/43 | PASS | NOT_RUN |
| age-calculator | #267 | 54/54 | PASS | NOT_RUN |
| cooking-measurement-converter | #268 | 59/59 | PASS | NOT_RUN |
| workdays-calculator | #269 | 67/67 | PASS | NOT_RUN |
| wallpaper-calculator | #270 | 49/49 | PASS | NOT_RUN |
| feels-like-temperature | #271 | 45/45 | PASS | NOT_RUN |
| dew-point-calculator | #272 | 46/46 | PASS | NOT_RUN |
| clothing-size-converter | #273 | 53/53 | PASS | NOT_RUN |
| ping-area-converter | #274 | 59/59 | PASS | NOT_RUN |
| race-time-predictor | #276 | 44/44 | PASS | NOT_RUN |
| period-cycle-calculator | #277 | 48/48 | PASS | NOT_RUN |

## 尚未放行

本輪是已知問題的維修候選，不是 52 份 PR 的完整審查。12 款完整九面向、實際雙語瀏覽器、無障礙／真機、Network/Storage、原生下載及正式 HTTPS/SEO 都未在這輪執行；不得據此上線。另 28 款只有規格，沒有在這輪新增實作。40 份規格在 intake 仍為 reviewing；當時實際可用未承接庫存為 2，不能把40份草稿算成ready。

沒有合併、部署、改首頁或替原雲端作者簽收。沒有操作桌面、使用者鍵盤／滑鼠／剪貼簿或瀏覽器。兩個實作子代理以工具明確指定 gpt-6.1-sol / medium；後端實際模型識別未獨立可見。主代理閱讀修改並獨立重跑，後續非作者審查另存 acceptance。

## 重跑與追溯

每款在 tools/<slug> 下使用 Node 24，依序執行 node --test、node scripts/check.mjs、node scripts/build.mjs --mode preview、node scripts/check-generated.mjs --mode preview。沒有 npm 安裝需求。主代理固定案例可執行 node docs/reviews/run5-legacy-repair-2026-11-10/primary-cases.mjs。

來源索引見 [SOURCE-INDEX.json](SOURCE-INDEX.json)，主代理結果見 [PRIMARY-RESULTS.json](PRIMARY-RESULTS.json)，科學證據在各受影響規格的 PROVENANCE-RECHECK.md。主代理的檢查日為2026-11-10。原始 VERIFICATION.md 是歷史證據，當前判定以此報告及固定候選的新審查為準。
