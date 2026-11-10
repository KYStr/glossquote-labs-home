# Run 5 維修候選獨立複核

審查 `448bd9fc9865fe65f6014b66f4a2e2d54b76f539`，讀回 [PR #283](https://github.com/KYStr/glossquote-labs-home/pull/283) 為 OPEN draft 且 head 相符。審查者 `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/run5_independent_review` 未參與候選製作，已在 revision 1526 自行 ACK 規則 `2026-10-29.1` 及主頁基線 `26525d5f6380915ea95dde879dec769442db0d95`。 [固定維修標準](https://github.com/KYStr/glossquote-labs-home/blob/a4d3d11e91391042fcfc644ed020d28b60909266/docs/reviews/run5-legacy-repair-2026-11-10/MILESTONE.md)

| 面向 | 結果 | 證據 |
| --- | --- | --- |
| `repair-correctness` | 97／100 | 646 組獨立測例通過，涵蓋薪資、年齡、料理、工作日及生成後的 Node module worker。另核對 12 款共 616 項主代理測試和離線 gate 的 60 份日誌雜湊。四筆修正的規格 SHA 可由各自的固定 SPEC 讀回。 |
| `source-provenance` | 98／100 | 484 個交付候選檔案的位元組與遠端 Git blob 全數相符。已核對 52 個原 PR head、40 個原規格 owner、370 個固定原始檔、109 個產品或規格差異及其雜湊、142 條遠端相對連結。原資料範圍、來源限制與引用維持可追溯。 |
| `status-delivery` | 待封包核對 | 候選與 PR 已鎖定，歷史與本輪狀態分列。封包完成後再讀取單一 ZIP，核對檔案、雜湊、相對連結與狀態，之後以本人身分登記結果。 |

第一版在 Windows 產生 CRLF，而 GitHub 固定候選中的六個檔案使用 LF，導致交付與來源位元組不符。該版在 revision 1528 正式退修。這次從固定 GitHub 內容重新取得原始位元組，對照舊候選的遠端樹只有 `CHANGES.json` 更新。以 `node provenance.mjs bdd389bce274a30b813059b5182d21a9f41ca080`（Node 24.14.0，退出碼 0）複核 484 個候選檔案，差異數為 0。兩個受影響產品文件的雜湊現在也與固定候選一致。 [先前退修與 646 組驗證明細](https://github.com/KYStr/glossquote-labs-home/blob/af69042e9d5b6494743c7d82cf9a6f979b0311c7/docs/reviews/run5-legacy-repair-2026-11-10/acceptance/BLOCKING-REVIEW.md) · [固定候選主代理驗證](https://github.com/KYStr/glossquote-labs-home/blob/448bd9fc9865fe65f6014b66f4a2e2d54b76f539/docs/reviews/run5-legacy-repair-2026-11-10/PRIMARY-RESULTS.json)

沿用已通過的功能證據，因程式、測試輸入和原始 PR heads 均相同。本輪未執行實際瀏覽器、裝置、輔助科技、瀏覽器 Network/Storage、原生下載、正式 HTTPS/SEO 或完整產品九面向。未合併、部署或更新首頁。Windows 持久環境和 Git 設定指紋在驗證前後一致。
