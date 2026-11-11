# Calories 文件維護審查的可攜重現

結論、三面向分數、八節內容覆核與限制見 [INDEPENDENT-REVIEW.md](INDEPENDENT-REVIEW.md)。固定候選為 PR288 的 `76aeb64235e82de05970e18a2e1231859aa1ee2a`，直接 parent 與 PR base 均是 PR283 的 `448bd9fc9865fe65f6014b66f4a2e2d54b76f539`；保留此疊加依賴，沒有合併或部署。

請完整取得本資料夾。使用 Node.js 24 與 Python 3.12 標準函式庫，在此資料夾執行：

```sh
node fetch-inputs.mjs --output-dir ./repro-inputs
python verify-controller.py --source-root ./repro-inputs/source --candidate-root ./repro-inputs/candidate --output-dir ./repro-output
```

第一個命令只讀固定 public raw GitHub URLs，下載 5 份原始規格、6 份候選文件與 4 份候選中的共用連結目標；15 個 Git blob 必須吻合。目標資料夾須不存在或為空。第二步完全離線，可改用其他已下載目錄，先重新核對這 15 份固定 bytes，再將結果與差異寫到指定輸出目錄。輸出不能與輸入目錄重疊。

入口依賴隨附的 [source-blob-manifest.json](source-blob-manifest.json)、[input-manifest.json](input-manifest.json)、[shared-link-targets.json](shared-link-targets.json) 和 [prior-core-evidence.json](prior-core-evidence.json)。後者只摘錄本 reviewer 首輪的 20 個核心 PASS，保留原完整報告 SHA-256、執行時間與方法；原先缺少字面控制狀態的檢查沒有被改寫成 PASS。

驗證不執行作者腳本、候選產品或瀏覽器，也不重新計算未變的 20 個核心案例。它核對這 20 個 record 的原始 UTF-8 內容、14 MET 列、範圍與公式未變，然後獨立重放新增 controller 契約：3 個初始狀態、34 步、9 個交付 payload、3 次精確下載、4 次拒絕、6 次忽略晚到交付，另有 10 個邊界探測。只有新 controller job 的交付值以 Fraction 獨算。95/95 檢查通過的可攜執行摘要見 [reproduction-result.json](reproduction-result.json)。

[independent-controller-review.json](independent-controller-review.json) 保留原獨立逐步證據，[independent-diff.patch](independent-diff.patch) 保留三份規格檔的差異。15 份固定輸入是依 manifest 下載，沒有把其他原作者作品併入本審查 PR。

文件模型通過不是產品 controller、下載、BFCache、裝置或無障礙實測。原 spec ref／criteria 的合法維護套用與非作者正式八節 ready，亦是後續程序；這份公開證據不執行 registry mutation。
