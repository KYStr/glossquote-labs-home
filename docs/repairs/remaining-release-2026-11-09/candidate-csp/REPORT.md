# 39 款預覽的實際 HTTP CSP

逐款以隔離的 Node 24.14.0 程序啟動固定候選的 `scripts/serve.mjs`，讀取 `/index.html` 與 `/en/index.html`。39 款各自的兩語 CSP 相同，78 個回應均為 HTTP 200，回應長度與 SHA-256 皆符合固定預覽清單。39 個本次啟動的程序均已退出。 [逐款原始標頭與雜湊](headers.json) · [摘要](summary.json)

- 31 款標頭包含 `worker-src blob:`。8 款的原始標頭不含該指令。全部包含 `connect-src 'none'` 和 `frame-ancestors 'none'`。
- 5 款的 10 頁另外含 CSP meta。掃描顯示其與標頭均允許頁面使用的腳本、樣式和適用的 Blob Worker。四款在 meta 重複的 `frame-ancestors` 由 HTTP 標頭實際提供。
- 78 頁無 inline script，沒有頁內 script hash 可沿用。掃描未發現會遭候選 CSP 阻擋的頁面資源。瀏覽器與正式主機回應另驗。
- Windows User/Machine 的持久環境檢查皆 PASS，前後快照位元組相同。 [起始](windows-env-before.json) · [結束](windows-env-after.json)
