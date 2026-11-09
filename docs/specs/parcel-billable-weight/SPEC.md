# 包裹計費重核對 / Parcel Billable Weight

規格 ID `spec-parcel-billable-weight-20261109` · v1 · 2026-11-09 · B 組預案
產品實作與產品驗收狀態 `NOT_RUN`。

## goal

出貨者已量數個包裹及找到服務給出的除數、進位及尺寸限制，想在交寄前逐件核對實重、材積重與計費重。

包裝桌旁用寬畫面並列各服務的包裹結果，核對哪些尺寸過門檻、哪一件造成該服務不能得到完整總重。

秤旁用手機逐件輸入毫米及克。結果先按服務，打開件列時同時看三邊、材積及尺寸檢查。

## scope

1–12 件長方體外包裝及 1–4 組自填服務規則。支援整件量測上限、最低計費重與向上級距。尺寸或實重超界逐件列明。

範圍外包括預設業者或現行費率、運費、地址、寄件標籤、危險品規則與交寄。

**既有規格差異**。題目從 2026-11-09 的 130 筆登記中比對，以下是相近任務的實際交付差異。

- `spec-33-box-fit` 根據箱子內空間估放入件數。本件使用量好的外包裝和多組服務規則產生計費重。
- `spec-57-quote-builder` 產生報價草稿及項目總額。本件輸出重量與通過的量測條件。

## userFlow

採 Gloss Tools Product App 工作區。首畫面保留主要欄位、工作物與「核對各服務計費重 / Compare billable weights」。清除和語言連結次要。寬畫面保留至少一半寬度給工作物，`<48rem` 改為單欄，結果依關係堆疊。使用者以標題與具名欄位定位，核心操作可用鍵盤、指標或觸控。

1. 用毫米量完整外包裝三邊，用克填實重。三邊可任意填，工具會依長度識別最長邊。
2. 依使用者手邊的服務規則填材積除數、克級距、最低計費重與選填的限制。
3. 查看每件、每服務的原因和計費重。服務下任何一件不符時，該服務不提供總計費重。

狀態規則如下。

- 初始為 `empty`，看得到帶單位的欄位及填寫提示。部分輸入為 `dirty`，只顯示草稿和缺欄，結果區保持空白。可明確載入與 `parcel-billable-weight.two-services` 相同的假資料，範例載入仍為 `dirty`。
- 每次編輯在同一事件立即清除舊結果及結果區互動，並使活動 runId 失效。表單送出錯誤進 `error`，保留草稿，聚焦第一個錯欄。修正回 `dirty`。有效但無解或不足的結果顯示規格所列原因與下一步。
- 有效執行進 `busy`，操作鈕當下顯示「計算中 / Working」，提供「取消 / Cancel」。執行中重送被忽略。結算僅在目前 runId 相同且仍 busy 時生效，正常為 `ready`，純核心錯誤為 `error`。取消回 `dirty`，保留輸入。
- 清除要求一次明確的「清除草稿 / Clear draft」，返回初始值、取消活動 runId、清除錯誤與結果，焦點移到首欄。語言連結旁標示離頁重設，返回或重新整理清除工作記憶體，含 bfcache 還原事件。靜態資源載入完成後可斷線操作，初始化失敗顯示「重新載入 / Reload」。
- 結果與錯誤使用一個節制的狀態區。驗證錯誤以文字、圖示及欄位連結表示。無登入流程及輸出檔案流程。

## inputsOutputs

純函式 `solve(data)` 接收無副作用、精確鍵集合的 JSON 物件。表單只把已驗證資料映射到下列核心型別。所有欄位必填，除非表內明列可空。預設值由表單顯示並送入核心。陣列次序在複製快照後固定。輸入上限為 JSON UTF-8 65536 bytes，超出在根回 `SIZE`。表單文字欄先限長 128 UTF-16 code units，數字欄限 12，時間另依本規格格式。

- `I[a,b]` 為 JavaScript 安全整數含端點。原始表單只收 ASCII 十進位整數，非負形式 `0|[1-9][0-9]*`，允許負數的欄位另外接受 `-[1-9][0-9]*`。拒絕前後空白、前導零、全形數字、指數、正號、小數與 `-0`。核心亦拒絕 `-0`、字串型數字和非整數。
- `N` 是自訂識別用的短名。去除頭尾 U+0020 後 NFC 正規化，長度 1–24 Unicode 碼點，首字元為 Unicode 字母或數字，其餘限字母、組合標記、數字、ASCII 空格、連字號或底線。大小寫有別，參照同樣正規化。必要時用 `Map` 做鍵對照，輸出顯示正規名。
- `B` 為真正的 JSON boolean。`null` 與空陣列只有明列時合法。原始語法錯誤用 `SYNTAX`，核心型別用 `TYPE`、超界 `RANGE`、錯誤鍵集合 `SHAPE`、枚舉 `ENUM`、正規化重名 `DUPLICATE`、無法解析參照 `REF`。錯誤格式 `{status:"error",error:{code,path}}`，`path` 是 JSON Pointer，根為空字串。
- 先拒絕整體大小與物件形狀，再依下表欄位及陣列輸入次序驗證。跨欄約束在全部欄位型別合法後執行，依實作節所列先後。未知鍵回該物件固定路徑。缺少鍵回該已知鍵路徑。重名指向第二個重名欄位。錯誤訊息只使用固定代碼與已知路徑，界面中英對譯並給出修正方法。

| 欄位 | 型別、界線與預設 |
| --- | --- |
| `parcels` | 1–12 列 `{name:N,sidesMm:[I[1,3000],I[1,3000],I[1,3000]],actualG:I[1,100000]}`，名稱唯一。 |
| `services` | 1–4 列 `{name:N,divisor:I[1,100000],stepG:I[1,100000],minG:I[0,100000],maxLengthMm:I[1,3000]\|null,maxWrapMm:I[1,15000]\|null,maxActualG:I[1,100000]\|null}`，服務名唯一。初始各一列，minG 預設 0，三個上限預設 null，其他量空白。 |

有效輸出一律為 `{status:"ok",result:{…}}`。結果固定欄位如下。

`{services}`，原服務序的列 `{name,totalChargeG,pieces}`。pieces 原包裹序 `{name,volumeNumerator,volumeDenominator,wrapMm,reasons,chargeG}`，材積重 g 為未約分分子／分母，介面顯示一位小數。reasons 只含 `LENGTH`,`WRAP`,`MASS`，依此序。chargeG 或總計無值時為 null。

除下方指定者，計量保持整數且不四捨五入。需比較的比例先算精確分數、交叉相乘，不用顯示字串回算。凡稱「一位小數」的正值，規則為 half-up，先以整數算 `floor((20*n+d)/(2*d))` 得十分位，再格式化。用 `Intl.NumberFormat` 排版已算出的顯示值。結果同列格式在兩種語言保持欄位與次序一致。

## implementation

使用原生 HTML、CSS 和瀏覽器 ESM。Node.js 24 與內建模組負責建置和 `node --test`。純核心保留可直接測試的公開 `solve`，DOM 控制器只處理欄位和工作階段。版本 1 採以下規則。

1. 每件把邊長降序為 L≥M≥S，V=L×M×S。包覆值 `wrapMm=L+2×(M+S)`。
2. 使用者的除數單位為 cm³/kg。因 mm³ 轉 cm³ 除 1000，再由 kg 轉 g 乘 1000，所以材積克數恰為 V/divisor。
3. 對各非空上限比對 L、wrapMm、actualG，嚴格大於上限才加理由。有任何理由時 chargeG=null。
4. 合格件用 `num=max(actualG×divisor,V,minG×divisor)`。計費重 `ceil(num/(stepG×divisor))×stepG`。整除時維持該級距。服務全數合格才把逐件已進位的 chargeG 相加。

不正確的三邊數量回 `RANGE` 指向 sidesMm。未知限制須明確留空。超界件仍有材積數據與原因。

工作界線為 48 件服務組合，單件體積至多 27,000,000,000 mm³，整數乘積在安全範圍。純核心在下一個事件迴圈工作項執行。進入 busy 即配置 runId，排程前取消或編輯時撤銷該工作項。已經返回的回覆交由 runId 閘門。維持同一結果接口，並以最大資料列驗證互動可用。

結果中任何自訂短名以 `textContent` 建立。動態圖僅用驗證後的尺寸與內建元素。載入只請求同源靜態資產。其後無互動網路請求。輸入、結果、錯誤狀態只留頁面記憶體，不寫 URL、日誌、cookie、Local/Session Storage、IndexedDB、CacheStorage 或 service worker。範例內嵌固定假資料。採本機系統字型與共用設計權杖。CSP 用 HTTP 標頭限定 `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; worker-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`，回應另帶 `X-Content-Type-Options: nosniff`。

頁面與靜態 SEO 設定如下。

| 語言 | 路徑／語言標記 | Title | Description | 同語首頁 |
| --- | --- | --- | --- | --- |
| 繁體中文 | `/index.html` / `zh-Hant` | 包裹計費重核對｜Gloss Tools | 用包裹外尺寸、實重與自訂服務條件核對材積重、進位與超界。 | `https://glossquote.com/index.html` |
| English | `/en/index.html` / `en` | Parcel Billable Weight \| Gloss Tools | Check parcel dimensional and billable weights against entered service limits and increments. | `https://glossquote.com/en/index.html` |

兩頁的 H1 使用產品名，各自有可讀語言連結。預覽兩頁設 `noindex,nofollow`，robots 封鎖探索且沒有正式 sitemap。正式建置必須輸入主責確認的 HTTPS origin，同語頁自指 canonical，互設 `zh-Hant`、`en` alternate 及中文 `x-default`。正式 sitemap 只列兩個 HTTPS canonical，robots 公告該 sitemap 並允許抓取，且移除預覽 noindex。兩語的空白提示、欄名、單位、驗證、按鈕、結果、限制、取消、清除與範例都用對應語言，產品數值使用同一核心。

## acceptance

九個固定必要面向逐項由非作者審查固定產品 commit。每項最低 90，面向所需檢查均完成才可接受產品。預案文件以八節、字面案例、來源和界線核對，文件 ready 與產品驗收分別記錄。

| 面向 | 必驗項 |
| --- | --- |
| `functionality` | 重現全部固定案例及依未捨入的材積重進位且每個服務總和只含全部合格件，提供完整可讀結果。 |
| `boundaries` | 精確驗證輸入界線、重算與取消，核對上限 48 件服務組合，單件體積至多 27,000,000,000 mm³，整數乘積在安全範圍。 |
| `privacy` | 檢查實際 Network 與 Storage，確認工作資料僅留頁面記憶體。 |
| `security` | 拒絕非契約資料，固定錯誤路徑，所有使用者文字以文字節點呈現。 |
| `usability` | 依操作案例完成「核對各服務計費重」，從結果直接取得下一步。 |
| `accessibility` | 證明鍵盤、觸控、可讀錯誤、焦點、重排、縮放與減少動態完整可用。 |
| `localization-seo` | 驗證雙語內容、語言互換、同語首頁及預覽與正式索引設定。 |
| `toolchain-provenance` | 在固定候選以 Node 24 離線建置、測試並記錄檔案與證據來源。 |
| `compatibility` | 實際在獨立隔離的 Chrome、Edge 及行動寬度走完必要流程。 |

可及性門檻包括原生標籤及錯誤關聯、可見焦點、結果的真實表格或語意清單、正文字對比至少 4.5:1、互動界線至少 3:1、主要觸控 44 CSS px、320 CSS px 頁寬無橫向捲動、200% 真縮放、節制 live 區和減少動態。具名的圖表區可內部捲動並提供等價文字。

## tests

[字面案例](fixtures.json) 的 `solve` 列直接用 `node:test` 與 `assert.deepStrictEqual` 比較整個結果或錯誤。單獨測試輸入上限前後各一、錯誤固定路徑、未知鍵、數字語法、NFC 及文字注入。適用於時間的產品另測同端點相接。測試只使用假資料，建置及純測試離線執行。此版預案共列 8 案，逐案推導見 [作者檢查](AUTHOR-CHECK.md)。

`flow` 案是受控執行器腳本。edit 換成完整字面草稿，run 配置編號並捕捉當下草稿，settle 交付該次 `solve` 回覆，cancel 撤銷該編號。比較 `{phase,result}`，只在 ready 含當前有效結果。增加 reset、空白送出、錯誤修正與載入假資料測試，並檢查較舊 error 回覆也無法覆寫新狀態。

真實瀏覽器需在已驗證隔離、與桌面鍵盤／IME／剪貼簿無共享的環境，實際啟動 Chrome 和 Edge 並分別記錄版本、commit、語言路徑、視窗、操作與觀察值。測寬畫面、320 CSS px、200% 真縮放、只用鍵盤、觸控或隔離觸控模擬、偏好減少動態及焦點次序。調換長寬高順序重算，結果相同。降低服務最長邊門檻後，看到尺寸原因及空總重。確認斷線後完成工作，Network 無資料請求、Storage 無新增，輸入與輸出無 URL 或記錄殘留。無獨立環境時瀏覽器 gate 維持 `NOT_RUN_USER_FOCUS_INCIDENT`。

正式另在同一審閱產物的實際 HTTPS 站點逐頁核對 HTTP 狀態、標頭、版本位元組、雙語導航、SEO、robots、sitemap、同語首頁與工作旅程。每項記實際觀察的 PASS／FAIL／NOT_RUN。此文件提供待執行條件。

## handoff

固定產物為本檔、[製作簡報](BRIEF.md)、[字面案例](fixtures.json) 與 [作者檢查](AUTHOR-CHECK.md)。由非作者核對固定 GitHub 版本的八節和案例後登記預案 ready。後續另立 P3 製作任務，依最新 GitHub registry ACK／唯一 claim／精確讀回再開始。規格路徑 `docs/specs/parcel-billable-weight/`，製作路徑 `tools/parcel-billable-weight/`，共用 repo `KYStr/glossquote-labs-home`。建立 `codex/<task>-<actor>` 分支、固定 commit 與 PR，在 PR head 相同時提交。建議製作請求模型 `gpt-6.1-sol`、推理強度 `max`，以任務實際回報記錄。

製作檔案包括 `package.json`、`src/core.mjs`、`src/app.mjs`、`src/i18n.mjs`、`src/styles.css`、`scripts/build.mjs`、`scripts/check-generated.mjs`、`test/*.test.mjs`、`HANDOFF.md`。 `package.json` 以 ESM、空依賴，定義 `npm.cmd test`、`npm.cmd run check`、`npm.cmd run build:preview`、`npm.cmd run check:generated:preview`、`npm.cmd run build:production -- --origin <已確認 HTTPS origin>` 及 `npm.cmd run check:generated:production`。預覽與正式產物分置 `dist/`、`dist-production/`。必要本機 HTTP 預覽只綁 `127.0.0.1`。

交付時記固定 SHA、PR、檔案雜湊、命令與九面向證據。修正回原承接者，新的 head 重新交驗。文件 ready、產品 accepted、正式發布及雙語 catalog 更新為各自獨立步驟，使用既有批准範圍。首輪實作先凍結本規格與案例，再做純核心與狀態，最後才做雙語頁、產物檢查與獨立瀏覽器驗證。
