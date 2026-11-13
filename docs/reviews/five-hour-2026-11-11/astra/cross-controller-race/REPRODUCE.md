# 固定候選的離線重現

固定輸入是 [PR283 / 448bd9fc9865fe65f6014b66f4a2e2d54b76f539](https://github.com/KYStr/glossquote-labs-home/pull/283) 的十個 controller 與相依模組。[31個來源 pins](source-pins.json) 以 Git blob 和長度鎖定，沒有浮動分支依賴。

保留本資料夾所有檔案，使用 Node 24+：

~~~sh
node fetch-fixed.mjs
node probe.mjs
~~~

第一步透過公開 HTTPS 取得固定來源並驗31個 blobs，預期 exit 0；只寫同資料夾 candidate/，既有檔必須完全相同。第二步完全離線，使用注入的受控 worker，**本固定缺陷版本預期 exit 1 / DEFECTS_CONFIRMED**，不是 PASS。結果覆寫這份證據副本的 results.json，不寫 repo產品、registry 或任何系統設定；如要保留原紀錄，先複製整份證據資料夾再執行。

預期110情境：72個舊回覆錯誤接受（九工具各8案）、workdays的8個正確拒絕、30個正向/防護對照通過。詳見 [完整報告](REPORT.md)、[原始結果](results.json)、[命令結果](execution.json) 與 [來源確認](source-verification.json)。

腳本不是單檔可執行：probe.mjs、fetch-fixed.mjs、source-pins.json 以及下載的31個相依來源須一起存在。無套件安裝、憑證、真實瀏覽器、桌面或原生Worker互動。純核心只產生實際協定形狀的合法成功/驗證錯誤 payload，不宣稱重新完成數值oracle驗收。

## 作者隔離與後續修正

本證據作者與實際執行者為 local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/five_hour_astra_review，只製作獨立反例與報告，沒有製作或修改來源產品。來源保留原 cloud 作者、既有maintenance實作者、整合者及各自claim；不以本報告取代其ownership。

原規格作者為 cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory。PR283的maintenance task為 labs-run5-legacy-repair-20261110，實際owner為 local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf，claim為 run5-legacy-claim-44deb43d-ead5-48d1-b826-4561260a6eb1，與本reviewer的完整actor ID不同。原公開REPORT另述兩位實作助手，不能把registry單一contributors欄誤稱完整實作者身分保證；這份缺陷報告不授予任何repair acceptance。

主統籌及原/新維護實作者不能獨評自己產物。後續修正必須由真正owner合法claim、固定新candidate與submit，再核其全部實際makers及作者閉包，由非maker本人獨評；本報告沒有提前接受未來修正，也不證明未來candidate的獨立性。MAP8文件審查另有固定證據，與本產品controller反例分離。

公開範圍只有 docs/reviews/five-hour-2026-11-11/astra/cross-controller-race/ 的報告、腳本、pins和觀察結果。原始Windows環境指紋不公開；原執行前後完整環境輸出精確相同，Git設定守護前後驗證另存本地publication receipt。

