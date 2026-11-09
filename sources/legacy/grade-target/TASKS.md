# 里程碑任務：成績目標試算

狀態：M0 六份規格已完成，待主代理審查；沒有實作、測試、公開來源或部署。本表定義後續 gate，不表示已執行。一次只推進一個 milestone；保留每個 gate 的實際命令、exit code、必要證據與 NOT_RUN 原因。任務契約見 [AGENTS.md](AGENTS.md)、[TASK-ENTRY.md](TASK-ENTRY.md)，工程命令見 [docs/ENGINEERING.md](docs/ENGINEERING.md)，發布順序見 [docs/RELEASE.md](docs/RELEASE.md) 與 [docs/GIT-PUBLICATION-SAFETY.md](docs/GIT-PUBLICATION-SAFETY.md)。

## M0 — 自包含規格

- [x] 定義問題、假設、非目標、產品介面與雙語 SEO。
- [x] 定義精確 schema、BigInt 整數算式、錯誤契約、報告契約、安全與生命週期。
- [x] 列出可重現的固定核心及瀏覽器 oracle、M1–M3 gate。
- [ ] 主代理審查六份產品規格並明確放行原功能對話。
- [ ] 原功能對話建立前，將這六份文件與既存共用文件按完整順序作為唯一規格；requested model 為 gpt-6.1-sol/max，不能自述代替 backend identity 證據。

M0 允許路徑僅限 README.md、PRODUCT.md、TECHNICAL.md、UX-SEO.md、ACCEPTANCE.md、TASKS.md。不得在 M0 建立產品程式、跑產品測試、開功能 chat、發布、部署或改共用檔。完成主審前，各項狀態保持未放行。

## M1 — 完整本機產品

M1 預覽為 127.0.0.1:4208，限本機、noindex/nofollow。Node.js 24+、ESM、built-ins；不安裝套件、不讀帳戶設定、不作產品網路或 storage。實作和測試只能在原功能對話進行，依任務範圍回報給主代理。

### T00 — 開始前防護與規格基線

- 重新確認主代理 M1 放行、無同路徑衝突，讀完本工具六規格與既存 docs。
- 記錄允許的程式/測試檔、工具版本、環境 guard 前後值和唯一 task evidence 目錄；遵循 [docs/ENGINEERING.md](docs/ENGINEERING.md) 的只讀環境守衛。此工具不呼叫 dotnet。
- 未完成前不安裝、執行建置或測試，也不啟動/結束既存服務。

### T01 — 精確核心與 hostile schema

- 實作 calculateTarget(request) 和純本機測試，依 [TECHNICAL.md](TECHNICAL.md) 的驗證順序、固定 error.field、BigInt 單位和狀態語義。
- 將 ACCEPTANCE C01–C31 與 C25a 轉成獨立手寫 expected；包含 getter 不執行、symbol、non-enumerable、extra key、hole、長度/格式/範圍/重複 ID、未突變和無 partial result。
- 使用主代理提供的 250 組獨立對照資料；固定 oracle 不從被測實作衍生。遇到差異先停止判定規格/核心，不用調整 oracle 使其通過。
- Gate：核心測試通過；精確邊界 C07/C09 均不得用 display 比較；JSON 結果序列化成功且無 BigInt/raw echo。

### T02 — 雙語空白 UI 與主要流程

- 建立繁中 /index.html 與英文 /en/index.html、原生響應式 UI、欄位錯誤和結果摘要。先遵守 UX-SEO 的操作及固定雙語字串。
- 初始 fieldset 及所有工作按鈕 disabled、所有 input 無 name；最先註冊的同步 submit capture listener 的第一個動作是 preventDefault。只有初始化和所有事件 listener 完整接妥後才 enable；失敗維持 disabled。
- 實測兩語空白初始態、C01 主流程、0 與空白、錯誤修正、已先達標、不可行和全部完成狀態。範例須明按且不得自動試算。
- Gate：B01–B08、B11、B15；繁中或英文主要路徑未通過即停止 M1。

### T03 — 清除、語言、報告和暫存競態

- 加入明確的清除/重設動作、語言切換確認、copy/download；按 PRODUCT、TECHNICAL 和 UX-SEO 的 lifecycle 約束。
- 清除取消需完整保留；確認清除回空白初始狀態並 revoke 全部存活 object URLs。普通欄位編輯及重新計算不能提早 revoke 已建立 URL；每個 URL 的到期時間彼此獨立，確認清除或 pagehide 才全數清除。
- 依 C32–C38 與 B09–B16 實測五種狀態的固定報告中英文全文、失敗 shape、async epoch、容量上限、下載檔名、UTF-8/LF/BOM/最後一行和頁面生命週期。
- Gate：所有語言和狀態的報告快照一致；mock 僅用於競態邏輯，原生權限狀態如未驗實際行為需記 NOT_RUN。

### T04 — 隱私、安全及靜態預覽模型

- 按 docs/PRIVACY-SECURITY.md、docs/ENGINEERING.md 和 docs/RELEASE.md 實作 CSP/安全 headers、MIME、method/path handling、404、不使用 storage 或隱藏 request；保持 preview noindex/nofollow。
- 檢查根頁/英頁、空白、固定錯誤和含惡意標點的使用者資料都不會出現在 URL、console、日誌、網路 payload 或靜態產物內。只使用假資料。
- Gate：離線 check/build 完整通過；靜態掃描、HTTP 模型與瀏覽器觀察逐項記錄。未得到完整 Network/Storage 可觀測能力時如實標 NOT_RUN。

### T05 — 無障礙、長表單和低資源裝置

- 測 320 CSS px、200% 縮放、鍵盤全流程、40 列長表單、長英文標籤、錯誤關聯、觸控目標、IME composition、ASCII 句點輸入輔助及虛擬鍵盤安全區。
- 以 40 列有界同步 BigInt 運算，不加 worker/套件，不把手持鍵盤缺少句點誤轉成逗號。低階裝置操作成本用冷啟動/試算量測記錄；不可無證據宣稱所有裝置效能良好。
- Gate：B17–B19；無法使用真機/原生鍵盤就記 NOT_RUN 和實際限制，不用 mock 冒充。

### T06 — M1 整合候選與主代理驗收

- 執行並保存最後版本的 node --version、npm test、npm run check、npm run build；預覽使用 npm run dev -- --port 4208，僅綁 127.0.0.1。依 [docs/ENGINEERING.md](docs/ENGINEERING.md) 產生固定 allowlist/manifest 和 task evidence。
- 跑 C01–C38、C25a、B01–B22 及 250 組獨立對照；先手動瀏覽兩語。清點 NOT_RUN、test mocks、真實 browser 觀測和 exit code，不能把規格案例當通過證據。
- 只在最終程式候選穩定後各跑必要 gate 一次；若修程式，只重跑受影響 gate。完成後更新本工具 HANDOFF.md、START-HERE.md、project.json、TASK-ENTRY.md、docs/RELEASE-CANDIDATE.md 的狀態和驗證記錄。這些允許狀態更新不得改變 gate 或降低條件；dist 可依 build 生成。
- M1 放行條件：所有必要 core/browser gates pass、兩語主流程 pass、無安全/隱私/精度錯誤、差異已解決；原生或真機未驗項逐項標 NOT_RUN。交主代理獨立驗收並等候明確放行。
- M1 不包含 public source、正式網域、Cloudflare、homepage catalog 或部署。主代理未放行時不得開始 M2。

## M2 — 主代理放行後的 production 工具鏈與來源發佈

- 啟動條件：主代理明確書面放行 M1，M1 候選和證據固定；仍在原功能對話，不另開 chat。
- 建立 production build/check/preview 流程、正式 canonical/alternate SEO、安全 headers、robots/sitemap、404 和本機 production-like HTTP model 127.0.0.1:5208，遵循 [docs/RELEASE.md](docs/RELEASE.md)。提供並實際執行 npm run release:check；一般 check/build/release:check 離線。
- M2 的生成目錄限定 dist-production/；production build/check 不得改寫 preview public/ 或 dist/。production/static manifests 和 SEO hash/header 核驗需能重現。
- 發布 public source 前讀 docs/GIT-PUBLICATION-SAFETY.md，在隔離 reviewed publishing copy 只含此工具的來源，執行規定的 Git settings guard capture/verify，證據放根 .runs 唯一任務目錄。remote 為 KYStr/glossquote-labs-grade-target；不得讀取/輸出憑證，不得改 global/system Git、gh auth 或 persistent environment。若已授權的現存 CLI 認證不能發布，停下來報告。
- Gate：release:check、test/check/build/production check、HTTP routes/headers/SEO/404、乾淨副本重驗、repo public visibility、remote commit、git archive ZIP 根目錄與每檔 hash 相符皆有證據；主代理獨立放行。只公開來源不等於 live site。
- M2 允許的狀態記錄同 M1；可建立 production 專用程式設定和 dist-production，但不把 M2 產物寫回 preview public。不得呼叫 Cloudflare，不讀部署 token。

## M3 — 主代理正式部署和首頁整合

- 僅主代理在 M2 獨立放行後執行。依已授權的免費 Cloudflare 發布流程部署至 grades.glossquote.com，驗實際兩語 HTTP body、headers、SEO、404 和核心操作。
- 只有 live tool release 驗證通過才由主代理把兩語首頁 catalog draft 轉 published；重建、驗證及公開首頁來源，再部署首頁並核驗兩語入口和 matching-language 回鏈。此 milestone 的產品 chat 不改其他共用首頁檔案。
- Gate：live release、source commit、homepage source、catalog status、兩語首頁、必要 NOT_RUN 和實際 hosting 狀態全部記入 HANDOFF；若缺權限/credential/服務就記阻塞並停下，不改 token scope、不付費、不部署至別處。
- 交付狀態為 awaiting external review。外部回饋回原功能對話修正；主代理重驗/重發後仍需使用者或其審查者確認才可完成該版本。

## 狀態記錄欄位

每個 milestone 記錄：狀態（未開始／進行中／pass／blocked）、固定候選識別、允許修改路徑、實際命令及 exit code、手動與自動證據、250 組對照結果、NOT_RUN 與原因、主代理放行、來源/hosting 分開狀態。不得以聊天陳述、mock、靜態掃描或規格算例代替實際驗收。原功能實作狀態記錄到 HANDOFF 和 docs/RELEASE-CANDIDATE.md；本規格本身不預填 pass。
