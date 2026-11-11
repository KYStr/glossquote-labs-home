# 股票損益計算：固定預案獨立審查

- 任務：`labs-stock-profit-calculator-spec-20261109` / `spec-stock-profit-calculator-20261109`
- [PR #244](https://github.com/KYStr/glossquote-labs-home/pull/244)：open / draft；head `5849c1ff1a6403e9261de07e0c4e7d506935629e`；registry r1530 blob `e01da965f28e5248ca13158094ca356254a25c2b` 的 submission 相符。
- 審查者：`local-codex:01a1c87c-f22f-76f1-9e00-dcb0b0b55486`。本人未參與候選製作；與原作者、owner 及 contributors 核對。原 claim：`muse-r4-stock-profit-calcu-claim-20261109T152701Z-f51ac`；owner `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory` 保留。
- 完成時間：`2026-11-11T02:59:13Z`。文件結論：**FAIL / revision**；修訂後重審；不要標記 ready。 Registry 寫入等待串行時段。

Windows 背景離線獨立驗算；controller 是規格狀態模型。候選只含文件；產品程式、Chrome/Edge、真下載、Network/Storage、正式 SEO 或部署均未執行。

## 固定來源與驗算

| 檔案 | Git blob | bytes |
| --- | --- | ---: |
| [BRIEF.md](https://github.com/KYStr/glossquote-labs-home/blob/5849c1ff1a6403e9261de07e0c4e7d506935629e/docs/specs/stock-profit-calculator/BRIEF.md) | `2a0c254006c90db8f8e7aca7b02eef909c5d8c4e` | 1383 |
| [SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/5849c1ff1a6403e9261de07e0c4e7d506935629e/docs/specs/stock-profit-calculator/SPEC.md) | `e0bf680d283fdb3cb4eb184dbe26940c3e4a7b3c` | 24951 |
| [fixtures.json](https://github.com/KYStr/glossquote-labs-home/blob/5849c1ff1a6403e9261de07e0c4e7d506935629e/docs/specs/stock-profit-calculator/fixtures.json) | `e790c0757780c2da7f920acc92700e69309fc71f` | 17698 |
| [AUTHOR-CHECK.md](https://github.com/KYStr/glossquote-labs-home/blob/5849c1ff1a6403e9261de07e0c4e7d506935629e/docs/specs/stock-profit-calculator/AUTHOR-CHECK.md) | `070b5fa4f9efefca010fa1b8747475f62ce47d99` | 5085 |

本地檔案的 Git blob SHA 與遠端固定檔案逐一相符；SHA-256 詳見 [review.json](review.json)。作者核對已讀，未當作獨立驗證。

`python -B -X utf8 verify.py <fixed-candidate>/docs/specs/stock-profit-calculator/fixtures.json`：exit **0**，**16/16** 個字面案例符合。 [獨立驗算](verify.py) / [全部字面 input、fixture expected、獨立結果、額外反例](fixture-output.json)。

## 八個文件面向

| 面向 | 分數 | 完整 | 依據 |
| --- | ---: | --- | --- |
| `goal` | 96 | PASS | §goal：台股單次費稅、淨損益與保本價；桌面核對券商、手機盤中估算，無帳戶／投資建議。 |
| `scope` | 84 | FAIL | §scope：單次及部分賣出，和既有多筆 FIFO 平均成本有可辨別價值；但聲稱法定現股當沖而未排除零股，保本價的報價跳動限制未定（ST-01/02）。 |
| `userFlow` | 84 | FAIL | §userFlow：預設、模式、dirty、取消、reset、離頁和雙語揭露可行；開關對不合資格交易仍給減半率，盤中主結果未區別模型價與可委託價（ST-01/02）。 |
| `inputsOutputs` | 82 | FAIL | §inputsOutputs：欄位語法／首錯和費稅／分攤公式明確；缺當沖 eligibility 及精確分值跨 Worker/JSON 的型別契約（ST-01/04）。 |
| `implementation` | 85 | FAIL | §implementation 的純核心、固定 Blob Worker、世代與 CSP 可用；合法上限需要全域最小保本價的有界算法，鄰點不是充分證據（ST-03），精確分值不可轉 Number（ST-04）。 |
| `acceptance` | 95 | PASS | 九必要面向固定，方法包括真兩語 Chrome/Edge、隔離、0 network/storage、320px、200% zoom、預覽 noindex／正式站另核。產品未跑。 |
| `tests` | 85 | FAIL | 13 核心+3 controller 全數符合字面值，但未驗零股 day、合法報價 tick、重複穿越保本線和有效金額上限的分值（ST-01 至 04）。 |
| `handoff` | 96 | PASS | 工具目標、原 owner、另 claim、離線命令與真實隔離驗收、版本／部署分開及停止條件均有列。 |

產品九面向 **NOT_RUN**（無產品分數）：`functionality`、`boundaries`、`privacy`、`security`、`usability`、`accessibility`、`localization-seo`、`toolchain-provenance`、`compatibility`。

## 一級來源

- [證券交易稅條例第 2、2-2 條](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340078)：股票賣出 3‰；合格現股當日沖銷賣出 1.5‰ 至 2027-12-31，須按交易所適用規定。
- [證交所：當日沖銷交易專區](https://www.twse.com.tw/zh/products/system/day-trading.html)：相同數量部分可互抵，須合格交易時段與標的；明文排除零股。
- [證交所營業細則第 62 條](https://twse-regulation.twse.com.tw/TW/law/DOC01_print.aspx?FLCODE=FL007304&FLNO=62)：一般股票在 NT$100 至未滿 500 的申報升降單位為 NT$0.50。
- [證交所營業細則第 94 條](https://twse-regulation.twse.com.tw/TW/law/DOC01.aspx?FLCODE=fl007304&FLNO=94)：券商自訂並備查費率、折讓與每筆最低費；高於 0.1425% 有通知義務，不是統一強制費率或上限。
- [元大證券：台股現股手續費說明](https://www.yuanta.com.tw/eYuanta/securiti/Node/Index?C1=2021102007380647&C2=2021102008672547&ID=2021102008672547&Level=2&MainId=00415)：券商自身費率與一般每筆最低 20 元、特定零股最低 1 元的公開例子；不得外推所有券商。

## 阻止放行的問題

### ST-01 — §scope 及 §inputsOutputs 第 2 步現股當沖，§userFlow 模式

- 最小輸入：`{"buyPrice":"100","buyQty":"100","buyUnit":"share","sellPrice":"110","sellQty":"100","sellUnit":"share","feeRatePct":"0.1425","feeDiscount":"1","minFeeTwd":"20","taxMode":"day","taxRatePct":"0.3"}`。
- 候選： day 無條件套 0.15%，算賣稅 17 元，即使這是 100 股零股。
- 獨立預期： 證交所規定零股不適用現股當沖。當沖模式應只套到使用者確認具資格的現股沖銷部分；零股 day 不得當作法定減半，明示錯誤或要求改 standard，此筆以 0.3% 模型為 33 元。單位 share 也可輸入 1000 股，不能用單位字串單獨判定。明示資格與期限，對不明資格保留試算限制。
- 修訂驗證： 新增零股 day、同 100 股 standard、1000 股以 share/lot 表示與合格的部分沖銷字面案例，核對兩語資格提示。

### ST-02 — §goal 下單前用途及 §inputsOutputs 第 5 步 breakevenPrice

- 最小輸入：`{"fixture":"round-lot-profit","buyPrice":"100","buyQty":"1000","sellPrice":"110","sellQty":"1000"}`。
- 候選： 模型每分掃描得 100.59，現有 UI 只標為『損益兩平賣出價』。
- 獨立預期： 一般股票在 100–未滿 500 的報價跳動為 0.50；100.59 不是可委託價。同一費用模型下 100.50 淨額 100055.00 < 成本 100143.00，101.00 淨額 100553.00 ≥ 成本。可保留每分理論值，但須在結果及報告標明不可直接用來下單；若新增可委託價，釘明 tick 及適用市場。
- 修訂驗證： 保留 100.59 算術結果作理論門檻，新增 100.50／101.00 的驗算與兩語標籤契約；明示規格輸入上限之外的理論價。

### ST-03 — §inputsOutputs 第 5 步最小值、§implementation、§tests 鄰點條件

- 最小輸入：`{"buyPrice":"49","buyQty":"1","buyUnit":"share","sellPrice":"51","sellQty":"1","sellUnit":"share","feeRatePct":"1","feeDiscount":"1","minFeeTwd":"0","taxMode":"standard","taxRatePct":"1"}`。
- 候選： 成本 49 元。P=49.00 與 P=51.00 均符合『P 達標、P−0.01 不達標』，因 P=50.00 時兩筆費用同時跳 1 元、淨額從 49.99 降至 48.00；鄰點無法證明全域最小。直接逐分遍歷在合法極值需要超過一億次。
- 獨立預期： 答案是 49.00，證明全域最小且明定負載上限。可用未捨入淨額 L(G)=min((1−a−b)G,(1−b)G−minFee)，實際淨額距 L 不超過 1 元；反解成本 ±1 再升序掃描，所有合法輸入最多 206 個候選分位。此方法已用獨立腳本重算全部字面保本價。
- 修訂驗證： 新增非單調雙穿越與極值，驗第一次交叉、搜尋上限和對應成本；不能只驗相鄰分位。

### ST-04 — §inputsOutputs 2 位金額、結果與序列化；§implementation core/Worker/DOM

- 最小輸入：`{"buyPrice":"999999.99","buyQty":"999999","buyUnit":"lot","sellPrice":"999999.99","sellQty":"999998","sellUnit":"lot","feeRatePct":"0.1425","feeDiscount":"1","minFeeTwd":"20","taxMode":"standard","taxRatePct":"0.3"}`。
- 候選： 固定字面結果的金額用 JSON numbers；精確成本分攤按分應為 1001422987135770.01，若核心輸出 binary64 Number 再格式化只能得到 1001422987135770.00。
- 獨立預期： 釘定能從純核心、Worker、UI 到匯出保存精確分值的表示法，如分值或定點字串；若匯出仍承諾數字 token，從精確值序列化並說明 JS Number 讀取精度限制。也可另訂仍涵蓋目標用途的安全上限。
- 修訂驗證： 在新候選以此合法上限案例核對精確 UI 與下載字面 bytes，並釘清金額型別。


## 非阻塞改善

- 把同 repo 固定 `stock-average-cost`（多筆 FIFO，無證交稅或可委託保本門檻）加到 scope 的實際相近工具比對。
- 將 0.1425% 明確稱為自訂費率的通知門檻／示例預設，不暗示它是法定費率。

## 生產驗收繼承契約：FAIL（REG-01）

原製作規格 task 的八項是本次文件評分欄位，這是正確的文件 rubric。遠端 r1530 的 spec.acceptanceCriteria 也逐項填了相同八項：`goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff`。固定 SPEC §acceptance 宣告的是九項產品面向；兩組 ID 完全不同。 [核心 register-task](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/scripts/coordination-core.mjs#L287) 要求 production 原樣繼承 spec.acceptanceCriteria。目前未找到引用該 specId 的 production task。**不可標 ready 或照錯誤 rubric 開工**；由主統籌依合法維護流程修復並讀回。不改原 task 的八項、作者或 claim，也不影響上列 fixtures 結果。
