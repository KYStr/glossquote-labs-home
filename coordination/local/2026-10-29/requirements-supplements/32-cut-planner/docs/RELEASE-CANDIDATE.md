# 長料裁切規劃候選

## 最新 U19-32-RELEASE-R1：favicon source successor

PUBLIC fixed `27e8bc45f1ac2536039cb14f365da5d5b7866293`，直接parent為下方原M2 fixed `123dc556...`；舊版本／ZIP／證據保留不動。新source ZIP `cut-planner-source-27e8bc45f1ac.zip` 114789bytes，SHA-256 `09ae66f541f161d3a8b6580e6446f4f5e97fe03e125a376d71eff53b31137e1d`，48files／Git blobs／ZIP安全路徑及CRC一致。Workspace與clean-source各67/67及6gates exit0。

只新增production/favicon.svg（180bytes，SHA `47b9cb76bd38ae83536930211433b1c1898c662ca4e5e0ad51b18eaed23da041`）、兩語head引用與robots精確allow；production16檔manifest SHA `e2cbc106e9ff9503eea0660bc70b437aaf2e76993cbf8712961ce685e2a2ed11`。M1/public／runtime及整份_headers未變，img-src仍只self。新版source已公開但未由owner部署／Browser測試；主代理須部署後重驗native console。前版已部署但zh live-r1 console gate未通過，不可因offline成功而改寫。完整private證據 `.runs/cut-planner/20261019-release-r1-01a14c7f/`。

## 最新 M2 source candidate（2026-10-19）

M1已獲主代理scoped GO：69 PASS、0 FAIL、3 PARTIAL、7 NOT_RUN。保留繁中BFCache未見persisted與兩語Network/Storage部分範圍。M2新增正式SEO／離線releasechain與5212 HTTP model；全部M1 public來源bytes固定不變。公開來源不代表hosting／首頁／外部驗收。精確命令、commit及ZIP驗證於完成後記HANDOFF；本機證據在 `.runs/cut-planner/20261019-m2-01a14c7f/`，不進公開repository。

### M2 fixed source

- PUBLIC repo：`https://github.com/KYStr/glossquote-labs-cut-planner`；branch `codex/m2-release`；commit `123dc556b5c584e467c3ac2ff4a80de0f2fdced4`（local/remote/API一致）。
- ZIP：`cut-planner-source-123dc556b5c5.zip`，111986 bytes；SHA-256 `41be4423294e4e4d3fc2c53d2dfb3df829a7195e19803de6d1ce30452e44e73d`；48files，根目錄package.json，逐檔Git blob一致，安全path/CRC/SHA驗證。
- workspace與clean-source：各66/66；六個必要離線gates exit0，preview/production manifest完全相同。
- Preview manifest：`1c394e577de50be9721249d6c066d3815e2307f8c1b7aa51dfa6f39c77e67b8d`；production manifest：`782b71f888c9935490c81bb652693fa889088e66aa3249925fc6ef45b20cc6a2`。
- 5212實際CLI HTTP model36requests通過，session93734／PID5936，沒有Browser或CDN驗收宣稱。
- Git settings與完整Windows Environment guard前後PASS／不變。

本機最新註記不重寫上述公開source commit/ZIP；公開副本的HANDOFF/TASK-ENTRY/本文件使用portable候選摘要，private歷史與機器快照未發布。主代理獨立M2驗收、M3部署／首頁與外部驗收尚未執行。

## 原 M1 固定候選歷史

M1_LOCAL_CANDIDATE，2026-10-18。等待主代理驗收，並非 M1 GO、公開來源或正式發布。

- Node v24.14.0 / npm 11.9.0，零套件安裝。
- `npm test` exit 0：60 pass，0 fail/skip/cancel/todo（core 47、session mock 10、toolchain/HTTP 3）。
- `npm run check` / `npm run build` 各 exit 0。
- Preview `dist/` 共 14 檔；其中 asset-manifest.json 列其餘 13 檔的 bytes/SHA-256，不列自身。12 個來源資產保持固定 allowlist。
- Asset manifest SHA-256：`1c394e577de50be9721249d6c066d3815e2307f8c1b7aa51dfa6f39c77e67b8d`。
- 固定證據目錄：根 `.runs/cut-planner/20261018-m1-01a14c7f/`。包含 source-manifest.json、asset-manifest.json、npm-test.txt、npm-check.txt、npm-build.txt、active-http.json、service.json、environment-before.json、environment-after.json、environment-comparison.json。
- CLI active HTTP probe 23 requests，兩語 HTML、ESM/CSS/TXT/XML、HEAD、404/405、CSP/noindex 與 body hashes 符合候選。
- 存活預覽：127.0.0.1:4212；exec session 3031；Node PID 57760。此服務只提供靜態資產，未啟動瀏覽器。
- Windows guard 前後 PASS，完整 Snapshots 不變。

實際雙語流程、空白/非法錯誤焦點、列增刪、stale、清除/切換語言取消確認、320px、鍵盤、渲染及 screenshots 全為 **NOT_RUN_USER_FOCUS_INCIDENT**。本對話無任何 UI 工具呼叫，沒有待完成 UI call。不得把離線 session mock 或 HTML/CSS 靜態檢查當作實際 UI 已通過。

真實 clipboard write/權限提示、原生下載/列印/選檔/儲存、真機/IME/AT、原生 200% zoom、完整 BFCache、Network/Storage、正式 CDN/headers/SEO 都 NOT_RUN。M2 production build/check/model、public repo/commit/ZIP 及 M3 hosting/首頁未執行；等主代理明確放行後再推進。詳見 [HANDOFF](../HANDOFF.md)。
