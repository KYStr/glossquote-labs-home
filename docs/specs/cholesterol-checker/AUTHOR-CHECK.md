# 膽固醇分級 — 作者檢查

作者 `muse/spec-cholesterol-checker-20261121`（run 6 規格作者），來源分支 `codex/initial-publication`（基底 `c8ca5fd3`）。作者文件核對，待非作者 readiness。本文件不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已在 repo 內 grep `cholesterol|膽固醇`（docs/specs/、tools/），無既有膽固醇規格。最接近的是 run 6 概念 2 血壓分級（不同檢驗項目）與 bmi-tdee-calculator（身體組成，非血液檢驗），差異見 SPEC scope。

## 來源核實（概念筆記第 4 條：NCEP ATP III——以查到的來源核實後釘版）

分級表對照兩處獨立來源核實一致：

1. 美國 NHLBI《ATP III Guidelines At-A-Glance Quick Desk Reference》（NIH Publication No. 01-3305）：總膽固醇 <200 理想／200–239 邊緣偏高／≥240 偏高；LDL <100 最佳／100–129 接近或略高於最佳／130–159 邊緣偏高／160–189 偏高／≥190 很高；HDL <40 偏低／≥60 偏高；三酸甘油脂 <150 正常／150–199 邊緣偏高／200–499 偏高／≥500 很高。
2. McGraw-Hill NAPLEX Review Guide Table 5-1 轉載表：與上述切點逐項一致（LDL ≥190 很高、總膽固醇 ≥240 偏高、三酸甘油脂 ≥500 很高）。

概念筆記未與來源衝突，無需更正概念；以下兩處是來源未直接給定的標籤決定，SPEC 已明示為本規格的決定、留待 reviewer 核對：

- **HDL 40–59 中段標籤**：ATP III 原表只命名 `<40 Low` 與 `≥60 High`，40–59 未命名。本規格釘版為 `normal`／正常，依據常見臨床用法（MedlinePlus 將 40–59 mg/dL 列為正常範圍）。若 reviewer 認為中段不應命名，應改為顯示「—」或另定標籤。
- **HDL 不分性別**：ATP III 代謝症候群判準另用男性 <40／女性 <50 的 HDL 切點；本工具不問性別，一律採用分類表的單一 <40 切點。SPEC 已在 inputsOutputs §2 註明此決定。

## 手算推導（第一種方法：逐項對照釘版表手算）

區間皆左閉右開：切點值歸入較高一級（如 200 歸邊緣偏高、100 歸接近最佳、40 歸正常、150 歸邊緣偏高、240／190／500 歸最高級）。nonHdl = total − hdl（整數減法）。overallRank = 四項 severity 最大值；0 → all-desirable，1 → borderline，≥2 → needs-attention。

- `all-desirable`（180/90/65/120）：總膽固醇 180<200 理想(0)；LDL 90<100 最佳(0)；HDL 65≥60 偏高(0)；三酸甘油脂 120<150 正常(0)。nonHdl = 180−65 = 115。rank = max(0,0,0,0) = 0 → all-desirable。
- `borderline-mixed`（210/135/45/160）：210 在 200–239 邊緣偏高(1)；135 在 130–159 邊緣偏高(2)；45 在 40–59 正常(0)；160 在 150–199 邊緣偏高(1)。nonHdl = 210−45 = 165。rank = max(1,2,0,1) = 2 → needs-attention。
- `high-risk`（260/195/35/550）：260≥240 偏高(2)；195≥190 很高(4)；35<40 偏低(2)；550≥500 很高(3)。nonHdl = 260−35 = 225。rank = 4 → needs-attention。
- `boundary-just-below`（199/99/59/149）：199<200 理想(0)；99<100 最佳(0)；59 在 40–59 正常(0)；149<150 正常(0)。nonHdl = 199−59 = 140。rank = 0 → all-desirable。
- `boundary-just-at`（200/100/40/150）：200 達下界，邊緣偏高(1)；100 達下界，接近或略高於最佳(1)；40 達下界，正常(0)；150 達下界，邊緣偏高(1)。nonHdl = 200−40 = 160。rank = 1 → borderline。
- `boundary-top`（240/190/60/500）：240≥240 偏高(2)；190≥190 很高(4)；60≥60 偏高(0)；500≥500 很高(3)。nonHdl = 240−60 = 180。rank = 4 → needs-attention。
- `boundary-mid`（239/129/39/199）：239 在 200–239 邊緣偏高(1)；129 在 100–129 接近或略高於最佳(1)；39<40 偏低(2)；199 在 150–199 邊緣偏高(1)。nonHdl = 239−39 = 200。rank = 2 → needs-attention（由 HDL 偏低決定）。
- `ldl-high-only`（185/160/70/110）：185<200 理想(0)；160 在 160–189 偏高(3)；70≥60 偏高(0)；110<150 正常(0)。nonHdl = 185−70 = 115。rank = 3 → needs-attention。
- `tg-high-only`（190/95/50/499）：190<200 理想(0)；95<100 最佳(0)；50 在 40–59 正常(0)；499 在 200–499 偏高(2)。nonHdl = 190−50 = 140。rank = 2 → needs-attention。
- `decimal-total`（總膽固醇 "199.5"）：含小數點，非 ASCII 整數字串 → INTEGER_FORMAT，field=total。
- `zero-total`（總膽固醇 "0"）：整數字串但 <1 → RANGE，field=total。
- `too-large-tg`（三酸甘油脂 "10000"）：5 字元未超容量（上限 5），整數但 >9999 → RANGE，field=triglycerides。
- `empty-hdl`（HDL ""）：空字串 → EMPTY，field=hdl。
- `input-limit-total`（總膽固醇 "123456"）：6 字元超容量（上限 5）→ INPUT_LIMIT，field=total。驗證順序為容量先於文法，故不判 INTEGER_FORMAT。

## 獨立重算（第二種方法：腳本）

另寫 Node 腳本 `/tmp/chol-recalc.mjs`，從 SPEC 釘版表重新實作四項分級、驗證順序（容量→EMPTY→文法→範圍）、nonHdl 與整體摘要，逐項比對 fixtures.json 的 14 個核心案例。結果：**14/14 PASS，0 失敗**（執行 exit 0）。

重算過程抓到一個實質問題並已修正：初版 raw 上限 4 字元時，"199.5"（5 字元）與 "10000"（5 字元）會先觸發 INPUT_LIMIT，而非預期的 INTEGER_FORMAT／RANGE，且 4 字元上限下 RANGE 上界不可達。已將 raw 上限改為 5 字元（SPEC inputsOutputs 與腳本同步），並新增 `input-limit-total`（"123456"，6 字元）覆蓋 INPUT_LIMIT，使三種錯誤碼各自可達。修正後重算 14/14 通過。

## 其他檢查

- 17 個案例：14 核心＋3 controller（state-dirty-error、state-cancel-late、state-replace-late，沿用 retry-budget 的 controller 模式）。controller 案例為狀態機行為描述，非純函數輸出，未納入腳本重算，留待產品測試以假 Worker 驗證。
- 釘版聲明中英全文逐字寫入 SPEC inputsOutputs §6，頁面與報告皆須逐字呈現。
- 無浮點、無捨入、無時區依賴；nonHdl 為整數減法。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
