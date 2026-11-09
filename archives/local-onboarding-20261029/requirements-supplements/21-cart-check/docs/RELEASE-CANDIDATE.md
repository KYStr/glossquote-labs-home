# 發布候選：折扣與免運試算

最新狀態 M2_SOURCE_PUBLISHED_CANDIDATE_FROZEN；版本 0.1.0-m2-route-r1，待主代理 M2 獨立驗收與 M3。M1 已由主代理 PASS；以下保留 M1／初次M2歷史，不代表 Cloudflare live 已發布。

|Gate|目前狀態|證據|
|---|---|---|
|核心計算/全自動案例|PASS|44/44 offline fake-fixture tests；全部 A 見專用 case matrix|
|check/build|PASS|Node24.14.0/npm11.9.0，兩命令exit0；10-file dist 55146 bytes|
|雙語真瀏覽器主要用例|PASS|980→1000(+20)、加購50=1030(+50)、discount/basis、首錯focus、320px/鍵盤、clear/reload/pagehide|
|Network/Storage/clipboard|PARTIAL / NOT_RUN|no-network/storage 靜態檢查；頁面write成功回呼真瀏覽器PASS。完整原生Network/Storage/OSclipboard及拒絕fallback未驗|
|固定 public GitHub commit|PASS|PUBLIC KYStr/glossquote-labs-cart-check，最新remote HEAD=a6b6ad2c5fc5dda2430a3055c161a6bf031460bd；42 source檔 Git blob-byte ZIP完全相符，原73d9767/bca9623保存|
|production SEO/headers/404|PASS 本機|55/55 route-r1 tests、check/build/build:production/check:production、Wrangler4.147.0隔離dry-run；兩語SEO/CSP runtime/404返回因asset bytes完全不變沿用；Cloudflare live NOT_RUN|
|Cloudflare live與雙語首頁|NOT_RUN|未部署|
|外部驗收|NOT_RUN|未提供|

主代理 M1 驗收 PASS，證據 .runs/handoff-release-2026-10-13/21-primary-m1/ACCEPTANCE.md；CART-M2-T01正式放行後才執行M2。最新待決是主代理 M2 獨立 acceptance 和 M3 部署／首頁。任何候選 URL 都不是 live 證據。

preview http://127.0.0.1:4201/index.html / en/index.html，task-owned PID54448仍活著，沒有占用fallback。來源凍結證據：../../../.runs/cart-check/m1-2026-10-13-t00/manifest.json（source/code/runtime/dist 逐檔 bytes/SHA256）與 frozen-source/、frozen-dist/；runtime/dist digest=a4b0a21d12463d195273542dbe77dc855736f2094eaff3e6f88db7294da9fd9c。完整 commands、guard snapshots、browser-observations、PNG、case matrix 与 NOT_RUN 詳列 HANDOFF.md。

配置 requested gpt-6.1-sol/max；DISPATCH.json記錄create_thread accepted，backend identity not-confirmed。200%實際zoom、實體設備／IME、讀屏及完整原生檢查維持NOT_RUN。

## M2 固定候選與來源

所有 M1 public runtime、CSS、core及語義tests原bytes不變。release metadata/404/_headers/robots/sitemap僅在dist-production生成，preview繼續noindex。Production13 files / 60734bytes / digest9deac92186b8ed8edeb9b393771a3be9145d45db34c4c88e3373be97754532e8；完整source/code/runtime/dist/production manifest與凍結bytes在 ../../../.runs/github-publish/glossquote-labs-cart-check/m2-2026-10-13-t01/。

固定公開來源42檔，source digest5513c0e693160da7a8725f49b3ca24e9ceb3fcff2e7d06740aac82f4c0bf600f；commit73d9767bb1d02f4c1c0c48d9ecf7c8625fd29829。ZIP84929bytes，SHA256b15b63a6e3be72250e58daef8c4c3b01464c7d8d33fb234549062fc9903f5890；安全解壓後54/54及完整check/build gates通過，逐Git blob與production rebuild manifest完全相符。主repo根未初始化／提交／推送。

本機正式候選 http://127.0.0.1:5201/index.html、/en/index.html，PID68628保留；M1 preview PID54448保持可用。_headers不提供成asset；未知route真404，HTML含兩語返回入口、不回calculator200。CSP僅兩個精確JSON-LD hash加self，不含unsafe-inline/eval；connect/font none，metrics/observability off。Wrangler dry-run不證明remote部署。

Git發布暫停曾依主代理指令遵守；主代理解除後按新增Git安全規則執行。新guard capture/verify三個已知User/System config指紋完全相同；只有單次git -c credential.helper及GitHub CLI helper，沒有auth setup/login/refresh、global/system writes、token讀取或credential-store access。完整 Windows Environment Snapshots亦一致。這不代表主代理對其他owner事件恢復未知pre-state；精確disposition保存在專用證據。

本輪owner已釋放，後續status-only文件不再推新commit；固定ZIP保留。Source publication PASS，Cloudflare／首頁／外驗NOT_RUN，完整功能未標complete。

## M2 route-r1（最新）

主代理發現初次wrangler沒有route，且沒有書面M3注入設計；依原M2明確修正授權補唯一`routes:[{pattern:'cart.glossquote.com',custom_domain:true}]`。M3主代理使用這份配置，M2沒有deploy或DNS操作。只有wrangler.jsonc、scripts/release.mjs／release.test.mjs和docs/RELEASE.md四個public檔改變；新增缺route/錯host/非custom-domain/額外route負例。主與乾淨ZIP副本55/55及全部gatesexit0、隔離dry-runexit0。

新commitbca9623c8085d3406e0f914fd58039545bc7bbc7，是73d9767的fast-forward；42source digest12f838647432fea7700348d624b6c8c944340a50dbde9c74e4dc78895299a446。新ZIP85323bytes、SHA256584b917c2a740665f7eb5e83fbff239daa050f7efc5e2ad81b5b7fa261b90c6b，逐blob与乾淨build一致。M1 runtime/preview和13production bytes/digest全部不變。新block重新capture/verify Git guard與完整environment，皆一致。證據 ../../../.runs/github-publish/glossquote-labs-cart-check/m2-2026-10-13-t01-route-r1/；舊ZIP與證據不覆寫。這次新commit是正式網域綁定修正，非單純status重發。

### R1發布文件一致性（最終固定）

依主代理引用21-m2-readonly-review的明确要求，修docs/RELEASE.md，把暫停／未驗描述改為歷史，明列目前PUBLIC已驗、hosting/首頁/外驗未驗。相對bca9623僅一份發布文檔改變，所有code/config/runtime/production bytes不變。最新fixed commit **a6b6ad2c5fc5dda2430a3055c161a6bf031460bd**，42source digest527178acacff95dd0c820ab4a1f51b1f016552594da5cec68b6a79c5394c1251；ZIP86085bytes／SHA256419b8675c6652e352cdcfffe0e0b68d7ccc1aac01d8e45ffee15fdaaceeeb664，逐blob、安全解壓後55/55與五條npm gatesexit0，production逐檔一致。新publication block的Git/Environment guard皆一致。證據 ../../../.runs/github-publish/glossquote-labs-cart-check/m2-2026-10-13-t01-route-r1-doc-r2/；仍沿用R1dry-run和初M2browser，因为其实际输入bytes未变。本修正是明確審查項的文檔一致性修正，不因private進度改檔再推。
