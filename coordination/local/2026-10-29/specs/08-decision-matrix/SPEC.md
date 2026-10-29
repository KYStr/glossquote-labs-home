# 權重決策矩陣 — 既有規格保存

Task ID: `labs-08-decision-matrix` · Spec ID: `spec-08-decision-matrix`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：權重決策矩陣

原 MVP 已實作並於 2026-10-11 發布；歷史規格如下。2026-10-13 的 U08 前列方案差異為新候選，狀態與驗收以 HANDOFF／docs/VERIFICATION 最新紀錄為準，不繼承舊版外驗結果。

## 工作與固定選擇

使用者比較幾個已知方案。工具只把使用者的主觀權重與評分依明示公式組合；結果應能逐項核對。不能把「排名第一」寫成適用所有人的最佳選擇。

| ID | 需求與硬性規則 |
|---|---|
| FR-01 | 初始標題「我的比較」、方案「方案 A」「方案 B」、準則「考量 1」「考量 2」，各權重1、方向benefit，各分數null。初始不排名。方案最少2最多8、準則最少1最多8。原生按鈕增刪；不能只靠拖曳。 |
| FR-02 | 標題trim後1–80 Unicode code points；方案/準則名稱trim後1–40。原输入上限標題160／名稱80 UTF-16 code units；先拒絕未配對surrogate、C0/C1控制字元及U+202A..202E、U+2066..2069雙向控制字元，再NFC正規化與String.trim、最後驗證碼點長度。即使控制字元位於頭尾也不可先trim掉而放行。方案名稱彼此不能完全相同，準則名稱彼此不能完全相同；比較大小寫敏感。所有文字只能當文字呈現，不作HTML/URL/公式。 |
| FR-03 | 準則權重為0–100的整數，預設1。UI只接受ASCII數字、可有前導0與首尾ASCII空白，raw長度≤8，禁止小數／科學記號／正負號。權重0代表不計入排序；總權重0時不排名，提示至少一項大於0。結果旁顯示標準化權重比例，無需權重合計100。 |
| FR-04 | 準則方向只有benefit（越高越好）、cost（越低越好），預設benefit。每格是選單：未評分(null)或1/2/3/4/5，沒有自由小數輸入。成本型填的是成本／負擔程度，不是「滿意程度」；變更方向保留原分數並即時重算，欄名始終顯示方向。 |
| FR-05 | 效益u=score-1、成本u=5-score；各為0..4。方案加權分子N=sum(weight*u)，总權重W=sum(weight)，百分分數=25*N/W。任一權重>0的格子缺分數時，整份比較不顯示排序或部分總分，提示尚缺幾格；0權重格缺分數可計算。 |
| FR-06 | 按N由大到小排序；所有方案使用相同W，直接比較整數N判斷平手。平手以原方案順序呈現，名次採competition rank（1,1,3），標示「並列」，不偷偷挑一個贏家。顯示分數固定2位小數、0..100；排序先算真值，不依四捨五入文字。 |
| FR-07 | 結果區顯示分數、名次、N/W公式與每項加權貢獻；公式為百分制但不是機率。輸入修改同步重算，無效/缺漏立刻清舊排名。無自動推薦文案。 |
| FR-08 | 新增方案預設依可用順序命名「方案 3」等；新增準則「考量 3」等，選不重複名稱。新分數均null、權重1、方向benefit。刪有任意已填分數的方案或準則先在該區顯示兩個選項「保留」「移除」；空項可直接移除。低於最小數量不可移除。清空全部一律先確認「保留目前比較」「清空並重設」，確認後回初始且焦點標題。 |
| FR-09 | 可用「下載比較檔」下載完整草稿JSON，包含null缺值與0總權重，但標題/名稱/權重結構必須有效。固定檔名glossquote-decision-matrix.json、UTF-8 application/json。匯出前說明檔案會包含自行輸入的文字；不自動下載或覆寫既有檔案。下載是否實際完成由瀏覽器管理，介面只能說「已交給瀏覽器下載」。 |
| FR-10 | 「開啟比較檔」只讀使用者選取的一個檔案，最大65536bytes。UTF-8、schemaVersion=1、完整exact schema見TECHNICAL，未知欄位/重复key/未知版本/越界/NaN/非法引用皆拒絕。合法檔案先預覽標題、方案數、準則數，再讓人「取消」或「取代目前比較」；確認之前不修改工作草稿。任何失敗原資料保持。 |
| FR-11 | 匯入讀檔、驗證、等待確認皆可取消；新檔案/取消/清空要使舊讀檔結果失效。正在待確認時鎖定背景編輯避免覆蓋新資料；對話關閉還原焦點。匯出URL於替換、清空、離開及下載後合理時機撤銷。 |
| FR-12 | 預設只有記憶體，無storage、帳號、分享、雲端、分析、URL內容或日誌。使用者自選下載檔案是唯一持久化途徑；清除不刪使用者已下載檔案，文案明示。載入同源資產後，計算/讀檔/下載不對外傳資料。 |
| FR-13 | 矩陣提供表頭與每格完整名稱，鍵盤可完成所有操作。320px以可標記的表格內水平捲動保留二維比較，外頁不橫向捲動；200%頁面縮放仍可操作。無File/Blob/TextDecoder等必要能力時匯入匯出禁用並說明，核心計算仍可用；JS/ESM失敗則靜態說明保留。 |

## 錯誤、資料與完成

錯誤碼：`INVALID_SCHEMA`、`UNKNOWN_VERSION`、`DUPLICATE_KEY`、`TOO_DEEP`、`FILE_TOO_LARGE`、`INVALID_UTF8`、`INVALID_JSON`、`INVALID_LABEL`、`DUPLICATE_LABEL`、`INVALID_WEIGHT`、`INVALID_SCORE`、`INVALID_REFERENCE`、`MISSING_SCORES`、`ZERO_WEIGHT`、`LIMIT_REACHED`、`MINIMUM_REQUIRED`、`READ_FAILED`、`EXPORT_FAILED`。將固定碼映射人類文案，不回顯raw exception、檔案內容或本機路徑。

不合法draft可以暫留欄位供修改，但不能排名或匯出。沒有自行儲存或自動恢復；重新整理回預設空評分表。ACCEPTANCE通過才是本機MVP完成；公開發布另案。模版庫、圖表、檔案格式擴充、權重敏感度分析都留待未來，禁止順手加入。

## U08 前列方案的準則貢獻差（2026-10-13）

使用者完成評分後，可在原排名下直接核對前兩個顯示方案的取捨；逐方案明細仍保留。新表最多8行，顯示準則／方向、權重／占比、兩個方案各自的原評分與百分制貢獻，以及前者減後者的差值。正／負差均附哪個方案在此準則較有利的文字，零差寫「此項相同」。成本原評分仍表示負擔程度，不能推測錢額或更便宜。

對象只取既有 stable ranked[0]/ranked[1]；完整列出與它們同名次的方案，包含三人以上並列第一及多人並列第二。不以原顯示順序製造勝者、不新增任意 pair 選單或推薦算法。權重0仍顯示未計入、0貢獻／0差與原評分；null 顯示未評分。

差值與總差由原始整數分子計算；顯示值分別四捨五入，相加可能與總分或總差不同，沒有0.01上限宣稱。無效、正權重缺分或總權重0在當次 refresh 清除整個差異區；新合法資料立即重選 pair。匯入／清空取消或壞檔保留原結果，確認才替換／重設。差異不進草稿、URL、storage 或原 schemaVersion1 匯出。


---

## 原文件 TECHNICAL.md

# 技術規格：權重決策矩陣

這是規格，尚未實作。遵守 [工程](docs/ENGINEERING.md) 與 [安全](docs/PRIVACY-SECURITY.md)。原生HTML/CSS/瀏覽器ESM，Node.js24+離線測試，無runtime套件。

## 檔案與命令

```text
package.json
scripts/{serve,check,build}.mjs
public/index.html
public/styles/{tokens,app}.css
public/js/app.mjs
public/js/file-io.mjs
public/js/core/schema.mjs
public/js/core/json-import.mjs
public/js/core/scoring.mjs
public/js/core/matrix.mjs
test/{scaffold,schema,import,scoring,matrix,file-io,boundaries}.test.mjs
docs/RESEARCH.md
docs/VERIFICATION.md
dist/
```

大括號為檔案列舉縮寫。T00建立dev=`node scripts/serve.mjs`、test=`node --test`、check=`node scripts/check.mjs`、build=`node scripts/build.mjs`。serve綁127.0.0.1:4173，只供public、拒路徑穿越／未知路徑；check真查ESM語法、必要檔案、危險DOM／外部資源／禁止持久化；build只複製public至受限本專案dist，不包輸入與測試。不要npm install、CDN或遠端字型。

## 唯一交換schema v1

```json
{
  "schemaVersion": 1,
  "title": "我的比較",
  "options": [
    {"id": "o1", "label": "方案 A"},
    {"id": "o2", "label": "方案 B"}
  ],
  "criteria": [
    {"id": "c1", "label": "便利", "direction": "benefit", "weight": 2},
    {"id": "c2", "label": "負擔", "direction": "cost", "weight": 1}
  ],
  "scores": [
    {"optionId": "o1", "values": [5, 5]},
    {"optionId": "o2", "values": [3, 1]}
  ]
}
```

exact keys：根物件剛好schemaVersion/title/options/criteria/scores；option剛好id/label；criterion剛好id/label/direction/weight；score row剛好optionId/values。以Object.keys長度與每個名稱白名單檢查；禁止未知欄位含`__proto__`、`constructor`、`prototype`。只接受非null普通JSON物件，不接受陣列代替物件。不要把任意輸入Object.assign到狀態或原型。

schemaVersion必須number整數1；options長度2..8，criteria長度1..8，scores長度等於options。id固定ASCII：option=`^o[1-9][0-9]{0,5}$`、criterion=`^c[1-9][0-9]{0,5}$`，各自唯一。scores順序必須與options完全相同，每列optionId=同位置option.id，values長度=criteria長度，values第j格對應criteria[j]。不接受不明引用、缺列、多列或重排的scores。

固定錯誤對應：重複id、score row次序錯誤、未知optionId回INVALID_REFERENCE；陣列長度或物件欄位結構不符回INVALID_SCHEMA。無效id格式也回INVALID_REFERENCE，不讓呼叫端猜測錯誤類別。此JSON僅為手算範例，不是初始草稿；`createDefaultDocument()`必須依PRODUCT FR-01建立兩方案、兩準則、全null分數及權重1。

weight必須Number.isInteger且0..100；values元素只能null或Number.isInteger且1..5，不強制將字串轉數字；direction只接受benefit/cost。每個label/title依PRODUCT的NFC/trim/長度/禁控制字元規則驗證；匯入可正規化，但不能靜默截短；正規化後重複名稱拒絕。根title不能空，預設「我的比較」。所有數字及中間值必须有限。

JSON最多65536byte，UTF-8可有開頭單一BOM，由TextDecoder處理；以`new TextDecoder('utf-8',{fatal:true})`拒絕壞位元組。先檔案size閘門，再arrayBuffer，再實際byteLength閘門，再解碼；JSON.parse只做語法解析，不能當schema驗證。JSON.parse遇Infinity字面會失敗；`1e999`雖可解析成Infinity，schema仍拒絕。

JSON.parse後仍檢查原文重複key與深度：grammar已合法，用迭代scanner逐字走原JSON，正確跨越字串及反斜線escape；每遇`{`推入含Set及expectKey=true的object frame，`[`推array frame，深度>8回TOO_DEEP。每個object的key字串用JSON.parse該完整字串token還原escape，再檢查該frame的Set，重複回DUPLICATE_KEY；冒號將expectKey設false、當前object層逗號重設true；子陣列／物件自己的逗號不能改父frame。不能用正則單獨判斷JSON重複key；`"title"`與`"\u0074itle"`必須視為重複。scanner需有單獨測試，不能遞迴未知深度輸入。

## 純函式契約

模組歸屬固定：schema.mjs匯出validateDocument；json-import.mjs匯出parseImportBytes與serializeDocument並包含重複key scanner；scoring.mjs匯出scoreDocument；matrix.mjs匯出createDefaultDocument與增刪函式。file-io.mjs只負責瀏覽器讀檔／下載／取消，不能另外維護不同的schema或公式。

- `validateDocument(value)`→`{ok:true,value:全新正規化document}` 或 `{ok:false,code}`，不修改輸入。將shape/欄位類型先驗證再處理文字或數字；未知版本單独回UNKNOWN_VERSION。UI raw draft先明確解析字串權重再建立candidate，不能把JSON import字串權重視同UI數字。
- `parseImportBytes(bytes)`→同上，僅接受Uint8Array、上限65536；順序為byte檢查→UTF8→JSON→重複key/深度→validateDocument。錯誤不含原文。
- `scoreDocument(doc)`→`{ok:true,value:{totalWeight,ranked:[{optionId,numerator,score,rank,tied,contributions}]}}`或錯誤。先validateDocument；W=0回ZERO_WEIGHT；再數權重>0的null格，缺漏回MISSING_SCORES並只附`missingCount`整數；沒有部分排行。
- 分子N=`sum(weight*(benefit?score-1:5-score))`。0權重格不讀score而貢獻0。W≤800、N≤3200，是精確整數。score=25*N/W；contributions各項=25*w*u/W，展示2位小數但總分直接從N算，不加總已四捨五入貢獻。各項分別四捨五入，顯示值相加可能與總分或總差不同；不宣稱最多差0.01。8項各3.125顯示3.13時合計25.04，原始總分仍25.00。
- 排序用`b.numerator-a.numerator`，相同N維持options原序。rank=前方N更高的方案數+1，tied=任一其他方案N相等。分數展示`score.toFixed(2)`；權重百分比同樣兩位但不反向作計算。
- `serializeDocument(doc)`→`Result<Uint8Array>`，固定回`{ok:true,value:bytes}`或`{ok:false,code}`。先validateDocument，失敗原樣傳遞該schema錯誤碼；成功後用`JSON.stringify(normalized,null,2)+"\n"`建立字串，再以TextEncoder編成UTF-8 Uint8Array，無BOM；確認byteLength≤65536。編碼／序列化例外或此輸出上限失敗一律EXPORT_FAILED，不帶例外或原文。只輸出schema字段，不帶排名、日期、版本外meta、瀏覽器或裝置識別。下載adapter以`new Blob([result.value],{type:"application/json"})`使用bytes，不再JSON.stringify或二次編碼。
- `addOption/removeOption/addCriterion/removeCriterion` 回`{ok:true,value:全新document}`；增至超過上限回LIMIT_REACHED，刪至低於下限回MINIMUM_REQUIRED，無效引用回INVALID_REFERENCE，失敗原document不變。ID取當前未使用的最小正整數尾碼，移除後可重用。陣列增刪同步更新score行/列。新增名稱以原項目數+1起向上找最小未使用編號名稱（例如兩個預設方案之後是方案3）；禁止重排而不同步values。UI確認流程不放在純函式內。

## 匯入狀態與安全DOM

### U08 衍生比較契約

`core/comparison.mjs` 匯出 `compareLeadingPair(input)`，只呼叫既有 `scoreDocument`，不另寫 utility、validation 或排名公式。失敗原樣回固定錯誤／missingCount，沒有部分 value。成功 `{ok:true,value}` 保留 `totalWeight/ranked` 供原排行共用，另有 `firstOptionId/secondOptionId/firstRank/secondRank/firstRankOptionIds/secondRankOptionIds/totalDeltaNumerator/totalDeltaScore/tied/criteria`。

兩方案取 stable ranked 的前兩項，完整群組依原 rank 取得。每列 criterionId／weight／direction／active、原 raw score、兩個 part numerator／contribution 與 delta。raw scores 透過 optionId Map 查原文件列；準則維持文件順序。ΔN=firstPartN−secondPartN，Δ=25×ΔN/W；總ΔN=firstN−secondN，總Δ直接用整數總差，不減顯示值或加總 rounded 列。0權重列的 numerator/contribution/delta 為0，raw null不變。

`i18n.formatSignedPoints` 只格式化顯示：正 `+33.33`、負 Unicode minus `−33.33`、精確零及−0均 `0.00`。新增 view 不進 input、schema、serializeDocument 或 import。`refresh` 共用此成功 value 重建原 ranking 和整個比較 section；失敗 replaceChildren 後只留原無排名提示。比較表具 caption/th scope、有標名 tabindex=0 的局部橫捲區，整表不是 live region。

工作狀態`draft-invalid|incomplete|ready`；IO狀態`idle|reading|review|error`。開始選檔時記`generation++`，讀檔前檢查size，reading提供取消。每次await後先核對generation；舊結果一律丟棄。取消、另選檔、清空、pagehide使generation遞增。File.arrayBuffer本身不能可靠中止，取消表示取消後續套用並釋放引用，不聲稱立刻停止OS讀取。

合法匯入進review，候選與当前draft分離；背景編輯鎖定，確認取代才一次性套用全新document，取消保留原draft。file input value讀後清空，允許重選同檔；關閉還原焦點。失敗不改draft且可重選。沒有自動fetch與檔案系統任意路徑存取。

下載用Blob及單一Object URL、固定安全檔名；user click觸發a.download。每次新下載前撤銷前URL；觸發後至少留到下一個task，建議60秒後撤銷以避免瀏覽器過早失效，清空/pagehide也撤銷並清timeout。記錄URL與timer引用供測試，重複下載不可無限積累。沒有判斷瀏覽器下載成功的假回報。Blob API不可用只禁用IO，保留核心。

所有標題、label、import預覽用textContent/value，DOM id用程式固定id而非名稱。使用table/caption/th scope及表格內可focus捲動區；分數select accessible name包含方案名＋準則名＋方向。

## 官方依據與研究閘門

2026-09-23查閱：[W3C File API](https://w3c.github.io/FileAPI/)（使用者選檔、Blob與Object URL生命週期）、[WHATWG Encoding](https://encoding.spec.whatwg.org/#interface-textdecoder)（UTF-8解碼及fatal錯誤模式）、[ECMAScript Number](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.isfinite)（有限數與整數檢查）。公式與排名是本產品明定的加權模型，不代表官方替決策模型背書。

T01核對目標瀏覽器File.arrayBuffer、TextDecoder fatal、Blob下載與object URL撤銷的實際行為；記錄docs/RESEARCH.md的日期／版本／未測平台。不得因API缺少而上傳檔案到替代服務。


---

## 原文件 UX-SEO.md

# 介面與 SEO：權重決策矩陣

原 MVP 已實作並發布；2026-10-13 U08 是待主驗的新候選，歷史規格保留如下。Product App模式，遵循 [設計系統](docs/DESIGN-SYSTEM.md)。核心是可編輯比較表，不是AI對話或「最佳選擇」大卡片。

桌面：

```text
GlossQuote-Labs / 權重決策矩陣         [開啟比較檔] [下載比較檔]
比較標題 [我的比較]
準則設定：名稱 | 方向 | 權重 | 移除       [新增準則]
方案／分數  | 便利 ↑   | 負擔 ↓   | 操作
方案 A      | [未評分] | [未評分] | 移除
方案 B      | [未評分] | [未評分] | 移除   [新增方案]
尚缺4格評分。效益越高越好，成本越低越好。
結果排序與加權明細                       [清空全部]
公式／資料處理／使用說明／FAQ
```

手機：

```text
權重決策矩陣
比較標題 [我的比較]
[開啟比較檔] [下載比較檔]
準則設定（直向列表）
比較表（區內左右捲動）
  方案 | 準則1 | 準則2
[新增方案] [新增準則]
缺漏／結果與明細
[清空全部]
```

table區是主要工作面；只有此二維區可以水平捲動，周邊說明與按鈕重排。不要把矩陣拆成相互難對照的大卡片。方向文字不能只靠↑↓；準則設定與表頭都寫「效益／越高越好」或「成本／越低越好」。結果在表旁或下方，使用有序清单／表格；明細是一層可展開項。

## 狀態與復原

| 狀態 | 文案／互動 |
|---|---|
| 初始／缺分數 | 「請為每個有效準則評分。尚缺 4 格。」數字按真實缺漏更新。沒有假排名。 |
| 無效名稱／權重 | 「請輸入名稱。」／「請使用 0 至 100 的整數權重。」就地錯誤，舊排名清除。 |
| 總權重0 | 「至少一項準則的權重需大於 0，才能比較。」不除以0。 |
| ready | 「依目前權重與評分排序」；每列名次、分數、必要時「並列」。附「分數呈現你的輸入，不代表客觀最佳答案」。 |
| reading | 「正在讀取你選擇的比較檔…」＋「取消」。 |
| review | 顯示標題、方案數、準則數；「取代後，目前未下載的比較內容將消失。」預設焦點「取消」，另一選項「取代目前比較」。 |
| 匯入失敗 | 「這個檔案不符合比較檔格式。目前比較未更動。請選擇此工具下載的 JSON 檔。」上限錯誤改說「檔案超過 64 KiB」。不顯示raw error。 |
| 匯出 | 「已交給瀏覽器下載。檔案包含你輸入的標題、名稱、權重與分數。」不宣稱下載已完成。 |
| 清除確認 | 「保留目前比較」「清空並重設」；補「已下載的檔案不會被刪除」。 |
| IO不支援 | 「此瀏覽器無法開啟或下載比較檔；仍可在本頁比較。」核心不封鎖。 |

刪除已有分數的行列需局部兩選項，取消保留原值與焦點；按「移除」才動作。重設也需要確認，但沒有登入或通知權限。待確認dialog使用原生dialog與可用fallback，焦點限制於dialog、Esc取消、關閉回原按鈕。

所有可編輯格有完整accessible name；方向與錯誤文字朗讀。新增行列後焦點移新名稱；刪除後焦點移相鄰項或新增按鈕。polite僅提示缺漏數／狀態變更，避免每次重算朗讀全表。44px觸控目標、雙層focus、合規對比；320px、200%頁面縮放、40%長標籤與reduced-motion全部測試。惡意文字用安全純文字呈現，不自動產生連結。

## SEO 草案

- slug：`/tools/decision-matrix/`。
- title：`權重決策矩陣｜比較方案、權重與評分 — GlossQuote-Labs`
- description：`用自訂準則與權重比較 2 至 8 個方案，區分效益與成本並查看加權分數。資料在本頁處理，可自行下載與開啟 JSON 比較檔。`
- H1：`權重決策矩陣`
- 首段：`把你的選項與考量列出來，設定每項的重要程度，再為方案評分。查看各項貢獻與排序，讓自己的取捨更容易核對。`
- FAQ「權重要加起來等於100嗎？」答「不用。工具會按總權重換算比例；權重0的準則不計入。」
- FAQ「成本型怎麼給分？」答「成本型評的是成本或負擔程度：1代表低、5代表高；計算時會反轉成越低越有利。」
- FAQ「有些格沒填會怎樣？」答「任何大於0權重的格子未評分，就暫不顯示排行；避免用缺少資料的分數比較。」
- FAQ「第一名一定最適合我嗎？」答「排名由你設定的準則、權重與分數計算。它幫助整理取捨，不替代你對情境的判斷。」
- FAQ「可以保存再繼續嗎？」答「可自行下載JSON比較檔，之後再選檔開啟。本工具不自動儲存或同步；清空不刪除已下載檔案。」

static HTML承載metadata/說明/FAQ，不用虛構評價、流量或商標背書。此階段robots=noindex,nofollow；正式URL確認與發布授權前不產canonical/sitemap，不發佈、不上架。不要聲稱100%安全或任意Excel相容。

## U08 介面增量（2026-10-13）

沿既有 Product App worksheet/tokens；不重設頁面版型。主要物件仍是可編輯矩陣。常用內容依序為原排行／逐方案 details、前列 pair 總差或並列、完整同名次群組、單一準則差表、原分子總差與統一 rounding 說明。新表預設可見，推導保留原單層 details，沒有選 pair、推薦或 what-if 動作。

```text
可編輯矩陣 → 原排名／明細
           → A/B 總差／並列與完整群組
           → 有名稱的局部差異表（最多8行）
           → 原分子合計／各項四捨五入說明
```

兩語 table caption 明示完整方案名及 first−second 方向；原評分與百分制貢獻各帶文字標籤。準則含 benefit/cost 及未計入標記；正負差配較有利方案名，0寫此項相同。長名稱於表頭／摘要換行；表區 tab focus 後可局部橫捲，周邊文案重排。work-status維持短 ready／缺漏狀態，不將每次整表更新設成 live announcement。

新版本的原生雙語、鍵盤、320px／40字／8×8與200%驗證必須另有證據；離線 DOM contract harness 不代表真瀏覽器或 assistive technology 通過。最新結果見 docs/VERIFICATION。維持既有雙語 canonical/SEO 建置與同語首頁，不改本輪正式 hosting 或首頁。


---

## 原文件 ACCEPTANCE.md

# 驗收：權重決策矩陣

這是規格，尚未實作。以下案例全部待執行，固定假名稱與數值，不讀真實個人檔案。JSON假檔以Node內建TextEncoder/Buffer從本文schema產生到測試暫存目錄；測試結束清理本專案指定目錄，不能掃描使用者下載資料夾。

基準B為TECHNICAL完整schema示例：便利benefit權重2、負擔cost權重1；A=[5,5]、B=[3,1]。

| ID／FR | 種類 | 輸入／操作 | 預期 |
|---|---|---|---|
| M01／01,05 | 自動 | 初始2×2，兩權重1，全null | MISSING_SCORES,missingCount=4；無排名 |
| M02／05,06,07 | 自動 | 基準B | W=3；A的N=8、B的N=8；各66.67，rank均1、tied=true，A先B後；contributions的A兩項為200/3與0，B兩項為100/3與100/3，數值誤差各≤1e-12 |
| M03／04,05 | 自動 | B改A=[5,1]、B=[1,5] | A的N=12、score100.00、rank1；B的N=0、score0.00、rank2 |
| M04／06 | 自動 | 單準則benefit權重1、A/B/C分數5/5/1 | 排名1/1/3；A/B均並列，C不並列 |
| M05／04 | 自動 | 單準則cost權重1，A=1 B=5 | A100.00 rank1；B0.00 rank2；改benefit後排序反轉 |
| M06／03 | 自動 | 所有權重0，包括null格 | ZERO_WEIGHT；無NaN/Infinity或排行 |
| M07／03,05 | 自動 | 權重[1,0]，A=[5,null] B=[3,null] | 可排序，A100.00 B50.00；不回缺漏 |
| M08／05 | 自動 | 基準B的A第一格null | MISSING_SCORES,missingCount=1；整份無排名 |
| M09／02 | 自動 | 重複option label；下方M09明定fixture的兩個NFC等值名稱；空title | 前兩DUPLICATE_LABEL；後INVALID_LABEL |
| M10／02 | 自動 | title81個a、label41個a、label含換行或U+202E或未配對U+D800（含位於頭尾的控制字元） | 均INVALID_LABEL；不截短、不先trim繞過 |
| M11／03,04 | 自動 | JSON weight=-1/101/1.5/"2"/Infinity；score=0/6/1.5/"5" | 前組INVALID_WEIGHT；後組INVALID_SCORE |
| M12／10 | 自動 | root多欄位；option多__proto__；缺title；version2 | 前三INVALID_SCHEMA；最後UNKNOWN_VERSION |
| M13／10 | 自動 | 下方M13明定fixture：一次測字面重複title，一次測JSON escape還原後重複title | 兩者均DUPLICATE_KEY，不能採最後值；不得把escape測成含反斜線的普通key |
| M14／10 | 自動 | 65537byte；UTF8 bytes C3 28；`{"x":`；深度9的合法JSON陣列 | FILE_TOO_LARGE；INVALID_UTF8；INVALID_JSON；TOO_DEEP |
| M15／10 | 自動 | 重複option id；scores少行／倒序；values長度不合；未知optionId | INVALID_REFERENCE；結構長度問題可固定INVALID_SCHEMA，須依schema模組的固定映射測試，不允許成功 |
| M16／09,10 | 自動 | 初始doc與基準B分別呼叫serializeDocument；成功後把result.value這個Uint8Array傳parseImportBytes | 皆回原正規化doc；包含null草稿；無BOM且末尾一個LF；不多rank/timestamp欄位。serialize無效doc傳原schema錯誤碼；注入編碼失敗時EXPORT_FAILED |
| M17／01,08 | 自動 | 8方案再新增；1準則再移除；移除中間準則 | 超限/下限拒絕且doc不變；成功移除時各values同索引刪除 |
| M18／02,12 | 手動 | 名稱填`<img src=x onerror=alert(1)>` | 長度合法時完整純文字顯示；無img、alert或網路，仍可計算與匯出 |
| M19／10,11 | 自動＋手動 | 有工作B，讀合法檔後取消；讀壞檔；選A再選B且A較晚完成 | 原B保留；失敗不改B；最後只可預覽最新選B，舊A丟棄 |
| M20／10,11 | 手動 | 合法匯入預覽，背景嘗試編輯；取消；再確認取代 | 預覽時背景鎖定；取消原資料／焦點恢復；确认一次性取代，分數按新doc重算 |
| M21／08,12 | 手動 | 移除已填分數列後取消；清空全部取消再確認 | 取消不變；確認重設初始2×2，已下載檔案不被觸碰 |
| M22／09,11 | 自動＋手動 | 连續下載10次；清空；pagehide；下載失敗 | 前URL被撤銷、最多1個liveURL、timeout清理；固定檔名；失敗保留draft、EXPORT_FAILED |
| M23／12 | 手動 | 清Network後輸入、計算、匯入本機假檔、下載；重整 | 無對外請求、URL/storage/log無工作資料；重整初始狀態 |
| M24／13 | 手動 | 鍵盤增刪行列、評分、匯入、dialog取消；讀屏 | 格名含方案+準則+方向、焦點合理、Esc取消、不靠滑鼠完成 |
| M25／13 | 手動 | 320px、200%頁面縮放、8×8、40字名稱 | 只有表格區可水平捲、操作可達、外頁不橫向捲動、不裁文字 |
| M26／13 | 手動 | 阻止File/Blob/TextDecoder能力；另禁用JS | IO禁用並說明，核心可計算；無JS保留靜態說明、無假結果 |
| M27／05,06,07 | 手動 | 載入基準B並確認取代；展開兩方案的加權明細；把A的便利評分改成未評分，再改回5 | 兩方案均顯示並列第1名、66.67分，公式25×8÷3；A的貢獻顯示66.67與0.00，B顯示33.33與33.33，總分仍66.67並附四捨五入差異說明。改未評分後立即清除全部舊排名／分數／明細，顯示尚缺1格；改回5後恢復上述結果。畫面沒有「最佳選擇」或替人決定的推薦文案 |

M15固定錯誤碼為：重複id／row次序／未知optionId→INVALID_REFERENCE；scores或values長度不合→INVALID_SCHEMA。這是已定契約，測試不能接受任意錯誤。M17純函式使用`LIMIT_REACHED`／`MINIMUM_REQUIRED`固定回傳碼，UI將它們映射數量限制提示。M16的編碼失敗採測試注入假encoder，不改原生全域、也不要求正式函式讓使用者控制encoder；可將編碼helper作為模組內部依賴注入點。

## M09／M13 的精確測試資料

以下為可直接放進Node測試的JavaScript，並非產品實作。M09使用碼點建構，第一名稱是一個U+00E9，第二名稱為U+0065及U+0301兩個碼點；兩者不是含有反斜線的字面文字。

```js
const nfcFixture = {
  schemaVersion: 1,
  title: "NFC 測試",
  options: [
    { id: "o1", label: String.fromCodePoint(0x00e9) },
    { id: "o2", label: String.fromCodePoint(0x0065, 0x0301) }
  ],
  criteria: [
    { id: "c1", label: "便利", direction: "benefit", weight: 1 }
  ],
  scores: [
    { optionId: "o1", values: [5] },
    { optionId: "o2", values: [3] }
  ]
};
// validateDocument(nfcFixture) => { ok: false, code: "DUPLICATE_LABEL" }
```

M13的String.raw模板保留JSON文字中的單一反斜線；JSON key的原始文字是引號、反斜線、u0074itle、引號，JSON解碼後必須是title。不要把這個單一反斜線再加倍。以下兩段JSON都含完整schema，只由重複key造成拒絕。

```js
const duplicateLiteral = String.raw`{"schemaVersion":1,"title":"A","title":"B","options":[{"id":"o1","label":"方案 A"},{"id":"o2","label":"方案 B"}],"criteria":[{"id":"c1","label":"便利","direction":"benefit","weight":1}],"scores":[{"optionId":"o1","values":[5]},{"optionId":"o2","values":[3]}]}`;
const duplicateEscaped = String.raw`{"schemaVersion":1,"title":"A","\u0074itle":"B","options":[{"id":"o1","label":"方案 A"},{"id":"o2","label":"方案 B"}],"criteria":[{"id":"c1","label":"便利","direction":"benefit","weight":1}],"scores":[{"optionId":"o1","values":[5]},{"optionId":"o2","values":[3]}]}`;
for (const source of [duplicateLiteral, duplicateEscaped]) {
  const bytes = new TextEncoder().encode(source);
  // parseImportBytes(bytes) => { ok: false, code: "DUPLICATE_KEY" }
}
```

對每個分數與權重作有界測試：score1..5、weight0/1/100，各方向下分數必在0..100；同時增加所有方案同樣的正權重倍數且不超100時排序與分數不變。這些性質測試不能替代M02–M05手算案例。

逐項記錄docs/VERIFICATION.md：命令、自動／手動區別、瀏覽器版本、日期、狀態、缺陷與復測。`npm test`不代表檔案下載或畫面已通過；不能把「點擊成功」當作使用者硬碟保存成功。
# U08 增量驗收（2026-10-13）

原驗收歷史保留；新版不能沿用舊版外驗通過。精確 fixture 均為 schemaVersion1 的合成資料。執行結果在 docs/VERIFICATION，不由本表的預期推定 PASS。

| ID | 必要結果 |
|---|---|
| U08-01 | 權重2/1 benefit/cost，A[5,5]/B[3,1]均66.67並列；逐項整數差+4/−4，顯示+33.33/−33.33；總差0.00，沒有勝者。 |
| U08-02 | A[5,1]/B[3,1]總分100.00/66.67，總差由原分子12−8得33.33。 |
| U08-03 | cost A5/B1排序B/A，raw score1/5按ID取得；切benefit後raw不變，pair及表名同步重選。 |
| U08-04 | 四方案5/5/5/1，ranks1/1/1/4，完整A/B/C並列第一，pair原序A/B。 |
| U08-05 | 四方案5/4/4/1，ranks1/2/2/4；B/C第二群組完整。同步調換原序後pairA/C，不改競賽名次。 |
| U08-06 | 權重1/0，A[5,null]/B[3,null]可算100/50；inactive原null仍未評分、未計入，貢獻／差0。 |
| U08-07 | 全0權重、正權重null、無效名稱／權重各回既有固定錯誤，無部分排名或舊pair／總差／表。 |
| U08-08 | 八項weight1 benefit，A全2/B全1，各差3.125顯示3.13；rounded合計25.04，原分子總差25.00，不造補差列或0.01上限。 |
| U08-09 | 評分／權重／方向／標籤及增刪當次重算；新無效／缺漏立即清舊區，修正後只顯示最新pair。 |
| U08-10 | script-looking名字只textContent；計算前後serialize bytes相同，匯入仍exact schemaVersion1，沒有衍生欄位。 |
| U08-11 | frozen doc無mutation；900個weight0/1/100、benefit/cost、score1..5的獨立oracle；逐项ΔN合計等於總ΔN，未rounded誤差≤1e−12，所有數有限／分子safe integer。 |
| U08-12 | 匯入待確認／取消／壞檔及清空取消保留，確認才重算或清除；兩語原生操作／keyboard／320px／200%／8×8／40字，局部表捲動與周邊重排。 |

focused：`node --test test/comparison.test.mjs test/comparison-controller.test.mjs test/scoring.test.mjs test/i18n.test.mjs`。settled版本必要 gate：`npm.cmd test`、`npm.cmd run check`、preview build、`npm.cmd run build -- --production --origin=https://decide.glossquote.com`；有意義的來源差異做 `git diff --check`。Windows environment-key fingerprints前後一致。未跑原生項目如實 NOT_RUN；必要結果錯、殘留、schema改形、不安全DOM或隱私回歸阻止候選發布。


---

## 原文件 TASKS.md

# 實作任務：權重決策矩陣

流程以 AGENTS.md 的「閱讀與執行」「交付與收斂」為準：沿用本 session 已讀文件，只補讀變動／相關段落；同一授權工作依序推進，不因任務切換重問。各任務 allowed paths、前置條件與必要驗收保持有效，缺陷回到其擁有任務修正；來源發布依適用的既有明確授權，不包含網站部署。

本文件定義任務；實際進度以 HANDOFF.md 與最新驗收紀錄為準。依序一次一項，依 AGENTS.md 的 session 閱讀規則讀取當前任務所需內容。allowed paths均相對本專案；未列不改，不做未授權發布、不裝套件、不讀私人檔案。

## 2026-10-10 任務入口的範圍補充（較新授權）

按 TASK-ENTRY.md：預覽／fixture 埠改為 4188／5188；候選網址 decide.glossquote.com；本對話只發布獨立來源，不正式部署、不寫首頁、不讀憑證。以下補充不放寬核心公式、安全或數量限制。

- **T03-L10N**（T02 後、T03 前）：建立完整 zh-Hant/en 語系及靜態英文頁骨架，供 T03–T05 共用；allowed paths `public/js/i18n.mjs`、`public/en/index.html`、`public/index.html`、`test/i18n.test.mjs`、`HANDOFF.md`。驗收語系 key 對齊、原始碼兩語 H1/說明與 matching-language home；`npm.cmd test`、`npm.cmd run check`。工作內容不由網址或 storage 自動帶入另一語頁。
- **T06-SEO**（與 T06 同一階段）：較新任務入口要求可驗證正式 SEO 準備，取代舊「不加 canonical/sitemap」限制；來源仍 noindex。allowed paths `public/en/index.html`、`public/404.html`、`public/_headers`、`scripts/{build,check,serve}.mjs`、`test/{scaffold,seo}.test.mjs`、`wrangler.jsonc`、`.gitignore`、`README.md`、`project.json`、`docs/VERIFICATION.md`、`HANDOFF.md`。build 預設 preview/noindex；`--production --origin=https://decide.glossquote.com` 才生成 canonical、雙向 hreflang/x-default、sitemap/robots 及標頭；測試產物與 MIME/404。這是建置模式，不代表已上線。
- **T08 來源發布與候選交接**（T07 後）：allowed paths `scripts/publish-source.mjs`、`docs/RELEASE-CANDIDATE.md`、`README.md`、`project.json`、`HANDOFF.md`；及 TASK-ENTRY 指定的 `.runs/decision-matrix`、`.runs/github-publish/glossquote-labs-decision-matrix`。用審查過的 allowlist 副本，保留副本歷史，只公開該工具；驗證 PUBLIC、remote HEAD、來源/產物清單。記 READY_FOR_INTEGRATION 或具體阻塞；人工 NOT_RUN 獨立列示。正式部署與首頁整合交回原主對話。

## T00 專案骨架

- 前置：依 AGENTS.md 完成本任務所需文件閱讀。
- allowed paths：`package.json`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`public/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`public/js/app.mjs`、`test/scaffold.test.mjs`、`HANDOFF.md`。
- 工作：private/type=module/Node>=24/四項npm scripts、無dependencies；建立loopback只供public的server、拒穿越測試、真檢查脚本、限定dist建置腳本；空HTML有H1/noindex。
- 驗收：`node --version`，腳本建立後 `npm test`、`npm run check`；`npm run dev`人工確認127.0.0.1及非法路徑拒絕後停止server。無需npm install。
- 完成：命令有效，HANDOFF記實際結果。

## T01 檔案能力與模型核對

- 前置：T00通過。
- allowed paths：`docs/RESEARCH.md`、`HANDOFF.md`。
- 工作：核對官方File/Blob/TextDecoder資料並實測目標瀏覽器；手算M02–M05，確認效益/成本公式、同分與缺值規則；記官方URL/日期/版本與未測限制。
- 驗收：人工核對64KiB上限、下載限制與不支援fallback；`npm run check`。
- 完成：無未決公式或schema選擇；HANDOFF記結果，發現重大衝突先停。

## T02 Schema、JSON與評分核心

- 前置：T01通過。
- allowed paths：`public/js/core/schema.mjs`、`public/js/core/json-import.mjs`、`public/js/core/scoring.mjs`、`public/js/core/matrix.mjs`、`test/schema.test.mjs`、`test/import.test.mjs`、`test/scoring.test.mjs`、`test/matrix.test.mjs`、`HANDOFF.md`。
- 工作：exact keys、Unicode界限、bytes/UTF8/JSON重複key、引用、整數評分與ranking；不可用JSON.parse代替schema；實作增刪同步；覆蓋M01–M17與固定錯誤碼。
- 驗收：`node --test test/schema.test.mjs test/import.test.mjs test/scoring.test.mjs test/matrix.test.mjs`、`npm run check`。
- 完成：獨立手算案例、壞檔案、roundtrip通過；HANDOFF列案例。

## T03 工作矩陣與可見結果

- 前置：T02通過。
- allowed paths：`public/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`public/js/app.mjs`、`docs/VERIFICATION.md`、`HANDOFF.md`。
- 工作：依UX建table、準則設定、增刪及確認、缺漏提示與結果明細；所有文字safe DOM；完成M18/M21/M24中核心流程/M25。
- 驗收：`npm test`、`npm run check`、`npm run dev`；手動鍵盤、320px、200%頁面縮放與8×8，結束後停server。
- 完成：不完整資料無假排行、焦點完整，HANDOFF記瀏覽器與畫面證據。

## T04 自願檔案IO與競態

- 前置：T03通過。
- allowed paths：`public/js/file-io.mjs`、`public/js/app.mjs`、`public/index.html`、`public/styles/app.css`、`test/file-io.test.mjs`、`docs/VERIFICATION.md`、`HANDOFF.md`。
- 工作：使用者選檔／size先驗／generation取消／review取代確認、固定檔名匯出與Object URL撤銷；測試注入讀檔promise及URL API，實作M19/M20/M22/M24的dialog流程。
- 驗收：`npm test`、`npm run check`；人工用本機合成JSON走開啟/取消/取代/下載，檢查原草稿不被壞檔案改動。
- 完成：過期讀檔不能套用、下載不累積URL，HANDOFF記實測IO及未測平台。

## T05 邊界與隱私

- 前置：T04通過。
- allowed paths：`public/js/core/schema.mjs`、`public/js/core/json-import.mjs`、`public/js/core/scoring.mjs`、`public/js/core/matrix.mjs`、`public/js/file-io.mjs`、`public/js/app.mjs`、`public/index.html`、`public/styles/app.css`、`test/boundaries.test.mjs`、`docs/VERIFICATION.md`、`HANDOFF.md`。
- 工作：補大小邊界/控制字元/escape重複key/快速多次取消測試、完成M23/M26；檢查不讀任何未選檔案、不持久化／無外部網路；只修已證明缺陷。
- 驗收：`npm test`、`npm run check`，人工Network/storage與能力缺失測試。
- 完成：所有必要隱私案例通過；HANDOFF如實記失敗或未測，不提前勾全部。

## T06 靜態SEO與本地建置

- 前置：T05通過。
- allowed paths：`public/index.html`、`public/styles/app.css`、`docs/VERIFICATION.md`、`HANDOFF.md`、`dist/**`（僅build產生）。
- 工作：靜態title/description/H1/公式/FAQ；保留noindex；不加canonical/sitemap／虛構評價。
- 驗收：`npm run check`、`npm test`、`npm run build`；確認dist只有公開靜態資產，不含範例工作檔、測試或docs。
- 完成：HANDOFF記產物檢查，保持尚未發布。

## T07 全驗收與交接

- 前置：T06通過。
- allowed paths：`docs/VERIFICATION.md`、`HANDOFF.md`、`dist/**`（只允許既有build輸出）。
- 工作：執行ACCEPTANCE全部案例，核對diff及需求覆蓋，記支援平台、已知限制、下一步。
- 驗收：`npm test`、`npm run check`、`npm run build`與完整瀏覽器驗收。
- 完成：全部必要項通過才寫「本機MVP驗收完成，尚未發布」；失敗回對應任務修正，T07不擴大程式修改範圍。
# 2026-10-13 active milestone：U08-CONTRIBUTION-DELTA-20261013

交付與12個精確驗收以 OUTCOME-UPGRADE-2026-10-13.md 為準。原owner單獨實作，不再委派。現有排行／JSON schema／資料生命週期不變；只新增沿 stable ranked 前兩個方案的準則差異、完整同名次群組及相應雙語 UI／測試／current docs。

allowed paths：public/js/core/comparison.mjs、public/js/app.mjs、public/js/i18n.mjs、兩語index、public/styles/app.css、test/comparison*.test.mjs、test/i18n.test.mjs、PRODUCT/TECHNICAL/ACCEPTANCE/UX-SEO/HANDOFF/TASKS/docs/VERIFICATION；必要精確check allowlist及dist既有build，專用.runs/08-decision-matrix-outcome-2026-10-13與reviewed獨立發布副本。schema/import/file-io/matrix/scoring原函式與shared tokens/header未修改。禁止其他工具／root shared／首頁／部署／憑證／新依賴／持續Windows環境。

當前 focused 純計算及實際 app 離線 DOM contract tests PASS；原生 Chrome 操作在進入本工具前被自動審查停止（無法確定目前URL），沒有原生結果可宣稱。主代理後續明確授權保留這項NOT_RUN後做候選source-only發布／固定ZIP，由主代理另開可明確綁定URL的新分頁做必要原生驗收，再決定正式部署。package gates與固定來源審查另記HANDOFF。新版待主驗／live／外驗，不標版本complete。

本輪owner milestone交接：44/44 final tests／check／preview15／production16／staged whitespace皆exit0，PUBLIC固定commit `024fad2beb937a1f8cb0e22fab6af490518373e7`、42檔source ZIP／Git blob SHA manifest已核驗，Windows fingerprints不變。native NOT_RUN由主代理接手，preview63055/session16065保留；產品寫入權已釋放。詳見HANDOFF末段，沒有新版部署或外驗通過宣稱。


