# labs-five-hour-product-cooking-copy-20261111

## 目標、背景與固定來源

既有料理度量工具同步已修正的來源說明，保留數值模型與產品行為；不是新工具，不消耗ready規格。實作者為 local-codex:01a1c890-b73d-72d0-8f1c-d912bbe721b2（已完成core修復的對話），要求 GPT-6.1 Sol / medium。原作者與PR268、主統籌PR283保留在provenance，不改原owner。

產品基線 KYStr/glossquote-labs-home@448bd9fc9865fe65f6014b66f4a2e2d54b76f539/tools/cooking-measurement-converter/。新版固定規格 PR304 4bc6d4e300d315597a4b1ea5feb86f6f2d6fc1c0/docs/specs/cooking-measurement-converter/，其四檔與已accepted PR285 23fa1265837f66fbedc04441db260dbb2a5ed924相同。缺陷證據 PR314 1596b13fa92080f71783e85373ed00efc0367ac4/docs/reviews/five-hour-2026-11-11/spec-review-02/build12-preflight/REPORT.md。

## 必須更正

兩語頁面來源段落、FAQ、核心註解和重建預覽不得把所有材料都歸到同一張重量表。保留奶油227g/杯，以新版規格固定的同出版社《Easy As Pie》每杯來源呈現；水、蜂蜜、燕麥片依固定規格分別敘明。清楚區分指定食材每杯重量近似與工具240mL純體積模型，不稱所有食材密度都可由同一官方表直接證實。逐一閱讀固定SPEC引用及現有HTML，若來源證據衝突先回報，不改已鎖數值。

## 允許範圍與承接

先唯讀最新GitHub規則與registry。本人上一task accepted後，等待primary或FH-REG-SCHED指定唯一寫入時段，使用最新core進行本人ACK（已有有效則重用）、register maintenance、claim/readback/start。source為固定產品，brief為本公開TASK。不得代簽或改其他owner。原產品逐檔核Git blob，建立byte-identical來源manifest，再在本任務work/獨立副本編輯。

只允許產品 tools/cooking-measurement-converter/ 及 docs/reviews/five-hour-2026-11-11/product-cooking-copy/，本機本派工目錄work/evidence/HANDOFF/VERIFICATION及任務腳本。不改規格、公式、常數、fixtures預期、schema、控制器、共享首頁/catalog、原PR或其他產品；非本次需要的樣式不改。兩語來源文案、相關核心註解、靜態文案檢查與必要生成檔可改。禁止再委派。讀設計基線並保持既有介面。

## 預宣告產品驗收

九面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility，依固定SPEC逐項附證據。針對這次改動驗雙語來源/FAQ與模型一致、連結目標確實支援對應聲稱、所有計算fixtures及下載bytes與基線完全一致、test/check/build離線通過、兩次建置hash一致。舊未變證據明列provided/reused，不混成自己重跑。

不操作本地UI/桌面/鍵鼠/IME/剪貼簿/原生dialog，不開視窗或音訊，背景CLI子行程windowsHide:true。必要真瀏覽器、Network/Storage、原生下載與真機仍NOT_RUN_USER_FOCUS_INCIDENT，未完成前不得accepted或部署。公開固定候選PR後由非作者審，不能自己合併或發布。

回報實際diff、命令/exit、來源與candidate/PR、claim、九面向已驗/未驗及風險。Git發布前後git-settings guard、長automation前後persistent-environment guard，不讀憑證/改持久環境/globalGit/安裝或付費。來源或owner矛盾、需新增權限/範圍或兩輪同失敗無進展時保存回報。07:22:08UTC收尾、2026-11-11T07:37:08Z硬停。
