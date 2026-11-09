# M12 專注計時實作與公開來源

2026-10-07 使用者授權繼續完成其餘工具。依 ROADMAP 下一項是07-focus-timer；一次只處理本工具的當前任務，主代理驗收後才依序推進。其餘工具不平行開工。

## 範圍及驗收

沿用 PRODUCT/TECHNICAL 的 FR-01–11：25分鐘初始、1–180分鐘整數、wall-clock deadline、暫停/繼續/取消/完成、runId和scheduler epoch拒絕舊callback、clock backward保守暫停、錯誤可取消。無通知/聲音/權限/儲存/遙測/後端，無新增依賴。使用者先前指定繁中+英文及完整SEO，人工待驗可保留NOT_RUN。

T00–T06保持既定依賴和allowed paths；每步由主代理讀實際程式與必要驗收後繼續。新增T07處理使用者已授權的雙語、SEO及來源發布：允許本工具public/en/index.html、public/js/i18n.mjs、public兩語HTML/CSS/app、scripts/{build,check,release,cloudflare}.mjs、wrangler.jsonc、test/{i18n,release,site-links}.test.mjs、.gitignore、README/HANDOFF/project.json/docs/VERIFICATION.md；依產品需求不修改已通過核心行為。工作證據限根.runs/focus-timer/**；來源發布副本限.runs/github-publish/glossquote-labs-focus-timer/**。

發布工具鏈採已驗證的純Static Assets方式，規劃正式origin=https://focus.glossquote.com/，頁面/index.html和/en/index.html；preview noindex、正式self-canonical/hreflang/robots/sitemap/headers/301/404；同語言首頁以及已上線工具固定anchors，不放寬外部資源規則。來源發布至KYStr/glossquote-labs-focus-timer並核對PUBLIC/remote commit。若尚未完成真實hosting，首頁catalog只加draft/null URLs/null日期；不可宣稱上線。首頁catalog及其測試/README/HANDOFF、公開首頁副本與驗收證據可隨本工具發布同步，產品頁核心不改。

必要檢查：F01–F16純函式/假排程測試與至少20種過期事件順序；sourcecheck/build/安全路徑；實際瀏覽器可做的F17–F24逐項記錄；兩語靜態SEO和320px/鍵盤；公開來源review及遠端核對。真機睡眠、確證BFCache命中、讀屏、真200%若工具環境不可實測則按使用者授權留NOT_RUN，不能用假timer代替人工通過。正式hosting與source分開驗收，需要真正憑證時才交接，不儲存或讀取既有秘密。

## 分工與設計

主代理負責架構、任務放行、實際diff review、独立驗收、來源發布與目錄整合。實作優先用實際gpt-6-luna/max呼叫，最多兩位、不得再委派、不同task按依賴序列；工具接受參數不等於已確認底層模型。Astra/max為既有主代理預設，實際模型路由未確認。

Product App模式：使用者要看剩餘時間並控制這一段專注。大數字時間是唯一視覺焦點，暖紙/深墨/酸綠與系統字型沿用家族；不搬首頁大標或加裝飾進度環。桌面：安靜品牌與語言→H1/簡述→分鐘欄位→大時間/狀態→主要控制+取消→背景時鐘限制→操作說明/FAQ→同語言工具導覽；手機同序單欄、44px控制、180:00不裁切。狀態朗讀與視覺每秒時間分離，焦點保留在操作位置。

## 主代理驗收紀錄

2026-10-07：T00 經實際來源審查後，独立執行 node --test 6/6、check、build，退出0；IAB 開啟停用的 scaffold 符合初始狀態。非法路徑在真實本機 HTTP server 測試有驗證；IAB 對 package.json 導航本身阻擋，不算該人工案例通過。T01 官方來源與生命週期 fixture 證據寫入 docs/RESEARCH.md，保留真背景/BFCache命中/睡眠 NOT_RUN，按使用者人工例外放行。

T02：主代理逐檔讀 timer/format 和對應測試，核對 wall-clock、取消優先、1ms倒退、錯誤與舊runId忽略，要求補足過deadline取消和精確格式案例後，獨立執行 node --test test/timer.test.mjs test/format.test.mjs（18/18）及 check（6 public、6 Node）均退出0。內部runId窮盡時擲RangeError的guard不構成可達一般UI情境；不新增產品行為。T02 PASS，T03 排程及介面實作中。

實際委派：ft_t00_luna，建立工具明確指定 gpt-6-luna / max，fork_turns=none；依序以 followup_task 派 T00 修正、T02、T03，無遞迴委派或更換模型。主代理與子代理真實後端路由無主機可驗證資訊，仍標未確認。

T07 路徑補充：英文必須由同一開發伺服器實際提供，因此返回T00擁有的scripts/serve.mjs允許精確新增en/index.html及相應alias，不放寬檔案白名單。test/scaffold.test.mjs可同步現有初始DOM/雙語發布的必要回歸；其他安全邊界保留。兩個獨立子任務：A只public語言/樣式與test/i18n、site-links；B只scripts工具鏈、wrangler、test/release、scaffold、.gitignore、README。主代理唯一修改HANDOFF與VERIFICATION，兩者不得互改owner檔案，也不得修改timer/scheduler核心。統一preview locale alternate標籤沿用date releasePolicy的精確格式；正式origin為https://focus.glossquote.com/（準備用，尚未驗證hosting）。正式站點發布仍需真正部署證據。
