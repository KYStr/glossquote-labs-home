# 圖片列印尺寸試算候選

## 當前 W18-31-M2-20261018

**Source 已公開並固定，等待主代理 M2 主驗；未部署／未更新首頁／未外驗。**

| 項目 | 識別 |
|---|---|
| Public repo | `https://github.com/KYStr/glossquote-labs-print-size`，visibility PUBLIC |
| Fixed local/remote commit | `647b254ce566a519d31fa6c4261d8024009f66de` |
| Branch/default | `codex/print-size-m2-20261018` |
| ZIP | 根 evidence `m2/print-size-source-647b254ce566a519d31fa6c4261d8024009f66de.zip`；44179 bytes、27 files、36 entries、root package.json |
| ZIP SHA-256 | `f08ba94d68afd34adb68db1e3979022e26dc18039ae907cb4835d74b398a76bc` |
| M2 candidate manifest | `m2/m2-candidate-manifest.json`，10196 bytes；SHA-256 `5add7169d5b8f9be2a3be33625ca5dac0afe5022157c90a8ca57af84a9989bcd` |
| Preview asset manifest | `5c708d04f91b64539a9b44f757a85263fb9a2f47f16d024ee40cfbcf0344c1ca`，7 assets，與 M1 相同 |
| Production asset manifest | `df34f6c4405ea026e449ec4ea457d6b8569f12f87954540b24114612903c6f72`，9 assets，manifest 位於 asset directory 外 |
| Gates | 61/61 tests；test/check/build/build-production/check-production/release-check 在 workspace、publishing copy、ZIP clean extraction 全 exit 0；ZIP 每檔 Git blob 比對 PASS |
| Guards | Windows full Snapshots 相同；known-three-file Git settings capture/verify PASS；六規格與 M1 public bytes 相同 |
| Model | 127.0.0.1:5211，PID 77612、session 1131，`node scripts/serve-production.mjs`；actual HTTP probes PASS，非 Cloudflare 真站 |
| UI | **NOT_RUN_USER_FOCUS_INCIDENT**；沒有 M2 browser call／screenshot。禁止任何互動 UI，直到主代理證實真正隔離機制 |

Publishing copy 絕對位置與所有 commands/exit/logs 見 HANDOFF M2 節。固定 commit/ZIP 後工作區狀態更新不再 commit；本狀態檔不在 source ZIP。根 evidence 仍為 `.runs/print-size/w18-31-m1-20261018-01a14c6b/`，M2 在其 m2/。

原有 physical device、Network/Storage、BFCache、native zoom、AT、offline、printing quality 等 NOT_RUN 保留。M1 GO 已收到；M2 primary acceptance、M3/live/homepage 和 external review 仍未完成。

## 歷史 M1 固定候選

候選：**W18-31-M1-20261018**，2026-10-18 固定本機候選，等待主代理獨立驗收／M2 GO。

根 evidence 只使用 `.runs/print-size/w18-31-m1-20261018-01a14c6b/`。

| 產物 | 識別 |
|---|---|
| `m1-candidate-manifest.json` | 38 files、6212 bytes；SHA-256 `7772ad9ff51b1aba6d95c173dd882f29c5a2276c433aedcfc49480fd7ad736eb` |
| `dist/manifest.json` | 7 assets，自身排除；SHA-256 `5c708d04f91b64539a9b44f757a85263fb9a2f47f16d024ee40cfbcf0344c1ca` |
| Node / tests | v24.14.0；`node --test` exit 0，47/47 PASS、0 FAIL、0 SKIP |
| Check / build | `node scripts/check.mjs`、`node scripts/build.mjs` 各 exit 0 |
| HTTP | `verify-preview.mjs` exit 0，actual loopback final bytes / headers / MIME / 404 / HEAD / 405 PASS |
| Guard | 完整 Windows Snapshots 相同；六份固定規格 SHA-256 相同；publication Git guard N/A（未發布） |
| UI | 雙語主流程、C09/C10 exact threshold、錯誤、編輯失效、清除／語言取消與確認、320px 鍵盤、C15 extreme PASS；最終兩語截圖為 `ui-final-zh-desktop.png`、`ui-final-en-320.png` |

Manifest 凍結產品、tests/checklist、dist 與固定契約。為避免循環，不列自身及 HANDOFF/START-HERE/TASK-ENTRY/project.json/本候選記錄；這五個檔案只維護狀態。詳見 HANDOFF 與 `test/browser-checklist.md`。

明示 NOT_RUN：真實 JS-disabled/fault browser、native 200% zoom、physical mobile keyboard／遮擋、真離線／冷離線、完整 Network/Storage/cache/cookie、已確認 persisted BFCache、實際 screen reader、實際紙張印刷品質，以及 MVP 沒有的原生列印／檔案選擇／儲存／下載／剪貼簿流程。VM/靜態/HTTP 不代替原生測試。後續只用自己隔離／隱藏瀏覽器分頁，不用桌面或 OS 控制。

Requested `gpt-6.1-sol/max`；backend identity 未獨立確認。M1 preview noindex/nofollow，無 production canonical/hreflang/JSON-LD/sitemap。M2 PUBLIC repo、remote commit、來源 ZIP、production manifest 目前均未產生；Cloudflare／首頁 M3 僅主代理，外部驗收尚未開始。
