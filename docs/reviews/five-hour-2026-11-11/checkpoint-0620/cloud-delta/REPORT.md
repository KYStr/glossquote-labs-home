# FH-CLOUD-DELTA-READONLY 協調盤點

**截至台北 13:38:43**，這輪 GitHub 共 36 個 PR 有更新，中央登記有 86 筆新增事件。全部登記事件的執行者為 `local-codex`。本輪可見資料未確認主統籌派工之外的新候選、新 claim 或產品程式提交。

## 基準與登記變動

- 本輪由 r1530、`e0ef81a2b5489489f13b2bc088f8906978700cb5` 起算。台北 13:22 快照為 r1614、`2ea30cc90be08e814432460de44cfcbbf1af427d`。本次核對固定於 r1616、`7c56f312ad4fa03638fb15c1be1865a6533a0857`，registry Git blob `6d5799353e7e735c87cfa22a45d9cc8cf2bb03d2`。已核連續 revision，並比對 `INTAKE.json`、`threads-40.json`、`stock-gap-dispatch.json` 與 13:22 狀態快照。[登記全窗差異](registry-delta.json) · [快照後兩筆](registry-followup.json)
- 自快照新增兩筆操作。r1615 股票損益維護由第 03 組獨評，對 PR #305 `95ead301f8735dede61bc1911bbc7ed6c4b79bb5` 登記 accepted。r1616 原承接者提交烤盤維護 PR #303 `8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927`，task 進 reviewing。當輪未見 spec 列改動或現存 handoff offer。[股票複審證據](https://github.com/KYStr/glossquote-labs-home/pull/308) · [烤盤候選](https://github.com/KYStr/glossquote-labs-home/pull/303)
- `#295` 在台北 12:59:45 合併為 `5645113ce5e7a1e54d049e93212b72993dfebca4`。其候選依固定報告從 `e1c4d5d50b23cd8e9449632d3eb697f217dea305` 經 `110e809c15b10004c2aadca6a6649b9324be1419` 到 `93595abc7b2f9c46a07aaaa74418b3882c8901b4`。此次改動涵蓋 `AGENTS.md`、兩份協作文件、`scripts/coordination-core.mjs`、`scripts/coordination.mjs` 和 `test/coordination.test.mjs`。新規則要求可追溯來源的映射獨審、primary 套用及套用後同版 readiness。[合併 PR](https://github.com/KYStr/glossquote-labs-home/pull/295) · [固定最新規則](https://github.com/KYStr/glossquote-labs-home/blob/7c56f312ad4fa03638fb15c1be1865a6533a0857/docs/COORDINATION-COMMANDS.md#run5-規格維護映射)

## PR 與歸屬

GitHub GraphQL 取 50 個最近更新 PR 並跨過起算時間。以三頁讀回 291 個 open PR，與 intake 的 150 個固定 head 逐個核對，150 個仍開啟且 head 相同。本輪 36 個更新 PR 只有 #295 合併。可見提交審查、PR 留言、待處理 GitHub review request 各為 0。另有 12 筆正式登記冊 `review` 操作。所有本輪 PR 的實際變更路徑落在文件、維護證據或 #295 的協作核心與測試。[PR 檢查](pr-delta.json) · [GitHub 讀回](pr-read-final.json)

| 快照後變動 | 固定 head 與路徑 | 歸屬與狀態 |
| --- | --- | --- |
| [#317](https://github.com/KYStr/glossquote-labs-home/pull/317) | `b5857f2658d5e10d29756a473c935f9b8a48fb89`，`docs/reviews/five-hour-2026-11-11/spec-review-01/new-sha256-manifest/` | 原第 01 組的獨立文件證據，固定在 #312 舊 head。 |
| [#318](https://github.com/KYStr/glossquote-labs-home/pull/318) | `4ffb54a6d0f763be3f923eec8b9a0baab88cb90c`，`docs/specs/battery-runtime-calculator/` 四檔 | 已派 `repair-battery` 的作者。r1616 原 claim working，候選已上 PR，正式 submit 待讀回。 |
| [#319](https://github.com/KYStr/glossquote-labs-home/pull/319) | `b88f00cfc3379a22d11b5736d048f4e54bdc4641`，`docs/specs/currency-converter/` 四檔 | 已派 `repair-currency` 的作者。r1616 原 claim working，候選已上 PR，正式 submit 待讀回。 |
| [#284](https://github.com/KYStr/glossquote-labs-home/pull/284) | `a08fc722e0b0e28ea181311b801c13766beea2c3` → `066e8d79fe9791562a07a7239fe934bcb86195c5` | 主統籌的 ZIP 交件研究簡報和 `docs/specs/zip-delivery-check/BRIEF.md` 修訂。完整 PR 157 檔都在 `docs/`。 |
| [#312](https://github.com/KYStr/glossquote-labs-home/pull/312) | `2a2cc4fddf0ffd28d07c579f783d4445e61b0e20` → `456b4210b3a2a41c0285cee30867bd741bc59c13`，改 `docs/specs/batch-sha256-manifest/SPEC.md` 與 `AUTHOR-CHECK.md` | 主統籌已按 `SHA312-01` 授權原作者最小退修並回報交回第 01 組複核。#317 的 acceptance 88 分仍屬舊 head。新 head 獨審結果待讀回。 |

閱讀時間 PR #316 `746583dc063e64f3ffcdf6b37c1051f36c44ac5c` 於快照前已開啟。其 `repair-reading` task 在 r1616 仍 working。以 task 的 source、brief、registry owner、claim 和派工 chat ID 辨認上列工作。GitHub 共用帳號僅作 PR metadata。第 01 組的新 head 複核維持原工作路線。[閱讀時間 PR](https://github.com/KYStr/glossquote-labs-home/pull/316) · [承接與 SHA 證據](cloud-delta.json)

## 範圍重疊與來源定位

- **Running Pace 的產品來源已定位**。中央來源索引 Git blob `f87bd945b3aecf8d37f8ca6418fc1fdb30d9653c` 只有 `registered-spec-document`，指向 #50 `40a7dc689e8e2fc2c527c323ca68398d95e9db19` 的 `docs/specs/running-pace-calculator/`。原 spec task `labs-running-pace-calculator-spec-20261102` 有 `cloud-dot` 原 owner 與 claim。歷史 Build [PR #81](https://github.com/KYStr/glossquote-labs-home/pull/81) 固定 head `987062650d530c0e41b044c923c39d44f4d35699`，37 檔皆在 `tools/running-pace-calculator/`。固定 `public/js/core/riegel.mjs` 可讀，Git blob `288fbe67f66c6f2be26bae2353dbc0ca522fe18f`。產品 claim／原正式承接者未能定位，標未知。[來源索引](https://github.com/KYStr/glossquote-labs-home/blob/7c56f312ad4fa03638fb15c1be1865a6533a0857/coordination/source-index.json) · [實作檔](https://github.com/KYStr/glossquote-labs-home/blob/987062650d530c0e41b044c923c39d44f4d35699/tools/running-pace-calculator/public/js/core/riegel.mjs)
- **Race Time 與歷史 Running Pace 有實質重疊**。兩個候選都有 Riegel 1.06 四個標準距離預測。#276 `2b528170837773a677c10b0c6414d80f1044af6f` 的 `tools/race-time-predictor/public/js/core/race.mjs` 在 #283 `448bd9fc9865fe65f6014b66f4a2e2d54b76f539` 相同，blob `9cfb746cc5547e842ed377fcabbbf34f1e193e68`。#285 的修訂規格明確把自訂目標距離與簡化預測流程列為 Running Pace 升級。依主統籌已定案的範圍，保留兩個歷史來源與原承接紀錄，Race Time 排除在新增 ready 庫存。[原 Race Time Build](https://github.com/KYStr/glossquote-labs-home/pull/276) · [固定升級規格](https://github.com/KYStr/glossquote-labs-home/blob/23fa1265837f66fbedc04441db260dbb2a5ed924/docs/specs/race-time-predictor/SPEC.md)
- **#304 是已登記的來源映射**。九個 `SPEC.md` 分別與 #283、#285 或 #288 的固定來源比對，9/9 Git blob 及長度相同。映射 task r1616 仍 reviewing。#315 已有固定文件審查證據，等待主統籌的正式 review 時段。這個路徑重疊有各來源維護 task 和固定 mapping.json 可追溯。[映射候選](https://github.com/KYStr/glossquote-labs-home/pull/304) · [獨評證據](https://github.com/KYStr/glossquote-labs-home/pull/315)
- **補庫三項簡報的已確認差異**。ZIP 以中央目錄與外部清單對比路徑，SHA-256 工具驗內容雜湊，Markdown 工具解析跨檔相對引用。行事曆簡報對兩版 ICS 按 UID 找異動，既有 agenda-conflicts 檢同版衝突。這些是簡報界線，後續規格交驗仍須重核。 [固定補庫簡報](https://github.com/KYStr/glossquote-labs-home/tree/066e8d79fe9791562a07a7239fe934bcb86195c5/docs/specs)

本盤點的產品實測為 `NOT_RUN`。資料涵蓋固定讀取時間的共同 repo 與指定本地快照。已把主統籌需讀回的版本、來源和未定產品 owner 留在同一份證據中。[逐項機器證據](cloud-delta.json)
