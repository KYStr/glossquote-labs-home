# 整合 PR 71 修訂版獨立複驗

固定候選 [PR 71 head](https://github.com/KYStr/glossquote-labs-home/commit/7a0e9bf896e3b3a318244eb6f5006ebd40787b2c)，tree `ac017c0c49a83ebe41d43ee5db8ad23c78064079`。reviewer `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/stock_a` 未參與候選製作。r817 的提交與 open PR head 相符。

**判定 accepted**，限中央來源、交接文件、只讀 CLI 與根測試里程碑。先前 [I-01 退修](https://github.com/KYStr/glossquote-labs-home/blob/1931f7711cd80dc0419acf6cecae0a2c8f79ddd0/docs/reviews/consolidation-20261109/PR71-e26c7e1.md) 的 13 個檔案已補齊。

| 固定面向 | 分數 | 實證 |
| --- | --- | --- |
| preservation | 100 | 固定 head 的 5,309 檔、42,246,558 bytes 全量與公開 Git tree 的 blob 相符。新增 13 檔精確匹配原清單，共 79,298 bytes。無刪除。166 項目的地 tree 正確，18 個外部候選的原 commit tree 與原 repo 獨立比對，9 個目錄中保留的 10 個 review 檔與固定共用基線 blob 相同。 |
| coordination | 97 | 原作者維持同 claim 退修重交，r817 已綁定實際新 head。手冊改以 snapshots、archives 尋找替代來源。觀測時 PR 說明仍提早期 head，實際候選以 r817 submission 和 PR head 為準。 |
| verification | 100 | 修正版公開 ZIP 的乾淨副本 `node scripts/workspace.mjs verify-sources` exit 0，5,237 檔、38,516,492 bytes。相對於退修 head，變更只含原缺的 13 檔、source-index 和三份文件。CLI、測試、catalog、公開資產、產品和部署設定 blobs 相同，因此沿用同輸入的 51/51、check、preview build 及 6 產物核對。受影響文件的 3 個相對連結另查通過。 |

## 複驗記錄

- 以公開 Git 物件讀取固定候選、既有共用基線及 18 個原候選的 commit/tree。檢查 5,309 個候選檔與乾淨公開 ZIP 的 bytes 重新計算 Git blob。原公開 REST 短暫回 HTTP 403，改用公開 Git 取同一固定物件。
- 166 個索引目的地 tree SHA 全匹配。157 個與來源 tree 相同，其餘 9 個保留共用基線 10 個獨立審查檔，來源和合成後 tree 各記錄。13 個補回檔案全部在 `sources/legacy/table-reconcile/dist/`，Git blob 與原清單吻合。
- 受影響文件為 `docs/AGENT-HANDBOOK.md`、`docs/SOURCE-LAYOUT.md`、`docs/consolidation/2026-11-09/REPORT.md`。三條相對連結均可達。內容保留原狀態、原 owner、發布責任和產品必要 NOT_RUN。
- Node 24.14.0。固定公開候選的來源命令結果為 `PASS_SOURCE_BYTES_ONLY`。產品功能、瀏覽器、Network/Storage、裝置、部署及使用者外部驗收仍 NOT_RUN。新 40 份預案使用各自獨評。
