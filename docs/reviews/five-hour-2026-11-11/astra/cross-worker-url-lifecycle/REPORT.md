# FH-CROSS-WORKER-URL-01：建構失敗未清除 Blob URL

固定 PR283 commit **448bd9fc9865fe65f6014b66f4a2e2d54b76f539**。2026-11-11T06:50:08Z開始，06:50:43Z已完成九檔位元核對、18個受控情境及環境前後核對，未超過三分鐘。

**八款確認相同建構失敗清理缺陷；workdays此項通過。** 範圍只限 new Worker 同步 throw，沒有擴大至其他URL或非同步邊界。

| 工具 | app.js createWorker 起行 | new Worker throw | 正常 terminate |
|---|---:|---|---|
| age-calculator | 126 | 未revoke，確認缺陷 | PASS |
| bill-split-calculator | 122 | 未revoke，確認缺陷 | PASS |
| clothing-size-converter | 188 | 未revoke，確認缺陷 | PASS |
| dew-point-calculator | 97 | 未revoke，確認缺陷 | PASS |
| feels-like-temperature | 108 | 未revoke，確認缺陷 | PASS |
| period-cycle-calculator | 96 | 未revoke，確認缺陷 | PASS |
| race-time-predictor | 111 | 未revoke，確認缺陷 | PASS |
| salary-converter | 123 | 未revoke，確認缺陷 | PASS |
| workdays-calculator | 見固定 app.js / results.json | catch內revoke且原exception往外傳，PASS | PASS |

所有路徑為 tools/<slug>/public/js/app.js。九份完整檔從既存固定copy讀取，與GitHub未截斷tree之blob/size逐檔核相等；source-verification.json另存SHA-256。沒有以同碼模式代替動態執行，pattern-only為0。

## 反例與必要行為

八款依序 createObjectURL(blob) → new Worker(url) → 包裝terminate以revoke。若new Worker同步throw，控制流程根本到不了terminate包裝，已建URL留存。受控VM每案實測create=1、constructor=1、revoke=0，且原exception傳出。正常建構再terminate對照為create=1、terminate=1、revoke=1。

workdays在new Worker周圍已有try/catch，catch先revoke同URL再throw原error；本次失敗情境create=1/revoke=1，正常terminate也revoke=1。因此不應把它併入此缺陷修正。

最窄修復是在new Worker同步throw路徑釋放剛建立的URL再保留原exception，正常返回的worker仍由其生命週期負責revoke；由各實際合法owner修，不改原claim或產品範圍。

## 重現與限制

~~~sh
node probe.mjs
~~~

Node v24.14.0，固定缺陷baseline預期exit1與DEFECTS_CONFIRMED；18情境共8缺陷、9正常對照PASS、workdays失敗清理PASS。probe逐檔驗Gitblob後，從原app.js擷取未修改的完整createWorker函式，在Node VM注入假的Blob、URL、Worker。Worker建構時throw同一受控sentinel，驗原exception及URL呼叫；沒有載入DOM、真browser、真Worker或實際Blob URL，也沒執行整支app.js。

只有factory的construction-failure和正常terminate有實測，沒有聲稱產品GUI/瀏覽器資源測量完成。wallpaper/ping/cooking由主統籌另核，不在這次九款結果中。無產品改動、registry操作或來源發布。

持久環境前後完整stdout精確一致；原始指紋留private紀錄。本人為獨立review actor local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/five_hour_astra_review，未製作來源產品；此報告只確認缺陷，不授未來修正accepted。

