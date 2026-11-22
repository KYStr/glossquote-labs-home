> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：826a2e4f67c41beef03c46a658355c327fa4d696ab1aba859b352bba65e8e7de。

# 通膨計算機獨立文件審查

審查時間 2026-11-11T02:55:27Z。文件需退修。維持原 task、spec ID 與 owner，由修訂後的新 head 提供複驗。

- 任務 labs-inflation-calculator-spec-20261109，預案 spec-inflation-calculator-20261109。
- 固定候選 ecbe6325b65bdf3cffb56222e1016388b4984d7b。[SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/ecbe6325b65bdf3cffb56222e1016388b4984d7b/docs/specs/inflation-calculator/SPEC.md) · [PR #247](https://github.com/KYStr/glossquote-labs-home/pull/247)
- Reviewer local-codex:01a1c87c-f580-7382-b037-3b6d83eee0f7，未參與候選製作。Registry r1530，blob e01da965f28e5248ca13158094ca356254a25c2b。原 owner 與 claim 已讀回。固定來源查核（本地證據：../source-check.json）
- 文件評定 FAIL。審查時的遠端狀態為 task reviewing、spec draft。

## 八節評分

| 面向 | 完整度 | 分數 | 證據 |
| --- | --- | ---: | --- |
| goal | PASS | 96 | §goal 界定桌面跨年薪資、房租比較與手機估算購買力，成果包含名目與實質方向。 |
| scope | PASS | 94 | §scope 鎖定兩模式、使用者自填 CPI、無資料集與匯率。獨立讀相近複利與儲蓄目標的固定規格，確認其月存／帳戶模型與本案不同。 |
| userFlow | FAIL | 86 | §userFlow 定義雙草稿、按鈕、錯誤、取消、重設和下載生命週期。以實際主計總處兩份官方指數操作時，欄位和 FAQ 未提示共基期與年數前提（INFL-03）。 |
| inputsOutputs | FAIL | 67 | §inputsOutputs 定義 schema、欄位首錯及報告。合法通縮輸入的有限購買力在 round2 後變 Infinity，和 null 及輸出語義衝突（INFL-01）。 |
| implementation | FAIL | 76 | §implementation 的本地 ESM、快照、Worker 世代及 CSP 可實作。全環境一致的要求與 Math.pow 的近似語義同時存在，半分附近輸出可分歧（INFL-04）。 |
| acceptance | PASS | 95 | §acceptance 九項逐一固定 ID、證據及門檻。產品狀態仍 NOT_RUN，雙語和正式站 gate 的測法已定義。 |
| tests | FAIL | 78 | 24 核心加 3 controller 均與獨立推導一致。§tests 指定的捨入後嚴格遞增與符號性質有合法反例（INFL-02）。 |
| handoff | PASS | 97 | §handoff 固定四檔案、另取製作 claim、雙語候選、正式放行責任、原 owner 與重審新 head。 |

## 阻擋缺陷

### INFL-01 購買力在捨入階段溢位

- **重現與實際** `{mode:'rate',amount:'10000000',annualRatePercent:'-99.999',years:'60'}`。Node 24 的 factor 為 `1.0000000003930722e-300`，除法得到有限值 `9.999999996069277e306`，`round2` 乘 100 變成 `Infinity`。第 60 列和摘要為 `Infinity`，JSON 序列化後卻為 null。
- **預期與複驗** 固定 overflow-safe 的捨入或明確的範圍處理。用本例斷言摘要、末列、畫面及報告一致，並覆核既有年數 200 的下溢 null。
- **影響** 一般成功結果可能含非有限值，畫面與下載會呈現不同含義。

### INFL-02 規格要求兩個不成立的捨入性質

- **重現與實際** `amount:'1', years:'1'`，依次輸入年率 `'0.001'` 與 `'0.002'`。兩個 `futureValue` 都是 `1`，兩個 `cumulativePercent` 都是 `0`，未捨入的因子均大於 1。
- **預期與複驗** 把捨入後的名目值定為非遞減，並允許非零的原始累計變化捨入為 0。若保留嚴格遞增或符號等式，明確限於相應的未捨入值與正金額、正年數，補本反例。
- **影響** 照文件實作會無法通過照文件寫的性質測試。

### INFL-03 CPI 欄位缺比較基準與期間前提

- **重現與實際** 主計總處範例，民國 99 年的 `105.48` 與 103 年的 `103.97` 各自以不同年份為基期。直接輸入得到 `−1.43%`；同基期 `98.60 → 103.97` 為 `+5.45%`。另 `cpi-deflation` 的標籤 2020→2021 與年數 5 同時成立於 schema，程式算 `−1.0275%`，用 1 年才是 `−5.0332%`。
- **預期與複驗** 繁中與英文 CPI 欄位旁說明同系列、同基期及一致的觀察口徑，說明年數由使用者按所選期別填寫、標籤只作顯示。修正矛盾的 fixture 期別或年數，並用主計總處例子複驗說明及結果。
- **影響** 官方數字若混用基期，跨年薪資或房租試算連變化方向都可能反轉。 [主計總處 CPI 換基問答](https://ws.dgbas.gov.tw/Download.ashx?icon=.pdf&n=ODI2MTYzNDU2SDFBM0ZCSE0ucGRm&u=LzAwMS9VcGxvYWQvNDYzL3JlbGZpbGUvMTEwMjQvMTAzMDk2L2U2ZGIzZTZhLWFmMzktNDhhNS1iYzUxLTI2ZjM1YmUwM2Q5Ny5wZGY%3D)、[BLS CPI 百分比計算](https://www.bls.gov/cpi/factsheets/calculating-percent-changes.htm)

### INFL-04 跨引擎精確一致與 Math.pow 規格衝突

- **重現與實際** `amount:'0.02', annualRatePercent:'50', years:'2'` 的因子 2.25 與相鄰較小的 binary64 `2.2499999999999996` 分別產生 `0.05` 與 `0.04`。此為一個 ULP 的敏感度探針，未執行替代瀏覽器。ECMAScript 允許一般指數運算為近似值。
- **預期與複驗** 明定可跨環境重現的運算，或為支援的數值與引擎界定可檢驗的差異政策。加入半分邊界，令產品相容性和確定性契約一致。
- **影響** 現有 fixture 迴避半分邊界，無法證明承諾的全域確定性。 [ECMAScript Number::exponentiate](https://tc39.es/ecma262/#sec-numeric-types-number-exponentiate)

## 製作驗收繼承

- **REG-01 實際** 原規格製作 task 的八節 criteria 與文件審查一致。登記冊的 spec.acceptanceCriteria 也填入 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。
- **預期** 製作 task 依協作規則繼承 spec.acceptanceCriteria，該欄位須保存 SPEC 的九個產品面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility。目前九項皆未繼承。
- **處置** 由主統籌依合法修訂流程處理同一 spec ID，重讀登記及候選後才可標記 ready。

## 非阻擋事項

- §scope 複利參照在首頁基線 commit `26525d5…` 回 404。已從 r1530 `spec-compound-interest-calculator-v1` 找到可讀固定版本，修訂時更新連結。

## 字面案例與檢查

命令 `node .runs/five-hour-2026-11-11/dispatch/spec-review-04/review/inflation-calculator/verify.mjs` 在 v24.14.0 離線執行，exit 0，逐案 27/27 相符。三組 controller 為文件狀態模型，完整輸入、獨立輸出與額外探針均已保存。重算腳本（本地證據：verify.mjs） · 逐案證據（本地證據：fixture-results.json） · 命令輸出（本地證據：fixture-run.log）

產品九面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility 均為 NOT_RUN，分數為 null。瀏覽器、畫面、下載、正式 HTTPS／SEO 與部署為產品階段的檢查。

## 來源

- 比對官方換基範例中的原值、同基期值與變動率。 [主計總處 CPI 換基問答](https://ws.dgbas.gov.tw/Download.ashx?icon=.pdf&n=ODI2MTYzNDU2SDFBM0ZCSE0ucGRm&u=LzAwMS9VcGxvYWQvNDYzL3JlbGZpbGUvMTEwMjQvMTAzMDk2L2U2ZGIzZTZhLWFmMzktNDhhNS1iYzUxLTI2ZjM1YmUwM2Q5Ny5wZGY%3D)
- 核對 CPI 變動公式、相同參考基期及整年期間口徑。 [BLS CPI 百分比計算](https://www.bls.gov/cpi/factsheets/calculating-percent-changes.htm)
- 核對 `Math.pow` 所委派指數運算的近似語義。 [ECMAScript Number::exponentiate](https://tc39.es/ecma262/#sec-numeric-types-number-exponentiate)
- 查 §1–2，逐月累積與反求存款，排除物價調整。 [複利工具固定規格](https://github.com/KYStr/glossquote-labs-home/blob/5a9acc11b5b23200c3d4cda32adaafbbd389532e/docs/specs/compound-interest-calculator/SPEC.md)
- 查 goal/scope，求每月存款或達標月數。 [儲蓄目標固定規格](https://github.com/KYStr/glossquote-labs-home/blob/9828c5d10ff75720333491cfc21f190b7cd7ed16/docs/specs/savings-goal-calculator/SPEC.md)
