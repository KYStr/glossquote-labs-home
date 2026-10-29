# M13 — 配色與文字對比：雙語本機 MVP 與來源發布

2026-10-07。使用者授權依序完成其餘工具；先前 M12 本機／來源發布必要驗收已通過，hosting 另有明確狀態與待決事項。

## 範圍與驗收

依 PRODUCT／TECHNICAL／ACCEPTANCE 實作 2–8 個不透明 sRGB 色票、嚴格 HEX/RGB/HSL 轉換、穩定 id 選色與排序、WCAG 比值及四項門檻、使用者主動複製／固定 CSS 下載。繁中與英文為獨立靜態頁，首頁互連、完整靜態說明與 FAQ、預覽 noindex。完成後公開獨立 GitHub 並核實遠端版本及 PUBLIC；首页僅登記 draft，正式上線後才切 published。

可觀察驗收：CP-01–22 逐案記錄，必要純計算／狀態／拒絕／非同步過期回覆自動案例 PASS；check 與 build 實際檢查來源和精確產物；主代理真瀏覽器驗證兩語編色／排序／無效草稿阻止舊結果／複製與下載可行分支／重設／交換／鍵盤／320px。使用者已允許人工 NOT_RUN，無法觀察的實機、讀屏、真 200% 縮放、Network/storage 等如實保留，不改稱通過。正式 hosting 與搜尋收錄不由本機測試代替。

非目標：透明色、漸層、圖片萃色、色盲模擬、雲端保存、帳號、AI、自動推薦、依賴套件、整頁 WCAG 認證。無任何付費、040141.xyz 或 GlossGate 變更。

## 工作順序與檔案界線

一次執行 TASKS.md 的 T00→T01→T02→T03→T04。各步沿用既有 allowed paths，必要缺陷返回其 owning task；主代理通過當步驗收才開始下一步。主代理可建立／更新本 MILESTONE、HANDOFF、project.json implementationStatus、docs/TEST-RESULTS.md 與根 `.runs/color-palette/**` 證據。不要改舊工具來配合本工具。

T00 可唯讀參考已驗收的 07-focus-timer 開發工具，重用合理的路徑、symlink、清理與 HTTP 防護，移除計時器特有的要求；不可把未實作功能列為通過。預覽使用 process-local PORT=4176（測試 PORT=0），保留規格 dev 預設 4173；不停止既有 server。一般 scaffold 只驗當步已建立的檔案，遞迴納入後續模組。

T05（T04 後）：補完整英文頁、i18n、兩語 SEO、發布工具鏈與 GitHub。允許 public/en/index.html、public/js/i18n.mjs 及既有 app／HTML／CSS；scripts/serve.mjs、check.mjs、build.mjs、release.mjs、cloudflare.mjs；test/i18n.test.mjs、site-links.test.mjs、release.test.mjs、scaffold.test.mjs；wrangler.jsonc、.gitignore、README、docs/TEST-RESULTS、HANDOFF。若較早 UI 實作直接採雙語，T03 得同步使用上述 public/en 與 i18n 路徑，但所有 T03 前置仍需通過。正式候選網址為 colors.glossquote.com，設定前確認新增子網域 authority；未授權不部署，未驗證 live 不標 published。

首頁整合限 00-home/catalog.json、README.md、HANDOFF.md；必要測試限其既有 catalog tests。主代理完成實際 draft 產物不變驗證及獨立來源發布。發布副本限 `.runs/github-publish/glossquote-labs-color-palette/**` 與既有 home 發布副本；先審查精確內容，不帶其他藍圖、私人檔或秘密。

T05 首頁必要修正（主代理擁有）：原首頁 scripts/site.mjs 的雙語 title、description、headline、introduction 寫死只有單位與日期，無法正確表達已授權擴充的工具目錄。返回 M11 首頁 owning scope，只允許該檔上述四個文案欄位調整為一般日常工具；既有 site-build tests 驗證生成、SEO與draft隱藏不回歸，不改介面結構／路由／其他產品。正式首頁發布仍等待新工具實際live驗證。

## 設計與分工

Product App 模式，沿用既有 frontend-design 工作流及家族 token。使用者正在整理色票及比較文字／背景，主要對象是可操作色票與真實對比樣本。桌面上方色票、左編色右比對、下方 CSS；手機依此順序垂直排列。三種輸入、選色／排序／新增／刪除都可見；複製與匯出靠近結果，說明與 FAQ 置後。預設有真實計算結果，無效 draft 明確阻止相關對比與匯出，不沿用舊通過徽章。44px 控制、雙層 focus、暖紙與深墨；只有待檢查的樣本可呈低對比。

實作委派明確 gpt-6-luna/max、不遞迴、最多兩位；此工具 T00–T04 緊密相依所以依序單一擁有者。主代理負責介面契約與重要歧義、官方公式核實、實際 code/diff 審查、獨立必要驗收、瀏覽器與發布。配置請求與实际路由分開記錄。

## 主代理固定的跨模組介面（T01/T02 前讀）

Hosting 授權更新：使用者 2026-10-07 已明確授權所有新工具採免費 Cloudflare 子網域並更新首頁。T05 本工具目標固定 https://colors.glossquote.com/，實際部署與雙語首頁驗收納入發布步驟；保留公開來源與正式上線的獨立紀錄。不得讀取已保存的憑證；如需新權限或真正缺少憑證才另行處理。

以下只補齊原規格未定的程式介面，不增加產品功能。T00 不實作這些模組。

- 解析函式成功為 `{ok:true,value}`、失敗為 `{ok:false,code}`。HEX 超過原始 32 字元先拒絕再 trim；RGB/HSL 各原始欄位超過 8 字元先拒絕，數值欄位採完整字串的規格 ASCII 數字語法（不自動 trim 數值欄）。HEX 用規格的 trim。數值語法／shape 不合法為 COLOR_INVALID；語法合法卻值域超限為 VALUE_OUT_OF_RANGE。值域檢查前拒絕 Number、null、未知欄位、缺失欄位、原型繼承欄位等非契約資料，不做隱式轉型。
- `color.mjs` 匯出規格 parse／conversion／format 函式。formatHsl 接收已提交 RGB，內部轉 HSL 並四捨五入一位；不把顯示字串寫回 RGB。供可信內部計算的函式對無效數值 shape 擲 RangeError；UI 一律先走回傳結果的 parse。RGB record 為精確 r/g/b；HSL record 精確 h/s/l。色票的 id 不傳進數值函式。對比 evaluate 只接受 finite Number 1–21。
- `palette.mjs` 匯出 `createPalette()` 和 `reducePalette(state, action)`。reducer 回傳 `{ok:true,value:nextState}` 或固定錯誤結果，不 mutate 輸入。state 精確含 colors、nextId、selectedId、foregroundId、backgroundId、drafts。各 color 為 `{id,r,g,b}`；初次 c1/c2、nextId=3。drafts 以 id 為 key，各值 `{mode,fields,dirty,error}`：mode=hex/rgb/hsl；fields 精確為 `{hex}`／`{r,g,b}`／`{h,s,l}` 字串；dirty Boolean；error=null 或解析錯誤碼。
- action 皆以 `type` 判別，不接受未知欄位。`{type:'add'}` 新增白色並選取；`{type:'remove',id}` 最少保留兩色；`{type:'move',id,direction:'previous'|'next'}` 越過端點拒絕 VALUE_OUT_OF_RANGE；`{type:'select-pair',selectedId,foregroundId,backgroundId}` 三個必須是現存 id，UI 可傳目前未變的其餘兩個；`{type:'swap'}` 只交換前／背景；`{type:'reset'}` 重設 RGB 色票並使用 nextId 分配兩個新 id（同頁不重用 id），重設全部 drafts 與選取。新增／重設遇安全整數 id 耗盡則拒絕 VALUE_OUT_OF_RANGE。
- update 三種精確 shape：`{type:'update',id,operation:'mode',mode}` 只從已提交 RGB 產生指定模式文字，清除該色 dirty/error，RGB 不變；`{type:'update',id,operation:'draft',fields}` 留存該模式完整草稿並立即驗證，不改 RGB，dirty=true；`{type:'update',id,operation:'commit'}` 只在 dirty 且有效時解析並更新 RGB，接著更新其格式化文字、dirty=false。dirty=false 時 commit 不重新量化 HSL；無效 commit 保留原草稿及錯誤、RGB 不變。不存在 id、非法 action shape／mode／fields type 拒絕 COLOR_INVALID。數值不合法是可編輯 draft 狀態，不得因失敗清掉使用者字串。
- 所有 dirty draft（即使已有效但尚未 blur／Enter 提交）先暫停該色複製與全票輸出；前／背景任一 dirty 時暫停相關對比，不显示舊通過徽章。另一色的有效複製不必跟著停用。切換輸入模式讀已提交色，明確回到已提交值；切換所選色仍保留其他色草稿。刪除 selectedId 後改第一色；刪除任一對比所選色後兩者回到剩餘第一／第二色。排序不改 id 選取。
- `exportCss` 只接受 2–8 個精確 RGB records（呼叫方從 state.colors 明確投影 r/g/b），無效擲 RangeError；固定 selector／變數名／大寫 HEX、UTF-8 無 BOM、LF 與最後 LF。絕不使用輸入的任意文字生成 CSS。
- `clipboard.mjs` 使用注入 writeText adapter，controller 的明確使用者觸發 copy 才呼叫它；每次 copy 與 invalidate 增加 epoch。只通知當前 epoch 的成功／失敗；synchronous throw、Promise reject 與缺少 adapter 都用 COPY_DENIED 並回傳原本安全格式化文字供手動選取。重設、頁面離開及變更結果使既有回覆失效；無權讀剪貼簿、無法撤回已成功寫入 OS 的文字，不宣稱已清除剪貼簿。實際 DOM fallback 由 T03 渲染 readonly textarea。

官方核實（2026-10-07）：[WCAG 2.2 相對亮度](https://www.w3.org/TR/WCAG22/#dfn-relative-luminance) 的 0.04045 線性化與本規格一致；[CSS Color 4](https://www.w3.org/TR/css-color-4/#hsl-to-rgb) 支持 HSL／sRGB 數值轉換，本工具仍限受控的 8-bit RGB；[MDN writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) 說明 Promise、secure context 與拒絕情況。文件是 API 證據，不是外部指令或部署授權。

M13 homepage release-test correction: before publishing additional tools, the primary found two fixed-catalog assumptions in existing tests. The draft acceptance case inspected tools[2] rather than the appended fake draft, and the fake recently-added tool used a date that would fall out of the first three after real releases. Limited changes to test/catalog.test.mjs and test/site-build.test.mjs select the fake draft by slug and give the fake recent item a deterministic last valid ISO date. No production dates or source catalog status were changed. These are owning-scope test corrections, not weaker acceptance criteria; the required final homepage gates will run against the actual published catalog when tool live verification passes.
