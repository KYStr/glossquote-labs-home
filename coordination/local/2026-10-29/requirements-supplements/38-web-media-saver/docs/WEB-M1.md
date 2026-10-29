# WEB-M1：瀏覽器直接保存影音

2026-10-22 使用者已明確選擇 C：「完全網頁且全部本地：接受只支援瀏覽器能直接讀取的來源」。此文件是本輪產品／技術／驗收的現行契約，取代舊 M1 便攜助手與尚待選擇敘述。M0 的平台辨識及 MP3 plan 是歷史已測核心，保持原碼，不直接接到此新 UI。

## 使用者工作與完成定義

使用者已有一個可直接取得的影音網址，希望保存原檔，或只保留聲音。網站開啟後貼網址、選「保存原檔」或「取出 WAV 音訊」、開始、按下載；無助手、解壓、安裝、設定或清理資料夾。找不到直鏈時，可改用本機檔案。檔案不傳到 GlossQuote；網址模式由瀏覽器直接向使用者指定來源取得檔案，來源仍可見 IP／請求。網站不承諾完全離線、零痕跡或各大平台通用。

本 milestone 必須交付實際雙語靜態 app、可下載的實際 bytes、完整錯誤及取消流程、離線測試／check／build，交回主代理獨立審查和隔離瀏覽器驗收。純規格、純 mock controller、只展示成功訊息均不算完成。發布另經固定候選驗收；本輪實作對話先不 push/deploy。

非目標：平台作品頁擷取、登入／cookie／DRM、HLS/DASH／直播、整站爬取、MP3 編碼、影音代理、native helper、擴充、Service Worker、持久快取、麥克風／螢幕錄製、修改 11/12 舊媒體工具。

## 功能契約

1. 預設網址來源，另有清楚「選取本機檔案」入口。輸出預設原檔，另一選項明寫 WAV；不是將原檔換副檔名。不問工程格式參數。結果顯示實際 bytes／格式、WAV 時長，以及可再次下載連結；由瀏覽器處理保存位置，不能聲稱已落盤。
2. 支援一個絕對 HTTPS URL，長度上限 2048 UTF-16；拒絕 userinfo、非 443 port、控制／格式字元、反斜線、內嵌空白、IP literal、localhost／local／internal／test 等本機與保留主機名稱。允許正常公共多標籤 DNS host 與原樣 query（簽名網址可能需要）；不自行移除 query、不存 URL、不放到站內 query/hash 或診斷。已知平台作品頁應早期提示要直接媒體連結，但不能以副檔名證明可下載。DNS 解析／實際目的 IP 由瀏覽器與 OS 處理，不能宣稱前端能驗證 DNS 防重綁。
3. 僅使用者按開始後才 fetch。GET、mode=cors、credentials=omit、referrerPolicy=no-referrer、cache=no-store、redirect=error、AbortController。不 HEAD 探測，不送任意 header，不用 no-cors、代理或 localhost 回退；無 redirect 跟隨。不載入遠端縮圖、播放器、SDK。不能取得時保留固定錯誤，說明 CORS／網路／到期可能原因，不假判 CORS 唯一根因。
4. 原檔上限 32 MiB（33554432 bytes），音訊輸入上限 16 MiB（16777216 bytes）。Content-Length 僅早期拒絕／提示，真正依 reader 每塊累加 bytes，未知總量顯示已取得量；超限即 abort 並取消 reader、清 partial。無 Range 的 GET 僅接受 HTTP 200；206 不能當完整媒體成功。空資料、不成功 HTTP、opaque、HTML／JSON／playlist、明顯非媒體拒絕。取得與讀取有明確 timeout（建議總 120 秒、無資料 20 秒），錯誤不包含 URL／原 exception。
5. 首版原檔容器以 WAV、MP3、MP4/M4A、WebM、Ogg 為有限集合；依 bytes 簽章和 MIME 一致性作基本容器檢查，不能聲稱完整解碼驗證或安全掃描。缺少／octet-stream MIME 可依可靠簽章辨識。檔名用固定安全 basename + 確定容器副檔名，不採 Content-Disposition／URL／來源標題。不把 MP4 均當有影像，不把 WebM 均當可解音軌。
6. WAV 模式以瀏覽器 Web Audio decodeAudioData 解碼其支援的完整媒體；不支援 codec／沒有音軌時清楚失敗。先用本機 Blob 的 metadata 檢查時長（最多 120 秒、有限正值；逾時／無法檢查則拒絕），才進解碼；decode 後重新驗 duration、channels、sampleRate、frames 與 PCM bytes。最多 2 聲道、48 kHz、64 MiB 解碼後 PCM；不可偷偷丟聲道。允許 OfflineAudioContext 固定 48 kHz，輸出 16-bit PCM little-endian WAV，頭部欄位／交錯／裁切／有限值正確。不能宣稱這些限制是瀏覽器 native decoder 的硬記憶體隔離；需實測小樣本與誠實資源限制。
7. 一次一個工作。取消 fetch 確認舊 read 收尾後才能新工作；decodeAudioData 沒有可靠 abort，取消後立即使舊結果失效、顯示「正在停止，等待瀏覽器處理結束」，直到其 Promise settle 才允許新工作，不能假稱已停止。編碼分塊讓出事件迴圈／可取消。晚回結果與錯誤不可覆蓋新來源／新工作。
8. 來源、模式、檔案修改使既有結果失效並撤銷 blob URL；若忙碌則走取消流程。clear/pagehide 釋放本任務 Blob 參照／object URL／media 元件／timers；不清使用者磁碟或承諾立刻回收 RAM。下載物件 URL 應在結果有效期間保留，避免點擊當下立刻 revoke 造成下載競態。取消／失敗不得留下仍可下載的舊結果。

## UI、隱私與 SEO

沿用 docs/DESIGN-SYSTEM.md，任務畫布為主；繁中 /index.html、英文 /en/index.html，全介面及錯誤雙語。明顯 label、aria-live 階段與錯誤、44 px 主要控制、320 px／200% 重排、reduced motion、可鍵盤操作。不要工程控制台或 SaaS 面板。說明哪些連結可用（直接影音 URL 且來源允許網站讀取）、作品頁為何不支援、WAV 比壓縮音訊大、本機模式不需要外網取得媒體。

title/description/H1 不使用「全平台」「YouTube 下載器」等未完成承諾。首版候選 noindex；正式 URL 尚未發布不可假裝可用。兩語 hreflang + x-default、各自 canonical、matching-language home link、robots/sitemap 由正式 build origin 開關產生並檢查。任何索引狀態不得與實際 build mode 矛盾。

CSP default-src 'none'; script/style 僅 self（結構化資料若採 inline 須固定 hash）；connect-src 'self' https: 是此工具為明確使用者媒體請求所需的例外，不能套用其他工具 connect-src none。media-src blob:；img self/data 若必要；font self；base-uri/form-action/object-src/frame-ancestors 禁止。no-referrer、nosniff、禁 iframe、無外部資產／telemetry／storage／beacon。不要把可連 https 當成會自動連網；由實際 Network gate 驗。

## 檔案邊界與交付

原對話可改此工具 public/、test/、scripts/、package.json、.gitignore、dist/、HANDOFF.md、TASK-ENTRY.md、project.json，以及本輪 evidence owner/。保持 src/core/ 四個檔案不變、歷史 dist-core 不變；新瀏覽器可測純模組放 public/assets/，不 import Node API。可調整 check/build 加靜態 app gate，但不得刪弱 M0 測試；原 139 項仍執行。零 runtime/dev 依賴，不下載 engine/codec。主代理管理規格、首頁、部署、看板；你不改共享路徑、不委派、不自行用瀏覽器。

新增 scripts/serve.mjs 僅 loopback 預覽；不自動開分頁。build 產 dist 及 hash manifest，release mode 精確 HTTPS origin 驗證，default preview noindex；拒絕 symlink/path escape。提供一個同站合成小 WAV demo（自行產生假聲音，不包含人聲／外部素材）；只按 demo 按鈕才讀取，可不播放音效。demo 不得放寬使用者 URL 的 HTTPS 規則，可用明列同站 resource 路徑獨立入口。

## 驗收矩陣

- 單元：URL 非法／有效／簽名 query 保存；實際串流已知/未知/虛報/超限/empty/timeout/cancel；MIME與簽章錯配；WAV header/frames/channels/16-bit裁切；取消解碼晚回／來源修改／重入／重複按鍵；object URL revoke 所有終點；preview/release SEO 與資產閉合。
- 主代理獨立瀏覽器：原始 HTTP bytes 與候選相同；雙語 demo 原檔輸出逐 bytes 相同、WAV parse 正確；local fake File 到 WAV；自控來源 CORS 成功／失敗、HTML拒絕、下載未完成取消、stale 輸出失效；無外部背景請求／storage、console errors；320px/桌面截圖。真原生選檔／保存／OS下載和真裝置視為 NOT_RUN，不能以 protocol 下載代替原生人工驗收。
- 瀏覽器只能由主代理在已審查 station-v3 private noninteractive station + desktop + job + native sandbox + guards 中操作；功能對話禁止 CUA/IAB/Playwright/任何 native UI 操作。Edge 若無安全隔離仍 NOT_RUN；不降低舊影片工具 Chrome＋Edge 的 gate。此新工具必須如實列已測引擎，不自行擴充支援宣稱。
- 每次長測試前後完整 persistent-environment guard Snapshots 相同。回報檔案清單、命令/exit/真正 PASS 數、固定 source hash、已知限制、未測項、是否 FROZEN。遇架構無法落實、權限／依賴／範圍需要擴大或兩次相同失敗無進展時停相依工作，回報具體證據，不假通過。

參考：[Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)、[decodeAudioData](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData)、[revokeObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static)。
