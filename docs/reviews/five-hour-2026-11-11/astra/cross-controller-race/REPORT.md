# FH-CROSS-CONTROLLER-RACE-01：舊 worker 回覆污染新工作

固定來源：PR283，commit **448bd9fc9865fe65f6014b66f4a2e2d54b76f539**。檢查開始 2026-11-11T06:33:31Z，主要受控執行與環境複核於06:36:24Z完成；在15分鐘界線內。只讀來源並寫本 reviewer 專屬 evidence。

**結論：另十個工具中九個同缺陷已動態重現；workdays 在本次十一路徑下通過。** 不是僅憑相同碼型推測。屬於 controller 的世代隔離缺陷，阻止這九個固定產品候選的對應功能/邊界驗收；不推翻既有算術結果，也不是規格文件八節評分的自動退件。

## 固定檔與結果

下列路徑均是 tools/<slug>/public/js/controller.mjs；每個連結固定同一 commit。完整 blob、SHA-256、bytes 見 source-pins.json / source-verification.json。

| slug | 缺口／防護行 | 八個舊回覆反例 | 三個對照 | 判定 |
|---|---:|---:|---:|---|
| age-calculator | 83 | 8失敗 | 3通過 | 已確認 |
| bill-split-calculator | 78 | 8失敗 | 3通過 | 已確認 |
| clothing-size-converter | 78 | 8失敗 | 3通過 | 已確認 |
| cooking-measurement-converter | 79 | 8失敗 | 3通過 | 已確認 |
| dew-point-calculator | 78 | 8失敗 | 3通過 | 已確認 |
| feels-like-temperature | 78 | 8失敗 | 3通過 | 已確認 |
| period-cycle-calculator | 78 | 8失敗 | 3通過 | 已確認 |
| race-time-predictor | 78 | 8失敗 | 3通過 | 已確認 |
| salary-converter | 78 | 8失敗 | 3通過 | 已確認 |
| workdays-calculator | 89 | 8正確拒絕 | 3通過 | 此共同根因未重現 |

合計110個受控情境：72個確認失敗、8個正確拒絕舊回覆、30個正向／防護對照。**pattern-only：0。十個均已跑。** wallpaper/ping 的 PR325 是主統籌已處理範圍，本次不重跑；未檢查任何尚未公開的作者修正。

## 根因及最短重現

九個 controller 的 onmessage 只檢查：

~~~js
if (data.generation !== postedGeneration || state !== "busy") return;
~~~

postedGeneration 是「該舊 callback 建立時」的常數。舊 worker 的正常回覆本來就會帶相同舊 generation，因此新一輪已 busy 時仍通過；接著 terminateWorker() 讀的是共用新 worker 引用，會終止新工作，再用舊結果或錯誤把 state 改成 success/error。

最短序列：
1. 建立 controller 與受控 createWorker，填合法範例，run A。
2. 保留 A.onmessage；run B。A 已 terminate，B 狀態 busy，generation B != A。
3. 呼叫保留的 A.onmessage，帶 A 實際 posted snapshot 經原純核心產生的正常 payload 和 A generation。
4. 預期：仍 busy、結果/錯誤皆空、B 未 terminate，之後 B 可正常完成。
5. 九個實際：舊 success 或舊 validation error 被採用，B 已 terminate。results.json 保留每案 before、oldPayload、after、兩個 generation 和 currentTerminatedByStale。

四種過渡：直接再 run、cancel→run、edit→run、reset→run；各覆蓋舊成功及舊有效驗證錯誤，共8案／工具。另每工具三對照：正常 current reply、錯誤 message generation 被拒絕、舊 onerror 被拒絕且新工作正常完成。

workdays 的 settle 同時驗 myGeneration !== generation、status !== busy、worker !== current，因此拒絕八種舊回覆，仍能處理真正的目前回覆。九個受影響 controller 的 onerror 已有 current-generation check，這次舊 onerror 對照也通過；缺口限定 message 路徑。

## 命令與證據

執行：
~~~
node probe.mjs
~~~
Node v24.14.0，**exit 1 是預期 DEFECTS_CONFIRMED**，不是成功驗收。完整輸出在 results.json。probe 先逐檔重新驗固定 Git blob，再 import 未修改 controller/純 core。31個本機 snapshot檔已與 GitHub固定未截斷tree的sha/size相符；不是只相信本機 work 路徑。受控worker沒有建立真實Worker、browser或DOM。

可另在新 evidence副本執行 fetch-fixed.mjs 取得31個固定公共來源，再執行probe。HTTP下載只讀；probe本身完全離線。輸入來源固定，未改產品檔、未手改generation或controller實作。原核心 run 只用來產生與實際worker協定一致的 payload，不算獨立數值oracle驗收。

最後一次執行前僅把 reviewer結果欄拆成 currentTerminatedByStale 與 currentTerminatedAfterFinalControl，避免將workdays正常最終結束誤讀成舊回覆終止；因此重跑受影響證據一次，產品來源未改。

## 修正界線與限制

最窄修正需要在任何舊 callback 修改共用 state/worker 前拒絕「目前 generation 已不等於此 callback generation」；可同時用捕獲 worker 身分加強歸屬。必要回歸是本次四種過渡×成功/錯誤，加上正常新回覆、錯誤generation、舊onerror對照。應由合法原owner／維護任務修正並固定新候選，本人沒有代改。

這是注入式 controller 契約的可確定反例：測試刻意保留並送達已 terminate worker 的 callback，模擬延後回覆。**未測實際瀏覽器在 terminate 前後排程是否以及多常會派送該事件，不宣稱原生瀏覽器必現。** 產品GUI、下載、部署、外部驗收均未跑，NOT_RUN_USER_FOCUS_INCIDENT。不以真實瀏覽器的未知排程替代規格明訂的世代隔離要求。

Windows持久環境前後完整輸出精確一致，原始指紋只存 private檔。無憑證、全域Git設定、registry操作或公開產品變更。MAP8正式綁定仍等待合法實際提交與串行時段。

