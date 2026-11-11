# 精度組獨立審查的重現入口

結論與限制見 [INDEPENDENT-REVIEW.md](INDEPENDENT-REVIEW.md)。這是 PR285 固定文件候選的三面向維護審查，不是產品執行、文件八節 ready 或部署證明。正式 registry review 須由實際 reviewer 在協調 slot 內另行提交。

固定來源：`448bd9fc9865fe65f6014b66f4a2e2d54b76f539`；固定候選：`23fa1265837f66fbedc04441db260dbb2a5ed924`。本目錄須完整取得，不能只下載單支 Python。輸入 manifest 記錄兩個固定 commit 的檔名及 Git blob；驗證先核對輸入 bytes，再計算 fixtures。候選程式、作者測試及依賴套件均不執行。

使用 Node.js 24 與 Python 3.12 標準函式庫，在本資料夾執行：

```sh
node fetch-inputs.mjs --output-dir ./repro-inputs
python verify-independent.py --source-root ./repro-inputs/source --candidate-root ./repro-inputs/candidate --output-dir ./repro-output
```

`repro-inputs` 必須不存在或為空目錄；下載程式只從固定 public raw URL 讀取 13 份原始規格與 20 份候選文件。第二步離線執行，可自行提供已下載的同版目錄；33 份檔案必須符合 manifest。輸出目錄不得與任一輸入目錄重疊。程式不啟動子行程、不連接桌面、不安裝套件、不讀憑證或更改系統設定。

隨附 [oracle_snapshot.py](oracle_snapshot.py) 是本 reviewer 首輪獨立 Fraction、Gregorian date、55 位 Decimal 定義快照；[oracle-provenance.json](oracle-provenance.json) 記錄原完整檔案及定義快照 SHA-256。原報告 driver 不在快照內。Python 入口依賴該同目錄快照與兩份 manifest，不依賴本機前一輪目錄。

原獨立結果在 [offline-review.json](offline-review.json)（49 項、16 race core、8 成功列形狀）；公開入口另重算原先沿用的 35 份未變 cooking/NHI 核心 expected 與 58 級 NHI 附錄，共 143 項。新入口實際執行摘要在 [reproduction-result.json](reproduction-result.json)。下載結果同時檢查候選 20 個 Git blob、13 份受測 spec bytes 和 53 個相對連結。

[public-byte-verification.json](public-byte-verification.json) 是原 GitHub connector blob 與公開 bytes 的完整比對；[pr-files.json](pr-files.json) 與 [pr-readback.json](pr-readback.json) 記錄實讀 PR 範圍及固定 head。[independent-diff.patch](independent-diff.patch) 顯示原始規格到候選的 8 份文件差異。Windows 原始指紋不公開；[environment-summary.json](environment-summary.json) 只保留執行及不變摘要。
