# 寵物餵食量計算 — 作者檢查

作者為 run 5 規格撰寫子代理（cloud-dot），父代理負責登記、claim 與送審。本文件是作者對本文件的自檢與查證紀錄，**不是獨立審查**；ready 與否由非作者 reviewer 決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 checkout 的 101 份預案 slug，無 pet／feeding／nutrition 類同名或同功能預案。最相近的 `bmi-tdee-calculator` 為人類 BMI／TDEE，實質差異見 SPEC scope 節。
- 21 筆字面核心案例（13 成功、8 錯誤）、3 筆 controller 案例，共 24 筆。

## 倍率表來源查證（查證日期 2026-11-09，皆為作者當日實際讀取）

主來源（逐格讀取原文表格）：

- **MSD Veterinary Manual**，表「Daily Maintenance Energy Requirements for Dogs and Cats」（msdvetmanual.com）：犬 未絕育 1.8、已絕育 1.6、易胖 1.4；幼犬 <4 月 3、>4 月 2；貓 未絕育 1.4、已絕育 1.2、易胖 1；幼貓 2.5。表註明示任何熱量計算僅為起點、須依個體反應調整。本表 11 列中 9 列直接取自此表（兩列減重除外，見下）。

交叉核對（同日讀取）：

- **Pet Nutrition Alliance**，文件「Calculating Calories Based on Pet Needs」（petnutritionalliance.org）：RER = 70 × BWkg^0.75，犬貓相同；減重 犬 1.0／貓 0.8–1.0；易胖／低活動 犬 1.2–1.4／貓 1.0；已絕育 犬 1.6／貓 1.2；未絕育 犬 1.8／貓 1.4；懷孕、哺乳、成長皆以範圍表示（成長 2–3，註記約 4 個月起遞減）；明示個體差異可達 50%、須依 BCS 調整。
- **Ohio State University Veterinary Medical Center**，「Basic Calorie Calculator for Dogs and Cats」Table 1（犬）：已絕育 1.6、未絕育 1.8、低活動／易胖 1.2–1.4、減重 1.0（以理想體重計）、幼犬 0–4 月 3.0、4 月至成犬 2.0；原文稱此為 crude、「zip-code」等級估算，個體差異可達 50%。
- **Small Animal Clinical Nutrition, 5th ed.**（Hand 等）Table 5-2：貓 已絕育 1.2、未絕育 1.4、低活動 1.0、減重 0.8、幼貓成長 2.5；犬 減重 1.0；同表顯示懷孕犬分階段（前 42 天比照未絕育成犬、最後 21 天 3.0）、哺乳犬 4–8 依窩數、增重僅給範圍。

## 釘版決定與概念備註的出入（如實記錄）

- 概念備註給貓已絕育「1.2–1.4」、貓未絕育「1.4–1.6」的**範圍**（該範圍見 SACN Box 1-6 與 AAHA 2021 的區間寫法）。工具每列只能釘單一值，故依 MSD、PNA、SACN Table 5-2 三個給單一值的來源釘為 **1.2／1.4**，範圍寫法在此揭露。
- 概念備註的「減重 1.0」僅對犬成立。**貓減重釘 0.8**（SACN Table 5-2 與 AAHA 2021 為單一值 0.8；PNA 給 0.8–1.0 範圍）。犬減重 1.0 由 OSU Table 1、PNA、SACN 三方一致。
- 犬低活動／易胖列：OSU、SACN、PNA 給範圍 1.2–1.4，AAHA 2021 給 1.0–1.2，來源不一致；為與全表主來源一致，釘 **MSD 的單一值 1.4**，差異在此揭露。
- 幼貓只有單列 2.5（MSD、SACN）；來源未像幼犬那樣以 4 個月切分幼貓（PNA 成長列給 2–3 範圍並註記遞減），故不自創幼貓年齡分段。
- **省略的列**（來源僅給範圍、階段相依或窩數相依值，釘單一值即屬虛構，故不列入，列為 SPEC 非目標）：增重（SACN 犬 1.2–1.8／貓 1.2–1.4，以理想體重計）、懷孕（分階段）、哺乳（2–6／4–8 依窩數）、工作犬（2.0–5.0 以上）、老齡（範圍或未列）、重症照護 1.0（PNA／SACN 有單一值，但屬臨床監護情境，不屬家庭餵食工具範圍）。
- 體重範圍：犬 0.5–100 kg 依概念備註；貓上限釘 **20 kg 而非 15 kg**——減重列的對象（肥胖貓）可超過 15 kg，15 kg 上限會把減重列的部分目標族群擋在 RANGE 外。理由已寫入 SPEC inputsOutputs。

## 案例推導（兩種獨立方法，逐值核對）

- 方法一（手算高精度）：以 mpmath 50 位有效數字依釘版公式推導 RER／DER 原始值（AUTHOR-CHECK 底稿：如 10 kg → 10^0.75 = 5.623413251903490…，RER = 393.638927633244…，DER(×1.6) = 629.822284213191…）。
- 方法二（雙精度重算）：另以 IEEE-754 雙精度腳本嚴格照 SPEC 釘版運算順序（Math.pow 等價的 C 雙精度 pow、先 pow 後乘 70、DER 以已捨入 derKcal 回算克數等）重算全部輸出。
- 13 筆成功案例的每個捨入輸出（rerKcal、derKcal、gramsPerDay、cupsPerDay、perMealCups）兩法全數一致；逐餐整數分配以產生器不變量檢查驗證合計恆等（perMealKcal 合計 = derKcal、perMealGrams 合計 = gramsPerDay，已對 fixtures.json 實跑斷言通過）。
- 捨入邊界餘裕（未捨入值到最近捨入邊界的距離，皆遠大於跨引擎雙精度 pow 誤差的數個 ULP ≈ 1e-13 量級，案例值不因引擎差異翻轉）：RER 最小 0.018 kcal（`cat-decimal-density`）；DER 最小 0.031 kcal（`cat-neutered`）；克數最小 0.184 g（`dog-intact-cups`）；杯數最小 0.00084 杯（`cat-decimal-density` 每日杯數，×100 尺度餘裕 0.084）。
- 錯誤案例的預期 code／field 依 SPEC 驗證順序逐案人工核對（欄序、欄內順序、物種連動 ENUM、選填欄格式仍驗證）。

## 未驗與狀態

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
- 作者未執行任何 registry／coordination 指令；登記與送審由父代理為之。
