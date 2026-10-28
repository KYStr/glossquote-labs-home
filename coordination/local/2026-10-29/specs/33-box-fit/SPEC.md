# 箱內排列容量試算 — 既有規格保存

Task ID: `labs-33-box-fit` · Spec ID: `spec-33-box-fit`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：箱內排列容量試算

狀態：**M0 規格，尚未實作。** 使用頻率是待驗證假設，計算結果不保證物品可實際裝箱。

## 問題、使用者與範圍

使用者知道箱子內部可用尺寸及單件物品尺寸，想估算在指定間隙下能排成多少件，並比較哪些固定朝向的規則格數較高。工具回答一個有限問題：每個朝向各自用同一方向的物品排成直角均勻格時，三個軸各排幾件、總共幾件、每層幾件與有幾層。

假設需求來自家庭收納、搬運前估算或小型包裝工作；實際頻率、裝置及使用者對旋轉規則的理解尚未驗證。所有尺寸以毫米表示，輸入箱尺寸指可用內尺寸而非外尺寸。

## MVP 功能需求

### FR-01 — 空白初始狀態

- 繁中與英文頁初次載入時，箱內長寬高及單件長寬高皆空白；間隙預填字串 0 mm；「允許旋轉」預設勾選；沒有結果，也不自動填入範例或計算。
- 有一個「試算 / Calculate」主要操作與明確的「清除 / Clear」次要操作。清除回到六個尺寸空白、gapRaw 字串 0、allowRotation true、無結果的初始狀態。
- 若六個尺寸欄皆空、間隙原始字串仍為 0、允許旋轉仍為 true 且無結果，清除或切語言不必詢問確認。任何尺寸有值、gapRaw 與 0 不同、旋轉設定不同或結果存在時，先說明將清除並確認；取消須保留完整當前狀態。

### FR-02 — 尺寸輸入

- 箱內長、寬、高與單件長、寬、高各為毫米，精確範圍 0.01–100000.00 mm。
- 相鄰間隙範圍 0–10000.00 mm。間隙用在同一箱軸上相鄰兩件之間，不加在第一件與箱壁之間，也不對箱壁或底部加 padding。
- 七個數值都是原始 ASCII 字串；最多 12 個 UTF-16 code units。格式為一個以上 ASCII 數字，可選 ASCII 句點和 1–2 位小數。允許前導零。拒絕空白、正負號、指數、逗號、全形數字／標點、尾端句點及超過兩位小數；不得 trim、換 locale 或猜測輸入。
- 長、寬、高各自標明 mm；輸入標籤說清楚「箱內可用尺寸」和「單件尺寸」。數字欄一律按原始字串交給核心，不能以 Number 浮點值代替。

### FR-03 — 旋轉與排列模型

- allowRotation 是布林值。false 只計算物品長、寬、高依序對應箱長、寬、高的 LWH 朝向。
- true 固定計算六種軸對齊排列，順序為 LWH、LHW、WLH、WHL、HLW、HWL。順序中的字母表示放到箱長、箱寬、箱高軸上的物品原始軸。即使物品兩軸尺寸相同，也仍回傳全部六列，不合併朝向。
- 這只表示把長方體的三個邊沿箱子三個軸互換；不包含斜放、傾斜、任意角度旋轉或每件使用不同朝向。
- 每個朝向分別在三軸以同一間隙計算可排數，總數是三軸計數相乘。不得用體積比、模擬、逐件交錯或搜尋近似來替代公式。

### FR-04 — 結果與解讀

- 每個朝向顯示箱長、寬、高軸的可排數、該朝向總數，以及可用的已佔尺寸。每層以箱長×箱寬為底面，沿箱高方向計算層數；可放入時另外顯示一層件數和層數。
- 顯示最大總數的朝向為勝出朝向。若多個朝向同為最大，核心回傳固定順序中最早的一個 winnerIndex；畫面須指出有並列並列出全部結果，不讓並列者看似較差。
- 某朝向的任一軸計數為 0，該朝向 total 為 0、occupiedMm 為 null，不能把其他軸的非零格數當成可放一層。若所有朝向均為 0，winnerIndex 為 null，整體 total、oneLayerCount 和 layerCount 都明確為 0，畫面說「依這些尺寸和間隙，沒有朝向可排入單件」；不得顯示「成功裝入」或類似成功措辭。
- occupiedMm 是該規則格的外包尺寸，包含件間隙，不含箱壁間隙。因公式取整，它不大於輸入的箱內尺寸。
- 錯誤不產生部分結果；欄位錯誤指出固定欄位名稱與格式修正提示，不重述原始輸入。

### FR-05 — 編輯、清除與語言

- 每次輸入或旋轉勾選變更都立即淘汰舊結果和勝出狀態；不允許顯示與目前輸入不符的舊容量。
- 清除依 FR-01 的初始狀態判斷是否需要確認。確認後回到初始狀態並留在目前語言；取消保留所有輸入與結果。
- 語言頁互相獨立。切換前若有工作，清楚說明會清除並詢問；確認後前往另一個固定同源語言頁，初始值重設；取消保留目前頁面與狀態。初始狀態直接切換。
- 輸入與結果只存在目前頁面的記憶體，不寫入 URL、history state、storage、cookie 或伺服器。

### FR-06 — 不提供匯出

- MVP 只在頁面顯示計算結果；不提供 copy、buildReport、下載、分享、儲存或列印版報告。
- 因沒有異步 copy 或下載，MVP 不建立 Clipboard Promise 狀態、revision epoch 或 object URL。不得為了通用化而加入這些功能。

### FR-07 — 初始化失敗與安全

- HTML 初始輸入區與所有工作按鈕 disabled，所有 input 無 name。最早註冊的同步 submit capture listener 回呼第一個動作同步 preventDefault。完成初始化和事件掛載後才 enable。
- JavaScript 缺失或初始化失敗時保持 disabled，顯示固定雙語提示，不導覽、不提交表單、不顯示 raw exception。
- 動態結果只以安全文字和值呈現，不用 innerHTML、eval 或字串建構程式。

## 非目標

- 多種朝向混放、混合高度、任意角度、拼圖、裝箱搜尋、最佳化、剩餘空間排程或箱子彼此套疊。
- 不規則形狀、凸出物、軟包裝變形、材料厚度、容器壁厚推算、裝配順序、握取空間或實際公差。
- 重量、承重、重心、運輸限制、郵資、易碎／液體／危險物判定或「一定裝得進去」保證。
- 圖片、CAD、相機、上傳、雲端、帳號、多人協作、歷史紀錄、local storage 或外部 API。

本工具是一個單朝向均勻格估算器，不是通用 3D 裝箱或實物驗證工具。


---

## 原文件 TECHNICAL.md

# 技術規格：箱內排列容量試算

狀態：**M0 規格，尚未實作。** Node.js 24+ ESM/built-ins 僅供離線開發、檢查、測試與建置；正式頁面使用同源靜態 HTML、CSS、ESM，不加 runtime 或 dev 外部依賴。

## 核心 API

唯一純函式入口為 **calculateBoxFit(request)**。不提供 report/export API。

根 request 必須是 prototype 恰為 Object.prototype 的普通物件，恰有八個 own enumerable data properties：

~~~js
{
  boxLengthRaw: "10",
  boxWidthRaw: "8",
  boxHeightRaw: "6",
  itemLengthRaw: "3",
  itemWidthRaw: "2",
  itemHeightRaw: "2",
  gapRaw: "0",
  allowRotation: true
}
~~~

所有八個鍵皆必填、不可多出未知鍵。拒絕 symbol own key、未知鍵、缺欄位、非 enumerable 欄位及 accessor descriptor。只接受 data descriptor；可寫性和可配置性不作限制。先讀取並驗證所有鍵及 descriptor，通過後才讀各 data value。任何 getter 不得被呼叫。欄位值不可用來拼接錯誤文字。

request 本身永不修改。反射或 descriptor trap 例外回傳固定錯誤而不外拋；JavaScript 無可靠通用方法辨認所有 Proxy，核心不把 Proxy 可偵測性當安全邊界。

## 固定驗證順序與錯誤

先檢查根值：null、primitive、array、Date、自訂 prototype、Object.create(null) 或 prototype 不等於 Object.prototype，一律為 invalid_request/request。若讀 prototype 時反射 trap 丟錯，回 invalid_schema/request。

接著檢查根 schema，順序固定：

1. Reflect.ownKeys 失敗為 invalid_schema/request。
2. 任一 symbol key 或任一未知 string key 為 invalid_schema/request。
3. 缺少欄位按下列鍵序找第一個：boxLengthRaw、boxWidthRaw、boxHeightRaw、itemLengthRaw、itemWidthRaw、itemHeightRaw、gapRaw、allowRotation；回 invalid_schema/request。
4. 按同一鍵序檢查已知欄位 descriptor。不存在的 data descriptor、accessor、非 enumerable 或 descriptor 反射失敗，回 invalid_schema 並以該欄位名稱作 field。
5. 所有描述子通過後，依同一資料欄位順序檢查值。七個 raw 欄位按型別、長度、文法、範圍順序；allowRotation 最後檢查型別。

失敗 shape 僅為：

~~~js
{ ok: false, error: { code: "invalid_format", field: "gapRaw" } }
~~~

固定 code 僅有 invalid_request、invalid_schema、invalid_type、raw_too_long、invalid_format、out_of_range。field 僅能是 request、boxLengthRaw、boxWidthRaw、boxHeightRaw、itemLengthRaw、itemWidthRaw、itemHeightRaw、gapRaw、allowRotation。不得附加 message、raw、partial result 或未知欄位。

- 七個 raw 欄位不是字串，或 allowRotation 非 boolean：invalid_type，field 指向欄位。
- raw 長度超過 12 UTF-16 code units：raw_too_long。長度 0 留給格式規則判為 invalid_format。
- 文法不合：invalid_format。
- 文法正確但超出數值範圍：out_of_range。
- error 一律在固定欄位次序遇到第一個錯誤時返回。

## 數值字串與固定單位

七個 raw 欄位只接受 ASCII 數字及可選 ASCII 句點：

~~~text
^[0-9]+(?:\.[0-9]{1,2})?$
~~~

允許前導零；句點後必須有 1–2 位。拒絕空白、符號、指數、逗號、全形數字或標點、尾端句點、單獨句點及超過兩位小數。不 trim、不本地化、不用 Number 或浮點解析。

解析為 0.01 mm 單位整數 U：整數部乘 100，小數右補零至兩位。例 3.5 → 350、003.50 → 350、0.01 → 1。所有解析、計數、總數、占用尺寸及格式化都使用 BigInt。

- 六個箱／物品尺寸：1–10,000,000 單位，即 0.01–100000.00 mm。
- gapRaw：0–1,000,000 單位，即 0–10000.00 mm。
- 「0」「0.0」「0.00」對 gap 合法；對尺寸格式合法但 out_of_range。
- 所有 raw 最大 12 個 UTF-16 code units；核心也重做 UI 驗證。

## Orientation 次序與精確公式

箱子軸固定是 boxLength、boxWidth、boxHeight。旋轉 false 時 orientations 僅有 index 0、itemAxes [L,W,H]。旋轉 true 時固定有六列，照下列 order，不去重：

~~~text
index 0: [L,W,H]
index 1: [L,H,W]
index 2: [W,L,H]
index 3: [W,H,L]
index 4: [H,L,W]
index 5: [H,W,L]
~~~

對某方向將 itemAxes 三個尺寸依次對應箱子長、寬、高。每一箱軸分別計算，B 為該箱軸內尺寸，I 為該方向物品對應尺寸，G 為間隙，單位皆是 0.01 mm 整數：

~~~text
axisCount = floor((B + G) / (I + G))
orientationTotal = lengthCount * widthCount * heightCount
~~~

I > B 時公式自然給 0。間隙只在兩件相鄰時出現；不加邊界間距，不把項目體積比當作格數。

若 orientationTotal > 0：

~~~text
occupiedAxis = axisCount * I + (axisCount - 1) * G
oneLayerCount = lengthCount * widthCount
layerCount = heightCount
~~~

一層固定是箱長×箱寬底面；layers 沿 boxHeight 軸計數。

occupiedAxis 格式化為固定兩位小數 mm。occupiedMm 是沿三個箱軸的規則格外包尺寸。若 orientationTotal 為 0，該朝向的 occupiedMm 固定為 null；總數為 0 的朝向不得提供「一層可放 N 件」或成功狀態。

比較六個或唯一朝向的 BigInt total。winnerIndex 是最大正數 total 第一個出現的 index；同分保留最早 index。若所有 total 都是 0，winnerIndex=null，result.total="0"，result.oneLayerCount=0，result.layerCount=0。這是有效的無解結果，不是 API error。

最大每軸計數不超過 10,000,000；最大單層計數不超過 100,000,000,000,000，安全小於 Number.MAX_SAFE_INTEGER。orientation total 最大為 10^21，故以無前導零的十進位字串輸出；任何內部 BigInt 都不得離開 API 或進入 JSON。

## 成功結果 schema

成功 shape 固定為 { ok: true, result }。result 恰含 schemaVersion、orientations、winnerIndex、total、oneLayerCount、layerCount：

~~~js
{
  schemaVersion: 1,
  orientations: [{
    index: 0,
    itemAxes: ["L", "W", "H"],
    axesCounts: { boxLength: 3, boxWidth: 4, boxHeight: 3 },
    total: "36",
    occupiedMm: { boxLength: "9.00", boxWidth: "8.00", boxHeight: "6.00" }
  }],
  winnerIndex: 0,
  total: "36",
  oneLayerCount: 12,
  layerCount: 3
}
~~~

orientation entry 恰含 index、itemAxes、axesCounts、total、occupiedMm。axesCounts、oneLayerCount、layerCount 是安全整數 Number；total 是 BigInt 的十進位字串；occupiedMm 是固定兩位小數字串物件或 null。itemAxes 是三元素 L/W/H 字串陣列。結果可 JSON.stringify，沒有 BigInt、raw input、錯誤文案或使用者輸入回顯。

## UI 狀態與頁面生命週期

- 初始所有輸入區與工作按鈕 disabled，input 無 name。最早同步 submit capture listener 第一個動作同步 preventDefault；事件和初始化完成後才 enable。JavaScript 缺失或失敗時維持 disabled。
- 每次欄位、間隙或勾選狀態改動，同步 revision++ 並清除既有結果。calculateBoxFit 是同步 bounded 計算，不使用 Promise、Worker、網路或外部 API。
- 清除／語言切換依 PRODUCT.md 初始狀態規則；取消完整保留，確認後清除全部尺寸與結果。
- pagehide 清除記憶體輸入和結果；BFCache persisted pageshow 回到初始空白狀態：尺寸空白、間隙 0、rotation true、無結果。
- 無 copy、report、download、URL、browser storage、cookie、history state、console 使用者資料或 analytics。
- 動態文字使用 textContent/value。不得使用 innerHTML、eval、Function、執行使用者字串或從輸入拼 URL。

## M1 檔案與發布邊界

M1 建議核心為 public/js/core/calculate-box-fit.js；本機 test 以獨立常數驗證，不引用其產生 expected。靜態頁繁中 /index.html、英文 /en/index.html。Node.js 24+、ESM/built-ins、無 runtime 或 dev 外部依賴。預覽只綁 127.0.0.1:4213，noindex/nofollow。

M2 production model 候選 127.0.0.1:5213；production 輸出與 preview 分離，不改寫 M1 凍結內容。正式 SEO、headers、404、robots、sitemap、CSP、source publication 和乾淨 artifact gates 依本工具 docs/RELEASE.md、docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/GIT-PUBLICATION-SAFETY.md。


---

## 原文件 UX-SEO.md

# UX、雙語文案與 SEO 規格

狀態：**M0 規格，尚未實作。** 採 Product App 工作畫布；使用家族 tokens，但由實際尺寸與排列表形成工具自己的版面。

## 首要任務與視覺階層

首屏直接顯示箱內尺寸、單件尺寸、相鄰間隙、旋轉設定及「試算 / Calculate」。主要工作是填完尺寸後比較格數；不放行銷 hero、假數據、圖像上傳或通用卡片牆。

### Desktop 草圖

~~~text
┌ Gloss Tools / 箱內排列容量試算   繁中 | English    繁中首頁 ───────┐
│ 箱內排列容量試算                                            │
│ 輸入箱內可用尺寸與單件尺寸，試算規則格數。                  │
├────────────────────────────────────────────────────────────┤
│ 箱內可用尺寸（內長 × 內寬 × 內高）                          │
│ 長 [________] mm   寬 [________] mm   高 [________] mm       │
│ 單件尺寸                                                     │
│ 長 [________] mm   寬 [________] mm   高 [________] mm       │
│ 相鄰件間隙 [________] mm   ☑ 允許物品旋轉                  │
│ 間隙只套用於物品彼此之間，不包含箱壁留白。                  │
│ [試算 / Calculate]     [清除 / Clear]                       │
├────────────────────────────────────────────────────────────┤
│ 最大均勻格數 40 件     勝出朝向 WHL     每層 20 件 / 箱高 2 層│
│ 軸對齊朝向比較                                             │
│ 朝向 │ 箱長軸數 │ 箱寬軸數 │ 箱高軸數 │ 總數 │ 已佔尺寸     │
│ LWH  │     3    │     4    │     3    │  36  │ 9×8×6 mm   │
│ ...六個朝向完整列出；有並列時全部標示                      │
│ 計算只涵蓋單一朝向均勻格，不保證實物一定可裝入。            │
└────────────────────────────────────────────────────────────┘
~~~

草圖中的數值只作版面說明，不是載入值或產品驗收預期。

### Mobile 草圖（320 CSS px）

~~~text
┌ 箱內排列容量試算    English │ 繁中首頁 ┐
│ 箱內可用尺寸                             │
│ 長 [________] mm                         │
│ 寬 [________] mm                         │
│ 高 [________] mm                         │
│ 單件尺寸                                 │
│ 長 [________] mm                         │
│ 寬 [________] mm                         │
│ 高 [________] mm                         │
│ 相鄰件間隙 [________] mm                 │
│ ☑ 允許物品旋轉                            │
│ [試算 / Calculate]                       │
│ [清除 / Clear]                           │
│ 最大均勻格數：40 件                       │
│ 每層：20 件    層數：2                    │
│ 朝向比較（此區域可水平捲動）              │
│ [orientation comparison table            │
│  with visible column labels and wrapping] │
│ 整頁不水平捲動；只有表格容器可局部捲動。   │
└──────────────────────────────────────────┘
~~~

## 控制項、狀態與鍵盤

- Header 只含工具名稱、繁中／English 切換和當前語言共用首頁連結。
- 七個測量欄都是可見 label 的 type=text、inputmode=decimal、maxlength=12；單位 mm 不只放 placeholder。提示例子如 10、10.5、10.50；只接受 ASCII 句點。
- 提供明確的「插入小數點 / Insert decimal point」輔助。它作用於最近聚焦的尺寸欄，使用記錄的 selection range 插入 ASCII 句點，再把焦點和游標還給該欄。沒有活躍欄位時停用；不可把逗號自動轉成句點。
- 七欄分成「箱內可用尺寸」和「單件尺寸」兩組；間隙欄旁說明只計相鄰件間隔。間隙預設 0 mm，允許旋轉預設勾選，說明勾選會比較六種邊軸互換，不表示任意角度可放。
- 旋轉勾選變動即清除舊結果。false 時只出現 LWH；true 時固定出現六列，即使尺寸相同也不合併。
- 無效欄位時定位欄位、展示固定雙語錯誤與修正方向，不顯示部分結果。試算前需輸入全部七個 raw 欄位；不能將空白尺寸當成 0。
- 表格按 orientation index 固定順序。欄位包括朝向、箱長／寬／高軸可排數、總件數和已佔尺寸。winner 第一名以文字與圖示標出；若有同分，其他並列列也明確標示。
- 總數用十進位完整字串，不用科學記號。無法放入的方向顯示總數 0、佔用尺寸「不適用 / Not applicable」；不顯示成功徽章、正數的一層量或層數。
- 所有表單和工作按鈕初始化時 disabled，所有 input 無 name。初始化與 listener 全部就緒後才啟用；JavaScript 關閉或初始化失敗時仍停用，顯示固定說明。
- 清除與切語言依 PRODUCT.md：初始狀態是六欄空白、gap raw 字串 0、rotation true、無結果，不需確認；有任何不同輸入／選項或結果才確認清除。取消不改值。
- 輸入或勾選一改即同步清除舊結果；計算同步完成，沒有背景工作、loading spinner、copy 狀態或下載連結。
- 焦點、錯誤與勝出狀態不能只靠顏色。按鈕和觸控目標至少 44×44 CSS px；結果數字在窄欄換行，不遮住單位和標籤。
- 主要功能由鍵盤可完成，錯誤用 label/aria-describedby 關聯；表格有 caption、表頭 scope，局部水平捲動容器有可讀名稱並可鍵盤捲動。

## 繁體中文介面文案

- 頁面標題與 H1：**箱內排列容量試算**
- 副標：**輸入箱內可用尺寸、單件尺寸與相鄰間隙，查看單一方向均勻排列的數量。**
- 箱尺寸群組：**箱內可用尺寸（內長、內寬、內高）**
- 單件群組：**單件尺寸**
- 欄位：**長度（毫米）**、**寬度（毫米）**、**高度（毫米）**、**相鄰件間隙（毫米）**
- 旋轉選項：**允許物品旋轉，比較六種沿箱子三軸對齊的朝向。**
- 間隙提示：**間隙只在相鄰物品之間計算，不包含箱壁或底部留白。**
- 主操作：**試算容量**
- 次要操作：**清除**
- 成功摘要：**最大均勻格數：{total} 件**；**每層 {oneLayerCount} 件，沿箱高 {layerCount} 層**；**朝向：{orientation}**。
- 並列提示：**有多個朝向得到相同的最大數量；下表會一併標示。**
- 無法放入：**依這些尺寸和間隙，沒有朝向可排入單件。**
- 模型限制：**這是單一朝向的均勻格估算，不是混合排列或實物裝箱保證。**
- 隱私提示：**輸入只在目前頁面試算，不會保存；首次載入仍需下載網站檔案。**
- JS 未就緒：**試算功能目前無法啟用。請重新載入頁面；你的輸入尚未送出。**
- 清除確認：**清除目前尺寸和試算結果？取消會保留所有內容。**
- 語言切換確認：**切換語言會清除目前尺寸和結果，確定繼續嗎？**
- 錯誤例：**請輸入 0.01 到 100000.00 mm 的 ASCII 數字，最多兩位小數。**

## English interface copy

- Page title and H1: **Box Grid Capacity Calculator**
- Subtitle: **Enter the box's usable inner dimensions, one item's dimensions and the gap between adjacent items to compare uniform grids.**
- Dimension groups: **Usable inner box dimensions** and **Single-item dimensions**
- Fields: **Length (mm)**, **Width (mm)**, **Height (mm)**, **Gap between adjacent items (mm)**
- Rotation option: **Allow rotation to compare six orientations aligned to the box axes.**
- Gap note: **The gap applies only between adjacent items; no wall or floor clearance is added.**
- Primary action: **Calculate capacity**
- Secondary action: **Clear**
- Success summary: **Maximum uniform-grid count: {total} items**; **{oneLayerCount} per base layer × {layerCount} layers along box height**; **Orientation: {orientation}**.
- Tie notice: **Several orientations share the maximum. All tied rows are marked below.**
- No fit: **No orientation fits one item with these dimensions and gap.**
- Model limit: **This estimates one uniform grid orientation. It does not optimize mixed arrangements or guarantee a physical fit.**
- Privacy note: **Inputs are calculated on this page and are not saved. The site files must still load the first time.**
- Initialization failure: **The calculator could not be enabled. Reload the page; your input has not been submitted.**
- Clear confirmation: **Clear the current dimensions and result? Cancel to keep everything.**
- Language confirmation: **Changing language clears the current dimensions and result. Continue?**
- Example format error: **Enter ASCII numbers from 0.01 to 100000.00 mm, with at most two decimal places.**

## 固定範例與 FAQ

範例只供文件與測試參考，不自動填入，也不需要範例按鈕。輸入箱 10×8×6 mm、單件 3×2×2 mm、間隙 0、允許旋轉 false，結果為 LWH 方向 36 件、每層 12 件、3 層；這只是整數尺寸算例，不是推薦包裝方式。

### 繁體中文 FAQ

1. **這會找出最佳 3D 裝箱方式嗎？** 不會。它只計算每個指定軸向朝向的單一均勻格，不混合方向或搜尋剩餘空間。
2. **允許旋轉代表可以任意轉動嗎？** 不代表。只會把長、寬、高互換並沿箱子的三軸對齊；易碎、方向標示和物品形狀等限制由使用者自行判斷。
3. **間隙如何套用？** 間隙只在同一箱軸上相鄰的兩件之間加入，第一件與箱壁之間不加留白。
4. **計算結果保證東西放得進去嗎？** 不保證。公式沒有驗證實際形狀、公差、包裝變形、重量、操作空間或箱子承重。

### English FAQ

1. **Does this find the optimal 3D packing arrangement?** No. It compares one uniform grid for each listed axis-aligned orientation. It does not mix orientations or search remaining space.
2. **Does rotation mean any angle is allowed?** No. It only permutes the item's length, width and height along the box axes. You must account for labels, fragility and shape constraints yourself.
3. **How is the gap applied?** The gap is added only between adjacent items along each box axis. No clearance is added between an item and a box wall.
4. **Does the result guarantee that everything will fit physically?** No. The calculation does not check shape, tolerances, flexible packaging, weight, handling room or box strength.

## SEO 與正式網址規則

- 繁中 title：**箱內排列容量試算 | Gloss Tools**。繁中 description：**輸入箱內可用尺寸、單件尺寸與相鄰間隙，估算單一朝向均勻格的容量並比較六種軸對齊排列。**
- English title: **Box Grid Capacity Calculator | Gloss Tools**. English description: **Estimate a uniform grid of identical items inside a box, compare six axis-aligned orientations, and see per-layer counts.**
- Open Graph title/description mirror the matching-language page title and description. Do not use claim words such as optimal, guaranteed, or best packing.
- 候選 origin：https://boxfit.glossquote.com。這只是正式網址候選，不表示 DNS、可用性、來源公開或 Cloudflare 部署已確認。
- M1 預覽只限 http://127.0.0.1:4213/，HTML meta robots 為 noindex,nofollow；不輸出正式 canonical、alternate metadata、sitemap 或索引 JSON-LD，並保留既有正式同語首頁連結。
- M2/M3 正式候選繁中頁為 https://boxfit.glossquote.com/index.html，英文頁為 https://boxfit.glossquote.com/en/index.html。兩頁 self-canonical，雙向 hreflang zh-Hant/en，x-default 指向繁中頁；sitemap 只列兩個固定 canonical。
- 共用首頁連結依語言固定為繁中 https://glossquote.com/index.html、英文 https://glossquote.com/en/index.html。每頁只連回相同語言，M3 驗證實際 URL 與頁面語言。
- M2 可提供符合可見內容的 WebApplication 與 FAQPage JSON-LD。不可加未證實的評價、價格、保證、搜尋排名或「最佳裝箱」宣稱。
- robots 不得封鎖兩個 canonical 所需的 CSS/JS；正式 header、404、sitemap、robots 和 meta 依 docs/RELEASE.md 實測。搜尋排名與流量不屬 gate。
- 404 是清楚的錯誤頁，不回傳試算成功結果，也不以 SPA fallback 代替。

## 使用環境驗收底線

在 320 CSS px 與 200% zoom 下，表單逐欄重排、整頁不水平溢位；orientation table 可在有標籤的局部區域水平捲動，且鍵盤可操作。測試長英文欄名、大數字、無 JS、錯誤修正、clear/language cancel、結果即時淘汰。初次靜態載入後，已載入頁面可在離線狀態完成同步計算；不承諾冷啟動離線。真機虛擬鍵盤、螢幕閱讀器、完整 Network/Storage 與真實裝箱只能按實際能力驗證，不能用 mock 冒充。



---

## 原文件 ACCEPTANCE.md

# 驗收案例：箱內排列容量試算

狀態：**M0 規格 oracle，尚未執行。** 數值預期由公式逐項手算；不得從被測函式產生 expected。M0 不代表測試或瀏覽器案例通過。核心契約見 [TECHNICAL.md](TECHNICAL.md)，使用情境及文案見 [PRODUCT.md](PRODUCT.md)、[UX-SEO.md](UX-SEO.md)。

## 核心手算案例

除另有說明，尺寸單位皆為 mm，gap=0，rotation=false；各軸計數按箱長、箱寬、箱高順序。occupancy 顯示箱長×箱寬×箱高。允許旋轉案例明列所有六個 index。成功測試比對整個 API shape；錯誤測試只比對固定 code/field，並驗證無 result、raw echo 和 request mutation。

| ID | 輸入 | 預期 |
|---|---|---|
| C01 | 箱 10×8×6；物品 3×2×2；旋轉 false | LWH counts=3×4×3；total="36"；winnerIndex=0；oneLayerCount=12；layerCount=3；occupied=9.00×8.00×6.00。 |
| C02 | 同 C01，rotation=true | totals index 0..5 = 36,36,30,40,30,40；counts依序 3×4×3、3×4×3、5×2×3、5×4×2、5×2×3、5×4×2；winnerIndex=3（與 5 並列但先出現）；total="40"；oneLayerCount=20；layerCount=2；勝出 occupied=10.00×8.00×6.00。六列都保留。 |
| C03 | 箱 10×8×6；物品 2×2×2；旋轉 true | 六列皆 counts=5×4×3、total="60"、occupied=10.00×8.00×6.00；不合併相同尺寸朝向；winnerIndex=0；oneLayerCount=20；layerCount=3。 |
| C04 | 箱 2×2×2；物品 3×1×1；旋轉 true | 每方向至少一軸 count=0，六個 total="0"，occupiedMm=null；winnerIndex=null；整體 total="0"、oneLayerCount=0、layerCount=0。 |
| C05 | 箱 10×8×6；物品 3×2×2；gap=0.5；旋轉 false | counts=3×3×2；total="18"；occupied=10.00×7.00×4.50；oneLayerCount=9；layerCount=2。 |
| C06 | 箱 6.5×5.5×4.5；物品 3×2.5×2；gap=0.5；旋轉 false | counts=2×2×2；total="8"；oneLayerCount=4；layerCount=2；occupied=6.50×5.50×4.50，證明間隙計在件間且仍可恰好填滿。 |
| C07 | 箱和物品皆為 0.01×0.01×0.01；gap=0 | counts=1×1×1；total="1"；oneLayerCount=1；layerCount=1；occupied=0.01×0.01×0.01。 |
| C08 | 箱 2.99×5×5；物品 3×1×1；gap=0；旋轉 false | counts=0×5×5；total="0"；winnerIndex=null；occupiedMm=null；整體一層和層數均為 0。 |
| C09 | 箱 10×8×6；物品 6×4×2；旋轉 true | 六方向 totals=6,4,6,8,5,10；winnerIndex=5（HWL）；勝出 counts=5×2×1、total="10"、oneLayerCount=10、layerCount=1、occupied=10.00×8.00×6.00。 |
| C10 | 箱與物品皆為 10×8×6；旋轉 false | counts=1×1×1；total="1"；occupied=10.00×8.00×6.00；gap 不會被加到單件四周。 |
| C11 | 箱 100000×100000×100000；物品 0.01×0.01×0.01；gap=10000；旋轉 false | 各軸 count=10；total="1000"；oneLayerCount=100；layerCount=10；occupied 每軸=90000.10 mm。 |
| C12 | 箱 100000×100000×100000；物品 0.01×0.01×0.01；gap=0；旋轉 false | 各軸 count=10000000；total="1000000000000000000000"（10^21）；oneLayerCount=100000000000000；layerCount=10000000；occupied=100000.00 mm 三軸。total 必須是十進位字串，無科學記號或精度損失。 |
| C13 | 箱長 raw="000000000.01"，另兩箱軸與物品皆 0.01；gap=0；旋轉 false | 前導零合法，數值是 0.01 mm；counts=1×1×1、total="1"、occupied 三軸 0.01。 |
| C14 | 箱 10×8×6；物品 3×2×6；gap=0；旋轉 false | counts=3×4×1；total="12"；oneLayerCount=12；layerCount=1；occupied=9.00×8.00×6.00。 |
| C15 | 箱三軸皆 1.01；物品三軸皆 0.5；gap=0.01；旋轉 false | 每軸 floor(1.02/0.51)=2；counts=2×2×2；total="8"；occupied 三軸 1.01；驗證小數以固定點精算。 |
| C16 | 箱三軸皆 100000；物品三軸皆 100000；gap=10000；旋轉 true | 六列皆 counts=1×1×1、total="1"、occupied 三軸 100000.00；相同朝向保留六列；winnerIndex=0。驗證尺寸與間隙最大邊界。 |
| C17 | boxLengthRaw="0000000000000"（13 字元）；其餘合法 | raw_too_long，field=boxLengthRaw；長度優先於格式與範圍。 |
| C18 | itemHeightRaw="0.00" | out_of_range，field=itemHeightRaw；格式合法、尺寸不可為 0。 |
| C19 | gapRaw="10000.01" | out_of_range，field=gapRaw。 |
| C20 | boxWidthRaw="100000.01" | out_of_range，field=boxWidthRaw。 |
| C21 | gapRaw="０" | invalid_format，field=gapRaw；拒絕全形零。 |
| C22 | itemLengthRaw="3e0" | invalid_format，field=itemLengthRaw；拒絕指數表示。 |
| C23 | allowRotation="true" | invalid_type，field=allowRotation。 |
| C24 | request 缺少 itemHeightRaw | invalid_schema，field=request；不得計算部分結果。 |
| C25 | request 帶未知 own key debug，該 key 是計數 getter | invalid_schema，field=request；getter 呼叫次數為 0，未知值不回顯。 |
| C26 | 已知 itemWidthRaw 為 getter，getter 內增加計數 | invalid_schema，field=itemWidthRaw；getter 呼叫次數為 0。 |
| C27 | request 帶 symbol key 或非 enumerable 未知 key | invalid_schema，field=request。 |
| C28 | null、primitive、array、Date、自訂 prototype、Object.create(null) | invalid_request，field=request。 |
| C29 | 已知 gapRaw descriptor 設為 non-enumerable data property | invalid_schema，field=gapRaw。 |
| C30 | 成功或失敗前後比較 request，並 JSON.stringify 成功結果 | request 不變；成功可 JSON round-trip、無 BigInt、無 raw echo；錯誤沒有 result/partial。 |

C02 驗證穩定同分排序；C04/C08 驗證無一件可放時不顯示成功；C05/C06/C11 驗證相鄰間隙公式；C12 驗證最大總數用字串保真。這些是手算期望，並非已執行的測試結果。

## 瀏覽器與使用環境案例

在 M1 loopback 預覽 127.0.0.1:4213 實際走繁中與英文頁。不能以 mock 代替真機鍵盤、離線冷啟動、完整 Network/Storage 或實際物理裝箱。

| ID | 操作 | 預期 |
|---|---|---|
| B01 | 初次開啟任一語言頁 | 六尺寸欄空白，gap=0，允許旋轉已勾選，無結果；初始控制 disabled、input 無 name，初始化完成後才啟用。 |
| B02 | 關閉 JavaScript或觸發初始化失敗 | 控制保持 disabled；顯示固定訊息；不 GET 導覽、不提交、不輸出 raw exception。 |
| B03 | 輸入 C01 尺寸，保留 rotation=false 並試算 | 只顯示 LWH，36 件、每層 12 件、3 層，已佔尺寸 9×8×6 mm。 |
| B04 | 輸入 C02 尺寸，勾選 rotation | 比較六列；WHL 與 HWL 並列 40，winnerIndex 對應 WHL；明確說明並列和穩定排序。 |
| B05 | 輸入 C04 或 C08 無法放入案例 | 顯示 0、無勝出朝向、無已佔尺寸及明確無朝向可放文案；不顯示成功或正的一層數。 |
| B06 | 輸入 C12 極端合法值 | 完整顯示 10^21 的十進位整數，不使用指數、Infinity、NaN、截斷或卡住。 |
| B07 | 比較 gap=0 與 gap=0.5，第一件貼箱壁 | 僅改變件間距計數；文案明示無邊界 padding。 |
| B08 | 輸入空字串、空白、逗號、全形數字、尾端句點、三位小數、指數 | 分別定位錯誤並說明 ASCII 句點和精度規則；不 trim、不轉換、不展示部分結果。 |
| B09 | 先計算，再修改任一尺寸、gap 或 rotation | 同一事件循環清除全部舊朝向、total、winner 與狀態；未重算前不留舊結果。 |
| B10 | 有值/結果時按清除並取消，再確認 | 取消保留所有值與結果；確認清空尺寸、重設 gap=0/rotation=true 並移除結果。 |
| B11 | 兩語各走 C01 主流程；有工作時切語言先取消再確認 | 取消原頁與結果不變；確認後到固定同源另一語言頁，所有欄位回初始值，URL 無輸入。 |
| B12 | 初始六尺寸空白、gap raw="0"、rotation=true、無結果時按清除或切語言 | 不顯示確認框；預設值本身不當成待保留工作。 |
| B13 | 在 320 CSS px、200% 縮放與長英文標籤下使用鍵盤 | 整頁不水平捲動；表格僅在有名稱的局部容器水平捲動；焦點、錯誤和主操作可見。 |
| B14 | 手機 decimal keyboard 無句點時輸入 10.5 | 可見輔助插入 ASCII 句點並還原游標；不自動轉換逗號。若未用真機，記 NOT_RUN。 |
| B15 | 已載入頁面後切離線再試算；另冷啟動離線 | 已載入頁面同步試算；冷啟動離線不承諾、不冒稱成功。 |
| B16 | 查看初載、編輯、計算 Network/Storage | 靜態同源檔載入以外無應用請求、storage、cookie、輸入 URL、console 或上傳；能力不足記 NOT_RUN。 |
| B17 | 檢視 M1 預覽頁 head/robots/sitemap | 兩語 noindex,nofollow，沒有正式 canonical、alternate、sitemap 或 production SEO JSON-LD；保留同語首頁連結。 |
| B18 | 已計算後離頁，再由 BFCache 返回 | 回到尺寸空白、gap=0、rotation=true、無結果；不復活舊輸入。 |
| B19 | 螢幕閱讀器與鍵盤走過朝向比較表和無效欄位 | caption/欄頭/錯誤關聯可讀；勝出、並列、無解狀態不只用顏色；焦點可到局部捲動表。 |
| B20 | 重載頁面後檢查表單來源、網址和記憶體清除 | 無持久草稿、input name、query string 或隱藏提交欄位；沒有 copy/download UI。 |

## M1 驗收與不可冒稱項目

- 將 C01–C30 轉為離線 Node 測試，expected 固定手寫；另外覆蓋 descriptor hostile cases、getter 不執行、unknown/symbol/non-enumerable、精確 gap、巨大 BigInt total、重複尺寸不去重與 request 不突變。
- 按本工具 docs/ENGINEERING.md 執行最後候選的 Node.js 24+ 測試、check、build；記錄版本、實際命令和 exit code。M0 不執行產品測試或 build。
- 127.0.0.1:4213 兩語實際完成 B01、B03/B04、錯誤修正、編輯失效、清除、語言切換及 B05 no-fit；主要任一語未過不得稱 M1 完成。
- 320 CSS px、200% 縮放、鍵盤及表格局部捲動由實際瀏覽器驗證。真機小數鍵盤、冷啟動離線、完整 Network/Storage 和實際裝箱若無能力，各自記 NOT_RUN；不以 mock 假稱通過。
- M1 僅本機 preview noindex/nofollow。公開來源、正式 URL、Cloudflare 和首頁 catalog 均不屬 M1 證據。


## Browser-only testing restriction (user, 2026-10-18)

Use browser tools in task-owned isolated/hidden tabs only. Do not control the desktop, native applications or OS mouse/keyboard; do not activate windows, steal focus, change the user's tabs or clipboard, or trigger native print/file-picker/save dialogs. Such native checks remain NOT_RUN/manual. Browser-tool-supported operations without OS dialogs and background CLI tests/builds remain allowed. Preserve prior actual evidence; never turn missing tests into PASS.


---

## 原文件 TASKS.md

# 里程碑任務：箱內排列容量試算

狀態：**主代理已獨立驗收並放行 M2；M2 工具鏈及 PUBLIC 來源候選已固定，待主代理驗收。** 最後 59-test、production 與乾淨來源 gates 通過；M1 public bytes 未變。既有 UI 證據保留，後續 UI 仍為 NOT_RUN_USER_FOCUS_INCIDENT。所有實際狀態、命令和未驗原因寫入 HANDOFF.md 與 docs/RELEASE-CANDIDATE.md；不得把 oracle 當成測試證據。

任務和安全入口見 [AGENTS.md](AGENTS.md)、[START-HERE.md](START-HERE.md)、[TASK-ENTRY.md](TASK-ENTRY.md)、[HANDOFF.md](HANDOFF.md)。工程、隱私、設計及發布規則見 docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/BRAND.md、docs/DESIGN-SYSTEM.md、docs/RELEASE.md、docs/RELEASE-CANDIDATE.md、docs/GIT-PUBLICATION-SAFETY.md。

## M0 — 自包含產品規格

- [x] 定義單一朝向均勻格、間隙語義、旋轉順序、精確 API 與輸出。
- [x] 定義尺寸範圍、輸入文法、固定點 BigInt 公式、錯誤順序和 hostile schema 案例。
- [x] 定義雙語 desktop/mobile 畫布、SEO、使用環境和 30 組核心／20 組瀏覽器 oracle。
- [x] 主代理已在 W18-33-M1 dispatch 明確確認 M0 主審通過並放行 M1。
- [x] 放行前維持規格階段；M1 dispatch 後才實作及執行產品檢查。

M0 唯一可修改文件為 README.md、PRODUCT.md、TECHNICAL.md、UX-SEO.md、ACCEPTANCE.md、TASKS.md。共通文件由主代理維護，本規格不授權修改。

## M1 — 完整本機產品

開始條件：主代理明確放行 M0，原功能對話收到固定的六份規格及本工具共通文件。requested model 為 gpt-6.1-sol/max；不能以自述代替 backend identity 證據。

### T00 — 開工基線與安全

- 讀本工具六規格與已存在的共通文件，確認允許路徑、Node 24+、port 4213、唯一 task evidence 目錄和環境 guard 前後狀態。
- 僅原功能對話實作；M1 loopback 預覽只綁 127.0.0.1:4213。5213 是 M2 本機 production model，不是試算 API 或公網服務。
- 不安裝套件、不讀憑證、不改 persistent environment、Git 全域設定或其他產品，不停止別人服務。

### T01 — 純函式、schema 與精確 oracle

- 實作 calculateBoxFit(request)，逐項符合 TECHNICAL.md 的固定 schema、錯誤 precedence、BigInt 單位、六向排序、穩定 tie 和 no-fit 語義。
- 將 ACCEPTANCE C01–C30 轉為離線 Node 測試，expected 全部獨立手寫。核對最大 total 10^21 以十進位字串輸出，count 欄位均安全整數；getter 不執行、錯誤無 partial/raw echo、request 不變。
- 發現公式或手算不一致先停止並回報輸入與差異，不改範圍或調整 oracle 來消除失敗。
- Gate：核心測試通過，並另做不依賴實作的有界性檢查，確定每軸 count ≤10,000,000、單層 count ≤10^14。

### T02 — 雙語主要畫布

- 建立 /index.html 和 /en/index.html、原生 HTML/CSS/ESM、箱尺寸／單件尺寸／gap／rotation 表單、朝向比較表與 fixed bilingual copy。
- 預設尺寸空白、gap raw="0"、rotation=true、無結果；不自動載入範例或試算。錯誤、no-fit、勝出和並列依規格正確呈現。
- 初始所有 controls disabled、input 無 name；最早同步 submit capture listener 第一個動作 preventDefault；初始化與所有 listener 完成後才 enable。缺 JS/初始化錯誤保持 fail-closed。
- 兩語實際完成 C01 主流程、旋轉六列 C02、並列、清除、語言切換及無解狀態。輸入錯誤可修正，表單沒有 partial/stale result。
- Gate：B01–B05、B08–B12、B17–B20。

### T03 — revision、清除與頁面生命週期

- 每次尺寸、gap 或 rotation 變更同步 revision++、result=null；成功或錯誤後修改任一欄都不保留舊表格。
- 依 PRODUCT.md 初始狀態決定 clear/language confirm；取消完整保留，確認回空白尺寸、0 gap、rotation=true、無結果。
- pagehide 清理記憶體輸入與結果，BFCache persisted pageshow 回初始狀態；不持久保存或由 URL 還原。
- 不加 copy、download、buildReport、clipboard Promise、object URL、分享、Storage 或伺服器歷史。
- Gate：B09–B12、B18、B20。

### T04 — 靜態安全、離線測試與 preview

- 依 docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md 和 docs/RELEASE.md 實作必要檢查、build、loopback server、MIME/405/404 與 M1 noindex；不實作雲端或計算 API。
- 動態資料使用 textContent/value；不加外部 fonts/scripts/packages/analytics；不寫 URL、console、cookie、history 或 storage。
- 執行 Node test/check/build 並保存實際命令與 exit code；測 preview 只綁 127.0.0.1:4213，不被既有 port 衝突時停止別人程序。
- Gate：B02、B15–B17、靜態安全掃描與兩語頁可服務。

### T05 — 小螢幕、鍵盤與可讀性

- 實測 320 CSS px、200% zoom、鍵盤、長英文、七欄逐一錯誤、局部表格水平捲動、大結果換行與 decimal point 輔助。
- 檢查表頭 scope/caption、欄位錯誤關聯、焦點、觸控目標和 reduced motion；整頁不得水平溢位。
- 手機原生鍵盤、螢幕閱讀器、完整 Network/Storage、冷啟動離線與實體裝箱若無實際環境，各自記 NOT_RUN，不用 mock 假稱通過。
- Gate：B06–B08、B13–B16、B19。

### T06 — M1 候選與主代理獨立驗收

- 候選穩定後對最後版本跑 node --version、npm test、npm run check、npm run build；在 loopback 4213 手動走兩語。修正後只重跑受影響 gate。
- 記錄 C01–C30、B01–B20 的 pass/fail/NOT_RUN、環境、命令和證據。真機或原生環境未驗的限制逐項列出。
- 固定 source manifest、靜態 build、preview noindex、desktop/mobile UI 及兩語核心流程交主代理獨立驗收。未收到書面 GO 不開始 M2。
- M1 不含公開來源、正式網域、Cloudflare、homepage catalog 或部署。

## M2 — 主代理 GO 後，原功能對話建立 production 工具鏈並公開來源

W18-33-M2 GO 已收到，範圍僅背景 CLI／檔案。PUBLIC repo 與固定 commit 已驗證，M2 待主代理來源及產物驗收。沒有恢復 UI，也未進入 M3。

- 開始條件：M1 source 和 evidence 固定且主代理書面 GO。原功能對話按本工具 docs/RELEASE.md 建立 production build/check/preview、獨立 dist-production、正式 canonical/alternate、安全 headers、robots/sitemap、404 及本機 model 127.0.0.1:5213；preview assets 不得改寫。
- production 和 release checks 離線可重現；核對未知路徑/方法、404 無 SPA fallback、資產 MIME、robots 可取用所需 CSS/JS、CSP hash、兩語正式 URL/meta/header 和隔離 build。
- 按 docs/GIT-PUBLICATION-SAFETY.md 在 reviewed publishing copy 只發布此工具至 public KYStr/glossquote-labs-box-fit。保留既有 CLI 狀態；不讀 token、不寫 global/system Git 或 environment。來源公開與 live hosting 分開記錄。
- 固定 commit 後驗 public visibility、remote commit、由 commit 產生的 ZIP 根目錄與逐檔 bytes/SHA、乾淨副本必要 gates。缺認證或 guard 異常即停下回報，不自行修復設定。
- M2 不部署 Cloudflare、不更改 homepage catalog、不把 preview 頁發布為正式頁。交主代理再驗收。

## M3 — 僅主代理正式部署與首頁整合

- 只在 M2 與主代理 gates 完成後由主代理部署到免費 Cloudflare 候選 boxfit.glossquote.com；驗兩語 live body、headers、canonical/hreflang、robots/sitemap、CSP、404 與核心流程。
- live release 驗收通過後再將兩語 homepage catalog 草稿改為 published，重建、驗證並發布首頁來源，再部署共用首頁；確認繁中與英文入口各連到對應語言工具頁。
- 記錄 source commit、repo visibility、hosting 狀態、homepage 狀態及 NOT_RUN 分開。每版交付標記 awaiting external review；只在使用者或 reviewer 確認後完成該版。



## Browser-only testing restriction (user, 2026-10-18)

Use browser tools in task-owned isolated/hidden tabs only. Do not control the desktop, native applications or OS mouse/keyboard; do not activate windows, steal focus, change the user's tabs or clipboard, or trigger native print/file-picker/save dialogs. Such native checks remain NOT_RUN/manual. Browser-tool-supported operations without OS dialogs and background CLI tests/builds remain allowed. Preserve prior actual evidence; never turn missing tests into PASS.

