# 固定候選

2026-10-16：M1已獲主代理驗收；M2 source candidate 0.1.0已公開並凍結，等待主代理獨立M2驗收。未正式部署／外部驗收，不標產品released/complete。下方M1數據與M2準備段落是歷史快照，最新收據見末段與HANDOFF。

固定 app manifest（根專案相對路徑）：`.runs/event-timeline/W16-25-M1-20261016-01a141fe/M1-app-manifest.json`，6097 bytes，SHA-256 `56cd7a398f46b0fa3fdac418dabf81f28764992ddfad37d525f01644c51e3bce`。25 個source檔案共99952 bytes，12個noindex preview檔案共53799 bytes；逐檔bytes/SHA列於manifest，交接狀態檔不列入以避免循環。

最終 npm test exit0（88/88，包含C01–C66、16 controlled app tests）、npm run check exit0、npm run build exit0。Node v24.14.0、零安裝依賴。dist/僅preview無正式metadata。原生clipboard與兩語實際TXT bytes已驗；必要雙語B01–B11/B13/B15/B24/B27已記真實觀察，B20/B22/B23為受控實際app模組邏輯測試，不當原生/BFCache證明。

HANDOFF.md 列出全部修改檔案、48筆瀏覽器觀察索引、完整NOT_RUN/限制及environment fingerprints。真IME/AT/200%/40%固定文案/真手機/offline DevTools/完整NetworkStorage/真BFCache/reduced-motion與全狀態對比/低階真機未完整驗，不擴張測試或冒充通過。

environment guard前後完整snapshots相同，HKCU/HKLM PATH與完整Environment-key hash均無漂移，ephemeral=0。M1沒有來源發布區段，Git publication guard N/A。預覽保留127.0.0.1:4205，exec session25202；兩語網址與證據見HANDOFF。

上列為M1凍結紀錄。M2 GO已於2026-10-16收到，主代理獨立M1驗收PASS；M2已新增獨立dist-production/（最終13檔、56970 bytes）、production build/check/model與6個獨立release oracle（原M1 88＋release 6）。所有12個public檔案與M1固定bytes/SHA相同，preview仍noindex。

M2 workspace test/check/build/build:production/check:production exit0；release:check初次因DISPATCH.md缺列失敗，經主代理明確確認正式非憑證M0規格並逐名加白後，受影響check/release:check exit0，51個source檔案。沒有廣泛忽略未知檔案。

正式head、header、robots/sitemap、404與閉合wrangler config已在loopback model驗證。全站CSP同時含兩頁固定JSON-LD的精確hash：FQOUyZos1xCHMxNd7w9LYVdxf+fDW3qrfo6IgeyrteA=及insoc95oPv7vs7jlyiSXVaMcxVgFE9RRP88Yk82UOQE=；主代理明確允許此架構，沒有unsafe-inline或外部來源。依後續主審修正，兩canonical使用! X-Robots-Tag移除繼承noindex，HTML meta為index,follow，未知404仍noindex；P06獨立解析實際_headers驗merge/detach。robots允許兩頁及必要/js/、/styles/，P03以獨立路徑匹配驗證來源不放行。

M2 source publication與固定commit ZIP尚待執行；實際結果另追加HANDOFF，不以本機候選冒稱GitHub/hosting已完成。M3由主代理記live版本及首頁連結；既有人工NOT_RUN維持。

## M2 最終凍結收據

- Public https://github.com/KYStr/glossquote-labs-event-timeline，verified PUBLIC/default branch codex/m2-source。
- 固定commit **975659c80946c6b4dd806069cef5bc04a4832de2**，本地/GitHub commits API/git remote HEAD一致。
- 原始碼ZIP **134995 bytes / 51 files**，SHA-256 **102d5d63ab8f6861dbe3232497345b5ac57a3e08f4f1a9e849541fe5226e4cda**；由該commit git archive，逐檔bytes等於Git blob。
- 根`.runs/event-timeline/W16-25-M2-20261016-01a141fe/M2-published-candidate-manifest.json`：**15785 bytes**，SHA-256 **553259d1b8f0219e88a73a82e710ae5507adc8d31a754a28ecd765b2ae3717dc**。
- manifest列51 committed sources（295439 bytes）、12 preview（53799）、13 production（56970）逐檔hash。M1 public12檔不變，32程式／測試／工具鏈檔與commit相同；三個產物來源workspace/publishing copy/clean ZIP全部bytes相符。
- reviewed publishing copy及固定ZIP乾淨解壓副本：test **94/94**、check/build/build:production/check:production/release:check全部exit0，無skip，logs在M2證據目錄。
- Git settings capture/verify PASS，已知三個user/system config無漂移；M2前後完整Windows environment snapshots相同，PATH/TEMP/TMP/full-key fingerprints均不變。
- source publication完成；hosting、live Cloudflare gates、雙語首頁及外部驗收尚未進行。既有NOT_RUN不變，詳細路徑、指紋、瀏覽器證據及主審修正過程見HANDOFF。
