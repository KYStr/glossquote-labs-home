# 儲蓄目標計算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（Run 5 規格撰寫）。作者文件核對，待非作者 readiness；本文不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

## 不重複比對

- 已讀 compound-interest-calculator 的 BRIEF 與 SPEC 原文。該規格確實含目標模式（months-to-target、required contribution），但其答案是對「逐月把利息進位到分」的模擬做執行期搜尋／二元搜尋，產品主體是正向成長模擬＋每月明細表＋有效年利率＋CSV。本規格依 Run 5 概念 #23 定位為專用反向求解器：不模擬、不出明細表，兩答案皆由閉式年金公式以精確有理數算出。模型差異造成的幾分錢歧異已在 SPEC scope 與 FAQ 明示揭露，不宣稱兩者一致；若獨評認為重疊過高，應退回本規格而非默默改名。
- mortgage 類規格為負債攤還（資產側相反）；分帳／單價類無時間維度。`docs/specs/` 無其他 savings-goal 規格。

## Fixture 推導（雙方法）

方法一（主推導）：依 SPEC 釘版規則以 Python `fractions.Fraction` 精確有理數實作（金額整數分、i = bp/120000、q^n 精確冪、進位／halfUp 以整數算術執行），產出全部 14 個成功／狀態案例。
方法二（獨立複核）：另寫 Decimal 60 位逐月模擬 B ← B×(1+i) + PMT（不做任何中間捨入），逐案斷言：模式 A 以顯示月存代入期末餘額 ≥ 目標、月存減 0.01 後 < 目標（進位最小性）；模式 B B(k−1) < 目標 ≤ B(k)（首次跨越）；零利率案與整數加法一致。兩方法 14/14 全數一致，斷言全過。

手算錨點（紙筆可複核）：

- `payment-basic-zero-rate`：(100000 − 10000) ÷ 12 = 90000 ÷ 12 = 7500 整除。
- `payment-zero-rate-ceiling`：1000 ÷ 3 = 333.333…，進位到分 333.34，333.34 × 3 = 1000.02。
- `payment-one-month-timing`：PMT = FV × i ÷ (q − 1)，而 q − 1 = i，故 PMT = FV = 1000.00；若為月初存款答案會是 1000 ÷ 1.01 = 990.10，本案專門鑑別存入時點釘版。
- `months-exact-zero-rate`：(12000 − 2000) ÷ 500 = 20 恰整數，進位不得變 21。
- `months-ceiling-boundary`：333 × 30 = 9990 < 10000（恰差 10），333 × 31 = 10323，k = 31，尾款 10.00。
- `months-growth-only-crossing`：1.01^9 = 1.0936852727 → 10936.85 < 11000；1.01^10 = 1.1046221254 → 11046.22 ≥ 11000；k = 10；尾款精確值 11000 − 10936.8527 × 1.01 < 0，截為 0.00。
- `months-unreachable-horizon`：(100000 − 0) ÷ 1 = 100000 個月 > 1200，精確整數判定。

關鍵精確值（方法一原始分數的小數展開，供獨評抽查）：

- `payment-with-interest`：PMT* = 7245.978673… → 進位 7245.98；期末精確 100000.016361… → halfUp 100000.02；利息顯示 3048.26。
- `payment-long-horizon`：PMT* = 1201.549563… → 1201.55；期末精確 1000000.363319… → 1000000.36。
- `payment-already-funded`：60000 × 1.0025^24 = 63705.4227… → 63705.42。
- `payment-growth-sufficient`：10000 × 1.01^12 = 11268.2503… ≥ 11000 → growth-sufficient，期末 11268.25。
- `months-with-interest`：對數估計 ln(400/325) ÷ ln(1.005) = 41.63… → 42；精確校正 B(41) = 19748.3835… < 20000 ≤ B(42) = 20147.1254…，估計值無需移動；尾款精確 152.874584… → 進位 152.88。

## 釘版決策與理由（請獨評特別看）

- 付款進位到分（非整元）：進位到分保證「少存 1 分即不達標」的最小性可驗證；整元進位在 360 個月下經年金因子放大可多存數十元，無必要。餘額類用 halfUp，因其為資訊值非付款指令。
- 模式 B 的 finalBalance 定義為 targetAmount：照計畫於最後一月存入「精確」尾款時餘額恰等於目標；totalDeposits 改用「顯示（進位後）尾款」，totalInterest 由顯示恆等式反推，三個顯示值恆滿足 finalBalance = initialAmount + totalDeposits + totalInterest，代價是顯示利息可能比精確利息少不到 1 分，已在 FAQ 揭露。
- totalInterest 永不為負：模式 A 精確利息 = PV(q^n − 1) + PMT × ((q^n − 1)/i − n) ≥ 0（因 (q^n − 1)/i = 1 + q + … + q^(n−1) ≥ n），halfUp 誤差 < 0.5 分且結果為整數分，故顯示值 ≥ 0；模式 B 精確利息 = B(k−1) × q − PV − PMT(k−1)（達標月含該月利息的總利息）≥ 0，尾款進位損失 < 1 分，同理顯示值 ≥ 0。
- 模式 B 求解上限 1200 個月：超過以 unreachable/beyond-horizon 回傳而非輸出天文數字月數；與模式 A 輸入上限 600 個月有意不同（B 是求解結果上限，留較寬）。
- 零利率分支以解析後 bp == 0（整數）判定，模式 A 用 (FV − PV)/n、模式 B 用整數進位除法，全程不除以 i、不用 epsilon。
- 非作用中模式欄位只驗容量：沿用 Run 5 既有規格（race-time-predictor）的釘版先例，使單一草稿物件可兩模式共用。
- 揭露句與四種狀態句皆雙語釘版原文，見 SPEC inputsOutputs 第 7、8 點。

- 18 筆字面核心案例、3 筆 controller 案例。`payment-basic-zero-rate` 核對點為「零利率模式 A 基本除法」。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
