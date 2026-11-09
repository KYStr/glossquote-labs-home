# VO2max Calculator — Author Check

Spec ID: `spec-vo2max-calculator-20261109`\
Author actor: `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`\
Author working directory: `~/workspace/glossquote-factory/build5/specs/vo2max-calculator`\
Checked at: 2026-11-09 (Asia/Taipei)

> 這是作者自查，不是獨立審查。九個產品面向在本規格中全數維持 `NOT_RUN`、
> 分數 `null`；本文件不宣稱任何產品驗收結果。

## 1. 來源核實（2026-11-09 查證）

- **Cooper 公式**：VO₂max =（距離（公尺）− 504.9）/ 44.73，出自 Cooper, K.H.
  (1968), "A Means of Assessing Maximal Oxygen Intake", *JAMA* 203(3):201–204。
  多個獨立來源（計算器站、學術轉載）常數逐字一致；等價公里式
  22.351 × km − 11.288 為同一條直線，但在最後一位捨入可能不同，故規格釘死
  公尺原式、不許替代。
- **1.5 英里公式**：VO₂max = 483 / 時間（分鐘）+ 3.5，為 ACSM 運動測驗指引
  發布的場地形式（ACSM's *Guidelines for Exercise Testing and Prescription*
  體系；ACSM-EP 研習教材與場地測驗參考書均以此形式轉載）。其來源是 ACSM
  跑步代謝方程式（速度每 m/min 需氧 0.2 ml/kg/min ＋ 靜止 3.5）套用到
  1.5 英里 = 2414.016 m：0.2 × 2414.016 = 482.8032，發布形式取整為 **483**。
  規格跟隨發布形式釘死 483 並揭露推導；483 與 482.8 的差異對 1 位小數結果
  至多影響 0.1。
- **分級常模**：Cooper Institute 年齡／性別常模，如 Heywood, V. (1998)
  *Advance Fitness Assessment and Exercise Prescription* 3rd ed. 所列表，
  並於 ACSM 對齊的參考來源轉載。作者於 2026-11-09 讀取一份完整轉載
  （fitnesstool.net 的 VO2 Max Calculator 頁，頁面明載 "Based on the Cooper
  Institute norms"）逐格謄錄全部 12 列（男女 × 6 年齡帶）；其中男女
  20–29 與 30–39 共 4 列另與第二份獨立轉載（coachway.io）逐格核對完全一致。
  規格 §4 同時釘死門檻表與原始 band 表供審查者交叉核對，並依概念備註標示
  為近似常模（不同出版品略有差異）。

## 2. Fixture 雙重推導

每個期望值先以手算（十進位算術，算式列於下）推導，再以一份獨立撰寫的
參考實作（Python，IEEE-754 double，完全依 SPEC §3–§4 的驗證順序、公式
運算順序 `3.5 + 483.0 / (seconds / 60.0)`、捨入式 `floor(x×10 + 0.5) / 10`
與門檻表重算）逐案比對。兩者對全部 24 個 core 案例一致；不一致即停下查明，
不改期望值遷就程式。

### 成功案例手算

| 案例 | 算式 | 未捨入 | 捨入 | 分級查表 |
| --- | --- | --- | --- | --- |
| cooper-basic | (2400 − 504.9) / 44.73 = 1895.1 / 44.73 | 42.3675… | 42.4 | 無（未填年齡性別）→ null |
| cooper-classified-superior | 2295.1 / 44.73 | 51.3100… | 51.3 | 男 30–39：superiorMin 49.5 ≤ 51.3 → superior |
| cooper-classified-good | 1495.1 / 44.73 | 33.4249… | 33.4 | 女 20–29：goodMin 33.0 ≤ 33.4 < excellentMin 37.0 → good |
| cooper-band-on-rounded | 1899.5 / 44.73 | 42.4659… | 42.5 | 男 20–29：捨入值 42.5 恰達 goodMin 42.5 → good（原始值 < 42.5，本案釘死「分級用捨入值」） |
| cooper-classified-fair | 1395.6 / 44.73 | 31.2005… | 31.2 | 男 50–59：fairMin 31.0 ≤ 31.2 < goodMin 35.8 → fair |
| mile-tie-half-up | 3.5 + 483 / (720/60) = 3.5 + 40.25 | 43.75（精確） | 43.8 | 無 → null；43.75 在二進位精確表示，tie 行為確定性成立 |
| mile-classified-excellent | 3.5 + 483 / 15 | 35.7 | 35.7 | 女 40–49：excellentMin 32.9 ≤ 35.7 < superiorMin 37.0 → excellent |
| mile-classified-very-poor | 3.5 + 483 / 30 | 19.6 | 19.6 | 男 60+：19.6 < poorMin 20.5 → very-poor |
| mile-classified-poor | 3.5 + 483 / 21 = 3.5 + 23.0 | 26.5（精確） | 26.5 | 男 50–59：poorMin 26.1 ≤ 26.5 < fairMin 31.0 → poor |
| mile-inactive-distance-ignored | 同 mile-tie-half-up；distanceMeters="abc" 為非作用欄位，僅容量／字元檢查 | 43.75 | 43.8 | null |
| mile-max-time-hms | 3.5 + 483 / (3600/60) = 3.5 + 8.05 | 11.55 | 11.6 | null；同時釘死 H:MM:SS 文法與 3600 秒上限為成功 |

捨入邊界餘裕（未捨入值 ×10 距 0.5 tie 點的距離，單位 0.1）：cooper-basic
0.175、superior 0.399、good 0.250、band-on-rounded 0.159、fair 0.495、
mile-excellent／very-poor／poor 0.500（值恰在 1 位小數上）、mile-max-time-hms
為 11.55 的刻意邊界（double 值略高於 tie 點，與半數進位同向 → 11.6，
手算與重算一致）。除兩個刻意設計的 tie 錨點（43.75 精確 tie、11.55
邊界）外，所有餘裕 ≥ 0.15，不存在浮點不確定性。

### 錯誤案例手算

- cooper-below-range-505：0.1 / 44.73 = 0.0022… → 捨入 0.0 → `BELOW_RANGE`
  （釘死「捨入後 ≤ 0」規則的邊界）。
- cooper-below-range-zero：−504.9 / 44.73 = −11.2877… → `BELOW_RANGE`。
- cooper-distance-format：`2,400` 含逗號 → `DECIMAL_FORMAT`。
- cooper-distance-range：`10001` > 10000 → `RANGE`。
- mile-time-format：`12:60` 秒段 60 不合文法 → `TIME_FORMAT`。
- mile-time-too-fast：`3:59` = 239 秒 < 240 → `RANGE`。
- mile-time-too-slow：`60:01` = 3601 秒 > 3600 → `RANGE`。
- pair-required-sex／pair-required-age：僅填一方 → `PAIR_REQUIRED` 指向缺席欄位。
- age-range-low：`12` < 13 → `RANGE`（欄位順序上先於跨欄與計算）。
- test-enum：`rockport` 不在列舉 → `ENUM`（本站不實作 Rockport，見 SPEC §1 排除項）。
- cooper-distance-empty：作用欄位空字串 → `EMPTY`。
- schema-extra-key：多出 `weightKg` 鍵 → `SCHEMA`（field null）。
- controller 三案沿用範本形狀：dirty-error（成功 → 改成 `10001` → 本地
  `RANGE`）、cancel-late（舊回覆不得覆蓋已編輯草稿，其後第二筆提交取
  2800 m → 51.3）、replace-late（本地錯誤狀態不得被舊的成功回覆取代）。

## 3. 與概念備註的落差與決策（皆已寫入 SPEC）

1. 概念備註寫「Rockport 或 Cooper」：本規格實作 Cooper 12 分鐘跑與
   1.5 英里跑，不做 Rockport。理由：Rockport 需體重與結束心率，輸入面與
   本工具單一成績輸入的定位不合，且兩種跑步測驗的公式都可完整釘死與手算
   驗證。已在 SPEC §1 明列為排除項，日後擴充需規格修訂。
2. 1.5 英里常數採發布形式 483（非推導值 482.8），推導與取捨揭露於
   SPEC §4 與本文件 §1。
3. 分級表標示為近似常模；門檻以「下一級下限」方式由 band 表換算
   （例：Superior >52.4 → superiorMin 52.5），換算規則寫明於 SPEC §4，
   原始 band 表並列供核對。
4. 非作用模式欄位沿用 race-time 先例：僅容量與未成對代理字元檢查，
   內容忽略（`mile-inactive-distance-ignored` 釘死此行為）。
5. 年齡範圍釘死 13–99：與常模表覆蓋一致；表外年齡拒絕而非默默夾入
   最近年齡帶。性別列舉僅 `male`/`female`，與常模表的二元分組一致。

## 4. 未執行（NOT_RUN）

- 獨立文件審查：未執行（依規則作者不得自審；本文件不是審查）。
- 產品實作與其九面向證據：尚無實作，全數 `NOT_RUN`（SPEC §6）。
- 真實瀏覽器、HTTP probe、build 決定性：屬實作階段證據，本階段未執行。
- registry／coordination 登記：依本批分工由父代理執行，作者未執行任何
  登記命令。
