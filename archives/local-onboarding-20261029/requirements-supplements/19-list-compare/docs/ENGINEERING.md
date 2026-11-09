# 工程約定：名單比對與合併

使用 Node.js ESM + Node.js 24 內建能力；瀏覽器端為靜態 HTML/CSS/ES modules。無 runtime 或 build dependency，除非主代理另開授權任務。

核心函式保持 deterministic、純函式、可離線測試。有限大小先驗證，先完整驗證 A/B 再產生任何結果。所有陣列順序有 TECHNICAL.md 規則。DOM 只把資料當文字。UI state 需單一 revision 作為結果與 copy request 過期界線。

供應本地 server 僅 loopback；只提供固定 allowlist 的公開 build 檔案、正確 MIME、GET/HEAD，其他 method 為 405、未知為真正 404；拒絕 traversal、junction/hardlink escape、符號連結與未知 stale build output。操作只在產品 folder 中，不觸碰根專案 git。

必須同時維護測試與實作；測試用明確 fixture 和獨立 expected，不從 implementation 運算預期值。check/build 不允許網路。source manifest 不涵蓋個人資料或憑證。
