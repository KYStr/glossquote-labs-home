# CSS 卡片陰影編輯器 / Box Shadow Builder

Spec ID：`spec-box-shadow-builder-v1`  
版本：v1 r1，2026-10-30  
交付：完整製作規格候選；不是產品實作、上線結果或已通過品質評分。

## 1 目標與成功條件

### 1.1 對象與問題

網站維護者需要為卡片調整陰影的方向、邊緣柔和程度、擴散與前後層次；只有色票不能描述這些幾何變化，手寫多層 CSS 又容易混淆清單順序與內陰影。使用者在同一頁填有界參數，以正常按鈕產生同一快照的卡片預覽、可讀參數摘要及可帶走的 CSS。

這是具體使用情境與需求假設，不聲稱曾訪談、量到使用率或證明節省多少時間。用途不是自動決定「最佳設計」，也不對任意網站的背景、裁切或層疊上下文保證相同外觀。

### 1.2 可觀察成果

1. 初次進入即能理解偏移、模糊、擴散、顏色、不透明度及內外模式的差別；不依賴原始碼或隱藏入口。
2. 以 1–4 層有效輸入，產生一次確定格式的 `box-shadow`；預覽、摘要、複製及下載使用同一不可變快照，不能各自重讀正在編輯的欄位。
3. 正常按鈕能新增、刪除及前後移動整層；錯誤指出具體層與欄位，不默默截斷、校正或丟棄失敗層。
4. 任何輸入或結構改變後，舊預覽及舊輸出立即失效；使用者不能把上一組陰影誤當目前結果。
5. 使用者可用鍵盤完成全程，輸出可選取；複製失敗有可用替代，不把「已提出下載」宣稱為磁碟保存成功。
6. 真桌面瀏覽器顯示原生 CSS 陰影；純函式、DOM 替身或截圖猜測不能替代這項品質證據。

## 2 範圍、來源及不重複性

### 2.1 納入與排除

納入：1–4 個有序陰影層；水平/垂直偏移、模糊、擴散、六位 HEX、整數不透明度與 outer/inset；原生 CSS 卡片預覽；雙語參數摘要及欄位錯誤；明確產生、清除、複製、下載；鍵盤及窄視窗操作；無持久化的本機記憶體狀態。

排除：任意 CSS 匯入、貼整段 CSS 解析、CSS 變數、色名、短 HEX、八位 HEX、任意單位、text-shadow、filter/drop-shadow、漸層、陰影動畫、拖曳排序、圖片上傳/Canvas/PNG 匯出、自動配色或對比評分、帳戶、遠端服務、分析追蹤、儲存歷史、分享含輸入的 URL、套件安裝。預覽背景、卡片尺寸和圓角不提供自由輸入、不納入匯出的 CSS。

這份規格只交公開來源文件及 draft PR，不改首頁/catalog、不部署、不建立新網站、工作流程、權限、服務或費用。正式製作須另有合法 production task 與本人 claim；本規格的 claim 不授予產品製作所有權。

### 2.2 固定來源與相近項比較

開工 brief：[368fb4ba 固定文件](https://github.com/KYStr/glossquote-labs-home/blob/368fb4ba06b884bc126d0186355d197efc90b285/docs/specs/box-shadow-builder/BRIEF.md)。主頁基線：[26525d5 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。用途與全站雙語/隱私原則沿用，沒有藉此宣稱授權條款已選定。

| 已存在方向與固定文件 | 它處理什麼 | 本工具不能混作同一件的差異 |
| --- | --- | --- |
| [Color Palette](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/10-color-palette/SPEC.md) | 單色轉換、平面對比、色票及 color/background-color 配對 | 本件輸入有符號幾何、模糊、擴散、內外模式及有序多層，輸出 box-shadow；不重做對比評分。 |
| [Linear Gradient Builder](https://github.com/KYStr/glossquote-labs-home/blob/aaa8ff63e8673efccc0c21ff2d32632a510f7f42/docs/specs/linear-gradient-builder/SPEC.md) | 角度、停止點和 background-image | 本件沒有角度或色彩停止點；陰影不填充卡片背景，內外繪製平面及 spread 語義不同。 |
| [Image Overlay](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/53-image-overlay/SPEC.md) | 兩張點陣圖逐像素混合與 PNG/JSON | 本件不接檔案、不跑像素迴圈、不輸出圖片，而是可貼用的限定 CSS。 |

[固定 catalog 快照](https://github.com/KYStr/glossquote-labs-home/blob/dd059fc489ffc79c64754182ce09bc84151ae054/catalog.json) 的 56 個展示項不是 ready 庫存；[開工前 registry319](https://github.com/KYStr/glossquote-labs-home/blob/c6b91394a25064b62b4d61c69666e59933fafe7d/coordination/work-registry.json) 也不是之後接工的即時狀態。承接前須重新讀 registry、PR、兩端盤點及 owner；不能以顯示項、reserved、草稿或已消耗的 ready 當可取庫存。

### 2.3 原生 CSS 語義基線

依 [CSS Backgrounds and Borders 3 固定版本 §6.1](https://www.w3.org/TR/2024/CRD-css-backgrounds-3-20240311/#box-shadow)：正水平/垂直偏移對應右/下，模糊不得負；spread 改變陰影輪廓。outer 在卡片背景下方，inset 在背景上方；同一平面的清單先列者在前，不能靠排序讓 outer 跨到 inset 上方。模糊的精確演算法不是跨瀏覽器逐像素契約，陰影本身不增加盒子的排版尺寸。

產品應用此語義，不重做瀏覽器陰影演算法。特別說明：正偏移的 inset 可能在卡片內的左/上側形成可見帶，不應把 outer 的「右下投影」提示直接套給 inset。

## 3 正常使用流程與狀態

### 3.1 初始頁與明確產生

頁面一進入包含用途短句、限制、表單、層序說明、產生按鈕、清除按鈕、語言切換及尚無結果的預覽區。初始只有一層：

| 欄位 | 原始字串/選項 |
| --- | --- |
| x / y / blur / spread | `"0"` / `"8"` / `"16"` / `"0"` |
| hex / opacity / mode | `""` / `"25"` / `"outer"` |

HEX 留空，不偷偷載入有效範例或自動產生結果。常見格式例放在說明，不以 placeholder 冒充已填值。產生按鈕可按以取得明確錯誤；結果、複製及下載起初不存在/不可用。輸出區可預留標題和「尚未產生」文字，不能呈現一個像成功結果的預設陰影。

正常流程：填六位 HEX → 按產生 → 先完成全部驗證及受支援檢查 → 原子顯示預覽/摘要/CSS → 需要時複製或下載。沒有 input 即時自動生成，也沒有網路載入示範。

### 3.2 編輯、增刪與順序

每層以 fieldset/legend 顯示「第 N 層」，每個欄位有獨立 label、單位、範圍及說明關聯。x/y/spread 可負；blur 不可負。數值用原始文字輸入，不能用 number 控制項或 valueAsNumber 偷改非法字串。可提供 inputmode 作輸入提示，但不能依賴它驗證。沒有會靜默截短貼上的 maxlength。

新增使用正常按鈕，最多四層，附加與初始相同的原始值及空 HEX，焦點移到新層 HEX。四層時新增停用並有可讀原因。只有一層時刪除停用；刪除後聚焦原索引的新層 HEX，若原索引超過末尾則聚焦上一層 HEX。

「往前一層 / Move earlier」把該整層與前一層交換；「往後一層 / Move later」與後一層交換。端點按鈕停用，資料、錯誤與欄位 ID 一起跟隨穩定層 ID；完成後焦點在被移動層的 HEX，而非變成 disabled 的按鈕。序號與摘要重排，不另排序顏色、數值或 outer/inset。第一層不是永遠「最上面的一切」：不同模式的平面由 CSS 決定。

任何 input、change、compositionstart、有效增刪或排序，先增加 generation 並撤下全部已產生結果、成功訊息、複製/下載能力及舊 Blob URL，再處理編輯。即使值最後改回原值，也須再次按產生。composition 期間禁止產生；compositionend 不自動生成。無效果的端點操作不得改資料或製造結果。

### 3.3 修錯與結果取出

產生時只顯示第 4 節規定的首錯，焦點移到對應欄位，aria-invalid 與可讀錯誤同步；錯誤代碼不直接當使用者文案。清楚說是哪一層、哪個欄位、正確格式/界限，不回顯整段不可信輸入。修正後再次產生，不能保留先前成功的 CSS 供誤用。

成功時顯示：
- 第 N 層的 x/y/blur/spread、標準大寫 HEX、不透明度百分比及內外模式。
- 目前快照的原生陰影預覽；「僅預覽：白色 160×96 px、12 px 圓角、固定背景，不在匯出 CSS 中」。
- 唯讀但可選取的完整 CSS 文字，以及產生狀態、複製及下載按鈕。
- 「全透明或縮小的陰影可能看不見；這不代表輸出失敗」的適當提示；不要聲稱檢測出每個像素是否可見。

複製只在一次明確 click 的使用者手勢中呼叫 writeText；拒絕/不支援/應用等待逾 3 秒時顯示「無法確認複製，請選取下方文字自行複製」，不讀剪貼簿、不呼叫隱藏 execCommand。待處理時停用複製，最多一個目前 generation 的應用請求。3 秒是應用等待界，不保證已取消作業系統操作；過期 promise 不能更改 UI。之後顯式重試可以開始新請求，不把舊 OS 操作宣稱撤回。

下載以同一快照的 Blob 及固定檔名提出一次原生下載，不需檔案讀寫權限。通知用「已提出下載，請檢查瀏覽器下載項目」，只有測試實讀檔案後才可在證據中稱 bytes 相同。

### 3.4 清除、語言及頁面生命週期

清除及切換語言若已有非初始 raw、結果或 pending 動作，先用可及性對話框提示會丟棄本頁內容。取消完全保留 raw、層序、generation/有效結果與焦點回到觸發按鈕；取消不可因進出 dialog 自動失效。對話框開啟時禁止表單及取出動作。確認清除回初始一層/空 HEX，清錯誤與所有暫態，焦點到第一層 HEX。

語言確認後到同工具另一固定語言頁；不把輸入寫到 URL、storage 或 history state。無資料時直接切換。切換取消不得改文件 lang/title 或混出兩種語言。預覽/輸出文案語言一致；CSS 固定中文註解是輸出契約，英文頁須明示，不偷偷變輸出 bytes。

document hidden：撤下結果、使 pending 回調過期並撤銷 Blob URL，保留原始欄位；回到 visible 仍要再次按產生。pagehide：清除所有 raw、結果及暫態至初始；pageshow 也再次重設，防 BFCache 復原舊資料。一般重新載入也是初始，不做恢復承諾。上述清除只描述應用可控記憶體/DOM，不保證瀏覽器、作業系統或已下載檔案的安全抹除。

## 4 輸入、驗證與輸出契約

### 4.1 純核心與有界 schema

公開純核心入口名稱為 `buildShadow(request)`。頂層只能有 own data property `layers`；layers 必須是長度 1–4 的非稀疏普通 Array，沒有額外 named/symbol properties。每層是普通 Object 或 null-prototype Object，且只有以下七個 own data properties：`x,y,blur,spread,hex,opacity,mode`。全部值是 primitive string，不接受 getter/setter、Symbol、boxed primitive、非普通 prototype、額外 key 或繼承欄位。

這是受控頁面的資料 API，不是任意 JavaScript Proxy 的安全沙箱。頁面只建立本地普通資料物件；外部呼叫若因反射/Proxy throw，邊界接成固定 internal failure，不呈現 stack 或輸入。驗證不遞迴遍歷任意物件、不呼叫其 toString/valueOf，不解讀 URL/HTML/JS。

先核頂層形狀與 layers 類型，再核長度，再核 dense/額外 array keys；最多逐一走四層。每層先核 shape/data descriptors，再按 x、y、blur、spread、hex、opacity、mode 驗值。前一層值錯誤優先於後一層錯誤；同層 shape 錯誤優先於任何值錯誤。shape 的 key 缺失/額外/存取子統一 E_SCHEMA，不依物件列舉順序選不同錯誤。

| 欄位 | 原始長度上限 | 格式與範圍 |
| --- | --- | --- |
| x, y | 各 3 UTF-16 code units | ASCII canonical 整數字串，−48 至 48，單位 px |
| blur | 2 | 同格式但 0 至 64；負數即使格式成立仍越界 |
| spread | 3 | 同格式，−24 至 24，單位 px |
| hex | 7 | 精確 `#` 加六個 ASCII 十六進位字元，大小寫皆可 |
| opacity | 3 | 同整數格式，0 至 100，表示百分比 |
| mode | 5 | 只接受 `outer` 或 `inset`，大小寫敏感 |

canonical 整數只接受 `0` 或可選 ASCII 減號接 1–9 開頭的十進位數字；`-0`、`+1`、`01`、小數、指數、空字串、任何空白及全形數字都拒絕。長度先檢查，不先 trim 或 Number；長度合格且格式通過後才轉有界整數。blur 上限長度 2 不代表負數一律 E_RANGE：例如 `-1` 是 E_RANGE，而 `-64` 長度 3 是 E_RAW_LENGTH；優先序必須可測且前後一致。

錯誤結果固定 `{ok:false,error:{code,path}}`，只放代碼與固定/索引路徑，不含 raw、部分 CSS 或部分摘要。成功固定 `{ok:true,layers,shadowValue,css,cssBytes}`：layers 是新建的標準化數值/大寫 HEX/模式資料；不引用或修改輸入。cssBytes 是 TextEncoder 的 UTF-8 bytes 數，不是 JavaScript 字串長度；不把 Uint8Array 放進 DOM。

### 4.2 錯誤優先序與精確例

| 順序/代碼 | 情況 | path 例 |
| --- | --- | --- |
| E_SCHEMA | 頂層/陣列/層的結構、descriptor 或密度不符 | `request`、`layers`、`layers[0]` |
| E_LAYER_COUNT | layers 是 Array，但 length 為 0 或大於 4；先於檢查元素 | `layers` |
| E_TYPE | 按既定欄位順序遇到非 primitive string | `layers[0].x` |
| E_RAW_LENGTH | 該欄長度超過表列上限 | 該欄 |
| E_INTEGER | x/y/blur/spread/opacity 格式不符 | 該欄 |
| E_RANGE | 整數格式正確但超範圍 | 該欄 |
| E_HEX | hex 長度未超限但不符六位 HEX | 該欄 |
| E_MODE | mode 長度未超限但不是兩個選項 | 該欄 |
| E_OUTPUT_LIMIT | 完整 CSS UTF-8 bytes 意外超過 1024，防守性拒絕 | `output` |

表格列的是各檢查階段，不是跨所有層重新排序代碼；第 4.1 節逐層/逐欄規則優先。例：第一層 x=`"+"` 且 hex 非法，回 E_INTEGER/x；第一層 x=`"0"`、hex=`"red"` 且第二層有額外 key，先回 E_HEX/第一層hex。第一層含 getter 即 E_SCHEMA，不讀 getter；長度五的 layers 不讀任何元素，先 E_LAYER_COUNT。

有效：x=`"-48"`、y=`"48"`、blur=`"64"`、spread=`"-24"`、hex=`"#aB00fF"`、opacity=`"0"`、mode=`"inset"`。全透明仍合法。
無效：x=`"-49"`→E_RANGE；x=`" 1"`→E_INTEGER；x=`"1e2"`→E_INTEGER；blur=`"-1"`→E_RANGE；hex=`"#ABC"`→E_HEX；hex=`"#AABBCCDD"`→E_RAW_LENGTH；opacity=`"101"`→E_RANGE；mode=`"Outer"`→E_MODE；mode=`"inset "`→E_RAW_LENGTH。不要因 UI 選單平常不會提供非法 mode 就省略核心檢查。

### 4.3 確定 CSS 序列化

標準化 HEX 轉 R/G/B 三個 0–255 整數，十進位無前導零。不透明度 p=0 輸出 `0`，p=100 輸出 `1`，其餘固定兩位小數 `0.01`…`0.99`；p=10 為 `0.10`。從整數字串組裝，不靠浮點格式化或瀏覽器 CSSOM 再序列化。

每層固定格式：
- outer：`Xpx Ypx Bpx Spx rgba(R, G, B, A)`
- inset：`inset Xpx Ypx Bpx Spx rgba(R, G, B, A)`

四個長度即使為零也帶 px；只用 ASCII space。層與層以逗號加一個 space 連接，保留順序，不加換行、不略去看不見的層。CSS 固定三行，每個非空行有中文說明，LF 換行、無 BOM、最後一個 LF；無額外空行：

```css
.shadow-card { /* 卡片陰影：固定類別，不含預覽輔助樣式 */
  box-shadow: 0px 8px 16px 0px rgba(17, 34, 51, 0.25); /* 有序陰影：數值已驗證，內外繪製平面不同 */
} /* 卡片陰影規則結束 */
```

上例是單層 x0/y8/blur16/spread0/#112233/opacity25/outer 的完整期望輸出。selector 永遠 `.shadow-card`，不接受名稱輸入；註解固定，不插入使用者 raw/層名。中文/英文頁給同一組 raw 時 css 必須逐 bytes 相同。

兩層期望 shadowValue：
`-4px 8px 16px 0px rgba(17, 34, 51, 0.25), inset 0px 0px 0px 2px rgba(255, 0, 0, 1)`。
輸入依序為第一層 −4/8/16/0/#112233/25/outer；第二層 0/0/0/2/#FF0000/100/inset。把兩層交換必須只交換這兩段，不變更任何內部值。

### 4.4 檔案及暫態輸出

下載檔名固定 `shadow.css`，Blob type `text/css;charset=utf-8`。複製、readonly textarea、Blob bytes 都直接使用核心成功結果 css，不從 CSSOM、innerText 或重新計算取得；textarea 不自動換行寫回內容。輸出最大 1024 bytes，無壓縮、資料 URL 或多檔 ZIP。

同時最多保存一個目前快照的 Blob URL。每次顯式下載先撤銷前一個，再建立新的；新 URL 最長保留 30 秒，或在任何失效/清除/hidden/pagehide/dispose 時立即撤銷，以先到者為準。舊計時器不得誤撤銷後來的新 URL；用 URL token 比對並清除舊 timer。不得立刻 revoke 到正常瀏覽器尚未接收下載；30 秒不是對所有下載器成功的保證。

## 5 實作與交付架構

### 5.1 最小結構與開發順序

預定同 repo `tools/box-shadow-builder/`：`index.html`（繁中）、`en/index.html`、`styles.css`、`core.mjs`、`controller.mjs`、`app.mjs`、`i18n.mjs`、`tests/*.test.mjs`、`README.md`、`PROVENANCE.md`。靜態原生 ESM；Node 24 內建 test/assert/fs 可做離線測試，不要求 npm install、bundler、CDN、外部字型/圖示或新的套件。若現行 repo 工具入口需要別名，須在交付列實際路徑與對應，不默默少交責任。

先寫純核心與獨立固定 expected，再寫 controller generation/URL/clipboard 狀態，再接真 DOM/本地 CSS 規則與雙語，最後做真桌面正常操作及實際檔案核對。新作者程式每個非空行有具體中文註解，不用無意義「這行程式」灌字；既有第三方原碼不改 hash 來湊註解。此規格不要求新增第三方程式。

core 不碰 DOM、storage、網路、時鐘、剪貼簿或 URL。controller 接收明確依賴，用於測晚到回調及清理；app 把真按鈕/欄位/visibility 接到 controller。測試依賴可替換，但產品的預覽、焦點、下載及正常瀏覽器證據不能用替身結果充當。

### 5.2 原生預覽及安全出口

預覽只用已驗證 shadowValue 設到同源外部 stylesheet 中預先存在的唯一預覽規則。只更新該 CSSStyleRule 的 box-shadow property，不建立任意 selector、不以 raw style/cssText、innerHTML、eval、Function 或 HTML template 注入使用者值。CSS.supports 檢查限定 property/value；規則缺失、不支援或 CSSOM throw 時清掉整個輸出快照並顯示固定「此瀏覽器無法建立預覽」，不得留下有 CSS 但預覽其實舊值的半成功。

DOM 文案與摘要用 textContent/原生 value/安全節點；資料不寫 dataset 供其他程式解析。HTML 中只有固定 ID/class，沒有 inline event handler。數字/HEX/模式通過限定格式後才生成 CSS；惡意 `url(...)`、`</style>`、`;color:red` 應在驗證階段失敗，不能發出額外請求。

CSP 最少：default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'。在正規 HTTP 環境檢查有效 policy 與 CSSOM 預覽；不能只搜到 meta 字串便宣稱生效。若使用 meta，放在所有可載入資源前；frame-ancestors 不能以 meta 當有效保護，不虛報。無 unsafe-inline/eval、遠端資源或動態安裝。

剪貼簿 writeText 只在顯式手勢取出生成文字，無 readText。下載只出由核心建立的固定 MIME/檔名文字；無檔案輸入、網路傳輸或瀏覽器 File System Access 權限。所有原始欄位與結果只在記憶體，無 local/sessionStorage、IndexedDB、cookie、service worker、telemetry 或傳輸 query/hash；靜態資源正常 GET 與 hosting 自身記錄不冒稱應用能消除。

### 5.3 具體預覽幾何與可及性

空白卡片寬 160 px、高 96 px、border 0、border-radius 12 px、背景 #FFFFFF；舞台背景 #E5E7EB、固定 640×448 px，卡片置中。預覽是本工具的比較條件，不出現在匯出 CSS。卡片內不放必讀文字/按鈕，避免 inset 蓋住內容；外部以可讀區域名稱及摘要說明用途。預覽不受使用者可輸入尺寸影響。

舞台外層是有名稱、可聚焦及鍵盤可捲動的局部 viewport；在 320 CSS px 視窗容許這個區域橫向捲動，但表單/頁面其他部分不得造成整頁橫向捲動。固定舞台留白是實用顯示範圍，不宣稱 Gaussian 模糊尾巴在邊界必為零；有必要的裁切只限預覽容器，不能裁掉欄位/錯誤/取出控制。提示陰影不佔排版尺寸，帶到其他網站還受容器 overflow 等條件影響。

所有正常控制能 Tab/Shift+Tab 到達，焦點明顯；fieldset/legend/label、aria-describedby、首錯 aria-invalid 對應真節點。成功及下載提示使用非打斷式 status live region，錯誤用可通知機制且不重複連續朗讀。不能只靠紅色區分錯誤、只靠預覽判參數或以 tooltip 才知道上下限。

對話框用正常 modal 語義及焦點管理，Esc 等同取消；返回觸發點且不穿透操作。原生焦點、螢幕閱讀器抽查、200% zoom 與高對比/forced-colors 基本可用性要單獨留證；看得到 HTML aria 屬性不等於實際可及性已測。

### 5.4 雙語、SEO、維護文件

繁中與英文每個正常狀態/限制/錯誤/對話框/層序/下載/生命週期提示均有對應鍵；不從任意錯誤訊息動態拼接 raw。頁面 lang、title、description、h1 各自正確；固定相對語言連結不含輸入。公開網址未確定時不造 canonical/hreflang 絕對網址或發布聲明；交付記為部署後核實項，不能藉此假稱已上線 SEO。

README 包含從乾淨 checkout 用 Node 24 跑必要檢查、無依賴/無生成步驟、真瀏覽器開啟與測試入口、限制、所有檔案角色及小幅擴充方法。擴充示例須不改本版固定範圍地說明「若另版增加預設樣式」需改哪些契約/測試，不能直接插入本版功能。PROVENANCE 列原創檔、固定規格/主頁來源及任何沿用檔；保留既有 notices，未有來源授權不代選全 repo license。公開可讀不等於任意再授權。

## 6 九面向產品驗收

這一節是之後同一實作候選的品質規格，現在沒有產品數值。每個面向須有可重現方法、實際觀察及固定證據連結，九項各至少 90 且所有必要檢查完成；任一未測/缺證明示 NOT_RUN，不以其他高分平均抵銷，也不從規格八節完整度換算分數。評者須獨立於產品作者，識別固定 commit/檔案 bytes；同名修改後不能沿用舊結論而不核差異。

| 面向 | 必要方法與成功觀察 | 必交證據與不可替代界線 |
| --- | --- | --- |
| functionality | 真 UI 完成一層、兩層含 inset、四層增刪排序、修錯、取出；三種輸出同 snapshot；同平面層序與 inset 正偏移語義正確 | 核心固定 expected、正常操作紀錄、真預覽與實際下載 bytes；只有 core 綠測不夠 |
| boundaries | 全數值端點及相鄰、raw 格式/長度、0/1/4/5 層、全透明、負 spread、首錯優先序、晚到 promise/URL/token | 逐 case 輸入與獨立 expected，失效前後觀察；不得直接注入成功 flags |
| privacy | 新開、輸入、取出、hidden/pagehide/回復後沒有應用持久化/傳輸輸入；確認不讀剪貼簿 | 原始碼出口核與真瀏覽器 network/storage/URL 觀察；不保證 OS 安全抹除 |
| security | 惡意 CSS/HTML/URL 不能到 sink；CSP 真生效、固定 rule/selector/MIME/file；無外部依賴或隱藏網路 | 正負例、實際 policy/console/network；純字串掃描不能代完整效果 |
| usability | 非作者依可見說明完成指定任務，知道 spread/blur/內外/順序與透明結果差別；錯誤可修、取出可恢復 | 非作者正常 UI 步驟/困難點/修正前後；讀過實作的熟手不得假稱盲首次上手 |
| accessibility | 全流程鍵盤/焦點/對話框/錯誤/狀態可用，螢幕閱讀器必要抽查，200% zoom、窄視窗與局部預覽捲動 | 實際瀏覽器/輔助工具名稱版本及觀察；DOM 替身只驗事件契約 |
| localization-seo | 兩語完整、不混語、lang/title/description/h1/連結正確；同 raw CSS bytes 不變 | 雙語正常流程與靜態 head 核對；公開 URL 未有則明列部署項未測，不捏造搜尋排名 |
| toolchain-provenance | 乾淨來源可離線檢查、零依賴/無隱藏生成、來源與權利界線清楚；新作者碼中文註解具體，文件能支持非作者修改/復原 | 固定 tree/hash、乾淨命令完整終態、必要擴充/復原紀錄；作者自稱可建不夠 |
| compatibility | 指定桌面 Chromium 的 native CSS、copy 成功/拒絕、實際 download、BFCache/hidden、布局可用；能力缺失安全降級 | 真瀏覽器版本/OS/視窗/安全 origin、操作與檔案證據；mobile/其他引擎未測明列，不用 UA/mock 冒實機 |

分數若有既定評分程序按原程序，不另造權重讓缺項過關。100% 不透明和 0% 透明不是品質分數；作者 tests 數量也不是評分。至少上述桌面真使用證據是必要的；手機或未指定引擎可列未測限制，不擅自增加未授設備/費用/服務。

## 7 測試計畫與獨立 oracle

### 7.1 固定資料與純核心

T01 單層：用第 4.3 節 #112233 範例，逐字比對完整三行 CSS、LF/terminal LF、cssBytes、摘要標準化及輸入不變。expected 必須來自本規格固定文字，不用同一 production serializer 生成 expected。

T02 兩層：用第 4.3 節精確 shadowValue，交換完整層後 expected 只交換兩段；同值四層保留四段，不去重。輸入中小寫 HEX 與大寫產出同 CSS，摘要 HEX 大寫；百分比 0/1/10/99/100 各為 0/0.01/0.10/0.99/1。

T03 每個數值的合法邊界及相鄰：x/y = −49/−48/−47/47/48/49；blur = −1/0/1/63/64/65；spread = −25/−24/−23/23/24/25；opacity = −1/0/1/99/100/101。每次只改一欄，其他保持有效；越界與合法逐一明列，不讓一個較早錯誤掩蓋真正待測欄。

T04 raw 與 schema：空字串、space/tab/newline、+1、-0、01、1.0、1e2、全形、非字串、精確長度上限及 +1；#000000/#FFFFFF/#aB00fF、#ABC、#AABBCCDD、red、缺#、非法碼點。mode outer/inset/Outer/空白尾隨；缺 key/extra key/accessor/symbol/null/sparsearray/假 array；0/1/4/5 層。accessor getter 計數為零；五層陣列內即使 getter 也先 E_LAYER_COUNT。

T05 優先序：同層 shape+數值錯、同層 x+hex 錯、前層值+後層 shape 錯，對照第 4.2 節精確 path/code。不得只測 returns false。巨長 raw 先 length 拒絕，不跑 regex/Number/DOM；這不是無限輸入服務的抗 DoS 保證。

T06 最大格式：四層取最長合法長度 token、RGB 三位、不透明度兩位小數及 inset，獨立計算 UTF-8 bytes，小於等於 1024；固定中文註解也計入。正確檔名/MIME/無 BOM/LF。E_OUTPUT_LIMIT 是防守性路徑：若合法輸入無法到達，不靠修改公開上限假造可達測試，明列它由靜態長度上界保障；可另測內部封裝 guard，但不稱正常使用能觸發。

### 7.2 控制器、清理與故障

T07 每種 input/change/compositionstart/add/remove/reorder 都在後續動作前使舊結果失效；改回同值仍不能直接 copy/download。composition 中 Generate 不生成；end 後仍需 click。逐一核 raw 不被偷偷 trim/clamp。排序焦點跟層 ID，端點無效動作不改資料。

T08 clipboard：成功、拒絕、API 不在、3 秒 timeout；pending 時 edit/clear/hidden/pagehide/語言確認，再讓舊 promise resolve/reject，不能復活成功訊息/輸出或把新 generation 按鈕狀態覆蓋。pending 取消對話框則原狀態按真事件發展，不憑取消額外重置；不要聲稱 OS 舊 write 被取消。

T09 Blob URL：連續下載只保留一個，替換時 revoke 原；30 秒 timer、edit、clear、hidden、pagehide、dispose 各撤銷；舊 timer 在新 URL 存在時不能撤銷新 URL。沒有有效快照或對話框開啟時不得 createObjectURL/click下載。

T10 失敗原子性：core error、CSS.supports false、預覽 rule 不在、設定 CSSOM throw、Blob/createObjectURL throw/下載 click throw。前四者不得留下半成功的預覽或輸出；後三者只報下載失敗並清理已建 URL，保留有效快照供選取/重試，不把一次取出失敗當產生失敗。通知不含 exception stack/raw。這些有替身的定向測試只證分支契約，實際能力另做真瀏覽器。

T11 頁面與雙語：hidden 保留 raw 但清結果；visible 不自動恢復；pagehide/pageshow 全重設；clear/語言取消保持資料與焦點，確認才丟棄；固定初始不能自動得到有效輸出。兩語 key 集合/參數對應一致，所有錯誤/狀態均可觸發查看。

### 7.3 必要真桌面瀏覽器情境

每次記固定 candidate、瀏覽器版本、OS、視窗、實際 origin 和觀察時間。從正常 visible 控制進入，不以 eval 改資料或注入完成標記。可用自動化輸入正常 controls，但要明示是自動化，不稱真人 OS 操作/盲測；替身不能列本節 PASS。

B01 一層 outer：x=12,y=8,blur=0,spread=0,#112233,opacity=100，觀察明確右/下投影及卡片不改排版尺寸。改 x/y 為負值後再次產生，方向反轉。CSS/摘要/預覽同組；不以 screenshot hash 作跨瀏覽器期望。

B02 softness/spread：同一 outer 快照分別 blur0→16，spread0→12→−12，正常再產生並比較邊緣/輪廓。全0外陰影與opacity0可不見但仍合法；至少有一個非零正例防止「全部不畫」假通過。不要求每個模糊像素 exact。

B03 同平面層序：兩個 outer 都 x0/y0/blur0/spread10/opacity100，第一 #FF0000、第二 #0000FF；可見外環應紅，交換整層後藍。再用兩個同樣 inset 正spread10 的層觀察內環前後；混用 outer/inset 時摘要與說明應指出不同平面，不能測成隨清單任意覆蓋彼此。

B04 inset方向：單層 inset，x10/y10/blur0/spread0/#000000/100，在白卡片內觀察左/上側可見帶；與相同 outer 比較。這是幾何語義核實，不把模式文字換了卻同畫 outer 當成功。

B05 正常四層旅程：由一層新增至四層、故意輸入一個錯誤、首錯定位修正、移動首尾、刪至一層、再產生；核欄位與 stable ID 焦點、不越4/少於1、無舊結果混入、窄視窗局部捲動正常。

B06 取出：同一有效快照正常 copy 並以可控制的測試接收區/使用者檢視確認文字；真下載讀回 shadow.css 的 bytes/MIME/filename，與固定 expected 比對。權限拒絕/不支援時可選取文字替代，不強迫授權。不得把一般 page spy「呼叫了 writeText」當 OS clipboard 已保存。

B07 生命週期：在 pending/成功狀態正常切換頁面可見性、取消/確認清除與語言、離開返回或重新載入；觀察 raw/結果按契約，舊 toast 不復活。BFCache 未實際發生則標該分支未測，不把單純 new page reload 當全部驗證。

B08 雙語/可及性/安全：兩語完整正常流程；鍵盤、zoom200%、320px布局、focus/dialog/必要讀屏抽查；真 CSP、network/storage、惡意字串拒絕，不新增請求。真瀏覽器無法驗的項目保留 NOT_RUN 與具體 owner/所需條件，不用純測補 PASS。

### 7.4 證據紀律與完成門檻

測試輸出須有命令、開始/終態、exit code、固定來源與實際計數；中斷是 incomplete。重疊測試不相加冒完整面向；假 DOM/時鐘/剪貼簿/URL/能力替身要逐項標明。截圖說明當刻狀態，不能由後一刻畫面倒推之前 toast 或正常流程。已知 oracle 錯誤保留原紀錄並更正，不把 harness/setup error 宣稱產品 bug。

必要項未執行不得以「理論可用」「源碼有做」結案。真缺陷交原製作者修，固定新 candidate 後受影響獨核；與來源/授權不相關的公開限制不繞過。最後交九面向完整表，所有 null/NOT_RUN 都說缺哪個實際證據，而非一個模糊總 PASS。

## 8 交接、獨審與版本規則

### 8.1 本規格交付

同一固定 commit 保存 BRIEF.md、SPEC.md、AUTHOR-CHECK.md，提供 SHA-256/UTF-8 bytes、open draft PR、來源/去重與修訂摘要。作者查核只報實際文件檢查，不把文內測試計畫當執行結果。PR 說明和固定 document 引用若不一致須如實標示/修正，不能把舊 head 當新候選。

以原協作 core/CAS 註冊 spec、提交作者任務；操作前讀現行 registry/PR、本人 ACK/claim、兩端 reconciliation 與優先序，未知結果先讀回，不能只換 SHA 盲重送。保留其他 owner、reserved 和既有歷史。本文件不包含公開內部聊天、私人路徑或真實使用者輸入；必要 registry actor/owner/claim 稽核依既有協議另外保存，不混入產品文案。

### 8.2 八節獨立完整度

非作者親讀固定兩文件與 brief，逐項可反駁核：
1. goal：具體受眾/問題/成功條件/假設。
2. scope：範圍/非目標/固定來源/不重複。
3. userFlow：正常可見旅程、修錯、層序、取出及取消。
4. inputsOutputs：所有 raw/schema/上限/優先序/精確 CSS 及生命週期。
5. implementation：可執行分工、原生預覽、安全與依賴。
6. acceptance：九面向方法/期望/必要證據/未測處理。
7. tests：獨立 expected、邊界/負例/晚到事件/真桌面。
8. handoff：固定版本、合法 owner/claim、非作者與修訂/承接順序。

八項均 true 才能由合法非作者依原 mark-spec-ready 操作登記；作者不得自簽。這是文件完整度，不是產品九面向的 90 分；沒有原本固定文件數值評分錨點，不填八個虛構 90。若 task 的數值 acceptance 尚未成立，保留 reviewing/acceptance null，不能為讓欄位好看而偽造 accepted。

### 8.3 修訂與正式製作

若獨審指出模糊、矛盾或漏項，同 spec ID 窄修，保留舊 commit/報告、固定新 head/兩檔 hash，依 core revise-spec/重新 submit 後請受影響複審；不換名逃避問題、不擅改九面向標準。未通過草稿不計 ready，已被 production 消耗也不再計未消耗庫存。

正式製作另註冊允許 cloud-dot 的 production task，綁真 ready spec、固定來源、目前優先序；本人 claim 成功且 exact readback 後才開始。規格作者 claim 不等 production claim，不接走任何 local/reserved owner。產品交件要有完整來源/檔案 manifest、必要自測與限制、正常操作說明及九面向待評資料；完成規格不等同完成產品或部署。

本版無新的部署/域名/權限/費用/憑證要求。任何需要擴大這些範圍的工作另走原批准門檻；遇拒絕或不明結果停相依動作、保留真回應及可做部分，不換工具/actor/目的地繞過。
