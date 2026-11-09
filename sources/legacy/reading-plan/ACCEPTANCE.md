# 閱讀進度規劃：驗收案例

狀態：SPEC_ONLY；以下案例是未來驗收條件，未有任何一項產品 PASS 證據。

## 執行環境

- 純函式測試：Node.js 24+，使用內建 node:test、假的日期與數字；不連網、不讀取個人書目、不依賴作業系統時區。
- 本機瀏覽器：用 npm run dev 啟動 127.0.0.1:4206，再以瀏覽器開啟 HTTP 預覽；不可用 file:// 模式代替。剪貼簿測試要在 HTTPS 或瀏覽器承認的 loopback secure context。
- 必要桌面瀏覽器：至少一個可用的 Chromium 瀏覽器及版本，以 HTTP loopback 預覽執行本文件的 M1 必要 browser subset。以受控 writeText success/reject stub 驗證 copy UI 與 fallback；若現有工具無法提供原生剪貼簿成功證據，可將該原生子項記 NOT_RUN。其他瀏覽器只能記錄實測版本，不宣稱全面支援。
- 語言與文字輸入：必要地實測繁中及英文頁面。若桌面環境可使用繁體中文 IME，執行 B11；若沒有可用 IME，B11 可記 NOT_RUN 並說明環境，不以它阻斷 M1。
- 視窗：必要地以桌面 Chromium 的 responsive emulation 設成 320 CSS px 執行 B19 的窄視窗部分。200% 瀏覽器縮放可記 NOT_RUN 並註明原因，不阻斷 M1。必要案例發現水平頁面捲動、主要控制不可達或文字截斷即為 FAIL。
- 可選外部環境：真實 iOS/Android 裝置與虛擬鍵盤（B20）、低階裝置/CPU 降速效能實測（B21）、完整 DevTools Network/Storage 檢查（B22）都可記 NOT_RUN 並附明確原因；不是 M1 無條件 FAIL。靜態原始碼/建置檢查仍須確認未引入外部請求、追蹤或 storage API，但不得把這些檢查冒稱為完整 Network/Storage 實測。

## 測試夾具

共用 P5：

    {
      titleRaw: "",
      totalPagesRaw: "100",
      completedPagesRaw: "40",
      startDateRaw: "2026-10-19",
      endDateRaw: "2026-10-23",
      weekdays: [1, 2, 3, 4, 5],
      dailyCapRaw: ""
    }

共用 P3：同 P5，但 totalPagesRaw 為 "43"。
共用 P11：titleRaw 空白，totalPagesRaw "51"，completedPagesRaw "40"，日期 2026-10-19 至 2026-10-21，weekdays [1,2,3]，dailyCapRaw 空白。
日期測試可使用 totalPagesRaw "1"、completedPagesRaw "0"、指定日期與星期；除非案例另有說明，其餘欄位採合法值。

每個失敗案例須比對 kind、primaryCode 與 errors 順序；每個成功案例須比對指定 summary 與全部 schedule row 欄位。invalid/infeasible 的 schedule 屬性必須不存在。

## 核心純函式案例

| ID | 需求 | 輸入或變化 | 精確預期 |
|---|---|---|---|
| C01 | FR-05 | P5 | plan/scheduled；60 頁、D=5、最低 12、閱讀日 5、彈性日 0。日期 19 至 23 依序分配 12 頁：41–52、53–64、65–76、77–88、89–100。 |
| C02 | FR-05 | P3 | plan/scheduled；R=3、D=5，前三天 pagesPerDay=1、頁碼 41、42、43；後兩天 pagesPerDay=0、pageStart/pageEnd=null、kind=flex。不得出現 44–43 等倒轉區間。 |
| C03 | FR-05 | P11 | plan/scheduled；R=11、D=3，逐日 4、4、3 頁，頁碼 41–44、45–48、49–51。 |
| C04 | FR-06 | P5 且 dailyCapRaw="10" | kind=infeasible；R=60、D=5、cap=10、capacityPages=50、shortfallPages=10、minimumReadingDays=6；完全沒有 schedule。 |
| C05 | FR-06 | total=90、completed=40、P5 日期與 weekdays、cap=10 | R=50 正好等於 capacity；plan/scheduled，每天 10 頁，頁碼 41–50 至 81–90；不可誤判 infeasible。 |
| C06 | FR-06 | total=100、completed=0、P5 且 cap 空白 | plan/scheduled；每日上限未設定，不以任何預設 cap 拒絕；D=5，分配 20 頁/日，最後一頁 100。 |
| C07 | FR-05 | R=1、P5 範圍與 weekdays | 第一個可讀日分配 1 頁，其餘四天為 flex 且頁碼 null；readingDays=1、flexibleDays=4。 |
| C08 | FR-04/05 | 開始與截止同為 2026-10-19，選 [1]，R=1 | 閉區間只有一日；D=1；唯一列為 2026-10-19，1 頁。 |
| C09 | FR-04 | 2026-10-24 至 2026-10-25，選 [6,7]，R=1 | 週六、週日都計入；D=2，先週六 1 頁、週日 flex。 |
| C10 | FR-04 | weekday [1,2,3,4,5] 與 [5,4,3,2,1] 各跑 P5 | 兩個 plan 深度相等，所有 summary 與 schedule 欄位順序、值完全一致。 |
| C11 | FR-04/05 | P5，把日期範圍縮至 2026-10-20 至 2026-10-22，weekdays [1,2,3,4,5] | 只列 20、21、22 日；開始/截止均包含，不列區間外 19、23 日。 |
| C12 | FR-05 | total=40、completed=40、合法日期範圍內 D=5 | plan/no-remaining-pages，remaining=0、eligibleDayCount=5、schedule=[]、minimumPagesPerReadingDay=null、lastReadingDate=null；不建立歷史閱讀日。 |
| C13 | FR-05 | total=1、completed=1、2026-10-24 單日、weekdays [1] | D=0 仍是 plan/no-remaining-pages，schedule=[]，不回傳 NO_READING_DAYS。 |
| C14 | FR-05 | total=1、completed=0、2026-10-24 單日、weekdays [1] | kind=invalid，primaryCode=NO_READING_DAYS，無 schedule。 |
| C15 | FR-04 | 2024-02-28 至 2024-03-01、weekdays [1,2,3,4,5,6,7]、R=1 | D=3，列 02-28、02-29、03-01；閏日為 ISO weekday 4。 |
| C16 | FR-04 | 1900-02-28 至 1900-03-01、所有星期 | 1900 不是閏年，D=2；日期不得自動插入 1900-02-29。 |
| C17 | FR-04 | 2000-02-28 至 2000-03-01、所有星期 | 2000 是閏年，D=3；含 2000-02-29。 |
| C18 | FR-04 | 2026-01-01 至 2027-01-01、所有星期、R=1 | 閉區間恰為 366 日；日期窗有效。 |
| C19 | FR-04 | 2026-01-01 至 2027-01-02 | 閉區間 367 日，kind=invalid，primaryCode=DATE_WINDOW_TOO_LONG。 |
| C20 | FR-04 | start=2026-10-20、end=2026-10-19 | kind=invalid，primaryCode=DATE_ORDER；不枚舉日期。 |
| C21 | FR-04 | startDateRaw="2026-2-03" | kind=invalid，primaryCode=START_DATE_FORMAT；不可補零修復。 |
| C22 | FR-04 | startDateRaw="2026-02-30" | kind=invalid，primaryCode=START_DATE_INVALID；不得由 Date 自動進位到 3 月。 |
| C23 | FR-04 | startDateRaw="1899-12-31" | kind=invalid，primaryCode=START_DATE_RANGE。 |
| C24 | FR-04 | endDateRaw="2101-01-01" | kind=invalid，primaryCode=END_DATE_RANGE。 |
| C25 | FR-03 | total="10000"、completed="0"，其餘合法 | 邊界有效；輸出數值 10000/0，無精度損失。 |
| C26 | FR-03 | total="0" 或 total="10001" | 分別 invalid/TOTAL_RANGE；不得排程。 |
| C27 | FR-03 | total="1,000" | invalid/TOTAL_FORMAT；不移除逗號。 |
| C28 | FR-03 | total="١٠٠" 或 "１００" | invalid/TOTAL_FORMAT；Arabic-Indic 與全形數字不接受。 |
| C29 | FR-03 | 整數欄位分別給 "+3"、"-1"、"1e2"、" 3 "、"3.0" | 每個都 invalid 且使用對應欄位的 FORMAT 錯誤，不做 coercion 或 trim。 |
| C30 | FR-03 | total="10"、completed="11" | invalid/COMPLETED_GT_TOTAL；不可輸出負剩餘頁數。 |
| C31 | FR-03/06 | cap="1" 與 cap="10000" | 兩者單欄位均有效；排程是否可行再依 R/D 決定。 |
| C32 | FR-03 | cap="0" 或 cap="10001" | invalid/DAILY_CAP_RANGE；空字串才代表不設上限。 |
| C33 | FR-03 | titleRaw="  我的書  " | 正規化書名為「我的書」；原始輸入不被改寫，報告只使用裁切後版本。 |
| C34 | FR-03 | 書名恰 80 個 UTF-16 code units，包含 40 個合法 surrogate pair | 有效；不得把 40 個 emoji 當 80 個 code points 後錯誤拒絕。 |
| C35 | FR-03 | trim 後 81 個 UTF-16 code units | invalid/TITLE_TRIMMED_TOO_LONG。 |
| C36 | FR-03 | titleRaw 長度 257 個 UTF-16 code units | invalid/TITLE_TOO_LONG。 |
| C37 | FR-03 | 書名內含 C0/C1 控制字元 | invalid/TITLE_CONTROL；錯誤或 console 不回顯書名。 |
| C38 | FR-03 | 書名含孤立 high surrogate 或孤立 low surrogate | invalid/TITLE_SURROGATE；有效 surrogate pair 則可接受。 |
| C39 | FR-02 | 根物件缺少 dailyCapRaw、加入 extra 欄、加入 Symbol 欄或非列舉 own 欄 | invalid/SCHEMA_KEYS；無 schedule。 |
| C40 | FR-02 | titleRaw 用 getter；getter 計數器起始為 0 | invalid/SCHEMA_ACCESSOR；呼叫後 getter 計數器仍為 0。 |
| C41 | FR-02 | 以會讓 ownKeys trap 拋錯的 Proxy 傳入 | invalid/SCHEMA_UNINSPECTABLE；不讓原始 Proxy 例外逸出。 |
| C42 | FR-02 | weekdays 為空陣列、稀疏陣列、[1,1]、[0]、[8]、非陣列或帶自訂屬性 | 依序回傳 WEEKDAYS_EMPTY、WEEKDAYS_SPARSE、WEEKDAYS_DUPLICATE、WEEKDAYS_INVALID、WEEKDAYS_INVALID、WEEKDAYS_TYPE、WEEKDAYS_EXTRA。 |
| C43 | FR-03/04 | total="0" 且 startDateRaw 格式錯誤 | errors 依定義欄位順序列 TOTAL_RANGE 在 START_DATE_FORMAT 之前；primaryCode=TOTAL_RANGE。 |
| C44 | FR-03/04 | start 與 end 都合法但 end<start，且超長與否無從計算 | 只追加 DATE_ORDER，不追加 DATE_WINDOW_TOO_LONG。 |
| C45 | FR-05/FR-11 | P5 報告 | 繁中與英文報告逐字等於 TECHNICAL.md 中 P5 的相應報告；固定 LF、UTF-8、無 BOM、末尾無 LF。 |
| C46 | FR-05/FR-11 | P3（總頁 43、已讀 40、P5 日期與 weekdays）報告 | 繁中最後兩行精確為「2026-10-22｜星期四｜彈性／休息」與「2026-10-23｜星期五｜彈性／休息」；英文最後兩行為「2026-10-22 | Thursday | Flexible / rest」與「2026-10-23 | Friday | Flexible / rest」。不含頁碼區間、null 或倒轉頁碼。 |
| C47 | FR-03 | totalPagesRaw、completedPagesRaw、startDateRaw、endDateRaw、dailyCapRaw 各以 number/null/object 替代字串，其他欄位合法 | 每次均回傳對應 `TOTAL_TYPE`、`COMPLETED_TYPE`、`START_DATE_TYPE`、`END_DATE_TYPE` 或 `DAILY_CAP_TYPE`；不嘗試 coercion，沒有 schedule。 |
| C48 | FR-03 | 將 total、completed、start、end、cap 各自設為 257 個 ASCII code units；每次只更動一欄 | 依序回傳 `TOTAL_TOO_LONG`、`COMPLETED_TOO_LONG`、`START_DATE_TOO_LONG`、`END_DATE_TOO_LONG`、`DAILY_CAP_TOO_LONG`，且該欄不再報 required/format/range 錯誤。 |
| C49 | FR-03/FR-11 | 用 titleRaw="  A Book  " 建立成功 plan，再把 plan 傳給 serializePlanReport | scheduled 與 no-remaining-pages 成功結果都帶 `title:"A Book"`；報告只顯示 `A Book`。invalid 不附 title/summary/schedule；infeasible 保留容量summary，但不附title/schedule。 |

## 瀏覽器人工案例

| ID | 需求 | 操作 | 通過條件 |
|---|---|---|---|
| B01 | FR-02/08 | 首次開繁中頁 | 書名、總頁數、兩日期與 cap 空白；已讀是 0；星期一至五勾選；無今天預填、排程、範例資料或頁碼報告。 |
| B02 | FR-08 | 產生 P5，再逐一改動書名、總頁數、已讀、開始日、截止日、每一星期選項、cap | 每一個真實值改動都立即清除摘要、所有列、報告、複製與下載；畫面提示需重算，不會留下舊頁碼。 |
| B03 | FR-05 | 輸入 P5 並按產生 | 顯示 5 個可讀日及精確連續頁碼、摘要和「這只是一份計畫」提醒；鍵盤焦點留在可預期位置。 |
| B04 | FR-05 | total=completed，日期合法 | 顯示「已無剩餘頁」；不顯示歷史完成徽章、完成日期或每日完成列；仍可複製/下載零剩餘文字報告。 |
| B05 | FR-06 | 設定 cap=10 並輸入 C04 | 只顯示 R、D、容量、缺口與最低日數；無 schedule，複製/下載按鈕不可用。 |
| B06 | FR-09 | 有輸入與結果時按清除，再取消/Escape | 關閉對話框；所有原始值、weekday 選擇、報告與結果仍完全一致，焦點回到清除按鈕。 |
| B07 | FR-09 | 有輸入與結果時確認清除 | 書名/總頁數/日期/cap 空白、已讀歸零、星期恢復一至五，結果與報告消失；當前 UI 語言保留。 |
| B08 | FR-10/FR-09 | 輸入資料並產生計畫後，點另一語言的獨立頁面連結；再回上一頁並再次切換 | 連結旁可見清除提示；pagehide 清除來源頁資料，新語言頁為該路徑的空白初始值；返回或再次切換都不會復活舊輸入/結果。沒有資料被放入 URL、history state 或儲存。 |
| B09 | FR-04 | 在 native date 與明確文字模式間切換，嘗試一個無效 fallback 字串 | 有效 ISO 值原樣保留；無效字串時禁止切回 date 並明示原因，不清空、不補零、不猜測日期。 |
| B10 | FR-02/04 | 全程鍵盤操作星期 checkbox 和表單 | Tab/Shift+Tab 順序合理；星期名稱可讀；每個 checkbox 可操作；焦點雙層可見，錯誤與欄位關聯。 |
| B11 | FR-03/08 | 用繁中 IME 組合書名，再完成輸入 | 組合中舊結果立即消失；未完成組字時不閃現格式錯誤；compositionend 後保留使用者字串，不錯誤 trim 或改寫。 |
| B12 | FR-11 | 以受控 writeText success/reject stub 驗證成功與拒絕流程；可用時再執行原生 Clipboard API | 必驗：只在點擊後呼叫、fulfilled 才顯示成功、rejected 時選取報告並提示手動複製且不顯示成功、程式絕不讀 clipboard。原生 Clipboard API 證據若現有工具無法提供，可單獨標 NOT_RUN 並說明原因。 |
| B13 | FR-11 | 點擊成功計畫的下載並驗證建立的 Blob/report bytes；可用時檢查瀏覽器實際下載檔案 | 必驗：下載只對成功 plan 可用，檔名為 glossquote-reading-plan.txt，Blob 內容 UTF-8、無 BOM/尾端 LF 且與唯讀報告相同。若現有工具無法取得原生下載檔案 bytes，僅原生檔案檢查可標 NOT_RUN，Blob/按鈕流程仍須通過。 |
| B14 | FR-08/11 | 同一結果第一次複製pending時再點一次；接著修改並重算、啟動新請求B，再讓舊請求A resolve/reject/finally；另測pagehide | 同一結果pending只呼叫一次writeText。編輯/清除/離頁會遞增token並重設當前busy，重算後可啟動B。舊A的三元token不符即完全no-op，不能解除B busy或更動任何UI；只有當前三元token相符的finally能解除當前busy。瀏覽器已開始的舊寫入無法撤回，此測試不宣稱取消原生副作用。 |
| B15 | FR-09 | 必驗：在可控測試環境呼叫 pagehide handler，再呼叫 pageshow handler 並令 persisted=true；可用時另由瀏覽器返回實際 BFCache 頁 | 必驗事件邏輯：pagehide 清空表單/記憶體、使 callback token 失效；pageshow.persisted 再重置為空白初始狀態。實際 BFCache 子項只有在能證明瀏覽器確實恢復 persisted page 時才算實測；無法取得該證據時單獨標 NOT_RUN，不可把合成事件稱為真 BFCache。 |
| B16 | FR-10/FR-12 | 在繁中及英文預覽頁檢查 title、description、H1、至少三個 FAQ、首頁與語言連結 | 每頁內容使用自身語言並符合上文；preview 是 noindex,nofollow，沒有 production canonical/hreflang/sitemap 宣稱。 |
| B17 | FR-04 | 從原生日期控制切到文字模式並手動輸入閏日與格式錯誤日期 | 2024-02-29 可正確接受；2024-2-29 被拒絕且原文保留；無本機日期格式或時區漂移。 |
| B18 | FR-08/可及性 | 單靠鍵盤完成輸入、產生、選取唯讀報告、清除確認與取消 | 不依賴 pointer、hover 或顏色；所有錯誤可定位、對話框關閉還原焦點。 |
| B19 | FR-08/可及性 | 必要子測試：responsive emulation 設為 320 CSS px；另可選擇測 200% 瀏覽器縮放 | 必要 320 px 子測試：內容單欄重排，沒有整頁水平捲動；主要動作、錯誤、報告與清除均可到達；文字不截斷。200% 縮放結果另記；未測可 NOT_RUN，不阻斷 M1。 |
| B20 | FR-08/環境 | 在手機打開日期選擇器與虛擬鍵盤，滾動表單 | 聚焦控制與主要按鈕不被固定元素或安全區遮住；頁面可以垂直捲動。 |
| B21 | FR-05/環境 | 在低階裝置或 CPU 降速環境算 366 日最長區間 | 可讀日不超過 366；不凍結，產生與繪製不超過 500 ms；超過即記失敗並修正，不將估計當實測。 |
| B22 | FR-09/FR-10 | 使用 DevTools 網路與儲存檢查後重新載入 | 沒有第三方請求、遙測、Cookie、本機/工作階段/IndexedDB 資料；重新載入後沒有書名或計畫。 |
| B23 | FR-11 | invalid 與 infeasible 各自嘗試尋找複製、下載操作 | 兩種狀態都沒有可用 copy/download，也沒有舊 report 可選。 |
| B24 | FR-03/FR-04 | 對日期與數字欄輸入空白、非 ASCII 數字、符號與不可行日期 | 錯誤訊息精確說明欄位及修正方式，原始值仍可編輯，不偷偷轉換，也不洩漏到 URL/console。 |
| B25 | FR-11 | 以可控 URL/timer harness 驗證生命週期；可用時另觀察原生下載 | 必驗：URL 不在 anchor.click 的同步呼叫堆疊立即撤銷，設定 1–30 秒 fallback cleanup timer，pagehide 即時撤銷尚存 URL。若現有工具無法提供原生下載事件證據，原生子項可標 NOT_RUN；不能略過 URL/timer 邏輯驗證。 |

## M1 命令與判定

在最後一輪程式變更穩定後，M1 功能對話對最終版本各執行一次：

    node --version
    npm test
    npm run check
    npm run build

M1 必要 browser subset：在一個記錄版本的桌面 Chromium 實際操作 B01–B10、B12–B18、B23–B25，以及 B19 的 320 CSS px 子測試。B12 的 success/reject UI 與 fallback、B13 的按鈕/Blob 報告契約、B15 的 pagehide/pageshow handler 邏輯、B25 的 URL/timer 邏輯必驗；若現有工具無法提供原生剪貼簿證據、瀏覽器下載檔案 bytes 或真 BFCache 恢復證據，分別將這些原生子項標 NOT_RUN 並說明原因，不能把 stub/synthetic 事件寫成原生實測。B11 只有在環境提供繁中 IME 時必跑；沒有時記 NOT_RUN 與原因。B19 的 200% 縮放、B20 真機、B21 低階/降速環境、B22 完整 Network/Storage DevTools 檢查可以 NOT_RUN，不能將它們當成 M1 無條件 FAIL。不得把桌面 emulation 當真機、靜態檢查當完整 DevTools 實測，或把本文件預期說成已通過。各項逐一標 PASS、FAIL、NOT_RUN，附版本/裝置與可重現證據。

Node 主版本小於 24 時記錄環境限制，不安裝全域套件或改持久 PATH。上述命令只驗證本機程式；瀏覽器 API、排版、鍵盤、剪貼簿與 bfcache 的必要案例仍須實際人工操作。只有指定的外部環境案例可按上段記錄 NOT_RUN。

M2 需主代理驗收並放行後，原功能對話才建立 production 工具鏈、發布公開來源並產生固定來源 ZIP；M2 不部署。M3 由主代理獨立驗收 M2 證據後部署工具及雙語首頁並正式驗證。SPEC_ONLY 規格作者不執行任何產品命令或發布/部署操作。
