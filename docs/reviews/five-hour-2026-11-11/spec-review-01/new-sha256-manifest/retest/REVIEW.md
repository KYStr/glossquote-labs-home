# 多檔 SHA-256 清單校驗退修複核

固定候選 `456b4210b3a2a41c0285cee30867bd741bc59c13` 的文件複核通過。`SHA312-01` 已修正，`acceptance` 從舊候選的 **88** 分重評為 **100** 分。舊候選 `2a2cc4fddf0ffd28d07c579f783d4445e61b0e20` 的退修判定保留。 [候選 PR #312](https://github.com/KYStr/glossquote-labs-home/pull/312) · [舊版退修報告](https://github.com/KYStr/glossquote-labs-home/blob/b5857f2658d5e10d29756a473c935f9b8a48fb89/docs/reviews/five-hour-2026-11-11/spec-review-01/new-sha256-manifest/REVIEW.md)

## 差異與受影響契約

新 head 在舊 head 上增加一筆提交。SPEC 僅改第 225 行，AUTHOR-CHECK 更新 SPEC 的 SHA-256 並新增退修查核段。BRIEF 和 fixtures 與舊候選逐位元組相同。 [新版條款](https://github.com/KYStr/glossquote-labs-home/blob/456b4210b3a2a41c0285cee30867bd741bc59c13/docs/specs/batch-sha256-manifest/SPEC.md#L225) · [新版作者檢查](https://github.com/KYStr/glossquote-labs-home/blob/456b4210b3a2a41c0285cee30867bd741bc59c13/docs/specs/batch-sha256-manifest/AUTHOR-CHECK.md#L24-L34) · [兩檔差異](source-diff.patch)

| 檢查 | 獨立結果 |
| --- | --- |
| 原最小 digest 反例 | 一列有效清單、同名 3-byte 檔案 `x`（hex `616263`），digest 拒絕。先讀第 1 件，呼叫第 1 件的 digest，再回 `DIGEST_FAILED`，`reportUtf8=null`。 |
| 預檢與錯誤順序 | 固定測例的清單重名、清單容量／讀取、單檔與總量界線均依首錯規則阻擋。另用有效清單 File 搭配 33,554,433-byte 所選檔，清單讀取 1 次，回 `FILE_SIZE_LIMIT`，待核對檔讀取和 digest 均為 0。 |
| 個別 `read_error` | 配對檔讀取拒絕及長度不符仍記 `read_error`，成功讀取的後續配對仍完成。整批完成時可下載完整診斷報告。 |
| 後續全批 digest 故障 | 首件讀取拒絕，次件讀取後 digest 拒絕。讀取位置 `[1,2]`、digest 位置 `[2]`，回次件的 `DIGEST_FAILED`。第三件未讀，無部分報告。 |
| 已有進度的 Worker 故障 | 假 Worker 在 1／2 進度時失敗。控制器回 `WORKER_FAILED`，保留草稿，終止 Worker 並回收其 URL，下載維持停用，晚到進度無法覆寫狀態。 |

修訂條款將待核對檔零讀取限於預檢失敗，並列明清單 File 讀取、個別讀取錯誤續行及執行期全批失敗。結果與固定首錯表和執行順序一致。 [首錯規則](https://github.com/KYStr/glossquote-labs-home/blob/456b4210b3a2a41c0285cee30867bd741bc59c13/docs/specs/batch-sha256-manifest/SPEC.md#L92-L109) · [執行規則](https://github.com/KYStr/glossquote-labs-home/blob/456b4210b3a2a41c0285cee30867bd741bc59c13/docs/specs/batch-sha256-manifest/SPEC.md#L172-L176) · [複驗輸出](retest-output.json)

## 八節文件評分

| 文件面向 | 新分數 | 查核 |
| --- | ---: | --- |
| `goal` | 100 | 收件角色、Windows 桌面場景、交付清單及 JSON 成果與初審相同。 |
| `scope` | 100 | GNU 單層子集、UTF-8 名稱、清單與檔案容量、離線條件沿用初審。 |
| `userFlow` | 100 | 兩語、來源切換、取消、重試、dirty、離頁及下載流程無差異。沿用 60 步查核。 |
| `inputsOutputs` | 100 | 字面案例及首錯表不變。複驗確認清單 File 可先讀，選檔超限時待核對檔讀取為零。 |
| `implementation` | 100 | 核心、Worker 與控制器契約不變。針對 hashing 途中故障複驗清理、拒絕晚到與停用下載。 |
| `acceptance` | 100 | 修正後的第 225 行與預檢、read_error 及全批執行錯誤相符。九個產品 ID 及觀察方法均核對。 |
| `tests` | 100 | 原 fixtures 完整 bytes 不變。複驗 8 個固定案例與 4 個小型合成反例，沿用其餘獨立驗算。 |
| `handoff` | 100 | 兩檔差異、四檔固定身分、新舊 PR head、原承接及新 AUTHOR-CHECK 的 SPEC 雜湊均核對。 |

九個產品驗收 ID 維持原有定義。產品、真實瀏覽器／裝置及部署均為 `NOT_RUN`。遠端 revision 1617 讀回原 owner 與 claim，規格工作為 `working`。 [固定評分與來源](review.json)

## 重現

把前一輪固定的 `verify.py` 與 `fixtures.json` 放在本複核目錄上層，以 Python 3.12.5 執行下列指令。腳本會先核對兩份來源的 SHA-256。此次 exit 0，跑了 8 個受影響的固定案例與 4 個小型合成案例。其餘字面測例沿用舊版獨立證據。 [原獨立 oracle](https://github.com/KYStr/glossquote-labs-home/blob/b5857f2658d5e10d29756a473c935f9b8a48fb89/docs/reviews/five-hour-2026-11-11/spec-review-01/new-sha256-manifest/verify.py) · [原固定 fixture](https://github.com/KYStr/glossquote-labs-home/blob/b5857f2658d5e10d29756a473c935f9b8a48fb89/docs/reviews/five-hour-2026-11-11/spec-review-01/new-sha256-manifest/fixtures.json) · [複核腳本](retest.py)

```text
python -B -X utf8 retest.py ..
```
