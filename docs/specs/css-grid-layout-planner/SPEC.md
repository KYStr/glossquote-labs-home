# CSS Grid 區塊配置表 / CSS Grid Layout Planner

Spec ID：`spec-css-grid-layout-planner-v1`  
版本：v1 r1，2026-10-30  
交付：完整製作規格候選，待非作者完整度審查；不是產品實作、品質通過或部署。

## 1 目標與成功條件

### 1.1 對象與問題

製作活動頁、小型儀表板或內容頁的人，需要把矩形區塊放在指定網格位置，理解跨格、留白及視覺／來源順序差異。本工具以可見數字欄位設定線座標，明確按產生後看真 CSS Grid 與位置表，帶走固定 selector 的 CSS。

這是需求假設，未聲稱訪談、使用率或節省時間。工具不選最佳設計、不建立完整網站；語意標籤、內容、Tab順序及各裝置適配由頁面作者負責。拒絕重疊是本產品的限制，**不是 CSS Grid 本身不允許重疊**。

### 1.2 可觀察成果

1. 非作者只讀頁內說明即可建出上方跨三欄、下方左一欄與右兩欄的三區塊配置，理解線座標與終點不含。
2. 增刪、來源排序、座標設定均有正常可見控制，不依賴拖曳、隱藏hook或讀原始碼。
3. 縮網格時明示超界，重疊時指出兩塊；不默默搬動、縮短、刪除或自動排好。
4. 真預覽、位置／跨度表、占用／空白格數、CSS、複製及下載對應同一不可變快照。
5. 編輯立即令舊結果不可新取出；晚到回調不復活舊結果，已提出下載的有限URL lease與結果有效性分開。
6. 至少一款實際桌面Chromium完成正常旅程與檔案核對；純函式、DOM替身或作者截圖不可替代必要品質證據。

## 2 範圍與固定來源

### 2.1 能力與非目標

| 項目 | 包含 | 排除 |
| --- | --- | --- |
| 網格 | 1–6欄、1–6列；等比例欄；24–160 CSS px固定列高；0–32 CSS px共用gap | 混合track、任意單位、implicit tracks、自動放置、named areas、subgrid、巢狀網格、媒體查詢 |
| 區塊 | 1–12個不重疊矩形，明確row/column start/end，空格合法、可調來源順序 | 最佳化排列、內容測量、自由名稱、任意形狀、拖曳必要流程 |
| 結果 | 真CSS Grid、序號／座標／跨度表、格數、確定CSS | HTML匯入／匯出、圖片、Canvas、PNG/PDF、列印、歷史／分享URL |
| 使用 | 繁中／英文、鍵盤、明確產生／清除／複製／下載 | 帳號、遠端服務、遙測、應用持久化、檔案輸入、剪貼簿讀取 |
| 技術 | 原生靜態HTML/CSS/ESM、Node24內建、零runtime/dev外部依賴 | 安裝套件、CDN、新repo／服務／workflow／部署／費用／憑證／權限 |

固定寬度預覽是比較條件；匯出等比例欄由目標容器寬度決定，不保證響應式或內容適配。不得用瀏覽器自動修正掩蓋超界或起訖非法；不產生implicit tracks。

### 2.2 固定來源及去重

開工：[BRIEF 6c956a57](https://github.com/KYStr/glossquote-labs-home/blob/6c956a57f5ef3cafc690adb1d4b3c72a6ccb144d/docs/specs/css-grid-layout-planner/BRIEF.md)。主頁：[README 26525d5](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。未替repo選license；公開source不等再利用授權。

| 相近項 | 固定來源 | 本件必要差異 |
| --- | --- | --- |
| 標籤列印 | [30-label-printer](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/30-label-printer/SPEC.md) | 紙張模板／份數展開不同於網頁跨格座標；本件無列印 |
| 箱內排列 | [33-box-fit](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/33-box-fit/SPEC.md) | 三維容量及朝向不同於瀏覽器二維明確配置 |
| 照片聯絡表 | [45-image-contact-sheet](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/45-image-contact-sheet/SPEC.md) | 圖片依序填滿／PNG不同；本件不讀圖，允許指定跨度和留白 |
| 線性漸層 | [aaa8ff63 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/aaa8ff63e8673efccc0c21ff2d32632a510f7f42/docs/specs/linear-gradient-builder/SPEC.md) | 外觀色彩停止點不是區塊布局 |
| 卡片陰影 | [ee9683cb SPEC](https://github.com/KYStr/glossquote-labs-home/blob/ee9683cb60a4823e14768a26e24b782f59c6acac/docs/specs/box-shadow-builder/SPEC.md) | 陰影繪製不改位置／跨度，本件不重做外觀編輯 |
| Option Matrix | [a691bbc5 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/a691bbc5bd984feb032bd450990abf083496d153/docs/specs/option-matrix/SPEC.md) | 笛卡兒積列舉不是配置表，本件不列舉布局候選 |

[catalog快照](https://github.com/KYStr/glossquote-labs-home/blob/eed6e533c077ffc351f0f015836f314d4e37a31e/catalog.json)的56項不是ready庫存。開工前核72份規格和既有PR未有本件同用途規格；保留既有owner，不將reserved、reviewing或consumed算可取庫存。每次接工重新讀最新registry，不固定採用本段歷史數量。

### 2.3 CSS語義依據

參考 [W3C CSS Grid Level1固定2025-03-26草案](https://www.w3.org/TR/2025/CRD-css-grid-1-20250326/) 的明確線座標、tracks和來源順序。視覺定位不改DOM閱讀次序；不能把移動位置當作可及性修復。欄列上限、重疊拒絕、狀態機和輸出模板是產品決策，不冒稱標準要求。

## 3 正常流程與生命週期

### 3.1 初始與產生

初值：columns=`"3"`、rows=`"2"`、rowHeight=`"80"`、gap=`"8"`；一塊rowStart=`"1"`、columnStart=`"1"`、rowEnd=`"2"`、columnEnd=`"2"`。初值不是結果，畫面顯示「尚未產生 / Not generated」，無位置表／CSS／取出能力。產生可按，placeholder不冒實際填值。

頁首用短句解釋線座標、終點不含、重疊限制、來源順序和輸出需搭配直接子元素類別。正常流程：調網格→逐塊填座標→「產生配置 / Generate layout」→全部驗證及原生能力成功→一次提交預覽／位置表／CSS→取出。沒有input即時生成。第7節例A可作頁內閱讀範例表，不暗中載入有效結果或要求額外一鍵範例功能。

### 3.2 編輯、增刪、來源排序

每塊fieldset/legend「區塊 N / Block N」，四欄獨立label、範圍與關係說明。數值使用type=text/inputmode提示，不用number/valueAsNumber改寫raw，不以maxlength靜默截短貼上。產生才檢查首錯，不在輸入時自動夾值。

新增附加座標1/1/2/2，**不找空格**；可能與既有塊重疊，由下次產生明示。最多12塊，上限新增停用且有原因；焦點到新塊rowStart。至少1塊，最後一塊刪除停用。刪除後聚焦原索引的新塊rowStart；刪最後則聚焦前塊。內部穩定ID管理焦點，不復用已刪ID，不進核心或匯出。

「前移來源 / Move earlier」「後移來源 / Move later」交換完整記錄，保留座標與ID；端點停用、偽造無效果事件也不能變資料。焦點跟被移動塊rowStart；序號按新來源順序從1重編，CSS的grid-item-N同步。位置不因序號改變而自動重新排版。說明外部HTML需同來源次序／類別；不是只換CSS就能修閱讀順序。

任何input/change/compositionstart、有效增刪或排序：先增加結果generation，清動態預覽規則、結果節點、位置表、textarea與成功訊息，撤新取出權，再更新草稿。舊CSS不留隱藏DOM。即使改回原值也須重產生；composition期間禁止產生，compositionend不自動生成。端點無效果操作不算改動。

縮rows/columns不搬動／縮短／刪除既有塊；超界要自行修。新增欄列也不拉伸既有塊。H/gap改動同樣失效舊結果。

### 3.3 交易與錯誤

產生是同步有界交易（最多36格／66對矩形）：先撤前結果，抓當刻raw快照，驗證成功後只使用標準化值準備新節點與規則，能力檢查／套用成功才提交全部結果。CSSOM/DOM失敗全清，不能摘要新而畫面舊。相同raw重產生CSS逐byte相同，但generation不同。

只顯示固定首錯，含欄位或兩塊序號，不回顯raw／原生stack。aria-invalid與錯誤關聯，焦點到該欄；重疊到後一塊rowStart；根schema/數量/能力錯誤到可聚焦摘要。再編輯清原錯誤但不宣稱有效，仍需產生。

結果為R×C、每塊N的起訖／列跨度／欄跨度、occupiedCells／emptyCells、readonly CSS與取出鈕。面積按格計，不扣gap；gap不是空白格。任一錯誤整筆拒絕，無部分成功。

### 3.4 複製與下載

複製只有目前結果有效、頁面可用、無modal且無pending時，明確click一次writeText(css)。不讀clipboard，不用execCommand自動備援。單一pending、固定5,000ms期限不續期；pending期間複製停用。編輯／重產生／清除／hidden/pagehide使token失效，晚到成功或失敗不得寫UI。原生操作不能保證撤回，明示「取消只停止本頁回報；系統複製可能仍完成」。拒絕／逾時只在仍同快照時顯示手動選取readonly textarea備援，無假成功。

下載固定檔名`grid.css`、MIME`text/css;charset=utf-8`，Blob bytes為當刻已生成css。單一存活URL lease，無排隊、dataURL或ZIP。接受click先鎖新下載，再建Blob/URL、短暫接入固定download anchor，click一次後移除anchor；顯示「已提出下載，請在瀏覽器確認 / Download requested; check your browser」，不宣稱落盤。

lease從建立起30,000ms固定上限，存活期間新下載停用。edit、清除、重新產生、連按都不提前revoke、替換或延長已啟動lease；它可有限保留一份已失效快照，但不提供任何新的舊結果取出。邏輯到期即不得開始新舊快照取出；timer或下一次可執行入口負責清URL/timer，只有當下有效結果才開新下載。lease token與結果generation分開，舊timer不能撤新URL；每個下載入口核deadline，清理冪等、不靠timer準時。

Blob/createObjectURL/anchorclick拋錯立即清已建資源與失敗lease，當下同快照顯示可重試錯誤。瀏覽器沒有本工具可用的下載完成ACK；30秒是邏輯期限，不是主執行緒被凍結時也能精準撤URL的wall-clock保證。事件迴圈恢復後先清逾期lease，不續期；這只保留有界取出權，不保證下載已接收或儲存。不可同時承諾「等接收才撤」卻無觀察方法。

### 3.5 清除、離開與恢復

清除開正常modal，「清除並重設 / Clear and reset」恢復初值，「取消 / Cancel」留草稿；開modal先失效pending複製回報，背景不可操作，Esc取消，焦點返回觸發鈕。取消保留有效結果；確認清結果/草稿後填初值，但不提前終止既有下載lease。

語言連結若草稿曾改或結果存在先確認丟棄；取消留原頁，確認只導航固定相對URL，不帶raw/query/hash。無改動且無結果時正常導航。

hidden/pagehide/dispose是明示提前purge例外：失效結果與回報token，清raw/輸出後填初值，撤lease/timer、關modal。回visible/pageshow不自動生成，提示「離開後已重設，請重新輸入 / Reset after leaving; enter values again」。BFCache不得復活舊值；reload為新初值。dispose成對移除監聽器，晚到callback無作用。背景／離頁可能中止未接收下載；本頁清理不保證OS安全抹除、刪下載或撤回clipboard。

## 4 輸入輸出契約

### 4.1 純核心與結構順序

`generateLayout(raw)`為純同步，回`{ok:true,value}`或`{ok:false,error}`，一般非法使用者輸入不throw。raw只為普通Object或null-prototype物件，恰有own enumerable data keys `columns,rows,rowHeight,gap,blocks`。前四為字串，blocks為1–12項密集Array；每塊恰有`rowStart,columnStart,rowEnd,columnEnd`四字串data keys。不允多餘字串／Symbol key、getter/setter、holes或Array額外屬性（標準length除外）。不用String/Number隱式轉型、不呼叫getter。跨realm／Proxy不是這個有限API支持輸入，不宣稱能安全檢視任意敵意JS Proxy；產品只傳自己建的data物件。

固定驗證次序：

1. 根形狀／descriptor／前四值型別及blocks是否Array；否E_SCHEMA/root。
2. blocks.length不在1–12先E_BLOCK_COUNT/blocks，不讀元素。接著Array額外key／holes→E_SCHEMA/blocks；再依索引檢查所有塊的形狀／descriptor／四值型別，首錯E_SCHEMA/block。**所有結構先驗完才驗數值。**
3. 全域字串依columns→rows→rowHeight→gap，每欄長度→格式→範圍；首錯立即回。
4. 區塊依來源序，各欄rowStart→columnStart→rowEnd→columnEnd做長度→格式→範圍；該塊四欄過後先驗rowStart<rowEnd，再columnStart<columnEnd，否E_ORDER/對應end；再驗下一塊。
5. 全值合法後按i=0..n−2，j=i+1..n−1檢查pair，首個面積交集回E_OVERLAP，index=j/field=rowStart/blocks=[i,j]。
6. 生成完整CSS與標準化結果；UTF-8超8,192 bytes防守性E_OUTPUT_LIMIT/output；全過才成功。

error恰含code、field、index（非塊null）、blocks（僅重疊兩索引，其餘null）。區塊結構field=block/index=i；根=root，Array=blocks。UI序號為index+1，不回raw/stack。這是內部純核心契約，沒有JSON檔案匯入或網路API。

### 4.2 raw、範圍與矩形

數字字串長度按UTF-16 code units，0→E_REQUIRED，>3→E_RAW_LENGTH；其餘只接受canonical ASCII整數：`0`、無前導零正整數、或負號加非零正整數。`-0`、`+1`、`01`、空白、LF、全形、指數、小數皆E_INTEGER。負值可通過格式再E_RANGE。不trim、正規化、parseInt截尾或夾值。

| 欄位 | 下限 | 上限 |
| --- | --- | --- |
| columns、rows | 1 | 6 |
| rowHeight | 24 | 160 |
| gap | 0 | 32 |
| rowStart | 1 | rows |
| columnStart | 1 | columns |
| rowEnd | 2 | rows+1 |
| columnEnd | 2 | columns+1 |

起點嚴格小於終點；跨度=end−start。兩矩形重疊iff `min(A.rowEnd,B.rowEnd)>max(A.rowStart,B.rowStart)` 且 `min(A.columnEnd,B.columnEnd)>max(A.columnStart,B.columnStart)`。共邊／共角不重疊；完全相同、包含、十字交叉均拒絕。cells=rowSpan*columnSpan，occupiedCells為各面積和，emptyCells=rows*columns−occupiedCells。不以像素近似判重疊。

例：columns=`"7"`、H=`"23"`、gap=`"-1"`均E_RANGE；gap=`"00"`/`"-0"`/`"1e2"`→E_INTEGER；H=`"1600"`→E_RAW_LENGTH。根getter不執行而E_SCHEMA；第一塊rowStart非法但第二塊多key先E_SCHEMA/第二塊，因結構優先。第一塊rowEnd≤rowStart、第二塊值非法先E_ORDER/第一塊。多對重疊固定先(0,1)，不由視覺Z順序決定。

### 4.3 標準化與確定CSS

value恰含columns/rows/rowHeight/gap整數、blocks、occupiedCells/emptyCells/css。blocks每項恰含number（1起連續）、rowStart/columnStart/rowEnd/columnEnd、rowSpan/columnSpan/cells；無內部ID、時鐘或環境資料。controller保留不可變快照，不被表單後改污染。

CSS固定selector、canonical十進位，UTF-8無BOM、LF與最後一個LF；沒有空白行。前6行容器，之後每塊4行，N按來源序。每非空程式行有固定具體中文註解；英／中頁同raw輸出完全同bytes，註解不本地化。例A完整字面expected：

```css
.grid-layout { /* 容器：使用明確網格與固定類別 */
  display: grid; /* 排版：啟用二維網格 */
  grid-template-columns: repeat(3, minmax(0, 1fr)); /* 欄：等比例且允許縮小 */
  grid-template-rows: repeat(2, 80px); /* 列：固定數量與像素高度 */
  gap: 8px; /* 間距：欄與列使用同一數值 */
} /* 容器規則結束 */
.grid-layout > .grid-item-1 { /* 區塊1：對應直接子元素 */
  grid-row: 1 / 2; /* 列線：起點包含、終點不含 */
  grid-column: 1 / 4; /* 欄線：起點包含、終點不含 */
} /* 區塊1規則結束 */
.grid-layout > .grid-item-2 { /* 區塊2：對應直接子元素 */
  grid-row: 2 / 3; /* 列線：起點包含、終點不含 */
  grid-column: 1 / 2; /* 欄線：起點包含、終點不含 */
} /* 區塊2規則結束 */
.grid-layout > .grid-item-3 { /* 區塊3：對應直接子元素 */
  grid-row: 2 / 3; /* 列線：起點包含、終點不含 */
  grid-column: 2 / 4; /* 欄線：起點包含、終點不含 */
} /* 區塊3規則結束 */
```

只有模板中的N／合法數字可變；無order、grid-auto-*、grid-area、變數、任意selector、!important、背景、寬度或reset。外部container寬度影響欄寬，對方其他CSS或內容min-size衝突不在一致外觀保證內。

頁內用安全文字展示容器與grid-item-1等直接子元素的結構示意，明示不是HTML下載；N與位置表一致。不能多放未配置子元素，再把瀏覽器自動放置當本工具承諾。預覽600px寬、色彩／序號、min-size輔助樣式不納入匯出。

textarea、writeText、Blob直接使用css，不從innerText/CSSOM重建，不因視覺折行改bytes。最大8,192bytes只防守拒絕、不截斷；作者須算最大12塊模板實際bytes。固定grid.css/text/css;charset=utf-8，無使用者檔名。

## 5 實作、可及性與安全

### 5.1 架構及順序

預定同repo `tools/css-grid-layout-planner/`：index.html、en/index.html、styles.css、core.mjs、controller.mjs、app.mjs、i18n.mjs、tests/*.test.mjs、scripts/check.mjs、scripts/build.mjs、scripts/serve.mjs、README.md、PROVENANCE.md。Node24內建test/assert/fs/http，無npm install、bundler、CDN、外部字型／icon或環境token；若有package.json僅腳本別名，dependencies/devDependencies皆空。

core不碰DOM/clock/network/storage/clipboard/URL；controller接收明確timer/clock與取出依賴，管理generation/modal/copytoken/lease；app接真DOM與生命周期。純測替身必明示，不把注入後結果稱正常產品。新作者碼（含tests/helper）每非空行有具體中文註解；不改第三方固定來源hash來湊。

先寫獨立expected/core，再controller中斷反例、真DOM/CSSOM/雙語、clean check/build、真桌面使用與取出證據，最後逐面向品質。保留首跑失敗／oracle更正；錯測試不算產品bug，核心全綠不等產品完成。

### 5.2 真預覽幾何

stage為600 CSS px內容寬，padding/border/margin0，direction:ltr、writing-mode:horizontal-tb、box-sizing:content-box，align-content:start、justify-content:start；高度由R*H+(R−1)*G自然形成，最大1120px。裝飾格線可選但不參與布局，不得代替真grid。區塊為真直接子元素、來源序同blocks，固定互斥類別。

區塊margin0、min-width/min-height0、box-sizing:border-box、padding4px、overflow:hidden，序號12px/16px固定字體大小／行高及可讀對比，內側outline或box-shadow不影響rect。無animation/transition。小格文字可能裁切，必需座標／序號完整提供外部位置表，不靠色彩或格內字作唯一資訊。輔助樣式不是匯出CSS。

欄寬W=(600−(C−1)*G)/C。區塊相對stage的x=(columnStart−1)*(W+G)、y=(rowStart−1)*(H+G)、width=columnSpan*W+(columnSpan−1)*G、height=rowSpan*H+(rowSpan−1)*G。正常100%zoom幾何核容許各rect邊界±1 CSS px，記完整browser版本、DPR、viewport；不可把截圖devicepx當CSSpx。native測試可唯讀rect/computed style，不寫state/handler/完成flag。其他zoom驗可用性，不要求浮點逐像素相等。

stage在具名、可聚焦、鍵盤可捲的局部scroll region，最大可視高480px；320 CSS px寬可局部雙向捲，但表單／錯誤／按鈕不令整頁橫溢。位置表可轉每塊label/value清單，不強迫超寬table。視覺與來源次序警語保持可見。

### 5.3 DOM／CSS出口與能力失敗

同源外部stylesheet預先有一個限定stage規則與12個`.preview .grid-item-N`規則。只用標準化整數組值、CSSStyleRule.style.setProperty更新grid-template-columns/grid-template-rows/gap，以及各塊grid-row/grid-column；先清舊值及未用規則。沒有自由selector/insertRule/raw cssText/style attribute/innerHTML/eval/Function或字串HTML注入，不把整段匯出CSS貼入style節點。

文字只用textContent、表單value及安全節點。CSS.supports可作能力入口，但不能當幾何已驗收。stylesheet／rule缺失、CSSOM受限／throw、套用失敗都E_PREVIEW_CAPABILITY，清全部結果並顯示固定能力訊息，不留有CSS無預覽的半成功。

CSP至少default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'。不用unsafe-inline/eval。HTTP加nosniff與Referrer-Policy:no-referrer；frame-ancestors只在HTTPheader有效，不拿meta冒稱。meta CSP若備援須放資源前；實測同候選policy/CSSOM，不只搜尋字串。

無輸入檔、clipboard讀取、帳號、網路API、storage/cookie/serviceworker、遙測或含raw的URL。必要靜態GET與固定語言/home導航不是輸入外傳；hosting請求日誌不冒稱app能清除。惡意url/HTML/分號CSS等raw先core拒絕，不到CSSOM或產額外請求。

### 5.4 雙語與可及性

兩語有全部欄位、限制、錯誤、modal、copy／download lease／reset狀態對應鍵。錯誤不拼raw；序號可本地化，CSS固定bytes不變。文案包含必填、長度、ASCII canonical整數、具體範圍、end>start、哪兩塊重疊、能力失敗、copy拒絕／timeout、下載提出／保留中及離開重設。

必要例句：
- 「區塊 2 的列終點必須大於列起點。 / Block 2 row end must be greater than row start.」
- 「區塊 1 與區塊 3 重疊，請調整座標。 / Blocks 1 and 3 overlap. Adjust their coordinates.」
- 「下載保留期間不能再次下載，最長30秒。 / Another download is unavailable during the retention period, up to 30 seconds.」

所有正常控制有Tab/Shift+Tab/Enter/Space，焦點可見，無hover唯一資訊或拖曳必需。fieldset/legend/label及單位清楚，aria-invalid/describedby指向真節點；首錯與live status不重複刷屏。modal有名稱、焦點限制、Esc與返回，背景不可操作。錯誤不只紅色；CSS可鍵盤選取。真200%zoom、320CSSpx、forced-colors與必要讀屏抽查逐項留證；設備不足NOT_RUN，aria存在不等讀屏PASS。

繁中lang=zh-Hant、英文lang=en，title/description/h1完整、同語home及固定相對語言連結。preview noindex；正式URL未知不造canonical/sitemap/live聲明。部署後SEO／互連另核，來源PR不等部署。

### 5.5 可重建與維護交付

README列每檔角色、Node版本、零依賴命令、狀態機、正常瀏覽器入口、限制和未測項。最小擴充教學選「新增一段靜態FAQ」，明確兩語字典／語意結構／check/build／真UI／復原，不在本版悄悄擴row上限。非作者按指南修改、建置、正常看見新增FAQ再回復，原source與產物hash復原，才構成該項證據。

命令：`node --test tests/*.test.mjs`；`node scripts/check.mjs`；`node scripts/build.mjs --mode preview`；`node scripts/serve.mjs --dir dist --port 4180`。check驗語法、雙語key、禁外依賴／URL、中文註解、安全allowlist；build只複製允許runtime檔、產relativepath/bytes/SHA256 manifest，拒symlink、source/output重疊。dist不存在才建，存在拒覆寫，不recursive刪他人資料；README教在新乾淨副本／目錄運行。

serve僅127.0.0.1、GET/HEAD、固定root/path/MIME、拒traversal/symlink/未知Host；不抓CDN或開外網。此為未來正常驗證入口，不宣稱現在已server運行。來源不含私人路徑／對話識別／log／憑證。PROVENANCE列原創與沿用檔、固定brief/source/技術引用與license現況；不補造來源或擅選全repo授權。

## 6 完整九面向產品驗收

所有面向需同固定candidate、方法／預期／可反駁證據，各自至少90且必要檢查完整才accepted。未測NOT_RUN/null，不是0或90；不以平均、測試數、mock、作者聲明或文件ready換品質。規格ready只由非作者核八節布林，不填虛構八項90。

| 面向 | 方法／預期 | 必要證據 |
| --- | --- | --- |
| functionality | 兩語真UI建立例A、留白、12塊、來源排序、修超界／重疊；結果同snapshot | 獨立字面expected、操作紀錄、真grid/rect、兩語CSS與實際下載hash；不能直接呼叫handler冒使用 |
| boundaries | §4 schema/raw/首錯、端點、鄰接／重疊、縮網格、composition、copytoken／lease | §7逐case輸入/expected/actual；純測與真事件各明範圍，不能用綠測蓋原生NOT_RUN |
| privacy | 輸入／產生／錯誤／取出／背景／語言／reload無應用傳輸／持久化，無讀clipboard | 真Network/Storage全程、假canary與source資料流；UI說明不能代出口檢查 |
| security | 限定整數至固定CSS，無raw注入，CSP及安全server有效 | 實際headers/policy/console、惡意負例與零額外請求、人工sink追溯；掃描PASS不等完整安全 |
| usability | 非作者未讀實作，只看可見說明完成例A／留白／錯誤修正／排序／取出，理解end/sourceorder | 實際任務與困惑點，熟手不冒盲首次；結果失效／lease／取消文案不誤稱儲存 |
| accessibility | 兩語全鍵盤、焦點／modal／首錯、局部scroll、200%zoom／320CSSpx、讀屏抽查 | browser/AT名稱版本、焦點及讀出紀錄、截圖和文字／控制對比量測；無資源標未測 |
| localization-seo | 所有狀態雙語完整，同rawCSS exact，同語home／切換正確，preview/正式SEO分明 | 雙語真導航、靜態head/key與bytes；未部署不捏造URL/搜尋索引 |
| toolchain-provenance | Node24零依賴clean test/check/build、來源／notice／中文註解齊，非作者FAQ擴充可回復 | 完整exit/log/filemanifest、來源映射、真可見擴充與復原；作者build不夠 |
| compatibility | 至少一款真桌面Chromium原生幾何/copy可用或拒絕備援/download/hidden/reload/BFCache/窄頁；能力缺失安全退出 | OS/完整版本/viewport/DPR/origin、正常旅程及檔案；其他引擎/mobile明列未測，不擅加實體手機硬門檻 |

本版不需要Canvas/WebGL，不能借遊戲GPU門檻阻擋純CSS工具；但原生CSS、取出、可及性不能由CPU替身代。最多12塊通常短同步運算不是效能認證，仍記錄真阻塞與環境，不創造任意效能分數。

## 7 測試與獨立預期

### 7.1 手算有效例

座標tuple固定順序 `(rowStart,columnStart,rowEnd,columnEnd)`；所有數字進raw時為字串。

**A**：C3/R2/H80/G8，塊1(1,1,2,4)、塊2(2,1,3,2)、塊3(2,2,3,4)。占用6/空白0，跨度(1,3)/(1,1)/(1,2)。stage600×168，欄寬194⅔。relative rects(x,y,w,h)：(0,0,600,80)、(0,88,194⅔,80)、(202⅔,88,397⅓,80)，邊界容許±1CSSpx；CSS等§4.3字面18行。

**B**：同C3/R2/H80/G8，兩塊(1,1,2,2)、(2,3,3,4)，占用2/空白4；rects(0,0,194⅔,80)、(405⅓,88,194⅔,80)。不可自填空格或把塊2搬到column2。交換來源序後座標形狀集合不變，但CSSitem1/2、摘要及DOM閱讀序同步交換。

**C**：C6/R6/H160/G32，12塊依前兩列每列6單格順序，r=1,2/c=1..6/end=r+1,c+1。占用12/空白24，stage600×1120，欄寬73⅓，兩列上緣0/192。最大12塊模板須小於8192bytes。另測單塊(1,1,7,7)占用36/空白0、600×1120；加任何第二塊皆重疊，不可稱有效。

**D**：C1/R1/H24/G0，單塊(1,1,2,2)，占用1/空白0、stage600×24。G32在1×1不加外圍尺寸或空白格，沒有隱式外側gap。

### 7.2 必要案例

| ID | 輸入／操作 | 精確預期與證據 |
| --- | --- | --- |
| T01 | 兩語正常建立A、產生、copy或手動、download | 同snapshot、18行字面CSS/最後LF、真rect與grid.css exact；沒有HTML下載 |
| T02 | B留白及來源排序 | occupied2/empty4、位置不自排；序號／CSS／摘要／DOM一致 |
| T03 | C12塊、新增第13、刪至1再刪 | 12有效，UI新增停用；core13先E_BLOCK_COUNT；最後刪除停用且資料不變；焦點按§3 |
| T04 | C/R各0,1,2,5,6,7；H23,24,25,159,160,161；G−1,0,1,31,32,33 | 配其他合法值，外端E_RANGE內端通過；各獨立case不能被其他錯誤遮蔽 |
| T05 | line各下/等/上端及相鄰、start=end/start>end | 範圍依R/C，start0/end1先E_RANGE；合法端點正跨度通過；反序E_ORDER/end |
| T06 | 共邊/共角/相同/包含/交叉/一格重疊、多對重疊 | 共邊角合法，正面積E_OVERLAP；固定pair順序與後塊rowStart焦點，無結果 |
| T07 | A縮columns2再修回3，H/G改後改回 | 不自搬動；舊結果先撤；產生首塊columnEnd E_RANGE；改回仍須再產生 |
| T08 | raw長度0/1/2/3/4、空白/tab/LF、+1/-0/01/1.0/1e2/全形/emoji/null/number | 固定E_REQUIRED/E_RAW_LENGTH/E_INTEGER/E_SCHEMA順序；不trim/截斷/轉型 |
| T09 | root/塊額外key/Symbol/getter、holes、非Array、13項含getter、多錯誤 | 結構優先、不呼叫getter；count13不讀元素；error固定keys、不回raw |
| T10 | copy pending→edit/clear/regenerate/hidden，晚到resolve/reject/timeout、連按 | 單request/5s不續期；舊token零UI更新，新結果不被舊success污染；備援可鍵盤用 |
| T11 | download→即edit/clear/regenerate/連按，29,999/30,000/30,001ms，舊timer晚到 | 原lease至原期限，新下載停用且不替換／續期；到期只current可下載，舊timer不撤新URL |
| T12 | Blob/URL/click throw，hidden/pagehide/dispose/BFCache | 已建資源冪等清理、無新URL漏留；purge例外及初值恢復，不假ACK/落盤 |
| T13 | 真600pxstage A–D、G0/32、computed styles/rect | 真CSS Grid而非手繪；對獨立手算oracle，記DPR/viewport；不拿實作輸出算expected |
| T14 | 真keyboard增刪移、首錯、modal取消/確認、CSS選取與scroll | 焦點跟塊、無背景穿透，無滑鼠可完成，無hidden-handler代操作 |
| T15 | 真200%zoom、320CSSpx、forced-colors/AT抽查 | 控制不裁切/整頁不橫溢，只有namedstage局部scroll；讀出可理解，缺設備NOT_RUN |
| T16 | 假canary輸入至產生/錯誤/取出/背景/語言/reload，Network/Storage | 除靜態及固定導航無請求，無應用持久化；clipboard寫出/download不誤報輸入上傳 |
| T17 | url/HTML/style字串、CSP、rule缺失/CSSOM throw | raw拒絕無extra請求；能力失敗結果全空、無半成功；真policy/console證據 |
| T18 | 最大模板、兩語同raw、LF/BOM/MIME/name | 小於8192、兩語逐byte同、grid.css/text/css固定；人工字面expected獨立 |
| T19 | 乾淨test/check/build、symlink/路徑重疊/既有dist | 完整exit/log/manifest；拒絕不刪原資料；無install/網路生成 |
| T20 | 非作者FAQ擴充→build→正常UI看見→回復 | 精確候選與diff、兩語真可見／復原消失、source/產物hash回復；只讀指南不算做過 |

timer純測受控clock只證token/期限邏輯，不保證背景timer準時或原生下載取消；必要native另證。純core可直呼測schema，正常旅程不得注入完成flag/state或mock renderer。無法自然觸發的throw可用明示故障依賴，不能冒真人流程。每case記同commit、環境、命令、輸入、expected/actual、exit與NOT_RUN，保留失敗／oracle修訂歷史。

### 7.3 最小恢復反例

- B01：A成功→columns2→CSS/預覽立即撤→產生首塊columnEnd錯→改回3仍無結果→再產生才回原CSS。
- B02：B成功→copy pending→gap16並新產生→舊promise resolve：只新結果有效，不顯舊「已複製」；系統可能接收舊值的限制仍明示。
- B03：A下載提出→立刻確認清除→初值且無結果，既有lease邏輯期限仍是原30秒；新產生不能提前第二下載。hidden可早purge且可能中止未接收下載，visible不復活。

## 8 交驗與責任

### 8.1 文件交件

SPEC與AUTHOR-CHECK固定同repo commit，以open draft PR交驗；作者查核列八節對應、固定例／算術／模板檢查、來源去重、未實作／未原生測試及限制。只公開必要產品資訊，不含私人路徑／執行識別／對話／秘密，不merge/approve/deploy或動catalog。

非作者實讀同candidate八節及brief，逐節可反駁證據後用原core mark-spec-ready；作者不可自ready／代簽。修訂沿同specID、新commit及affected review，保留歷史。八節文件完整度不等九面向產品評分；task reviewing/acceptance null如實保留，不填假90。

### 8.2 製作交件

製作另須allowedExecutors明允的production task、固定九面向及原子claim讀回，不能沿規格claim開工。交完整source/tests/check/build、雙語README/來源、安全server入口、manifest、正常桌面觀察與全部未測項；PRhead對candidate。來源可讀不等可評完整，缺資源列具體owner／條件，不用歷史CPU補品質。

部署、domain、license、費用、憑證、權限需另有批准。本件僅文件與來源交驗，未知正式origin不猜，沒有liveURL不宣稱上線／索引／主頁互連成功。高優先工作恢復時保留本件checkpoint和owner，不以沉默釋出、不拿走其他人的既有工作。
