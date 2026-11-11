> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：b9f784fa8e09bf7a39a56d9882479ec032d9cb5d8eaeaa0d2e22c211702f1276。

# 泳池水量計算獨立文件審查

- 文件結果 **FAIL**。建議退修。REG-01 亦阻止標為可開工 ready。 產品九面向皆 **NOT_RUN**。
- Task `labs-pool-volume-calculator-spec-20261109`。Spec `spec-pool-volume-calculator-20261109`。[PR #261](https://github.com/KYStr/glossquote-labs-home/pull/261) 為 open draft。
- 固定候選 `7e446e401c1e3e8c6a7b83808e0eeecbff6c807a`。Reviewer `local-codex:01a1c87c-fc33-75e3-9aee-09999e6d38b1`，未參與本候選的製作。
- 登記冊 r1530，blob `e01da965f28e5248ca13158094ca356254a25c2b`。原承接者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，claim `muse-r4-pool-volume-calcul-claim-20261109T155313Z-adaf1`。
- 核對範圍為 BRIEF、SPEC、fixtures、AUTHOR-CHECK。四檔本地 Git blob 均與 PR diff 及固定 GitHub 檔案相同。來源與讀回紀錄（本地證據：../intake.json）

## 八節逐項查核

| 面向 | 分數 | 達標 | 實際證據 |
| --- | ---: | --- | --- |
| `goal` | 97 | 是 | 池邊用手機量尺寸，辦公室用量測與流速安排注水。合成 8×4×1.5 m 的 48000 L／20 h 是可驗成果。 |
| `scope` | 97 | 是 | 形狀、垂直池壁、均勻斜底、尺寸、流速上限及估算限制清楚。r1530、source-index、catalog 與 open PR 的鄰近工具是地面鋪材與水費用途，未見同 slug 製作。 |
| `userFlow` | 86 | 否 | 形狀與深度切換、空流速、取消、重設及表單可及性都有具體狀態。隱藏欄是否可觸發首錯和移焦在規格內不一致。POOL-01。 |
| `inputsOutputs` | 82 | 否 | 三種形狀、單次 rounding、跨欄深度檢查及 report schema 可重算。停用欄的 Unicode 驗證順序有兩種互斥的結果。POOL-01。 |
| `implementation` | 96 | 是 | 原生 ESM、離線 Node 24、固定 Worker、工作世代、CSP、資源回收與零工作網路可行。尺寸和流速上限下的整數結果安全。 |
| `acceptance` | 95 | 是 | 九個預定面向含三形狀、停用欄位、各種實測狀態、離線與雙語。候選產品證據逐項保持 NOT_RUN。 |
| `tests` | 85 | 否 | 18 核心與 3 狀態的現有字面案例一致。補充測試文字要求放行停用欄 surrogate，但依明文順序先返回 UNICODE。POOL-01。 |
| `handoff` | 97 | 是 | 四份文件、固定 PR、程式路徑、另行 claim、預覽／正式 gate 及責任完整。 |

## 離線驗算

執行 `& '.runs/five-hour-2026-11-11/dispatch/spec-review-06/review/run-verifier.ps1' -Slug 'pool-volume-calculator'`，Python 3.12.5，exit `0`。核心 18/18、controller 3/3。完整的字面輸入、獨立推導、候選預期與補充案例見 驗算輸出（本地證據：verification.json）。重現用 驗算腳本（本地證據：verify.py）。

- 逐式依雙精度順序計算，再以 60 位 Decimal 的面積及體積驗算全部成功案例的四個捨入欄位。1 美制液量加侖由 `231 × 0.0254³ × 1000` 導出 3.785411784 L。
- 長方形範例得 48 m³、48000 L、12680 美制加侖，40 L/min 得 1200 分。圓形 `π × 2.5² × 1.2` 得約 23.5619449 m³，獨立捨入得 23.56 m³、23562 L、6224 加侖。
- `fill-minutes-tie` 的 10000 ÷ 32 = 312.5，進位到 313，拆為 5:13。補例 1190 ÷ 20 = 59.5 進到 60 並拆成 1:00。補例原水量 1.4 L、流速 0.1 L/min 得 14 分，與顯示的 1 L 回算會得 10 分。
- 三組 controller 逐步重現舊結果失效、保留草稿、拒絕舊世代訊息與重設。

## 阻止開工的問題

### POOL-01 未啟用欄位的 Unicode 驗證順序互斥

- 重現 以預設草稿覆寫 `shape="circular"` 和 `lengthM="\ud800"`。直徑 `5`、深度 `1.5`、流速 `40` 保持有效。 [逐欄驗證](https://github.com/KYStr/glossquote-labs-home/blob/7e446e401c1e3e8c6a7b83808e0eeecbff6c807a/docs/specs/pool-volume-calculator/SPEC.md#L81)
- 觀察 依規範列出的順序先驗 UTF-16 並回 `UNICODE/lengthM`。依 userFlow 及測試要求，未啟用長度只查容量，應成功回 29452 L。現有 `circular-diameter-empty` 的 `abc` 只覆蓋格式跳過。 [使用流程](https://github.com/KYStr/glossquote-labs-home/blob/7e446e401c1e3e8c6a7b83808e0eeecbff6c807a/docs/specs/pool-volume-calculator/SPEC.md#L40) [測試要求](https://github.com/KYStr/glossquote-labs-home/blob/7e446e401c1e3e8c6a7b83808e0eeecbff6c807a/docs/specs/pool-volume-calculator/SPEC.md#L167)
- 預期 把啟用判斷的位置與規格、錯誤焦點及測試對齊。若維持停用欄只查容量，移到長度驗證之後及 Unicode 之前，該補例應成功，停用欄長度九單位仍應 INPUT_LIMIT。若保留全欄 Unicode，需明訂隱藏欄首錯的可恢復流程並改預期。
- 影響 同一合法圓池操作可因隱藏長度草稿產生互斥結果，若錯誤指向隱藏欄，使用者也可能無法復原。
- 重審 補上未啟用欄短 surrogate 與超長值的字面測例，保留已啟用 `width-unicode`，再核對形狀切換、首錯與復原。


## 非阻擋改善

- 在注水區明說按空池與固定流速估算，並可將正數未滿半分鐘而顯示 0 分的情況標成不到一分鐘。
- 刪除與純表單無關的 File.arrayBuffer／合成檔樣板文字。

## 登記冊繼承契約 REG-01

登記冊 r1530 的 `spec.acceptanceCriteria` 使用 `goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff`。這八項適用於原 `workType=spec` 任務。SPEC §acceptance 的九個產品面向須成為 production 可繼承的 rubric。現有核心會要求 production 的驗收陣列與 spec 完全一致，因此 REG-01 阻止標為可開工 ready。需由主統籌依授權的修訂流程修正後重新讀回。逐筆比較（本地證據：../production-rubric-check.json）

## 預先約定的九項產品證據

| 面向 | 狀態 | SPEC 要求的證據 |
| --- | --- | --- |
| `functionality` | NOT_RUN | 三種形狀、斜底、填水拆分及報告 |
| `boundaries` | NOT_RUN | 合法端點、首錯、停用欄與 controller cases |
| `privacy` | NOT_RUN | 工作零請求、URL／storage／log |
| `security` | NOT_RUN | 敵意輸入 inert、CSP、固定下載與資源回收 |
| `usability` | NOT_RUN | 兩語手機桌面、形狀切換、busy/取消/錯誤/重設 |
| `accessibility` | NOT_RUN | 鍵盤焦點、狀態、320px、200% zoom、觸控、reduced motion |
| `localization-seo` | NOT_RUN | 兩語同語首頁和預覽 noindex，正式另驗互惠 SEO |
| `toolchain-provenance` | NOT_RUN | Node 24、離線測試、產物 SHA-256、同一 head |
| `compatibility` | NOT_RUN | 隔離 Chrome／Edge 的切換、Worker、Blob、重排 |

## 核對來源

- 液量換算表核實 1 U.S. liquid gallon = 231 in³ = 3.785411784 L。 [NIST Handbook 133 附錄 E](https://www.nist.gov/document/2025-nist-handbook-133-appendix-e)
- 完整核對尺寸、形狀、捨入及注水限制。 [固定 pool SPEC](https://github.com/KYStr/glossquote-labs-home/blob/7e446e401c1e3e8c6a7b83808e0eeecbff6c807a/docs/specs/pool-volume-calculator/SPEC.md)
- r1530 既有鋪材用量工具，輸入與產出和泳池水量不同。 [legacy tile-estimator 固定來源](https://github.com/KYStr/glossquote-labs-tile-estimator/tree/cb7dad81f9caf2bd877b86f48a14f2cedf998b95)

保留原 owner 與 claim。修正 POOL-01 與 REG-01 後重核新 head。正式登記等主統籌安排串行 slot。
