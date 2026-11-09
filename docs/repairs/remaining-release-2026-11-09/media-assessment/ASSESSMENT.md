# R11 / R12 媒體發布阻塞核對

2026-11-09；唯讀範圍。遠端規則、START-HERE、handbook、workflow、command contract 已讀，原始 public registry revision 1305 / contract 2026-10-29.1。兩項 production 都仍 blocked，原 owners、claims、候選與歷史證據保留。下列證據未改工具程式、registry 或發布。

| 工具 | 本輪讀回的固定來源 | 未發布原因 |
| --- | --- | --- |
| 影片取出 MP3 | [PR175](https://github.com/KYStr/glossquote-labs-home/pull/175) open；head `543a14bd1ef6e605e1d5323663813312c21ef5ff`；純遷移 `9db5a69ffc80b8f43616f33badc9d20cb112f1dd` | 主頁仍為停用 scaffold，T03 未開始；WASM 資產單檔超限、未建立 GPL 完整對應來源；Chrome+Edge 當前完整 T02 未通過。 |
| 短音檔本機逐字稿 | [PR181](https://github.com/KYStr/glossquote-labs-home/pull/181) open；head `c4db2022957cb57b6e782dc61a9e37bb2414fdd3`；純遷移 `2c0c8815064dbcd74b6446e14b9e1e44c8db5bac` | 主頁仍為停用 scaffold，T03 未開始；decoder 離線分片未接 Worker，當前 Chrome+Edge 完整 T02 未通過。 |

既有 `media.glossquote.com` 是另案 Web Media Saver（#38），不算上述兩款網站已部署。

## R11：可修的傳輸上限與獨立的來源障礙

本機 WASM 32,232,419 bytes，SHA-256 `9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7`。 [Workers 靜態資產](https://developers.cloudflare.com/workers/platform/limits/#static-assets) 每檔上限 26,214,400 bytes；20 MiB 和 11,260,899 bytes 的固定切片均可容納，已獨立串流核對每片與原始整體 SHA-256。

最小修法：以固定 manifest 把 WASM 維持為邏輯資產、列明同源物理切片位置及每片長度與 hash。Loader 每片順序串流至同一有界 Uint8Array，拒絕錯誤 MIME、非 200、redirect、超長、短讀、切片及全檔 hash 不合、取消或超時；所有驗證通過後才呼叫原本 Blob URL 路徑。既有 FFmpeg adapter 已把 Blob URL 傳入 core 與 isolated ffprobe，因而可保留全部官方 vendor 位元組、ffprobe native-return 與單執行緒。建置產物不可含完整超限 WASM；內容可用但不得先行公開含 WASM 的測試資產。涉及 `public/runtime-manifest.json`、`public/js/core/manifest.mjs`、`public/js/ffmpeg-adapter.mjs`、`scripts/{restore-pinned-runtime,stage-vendor,build,check,serve-spike}.mjs` 與 manifest/fault tests。

現有 M1 有 MIT、GPL 原文和固定 npm binary 還原，但沒有完整對應來源。上游 [v12.15 Dockerfile](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/71aa99d37c02a7b4c435275ca9ef50e612f6efa1/Dockerfile) x264 取 `4-cores`，lame 取 `master`，還要核對其他 linked codec 與 patches。已查 [npm metadata](https://registry.npmjs.org/@ffmpeg/core/0.12.10) 的 gitHead 與 dist.attestations 均空、dist 為 5 檔；[GitHub v12.15 release](https://github.com/ffmpegwasm/ffmpeg.wasm/releases/tag/v12.15) 無另外上傳的附件。這不證明上游一定不存在紀錄，但目前證據不能把當前 branch snapshot 當該 binary 的 exact source。保持部署 fail closed。可用的下一條路是取得可信 release-time pins / build 證據與所有 source/patch/build scripts；若無法取得，需另審查從完整固定來源重建引擎、發布對應來源並針對新 binary 全量重驗，不可偷偷改 codec 或引擎。

進一步核對：npm packument 顯示 0.12.10 發行時間 2025-01-07T10:13:14.328Z。公開 Actions 查 exact tag head 為 0 筆；同 tag 的 [CI.yml](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/71aa99d37c02a7b4c435275ca9ef50e612f6efa1/.github/workflows/CI.yml) 雖含 `make prd`，cache key 只覆蓋 Dockerfile、Makefile 與 build scripts，沒有輸出 codec commit lock。不能用上傳日期前最後一個 branch commit 推定建置內容。主機上可查得 docker.exe、wsl.exe、cmake、ninja；Docker Linux engine named pipe 不存在，WSL 列出 docker-desktop，PATH 查無 emcc、clang、make。沒有啟動 Docker/WSL distro、安裝或修改環境。

## R12：分片實際存在，瀏覽器尚未使用

M1 decoder 53,707,539 bytes、SHA-256 `a6beb6baabb66f00b6a686d828c95ffca6146d51900cbad0266cad38f64cf861`。 `scripts/prepare-decoder-chunks.mjs` 會輸出兩片 20 MiB 加一片 11,764,499 bytes 到 runtime prep，狀態明列 `PREPARED_NOT_DEPLOYABLE`。實際原始 decoder 位元組重切所得逐片雜湊與三個固定值一致。Encoder 23,200,850、ORT WASM 21,596,019 bytes 均不超限。M1 的 `public/model-manifest.json` 仍列完整 decoder；`AssetLoader.load` 仍 fetch 該單檔；`transcribe.worker.mjs` 再從 loader 的 in-memory fetch 讀模型。只上傳切片會壞，只上傳完整 decoder 會超限。

R12 現行工具子樹 `f39b79adca3f8abd9aee20744b3258b57197ca60`；對照遠端未截斷 recursive tree，本機 `.runs/central-archive-reissue-2026-11-09/primary-r12/tools/audio-transcription` 的 96 個 Git blobs 全部相符（未套用 Git filters）。

最小修法：重用固定切片 plan，讓 build/check/serve 按同一實體資產 closure，產物只保留切片；AssetLoader 中每片直接填入同一預配置 logical decoder buffer，依序核對片與整體完整性，不收集所有片後再複製，進度按收到的 decoder bytes 只計一次。只把完整驗證的 logical path 交既有 Transformers loader；沒有完整單檔網路 fallback。避免變更模型、量化、引擎及 inference 設定；維持固定 abort/故障證據與 clear。檢查 `scripts/{prepare-decoder-chunks,stage-model,verify-assets,build,check,serve-spike}.mjs`、`public/model-manifest.json`、`public/js/core/manifest.mjs`、`public/js/asset-loader.mjs`、`public/js/transcribe.worker.mjs` 及相關 loader/staging/receipt 測試。若變更實際讀取 receipt 分類，對新分片路徑/ordinal 保留一一對應，不借舊 NC25 結果補新 Network。

歷史 Chrome155 R11 scoped PASS：三輪 37 項、234 筆 OS samples、Private 峰值增量 1.2228889465 GiB ≤ 1.5 GiB；保留更早的 1.681110／1.931442 GiB FAIL 與 NC25 69 FAIL / 3 缺 native terminals。現有資料只證明舊 scoped worker 的功能及品質可行；新傳輸需以固定合成中英／silence fixtures 重驗輸出內容、WER/CER、取消、離線和 RAM。

## 測試與隔離

- [切片位元組證據](slice-proof.json)：未寫實體切片、未啟動瀏覽器。原 16 項 [CLI checks](offline-baseline.txt) 通過，含精確資產 closure、404／tamper、native-return 控制、同源限制、abort。 [環境前](environment-before.json)／[環境後](environment-after.json) SHA-256 相同 `ea0bbfd445a4f59d1e16fe8649003024a46c63c8d04802063a0c0777a9ce68ba`。
- Dot GPU 的 capabilities 與 canonical operations 三頁均已讀（SHA-256 `4c2706f2d1211c273ebc514b1527d24c4e06d8e0d7f8c0c882faee409d19b259`）。可執行已入庫、有限額、離線 WebGL 的背景 Chrome；工具沒有 Edge、任意 URL/CDP Network、fixture 注入、原生對話或 OS media PID/記憶體採樣。未申請 lease 或執行互動。
- 既有 Cloudflare 隔離遠端 Chromium 可作限定的候選功能／transport smoke，但不等於 Windows Chrome/Edge 或 renderer+Worker OS Private / WorkingSet。工具目錄沒有直列 Cloudflare Browser connector；此前已記錄由主代理使用既有遠端 Chromium 路徑取得限定 smoke。
- R11 歷史 Chrome155 G1/G6 scoped PASS；Edge155 對應動作未開始，缺同時期 identity_helper generation/job/desktop proof；NEW22 R2 只有 static/compile PASS。R12 NC25 transport/classifier 只有限定診斷修補，native/CDP、PID 與完整 T02 未跑。IAB hidden 不構成隔離；這輪不啟動本機互動 UI、原生對話、鍵鼠／IME／剪貼簿。
- 要結案仍需已驗證不共用使用者桌面／輸入的 Windows 環境，以現有 Chrome 和 Edge 實際跑 Page＋Worker Network、真正 offline、故障、輸出、取消、連續恢復和每秒 OS 記憶體，依固定測試入口綁定 PID / FILETIME / job/desktop 身分及清理。保留 Chrome+Edge 支援；以上證據缺失時保持 `NOT_RUN_USER_FOCUS_INCIDENT`。
