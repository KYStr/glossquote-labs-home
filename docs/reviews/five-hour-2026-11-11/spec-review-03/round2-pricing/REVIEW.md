# 定價與損益平衡維護複審

維護面向均達通過門檻，建議在作者正式交驗同一候選後接受本次文件維護。固定候選為 `dbbf6eea51e5ea88bb58f34983aa915e584889b4`。 [PR #298](https://github.com/KYStr/glossquote-labs-home/pull/298)

維護任務 `labs-five-hour-repair-pricing-20261111`。本人 `local-codex:01a1c87c-f22f-76f1-9e00-dcb0b0b55486` 未參與候選製作。r1578 讀回維護者、claim 與 ACK、register、claim、start 四個事件，狀態仍為 `working`。 [來源與承接核對](provenance.json)

| 維護面向 | 分數 | 獨立證據 |
| --- | ---: | --- |
| spec-corrections | 98 | 兩份八節完整。BE-01 的四種情況按 Q(P−V)−F 分別敘述，BE-02 的兩個半值對照正確。MM-01 的兩個最低整分模式分開顯示目標與回算率，MM-02 的零售價顯示及公式適用域一致。 |
| exact-fixtures | 100 | 獨立 Node BigInt 整數搜尋逐案比對 65/65，13 個成功求解證明少一分不達標。另驗 7 個合法上限與首錯探針及 3 個固定下載字串／SHA-256。 |
| provenance-and-scope | 99 | 公開 PR #298 只含兩份規格的八個檔案及六個證據檔。14 個候選與 8 個歷史檔均核對 bytes、Git blob 與 SHA-256。現行 task/owner/claim 和四個 maker 事件與 r1578 相符，歷史 #240/#243 head 保留。 |

兩份規格的 `goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff` 均完整。九項未來產品門檻仍固定。產品執行、瀏覽器與實際下載為 NOT_RUN。

損益平衡的四個 `NO_MARGIN` 狀態與獨立利潤代入相符。`F=0,P=V` 在零件與兩件時均打平，`F=0,P<V` 由 0.00 變為 −2.00。精確 2.675% 在 half-up 與 half-even 都是 2.68%，新增的 2.665% 分別為 2.67% 和 2.66%。原 21 個字面輸入及輸出均保留。

成本 0.01、目標 25% 的兩種求解都得售價 0.02，實際加價率 100.00%、毛利率 50.00%。少一分時兩率都是 0%。售價為零時毛利率為 `null`，不驗無定義的比例恆等式。原 `solve-markup-repeating` 的售價 1333→1334 分，單件毛利 333→334 分，毛利率 24.98%→25.04%。其餘原有值不變，10 個原成功求解新增對應實際率欄位。

`node verify.mjs <candidate-checkout>/docs/specs` 執行 exit 0。損益平衡 24/24、目標定價 41/41。另核對 13 組最小值、7 個額外探針和 3 個下載字面輸出。 [驗算腳本](verify.mjs) · [逐案輸入、結果和下載 SHA-256](fixture-output.json)

原 PR #240、#243 與其 owner 保留。此提案只涵蓋維護任務的三個面向，REG-01 的生產驗收面向登記另待處理。 [機器可讀複審提案](review-proposal.json)

固定規格檔可用同一候選 checkout 的兩個資料夾重跑。 [損益平衡固定檔](https://github.com/KYStr/glossquote-labs-home/tree/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/breakeven-calculator) · [目標定價固定檔](https://github.com/KYStr/glossquote-labs-home/tree/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/markup-margin-calculator)
