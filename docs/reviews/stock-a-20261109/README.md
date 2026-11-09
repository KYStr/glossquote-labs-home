# A 組獨立審查與重現

[修訂後覆核](INDEPENDENT-REVIEW-a5e7356.md) 對應 `a5e7356dae36d2aac3db068352a916d76c7594c3`。[原審](INDEPENDENT-REVIEW.md) 保存 `aab724b71589664b26c8d92735a637ac37f0c4b2` 的十九件通過及一件退修。 [規格 PR 72](https://github.com/KYStr/glossquote-labs-home/pull/72)

以 Node 24 與 Git 在共用 repo 的任一本機副本執行。先取得兩個固定 commit，再從包含此審查文件的 repo 根目錄跑以下命令。腳本使用 Git 的指定 commit blob，無須切換正在編輯的分支。

```powershell
git fetch origin aab724b71589664b26c8d92735a637ac37f0c4b2 a5e7356dae36d2aac3db068352a916d76c7594c3
node docs/reviews/stock-a-20261109/recompute-a-witnesses.mjs .
node docs/reviews/stock-a-20261109/recompute-a-revision.mjs .
```

若審查資料與 repo 副本位於不同目錄，第一個參數改為該 repo 路徑。原審腳本可再帶一個 [原審讀回](candidate-readback.json) 路徑。修訂腳本可接 [修訂差異](candidate-delta-a5e7356d.json) 路徑與原審讀回路徑。省略時從腳本所在目錄讀取。

原審腳本核對固定來源 SHA-256、二十份代表性算例和六十件狀態證據，會印出原審待退修文件。修訂腳本核對同一組路徑在新 commit 的 Git blob，只重算受影響的換行／BOM／輸入上限。產品與瀏覽器驗收維持 NOT_RUN。
