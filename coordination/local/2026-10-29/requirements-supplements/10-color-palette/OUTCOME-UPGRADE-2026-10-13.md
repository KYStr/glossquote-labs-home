# U10-PAIR-CSS-20261013

2026-10-13主代理核定。使用者授權本批改善；收到實際開工訊息後由原對話01a12399-10f3-7f32-a09c-6b9ab40e8503執行，請求gpt-6.1-sol/max，不再委派。沿Product App、既有設計及安全契約。以下草案中產品決策/案例採用為要求；函數命名可等價且需交接。測試案例是預期，不是新版已通過。


## U10-PAIR-CSS-20261013：帶走剛檢查的文字與背景配對

### 使用者工作與交付

使用者選好文字色與背景色、看過對比後，要把同一組角色放到自己的網頁。目前全票 CSS 只輸出 `--color-1..N`，還要自己辨認哪個色碼當文字或背景。增加「複製配對 CSS / Copy pair CSS」，直接帶走固定 selector 內的兩條 CSS 宣告；既有单色色碼、全票複製與 `palette.css` 下載仍各自服務原工作。

可觀察成功：CSS 中 `color` 等於畫面當刻文字色、`background-color` 等於當刻背景色；交換角色立即換宣告；合法但未提交的草稿與無效草稿都讓相關舊結果及複製失效。低對比也可複製，但仍明示實際門檻結果，沒有自動改色或全頁無障礙保證。

### 現況與具體接點

| 現有檔案／函式 | 實際支援與本次接點 |
|---|---|
| `public/js/app.mjs`：`buildWorkspace`、`buildPairControls`、`refreshContrast` | 配對區已持有 foreground/background select、交換與文字樣本。`refreshContrast` 先看兩個 draft 的 `error`，再看 `dirty`，未提交時不顯示舊比值／通過徽章。新增配對 CSS 的預覽、按鈕與 feedback 應位於這個區域。 |
| `public/js/app.mjs`：`cssTextForState`、`refreshCss` | 目前全票輸出以 `isPaletteDirty` 封鎖任何未提交草稿，與 palette 順序相連；不能拿這個順序代替配對角色。 |
| `public/js/app.mjs`：`updateStateOnly`、`invalidateOutputs`、`beginCopy`、`renderFeedback`、`focusAndSelectFallback` | 每次 reducer 狀態改動均失效 clipboard epoch、舊 feedback 與下载 URL。copy kind 目前只有 selected/css，新增 pair 的獨立 feedback 路徑並沿用同一失效機制。 |
| `public/js/core/palette.mjs`：`createPalette`、`reducePalette`、`updateDraftFields`、`commitDraft` | stable id 選 foreground/background。合法輸入也先產生 `dirty:true,error:null`；Enter／focusout 才提交。刪除配對色時改回剩餘第一、第二色。 |
| `public/js/core/export.mjs`：`exportCss` | 僅接受精確 RGB records，拒絕 getter／多欄位／非法值；全票固定 LF 與大寫 HEX。可增加同標準的 `exportPairCss(foreground, background)`，不改 `exportCss` 格式。 |
| `public/js/clipboard.mjs`：`createClipboardController.copy/invalidate` | 明確點擊才 writeText，失敗提供安全字串，只有目前 epoch 通知 UI。API Promise 仍可能 resolve 舊成功，UI 應聽 controller callback，不能直接拿 Promise 結果宣告當前成功。 |
| `public/js/core/contrast.mjs`：`contrastRatio`、`evaluateContrast` | 原始比值判門檻、`toFixed(2)` 僅展示。保留 4.5/7/3/4.5 門檻及不透明 sRGB 界線。 |
| `public/js/i18n.mjs`、雙語 HTML、`public/styles/app.css` | 新增雙語配對 CSS 名稱、提示、copy 狀態。用既有 code region/focus/status/field 樣式，不重排工具。 |

HANDOFF 已記錄來源／colors.glossquote.com／首頁必要發布 gate PASS 與人工 NOT_RUN；PRODUCT/START-HERE 的「尚未實作」是歷史藍圖，不能重 scaffold。

### 精確 UI、資料與狀態

1. 對比樣本、比值、四門檻下方顯示可選取的固定 CSS 預覽及「複製配對 CSS」。CSS 使用下列字節格式，UTF-8 無 BOM、LF、結尾 LF；selector 不讓使用者輸入，沒有命名欄或自由 CSS：

   ```css
   .color-pair {
     color: #111410;
     background-color: #F3F0E8;
   }
   ```

   說明可提示「貼到樣式表後，將 class 加到需要這組配色的元素」。不匯出全頁 CSS、字級、比值或 WCAG 認證註解，不新增配對檔下載。

2. 新的 `pairCssForState` 必須從同一個當前 state 找到 foregroundId/backgroundId 對應 committed RGB。兩個 draft 都必須 `dirty === false && error === null`，才產生預覽與複製字串。不能在 valid parser 回傳後直接使用草稿，也不能用 fallback 舊 RGB 讓畫面說「剛測過」。找不到 id 或 formatter 拒絕時不複製、不曝露 raw exception。
3. 任何端點 `input` 事件，即使草稿合法，都同步收起舊配對 CSS、停止相關對比結果、disabled 配對複製，顯示原「尚未提交」提示。Enter／欄位離焦後完整有效提交才重現新結果。原本 focusout 的正常提交照舊；只改色票選取／順序不能偷偷換配對 id。
4. 第三色有尚未提交草稿時，全票 CSS 仍封鎖；如果它不是 foreground/background，已提交的配對結果與配對 CSS 仍可使用。配對快照只描述兩端點。現有「任何 state 改动都失效 pending copy」策略可保留，避免晚到 feedback。
5. 相同 id／相同顏色合法：比值 1，四門檻未通過，仍輸出兩條同色宣告。低對比不是格式錯誤，不替使用者換色或隱藏 fail 文字。
6. 按 copy 才透過既有 controller 寫入。pair 的 pending/success/error 文案與 fallback 必須在配對區；拒絕時顯示唯讀 textarea、移焦點並選取，字串必須是被拒絕的同一快照。狀態改動後清掉 fallback；既有 OS 剪貼簿不在清除能力內。
7. 兩色至八色、HEX 32 字元、RGB/HSL 各欄 8 字元、不透明 8-bit sRGB 的上限完全保留。無批次、alpha、漸層、匯入、圖片萃色、自動調色。
8. 取消不新增：操作同步有界；clipboard 是不可撤回的 OS 請求，清除／重設／pagehide／改動只失效本頁舊回覆，不能宣稱撤回已寫入文字。重設仍回起始色票，pending response 不得出現旧成功。

桌面只在既有配對面板加一組預覽／動作；320px 時配對 controls、樣本、結果、CSS、copy 依序堆疊。code 可局部橫捲，動作與限制說明必須重排。copy 的可見標籤、focus、44px 目標及 polite feedback 沿用系統。

### 驗收案例

所有新增案例在實作前為 `NOT_RUN`。A＝Node；B＝真正瀏覽器，mock 若使用須明示。

| ID | 種類／輸入 | 精確預期 |
|---|---|---|
| U10-01 | A，初始 c1/c2 的 RGB；B 初始頁 | `exportPairCss` 等於上述固定字串／UTF-8 bytes；畫面角色與宣告一致，无 BOM/CR、結尾 LF。 |
| U10-02 | A+B，文字 #000000、背景 #FFFFFF，再交換 | 首例 `color:#000000`／`background-color:#FFFFFF`，交換後相反；ratio 21 與門檻结果保留、palette 順序不變。 |
| U10-03 | B，先提交背景 #FFFFFF；文字色欄仍聚焦，输入合法 #767676、只 dispatch/產生 input，未 Enter/離焦 | draft dirty、error null；舊比值／配對 CSS 不顯示、copy disabled。不能只测非法 #zz。Enter 後顯示 #767676 對 #FFFFFF、普通 AA 通過及新宣告。 |
| U10-04 | A+B，合法草稿後输入 #zz，再提交／修正 | 無效時無旧比值、CSS、copy；修正且提交後才恢復，原 colour gate 不放寬。 |
| U10-05 | A+B，新增第三色、為 c3 留合法 dirty，端點仍 c1/c2 | 全票 CSS/下載不可用；配對只用 c1/c2 已提交值，仍可複製。把 foreground 換到 c3 後配對也封鎖。 |
| U10-06 | A+B，配對 id 指向三色中的第2/3色，排序，再刪除被選端點 | 排序只改全票序列，不換 pair 值；刪除後 pair 依原 reducer 改為剩餘第1/2色，snippet 跟新角色一致。 |
| U10-07 | A+B，同色 #123456；#777777/#FFFFFF | 同色 ratio 1，CSS 合法且兩宣告同色；第二例 ratio≈4.478089453577214、展示4.48、普通AA未通過、大字AA通過，仍可複製。 |
| U10-08 | A+B，配對 copy adapter 拒絕／缺少 Clipboard | 不報成功；在配對區的唯讀 textarea 等於請求字串，能键盤手動選取，無自動讀剪貼簿。mock 與真權限拒絕分開記錄。 |
| U10-09 | A+B，延遲配對 copy A；輸入合法 draft／交換／重設後，A 成功或拒絕才回 | 舊 A 不顯示 success/fallback；修改當下 feedback 即失效。随后 B 成功才能显示 B 的狀態。 |
| U10-10 | A，RGB records 多欄、channel字串/256、getter、revoked proxy；B script-looking色碼 | exporter 拒絕，getter不执行；UI拒絕且只有字面文字，無HTML/CSS注入或額外請求。 |
| U10-11 | B，雙語鍵盤走编辑→提交→配對→交換→copy/fallback→reset；320px/200% | 动作可達、焦點可見、按鈕／错误重排；不新增頁面橫捲或無標籤圖示。 |
| U10-12 | A+B，原全票 CSS 與下載、頁面重整及 Network/storage | 原 `palette.css` bytes/檔名不改；重整清空，操作無新內容請求／storage；未觀察項如實 NOT_RUN。 |

### 建議允許檔案與命令

原對話的手動路徑限 `tool-projects/10-color-palette/` 下：`public/js/app.mjs`、`public/js/core/export.mjs`、`public/js/i18n.mjs`、`public/styles/app.css`、`public/index.html`、`public/en/index.html`、`test/export.test.mjs`、`test/palette.test.mjs`、`test/clipboard.test.mjs`、`test/i18n.test.mjs`、`PRODUCT.md`、`TECHNICAL.md`、`ACCEPTANCE.md`、`UX-SEO.md`、`HANDOFF.md`、`TASKS.md`、`docs/TEST-RESULTS.md`。若需要抽出可測的配對快照 helper，先在此範圍內選現有 export/reducer 接點，不為 mock 測試重寫 app。原 clipboard controller 不必改 API。`dist/**` 只能由既有 build 生成。

實際 `package.json`：`dev=node scripts/serve.mjs`、`test=node --test`、`check=node scripts/check.mjs`、`build=node scripts/build.mjs`，Node ≥24、無依賴安裝。以下於該工具 CWD 逐條執行：

```powershell
node --test test/export.test.mjs test/palette.test.mjs test/clipboard.test.mjs test/i18n.test.mjs test/contrast.test.mjs
npm.cmd test
npm.cmd run check
npm.cmd run build
npm.cmd run dev
```

dev 預設實際為 loopback 4173；先確認現有服務，不能殺佔用埠程序。兩語 `/index.html`、`/en/index.html`。聚焦測試可在開發時跑；最終全套已包含相同測試，沒有新變更時不用重複跑。

新版候選的既有正式產物檢查，交由主代理排程，非此唯讀任務執行：

```powershell
npm.cmd run build -- --production --cloudflare --site-url https://colors.glossquote.com/
npm.cmd run check -- --production --cloudflare --site-url https://colors.glossquote.com/
```

風險／停止：若為了匯出引入自由 selector/CSS、透明度或移除 dirty gate，停止交主代理；若 clipboard 晚回覆仍可報舊成功，不能交候選。既有門檻算法／palette.css 舊字節失敗必須修復，不能改 expected 以假裝通過。無需新增 runtime package 或權限。


## 原owner交付與停止契約

先讀根/工具AGENTS、current HANDOFF與實際code/修改。只改本文列明本工具public/test/spec/docs及任務紀錄，相關新增focused tests可新增；check精確資產清單若確有必要只做最小更新與回歸，不降低安全限制。可寫本工具.runs/10-color-palette-outcome-2026-10-13/與既有獨立reviewed發布副本；不得動他工具/首頁/共享狀態、讀憑證/deploy/改持久Windows環境。所有build/test前後執行check-persistent-environment.ps1並核完整Environment不變；只假資料，無新runtime依賴。

原owner完成focused與package必要test/check/build/release產物gate及current文件；PUBLIC更新既有KYStr repo並核遠端commit/visibility、固定source ZIP/manifest。主代理負責正式部署、首頁与獨立驗收，本文所稱release由主代理排程不禁止owner產生本工具受審候選。

完成回覆原對話供主代理實際收取：任務ID、改檔/行為、命令exit與結果、未驗項/風險、候選來源與ZIP（gate沒有就明示）、真實本機URL、是否釋放寫入權。新版待主驗/發布/外验，不繼承舊通過；新權限/成本/依賴/範圍衝突或兩輪同因無進展就保存重現並具體停止回報。不得自動下一milestone、改模型或重開對話。
