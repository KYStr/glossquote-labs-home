# 行李清單與重量試算交接

## 目前交付：PACK-M2-T01（2026-10-13）

M1 R1 已由主代理親自放行（.runs/handoff-release-2026-10-13/22-primary-m1/ACCEPTANCE.md），M2 正式產物與公開來源已交付，**待主代理 M2 驗收及 M3 部署整合**；不是 live release 或整體完成。

- PUBLIC repo：[KYStr/glossquote-labs-packing-list](https://github.com/KYStr/glossquote-labs-packing-list)，main 與 remote HEAD/API 都是 `02e9bc9a39ed12530e157806e49283455eb84632`，visibility PUBLIC 已驗。
- 固定 Git blob source ZIP：`.runs/github-publish/glossquote-labs-packing-list/m2-20261013-01/glossquote-labs-packing-list-02e9bc9a39ed12530e157806e49283455eb84632.zip`（孵化器根相對），91906 bytes，SHA256 `48474e34fb48825733c600cadb709b77ba21b98c7749ac9c488404ca9f4a2bca`。38個公開source檔/217106bytes，逐Gitblob/CRC/path/mode核對後解壓，六個必要gates重跑全exit0；沒有private手交紀錄、chatID、.runs、dist、downloads/cache/credentials。沒有自行選LICENSE。
- M2 evidence根：`../../.runs/github-publish/glossquote-labs-packing-list/m2-20261013-01/`。reviewed-copy 是獨立Git；zip-rebuild 是固定blob重建；reviewed-workspace 是含本地交接紀錄的私有快照，三者用途不同，後者不發布。
- 產物：dist-production/ 12檔61451bytes，manifest digest `9b070df077b19d759d558e406e759f5017b8412678856c54a67c7420621f6eec`，原workspace與ZIP重建逐檔相同。固定origin僅 https://packing.glossquote.com；canonical/hreflang/zh-Hant/en/x-default、OG、對應可見文字WebApplication JSON-LD、robots/sitemap、雙語首頁回鏈、兩語404與CSP/headers。_headers對.mjs精確路徑給MIME，不把missing404偽裝JS；404-page、html_handling none，無SPA或Worker程式。
- M1原7個public HTML/JS/CSS bytes全部保持R1主驗SHA，沒有core/app/state/i18n/styles修改。新增preview robots.txt（Disallow:/），共8個preview資產；HTML仍noindex，無production canonical。既有4202/PID82156未restart；其已載入的舊allowlist保留，新的robots可由fresh clone/dev服務提供。
- Node24.14.0/npm11.9.0：workspace及ZIP-rebuild各跑 npm test（68/68，原60+8release）、check、build、build:production、check:production、check:release，全exit0、無skip/fail。release負例包含origin、canonical/alternate、M1drift、stale/hardlink/junction、真正404/MIME、ZIP CRC/hash/symlink/traversal/device/populated目錄拒絕。
- owner真IAB：production輸出本機adapter 127.0.0.1:56669/PID2672，CSP下兩語功能運作、known1200g+unknown/limit1500不判within；實際原生下載再English FileChooser preview800g/1200g候選、confirm後unknown仍unknown；matching-language home href正確，缺頁畫面已看且兩語HTTP404。這是本機adapter，不是Cloudflare live證據。
- Wrangler配置send_metrics/logpush/dependency instrumentation/observability logs/traces均false，workers_dev/preview_urls關閉。CLI schema/dry-run **NOT_RUN**（沒有安裝新工具或讀token）；依當日官方文檔核對。實际Cloudflare HTTP/headers/404由主代理M3驗，不將本機adapter當平台證明。B09實際200%zoom、完整Network/Storage、實體mobile/keyboard/AT仍NOT_RUN；主代理Edge原生File permission未擴張，其NOT_RUN與owner IAB實測分別歸屬。
- Git publication嚴守新契約：只在reviewed-copy使用每命令git-c、已登入官方gh的credential helper。沒有auth setup-git/login/refresh/token、global/system config寫入或憑證讀取。兩次capture後verify均PASS_UNCHANGED，Windows完整Environment Snapshots前後也相同。
- code26檔146811bytes digest `5a49ff743bce7b9b64e7a14e2032b9d80122ffa63d5546a284462fe10346ae24`；preview8檔56613bytes digest `746a666dee00cf16e424be128e2b457ef3d536588f780ce95a8da69c116b08ba`；公開source-package digest `5706fc2e19f0ca30d8f73eb263f90f88ddc06da6c02968c7528238aca013b56a`。完整私有workspace source manifest見workspace-source-manifest，published固定source以Gitcommit/ZIP/blob manifest為準。
- Cloudflare部署、正式live URL、首頁更新、外驗：**NOT_RUN，主代理M3專有**。父級檔、其他工具、根Git、持久環境、憑證未改；原M1/R1所有進度與證據保留。完整goal未mark complete；模型請求仍gpt-6.1-sol/max，backend unconfirmed。

## 歷史交付：PACK-M1-R1（2026-10-13）

主代理指出的必要匯入錯誤優先序修正已完成，重新凍結，**待主代理 M1 複驗，尚未 M2 放行**。歷史 T00 source/digests/證據保留，不以本輪結果回寫歷史測試。

- 實作只改 public/js/core/packing-list.mjs：recordShape 通過後按 id → name → quantity → unitWeightGrams → packed；重複 ID 在 ID 驗證位置拒絕，名稱的型別/控制碼/長度與後續值錯誤不搶先。root schema、row shape、缺欄/未知欄位及 rows index 優先權保留。沒有修改規格或降低 gate。
- 新增 test/import-export.test.mjs 三項回歸，覆蓋主驗兩個 item-1 的 literal repro、12 組 duplicate+later-invalid 組合、schema/缺欄/列次序、拒絕候選後原資料不變。原 repro-before=CONTROL_CHARACTER；repro-after=DUPLICATE_ID。
- Node v24.14.0/npm 11.9.0；最終 npm test **60/60**，npm run check、npm run build **exit 0**。原 A01–A40 和 toolchain 均通過。literal 命令、exit、版本及 log 保留於 R1 commands.json/final-*.log。
- 受影響匯入流程兩語真 Chromium FileChooser 已實測：duplicate+C0 顯示「物品識別碼重複」/「Item identifiers must be unique」，800 g 舊清單保持、confirm 不可用；duplicate+extra 欄位仍拒 UNKNOWN_FIELD。有效 900 g 備份 preview 不取代800 g、cancel保留、confirm完整取代並得到 row1/2、pieces2/3；再編輯變901 g會撤preview，重複ID失敗仍保留901 g。原始名稱未回顯，沒有 mock File API。
- 原 UI/CSS/app/i18n/state/工具鏈及其未受影響 M1 真瀏覽器證據重用；本輪沒有重做設計或擴大功能。B09實際200%zoom、B10完整Network/Storage、實體手機/虛擬鍵盤/螢幕閱讀器仍 **NOT_RUN**；沒有以 source scan 或mock提升結果。
- R1 Windows guard 前後均 PASS，全 Snapshots **PASS_UNCHANGED**；User/Machine PATH hash/type/length/entry count、全 Environment-key fingerprint、TEMP/TMP保護hash均不變。
- R1 evidence：`../../.runs/packing-list/m1-r1-20261013/`，含 before/after repro、三個合成 native fixture、AX/PNG、browser-observations、命令/log、diff及四份manifest；重新固定來源在 reviewed-source/ 並逐 bytes/hash比對。
- R1 code：17 files / 104005 bytes，digest `1e56d7257093fd9993ba88be6a0e435331645edf6198fe5e20cb08e28178a310`。runtime/dist：各7 files / 56587 bytes，digest `78db8ea2db30c6cca515459c47cdf88fc0f5bf20fb9120672760f5af6e0b8474`，逐檔相同。完整 source digest 見 R1 source-manifest.json（含本輪狀態更新）。
- preview PID82156 / 127.0.0.1:4202 保留，未啟停其他服務。父级檔案、主驗證據、根Git、部署、憑證與持久環境均未修改。DISPATCH保持、設定請求gpt-6.1-sol/max，backend **unconfirmed**。
- 完整目標尚未完成；get_goal 仍回傳先前 blocked，工具沒有resume capability，本輪完成已正式派回的M1修正，沒有虛報Goal complete或M2放行。主代理複驗後須回原功能對話正式放行M2或必要修正。

## 歷史 T00 固定交付

2026-10-13 / TASK-W22-M1-T00：**M1 本機雙語 MVP 已凍結，待主代理獨立驗收。** 尚未 M2 放行、公開來源或部署；完整功能目標仍為 active，不因本機完成標 complete。

- 原功能對話：01a133ab-fe72-73f2-9590-7a99a9d8658a（local）；主對話 01a0c75e-24c2-76e1-8c70-536ae1ad1fbf。
- DISPATCH.json 已保留。設定請求 gpt-6.1-sol / max，create_thread 接受該設定；backend identity **unconfirmed**，沒有由自述推導路由。
- 預覽：[繁中](http://127.0.0.1:4202/index.html)、[English](http://127.0.0.1:4202/en/index.html)，PID **82156**，bind 127.0.0.1；requested/assigned port **4202/4202**，保持可用供主驗。
- 證據：`../../.runs/packing-list/m1-2026-10-13-0113a/`；固定副本 `reviewed-source/`；全部原始輸入為合成 fixture。

## 交付範圍

新增 private Node24 ESM scaffold、7 個 public 靜態資產、5 個 scripts 與 3 個離線測試檔。UI 是空清單起始，桌面工作列、手機直排；繁中與英文是獨立 HTML。

完整 draft 先 exact schema/descriptor/array/name/integer 驗證；首個錯誤即撤下摘要且停用備份，不部分計算。0 g 與空白 null 分開；最壞加總 989990100 g 使用安全整數。未知重量不稱總重、不宣稱未超限；已知小計 1200 g 配未知列，在 limit 1500 g 時無法判定，在 1000 g 時只能至少超過 200 g。

所有名稱透過 value/textContent 呈現。未使用 maxlength，33-unit 數值完整進 draft 並可見報錯。匯入本機 File API/fatal UTF-8/128 KiB/schema v1，先預覽再確認；revision/request ID 在編輯、刪除、上限、選檔、取消與 pagehide 時失效。下載固定 filename，60 秒後撤銷 object URL，pagehide 提前清引用/撤銷；BFCache 返回重新初始化空清單。

修改僅 M1 allowlist：public/**、scripts/{serve,check,build,validation,manifest}.mjs、test/*.test.mjs、package.json、.gitignore、dist/**，以及 HANDOFF/project.json/START-HERE/docs/RELEASE-CANDIDATE，TASK-ENTRY append-only。父 STATUS/THREADS/首頁、DISPATCH、其它工具、憑證、root Git 均未修改。

## 驗證

Node **v24.14.0**，npm **11.9.0**。以下在本工具目錄以 C:/Program Files/nodejs/npm.cmd 執行，literal 命令、exit 與完整輸出見 commands.json / final-*.log。

| 命令或 gate | 結果 |
|---|---|
| npm test | PASS / exit 0，57 tests，0 fail/skip；覆蓋 A01–A40 |
| npm run check | PASS / exit 0，語系/HTML/引用/ESM/套件契約 |
| npm run build | PASS / exit 0，只複製 7 allowlisted assets |
| toolchain | PASS：GET/HEAD、loopback、路徑/隱藏/未知 MIME、host 拒絕、port fallback；stale sentinel/hardlink/junction 不改外部資料 |
| B01–B08、B11 | PASS：兩語真瀏覽器；原生下載與本機選檔、preview/cancel/confirm/stale、鍵盤、320 CSS px、刷新警告與空清單 |
| A16/A37/A30/A34 真 DOM 補充 | PASS：名稱字面文字、無生成 img/script；非法備份不回顯合成 canary 且保持800 g；source edit 撤預覽 |
| Windows environment | PASS_UNCHANGED，完整前後 Snapshots 逐一相同 |

真瀏覽器為 Codex In-app Browser 的實際 Chromium 分頁，使用已支援的 DOM/鍵盤/viewport/download/filechooser API，沒有用 Node File mocks 替代原生 B06。下載實際產生於瀏覽器 Downloads；合成內容副本保存於 evidence，不混入 public/dist。B08 requested width=320，window.innerWidth=320，client/scrollWidth=305（15px scrollbar），沒有頁面水平溢出。視覺兩輪檢查桌面/手機/英文較長欄位，僅修正舊 status 提示與英文單複數；受影響狀態再實測。

完整 Network/Storage、實際 200% browser zoom **NOT_RUN**（工具無該能力）；實體手機、虛擬鍵盤、螢幕閱讀器 **NOT_RUN**。Source scan、320 viewport 與離線 mock cleanup 均未冒稱這些項目通過。

## 固定版本與下一步

- code manifest：17 files / 101011 bytes；digest `387d84fb93cad85fa09f6ff35c3a6c0e9de8516acfc19ed5250fe68fa18ab286`。
- runtime/dist：各 7 files / 56553 bytes，逐檔相同；digest `dbad9efa4638a8f75514773a1803f86d22ac119129fadcc9d313c3b6976334c6`。
- source 全檔 bytes/hash：見 source-manifest.json；來源副本按 manifest 原始 bytes 核對，包含未修改規格與 DISPATCH。沒有 Git commit，沒有 production ZIP（均 M2 工作）。
- Windows User PATH：ExpandString，length 834，ephemeral 0；Machine：String，length 1227，ephemeral 0。PATH hashes 及完整 Environment-key fingerprints 見 environment-before/after/comparison.json，全部不變。
- GitHub KYStr/glossquote-labs-packing-list：**NOT_RUN / 未發布**；Cloudflare packing.glossquote.com、雙語首頁：**NOT_RUN / 未部署**；外部驗收 **NOT_RUN**。

主代理須獨立檢查固定副本、真瀏覽器及必要 gates，正式 M1 放行後才可派回本對話 M2。功能對話不自行跨 gate、不部署或更新首頁。問題頻率仍為產品假設；清單不作航空許可判斷。

<!-- primary-handoff-release-2026-10-13 -->
## 2026-10-13 主代理正式發布與驗收

最新固定來源：https://github.com/KYStr/glossquote-labs-packing-list/commit/02e9bc9a39ed12530e157806e49283455eb84632（PUBLIC獨立核實）。主代理由固定ZIP逐Git blob核对，再跑68測試及test / check / build / build:production / check:production / check:release全通過。34項正式HTTP回應及11資產核對通過；Cloudflare version 4f9b86d7-a605-4a77-9885-0aed76ea73b7。

正式站：[繁中](https://packing.glossquote.com/index.html) / [English](https://packing.glossquote.com/en/index.html)；雙語首頁已實際列出本工具。原對話修正重複ID的錯誤優先順序；主驗回歸及未知重量不當零、超重比較。

狀態：**主驗通過，等待外部驗收**。保留原紀錄中的人工NOT_RUN；本輪更精確的瀏覽器範圍見批次驗收包，24正式英文頁Edge封鎖未繞過。沒有把發布前固定文件的NOT_RUN視為最新狀態，也沒有將自動或HTTP測試冒稱真裝置/AT/完整Network與Storage測試。

主證據：`.runs/handoff-release-2026-10-13/`；工作區狀態註記不是固定公開commit內的檔案。
<!-- primary-handoff-release-2026-10-13-end -->

<!-- external-followup-accepted-2026-10-16 -->
## 2026-10-16 主代理採納外部複驗

固定版本 `02e9bc9a39ed12530e157806e49283455eb84632` 標記 **外部測試通過（本輪核心與雙語離線受測範圍）**：68項原測試、1,000組對照、6項雙語離線核心操作。這些是外部實跑結果；主代理已核對版本、回報及封裝完整性，未在本輪重跑整套。 本工具F01草稿測試資料修正已外部重驗結案；產品schema與備份name未改。

完整正式站Network／Storage、原生操作與真機等仍待驗；NEL停用的提供者紀錄比對一致，不代表既有瀏覽器policy／queue全部清除。沒有新增確認產品缺陷，無需產品返工或重發。詳[最新外驗總表](../EXTERNAL-FOLLOWUP-2026-10-16.md)。本註記不改公開固定commit；下方／上方較早等待外驗狀態保留為歷史。
<!-- external-followup-accepted-2026-10-16-end -->
