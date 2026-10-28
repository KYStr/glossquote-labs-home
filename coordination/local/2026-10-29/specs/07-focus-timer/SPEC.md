# 專注計時 — 既有規格保存

Task ID: `labs-07-focus-timer` · Spec ID: `spec-07-focus-timer`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：專注計時

這是規格，尚未實作。

## 主要工作

使用者想投入一段時間，並隨時知道剩餘多久。只做一段計時，不把番茄鐘次數、休息輪替與任務清單塞入 MVP。

| ID | 行為、界限與預設 |
|---|---|
| FR-01 | 初始 25 分鐘、ready 狀態，顯示 `25:00`；分鐘輸入只接受1–180的ASCII整數，原長度最多8字元，trim首尾ASCII空白。允許前導0，不接受正負號、小數、科學記號或文字。數值欄位只有ready/completed可編輯；合法修改回ready，不自動啟動。 |
| FR-02 | 點「開始計時」才啟動，保存 `deadline=now+durationMs`。剩餘時間由deadline與當前timestamp相減，不每秒減1。使用setTimeout僅安排畫面更新；不能當計時真實來源。重複點開始不得產生第二個timer。 |
| FR-03 | running按「暫停」時先計算此刻剩餘毫秒；仍大於0則paused並停止排程。paused按「繼續計時」用當前now+保留剩餘重新設deadline；暫停期間不計入。到期同時按暫停，結果為completed，不能把0毫秒暫停後續跑。 |
| FR-04 | running或paused按「取消計時」立即回ready，保留所選分鐘並顯示完整時長，撤銷排程與舊回呼。取消事件優先，不先產生「完成」提示；不記錄已完成或已取消次數。沒有確認彈窗或撤銷，因沒有檔案或歷史資料被刪除。 |
| FR-05 | 到期顯示 `00:00`、completed與「這段計時已結束」。每段只完成一次，不自動開始休息或下一段。提供「再次開始」和可修改分鐘；再次開始是新的runId、完整設定時長。 |
| FR-06 | 隱藏分頁時可停止畫面排程，到期時間不變。visibilitychange回可見、pageshow（含BFCache恢復）時立即校正；若已超過deadline直接completed，不补播每一秒。裝置睡眠後也如此。頁面被重新載入或丟棄後回初始25分鐘，不恢復。 |
| FR-07 | 以Date.now裝置時鐘為基準。若本次now比前一次取樣小，保守暫停，保留上一次已知剩餘時間，顯示時鐘倒退提示，由人點繼續。若時間往前跳則視為經過時間，可能直接完成；不能可靠區分睡眠與手動調快時鐘。介面提前說明限制。 |
| FR-08 | 剩餘顯示秒數為ceil(remainingMs/1000)，分數可超過59（180分鐘顯示180:00）；永不顯示負數。分頁標題可顯示剩餘時間與工具名，但不包含任務內容，沒有任務文字欄位。讀屏不逐秒朗讀，只讀開始、暫停、恢復、完成、取消與時鐘異常。 |
| FR-09 | 2026-10-13 使用者授權可選本機 Web Audio 短提示音：預設關閉；明確手勢開啟或試聽，開啟時由開始／繼續手勢準備音訊；到期只嘗試一次。固定 0.6 秒、660 Hz sine、gain 上限 0.04，不調整裝置音量、不載入音訊檔。不呼叫 Notification、震動、Wake Lock、Service Worker，不要求新權限。取消、暫停、錯誤、關閉選項或 pagehide 停止並清理音訊；關頁／背景／睡眠／靜音不保證提示。兩個分頁獨立。 |
| FR-10 | 工作狀態僅記憶體；不寫storage、URL、cookie、日誌、分析或網路。載入同源資產後操作零請求；取消和離開釋放timeout及事件訂閱，不聲稱抹除OS記憶體。 |
| FR-11 | 鍵盤完成全部流程，320px和200% 頁面縮放完整，減少動態偏好有效。啟動失敗或缺少必要API時顯示不可啟動，不悄悄使用雲端計時。 |

## 錯誤與不納入範圍

分鐘錯誤碼：`DURATION_FORMAT`、`DURATION_RANGE`；非法或非有限now：`CLOCK_INVALID`，停止排程並保留最後可用狀態供取消或重啟；時間倒退：`CLOCK_BACKWARD`，進入paused。任何錯誤都不能顯示原始exception。

不增加帳號、設定頁、多種音效或音量設定、通知、日曆、統計或檔案匯入匯出。本次只增加本頁的提示音選項與試聽；設定不保存。原始碼發布沿用既有授權，正式部署與外部覆核由主代理整合。


---

## 原文件 TECHNICAL.md

# 技術規格：專注計時

這是規格，尚未實作。依 [工程](docs/ENGINEERING.md)、[安全](docs/PRIVACY-SECURITY.md) 執行；原生HTML/CSS/瀏覽器ESM、Node.js24+測試、無runtime套件。

## 檔案與命令

```text
package.json
scripts/{serve,check,build}.mjs
public/index.html
public/styles/{tokens,app}.css
public/js/app.mjs
public/js/core/timer.mjs
public/js/core/format.mjs
public/js/scheduler.mjs
test/{scaffold,timer,format,scheduler,boundaries}.test.mjs
docs/RESEARCH.md
docs/VERIFICATION.md
dist/
```

大括號是檔案列舉縮寫。T00建立dev=`node scripts/serve.mjs`、test=`node --test`、check=`node scripts/check.mjs`、build=`node scripts/build.mjs`。serve只在127.0.0.1:4173供public白名單資產，拒絕穿越／未知路徑；check檢查ESM語法、必要檔案、外部資源／危險DOM／禁止API；build只複製public至本專案dist，操作前驗證目標範圍。不下載或安裝套件。

## 純狀態機

`createTimer(minutes)` 回初始state；`parseDuration(raw)` 回 `{ok:true,value:minutes}` 或 `{ok:false,code}`；`transition(state,event,now)` 回 `{state,completedNow:boolean}`，不操作DOM或timer。now由adapter注入，測試不得真等待幾分鐘。

state固定欄位：`phase:ready|running|paused|completed|error`、`minutes`、`durationMs`、`remainingMs`、`deadline:number|null`、`lastNow:number|null`、`runId:非負安全整數`、`reason:null|CLOCK_BACKWARD|CLOCK_INVALID`。它是內部狀態，沒有儲存／匯入API。未知event忽略，任何不相容phase事件無副作用。

`minutes`1..180整數，`durationMs=minutes*60000`。parse先string/長度≤8→ASCII trim→`^\d+$`→安全整數及範圍；格式問題DURATION_FORMAT，長度／0／181以上DURATION_RANGE。空字串不是0。

now是0..`Number.MAX_SAFE_INTEGER-10800000`的安全整數；否則CLOCK_INVALID，phase=error、deadline=null、remaining保留，runId遞增使舊排程失效。error只能取消回ready；不可按繼續。

| event | 前置與動作 |
|---|---|
| SET_DURATION，帶minutes | 僅ready/completed，驗證minutes；設定完整duration/remaining、ready，runId+1，deadline/lastNow/reason=null。 |
| START | 僅ready/completed且合法now；runId+1、running、remaining=duration、deadline=now+duration、lastNow=now、reason=null。 |
| TICK，帶runId | 非running或event.runId與state.runId不同直接忽略；其他情況依下方reconcile。 |
| PAUSE | 僅running；先reconcile；若仍running，paused、deadline=null，remaining保留、runId+1；若已completed/error/clock-backward則保持該結果。 |
| RESUME | 僅paused且合法now；running，deadline=now+remaining、lastNow=now、runId+1、reason=null。 |
| CANCEL | 所有phase都可；不reconcile也不查now，ready、remaining=duration、runId+1，deadline/lastNow/reason=null，completedNow=false。 |

reconcile先檢查now有效；如果now<lastNow，paused、reason=CLOCK_BACKWARD、deadline=null、runId+1、剩餘值保持上一個樣本、completedNow=false。其餘算 `remaining=max(0,deadline-now)` 並更新lastNow。remaining=0時completed、deadline=null、runId+1、completedNow=true；後續TICK因phase或runId不符忽略。相同timestamp不是倒退；倒退1毫秒就觸發保守暫停。不加入任意容差掩蓋時鐘變動。

前進跳時按deadline算；產品只承諾恢復執行後校正，不能保證背景按時執行。不要改用單純performance.now來掩蓋睡眠差異；此MVP明確採wall-clock deadline並揭露限制。

`formatRemaining(ms)` 要求0..10800000有限整數，seconds=ceil(ms/1000)，minutes=floor(seconds/60)，secondsPart=seconds%60；分鐘最少兩位、秒固定兩位；0→00:00，1→00:01，60001→01:01，10800000→180:00。

## 排程器與競態

`createScheduler({getState,dispatch,now,setTimeoutFn,clearTimeoutFn,isVisible})` 允許測試注入假時鐘／假timer。正式now讀Date.now。任何時刻最多一個timeout，250ms僅為重新取樣頻率；每次回呼捕捉當時runId，檢查仍running、runId相符、document可見才派TICK與再排下一次。禁止字串版setTimeout。

每次取消／暫停／完成／error先清既有timeout，再按最新phase決定是否排程；新runId令已進任務佇列的舊回呼無效。scheduler另有`epoch`，每次停止或重新同步排程時遞增，每個callback同時捕捉epoch；不相符立即返回、不派事件、不再排程。這補足pagehide／hidden只停畫面而runId未改時的舊回呼競態。click handler同步套狀態和disabled，防雙擊。hidden時先用now校正一次再停止排程；visible/pageshow先reconcile一次再啟動唯一timer。pagehide清排程並使epoch失效；BFCache仍可保留state，pageshow從deadline重算；真正reload從createTimer(25)開始。事件監聽器用同一AbortController統一清理，BFCache pagehide只清timer，不永遠abort恢復仍需使用的listeners。

純函式不應匯入scheduler；test用假排程器驗證取消後舊callback、隱藏恢复、重複點擊，不使用await真實長睡眠。DOM用textContent；不接受自由輸入任務名稱；表單不發送資料。

## 官方來源與研究閘門

### U07 本機提示音（2026-10-13 核定）

`public/js/chime.mjs` 以注入的 context factory／timeouts／狀態 callback 提供手勢方法與 session 完成閘門，核心 timer／format／scheduler 不變。預設 false，沒有初始化或音訊播放；只有 checkbox／試聽／開啟選項後的開始或繼續 handler 同步建立／resume context，不在到期時新建或繞過播放政策。

0.6 秒單一 660 Hz sine，gain 從 0 到固定 0.04 再回 0；原生 stop 使用 audio clock 排程，650 ms watchdog 清理節點，不因背景 timeout 延遲延長 oscillator 的排定時長。resume 最多等 2000 ms，過期／取消 operation 不可晚到播放；不使用裝置時鐘作音訊時長來源。

最多一個 owned context、一個 oscillator、一個 gain、一個 pending resume 或 cleanup timeout。重複試聽替換舊節點與回呼。未計時的啟用探測／試聽完成即 close context；已啟用且 running 時只保留該 session 的一個 context，試聽節點仍清理。完成一次後 close；取消、暫停、錯誤、關閉選項與 pagehide 全部停止、disconnect、close。close 未完成或失敗時不配置第二個 context，顯示可讀提示，視覺計時不受影響。BFCache pagehide 一律釋放音訊；pageshow 只校正原計時，不自動初始化或重播。

`completedNow` 唯一驅动音訊 complete 閘門；新 START 才重置提醒旗標。只提供「已嘗試播放」文案，context running／onended 不證明耳朵聽見。unsupported／resume rejection／timeout 或音訊 clock／node factory failure 回傳有界狀態碼，不暴露原 exception。

P2 pagehide 返工：音訊停止的 running 與計時 core running 是不同狀態。checkbox 明確啟用 handler 先 scheduler.reconcile，再把 `state.phase === "running"` 傳給 `setEnabledFromGesture`；關閉先停聲音再 reconcile，避免到期瞬間的關閉補播。只有手勢 re-arm，pageshow 不配置音訊；不重置 reminded。每次真正 completedNow 即消耗一次完成訊號，無可用音訊時回 unready／off；已到期的重新開啟只探測下一段設定，不補播。

已核對 [Chrome autoplay](https://developer.chrome.com/blog/autoplay/#web_audio)、[AudioContext.close](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/close)、[AudioScheduledSourceNode.stop](https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/stop) 官方文件（2026-10-13）；採明確手勢及原生 stop／close，未改 Chrome 政策或裝置設定。

2026-09-23查閱：[WHATWG Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers) 指出排程不保證準時；[W3C High Resolution Time](https://www.w3.org/TR/hr-time-3/) 區分wall與monotonic clock；[ECMAScript Date.now](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date.now)。它們支持限制說明，不證明本工具已在背景或睡眠情境通過測試。

T01以實際目標瀏覽器驗證visibilitychange/pageshow和BFCache；docs/RESEARCH.md記錄平台／版本／日期。必要API不可用時保留靜態說明、禁用開始，不安裝替代背景服務或申請權限。


---

## 原文件 UX-SEO.md

# 介面與 SEO：專注計時

這是規格，尚未實作。Product App 模式，依 [設計系統](docs/DESIGN-SYSTEM.md)。唯一視覺重點是剩餘時間，不使用無限旋轉、裝飾進度環、儀表板或假生產力指標。

桌面：

```text
GlossQuote-Labs / 專注計時
專注計時
專注分鐘 [25]  （1–180）
              25:00
              尚未開始
            [開始計時]
背景／睡眠限制與資料說明
使用方式／FAQ
```

手機：

```text
專注計時
分鐘 [25]
      25:00
      進行中
[暫停] [取消計時]
回到頁面時會更新剩餘時間
```

時間可用數字等寬字型，其他標籤使用系統UI字型。running的主要按鈕是暫停、paused是繼續、completed是再次開始；取消在旁使用次要樣式。分鐘欄位running/paused禁用並保留可見值，不隱藏；不要給快捷鍵攔截一般打字。

## 完整狀態文案

| 狀態 | 文案／操作 |
|---|---|
| ready | 「尚未開始」；主按鈕「開始計時」。 |
| 無效／空分鐘 | 「請輸入 1 至 180 的整數分鐘。」；开始不可用，保留輸入供修正。 |
| running | 「進行中」；「暫停」「取消計時」；首次點擊同步變更按鈕狀態。 |
| paused | 「已暫停」；「繼續計時」「取消計時」。 |
| clock backward | 「裝置時間往回調整，計時已暫停。確認後可繼續剩餘時間。」 |
| completed | 「這段計時已結束」；00:00與「再次開始」，不自動啟動。 |
| error | 「無法取得有效裝置時間。請取消計時後重試。」；僅取消可用。 |
| cancelled | 回ready，polite提示「已取消計時」。不當成完成。 |
| unsupported | 「此瀏覽器無法啟動計時。你仍可閱讀使用方式。」；禁用開始。 |

常駐小字保留裝置時鐘與背景／睡眠限制；聲音為預設關閉的本機短提示音，需明確開啟，無系統通知。計時控制旁有「到期播放提示音／Play a sound when time is up」及「試聽／Test sound」，獨立 polite 狀態顯示嘗試結果；靜音、瀏覽器政策、背景或睡眠可能延遲／無聲。重新整理／語言切換清空計時與選項，不聲稱關閉瀏覽器也能提醒。

倒數視覺輸出不可設aria-live逐秒讀取；獨立polite狀態只在狀態轉換時公告一次。數值輸出有「剩餘時間」文字標籤；開始、暫停、取消可鍵盤操作，焦點留在對應操作位置，切換按鈕不要丟失焦點。觸控按鈕至少44px、可見雙層focus、合規對比，320px單欄、200% 頁面縮放與40%長標籤不重疊。reduced-motion仍正常倒數，但無數字翻轉動畫。

## SEO 草案

- slug：`/tools/focus-timer/`。
- title：`專注計時器｜設定分鐘、暫停與繼續 — GlossQuote-Labs`
- description：`設定 1 至 180 分鐘，暫停、繼續或取消專注計時。預設無聲，可自行開啟本機短提示音；無需帳號或通知權限。`
- H1：`專注計時`
- 首段：`選好這次想投入的分鐘數，再開始計時。需要暫停時保留剩餘時間，準備好後接著進行。`
- FAQ「關閉頁面後會提醒我嗎？」答「不會。本工具不發送通知；重新整理或頁面被重新載入也會清空計時。」
- FAQ「切到其他分頁會停止嗎？」答「到期時間會保留，背景畫面可能停止更新；回到頁面時依裝置時間重新計算剩餘時間。」
- FAQ「時間到了會自動開始休息嗎？」答「不會。每次只計一段時間，下一段需要你自己開始。」
- FAQ「更改電腦時間會怎樣？」答「往回調整被偵測到時會暫停；往前調整可能讓計時提前結束。」
- FAQ「會記錄我的專注時數嗎？」答「不會。沒有歷史紀錄或上傳，工作狀態只留在這個頁面的記憶體。」
- U07 新增第六項 FAQ「如何開啟到期提示音？」：明確開啟／試聽不自動勾選、到期一次、裝置及瀏覽器限制。兩語 meta／OpenGraph／可見說明移除舊「完全沒有聲音」承諾，仍無系統通知。

說明、FAQ、metadata直接在靜態HTML。本地預覽保留robots=noindex,nofollow；未確定網域與批准發布前不產canonical/sitemap。分頁倒數標題是運行狀態，初始靜態SEO title必須完整；取消回初始title，完成顯示「計時已結束｜專注計時」。

U07 2026-10-13 核定更新：正式兩語各自 canonical，互返 zh-Hant／en，以及每頁唯一 x-default → `https://focus.glossquote.com/index.html`；preview 兩語維持 noindex／nofollow、相對 alternate，不含正式 origin 或 x-default。這是本批共通 SEO 規格一致化，不代表缺項曾導致 Google 無法索引。


---

## 原文件 ACCEPTANCE.md

# 驗收：專注計時

這是規格，尚未實作。以下為預期，不代表已測試。

自動案例注入整數毫秒now與假排程器，不sleep一分鐘等待結果；計算全部精確。手動案例另行驗證瀏覽器事件與畫面，記錄平台版本和睡眠／背景條件；無法驗證的平台標未測。

每個自動案例獨立建立 state，不共用前一列的狀態；除明確另寫者，統一從 `createTimer(1)` 開始。F01 特別測 25 分鐘。F05 在自己的測試中重做 F04 的 START at1000 前置，不依賴 F04 已執行。

| ID／FR | 種類 | 操作／輸入 | 精確預期 |
|---|---|---|---|
| F01／01 | 自動 | createTimer(25) | ready,duration=remaining=1500000,deadline=null,runId=0；格式25:00 |
| F02／01 | 自動 | 分鐘 `1`、`180`、`025`、`0`、`181`、空白、`1.5`、`1e2`、`-1` | 前三1/180/25；0/181範圍錯誤；其餘格式錯誤 |
| F03／01 | 自動 | 9個字元；null、Infinity、NaN | DURATION_RANGE；後三DURATION_FORMAT |
| F04／02 | 自動 | 1分鐘 START at1000，TICK at1250 | deadline61000,remaining59750，顯示01:00 |
| F05／02,08 | 自動 | 同一段TICK at2250 | remaining58750，顯示00:59，不是因兩次tick只減2秒 |
| F06／03 | 自動 | START at1000；PAUSE at11000；RESUME at51000 | paused remaining50000；恢復deadline101000，01分鐘設定不變 |
| F07／03,05 | 自動 | 1分鐘START at1000；PAUSE at61000 | completed,remaining0,completedNow=true，不是paused |
| F08／04 | 自動 | START；CANCEL；手動送出舊runId的TICK | ready與完整remaining不變；沒有completion |
| F09／02,05 | 自動 | running再次START；completed再次START | running重複忽略、runId不變；completed重新開始完整時長且runId遞增 |
| F10／05 | 自動 | 獨立createTimer(1)；START at1000；保存本段runId，依序送該runId的TICK at61000、61001、99999 | at61000首次轉completed且completedNow=true；後兩次忽略、completedNow=false；始終00:00，不再產生完成效果 |
| F11／06 | 自動 | 1分鐘START at1000；沒有中間tick，恢復at181000 | 直接completed；只完成一次、不建休息段 |
| F12／07 | 自動 | START at10000；TICK at20000；TICK at19999 | paused,CLOCK_BACKWARD,remaining50000,deadline=null；繼續at30000後deadline80000 |
| F13／07 | 自動 | START at1000；TICK now=NaN | error,CLOCK_INVALID,remaining60000；取消回ready |
| F14／08 | 自動 | formatRemaining(0/1/999/1000/60001/10800000) | 00:00/00:01/00:01/00:01/01:01/180:00 |
| F15／02,04,06 | 自動 | 假scheduler連續同步兩次、取消後觸發已捕捉callback、hidden→visible | 任何時間最多一個timeout；舊callback不改state；visible校正一次後最多一個timeout |
| F16／04 | 自動 | START後deadline已過但未tick，先處理CANCEL | ready，completedNow=false，不補完成提示 |
| F17／06 | 手動 | 1分鐘開始，切背景超過1分鐘再回來 | 首次可見更新時00:00與完成；無通知／補播／自動新段 |
| F18／06 | 手動 | 1分鐘開始，装置睡眠超過1分鐘再恢復 | 頁面若仍存在則校正完成；若被丟棄重載則初始25:00，明確記錄哪種情況 |
| F19／06 | 手動 | 返回前頁再向前（實際確認BFCache命中）；另作reload | BFCache保留state並校正；reload初始25:00；無重複listener或timer |
| F20／09,10 | 手動 | Network清空後全部控制；檢查permission、storage | 操作0請求、0權限提示、無工作資料持久化；預設無聲，明確選擇才可本機短提示音；仍无震動 |
| F21／01,11 | 手動 | 分鐘貼入 `<img src=x onerror=alert(1)>` | 格式／長度錯誤，沒有DOM注入或網路請求；可清除修改 |
| F22／08,11 | 手動 | 鍵盤開始、暫停、繼續、取消；讀屏 | 每個操作可達、focus不遺失；只朗讀狀態轉换、不逐秒打斷 |
| F23／11 | 手動 | 320px、200% 頁面縮放、reduced-motion | 按鈕與180:00不裁切、不整頁水平捲動、功能一致 |
| F24／11 | 手動 | 禁用JS／載入失敗 | 靜態說明可讀、開始不可假啟動；沒有無限spinner |

不要求為測試修改Windows系統時間；F12/F13以注入時鐘覆蓋。若需瀏覽器人工模擬時間只用測試adapter，不改持久系統設定。對取消及完成至少做20次假事件順序組合，確認runId拒絕過期事件。

`npm test`與`npm run check`不能取代F17–F24；完成後記入docs/VERIFICATION.md。無檔案匯入、登入與通知，因此其權限恢復流程不適用；不得為通過測試自行加功能。

## U07-OPT-IN-CHIME-20261013

| ID | 驗收類型 | 預期 |
|---|---|---|
| C01 | Audio adapter／controlled clock | 預設／無聲 session 0 context；試聽明確手勢、不自動勾選；0.6 秒、gain ≤0.04、互斥 oscillator，onended／watchdog 清理。 |
| C02 | Controller＋真正 core／scheduler 的假事件 | 到期一次、重複 tick／背景恢復／舊 callback 不重播；取消／pause／clock error 不響，新 START 可独立提醒。 |
| C03 | 可控 promise／factory | unsupported、resume throw／reject／timeout 不播放、有可讀狀態；取消／pagehide／關閉後 late resume 無效，沒有多 context 配置。 |
| C04 | Lifecycle／resource counter | 預覽節點、暫停／取消／關閉／pagehide 立即停止／disconnect／close，清除 timeout；close failure 鎖住新配置、視覺不阻塞。 |
| C05 | 真 Chrome | 一分鐘到期、pause／resume／cancel；兩語明確選項／試聽、鍵盤、1–180／無效輸入與語言重設。只證明操作與 attempted-playback 狀態，聽感無法觀察為 NOT_RUN。 |
| C06 | source／build／release | 必要 Node 24 tests／check／preview build／production build＋check，metadata／CSP／MIME／路徑 gate 保留，新本機 module 可提供；不加外部音檔或依賴。 |

OS 靜音／實際聽感與音量、背景節流／裝置睡眠／BFCache 真命中／讀屏等未實測仍 NOT_RUN。公開來源與 fixed ZIP 完成後仍須主驗、正式發布及新版外部覆核，不能沿用舊版外驗通過。


---

## 原文件 TASKS.md

# 實作任務：專注計時

流程以 AGENTS.md 的「閱讀與執行」「交付與收斂」為準：沿用本 session 已讀文件，只補讀變動／相關段落；同一授權工作依序推進，不因任務切換重問。各任務 allowed paths、前置條件與必要驗收保持有效，缺陷回到其擁有任務修正；來源發布依適用的既有明確授權，不包含網站部署。

本文件定義任務；實際進度以 HANDOFF.md 與最新驗收紀錄為準。依 AGENTS.md 的 session 閱讀規則讀取所需內容，按順序一次一項。所有路徑相對本專案，未列檔案不得改。

## T00 建立可執行底座

- 前置：依 AGENTS.md 完成本任務所需文件閱讀。
- allowed paths：`package.json`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`public/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`public/js/app.mjs`、`test/scaffold.test.mjs`、`HANDOFF.md`。
- 工作：private/type=module/Node>=24與四項npm命令；無dependencies。loopback只提供public、拒穿越；check真查語法和禁止資源／API；build只能操作本專案dist。空HTML含標題/noindex/不可用開始按鈕。
- 驗收：`node --version`；建立腳本後才 `npm test`、`npm run check`；`npm run dev`人工確認合法及非法路徑後停止server。無需npm install。
- 完成：腳本實際可用；HANDOFF記命令結果。

## T01 瀏覽器生命週期研究閘門

- 前置：T00通過。
- allowed paths：`docs/RESEARCH.md`、`HANDOFF.md`。
- 工作：核對官方Timers／clock資料、實測目標瀏覽器visibilitychange/pageshow/BFCache；記錄未測平台與無通知限制，不下載新套件或要求權限。
- 驗收：人工記載平台、版本、日期與恢復行為；`npm run check`。
- 完成：對FR-06/07採本文既定規則，HANDOFF列限制；無法建立安全恢復流程則停在此閘門。

## T02 純計時狀態機

- 前置：T01通過。
- allowed paths：`public/js/core/timer.mjs`、`public/js/core/format.mjs`、`test/timer.test.mjs`、`test/format.test.mjs`、`HANDOFF.md`。
- 工作：注入now、timestamp計算、整數格式、所有phase轉移、runId、clock錯誤；覆蓋F01–F14/F16。
- 驗收：`node --test test/timer.test.mjs test/format.test.mjs`、`npm run check`；所有測試使用假時鐘不真sleep。
- 完成：到期／取消優先順序／clock-backward精確符合規格；HANDOFF列案例。

## T03 排程器與介面

- 前置：T02通過。
- allowed paths：`public/js/scheduler.mjs`、`public/js/app.mjs`、`public/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`test/scheduler.test.mjs`、`docs/VERIFICATION.md`、`HANDOFF.md`。
- 工作：建立可注入假timer的單timeout adapter；用runId隔離回呼；接上控制、visibility/page事件、分頁標題和polite狀態。完成F15/F22/F23。
- 驗收：`npm test`、`npm run check`、`npm run dev`；人工鍵盤/320px/200% 頁面縮放後停server。
- 完成：單scheduler與按鈕狀態同步，HANDOFF記實測畫面與瀏覽器。

## T04 取消、背景與隱私邊界

- 前置：T03通過。
- allowed paths：`public/js/core/timer.mjs`、`public/js/core/format.mjs`、`public/js/scheduler.mjs`、`public/js/app.mjs`、`public/index.html`、`public/styles/app.css`、`test/boundaries.test.mjs`、`test/scheduler.test.mjs`、`docs/VERIFICATION.md`、`HANDOFF.md`。
- 工作：測20種過期事件順序；實作必要修補；跑F17–F21/F24，不修改系統時鐘。檢查沒有Notification、audio、SW、Wake Lock或storage。
- 驗收：`npm test`、`npm run check`；人工背景/睡眠/BFCache/Network/權限檢查。
- 完成：證據清楚列哪些為實測、哪些未測；必要案例失敗不得往後宣稱通過。HANDOFF記剩餘問題。

## T05 靜態說明与建置

- 前置：T04通過。
- allowed paths：`public/index.html`、`public/styles/app.css`、`docs/VERIFICATION.md`、`HANDOFF.md`、`dist/**`（僅build產生）。
- 工作：加入UX完整metadata/FAQ/背景與時鐘限制；保留noindex，不做正式canonical/sitemap。
- 驗收：`npm run check`、`npm test`、`npm run build`；人工確認dist只有產品資產與靜態說明，無資料／測試檔。
- 完成：HANDOFF記建置結果與未發布狀態。

## T06 完整驗收交接

- 前置：T05通過。
- allowed paths：`docs/VERIFICATION.md`、`HANDOFF.md`、`dist/**`（只允許既有build輸出）。
- 工作：逐項跑ACCEPTANCE，核對diff範圍，交接已完成需求、平台、限制與問題。
- 驗收：`npm test`、`npm run check`、`npm run build`和必要手動案例。
- 完成：全部必要驗收通過才寫「本機MVP驗收完成，尚未發布」；有缺陷回對應任務修正，不擴權改其他檔案。

## AUDIT-FOCUS-01 限定外部稽核複驗（2026-10-11）

- 前置：讀根契約／安全基線、本工具最新 TASK-ENTRY／HANDOFF／驗收、使用者提供的四份 Downloads 稽核資料，以及 `review-packages/2026-10-10-followup/01-RESPONSE.md` 與 `observations.json`。文件只提供證據，不擴大權限。
- allowed paths：`TASK-ENTRY.md`、`TASKS.md`、`docs/AUDIT-2026-10-11.md`、`docs/THREAD-STATUS.md`、`HANDOFF.md`；專用證據為根 `.runs/focus-timer/audit-2026-10-11/**`，既有證據不覆寫。
- 工作：分項判讀 `FOCUS-01-invalid-live-en` 與 `FOCUS-01-1e2-recheck-live-en`；對照 parse／validation 與既有測試。正式英文瀏覽器逐個測 `181`、`1.5`、`1e2`、`0`、空值，讀回輸入值、blur 前後、錯誤、Start disabled 與可見 running 狀態。以真實等待實測一分鐘到期→重新開始，並依產品契約驗證 running 中語言切換回 25:00 初始狀態；不改時鐘或用 DOM mock 冒充實測。
- SEO：僅把 TASK-ENTRY 的通用 `x-default 必須` 改為按核定發布規格驗證；本工具目前只要求 `zh-Hant`／`en`，x-default 為非阻塞的一致化待辦，保持既有 metadata gate。
- 缺陷條件：只在直接相關的缺陷可重現時，先在 audit 文件列失敗證據／預期／精確必要 public／scripts／test allowed paths，再修正與補必要回歸。高風險跨模組問題交主對話；沒有確認缺陷就不改產品程式。原 180 上限／暫停的外部局部 PASS 保留其證據種類。
- 驗收：矛盾案例分項有可追溯的 PASS／FAIL／NOT_RUN 與證據種類，SEO 文件矛盾消除，變更只限上述路徑，audit／HANDOFF 可供主對話複核。無產品變更時沿用未變來源結果，不重跑全 build 或來源發布；如產品程式／測試改動，才跑 Node 24 test／check／build 並經審查的獨立副本公開來源，正式部署仍由主對話負責。
- 停止條件：單項同一操作兩次無進展即記 NOT_RUN，缺原生 clipboard／download／Network／Storage 或真裝置能力不阻塞本輪；保留 OS sleep／BFCache／讀屏等人工待驗。持久環境前後完整指紋必須一致，不改持續環境或終止他人進程；不建立子代理、新對話或回傳訊息。
- 狀態：PASS（限定行為／SEO 文件／範圍驗收完成）；雙語 DOM Insights P1 交主對話，完整隱私 gate 仍未結案。最終判定見 `docs/AUDIT-2026-10-11.md` 與 HANDOFF。

## U07-OPT-IN-CHIME-20261013

- 使用者已授權 `OUTCOME-UPGRADE-2026-10-12.md` 的本機短提示音；取代 FR-09 禁 AudioContext 的舊限制，其餘安全與計時契約不變。
- allowed paths：本工具 public/**、test/**、必要 scripts/{check,serve,release}.mjs、相關 PRODUCT／TECHNICAL／ACCEPTANCE／UX-SEO／README／TASK-ENTRY／docs／HANDOFF；既有獨立發布副本，專用證據 `.runs/focus-outcome-2026-10-13/**`（本次新指派取代候選規格的 10-12 路徑）。同 milestone 核定加入正式兩語唯一 x-default，preview 保持 noindex／無正式 origin。不改純 timer／format／scheduler 算法，不改其他工具／首頁／共享狀態，不部署或讀憑證。
- 驗收：預設關閉且不初始化音訊；明確手勢啟用／試聽、到期一次；固定低音量與 ≤1.5 秒、有界互斥／清理；取消、暫停、錯誤、關閉、pagehide、過期 async 不誤播；unsupported／resume rejected 不阻止視覺計時。Node 24 test／check／preview build／production build＋check、真 Chrome 一分鐘與兩語／鍵盤／輸入及 320px 驗收。聽感、睡眠／背景及其餘缺少能力的人工項保持 NOT_RUN。
- 交接：核對範圍、持久環境、PUBLIC 遠端 HEAD、固定 source ZIP／manifest；只交本機與來源候選，由主代理審查後部署、外驗，新版不沿用舊外驗通過。沒有新依賴或權限。
- 狀態：LOCAL_AND_PUBLIC_SOURCE_READY；本機／PUBLIC commit／固定 ZIP 已交接，owner 釋放寫入權；待主代理審查／正式部署與新版外部驗收，不宣稱完整版本完成。詳 `docs/RELEASE-CANDIDATE.md`。

### 同 milestone P2 pagehide 恢復返工

主代理在固定 ed7e378 的 fake adapter＋真正 timer core 重現：pagehide 清掉音訊 running，但未到期 core 仍 running；再 off/on 未同步狀態，context 被關閉，完成漏提醒且仍顯示 enabled。返工暫時重新取得本工具／發布副本寫入權，僅改 chime／app／相關 chime tests 與交接文件。pagehide 保持清理；pageshow 不初始化音訊；重新明確啟用時依 reconcile 後 core phase re-arm；已到期不補播、未重新啟用需誠實 unready，不重複。回歸為 fake audio／clock＋真正 core／scheduler，不假稱原生 BFCache 命中。原候選／失敗／既有測試記錄保留；final 必要 gate 與新 PUBLIC SHA／ZIP／manifest 後再釋放。

結果：P2本機與PUBLIC固定來源交接，`e64205f5407539fc0451c8052017a6a63f7bd635`／31檔ZIP核對PASS；focused23／all82／必要gates全exit0，重新釋放寫入權。主驗／正式部署／外驗仍由主代理接續。

