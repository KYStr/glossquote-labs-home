# 隱私與安全

> 2026-10-22 已選 C；現行 WEB-M1 以 [純網頁契約](WEB-M1.md) 為準。下方便攜、loopback API、native DNS 檢查與檔案清理是舊方案，不是新網頁的安全宣稱。

WEB-M1：媒體僅在瀏覽器記憶體處理。網址模式僅在開始後直接向來源 GET，無 cookies、referrer、redirect、自動探測、代理或上傳；本機檔案模式不向來源請求。簽名 query 保留於請求記憶體，不進 log、storage 或站內 URL。來源看得到 IP／來源請求，瀏覽器／OS 可能保留自己的快取，不能宣稱零痕跡。CSP connect-src https: 是本工具的受控使用者請求需求，其他資產仍 self 且無背景外連。

前端 URL 檢查拒 IP／本機名稱，但不能查證真正 DNS 目的，因此不聲稱防 DNS 重綁或提供網路沙箱。解碼前後設尺寸／時長上限，原生 decoder 沒有硬記憶體配額或可靠 abort；取消必須等 settle 才解鎖。清理只撤銷 app 自己的 Blob URL、timer 與參照，不刪磁碟、不保證 OS 立即釋放記憶體。

M0零外網、零輸入持久化、無credentials，URL只在記憶體解析。錯誤與回報不含URL/query/token/標題/檔案路徑，fake inputs用合成名稱。禁止console或state echo原始error。URL識別只為產品路由，不是完整網路安全界線。

完整便攜版需主代理核准M1：下載資料來源平台→使用者電腦，沒有GlossQuote代理／雲端上傳；平台看得到IP／請求。無telemetry/remote font/analytics/自動更新。不讀使用者cookies／登入資料／既有引擎config。公開網站只介紹與版本檔，不能偷探測本機服務。

loopback API本機同origin需Host/Origin/CSRF/方法/大小限制，不可任意網頁驅動下載。DNS及redirect逐跳禁止私網／本機／metadata；allowlisted原網址不代表其後URL安全。引擎只允許固定命令封裝，不把任意URL/路徑給shell。依賴版本、hash及license先驗。

文件清除：只能處理本session自己建立的暫存與partial，必須驗resolved path在sessionroot且拒reparse；不得刪任意Temp或整個下載資料夾。輸出另存，clear/退出不刪使用者成果。退出不是保證OS釋放全部記憶體/快取；不能寫自我刪除批次或提升權限。

DRM/付費/私密/需登入內容／直播與播放清單首版不處理，不移除保護或要求關閉防毒。只讓使用者保存有權下載的內容；不編造法律判定或以URL公開等同授權。
