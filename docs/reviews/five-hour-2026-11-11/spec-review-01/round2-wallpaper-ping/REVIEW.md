# 壁紙與坪數維護候選複驗

**三項維護文件驗收通過，無阻斷項。** 壁紙修正後的窗戶例是 6 幅、2 捲、淨面積 6.04 m²。坪數以 100 坪區分精確係數的 3558.32 ft² 與近似係數的 3558.33 ft²。獨立重算 50/50 例、100 列速查表及三份固定下載。建議在維護者交驗同一提交並取得串行時段後，正式記錄維護審查結果。[候選 PR #299](https://github.com/KYStr/glossquote-labs-home/pull/299)

任務 ID 為 `labs-five-hour-repair-wallpaper-ping-20261111`，候選 `c2c3f7715023990b1427e052a25c52f1987eaca9`。Registry revision 1578 的承接、開始事件、owner 與 claim 與回執一致，維護當時為 `working`。原規格 #226、#227 的作者、owner、claim 及固定來源均保留。這份證據的審查組為 FH-spec-review-01，未參與維護候選製作。[機器可讀審查](review.json) · [來源核對](provenance.json)

| 維護驗收面向 | 分數 | 證據 |
|---|---:|---|
| `spec-corrections` | 98 | 壁紙按完整牆寬與整幅裁切，開口只影響淨面積。超高列、欄位、錯誤優先順序及繁英說明一致。坪數改用可區分的 100 坪案例。 |
| `exact-fixtures` | 100 | Python 3.12.5 從輸入用整數與分數重算，50/50 字面值、100 列表格及六個控制器案例相符。三份固定 JSON 的文字、長度、SHA-256 全相符。兩個公開 Node 24 驗證器亦 exit 0。 |
| `provenance-and-scope` | 100 | 從指定父提交到 #299 是一個提交、15 個核准檔案。8 個歷史 blob 與 15 個候選 blob 核對通過。七個變更檔依公開補丁重播後逐 byte 等於候選，未改的坪數 BRIEF 也逐 byte 一致。 |

壁紙 WALL-01 的周長 318 cm 除以捲寬 53 cm 得 6 幅。牆高 250 cm 加修剪 10 cm 得每幅 260 cm，捲長 780 cm 剛好可裁 3 幅，需 2 捲。窗 159 × 120 cm 從 79,500 cm² 毛面積扣 19,080 cm²，剩 60,420 cm²，顯示 6.04 m²。單捲只有 41,340 cm²，低於淨面積。原 12 m 例的尺寸清單與面積輸入都得 23 幅、8 捲、淨面積 26.31 m²，清單另外保留 240 cm 開口寬摘要。WALL-02 的 3.00 m 開口在 2.50 m 牆回 `OPENING_HEIGHT_EXCEEDS_WALL`、`heightM`、`row:1`，等高合法。當第 2、3 列皆超高且同時總寬超限、捲長不足，先報第 2 列高度。第 2 列寬度文法錯誤與 `wastePercent` 文法錯誤各自先於跨欄高度檢查。[壁紙固定規格](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/wallpaper-calculator/SPEC.md#L62)

100 坪的精確平方英尺值是 `62500000000/17564481`，以 3.3058 替換坪轉平方公尺係數則是 `516531250/145161`。各自只在最後進位一次，得到 3558.32 與 3558.33。第 100 列與單次輸出 330.58 m²、3558.32 ft² 一致。30 坪兩法均顯示 1067.50，原案例與 99-byte 報告維持相同。坪數規格表仍有「整數」用語指有限小數，屬沿用的文字問題，正確係數、量綱與算法均已釘定。[坪數固定規格](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/ping-area-converter/SPEC.md#L119) · [NIST 國際英尺換算](https://www.nist.gov/pml/us-surveyfoot/revised-unit-conversion-factors)

| 文件八節 | 壁紙 | 坪數 |
|---|---|---|
| goal | 裝修與店內採購情境、幅數、裁切長度與捲數 | 看房／裝修時的四單位對照與使用限制 |
| scope | 周長與逐牆、三種開口、裁切與損耗界線 | 四單位與百列速查、排除契約用途 |
| userFlow | 繁英開口及採購說明、錯誤欄與列號、取消與重設 | 四列結果、畳概略標籤、速查與錯誤狀態 |
| inputsOutputs | 整數公分、平方公分、整幅與固定下載 | 有理數、單次 half-up、四輸出與固定下載 |
| implementation | 瀏覽器本地、世代失效與資源釋放 | 本地 BigInt 與本機下載、無持久資料 |
| acceptance | 九個產品面向與必要檢查方法 | 九個產品面向與必要檢查方法 |
| tests | 19 核心、3 控制器與兩份 canonical 報告 | 24 核心、1 百列速查、3 控制器與原報告 |
| handoff | 固定來源與 PR、製作另取 claim | 固定來源與 PR、製作另取 claim |

在此目錄執行 `python -B -X utf8 verify.py` 可用隨附兩份固定 fixtures 重算。控制器用同一世代才接收結果的模型驗 dirty、取消、reset 與晚到訊息，沒有執行產品 Worker。兩份壁紙報告分別是 282 與 274 bytes，坪數原報告是 99 bytes。[獨立驗算程式](verify.py) · [逐案輸入、推導和預期](independent-recheck.jsonl) · [命令與雜湊](execution.json)

補丁讀取與重播使用 `node replay-source-diff.mjs <原壁紙規格目錄> <原坪數規格目錄> <候選repo根目錄>`。前兩個目錄各有固定來源的四個規格檔，第三個指向 PR #299 的固定提交 checkout。公開補丁的兩個刪除行保留原作者資訊的替代標記，其餘每個舊行與新行都核對。輸出重播結果含檔案、區塊數與補丁 SHA-256。[原壁紙 #226](https://github.com/KYStr/glossquote-labs-home/tree/f8939291d2e283f1e6496d3a9cc802a054732200/docs/specs/wallpaper-calculator) · [原坪數 #227](https://github.com/KYStr/glossquote-labs-home/tree/6d7cc4cd18a273b0d386b19b85b883573d097cba/docs/specs/ping-area-converter) · [公開補丁](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/reviews/five-hour-2026-11-11/candidates/repair-wallpaper-ping/source-diff.patch) · [重播程式](replay-source-diff.mjs) · [重播結果](provenance-replay.json)

兩份原規格的登記仍以文件八項作為製作契約，ready 仍受此登記差異阻擋。產品九面向、瀏覽器、正式 SEO、部署均為 `NOT_RUN`。既有 Build 版本仍由原責任流程處理，壁紙需將新錯誤連到開口列並更新 UI 和報告，坪數需釘 100 坪迴歸。正式維護交驗與審查登記待主統籌安排。[壁紙 Build #270](https://github.com/KYStr/glossquote-labs-home/pull/270) · [坪數 Build #274](https://github.com/KYStr/glossquote-labs-home/pull/274)
