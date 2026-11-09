# 日期工具實際驗收

## U06-WEEKDAY-SUMMARY-20261013 — owner 候選驗收

2026-10-13，Node v24.14.0／Windows，Codex IAB（未獨立暴露精確引擎版本）。PUBLIC source `98cee2eedce5a0035ae29d448528e6011cb87fd4`；本節只記 owner 本機與來源候選，新版未由本對話部署，待主驗／正式發布／外驗。

實際命令均在本工具執行：`node --test test/dates.test.mjs test/i18n.test.mjs test/app-interactions.test.mjs test/ui-contract.test.mjs` 22/22；`npm.cmd test` 58/58；`npm.cmd run check` 23 檔；`npm.cmd run build` preview8；`npm.cmd run build -- --production --cloudflare --site-url https://date.glossquote.com/` 12 檔；同旗標 check12。最終均退出 0。最初 focused 因繁中多餘空白 21/22，修正文句；第一次 full 因 fixture 動態 import 56/58，改 app closure 初始化接點與固定 import，未改 checker。兩次失敗原 log 保留，最終測試覆蓋實際候選程式。

| 案例 | 新版證據與實際界線 |
|---|---|
| U06-01／02 | A PASS：七個固定 ordinal 錨點、1..6 的 weekday 索引、非法值拒絕；原 129987 日期 round-trip 與 schema 安全測試保留。 |
| U06-03 | A／B PASS：兩語日期差 2/3、weekday／完整年月日、swap −2/3 與角色對調；B 精確讀回原生日期 value 後判讀。 |
| U06-04 | A／B PASS：兩語 +1、−1、0 的 ISO／Thursday 與 after/before/same 句型；數值 API shape 不變。 |
| U06-05 | A 兩語 PASS；B 英文同日 0/1、兩角色 Thursday PASS。未將英文操作宣稱為該例繁中真 UI 重做。 |
| U06-06 | A 兩端／越界 PASS；B 兩語 0001／9999 +0 與四位年 Monday／Friday PASS，繁中兩端越界及英文上限 +1 無摘要 PASS。 |
| U06-07 | A 原世紀閏年／INVALID_DATE PASS；B 兩語強制 text fixture 的 2024-02-30／空白移除新摘要 PASS，非舊瀏覽器认证。 |
| U06-08 | A PASS：原季節日期差1/inclusive2，固定 Sunday→Monday 的3月／11月星期 labels；純整數運算。 |
| U06-09 | A PASS：mode／clear／pagehide/pageshow／初始重建清新節點與原資料；B 刪空、Clear 焦點、模式清理、真語言導航清空 PASS。真 BFCache NOT_RUN。 |
| U06-10 | A PASS：native badInput=true→DATE_FORMAT／false→EMPTY，無虛假星期；B script-looking／空白 text fixture 讀回原值、無 SVG 節點、數值／所有新摘要清空 PASS。原生 badInput 操作及完整請求觀察 NOT_RUN。 |
| U06-11 | A PASS：原 Enter/IME/repeat/status 節奏保留，新摘要每次合法 input 更新且沒有第二 polite region；B 英文真 Enter、長 September／Wednesday PASS。真 IME／重複鍵硬體行為 NOT_RUN。 |
| U06-12 | B 兩語 320 viewport 實際 client/scroll width305相等，長摘要／ISO／weekday 換行與可讀畫面 PASS。真200%、AT、Firefox/Safari／真機、完整 Network/HAR/Storage及rum payload NOT_RUN；未用 DOM 或靜態掃描冒充。 |

真瀏覽器共33筆限定PASS記錄（原生25＋強制 text fixture8）。預覽由本次 owned session74162 啟動 `http://127.0.0.1:4174/index.html`／`/en/index.html`；只綁 loopback。fixture5186只改副本的date type與server port，完成後已停止owned session35521，未改／還原產品來源或停止其他服務。保存 JPEG，未將 JPEG 誤命名 PNG；viewport override 已 reset。

證據目錄 `.runs/06-date-calculator-outcome-2026-10-13/`：`focused-attempt-1.txt`、`package-attempt-1.txt`、`focused-and-package-final.txt`、`source-check.txt`、`preview-build.txt`、`production-build.txt`、`production-check.txt`、`browser-verification.json`、`zh/en-offset.jpg`、`zh/en-320.jpg`、`publication-verification.json`、`source-copy-review.json`、`fixed-source-manifest.json`。最後 scope／完整 Windows guard 結果見同目錄 `final-check.json` 及 `environment-before/after.json`。

來源副本25檔與通過來源SHA256相同，重用未變輸入的owner gates，沒有另宣稱在副本全測。PUBLIC／遠端HEAD／乾淨副本已核；固定ZIP27檔逐一重算Git blob SHA1及SHA256吻合commit、25份實作也吻合來源。無Cloudflare／DNS／憑證操作，新版不繼承M11／AUDIT的外驗。原人工清單持續有效。

## T09 正式主機 — PASS（2026-10-06 最新）

使用者完成憑證交接後Wrangler部署exit0。主代理獨立執行verify-host.mjs https://date.glossquote.com：24 HTTP案例全部PASS，使用正常TLS驗證，無繞過憑證檢查。verify-live-content.mjs：10公開檔案位元組等於production dist，包含兩語metadata/JS/CSS/robots/sitemap。IAB雙語7筆驗收記錄全PASS，實際操作日期差、含起訖日、交換、閏年負offset、跨年正offset、清除和語言切換；不以HTTP成功冒充計算可用。

Cloudflare UI確認僅Static Assets、版本6e330129、0 bindings、Logs/Traces Disabled、workers.dev Disabled、Preview URLs Disabled及正式custom domain。zone/DNSSEC與公開DS AD=true接入證據已完成。部署前後完整Windows環境Snapshots一致、PATH ephemeral=0。GitHub最新9b7dc6dbc00c55628d765533b9db0e983bbaf5ab只改README，PUBLIC／remote HEAD／clean已核對，產品來源同4494f0f。必要T09上線驗收PASS；原人工NOT_RUN、搜尋收錄和Git自動部署不包含在此PASS。

證據：.runs/date-calculator/t09/{host-verification,live-content-verification,live-browser-verification,interactive-deploy-result,github-live-verification}.json及live-*.jpg。原host-verification-local.json保留本機24案例。下方部署前NOT_RUN為歷史，已由本節實際結果取代。

## T09 — 本機部署準備PASS；真主機NOT_RUN（2026-10-06）

主代理親自執行 `npm test` 50/50、`npm run check` 22檔、`npm run build` preview8、`npm run build -- --production --site-url https://date.glossquote.com/ --cloudflare` 12檔及同旗標check12，exit0。子代理 focused4另有紀錄，不混算為主代理50以外的新需求。

Wrangler 4.147.0 隔離安裝在.runs/date-calculator/t09/deploy-tools，未新增產品依賴。初次dev因臺灣10-06而UTC仍10-05報future compatibility_date；修為UTC10-05，主代理再執行受影響cloudflare.test4/4。最終deploy --dry-run exit0、無bindings。一次與自己local dev並行dry-run因Windows鎖dist而EBUSY；停止本輪session86232後重建/check成功，既有產品服務不動。

Wrangler local dev 綁127.0.0.1:4184，實際解析3 redirect規則與2 header規則。主代理獨立HTTP測試GET/HEAD各12路徑，共24項PASS：兩語200/HTML、CSS/JS MIME、根目錄及兩種英文目錄別名301、缺失頁/模組404、CSP/frame-ancestors、nosniff、no-referrer、canonical/index-follow、robots與兩URL sitemap；HEAD body為空。證據 .runs/date-calculator/t09/host-verification.json 明記LOCAL_SIMULATION，不能替代部署到Cloudflare邊緣。

Cloudflare網域Free。使用者登入並確認暫停舊DNSSEC後，主代理經Spaceship UI完成NS切換，Cloudflare API確認zone Active；再啟用Cloudflare DNSSEC並儲存正確新DS。API確認DNSSEC Active，Cloudflare公開resolver的DS digest吻合且AD=true，Google A亦AD=true，DNS子階段PASS；Google DS曾有負快取，未聲稱全球傳播完成。040141.xyz未改。正式部署、公開TLS/HTTP/瀏覽器兩語及真機/AT仍NOT_RUN；新增部署token已獲確認並建立，待憑證交接。T09正式發布milestone未通過。

GitHub公開commit4494f0f8a1dfc420104181435def752ec594a552，24份來源hash相等、遠端26blobs等於本地Git tree、public且發布副本乾淨。Windows完整環境Snapshots前後一致，原GlossGate diff不變。詳見HANDOFF及GITHUB-PUBLICATION。

## T08 — 發布準備與操作修正PASS（2026-09-30）

主代理npm test46/46、check20、預覽build8；合成HTTPS根目錄正式build/check10、子目錄build/check9均退出0。兩語原始HTTP頁面14項真鍵盤操作斷言PASS；未移除CSP。app模擬測試與真實瀏覽器分開記錄，未以live region文字更新冒稱真AT朗讀通過。完整發現對應、委派與拒絕案例見[AUDIT-8099D51](AUDIT-8099D51.md)。主機未定，preview仍noindex；以下原人工待驗全部保留。

2026-09-29，Windows／Node v24.14.0／npm11.9.0。IAB引擎內部版本未提供，其他瀏覽器未測。所有資料為合成日期，不讀私人行事曆。

## T00 — PASS

主代理讀取9個實際來源檔及底座差異；check/build與已審查基線相同，serve僅將預覽埠改4174，scaffold測試增加產品名稱／CSP／骨架節點，所有原有路徑安全案例保留。主代理最終獨立 npm.cmd test=10/10、npm.cmd run check=8來源，均退出0。實際啟動4174，IAB載入日期工具骨架頁，確認文字誠實顯示尚未計算；HTTP方法、非法路徑與junction拒絕由內建HTTP整合測試實測。完成後停止主代理持有的預覽進程（Ctrl+C退出1為主動停止，不是產品測試失敗）。

## T01 — PASS

參見RESEARCH：官方WHATWG、年界限、Python日期核對、真實原生date／文字probe。主代理npm.cmd run check=8來源、退出0。沒有從probe推論完整產品或手機相容。

## T02 — PASS

主代理逐檔閱讀dates.mjs、calculator.mjs和兩份測試：純整數、公曆二分反算、exact own data schema、未知鍵／accessor拒絕與無原始輸入回傳符合契約。親自執行npm test（22/22）、npm run check（12來源）均退出0。離線Python3.12 datetime/calendar獨立oracle涵蓋0001–9999每年1月1日及12個月末共129987日期，核對parse/toOrdinal/fromOrdinal/format共519948斷言；另1000帶符號日期差與1000加減／超界案例（seed20260929）PASS。證據在工作區.runs/date-calculator/oracle-result.json，測試程式不屬於網站產品。

## T03 — 必要驗收PASS，人工保留項另列

主代理讀兩語HTML、CSS、app/i18n、兩份UI/i18n測試及scaffold更新。實際npm test=31/31、check=16來源，均退出0。i18n測試初稿把翻譯文字當shape比較，已改為葉型別；checker曾將測試標題去空白後誤判eval子字串，改測試描述，未弱化checker。

IAB原始HTTP頁面（4174）實測：繁中閏日差2/3、交換-2/3、同日0/1、最大差3652058/3652059、刪空清舊結果、clear焦點回date-start；方向鍵切offset清全部、閏日+1、1.5拒絕、首欄空時仍顯第二欄錯誤、兩端RESULT_RANGE、+007、鍵盤clear焦點date-base。帶工作內容切英文後初始diff/空表；英文正負/同日/極值、Enter交換、閏日±1、跨年±1、-0、科學記號拒絕、重整空表均PASS（共27條狀態斷言）。另英文320px offset 9999-12-31-1=9999-12-30 PASS。

桌面修正交換按鈕對齊輸入、FAQ保留native marker、兩語current marker、輸出可存取名稱、native/text日期格式提示後再次視覺確認。兩語320 viewport下實際clientWidth/scrollWidth均305（另15為捲軸），無整頁水平overflow；英文字較長仍換行，原生輸入/按鈕/模式label高度44px。英文ISO結果9999-12-30完整可見，FAQ鍵盤Tab與solid焦點可見。viewport override已恢復。D22的輔助工具實際朗讀、D23真200%及40%人工擴字仍NOT_RUN，不能以本次尺寸測量替代。

## T04 — 必要驗收PASS，人工保留項另列

主代理讀實際boundaries.test.mjs，確認raw長度先於trim、UTF-16計數、Unicode邊緣空白拒絕、所有calculator欄位型別拒絕、未知own鍵、getter不執行、throwing/revoked Proxy、不回傳raw字串、正負最大跨度與核心無時間API檢查。親自npm test=39/39、check17來源，退出0；未以靜態API掃描冒稱瀏覽器驗證。

使用工作區.runs/date-calculator/ui-fixture.py為两語原頁建立原始bytes備份，暫將三個type=date替換text，仍由本產品4174服務載入實際core/app。繁中有效ISO含ASCII空白、1900-02-29無效、33字元上限、空start＋invalid end、兩語HTML樣式字串（SVG節點0、無dialog、固定錯誤、不回顯輸入）、英文閏日和-1加減均PASS。這是強制文字控制fixture，並非聲稱已測到一款不支援date的真機瀏覽器。工具fill空文字未清除既有值時，讀DOM確認後改用實際Ctrl+A/Backspace；沒有因此修改產品或放寬預期。

另暫將兩頁module引用改成確定不存在的本地模組：兩語均保持fieldset disabled、unsupported-note可見、三個output為—，日期規則与7則FAQ仍在原始HTML中。這是模組載入失敗檢查，**真正關閉瀏覽器JavaScript與noscript渲染NOT_RUN**。fixture完成後恢復兩份原始bytes並比對hash，check16来源退出0。

恢復原生date後，10000-01-01被core拒絕不產生結果。實際按鍵把有效offset -2改成-3：數字答案先更新，status不逐字播，Tab離欄後status更新為最新日期；PASS。一般自動fill未產生真change的情形不計為產品失敗或成功，改真鍵盤验证。本輪累計41條通過UI狀態斷言；dev.logs warn/error回傳空陣列，但不替代完整Network或storage檢查。

獨立唯讀review `/home/<LOCAL_USER>/dc_t03_markup_luna` 檢查app/core，未發現阻止驗收缺陷；清除／模式切換／pagehide清全欄、一次綁定、schema再驗、無網路／儲存／日誌呼叫均有原始程式證據。真BFCache、完整Network/storage維持NOT_RUN。

## T05 — PASS（本機SEO與建置）

T04後產品來源不變，39/39與check17已通過；主代理npm run build退出0、8個靜態檔案。再以Python HTMLParser讀dist原始HTML：兩語各唯一title/H1、非空description（繁中53字元／英文190）、7則FAQ、noscript、原始計日規則、lang與相對互鏈／current标记、兩語head alternate、noindex/nofollow、no-referrer存在，無虛構canonical。主代理已逐段讀取兩語使用方式、限制與FAQ內容。dist全部8個路徑與SHA256等於public，沒有docs/test/package/.runs；release-result.json保存清單。不宣稱正式SEO發布／收錄完成。

## T06 — 本輪必要驗收PASS，完整人工MVP尚未結案

最終主代理依序執行npm test（39/39）、npm run check（17來源）、npm run build（8產物），退出0。產品來源不變，release checker再核對全部public/dist路徑及hash一致。原生頁最終兩語兩模式再回歸，繁中2/3與-1閏日、英文-2/3與+1閏日、切語言清空均PASS，累計46條UI狀態斷言；最後停在繁中空表、預覽服務保持，viewport恢復，dev.logs warn/error空陣列。

範圍檢查：201份原始工具檔的hash基線只有本日期工具6份允許文件改動；22份新來源／文件均符合本任務allowlist。既有單位換算來源與其他工具未改，GlossGate既有未提交diff逐字一致。兩語暫存測試頁恢復原始bytes。證據在.runs/date-calculator/scope-result.json、release-result.json。

Windows持久環境前後完整Snapshots相同：HKCU PATH ExpandString、834字元、16項、ephemeral=0、SHA256=3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb；Environment-key18項hash=3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a。HKLM PATH String、1227字元、30項、ephemeral=0、SHA256=52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8；Environment-key26項hash=a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82。TEMP/TMP型別／長度／hash亦一致。未整理既有重複PATH項，未新增依賴或更改全域設定。

| 驗收ID | 實際狀態 |
|---|---|
| D01–D17 | PASS：exact核心測試與獨立Python oracle |
| D18–D19 | PASS：雙語交換、模式清空、刪空、clear焦點 |
| D20 | PARTIAL：source無網路／storage／log、CSP阻止連線、reload/URL/console檢查；完整Network/storage NOT_RUN |
| D21 | PASS：core拒絕＋兩語強制text fixture沒有SVG節點／dialog、固定錯誤 |
| D22 | PARTIAL：方向鍵、Tab、Enter、實際輸入與焦點可見；螢幕閱讀器與真機待驗 |
| D23 | PARTIAL：兩語320px、完整英文ISO結果／44px控制PASS；真200%／40%額外長標籤NOT_RUN |
| D24 | PARTIAL：實際產品強制text＋module failure PASS；真不支援date瀏覽器／禁用JS noscript渲染NOT_RUN |

人工保留項：真200%頁面縮放、40%額外長標籤、真手機觸控／鍵盤、螢幕閱讀器、完整DevTools Network/storage、首次離線、真BFCache、Firefox／Safari與真正禁用JS均尚未完成。使用者授權保留人工待驗，故本輪可交付；project.json仍in-progress，不宣稱完整本機MVP驗收或正式網站發布。沒有需要使用者立刻補資料才可使用的阻塞，後續人工檢查和正式主機另按清單處理。
