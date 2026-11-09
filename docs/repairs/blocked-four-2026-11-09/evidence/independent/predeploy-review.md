# M2 發布前獨立審查

修正來源 `541a0cd73fd24fc3536501793d551bfa81f63524`。凍結發布候選為 PR 219 的 `df37047f963e0f06044e0136448c70c95aa58a2e`。本階段判斷可發布至現有檢查 Worker，最終驗收等待公開 HTTP 和交付 ZIP 實證。

- GitHub compare 回傳修正 commit 位於 `c57af9dd3d974ccdc18f36f1459ab251c1c74358` 基線之後一個 commit。差異限四款工具的目錄和維護證據。詞頻測試名稱已與 C+S 一致。[修正比較](https://github.com/KYStr/glossquote-labs-home/compare/c57af9dd3d974ccdc18f36f1459ab251c1c74358...541a0cd73fd24fc3536501793d551bfa81f63524)
- SVG 以重新序列化的允許清單處理參照，解析實體後才套用判斷。朗讀列舉錯誤時在 enqueue 和 resume 都取消，舊回呼不會送出下一段。詞頻跨三種表格的最低次數及分母維持一致。三條獨立 CLI 回歸通過，Windows 環境兩份檢查 SHA-256 相同。[回歸輸出](focused-regressions-final.log)
- Cloudflare 隔離 Chromium 152 以固定候選的實際 SVG 程式操作貼上、預覽與下載處理。只重寫模組 import 路徑，反解比對原始 SHA-256。攔截最終 anchor 避免下載，取得 32×32、139 bytes PNG，梯度區像素 `[18,106,96,255]`，裁切外為透明，預覽 SVG blob 無測試外部網址。第一個 fixture 沿用了介面 240 px 預設，調整 fixture 輸入 32 px 後通過。正式站 CSP、網路攔截與原生下載仍屬獨立驗證項目。[結果](svg-browser-result.json) · [來源雜湊](svg-browser-fixture-manifest.json)
- Fluid 先前問題已解決。兩份實際發布 HTML 的通知與同一份發布 CSS 在隔離 Chromium 以初始語系、另一語系及返回各跑一次，六次都只顯示匹配的文案、首頁、檢查目錄和另一語系連結。此 probe 驗證真實 CSS computed style 與 DOM，app history 仍待實際站點觀察。[結果](fluid-overlay-result.json) · [發布檔雜湊](fluid-overlay-fixture-manifest.json)
- 獨立將實際 stage 的 97 個保留站與 1123 份資產逐檔比對，設定與 SHA-256 全相同。四個新增站與目錄的十份語系頁檢查 canonical、hreflang、title、description、兩語通知與路徑。使用實際 Worker 及隔離假 asset binding 驗證同站映射、alias redirect、跨站路徑與 traversal 拒絕、拒絕 POST，且 Cookie、Authorization 和 query 不會被轉交。新站的 `connect-src 'none'` 和防框架政策存在，沒有來源自訂 header 覆寫，Fluid 原 HTML CSP 保留。[發布前輸出](predeploy-final.log)
- 閱讀憑證 child 的固定 commit、manifest digest、stage/helpers/runtime 驗證和精確設定鍵。發布設定沒有 build hook，固定 Wrangler 使用 `--autoconfig=false --install-skills=false`。child 使用清空後的程序專屬環境，只有非 DryRun 的 deploy child 接收指定 token。Cloudflare 的 146 筆完整 DNS 記錄無四個精確主機或 wildcard，同區 Workers routes 有既有 98 條 inspection routes，四個精確新增路由與全域 wildcard 均不存在。[DNS](predeploy-dns.json) · [Routes](predeploy-routes.json)

實際站點的 HTTP、版本、DNS 和封包完整性屬下一階段。OS 語音實聽與引擎網路、Windows 本機互動或原生對話框均維持 NOT_RUN。以上是這輪四項修正與檢查發布的證據。
