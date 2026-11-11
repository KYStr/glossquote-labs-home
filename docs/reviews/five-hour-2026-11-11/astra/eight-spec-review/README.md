# 可攜式 MAP8 預審證據

固定 PR324 / 3bc18c8ec3659ad87b3da37b5c7dac59570cb288，尚待真實 task 綁定；不接受、不 ready、不寫 registry。

在 Node 24+、有公開 GitHub HTTPS 讀取連線的環境，從本資料夾執行：

~~~
node reproduce-preflight.mjs <尚不存在的輸出資料夾>
~~~

入口使用 Node built-ins，下載 [86個固定輸入](input-manifest.json)，以 Git blob 驗證每檔後核 32 規格檔 bytes、八個精確舊狀態、六份 accepted來源、72字面產品標籤、134相對連結、來源 maker集合。候選 verify 已先閱讀，僅作來源完整性檢查。Windows子行程使用 windowsHide，不接觸 UI 或憑證。

這不是無依賴的單檔腳本：必須一起保留 fetch-inputs.mjs、verify-mapping.mjs、input-manifest.json、candidate-github-observation.json、prior/input-audit.json 及 prior/semantic-matrix.json。歷史資料由同資料夾內固定副本提供。輸出資料夾需新建，入口只寫該資料夾，絕不下載目前浮動分支作判斷。

[獨立報告](INDEPENDENT-PREFLIGHT.md)、[本次結果](preflight-results.json)、[歷史64格](prior/semantic-matrix.json)、[歷史全文](prior/INDEPENDENT-PREFLIGHT.md)。prior 內報告記載的是先前05:34驗證，不是這次執行；其完整53個輸入來源見 prior/input-manifest.json。225個 provided字面輸出與33個provided成功摘要均不重算。產品/GUI/部署為 NOT_RUN，文件預審不是產品驗收。

正式 task 綁定與逐八面向分數待另附；三份既有候選/升級排除新庫存，另五份需 fresh中央去重與獨立 ready。

