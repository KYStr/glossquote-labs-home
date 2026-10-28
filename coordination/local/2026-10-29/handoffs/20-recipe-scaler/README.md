# 食譜份量換算

目前狀態：M1 實作已凍結，等待主代理獨立驗收。M2/M3、GitHub、正式網站、首頁與外部驗收仍未開始。

食譜份量換算解決把食譜由一種份數調整為另一種份數時，逐項重算食材數量的工作。使用者輸入原份數、目標份數和食材列；工具以精確整數比例計算，不會猜測單位換算。

請由 [START-HERE.md](START-HERE.md) 開始；產品行為在 [PRODUCT.md](PRODUCT.md)，精確數值算法在 [TECHNICAL.md](TECHNICAL.md)，驗收案例在 [ACCEPTANCE.md](ACCEPTANCE.md)，里程碑在 [TASKS.md](TASKS.md)。共通設計契約已完整複製到 [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)。

本機預覽：[繁中](http://127.0.0.1:4200/index.html)、[English](http://127.0.0.1:4200/en/index.html)。預覽只綁定 loopback 並保持 noindex/nofollow。task-owned Node PID 81368 保留供主驗。

Node v24.14.0 / npm 11.9.0，零 runtime 或 development 依賴；在本工具目錄執行：

```powershell
& 'C:/Program Files/nodejs/npm.cmd' test
& 'C:/Program Files/nodejs/npm.cmd' run check
& 'C:/Program Files/nodejs/npm.cmd' run build
& 'C:/Program Files/nodejs/npm.cmd' run dev
```

2026-10-13 固定版：49/49 node:test 通過，0 skip；check/build 通過。繁中與英文各完成真瀏覽器桌面/原生 320px、示例、修改後失效、錯誤定位、鍵盤與原生貼上。核對紀錄和完整 NOT_RUN 邊界見 [HANDOFF.md](HANDOFF.md)。無法暴露的實體手機、原生 IME、實際 200% zoom、完整 Network/Storage 與原生剪貼簿拒絕路徑仍為 NOT_RUN。

文字欄位採單列文字區，保留完整貼上的換行與超限原稿交由既定驗證拒絕；不透過 maxlength 無聲截短。所有食材輸入只留在本頁記憶體。

固定證據：[M1 evidence](../../.runs/recipe-scaler/m1-2026-10-13-01a133a5/)。implementation source、契約、runtime/dist 位元組快照與 manifests 已保存；未建立 Git commit 或公開 repository。

預定正式網址為 https://recipe.glossquote.com/index.html 與 https://recipe.glossquote.com/en/index.html，目前尚未部署。M2 需主代理正式放行；M3 與首頁由主代理管理。
