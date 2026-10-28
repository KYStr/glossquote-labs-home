# MU20-11-M2：單一 idle Node assessor 修正

M2只修改Node純判定與對應測試、本文及CALIBRATION。collector C#／DLL、browser assessor、shared envelope validator與產品皆不改。最新M2 diff／命令／hash見 [驗證紀錄](m2/validation.json) 與 [M2 inventory](m2/candidate-inventory.json)；下面M1收據與原inventory保留原版本，不覆寫。

`assessNodeCalibrationReceipt` 本次只接受**恰好一個固定idle Node root**：launcher ledger、initialJobPids、retained三集合必須完全相等且都只有expected root PID；expected、ledger與before／after建立FILETIME逐字一致。before／after必須真的有desktop object proof，Win32k denial不能替代。額外／缺少／重複PID、其他root、錯世代或邊界缺失均拒絕；結果仍僅CALIBRATION_PRIMITIVES_DATA_ONLY，executionAuthorized=false，不能授權CDP或Edge。

主代理本次caller使用短時間存活的自有idle Node，**沒有執行下面M1原計畫的PING／READY／EXIT fixture**。本次原生子範圍只限精確原始hProcess／FILETIME、job A/B負正控制、PSS before／after、kill-on-close及同一hProcess的退出wait，實測與原始收據由主代理唯一執行／核實。本owner的離線PASS不能宣稱完整校準protocol、controlled exit、browser或Edge通過。assessor不會單獨證明job B控制或退出wait；這些須主代理另外核對native host收據。

M1中的root＋child／IPC／EXIT_ACK表格為歷史擴充計畫；現行M2 assessor明確拒絕多PID，不能沿用該表宣稱支援root＋child。完整protocol與Edge仍NOT_RUN／BLOCKED；不新增IPC、不改collector、不進T03。

M2實際檢查：兩個變更ESM語法檢查exit0，原77項案例加24項M2案例共101/101離線PASS。browser assessor／shared validator未改；凍結C#與DLL未變，沿用M1編譯／ABI證據，不重新編譯或載入。原生校準、kill-on-close及退出wait未由本owner執行，不能由這個離線結果標PASS。

主代理隨後提供一次native實測失敗：[靜態原件分析](m2/native-failure-analysis.json)。root65220在desktop object proof被拒絕（DESKTOP_KERNEL_OBJECT_NOT_VERIFIED，win32=2），before／after及capture時鐘均未完成；initialJobPids=[65220,87180]又獨立超出單root契約。87180只出現在job清單，沒有同期身分證據，不能猜是Node helper或Edge助手，也不查已退出PID。combined API guard沒有分別保存GetThreadDesktop／Compare回傳，不能由error2斷定API限制或handle／station問題。

native-host exit0、主代理報告的A/B membership controls、兩個原始自有child退出及4筆outerjob代際retired，可分別保留；**native capture整體仍FAIL，Edge仍BLOCKED**。本owner只對已保存失敗收據做純離線重放並得到REJECT。下一安全步驟僅為既有creation-ledger／job快照的靜態對照；若要拆API probe、改collector或擴大ledger，列後續設計由主代理決定，現範圍不重啟native／Edge、不丟棄額外PID或降低gate。

## M1 採集候選 v2 歷史交付與既有證據

本輪交付可供主代理審查的 C# 查詢程式庫、純收據轉接與測試、未執行的 Node fixture，以及原生校準計畫。**T02 仍為 BLOCKED_EDGE_ISOLATION_GATE。DLL只為ABI做type metadata反射，未建構collector／執行其P/Invoke；未啟動任何瀏覽器、Node 校準 fixture 或即時程序查詢。** 使用者保留 Chrome＋Edge；Chrome-only 未採用。

主要檔案：[原生候選](NativeContinuationCollector.cs)、[純轉接](receipt-decision.mjs)、[原生校準介面與案例](CALIBRATION.md)、[安全 Edge 方案與限制](EDGE-ISOLATION.md)、[ABI補證](ABI.md)、[最終編譯收據](compile-2.json)、[最終離線收據](offline-2.json)。新檔與 HANDOFF 追加 diff／SHA-256 收於 `owned-change-set.json`、`HANDOFF.diff`、`candidate-inventory.json`；最終檢查見 `final-validation.json`。

本輪驗收範圍：原生候選可編譯且不包含啟動／修改程序能力；純邏輯對缺失世代與邊界證據拒絕；交付具體主代理介面與停止條件。通過本輪不等於原生校準或 Edge gate 通過，也不授權 T03。

## 原生程式庫的實際行為

`NativeContinuationCollector` 為 x64 .NET Framework library，沒有 Main。它接收主代理**本程序內有效**的自有 job 與私有 desktop HANDLE，以及原生 launcher 保留的 browser PID／建立 FILETIME。數字 HANDLE 不能跨程序當指標使用；跨程序整合必須由主代理以正確的 DuplicateHandle／IPC 設計完成。本 owner 沒有改 shared station 或實作此整合。

1. 複製一份 `JOB_OBJECT_QUERY` handle，核對為同一 object。原始 job／desktop 必須由主代理持有到 collector Dispose 結束；label 只用於顯示，不當身分證據。collector 本身不能驗證一個外部 caller 的授權或其「task-owned」聲稱。
2. `QueryInformationJobObject(JobObjectBasicProcessIdList)` 只列自有 job；固定128程序上限，截斷／數量不符即拒絕。只對此清單 OpenProcess，先確認仍在同一 job 才查時間、映像或 thread。程序只要求 `QUERY_INFORMATION | QUERY_LIMITED_INFORMATION | SYNCHRONIZE`，無 terminate／VM read/write／注入或調整權限。
3. 保存私有 SafeHandle、建立 FILETIME、QPC、WaitForSingleObject(0) 的實際存活結果、完整 image path。所有原生查詢使用這個保留的 process handle；FinishCdp 不重新 OpenProcess，也不根據 CDP 內的新 PID 查詢未知程序。
4. 對匹配 expected image 的程序查詢 Win32k mitigation。只有 `DisallowWin32kSystemCalls` 實際 bit1 才算禁止，audit-only bit 不算。browser root 一律要求 desktop object proof，子程序可用實際 Win32k denial 替代。
5. desktop proof 採指定自有 process HANDLE 的 `PssCaptureSnapshot(PSS_CAPTURE_THREADS)`，不使用全機 process/thread snapshot。僅取得 thread metadata，不選 VA clone、記憶體、context、handle-table 或 stack flags。每個 thread 在查 desktop 前核對 process ID、建立 FILETIME與存活，最後以 GetThreadDesktop／CompareObjectHandles 核對 object，不靠同名。PID／TID 競態或部分清單均拒絕。
6. `StartCdp()` 在所有 before 查詢後記 QPC。主代理隨後執行同一 browser target 的原生 CDP；`FinishCdp(token, rawResultJson)` 先保留原始 result JSON 與 end QPC，再透過同一批 handle 查 after。沒有 CDP／CSV 重建、未知列過濾或自動重新啟動。
7. `SaveNewReceipt(approvedDirectory)` 僅用 CreateNew 寫固定檔名 `native-receipt.json`，flush 前保持 handles。`Dispose()` 只關 collector 自己的 process／query job handles，不關 borrowed desktop；`GetCleanupJson()` 回報實際 CloseHandle 成敗與保存順序。原生收據與 cleanup 必須由主代理分別保存並綁定 SHA。Dispose 不聲稱程序已退出。

Node原語校準另有 `ForNodeCalibration` factory與StartCalibration／FinishCalibration；receipt kind不同，rawCdpJson=null，不提供browser metrics role／processInfo。`assessNodeCalibrationReceipt`只核對launcher原始fixture generation ledger的Node原語資料。browser判定器必須拒絕此kind；不能把Nodeprotocol當browser CDP。job B負例的實際IsProcessInJob探針由primary native host使用其原本持有的B handle與A job handle完成，本collector不新增任意PID查詢。

程式庫不開 job／desktop 名稱、不修改 job、mitigation、window station、profile、憑證或系統設定；也不啟動／收編／附加／暫停／終止程序。主代理仍須確保它傳入的原始 job handle 持續存在；否則 kill-on-close job 的最後 handle 關閉可能造成自有程序退出，不能違反此前置。

## 純轉接與來源綁定

`receipt-decision.mjs` 檢查 C# DTO exact schema、job清單／retained coverage、clock／FILETIME／liveness一致性、Win32k實際bit與thread object proof，再將原始 CDP id/type/cpuTime 交給未改的 `generation-decision.mjs`。raw JSON 有大小／深度限制並拒絕重複欄位，包括 escaped key；after 查詢的**開始**時間必須在 CDP 完成之後，不能只看結束時間。

這些函式是資料一致性檢查，`executionAuthorized` 永遠 false，不能自行認證 native receipt 的來源。主代理必須綁定經審閱的源碼／DLL hash、同一可信 host、真實 browser target、原生 job／desktop 來源與寫檔／cleanup 收據。fixture metadata 與純測試一律不算原生採集 PASS。

## 命令與實際結果

在 repo root：

```powershell
& 'C:\Program Files\nodejs\node.exe' '.runs/media-continue-2026-10-20/owner-11/compile-only.mjs' compile-2
& 'C:\Program Files\nodejs\node.exe' '.runs/media-continue-2026-10-20/owner-11/run-offline-checks.mjs' offline-2
```

初版檢查保留在compile-1／offline-1，ABI／protocol審查返工後只重跑受影響檢查，以compile-2／offline-2保留最終結果：

| 檢查 | 結果 | 實際範圍 |
|---|---|---|
| C# x64 library，`/warn:4 /warnaserror+` | PASS，exit0，零警告 | 編譯後只載入type metadata作ABI核對；無collector／P/Invoke執行；未用dotnet、NuGet或新增套件 |
| 固定官方header＋managed ABI反射 | PASS，19欄位／size120／四常數 | 無本機SDK安裝、無原生C++ sizeof或PSS執行，詳見ABI |
| 7 個 ESM 語法檢查 | PASS，exit0 | fixture 只做 `--check` |
| 原26項＋返工後51項純測試 | PASS，77/77 | 全為離線 synthetic metadata；無程序校準／CDP／browser |
| 原生 job／FILETIME／PSS／desktop／Win32k 校準 | NOT_RUN | 主代理原生審查與安全執行前置未滿足 |
| Edge G1／G6 | NOT_RUN／BLOCKED | 原 R3／R4 不改；本輪沒有新 Edge 執行 |
| T03／來源發布／部署 | NOT_RUN | 原 T02 前置尚未通過 |

每份命令收據採新檔保留；不要直接重跑覆寫 `compile-1/2`／`offline-1/2`。必要修正後須新的label；只有受影響檢查重跑。最終DLL是 `build/NativeContinuationCollector.compile-2.dll`；其hash是本輪實際固定候選，不宣稱舊編譯器可重現相同PE bytes。

## 明確未驗能力與停止條件

- 此處只有編譯與離線邏輯證據。Windows PSS 以這組最小唯讀權限是否能取得 threads、跨 sandbox 的 mitigation查詢、GetThreadDesktop／CompareObjectHandles是否能證實預期 desktop，以及存活競態與資源釋放，均須真正校準。任何 access denied／API unsupported 均拒絕，不加 VM_READ／ALL_ACCESS／debug privilege，也不改系統設定。
- 主代理尚須提供同一原生 host 的有效 handles、持續生命週期、可信 CDP adapter與輸出目錄；不能把目前 station 的 PID／job名稱 JSON 直接冒充原生 handle。這是具體的整合缺項。
- PSS 是時間點觀察；新／退出 thread、權限或 desktop proof 不完整都可能保守拒絕。它不證明未來隔離，也不防止未列入 job 的外部 broker 先行啟動。已退出但完整 after 邊界查不到時維持拒絕，不複製 before 欄位填成功；只有所有必要證據完整的自有退出世代才可能 REFRESH_REQUIRED。
- 未知 live outside-job／raw PID 沒有連續 handle／世代或邊界缺失一律拒絕。最多兩次「已完整證實自有 child 退出」的新快照是主代理計畫上限；本程式庫沒有自動 refresh，更沒有重啟 Edge。
- collector 是補證能力，**不構成 Edge 助手隔離方案本身**。安全方案的環境條件與不能放行的範圍詳見 EDGE-ISOLATION。

## 官方依據

- [job process list](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_process_id_list)：包含 nested jobs，返回不足時不能把截斷清單當完整。
- [IsProcessInJob](https://learn.microsoft.com/en-us/windows/win32/api/jobapi/nf-jobapi-isprocessinjob)、[GetProcessTimes](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes)：以 handle 查 job／建立時間。
- [GetProcessMitigationPolicy](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocessmitigationpolicy)、[system-call disable flags](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-process_mitigation_system_call_disable_policy)：查詢需要 QUERY_INFORMATION；actual denial 與 audit 不混用。
- [PssCaptureSnapshot](https://learn.microsoft.com/en-us/windows/win32/api/processsnapshot/nf-processsnapshot-psscapturesnapshot)、[PSS_CAPTURE_FLAGS](https://learn.microsoft.com/en-us/windows/win32/api/processsnapshot/ne-processsnapshot-pss_capture_flags)、[PssWalkSnapshot](https://learn.microsoft.com/en-us/windows/win32/api/processsnapshot/nf-processsnapshot-psswalksnapshot)、[PSS_THREAD_ENTRY](https://learn.microsoft.com/en-us/windows/win32/api/processsnapshot/ns-processsnapshot-pss_thread_entry)：指定 process handle 的 thread metadata／flags，並非本輪已驗權限可行性。
- [GetThreadDesktop](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getthreaddesktop)、[CompareObjectHandles](https://learn.microsoft.com/en-us/windows/win32/api/handleapi/nf-handleapi-compareobjecthandles)：前者回傳 borrowed desktop，後者核對 object；不以名稱相等替代。
- [PssFreeSnapshot](https://learn.microsoft.com/en-us/windows/win32/api/processsnapshot/nf-processsnapshot-pssfreesnapshot)：本地 snapshot 以 GetCurrentProcess 作為 owner 釋放，不能誤把 target handle 當 snapshot owner。
