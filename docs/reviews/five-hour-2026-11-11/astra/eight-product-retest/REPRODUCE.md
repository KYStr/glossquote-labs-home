# PR331 兩缺陷複驗重現

Node24+，保留本目錄檔案並執行：
~~~
node reproduce.mjs <尚不存在的新輸出資料夾>
~~~

入口需fetch-inputs.mjs、input-manifest.json、race-source-pins.json、url-source-pins.json、race-probe.mjs及url-probe.mjs；下載36個固定公共來源並逐blob驗證，再執行離線兩探針。每步預期exit0，共88 controller＋16 URL案例。輸出僅寫新資料夾，Windows子行程windowsHide；無憑證/瀏覽器/桌面或原生Worker。不是單檔腳本。

[報告](REPORT.md)、[104案結果摘要](portable-result.json)、[九面向覆蓋與未驗](coverage.json)、[固定來源和差異](source-lineage-and-diff.json)。純core及worker-handler16blobs未變，既有數學和382maker測試未重跑；maker的40URL檢查也不冒稱本人16案。

修正來源612eb289281b526267a1d968b71a4579ac9c4165；原缺陷證據固定 [PR329 / 15cee03](https://github.com/KYStr/glossquote-labs-home/tree/15cee03ae514ad0431560ee61a1038b8e60a80fa/docs/reviews/five-hour-2026-11-11/astra)。只有兩已知缺陷的受控範圍PASS，不是完整產品accepted，必要browser/UI/privacy/accessibility/compatibility仍NOT_RUN。

