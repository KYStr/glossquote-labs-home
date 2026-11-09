# CSS 線性漸層產生器

Spec ID：`spec-linear-gradient-builder-v1`  
版本：v1 候選 r1，2026-10-30  
產品名稱：CSS 線性漸層產生器 / Linear Gradient Builder

這是一份待獨立完整度審查的製作規格，不是產品、測試通過或已部署聲明。文件的八節完整度和未來產品的九項品質驗收分開；沒有實作或原生證據的項目仍是 NOT_RUN。第一版只做有界、可讀、可帶走的 CSS 背景產生流程。

## 1 目標

### 使用者與問題

網站維護者已選好兩個以上的色彩，想為卡片或頁首做一個線性漸層背景。手寫停止點百分比與方向時容易把方向搞反、意外把停止點排成倒序，或把預覽與實際複製的 CSS 混成兩份。本工具把同一份有序輸入轉成正常可見預覽和確定格式 CSS，讓使用者在貼到自己的網站之前核對角度、色彩和位置。

這個用途是產品假設，不捏造訪談、需求量或使用率。成功條件是非作者只依頁內說明，在桌面用鍵盤完成輸入、產生、觀察、修錯、重新產生與取走 CSS；下載內容能在隔離測試頁以相同漸層顯示。預覽不評估文字對比、不保證不同螢幕色彩完全相同，也不聲稱輸出的背景對所有文字都可讀。

### 非目標

無帳戶、付費服務、上傳、追蹤、遠端素材、任意 CSS 匯入、色票擷取、色彩轉換器、對比評分、圖像輸入或輸出、透明色、動畫、徑向漸層、重複漸層、色彩空間選擇、分享網址、歷史草稿或自動保存。不建立新網站或部署；本次是規格交付。

## 2 範圍與不重複依據

### 來源及近似工作比較

主頁來源固定為 [README 26525d5](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。任務 brief 固定為 [1c96bc9](https://github.com/KYStr/glossquote-labs-home/blob/1c96bc9d84642d751f246feceaa20cdfc25a25b2/docs/specs/linear-gradient-builder/BRIEF.md)。[目錄快照](https://github.com/KYStr/glossquote-labs-home/blob/dd059fc489ffc79c64754182ce09bc84151ae054/catalog.json) 的 56 項展示紀錄不是 ready 庫存。登記比較使用 [registry 312](https://github.com/KYStr/glossquote-labs-home/blob/a3dba9f01afe6804ea56e2826e43247d7e2915bd/coordination/work-registry.json)；後續承接仍需重新讀最新登記，保留所有既有 owner。

| 固定既有規格 | 原輸入與主要操作 | 原輸出 | 本件差異 |
| --- | --- | --- | --- |
| [10 Color Palette](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/10-color-palette/SPEC.md) | 單色 HEX/RGB/HSL 轉換、平面兩色對比及色票 | 色票變數、固定 color/background-color 配對 | 原 FAQ 明排除漸層；本件組合角度及有序停止點，不做單色轉換或對比 |
| [09 Image Resizer](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/09-image-resizer/SPEC.md) | 使用者 PNG/JPEG、縮放及編碼 | 圖片檔 | 本件不讀檔、不處理像素，輸出 CSS |
| [53 Image Overlay](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/53-image-overlay/SPEC.md) | 兩張同尺寸圖片疊合與差異比較 | PNG、差異統計 | 本件沒有圖片比較、Canvas 或差異分數 |
| [31 Print Size](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/31-print-size/SPEC.md) | 像素尺寸與物理尺寸/PPI 試算 | 尺寸數字 | 本件只描述 CSS 背景，不做列印或解析度計算 |

現有本地 61 個工具方向、雲端已遷入方向及 Option Matrix 均未包含這個角度/停止點/CSS 背景流程；不是以改名重複預案。上述比較不改原候選、規格、保留項或責任。

### 必做功能

F01：2–8 列色彩停止點，每列一個不透明六位 HEX 色及一個整數百分比；一個整數角度。  
F02：新增、刪除、向上/下移動完整停止點列；保留輸入，不自動排序或修正數值。  
F03：按「產生預覽與 CSS」才驗證並產生；同一次合法快照供預覽、摘要和輸出使用。  
F04：可選取唯讀 CSS 文字、明確點按複製、下載固定名 CSS 檔；複製拒絕有手動選取備援。  
F05：任何來源修改立即讓舊結果及取出按鈕失效；錯誤有欄位位置及修復方式。  
F06：整頁清除、兩語切換、pagehide/BFCache、背景切換及晚到複製回條有一致生命週期。  
F07：繁中/英文等功能，桌面鍵盤全流程、320 CSS px 與真 200% 縮放可用，狀態不只靠顏色。  
F08：輸入只在記憶體；無上傳、任意 CSS 解譯、遠端依賴或持久儲存；交付來源與真證據可重建。

## 3 正常使用流程與恢復

### 初始狀態

兩列 HEX 欄為空字串，位置分別為字串 `0`、`100`；角度字串 `90`。沒有預覽、成功訊息或可取出的結果。說明文字解釋「0 度向上、90 度向右，顏色按列順序排列」；這是角度說明，不會偷偷載入範例。主產生按鈕在初始化後可按，空欄顯示正常欄位錯誤。工作 fieldset 在初始化前 disabled，初始化失敗保留固定雙語錯誤而非半可用表單。沒有自動範例或拖曳功能。

### 主要旅程

1. 輸入 `#ff0000`、`#0000ff`，保留 `0`、`100`、`90`。
2. 按產生；兩個 HEX 正規化只作用於結果，欄位不被偷偷重寫。結果摘要顯示 2 個停止點、90 度；預覽紅在左、藍在右；文字輸出見第 4 節。
3. 可直接選取 CSS 或按複製。成功 Promise 才顯示已複製；失敗保留結果並指示手動選取。按下載建立真正 CSS 檔，UI 只說已請瀏覽器下載，不假稱已保存到磁碟。
4. 新增列在尾端插入 HEX 空白、位置 `100`，焦點移至新 HEX。原結果當下失效。使用者可以修改位置或移動完整列；非法倒序不暗中排序，產生時指出錯誤的後一列。
5. 刪列至少保留 2 列，至多 8 列；到上下限對應按鈕 disabled，仍有文字數量。刪除聚焦同索引的後繼列 HEX，沒有後繼則聚焦前列 HEX。移動完整列保留兩欄內容及內部穩定 ID，焦點移至移動後同列的 HEX 欄，避免原移動按鈕到端點 disabled 而失焦；端點移動按鈕 disabled。
6. 修正後再產生；所有結果來自新快照，不追加歷史。

### 清除與語言切換

「有未清除工作」定義為 raw 欄位/列數/順序不等於初始狀態，或存在結果/錯誤/複製狀態。清除和語言切換先顯示頁內確認對話框，說明沒有自動保存。取消/Escape 完整保留內容與結果、焦點返回原觸發按鈕；確認清除回初始狀態並聚焦第一列 HEX。若已是初始狀態，清除 disabled；語言切換直接進另一固定頁。確認導航導向同站固定語言頁，不帶 query/hash/表單內容。首頁連結同語言，但離站不用誤導性「已保存」提示。頁面可明示離開會失去未取出的內容。

### 狀態與非同步界線

- 狀態為 editing、invalid、ready，加上只針對複製的 copying。產生最多 8 列，採同步小運算；不設假進度或假取消計算。
- 每次 input、compositionstart、列操作、清除確認、語言導航確認、pagehide、hidden 都遞增 generation，清掉可取出的舊結果、預覽及舊成功狀態。IME composition 中停用產生/取出；compositionend 後需再明確產生。對話框只是打開或取消不使結果失效。
- input 後即使使用者把字串改回舊值，也不復活舊結果。產生前重新讀取與驗證當下完整快照；點複製/下載也要確認目前 raw 快照仍等於已驗證快照且不在 composition，否則失效並要求重產生。
- 複製只在明確按鈕事件同步呼叫 Clipboard API，不預讀 clipboard。同時最多一個應用層 copy 操作；pending 時該按鈕停用。完成回條必須匹配 generation 和 snapshot。晚到成功/失敗不更新新畫面。3 秒未回條顯示手動選取備援並使本次回條失效；不自動再複製。API 已送出後應用不能撤回系統 clipboard 寫入，頁內須說明這個限制，不宣稱取消能清除系統剪貼簿。
- hidden 清結果與 pending 狀態但保留 raw 輸入，回前景顯示需重新產生。pagehide 清所有輸入/結果/URL/計時器；pageshow 包含 persisted 恢復皆回初始狀態，防 BFCache 舊資料復活。不是安全記憶體抹除保證。
- 未預期例外只顯示固定雙語錯誤，保留可修復輸入、停用取出，不能輸出部分結果或 stack/raw 輸入。

## 4 輸入輸出精確契約

### 核心 schema 及驗證順序

唯一核心入口 `buildGradient(request)` 不依賴 DOM、Date、locale、亂數或 CSS parser。request 必須是一般物件，僅有 own keys `angle`、`stops`；angle 為字串，stops 為陣列。每個 stop 是一般物件，僅有 own keys `hex`、`position` 且值都是字串。拒絕 null、原型非 Object.prototype/null 的物件、稀疏陣列、額外 enumerable/non-enumerable 自有鍵、Symbol 自有鍵；函式不接受 getter/setter，對 request、陣列索引及各 stop 使用 own property descriptors 檢查後才取值。陣列除正常 length 與連續 0..length-1 索引外不得有其他自有鍵。這是對受控程式資料的契約，不執行不可信 JS，也沒有 JSON 匯入入口。

驗證優先序：request 自有鍵/descriptor、angle 字串型別及 stops 陣列型別 → 列數 → 有界陣列自有鍵/descriptor 及各列結構/型別 → angle 長度/格式/範圍 → 依列次序 hex 長度/格式、position 長度/格式/範圍 → 全列位置順序。列數先於逐列遍歷，至多檢查 8 列；9 列即 STOP_COUNT，即使第9列另有錯。結構錯誤回 REQUEST_INVALID；其餘回第一個固定錯誤代碼及欄位索引，不回顯原輸入。

| 欄位 | 合法資料 | 明確拒絕 |
| --- | --- | --- |
| 列數 | 整數陣列長度 2–8 | 0、1、9 或以上，不裁掉多列 |
| angle | ASCII 字串符合 `0` 或無前導零的正整數，長度 1–3，數值 0–359 | 空白、`00`、`090`、負號、`+1`、`1.0`、`1e2`、`360`、全形數字；不 trim/取模/夾限 |
| hex | 恰好 7 個 ASCII 字元：`#` 加 6 個 0–9/a–f/A–F | `red`、`#fff`、8 位 HEX、空白、`;`、`url(...)`、控制字元或任何其他 CSS |
| position | 與 angle 同整數語法、長度 1–3，數值 0–100 | `01`、`-1`、`101`、`50%`、小數或格式不符；不猜單位 |
| 列順序 | position 非遞減；相等允許並保留列序 | 後一列小於前一列時 STOP_ORDER，指向後一列；不排序、不替換成前值 |

欄位用 text input 加 inputmode 輔助，不使用會自動夾限/吞掉非法字串的 number parser。不要靠 maxlength 截斷過長貼上後誤認為合法前綴；應保留 raw、失效結果並回錯誤。長度先檢查再做其餘轉換；本工具限制處理量，不承諾瀏覽器貼上時的原始文字配置量也有同樣上限。UI 欄位不能提交至網路，form 的 submit 第一動作 preventDefault，所有工作按鈕明確 type。

錯誤碼：REQUEST_INVALID、STOP_COUNT、ANGLE_LENGTH、ANGLE_FORMAT、ANGLE_RANGE、HEX_LENGTH、HEX_FORMAT、POSITION_LENGTH、POSITION_FORMAT、POSITION_RANGE、STOP_ORDER、UNSUPPORTED、UNEXPECTED。長度錯誤先於格式；空字串是 LENGTH。REQUEST_INVALID 的 field 固定 request，STOP_COUNT 的 field 是 stops；列欄位索引 i 使用 0-based，畫面列號顯示 i+1。UNSUPPORTED/UNEXPECTED 由 UI/controller 使用，不是純核心要查瀏覽器的理由。列數等於 2 或 8 均合法。色彩結果轉大寫；角度和位置輸出標準十進位字串。

### CSS 與預覽語義

輸出只由固定語法與驗證後的值組成：`linear-gradient(Adeg, H1 P1%, H2 P2%, ...)`。逗號後一個 ASCII 空格；每個色彩與位置之間一個空格；沒有尾逗號。所有停止點均明列百分比，不省略或插入 transition hint。

CSS 角度 0 向上、90 向右；相同位置造成依列序的色彩硬切換；第一/最後停止點可不是 0/100，外側沿用端點色。這些語義依 [W3C CSS Images 3 固定版本](https://www.w3.org/TR/2023/CRD-css-images-3-20231218/#linear-gradients) 的 linear-gradient 及 color-stop 規則。六位 HEX 是不透明 sRGB，大小寫同色，依 [W3C CSS Color 4 HEX](https://www.w3.org/TR/2026/CRD-css-color-4-20261029/#hex-notation)。只採這些既有語法，沒有聲稱實作整份標準。

預覽由瀏覽器原生 CSS 顯示，不能以 Canvas/mock 色塊冒充。預覽區固定中性外框、至少 240×120 CSS px；小視窗寬度可縮到容器，無固定寬造成整頁溢出。有效時提供獨立文字摘要：角度與每列正規化 HEX/百分比，硬切換時顯示說明。控制項、錯誤及摘要不放在漸層上，不靠選定色彩維持可讀性。色彩管理/抗鋸齒可能跨裝置不同，驗收不以所有像素逐 byte 相同為必要門檻。

### 精確輸出

核心回傳成功物件包含 `ok:true`、`angle` 數字、`stops` 正規化物件陣列（hex 大寫、position 數字）、`gradient` 字串、`css` 字串；失敗只有 `ok:false`、`code` 和 `field`（request/angle/stops 或 stops[i].hex/position）。成功 CSS 固定 selector `.gradient-background`，fallback 是第一列 HEX，而非保證文字可讀的底色。以 UTF-8 無 BOM、LF、最後一個 LF 形成檔案；CSS 語法部分為 ASCII，每行另有固定中文說明註解，最大允許輸出 512 UTF-8 bytes，超出表示內部錯誤而非截斷。兩語相同輸入的 css bytes 完全相同。

輸入：angle `90`；`#ff0000` at `0`、`#0000ff` at `100`。精確 css 為：

```css
.gradient-background { /* 固定背景類別 */
  background-color: #FF0000; /* 首色備援底色 */
  background-image: linear-gradient(90deg, #FF0000 0%, #0000FF 100%); /* 有序線性漸層 */
} /* 背景規則結束 */
```

程式比較須包含結尾 LF，不把 Markdown code fence 放進輸出。下載檔名唯一 `gradient.css`，MIME `text/css;charset=utf-8`。複製內容就是同一 css，固定四個中文註解在兩語皆相同；不加在地化標題、來源網址、timestamp、輸入備註或追蹤字串。不得使用任意使用者 selector、檔名、URL 或註解。

### 輸出與記憶體生命週期

只有結果 ready 才能明確按下載；即時建立 Blob/URL、用臨時固定 download anchor 交給瀏覽器。成功建立/觸發不代表使用者已完成存檔。程式同時最多持有一個下載 URL，新下載先撤銷舊 URL；最遲 30 秒撤銷，edit/clear/hidden/pagehide 也撤銷並取消計時器。點下載後不在同一同步堆疊先撤銷，正常瀏覽器下載必須實測；如果立刻修改使尚未接管的下載失效，頁面不得報已存檔，可重新產生再下載。已被瀏覽器保存的檔案不在本工具清除範圍。

沒有 localStorage/sessionStorage/IndexedDB/cookie/Service Worker/Cache API/history state、URL 資料或伺服器保存；不 console/log/telemetry 輸入及產物。只允許首次載入本身必要同源靜態資源和明確導航；不要求控制瀏覽器/OS 自身快取、剪貼簿或下載歷史，也不宣稱能安全抹除。

## 5 實作方案

### 結構與最小路線

Node.js 24 以上只用內建模組，瀏覽器原生 ESM/HTML/CSS，零 runtime/dev 套件；不用 npm install、CDN、第三方字型、AI API、Canvas 或遠端圖片。以下是建議目錄分工，不是已存在程式：

- `public/index.html`、`public/en/index.html`：靜態兩語標題/說明/FAQ/語意表單，引用同一核心。
- `public/core.mjs`：純 schema/驗證/正規化/確定 CSS 產生，不操作頁面。
- `public/controller.mjs`：有序列、generation、快照、對話框與生命週期；所有來源變動集中 invalidate。
- `public/app.mjs`：DOM 接線、初始化檢查、錯誤映射。
- `public/locales.mjs`：兩語固定 labels/errors/status/FAQ，鍵集合相等。
- `public/styles.css`：中性工作介面與一個專用預覽 CSS rule。
- `tests/`：純核心、controller 窄替身、固定 expected 及瀏覽器人工步驟；分開報結果。
- `scripts/check.mjs`、`build.mjs`、`serve.mjs`：本地檢查、allowlist 靜態產物及 loopback 預覽；README 明列命令。

順序：先 core 和固定例 → 純測/邊界 → 兩語表單及狀態機 → 真 CSS 預覽及下載/複製 → check/build → 授權桌面瀏覽器人工旅程/Network/Storage/安全標頭 → 非作者同候選九面向驗收。每一步留下實際命令和結果；任何未跑的後一步不能用先前測試補作 PASS。新增自寫程式每個非空 code 行附具體中文註解，不改第三方/原工具 bytes 來湊此偏好。

### 安全設計

文字只用 textContent/value；不把輸入送入 innerHTML、insertAdjacentHTML、eval、Function、import、URL、任意 style/cssText 或 selector。生成的 gradient 必須來自已驗證核心。預覽修改已載入同源 stylesheet 的專用 CSSStyleRule 的 background-image/background-color；不從 raw 值建立 `<style>`、style attribute 或任意規則。固定 CSS rule 查不到或 CSS.supports 不支援產生的 gradient 時回 UNSUPPORTED，清掉輸出取出能力，不假顯示有效預覽。實測這個 CSSOM 路徑能在既定 CSP 下正常作用。

check 至少做 JS 語法、兩語 keys/metadata/link/labels、固定 allowlist、安全禁止項及輸出參照；regex 掃描不是安全證明，仍須人工資料流與正常瀏覽器 Network/Storage 核對。build 只複製明列 public 檔，拒絕 symlink、未知來源、非普通檔，不把 test、docs、registry、憑證或工作紀錄帶進產物；只清楚命名的自有輸出目錄可重新建立，不任意刪 workspace。

預覽 server 只 bind 127.0.0.1 固定文件根，限定 GET/HEAD、精確 Host/MIME/路徑及 404/405，不能暴露 workspace、dotfiles、索引清單或任意路徑；只在已授權桌面驗收時啟動。必要安全標頭至少：CSP default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'；另 nosniff、Referrer-Policy no-referrer、Permissions-Policy camera=(), microphone=(), geolocation=()。若工具要改這些要求，須先提出有證據修訂，不能默默改 unsafe-inline 或加遠端來源。

頁面隱私界線涵蓋初始化失敗、Enter、錯值、下載、複製拒絕、背景、語言切換及重載，不只測 happy path。新 API 權限不是要求使用者輸入憑證；Clipboard API 不可用時用選取文字備援，不反覆要求授權、不加第三方服務。

### 介面與雙語

至少具備下列成對文案；其他錯誤/說明/FAQ 同樣完整雙語，不能只翻標題：

| 繁中 | English |
| --- | --- |
| 角度（度） | Angle (degrees) |
| 停止點 {n} 色彩 | Stop {n} color |
| 停止點 {n} 位置（%） | Stop {n} position (%) |
| 新增停止點／刪除／上移／下移 | Add stop / Remove / Move up / Move down |
| 產生預覽與 CSS | Generate preview and CSS |
| 複製 CSS／下載 CSS／清除 | Copy CSS / Download CSS / Clear |
| 已變更輸入，請重新產生 | Inputs changed. Generate again. |
| 已複製 CSS | CSS copied. |
| 無法確認複製，請選取下方 CSS 手動複製 | Copy could not be confirmed. Select the CSS below and copy it manually. |
| 已請瀏覽器下載；請檢查下載結果 | Download requested. Check your browser's download result. |
| 位置必須按列非遞減；請修正此列或移動列 | Positions must be non-decreasing. Correct or move this stop. |
| 這會清除未取出的內容。繼續嗎？ | This will discard content you have not exported. Continue? |
| 繼續／取消 | Continue / Cancel |
| 頁面曾進入背景，請重新產生 | The page was hidden. Generate again to continue. |

錯誤要依 code 顯示具體合法格式/範圍，不只「無效」；每個錯誤連到第一個對應欄位，使用 aria-invalid/aria-describedby，摘要有適當 live region。停止點用 fieldset/legend 或等價結構；動作名稱包含列號，Tab 次序跟可見列序一致。產生成功不搶焦點，錯誤聚焦第一問題欄；下載/複製留原按鈕；對話框有名稱、焦點限制、Escape 取消及返回。

FAQ 兩語至少回答：角度方向、為何限制六位 HEX、同位置硬切換、倒序為何不自動修正、預覽與實際網站尺寸/色彩管理差異、不保證文字對比、資料是否上傳/保存、複製或下載受限時怎麼辦。任何限制不能只藏在文件。

preview 產物使用 noindex,nofollow，不偽造 canonical、已部署域名或 sitemap。兩語切換固定同源 `index.html` / `en/index.html`；同語言主頁連結分別 `https://glossquote.com/index.html` / `https://glossquote.com/en/index.html`。如果未來另外獲准正式發布，才按既有 README 用實際 URL 補 canonical/hreflang/sitemap/robots、HTTPS/security headers 與雙向連結驗證；此輪不能把預計 URL 當 live。

## 6 完整產品驗收

未來產品需由非作者對同一固定 candidate/PR head 逐項給證據；以下九面向每項至少 90 且必要檢查完成才 accepted，平均分或測試數不替代。以下是完整必要方法，不是已有分數。

| 面向 | 方法與可核預期 | 必須交出的證據 |
| --- | --- | --- |
| functionality | F01–F08 完整；2/8 列與正常中間數量、四方向及同位置、非端點色、刪移列、確定輸出；正常 DOM 使用真core，下載/手動貼入隔離頁後語義相同 | 固定 expected 純測，加兩語真使用者事件旅程及下載檔 hash/content；不得寫state或直接call完成handler冒正常UI |
| boundaries | schema、raw長度/格式/數值上下端、列數1/2/3/7/8/9、角度-1/0/1/358/359/360、位置-1/0/1/99/100/101、倒序/相等、IME、複製晚到/超時、連按及背景/清除/導航恢復 | 第7節期望與實際結果；替身檢查只證其範圍，原生life-cycle另證；任何非法資料不得有可取出的舊結果 |
| privacy | 親看正常頁整段 Network/Storage：初始、輸入、Enter、成功/錯誤、複製/下載、語言導航、背景/reload/BFCache | 只必要靜態/導航請求，沒有任何資料外傳或持久儲存；固定假的 canary 輸入及觀察結果，無真實私件；頁面說明與實際一致 |
| security | 人工追資料流與封閉 CSS serializer、禁止項、真正同候選server headers及 CSP 下預覽；測 CSS/HTML/URL 注入字串、錯 MIME/path/Host | 源碼行號/固定commit、負例與真header/正常預覽證據；套件0及安全建置輸出；正則全綠不等安全完成 |
| usability | 非作者只看頁內說明完成基本兩色、加第三色、同位置硬切換、修正倒序、取出CSS及清除取消；無需看實作找隱藏入口 | 任務觀察、困惑/錯誤點及修正記錄；預覽/摘要/輸出一致，不能只交作者影片或mock |
| accessibility | 兩語全流程僅鍵盤；列新增/移動/刪除及dialog焦點；真200% zoom、320 CSS px reflow；正常/錯誤/disabled皆可讀、非單靠色彩 | 實際瀏覽器版本、步驟/截圖、焦點軌跡/語意檢查，介面文字對比及必要控制非文字對比量測；色彩背景本身不獲對比認證。無實際讀屏設備時標未測，不能報讀屏PASS |
| localization-seo | 兩語相同有效輸入逐byte相同CSS、完整錯誤/FAQ/數字單位；靜態lang/title/description、語言/home連結與preview noindex | 兩語靜態和真導航結果，canonical/發布要求按preview或正式狀態分明，無假live URL |
| toolchain-provenance | Node24內建工具直接test/check/build；乾淨副本產物逐檔manifest，來源/文件/授權現況、中文行註解；build不帶私件 | 命令/版本/exit/log/每檔SHA；新dependency或生成未揭露檔拒絕；公開可讀不等已有license，未選license照實聲明 |
| compatibility | 至少一款實際桌面Chromium正常使用/下載/複製或拒絕備援、dialog、CSSOM/CSP、hidden/reload/BFCache；記完整版本/OS/日期 | native event與真產物，不能以VM/DOM替身/純函式替代；其他桌面引擎及手機未測明列，不因無資源擅加手機/實體裝置硬門檻。瀏覽器不具必要CSSOM時安全退出 |

所有桌面必要檢查尚未執行就是 NOT_RUN，阻擋產品 accepted；不得因暫無瀏覽器便把它們改成可選。製作中可交部分真成果，但不是產品90。規格完整度 reviewer 只核定這些內容是否清楚可做，不替未來產品打分。

## 7 最小充分測試

預期值獨立寫死或手算，不用被測 serializer 再生成自己的 expected。測試可以合併表格案例，但不能把多個重疊斷言當成多個產品缺陷或獨立原生證據。

| 案例 | 固定輸入或步驟 | 預期 | 層級 |
| --- | --- | --- | --- |
| T01 基本輸出 | 第4節紅/藍/90/0/100 | 精確 CSS 含末尾LF；hex大寫，欄位raw不被改；兩語相同 | core + 真UI/下載 |
| T02 四方向 | 同紅藍依序0/90/180/270度 | gradient數字正確；原生圖為紅下藍上、紅左藍右、紅上藍下、紅右藍左 | core字串 + 真CSS目視 |
| T03 硬切換 | 紅0、紅50、藍50、藍100，angle90 | 4列順序保留，中點硬切換；不得合併/排序；摘要說明可見 | core + 真預覽 |
| T04 非端點與同色 | 紅20/藍80；另同色50/50 | 前後20%端點色延伸；相同色合法即單色外觀，不報沒效果錯誤 | core + 真預覽 |
| T05 格式 | angle空/00/090/+1/1.0/1e2/全形；hex長6/7/8及合法/非法；position同類 | 按先長度再格式再範圍規則，唯一第一錯誤；合法小寫正規化，非法不截斷成前綴 | core + 欄位負例 |
| T06 容量與schema | 第6節端點；缺/多keys、非字串、null、稀疏陣列、getter、symbol | 依第4節層級優先序；1/9列STOP_COUNT不遍歷列內容；0/359角度、0/100位置合法，越界拒絕 | core；不得執行getter |
| T07 順序 | 紅60/藍40；再改40→60；雙錯angle360與hex錯 | 第一組STOP_ORDER指後列；相等合法；angle RANGE先於hex | core + 真修復 |
| T08 修改與列操作 | ready後input、compositionstart、改回原字串、增刪移列、上下限 | 舊預覽/輸出立即失效，不能靠改回值復活；focus/disabled規則精確；8列下一增無效，2列刪無效 | controller替身 + 真鍵盤 |
| T09 複製競態 | pending→edit/clear/hidden；舊resolve/reject；3秒timeout；新ready再copy | 舊回條不改新狀態；不自動重試；備援文字可選；已發API不可撤回限制明示 | 受控Promise/clock，不稱OS；另真正常/拒絕路徑 |
| T10 下載資源 | ready兩次下載、隨後edit/clear/hidden/pagehide；30秒到期 | 最多1URL、正確MIME/固定名/精確bytes；皆cleanup；正常桌面取得真檔，UI不說已保存 | URL spy + 真下載檔 |
| T11 lifecycle及確認 | clear/語言dialog取消和Escape；確認；hidden返回；pagehide/pageshow persisted | 取消不丟內容/focus回觸發；確認清初始；hidden保raw但清結果；BFCache回初始 | controller + 真browser |
| T12 安全與錯誤 | hex含 `<img>`、`url(https://invalid.example/)`、`;}`；初始化CSS rule缺失/不支援 | 無DOM/網路注入、無舊結果；固定錯誤/安全退出，不能pretend preview | core/源碼 + 真Network/CSP |

必要原生 B01–B06：B01 兩語鍵盤正常旅程與真CSS下載後隔離頁套用；B02 第3節全部列操作/錯誤修復/IME與重複操作；B03 dialog/清除/語言/hidden/reload/BFCache及真焦點；B04 複製成功或實際API拒絕備援和真下載，環境限制如實記；B05 全Network/Storage/headers與安全資料流；B06 320 CSS px、真200%zoom、對比/語意及兩語完整文案。B04若無可用clipboard成功路徑，至少應有正常可選取CSS與實際拒絕備援，不能捏造系統剪貼簿PASS。

證據只用合成色彩，不放私人輸入。對每組記版本、操作方式、結果、限制和必要截圖/產物SHA；單一靜態截圖不能證明整段journey或Network/Storage。效能不造毫秒KPI：限定8列同步運算、無外部依賴，實測正常輸入不凍結/按鍵不掉；若有量測提供環境與方法，不能用作者機器估算冒通用保證。

## 8 交接與完成條件

### 本文件交付

SPEC 與 AUTHOR-CHECK 以同一固定 GitHub candidate 及 open draft PR 提交；作者查核列八節位置、來源與尚未執行事項，不能自填產品九項90或 spec ready。獨立 reviewer 必須非作者，親讀固定八節、近似規格和輸入/期望的一致性，指出不可達測試、隱含需求或資料生命週期矛盾；修訂沿同 spec ID 留歷史，新 commit 重新提交/受影響複審。

文件 accepted 與 mark-spec-ready 各用原協議必要事件和精確讀回；未通過前只算 draft，不計 ready 庫存。ready 被production claim消耗後不再算未承接存量，不能靠重複ID/路徑或自動釋放增加數量。

### 後續製作交接包

製作者取得另外合法 production task/claim、明確 allowedExecutors 及同一九項完整驗收後才寫產品；本規格任務的 claim 不可沿用。第一個工作分支及source baseline按登記固定，不接走既有本地工具。交件至少有：

1. 完整可編輯source、Node24命令、零依賴說明、所有靜態資源來源及license現況。
2. 兩語正常介面、精確core/狀態/輸出、自足test/check/build與產物manifest。
3. 原始命令日誌、必要原生證據、下載檔對照、九面向逐項證據、已知限制/NOT_RUN，來源與candidate相同。
4. README正常使用/開發/驗收/preview範圍，安全資料生命週期和清除限制；非作者不用讀隱藏handler即可完成旅程。
5. 固定commit/open PR、來源與產物差異、問題修復歷史及可還原基線。沒有可用原生環境時停在待驗，不縮原驗收。

純 source 提交不自動部署；不得以這份規格更改home catalog為published、建立新origin、取得憑證/費用、變更權限或代簽他人評分。正式發布另遵主頁 README 和當時使用者批准，未有真部署就沒有liveURL。
