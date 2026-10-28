# 檔案SHA-256校驗交接

## 目前核實狀態 — 2026-10-19 / T05 PUBLIC SOURCE PASS

獨立repo https://github.com/KYStr/glossquote-labs-file-checksum 已核實 **PUBLIC**、isPrivate=false、default branch=main。遠端HEAD／GitHub API commit均為 **eab1da8e69e896be00ff1be54095641352a280a7**，tree為4fe8291a6a9776c23e36ff15c706603b62ff6ef6。固定來源仍41檔，只有README／HANDOFF／project／兩份release文件與T04不同；所有產品runtime／build／tests／wrangler bytes不變。

從該公開commit實際下載的GitHub ZIP為 `glossquote-labs-file-checksum-eab1da8e69e8-source.zip`，146,418 bytes，SHA-256 **dd0004043394fe78395adf2876d0c3e22ce0608d810e7f35bac012f117055293**。41個檔案逐一符合本地Git raw blob及遠端tree；ZIP central／local path、regular類型、CRC32、安全路徑及實際解壓bytes全部PASS。exact-git-source-manifest.json SHA-256為5554db6531c00d7f3df8df2c657bf195ebf693f6a7e8819e8aa40e2f151e00cb。

解壓副本npm run check／build／build:production／check:production／release:check五項exit0，production十七檔、preview十五檔及legacy十檔逐byte等於T04。沒有在owner重跑未變142；主代理已開始從此固定公開ZIP獨立跑全套，該結果由主代理另記。本工具READY_FOR_INTEGRATION僅指來源與封包可供主代理接手，**部署／兩語首頁／live平台驗收／外部複驗尚待主代理，沒有宣稱完整MVP**。原T02／T03 scoped GO及PARTIAL／NOT_RUN保留。

T05實測收據在孵化器 `.runs/file-checksum/t05-20261019/`，包含exact Git manifest、公開ZIP／解壓核對、archive-gates、Git及Windows環境before／after guards和最終source-publication-receipt。Git只在專用publishing-copy執行，使用per-command helper；未改global／system Git、未讀取或輸出token，沒有browser／Computer Use／OS dialog、部署或首頁動作。此段是發佈後的工作區交接收據，與固定公開Git快照的差異只限HANDOFF／project／RELEASE-CANDIDATE三份文件；不為此另推commit或重製ZIP，固定來源與SHA保持不變。

## T05發布前來源快照 — 2026-10-19 / reviewed publishing source

主代理已親讀T04實際diff／scope-proof，並在凍結candidate/source獨立執行release.test 12/12 PASS及check PASS，正式放行FILE-CHECKSUM-T05-20261019。公開來源目標為https://github.com/KYStr/glossquote-labs-file-checksum；只使用T04凍結的41檔清單，T05僅更新README／HANDOFF／project及release文件。產品runtime、build、tests、wrangler配置保持T04原bytes；不重跑未變的全套142，主代理會從固定公開來源ZIP執行一次全套。

此Git來源快照是發布前已審查的內容，不能在檔案內自引尚未產生的commit或ZIP hash。實際PUBLIC、remote HEAD、Git blob manifest、來源ZIP SHA-256、解壓byte核對及guards記在原對話T05收據；本工具工作區交接稍後記錄已驗證值。這不表示hosting／首頁已完成，T02／T03 scoped GO及所有PARTIAL／NOT_RUN保留。後續source-only文件收據不改本次固定公開commit或產品產物。

## T04主驗交接歷史 — 2026-10-19 / FROZEN

主代理依隔離瀏覽器station-v3的R1及focused-r2實測，已給T02／T03 **scoped GO** 並只放行T04；這不是完整MVP／全部瀏覽器門檻通過。新正式origin為 **https://checksum.glossquote.com**，取代歷史hash.glossquote.com。T04本機發布工具鏈已實作並凍結，**T05 source push尚未授權，沒有push／部署／首頁修改**。本功能對話沒有操作瀏覽器或Computer Use；正式瀏覽器補驗由主代理既有、已驗證的隔離機制執行。

| T04必要驗收 | 實際結果 |
|---|---|
| npm test | 142/142 PASS，0 fail／cancel／skip／todo，exit0，32.188秒；原130項＋12項release測試 |
| npm run check | exit0；十個preview來源、Worker原bytes、ESM語法及static-only配置 |
| npm run build | R1 exit0，R2沿用未變產物；dist-preview十五檔；相容dist十檔仍逐byte等於原public |
| npm run build:production | exit0；dist-production十七檔，固定checksum origin／SEO／robots／sitemap |
| npm run check:production | exit0；完整allowlist與每個產物bytes精確匹配 |
| npm run release:check | exit0；required preview＋production都存在且通過，沒有skip路徑 |
| 持久Windows環境guard | before／pre-final／after皆PASS且完整snapshots相等；User PATH ExpandString／834、Machine PATH String／1227、ephemeral皆0，TEMP／TMP與Environment-key fingerprints未變 |

T04只更動build／check、package scripts、release測試、wrangler配置及交接／發布文件。public十個來源檔完全不變；正式輸出的八個JS／CSS檔保持原bytes；兩語body只移除預覽未發布片語，保留語言切換提醒，其他bytes不變。核心、controller、Worker source／生成檔、既有五個測試檔和validation.mjs未改；原hardlink／junction／stale／HTML負例未弱化。正式HTML加入head SEO並只移除body預覽未發布片語，新增兩語404、無script本地SVG favicon及靜態控制檔；logs／traces皆明確停用。固定JSON-LD各有精確CSP SHA-256 hash，沒有unsafe-inline；保留worker-src blob及connect-src none。四條精確301只處理/、/en、/en/及favicon.ico；未知path不做SPA fallback。

主代理碼審發現正式頁仍有預覽未發布提示，R2只在production轉換中移除兩語片語並加精確回歸斷言；原public與語言切換提醒保留。R0／R1既有142項與六gate通過logs保留，R2只重跑受影響gate；preview建置輸入與產物不變，沿用R1的npm run build及固定bytes。

新增release測試涵蓋雙語canonical／alternates／JSON-LD／CSP、body與runtime bytes、兩模式可重現、錯誤origin／CLI參數、server／binding／錯誤目的配置拒絕、目的注入／hardlink／root及nested junction／缺檔／stale保留，以及純Node HTTP model的GET／HEAD／405／MIME／根與巢狀雙語404／私有路徑拒絕。初次集中測試10/11；錯誤斷言把全頁五個details當成四個FAQ，修成全頁五個且FAQ區精確四個；保留初始FAIL log，集中複驗1/1及最終142/142 PASS。沒有修改產品行為來迎合測試。HTTP model只測本機規則與產物，不等於真Cloudflare或瀏覽器PASS。

固定證據在孵化器 `.runs/file-checksum/t04-20261019/`：baseline／candidate source與兩模式產物副本、精確source／dist manifests、source.diff、scope-proof、required-gates與完整logs、guard前後及README。來源公開／固定remote commit、Cloudflare live headers／MIME／301／404及正式產物瀏覽器操作、首頁整合、單一外層交付ZIP與外部複驗仍未完成。本輪不產生另一份交付ZIP；主代理整合既有候選與證據後交付。

### T02／T03隔離瀏覽器證據的新解讀

2026-10-19原始R1結果完整保留：15 PASS／3 FAIL／9 PARTIAL／8 NOT_RUN，result SHA-256 `e0a9947fc996b29571b84b9e37966cb1fe173767b8dd421e2a87ac55b76178f7`。focused-r2為1 PASS／0 FAIL／3 PARTIAL，result SHA-256 `0e436fb33e8fbea7b37ce36d8092ebc93f5b7a455319b9db0a7592fa8641dcf0`；位置分別為 `.runs/browser-acceptance-2026-10-19/station-v3/u19-15-r1/` 與 `u19-15-focused-r2/`，不是本對話新執行的瀏覽器結果。

- H11英文focused已PASS，配合R1繁中，兩語皆有真磁碟128MiB檔案、原生Worker及正確digest；兩語真128MiB+1皆在讀取／建立Worker前拒絕。兩語瀏覽器managed downloads已驗精確檔名與65 bytes；不表示OS選檔／儲存對話框已人工測試。
- H24兩語HTTP請求皆完成；本地Blob transport缺terminal事件保持PARTIAL，不能改寫為finished。原生Worker close與ObjectURL回收另有觀測，沒有因此判定HTTP外傳或產品FAIL。
- H26繁中新頁空狀態已觀察，但原document、產品listener之後的可信pagehide取樣未送達，仍PARTIAL；不據此推論清除缺陷。主代理接受目前無已確認產品FAIL，保留16項PASS及其餘PARTIAL／NOT_RUN，給scoped GO。
- OS dialogs、真200% zoom、AT／裝置、真60秒／offline、完整BFCache／舊頁資源等未驗範圍保持原狀；受focus incident限制的項目標NOT_RUN_USER_FOCUS_INCIDENT，不以CLI、HTTP、stub或CSP冒充瀏覽器通過。

## 歷史狀態 — 2026-10-13 / HASH-T02-R1 凍結待主驗

本輪修正交接分類：**H11 真128MiB（134,217,728 bytes）計算、H12 實際128MiB+1（134,217,729 bytes）選檔拒絕，均已屬 T02 必要且已授權驗收**，不是未授權T03。本輪只改 HANDOFF／RELEASE-CANDIDATE／project.json，ACCEPTANCE／TASKS／32個runtime檔不變；沿用原130/130、check/build通過的固定證據，未重跑未變gate。原始T02證據全部保留；三個更正前文件另存新R1證據的before/，舊證據中的錯誤分類由本節更正，不把舊NOT_RUN改成PASS。

R1使用正式Edge browser API，沒有原生Computer Use、擴權或旁路。原生picker以3-byte fake abc檔一次預檢，496ms回報EXTENSION_FILE_URL_ACCESS_REQUIRED；因此H11／H12／H13原生選檔仍NOT_RUN，未建立／讀取大檔，真大檔hash／elapsed均無觀測值。實際點擊產品English與繁體中文anchor往返兩項PASS（553／712ms），同語URL正確、前頁expected草稿與hash沒有帶入新頁；這只補H27產品語言連結子項，不是整個H27或首頁往返PASS。

另以明確標示的合成**真3-byte File** `[61,62,63]` 獨立測H22輸出，不冒稱native picker／H11／H12。未替換NativeWorker／WebCrypto；真Worker結果為`ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`，click到觀察完成的API往返wall time478ms。真點產品下載前啟用waitForEvent('download')，本輪一次等待10,000ms（觀察10,026ms）無事件／path；65-byte Blob與0 live URL可觀測，**實體TXT bytes／檔名／artifact SHA仍NOT_RUN**，英文實體下載同缺口未盲目重試。不可用Blob.size當落盤65bytes證據。

新封存 `.runs/file-checksum/t02-r1-20261013/` 含逐步JSON、實際產品語言連結與下載請求JPG、39個source／32個runtime／10個build manifests、scope-proof及guard前後。User PATH ExpandString／834／ephemeral0、Machine PATH String／1227／ephemeral0與完整Environment-key snapshots前後一致。Owner已釋放供R1主驗；T02仍是自動PASS／瀏覽器部分待驗，T03／source發布未放行，完整Goal未完成且app既有blocked狀態未擅改。

## T02 初次交接（歷史，H11/H12分類已由R1更正） — 2026-10-13

CHECKSUM-T02-UI 已依主代理授權實作，owner 釋放供主驗；本機自動 gate PASS，瀏覽器驗收部分可觀測，不宣稱整個 T02 或產品已驗收完成。最終 npm test **130/130、0 fail/skip**（26.558秒），check/build exit0，10個雙語互動preview資產逐byte建置；PATH及完整Environment-key snapshots未變。依使用者「瀏覽器操作、非Computer Use」指示，本輪只用瀏覽器API／DOM語意操作；Edge 154.0.4258.62 真Worker、原生copy、320 CSS px等23項觀察PASS。Chrome／原生選檔／實體下載／真200% zoom／上一頁pagehide資源觀測等NOT_RUN明列在末節。

固定證據在孵化器 `.runs/file-checksum/t02-20261013-01a12e45/`：final-source-manifest、final-runtime-manifest、build-manifest、scope-proof、guard前後JSON、原始最終npm logs、browser/edge-observations-final.json及真viewport JPG。T01已正式主驗PASS；本輪不自行進T03、發佈source、部署或修改首頁。原threadId／host／Sol max設定請求不變，backend未獨立確認。App Goal實際仍blocked；已依2026-10-13正式T02訊息續作，未將未完成產品Goal改寫complete。

## 主代理更新（T01主驗歷史） — 2026-10-13

T01 親驗 PASS：112/112、check/build exit0，27個凍結 runtime/tests/tooling/dist hash 全部匹配，環境完整 fingerprints 未變。已親讀核心/Worker/generator及測試，見孵化器 .runs/new-tools-2026-10-13/checksum-t01-primary.md。原chat將正式續作T02，T03/source/hosting/外驗仍未放行或未驗；以下T01紀錄保留為歷史，不用Node結果冒充瀏覽器。

## T01 交接狀態（歷史） — 2026-10-12

CHECKSUM-T01-CORE-WORKER local PASS / FROZEN，owner 已釋放供主代理親驗。最終 npm test 112/112、零 skip，check/build exit 0；T00 主驗已正式通過，全部 T00 regression 保留。T02 尚未批准，兩語頁面仍停用，產品瀏覽器/正式 source/hosting/外驗未完成。原 threadId `01a12e45-d062-76b3-9263-bc7a7fb29f42`、host local、已接受的 Sol/max 請求不變，backend 未獨立確認，Goal active。T01 詳細記錄在末節。

## T00 放行前交接狀態（歷史原文）

T00 local PASS / FROZEN，owner 已釋放供主代理唯讀親驗及最終 runtime manifest 核對；T01 尚未批准。原功能對話 threadId=`01a12e45-d062-76b3-9263-bc7a7fb29f42`、host=local，create_thread 已接受 gpt-6.1-sol/max 設定請求；backend 身份未獨立確認。本對話已實際建立有界產品 Goal，status=active，產品、source、hosting、外驗仍未完成。以下規格紀錄保留為歷史；本輪實際交付記錄在末節。

## 派工前規格紀錄（歷史原文）

目前SPEC_ONLY / QUEUED。主代理撰寫規格；功能對話尚未建立，threadId=null。預期請求gpt-6.1-sol/max，尚未實際傳給create_thread，更沒有可確認後端身份。

產品實作、產品測試、Chrome/Edge、GitHub公開、免費hosting、首頁、主代理產品驗收及外部驗收全部NOT_RUN。規格/API例子檢查不能當產品通過。候選hash.glossquote.com沒有被宣稱可用；未加入正式首頁。

每次交接追加任務ID/FR範圍、實際改檔、命令/exit、環境、證據、PASS/FAIL/NOT_RUN、已知風險、固定source/publicity與hosting、owner是否釋放。主代理收到原功能對話結果後獨立檢查，有問題回原對話修正；不回寫歷史失敗為通過。

## 規格就緒，等待名額

CHECKSUM-SPEC-REVIEW唯讀審查已回收並由主代理讀取；完整錯誤碼/worker白名單、pagehide全部清除/BFCache idle、Blob JavaScript MIME與二進位literal均已修正。審查最後的catch措辭建議也由主代理補成精確API rejection與長度錯誤分支，不再有該歧義。此為規格有界驗收，不是產品實作完成。

主代理檢查17必要檔、23本地相對連結、10需求/30具體案例；4個小bytes值與128MiB零bytes的Node串流參考值核對通過。證據在孵化器專用.runs/wave02-primary-review/checksum-spec-proof-final.json及checksum-spec-review.md/json；獨立使用此資料夾不依賴那些證據檔才能實作，全部需求/預期仍寫在本規格。原功能對話尚未建立，模型配置尚未實際請求，source/hosting/產品測試仍NOT_RUN。

## THREAD-15-file-checksum / T00 交付 — 2026-10-12

範圍：繁中/英文停用預覽、零依賴 Node 24 ESM dev/check/build/test。非目標：hash/Worker、可用產品 UI、正式 SEO、公開 source 與部署。所有檔案、計算及輸出控制項保持 disabled；app.mjs 只標記初始 ESM 載入，不讀 File、不建立 Worker、不接 copy/download。

新增 11 個來源檔：package.json、.gitignore、public/index.html、public/en/index.html、public/styles/app.css、public/js/app.mjs、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、scripts/validation.mjs、test/scaffold.test.mjs。更新 4 個指定交接檔：project.json、START-HERE.md、HANDOFF.md、docs/RELEASE-CANDIDATE.md；dist 只生成 4 個核准公開資產。根 Git/index、其他工具、00-home、根規範與憑證未修改／讀取。T00 無需 package-lock 或 npm install。

| 驗收 | 實際命令／行為 | 結果 |
|---|---|---|
| 初始 gate（歷史） | npm test / npm run check / npm run build | exit 0；58/58、零 skip；後續主驗仍找到未覆蓋缺陷，不能當最終品質證明 |
| AUDIT-15-T00-ACTIVE-ROBOTS 修正前 | 主代理 checksum-html-repro.mjs 對本工具真來源執行 | exit 1；正常頁面 PASS，textarea/title/noscript 偽 meta 3 例 FAIL，保留 before JSON |
| HTML 集中回歸 | node --test --test-name-pattern="HTML uses active" test/scaffold.test.mjs | exit 0；34/34、零 skip |
| 原重現程式修正後 | 相同主代理 repro，寫本工具 after JSON | exit 0；正常來源與 3 個負例合計 4/4 PASS |
| 最終自動 gate | npm test | exit 0；69/69、0 fail、0 skip；10.311 秒 |
| 最終來源檢查 | npm run check | exit 0；4 核准資產、locale parity、active noindex、引用、runtime 禁用 API、真 ESM 語法 |
| 最終 build | npm run build | exit 0；4 個資產逐 byte 相等；不打包 package/docs/tests |
| 真 dev 入口 | npm run dev | 實際啟動 127.0.0.1:4195；兩語/JS/CSS 200、根與 en missing 404；必要 MIME/noindex header 正確 |
| 持久環境 | check-persistent-environment.ps1 前、修正前、最終後 | 全 PASS；PATH 與完整 Environment-key 指紋完全一致 |
| 主代理獨立 gate | 主對話已回報 checksum-t00-snapshot 親讀、npm test/check/build 與原 repro | 69/69、零 skip、check/build exit 0，repro 4/4；主代理證據 `.runs/wave03-checksum-start/checksum-primary-gates.json` / `checksum-html-primary-after.json`；待最終 manifest 核對後正式放行 T01 |

具體回歸：GET/HEAD bytes 與 MIME、405/Allow、真正巢狀與 en 404；raw HTTP 穿越/編碼/hidden、來源與公開根上層 junction；occupied requested port 用 OS 空閒埠且保留原 server；copy 只含固定 allowlist、可重現 bytes、source gate 完成前不寫 dist；目的 hardlink 外部假 sentinel 未改、來源 hardlink 拒絕；未知 stale dist 檔/目錄拒絕並保留；來源 styles、目的 dist/styles 及 project/public 祖先 junction 拒絕。

HTML 修正：title/textarea 作 RCDATA 單元，不把 literal meta/script 算作 active 節點；noscript 在有界預覽語法中明確不支援並 fail closed。結構驗證要求一組明確 html/head/body 與配對標籤，metadata 只能在 head 直接子層；head 中 body 元素/非空文字、head 外 meta、巢狀 head、錯配 close 都拒絕。單引號／大寫／unquoted／註解／entity scheme、remote script 冒用 homepage navigation URL 仍被驗證，沒有放寬 remote allowlist 或新增依賴。正常雙語頁面維持通過。

環境：Windows，Node v24.14.0 (`C:/Program Files/nodejs/node.exe`)、npm 11.9.0。User PATH：ExpandString、834 字、0 ephemeral、SHA256 `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`；完整 Environment SHA256 `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`。Machine PATH：String、1227 字、0 ephemeral、SHA256 `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`；完整 Environment SHA256 `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`。既有 duplicate entries 未改；TEMP/TMP 型別、長度與 hash 亦未變。

專用 append-only 證據：孵化器根 `.runs/file-checksum/t00-20261012-01a12e45/`，含原始／最終 npm logs、audit before/after、3 次環境 JSON、initial-spec-manifest、final-source-manifest、final-runtime-manifest、build-manifest、t00-result.json 與雙語 jpg。1280×720 Codex in-app browser 實際看到兩頁全部 7 控制項 disabled、module 標記 T00，English 連結導向正確；這只是停用骨架觀察，不是 Chrome/Edge 產品驗收。IAB 的 readonly scope 不提供 navigator.userAgent，版本未確認；未虛報 Chrome/Edge、320px、200% zoom、Network/Storage、hash、原生下載或 H01–H30 PASS。

保留 task-owned 預覽程序供親驗：npm exec session 57134，listener PID 59188、parent 72524，命令 `node  scripts/serve.mjs`，開始 `2026-10-12T12:20:08.551495+08:00`，URL `http://127.0.0.1:4195/`。它在 HTML validator 修正前啟動；public/serve 與 filesystem 安全邏輯沒有因該修正改變，最終 Node CLI 測試另使用修正後 helper。既有程序與 tabs 未停止；測試自己的子程序/假資料工作區已清理，本工具 IAB 分頁標記 handoff。

已知限制／下一步：有界 HTML validator 不代替完整 HTML 標準 parser，unsupported syntax fail closed。T01 增加新資產時需擴充 check allowlist 及 scaffold fixture 的來源清單/數量斷言；T02 接真正 UI 時需按 owning T00 邊界調整 disabled-preview validator，不能直接略過失敗 gate。目前只記錄這些接口事實，不提前實作下一階段。

Source repository/publicity/remote commit/來源 ZIP：NOT_RUN（T05）；hosting/hash.glossquote.com/首頁：NOT_RUN（主代理後續）；產品主驗及外驗：NOT_RUN。本次 owner 釋放、runtime/tests 不再寫入；等待主對話實際 T01 放行。本機 T00 PASS 不代表整體產品、正式發布或外部驗收完成，Goal 仍 active。

## CHECKSUM-T01-CORE-WORKER 交付 — 2026-10-12

主代理以 `.runs/wave03-checksum-start/checksum-final-match.json` 確認 T00 親測 snapshot 與最後 10 個來源檔相等、全部 guard Snapshot 不變，正式放行本輪。T00 final manifests／t00-result 已保存且未回寫；新證據在孵化器根 `.runs/file-checksum/t01-20261012-01a12e45/`。

實作範圍：固定 checksum API、immutable session reducer、exact request/reply schema、自足 Worker、原 bytes 生成來源／stale 檢查與相關自動測試。非目標：UI 接線、真瀏覽器 Worker/下載/clipboard、128MiB 大 buffer benchmark、正式 SEO、GitHub/Cloudflare。app.mjs、兩語 HTML、CSS、server、filesystem validator、package 與原本 build.mjs 未變，兩語 7 控制項仍 disabled。

新增 8 檔：public/js/core/checksum.mjs、public/js/core/session.mjs、public/js/hash.worker.mjs、public/js/worker-source.mjs（生成物）、scripts/build-worker.mjs、test/checksum.test.mjs、test/session.test.mjs、test/worker.test.mjs。修改 scripts/check.mjs（8 資產 allowlist、原 bytes 一致性及新模組語法）、test/scaffold.test.mjs（8 資產／新 scripts/tests 的 fixture 清單及數量）、TASKS.md（主代理補足 scope 與完整 state/actions 接口）、project.json、START-HERE.md、HANDOFF.md、docs/RELEASE-CANDIDATE.md。既有 build 呼叫 validateProject，因而在任何 dist 寫入前一併拒絕 stale Worker，無需另外改 build.mjs。dist 現只含 8 核准資產。

checksum：非負 safe integer size 0–134217728 含上限；先驗 expected 原 UTF-16 256 碼元、只 trim ASCII space/tab/CR/LF、hex64 大小寫正規化；31/33-byte digest 拒絕並保留每個前導 0；五種 comparison、hash 格式驗證及恰 65-byte hash+LF serialization。ProductError 只回固定 code，不回 raw 例外內容。

session 接口完整寫在 TASKS T01：只持有 size/hash/expected 與單調 job/file/output revision，不持有 File/Worker/URL；select 先作廢舊結果、busy start 10 次維持同一 active job；expected 更新只比較最新原稿、保留合法 hash/output revision。舊 callback captured job/revision 先忽略；當前 wrong payload ID／unknown schema／stage 倒退／早到 done fail closed。完成／失敗／取消解除 active/deadline，重算不復用 ID。cancel 保留 File metadata/expected；clear/pagehide 全部清空並使舊 callbacks 失效。60000ms 以 callback 和 check-deadline 核對，超時結果拒絕；ID overflow 固定拒絕、不回繞。T02 controller 仍須實作 Worker 身份、真正 terminate／timer／URL 清理、焦點與 copy request 序號。

Worker：一個 handler lifetime 只接一項 job，真 module 在 worker scope 安裝 message listener；File／size／secure context／worker WebCrypto／arrayBuffer 重驗。依序 reading→arrayBuffer exact length→hashing→原生 SHA-256→32bytes/64hex done。READ_FAILED、READ_SIZE_MISMATCH、HASH_FAILED、HASH_LENGTH 各保留分支，不由 broad catch 混為一個錯誤。第二請求令 lifetime close，await 後的 generation 檢查抑制先前 read/digest 的 success/error；postMessage 失敗安全 close，不輸出 raw error。request 無合法 jobId 不捏造 reply。reply 沒有 File/name/stack 或輸入內容。

生成檔：`node scripts/build-worker.mjs` 明確生成唯一 WORKER_SOURCE 字串 export。完整 UTF-8、CRLF、BOM、Unicode bytes roundtrip，不正規化原檔；check/build 比對整個 canonical 生成檔。原檔或生成檔多一行都拒絕，既有 dist 完全不變；只在明確執行 generator 時重生。目的 hardlink external 假 sentinel 保持原 bytes。

| Gate | 真實命令／觀察 | 結果 |
|---|---|---|
| 生成來源 | node scripts/build-worker.mjs | exit 0；4256 原 UTF-8 bytes |
| checksum/session 集中 | node --test test/checksum.test.mjs test/session.test.mjs | exit 0；22/22、0 skip |
| Worker/生成器集中 | node --test test/worker.test.mjs | exit 0；21/21、0 skip |
| 最終全測 | npm test | exit 0；112/112、0 fail/skip，18.826 秒；原 69 項 regression 全保留 |
| 最終檢查 | npm run check | exit 0；8 靜態資產、雙語停用、ESM 語法、Worker 自足／生成 bytes |
| 最終 build | npm run build | exit 0；8 核准資產逐 byte 複製、所有拒絕邊界保留 |
| Windows guard | check-persistent-environment.ps1 前／後 | 全 PASS；完整 JSON Snapshot 相等，與 T00 fingerprints 相同 |

固定 literals：空檔 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`；abc bytes61 62 63 → `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`；abc+LF → `edeaaff3f1774ad2888673770c6d64097e391bc362d7d6fb34982ddf0efd18cb`；binary `[00,ff,80,0d,0a,ef,bb,bf]` → `ef7599427575c12d74a02c29d770363b67b7b4ab158aa04464938118c8f13003`。由 Node 原生 WebCrypto 經同一 Worker handler 計算，expected 均是規格 literals，不以被測函式產生。改 name/MIME/mtime 的 abc 相同。

ACCEPTANCE 自動層對照：H01–H05 原 bytes/hash/metadata；H06–H10 format/trim/256–257；H11–H12 僅純 size 與 +1 不讀（本輪明確不配置大 buffer）；H14 latest expected；H15–H17/H26 reducer cancel/select/clear/pagehide／舊 callbacks；H18 60000ms 快速邊界；H19–H20 fake API rejection/長度/strict schema；H29 原 bytes/bundle/tamper；H30 single lifetime/busy/recompute。Node scope／handler 注入和 reducer 都只算自動證據，**不能表示真瀏覽器 Hxx PASS**。

環境 Node v24.14.0 / npm 11.9.0。前後 User PATH ExpandString、834 字、SHA `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`，全 Environment SHA `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`；Machine PATH String、1227 字、SHA `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`，全 Environment SHA `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`；雙 scope ephemeral count 0，TEMP/TMP 與所有 protected values 不變。原 server/session 57134、PID 59188 及本工具分頁保留；只清理本輪自己的測試子程序與 fake-data workspace，未改持久設定或讀 token。

固定 evidence：initial-source-manifest、final-source-manifest、final-runtime-manifest、build-manifest、worker-source-proof、environment-before/after、focused 與 final npm logs、t01-result.json。Source/publicity/remote commit/來源 ZIP、production/hosting/首頁/外部驗收仍 NOT_RUN；沒有公開停用骨架。UI、真 Blob Worker structured clone／terminate、Worker 60 秒真時間、128MiB digest/取消、BFCache、Network/Storage/Offline、clipboard 與原生落盤均留給 T02/T03，沒有借 Node 結果冒充。T01 主代理獨立驗收待執行。

Owner 已釋放並凍結 T01 runtime/tests；等待主對話實際 T02 放行。本輪零依賴、必要 gate 無失敗，並未擴充 UI 或正式發布；Goal 仍 active。T02 啟用 UI 時仍需 primary 授權調整 owning T00 disabled-preview 檢查，不能以刪除 regression 繞過。

## CHECKSUM-T02-UI 交付 — 2026-10-13

可觀察交付條件：雙語可操作的本機校驗工作區、原生 Blob Worker 與 latest-file/latest-job 保護、copy/download/clear/pagehide 接線；保留原安全回歸、test/check/build 通過，真瀏覽器證據逐項分開。T01 主驗通過後正式只放行本里程碑；H11真128MiB與H12實際+1邊界均屬T02必要補驗，目前NOT_RUN。T03完整隱私／資源量測、T04 SEO、T05 source發佈、hosting／首頁或外驗未放行。使用者於本輪要求瀏覽器操作，故僅操作 Edge browser API／DOM，沒有使用 sky、原生視窗、鍵鼠 Computer Use、CDP 旁路或修改擴充功能權限。

新增 `public/js/controller.mjs`、`public/js/i18n.mjs`、`test/ui-contract.test.mjs`。修改兩語 HTML、app.mjs、CSS，以及必要 scripts/check.mjs／validation.mjs／test/scaffold.test.mjs／worker.test.mjs 接線；更新 HANDOFF／project／START-HERE／TASKS／RELEASE-CANDIDATE 狀態，dist 由正式 build 生成。checksum/session／Worker 原檔與 generated source、generator、serve、build、package、規格／安全／設計文件保持原 bytes；無新增依賴。根 Git/index、兄弟工具、首頁、憑證未操作。

controller 持有真正 File 與當前 Worker；immutable reducer 只持有安全 metadata。每次 start 同步忙碌狀態後，建立固定 WORKER_SOURCE 的 module Blob Worker，精確傳送 `{type:'hash',jobId,file}`，不在主執行緒讀檔。callback 先核對 Worker 實例／captured jobId／fileRevision，舊 event.data getter 也不讀；完成／錯誤／取消／換檔先撤銷當前身份，再解除 listeners、timer、terminate、revoke。deadline 包含啟動，回覆／timer／foreground 檢查；不接受超時 success。copy 用 opaque request token／outputRevision 抑制遲到回覆，原生拒絕則聚焦並選取可讀64字元結果。TXT serializer為UTF-8無BOM、hash+LF恰65bytes，固定檔名glossquote-sha256.txt，建立／延時回收下載URL；UI只說「已請求下載」。clear/pagehide全部清空，pagehide不搶焦點，persisted pageshow防止恢復舊native輸入。

介面提供任意單一檔案與128MiB精確上限、選檔metadata、可展開完整bdi檔名、expected原稿與明確錯誤、取消／清除、可選取的hash與相符／不符文字。檔名全部用textContent，Cc/Cf轉成可見U+XXXX，不解析markup或讓bidi重排內容。預期碼不設maxlength；257原碼元保留並顯示拒絕，不截為合法結果；只trimASCII空白，不trimNBSP。expected改動只比對，不使同檔合法hash失效。雙語FAQ／隱私說明、44px控制項、focus／live status／reduced motion和家族tokens維持既有設計；仍noindex開發預覽。

| 驗收層 | 實際命令／輸入／觀察 | 結果 |
|---|---|---|
| 集中 UI（初始歷史） | node --test test/ui-contract.test.mjs | 17/18；假timer未模擬原生fired timeout自動移出map。保留initial log，修正stub生命週期，不刪斷言或改產品行為 |
| 集中 UI（修正後） | 同一命令 | 18/18、exit0 |
| 原HTML集中 | node --test --test-name-pattern="HTML uses active" test/scaffold.test.mjs | 34/34、exit0；原disabled scaffold literal固定hash與全部負例保留 |
| 最終全部 | npm test | 130/130、0 fail/cancel/skip/todo、exit0、26.558秒；原112項與18項UI contract |
| 最終check | npm run check | exit0；10核准資產、雙語互動初始契約、ESM語法、Worker原bytes／生成檔 |
| 最終build | npm run build | exit0；10preview資產逐byte複製至owned dist |
| 持久Windows環境 | guard任務前／final gates前／後 | 全PASS；HKCU/HKLM PATH hash/type/length/ephemeral0、TEMP/TMP及完整Environment-key snapshots相等 |

Node UI contract只算自動層：測固定Blob source／真正File request形狀、fake deadline／stale accessor／error／timer／cleanup、busy十次、unsupported environment、clipboard rejection／fallback／遲到race、65bytes serialization／URL reentrancy、DOM wiring兩語／pageshow／focus及tool validator。不能借此宣稱真picker／原生落盤／60秒／BFCache／Network PASS。Scaffold validator預設仍要求原7個disabled控制項；只有明確`mode:'tool'`才驗新8項互動初始狀態／readonly result／ARIA引用／不截長expected。原HTML、raw HTTP、junction／hardlink／stale dist／Worker原bytes負例未刪或弱化。

瀏覽器專用fixture均為fake bytes。private harness在 `.runs/.../browser/public/`，8個JS/CSS資產與最終public逐byte相同，HTML僅把app入口換成probe；probe呼叫原app並觀察／委派真正NativeWorker和ObjectURL，不替代File讀取／WebCrypto／Worker source。合成File選取及harness的controller取消／換檔呼叫明確不是native-picker／產品取消按鈕PASS；產品計算、expected、copy、clear與keyboard以實際DOM操作。private harness不納入source／dist發佈。

Edge實際fullVersionList：Microsoft Edge **154.0.4258.62**，Chromium154.0.8037.98；UA為Windows10Win64/Edg154。browser API的23項PASS及每次真stage/done／資源count在 `browser/edge-observations-final.json`：

- 真Worker：empty、abc、abc+LF、binary `[00,ff,80,0d,0a,ef,bb,bf]` 得規格固定literal；upper＋ASCII trim相符、64zero不符、257與NBSP格式拒絕仍保留舊hash。
- 即時取消及native hashing stage取消、A→B／latest result、busy start十次只建一Worker、clear active；trace最大active1，終態0 Worker／0 Blob URL。+1僅合成size metadata先拒絕SIZE_LIMIT，不配置／讀取大檔。
- native copy在兩語均得精確64個小寫字元無LF；英文Tab→Calculate、Enter計算／copy／clear可用，clear清空expected/hash並聚焦file。actual forward navigation新英文document為idle，不藉此推論舊頁資源或BFCache。
- 兩語實際CSS innerWidth320、document/clientWidth均308，所有可見控制項在範圍內且>=44px，展開完整安全長檔名可換行無水平溢出。viewport API請求400×1125得到CSS320×900，未推測實際browser zoom比例，override已reset。可信畫面用`edge-zh-css320-result-viewport.jpg`／`edge-en-css320-result-viewport.jpg`／`edge-en-css320-expanded-filename.jpg`；初始`edge-zh-320-match.jpg`其實為256CSS probe，fullPage override截圖被裁切，不當320證據。

| 必要補驗 | 真實限制／保留狀態 |
|---|---|
| Chrome主要流程 | NOT_RUN：正式browser API建立Chrome回報不可用；inventory只提供Edge／IAB／MCP Apps，未換原生Computer Use或開旁路 |
| Edge native picker | NOT_RUN：正式filechooser取得single chooser，但setFiles被既有extension file URL權限拒絕；沒有擴權或改用另一通道繞過。合成File真Worker另列PASS |
| 真TXT落盤／檔名／65bytes | NOT_RUN：原生download點擊顯示download-requested且URL回收，waitForEvent('download') 10000ms無事件／沒有path，不能稱實體檔案成功。65bytes只已有Node契約PASS |
| 真200%browser zoom | NOT_RUN：API只advertise viewport，沒有zoom能力；CSS／窄viewport不代替 |
| 舊document pagehide資源 | NOT_RUN：真forward navigation後dev.logs沒有上一頁T02_PAGEHIDE記錄，不能觀測舊Worker／URL／引用終態；Node pagehide契約PASS另列 |
| native copy拒絕／fallback | NOT_RUN：當前原生copy成功，未修改權限或把stub當native拒絕；Node拒絕／選取fallback及race PASS |
| T02 H11／H12真檔邊界 | 已授權且必要／NOT_RUN：134,217,728-byte真檔計算及實際134,217,729-byte拒絕；R1正式picker預檢仍缺既有file URL權限。沒有用合成size metadata替代，也不是T03未授權 |
| T03完整觀測 | 未授權／NOT_RUN：Network／Storage／Offline、延伸memory／資源量測、真60秒deadline、完整hidden／BFCache回復等，不先跑或用CSP／resource timing冒充；不含上述已授權T02 H11／H12 |

同一證據資料夾還保留probe-v1/v2、readonlyfixture、environment-before/pre-final/after、初始source manifest、focused初始FAIL／最終PASS與full logs。最終只改交接metadata，不更動通過gate的runtime。source/runtime/build固定manifest與scope-proof供主代理核對；owner釋放後不再寫runtime/tests。App Goal實際blocked、正式T02續作已記錄；客觀產品仍未完成，T03未放行。

Source repo/publicity/remote commit/ZIP、production/Cloudflare/hash.glossquote.com／首頁／外驗：NOT_RUN，沒有公開／部署部分候選。保留原dev session57134/PID59188（不宣稱仍存活）與本輪task-owned probe session43264/PID58640，URL`http://127.0.0.1:5195/`；沒有停止現有程序或其他產品tabs。主代理下一步唯讀親驗固定runtime與23項真瀏覽器證據，補齊或明確處置NOT_RUN後才實際放行下一里程碑。
