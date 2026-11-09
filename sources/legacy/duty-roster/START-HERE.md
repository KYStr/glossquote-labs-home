# 輪值排班表：目前候選

M1已由主代理正式接受；M2正式靜態候選與45檔獨立來源副本通過69/69測試及check/build/production gates。公開目標 https://github.com/KYStr/glossquote-labs-duty-roster ；發布狀態與固定commit請讀HANDOFF最新段落。Cloudflare、首頁與外部複驗尚未完成。

Node24+、零依賴；先npm run build，再npm run build:production、npm test、npm run release:check。dev只127.0.0.1:4209；preview:production只127.0.0.1:5209本機HTTP模型。public與preview dist凍結，正式只產生dist-production。不得自行部署或呼叫Cloudflare/憑證。規格與下一個gate見TASKS.md、TECHNICAL.md、docs/RELEASE.md及AGENTS.md。
