# 發布候選狀態

2026-10-13：NOT_RUN。尚無實作、固定 source commit、GitHub public visibility、production 產物、正式部署、首頁入口或外部驗收。

後續每個 gate 分開記錄，候選雙語 URL 不是發布證據。必要自動測試失敗不能交付正式候選；人工範圍與缺口明列，不一概寫全部通過。

## 2026-10-13 / M1-T00 本機凍結

- 狀態：`M1_LOCAL_GATES_PASS_PENDING_PRIMARY_ACCEPTANCE`。原功能對話 01a13362-3924-7c63-9ce4-254ef9985715 / local；create_thread 已接受請求 gpt-6.1-sol/max，backend 身份未獨立確認。
- Node v24.14.0 / npm 11.9.0。最終 `npm test` 56/56 PASS，`npm run check`、`npm run build` exit 0；真 `npm run dev` READY 於 127.0.0.1:4196，PID 38864（2026-10-13T04:13:54.745Z）。
- 兩語 B01–B04 真 Codex In-app Browser 操作 PASS；B05、B06、B13、B16 英文操作 PASS。瀏覽器版本 API 未曝露，記為 NOT_EXPOSED；其他瀏覽器未驗證。全部 B01–B20 状態／限制見 HANDOFF，不能把 static／Node 證據當瀏覽器 PASS。
- 8 個預覽公開檔案與 source 固定 hashes：孵化器 `.runs/unit-price/m1-20261013-01/source-manifest.json`；測試及 guard 原始輸出在同目錄。每個 HTML 保留 active `noindex, nofollow`，robots 保留 `Disallow: /`。沒有 production canonical/sitemap/JSON-LD 或部署設定。
- UP-M1-R1 的 sparse rows 修正：每一個索引先檢查 own entry，缺列回對應 `invalid-row-schema`；0/1 個有效列而 length=2 及 inherited entry 的離線回歸 PASS。
- Windows HKCU/HKLM PATH 原型別、長度、hash、ephemeral count 與 full Environment-key fingerprint 前後全部相同。
- source commit／public GitHub visibility／固定 commit archive／正式 SEO／Cloudflare 部署／雙語首頁／外部複驗：NOT_RUN。這是 M1 本機凍結證據；必須收到主對話 M1 放行才開始 M2。

## 2026-10-13 / UP-M1-R2 主審修正後再次凍結

- 主對話 synthetic probe 證實原 checker/build 接受 active meta http-equiv refresh；產品 HTML 本身無該元素，沒有對外導航。已在 `scripts/check.mjs` 的 active HTML gate 拒絕 case/entity 解碼後的任何 refresh，包含有／無分號的數字實體及 trim 外側空白。
- 新增 `test/toolchain.test.mjs` 回歸，6 種 refresh 變體各自 check/build 拒絕且既有 output manifest 全數未改，註解中的非 active meta 不誤擋。沒有改產品演算法／HTML／CSS 或擴成通用 JS 安全分析器；static scanner 仍是輔助。
- settle 後 `npm test` **57/57 PASS**、`npm run check`／`npm run build` **exit 0**，完整 Windows environment snapshots 前後一致。最新記錄 `.runs/unit-price/m1-r2-20261013-01/tests-settled.txt`、check/build-settled.txt、environment-comparison.json 與 source-manifest.json；較早紀錄保留。
- 8 public/build assets 對較早 manifest 全數不變；兩語 B01–B04、其他已操作項及逐項 NOT_RUN 沿用原 browser-verification.json，不重播不受影響的 UI。預覽 PID 38864／port4196 保留。
- 狀態仍 `M1_LOCAL_GATES_PASS_PENDING_PRIMARY_ACCEPTANCE`；owner 再次凍結，M2/M3 未放行／未執行，沒有 source commit 或正式 release。

## 2026-10-13 / UP-M2-T01 READY_FOR_INTEGRATION

主對話 M1 親驗 PASS 與明確放行：`.runs/new-tools-2026-10-13/primary-m1/price-primary-acceptance.md`。本輪M2候選完成並凍結；M3仍由主對話部署／雙語首頁／外驗，不宣稱正式上線或版本complete。

- 正式固定 origin https://price.glossquote.com，兩語 self-canonical／互返 zh-Hant,en,x-default／sitemap／crawlable robots／truthful WebApplication／OG metadata；public來源及預覽維持noindex。404兩語、CSP精確JSON-LD hashes、無unsafe-inline/eval、nosniff/no-referrer/Permissions-Policy及HSTS；同語言Gloss Tools首頁連結已補。
- 純靜態Wrangler配置，compatibility_date2026-10-13、html_handling none、nearest404-page，無SPA fallback、application Worker／bindings／logs/traces。根／en入口使用固定301至兩個canonical filename。Workers skill的observability預設由本專案明確零遙測契約覆蓋。
- Root本機、reviewed copy與fixed ZIP解壓副本：npm test68/68 PASS、check及production build/check exit0；明列production test11/11 PASS；原preview build PASS10檔，production13檔。Wrangler4.147.0 deploy --dry-run exit0（無bindings／未upload），只用已存在CLI，無依賴新增或credential提供。
- PUBLIC https://github.com/KYStr/glossquote-labs-unit-price。defaultBranch codex/unit-price-release、remote HEAD/API commit49e38e4b3cf9626bde184eae279ec76973a9a033一致，visibility PUBLIC已實測。
- 固定Git archive ZIP `.runs/unit-price/m2-20261013-01/unit-price-source-49e38e4b3cf9626bde184eae279ec76973a9a033.zip`；SHA256 `3caf972c61500715a3014fb558ed8ba386128fe5992de4662ec964eda2eeaaf0`。解壓28個source逐Git blob bytes全數相同，並在解壓來源重跑tests/build/check。
- 本工具與public source／fixed source／三處production產物manifest在 `.runs/unit-price/m2-20261013-01/source-manifest.json`。工程gate輸出、PUBLIC核對、ZIP逐blob、Windowsguard前後完整Snapshots比較均在同目錄，append-only保留。
- M1四個runtime模組 bytes未變；主驗兩語B01–B04可沿用。M2真IAB只補兩語footer backlink href觀察，兩個home頁另實測HTTP200/正確lang。Full Network/Storage、原生clipboard、BFCache persisted、讀屏、真手機/200%zoom等manual NOT_RUN沿用。Node HTTP production preview只是已驗static config的local simulation；live Cloudflare headers/status/404/HTTPS仍待M3實測，dry-run不是部署證據。
- Root protected Windows environment與全Environment-key fingerprints前後不變。既有預覽PID38864及他人進程／分頁未停止；未讀Cloudflare token、未部署、未改首頁／兄弟／GlossGate／根Git。Owner釋放供主驗整合，請使用上述固定commit／ZIP。
