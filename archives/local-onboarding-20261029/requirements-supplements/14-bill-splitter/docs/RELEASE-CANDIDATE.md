# 分帳與墊款結算發布候選

最新狀態：**U14 v2 READY_FOR_INTEGRATION：current文件／公開來源與固定ZIP已交付；新版待primary正式整合及外驗**（2026-10-13）。新版快速、進階均由每人已付自動加總，always settlement；只有進階可按份數，不手填total或啟用墊款。package 1.1.0，沒有runtime/dev npm dependencies。只交來源，不把舊版部署或外部通過套用到U14。

## U14固定公開來源及ZIP

- Repository：[KYStr/glossquote-labs-bill-splitter](https://github.com/KYStr/glossquote-labs-bill-splitter)，visibility **PUBLIC**，default branch **main**。
- local HEAD、origin/main、ls-remote及GitHub commit API一致：`c82e8a182b36cf9568e28d9179a923e0fdaf7a4b`；固定tree `65d6824f726203f821641ec224fa8ec39313b1af`，recursive tree完整未截斷。
- 40個reviewed allowlist source＋source-manifest.json＝41 Git blobs，全部mode100644；不含其他工具、內部派工／交接、dist、node_modules、證據或憑證。未操作根repo/index/branch，既有main正常快進，未force或改持久Git設定。
- source-manifest本身SHA256：`0bbfeda1f423692f3bd04ccce9d15febb1fa667ae03c77ca7ee33f87fa836fcb`；其sourceFiles記40 source的bytes/SHA256，selfExcluded避免循環，productionAssets記14正式資產。
- 固定[來源ZIP](../../../.runs/bill-outcome-2026-10-12/docs-source-20261013-1adeaf0dc60d4890949b7e3133ba0a85/glossquote-labs-bill-splitter-c82e8a182b36cf9568e28d9179a923e0fdaf7a4b.zip)：89,613bytes，SHA256 `64b1153ce82544a517db16eb0fa7d17b10962dc5b7aec8de0af05e3ce3a77543`。

ZIP絕對路徑：`C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs/.runs/bill-outcome-2026-10-12/docs-source-20261013-1adeaf0dc60d4890949b7e3133ba0a85/glossquote-labs-bill-splitter-c82e8a182b36cf9568e28d9179a923e0fdaf7a4b.zip`。

單次 `git -c core.autocrlf=false -c core.attributesfile=NUL archive --format=zip --output=<固定ZIP> c82e8a182b36cf9568e28d9179a923e0fdaf7a4b` 使用固定Git bytes。先驗entry allowlist／重複／有界解壓目標，再真實解壓至本輪證據根的extracted-source。41/41逐byte等於固定GitHub tree的Git blobs及reviewed copy，另核對SHA1 object identity、40 source SHA256/bytes與manifest。最後工作區40 source也全部未變；生成source-manifest已同步本工具。

## U14實際驗證與證據責任

Node v24.14.0。在reviewed copy與真ZIP解壓副本各執行下列package script對應完整node命令，全部exit0：

| 對應script | 實際命令 | 結果 |
| --- | --- | --- |
| check | node scripts/check.mjs | 12 public source assets |
| build | node scripts/build.mjs | 14 preview assets，noindex |
| build:production | node scripts/build.mjs --production | 14 production assets |
| check:production | node scripts/check.mjs --production | 精確dist／SEO／headers |

copy另執行publish-manifest exit0（40 source／14 production），40 source bytes核對及staged index41 blobs核對exit0，commit／push／fetch與remote API exit0；ZIP41檔完整核對exit0，解壓14個production assets精確符合公開manifest。解壓production-manifest JSON本身SHA256 `773260fc14574103bc0b886d00155a427233f475a09044f6a6e150ae502a4f62`，不混稱ZIP或source-manifest hash。

29/29程式／tests／scripts／設定bytes及SHA256匹配primary固定code-candidate-sources.json，**未重跑未變product tests**，沿用 [主代理固定程式驗證](../PRIMARY-REVIEW-2026-10-12-U14.md)：31/31、check／兩種build／production check、8固定例＋5000份數不變量＋5000平均/快速比較＋19邊界、14雙語報告語意、兩語有界Chrome流程與320px、英文進階原生clipboard及512byte實體TXT逐byte證據。製作focused14、初始full30+1 Windows EPERM及修fixture後scaffold3另記 [TEST-RESULTS](TEST-RESULTS.md)，不虛稱同次完整通過。

本輪證據根：`C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs/.runs/bill-outcome-2026-10-12/docs-source-20261013-1adeaf0dc60d4890949b7e3133ba0a85/`。

- fixed-code-match.json、source-before.json、copy-integrity.json、index-integrity.json、copy命令logs、commit.log及push.log。
- remote-repository.json、remote-head.txt、remote-fetch.log、remote-commit-tree.json、remote-tree-by-tree.json。
- archive-entry-integrity.json、source-zip-hash.json、archive-verification.log、archive-integrity.json。
- extracted命令logs、preview／production manifest、extracted-build-integrity.json、workspace-final-integrity.json。
- environment-before／after／comparison.json：HKCU/HKLM完整Environment snapshots前後一致。User ExpandString/834、Machine String/1227、ephemeral皆0；PATH hash/type/length、TEMP/TMP及full Environment fingerprints未變。

## U14尚待primary正式整合／新版外驗

本輪新版 **NOT_DEPLOYED／HOMEPAGE_NOT_UPDATED／EXTERNAL_REVIEW_NOT_RUN**。既有正式站仍對應 `88f2036a619a98398cd2f72ccd7adebe49dda18a`；該舊版已外部通過，但不能作為新版完成證據。新版候選 [繁中](https://split.glossquote.com/index.html)／[English](https://split.glossquote.com/en/index.html) 由primary部署後才能交新版外驗。

人工／設備缺口維持NOT_RUN：真200%縮放、AT／讀屏、真實行動裝置、完整Network request/payload及Storage、hidden-return、真clipboard denial及late promise、完整browser matrix與未列的人工邊界。primary已列的兩語320px與英文进階clipboard／TXT證據只覆蓋該有界案例，不擴成完整矩陣。

owner已釋放，由primary核對固定source／ZIP後序列進行正式免費部署、雙語首頁同語文案整合、live驗收及新版外验包。這不是缺使用者重複授權。本輪未讀token或stored secrets、未操作Cloudflare／首頁／其他工具、未關既有server／jobs、未改受保護系統設定；請求Sol/max維持、backend未確認，未自行pause/complete Goal或標新版產品完成。

## 2026-10-12正式整合與T05原候選（歷史）

以下保留原版本的當時狀態與證據，不是U14部署／外驗通過。當時：**已上線，待外部複驗**（2026-10-12）。primary已正式部署 [繁中](https://split.glossquote.com/index.html)／[English](https://split.glossquote.com/en/index.html) 並整合雙語首頁；當時尚未獲外部確認，不標版本完成。固定產品／部署source `88f2036a619a98398cd2f72ccd7adebe49dda18a`、bill Cloudflare version `5bc6e600-59b4-4f71-884c-fe95e27025da`；首頁source `ea515ef03fc4bf5679505ecb910ee7cd0a02dcd7`／Cloudflare `a3a5886b-331f-4071-8aef-b8e1820328d4`。

primary本輪38項bill及25項home HTTP、兩語真Chrome主要流程與首頁往返PASS，14個bill正式資產及原ZIP完整性核對PASS；既有製作測試與primary Chrome/Edge原生下載證據沿用，未冒稱本輪重新執行。最新證據、來源／ZIP固定值及仍NOT_RUN矩陣見 [HANDOFF正式交接](../HANDOFF.md)。完整Network/Storage/hidden-return、320px/200%、full keyboard/AT、真clipboard denial/late promise仍NOT_RUN。

以下保留T05原候選證據與當時未部署狀態，READY_FOR_INTEGRATION是歷史階段；不把歷史未驗事後改成原owner已驗。README／TEST-RESULTS與manifest維持固定公開source bytes，本小任務不push新docs commit。

## 固定公開來源

- Repository：https://github.com/KYStr/glossquote-labs-bill-splitter
- Owner/name：KYStr/glossquote-labs-bill-splitter；visibility **PUBLIC**；default branch **main**。
- Remote HEAD、origin/main、local HEAD一致：`88f2036a619a98398cd2f72ccd7adebe49dda18a`。
- Fixed tree：`9f4d4b39ba3afe12477b9943939fb6a7258681ef`。
- 39項核准source檔＋source-manifest.json共40個Git blobs；不含dist/node_modules/.runs/內部派工與交接文件/其他工具/憑證。
- source-manifest.json記每檔bytes/SHA256及14個production資產hash；其本身不列入自己的source hash，避免循環。ZIP核對仍包含它。

## 固定 ZIP 與真解壓核對

ZIP絕對路徑：

`C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs/.runs/bill-splitter/t05-20261012-ea30a90bdb184f7793ce5d3a48db591a/glossquote-labs-bill-splitter-88f2036a619a98398cd2f72ccd7adebe49dda18a.zip`

SHA256：`d99215462bf9981439edd73f410f2381eaedc25bf05c4164de3273cb81bb134f`。

使用单次 `git -c core.autocrlf=false -c core.attributesfile=NUL archive --format=zip --output=<固定路徑> 88f2036a619a98398cd2f72ccd7adebe49dda18a`，未更動持久Git設定。先驗ZIP entry allowlist/重複/有界解壓目標，再真實解壓；40檔逐byte對GitHub固定tree的Git blob核對，並核對SHA1 object identity、SHA256/source manifest、reviewed副本及工作區39source原始bytes。

解壓副本：上述證據資料夾的 `extracted-source/`。從該副本實際建置，14個production資產hash精確等於公開source-manifest。

Production manifest檔案SHA256（JSON檔bytes）：`1beabad7c0f82df21fcd436258614d1c0bf2a922498dc163d8840e4b9334b523`。這是manifest檔hash，不把它混稱ZIP或某個網站資產hash。

第一輪驗證曾exit1：GET trees使用commit作識別時API回傳的sha是commit識別，不能直接當tree SHA。取得該固定commit的tree SHA後改用tree識別查詢，未改來源/ZIP/門檻；v2逐檔核對exit0。原失敗log及API回覆保留，沒有隱藏FAIL。

## 實際命令與證據

Node v24.14.0；零runtime/dev npm dependencies。reviewed copy：`.runs/github-publish/glossquote-labs-bill-splitter/`，根孵化器Git/index/branch未操作。

| 在reviewed copy及實際ZIP解壓副本各執行 | 結果 |
|---|---|
| npm run check | exit0；12個public source assets |
| npm run build | exit0；14個preview assets，noindex |
| npm run build:production | exit0；14個production assets |
| npm run check:production | exit0；精確dist內容、SEO與headers |

另在copy執行 `node scripts/publish-manifest.mjs` exit0、39source/14production assets；index verifier exit0（40blob原始bytes等於reviewed檔）、Git commit/gh public create-push/remote fetch/API各exit0、ZIP v2 verifier exit0（40/40）、解壓production integrity exit0（14/14）。未為T05重跑未變核心/UI；沿用製作測試及primary独立結果。

本輪證據根：`.runs/bill-splitter/t05-20261012-ea30a90bdb184f7793ce5d3a48db591a/`。

- copy-*.log、copy-integrity.json、source-before.json、index-integrity.json。
- remote-repository.json、remote-head.txt、remote-fetch.log、remote-commit-tree.json、remote-tree-by-tree.json。
- source-zip-hash.json、archive-verification.log（首輪FAIL）、archive-verification-v2.log、archive-integrity.json。
- extracted-*.log、extracted-preview-manifest.json、extracted-production-manifest.json、extracted-build-integrity.json。
- workspace-final-integrity.json：39source未變；environment-before/after/comparison.json：完整persistent fingerprints一致。

Windows guard User ExpandString/834、Machine String/1227、ephemeral皆0；PATH SHA、registry type/length與full Environment fingerprint前後一致。未讀token、未改User/Machine環境或其他受保護系統設定。

## 測試責任及待驗

製作證據：T00/T01/T02/T04時點全套20/20，含400組core不變量；GROUP-ERROR/harness修正後focused controller3+ui1=4/4、exit0。詳見 [TEST-RESULTS](TEST-RESULTS.md)。這些不同時點及層级不合併虛稱整套最新瀏覽器PASS。

Primary證據（獨立於製作測試）：scaffold3/3、core12/12及獨立7,905配額情境；wave03 controller3+ui1=4/4、T04固定snapshot release2/2及production check；Chrome中文/Edge英文群組焦點與aria恢復親驗；兩語原生下載537/526bytes逐byte符合可見報告、UTF8無BOM/LF/末尾單LF。public bytes未變，沿用可信結果。

仍 **NOT_RUN** / 主對話需補：完整Network request/payload與Storage（local/session/IDB/cache/注入）、hidden-return真實觀察、320px/200%真reflow、完整鍵盤流程、AT讀出；真clipboard拒絕及晚到race仍以adapter證據為主，未假稱真人工PASS。Edge完整2/50人上下限及其他表列只N案例的B證據按TEST-RESULTS保持缺口。沒有已知未處理必要核心/安全FAIL，不把人工未驗默默改成通過。

## T05候選交出時的整合分工（歷史狀態，正式更新見開頭）

- Hosting：**NOT_DEPLOYED**；未執行Wrangler dry-run/deploy，尚無部署commit或Cloudflare version。
- 雙語候選：https://split.glossquote.com/index.html、https://split.glossquote.com/en/index.html。
- 主對話負責必要獨立驗收、已審查隔離Wrangler/schema/loader、免費正式部署及實際200/strict404/MIME/SEO/headers/主要操作/Network觀察，再整合及驗證雙語homepage。
- Homepage：**NOT_INTEGRATED**；本對話未修改00-home/catalog或DNS/Cloudflare。
- 外部驗收：**NOT_RUN**；正式上線及主驗後才交外部review，該版本確認後才完成。
- 這不是缺使用者來源公開/免費hosting授權；已授權工作只是按owner分工等待整合。

Owner已停止修改/釋放檔案。本對話後續收到具體缺陷時回原owning task修正、受影響驗證及更新public source，保留固定commit及證據。模型請求Sol/max未變，backend未獨立確認。本輪未呼叫update_goal、不自行pause/complete既有Goal。

參考 [發布規範](RELEASE.md)及 [完整交接歷史](../HANDOFF.md)。
