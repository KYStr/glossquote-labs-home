# 可行性與來源（查證2026-10-22）

> 最新決策：使用者已選 C 純網頁／全部本地／可讀來源限制，依 [WEB-M1](WEB-M1.md) 實作；不採下方 yt-dlp／FFmpeg／ZIP 方案。下方保留 M0 調查的歷史記錄，不代表現行依賴或支援平台。

主代理閱讀以下第一方來源。以下是技術／產品推論，不是平台下載實測、下載權利或持續相容保證。未下載或執行這些專案binary。

| 來源 | 採認內容與決策 |
|---|---|
| [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) | 網頁跨origin讀取受來源伺服器CORS政策限制；靜態工具無法自行替第三方加授權header。因此純前端無法可靠通用讀取平台媒體。 |
| [yt-dlp README](https://github.com/yt-dlp/yt-dlp) | CLI下載引擎候選；影音合併／抽音需FFmpeg/ffprobe，YouTube完整支援另有EJS及JS runtime需求。只列候選，不在M0安裝。 |
| [yt-dlp supported sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) | 上游extractor名單會隨平台改動失效，列出不保證工作；GlossQuote每平台版本須自己驗，不能宣稱數千平台通過。 |
| [yt-dlp EJS](https://github.com/yt-dlp/yt-dlp/wiki/EJS) | 需匹配引擎與元件版本；有下載remote component的方式，但本案不自動執行任意最新遠端元件，先固定distribution/hash/license。 |
| [YouTube自行上傳作品下載](https://support.google.com/youtube/answer/56100?hl=en) | 官方可透過Studio或Takeout取自己的作品；與Premium離線播放不同，不把離線快取等同任意可匯出檔。 |
| [Vimeo下載](https://help.vimeo.com/hc/en-us/articles/12426502581265-How-to-download-a-video-on-Vimeo) | 官方下載按鈕由擁有者啟用；網站下載許可與技術解析能力須分開處理。 |

候選平台分層：YouTube/Vimeo/Bilibili為首批技術實測目標；TikTok/Instagram/Facebook/X/SoundCloud為後續目標。全數目前只有URL識別規格，下載狀態NOT_RUN，且登入或反機器人需求可能阻擋。沒有宣稱官方合作/API授權、目前每個extractor正常或內容可合法下載。

2026-10-22使用者提出使用時下載臨時檔案、完成刪除；採ZIP便攜方式，免永久安裝但仍需使用者手動解壓/執行/關閉/刪除。網站無法自動執行本機binary；若改成只有browser暫存WASM，仍有CORS與平台限制，不能當通用解法。桌面作業系統與行動瀏覽器不能混稱相容。

11-video-to-audio只處理固定本機短MP4，12為本機逐字稿；可借鑑jobId/cancel/cleanup設計，不把它們當已通過的網頁下載依賴或重寫其Chrome＋Edge門檻。
