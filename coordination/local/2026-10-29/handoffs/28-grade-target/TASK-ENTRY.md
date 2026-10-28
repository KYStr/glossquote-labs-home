# 成績目標試算任務紀錄（只追加）

## W17-28-M0 — 2026-10-17
主代理規劃、Luna/max協作產品六文件；requested功能chat為gpt-6.1-sol/max，尚未建立、backend identity未確認。允許文件範圍為本工具18份自包含規格。M1/M2/M3/外部全NOT_RUN。

## W17-28-M1 — 2026-10-17

原功能對話 01a147c9-8942-78b1-9301-58ceb1b6b55b 依主代理 M0 GO 完成本機雙語候選 M1-b1607c5df51aa350。requested gpt-6.1-sol/max；backend identity 仍未獨立確認，未另行委派。僅新增 public/、scripts/、test/、package.json、.gitignore、dist/，更新允許的狀態文件；根證據僅 .runs/grade-target/m1-20261017-implementation/。未改六產品規格、兄弟工具或首頁。

Node v24.14.0/npm 11.9.0；完整 npm 路徑執行最後 test 57/57、check、build，全 exit 0；build 自驗 11 檔與 manifest。主審補充要求的 weightRaw 100.01→weight_out_of_range/rows.0.weightRaw 已加測，移除取消 snapshot 自比無效斷言。UI 實際於 IAB 及一般 Edge 走雙語空白/C01；IAB 另驗編輯失效、零/空白、錯誤修正、清除和語言切換、狀態、320px/40 列/鍵盤與小數點。雙語 IAB 下載逐位元核對（422/498 bytes）；Clipboard 只讀回自己剛寫入的假報告。Edge 下載事件擷取逾時，保留 NOT_RUN，不假稱逐位元成功。

主代理先前提供 257 獨立核心 PASS，證據 .runs/new-tools-2026-10-17/28-independent-result.json。此後 public/js/core/calculate-target.js 只新增 raw.length > 320 預檢，以避免超長名稱展開為 code point 陣列；算式不變，但檔案 SHA 已改，主代理需對固定候選重驗受影響 gate。UI 主驗期間 app/HTML/CSS/lifecycle/report 無後續改動。4208 task-owned preview 已依新核心重啟（原 session 47502 結束，新 session 25263），現存其他服務未動。

環境前後 guard PASS，完整 Snapshots 相同（HKCU/HKLM PATH hash/type/length、Environment fingerprints、TEMP/TMP fingerprints）。初次比較 wrapper 把不設定 LASTEXITCODE 的正常 PowerShell script 當失敗；原始 orchestration-error JSON 留存，改以呼叫成功旗標及 guard Status 重比 PASS，沒有環境漂移。

限制：真機/原生 IME/虛擬鍵盤、真實 200% 縮放、低階裝置、真實離線切換、完整 Network/Storage/Cache/SW、BFCache persisted 恢復、原生 Clipboard 拒絕與下載 URL 原生全生命週期 NOT_RUN；fake timers/clipboard/URL、VM 初始化失敗 fixture 只證明程式行為。詳細證據/manifest/命令見 HANDOFF。M1 主代理最終 GO 待定；M2/M3/來源發布/部署/首頁/外部驗收未開始。

## W17-28-M2 — 2026-10-17

收到主代理書面 M2 GO，M1 已 PASS_WITH_DOCUMENTED_NOT_RUN，主驗 `.runs/new-tools-2026-10-17/28-m1-primary-review.md`、最終核心257/257。建立獨立 production 產生/檢查/HTTP模型與 wrangler.jsonc；M1 public/dist 20檔已先固定 bytes/SHA，不改寫。

新增 scripts/{production,build-production,check-production,serve-production,release-check}.mjs、test/production.test.mjs；調整 package scripts 與 check 的 scripts allowlist。63/63 test、check、build:production、check:production、release:check 全exit0。production 12檔 + manifest，5208 loopback model session81842；雙語空白/C01、DOM SEO和無warn/error實測。這是本機模型，不是 Cloudflare。

本次證據 `.runs/grade-target/m2-20261017-source/`。將以44檔 reviewed publishing copy（僅交接/狀態文件的公開版本刪除本機路徑/對話ID/環境指紋）重驗、Git guard、公開GitHub與flat archive。發布後接續追加實際commit/ZIP/guards；此段不預稱成功。未呼叫Cloudflare/讀token/安裝CLI，M3仍主代理。

### M2 結果追加

公開來源 [KYStr/glossquote-labs-grade-target](https://github.com/KYStr/glossquote-labs-grade-target) 已驗 PUBLIC/isPrivate=false，遠端 codex/grade-target-m2 與 default branch commit均為66c574d718c1cf17b79f5510975ba46615296789。Flat archive109838bytes，SHA256 a8d8c7fe7af36a84a7b7c917d4d07efc89077abf668145c0265e0f511fb2cda0，package.json在根，44檔與固定Git blobs/manifest逐一相符。副本63/63、check/build/production/release gates全exit0，preview/production產物與本機一致。Environment完整Snapshots、Git known config fingerprints前後無漂移；M1 public/dist20檔不變。

M2 helper的三次初始錯誤均在正式步驟前/解析時發現（相對import多一層、inline verifier多一括號、PowerShell Remote分支多一括號），各有獨立error JSON與具體修正，沒有修改產品來迎合gate。GitHub preflight exit1是預期repo不存在，create/push/remoteverify均exit0。source/config/ZIP/guards/所有命令在同M2 evidence與HANDOFF。固定commit/ZIP不再回寫；本段為發布後本機狀態。原對話M2交接待主代理驗收，未部署、未改首頁，保留M1 NOT_RUN。
