# steps-converter｜獨立規格審查

**文件結論：建議退修（revision）。** 22/22 字面案例與固定報告 bytes 都符合本候選的數學契約；模型溯源、單步輸入及估算說法不符可實作的真實語義，不能放行該文件。

- 任務：labs-steps-converter-spec-20261109；規格：spec-steps-converter-20261109。
- 原 owner / claim：cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory / muse-r4-steps-converter-claim-20261109T151255Z-d906b。
- 固定候選：[70dce9d009d060b386f27db533a9097f9bd9c299](https://github.com/KYStr/glossquote-labs-home/tree/70dce9d009d060b386f27db533a9097f9bd9c299)；[PR #234](https://github.com/KYStr/glossquote-labs-home/pull/234)（open draft，head 相符）。
- reviewer：local-codex:01a1c87c-ef54-7bd0-a50d-0fc69b43bed3，未撰寫、未修訂本候選，亦不在 owner、author 或 contributors。
- 派工：[PR #284](https://github.com/KYStr/glossquote-labs-home/pull/284)，brief 固定 83d5b24a00eb80d07ffcdd8aa2886006bc8a61ed。登記讀值 r1530／blob e01da965f28e5248ca13158094ca356254a25c2b，contract 2026-10-29.1；主頁 baseline 26525d5f6380915ea95dde879dec769442db0d95。
- 記錄時刻（UTC）：2026-11-11T02:51:30.379Z。原登記狀態：task reviewing / spec draft。正式 registry 操作待主統籌串行 slot。

四檔由 GitHub connector 讀固定 commit；本地副本的 Git blob 逐檔相符，完整內容均已閱讀。

|檔案|bytes|Git blob SHA-1|SHA-256|
|---|---:|---|---|
|[BRIEF.md](https://github.com/KYStr/glossquote-labs-home/blob/70dce9d009d060b386f27db533a9097f9bd9c299/docs/specs/steps-converter/BRIEF.md)|1205|2f3ef68de09fc77b7a8aa7b215f510621c30342c|c893304a3b77bf665e53d93bc95a441125dbb8d2c7b2f0cda4a33eb79aac67cc|
|[SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/70dce9d009d060b386f27db533a9097f9bd9c299/docs/specs/steps-converter/SPEC.md)|19923|4e6e4cfce6cdae3cf0fe37ee52bf65e930460d1b|eda2f2d5876aca905fd81588254fff15aa32c97c517d2b9dd189bbe03b4ab5d7|
|[fixtures.json](https://github.com/KYStr/glossquote-labs-home/blob/70dce9d009d060b386f27db533a9097f9bd9c299/docs/specs/steps-converter/fixtures.json)|8394|892b9192c36f7ec5906db8b692f09a567287d083|acb9493ca78ea7d528f9079c233aed61b670ec6a31ca246d8cc63bd89ee9d84b|
|[AUTHOR-CHECK.md](https://github.com/KYStr/glossquote-labs-home/blob/70dce9d009d060b386f27db533a9097f9bd9c299/docs/specs/steps-converter/AUTHOR-CHECK.md)|3590|5d77397dece03ea47cfbce1125efba1e824189f3|0a8e1341d3aa91166f4f141110ec196f3d593ed44daadc43af961921219f7f79|

## 八節審查（文件分數）

|登記面向|完整|分數|獨立證據|
|---|---|---:|---|
|goal|true|96|§goal：手環/計步器讀數 → 距離；桌面晚餐後、手機戶外場景及觀察結果明確。距離為估算。|
|scope|false|83|一筆步數、兩種步長、可選熱量及明確排除 GPS/跑步/地形。registry r1530、catalog、source-index 與固定的 running-pace/calories-burned 規格確認輸入輸出不同。S02-STEPS-01/03 的來源與適用範圍仍需訂正。|
|userFlow|false|82|empty/dirty/busy/success/error/cancelled、草稿、取消、重設與失焦策略都可實作。S02-STEPS-02 的單步量測定義缺失，且 FAQ 與輸出算法矛盾。|
|inputsOutputs|false|82|核心欄位、範圍、錯序、單位、BigInt 與固定 JSON；19/19。S02-STEPS-01/02/03 影響步長與熱量的必要語義與報告解釋。|
|implementation|true|95|純核心、controller、DOM 分層；Node 24/ESM、固定同源資產和 Blob Worker、generation guard、pagehide、嚴格 CSP 可行；不讀取本機檔案／網站權限。|
|acceptance|true|94|§acceptance/§tests 固定 9 面向、同 head/非作者/逐項 ≥90、隔離 Chrome/Edge、真 zoom/keyboard、Network/Storage 與正式 SEO 分階段。產品九項保留 NOT_RUN；來源修訂後驗證揭露文字。|
|tests|true|93|19 核心＋3 狀態均獨立匹配，74-byte UTF-8/LF 報告 SHA-256 一致；§tests 要求未成對 surrogate、邊界、首錯、真下載。建議補能單獨分辨距離/熱量使用未捨入量的測例。|
|handoff|true|98|四檔固定來源、PR 草稿、原 owner、另登記 production claim、明列停止/送審/發布責任與產品 NOT_RUN。|

## 字面驗算與檢查

以 Node v24.14.0 執行 [verify.mjs](verify.mjs)（用共用 [review-lib.mjs](../review-lib.mjs)；命令 `node.exe verify.mjs`，exit 0，Windows 隱藏子行程）。腳本只讀已核實的合成 fixture，依契約自行計算；expected 只用於比對。公開副本預設讀取 [固定字面測例](fixed-fixtures.json)。使用 Node.js 24 執行 `node verify.mjs`，也可在命令末尾傳入相同 Git blob 的原始 fixtures.json 路徑。
完整字面 input／獨立推導／作者宣告值見 [fixtures-output.json](fixtures-output.json)；程序狀態見 [command.json](command.json)。

|檢查|結果|證據|
|---|---|---|
|核心|PASS|19/19，從欄位文法、錯誤優先序、有理數與半數進位推導。|
|狀態|PASS|3/3，依動作重建 checkpoints；另外獨立重算兩個注入的舊結果。|
|報告位元組|PASS|height-basic：74 bytes、LF、SHA-256 4489db044b31e62ef7cd6ee2748de127590b4788d0f641feb2ad3c274939fdcd。|
|來源與語義|FAIL|步長模型、手動欄位與 FAQ、熱量來源適用範圍有阻擋缺陷。|

## 阻擋缺陷

### S02-STEPS-01

- 位置：BRIEF；SPEC §scope/§inputsOutputs/§tests FAQ；AUTHOR-CHECK
- 最小案例：同為男性、身高 70 in（177.8 cm），分別以 20 和 15 min/mile 行走。
- 觀測：文件將 0.414 宣稱是 Hoeger/ACSM 迴歸平均，FAQ 又把 0.413–0.415 說成個人值的常見窄區間。研究 Table 3 兩種配速分別預測 2197、1880 步/mi，約 73.25、85.60 cm/步，比例約 0.4120、0.4815。
- 預期：如保留 0.414，應在兩語明確標為本工具的粗略固定假設，並區分性別因子與個人不確定性；不能歸名為 Hoeger 固定迴歸或宣稱窄個人範圍。若改模型則同步更新適用輸入與 fixtures。
- 重驗：重核原始來源、BRIEF/SPEC/作者檢查的所有雙語說法；若係數變更重算所有受影響 fixtures、狀態 payload 及報告 SHA。

### S02-STEPS-02

- 位置：SPEC §userFlow、§inputsOutputs、§tests FAQ
- 最小案例：實測兩步跨距 140 cm（單步 70 cm），輸入 1,000 步；另身高 171 cm、100,000 步。
- 觀測：英文「stride」未定義單步，140 cm 通過範圍，得到 1.40 km；應按單步為 0.70 km。FAQ 說使用畫面上精確顯示的步長；171 cm 實際是 70.794 cm，顯示 70.8。核心輸出 70.79 km/1413 steps/km；若照顯示值則 70.80 km/1412。
- 預期：雙語欄位說明需寫單一步長（step length、兩相鄰腳落點間距）及量測方式。FAQ 應明說內部使用未捨入步長，顯示僅供閱讀。
- 重驗：用上述兩筆分別驗兩語說明、欄位量測指引及實際輸出；補可區分兩算法的字面 fixture。

### S02-STEPS-03

- 位置：SPEC §goal、§inputsOutputs、§tests FAQ；BRIEF/AUTHOR-CHECK
- 最小案例：平地走路 4.8、5.6 km/h；另 §goal 的手機健行場景，開啟熱量。
- 觀測：0.73/0.77 可由指定的 2011 值換算，但 SPEC 未釘版年份/代碼，2024 同速約 0.79/0.86。無一級來源支持 FAQ 的個人誤差 ±20%；健行情境有坡度卻套用平地係數。
- 預期：明列固定假設及 2011 來源活動代碼、適用情境；或以現有來源更新模型與輸出。將健行只作距離粗估或明確警示不能把平地熱量當健行值。移除未驗證的誤差數字。
- 重驗：逐處核對雙語揭露與獨立來源；若公式變更，重算熱量案例與對應下載。

修正限定在原 docs/specs/steps-converter/ 的契約、測例及作者紀錄，由主統籌交回原責任或依有效維護任務處理。候選更新後才重審；本 reviewer 未修改候選。

## 已讀來源

- [Hoeger 等原研究：Boise State 作者典藏書目](https://scholarworks.boisestate.edu/kinesiology_facpubs/47/)：DOI 10.1249/01.FIT.0000298459.30006.8d。DOI 正版全文入口無法由 web 工具取用；查閱下列同一篇原始論文的公開全文轉錄。
- [Hoeger 等原研究全文轉錄，Table 3](https://abcdocz.com/doc/171238/one-mile-step-count-at-walking-and-running-speeds)：原論文的步行迴歸是 steps/mile = sex-specific intercept + 63.4×pace − 14.1×height (inches)，並非固定身高乘數。
- [NXP MMA9555L 原廠資料表 §16.2.2](https://www.nxp.com/docs/en/data-sheet/MMA9555L.pdf)：作為常見啟發式的對照：兩個性別因子出現在原廠演算法，該算法另有 1.1 乘數及 step-rate 因子，不等於產品的公式。
- [原始步態研究，CDC Stacks 收錄](https://stacks.cdc.gov/view/cdc/29864/cdc_29864_DS1.pdf)：step length 是相鄰異側接觸點距離。另見同側兩步定義：https://stacks.cdc.gov/view/cdc/218090/cdc_218090_DS1.pdf。
- [Compendium 官方 MET 定義](https://pacompendium.com/)：1 MET 採標準 1 kcal/kg/hr，故以選定的速度除 MET 得總 kcal/kg/km 的推估值。
- [Compendium 官方 Tracking Guide](https://pacompendium.com/wp-content/uploads/2025/02/4_2024_adult-compendium-tracking-guide-1-2024.pdf#page=23)：第 23 頁歷史 2011 欄（17190、17200）3.5/4.3；2024 欄 3.8/4.8。
- [Compendium 2024 Walking](https://pacompendium.com/walking/)：平地中速與快走分別 17190 和 17200；成人表 19–59 歲，無個人誤差 ±20% 的保證。
- [Calories Burned Calculator 固定候選](https://github.com/KYStr/glossquote-labs-home/blob/417937247273364d82476ff3eb7b8268c4cf7b4c/docs/specs/calories-burned-calculator/SPEC.md)：體重×時長×活動 MET，沒有步數或距離。
- [Running Pace Calculator 固定候選](https://github.com/KYStr/glossquote-labs-home/blob/40a7dc689e8e2fc2c527c323ca68398d95e9db19/docs/specs/running-pace-calculator/SPEC.md)：時長、配速、距離三向求解，沒有步數或步長。

## 非阻擋改善

- calories-from-height 使用未捨入 5.4648 或顯示 5.46 都得到 246；補一筆會改變整數 kcal 的字面輸入，以單獨識別錯誤路徑。

## 另列：生產驗收契約 — FAIL（S02-REGISTRY-01）

GitHub registry r1537／blob 73e05eb696e26d943c8eb1fed2e7f5e2bdc89c50：原 spec 製作 task 的文件評分應使用上表八節；spec.acceptanceCriteria 卻也登記同樣八項（goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff）。
固定規格宣告產品九項：functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility。這五份的 spec 都仍為 draft；本項無引用該 spec 的 production task。協作核心 blob 4782dd1f249995ceeec00b2d0a89b57d9b9bbb7d 會強制 production 原樣繼承 spec 條件。即使字面測例全對，現有登記也無法以該候選的九面向為生產驗收門檻。
`spec.acceptanceCriteria` 應固定同一候選文件所列的九個必要產品面向與證據；原 spec 製作 task 的八個文件面向及分數保持。 保留同一 spec ID、原作者與原 task；等主統籌確定合法維護／修訂途徑，由有權 actor 修正後重新讀回 registry、固定規格與 PR head，才可計入 ready。

## 未執行與交接

產品九面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility 皆 **NOT_RUN／null**。此處 PASS 僅指文件證據；未執行候選產品、Chrome／Edge、真下載／原生視窗、正式 SEO 或部署。

待主統籌指定串行 slot 後，實際 reviewer 重核 PR head、owner 和最新 registry，由本人 ACK 並依固定審查證據提交對應候選的退修結果。
