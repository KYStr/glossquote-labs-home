# 折扣與免運試算

實作狀態：M1 本機 MVP 已凍結，等待主代理獨立驗收；尚未公開來源或部署。版本 0.1.0-m1。

折扣與免運試算幫助使用者回答「為了免運再加買一件，最後真的比較省嗎？」它先計算購物籃、折扣和運費，再把可選加購方案重新計算，最後比較兩種實付總額。

請由 [START-HERE.md](START-HERE.md) 開始；需求在 [PRODUCT.md](PRODUCT.md)，金額規則在 [TECHNICAL.md](TECHNICAL.md)，測試案例在 [ACCEPTANCE.md](ACCEPTANCE.md)，里程碑在 [TASKS.md](TASKS.md)。家族設計系統已複製到 [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)。

預定網址為 https://cart.glossquote.com/ 和 https://cart.glossquote.com/en/index.html。這些只是候選，不表示有現行網站。

Node.js 24.x，零 runtime／開發套件依賴。執行 `npm test`、`npm run check`、`npm run build`；之後 `npm run dev` 從固定 allowlist 提供 dist，僅綁 127.0.0.1:4201，埠占用則改為 OS 指派 loopback port。清除、離開及重新載入會移除手動輸入與結果；頁面不使用 storage、網路計算、遙測或遠端字型。

本輪 44/44 自動測試、check/build 和繁中／英文的必要真瀏覽器流程已通過。兩語實測 900/1000/80 加購 100 多付 20、加購 50 多付 50；320px 原生 viewport override 與鍵盤主要操作均有證據。實際 200% 瀏覽器縮放、實體手機／IME、完整 Network/Storage 檢查與原生 clipboard 內容／拒絕回退列為 NOT_RUN，不以自動 stub 當成原生證據。詳見 [HANDOFF.md](HANDOFF.md)。
