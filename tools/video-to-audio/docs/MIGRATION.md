# R11 M1：影片取出 MP3 音訊來源交接

這是來源遷移與依賴復原候選。產品頁保留原來的停用選檔／轉換及 noindex。原 owner、claim、Chrome＋Edge 範圍和 T02 全部要求不變；本 PR 不交驗完整產品，不部署。

[原候選](https://github.com/KYStr/glossquote-labs-home/tree/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/candidates/11-video-to-audio)以同一 Git subtree `c68ae546308b7d89ad469e08355858d40546d558` 原樣搬入中央 [copy commit](https://github.com/KYStr/glossquote-labs-home/commit/9db5a69ffc80b8f43616f33badc9d20cb112f1dd)，只新增這個目錄的 30 檔。 [逐檔對照](SOURCE-INVENTORY.json)含 path、bytes、Git blob 和 SHA-256：本機 56、公開 30，共同 28 檔相符，本機另有 17 份文件及 11 個 vendor 檔。後續 commit 加入復原與證據；沒有改 copy 的 30 個檔案。

原 [SPEC](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/11-video-to-audio/SPEC.md)和 [task brief](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/items/11-video-to-audio.json)保留。舊相對 HANDOFF 在候選內沒有檔案；用[固定封存 HANDOFF](https://github.com/KYStr/glossquote-labs-home/blob/28003ee85406a8e846b54ec4e9ab71af0807e520/coordination/local/2026-10-29/handoffs/11-video-to-audio/HANDOFF.md)及[獨立規格覆核](https://github.com/KYStr/glossquote-labs-home/blob/62d52ba93a60e225834aba289dabc65aecb406ef/docs/repairs/2026-11-09/media-spec-review/REVIEW.md)補追溯。規格審查只確認文件，不能代替產品驗收。

## 在乾淨副本復原並核對

從這個候選的乾淨 checkout 進入 `tools/video-to-audio`。保留 Git 原始 bytes；Windows 若會轉換換行，可用 `git -c core.autocrlf=false clone` 建立新副本，無需改 Git 設定。需要 Node 24+，不執行 npm 安裝或上游套件程式。初次復原只向固定 npm／GitHub URLs 讀取；後三個產品檢查使用本地檔案及合成 fixture。

```sh
node scripts/restore-pinned-runtime.mjs --fetch
node scripts/restore-pinned-runtime.mjs --verify
node --test "test/*.test.mjs"
node scripts/check.mjs
node scripts/build.mjs
```

Git 候選不含 vendor；`--fetch` 按原 lockfile 固定 URL、SHA-512，另比對 tarball bytes／SHA-256，再只讀取完整性已核對的預定檔案。每個 JS/WASM 及授權檔必須符合 [供應清單](RUNTIME-SUPPLY.json)／原 runtime manifest。全部資料通過才建立新輸出；既有 vendor 不覆寫，`--verify` 不連外。若磁碟失敗留下未完成目錄，保存錯誤並用另一個乾淨副本，勿以殘留檔案通過 build。正常 build 輸出只在副本的 dist，未進 Git。

[本輪檢查](VERIFICATION.json)實測恢復 9 個執行資產及 2 個授權文本，離線測試 18/18、check/build 各 exit 0、21 個 public 檔。重複 restore 依預期 exit 1 並拒絕覆寫。介面仍停用；這些命令不會啟動瀏覽器或通過完整 T02。

## 依賴、授權及可發布大小

維持單執行緒 @ffmpeg/core 0.12.10、@ffmpeg/ffmpeg 0.12.15、@ffmpeg/types 0.12.4。wrapper／types 是 MIT，core metadata 是 GPL-2.0-or-later。九個執行檔共 32,360,894 bytes。MIT 與 GPL 授權原文從固定 commit 取得並核對；這裡沒有分發 runtime 二進位。

保留 [ffmpeg.wasm v12.15 固定 recipe](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/71aa99d37c02a7b4c435275ca9ef50e612f6efa1/Dockerfile)、[FFmpeg n5.1.4 固定來源](https://github.com/FFmpeg/FFmpeg/tree/4729204c17f756e186d622060088371d10b34f7e)和 Emscripten 3.1.40 資訊。recipe 的部分 codec 仍使用可變 branch（如 x264 4-cores、lame master），尚未證明是精確 binary build 的完整對應來源。上游成品可重取與 GPL 對應來源完備是兩件事；後者保持未完成。

WASM 32,232,419 bytes（SHA-256 `9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7`），超過 [Workers Static Assets](https://developers.cloudflare.com/workers/platform/limits/#static-assets)及 [Pages](https://developers.cloudflare.com/pages/platform/limits/#file-size) 25 MiB 單檔上限 6,018,019 bytes。壓縮 tarball 可重取不會改變現行載入器需要完整 WASM 的限制。若另核准同源分段，需固定各段與重組後的 hash、維持取消／記憶體預算、重新驗完整 Network／offline；本次沒有更動載入器、配置服務或提出已可部署的承諾。

[NEW22 修訂 2 來源保存](new22-r2/README.md)只重現靜態證據。[Gate ledger](GATE-LEDGER.json)保留歷史 FAIL、局部 PASS 與未驗。Edge G1/G6 沒有進到產品操作；未知助手沒有被查詢或白名單化。下一步由主代理獨立審查本 M1 commit。完整原生及 Chrome＋Edge T02 要等可證明安全的測試能力；T03 之前不得跳過。
