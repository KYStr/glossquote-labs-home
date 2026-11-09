# 檔案 SHA-256 校驗開工入口

2026-10-13 最新現況：T01 已正式主驗 PASS，CHECKSUM-T02-UI 已依授權實作並凍結，owner 釋放供主代理親驗。最終 npm test **130/130、0 fail/skip**，check/build exit 0，10 個雙語互動預覽資產逐 byte 建置；Windows PATH／完整 Environment-key 指紋未變。依使用者指示，以瀏覽器 API 操作 Edge，沒有在本輪使用原生 Computer Use；23 項瀏覽器觀察 PASS，真 Worker／原生 copy／實際 CSS 320px 有證據。Chrome API、Edge 原生選檔權限、實體下載檔案、真 200% zoom、上一頁 pagehide 資源觀測仍 NOT_RUN，不能稱完整瀏覽器驗收通過。詳見 [HANDOFF](HANDOFF.md)。

目前等待 **T02 主驗與缺口補驗**，T03 尚未放行；正式 GitHub／hosting／首頁／外驗尚未執行，尚非發布候選。原 threadId／Sol max 設定請求不變，backend 未獨立確認。App Goal 實際 status 仍 blocked；本輪依主代理 T02 指示續作，沒有將未完成產品 Goal 改寫 complete。

以下為 T01 交接時現況（歷史）：

2026-10-12 最新現況：主代理已正式接受 T00 並實際放行 CHECKSUM-T01-CORE-WORKER。T01 checksum/session/Worker/生成檔與自動測試完成，最終 npm test 112/112、零 skip，check/build exit 0；全部 T00 regression 保留。T01 現凍結、owner 釋放供主代理親驗；**T02 尚未批准，不能提前接 UI。** 原 threadId／Sol max 設定請求不變，backend 未獨立確認；Goal 維持 active。T01 來源／manifest／接口與未驗項見 [HANDOFF](HANDOFF.md)。頁面仍為停用預覽，尚非發布候選，GitHub/hosting/外驗尚未執行。

以下為 T00 放行前交接紀錄（歷史）：

2026-10-12 現況：原功能對話已建立，threadId=`01a12e45-d062-76b3-9263-bc7a7fb29f42`、host=local；create_thread 已接受 gpt-6.1-sol/max 設定請求，backend 身份仍未獨立確認。T00 停用骨架與 dev/test/check/build 已實作，最終 69/69 測試、check/build exit 0。主代理獨立 gate 也已通過，現凍結並釋放 owner 供最終 manifest 核對。**T01 尚未放行；只收到主對話實際 T01 指示後才能繼續。**

目前不是可用 hash 產品或發布候選；核心、完整 UI、正式 SEO、source publication、hosting 與外部複驗仍 NOT_RUN。T00 詳細命令、修正前後證據與固定清單見 [HANDOFF](HANDOFF.md)。有界產品 Goal 已實際建立且維持 active；不因等待主代理而 pause/complete。

派工前紀錄（歷史）：SPEC_ONLY / QUEUED，尚未開功能對話或實作。當時需等名額，由主對話真正 create_thread；此段保留規格階段背景，不代表現在狀態。

依序讀[AGENTS](AGENTS.md)、[HANDOFF](HANDOFF.md)、[產品](PRODUCT.md)、[技術](TECHNICAL.md)、[介面](UX-SEO.md)、[驗收](ACCEPTANCE.md)及[TASKS](TASKS.md)當前項。相關[工程](docs/ENGINEERING.md)、[隱私](docs/PRIVACY-SECURITY.md)、[發布](docs/RELEASE.md)是必要邊界。每里程碑先通過再繼續，不能只交計畫。

Node24+，T00建立npm run dev/test/check/build，T04才建立正式build/check。npm不是正式網站依賴。先前不存在的命令不能宣稱已執行。兩語功能與必要gate完成後，公開獨立GitHub，主代理接手正式部署與首頁；不是讓使用者轉貼或重新授權已同意發布。
