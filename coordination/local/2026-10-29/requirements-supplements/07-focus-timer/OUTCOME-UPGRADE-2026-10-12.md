# U07 — 專注時不用一直盯著倒數

主代理需求候選，2026-10-12；須收到主代理U07開工訊息後才實作。現版只改畫面/頁籤標題且明說無声音。使用者閱讀或做事時需要能察覺到期；新增可選本機提示音，保留無聲預設及原計時核心。

2026-10-13 已收到 `U07-OPT-IN-CHIME-20261013` 明確開工授權；專用證據路徑為 `.runs/focus-outcome-2026-10-13/**`。同 milestone 的主代理規格校正：舊版本未輸出 x-default，後文「保留原共享 x-default」不是既有實作事實；本次按現行共通要求新增正式兩語唯一 x-default 指向繁中根頁，preview 保持 noindex、無正式 origin。這是 SEO 一致化，不是宣稱修正重大收錄故障。

## 單一里程碑

- 新增未勾選的「到期播放提示音 / Play a sound when time is up」，旁邊明確「試聽 / Test sound」。首次由使用者明確手勢啟用/試聽/開始建立或resume Web Audio，不繞過瀏覽器播放限制、不要求通知權限、不自行提高裝置音量。
- 只產生本機短提示聲，總長最多1.5秒、溫和固定音量、無外部音訊檔或網路；非loop，不播放語音。試聽可重試但每次互斥/釋放，不能疊加大量oscillator。
- 真正從running進入completed只提醒一次；重複tick、visibilitychange、pageshow不重播。暫停/取消/錯誤/clock backward不得播放；新的一次開始才重置當次提醒旗標。
- 取消／pagehide停止本次聲音并釋放資源；關閉選項立即停止在播聲音。選項只本頁記憶體，不保存。原1–180整數、deadline校正、BFCache失效、pause/resume/清除及語言切換均保留。
- 不支援或resume失敗時顯示可讀狀態，視覺計時仍正常。不要把AudioContext running當「使用者確實聽見」。操作系統靜音/睡眠/背景節流仍可能延遲或無聲，近選項及FAQ清楚說明；不宣稱關頁提醒、可靠鬧鐘或保證準時。
- 兩語介面、錯誤、FAQ與所有SEO（含原「沒有聲音」文案）一致，無通知/帳號/紀錄/番茄連續循環等額外功能。

## 驗收

- 預設無音訊初始化/播放；手勢試聽一次，勾選後到期一次；取消、暫停、錯誤不響。取消後新run有獨立提醒。
- 使用可控制時計的scheduler/controller與音訊adapter測試重複完成、背景恢復、頁面釋放、unsupported/rejected resume；不得改原計時演算法只讓測試通過。
- 真Chrome至少1分鐘完整倒數与pause/resume/cancel流程，兩語選項和鍵盤/錯誤狀態；實際可聽性無法在工具觀察時保留人工NOT_RUN，不用mock當聽測。
- 所有專案必要tests/check/build/release與安全標頭gate照package實際命令執行；原共享x-default/正式origin/預覽noindex保留。

## 擁有者與邊界

原「專注計時」對話01a12399-099d-7790-b936-99ddf0a807ac，Sol/max；不再委派。允許07本工具public/**、test/**、必要scripts及相關spec/docs/HANDOFF與既有本工具發布副本；專用證據.runs/focus-outcome-2026-10-12/。遵守根/工具AGENTS與Windows保護，無新依賴、持久設定或憑證讀取；不改首頁/別款工具，不部署。確認Web Audio必要官方API/現有瀏覽器能力，保持有界一次視覺檢視與批次修正。

通過後PUBLIC來源commit與visibility、fixed ZIP/manifest、命令/exit/NOT_RUN與owner釋放交接主代理。新版本須主驗/正式發布/外部覆核，不繼承舊外部通過。新權限/成本/廣泛相容性阻塞或兩輪無進展時停止具體回報，不偷偷改成通知API或放寬門檻。
