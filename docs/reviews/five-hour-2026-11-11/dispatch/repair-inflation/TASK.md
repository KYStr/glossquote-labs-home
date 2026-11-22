# labs-five-hour-repair-inflation-20261111

## 具體目標與主統籌裁決
修正INFL01至04。主統籌選可驗的有界確定性：rate模式十進輸入轉精確有理數，整數年0至既有上限200的冪用BigInt，不用Math.pow決定半分；CPI比值精確，年化根式用有界有理數比較/整數二分得到規定小數位，不依引擎pow落半界。請先提出完整量化算法/最多步數/輸出上限方案再改。金額顯示/JSON保持現有形狀，精確縮放後超安全整數以明確RESULT_LIMIT失敗、無Infinity/NaN或成功null；原巨大值/下溢null預期改錯誤需列理由，合法小正值仍依既定顯示精度。捨入後只承諾非遞減，原值嚴格/符號規則限前提；1元.001/.002反例入字面。CPI必同系列/同基期/同觀察口徑，年數對應期別，標籤不自動推斷；修2020→2021卻5年fixture並給官方換基反例，修不存在參照link。無即時數據/投資建議。

## 固定來源與非目標
sources.json列原PR/commit/task/owner；initial-review/<slug>/REVIEW.md有非作者反例及來源。原四檔須以遠端blob核對後放work/docs/specs/<slug>/；允許slug僅inflation-calculator。本輪只修文件/fixtures，不製作產品，不碰既有tools/、原分支、原owner、資料或部署。REG-01的合法登記修復由另案處理，此任務不可自行revise-spec。涉及官方/科學來源應閱讀一級資料，網頁查不到不能編造，保存具體待核項。

## 開工/交驗
讀最新remote AGENTS/START-HERE/AGENT-HANDBOOK/協作規則/registry。目前只讀設計，等主統籌registry串行slot後，本人local-codex:<實際chatID> ACK/register maintenance/claim/readback/start；三必要面向 spec-corrections、exact-fixtures、provenance-and-scope。每個GitHub reference先確認存在；用pure core、fresh revision/blob條件寫入、精確operationId/requestHash/claimId/owner讀回；失敗查原操作，不搶別人的claim。禁止冒簽、revise-spec、標ready或改原作者task。修正不等於ready，產品九面向不等於文件八面向。

只寫本任務資料夾work/指定規格、evidence/及HANDOFF.md和任務腳本。不得改其他task/root/工具產品/sharedregistry/共用git index；不得再委派。所有fixtures用獨立算式釘literal expected；舊結果有變要列前後及原因，不能用待製作產品產生expected。共同repo獨立codex分支PR由本人等發佈slot後提交，固定candidate再非作者審；不得merge/deploy。交付實際檔案/diff、命令/exit、固定來源/hash、NOT_RUN、已知風險與需要決策事項。

## 安全/截止
禁止桌面、本機互動browser、鍵鼠/焦點/IME/clipboard/native dialogs；只背景CLI/HTTP，子行程windowsHide true。Node24內建/既有Python，fake data、零新依賴；高風險來源讀官方。長automation前後persistent-env guard，GitHub寫前後git-settings guard；不得讀憑證/環境token、改global/system Git/gh auth、persistent env、安裝/付費。來源/owner變動、需新權限/超範圍，或連續兩輪同失敗沒進展即保存回報。UTC07:22:08收尾，2026-11-11T07:37:08Z硬截止；不得延長或假PASS。
