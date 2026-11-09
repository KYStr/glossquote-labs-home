# MP4 影片轉 MP3

## 本次實作狀態（2026-10-10）

**T02 FAIL / BLOCKED，尚不能轉換。** 已實作原生ESM安全預覽、固定依賴/manifest/完整性工具鏈與合成media瀏覽器spike；Chrome154.0.8037.98、Edge154.0.4258.62生成10秒假片成功，但 @ffmpeg/core0.12.10 的ffprobe皆回傳-1，違反必要exit0規格。沒有用非零結果放行。

詳見 [RELEASE-CANDIDATE](docs/RELEASE-CANDIDATE.md)、[SPIKE-RESULTS](docs/SPIKE-RESULTS.md)、[HANDOFF](HANDOFF.md)。自動6/6、check、build通過的是骨架與資產檢查；完整MVP/雙語產品/SEO未完成，来源未發布、網站未部署。

Node24+；在本工具目录執行 `npm.cmd test`、`npm.cmd run check`、`npm.cmd run build`。`npm.cmd run dev` 只綁127.0.0.1:4191、只供public，頁面noindex且選檔disabled。真正合成測試用 `node scripts/serve-spike.mjs` 在127.0.0.1:5191/spike/index.html；先取得TASK-ENTRY指定的短期媒體量測鎖，不與另一媒體任務重型量測重疊。埠占用時選空閒loopback埠並記錄，不終止別人的程序。

若從來源重新取得依賴：按DEPENDENCIES與TASK-ENTRY，先環境guard、`npm.cmd ci --ignore-scripts`（cache限定專用目錄）、`node scripts/stage-vendor.mjs`、check，後再guard。不修改持久PATH/TEMP/TMP。只支援核定公開候選，不用遠端API或CDN。下一步在T01核实具有ffprobe修正的正式單執行緒core並重測T02；不得進產品milestone略過失敗。

以下保留初始藍圖說明；實際進度以上述記錄與HANDOFF為準。

這是規格，尚未實作。品牌：GlossQuote-Labs。識別：`video-to-audio`。本案有必須先通過的技術驗證閘門。

給手上已有一段短 MP4、只想保留聲音的人。MVP：選取符合限制的 MP4，在裝置上的瀏覽器轉成固定規格 MP3，試聽並手動下載。

第一版的「影片轉音訊」明確限 MP4（H.264 視訊＋AAC 音訊）→ MP3，不支援網址下載、串流、DRM、任意格式、長影片、裁切或批次。這是重新編碼，不能宣稱無損提取。

難度高。候選依賴為 `@ffmpeg/ffmpeg` 與單執行緒 `@ffmpeg/core`；實作時先核實固定版本、授權、實際檔案大小與同源資產清單。本文件沒有指定虛構「最新版」。50 MiB／180 秒只是保守產品上限，並非現在已證明可跑。

先完成較簡單工具，再按本案 T00–T02 做技術 spike。記憶體、速度、音質、取消或資源來源任一必須條件不過，就停在本工具，記錄未通過，不改用雲端、不假裝完成。

閱讀 [START-HERE](START-HERE.md)、[AGENTS](AGENTS.md)、[品牌](docs/BRAND.md)、[工程](docs/ENGINEERING.md)、[隱私與安全](docs/PRIVACY-SECURITY.md)、[設計](docs/DESIGN-SYSTEM.md)、[產品](PRODUCT.md)、[技術](TECHNICAL.md)、[介面與 SEO](UX-SEO.md)、[驗收](ACCEPTANCE.md)、[任務](TASKS.md)、[HANDOFF](HANDOFF.md)。資料夾可獨立複製，套件及測試媒體目前都不存在，不能直接執行尚未建立的腳本。
