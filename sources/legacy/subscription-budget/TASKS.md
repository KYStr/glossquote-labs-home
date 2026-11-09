# 任務：訂閱費用盤點

SPEC_ONLY。只在本工具內改動；禁止遞迴委派。一次一里程碑，M1交主代理前不得自行公開或部署。所有命令都在本工具目錄；若npm不在PATH用正式安裝路徑，不改PATH/registry。

## M1-T00：本機骨架

前置讀完整規格及docs。allowed paths：package.json、.gitignore、public/**、scripts/{serve,check,build,validation}.mjs、test/**；狀態HANDOFF.md/TASK-ENTRY.md/project.json/START-HERE.md/docs/RELEASE-CANDIDATE.md可更新。不改PRODUCT/TECHNICAL/ACCEPTANCE門檻，不改兄弟、首頁或根repo。
建立Node ESM、private package、dev/test/check/build命令；serve只127.0.0.1:4207、GET/HEAD allowlist/MIME、不接受路徑逃逸、不向外網。preview兩語頁noindex；初始化env guard證據。建立check/build後才跑npm test、npm run check、npm run build。此時僅骨架gate，不標產品完成。

## M1-T01：核心與固定測試

相同allowed paths；依TECHNICAL exact schema、BigInt年額、half-up月均、計畫停用對比與文字報告。加完整A01–A31，尤其12×0.01年繳的總月均oracle不靠實作重算expected。執行npm test；檢查getter不執行及非原地修改。FAIL修正同範圍，不改成寬鬆schema。

## M1-T02：雙語完整操作

allowed public/**/test/**/必要scripts改動與上述狀態。建欄位/錯誤/增刪/範例確認/clear dialog/結果/copy/download，revision+requestId防舊回呼。執行有意義的UI狀態測試與真browser必要B案例；保留NOT_RUN。缺能力只讓相應輸出fallback，不改上傳或使用外部服務。

## M1-T03：凍結交接

allowed同M1與docs/RELEASE-CANDIDATE.md。最後implementation穩定後只跑一次必要npm test/check/build；修正後只重跑受影響gate。記錄實際檔案、精確命令/exit、源檔manifest(bytes/hash不含自身)、browser evidence、env前後、未驗風險。完成後final回報主代理並等待M1主驗，不讓使用者轉貼，不開新chat。

## M2：主代理明確放行後的公開來源與正式候選

allowed scripts/**、test/**、public中必要同語family SEO而非功能重寫、wrangler.jsonc、package.json/.gitignore、docs/RELEASE*/HANDOFF/TASK-ENTRY/project/START-HERE；dist-production/**與隔離publishing副本。增加build:production/check:production/preview:production，產出已審核靜態HTML/JS/CSS/robots/sitemap/_headers/404；canonical兩語與x-default。依docs/RELEASE.md先測，再由原chat推public KYStr/glossquote-labs-subscription-budget，驗remote commit/visibility/乾淨來源ZIP。禁止gh auth setup-git/login/refresh、global/system Git設定、讀token或authdebug；guard前後一致。超出必要SEO/發布改動需回主代理審核，不能悄悄改核心。不執行Cloudflare或首頁。

## M3／M4：主代理與外部驗收

M2交回後由主代理驗固定source、正式部署至subscriptions.glossquote.com、驗證live，最後更新雙語首頁。功能chat只修主代理退回的具體問題並重驗、補來源，不越權動共享資源。M3交使用者外部驗收標awaiting-external-review；收到外審才回同chat更正，經確認才完成版本。

停止並回報：需要新權限/套件/費用/憑證、同路徑其他owner在寫、範圍或oracle矛盾、Windows/Git持久設定漂移、兩次同一故障無新證據。保留所有既有資料/服務；只可結束自己明確建立且可丟棄的測試程序，不kill by name/port。
