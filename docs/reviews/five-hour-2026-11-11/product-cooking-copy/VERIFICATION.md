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

