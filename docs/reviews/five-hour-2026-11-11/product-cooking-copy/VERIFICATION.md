# 料理度量換算來源文案維護驗證

接續 [PR #283 固定產品](https://github.com/KYStr/glossquote-labs-home/tree/448bd9fc9865fe65f6014b66f4a2e2d54b76f539/tools/cooking-measurement-converter)，保留 [PR #268 原始產品](https://github.com/KYStr/glossquote-labs-home/pull/268) 與原作者責任。規格依 [PR #304 固定 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/4bc6d4e300d315597a4b1ea5feb86f6f2d6fc1c0/docs/specs/cooking-measurement-converter/SPEC.md)。缺陷為來源段落、FAQ 及核心註解將全表歸於同一資料表，見 [PR #314 盤點](https://github.com/KYStr/glossquote-labs-home/pull/314)。第一個候選提交保存 PR #283 的 31 檔產品子樹原始 Git tree。修正提交改兩語來源／FAQ、核心註解、相關靜態檢查與測試、預覽及 manifest。舊交接和驗證文件保留為歷史記錄。

奶油 227 g／杯來自同出版社《Easy As Pie》第 1 頁的無鹽奶油。食材表的水與鮮奶各 227 g／杯、蜂蜜 21 g／湯匙 × 16、普通或快熟燕麥 89 g／杯，沿用新版規格的資料選擇。240 mL／杯、15 mL／湯匙及 5 mL／茶匙用於純體積換算，出自 FDA 營養標示的家用量測定義。食材重量數字是估值，套用到工具的 240 mL 杯時，與原美式杯的量差約 1.4%。[食材重量表](https://www.kingarthurbaking.com/learn/ingredient-weight-chart) · [Easy As Pie，第 1 頁](https://shop.kingarthurbaking.com/content/class-pdfs/EasyAsPie_February2025.pdf#page=1) · [FDA 量測定義](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9#p-101.9(b)(5)(viii)) · [NIST SP 811](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8)

Node v24.14.0。下列命令自產品目錄執行，皆 exit 0。測試套件為 60/60，含舊 59 項及新雙語來源測試。兩次建置的九個預覽檔與 manifest SHA-256 逐檔相同。另以同一組 20 筆固定 core fixtures 執行舊、新模組，兩版結果均與字面預期相同；14 筆成功報告的 UTF-8 bytes 全部相同。核心與預覽 Worker 排除來源註解後的程式 bytes 相同。三項靜態負測在隔離副本確認任意外部連結、引用網址作外部資源、引用網址附傳送屬性皆被拒絕。

```sh
node --test test/*.test.mjs
node scripts/check.mjs
node scripts/build.mjs --mode preview
node scripts/build.mjs --mode preview
node scripts/check-generated.mjs --mode preview
```

| 產品面向 | 此候選的離線證據與待驗範圍 |
| --- | --- |
| functionality | 20 筆字面核心案例及 14 份報告 bytes 相符；瀏覽器真實輸入和下載待驗。 |
| boundaries | 固定輸入限制、錯誤優先、取消和晚到結果測試通過；瀏覽器操作待驗。 |
| privacy | 靜態禁止能力掃描及固定導航引用通過；實際 Network、Storage、URL 和 log 待驗。 |
| security | 惡意輸入、固定下載、資源限制、靜態檢查、loopback CSP 與來源連結負測通過；真實瀏覽器 Worker/Blob 清理待驗。 |
| usability | 兩語來源段落及 FAQ 靜態對譯已驗；桌面／行動操作與下載待驗。 |
| accessibility | 靜態同語路由、ID parity 與引用文字已驗；真實鍵盤、輔具、觸控、200% zoom、320 px、對比及 reflow 待驗。 |
| localization-seo | 兩語標題、description、同語首頁回鏈、preview noindex 和引述靜態驗證通過；正式 HTTPS/SEO 待驗。 |
| toolchain-provenance | 原 31 檔 Git tree 逐檔核對、Node 24 離線命令、產物雜湊及重建通過。 |
| compatibility | 真實隔離 Chrome、Edge、真機、Network/Storage、原生下載為 `NOT_RUN_USER_FOCUS_INCIDENT`。 |

表中列出作者執行的驗證。PR #283 原本的 59 項歷史測試為提供證據。九面向尚待獨立產品審查；必要實機檢查維持 `NOT_RUN_USER_FOCUS_INCIDENT`。正式驗收及部署待必要檢查完成。

[逐檔來源](SOURCE-MANIFEST.json) · [候選檔案與建置雜湊](CANDIDATE-MANIFEST.json) · [計算與報告逐案比對](REPORT-PARITY.json) · [引用負測](CITATION-NEGATIVE-CHECK.json)


## 引用檢查退修 FH-COOK-CHECK-REPAIR-02

原候選 `3fd8379427b1318ba65c1169f0256befc47ca93a` 的兩語頁原有引用可用。主統籌與 reviewer 在隔離副本把引用包進 HTML 註解，重現檢查器仍 exit 0。退修將例外限於兩語頁既有食材說明段落中的精確有效 anchor。註解和其他原始內容照常掃描。新增一組 CLI 回歸測試，包含一項有效正例及十一項負例，涵蓋兩語註解、重複、網址或查詢變更、template、textarea、屬性、隱藏內容、註解中的禁用 token，以及其他檔案的精確 anchor。

引用檢查單獨修正時，Node v24.14.0 的完整測試 61/61、靜態檢查、預覽建置與生成驗證皆 exit 0。

## Worker 世代隔離退修

舊 callback 只比對自己捕捉的世代，新工作處於 busy 時仍可用舊成功或驗證錯誤結束它。用保留的 callback 重現八種反例，包含直接重跑、取消後重跑、編輯後重跑及重設後重跑。修正後，收到訊息和 Worker 錯誤都要確認目前世代與 Worker 身分。訊息仍須帶正確世代。八種晚到回覆均被拒絕，新 Worker 都能用自己的回覆完成。正常完成、錯誤的訊息世代及舊 onerror 對照通過。[主統籌的範圍修正](https://github.com/KYStr/glossquote-labs-home/blob/989119cb9530dd9d0fcb98c2953415b6c0baf9de/docs/reviews/five-hour-2026-11-11/dispatch/product-cooking-copy/AMENDMENT-CONTROLLER.md)

合併兩項退修後 70/70 測試通過，靜態檢查、兩次可重現的預覽建置及生成驗證皆 exit 0。和上一候選逐檔比對後，僅 controller、生成 controller、預覽 manifest、兩組測試和引用檢查器有差異。兩語頁、引用、核心與固定 fixtures bytes 相同，沿用 20 筆換算及 14 份 UTF-8 報告相符的證據。Worker 測試是離線注入式驗證。瀏覽器、真機、Network/Storage 及原生下載仍為 `NOT_RUN_USER_FOCUS_INCIDENT`。

## Worker Blob URL 退修

主統籌在 `4f259d919e56c2f098035d2ae9d4431dc7b50af6` 重現 Worker 建構同步拋錯後沒有撤銷 Blob URL。此輪修正只改 `createWorker`、必要生成檔及回歸測試。建構失敗會撤銷該 URL 並拋回原始錯誤。終止時即使底層拋錯也會撤銷 URL。重複終止不重複清理。[主統籌的範圍修正](https://github.com/KYStr/glossquote-labs-home/blob/3ffe6eb207e86c08691a7b45bd4459a740beff29/docs/reviews/five-hour-2026-11-11/dispatch/product-cooking-copy/AMENDMENT-URL-LIFECYCLE.md)

三項 Node VM 注入式回歸在修正前皆失敗，修正後通過。驗證原始例外、URL 撤銷、保留輸入與可成功重試、正常及拋錯終止時只清理一次。完整離線套件 73/73 通過，靜態檢查及生成檢查 exit 0。兩次預覽建置相同。兩語頁、核心、固定 fixtures 和報告序列化與上一候選逐檔相同，沿用 20 筆換算及 14 份報告 bytes 比對。真實瀏覽器的 Worker/Blob 行為、Network/Storage、真機與原生下載維持 `NOT_RUN_USER_FOCUS_INCIDENT`。

