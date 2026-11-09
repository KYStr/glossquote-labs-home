# Cut Planner — 任務與里程碑

## 目前狀態

2026-10-19 主代理依既有 ACCEPTANCE 人工未驗界線授予 M1 scoped GO 並明確放行 M2。兩輪實際瀏覽器證據合併69 PASS、0 FAIL、3 PARTIAL、7 NOT_RUN；繁中BFCache未見persisted，兩語Network/Storage保留部分／人工範圍。原對話正處理 M2 production/source 候選，不部署／修改首頁或操作UI。本節只更新進度，不放寬下列門檻；精確範圍見 HANDOFF及docs/PUBLIC-RELEASE.md。requested model 為 gpt-6.1-sol/max；backend identity未獨立確認。

## M1 — 本機完整產品

只有主代理確認本規格和共通文件可派工後，原功能對話一次完成本機 MVP。工作範圍含純函式核心、精確 descriptor 驗證、FFD v1、逐支結果、完整繁中/英文 UI、文字報告、copy/download lifecycle、SEO 預覽頁、CSP/headers、固定 allowlist 的 Node 24 工具鏈和假資料測試。

所有 feature UI 驗收只用 browser 工具及本任務專屬隔離/隱藏分頁。不可控制桌面/native app/OS 滑鼠鍵盤、搶焦點、操作使用者既有分頁或剪貼簿，也不可觸發原生列印、檔案選擇或儲存視窗。可使用無 OS 視窗的 browser 工具操作及背景 CLI。Clipboard 的 browser UI 行為只用不會轉呼叫 navigator.clipboard.writeText 的 stub/mock/API 程式測試；不改動使用者系統剪貼簿。真實 clipboard write/權限提示、原生下載、原生列印、檔案選擇與儲存視窗都逐項記為 NOT_RUN。

M1 必須完成：

1. 依 [TECHNICAL.md](TECHNICAL.md) 實作 calculateCutPlan 與 buildReport；不改演算法、驗證次序、schema、錯誤界線或 oracle 預期。
2. 依 [ACCEPTANCE.md](ACCEPTANCE.md) 提供 C01–C40 手算核心、R01–R03 報告上限與安全 schema 案例、descriptor/schema/非突變/錯誤全無 partial、report tampering，以及雙語瀏覽器 cases。預期值必須手寫或由獨立 oracle 計算，不能呼叫被測函式產生 expected。
3. 完成 zh-Hant 和 en 主流程，320px 鍵盤操作、列增刪、空白/非法錯誤、實時失效、清除取消/確認、語言切換清空；copy/download adapter 以不碰原生 OS 的 stub 驗證權限錯誤、遲到 Promise、最多 8 個獨立 URL，mock 只能標成模擬。瀏覽器真實剪貼簿寫入、原生下載、列印、檔案選擇及儲存視窗都必須 NOT_RUN。
4. 設置 Node.js >=24 ESM/built-ins，離線 node --test、check/build、固定 preview server 和 HTTP 模型；preview 預設 port 4212，loopback only，noindex/nofollow。不得安裝套件。
5. 完成安全/SEO靜態檢查：無 runtime dependency、網路呼叫、儲存、上傳、secret、動態 inline style 或不可信 HTML；所有 path/allowlist/symlink/hardlink/size/CSP/MIME/404 gates 通過。
6. 在 HANDOFF 中精確記錄指令、版本、exit、測試數、真實 UI/HTTP範圍與 NOT_RUN。真機、完整 Network/Storage、原生剪貼簿與下載等未測項明列 NOT_RUN，不用 mock 宣稱通過。

本地候選命令由共通工具鏈提供，至少記錄 node --version、npm test、npm run check、npm run build，並啟動 npm run dev -- --port 4212 完成 HTTP/UI 驗收。未經主代理 M1 GO，不得建立 M2 production toolchain、公開 repo 或部署。

## M2 — 公開來源候選

主代理明確回覆 M1 GO 後，原功能 chat 才可以建立獨立 production source release，並在使用者明確已授權的 GlossQuote 工具流程內發布 public repo KYStr/glossquote-labs-cut-planner。沿用 [發布契約](docs/RELEASE.md) 和 [任務入口](TASK-ENTRY.md) 的 source safety、固定 git guard、reviewed publishing copy、乾淨 checkout 驗證、commit/visibility/hash/ZIP 證據。

M2 必須維持 preview dist/ 與 production dist-production/ 分離，production build/check 不覆寫 preview；提供 5212 loopback local production model、release:check、正式 index/noindex/hreflang/x-default/JSON-LD/robots/sitemap/headers/404 檢查。source publication 完成不代表已部署正式站或主代理已驗收。不可讀取或回報 credentials。

## M3 — 主代理整合

M3 由主代理負責，在 M2 review 後處理免費正式部署、兩語 live、首頁 catalog、首頁 source/部署、HTTP/SEO/安全與正式 UX 驗收。原功能 chat 不修改共用首頁、家族 Wrangler、共用契約或其他工具。只有主代理明確交付的放行才能進入下一 gate；live 或 homepage 若未完成要如實保留。

## Release/外部驗收狀態

每個 milestone 一次推進；失敗停在原 gate 修正後重驗。沒有 M1 或 M2 證據時不宣稱 build/test/發布完成。真機、真實原生 clipboard/download、完整 Network/Storage 和其他實際尚未執行的項目保留 NOT_RUN。完成 live release 後版本標記 awaiting-external-review；只有外部 reviewer 給出結果並完成必要修正、重驗、重發且確認後才可標完成。

## 相關文件

- [產品規格](PRODUCT.md)
- [技術規格](TECHNICAL.md)
- [UX 與 SEO 規格](UX-SEO.md)
- [驗收案例](ACCEPTANCE.md)
