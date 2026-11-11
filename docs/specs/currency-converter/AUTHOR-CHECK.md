# 匯率換算 — 作者檢查

原作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，run 5 補庫概念 #35。原作者的自查與固定四檔保留於 [PR #258 的原候選](https://github.com/KYStr/glossquote-labs-home/tree/dcb21d0903006a708584edba8713e6117f8138a6/docs/specs/currency-converter)。

## 2026-11-11 維護者查核

維護任務 `labs-five-hour-repair-currency-20261111`，維護者 `local-codex:01a1c8a3-97f3-7ef1-a9c6-c33ad79facfd`。依 [固定派工簡報](https://github.com/KYStr/glossquote-labs-home/blob/418aee70f60a04cbe19e339597c91a056bcad0c4/docs/reviews/five-hour-2026-11-11/dispatch/repair-currency/TASK.md) 處理 CUR-01、CUR-02。下方的歷史自查由原作者撰寫，維護章節由本次維護者撰寫，正式獨評待非作者執行。

- **CUR-01**。初載、Reset 與 bfcache 恢復改為空匯率。只有「載入範例 / Load example」會帶入合成的 31.5。成功結果和 JSON 報告沿用該次快照的來源。匯率編輯會撤銷舊產物，手填 31.5 也切換為 `manual`。清空為 `null`。核心維持五欄輸入與八欄成功結果，controller 負責來源與報告。
- **CUR-02**。`reverse-display-rounding-regression` 的匯率 3、金額 30000，反向精確計算為 30000 ÷ 3 × 100＝1000000 分，顯示逆率為 0.333333。若以顯示值回乘，30000 × 0.333333 × 100＝999999 分。對照表仍依正向匯率逐列計算為 300、3000、30000、300000 分。原循環小數案例的 317 分不變，該案不能區分精確除法與顯示逆率回乘。
- **既有預期差異**。原 21 個核心案例的輸入及結果均維持原值。`state-cancel-late` 的 `afterReset.draft.rate` 由 `"31.5"` 改為 `""`，來源為 `null`，因重設要求重新輸入。原三個狀態案例的非空匯率均以手填設定，checkpoint 補上表單與結果的來源欄位，其他既有狀態預期維持原值。
- **新增狀態案例**。`state-rate-source` 覆蓋初載、兩次空匯率提交、範例成功、編輯其他欄位保留來源、手填同值、清空、重設，以及晚到範例結果無法覆蓋手填結果或空白畫面。22 個核心案例、4 個狀態案例的 29 個 checkpoint 以獨立有理數及狀態模型驗算。
- **報告契約差異**。同一 31.5 數值的舊報告為 340 bytes，SHA-256 為 `bfa30bc8083bcd1e072745e3c0182823da2fa6bc7627f3ac9a14cd9e1e742547`。增加 `rateSource` 後，手填報告為 362 bytes，SHA-256 為 `68b59c99e99674e21404d391193eb8a28e29ebadd7fe53bbba4bb8c7e881e9e9`。合成範例報告為 363 bytes，SHA-256 為 `6f20c87037f7321021a981ad1130ae348beb46c9fb49cb0ef910c4a87cea1b51`。兩者的八個核心結果欄位相同。
- **本次交驗範圍**。三項維護面向為 `spec-corrections`、`exact-fixtures`、`provenance-and-scope`。八節獨評、登記修正 REG-01 及產品九面向仍待各自的流程。產品交驗、Chrome／Edge、正式 HTTPS／SEO、Network／Storage、原生對話及部署為 NOT_RUN。

## 原作者歷史自查（固定 v1）

以下保留 v1 自查的歷史記錄。匯率來源、reset、反向案例鑑別與現行報告，以本維護章節及 [SPEC.md](SPEC.md) 為準。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- §6 已預宣告九個產品面向與必要證據；本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。
- 差異比對（設計層級）：舊作 unit-converter 五類皆物理單位（長度、面積、質量、容量、溫度）、單位集合固定、無幣別與匯率概念；markup-margin 不綁幣別、無匯率；tax-included 是單一幣別內含稅換算；cooking-measurement 是體積↔重量密度表。registry 層級的查重由統籌在登記時核實，本人未執行 registry 指令。
- 核心釘版決定與理由：
  1. **匯率只能由使用者輸入**：不連線、不內建、不預填任何匯率；免責聲明逐字雙語、常駐輸入區與結果旁。implementation 明訂任何匯率服務請求是功能違規（不只是隱私問題），acceptance 的 privacy 面向據此核對零請求。
  2. **方向慣例寫進標籤**：rate ＝ 每 1 單位來源幣別可換得的目標幣別數量，逐字出現在欄位標籤與方向句，避免「31.5 到底是乘還是除」的經典歧義。
  3. **代碼不對照 ISO 4217 驗證**：只驗形狀（恰 3 個 ASCII 字母、正規化大寫）。清單會增刪改碼，用過期清單驗證會誤拒合法代碼；工具對代碼不賦予語義，同碼兩邊亦合法（`same-codes` 釘版）。
  4. **反向匯率用 6 位有效數字，不是小數 6 位**：概念 #35 只說「釘版精度」；小數位規則在 rate 0.0066（反向 151.515…）與 rate 1000000（反向 0.000001）兩端都會失真或歸零，有效數字規則兩端皆成立，算法以整數／有理數比較定 p、roundHalfUp 定 m、溢出改記並進位，全部釘版並以 `small-rate-inverse`、`rate-cap-boundary`、`min-rate-tie` 三案覆蓋。
  5. **反向換算永遠精確除以輸入匯率**，不用顯示用的已捨入反向匯率回算（`reverse-repeating` 釘版：100 ÷ 31.5 的精確商捨入為 317 分）。
  6. **對照表固定階梯 [1, 10, 100, 1000]**（概念 #35 的 denomination steps 具體化），每列由精確乘積獨立捨入、不由鄰列倍增（`small-rate-inverse` 中 1 單位列 1 分、10 單位列 7 分，不互為 10 倍）。
  7. **金額上限 9,999,999.99 與匯率上限 1,000,000 的搭配**使所有結果整數 < 2^53：convertedCents 最大為 999,999,999 × 1,000,000 ＝ 999,999,999,000,000（正向）或 999,999,999 × 10^6 ÷ 1（反向、rateMicro＝1），皆為精確安全整數；中間乘積走 BigInt。
- 本案無外部匯率或法規來源可依（設計上即不取即時資料）；ISO 4217 僅作為「不採用」的比對對象並已述明理由。概念說明（brief #35）與本規格無衝突；兩處具體化（對照表由 optional 改為固定四列常駐、反向精度定為 6 位有效數字）已記於上。

### Fixture 雙重推導（v1 手算＋獨立重算）

每個計算案例先以手算依 SPEC 規則推出，再以兩支獨立腳本重算：Python `fractions.Fraction` 精確有理數實作（含完整驗證順序）對 fixtures.json 全部 21 個核心案例逐一深度相等（21/21）；Node.js BigInt 整數實作對 11 個成功案例的 convertedCents／inverseRate／quickTable 逐值一致（11/11）；3 個 controller 案例的 draft／edit／lateResult 與 `default-forward` 的 input／result 逐字對應亦經腳本核對。手算如下（金額單位：分；micro 為匯率×10^6）。

| 案例 | 手算 |
| --- | --- |
| `default-forward` | micro＝31,500,000；10000×31,500,000÷10^6＝315,000。反向 1÷31.5＝0.0317460317… → 6 位有效數字 0.031746。表：3150／31,500／315,000／3,150,000。 |
| `reverse-exact` | 315,000×10^6÷31,500,000＝10,000（恰整除）。反向與表同上。 |
| `reverse-repeating` | 10,000×10^6÷31,500,000＝317.4603…，餘數×2＜除數 → 317。 |
| `small-rate-inverse` | micro＝6,600；100,000×6,600÷10^6＝660。反向 10^6÷6,600＝151.5151… → 151.515。表：0.66→1；6.6→7；66；660（每列獨立捨入）。 |
| `half-up-tie` | 1×2,500,000÷10^6＝2.5，恰半進位 → 3（銀行家捨入為 2，分歧點）。反向 0.4。 |
| `lowercase-codes` | usd／twd 正規化 USD／TWD，數字與 `default-forward` 全同。 |
| `zero-amount` | 0×31,500,000÷10^6＝0；反向與表同 `default-forward`。 |
| `yen-rate` | micro＝149,850,000；25,075×149,850,000＝3,757,488,750,000，÷10^6＝3,757,488.75 → 3,757,489。反向 1÷149.85＝0.0066733400… → 0.00667334。 |
| `min-rate-tie` | micro＝1；500,000×1÷10^6＝0.5，恰半進位 → 1。表各列 ≤0.1 分 → 全 0。反向 10^6÷1＝1000000。 |
| `rate-cap-boundary` | micro＝10^12（恰上限）；1×10^12÷10^6＝1,000,000。反向 10^6÷10^12＝0.000001。表：10^8／10^9／10^10／10^11。 |
| `same-codes` | micro＝1,000,000；5,000×10^6÷10^6＝5,000。反向 1。表恆等。 |

錯誤案例逐筆以手算核對釘版驗證順序：`rate-zero`（"0" 文法通過、micro＝0＜1 → RANGE/rate）；`rate-too-precise`（小數 7 位＞6 → DECIMAL_FORMAT/rate）；`rate-over-cap`（"1000000.000001" 為 14 單元恰在容量內、文法通過、micro＝1,000,000,000,001＞10^12 → RANGE/rate）；`amount-format`（"10.005" 小數 3 位＞2 → DECIMAL_FORMAT/amount）；`amount-over-limit`（13 單元＞12 → INPUT_LIMIT/amount，先於文法）；`amount-over-range`（"99999999.99" 為 11 單元在容量內、文法通過、9,999,999,999 分＞999,999,999 → RANGE/amount）；`code-format`（"USDT" 4 字母在 8 單元容量內 → CODE_FORMAT/fromCode）；`code-empty`（"" 容量與 surrogate 先過 → EMPTY/toCode）；`direction-enum`（"both" → ENUM/direction）；`schema-extra-field`（多出鍵 live → SCHEMA，field=null，先於逐欄）。三個 controller 案例沿用 `default-forward` 的 input/result 逐字對應，狀態轉移與預設值已逐項核對。

作者過程記錄（誠實揭露）：fixtures 初稿中 `lowercase-codes` 的對照表末列手寫值曾誤植 315,000（應為 3,150,000），於腳本驗證前目視複核時發現並修正；其後兩支腳本全數通過。Python 驗證器初版曾把 `rate-over-cap` 誤報 INPUT_LIMIT，原因是驗證器自身的 UTF-16 長度計算計入了 Python 編碼的 BOM；修正驗證器（改用 utf-16-le）後重跑 21/21，fixture 本身無誤。兩處皆為工具／初稿側問題，未更動任何釘版規則。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN。未固定候選或未獨評前不計 ready。
