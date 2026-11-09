# 訂閱費用盤點任務證據（append-only）

## W16-27-M0 — 2026-10-16
目標：自包含規格與可重現驗收案例，實作交新原功能對話。
requested model gpt-6.1-sol/max；實際對話尚未建立，backend identity 未確認。
M1 本機、M2 GitHub、M3 hosting/首頁、外部驗收均 NOT_RUN。
原有其他工具、Windows/Git 設定與使用者變更均不可動。

後續每次追加 task ID、owner、allowed paths、實際檔案、命令/exit、測試/瀏覽器/guards/evidence，明列未驗項目。

## W16-27-M1 — 2026-10-16

Owner：本原功能對話 01a141f4-bd7c-7c13-8a10-4b03d0dacc31 / local；requested gpt-6.1-sol/max 已由 create_thread 接受，backend identity 未獨立確認。未委派或另開對話。

範圍：本機完整雙語 MVP、核心/工具鏈/app 測試、真 CUA 驗證與候選凍結。allowed paths 為本工具 package.json/.gitignore/public/**/scripts/*.mjs/test/**/dist/** 及 HANDOFF、START-HERE、project.json、docs/RELEASE-CANDIDATE；本 TASK-ENTRY 只追加。證據只在根 .runs/subscription-budget/w16-27-m1-20261016-01a141f4/。實際檔案與內容逐項見 HANDOFF，未改其他工具/首頁/外部包。主代理同日釐清 TECHNICAL/A23 名稱 raw 控制字先於 trim；本對話只同步程式與測試。

最終精確命令（cwd 本工具，完整 executable C:/Program Files/nodejs/npm.cmd）：`& 'C:/Program Files/nodejs/npm.cmd' test` exit 0 / 45 PASS（31 core、11 app、3 toolchain），`& 'C:/Program Files/nodejs/npm.cmd' run check` exit 0 / 8 assets、7 syntax、current build，`& 'C:/Program Files/nodejs/npm.cmd' run build` exit 0 / 8 preview assets。穩定程式各跑一次，logs 為 final-npm-{test,check,build}.log；開發失敗與針對性重驗亦保留，精確參數/exit 見 HANDOFF。

主代理提前發現下載 URL 可能被編輯/下一次下載提早撤銷，已改成各自 30秒 timer、最多8個、雙語暫停提示、pagehide全清；實際 app harness 的 A→編輯/新結果→B、deadline、上限及舊timer通過。320px 初測 English link 43.90625px，補 min-width 後真實測得44px，失敗與最終PASS證據都保留。

真 CUA：兩語 B01–03/B07–09 通過；A04 4800/400、2400/200、2400/200；兩語全鍵盤操作、原生 Clipboard API 手勢後讀回一致、真下載事件/檔案 bytes。320×800 兩語60列80字元名稱，zh另驗最大金額及12字元幣別，scrollWidth=clientWidth=305、無小於44px受測操作目標。完整 browser-evidence.json、原生假報告bytes、最終 screenshots 保留。

B13 title/FAQ<LOCAL_USER>/noindex 真測，noscript/初始disabled 靜態 gate 通過；真正停用 JS 瀏覽器場景因 CUA 無 scripting toggle **NOT_RUN**，未宣稱整個 B13 通過，待主代理補驗或明確處置缺能力。B10 真200%/設備/IME/AT/高對比，B11 真BFCache，B12 完整NetworkStorage，B14 真離線/Clipboard不存在，下載OS選單亦分項 NOT_RUN；mock不作原生證據。

環境：前後執行 `& "$env:USERPROFILE/.codex/check-persistent-environment.ps1"` shell exit 0，兩次PASS；environment-comparison.json unchanged=true，完整HKCU/HKLM snapshots（PATH hash/type/長度/ephemeral及Environment fingerprint、TEMP/TMP hashes）一致。未改persistent或Git/gh設定、未讀憑證。Git settings guard M1不適用，未進publication。

固定 source/implementation/dist manifests 在同 evidence 目錄，逐檔 bytes/SHA-256，manifest不含自身；以HANDOFF引用的檔案快照為候選。preview http://127.0.0.1:4207/index.html、/en/index.html，task-owned exec session19397保留。M1 awaiting-primary-acceptance；M2/GitHub、M3/hosting/home、外部驗收 NOT_RUN。候選凍結，等待主驗，未越級公開/部署。

## W16-27-M2 — 2026-10-16

主代理明確 GO；M1獨立45/45、check/build、250算例與瀏覽器通過。使用者允許保留工具能力不足人工NOT_RUN，包含B13真JS停用，不再申請。Owner仍本原對話；不委派或另開chat。allowed paths限27 production scripts/config/tests、package/.gitignore、README與現有狀態/發布文件，dist-production及根 .runs/subscription-budget/w16-27-m2-20261016-01a141f4/ 內的reviewed copy、ZIP與證據；不動root<LOCAL_USER>

新增wrangler.jsonc、production/build-production/check-production/serve-production/release-check scripts、production.test；validation只泛化明確白名單，預設preview保持8項。public所有8檔M1 SHA不變，core/app/i18n/CSS/兩語原文凍結。production共10個資產、雙語canonical/hreflang/x-default/OG/JSON-LD與精確兩語CSP hash、index/follow/robots/sitemap/404、安全headers；preview仍noindex。closed config只靜態資產及固定host，主代理assertConfig實跑PASS。

最終官方npm.cmd（cwd本工具）：test 50/50 exit0、run check exit0、run build exit0、run build:production exit0、run check:production exit0、run release:check exit0。workspace-gates.json及final-*.log記錄完整結果。實際127.0.0.1:5207 session15952保留，HTTP檢查與CUA雙語主流程、head SEO、原生TXT bytes均已驗。Clipboard兩次觀測一false一true完整保留，不猜原因、不改功能。其餘人工NOT_RUN界線沿用主驗，詳HANDOFF。

公開來源即將以獨立reviewed copy、44項source白名單、每命令git -c、Git設定guard、固定HEAD ZIP與乾淨archive gates執行；此append是publication前候選。完成後再追加實際repo visibility/commit/ZIP/guards，未發生前不寫PASS。Windows前guard已PASS，末次完整指紋比對待發布區塊結束；不修改persistent或認證設定。

### W16-27-M2 發布後追加 — 2026-10-16

原對話M2交付完成、awaiting-primary-m2-acceptance。PUBLIC repo https://github.com/KYStr/glossquote-labs-subscription-budget，default branch codex/m2-production，Git remote與GitHub API皆完整commit `bc211486ade235366b5dc2b42f1297090ceacad9`，publishing-copy clean。

HEAD ZIP絕對路徑 `<LOCAL_WORKSPACE>/.runs/subscription-budget/w16-27-m2-20261016-01a141f4/glossquote-labs-subscription-budget-bc211486ade235366b5dc2b42f1297090ceacad9.zip`；104415 bytes，SHA256 `fa53bcb77728f0b8c144f798a1ef448c4025b4dff86d089b799b51618a636370`，44檔不含7目錄項目。所有Git blobs/ZIP解壓/reviewed copy逐檔bytes相同。reviewed copy及archive-check皆在同M2 evidence子目錄。

乾淨archive-check用官方npm.cmd test 50/50 exit0，run check/build/build:production/check:production/release:check各exit0；8 preview/10 production產物與固定manifest一致。workspace同6命令已各PASS，不因publication後狀態文字補記重跑程式gate。production index8904 bytes SHA7c930293aa2077c4d406113a7d15923d7cb3fd5d4e427197e5d70b9d403812d4；en/index9404 bytes SHAb420e659d75a3f4133d06bffcebe92fd49e3dcd662671be262f03c5b1349f9da；其他逐檔見production-manifest.json。

Git source add第一次因NUL excludefile被Git拒絕exit1，保留local-git.log；guard立即verify PASS，改task-owned空白檔的每命令-c後完成，沒有全域寫入。後續commit/archive/push/remote/API/visibility驗證全部exit0。Gitguard發布前capture、失敗後/發布後verify都exit0/PASS。Windowsguard前後shell exit0/PASS，HKCU/HKLM PATH hash/type/length/ephemeral、完整Environment fingerprints與TEMP/TMP hashes不變；詳environment-comparison.json，沒有漂移或恢復操作。

本次publication後僅工作區5狀態檔補記（HANDOFF/START-HERE/TASK-ENTRY/project.json/docs/RELEASE-CANDIDATE），不改fixed commit/ZIP；workspace-status-diff.json記錄。M2-RESULT.json總結固定識別與所有證據。核心/app及八個M1 public bytes未變。保持preview19397、production-model15952，停等主驗，不做Cloudflare/首頁/下一功能；全部授權人工NOT_RUN仍保留，外部未驗。
