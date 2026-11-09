# 第三輪維護：獨立複核（交付包核對前）

審查者 `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/r3_independent_review` 本人確認現行規則與主頁基線；GitHub r1504 精確讀回。固定審查為 [PR #275](https://github.com/KYStr/glossquote-labs-home/pull/275) 的發布候選 `56e11511d3c7f9053133bafb985ab175687da2a5`；產品原始碼固定於 `069bd37af1a6100f366afaebe5afb26aa953c5a3`。此紀錄尚未提交獨評結果。

| 面向 | 分數 | 已獨立驗證的證據 |
| --- | ---: | --- |
| source-provenance | 99 | 原回報 ZIP SHA-256 `280f9d1c6ae082a0e74f3c9b9ba9d01651d1a179b66c035b2a7cc3d9b9ea7e5e`、CRC、安全路徑、693 檔與解封內容完全一致；692 筆清單雜湊。基線 `328dee40ef0de631d7d50a443e5d5eb2e7668164` 的 50 個產品 blob、8 個分別固定的規格檔與 59 個候選工具及規格檔均核對 GitHub。外部回報另引用的原發布 ZIP SHA-256 `56b0b2897903e6be3afe1e491270423c4510e4eaa88e5577b8a0b7fc2807ca4d` 也核對，58 個基線來源／規格與該 ZIP 逐位元組一致。前次 `e9eb54813a55bd9f0a04b703ecbccee8c2510f4d` 保留證據對到 1,634 項凍結清單及 TTS 核心、Fluid 兩語頁外部取證與目前 HTTP bytes。PR #246 在舊報告截取時仍 open；本輪重新查已 merged。 |
| defect-resolution | 98 | 百分比原版以同一組新增測試重現 9 FAIL，候選 56/56，含實際建置 app 的 12 個整合 fixture；獨立檢查單一完成入口和 Worker 身分／世代。加班費原版重現 650／1,200、20 小時上限不可觸發提醒、getter 1 次；候選 46/46 及 18 個獨立測例。逐日級距、兩語規格、逐日 round-half-up、巢狀 getter 0 次、日期及 31 列上限、46／46.5、快照及過期工作均驗證。兩工具四項 npm 關卡皆 exit 0。 |
| release-security | 99 | 1,636 檔與固定 GitHub manifest blob `12d572af9ca09d016ba394b1486a024e59f94ed2` 全數相符，SHA-256 `05815be10ac72b17ea7196728302ed5a278d1a60ad6daa1b207229381396c44a`；16 項差異（包含兩個不由 HTML 引用的同源 QA 資產）、1,620 檔及其他 138 個工具站不變。Worker／設定逐位元組相同，141 條既有路由、CSP、headerRules 不變；47 個既有正式工具與正式首頁保持分離。8/8 路由測試含新 QA 路徑隔離。本人 Git ACK 前後指紋、兩輪 Windows 測試前後 Environment 指紋均相同。 |
| bilingual-release | 97 | 獨立 HTTPS 43/43（31 個受影響資產、3 個前輪保留資產、9 個語言轉址／404），公開產物 bytes、noindex、CSP、HSTS、DENY 核對通過。初次加班費三個 SHA 對到前一版資產，保留為當時的觀測；後續查為候選 SHA。百分比首次新瀏覽器仍忙碌，保留為失敗觀測；後續隔離 Chromium 兩語實際頁、同源合成輸入及真 Worker 8/8 通過，寬 390／1280 CSS px 無頁面橫溢。加班費兩語初次遇服務 HTTP 429；隔開請求後原頁真 Worker 與 DOM 14/14 通過（390／1280 CSS px），包括 NT$600／650／2,400、逐筆新增移除、重複日期、取消／重設及 46／46.5 小時分界。本人逐項解析四份原始 HTML 回應的 22 筆觀測和最終 DOM；實站 Cloudflare Worker version `46ddcbfb-19a5-4db3-a999-bc6c82e7682b`。 |
| delivery-integrity | 待驗 | 待最終單一 ZIP；尚未評分。 |

加班費法規引用只支持正常每日 8 小時、月工資相當 240 小時的情境，以及日別級距和國定假日加發，並核對 46 小時基準與 54／138 小時例外的範圍。[勞動部月薪制試算](https://calcr2.mol.gov.tw/Monthly)、[勞動部法令說明](https://calcr2.mol.gov.tw/Index)、[勞動部休假日工資問答](https://www.mol.gov.tw/1607/28690/2282/2284/2290/7154/post)。試算適用條件及逐日整元捨入按固定規格，未做個案合法性判定。

測試使用合成資料。未使用使用者的本機瀏覽器、桌面或鍵盤。原生下載、實體裝置、讀屏、實際 200% 縮放、320 CSS px 重排、全量 Network／Storage、正式產品驗收與外部複驗仍需各自留證。SEO-01、SEO-03 與租屋工具 Blob Worker 例外不在這次功能維護範圍。

