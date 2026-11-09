# 發布契約：文字分段與字數限制

狀態：M1 R1 已獨立驗收，M2 產生靜態 production 資產與獨立公開來源。Live Cloudflare、雙語首頁與外部複驗由後續 gate 驗證，source publication 不代表已上線。

預定 origin https://chunks.glossquote.com；中文 /index.html、英文 /en/index.html。正式 origin 只在 M2 production release 設定，preview 必須 noindex,nofollow 並禁止索引；兩種環境不能共用 production canonical/sitemap。

主代理明確驗收/放行 M1 後，M2 才加 production build/check、固定 origin allowlist、正式 self-canonical、雙語互返 hreflang zh-Hant/en/x-default（x-default 指中文）、robots/sitemap、與可見內容一致的 metadata/WebApplication JSON-LD、404、mime、安全 response headers。不得根據訪客 Host 或 query 組 SEO URL。

按已授權的 source publish 流程，reviewed independent copy 發布 KYStr/glossquote-labs-text-chunker public repo；檢查路徑、secrets、使用者文本、測試資料與無關檔案，無 force push。核對 public visibility、remote HEAD/commit；ZIP 由固定 Git blobs 產生，解壓逐 blob 比對並從解壓副本重新 build/check。只 source publication，不代表 live website。

M3 由主代理免費 Cloudflare deploy 並檢正式雙語頁、HTTP/404/MIME/headers/SEO/首頁雙語來回導覽。功能 chat 不改首頁/部署。部署後為 awaiting external review；只有使用者/驗收者外部確認或必要修正後確認才標該版本完成。

## 可重現的 build / check

Node 24+，無需 npm install，沒有 runtime/development dependencies。

```
npm test
npm run check
npm run build
npm run build:production
npm run check:production
```

預覽 `public/` / `dist/` 的8個資產保持已驗收 hash `3608f282455e7f666e967d11121e144463429bd9790a556b976ee77d19aa474c`。Production build 僅替換 head、robots，再加入兩語404、sitemap、_headers、_redirects，寫入 `dist-production/`；app body、所有 browser ESM 與 CSS 不變。只接受固定 origin，未知參數/來源漂移/未知stale target/link均拒絕，不清除未知檔案。

`npm run dev` 是原 loopback preview；`npm run dev:production` 是 production 產物的本機 HTTP 檢查，以 OS 分配的127.0.0.1 port服務。後者不是 Cloudflare runtime；CF正式行為由M3實測。

## 靜態 Cloudflare 設定

`wrangler.jsonc` 僅配置 assets，無 Worker handler、bindings、帳號ID或secrets；compatibility date固定2026-10-13。metrics/logs/traces明確false，workers.dev/preview URLs關閉，route僅chunks.glossquote.com。依本工具隱私指示配置，不新增 telemetry。

`html_handling: none` 保留兩個明確index.html URL；`_redirects` 以301把 `/`、`/en`、`/en/` 指向相應正式頁。[HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/) 與 [redirects](https://developers.cloudflare.com/workers/static-assets/redirects/) 的設定語義已核對。

`not_found_handling: 404-page` 使用最近的404.html；兩語缺頁各有固定文案，無來源/URL回顯。這是404回應，不是SPA成功頁。[Cloudflare 404文件](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)

`_headers` 對資產設定CSP、nosniff、DENY、no-referrer、clipboard/self permission、COOP、HSTS與no-store，並明示JS/CSS/sitemap MIME。JSON-LD是固定靜態資料，CSP只允許其兩個明確hash，不使用unsafe-inline。[Headers文件](https://developers.cloudflare.com/workers/static-assets/headers/)

## Source publication 保護

只在reviewed獨立copy初始化Git，不從孵化器根推送。禁止gh auth setup-git/login/refresh、global/system Git設定或讀/列印credentials；必要auth僅透過既有官方CLI與per-command git -c。發布前後使用孵化器既定Git設定fingerprint guard和Windows Environment guard；任何漂移立即停止，不猜測還原。這些guards僅是前後指紋比對，不是OS封鎖或完整credential audit。

公開copy只含固定public資產、必要scripts/tests、package/wrangler/gitignore、公開README與本發布契約；不含chat/task/dispatch metadata、證據、個人路徑、輸入草稿或憑證。固定Git commit ZIP逐entry比對Git blob bytes/hash，拒絕未知/重複/traversal/link與不匹配內容，解壓後重跑全部gates並核對production manifest。

原生BFCache/pending clipboard、原生負向fallback、真設備IME/AT、200%zoom、完整Network/Storage保留手動NOT_RUN。受控Promise整合回歸不是原生證據。
