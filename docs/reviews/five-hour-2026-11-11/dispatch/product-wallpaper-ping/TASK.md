# labs-five-hour-product-wallpaper-ping-20261111

## 任務與來源

既有產品修正 milestone，不是新工具製作，不消耗 ready spec。實作者為既有 wall/ping 規格維護對話 local-codex:01a1c890-bac0-7ab2-ae49-eb422b49efb0；模型要求 GPT-6.1 Sol / medium。原雲端 Build #270、#274 與主統籌維護 #283 全部保留，記錄來源作者與 contributors，不改原任務 owner。

固定產品：KYStr/glossquote-labs-home@448bd9fc9865fe65f6014b66f4a2e2d54b76f539 的 tools/wallpaper-calculator/、tools/ping-area-converter/。固定規格：PR299 c2c3f7715023990b1427e052a25c52f1987eaca9 的 docs/specs/同名目錄四檔，規格維護已 accepted，但產品尚未驗收。獨立失敗證據：PR314 1596b13fa92080f71783e85373ed00efc0367ac4 的 docs/reviews/five-hour-2026-11-11/spec-review-02/build12-preflight/REPORT.md、delta-vectors.json、delta-results.json。

## 具體修正

壁紙按全牆寬估整幅，開口只影響面積摘要，不扣整條採購。既有例應23幅8捲；半高開口3.18m牆、1.59m開口、0.53m捲寬應6幅2捲。保留 openingsWidthCm 摘要，但 effectiveWidthCm 為全牆寬。先完成原格式/逐欄驗證，再在合計與短捲檢查前定位第一筆高於牆高的開口，錯誤 OPENING_HEIGHT_EXCEEDS_WALL/heightM/row。等高合法。兩語錯誤需聚焦高度欄；文案、範例、報告、fixtures與建置預覽一致，不能只改核心。

坪數核心常數和計算保持不動，納入固定規格的新100坪→3558.32ft²回歸。既有30坪canonical下載、100列速查不變。調整實際案例計數，禁止為過測改字面expected。

## 允許修改與操作

先唯讀最新GitHub契約/registry/同scope工作，確認前一任務accepted。只有主統籌排給本人registry時段後，ACK（若已有效勿重複）、register maintenance、claim精確operationId/requestHash/claimId/owner讀回、start，才可改產品。task source為上述固定產品來源，brief為本公開TASK。來源、必要criteria和兩款固定SPEC引用先查公開存在。使用最新已合併core及CAS，不寫別人紀錄。

本人獨立工作副本只在本派工目錄work/及evidence/、HANDOFF.md、VERIFICATION.md和任務腳本；發布範圍 tools/wallpaper-calculator/、tools/ping-area-converter/及 docs/reviews/five-hour-2026-11-11/product-wallpaper-ping/。先從PR283逐檔核Git blob，保留相同bytes的來源manifest/固定父提交，再做更動；不要夾帶其他10款。不得改共享規格、registry（除本人有時段的合法命令）、catalog、首頁、發布部署或其他產品。保留原介面、同語回鏈、preview noindex、零網路/零持久化/安全預設。不再委派。

## 驗收與測試

task預宣告九必要面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility；各面向必須覆蓋兩款，逐款附證據。固定SPEC是完整驗收契約，不可只用這份摘要。讀tool-design基線，保持現有Product App。按package實際腳本執行離線test/check/build，建置兩次逐檔bytes相同；補壁紙6差異案例、所有新錯誤與兩語欄位定位/序列化的有意義測試，坪數新精度案例及舊下載回歸。已有未變測試可附固定歷史證據，不能改稱新執行。

不得使用本地互動瀏覽器或桌面，禁止焦點、鍵鼠、IME、剪貼簿、原生dialog、音訊。只背景CLI/HTTP，子行程windowsHide:true。尚無經primary核實隔離機制的必要瀏覽器/真機/讀屏/Network/Storage/原生下載保持NOT_RUN_USER_FOCUS_INCIDENT，requiredChecksComplete=false，不得accepted或部署。候選先公開獨立codex分支PR，再由非作者逐面向審；本人不得merge、ready spec或部署。

## 回報與停止

回報實際檔案diff、命令/環境/exit、來源manifest、固定candidate/PR、task/claim/owner、產品九面向已驗及NOT_RUN、已知風險。來源或owner衝突、需新權限/相依安裝/付費、超範圍或兩輪無進展即停存證。Git發布前後git-settings guard、長automation前後persistent-environment guard；不讀憑證、不改global/system Git或持久環境。2026-11-11T07:22:08Z開始保存、07:37:08Z硬截止。Source pushed不等於product accepted或live。
