# 固定候選與資產研究

研究日期：2026-10-10。T01 的選擇是本機 spike 候選，不等於瀏覽器支援或正式發布成功。

| 套件 | 固定版本／官方來源 | 授權與決定 |
|---|---|---|
| @ffmpeg/ffmpeg | 0.12.15；[npm registry](https://registry.npmjs.org/@ffmpeg/ffmpeg/0.12.15)、[官方固定版本](https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v12.15/packages/ffmpeg) | MIT；保留上游 copyright 與全文。採原生 dist/esm，不用 UMD 或 CDN。 |
| @ffmpeg/core | 0.12.10；[npm registry](https://registry.npmjs.org/@ffmpeg/core/0.12.10)、[官方固定版本](https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v12.15/packages/core) | GPL-2.0-or-later；單執行緒，禁止 core-mt。Wrapper MIT 不替代 core 的 GPL。 |
| @ffmpeg/types | 由 wrapper 的 ^0.12.4 引入；實際精確版本／integrity 由 lockfile 記錄 | MIT；僅型別，不放入瀏覽器 runtime。無其他直接候選。 |

官方 [v12.15 release](https://github.com/ffmpegwasm/ffmpeg.wasm/releases/tag/v12.15) 同時發行 wrapper 0.12.15／core 0.12.10；前一版已加入 ffprobe，固定版本原始碼也具備該呼叫。[API](https://ffmpegwasm.netlify.app/docs/api/ffmpeg/classes/ffmpeg/) 的 load、ffprobe、exec、writeFile、readFile、deleteFile、terminate 對應此候選；API 存在不能代替 T02。

## 可分發條件與 build 來源

本工具只有本機、公開開源用途；不需要付費授權、雲端 API、帳號或新權限。候選組合以 GPL-2.0-or-later 的 core 授權處理，不以 wrapper 的 MIT 宣稱整個引擎是 MIT。再分發時須保留各組件的授權、著作權、對應原始碼與 build 方法；不得只發 WASM 而移除 GPL 告知。正式來源／hosting 副本須再核對完整來源分發清單，本研究不聲稱為獨立法律審查或專利保證。

- [固定 Dockerfile](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/v12.15/Dockerfile)：FFmpeg n5.1.4、Emscripten 3.1.40；enable-gpl、libx264、libx265、libmp3lame 及其他列明 codecs/libraries。未見 enable-nonfree。
- [ffmpeg build script](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/v12.15/build/ffmpeg.sh)：沒有停用 lavfi/AAC/H.264；FFMPEG_ST 分支停用 pthreads/w32threads/os2threads。
- [WASM link script](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/v12.15/build/ffmpeg-wasm.sh)：包含 ffprobe.c、FFMPEG_ST 初始32MB及可增长記憶體、ENVIRONMENT=worker、EXPORT_ES6；不是多執行緒1024MB分支。
- [官方固定 worker](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/v12.15/packages/ffmpeg/src/worker.ts)：同源 module Worker 內 import 固定 ESM core；明確傳 coreURL/wasmURL/classWorkerURL，禁止走默认 unpkg CORE_URL。沒有任何使用者自由參數。
- [core 授權欄](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/v12.15/packages/core/package.json)、[MIT 原文](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/v12.15/LICENSE)、[FFmpeg 官方授權說明](https://ffmpeg.org/legal.html)。GPL 啟用後不可用只有 LGPL 的清單代替。
- 上游 Dockerfile 的部分外部 codec 使用 branch 名稱（例如 x264 4-cores、lame master）。記錄固定 release 的 recipe，不將這些可移動 branch 謊稱 immutable source revision；發行對應原始碼的完整性仍是正式分發前必驗項。此風險不改變公開套件的 GPL 類別，也不授權靜默換 build。

AAC／H.264 解碼、libmp3lame 編碼、lavfi color/sine、ffprobe JSON 輸出：來源支持可測候選；均必須在 T02 執行，未實测前不寫已支援。

## 資產預算與清單

只 stage dist/esm 的必要 JS 及單一 ffmpeg-core.wasm。所有執行檔由同源 `/vendor/ffmpeg/` 供應，禁止 runtime CDN、@ffmpeg/util、SharedArrayBuffer、外部 Worker、preload 大型 WASM、遠端備援。

初步清單：wrapper 的 index.js、classes.js、const.js、errors.js、utils.js、worker.js；T02 import closure 發現還需 types.js，已按原文 stage；core 的 ffmpeg-core.js／ffmpeg-core.wasm。授權另保留，不能從這份計畫推斷 hash。

- 硬預算：所有 manifest 執行資產合計 ≤83,886,080 bytes（80 MiB）。
- npm unpackedSize：wrapper 71,999 bytes；core 64,689,644 bytes，含 ESM＋UMD 兩份，不能當成實際瀏覽器下載總量。
- T01 `public/runtime-manifest.json` 的 files 空陣列是尚未 stage 的不可載入占位；bytes/sha256 均未取得，沒有假值。T02 必須用實際 bytes 填完整有效 manifest 後才允許載入。
- JS 的完整性於 stage/check/build 重新計算；不得聲稱原生 dynamic import 本身具有 SRI。WASM 在執行時按 manifest 檢查 bytes＋crypto.subtle.digest，再由已驗證 bytes 建立內部 Blob URL 載入，dispose 撤銷。
- wrapper 沒有將上游 log 接 console；應用也不掛 log callback。固定名稱 input.mp4／output.mp3／probe.json。產品错误僅固定代碼，不包含 stderr 或檔名。

## 真實研究證據

專用、不發布的 `.runs/video-to-audio/20261010-thread-11/{ffmpeg,core}-metadata.json` 保存 registry 的精確版本、tarball、SHA512 integrity 與 registry signature。lockfile 是安裝 pin 的實際依據；安裝全程 ignore-scripts，cache 只在本工具專用 .runs。

T01 狀態：版本候選與授權分類已核實，可進本機 T02；任何 runtime 能力、效能、記憶體、音質仍未驗證。完整 binary 再分發來源核對與正式部署未執行。

## T02 實際取得與否決（2026-10-10）

- `npm ci --ignore-scripts` 實際取得 lockfile 三包；stage 沒有手改上游 JS／WASM。9個 manifest資產合計 **32,360,894 bytes（30.86175 MiB）**。每檔 bytes／SHA256 已寫入 runtime-manifest.json，check/build及離線tests重新核對。
- wasm：32,232,419 bytes；SHA256 `9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7`。
- npm 套件沒有隨附 license 全文；stage 另由官方固定 release 的 MIT LICENSE 與 FFmpeg n5.1.4 COPYING.GPLv2 取得原文，存 public/vendor/ffmpeg 各版本目錄。這不等於已完成整個 GPL binary 再分發的對應來源包；沒有發布。
- 本機引擎 `-version` exit0，回報 FFmpeg5.1.4／enable-gpl／libx264／libmp3lame／disable-pthreads。lavfi 合成10秒 MP4 exit0，藍底＋440Hz音，不含真人或私人內容。
- **否決候選**：Chrome154.0.8037.98與Edge154.0.4258.62 的 `ffprobe` 都回傳 **-1**，不是規格必要的0。沒有解析非零退出碼結果作成功，也沒有對-1做值映射、修改vendor或繞過probe。
- 官方 [issue817](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/817) 記錄 core0.12.10的同一退出碼問題；2026-10-10 registry可取得的正式core最高仍是0.12.10。該 issue 出現後續修正 commits，不代表已發行npm資產可用。這是與本機證據相符的上游線索，不把issue陳述代替實測。
- T02 **FAIL / BLOCKED**。後續不得使用此候選宣稱產品已支援；完整媒體gates、產品雙語與SEO、公開来源及hosting皆未完成。詳見 SPIKE-RESULTS.md。

## MEDIA-11-UNBLOCK：第一方綁定入口（2026-10-11）

- 官方 registry 此次重新核對仍是 core0.12.10／wrapper0.12.15；沒有宣稱 issue817 所提 commit 已出現在 npm binary。metadata 保存在 `.runs/video-to-audio/20261011-unblock/registry-metadata.json`。
- 根因依 [v12.15 bind.js](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/v12.15/src/bind/ffmpeg/bind.js) 與 [v12.15 ffprobe.c](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/v12.15/src/fftools/ffprobe.c) 核對：JS 呼叫 `_ffprobe` 卻丟棄正常回傳；C 主函式直接回傳成功／失敗狀態。wrapper 讀仍為 -1 的 `ret`，因此正常探測被拒絕。
- [參考修正 commit 62abe284bb29774bb73140262a8dd8b514a22112](https://github.com/ffmpegwasm/ffmpeg.wasm/commit/62abe284bb29774bb73140262a8dd8b514a22112) 留住 native 回傳並處理多次命令的 C 全域狀態。這是 source-level 線索，沒有下載或執行該 commit 的 binary、沒有套用其 codec/build 改動。
- 主代理已核准 bounded candidate 調整：`public/js/core/ffprobe-core.mjs` 匯入未修改的固定 core factory；`ffprobe-return.mjs` 在原始綁定呼叫內攔截實際 native 回傳，只有 signed-i32 整數可進 `ret`，沒有將 -1 映射成0。正常 native 非零仍傳回非零；trap／無回傳／不合法狀態被拒絕，不能靠 JSON存在判成功。
- `isolated-probe.mjs` 為每次探測建立新的官方 module Worker，完成、失敗、取消皆終止。C option、log callback、section 選取與上游 argv 分配只存在該 Worker；本橋接不額外分配 C argv，也不假称手動 free 未匯出的配置。這避免把官方 C globals 尚未完整 reset 的風險藏在重用實例後面。
- 官方 JS/WASM 九檔、package.json、lockfile、runtime-manifest 皆未修改；vendor-byte-proof.json 再與 node_modules 的固定 npm 原檔逐項核对 SHA256。WASM仍32,232,419bytes、SHA256 `9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7`。新的第一方三個模組由同源 build/check 管理，不冒稱為上游發行。
- Chrome/Edge 的狹義有效／無效探測與一個MP3輸出 PASS，詳細見 SPIKE-RESULTS。全 T02 仍 BLOCKED：速度、renderer+worker記憶體、完整取消、品質、離線與Network gate仍須測量。新建探測Worker的初始化／拷貝成本須計入後續量測；沒有用本次短片結果推定50MiB或180秒最壞情況性能。
- 來源／GPL 再分發條件與正式 hosting 仍待主代理整合；此修改沒有新增來源發布、CDN、雲端fallback、權限或憑證操作。
