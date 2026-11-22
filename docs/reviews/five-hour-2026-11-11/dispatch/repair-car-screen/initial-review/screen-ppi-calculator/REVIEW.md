> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：dc20fe14b6f8dce9ab32c2aad4d4988b67b0f80ee79c4e666df9ca0cae91e5ad。

# 螢幕 PPI 計算獨立文件審查

審查時間 2026-11-11T03:15:52Z。文件需退修。維持原 task、spec ID 與 owner，由修訂後的新 head 提供複驗。

- 任務 labs-screen-ppi-calculator-spec-20261109，預案 spec-screen-ppi-calculator-20261109。
- 固定候選 c8c11e12d1ee9cc684956fc0103a088cc2a0984a。[SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/c8c11e12d1ee9cc684956fc0103a088cc2a0984a/docs/specs/screen-ppi-calculator/SPEC.md) · [PR #252](https://github.com/KYStr/glossquote-labs-home/pull/252)
- Reviewer local-codex:01a1c87c-f580-7382-b037-3b6d83eee0f7，未參與候選製作。Registry r1530，blob e01da965f28e5248ca13158094ca356254a25c2b。原 owner 與 claim 已讀回。固定來源查核（本地證據：../source-check.json）
- 文件評定 FAIL。審查時的遠端狀態為 task reviewing、spec draft。

## 八節評分

| 面向 | 完整度 | 分數 | 證據 |
| --- | --- | ---: | --- |
| goal | PASS | 97 | §goal 說明桌面逐一比較原廠表格、手機以可視對角線與原生解析度換算。輸出密度、面板尺寸及點距可帶走。 |
| scope | PASS | 97 | §scope 鎖定三入、無缺邊求解、無著名比例對照、排除非方形與子像素修正。獨立讀比例與沖印兩份固定規格，使用情境及產出有別。 |
| userFlow | PASS | 96 | §userFlow 首屏輸入、獨立下載、可視比例標籤、錯誤首欄、重設及取消均有固定行為。 |
| inputsOutputs | FAIL | 83 | §inputsOutputs 有可重算公式、精度、欄位首錯和固定報告。`6.10` 的結果段反例與前段 ASCII 文法衝突（PPI-02）。 |
| implementation | PASS | 96 | §implementation 原生 ESM、固定 Worker、世代取消、禁用儲存與連線及兩語可在瀏覽器實作。運算只含三數、平方根及 gcd。 |
| acceptance | PASS | 95 | §acceptance 九項必要產品面向對應數值、各上限、兩語、重建、隔離互動、無工作連線及可及性。產品均 NOT_RUN。 |
| tests | FAIL | 74 | 18 核心與 3 controller 逐值相符，成功數值另用精確整數界線核對。§tests 指定勾稽式比較不同量綱，24 吋 FHD 即可反證（PPI-01）。 |
| handoff | PASS | 97 | §handoff 固定四檔與開啟 PR，列出製作另領 claim、階段順序、命令、失敗重審及外部驗收責任。 |

## 阻擋缺陷

### PPI-01 驗收勾稽式把對角線英寸當成 PPI

- **重現與實際** `{diagonalIn:'24',widthPx:'1920',heightPx:'1080'}`。未捨入寬 `53.1312447431 cm`、高 `29.8863251680 cm`。依 §tests 算 `sqrt(widthCm²+heightCm²)/2.54` 恰為 `24`，實際 `ppiRaw=91.7877987534`。
- **預期與複驗** 前式應與輸入對角線 `d` 在指定容差內一致。PPI 另以 `sqrt(widthPx²+heightPx²)/d` 或 `widthPx/(widthCm/2.54)` 交叉核對，本例為 `91.7877987534`。補帶單位的規格與測試。
- **影響** 正確實作仍會敗在文件要求的性質測試。

### PPI-02 兩位小數尾零的合法性矛盾

- **重現與實際** `{diagonalIn:'6.10',widthPx:'1179',heightPx:'2556'}`。文法允許小數部 1–2 位，輸入長度與值域都合格，獨立重算成功，`diagonalIn=6.1`、`ppi=461.4`。結果段卻寫 `6.10` 不合文法。
- **預期與複驗** 按既有文法讓 `6.10` 和 `6.1` 得同一數值結果，或把尾零拒絕規則明寫在驗證契約並配一致的錯誤案。補兩個字面輸入及結果。
- **影響** 同一份規格讓實作者可能產生接受或拒絕兩種行為，影響匯出與兩語可重現性。

## 製作驗收繼承

- **REG-01 實際** 原規格製作 task 的八節 criteria 與文件審查一致。登記冊的 spec.acceptanceCriteria 也填入 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。
- **預期** 製作 task 依協作規則繼承 spec.acceptanceCriteria，該欄位須保存 SPEC 的九個產品面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility。目前九項皆未繼承。
- **處置** 由主統籌依合法修訂流程處理同一 spec ID，重讀登記及候選後才可標記 ready。

## 非阻擋事項

- 半分探針 `1000×1005` 的 1.005 MP，釘版 binary64 公式得 1.00，精確十進半進位得 1.01。現行規則明定 binary64，建議把該邊界結果放進例子，避免日後兩種捨入被混用。
- 「點距」可在主要欄位註明按方形像素及未捨入 PPI 推導。合法 `200″`、`1×1` 會顯示 `0.0 PPI`，點距仍由正的原值計算。
- 將 16384 上限說成計算契約即可。規格的「現行最高解析度」無需成為持續更新的宣告。

## 字面案例與檢查

命令 `node .runs/five-hour-2026-11-11/dispatch/spec-review-04/review/screen-ppi-calculator/verify.mjs` 在 v24.14.0 離線執行，exit 0，逐案 21/21 相符。三組 controller 為文件狀態模型，完整輸入、獨立輸出與額外探針均已保存。重算腳本（本地證據：verify.mjs） · 逐案證據（本地證據：fixture-results.json） · 命令輸出（本地證據：fixture-run.log）

產品九面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility 均為 NOT_RUN，分數為 null。瀏覽器、畫面、下載、正式 HTTPS／SEO 與部署為產品階段的檢查。

## 來源

- 實讀 1 in 精確為 25.4 mm，等於 2.54 cm。 [NIST SI Units – Length](https://www.nist.gov/pml/owm/si-units-length)
- 原廠以 27 吋、2560×1440、109 PPI（整數）與 0.2331 mm 分列。規格樣例以同數字推導 108.8 PPI、0.233 mm，與原廠呈現精度可互相核對。 [Dell S2722DC 原廠技術規格](https://www.dell.com/en-us/shop/dell-27-usb-c-monitor-s2722dc/apd/210-bbqs/monitors-monitor-accessories)
- 讀現行草案的 Number 平方根步驟。這次以 Node 24 實算及整數界線核對固定樣例。 [ECMAScript Math.sqrt](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.sqrt)
- 有比例輸入、求缺邊、預設與近似提示，沒有面板密度。 [長寬比固定規格](https://github.com/KYStr/glossquote-labs-home/blob/617030612c3525b3d78db008b4d5e700331d66dc/docs/specs/aspect-ratio-calculator/SPEC.md)
- 有紙尺寸與 DPI 判定，沒有可視對角線、面板尺寸或點距。 [照片沖印固定規格](https://github.com/KYStr/glossquote-labs-home/blob/58edaa0d845256b1eb4cb772d8f7d7d80811e4d8/docs/specs/photo-print-size-calculator/SPEC.md)
