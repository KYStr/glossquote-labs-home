# MD22-38-RELEASE — 已驗證網頁版本的正式發布

2026-10-22。使用者明確授權：原對話推 GitHub，主代理部署、更新雙語首頁與看板，交付一個 ZIP。使用者亦提出各平台影音下載與多格式需求；它們是仍需完成的產品能力，不可因本輪發布而宣稱已達成。

## 結果與界線

將已主驗的 WEB-M1 R03/R04 發布到 https://media.glossquote.com/ 與 /en/。保留使用者已選的純網頁、全部本地架構。當前可保存可讀 HTTPS 媒體直鏈與本機檔案的原始 bytes，並將瀏覽器可解碼的短音訊轉為 WAV。不得宣稱可下載平台作品頁、任意格式、任意時長。保持 WEB-M1 限額與安全策略。

非目標：平台爬取／代理後端／新依賴／MP3 編碼／原生助手／改動已主驗 UI 與媒體核心／11、12 受阻工具。後續平台能力設計由主代理整合，不把設計當成實作通過。

## 原對話任務 A：發布候選

- 原對話 01a16218-cb6e-7721-b83f-f34241b8c08c；要求 gpt-6.1-sol/max，backend identity 未獨立確認。
- 只允許在本資料夾新增 wrangler.jsonc、必要的 scripts/release.mjs、對應離線發布測試；調整 package.json 的發布指令、README、START-HERE、HANDOFF、TASK-ENTRY、project.json；產生 dist。證據放 `.runs/media-web-release-2026-10-22/owner/`。
- 不改 public/、src/、dist-core/，不改既有測試。不碰共享首頁與看板，不啟動瀏覽器，不委派。
- 沿用現有家族固定 Wrangler 4.147.0 工具鏈，不下載或安裝任何套件。設定 worker `glossquote-web-media-saver`、唯一 custom domain `media.glossquote.com`，compatibility_date `2026-10-22`，workers_dev/preview_urls/send_metrics/observability/logs/traces 關閉，無 Worker runtime、KV、R2 或其他綁定。
- 建置固定 origin https://media.glossquote.com，dist 靜態資產，html_handling `auto-trailing-slash` 支援 / 與 /en/ canonical，not_found_handling `none`。build hook 僅呼叫本機已審閱 release script。不得在 hook 下載東西。
- 新增離線測試確認固定 origin、index/follow、雙向 hreflang/x-default、robots/sitemap、header 不放寬、部署設定無非目標資源，preview 仍 noindex。主驗既有249+57及50瀏覽器案例對未改程式可沿用；新增／受影響檢查須執行。
- 輸出候選 diff、來源與產物 hash、所有實際命令與 exit、環境 guard 前後完整 Snapshots 相等，然後 FROZEN。先不公開，等主代理對固定版本 release GO。

## 原對話任務 B：收到固定版本 GO 後公開來源

獨立公開 repo `KYStr/glossquote-labs-web-media-saver`。使用 reviewed publishing copy。只包含本產品必要來源、測試、文檔、發布設定；排除 .runs、其他產品、憑證、node_modules、原生 profiles。資料不得含私密內容。保留原工作區及所有歷史證據。

先後執行 git-settings-guard，禁止 gh auth setup-git/login/refresh、global/system Git 寫入、讀憑證、改持久環境。僅既有 CLI 認證及 per-command git -c。驗證 public visibility、遠端完整 commit、來源清單及雜湊，HANDOFF 回報。認證不足停回報，禁止修認證設定。此授權只允許來源公開，正式部署由主代理執行。

## 主代理驗收與整合

1. 親閱 diff、發布測試與實際 source/build 產物；確認核心不變，發布命令可重建。
2. 驗證原對話的 GitHub 公開遠端固定 commit。
3. 從固定 commit 建立隔離發布副本，dry run、closed manifest、固定 CLI 驗證後，透過既有 reviewed token-file loader 部署。不能直接讀或顯示 Token。
4. 真實 HTTPS 核對雙語 HTML、靜態資產雜湊、canonical/hreflang/robots/sitemap、CSP/no-referrer/nosniff、404/redirect 與 Insights/NEL 表面。實際 DOM 下載操作只有已驗證私有 station/desktop/job 的隔離 runner 可用，禁止操作桌面或既有分頁。
5. 僅正式站驗證後加入雙語首頁 published catalog，保留其他35站完全不變；發布首頁來源、部署、核對兩語實際連結。
6. 更新本機看板：source/live/primary PASS 與 awaiting external review，平台頁下載與多格式缺口明確記錄。不標 external complete。
7. 一個 ZIP：總表、來源固定 commit、重現命令、發布與主驗證據、能力缺口及 NOT_RUN。驗證 archive paths、bytes/SHA-256、relative links，不覆寫歷史 ZIP。

## 停止條件

發現公開宣稱超過實際能力、固定來源不一致、環境/Git 設定漂移、需要費用／新權限／不明認證、隔離失效，停止相依發布並報具體證據。可繼續其他已授權唯讀與準備工作。原生保存、真機、未測瀏覽器保留 NOT_RUN，不冒充通過。
