# NC25-12-F02｜嚴格收據 schema 與 transport 整合候選

版本：`NC25-12-INTEGRATED-2026-10-25-v1`。狀態：**FROZEN／待主代理獨立驗收**。完成範圍是離線診斷器修正與 Windows Node loopback transport 整合，媒體產品與發布仍未通過。

## 實際改動

- 保留 NC23 F01 的 native/full/server header 一致性、固定九欄及五階段 reader 狀態檢查。
- F02 新增三個 guard：sourceWriteCalls／transportWriteCalls 為非負 safe integer；三個操作 order 為正 safe integer；navigationSentAtMs 為有限非負 number。先驗證再做既有策略／順序比較，不轉型、不四捨五入、不補預設。
- `bindings.mjs` 的執行依賴改為本候選的 transport、source-identity、reader；transport 是已驗 B20 中斷／hash 修正版的逐 byte 副本。舊 MA22 inventory、原 observer、原 reader 與產品來源驗證仍保留，未刪 verifier 或放寬來源檢查。
- `adapter.mjs` 真正從 `bindings.transportUrl`／`bindings.sourceIdentityUrl` 匯入；HTTP 回歸 loadFactory 也使用同一個 transportUrl。綁定測試確認兩者使用同一 module factory。**真 adapter／CDP 執行未跑**，不可把接線及 Node 測試說成瀏覽器驗收。
- 原 17 項 test 檔與 assertions、offline fixtures、protocol、first-party、reader、observer 及 B20 transport／原測試保持來源 bytes 不變。新增 runner 僅調整受測來源、相對路徑、輸出目的地及禁止覆寫，未削弱原驗收 assertion。

|元件|SHA-256|
|---|---|
|整合 classifier evidence.mjs|`2e31d604997e73212c059a8720cbc62272240f20f31336f5e3978cdf1c883f90`|
|實際綁定 transport-ab.mjs|`e2b1d95080e96d2f8ee7615b307e4647c490f1c456ae7da8a6e9a93b2faa5d2e`|
|原 17 項 offline.test.mjs，未改|`c7677c4803129dae7cec8d70343258fa1ebbea0d65af57b1226f49674eea6a49`|
|唯讀 NC23 classifier|`4612b4039f5cf967f0bfb01751d311a14ce6bb94ebadb8ff1284a5f3b654d7a2`|
|唯讀舊 MA22 transport，已不作本候選執行依賴|`55aa501801443a194d2001924f51484571a5451cdaccff8db6d1bd6cde48c0fb`|

完整前後差異在 [implementation.diff](implementation.diff)，各來源與候選程式的 bytes／hash 在 [source-binding.json](source-binding.json)。新版 classifier 是由審過的最小差異重建，與外部 F02 候選 bytes 完全相同，未直接執行整包 RERUN。

## 驗證結果

本輪使用 Windows、Node **v24.14.0**、內建模組，沒有安裝依賴。下列執行均 exit 0、stderr 空、未逾時：

|組別|本輪結果|證據|
|---|---|---|
|來源綁定|153 唯讀輸入、20 候選程式／版本檔通過|[輸出](evidence/source-binding.json)|
|原 17 項 offline|17/17，原檔逐 byte 相同|[TAP](evidence/original-offline17.tap)|
|原 90 反例／288 變異／4 reader 分塊|90 全拒絕、288 全拒絕、4 全通過；含 6 正例／6 native failure 保留|[完整結果](evidence/extended-receipts.json)|
|外部 F02 補充矩陣|1296/1296，0 失敗|[完整結果](evidence/independent-receipts.json)|
|接線與補充 schema|3 項 Node tests 通過；48 個 NaN／Infinity／undefined 非 JSON 邊界拒絕，合法小數導航時間保留|[TAP](evidence/integration-schema.tap)|
|A／B 真 Node client abort|各自 CLOSE／writableFinished=false；擁有的來源 stream 停止，隨後 A、B 均恢復 160044 bytes／正確 SHA，子程序自然 exit 0|[摘要](evidence/abort-summary.json)|
|B20 同組邊界／lifecycle|22/22 邊界、4/4 lifecycle；Node test runner 5/5|[摘要](evidence/transport-summary.json)、[TAP](evidence/transport-boundaries-lifecycle.tap)|
|adapter import-only smoke|runAdapter 匯出正確，nativeStarted=false|[輸出](evidence/import-smoke.json)|

**組別有重疊，不相加宣稱獨立總案例數、產品通過率或整站完成。** 1296 矩陣本身已含舊 90 反例，其他 runner 也重驗部分 header／狀態。外部原版 93 個矩陣異常與主代理三組 counter 誤 PASS 重現屬各自既有證據；本 owner 本輪未重新跑舊版崩潰或把舊證據列為新測量。

所有診斷結果的 fullNetworkAccepted／fullT02Accepted 維持 false，歷史 **69 FAIL／3 missing native terminal** 保留。FakeCdp 僅是離線 EventEmitter 替身；Node Web Stream 的 fetch 亦為注入的本機函式。這些都不是 Chrome／Edge 真 CDP 或瀏覽器證據。

## 命令與重跑

[commands.json](commands.json) 保存本輪完整 executable／args、exit、時間、stdout／stderr 路徑；每項原始紀錄在 [evidence/](evidence/)。read-only Git diff 的 exit 1 是預期「存在差異」，各命令與完整 stdout／stderr另存在 [diff-commands.json](evidence/diff-commands.json)。未改 Git／gh 設定。

在 repository 根目錄，以同版 Node 執行。兩個收據 runner 必須指定**尚不存在的新輸出路徑**，使用 wx 寫檔，不覆寫凍結證據：

```powershell
& 'C:/Program Files/nodejs/node.exe' '.runs/batch20-browser-release-2026-10-25/owner-12-integrated/verify-source-binding.mjs'
& 'C:/Program Files/nodejs/node.exe' --test --test-reporter=tap '.runs/batch20-browser-release-2026-10-25/owner-12-integrated/offline.test.mjs'
& 'C:/Program Files/nodejs/node.exe' '.runs/batch20-browser-release-2026-10-25/owner-12-integrated/independent-receipts.mjs' . './nc25-matrix-NEW.json'
& 'C:/Program Files/nodejs/node.exe' '.runs/batch20-browser-release-2026-10-25/owner-12-integrated/extended-receipts.mjs' './nc25-extended-NEW.json'
& 'C:/Program Files/nodejs/node.exe' --test --test-reporter=tap '.runs/batch20-browser-release-2026-10-25/owner-12-integrated/integration.test.mjs'
& 'C:/Program Files/nodejs/node.exe' '.runs/batch20-browser-release-2026-10-25/owner-12-integrated/abort-child.mjs' candidate A
& 'C:/Program Files/nodejs/node.exe' '.runs/batch20-browser-release-2026-10-25/owner-12-integrated/abort-child.mjs' candidate B
& 'C:/Program Files/nodejs/node.exe' --test --test-concurrency=1 --test-reporter=tap '.runs/batch20-browser-release-2026-10-25/owner-12-integrated/boundaries.test.mjs' '.runs/batch20-browser-release-2026-10-25/owner-12-integrated/lifecycle.test.mjs'
& 'C:/Program Files/nodejs/node.exe' '.runs/batch20-browser-release-2026-10-25/owner-12-integrated/import-smoke.mjs'
```

B20 HTTP helper 明確限定 Windows／Node 24.14.0；若執行環境改變，應另記錄／審查，不能悄悄移除限制。`abort-child original` 是保留的歷史重現入口，這輪未執行；重跑本整合版使用 `candidate`。

目錄含完整新候選程式與 transport/helper/reader，但仍需要原 repository 的固定產品來源及 observer／歷史 FROZEN 依賴。請保留 [source-binding.json](source-binding.json) 列出的相對目錄；單獨拿走此資料夾不能冒稱完整產品包。

## 保留與交接

- [verification.json](verification.json) 彙整範圍、接線、實測與未驗項；[candidate-inventory.json](candidate-inventory.json) 列本候選逐檔 bytes／SHA，排除 inventory 自身。凍結後僅唯讀驗證。
- 145 個歷史固定檔與 8 個審查輸入前後 hash 不變：[固定檔之前](fixed-inputs-before.json)／[之後](fixed-inputs-after.json)、[審查輸入之前](reviewed-inputs-before.json)／[之後](reviewed-inputs-after.json)。[11 個逐 byte 複製檔](byte-identical-copies.json)包含原 17 項 test、transport 及 B20 邊界／lifecycle assertions。
- Windows guard 完整 Snapshots 前後相同，亦與 NC23 既有基準一致：[before](environment-before.json)／[after](environment-after.json)／[comparison](environment-verification.json)。記錄了 HKCU/HKLM PATH hash、registry type、長度、ephemeral count 及整個 Environment-key fingerprint；無持久修改。
- 原工具 HANDOFF 僅末尾追加：[差異](handoff.diff)、[前綴驗證](evidence/handoff-append-verification.json)。舊候選／inventory、產品／fixture／reader／observer、模型／vendor、外驗包及共享看板未修改。
- 派工要求 gpt-6.1-sol／max；實際 backend 身份未獨立核實。沒有再委派。

## 未驗與風險界線

`NOT_RUN_USER_FOCUS_INCIDENT`：真 browser／CDP／adapter 執行、Windows launcher／native helper、桌面輸入隔離、OS PID 記憶體量測、ASR／模型與完整媒體驗收均未跑。沒有 CUA／IAB、現有瀏覽器程序操作、focus／IME／clipboard／原生對話框、憑證讀取、安裝、持久 Windows／Git／gh／auth 修改、外網、GitHub、部署或新 ZIP。

loopback 測試只建立、關閉各自的 127.0.0.1:0 server 與精確擁有的 client／來源 stream；未掃描或停止其他程序。A/B client abort 是 Windows Node HTTP 層證據，不證明瀏覽器 Network／Storage 行為。

此候選凍結後等待主代理親閱實際 diff、核對最終 hash 及獨立驗收；不自動進下一 milestone、發布、部署或宣告媒體產品完成。單一總 ZIP 由主代理整合。
