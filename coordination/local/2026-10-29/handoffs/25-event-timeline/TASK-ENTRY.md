# 活動流程時間表任務證據（append-only）

## W16-25-M0 — 2026-10-16
目標：自包含規格與可重現驗收案例，實作交新原功能對話。
requested model gpt-6.1-sol/max；實際對話尚未建立，backend identity 未確認。
M1 本機、M2 GitHub、M3 hosting/首頁、外部驗收均 NOT_RUN。
原有其他工具、Windows/Git 設定與使用者變更均不可動。

後續每次追加 task ID、owner、allowed paths、實際檔案、命令/exit、測試/瀏覽器/guards/evidence，明列未驗項目。

## W16-25-M1 — 2026-10-16

Owner：原功能對話01a141fe-9022-7040-9359-bb4c36e0083e／local，requested gpt-6.1-sol/max；create-thread設定已接受，backend identity未獨立確認。不委派、不另開對話。已讀18份本工具文件、根契約/SECURITY-BASELINE/PRODUCT-THESIS/完整家族設計契約；使用frontend-design有限流程輔助，專案契約優先。

交付界線：只T00–T05的M1本機。Allowed：本工具package.json/.gitignore/public/**/scripts/*.mjs/test/**/dist/**，及主代理明確補充的HANDOFF/START-HERE/project.json/docs/RELEASE-CANDIDATE與本檔append-only。證據只根`.runs/event-timeline/W16-25-M1-20261016-01a141fe/`。未修改六規格門檻、其他工具、首頁或舊驗收包。

已完成雙語空白工作表、strict schema與整數運算、鍵盤增刪/上下排序、即時撤銷、文字report、原生copy/TXT、confirm、pagehide與persisted pageshow清空；零runtime/dev依賴。M1只有noindex preview與閉合CSP，無production/wrangler/GitHub/部署。

實際新增25個app/toolchain/test source與12個dist preview檔案，五個狀態檔按授權更新；精確檔案表見HANDOFF與固定manifest。manifest6097 bytes／SHA-256 `56cd7a398f46b0fa3fdac418dabf81f28764992ddfad37d525f01644c51e3bce`，source99952 bytes、preview53799 bytes。沒有commit，以manifest凍結。

命令進度：T00 check/build各exit0；core首次69測試中68pass、C65額外手寫byte數誤植失敗，改用獨立Buffer編碼fixture後69/69pass，未改oracle；T01 check exit0。兩語actual-app controlled tests16/16pass。工具鏈首次fixture清空目錄的rm用法在Windows EISDIR，改用rmdir後3/3pass。最後pagehide補清列數，受影響16個app測試重驗pass。無同錯兩輪盲重試。

穩定後最終執行：官方Node v24.14.0；npm test exit0（88/88，0fail/skip）、npm run check exit0、npm run build exit0，各一次。logs：final-test.log/final-check.log/final-build.log，摘要final-commands.json。之後沒有app變更。

CUA真實IAB兩語必要B01–B11/B13/B15/B24/B27已驗。09:00+10/35/10=09:55/55/早5；23:40+30/20=次日00:30；target清空false+disabled；confirm取消全保留、確認空白；keyboard焦點/完整Tab、兩語60列320px clientWidth=scrollWidth=305、HTML-like原文無img。兩語原生copy精確、下載UTF8繁中219/英文204 bytes無BOM/尾LF。48筆觀察見browser-evidence.json，截圖與native報告保存在證據目錄。IAB原生confirm需同一次click/key操作內處理dialog；Edge CDP嘗試timeout，不納入pass。未繞過或替換原生confirm。

B20/B22/B23 controlled actual-app harness通過，含舊A resolve/reject/finally零DOM/focus寫入、新B busy保留、8筆獨立60000ms URLs、clear/new-result不早revoke、pagehide清state/timers/URLs與persisted pageshow空白。不是原生clipboard競態或真BFCache證明。

NOT_RUN與影響：真IME、螢幕閱讀器、200%zoom、固定UI文案40%壓力、真手機/虛擬鍵盤、真BFCache、DevTools offline、完整NetworkStorage、開啟reduced-motion/全面狀態對比、低階真機；已驗實際computed樣式/44pxbutton/焦點及長名稱備註不能替代未驗項。Node版本實測，embedded browser版本未暴露不猜。依主代理最後指示凍結最小範圍，不擴增人工測試。

Guards：environment-before/after與comparison PASS，完整Snapshots精確相同。HKCU ExpandString/834/ephemeral0，PATH hash3efe0b0e…，Environment-key3a36b632…；HKLM String/1227/ephemeral0，PATH52d7cb0c…，Environment-keya0f49688…，完整值見HANDOFF/JSON。沒有persistent Windows/Git/gh auth寫入、install或憑證讀取；M1無publication，Git settings publication guard N/A。

Preview：http://127.0.0.1:4205/index.html與/en/index.html，current exec session25202（保留），CUA IAB tab1已標deliverable。只Ctrl+C停止本任務舊session15542以載入最後修正，沒停其他服務。主代理需獨立讀manifest/跑命令後決定M2 GO；M2 NOT_STARTED，M3/首頁主代理專屬，external review NOT_RUN。沒有未解oracle/路徑/程式blocker。

## W16-25-M2 — 2026-10-16（候選與來源準備）

主代理明確M2 GO，已讀根.runs/new-tools-2026-10-16/25-m1-review.md：獨立88/88、check/build、250核心oracle及瀏覽器PASS，人工NOT_RUN按既有授權保留。原功能對話繼續，不委派、不部署。Allowed：本工具scripts/test/package/wrangler與發布狀態文件、本任務.runs及指定github-publish獨立副本。public/12檔完全不改。

新增production/build-production/check-production/preview-production/release-check共5個scripts、production.test.mjs與exact wrangler.jsonc；修改package、files/check的明確白名單。獨立dist-production/13檔56968 bytes，M1dist/與12public hashes保持。兩頁JSON-LD精確hash同列global CSP是主代理明確架構決定，不開inline/eval/connect外部來源；預設noindex與兩canonical路徑index覆寫使未知404noindex。

新5個獨立固定oracle PASS；最終workspace npm test93/93、check/build/build:production/check:production全exit0。release:check初次exit1，read-only diff唯一unexpected=DISPATCH.md、missing=[]。依指示停發布並保留failed log/早期manifest、Windows前後guard PASS。主代理隨後明確確認DISPATCH是正式非憑證M0派工規格，授權只逐名加source allowlist；修正後受影響check、release:check各exit0，51sources，未知檔仍拒絕。沒有自行廣泛忽略或刪檔。

正式loopback model127.0.0.1:5205、session44210保留，實際bound5個HTTP status/MIME/header PASS。真瀏覽器兩語主流程/SEO/404紀錄production-browser.json與jpg。M1手動受限NOT_RUN保留，不重做全部M1瀏覽器。專用證據根.runs/event-timeline/W16-25-M2-20261016-01a141fe/。尚無public source/commit/ZIP/hosting完成宣稱，後續來源發布結果在同任務追加。

### M2主審政策修正（2026-10-16）

依主代理實際退回，正式robots加Allow:/js/與/styles/，獨立oracle按Google最長匹配驗兩頁/資產可爬、來源/未知頁拒絕。Cloudflare同名header會逗號合併，故兩canonical改用! X-Robots-Tag明確移除全域noindex，HTML meta維持index,follow，其他路徑/404仍noindex。HTTP model改解析實際candidate _headers而不物件覆寫，新增獨立P06解析原始規則驗merge/detach。已讀Google與Cloudflare對應官方規則。6個release oracles PASS，build:production PASS，最終13檔56970 bytes；M1public12檔未改。

只Ctrl+C停止task-owned production session44210以載入修正，新session26152保留；M1 session25202未停。第一份reviewed-copy草稿位於指定github-publish任務source/，尚未Git init／發布；保留草稿，最終另建source-final/避免混淆。來源copy helper首次relative import多上一層，ESM在寫檔前MODULE_NOT_FOUND；修正已知相對路徑後copy51檔成功，未寫到出界路徑、未改任何權限或帳戶設定。

### M2 公開來源／固定ZIP完成（2026-10-16）

reviewed source-final副本51檔295439 bytes，全部source bytes與工作區準備時相同；check source whitelist、credential-like pattern scan與六個必要gates通過。npm test94/94，check/build/build:production/check:production/release:check全exit0。原M1public12檔完全未改；production13檔56970 bytes，preview12檔53799 bytes。

Git block前官方git-settings-guard capture；既有gh api user identity KYStr，requested repo原HTTP404。只在指定獨立副本git init codex/m2-source，per-command -c抑制未審hooks/template/global attributes與gpg、明確作者，stage精確51檔並commit。沒有寫global/system設定，沒有gh auth setup/login/refresh或讀credential。建立public KYStr/glossquote-labs-event-timeline，per-command既有gh auth git-credential推送。remote default branch codex/m2-source、PUBLIC、GitHub commits API與git ls-remote HEAD均驗證commit975659c80946c6b4dd806069cef5bc04a4832de2。Git guard push後PASS。

固定git archive ZIP：glossquote-event-timeline-975659c80946c6b4dd806069cef5bc04a4832de2.zip，134995 bytes、51檔，SHA256 102d5d63ab8f6861dbe3232497345b5ac57a3e08f4f1a9e849541fe5226e4cda。每個ZIPentry先驗path/重複/長度，再對git cat-file blob的SHA256/bytes全相等，無未知檔；驗後在本任務zip-source/乾淨解壓，無install，六gates全exit0、test94/94、0skip。workspace/publishingcopy/ZIP產物逐檔bytes一致。證據fixed-source-archive.json、zip-verification.json、zip-final-commands.json。

M2-published-candidate-manifest.json固定15785 bytes、SHA256 553259d1b8f0219e88a73a82e710ae5507adc8d31a754a28ecd765b2ae3717dc，列51 committed sources、12preview、13production及每檔bytes/SHA。32程式／工具鏈／測試檔與commit相符，public12檔與M1凍結manifest相符。發布後只追加工作區收據/狀態，沒有更動已凍結commit或程式。

Git guard ZIPgates後再次verify PASS，三個known user/systemconfig指紋未變。M2 environment-before與environment-after-final完整snapshots精確相同，HKCU/HKLM PATH type/length/hash/ephemeral/full Environment-key及TEMP/TMP不變；環境compare PASS。沒有部署/Cloudflare/token讀取/共享首頁/其他工具變更。既有人工NOT_RUN全保留。

現況M2-source-published-awaiting-primary-review；原public repo已驗，source-final Git乾淨，原M1與production preview sessions25202/26152保留，CUA tabs1/2保留，production-preview-final.jpg為測試資料示例。M3由主代理獨立驗M2後接手；本對話不進M3，hosting not-deployed、externalReview not-run。
