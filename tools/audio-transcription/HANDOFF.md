# 音訊轉文字 R12 M1

狀態為來源遷移與離線資產準備。首頁是標記 `noindex` 的預覽，未提供正式選檔與轉錄介面。瀏覽器推論仍在既有 Worker 與測試頁驗收階段。

## 固定來源

GitHub 登記簿在第 1265 版讀回 `resume` operation `r12-20261109-m1-resume-12189a61-c3d4-45a1-a73e-594f7f1e8860`。原 owner `local-codex:01a12398-f45b-72d1-8690-66d3b6b7e93e` 持有原 claim `migration-12-adopt-1793225004019`。

先以獨立提交把固定候選的 91 個檔案、6,366,473 bytes 搬到 `tools/audio-transcription/`。搬移前後的子樹都是 `09afe2318d5829e6d2357a2203cee4b62ddfedf4`。這個提交保留原檔內容和模式。[固定來源](https://github.com/KYStr/glossquote-labs-home/tree/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/candidates/12-audio-transcription) · [搬移提交](https://github.com/KYStr/glossquote-labs-home/commit/2c0c8815064dbcd74b6446e14b9e1e44c8db5bac)

M1 增加復原與分片準備腳本、回歸測試和驗證記錄。公開來源包含 13 個既有合成音訊 fixtures；102,581,371 bytes 的模型、runtime 和相關授權檔透過固定來源復原。[規格](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/12-audio-transcription/SPEC.md) · [獨立規格審查](https://github.com/KYStr/glossquote-labs-home/blob/62d52ba93a60e225834aba289dabc65aecb406ef/docs/repairs/2026-11-09/media-spec-review/REVIEW.md) · [歷史 HANDOFF](https://github.com/KYStr/glossquote-labs-home/blob/28003ee85406a8e846b54ec4e9ab71af0807e520/coordination/local/2026-10-29/handoffs/12-audio-transcription/HANDOFF.md)

## 復原模型與 runtime

使用 Node.js 24 以上，從本工具的目錄執行。請使用自己的工作副本和支援硬連結的本機檔案系統。復原程序先驗完整暫存資產，再放入 `public/`。若目標已存在，該檔必須符合固定大小和 SHA-256；檢查失敗會停止並保留衝突檔。

若已有另一份完整的資產目錄，用以下命令離線復原。參數指向含 `model-manifest.json`、`models/`、`vendor/` 的 `public/`；缺檔、雜湊不符或含未列出的資產都會中止。

```sh
node scripts/stage-model.mjs "--from-verified-public=/absolute/path/to/verified/public"
node scripts/verify-assets.mjs
```

從公開來源取得時，在乾淨、無憑證的工作副本依 lockfile 準備 npm 套件。以下步驟需要網路並停用 npm lifecycle scripts。腳本按清單取出固定套件成員、下載指定的模型與授權檔，逐檔驗證大小與 SHA-256。此取得路徑在本輪列為 `NOT_RUN`，離線復原與驗證已實際執行。

```sh
npm ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org
node scripts/stage-model.mjs --from-pinned-sources
node scripts/verify-assets.mjs
```

模型維持多語 `Xenova/whisper-base@64da57285918e20ea79ea5c88eed7197933abaa8`，encoder 與 merged decoder 均為 q8。清單列明 19 個資產的 URL 或 npm tarball／成員、位元組、SHA-256 及授權來源。轉換模型卡標示 Apache-2.0，原 OpenAI Whisper 的 MIT 授權另有保留，並附 Transformers.js、Jinja 和 ONNX Runtime 及第三方 notices。[資產取得清單](docs/runtime-acquisition.json) · [執行時清單](public/model-manifest.json)

## 解碼器分片

原 decoder 為 53,707,539 bytes，超過 Cloudflare Workers Static Assets 單檔上限 25 MiB。以下命令在 `.runtime-prep/decoder-*/` 生成三個分片和驗證收據。每片先比對固定 SHA-256，再按 offset 串流讀回，比對原 decoder 的總大小和 SHA-256。網站資產目錄以外的分片只供準備；同源分片載入器、瀏覽器重組與實際發布仍待驗證。[Cloudflare 單檔上限](https://developers.cloudflare.com/workers/platform/limits/#static-assets)

```sh
node scripts/prepare-decoder-chunks.mjs
```

| 檔案 | Offset | Bytes |
| --- | ---: | ---: |
| `decoder-1.bin` | 0 | 20,971,520 |
| `decoder-2.bin` | 20,971,520 | 20,971,520 |
| `decoder-3.bin` | 41,943,040 | 11,764,499 |

## 離線驗證與必要 gate

在獨立工作副本完成離線資產復原、19/19 資產完整性檢查及三片有序重組。Node 測試 55/55、靜態檢查 106 檔和本機建置 29 個公開檔案均 exit 0。建置仍使用完整的邏輯 decoder。[指令、摘要及 gate 狀態](docs/m1-evidence.json)

```sh
node --test "test/*.test.mjs"
node scripts/check.mjs
node scripts/build.mjs
```

NC25 固定版 `NC25-12-INTEGRATED-2026-10-25-v1` 的 153 個來源輸入、20 個候選程式／版本檔和 72 個 inventory 項目已在原保存樹核對。完整重現需該份原始證據樹；共享 GitHub 候選包含工具原始碼和雜湊記錄。歷史 69 個 FAIL、3 個缺原生 terminal 保留，`fullNetworkAccepted` 與 `fullT02Accepted` 仍為 `false`。

Windows Chrome 與 Edge 完整 T02 仍需各自的 cold load、三輪中英 warm 推論、速度與品質、UI 心跳、renderer 和 Worker 的每秒 OS 記憶體、取消／重試、全零音訊、Network／離線及資產故障閉鎖證據。原本的 1.681110 GiB FAIL 與 R11 Chrome 的 1.222889 GiB 子項 PASS 分開保留。這輪瀏覽器、原生終端和取樣的狀態為 `NOT_RUN_USER_FOCUS_INCIDENT`。來源只供 M1 草稿 PR 檢閱，獨立候選審查、正式交驗與上線均待後續 gate。
## R12-T02-TRANSPORT — 固定 decoder 分片接入（2026-11-09）

接續 PR181 固定來源 `c4db2022957cb57b6e782dc61a9e37bb2414fdd3`；維護基線 `7bff5ea27e1181b5bb3b6682439bb302c6cca15d` 的 `tools/audio-transcription/` 子樹 `f39b79adca3f8abd9aee20744b3258b57197ca60`。原所有權、模型、Transformers／ORT、推論設定、來源 manifest、原始候選及停用的選檔介面保留。

- `node scripts/build.mjs` 只在生成的 `dist/model-manifest.json` 加入固定分片描述。19 個邏輯資產仍為 102,581,371 bytes；實體為 21 檔。Decoder 切為 20 MiB、20 MiB、11,764,499 bytes，核對每片和整體 SHA-256。產物不含完整 53,707,539-byte decoder，部署時只可使用已驗證的 `dist/`。來源 `public/` 和原本的開發路徑保留完整固定資產。
- `AssetLoader` 依生成 manifest 只請求固定同源分片，依序串流到一份預配置的完整 decoder buffer，核對狀態、型別、邊界、各片及整體 SHA-256；有取消、超時或失敗就清除資產，沒有完整檔網路 fallback。既有 Worker 繼續用原 logical ONNX URL 讀已驗證的記憶體內容。
- 離線測試用實際固定 decoder 及 loopback HTTP 驗證分片、完整路徑 404、重組和記憶體讀取、拒絕竄改與取消。既有原始準備命令 `node scripts/prepare-decoder-chunks.mjs` 保持可用。未來隔離 T02 可用 `node scripts/serve-spike.mjs distribution --evidence=<任務已核准證據路徑>` 讓 spike 取用 `dist/`，必須先 build。
- 本輪只驗證傳輸。實際 Windows Chrome／Edge 語音辨識、OS 程序記憶體、完整 Network／offline、原生及產品驗收仍未跑；NC25 歷史 69 FAIL／3 缺 native terminals 仍保留。選檔仍停用、未發布；`fullNetworkAccepted=false`、`fullT02Accepted=false`。
