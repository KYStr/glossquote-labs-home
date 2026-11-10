# Run 5 維修候選獨立驗收

審查的候選為 `448bd9fc9865fe65f6014b66f4a2e2d54b76f539`。讀回 [PR #283](https://github.com/KYStr/glossquote-labs-home/pull/283) 為 OPEN draft，head 相同。維修 task `labs-run5-legacy-repair-20261110` 在 revision 1529 由原維修 owner 重新提交，操作 `root-submit-run5-maintenance-eae7807d-96c5-4826-8347-8e6b448b3da4`。審查者 `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/run5_independent_review` 未參與製作，已自行 ACK 合約及首頁基線。 [固定維修里程碑](https://github.com/KYStr/glossquote-labs-home/blob/a4d3d11e91391042fcfc644ed020d28b60909266/docs/reviews/run5-legacy-repair-2026-11-10/MILESTONE.md)

| 維修面向 | 分數 | 結果 |
| --- | ---: | --- |
| `repair-correctness` | 97／100 | 646 組獨立 Node 測例通過，包括實際 Node module worker thread。12 款共 616 項主代理測試通過，60 份命令日誌雜湊與各款離線 gate、重建比對紀錄核對。四個更正的規格 SHA 可讀回正確 SPEC。 |
| `source-provenance` | 98／100 | 484 個候選檔的原始位元組與固定 GitHub 樹全數匹配。52 個原 PR heads 與 40 個原規格 owner 保留，370 個原檔與原 commit 核對。109 個維修差異的來源與目標雜湊吻合，142 條 GitHub 相對文件連結區分大小寫檢查通過。 |
| `status-delivery` | 98／100 | 單一 ZIP 的 503 個成員、484 個候選檔、52 列狀態和 146 條相對 Markdown 連結驗證通過。52 列原固定來源與本次維修狀態分列，維修候選欄只標 9 份受影響規格與 12 份實作。 |

## 封包證據

`glossquote-run5-repair-2026-11-10.zip` 為 1,176,828 bytes，SHA-256 為 `b7794fff17916cfeaaf68276bece57f760f0d6d299a53fce67e280dcf292766e`。使用 Python `archive.py <zip> <sha256> <candidate-files.json>` 讀取，不解壓覆寫檔案。退出碼 0。核對單一 `00-START-HERE.md`、ZIP CRC、路徑安全、大小寫無碰撞、檔案大小、SHA-256、Git blob、CSV／JSON 狀態對應與區分大小寫的相對連結。逐檔將 ZIP 候選清單對到同輪已驗證的遠端樹。獨立測例重跑腳本在 ZIP 內的唯一變動為匯入路徑從 `../work/` 改為 `../candidate/`。這份封包外最終紀錄獨立固定在 GitHub，可用來驗證 ZIP 的完整 SHA-256。

## 退修與驗收邊界

舊候選在 revision 1528 因六個文件 CRLF／LF 不一致退修。對這次固定提交，`node provenance.mjs bdd389bce274a30b813059b5182d21a9f41ca080` 退出碼 0，484 個候選檔差異數為 0。舊遠端到新遠端只修改證據 `CHANGES.json`。產品程式、測試輸入及原 52 個 PR head 相同，因此沿用已核對的功能證據，未重跑 646 組或全套 616 項。Windows 持久環境與 Git 設定指紋維持相同。 [原退修與功能驗證證據](https://github.com/KYStr/glossquote-labs-home/blob/af69042e9d5b6494743c7d82cf9a6f979b0311c7/docs/reviews/run5-legacy-repair-2026-11-10/acceptance/BLOCKING-REVIEW.md) · [12 款離線檢查](https://github.com/KYStr/glossquote-labs-home/blob/448bd9fc9865fe65f6014b66f4a2e2d54b76f539/docs/reviews/run5-legacy-repair-2026-11-10/PRIMARY-RESULTS.json)

三項必要維修面向達標，這個固定候選的維修驗收可登記通過。實際瀏覽器、實體裝置、輔助科技、瀏覽器 Network/Storage、原生下載、正式 HTTPS/SEO、完整產品九面向及其他原 PR 的完整審查均為 NOT_RUN。未合併、部署或更新首頁。
