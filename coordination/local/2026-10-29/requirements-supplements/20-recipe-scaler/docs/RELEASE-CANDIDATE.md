# 發布候選：食譜份量換算

狀態：M1/M2已主驗PASS，固定public source不再更動；主代理已完成recipe live部署與HTTP／browser验證。雙語首頁最後批次及外審尚未完成。

|Gate|狀態|證據|
|---|---|---|
|Node 核心/完整自動案例|PASS|49/49，0 skip，含 A1–A38；npm-test-final.txt|
|check/build|PASS|npm-check-final.txt / npm-build-final.txt；exit 0|
|雙語真瀏覽器/320px/keyboard|PASS|browser-observations.json、browser-assertions.json、final screenshots|
|原生貼上/正常 copy API|PASS（有限）|Unicode、超限、換行原稿保留；瀏覽器成功提示可見；不等同 OS 剪貼簿 bytes 驗證|
|Network/Storage/原生 clipboard denial|NOT_RUN|能力未暴露；靜態無 network/storage/HTML sink 檢查、Node fallback/race 測試另為 PASS|
|實際200% zoom/實體手機/IME/讀屏|NOT_RUN|工具未暴露對應原生能力|
|Windows persistent environment|PASS unchanged|environment-before/after/comparison.json；完整 Snapshots 一致|
|主代理獨立 M1 驗收|PASS|.runs/handoff-release-2026-10-13/20-primary-m1/ACCEPTANCE.md|
|Public GitHub commit/ZIP|PASS owner|PUBLIC remote HEAD af2e7145606bf45fbf02ccd8d304e9301570c136；39 ZIP/Git blobs bytes相同|
|Production SEO/404/headers|PASS local candidate|14檔54668bytes，真loopback Node HTTP；非Cloudflare原生|
|乾淨ZIP重測／重建|PASS|49 tests/check/build/build:production/check:production/manifest；production digest相同|
|Git settings guard|PASS|新增baseline，三個known config檔fingerprints一致；單次-c helper無全域寫入|
|M2真瀏覽器／CSP|PASS local|兩語4→6、適量、canonical/JSON-LD/同語首頁44px、英文copy API；console0|
|主代理獨立 M2 驗收|PASS|.runs/handoff-release-2026-10-13/20-primary/result.json；39 blobs、49 tests及gates|
|Cloudflare live|PASS primary|version499da687-502c-45e0-959c-67830684e6b6；20-live.json的38HTTPresponses及主代理雙語操作|
|雙語首頁整合|PENDING primary|最後整批由主代理處理，owner不改catalog|
|外部驗收|NOT_RUN|未提供|

固定證據位於孵化器根 .runs/recipe-scaler/m1-2026-10-13-01a133a5/。source: 23 files / 95120 bytes / 6e658305d0f1148ab113f24d5fae4cfb10b81ddb062274ca5b1e902f720e820d；code: 8 files / 37197 bytes / 5b35accf6aa41a60ca6e37523bd654bd50093358f67e96d82fc972d4e195d66c；runtime/dist: 11 files / 49931 bytes / 1dbb28c5db03ddfcf68e6266ae8375cb0ff3848a8cd4c033c653dba2830b8812。

frozen/source、frozen/contracts、frozen/runtime、frozen/dist 保存固定位元組；code bytes 是 frozen/runtime 的 manifest 指定子集。source manifest 為實作閉包，進度 metadata 不參與其 digest，以免自引用。

preview http://127.0.0.1:4200/index.html 與 /en/index.html，Node PID 81368 保留。只有主代理完成獨立驗收並正式放行，才可開始 M2；M3、首頁與使用者外驗仍未執行。完整功能 goal 仍未完成。

上列M1 manifests／milestone敘述為歷史紀錄。M2固定版：實作來源33檔118988bytes / aa5542ba593ae033abc243f023c8c4ef3d9e76f19f495770e53b609b826e55b9；公開reviewed source39檔138829bytes / 631255bbdf1515402ee073deea67b416e94854c934cb3b5ea9b4bcbc1de2ec58；code digest維持5b35accf6aa41a60ca6e37523bd654bd50093358f67e96d82fc972d4e195d66c；preview/runtime11檔50076bytes / 0ec08edaa86f56a127014b1a0206f46bbcb21f6714cf1f67ac4a297d04321330；production14檔54668bytes / 27943936bf5c05cc83efd24cbe509989c780a1c1c67e88129bc6d6a5f7612bed。

PUBLIC repository https://github.com/KYStr/glossquote-labs-recipe-scaler；固定commit af2e7145606bf45fbf02ccd8d304e9301570c136；ZIP59037bytes / SHA c1a83a5800f79842151df5f97490f9823f6bf4a372a1bfb7d2a09653a30b3caa。root與clean-extraction產物逐檔相符。M2證據 .runs/github-publish/glossquote-labs-recipe-scaler/m2-2026-10-13-t01/，production候選預覽 http://127.0.0.1:58088/index.html /en/index.html，PID10124保留（session77784）。原M1preview也保留，無source或global settings再推更新。M3、Cloudflare原生HTTP、首頁、外驗皆由主代理接續，尚未執行；不能標完整goal完成。

更新：上述M3未執行為先前owner交接時歷史狀態；主代理已完成正式recipe站，唯首頁批次／外驗待續。main deployment/live/primary證據為 .runs/handoff-release-2026-10-13/20-deployment.json、20-live.json、20-primary/result.json，owner已讀取並核版本/commit/status/count。原始Git HTTP trace排除驗收包；只交publication-trace-audit.json等不含認證值的摘要與既有guards。新增trace禁令已讀，后續child清debug env，不改persistent env或公開commit。
