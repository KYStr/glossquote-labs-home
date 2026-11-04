# 配色與文字對比檢查 — 既有規格保存

Task ID: `labs-10-color-palette` · Spec ID: `spec-10-color-palette`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 配色產品規格

這是規格，尚未實作。只處理不透明 sRGB 8-bit 色彩。

| 編號 | 行為與限制 |
|---|---|
| FR-01 | 初始 2 色 #111410、#F3F0E8，標示「起始色票」。最少 2 色、最多 8 色。新增預設 #FFFFFF；可重複，順序有意義。清除／重設回到這兩色，不保存歷史。 |
| FR-02 | 每色有穩定 id 與三種輸入模式。HEX 欄只接受 trim 後 #RGB 或 #RRGGBB，ASCII 十六進位不分大小寫；正規化成大寫 6 碼。最多 32 字元，拒絕超限。 |
| FR-03 | RGB 為三個獨立欄，十進位整數 0–255。HSL 為三欄：H 0–360 度、S/L 0–100%，允許最多一位小數，360 同 0。各欄最多 8 字元；拒絕空、負數、科學記號、NaN、Infinity，不能靜默 clamp。 |
| FR-04 | 以 RGB 整數作唯一已提交色彩來源。輸入模式切換只讀取已提交色彩，不來回量化。按 Enter 或欄位離焦時提交有效數值；輸入未完整時保持文字、顯示錯誤，暫停該色的複製／全票匯出及相關對比結果。 |
| FR-05 | 可選色、刪除、前移、後移；拖曳不是必要操作。少於 3 色時刪除禁用。刪除已選對比色後，文字色改為目前第 1 色、背景色改為第 2 色。以 id 選色，不因重新排序偷偷改所選顏色。 |
| FR-06 | 對比區選文字色與背景色，允許相同色。顯示實際文字樣本、比值兩位小數、普通文字 AA ≥4.5、AAA ≥7、大字 AA ≥3、AAA ≥4.5 的各別通過／未通過。門檻以未四捨五入值比較。 |
| FR-07 | 「大字」說明為至少 18pt 一般字或 14pt 粗體；這個區域只測平面不透明兩色，不代表整頁 WCAG 認證。按交換只交換文字／背景選擇，不改色票順序。 |
| FR-08 | 複製所選色的 HEX／rgb()／hsl() 或全票 CSS。僅使用者點擊時呼叫 Clipboard.writeText，不讀剪貼簿。失敗提供唯讀 textarea 及手動選取提示，不假報成功。 |
| FR-09 | 下載固定名 palette.css，UTF-8 無 BOM、LF，每色依順序輸出 --color-1 至 --color-N，大寫 HEX。無匯入、無命名欄、無自訂 CSS，避免把輸入當 CSS 執行。 |
| FR-10 | 全資料僅當頁記憶體，不寫 storage、網址查詢、cookie、日誌或伺服器。重整即重設。下載是使用者自己保存資料的唯一持久方式。 |
| FR-11 | 色票標籤一律置於正常產品背景上，色塊本身不承擔唯一文字；對比樣本可故意低對比，但旁邊警告與設定必須可讀。所有值及錯誤以文字呈現，對比不只顯示紅／綠。 |
| FR-12 | 固定錯誤碼 COLOR_INVALID、VALUE_OUT_OF_RANGE、PALETTE_LIMIT、COPY_DENIED。無長工作，因此不設取消按鈕；每次操作同步可回改，匯出只反映當刻有效快照。 |

未來候選：色票 JSON 匯入、圖片萃色、色彩和諧建議。第一版不加入；尤其透明度需要另定背景合成規則，不能把 alpha 當作普通 RGB 計算。

## FR-13 — 帶走文字與背景配對（2026-10-13）

對比面板提供固定 `.color-pair` CSS 預覽及「複製配對 CSS」。只輸出 `color` 和 `background-color`，值來自同一狀態內目前 foreground/background 的已提交 RGB；不可自訂 selector、宣告、字級或匯入 CSS。兩端任一合法 dirty 或無效草稿令配對預覽及複製失效，提交後才恢復；不相關第三色的草稿不擋這兩個已提交端點，仍會擋全票 CSS／下載。相同或低對比顏色仍可複製，但實際失敗門檻不隱藏、不自動改色、不宣稱整頁認證。

交換依角色交換兩宣告，排序依 stable id 保留配對，刪除端點沿用原重設規則。剪貼簿拒絕時在配對區顯示同一請求快照的唯讀可選 textarea；任何狀態變更／重設／離頁失效晚回覆，不宣稱撤回 OS 寫入。既有全票 CSS、palette.css 固定 bytes／檔名及其他上限不變；沒有新增配對下載。


---

## 原文件 TECHNICAL.md

# 配色技術規格

這是規格，尚未實作。HTML/CSS/瀏覽器 ESM、Node.js 24+ node:test；無 runtime 套件。純函式不得讀 DOM。

## 預計檔案

```text
package.json
scripts/serve.mjs
scripts/check.mjs
scripts/build.mjs
public/index.html
public/styles/tokens.css
public/styles/app.css
public/js/app.mjs
public/js/core/color.mjs
public/js/core/contrast.mjs
public/js/core/palette.mjs
public/js/core/export.mjs
public/js/clipboard.mjs
test/color.test.mjs
test/contrast.test.mjs
test/palette.test.mjs
test/export.test.mjs
docs/TEST-RESULTS.md
```

## 函式契約

| 函式 | 輸入與輸出 |
|---|---|
| parseHex(text) | trim；只允許 /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/；三碼展開；回傳 {ok:true,value:{r,g,b}} 或 {ok:false,code:'COLOR_INVALID'}。 |
| parseRgbFields({r,g,b}) | 欄位各字串；嚴格 unsigned 整數、0–255，拒絕空和指數，回傳 RGB。 |
| parseHslFields({h,s,l}) | 只接受數字加可選一位小數；檢查範圍、h=360 正規為 0，回傳 HSL。 |
| hslToRgb({h,s,l}) | 計算時 s,l 除 100；最終各 RGB 通道乘 255 再 Math.round，0–255。 |
| rgbToHsl({r,g,b}) | 輸入除 255；回傳未格式化數值。灰色 h=0、s=0；展示 H/S/L 四捨五入一位小數，去多餘 .0。 |
| formatHex(rgb) | #RRGGBB 大寫。formatRgb 回傳 `rgb(255, 0, 0)` 格式；formatHsl 回傳 `hsl(0, 100%, 50%)` 格式。 |
| relativeLuminance(rgb) | 依下列 sRGB 線性化，範圍 0–1。 |
| contrastRatio(a,b) | (max(L1,L2)+0.05)/(min(L1,L2)+0.05)，原始 Number，範圍 1–21。 |
| evaluateContrast(ratio) | {normalAA:ratio>=4.5,normalAAA:ratio>=7,largeAA:ratio>=3,largeAAA:ratio>=4.5}；不得用 toFixed 結果判斷。 |
| reducePalette(state,action) | 不可變更新；精確 action enum add/update/remove/move/select-pair/swap/reset；拒絕不認識 action、欄位與不存在 id。 |
| exportCss(colors) | 2–8 色有效 RGB，產生下方固定 UTF-8 文字。不接收任意 selector 或變數名。 |

HSL→RGB：C=(1-|2L-1|)S，X=C(1-|((H/60) mod 2)-1|)，m=L-C/2；六區依序 (C,X,0)、(X,C,0)、(0,C,X)、(0,X,C)、(X,0,C)、(C,0,X)，各加 m。RGB→HSL：max/min、d=max-min、L=(max+min)/2；d=0 則 H=S=0；否則 S=d/(1-|2L-1|)，依最大通道算 hue 後正規到 [0,360)。

亮度計算：每通道 c=byte/255；c≤0.04045 時 c/12.92，否則 ((c+0.055)/1.055)^2.4；L=0.2126R+0.7152G+0.0722B。對比只適用本案不透明 sRGB，沒有 alpha 合成或 APCA。

輸出例（最後有 LF）：

```css
:root {
  --color-1: #111410;
  --color-2: #F3F0E8;
}
```

## 狀態與邊界

state 包含 colors:[{id,r,g,b}]、nextId、selectedId、foregroundId、backgroundId、drafts。初始 id=c1/c2，新增遞增且當次不重用。ready → editing → ready/invalid；複製另有 copying/copied/copy-error。輸入無效時對比區顯示「請先修正色碼」，不要顯示上次通過徽章。重設令所有待處理剪貼簿回覆失效，避免晚回覆彈「複製成功」。

樣式只能從已驗證 RGB 組成，如 `style.backgroundColor=formatHex(rgb)`。所有輸入字串／錯誤都用 textContent/value。禁止將原字串塞入 style element、innerHTML 或 CSS url()。CSS 匯出 blob MIME=`text/css;charset=utf-8`；URL 在下一次匯出／重設／離頁撤銷，不能在 click 當下先撤销。

T00 建立四命令，dev 只綁 127.0.0.1:4173 並服務 public；check 驗證 ESM 語法、必要檔、外部資源與危險 API，build 只複製 public 到 dist。只測純函式的 Node 測試不能宣稱驗過 Clipboard 或螢幕閱讀器。

## 官方參考（2026-09-23 查閱）

- [W3C WCAG 2.2 相對亮度與對比](https://www.w3.org/TR/WCAG22/#dfn-relative-luminance)：本案採 sRGB 與 WCAG 比值門檻。
- [W3C CSS Color 4 HSL 轉換](https://www.w3.org/TR/css-color-4/#hsl-to-rgb)：色彩轉換定義；本案只支援受限數字欄位，不宣稱解析整套 CSS 色彩語法。
- [MDN Clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)：安全情境／權限可能拒絕；保留手動複製路徑。

## 配對 CSS 契約（U10，2026-10-13）

`export.mjs` 增加 `exportPairCss(foreground, background)`：兩參數均須精確 r/g/b 整數 record，格式化前拒絕額外欄、getter、非法值與 revoked proxy，不讀 getter。輸出固定 `.color-pair {\n  color: #RRGGBB;\n  background-color: #RRGGBB;\n}\n`，UTF-8 無 BOM、LF、最後 LF，無自由 selector。原 `exportCss` 契約及 bytes 不變。

`pairCssForState(state)` 只接可信 reducer state：同一 state 查兩個 id、檢查各自 draft 的 dirty===false/error===null，投影 committed RGB 後格式化；缺 id/draft 或 formatter 拒絕返回 null，不曝露 raw exception。未檢查無關第三色，不以 palette index 代替角色。

app 每次刷新對比同步刷新配對預覽及 disabled，copy 時重取目前快照。copy kind 新增 pair，沿同一 clipboard controller epoch；status/fallback 的 DOM 位於配對區，callback 才更新成功／拒絕，Promise 返回值不直接宣告當前成功。狀態改動／pagehide 清三種 feedback；拒絕 textarea 使用安全文字、固定 id、readonly 和 focus/select。


---

## 原文件 UX-SEO.md

# 配色介面與 SEO

這是規格，尚未實作。Product App 模式；色票與文字樣本是工作主體，不用大量行銷卡片。

```text
桌面
GlossQuote-Labs / 配色與文字對比                  重設
色票  [色 1] [色 2] [+ 新增顏色]   2/8
┌────────────────────┬──────────────────────────┐
│ 選取色塊            │ 文字色 [色 1] 背景 [色 2] │
│ [HEX] [RGB] [HSL]   │ [交換文字與背景]          │
│ #111410             │ 這是一段文字樣本          │
│ 前移 後移 刪除       │ 16.xx:1 及四種門檻結果     │
│ 複製色碼            │ 限平面不透明兩色           │
└────────────────────┴──────────────────────────┘
CSS 預覽                           複製 CSS / 下載 CSS
操作方式・色彩範圍・常見問題

手機
品牌／工具名
色票列表（可重排為兩欄）+ 新增
選取顏色的三模式欄位／複製／排序
文字與背景選擇／交換
文字樣本與對比門檻文字
CSS 預覽／複製／下載
說明
```

線框的數值是位置說明，正式畫面必須計算，不寫入 `16.xx`。預設色票標示「起始色票，可以直接修改」。初始就能看見真實计算结果；editing「正在編輯色碼」；invalid「請輸入 #RGB 或 #RRGGBB 色碼」或具體數值範圍；上限「已達 8 色，可先刪除一色」；複製成功「已複製 HEX 色碼」；拒絕「瀏覽器未允許複製，可選取下方文字手動複製」；重設「已回到起始色票」。無讀檔、帳號、網路推論或長計算，因此空檔、身份失效與取消不適用；JS 失效時顯示啟用 JavaScript 的說明，仍可閱讀 FAQ。

每個色塊是具可讀標籤的 button，aria-pressed 指示選取。危險低對比只存在樣本文字區，樣本前說明「以下是待檢查的配色樣本」；周邊字、輸入框和焦點沿用品牌合格對比。輸入 error 與欄位關聯。排序有「前移／後移」按钮，無需拖曳；所有操作鍵盤可用，320px 與 200% 不遮擋。輸出 CSS 可在自己有標籤的區域水平捲動，其他頁面不可。

title：`配色工具與文字對比檢查｜GlossQuote-Labs`

description：`手動整理 2 至 8 色色票，轉換 HEX、RGB、HSL，檢查文字與背景的 WCAG 對比值，並複製色碼或下載 CSS。`

H1：`配色與文字對比`

slug 建議 `/tools/color-palette/`。SEO 内容以靜態 HTML 呈現，說明支持不透明 sRGB 與比值的用途；本地 noindex,nofollow；未來獲發布授權且有實際網址才建立 canonical、sitemap。不虛構搜尋流量、認證或專業設計效果。

FAQ：

1. **通過對比檢查就代表網站無障礙嗎？** 只代表這兩個不透明色彩達到顯示的對比門檻；字級、焦點、鍵盤操作及其他內容仍需檢查。
2. **支援透明色或漸層嗎？** 第一版只支援不透明 sRGB；透明與漸層會受到背景和位置影響，需要不同計算方式。
3. **為什麼 HSL 換回去有微小差異？** 工具以 8-bit RGB 保存顏色，HSL 顯示也有四捨五入；中間數值不一定完全可逆。
4. **色票會保存嗎？** 頁面重整即回起始色票，請自行複製或下載 CSS。工具沒有帳號與同步。
5. **可以從照片擷取配色嗎？** 第一版以手動選色為主，不讀圖片。

## 配對 CSS 增量（2026-10-13）

既有對比面板在樣本、比值及門檻後加入固定 CSS 預覽／複製，保留原編輯器與全票區位置。預覽是可聚焦、可選取且可局部橫捲的 code region；320px 時說明與複製動作重排，只有 code 自身可橫捲。新 status 使用 polite，拒絕備案在同區。雙語說明指出將 color-pair class 加到元素，並明示低對比仍可複製，不能把複製當通過門檻。兩語靜態 about 加入對應說明；既有 canonical/hreflang/x-default/robots 發布規則維持。


---

## 原文件 ACCEPTANCE.md

# 配色驗收

這是規格，尚未實作。A=Node 自動，B=瀏覽器人工。所有案例初始為 not-run。資料全是規格中的色碼或刻意的惡意字串，不需要真實私人資料。

| ID | 類型／需求 | 輸入／步驟 | 預期 |
|---|---|---|---|
| CP-01 | A FR-02 | ` #a3f ` | RGB 170,51,255；HEX #AA33FF |
| CP-02 | A FR-02 | #1234、red、#12345678、超過 32 字元 | COLOR_INVALID；不接受 alpha／命名色 |
| CP-03 | A FR-03 | RGB 255,0,0；256,0,0；1e2,0,0 | 首例 #FF0000，其餘拒絕 |
| CP-04 | A FR-03 | HSL 0,100,50 與 360,100,50 | 均 RGB 255,0,0 |
| CP-05 | A FR-03 | HSL 120,100,50；240,100,50 | #00FF00；#0000FF |
| CP-06 | A FR-04 | RGB 128,128,128 | HSL 0,0,50.196078...；顯示 hsl(0, 0%, 50.2%) |
| CP-07 | A FR-06 | #000000／#FFFFFF | 原始 ratio=21；四種門檻全部 true |
| CP-08 | A FR-06 | 相同色 #123456 | ratio=1；四種門檻全部 false |
| CP-09 | A FR-06 | #777777／#FFFFFF | ratio≈4.478089453577214，誤差<1e-12；顯示 4.48；普通 AA=false，大字 AA=true |
| CP-10 | A FR-06 | #767676／#FFFFFF | ratio≈4.542224959605253，誤差<1e-12；普通 AA=true，普通 AAA=false |
| CP-11 | A FR-06 | evaluateContrast(4.499999) | 普通 AA=false，即使顯示 4.50 也不能通过 |
| CP-12 | A FR-01、FR-05 | 2 色刪除；8 色新增；選色後重新排序 | 前兩者 PALETTE_LIMIT，後者 selected id 不變 |
| CP-13 | A FR-05 | 三色時刪除被選背景色 | 對比文字／背景重設為剩餘第 1／2 色 |
| CP-14 | A FR-09 | 起始兩色匯出 | 與 TECHNICAL CSS 例字節一致、LF、結尾 LF，無 BOM |
| CP-15 | B FR-04 | 有效配色改輸入 #zz | 顯示欄位錯誤；相關對比與所有 CSS 匯出不可用；不沿用通過徽章 |
| CP-16 | B FR-08 | 點複製成功／模擬 clipboard 拒絕 | 成功才確認；拒絕保留唯讀可選文字，无自動讀剪貼簿 |
| CP-17 | B FR-10 | 變更後重整，檢查 Network/storage | 回起始兩色；無內容請求、storage/cookie/URL 保存；只有初次同源靜態資源 |
| CP-18 | B FR-02、FR-11 | 輸入 `</style><img src=x onerror=alert(1)>` | 拒絕並當文字顯示；DOM 無注入、無 x 請求 |
| CP-19 | B FR-11 | 純鍵盤新增／編色／排序／對比／下載 | 操作完整、焦點可見、色票有可讀標籤 |
| CP-20 | B FR-11 | 320px、200% 頁面縮放、強制低對比樣本 | 周邊文字可讀、所有按钮可達；僅 CSS 區局部捲動 |
| CP-21 | A+B FR-12 | 等待 clipboard Promise 時重設 | 晚回覆不出已複製舊值的成功提示；不新增取消鈕 |
| CP-22 | B FR-07 | 選不同文字／背景色後按交換，讀大字與限制說明 | 文字／背景id交換，色票順序不變；說明明列18pt一般或14pt粗體，且不宣稱整頁通過WCAG |

驗收記在 `docs/TEST-RESULTS.md`：每案 pass/fail/not-run、日期、瀏覽器版本與證據。計算套用標準不代表整頁 WCAG 認證；畫面自己的對比與鍵盤仍須逐項驗證。

## U10 配對 CSS（2026-10-13）

固定規格見 [OUTCOME-UPGRADE](OUTCOME-UPGRADE-2026-10-13.md)。下列為預期；新版實際證據逐案記 TEST-RESULTS，不沿用舊外验通過。

| ID | 驗收預期 |
|---|---|
| U10-01 | 初始配對 CSS 精確 bytes、兩角色相符、LF 無 BOM |
| U10-02 | 黑白交換只交換宣告角色、ratio=21，palette 順序不變 |
| U10-03 | 合法 #767676 未 Enter/blur 也失效；提交後白底普通 AA 通過 |
| U10-04 | #zz 無舊比值/CSS/copy；合法修正並提交後恢復 |
| U10-05 | 第三色 dirty 擋全票但不擋 c1/c2；改為配對端點後擋配對 |
| U10-06 | 第二/三色 id 排序不變配對，刪端點後依 reducer 重設 |
| U10-07 | 同色 ratio=1；#777777/白 4.48 普通 AA 失敗仍能複製 |
| U10-08 | 拒絕/缺 Clipboard 的配對區 fallback 等於同一快照、readonly/focus/select；mock 與真權限分開 |
| U10-09 | 延遲 A 在合法 draft/交換/重設後成功或拒絕均不顯示；新 B 才能通知 |
| U10-10 | exporter 拒絕惡意 shape/getter/revoked proxy；script-looking UI 輸入只為文字 |
| U10-11 | 雙語鍵盤、focus、44px、320px/真200%可達；未觀察項 NOT_RUN |
| U10-12 | 原 palette.css bytes/檔名不變；重整重設；Network/storage 實際觀察分開 |


---

## 原文件 TASKS.md

# 配色實作任務

流程以 AGENTS.md 的「閱讀與執行」「交付與收斂」為準：沿用本 session 已讀文件，只補讀變動／相關段落；同一授權工作依序推進，不因任務切換重問。各任務 allowed paths、前置條件與必要驗收保持有效，缺陷回到其擁有任務修正；來源發布依適用的既有明確授權，不包含網站部署。

本文件定義任務；實際進度以 HANDOFF.md 與最新驗收紀錄為準。一次一項，失敗不往後勾選。每項開始與結束都更新／讀取 [HANDOFF](HANDOFF.md)，記錄命令、真實結果、未測與下一項。allowed paths 只指本專案。

## T00 — 建立空骨架與檢查命令

- 前置：依 AGENTS.md 完成本任務所需文件閱讀，Node 24+ 可用。不安裝套件。
- allowed paths：`package.json`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`public/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`public/js/app.mjs`、`test/scaffold.test.mjs`、`HANDOFF.md`。
- 設 type=module、private=true。建立 dev=`node scripts/serve.mjs`（127.0.0.1:4173，僅 public）、test=`node --test`、check=`node scripts/check.mjs`（真檢查語法／必要檔／外部資源／危險 API）、build=`node scripts/build.mjs`（public → dist，无 docs/test）。初始畫面可有說明，功能尚未實作須明示。
- 驗收：建完才跑 `npm test`、`npm run check`、`npm run build`、`npm run dev`，確認本機 noindex 頁面與 loopback，停止 dev。
- 完成：命令有實際作用，diff 限 allowed paths 與 build 生成 dist，回寫 HANDOFF。

## T01 — 解析、換算與對比

- 前置：T00 完成。
- allowed paths：`public/js/core/color.mjs`、`public/js/core/contrast.mjs`、`test/color.test.mjs`、`test/contrast.test.mjs`、`HANDOFF.md`。
- 依 TECHNICAL 實作純函式，嚴格值域，UI 顯示四捨五入與內部判斷分開。測端點、灰色、色環與無效語法，不用 CSS parser 代替契約。
- 驗收：`node --test test/color.test.mjs test/contrast.test.mjs`、`npm run check`；CP-01–11 通過。
- 完成：所有純計算離線可重跑；回寫 HANDOFF。

## T02 — 色票狀態與輸出

- 前置：T01 完成。
- allowed paths：`public/js/core/palette.mjs`、`public/js/core/export.mjs`、`public/js/clipboard.mjs`、`test/palette.test.mjs`、`test/export.test.mjs`、`test/clipboard.test.mjs`、`HANDOFF.md`。
- 實作穩定 id、2–8 色上限、刪除選取後的重設、順序與固定 CSS；注入 Clipboard adapter 測成功／拒絕／晚回覆失效。
- 驗收：`npm test`、`npm run check`；CP-12–14、21 自動部分通過。
- 完成：輸出完全可預測且無原字串 CSS 注入；回寫 HANDOFF。

## T03 — 完整配色操作介面

- 前置：T02 完成。
- allowed paths：`public/index.html`、`public/styles/app.css`、`public/js/app.mjs`、`public/js/clipboard.mjs`、`test/clipboard.test.mjs`、`docs/TEST-RESULTS.md`、`HANDOFF.md`。
- 接色票、三輸入模式、對比樣本、四種門檻、複製與下載；不把無效 draft 寫回已提交 RGB。加入狀態、文字標籤、鍵盤排序與錯誤關聯。
- 驗收：`npm test`、`npm run check`、`npm run dev` 後人工 CP-15/16/18/19/21，停止 dev。
- 完成：主要操作鍵盤完整、錯誤可恢復；回寫 HANDOFF。

## T04 — SEO、隱私與完整驗收

- 前置：T03 完成。
- allowed paths：`public/index.html`、`public/styles/app.css`、`public/js/app.mjs`、`docs/TEST-RESULTS.md`、`HANDOFF.md`。
- 加 UX-SEO 靜態內容，保留 noindex；測 Network、storage、清除、320px、200%、自身對比與字面惡意輸入。核心模組若需修改，退回對應任務，不擴 allowed paths。
- 驗收：`npm test`、`npm run check`、`npm run build`、`npm run dev` 後全表驗收；停止 dev。
- 完成：所有必要案例有真實結果，HANDOFF 標記本機完成／未發布；未測瀏覽器不列已支援。不建立正式網域或部署。

## AUDIT-COLOR-01 — 外部稽核限定補驗（2026-10-11）

- 授權：本輪主對話派發的 `AUDIT-20261011` 限定維護任務，取代 TASK-ENTRY 首次維護只寫 THREAD-STATUS 的限制；其餘安全及共享發布界線維持。指定 `gpt-6.1-sol / max`，後端路由仍待可核實證據；不得再委派或傳訊其他任務。
- allowed paths：本工具 `TASKS.md`、`docs/AUDIT-2026-10-11.md`、`docs/THREAD-STATUS.md`、`HANDOFF.md`；專用證據限根 `.runs/color-palette/audit-2026-10-11/**`。只有實際重現直接相關 bug，先記具體 owning paths 後才可修改相關 `public/**`、`scripts/**`、`test/**` 並補回歸。不得修改 TASK-ENTRY、首頁、根規範/config、其他工具、Cloudflare/DNS，或讀憑證／部署。
- 沿用外部具體 PASS：英文黑白 21、`#777777`／白 4.48、`#767676`／白 4.54、`#zz` 令對比／徽章／CSS 失效。先判讀已提供原始附件及 2026-10-10-followup 已完成補驗；不將缺 HAR／錄影、輸入未填入或 NOT_RUN 當 bug。
- 必要補驗：真瀏覽器填 `#zz` → 讀回 → blur → 填 `#a3f` → 讀回 → blur。確認提交後正規 HEX `#AA33FF`、錯誤消失、對比／四徽章／CSS 恢復並吻合當前色票。純函式計算僅作獨立预期核對，不代替 UI。
- 原生下載：若瀏覽器 API 可用，先監聽 download 再點 `Download palette.css`，取得原生保存檔案才核對檔名、UTF-8 bytes／LF；事件或檔案不可取得則 NOT_RUN，不能用 Blob／按鈕存在代替落盤。同項兩次無進展即停止，不能擴成全設備矩陣。
- 隱私／SEO：唯讀核對自己的 public/scripts 及 reviewed dist 無 analytics／remote fetch。live DOM 如有 Insights，記 src URL；CSP response／console 僅是對應層證據，完整 Network／Storage 與實際 `/cdn-cgi/rum`／payload 仍須分開。配色既有 x-default 必要 gate 保留，不更改 releasePolicy 或放寬 CSP。帳戶層調查歸原主對話。
- 驗收與停止：輸入恢復有真 UI 證據或完成所重現 bug 的修正；下載／來源／DOM／Network 邊界與 PASS/FAIL/NOT_RUN 明確；完成四份文件及證據。程式未變沿用未變來源 gate，不重跑全 build／發布；若有產品變更才做 Node24 test/check/build 和經審查的獨立公開來源發布，正式部署仍歸主對話。高風險跨模組 bug 停止受影響部分。
- 本輪结果：指定英文真 UI 恢復及原生 OS 下載 bytes PASS，無直接相關程式 bug；來源及15檔 production check PASS。live Insights／HTML parity 為未解決的 hosting P1，Network／Storage 等 NOT_RUN。詳細判定與最終 closure 見 [AUDIT-2026-10-11](docs/AUDIT-2026-10-11.md)；closure PASS 後本限定 milestone 結案，不啟動其他任務。

## U10-PAIR-CSS-20261013 — 配對 CSS

- 主代理核定完整規格：[OUTCOME-UPGRADE](OUTCOME-UPGRADE-2026-10-13.md)。原功能對話單 owner 實作；gpt-6.1-sol/max 配置請求，backend未確認，不再委派。
- 範圍：規格列出的本工具 public/core/app/i18n/CSS/雙語HTML、相關 export/clipboard/i18n/palette tests、PRODUCT/TECHNICAL/ACCEPTANCE/UX-SEO/TASKS/HANDOFF/TEST-RESULTS；新增 focused test 亦限本工具。dist 只由既有 build。專用根 .runs/10-color-palette-outcome-2026-10-13 與既有獨立發布副本可寫，其他工具、首頁、共用狀態、憑證及部署禁止。
- 驗收：U10-01–12 分開 A/B/mock/NOT_RUN；必要 npm test/check/preview及production gates、Windows完整環境前後比對；PUBLIC來源更新／遠端HEAD核對，fixed-source ZIP逐檔Git bytes與manifest。全票 bytes、dirty gates、低對比 fail 文字及 clipboard epoch 不放寬。
- 目前：owner實作／必要gates及PUBLIC來源更新PASS：focused42、最終全套74、source check、preview11／production15 exact files；真雙語主要操作／controlled拒絕及六種late reply已有證據。commit bb73dcfb70ba1003583e4ef81d530c497c168716；ZIP30檔精確Git bytes PASS。320px/真200%與Network/Storage等保持NOT_RUN。最後scope/環境以專用證據closure PASS為準；之後釋放owner，新版待主驗／部署／外验，不自動下一項。

