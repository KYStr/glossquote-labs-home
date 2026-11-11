# 完賽、健保與料理規格勘誤交接

本文件修正候選已完成作者驗算，供固定 PR 獨立複驗。獨立複驗與產品驗收均為 NOT_RUN。

## 固定來源與責任

- 維護任務 `labs-five-hour-precision-repair-20261111`。實際 actor `local-codex:01a1c886-768c-7cc1-adb2-bf050f33316b`，claim `precision-claim-bb61e078-c0ca-46f3-bf93-0aca39d454fc`。要求設定為 Sol medium，後端模型身分未獨立確認。
- ACK、register-task、claim 在 GitHub 登記表 r1538–1540 寫入並精確讀回。start 在 r1541 精確讀回 `working`，已釋放登記寫入時段。完整事件與 requestHash 見固定開工登記。 [GitHub registry r1541](https://github.com/KYStr/glossquote-labs-home/blob/59ac7407e69cc6c50bd674dd4b0c40bd477d6093/coordination/work-registry.json)
- 固定來源是 PR #283 的 `448bd9fc9865fe65f6014b66f4a2e2d54b76f539`。本機 13 檔逐檔核對 GitHub blob 後複製，見 [來源 manifest](evidence/source-manifest.json)。 [PR #283](https://github.com/KYStr/glossquote-labs-home/pull/283)
- 工作 brief 與初審固定於 `4a838d688e60356de444e44212950f5306980b3d`。 [工作 brief](https://github.com/KYStr/glossquote-labs-home/blob/4a838d688e60356de444e44212950f5306980b3d/docs/reviews/five-hour-2026-11-11/dispatch/repair-precision/TASK.md) · [Astra 初審](https://github.com/KYStr/glossquote-labs-home/blob/4a838d688e60356de444e44212950f5306980b3d/docs/reviews/five-hour-2026-11-11/astra/FINDINGS-INITIAL.md)

## 修正與重現

- **FH-QC-A-01 完賽時間**。成功表列固定四個標準距離，填自訂目標才加第五列。只有表內目標距離等於已知距離時，該列時間及配速才與輸入恆等。用 15,000 m、1:07:30 重現，空白自訂目標給四列，填 15,000 m 給第五列 4,050 秒、270 秒／公里。保留 18 筆原案例並新增一筆核心案例。依主統籌的產品裁定，這是 `existing-tool-upgrade`，供既有 Running Pace Calculator 新增選填自訂目標及簡化預測流程，不計新工具 ready 庫存。固定既有規格的求配速模式已可填時間與距離，並提供 Riegel 四標準目標。 [既有規格](https://github.com/KYStr/glossquote-labs-home/blob/40a7dc689e8e2fc2c527c323ca68398d95e9db19/docs/specs/running-pace-calculator/SPEC.md#L6-L23)
- **FH-QC-A-02 健保**。刪除第 1 級的錯誤浮點反例，保留精確整數及 half-up。`floor(457.54499 + 0.5)` 等於 458。29,500 元投保額精確值為 `91509/200`，同樣得 458。用 150,000 元投保額的 2,326.5 → 2,327 區分恰半進位與銀行家捨入。級距與 58 級附錄表逐行相同，既有 fixtures 位元組相同。
- **FH-QC-A-04 料理**。保留既定 227 g／杯，依 King Arthur Baking《Easy As Pie》第 1 頁直接列出的無鹽奶油 1 杯採值。同出版社重量表的半杯 113 g 倍乘為 226 g。規格、簡報、作者核對及雙語 FAQ 已同步標明來源。89 g／杯的燕麥取一般或快熟燕麥列。12 個密度常數與既有 fixtures 均保留，227 g 奶油仍得 1 杯。 [Easy As Pie](https://shop.kingarthurbaking.com/content/class-pdfs/EasyAsPie_February2025.pdf#page=1) · [Ingredient Weight Chart](https://www.kingarthurbaking.com/learn/ingredient-weight-chart)

## 實際變更

8 檔，94 行新增、33 行刪除。以下路徑相對於 `docs/specs/`。本修正與固定 PR #283 相比有 8 檔差異。基礎分支缺這三個規格目錄，本候選帶入指定的 13 個來源檔，方便逐檔核對。

- `race-time-predictor/SPEC.md`、`BRIEF.md`、`AUTHOR-CHECK.md`、`fixtures.json`
- `nhi-premium-calculator/SPEC.md`
- `cooking-measurement-converter/SPEC.md`、`BRIEF.md`、`AUTHOR-CHECK.md`

[完整 diff](evidence/precision.patch) 的 SHA-256 為 `3e58ac9d81696d8702abd30247f10a1499dd2843f0cec072388836de474ee713`。 [候選 manifest 與逐檔雜湊](evidence/candidate-manifest.json) 的 SHA-256 為 `7d2dadbf680ab667fd894b72e47c702f194b867be0e7ead7ed7e833eddccc88e`。兩份證據皆以固定 PR #283 為比較基準。

## 實際驗證與未驗項

- Node v24.14.0 執行 `node docs/reviews/five-hour-2026-11-11/dispatch/repair-precision/evidence/check-precision.mjs <固定來源目錄> <本候選根目錄>`，exit 0。核對三份規格各有八節、13 個來源 blob、8 個變更檔。重算 8 筆完賽成功核心案例，明確對照 5 筆列形狀／恆等案例。用 BigInt 重算健保 58 級、174 項保費，覆核首級與恰半界。核對 12 個料理密度、奶油換算字面結果及健保和料理的 fixtures 位元組。 [命令紀錄](evidence/offline-publication-run.json) · [離線驗算程式](evidence/check-precision.mjs)
- `git diff --no-index` 每個變更檔 exit 1 表示有差異，`--check` 無空白錯誤輸出。`git apply --stat` exit 0。 [差異命令紀錄](evidence/diff-run.json)
- 登記寫入前後 Git 設定指紋一致。Windows 持久環境前後檢查 exit 0，HKCU/HKLM PATH 和 Environment-key 指紋一致，暫存路徑數均為 0。
- 文件獨立複驗、產品測試、瀏覽器、裝置、Network/Storage、下載互動、部署與正式站檢查皆 NOT_RUN。以審查 PR 的固定 head 核對這份文件。
- 完賽規格描述的是升級流程。既有工具的實際整合、單位與 UI 相容性、驗收及發布由後續任務處理。原三項規格、固定候選、原作者及所有權的登記紀錄仍以 GitHub 為準。
