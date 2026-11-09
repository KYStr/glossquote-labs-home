# 食材差額採買單 0.1.0 — 公開來源交接

此副本供公開原始碼審查，hosting 尚待主代理部署，外部驗收尚未通過。正式網站候選與公開來源是不同成果。runtime、scripts、tests、package.json、wrangler.jsonc 均與主代理驗收的 M2A 來源逐 byte 相同。

## 已驗基準

M2A 與本次 M2B 乾淨副本均使用 Node v24.14.0，完成 76/76 離線測試、check、preview build、release build、release check，無失敗或 skipped。M2B 五項命令皆 exit 0，14 public 檔／22 ESM syntax 檔通過；全部來源在命令前後一致，完整 release 產物與主代理副本逐 byte／SHA 相同。實際 argv、logs、環境／Git guard、遠端 commit 及逐檔來源核對 receipt 由協調工作區保存，不公開本機帳戶或內部執行紀錄。

發布資產應重建為 16 檔／74,451 bytes。`release-artifacts/manifest.json` 應為 4,655 bytes，SHA-256：

`75e907ec5f8851a069c39f06d838387f373ea44cdd10f10ca1a61fe36007072c`

14 檔 public records pin 為 `bd7f4bed29d52631cc9f24b3b93bcb226e441b3a7657eeb4c274f21dc7db4a56`。JS、CSS、404 與 CSP 不變；正式 HTML 只依已審核轉換移除候選文字，保留 canonical/hreflang/x-default 與對應語言首頁連結。三條精確 301 redirects：`/ → /index.html`、`/en → /en/index.html`、`/en/ → /en/index.html`。

## 瀏覽器證據與 NOT_RUN

主代理在 M2A 前使用 Chromium 145.0.7632.6 執行 r2：36 PASS／16 NOT_RUN／0 FAIL，禁止操作記錄為空，parent cleanup PASS。本次 M2B 不重新執行瀏覽器，也不把 Node 測試算成瀏覽器驗收。

以下八類各繁中／英文一項，維持 16 NOT_RUN：

|項目|未驗原因|
|---|---|
|BR54-READ-CANCEL|實際讀取完成太快，未觀察到可取消窗口|
|BR54-READ-REPLACEMENT-RACE|已驗最新選擇結果，但不能證明第一個原生 read 仍在進行|
|BR54-TEXT-ZOOM-200|仍需真正 200% page/text zoom 證據|
|BR54-LATE-READ-COMPLETION|未刻意交付失效後的舊 read completion|
|BR54-HIDDEN-LIFECYCLE|仍需實際 hidden 狀態轉換的受控證據|
|BR54-BLOB-REGISTRY-REVOKE|下載與 DOM 結果不能證明 opaque URL registry 的 revoke|
|BR54-HTTP-404|仍需受控 unknown-path 實際 HTTP 404|
|BR54-MANUAL-NATIVE-AT|原生 dialog、真機與輔助科技未觸發或推論|

Wrangler CLI/schema/dry-run、正式 hosting HTTP/redirect/404/Network/Storage、首頁整合與外部驗收不在本次來源公開驗證範圍。不得宣稱此版本已完整驗收、上線或通過外部覆核。

重現命令及產品界線見 [README](README.md)。所有測試 fixtures 均為假資料，不包含使用者食材清單、帳戶資料或憑證。Git 不追蹤 dist、node_modules 或 release-artifacts；實際部署前須核對固定 commit 重建的 manifest。
