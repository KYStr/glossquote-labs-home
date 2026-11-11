> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：470dafed69096f6207fb328540489f73f1bc83159dceb25cb585a6f14ce18464。

# 骰子模擬器獨立文件審查

- 文件結果 **FAIL**。建議退修。REG-01 亦阻止標為可開工 ready。 產品九面向皆 **NOT_RUN**。
- Task `labs-dice-roller-spec-20261109`。Spec `spec-dice-roller-20261109`。[PR #260](https://github.com/KYStr/glossquote-labs-home/pull/260) 為 open draft。
- 固定候選 `5dccd3dcfbe72aa52c9a892391a44719e9de3f9a`。Reviewer `local-codex:01a1c87c-fc33-75e3-9aee-09999e6d38b1`，未參與本候選的製作。
- 登記冊 r1530，blob `e01da965f28e5248ca13158094ca356254a25c2b`。原承接者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，claim `muse-r4-dice-roller-claim-20261109T155155Z-5b64c`。
- 核對範圍為 BRIEF、SPEC、fixtures、AUTHOR-CHECK。四檔本地 Git blob 均與 PR diff 及固定 GitHub 檔案相同。來源與讀回紀錄（本地證據：../intake.json）

## 八節逐項查核

| 面向 | 分數 | 達標 | 實際證據 |
| --- | ---: | --- | --- |
| `goal` | 80 | 否 | 桌遊、TRPG 和測試工程師的場景及逐顆重現需求具體。§goal 宣稱可證明未重擲，種子與結果只有重算證據。DICE-01。 |
| `scope` | 97 | 是 | 固定 NdM±K、單一種子與 JSON。對照 r1530 的 dice-sum-distribution（理論分布）、group-generator（洗牌後分組）、decision-wheel-picker（抽單一選項）、lottery（無放回），用途與輸出相異。 |
| `userFlow` | 95 | 是 | 明確按 Roll 才在空種子時寫入 uint32 快照。可清空種子再抽，預設 `2d6`／空種子。dirty/cancel/reset、焦點、報告失效和離頁回收均有規則。 |
| `inputsOutputs` | 98 | 是 | 位元級 mulberry32、首個 UTF-16 錯誤位置、長度先於文法、文法先於範圍、三個元件次序與種子邊界均可重算。100 顆全值一致。 |
| `implementation` | 96 | 是 | Node 24 及原生 ESM，輸入不進 Worker 程式或 DOM 標記。Web Crypto 只在 app 層填種子，純核心可離線，世代、CSP、Blob 生命週期有明文。 |
| `acceptance` | 84 | 否 | 九產品面向有方法及逐項 90 門檻。要求的雙語 SEO 與 FAQ 鎖定過度承諾的 seed 文案，與 §inputsOutputs 不一致。DICE-01。 |
| `tests` | 96 | 是 | 21 個核心及三個狀態案例完整比對，涵蓋 100 顆、修正、首錯位置、格式、取消後晚到與替換。另以測試種子驗空欄語義。 |
| `handoff` | 96 | 是 | 四個固定文件、八節審查、工具路徑、候選 PR、同一 head 及上線責任齊備。 |

## 離線驗算

執行 `& '.runs/five-hour-2026-11-11/dispatch/spec-review-06/review/run-verifier.ps1' -Slug 'dice-roller'`，Python 3.12.5，exit `0`。核心 21/21、controller 3/3。完整的字面輸入、獨立推導、候選預期與補充案例見 驗算輸出（本地證據：verification.json）。重現用 驗算腳本（本地證據：verify.py）。

- 對第 i 抽直接用 `(seed + i × 0x6D2B79F5) mod 2^32` 求狀態。位元混合後以整數除法求 `1 + floor(k × M / 2^32)`，先算結果再與字面 expected 比。
- 種子 42 的前兩個分子是 2581720956、1925393290。M=6 得 4、3，M=20 得 13、9。滿上限 fixture 逐顆核對 100 值，sum 51508，total 61508。
- 獨立掃描 ASCII 骰式及 UTF-16 錯誤位置。`2d` 的缺值位置為 2，`2d6++3` 位置為 4。`101d6x` 先得 NOTATION／5，不先報 count 越界。
- 三組 controller 的 checkpoint 以工作世代模型推導，舊回傳 payload 也先從對應舊草稿獨立重算。

## 阻止開工的問題

### DICE-01 種子與報告無法支持文案的重現與未重擲承諾

- 重現 固定 seed `42`，分別輸入 `2d6` 與 `2d20`。再以任意不同 seed 擲一次，最後只下載 seed `42` 的報告。 [固定規格](https://github.com/KYStr/glossquote-labs-home/blob/5dccd3dcfbe72aa52c9a892391a44719e9de3f9a/docs/specs/dice-roller/SPEC.md)
- 觀察 前兩份報告依序為 `[4,3]` 與 `[13,9]`。BRIEF、description、FAQ 將重現歸於種子本身。`§goal` 認為可向同桌證明未重擲，報告只能重算單次快照。
- 預期 雙語 BRIEF、goal、種子說明、SEO 與 FAQ 一致說明使用相同正規化骰式與種子才能重現該次結果。把證明未重擲的承諾修為可驗算該份報告。
- 影響 不同骰式使用相同 seed 會有不同輸出。任何人都可只展示選中的快照，因而讓同桌把結果可重算誤解為過程可稽核。
- 重審 重核原 `2d6` 案例與 `2d20` 補充案例，逐項檢視雙語同義與 noindex／正式 metadata 的預期字串。


## 非阻擋改善

- 未來實作可在 app 測試以假熵注入 `0`，檢查空種子點 Roll 時欄位寫回 `"0"` 並使用這份快照。核心仍維持 `seed-empty-core` 的 EMPTY。
- 刪除 File.arrayBuffer 與合成檔的共用樣板文字，避免讓讀者誤會支援檔案來源。

## 登記冊繼承契約 REG-01

登記冊 r1530 的 `spec.acceptanceCriteria` 使用 `goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff`。這八項適用於原 `workType=spec` 任務。SPEC §acceptance 的九個產品面向須成為 production 可繼承的 rubric。現有核心會要求 production 的驗收陣列與 spec 完全一致，因此 REG-01 阻止標為可開工 ready。需由主統籌依授權的修訂流程修正後重新讀回。逐筆比較（本地證據：../production-rubric-check.json）

## 預先約定的九項產品證據

| 面向 | 狀態 | SPEC 要求的證據 |
| --- | --- | --- |
| `functionality` | NOT_RUN | 兩語真輸入、相同完整快照重現 rolls 且能取報告 |
| `boundaries` | NOT_RUN | 骰數、面數、正負修正、seed 端點、首錯及狀態 |
| `privacy` | NOT_RUN | 工作期零請求及 URL／storage／log |
| `security` | NOT_RUN | 敵意輸入 inert、CSP、資源 cap、Worker/Blob dispose |
| `usability` | NOT_RUN | 桌面手機範例、busy、取消、錯誤、修改、下載 |
| `accessibility` | NOT_RUN | 鍵盤、焦點、320px、200% zoom、觸控、動態狀態 |
| `localization-seo` | NOT_RUN | 兩語訊息、同語首頁、預覽 noindex，正式另驗 hreflang/canonical |
| `toolchain-provenance` | NOT_RUN | Node 24、離線命令、SHA-256、固定同 head |
| `compatibility` | NOT_RUN | 隔離 Chrome/Edge 實際 Worker、表單、reflow 與 Blob |

## 核對來源

- 核對 `createPrng` 的常數、位移、uint32 截斷與分母。抽籤路徑為部分 Fisher–Yates。 [固定 lottery core](https://github.com/KYStr/glossquote-labs-home/blob/5dccd3dcfbe72aa52c9a892391a44719e9de3f9a/tools/lottery-number-picker/public/js/core/lottery.mjs)
- 同位元流用於名單洗牌和輪流分組，輸出責任不同。 [固定 group-generator SPEC](https://github.com/KYStr/glossquote-labs-home/blob/93c1a8a8b12930270b611850a6b85007da4f5c4d/docs/specs/group-generator/SPEC.md)
- 分布預案已存在於 registry。本案以單次擲骰及可重算結果區隔。 [固定 dice-sum-distribution SPEC](https://github.com/KYStr/glossquote-labs-home/blob/66323ef8a8aa1a5a099ed61a96217be3821089ed/docs/specs/dice-sum-distribution/SPEC.md)
- 核實瀏覽器可將安全隨機 bytes 填入 Uint32Array，符合空種子補值的可行性。 [Web Cryptography §getRandomValues](https://www.w3.org/TR/webcrypto/#Crypto-method-getRandomValues)

保留原 owner 與 claim。修正雙語文案及 REG-01 後重核固定 head。正式 ACK、review 及 ready 仍待主統籌串行安排。
