# child-height-predictor｜獨立規格審查

**文件結論：建議退修（revision）。** 17/17 字面測例相符；±13 cm 和 Tanner 1970 的歷史 ±8.5 cm 帶寬有原文依據。主流程與獨立報告仍需正確說明輸入與模型適用性。

- 任務：labs-child-height-predictor-spec-20261109；規格：spec-child-height-predictor-20261109。
- 原 owner / claim：cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory / muse-r4-child-height-predi-claim-20261109T151752Z-2f0e7。
- 固定候選：[9da27fecab8e7716e27e7dec853e3231a99721ba](https://github.com/KYStr/glossquote-labs-home/tree/9da27fecab8e7716e27e7dec853e3231a99721ba)；[PR #238](https://github.com/KYStr/glossquote-labs-home/pull/238)（open draft，head 相符）。
- reviewer：local-codex:01a1c87c-ef54-7bd0-a50d-0fc69b43bed3，未撰寫、未修訂本候選，亦不在 owner、author 或 contributors。
- 派工：[PR #284](https://github.com/KYStr/glossquote-labs-home/pull/284)，brief 固定 83d5b24a00eb80d07ffcdd8aa2886006bc8a61ed。登記讀值 r1530／blob e01da965f28e5248ca13158094ca356254a25c2b，contract 2026-10-29.1；主頁 baseline 26525d5f6380915ea95dde879dec769442db0d95。
- 記錄時刻（UTC）：2026-11-11T03:06:06.372Z。原登記狀態：task reviewing / spec draft。正式 registry 操作待主統籌串行 slot。

四檔由 GitHub connector 讀固定 commit；本地副本的 Git blob 逐檔相符，完整內容均已閱讀。

|檔案|bytes|Git blob SHA-1|SHA-256|
|---|---:|---|---|
|[BRIEF.md](https://github.com/KYStr/glossquote-labs-home/blob/9da27fecab8e7716e27e7dec853e3231a99721ba/docs/specs/child-height-predictor/BRIEF.md)|1461|7bb66e9f657626ea4a8bd4a591183422b36eacab|317af4f6b51b80ab93ceafe3eb2a192f4b05bd5cd22c1d2299cad37d6f606a6a|
|[SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/9da27fecab8e7716e27e7dec853e3231a99721ba/docs/specs/child-height-predictor/SPEC.md)|19334|6458947cbf7c519875b55b933b00163c9e04fc69|1aa02043e61d0ceb02f00a91fbcaca7811d2d555cbf6dd9790e129fd4f2f4f94|
|[fixtures.json](https://github.com/KYStr/glossquote-labs-home/blob/9da27fecab8e7716e27e7dec853e3231a99721ba/docs/specs/child-height-predictor/fixtures.json)|5722|3aae38d54340aabe5a0750fefc9b0600b3b2be83|daace60a0d1ec2cf943801b17473ac2d799be1e8b0832b65496aa93dad867f02|
|[AUTHOR-CHECK.md](https://github.com/KYStr/glossquote-labs-home/blob/9da27fecab8e7716e27e7dec853e3231a99721ba/docs/specs/child-height-predictor/AUTHOR-CHECK.md)|4535|009b39176e4f95d41b2ad404aa1790eff905c500|a6402418c9a2c18977c448842d372e0133cf60f0ad2353e68c2f1947e000e322|

## 八節審查（文件分數）

|登記面向|完整|分數|獨立證據|
|---|---|---:|---|
|goal|false|86|桌面健檢前後、手機家庭對照場景具體，成功可觀測。但 BRIEF 承諾不需輸入兒童任何資料，核心必收 childSex；結果應是家族身高參考而非個人保證（S02-CHILD-01）。|
|scope|true|94|三欄、單一 Tanner 模型、無兒童量測/骨齡/成長曲線；與 BMI/TDEE 本人量測及熱量用途不重複。查核來源支持窄版，但預測的適用條件須前移（S02-CHILD-01/02）。|
|userFlow|false|86|空、dirty、busy、可取消、錯誤復原、reset、換語丟草稿及下載可驗。FAQ 才說親生父母，與主要任務必要輸入語義距離太遠。|
|inputsOutputs|false|86|14/14，三欄文法、100–230、欄序、半數進位與 ±8.5 數值正確。百分位與報告上下文需補齊（S02-CHILD-02）。|
|implementation|true|97|Node 24 零依賴，有理數或整數皆可實作；三層架構、Worker generation、取消/離頁撤銷、零網路/儲存、CSP 與同源雙語。|
|acceptance|true|92|正文有同 head 九面向、≥90、原生隔離與 NOT_RUN；可測 keyboard/320px/zoom/Network/Storage。將估算適用性也列入結果及報告 evidence。|
|tests|true|95|14 核心＋3 狀態符合；精確範圍與代表性錯誤可重現，另驗合成下載 JSON。無真瀏覽器證據，本文件沒有宣稱產品過關。|
|handoff|true|96|四檔與固定候選、獨立文件審查、另取實作 claim、發布責任與停止條件已列。作者檢查署名與正式 owner 分列，下方保留兩者。|

## 字面驗算與檢查

以 Node v24.14.0 執行 [verify.mjs](verify.mjs)（用共用 [review-lib.mjs](../review-lib.mjs)；命令 `node.exe verify.mjs`，exit 0，Windows 隱藏子行程）。腳本只讀已核實的合成 fixture，依契約自行計算；expected 只用於比對。公開副本預設讀取 [固定字面測例](fixed-fixtures.json)。使用 Node.js 24 執行 `node verify.mjs`，也可在命令末尾傳入相同 Git blob 的原始 fixtures.json 路徑。
完整字面 input／獨立推導／作者宣告值見 [fixtures-output.json](fixtures-output.json)；程序狀態見 [command.json](command.json)。

|檢查|結果|證據|
|---|---|---|
|核心|PASS|14/14；以父母平均加/減 13/2 再對未捨入上下界獨立 round-half-up。|
|狀態|PASS|3/3；取消/重設及晚回覆，兩個 payload 獨立重算。|
|下載參考值|PASS|boy-typical 為 73 bytes，SHA-256 dd950714738bb384e7da45abf38c1e9cd04b8d429696f152242ab6c543a3d62c。現規格 JSON 沒有模型說明。|
|原始公式與歷史帶寬|PASS|Tanner 1970 原文有 ±13 調整、以相關 0.5 推導 17 cm 殘餘帶寬；同時有後續範圍變體。|
|輸入與預測風險語義|FAIL|主流程／BRIEF 與必填資料、歷史區間適用性、下載脫離聲明的問題如下。|

## 阻擋缺陷

### S02-CHILD-01

- 位置：BRIEF 首段；SPEC §goal、§userFlow、§inputsOutputs、§tests FAQ
- 最小案例：只送 fatherHeightCm='178'、motherHeightCm='165'；或非親生照顧者按表單主標籤填入兩個數字。
- 觀測：BRIEF 說不需任何孩子資料，但缺 childSex 是 SCHEMA。主要欄位未限定親生父母的成年實測身高；只在 FAQ 解釋。若不具備兩位親生父母身高，數字仍可算出但模型不適用。
- 預期：兩語在輸入處說明需要孩子性別（模型參數）及兩位親生父母成年身高，無須姓名、年齡或兒童身高等量測。若缺必要身高不要鼓勵填入照顧者或範例代替。
- 重驗：用缺性別、缺任一已知親生父母身高的合成情境核對 BRIEF、首屏、欄位提示和錯誤恢復。

### S02-CHILD-02

- 位置：SPEC §userFlow/§inputsOutputs 匯出、§tests FAQ 與 §acceptance
- 最小案例：計算父178、母165、男孩並下載；另檢查兩位親生父母都在規格 100 或 230 cm 端點的合成情境。
- 觀測：FAQ 把 ±8.5 cm 寫成不加條件的約第3–97百分位和多數兒童會落入。原作者是以歷史參照及相關 0.5 作理論估算；不同人群、成年身高極端與回歸效應會改變適用性。主 UI 有聲明，但 73-byte JSON 只有性別與三個數值，單獨讀時失去用途及限制。
- 預期：保留 ±8.5 作為歷史模型帶寬時，兩語明示其假設，不能拿它當兒童個人的成長百分位、精準覆蓋率或診斷；靠近結果和任何下載產物清楚標記此模型與限制。下載是使用者刻意保存的檔案，區分頁面暫存與使用者檔案。
- 重驗：核原始文章和兩語 FAQ、結果、獨立下載文件與新 schema/bytes；確認不以端點能算出數字當成模型對該人群已驗證。

修正限定在原 docs/specs/child-height-predictor/ 的契約、測例及作者紀錄，由主統籌交回原責任或依有效維護任務處理。候選更新後才重審；本 reviewer 未修改候選。

## 已讀來源

- [Tanner、Goldstein、Whitehouse 1970 原文](https://adc.bmj.com/content/archdischild/45/244/755.full.pdf)：Prediction of target adult height 段：13 cm、相關假設 0.5、殘餘 17 cm，取平均值 ±8.5 cm。
- [Children’s Mercy 兒科內分泌指引](https://www.childrensmercy.org/health-care-providers/pediatrician-guides/endocrinology/growth-failure/)：家庭區間與臨床生長曲線是兩個資訊來源，原公式 ±13、區間 ±8.5 仍有具名臨床引用。
- [美國兒科學會家長指引](https://www.healthychildren.org/English/health-issues/conditions/Glands-Growth-Disorders/Pages/Predicting-a-Childs-Adult-Height.aspx)：親生父母的實測高度，±5 in 調整，約 ±4 in 誤差；明確說是粗估。與歷史 Tanner 帶寬是不同版。
- [Zeevi 等 2024 原始研究](https://www.mdpi.com/2227-9067/11/8/916/pdf?version=1722318051)：實證比較原模型、家長年齡與極端身高回歸，標明歷史 ±8.5 的理論背景。
- [BMI/TDEE 固定候選](https://github.com/KYStr/glossquote-labs-home/blob/f4f9192b115d68257b674011e6d38fb140d872db/docs/specs/bmi-tdee-calculator/SPEC.md)：本人身高、體重、年齡與活動→ BMI/BMR/TDEE，沒有下一代身高輸出。

## 非阻擋改善

- AUTHOR-CHECK 署名是 cloud-dot:e3105f7c-4816-4540-ab77-ddfae167dde5:/home/hatch/workspace/glossquote-factory/build5/specs/child-height-predictor。遠端 registry 的原 owner/submission actor 是 cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory。本人與兩者均不同、未參與；請主統籌將署名當來源證據保留，原 claim 不動。
- 將首屏預設值標示為合成例，避免誤作家長自己的資料。

## 另列：生產驗收契約 — FAIL（S02-REGISTRY-01）

GitHub registry r1537／blob 73e05eb696e26d943c8eb1fed2e7f5e2bdc89c50：原 spec 製作 task 的文件評分應使用上表八節；spec.acceptanceCriteria 卻也登記同樣八項（goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff）。
固定規格宣告產品九項：functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility。這五份的 spec 都仍為 draft；本項無引用該 spec 的 production task。協作核心 blob 4782dd1f249995ceeec00b2d0a89b57d9b9bbb7d 會強制 production 原樣繼承 spec 條件。即使字面測例全對，現有登記也無法以該候選的九面向為生產驗收門檻。
`spec.acceptanceCriteria` 應固定同一候選文件所列的九個必要產品面向與證據；原 spec 製作 task 的八個文件面向及分數保持。 保留同一 spec ID、原作者與原 task；等主統籌確定合法維護／修訂途徑，由有權 actor 修正後重新讀回 registry、固定規格與 PR head，才可計入 ready。

## 未執行與交接

產品九面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility 皆 **NOT_RUN／null**。此處 PASS 僅指文件證據；未執行候選產品、Chrome／Edge、真下載／原生視窗、正式 SEO 或部署。

待主統籌指定串行 slot 後，實際 reviewer 重核 PR head、owner 和最新 registry，由本人 ACK 並依固定審查證據提交對應候選的退修結果。
