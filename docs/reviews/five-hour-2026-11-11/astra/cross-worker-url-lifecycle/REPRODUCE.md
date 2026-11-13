# Worker 建構失敗的固定重現

使用 Node24+，保留此目錄完整證據，在副本執行：

~~~sh
node fetch-fixed.mjs
node probe.mjs
~~~

fetch預期exit0，透過公開HTTPS下載 [九個固定app.js](source-pins.json) 並核每檔Gitblob/bytes；只寫candidate/，既有資料需同bytes。probe完全離線，逐檔驗hash後從未修改app.js擷取完整createWorker函式，在Node VM注入假URL/Blob/Worker。

**固定PR283 / 448bd9fc9865fe65f6014b66f4a2e2d54b76f539預期exit1，輸出DEFECTS_CONFIRMED**：8個construction throw遺漏revoke、9個正常terminate通過，以及workdays construction throw清理通過，共18情境。這不是PASS候選。probe會把此副本results.json更新為本次結果，若要保留原觀察，先複製完整證據。

必要依賴為source-pins.json、fetch-fixed.mjs、probe.mjs與下載的九檔來源；不是單檔腳本、不是全app或瀏覽器執行，也沒有原生Worker/Blob URL。未測native事件、DOM、下載或部署，不把假的VM資源計數說成真browser記憶體測量。

[完整報告](REPORT.md)、[18個結果](results.json)、[來源校驗](source-verification.json)、[實際命令與exit](execution.json)。REPORT記載最初只讀階段沒有來源發布；此補充才將獨評證據公開，產品與registry始終未改。原始Windows環境指紋不公開，只保留PASS摘要。

實際 reviewer 為 local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/five_hour_astra_review，未製作來源產品。原cloud作者、maintenance作者、整合者與未來修正owner皆保留，任何實作者不得獨評自身修正。此報告未對新修正作正式review/accepted；完整來源作者與歷史contributors限制另見 [同PR的作者隔離說明](../cross-controller-race/REPRODUCE.md)。

