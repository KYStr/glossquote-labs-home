# M2 公開檢查版獨立審查

修正來源 `541a0cd73fd24fc3536501793d551bfa81f63524`。固定候選 `df37047f963e0f06044e0136448c70c95aa58a2e`。實際 Worker 部署回執為 `e43d1822-dcbc-493e-b9d3-a85c25c53322`。[PR 219](https://github.com/KYStr/glossquote-labs-home/pull/219)

Cloudflare API 讀回該版本分流 100%，四個新 hostname 各有一筆 proxied AAAA。[Worker 讀回](live-worker-version.json) · [DNS 讀回](live-dns.json)

- 四個歷史原始 tree 與基線子樹逐一相同，修正與發布候選的 tools tree 也相同。105 份本機原始檔案以 Git blob SHA-1、SHA-256、大小與 Git mode 對照遠端資料。[來源證明](source-provenance.log) · [發布前審查](predeploy-review.md)
- SVG 預覽、實際 app 的轉 PNG 動作及像素在隔離 Chromium 152 通過。保留剪裁與梯度，惡意 URL 不在清理後的 SVG blob，最終下載 anchor 被攔截。朗讀只用瀏覽器標記為本機且目前存在的聲音，列舉錯誤、安全取消與回呼防護有離線回歸。
- 四個新增站與目錄的 19 份公開 HTML、CSS 和 release.json 逐件 SHA-256 與凍結 manifest 相同。五站各三條 canonical alias 轉址、HEAD、跨站內部路徑 404 與 double-encoded traversal 400 通過。檢查 noindex、CSP、nosniff、Referrer-Policy 和 XFO，並確認回應未帶 Set-Cookie、NEL、Report-To。[獨立 HTTP 複驗](live-check-first.log)
- Fluid 的實際公開繁中、英文頁均在隔離 Chromium 觀測到初始化新增的 `aria-invalid="false"` 和語系對應的字元數 15、32。正式回應仍帶原發布 CSP 與 noindex。[繁中初始化](fluid-live-zh-init.json) · [英文初始化](fluid-live-en-init.json)
- 初步 Fluid 通知問題已關閉。以實際兩份發布通知和同一份發布 CSS，在遠端 Chromium 改 `documentElement.lang` 共六次，computed style 只顯示當前語系的通知，首頁、檢查目錄和另一語系連結完全對應。站上 inline 探針等待報告標記逾時，live 點擊與 history popstate 維持 NOT_RUN，已有 app fake history 測試與真實通知 HTML/CSS 的分項證據。[通知複驗](fluid-overlay-result.json) · [線上探針回應](fluid-live-history-attempt.json)

實機語音、瀏覽器引擎網路／儲存、Windows 本機互動、原生下載／剪貼簿、完整可及性和其他瀏覽器仍待驗。這次範圍為四項指定修正及 noindex 檢查發布。單一 ZIP 與最終五面向登記待封包實證。
