# 儲蓄目標計算：固定預案獨立審查

- 任務：`labs-savings-goal-calculator-spec-20261109` / `spec-savings-goal-calculator-20261109`
- [PR #245](https://github.com/KYStr/glossquote-labs-home/pull/245)：open / draft；head `9828c5d10ff75720333491cfc21f190b7cd7ed16`；registry r1530 blob `e01da965f28e5248ca13158094ca356254a25c2b` 的 submission 相符。
- 審查者：`local-codex:01a1c87c-f22f-76f1-9e00-dcb0b0b55486`。本人未參與候選製作；與原作者、owner 及 contributors 核對。原 claim：`muse-r4-savings-goal-calcu-claim-20261109T152837Z-07837`；owner `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory` 保留。
- 完成時間：`2026-11-11T03:02:48Z`。文件結論：**FAIL / revision**；修訂後重審；不要標記 ready。 Registry 寫入等待串行時段。

Windows 背景離線審查。使用逐月精確有理數遞推來獨立核對閉式規則與真實顯示尾款，沒有中途捨入；另為比對既有產品按舊契約每月捨入。21/21 指字面比較，兩案語義失敗另列。未執行任何產品程式、瀏覽器、下載、Network/Storage、正式 SEO 或部署。

## 固定來源與驗算

| 檔案 | Git blob | bytes |
| --- | --- | ---: |
| [BRIEF.md](https://github.com/KYStr/glossquote-labs-home/blob/9828c5d10ff75720333491cfc21f190b7cd7ed16/docs/specs/savings-goal-calculator/BRIEF.md) | `9facb12021d4158af40a2790b7e90924fe7a895c` | 2163 |
| [SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/9828c5d10ff75720333491cfc21f190b7cd7ed16/docs/specs/savings-goal-calculator/SPEC.md) | `7a66b67abbc61dca15e54411e112e701a8c76c93` | 27762 |
| [fixtures.json](https://github.com/KYStr/glossquote-labs-home/blob/9828c5d10ff75720333491cfc21f190b7cd7ed16/docs/specs/savings-goal-calculator/fixtures.json) | `e1919004b77c0d47b88c4d80087a33fbbaabc5e0` | 10729 |
| [AUTHOR-CHECK.md](https://github.com/KYStr/glossquote-labs-home/blob/9828c5d10ff75720333491cfc21f190b7cd7ed16/docs/specs/savings-goal-calculator/AUTHOR-CHECK.md) | `48c844eeacd4af0ad39ce5a2240476653795b10e` | 5590 |

本地檔案的 Git blob SHA 與遠端固定檔案逐一相符；SHA-256 詳見 [review.json](review.json)。作者核對已讀，未當作獨立驗證。

`python -B -X utf8 verify.py <fixed-candidate>/docs/specs/savings-goal-calculator/fixtures.json`：exit **0**，**21/21** 個字面案例符合。 [獨立驗算](verify.py) / [全部字面 input、fixture expected、獨立結果、額外反例](fixture-output.json)。

## 八個文件面向

| 面向 | 分數 | 完整 | 依據 |
| --- | ---: | --- | --- |
| `goal` | 97 | PASS | §goal 有具體期限、現金流及手機規劃場景；可觀察每月需存、首次達標月與尾款，利率由使用者假設。 |
| `scope` | 80 | FAIL | §scope 宣稱前一工具主要正向，但遠端 #44 規格與 #80 固定候選均有相同的兩個反向模式。尾款為真正差異，仍待主統籌裁定獨立用途與不重複範圍（SG-01）。 |
| `userFlow` | 88 | FAIL | §userFlow 的兩模式、保留草稿、取消／reset、語言與狀態均明確；結果宣稱可照做卻把已照做的餘額顯示成目標（SG-02）。 |
| `inputsOutputs` | 82 | FAIL | 精確欄位、首錯與兩套輸出形狀皆有；模式 B 期末餘額／利息與顯示尾款不一致，零尾款可差 46.22（SG-02）。 |
| `implementation` | 83 | FAIL | 純核心／BigInt、固定 Blob Worker 和撤銷、CSP 均可原生離線實作；正利率時間估計在套用 1200 月限制前可能要求百萬次方，未釘版指數上限（SG-03）。 |
| `acceptance` | 96 | PASS | 九產品面向具獨立方法，要求同 head ≥90，兩語/320px/200%/Network/Storage/Chrome+Edge/noindex/正式 gate 均有定義，產品未跑。 |
| `tests` | 82 | FAIL | 18 核心+3 controller 與字面規則相符，但兩個 fixtures 的 finalBalance／interest 與實際末月行為不符；另缺正利率巨大超期估計（SG-02/03）。 |
| `handoff` | 96 | PASS | 固定四檔、工具路徑、各命令、隔離、另取 claim、禁止同範圍另開與版本交接完整。 |

產品九面向 **NOT_RUN**（無產品分數）：`functionality`、`boundaries`、`privacy`、`security`、`usability`、`accessibility`、`localization-seo`、`toolchain-provenance`、`compatibility`。

## 一級來源

- [Investor.gov：Savings Goal Calculator](https://www.investor.gov/financial-tools-calculators/calculators/savings-goal-calculator)：正式公共教育工具也使用目標、初始資金、期間與假設年利率，支持使用情境；其選項不證明此案採用的月底存款與分位捨入策略。
- [既有 Compound Interest and Savings Goal 規格 #44](https://github.com/KYStr/glossquote-labs-home/blob/5a9acc11b5b23200c3d4cda32adaafbbd389532e/docs/specs/compound-interest-calculator/SPEC.md)：§2–4 已包含兩個反向需求；與 #245 指到的 1160e698… SPEC 為相同 Git blob 55b53a53e00ddea4c037d516d6b403124a7aefc9。
- [既有候選 #80 的固定英文介面](https://github.com/KYStr/glossquote-labs-home/blob/e42ebf56853ad8e46964ea8fc1ebf9623c6c2bb1/tools/compound-interest-calculator/public/en/index.html#L33-L34)：已實際存在兩個模式的來源控制項，未執行產品或聲稱 accepted。

## 阻止放行的問題

### SG-01 — §scope 差異化、BRIEF、既有 #44 與 #80

- 最小輸入：`{"mode":"payment","targetAmount":"12000","initialAmount":"0","annualRate":"12","months":"12","monthlyPayment":"3000"}`。
- 候選： #44 規格及 #80 固定 HTML 已有同輸入/輸出的 Required contribution 與 Months to target。以本例兩者主答案都是 946.19；目標 1000／月存 100 的月份都為 10。不同捨入模型不是不同使用任務。新版尾款和 1200 月上限有額外功能。
- 獨立預期： 由主統籌確認哪一個明確且獨立的使用場景需要此工具，或把尾款／假設作既有工具的可審查補充，保留既有 owner 與候選，不把兩份相同工作計入可開工庫存。若保留兩模型，說清各適用計息情境及可能不是只差幾分：PV=0.01、目標 0.02、年率 12%、月存 0，逐月捨入模型不成長，新模型第 70 月達標。
- 修訂驗證： 主統籌記錄已處理的重疊與 scope，核對新 head 的使用者成果以及固定前案，而非只比較公式或名稱。

### SG-02 — §inputsOutputs 4.5、§tests months-growth-only-crossing／months-with-interest、AUTHOR-CHECK

- 最小輸入：`{"mode":"months","targetAmount":"11000","initialAmount":"10000","annualRate":"12","months":"60","monthlyPayment":"0"}`。
- 候選： 第 10 月，尾款與全額月存都是 0。固定預期 balanceIfFullPayment=11046.22、finalBalance=11000.00、totalInterest=1000.00，兩個期末餘額卻相差 46.22。months-with-interest 依顯示尾款 152.88 存入也會得到 20000.01／利息 2547.13，而非 20000.00／2547.12。
- 獨立預期： 模式 B 期末餘額應用 `halfUp(B(k−1)×q + 實際顯示尾款)`；利息用此餘額減初始額和顯示存款。純成長案例應報 11046.22／1046.22；若保留目標值，請另欄標為目標而不是期末餘額，不宣稱差距總小於一分。
- 修訂驗證： 修正兩個固定 fixtures、輸出契約、FAQ 和 AUTHOR-CHECK；用獨立遞推核對計畫和款項後真實顯示餘額。

### SG-03 — §inputsOutputs 4.3→4.4、§implementation 正利率校正

- 最小輸入：`{"mode":"months","targetAmount":"999999999.99","initialAmount":"0.01","annualRate":"0.01","months":"60","monthlyPayment":"0"}`。
- 候選： 合法輸入的對數估計約 3,039,425 月；按文字順序先做精確 B(k) 校正再判 1200 上限，120001^k 的未約分分子約 15,437,802 位數。1300 次迭代上限沒限制單次指數。未執行這個不必要的大冪。
- 獨立預期： 先用精確 B(1200) 判超期，或在任何精確比較前把可查的指數限制為 0–1200。此例 1200 月餘額顯示 0.01、應回 unreachable/beyond-horizon；可在 1–1200 上作單調二分求首個達標月。
- 修訂驗證： 新增正利率巨大超期案例；驗 1200/1201 邊界、B(k−1)<FV≤B(k) 以及最大評估指數，不只測零利率超期。


## 非阻塞改善

- 下載 {input,result} 會帶非作用中模式的原草稿；可明示下載內容，或只保存本次有效輸入。

## 生產驗收繼承契約：FAIL（REG-01）

原製作規格 task 的八項是本次文件評分欄位，這是正確的文件 rubric。遠端 r1530 的 spec.acceptanceCriteria 也逐項填了相同八項：`goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff`。固定 SPEC §acceptance 宣告的是九項產品面向；兩組 ID 完全不同。 [核心 register-task](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/scripts/coordination-core.mjs#L287) 要求 production 原樣繼承 spec.acceptanceCriteria。目前未找到引用該 specId 的 production task。**不可標 ready 或照錯誤 rubric 開工**；由主統籌依合法維護流程修復並讀回。不改原 task 的八項、作者或 claim，也不影響上列 fixtures 結果。
