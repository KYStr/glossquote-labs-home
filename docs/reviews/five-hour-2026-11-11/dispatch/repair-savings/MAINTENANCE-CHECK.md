# 儲蓄尾款與達標月份｜維護送審

任務 `labs-five-hour-repair-savings-20261111`。既有複利工具升級提案。請在本 PR 的固定 head 核對三項維護面向。 [固定維護簡報](https://github.com/KYStr/glossquote-labs-home/blob/418aee70f60a04cbe19e339597c91a056bcad0c4/docs/reviews/five-hour-2026-11-11/dispatch/repair-savings/TASK.md)

- `spec-corrections`。目標、計畫期末餘額、尾款及全額存入餘額各自列示。先精確比較 B(1200)，界內再取最早達標月，所有索引先受 0–1200 上限。模式 A 作文件回歸參考。 [修訂規格](../../../../specs/savings-goal-calculator/SPEC.md)
- `exact-fixtures`。Python 3.12 標準庫 `Fraction` 逐月遞推核對 26/26 個核心與合成狀態案例，exit 0。受限閉式驗算另核對 1,200／1,201 月、正利率超期、小額捨入差異及一分尾款。含息尾款與純成長案例的期末／利息分別為 `20000.01 / 2547.13` 與 `11046.22 / 1046.22`。 [字面案例](../../../../specs/savings-goal-calculator/fixtures.json) · [驗算腳本](verify-maintenance.py) · [驗算輸出與前後差異](fixture-results.json)
- `provenance-and-scope`。第一個提交的四份規格檔與原候選逐檔 bytes、Git blob、SHA-256 相符。第二個提交修訂同一目錄並附送審證據。既有 #44 規格與 #80 產品候選均有兩種反算，既有逐月捨入模型需由後續產品整合任務處理。本提案不計新工具 ready。原 #245、owner 及登記歷史留存，REG-01 另案。 [原候選](https://github.com/KYStr/glossquote-labs-home/blob/9828c5d10ff75720333491cfc21f190b7cd7ed16/docs/specs/savings-goal-calculator/SPEC.md) · [#44 固定規格](https://github.com/KYStr/glossquote-labs-home/blob/5a9acc11b5b23200c3d4cda32adaafbbd389532e/docs/specs/compound-interest-calculator/SPEC.md) · [#80 固定介面](https://github.com/KYStr/glossquote-labs-home/blob/e42ebf56853ad8e46964ea8fc1ebf9623c6c2bb1/tools/compound-interest-calculator/public/en/index.html#L33-L34)

將固定原候選的原始案例存為 `baseline-fixtures.json`，再於 repo root 執行下列命令，應回 exit 0。 [原始 fixtures](https://github.com/KYStr/glossquote-labs-home/blob/9828c5d10ff75720333491cfc21f190b7cd7ed16/docs/specs/savings-goal-calculator/fixtures.json)

```sh
python -B -X utf8 docs/reviews/five-hour-2026-11-11/dispatch/repair-savings/verify-maintenance.py docs/specs/savings-goal-calculator/fixtures.json baseline-fixtures.json
```

修訂 fixtures SHA-256 為 `7ccf7239d2b5bfe209a69c9b711b4533f8d1ae231b84e160ac02d08caf1f3632`。含息尾款 canonical 報告樣本 371 bytes，SHA-256 `9b80ce6af411e6b9e7e9129161cf11f111a3a34213b34f92e06c4377b021561a`。

獨立維護審查及原預案八節複審仍待執行。產品九面向、瀏覽器、實際下載、Network/Storage、正式 SEO、整合、合併與部署均為 NOT_RUN。
