# 損益平衡計算：固定預案獨立審查

- 任務：`labs-breakeven-calculator-spec-20261109` / `spec-breakeven-calculator-20261109`
- [PR #240](https://github.com/KYStr/glossquote-labs-home/pull/240)：open / draft；head `77b72cb74db4cae3bba2c4c1bff7cae5dbc63639`；registry r1530 blob `e01da965f28e5248ca13158094ca356254a25c2b` 的 submission 相符。
- 審查者：`local-codex:01a1c87c-f22f-76f1-9e00-dcb0b0b55486`。本人未參與候選製作；與原作者、owner 及 contributors 核對。原 claim：`muse-r4-breakeven-calculat-claim-20261109T152134Z-57074`；owner `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory` 保留。
- 完成時間：`2026-11-11T02:49:17Z`。文件結論：**FAIL / revision**；修訂後重審；不要標記 ready。 Registry 寫入等待串行時段。

Windows 背景離線獨立驗算。候選僅四份規格檔。沒有執行產品程式、瀏覽器、真實下載、Network/Storage、正式 SEO 或部署。controller 輸出是文件狀態模型。

## 固定來源與驗算

| 檔案 | Git blob | bytes |
| --- | --- | ---: |
| [BRIEF.md](https://github.com/KYStr/glossquote-labs-home/blob/77b72cb74db4cae3bba2c4c1bff7cae5dbc63639/docs/specs/breakeven-calculator/BRIEF.md) | `4c0c654f5013de4fd157a729b883b80035e5b661` | 1339 |
| [SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/77b72cb74db4cae3bba2c4c1bff7cae5dbc63639/docs/specs/breakeven-calculator/SPEC.md) | `eeb51ee01308726602f540d30aa949846549a249` | 23897 |
| [fixtures.json](https://github.com/KYStr/glossquote-labs-home/blob/77b72cb74db4cae3bba2c4c1bff7cae5dbc63639/docs/specs/breakeven-calculator/fixtures.json) | `f0eb0614da95a3d94d10af08ed78da4102655715` | 9636 |
| [AUTHOR-CHECK.md](https://github.com/KYStr/glossquote-labs-home/blob/77b72cb74db4cae3bba2c4c1bff7cae5dbc63639/docs/specs/breakeven-calculator/AUTHOR-CHECK.md) | `a00d7881e5d8946e2a80fe30a41db5df3a7ccabb` | 5413 |

本地檔案的 Git blob SHA 與遠端固定檔案逐一相符；SHA-256 詳見 [review.json](review.json)。作者核對已讀，未當作獨立驗證。

`python -B -X utf8 verify.py <fixed-candidate>/docs/specs/breakeven-calculator/fixtures.json`：exit **0**，**21/21** 個字面案例符合。 [獨立驗算](verify.py) / [全部字面 input、fixture expected、獨立結果、額外反例](fixture-output.json)。

## 八個文件面向

| 面向 | 分數 | 完整 | 依據 |
| --- | ---: | --- | --- |
| `goal` | 96 | PASS | §goal：月固定成本、單位售價及變動成本；桌面查保本門檻，手機談價改價。 |
| `scope` | 96 | PASS | §scope：固定成本與最低銷量，和 #243 的單件定價換算及同 repo 會議成本／複利模型用途不同；單一幣別、無稅、無多產品。 |
| `userFlow` | 82 | FAIL | §userFlow：初始、dirty、Worker 取消、過期結果、重設、切語與可及焦點有定義；NO_MARGIN 的中英文把零貢獻說成每件虧損（BE-01）。 |
| `inputsOutputs` | 83 | FAIL | §inputsOutputs：原始 UTF-16 長度、先錯、整數與有理數及輸出欄位均明確；固定成本零與非正貢獻交叉條件的業務說明錯誤（BE-01）。 |
| `implementation` | 96 | PASS | §implementation：原生 HTML/CSS/ESM + BigInt 純核心可離線；固定程式 Blob Worker，世代隔離、終止、撤 URL、安全 DOM/CSP；不要求額外套件或權限。 |
| `acceptance` | 94 | PASS | §acceptance／§tests：九項分開，固定候選、隱私實測、320px/200%、兩語 Chrome/Edge、部署另核，產品目前 NOT_RUN；捨入鑑別不足另記 BE-02。 |
| `tests` | 85 | FAIL | 18 核心 + 3 狀態均與規格字面輸出相同，序列化可重現；2.675% 無法區分 half-up 與精確 half-even，且缺非正貢獻 × 零固定成本之邊界（BE-01/02）。 |
| `handoff` | 97 | PASS | §handoff：固定四檔、tools/ 目標、建置與隔離預覽指令、另一 claim、修訂新 head、獨審與部署分離。 |

產品九面向 **NOT_RUN**（無產品分數）：`functionality`、`boundaries`、`privacy`、`security`、`usability`、`accessibility`、`localization-seo`、`toolchain-provenance`、`compatibility`。

## 一級來源

- [U.S. SBA：Break-even point](https://legacy.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point)：總收入等於總成本與單一產品的單位／營收保本公式；以獨立利潤等式檢查退化情況。

## 阻止放行的問題

### BE-01 — SPEC.md §userFlow NO_MARGIN、§inputsOutputs、§tests FAQ，及 BRIEF 的非正貢獻聲明

- 最小輸入：`{"fixedCost":"0","price":"10","variableCost":"10","expectedUnits":"2"}`。
- 候選： 契約回 NO_MARGIN；中英文結果稱每賣一件都虧且不存在保本點。
- 獨立預期： 等價代入 2×10 − (0 + 2×10) = 0；每個非負銷量都剛好打平，沒有唯一門檻。固定成本 20、同樣 P=V 時虧損固定 20，並不因銷量增加；F=0、P=10、V=11 時零銷量打平、正銷量才虧。可保留 NO_MARGIN 政策，但文字須交代門檻定義並區分等於、小於、零固定成本。
- 修訂驗證： 固定新 head；補三種字面交叉案例，重跑算術與中英文結果／FAQ 契約。

### BE-02 — SPEC.md §tests ratio-half-up-tie；AUTHOR-CHECK.md 手算；fixtures.json 該案例 purpose

- 最小輸入：`{"price":"40.00","variableCost":"38.93","exactPercent":"2.675"}`。
- 候選： 字面預期 2.68 正確，但文字說 half-even 得 2.67、該案例能區分銀行家捨入。
- 獨立預期： 十進精確 half-up 與 half-even 在 2.675 都得 2.68。用 price=200.00、variableCost=194.67 的 2.665% 補或取代鑑別案例，half-up=2.67、half-even=2.66。保留現有數值也可，但須改錯誤證據聲明。
- 修訂驗證： 更新 SPEC、fixture、作者記錄的一致性；獨立對照兩個 tie 模式。


## 非阻塞改善

- 在預期銷量欄提示它和固定成本必須採同一期間；例如月固定成本配月銷量。

## 生產驗收繼承契約：FAIL（REG-01）

原製作規格 task 的八項是本次文件評分欄位，這是正確的文件 rubric。遠端 r1530 的 spec.acceptanceCriteria 也逐項填了相同八項：`goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff`。固定 SPEC §acceptance 宣告的是九項產品面向；兩組 ID 完全不同。 [核心 register-task](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/scripts/coordination-core.mjs#L287) 要求 production 原樣繼承 spec.acceptanceCriteria。目前未找到引用該 specId 的 production task。**不可標 ready 或照錯誤 rubric 開工**；由主統籌依合法維護流程修復並讀回。不改原 task 的八項、作者或 claim，也不影響上列 fixtures 結果。
