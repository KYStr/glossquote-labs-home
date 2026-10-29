# PSS x64 ABI 對照與審查返工

本輪針對 `collector-review.md` 的 ABI 阻止項補證，**不靠啟動 PSS 猜布局**。沒有安裝SDK；本機固定 `Windows Kits/10/Include` 不存在。改保存 Microsoft 官方 `win32metadata` 中的 WinSDK recompiled header：

- 固定提交：`c16762d41f1bd641ff8c4389ebf16ee50747129f`
- [ProcessSnapshot.h 固定原件](https://github.com/microsoft/win32metadata/blob/c16762d41f1bd641ff8c4389ebf16ee50747129f/generation/WinSDK/RecompiledIdlHeaders/um/ProcessSnapshot.h#L316)，本地原件 `sources/ProcessSnapshot.h`
- 12,655bytes，SHA-256 `946ea96d560fb2644b460b04f7494b5d7aa0ec1c687d2b53ec6e419b61b2b42e`
- 來源收據 [sdk-reference.json](sources/sdk-reference.json)。初次 raw URL因header大小寫404，隨後依同一官方repo tree的精確名稱取得；未執行／編譯下載header。

這是固定官方 SDK header 定義，不冒稱本機有該版本完整SDK或已完成原生C++ sizeof。type／alignment依據 Microsoft [x64 ABI](https://learn.microsoft.com/en-us/cpp/build/x64-software-conventions?view=msvc-170)、[Windows data types](https://learn.microsoft.com/en-us/windows/win32/winprog/windows-data-types) 及 [FILETIME](https://learn.microsoft.com/en-us/windows/win32/api/minwinbase/ns-minwinbase-filetime)。Windows x64仍是DWORD32／WORD16／int32；pointer與ULONG_PTR為64bit。FILETIME是兩個DWORD，size8、alignment4；PCONTEXT是pointer，不能把CONTEXT內嵌進此結構。

## 欄位對照

header的PSS_THREAD_ENTRY順序由 `build-abi-spec.mjs` 從固定原件解析，拒絕缺項／重排；按x64自然alignment計算如下。所有結果亦寫入 [abi-spec.json](abi-spec.json)，並由 [abi-metadata.json](abi-metadata.json) 實際Marshal反射逐欄核對：

| SDK 欄位 | SDK型別 | C#欄位型別 | offset | bytes |
|---|---|---|---:|---:|
| ExitStatus | DWORD | uint | 0 | 4 |
| TebBaseAddress | void* | IntPtr | 8 | 8 |
| ProcessId | DWORD | uint | 16 | 4 |
| ThreadId | DWORD | uint | 20 | 4 |
| AffinityMask | ULONG_PTR | UIntPtr | 24 | 8 |
| Priority | int | int | 32 | 4 |
| BasePriority | int | int | 36 | 4 |
| LastSyscallFirstArgument | void* | IntPtr | 40 | 8 |
| LastSyscallNumber | WORD | ushort | 48 | 2 |
| CreateTime | FILETIME | Ft | 52 | 8 |
| ExitTime | FILETIME | Ft | 60 | 8 |
| KernelTime | FILETIME | Ft | 68 | 8 |
| UserTime | FILETIME | Ft | 76 | 8 |
| Win32StartAddress | void* | IntPtr | 88 | 8 |
| CaptureTime | FILETIME | Ft | 96 | 8 |
| Flags | PSS_THREAD_FLAGS | uint | 104 | 4 |
| SuspendCount | WORD | ushort | 108 | 2 |
| SizeOfContextRecord | WORD | ushort | 110 | 2 |
| ContextRecord | PCONTEXT | IntPtr | 112 | 8 |

整體 alignment8、size120；padding在4–7、50–51、84–87。C#已明定 ThreadEntry Pack=8、Ft Pack=4，並在第一次 P/Invoke之前做相同的managed ABI防護。原欄位寬度／順序與此對照相符，沒有以試跑結果調整數值。

SDK [PSS_THREAD_ENTRY文件](https://learn.microsoft.com/en-us/windows/win32/api/processsnapshot/ns-processsnapshot-pss_thread_entry) 將CreateTime定義為thread建立時間；ContextRecord僅在walk-marker存活期間有效，本候選不解參考它或reserved pointers。**布局證據不保證PSS_CAPTURE_THREADS在實際OS／最小權限下填出非零CreateTime。** 這仍須原生校準；若為零或與同一thread handle的GetThreadTimes不符，必須拒絕，不能只用「PID相同且TID活著」取代generation，也不追加THREAD_CONTEXT／VM_READ權限。

## 常數與語義

固定header列明 `PSS_CAPTURE_THREADS=0x80`（line53）、`PSS_WALK_THREADS=3`（line95）、`PSS_THREAD_FLAGS_TERMINATED=1`（line319）。C#改用有名稱的相同常數，僅capture threads，不選context或VA clone。終止flag是位元判斷，不混同thread ExitStatus。

`ERROR_NO_MORE_ITEMS=259`來自 [WinError官方定義](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--0-499-)，表示walk正常結束；不是GetExitCode的STILL_ACTIVE推論。存活另用WaitForSingleObject(0)，其WAIT_TIMEOUT=258表示尚未signaled。

## 實際離線驗證

`compile-2.json`：x64 library編譯exit0、warn-as-error零警告；保留compile-1原DLL／收據與原source在baseline，不改舊原件。`verify-abi-metadata.ps1` 僅把新版assembly載入作type／constant metadata反射，呼叫CLR的Marshal.SizeOf／OffsetOf，不建構collector、不呼叫collector methods或其任何P/Invoke。

結果：19/19欄位型別、offset、size；120-byte ThreadEntry、8-byte Ft；Pack8／Pack4；四個常數全吻合。nativeCalibration與native C++ SDK sizeof均NOT_RUN。主代理仍須親讀／接受此補證，並提供原生launcher與borrowed desktop lifetime能力後才能校準；本證據不放行Edge。
