# 精度組固定候選獨立維護審查

判定：**三項維護要求均通過，建議 accepted**。這是固定候選的獨立技術判定；registry review 尚未寫入，不宣稱任務狀態已 accepted。

- 任務：labs-five-hour-precision-repair-20261111。
- 候選：[PR285](https://github.com/KYStr/glossquote-labs-home/pull/285)，open/draft、未合併；head **23fa1265837f66fbedc04441db260dbb2a5ed924**。
- 候選入口：[HANDOFF.md](https://github.com/KYStr/glossquote-labs-home/blob/23fa1265837f66fbedc04441db260dbb2a5ed924/docs/reviews/five-hour-2026-11-11/dispatch/repair-precision/HANDOFF.md)。
- 修正比較來源：PR283 / 448bd9fc9865fe65f6014b66f4a2e2d54b76f539。
- 審查者：/root/five_hour_astra_review，受派要求 Astra/ultra；未製作候選、未借原作者或其他reviewer身分、未改來源。後端模型身分未另確認。
- GitHub入口/規則本輪重讀未變；正式ACK/review前須取fresh registry snapshot與primary串行slot。r1545中原maker/claim精確保留，當時尚為working。

## 預宣告三面向評分

| 面向 | 分數 | 可反駁證據與結果 |
| --- | --- | --- |
| spec-corrections | 100 | FH-QC-A-01的無條件已知列要求已改為「表內目標等於已知距離時」；15000m未填target只有4列，填15000m才出第5列4050秒/270秒每公里。FH-QC-A-02移除457.54499會捨成457的錯誤論證，改用精確分子/分母與2326.5→2327。FH-QC-A-04明示奶油另採同出版社每杯227g教材，承認113g半杯倍乘為226g。三項都有文件diff與獨立重現。 |
| exact-fixtures | 100 | 本 reviewer 的Python3.12.5獨立檢查exit0、49/49；16個race核心expected用55位Decimal公式逐項吻合，8個成功case的列形狀/順序/條件恆等性均吻合。原race18個案例完整保留，唯一新增core案例正確。NHI與cooking fixtures逐byte不變，58級附錄與12密度值不變；沿用首輪已固定35核心及58附錄獨算結果，另檢首級和half-up/bankers真半界。 |
| provenance-and-scope | 100 | PR285的20個changed filenames恰為13指定spec檔+7交接證據；相較PR283只有8個spec檔變動。20份公開raw bytes的Gitblob逐一等於connector值，13份spec與本輪已測snapshot逐byte相同；53相對文件連結可解析。直接讀KAB PDF第1頁確認227g/1cup；保持原作者/owner/claims。race正確標existing-tool-upgrade、不入新增ready、不開獨立站；handoff的core/controller記述已修正。 |

rubricComplete=true、requiredChecksComplete=true **僅適用本維護任務的三項文件修正與來源檢查**。沒有用三項結果取代完整文件八節或產品九面向。

## 獨立執行與來源

1. [verify-independent.py](verify-independent.py) → [offline-review.json](offline-review.json)，exit0；載入隨附的 [oracle_snapshot.py](oracle_snapshot.py) 首輪獨立定義；入口與固定輸入下載方式見 [README](README.md)。原49項證據保留，公開入口另重現未變的35核心與58級附錄；重現結果見 [reproduction-result.json](reproduction-result.json)。原執行只載入本 reviewer 首輪oracle定義，不執行候選產品或作者驗算程式。49項含範圍/保留性/16核心/列形狀/條件恆等性/精確捨入/來源文義。
2. 原公開 bytes 實讀結果為 [public-byte-verification.json](public-byte-verification.json)，Node24.14.0、exit0；20/20公開bytes與connector Gitblob相符、13/13受測spec snapshot一致、53相對連結存在。隨附的 [fetch-inputs.mjs](fetch-inputs.mjs) 重現相同候選檢查並額外取得13份原始規格，實跑exit0；它將新結果寫至指定輸出目錄的 download-verification.json。
3. [pr-readback.json](pr-readback.json)、[pr-files.json](pr-files.json)、[public-blob-manifest.json](public-blob-manifest.json) 保留GitHub實讀head、open/draft/未merged與全部scope；第一次list filenames以錯參數名被schema拒絕，未執行任何變更，改用tool要求repo_full_name後成功。
4. [independent-diff.patch](independent-diff.patch) 是本 reviewer 直接比較原固定source與候選snapshot所得；8檔恰在授權範圍。
5. [King Arthur Easy As Pie February2025 PDF](https://shop.kingarthurbaking.com/content/class-pdfs/EasyAsPie_February2025.pdf#page=1) 第1頁Ingredients與第2頁配方均直接列無鹽奶油227g/1cup；只引用奶油採值，不將該文件其他數值混入原密度表。保留 [Ingredient Weight Chart](https://www.kingarthurbaking.com/learn/ingredient-weight-chart) 半杯113g與一般/快熟燕麥89g的來源區別。
6. [environment-summary.json](environment-summary.json)：Windows guard前後exit0，HKCU/HKLM PATH hash、type/length、ephemeral0與完整Environment-key指紋一致。

## 仍未完成的後續階段

- 本技術審查完成時作者尚須以原claim正式submit此exact candidate；最新狀態須讀取registry。primary給串行slot後，本 reviewer才本人ACK並對同submission candidate寫review；不能用這份文件假稱registry已accepted。
- 原spec registry document/criteria尚未透過合法維護套用更新；文件八節ready另由非作者核對新ref。保留首輪八節矩陣，這次只關閉三個精度finding的文件缺口。
- race-time-predictor是既有Running Pace Calculator的自訂目標/簡化預測升級提案。既有[固定running-pace規格](https://github.com/KYStr/glossquote-labs-home/blob/40a7dc689e8e2fc2c527c323ca68398d95e9db19/docs/specs/running-pace-calculator/SPEC.md) §3第15行已直接填時間+距離，§4第23行已提供四標準Riegel預測；不計獨立new-tool ready。整合需另固定既有實作與合法maintenance。
- 產品九面向、controller實作、真實瀏覽器/裝置、Network/Storage、下載互動、部署和正式SEO皆NOT_RUN。本任務是文件維護，這些尚未執行的產品gate沒有被列為本次已通過。
- 無合併/部署/registry mutation，無桌面、焦點、鍵鼠、IME、clipboard或原生對話；沒有安裝、讀憑證、持久環境/Git設定變更。公開副本僅新增本資料夾的審查文件與驗證證據；候選、registry及原owner均未修改。

