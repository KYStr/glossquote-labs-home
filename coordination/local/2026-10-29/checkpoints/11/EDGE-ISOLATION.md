# 安全 Edge 執行方案：既有、獨立的 Windows11 實體驗收機

方案狀態 **PROPOSED_CONDITIONAL_NOT_AVAILABLE_OR_EXECUTED**。本輪不建立／設定帳號、VM、服務、遠端連線、profile或新隔離環境，也不要求在使用者目前主機再啟動Edge。是否已有這種驗收能力，由主代理確認；目前 NOT_ESTABLISHED。

## 必須解決的邊界

job 的正常child繼承與UI邊界是不同問題。Microsoft 的 [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects) 說明正常child繼承、breakaway及非繼承例外；job不是整個OS的圍牆。本輪不能靠新增log、名字白名單、不同profile或忽略helper來聲稱外部程序安全。

已核對的 R4 只證明 guard 當時看見 live identity_helper 不在 job；未證實它的完整啟動鏈或世代。本方案不推定其來自哪個broker。**collector只增加可查證能力，無法阻止一個未列入job的helper先行啟動。**

## 方案及其針對 job 外 helper 的作用

使用一台**已存在、專門做驗收、與使用者目前主機不同的 Windows11 實體機**。該機沒有使用者的活躍工作輸入session或私人資料；既有執行器必須以非互動station／私有desktop執行固定Edge及原生Chromium sandbox，透過既有的非互動控制通道回傳原始JSON／合成媒體證據。不能以RDP/視窗鏡像、鍵鼠/IME、剪貼簿、host檔案分享或原生dialog轉送操作；不能在此任務新安裝／設定這些能力。

這個方案把可信隔離邊界移到**不同實體主機的整個OS／輸入面**：即使一個helper經由OS broker不在browser job，它的本機Windows UI／broker仍只在驗收機，不能直接取得使用者目前主機的window station或IME。此結論是由物理分離及無輸入轉送前置推導，並非Microsoft對本候選／Edge助手的安全認證。主代理必須驗證不存在跨機輸入／分享通道，不能只憑「remote/headless」標籤通過。

Microsoft 的 [Window Station and Desktop Creation](https://learn.microsoft.com/en-us/windows/win32/winstation/window-station-and-desktop-creation) 將window station／desktop綁到程序與登入情境；[GetThreadDesktop](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getthreaddesktop) 則限定thread desktop在該process window station中。Microsoft 的 [Edge WebDriver 文件](https://learn.microsoft.com/en-us/microsoft-edge/webdriver/) 提供受支援自動化／headless操作背景，但headless本身不足以保證這個輸入隔離方案。沿用既有執行器，不新增Selenium／WebDriver依賴或變更版本。

## 原 guard 仍不放寬

物理隔離解決的是「job外helper可能碰到正在使用的同一台電腦」；它**不等於**helper已證明task-owned、在job內或符合原驗收要求。原生collector仍只查自有job；raw CDP未知PID仍REJECT，不能在獨立機把原 guard改成PASS。

此環境僅在主代理審查後，讓一次必要的啟動／診斷有真正不同的使用者輸入邊界；不是承諾Edge功能gate一定能跑完。若仍出現未知live outside-job，停止於導航／產品操作前，保存raw CDP與已持有handle證據，不查／收編／終止未知程序，不做第二次相同設定啟動。要進功能gate，仍須另外有可證實涵蓋該helper的啟動／job歸屬方案並經主代理審查；本候選未提供、未假造這項能力。

在「只能使用目前主機、不能改帳號／VM／服務／系統、不能執行未知程序診斷」的現有限制下，沒有已驗證的本機Edge完整隔離解法。若上述既有實體驗收機及非互動執行能力不存在，具體停止狀態為 **BLOCKED_NO_SAFE_EDGE_EXECUTION_CAPABILITY**。主代理先回報環境缺項，不能改用Chrome-only、不降低gate、不把本方案文件當隔離PASS。
