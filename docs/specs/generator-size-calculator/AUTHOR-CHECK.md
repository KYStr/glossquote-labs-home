# 發電機容量試算 — 作者檢查

作者 `muse:subagent:a4513248-1e10-4505-b74e-1ae5589f839c`，來源工作 run 6 規格寫作（概念第 19 條）。作者文件核對，待非作者 readiness。本文件不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 checkout 的 `docs/specs/`（103 份），無同名或同功能預案；`battery-runtime` 規格目錄不存在於本 checkout，scope 節的發電機選型 vs 電池續航差異依概念第 19 條陳述，未連結不存在的規格。
- 14 筆字面核心案例（含 5 個錯誤案例）、3 筆 controller 案例，共 17 筆。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。

## 來源核對（概念 vs 可驗證來源）

- 預設瓦數表：概念只說「家電清單（運轉瓦數＋啟動瓦數）」，未給數值。作者以 Honda Power Equipment 瓦數估算指南（https://powerequipment.honda.com/generators/generator-wattage-estimation-guide，2026-11-21 讀回）的 Home Applications 表為主來源，12 項數值逐字抄錄（該表欄位為啟動在前、運轉在後，SPEC 已轉為運轉／啟動順序）：冰箱／冷凍櫃（節能型）啟動 1200、運轉 132–192；微波爐 1000 W 1500/1500；暖爐風扇 1/3 HP 1400/700；沉水泵 1/3 HP 1300/800、1/2 HP 2150/1050；窗型冷氣 10000 BTU 2200/1500；電熱乾衣機 6750/5400；電熱水器 4500/4500；洗衣機 1200/1200；平面電視 46 吋 190/190；筆電 200–250；咖啡機 4 杯 600/600。Honda 給區間處（冰箱運轉 132–192、筆電 200–250）取區間上界（192、250），選型取保守值；此取捨已在 SPEC 寫明。
- 突波公式：總運轉瓦數＋最大單一啟動增量（starting − running）。Honda 指南的用電管理建議（馬達依序啟動）與多家公開指南一致：Solution Energy（https://solutionenergy.com/generators/what-size/）「add up the running watts … then add the biggest extra jump」；The Building Code（https://www.thebuildingcode.com/us/what-size-generator-do-i-need）「Peak demand = running total + (startingW − runningW) of the largest motor appliance」；Generac 手冊稱馬達啟動約需運轉瓦數的 2.5 倍。SPEC 採「增量」寫法（而非直接加最大啟動瓦數），因總運轉瓦數已含該台馬達的運轉瓦數。
- 安全裕度 25% 與功率因數 0.8：兩者皆為作者釘版選擇，非單一法定標準。25% 的理由寫在 SPEC：連續負載 ≤ 額定容量的 80%（1 ÷ 1.25 = 0.8）是常見的發電機運轉守則；公開指南的裕度主張介於 20%（hvacsolver 的 ×1.20 公式）與 25% 之間，本工具取保守的 25%。功率因數 0.8 為發電機銘牌 kVA 的標準值（kVA = kW ÷ 0.8）。突波 kVA 不疊加裕度：突波已是最壞情況（全部負載運轉中＋最大一台啟動），裕度只保護連續運轉。
- 市售規格表 [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 7.5, 10.0, 12.5, 15.0, 20.0] kVA：為作者釘版的常見家用／小型商用級距（對應市售 1000–20000 VA 機型），非任一廠商的型錄；20 kVA 以上以 0.5 kVA 進位報值並標超規。

## 數字推導：手算（方法一）

常數：裕度 ×5/4（requiredRunningW 無條件進位到整數瓦）；kVA＝W ÷ 0.8 ÷ 1000，無條件進位到 0.1；recommendedKva＝max(requiredKva, peakKva)；規格表如上，>20 kVA 時進位到 0.5 並標超規。

1. `fridge-lights-tv`：總＝192+100+190＝482；增量 1008/0/0 → 最大 1008（冰箱）；突波＝482+1008＝1490；含裕度＝ceil(482×1.25)＝ceil(602.5)＝603；所需 kVA＝ceil0.1(603/800)＝ceil0.1(0.75375)＝0.8；突波 kVA＝ceil0.1(1490/800)＝ceil0.1(1.8625)＝1.9；建議 1.9 → 規格 2.0。
2. `no-motor-loads`：總＝1500+4500＝6000；增量皆 0 → 最大 0、突波＝6000、最大來源 null；含裕度＝7500；所需 kVA＝ceil0.1(7500/800)＝ceil0.1(9.375)＝9.4；突波 kVA＝ceil0.1(6000/800)＝7.5；建議 9.4 → 規格 10.0。
3. `single-window-ac`：總＝1500；增量 700 → 突波 2200；含裕度＝1875；所需 kVA＝ceil0.1(1875/800)＝ceil0.1(2.34375)＝2.4；突波 kVA＝ceil0.1(2200/800)＝ceil0.1(2.75)＝2.8；建議 2.8 → 規格 3.0。
4. `exact-table-size`：總＝3200；增量 0 → 突波 3200；含裕度＝4000；所需 kVA＝ceil0.1(4000/800)＝5.0；突波 kVA＝ceil0.1(3200/800)＝4.0；建議 5.0 → 規格恰為 5.0。
5. `two-motors-largest-only`：總＝192+1050+200＝1442；增量 1008/1100/0 → 最大 1100（沉水泵，非兩者相加）；突波＝1442+1100＝2542；含裕度＝ceil(1442×1.25)＝ceil(1802.5)＝1803；所需 kVA＝ceil0.1(1803/800)＝ceil0.1(2.25375)＝2.3；突波 kVA＝ceil0.1(2542/800)＝ceil0.1(3.1775)＝3.2；建議 3.2 → 規格 3.5。
6. `oversize-whole-house`：總＝5400+4500+4500+1500+1200+192＝17292；增量 1350/0/0/700/0/1008 → 最大 1350（乾衣機）；突波＝17292+1350＝18642；含裕度＝17292×1.25＝21615；所需 kVA＝ceil0.1(21615/800)＝ceil0.1(27.01875)＝27.1；突波 kVA＝ceil0.1(18642/800)＝ceil0.1(23.3025)＝23.4；建議 27.1 > 20 → 規格 ceil 到 0.5＝27.5，超規 true。
7. `minimum-load`：總＝60；增量 0 → 突波 60；含裕度＝75；所需 kVA＝ceil0.1(75/800)＝ceil0.1(0.09375)＝0.1；突波 kVA＝ceil0.1(60/800)＝ceil0.1(0.075)＝0.1；建議 0.1 → 最小規格 1.0。
8. `exact-tenth-boundary`：總＝800+200＝1000；增量 1320/0 → 突波 2320；含裕度＝1250；所需 kVA＝ceil0.1(1250/800)＝ceil0.1(1.5625)＝1.6；突波 kVA＝ceil0.1(2320/800)＝ceil0.1(2.9)＝2.9（恰為 0.1 倍數，不推高）；建議 2.9 → 規格 3.0。
9. `tie-largest-surge`：總＝800+800+100＝1700；增量 500/500/0 → 最大 500，取第一列 Pump A；突波＝2200；含裕度＝2125；所需 kVA＝ceil0.1(2125/800)＝ceil0.1(2.65625)＝2.7；突波 kVA＝ceil0.1(2200/800)＝2.8；建議 2.8 → 規格 3.0。

錯誤案例皆為規則直判，無算術：空清單 → EMPTY（appliances）；啟動 192 < 運轉 1200 → RANGE（startingWatts，第 1 列）；運轉 0 → RANGE（runningWatts，第 1 列；先於 startingWatts 檢查）；瓦數 `100.5` → INTEGER_FORMAT（runningWatts，第 1 列）；13 列 → ROW_LIMIT（appliances）。

## 數字推導：獨立重算（方法二）

以 Python `fractions.Fraction` 精確有理數運算獨立重算 9 個核心案例（無二進位浮點）：含裕度瓦數以整數 ceil(total×5/4)，kVA 以 ceil(W×10/800)/10，規格表查表／超規進位到 0.5。腳本 `/tmp/gen-recompute.py`，輸出與上述手算逐項一致：

- fridge-lights-tv：482／1008／1490／Refrigerator／603／0.8／1.9／1.9／2.0／false
- no-motor-loads：6000／0／6000／null／7500／9.4／7.5／9.4／10.0／false
- single-window-ac：1500／700／2200／Window AC／1875／2.4／2.8／2.8／3.0／false
- exact-table-size：3200／0／3200／null／4000／5.0／4.0／5.0／5.0／false
- two-motors-largest-only：1442／1100／2542／Sump Pump／1803／2.3／3.2／3.2／3.5／false
- oversize-whole-house：17292／1350／18642／Dryer／21615／27.1／23.4／27.1／27.5／true
- minimum-load：60／0／60／null／75／0.1／0.1／0.1／1.0／false
- exact-tenth-boundary：1000／1320／2320／Heater A／1250／1.6／2.9／2.9／3.0／false
- tie-largest-surge：1700／500／2200／Pump A／2125／2.7／2.8／2.8／3.0／false

（每組依序為 totalRunningW／maxSurgeExtraW／peakW／largestSurgeRow／requiredRunningW／requiredKva／peakKva／recommendedKva／recommendedSizeKva／oversize。）

另以同一腳本邏輯逐項比對 `fixtures.json` 內 9 筆數值核心案例的完整 expected（含 rows 回顯）：0 項不一致；17 筆案例皆可解析，core 14、controller 3。
