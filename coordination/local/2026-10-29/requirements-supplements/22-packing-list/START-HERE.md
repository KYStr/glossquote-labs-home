# 開始：行李清單與重量試算

狀態（2026-10-13）：M1 R1 已主驗放行，PACK-M2-T01 正式候選與PUBLIC GitHub source已發布，commit02e9bc9a39ed12530e157806e49283455eb84632。workspace與固定ZIP重建各68/68 tests及全部六gates exit0。Cloudflare尚未部署、首頁未更新，待主代理M2/M3。以 HANDOFF.md與TASK-ENTRY最新紀錄為準。

## 先了解產品

此工具幫一次旅行列物品、數量、單件克數及打包狀態。重量留白是未知而不是零；有未知項目時只顯示已知小計並拒絕判斷是否超過使用者上限。支援使用者明確觸發 JSON 備份、解析預覽和確認替換。

閱讀順序：TASKS.md 看當前 milestone 和允許檔案；PRODUCT.md 看可見行為與硬限制；TECHNICAL.md 實作 core 和匯入/匯出狀態；ACCEPTANCE.md 按預期驗收；UX-SEO.md 和 docs/ 執行介面與安全契約。

## 執行方式

- 確認 Node.js >=24。
- npm run dev 僅監聽 127.0.0.1:4202，服務只公開 public/。
- npm test、npm run check、npm run build 必須先建立後才可執行。
- 本機頁面預期 http://127.0.0.1:4202/index.html 與 /en/index.html。

Node v24.14.0、npm 11.9.0。沒有 runtime 或開發套件，無須 npm install。可使用 C:/Program Files/nodejs/node.exe 與同目錄 npm.cmd。

自己的預覽已保持運行：PID 82156，requested/assigned port 均 4202。若重新啟動時 port 已占用，server 會改用 OS 指派的 loopback port 並輸出實際 URL，不停止原服務。

最新M2證據 ../../.runs/github-publish/glossquote-labs-packing-list/m2-20261013-01/，含PUBLIC驗證、固定ZIP/blob核對/安全解壓重測、commands/manifest/diff、Git與Windows guard、production native browser。npm run build:production/check:production/check:release產生/驗正式12資產；npm run serve:production是loopback本機驗證adapter，不是live站。原T00/R1證據完整保留。B09實際200%zoom、完整Network/Storage、實體手機/AT及Wrangler CLI dry-run NOT_RUN，不用mock替代。

主代理驗收放行後才可進 M2；此文件不是 GitHub 或正式上線證據。原始 SPEC_ONLY 規格文件保留為本輪輸入，實際進度以交付紀錄為準。
