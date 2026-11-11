# PR295 第二個固定候選：來源祖先複驗

**結論：FH-CORE-A-01 已通過針對性複驗，但 FH-CORE-A-02 阻止接受本 head。** 規格先 ready，維護祖先之後才成為已知來源時，現有 ready/accepted 的有效性未更新，仍被計入庫存並允許 production 承接。此結果由合法操作和候選實際 adapter 的記憶體假 transport 重現，不是正式 registry 寫入。

受審 [PR295](https://github.com/KYStr/glossquote-labs-home/pull/295) head 為 `110e809c15b10004c2aadca6a6649b9324be1419`，唯一 parent 為舊 `e1c4d5d50b23cd8e9449632d3eb697f217dea305`。六候選檔實讀 Git blob 相等；本次實際 delta 只有 commands、core、test 三檔。[固定來源與差異](candidate-ref.json)、[11 份輸入](input-manifest.json)、[下載讀回](download-verification.json)。11 份包含六候選、三個舊版差異對照及本 reviewer 上輪公開的兩個 fixture/transport 模組，無作者私人 work 依賴。

Reviewer 為 `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/five_hour_astra_review`，未製作候選、未修改 maker work、沒有本 core 正式 registry 操作。原 [PR300 退修報告](https://github.com/KYStr/glossquote-labs-home/blob/ca1e84f4d729f87f5d29c967dc813e55809dae7c/docs/reviews/five-hour-2026-11-11/astra/core/INDEPENDENT-REVIEW.md)及 80/60/85 分數保留，只適用舊 head。本次依原預宣告三面向評分，不用全綠測試取代實質不變條件。

| 面向 | 本 head 分數 | 證據 |
| --- | ---: | --- |
| core-transition-correctness | 80 | 原 A01 的純核心與全 adapter 自評路徑均被拒絕，合法獨立流程仍完成。A02 的晚到來源仍讓不合格 ready 進 production；有效庫存/承接不變條件未完成。 |
| scope-owner-provenance | 85 | 同 repo/commit 的不同 path、多筆來源、曾任/current owner、DAG、多規格父 mapping 的所有 targets 均繼承；cycle/pending 在新 mapping failclosed。但現有 ready 的來源後知資訊未一致處理。 |
| test-and-adapter-evidence | 85 | 實跑 55/55 及 reviewer 12/12 定向矩陣；四個 A02 反例均透過實際 adapter 成功不當 claim，各 1 synthetic PUT，故不能接受。 |

實際驗證：

| 執行項 | 結果與界線 |
| --- | --- |
| 候選完整 coordination suite | [55/55，exit 0](candidate-tests.json)，[stdout](candidate-tests.stdout.txt)。因來源解析與驗證行為改變重跑必要套件。 |
| reviewer 自寫定向矩陣 | [12/12，exit 0](source-chain-results.json)，[入口](recheck-source-chain.mjs)。舊兩條 A01 自評拒絕均在 PUT 前；非作者流程 7 synthetic PUT 成功。 |
| A02 初始重現 | [結果](late-source-result.json)、[入口](late-source-probe.mjs)。late ancestor 後 ready 仍計 1；另外加 39 份真正獨立假規格滿足原門檻 40，沒有改門檻。 |
| A02 四種時間順序 | [結果](effective-readiness-results.json)、[入口](effective-readiness-probes.mjs)。晚到 ready maker、晚到 mapping maker、pending、cycle 均能不當承接。 |
| 合法恢復 | 同一結果的 recovery 為 PASS：新完整 mapping→獨審→既有 apply→draft→獨立 ready；兩輪 history 與所有舊 task 保留。 |

12 項定向矩陣另外包含祖先 evidence 缺檔拒絕、同 commit 多記錄、前後 owner、shared DAG 重複不誤判 cycle、多規格父 mapping、known pending/cycle、同 commit 混入 pending、晚到祖先在 mapping review 前阻擋、祖先 bytes 不可替代錯的直接來源。這些沒有使用作者新測例作 oracle，而是沿用本 reviewer 已公開的固定 synthetic 基礎及新增 literal assertions。

未變的 AGENTS/workflow/adapter bytes 與 40 ID、精確舊 state、八章/九面向分離、CAS 等一般設計的上輪獨評證據沿用，未再重跑上輪 16 項全部矩陣或兩份無關固定 registry 快照；候選自己的完整 55 項仍有執行。新核心對來源後知資訊的缺口由本輪新案例直接驗證，沒有以舊快照 PASS 抵銷。

詳細位置、重現和窄修在 [FINDINGS](FINDINGS.md)；最窄恢復語義在 [RECOVERY-SEMANTICS](RECOVERY-SEMANTICS.md)。不需新增 invalidate 或寬泛管理員權限；對未派工 stale ready，用新完整 mapping 恢復即可。已合法派工紀錄保留，不在本輪偷偷放寬凍結規則。

固定 primary 是協作身分，不是額外身分認證；PR head 與 CAS 為不同 HTTP 動作，沒有宣稱交易原子性。來源語義/八章實質內容仍須獨立審查；維護 accepted、spec ready、產品九面向 accepted 仍分開。沒有 GUI、部署、merge、產品 acceptance。永久環境 guard 前後一致，公開只留 [PASS 摘要](environment-summary.json)。[可攜入口](README.md)的 exit 0 表示結果重現完整，**不是此候選通過**。
