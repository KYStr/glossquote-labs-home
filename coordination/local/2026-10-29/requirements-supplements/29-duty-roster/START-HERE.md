# 輪值排班表：來源已公開

M1主代理驗收PASS；M2 public來源已驗證：https://github.com/KYStr/glossquote-labs-duty-roster ，commit 08589bc3a9a5ccbc9f80eeffe8968f7767ccafc8。乾淨來源npm test直接69/69、產物與release gates通過。固定flat source ZIP及bytes/hash見HANDOFF最新段落。M3 Cloudflare/首頁/外部複驗尚未執行，不是網站已上線。

Node24+、零依賴；npm test可直接跑。產物驗證先npm run build，再npm run build:production、npm run release:check。dev只127.0.0.1:4209；preview:production只127.0.0.1:5209本機HTTP模型。public與preview dist保持M1固定bytes；正式只產生dist-production。下一個gate由主代理M2接受後M3部署，原功能對話不得自行調用Cloudflare/token或改首頁。
