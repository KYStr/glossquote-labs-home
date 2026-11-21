# 高鐵票價試算 — 作者檢查

作者 `muse`（run 6 規格作者，subagent session 5f714171），來源工作 run 6 概念第 24 條。作者文件核對，待非作者 readiness。作者不得稱自己的文件為獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 checkout 內 103 份既有預案（`docs/specs/`）：無 hsr／高鐵票價重複。最相近者為 `fuel-cost-calculator`（油費，非票價）與 run 6 同輪另案 `highway-toll-calculator`（國道通行費，`spec-highway-toll-calculator-20261121`，公式計費 vs 本工具查表計費），差異見 SPEC scope 節。
- 17 筆字面核心案例、3 筆 controller 案例，共 20 筆。產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。

## 來源優先於概念的兩處修正

1. **沒有「里程費率／距離級距公式」。**概念筆記稱「票價＝依距離級距的標準車廂票價表（里程費率與級距釘版現行規則）」，但台灣高鐵官方公告的票價是政府備查的 66 組區間定價查表，未公布任何每公里費率或級距公式。本 SPEC 釘版三張查表（標準／商務／自由座全票），里程只作顯示、不參與計價。
2. **自由座／商務艙沒有單一換算倍率。**概念筆記稱「並列自由座／商務艙換算規則」，但官方表顯示自由座／標準比值介於 0.8750（南港─台北 35/40）至 0.9698（台北─左營 1445/1490），商務／標準比值介於 1.6376（台北─左營 2440/1490）至 3.0769（台中─彰化 400/130），無單一倍率。故三張表皆釘版字面值，折扣只對優待／早鳥／大學生用統一下取至 5 元規則。

## 獨立重算（第二種方法）

手算在下節逐案列出；第二種方法為獨立 Python 腳本（`/tmp/verify_hsr.py`，2026-11-21 執行，結果 0 failures），將官方頁面四張表逐格轉錄後驗證：

- 優待票公式 `5 × floor(全票 / 10)` 重現官方優待票表全部 396 格（標準／商務／自由座 × 66 組 × 雙向對照），0 失敗。
- 早鳥 65 折表全部 66 格符合 `5 × floor(全票 × 0.65 / 5)`；早鳥 8／9 折官方已刊行的 15 格抽查全數符合。
- 大學生 5／75 折表全部 132 格、大學生 88 折表全部 66 格符合同式（折數 0.50／0.75／0.88）。
- 站間距離 5.9、7.2、29.2、29.9、32.7、60.8、28.2、24.6、33.1、62.3、31.3 公里，合計 345.2 公里，與南港 0.0 至左營 345.2 的 km 標記一致。
- 12 個成功 fixture 的 baseFare／singleFare／totalFare／distanceKm 全部由腳本自轉錄表重算，0 失敗。
- 官方合併矩陣的讀法已核對：下三角＝標準全票、上三角＝商務全票（台北─桃園 160／440、台北─左營 1490／2440 等多組與第三方整理一致）；三組短區間的商務格帶 `*` 註記不發售，與 SPEC 的 CABIN_NOT_SOLD 一致。

資料來源（2026-11-21 查核）：票價表與優待規則 https://www.thsrc.com.tw/articlecontent/743c51ac-124d-4b1a-a57b-1fd820848032；早鳥表 https://www.thsrc.com.tw/ArticleContent/7039d17d-1463-4c14-ad93-4d491dedcad5；大學生表 https://www.thsrc.com.tw/articlecontent/530e869c-479d-441a-a4b4-61a8166827e9；車站 km 標記 Wikipedia「Taiwan High Speed Rail」路線圖 https://en.wikipedia.org/wiki/Taiwan_High_Speed_Rail。注意：Wikipedia 站表另有一組以不同基準起算的距離（南港 −3.2、台北 6.1），本 SPEC 採用路線圖以南港為 0.0 的 km 標記；里程僅顯示，不影響票價，故此差異不影響任何 fixture。

## 逐案手算推導（第一種方法）

站序：NAG 0、TPE 1、BAQ 2、TAY 3、HSC 4、MIL 5、TAC 6、CHH 7、YUL 8、CHY 9、TAN 10、ZUY 11；km：0.0、5.9、13.1、42.3、72.2、104.9、165.7、193.9、218.5、251.6、313.9、345.2。折扣式皆為 `singleFare = 5 × floor(baseFare × rate / 5)`。

- `taipei-zuoying-standard-full`：查標準表 TPE–ZUY＝1490；方向南下（1→11）；里程 |345.2−5.9|＝339.3；全票 rate 1，single＝1490；qty 1，total＝1490。
- `taipei-taichung-business-full`：查商務表 TPE–TAC＝1250；南下；|165.7−5.9|＝159.8；single＝1250；total＝1250。
- `nangang-zuoying-nonreserved-full`：查自由座表 NAG–ZUY＝1480；南下；|345.2−0.0|＝345.2；single＝1480；total＝1480。
- `taipei-taichung-concession-x2`：標準全票 700；優待 rate 0.50：700×0.5＝350，5×floor(350/5)＝350；qty 2，total＝700；里程 159.8。
- `taoyuan-hsinchu-nonreserved-concession`：自由座全票 125；125×0.5＝62.5，5×floor(62.5/5)＝5×12＝60；里程 |72.2−42.3|＝29.9；total＝60。
- `taipei-zuoying-earlybird65`：標準全票 1490；1490×0.65＝968.5，5×floor(968.5/5)＝5×193＝965；里程 339.3；total＝965。
- `taipei-taichung-student88`：標準全票 700；700×0.88＝616，5×floor(616/5)＝5×123＝615；里程 159.8；total＝615。
- `nangang-taipei-shortest-x3`：標準全票 40；南下；|5.9−0.0|＝5.9；single＝40；qty 3，total＝120。
- `tainan-zuoying-business-concession`：商務全票 410；410×0.5＝205，5×floor(205/5)＝205；里程 |345.2−313.9|＝31.3；total＝205。
- `zuoying-taipei-standard-full`：標準表對稱，ZUY–TPE＝1490；北上（11→1）；里程 339.3；total＝1490。
- `miaoli-taichung-student75`：標準全票 270；270×0.75＝202.5，5×floor(202.5/5)＝5×40＝200；里程 |165.7−104.9|＝60.8；total＝200。
- `changhua-yunlin-nonreserved-concession`：自由座全票 105；105×0.5＝52.5，5×floor(52.5/5)＝5×10＝50；里程 |218.5−193.9|＝24.6；total＝50。
- `same-station`：TPE＝TPE，跨欄 SAME_STATION，field=`destination`。
- `business-not-sold`：TPE–BAQ 為三組不售商務區間之一，CABIN_NOT_SOLD，field=`cabin`。
- `earlybird-business-mismatch`：earlyBird65 配 business，FARE_CABIN_MISMATCH，field=`fareKind`。
- `invalid-station`：origin `XXX` 不在 12 代碼內，INVALID_VALUE，field=`origin`。
- `quantity-range`：quantity `11` 超出 1–10，RANGE，field=`quantity`。
- 三筆 controller 案例沿用 retry-budget 的狀態機形狀，draft／預設值改為本工具欄位；lateResult 即第一筆 fixture 的 result。
