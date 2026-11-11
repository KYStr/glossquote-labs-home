# 加價率與毛利率換算：固定預案獨立審查

- 任務：`labs-markup-margin-calculator-spec-20261109` / `spec-markup-margin-calculator-20261109`
- [PR #243](https://github.com/KYStr/glossquote-labs-home/pull/243)：open / draft；head `1d5de750bf4371a81c1c8d8b57bf38fceea19d66`；registry r1530 blob `e01da965f28e5248ca13158094ca356254a25c2b` 的 submission 相符。
- 審查者：`local-codex:01a1c87c-f22f-76f1-9e00-dcb0b0b55486`。本人未參與候選製作；與原作者、owner 及 contributors 核對。原 claim：`muse-r4-markup-margin-calc-claim-20261109T152536Z-aee33`；owner `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory` 保留。
- 完成時間：`2026-11-11T02:54:04Z`。文件結論：**FAIL / revision**；修訂後重審；不要標記 ready。 Registry 寫入等待串行時段。

Windows 背景離線獨立驗算；controller 是文件狀態模型。候選只有文件，產品程式、Chrome/Edge、真下載、可及性、Network/Storage、正式 SEO 與部署均未執行。

## 固定來源與驗算

| 檔案 | Git blob | bytes |
| --- | --- | ---: |
| [BRIEF.md](https://github.com/KYStr/glossquote-labs-home/blob/1d5de750bf4371a81c1c8d8b57bf38fceea19d66/docs/specs/markup-margin-calculator/BRIEF.md) | `7ab424f646a4350af5d1c7f7743ed016090b3d16` | 1499 |
| [SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/1d5de750bf4371a81c1c8d8b57bf38fceea19d66/docs/specs/markup-margin-calculator/SPEC.md) | `27f5203e36aab2a23ee8893d441d4984076fc57f` | 25670 |
| [fixtures.json](https://github.com/KYStr/glossquote-labs-home/blob/1d5de750bf4371a81c1c8d8b57bf38fceea19d66/docs/specs/markup-margin-calculator/fixtures.json) | `ecf90ab6f5b455087724e9fbeb8f2ea9b803e928` | 13028 |
| [AUTHOR-CHECK.md](https://github.com/KYStr/glossquote-labs-home/blob/1d5de750bf4371a81c1c8d8b57bf38fceea19d66/docs/specs/markup-margin-calculator/AUTHOR-CHECK.md) | `7e628618f2e8dc4a763670038f3697517773c4e9` | 7579 |

本地檔案的 Git blob SHA 與遠端固定檔案逐一相符；SHA-256 詳見 [review.json](review.json)。作者核對已讀，未當作獨立驗證。

`python -B -X utf8 verify.py <fixed-candidate>/docs/specs/markup-margin-calculator/fixtures.json`：exit **0**，**35/35** 個字面案例符合。 [獨立驗算](verify.py) / [全部字面 input、fixture expected、獨立結果、額外反例](fixture-output.json)。

## 八個文件面向

| 面向 | 分數 | 完整 | 依據 |
| --- | ---: | --- | --- |
| `goal` | 94 | PASS | §goal：同一利潤用成本／售價做不同分母；手機現場檢核、桌面反推單件定價。實際售價是否達標須校準措辭（MM-01）。 |
| `scope` | 96 | PASS | §scope：三模式、單一商品與幣別；和 #240 保本銷量及既有折扣、百分比或通用有理數工具的工作成果不同。 |
| `userFlow` | 82 | FAIL | §userFlow：切換清除停用欄位、dirty、Worker 取消、reset、離頁、狀態與焦點可實作。求解 UI 未揭露目標率實現值，售價為 0 同時觸發互斥提示（MM-01/02）。 |
| `inputsOutputs` | 86 | FAIL | §inputsOutputs：精確 cents／milli、欄位依序、三輸出形狀和 JSON 固定。按分捨入可能偏離所求目標，契約只釘另一率由捨後價回算（MM-01）。 |
| `implementation` | 96 | PASS | §implementation：原生 ESM/Node 24 內建、純核心、固定程式 Blob Worker 世代、撤銷與安全 DOM/CSP。 |
| `acceptance` | 95 | PASS | §acceptance：九方面方法／證據與 ≥90 門檻俱列。§tests 有 320px、200% zoom、真兩語 Chrome/Edge、離線與 storage、預覽 noindex 和正式 canonical/hreflang，均待產品驗證。 |
| `tests` | 86 | FAIL | 32 核心+3 狀態完全相符，13 列對照值重算相符。§tests 的恆等式要求涵蓋毛利未定義的零售價；缺少四捨五入後不達目標的明確契約測例（MM-01/02）。 |
| `handoff` | 97 | PASS | §handoff：固定 source、PR、另 claim、tools/ 路徑、命令與重建、限制／放行分離。 |

產品九面向 **NOT_RUN**（無產品分數）：`functionality`、`boundaries`、`privacy`、`security`、`usability`、`accessibility`、`localization-seo`、`toolchain-provenance`、`compatibility`。

## 一級來源

- [University of Maine Cooperative Extension：Basic Pricing Strategies for Small Businesses](https://extension.umaine.edu/publications/3000e/)：Markup Formulas／Determine Selling Price 確認成本與售價兩種分母及反推售價；精確分值捨入與達標反例為本次獨立代入。

## 阻止放行的問題

### MM-01 — §goal『必須定的售價』、§userFlow 建議售價、§inputsOutputs 10–11

- 最小輸入：`{"mode":"solve-margin","cost":"0.01","price":null,"markupPercent":null,"marginPercent":"25"}`。
- 候選： 精確價 4/3 分，按規格最近分得 1 分；結果 marginPercentMilli=25000 是輸入目標，售價實際毛利率為 0%，而結果不回實際毛利率。solve-markup 同成本、目標 25% 也得 1 分、實際加價率 0%。
- 獨立預期： 若承諾達標，最低可用分位都是 2 分；若保留最近分估算，兩個求解模式應分開顯示輸入目標與依捨後售價回算的實際率，並說明是否低於目標。同步調整結果、下載與 FAQ，避免把輸入率當已達率。
- 修訂驗證： 新 head 補兩個 0.01/25% 的字面案例，對照相同售價 report 的實際率及結果文案。

### MM-02 — §userFlow 結果低於成本提示、§tests 全部 report 恆等式及 FAQ

- 最小輸入：`{"mode":"report","cost":"50.00","price":"0","markupPercent":null,"marginPercent":null}`。
- 候選： 字面回 belowCost=true、markupHundredths=-10000、marginHundredths=null。按現行文案同時說兩率為負、毛利率無法定義；而 tests 對全部成功報表要求毛利率 = markup/(1+markup)，此例分母為 0。
- 獨立預期： 對售價零僅聲明低於成本及毛利率未定義，不說毛利率為負；分式恆等式限售價正值，零值單獨驗 null。
- 修訂驗證： 重跑既有 report-free-price，核對兩語狀態與數學斷言。


## 非阻塞改善

- `solve-margin-high` 的目的和 §tests 將 99.9% 寫成售價百倍；固定字面輸出 1,000,000 分 ÷ 成本 1,000 分＝千倍，修正文句即可。
- 把『單位利潤』說成此工具的單件毛利（售價減輸入成本），避免和扣營運費用後的淨利混淆。

## 生產驗收繼承契約：FAIL（REG-01）

原製作規格 task 的八項是本次文件評分欄位，這是正確的文件 rubric。遠端 r1530 的 spec.acceptanceCriteria 也逐項填了相同八項：`goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff`。固定 SPEC §acceptance 宣告的是九項產品面向；兩組 ID 完全不同。 [核心 register-task](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/scripts/coordination-core.mjs#L287) 要求 production 原樣繼承 spec.acceptanceCriteria。目前未找到引用該 specId 的 production task。**不可標 ready 或照錯誤 rubric 開工**；由主統籌依合法維護流程修復並讀回。不改原 task 的八項、作者或 claim，也不影響上列 fixtures 結果。
