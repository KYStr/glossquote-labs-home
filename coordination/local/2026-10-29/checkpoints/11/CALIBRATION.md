# MU20-11-M2：固定單一 idle Node 原語子範圍

本次caller只保持一個短時間存活的自有idle Node root，不執行M1的PING／READY／EXIT fixture。原生操作只能由主代理執行，本owner未啟動Node／collector／browser；不得宣稱完整校準protocol或controlled exit已通過。

M2 assessor契約：

- ledger、initialJobPids、retained三集合都必須**恰好一筆相同的expected root PID**；job A中任何額外列即使task-owned也拒絕。job B負例屬於主代理另持有的自有handle，不併入A的ledger／initialJobPids／retained。
- expected root creationFileTime、launcher原始hProcess取得的ledger FILETIME、collector before／after FILETIME必須精確一致；不接受正規化後猜測相等。
- root before／after皆須有實際desktop object proof與匹配的desktop label。Win32k denial僅作額外metadata，不能替代object proof；其他boundary與handle／QPC檢查維持。
- Node receipt仍為獨立kind、rawCdpJson=null，不合成browser processInfo。return data-only不授權native、CDP或Edge。

本次主代理native子範圍限定如下，均需主代理實際收據，不能由純assessor結果推定：

| 項目 | 必須核對 | 不得推論 |
|---|---|---|
| 原始hProcess／FILETIME | 自有launcher保留的精確process object，跨before／after／退出wait持續持有 | Node stdout PID或數字PID重開handle不是替代品 |
| job A/B controls | 用主代理原本持有的兩個自有job／process handles做負正membership控制 | 不查未知程序、不用此例證明Edge helper歸屬 |
| PSS before／after | 唯一idle root的實際thread generation／desktop object證據及錯誤 | managed ABI／離線fixtures不算native成功 |
| kill-on-close／退出wait | collector保存並清理其query handle後，由主代理關閉自己job，使用同一原始hProcess觀察實際signaled／exit結果 | 不假定exit0，不標controlled EXIT成功；未使用PING／READY／EXIT_ACK |

本次不新增IPC或修改已凍結collector。主代理必須固定idle Node程式／host來源，確保不產生child或另行將程序加入job A。assessor只能核對所保存的三集合，不能證明capture之後沒有新成員或未來隔離。

本owner的語法／離線檢查見 [M2驗證紀錄](m2/validation.json)。原生結果由主代理另行整合；完整M1 fixture protocol、controlled exit與Edge browser gates仍NOT_RUN／BLOCKED。

## 主代理一次實測失敗：只做靜態分析，不重啟

固定原件與SHA見 [native-failure-analysis.json](m2/native-failure-analysis.json)。native-receipt為REJECTED_NATIVE_CAPTURE，錯誤DESKTOP_KERNEL_OBJECT_NOT_VERIFIED／win32=2；root65220只有保留handle那一列，before／after皆null，start／end QPC也未開始。這是Prepare的desktop proof失敗，不能標原生校準PASS。combined guard未保存兩個API的各自回傳，API適用限制、desktop object不符、borrowed handle／station context皆未確定；ABI metadata已核對不能替代這項runtime證據。

另外initialJobPids為[65220,87180]，即使desktop問題後來修正，仍會獨立被M2單root assessor拒絕。87180不是host-cleanup所列的原始negative child96896，現有原件卻沒有它的image／FILETIME／原始handle，因此只標歷史身分未知；可能的job內helper與desktop API問題是不同假說，不能推定前者導致後者，更不能把它稱作Edge助手。

native-host exit0與A/B負正controls只代表各自子檢查；host-cleanup記兩個原始自有child均已wait到exit0，collector query handles也有release收據。舊launcher exit1的cleanup-count問題另由主代理用完整4-member outerjob snapshot核對；最新retired原件確認該4筆記錄世代退出，沒有retirement終止動作。這些清理結果不補足desktop proof，也不證明87180的歷史身分／退出情況，更不是PING／EXIT_ACK controlled exit。

目前可安全執行的是純收據重放與原始creation-ledger靜態比對；本owner已重放失敗收據得到REJECT，沒有擅自製造launcher ledger。若87180沒有同期來源，就維持unknown，不查已退出／可能重用PID。若需要拆分GetThreadDesktop與Compare的原生正反例或更廣known-job ledger，必須成為主代理另外審閱的後續設計，使用完全自有handles且維持無輸入邊界；本次不改C#、不放寬assessor、不以相同設定再啟native或Edge。

## M1 歷史擴充計畫，非本次 M2 可執行契約

以下保留原root＋child／IPC計畫作歷史背景。本次沒有執行它，現行單root assessor也不接受root＋child；若未來重啟須另經審閱，不能用下表直接取得M2 PASS。

狀態 **NOT_RUN_PRIMARY_REVIEW_REQUIRED**。此文件不是啟動指令或執行授權；本 owner 僅做離線 synthetic tests、語法與編譯。本計畫不使用瀏覽器，不接觸使用者輸入、未知程序或現有瀏覽器分頁。

## 啟動前須證實的能力

主代理先獨立審查 source／DLL hash與下列條件，缺一即停止：

1. 已驗證不會進入使用者輸入面的非互動 station／私有 desktop及自有 job launcher。不能用本機互動視窗試探隔離；本 owner 沒有建立新環境。
2. 原生 collector host 與 job／desktop handle 位於同一程序，或 handles 已由可信 launcher 以正確 DuplicateHandle 轉入該 host。保留 original job／desktop 到 collector Dispose後；不以 job名稱、PID或跨程序 handle數字代替。
3. 每個 Node fixture 由 launcher 以 suspended／hidden建立，先放入指定自有 job再resume，保留原始 process HANDLE／FILETIME。只能啟動固定 Node executable 與已hash的 `node-calibration-fixture.mjs`，不得使用shell、profile、未知輸入或新的dependency。
4. 正例 root／child在 job A；負例也必須完全自有，放在**另一個自有 job B與同一私有 desktop**，由 launcher保留原始handles。它不是未知程序，collector A也不得 OpenProcess(B 的PID)。
5. host 提供固定工作目錄／CreateNew輸出、前後環境guard、整體watchdog，以及由同一來源保存capture與cleanup兩份原始JSON／SHA的能力。host 的精確實作與共用station整合由主代理負責，目前 NOT_ESTABLISHED。

## 同一 host 的最小介面順序

下列是介面順序示意，不是可在目前輸入session執行的腳本：

```text
collector = NativeContinuationCollector.ForNodeCalibration(
            primaryOwnedJobAHandle, primaryOwnedDesktopHandle,
            rootPid, originalRootCreationFileTime, jobLabel, desktopLabel,
            fixedNodeImagePath)
token = collector.StartCalibration()
fixtureDriver.PingAndAwaitReady()       # parent-owned control channel, no CDP
collector.FinishCalibration(token)
sha = collector.SaveNewReceipt(existingApprovedCaseDirectory)
collector.Dispose()                    # finally also required on errors
cleanup = collector.GetCleanupJson()   # save verbatim + SHA, new file
decision = assessNodeCalibrationReceipt(parsedNativeReceipt,
            launcherOriginalOwnedFixtureGenerationLedger)
cleanupDecision = verifyCleanup(parsedNativeReceipt, parsedCleanup)
```

Node階段使用獨立receipt kind `MU20_NATIVE_NODE_PRIMITIVES_CALIBRATION`、rawCdpJson=null。fixture generation ledger只能來自launcher持續保留的原始process handles／FILETIME；Node stdout PID只是控制通道核對，不能自行認證建立世代。**不產生browser type／processInfo，不呼叫browser decision來獲得PASS。** `decideNativeReceipt`會拒絕Node kind；ForNodeCalibration也不能StartCdp。後續browser protocol須另經主代理審查並使用同一真browser target的原始result，不能用這個Node收據代替。

原生fixture使用IPC固定 `PING`→READY及 `EXIT`→EXIT_ACK，stdout只輸出自有PID／固定文字。只有parent已送EXIT、同一控制通道收到EXIT_ACK，且同一原始process handle觀察exit0才算受控退出。120秒timer為exit3、stdin意外關閉為exit4，不能當EXIT成功；host仍須有獨立watchdog。fixture、collector與compiler子程序全部 windowsHide=true／shell=false，不能啟動可見PowerShell或系統對話框。

## 每例單獨輸出目錄與預期結果

| ID | 真正執行的自有情境 | 可接受結果 |
|---|---|---|
| N01 | 歷史計畫：job A的Node root／child穩定READY | M2不允許root＋child，現行assessor會拒絕；本次不宣稱此例通過 |
| N02 | primary host用原本持有的job B Node handle，對自己的job A handle做單次query-only IsProcessInJob | API成功且false，保留原始handle來源與jobB正向歸屬。此probe由primary host實作；collector A不OpenProcess(B PID)、不掃描未知程序。原生結果仍NOT_RUN |
| N03 | A的child收到EXIT_ACK；collector一直保留原來process handle | primary獨立primitive case核對原FILETIME不變、實際signaled／exit FILETIME及exit0；不能使Node browser gate成功。post-exit API／thread證據不足則REJECT；不補舊欄位 |
| N04 | 由fixture driver提供closed/reopened/late-open metadata的離線副本 | REJECT；這是負面純收據檢查，不聲稱原生程式庫實際替換過handle |
| N05 | 原生desktop object query失敗或PSS權限不足 | REJECTED_NATIVE_CAPTURE，固定錯誤碼；不新增權限、不重跑同設定 |
| N06 | 只有不同desktop名稱或偽造Win32k audit bit的synthetic收據 | REJECT；不移動真實執行緒／desktop，不改mitigation或系統 |
| N07 | 同一capture正常save後Dispose兩次 | 第二次Dispose無重複Close；cleanup只計實際自有handle關閉嘗試，原始job／desktop仍由主代理保留 |
| N08 | fixture driver失敗，或未先保存即Dispose | 主代理保存primitive case failure／cleanup savedBeforeClose=false；該例REJECT，不能把資源清理當驗收成功 |

N04／N06的部分已由本輪離線測試涵蓋，但不能冒充原生N01/N02/N03/N05/N07/N08已執行。初次native校準先N01；若同一能力失敗兩次且沒有新證據，停止，回報精確API／error／rights／source hash，不盲重試。

保存所有原始收據，包括每個job清單、before／after FILETIME、handleToken、QPC frequency及query開始／結束、Node control-channel事件／獨立kind、thread owner／generation核對結果、desktop object comparison或實際mitigationflags、native錯誤與release結果。NativeSave發生於handle存活期間；另保存cleanup，不對unknown/outside-job做事後程序查詢。jobB只使用primary建立時已持有的自有handle，不能由數字PID重新開未知程序。

## 校準完成與下一步的界線

只有主代理親驗N01/N02及資源釋放等必要原生例，才可說採集器能力通過校準。它仍不證明Edge助手在job內，也不解除Edge隔離前置。任何未知live outside-job、未保留handle、跨程序HANDLE傳遞錯誤、boundary不足或cleanup失敗都停止，維持T02 BLOCKED。

真瀏覽器adapter須另經主代理審查並固定hash；安全Edge環境未證實前不接browser、不重啟原設定，也不進產品／release milestone。
