# 重現 core 最終獨立複驗

固定候選 `93595abc7b2f9c46a07aaaa74418b3882c8901b4`；[報告](INDEPENDENT-REVIEW.md)評三項100。正式 registry acceptance 另行執行。

使用 Node 24，無需安裝依賴。取得此完整證據目錄後執行，輸出目錄須尚不存在、父目錄已存在：

```sh
node /path/to/core-final/reproduce-review.mjs ./core-final-output
```

入口複製必要 scripts/manifest，從公開固定 raw GitHub GET 下載13個輸入並驗Git blob；包含上輪已公開 oracle/案例來源。沒有私人本機資料依賴，也不執行 maker 驗證腳本。下載完成後測試全部離線，真候選 GitHubClient 只用記憶體 fake transport，token 為明示假字串，PUT 不會送到 GitHub。

預期：A01 12/12、effective readiness/恢復13/13，合計25項，exit0。五型新register/claim各在PUT前拒絕；五型經合法來源及新mapping恢復，各9個synthetic PUT，舊history/task不變。`portable-result.json` 應為 `PASS_INDEPENDENT_RECHECK`。

此可攜入口不再執行完整58項候選套件。該完整套件本輪由primary實跑且本人核對來源與輸出：[primary receipt](primary-suite-receipt.json)、[stdout](primary-suite.stdout.txt)、[reviewer讀回](primary-evidence-readback.json)。若另要獨立執行完整套件，可在已下載的output/candidate下跑 `node --test test/coordination.test.mjs`；勿把該選擇性後續執行混入本記錄。

Windows 子行程 `windowsHide:true`。需要持久環境guard的工作環境應依現有規則在外層執行前後守護；此工具不改系統環境、Git設定、registry或產品狀態。
