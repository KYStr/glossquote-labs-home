# U08-CONTRIBUTION-DELTA-20261013

2026-10-13主代理核定需求。使用者已授權本批改善；須收到本任務實際開工訊息才實作，不自行開下一階段。原owner 01a12398-1264-7a41-962d-6781c2dc8d8d，明確請求gpt-6.1-sol/max，禁止再委派。表面為Product App，沿既有tokens與版型。

主代理已核對text清理順序、CSV session頁碼/匯出行為、decision整數公式。下方草案中的產品預設與案例在本任務採用為要求；函數或metadata命名可等價調整並在交接說明，不能省略結果與失效規則。所有案例是預期，不是已執行測試。

## 08 決策矩陣：前列方案的準則貢獻差

### 交付與非目標

使用者已按自己的準則、方向、權重與評分完成比較，想理解前列方案各有什麼取捨。完成條件：保留既有排行与逐方案公式；對目前前兩個顯示方案，逐準則顯示各自分數貢獻与有方向的差值，總差可由原始整數分子核對。並列時清楚說明平手，不以原順序造出獨有贏家。

本輪不加權重敏感度／what-if、推薦算法、客觀最佳／成功率宣稱、模板庫、圖表、任意兩方案選擇器、分享／帳號、外部資料或交換 schema 升級。因「前兩名」包含同名次時，對象選擇必須可解釋，不能暗中篩掉同分方案。

### 現況：已讀實際程式

| 檔案／函式 | 實際行為與接點 |
|---|---|
| `public/js/core/schema.mjs:27` `validateDocument` | exact schemaVersion1，2..8 options、1..8 criteria，每項weight整數0..100、方向benefit/cost、評分null或整數1..5；normalized clone與固定錯誤碼，不寫回原輸入。 |
| 同檔 `normalizeLabel/parseUIWeight` | 名稱NFC／trim及控制字元拒絕，options與criteria各自唯一；UI權重raw字串先解析，import不接受字串權重。 |
| `public/js/core/scoring.mjs:2` `scoreDocument` | 先validate；W=0→ZERO_WEIGHT；任一正權重缺分数→MISSING_SCORES/missingCount，整份不排名。每準則已有 `{criterionId,utility,numerator,contribution}`。 |
| 同函式排序與rank loop | benefit u=s−1、cost u=5−s；partN=w*u；N=sum(partN)、score=25*N/W。以整數N排序；相同N穩定保留options原順序，competition rank為1,1,3，tied遍歷所有相同N方案。 |
| `public/js/app.mjs:24` `candidate`／`:40` `refresh` | draft weight為文字；候選驗證後同步score；任何無效／缺分數立即替換結果，清舊排行。方向變更保留原評分並refresh。 |
| 同檔 `:61` `renderResults` | `#results`重建全部排行；每方案details包含原N/W與逐準則贡献公式，按option id保留展開狀態。已显示rounding提示，但沒有方案間共享差異表。 |
| `public/js/i18n.mjs`、兩語 `public/*index.html` | 排名、并列、benefit/cost解释、主觀分數限制與缺漏文案已存在。新差異不得只出現在單語頁。 |

W≤800、每partN≤400、每N≤3200，差值仍可用精確整數。現有分數schema不允許任意小數；不能為驗差而新增此輸入。

### 比較對象與平手規則

1. score成功時取現有 `ranked[0]` 與 `ranked[1]` 作 first/second；順序與排行顯示完全一致。這只是確定解釋對象，不是 tie breaker。
2. 若 first/second 的N不同：顯示「A 與 B 的總分差為 33.33 分（依目前權重與評分）。」／`A and B differ by 33.33 points under your current weights and scores.` 可以稱目前排名較高，不稱最佳或推薦。
3. 若N相同：顯示「A 與 B 並列，總分差 0.00 分。」／`A and B are tied; their total difference is 0.00 points.` 各準則的正負差仍展示，不以零總差隱去取捨，不說first擊敗second。
4. 顯示所有與first同名次的方案名；若有至少三方案並列第一，寫「A、B、C 並列第 1 名；此明細比較原順序中的 A 與 B。」不可把C說成第2或未入前列。
5. 若第一名唯一、第二名多人並列，顯示完整第二名群組：「B、C 並列第 2 名；此明細比較 A 與原順序在前的 B。」不要說B是唯一第二名。
6. 群組名次和對象以N與rank決定，不比較兩位小數字串、不用labels字母順序。不新增「破平手」分數、随机、姓名或隐藏偏好。方案至少2個，所以有效比較必有一對。

### 算法與新增純函式契約

建議新增 `public/js/core/comparison.mjs`、匯出 `compareLeadingPair(input)`；复用 `scoreDocument(input)` 的验证、排序与part numerator，不再實作另一套utility或排名公式。錯誤原樣回 `{ok:false,code}`／`missingCount`，沒有部分差異表。成功回固定程式資料，例如：

```text
{
  firstOptionId, secondOptionId,
  firstRank, secondRank,
  firstRankOptionIds: string[], secondRankOptionIds: string[],
  totalWeight, totalDeltaNumerator, totalDeltaScore,
  tied: boolean,
  criteria: [{
    criterionId, weight, direction,
    firstRawScore: null|integer, secondRawScore: null|integer,
    firstNumerator, secondNumerator, deltaNumerator,
    firstContribution, secondContribution, deltaContribution,
    active: boolean
  }]
}
```

- 每準則 `deltaNumerator=firstPartN-secondPartN`，有正／負／零；`deltaContribution=25*deltaNumerator/W`。
- `totalDeltaNumerator=firstN-secondN`、`totalDeltaScore=25*totalDeltaNumerator/W`。總差從整數總分子計算，不相減展示文字或加總已四捨五入的列。
- row順序為文件原criteria順序，每項完整列出；最多8項。第一／第二 raw score由對應option id找到doc.scores，不能使用排行位置當原scores行index；排序後很容易算錯引用。
- `weight=0` 的partN與contribution／delta一律0，active=false；null raw score保留未評分，不把null顯示為已填0分。不能因0權重null阻止本来合法的排序。
- 所有數字有限、N與差分子為safe integer；positive显示如 `+33.33`、negative `−33.33`，精確0显示 `0.00` 並寫「此項相同」，不出现−0.00。两方案贡献與差皆保留兩位小數供顯示，計算只用未rounded數值。
- 可對純函式補無mutation、差分子逐項合計等于總差分子的性質測試。內部資料不併入draft或下载document，不改变schemaVersion1、serializeDocument或JSONimport。
- 若owner选择在既有scoring增加派生helper而非新增檔，仍須保持單一公式來源与上述可測行為；主代理據此縮小最後allowed paths，不拆給另一實作owner。

### UI、狀態、可及性

- 在既有ranking后／附近显示短比較摘要與一張最多8行的「前列方案差異」表，預設可見；不需要用户分别展开两方案、心算相减。既有逐方案明細仍在。
- table caption含完整first／second名稱与差值方向；欄位为準則（含效益／成本文字）、權重／占比、first的原評分和貢獻、second的原評分和貢獻、`first − second` 差值。評分1..5與百分制贡献不能只放兩個没有label的数字。正負差另配「A較有利／B較有利／此項相同」文字，不只用紅綠。
- cost型表头與説明仍写「成本／越低越好」，raw score含義為成本負擔程度。某方案score較低時貢獻較高；文案只说在该準則較有利，不能猜成本單位、錢額或「更便宜」。
- 0權重行显示「未計入」、權重0／0.00%、貢獻0.00／差0.00，原評分仍显示1..5或未評分。保留这行讓人核對哪個考量被忽略。
- 总差、對象／同名次群組是常見內容，always visible；formula推導继续使用现有单層details。表可在標名區內局部水平捲動；320px只表内横滚，方案名40字與英文較長也不裁切。周邊摘要／動作仍重排。
- `refresh` 隨名稱、權重、方向、分數、增刪項或确认import更新；每次新valid state以新排行選對象，无效／missing／zero weight時同一次更新清舊差異／總差／名字。不把上一对方案的文字配上新分数。
- import待确认时保留当前有效draft的結果并依既有dialog锁背景；合法确认才一次性换草稿并重算；取消／坏檔不改变当前差异。清空取消保留结果、确认清空回未评分且没有比较。重载不储存差异或上次对比对象。
- 新表无秘密操作与网络，status只宣告就绪／缺漏／并列摘要，不每次输入朗读整张差异表。用户名称安全DOM、table/th/caption语义与原格accessible name保留。
- 新旧rounding提示统一改为「各项分别四捨五入，显示值相加可能与总分或总差不同；合计由原始分子计算。」英文对等，不把差异上限写成0.01。现行8项可达到0.04差（下方U08-08），这项文案修正直接服务新差异表的正确解释。

```text
桌面／手機：既有可編輯矩陣（主要画布）
             排名／各方案明細
             A／B總差或並列、完整同名次群組
             [有名稱的局部差異表：最多8項]
             原始分子總差／四捨五入说明
```

### 精確驗收案例

基準B是本工具既有TECHNICAL schema：options A/B；c1便利benefit weight2、c2負擔cost weight1；A評分[5,5]、B[3,1]。所有數值以現有schema構建fake doc，不讀真檔。分數／差顯示要求exact字串；未rounded numeric tolerance≤1e−12。

| ID | 输入／操作 | 精確預期 |
|---|---|---|
| U08-01 | 基準B | W=3；A/B N均8、均66.67、rank1並列、first=A second=B；c1貢獻A=200/3、B=100/3、deltaN=4、delta=+100/3→`+33.33`；c2A=0、B=100/3、deltaN=−4、delta=−100/3→`−33.33`。totalDeltaN=0、totalDeltaScore=0.00；两方案並列，没有胜者。不能用66.67−33.33算出33.34。 |
| U08-02 | 基準B改 A=[5,1]、B=[3,1] | A N12/100.00，B N8/66.67；c1 delta=+100/3，c2 delta=0；总差25*(12−8)/3=`33.33`。所有行原評分／权重／方向对应本doc。 |
| U08-03 | 單c1 cost weight1；原doc顺序A=5、B=1 | rank first=B 100.00、second=A 0.00；表firstRawScore=1、second=5，partN4/0、delta=+100.00。不是用rank index取原scores[0]导致原分颠倒。切benefit保留raw分数後first=A、second=B与表名一起重算。 |
| U08-04 | 單benefit weight1，doc顺序A/B/C/D分5/5/5/1 | ranks1/1/1/4、A/B/C並列首位；pair A/B、total0、每准则delta0；完整声明三人并列及按原顺序比较A/B，没有「A为第一、B第二」或C落选。 |
| U08-05 | 同四方案分5/4/4/1 | ranks1/2/2/4；pair A/B，B/C同第二完整揭露；totalDeltaN=1、totalDeltaScore=25.00，C没有被改名次。改变原options顺序将C放B前且scores同步时，pair A/C而群组仍含B/C。 |
| U08-06 | 权重[1,0]，A=[5,null]、B=[3,null] | W1；A100/B50、total50；c2 raw两null显示未评分、active=false、两partN0、贡献0.00、差0.00、未计入；不回missing。 |
| U08-07 | 所有权重0；另正权重一格null；另名称／权重無效 | 分别ZERO_WEIGHT、MISSING_SCORES with exact missingCount、现有固定invalid码；全部没有排名／总差／对比表，也无NaN/Infinity或上一对残留。修正后只显示最新有效pair。 |
| U08-08 | 8个benefit准则，各weight1；A各评分2、B各评分1 | W8；A各partN1、每贡献／差3.125→3.13；B皆0；A N8 score25.00、B0、totalDeltaN8、总差25.00。八个rounded差值合计25.04但总差仍25.00，提示不声称只可能差0.01、不补造−0.04准则。 |
| U08-09 | 基準B在ready时把A便利改未评分，再改回5；改權重、方向、标签 | 缺漏时当次清整表及旧pair；恢复后基准66.67并列与±33.33。所有其他改变当次以新doc重算／对应名称，不复用旧id/列位置的差。 |
| U08-10 | 名称合法字符串 `<img src=x onerror=alert(1)>`；下载／匯入roundtrip | 排名／caption／同名次名单均仅文字、无img/alert/request；serializeDocument结果仍exact schemaVersion1，无comparison/rank/contribution/newmeta字段，原文件交换行为不变。 |
| U08-11 | 数据深拷贝后compare；遍历weight0/1/100、score1..5与benefit/cost | 原doc无mutation；deltaNumerator各项合计exact totalDeltaNumerator；贡献总差与25*deltaN/W在≤1e−12内一致且有限；有效排序不变，0权重null不读成评分。 |
| U08-12 | import合法预览后取消／确认；清空取消／确认；两语键盘、320px、200%zoom、8×8／40字名称 | 取消／壞檔保留当前比较；确认取代才显示新pair；确认清空不留差异。两语同样解释tie／cost／zero weight／rounding，table区内可读完整对照，周边不横向溢出。 |

`W≤800` 且N差为整数使任何非零总差至少25/800=0.03125；因此现有范围内不能构造「显示分数同为两位小数却N不同」案例。不要为追求此不可达fixture放宽weight上限；直接测试用N判平手与上述有理数／rounding即可。

### 原功能對話允許改檔建議與 acceptance

產品範圍僅 `tool-projects/08-decision-matrix/` 下的新增 `public/js/core/comparison.mjs`，既有 `public/js/app.mjs`、`public/js/i18n.mjs`、`public/index.html`、`public/en/index.html`、`public/styles/app.css`；新增 `test/comparison.test.mjs`、`test/comparison-controller.test.mjs`，及对应 `test/scoring.test.mjs`、`test/i18n.test.mjs`；`PRODUCT.md`、`TECHNICAL.md`、`ACCEPTANCE.md`、`UX-SEO.md`、`HANDOFF.md`、`docs/VERIFICATION.md`與本任務紀錄。`dist/`只由既有build生成。若helper整合入scoring，由主代理以`public/js/core/scoring.mjs`替换新增comparison路径。schema／import／file-io／matrix增删纯函数／shared tokens／安全標頭／發布腳本不需要本輪修改。

在本工具目录：`npm.cmd test`（script=`node --test`）、`npm.cmd run check`、`npm.cmd run build`；正式候选用现有 `npm.cmd run build -- --production --origin=https://decide.glossquote.com`。增量可先 `node --test test/comparison.test.mjs test/comparison-controller.test.mjs test/scoring.test.mjs test/i18n.test.mjs`；最終settled版本既有full gate一次，Git環境另 `git diff --check` 與完整來源審查。真正瀏覽器沿 `npm.cmd run dev` 驗U08-09/10/12、既有import／clear保留／确认流程与无外部请求。

風險／停止條件：成本方向误解、按排行index取原doc score、以rounded值算差、把「显示在前」写成独有赢家、多人并列遗漏、0权重null变成0评分，以及旧表未清。如果任一案例不符、纯helper另写了不同公式、交換JSON带衍生字段、文案自动推荐、旧结果混新label、无法键盘读取或新增network/storage，停止此candidate發布并回原owner修正。无需外部决策模型、AI解释或任何新credentials。

## 正式派工與交付契約

先讀根與本工具AGENTS、當前HANDOFF及實際code/修改；遵守本批OUTCOME-BATCH-2026-10-13.md。只改本工具列明public/test/spec/docs與本任務紀錄；新增模組若既有check需要更新精確allowlist，允許必要scripts/check的最小變更及回歸，不能降低安全gate。可以維護本工具既有reviewed發布副本與專用.runs/08-decision-matrix-outcome-2026-10-13/。08 helper可放core/comparison.mjs或core/scoring.mjs，保留單一公式。不得改其他工具、共享status、首頁、持久Windows環境或讀憑證/部署。

必要自動化前後執行使用者check-persistent-environment.ps1，完整Environment fingerprint不得變動；假資料、無runtime依賴、原限制/取消/隱私/精度/安全/雙語SEO門檻保留。原owner需完成focused與package必要test/check/preview/release gates、同步current文件並保留舊驗收歷史；PUBLIC更新既有KYStr獨立repo，核對遠端commit及visibility，提供固定source ZIP與manifest，不含node_modules/憑證。

完成回覆此原對話：任務ID、實際改檔與行為、執行命令/exit/結果、未驗項/風險、PUBLIC固定commit、ZIP/manifest/本機URL、是否釋放產品寫入權。主代理會實際收取並讀diff與獨立驗證，之後才正式發布和交外驗。新版不得沿用舊版外部通過；新權限/依賴/成本/範圍衝突或兩輪同因無進展時保存證據並具體停止回報，不無限重試、不自行改模型。
