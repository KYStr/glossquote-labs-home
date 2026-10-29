# 網頁影音保存｜GlossQuote

已選定純網頁架構：貼上瀏覽器可直接讀取的影音網址，或選本機檔案，在瀏覽器內保存原檔／取出 WAV 音訊。不需安裝、解壓或啟動助手。

目前 WEB-M1 / R03–R04 已完成[主代理驗收](PRIMARY-ACCEPTANCE.md)，並已公開[固定來源 commit](https://github.com/KYStr/glossquote-labs-web-media-saver/commit/8716a264c6d6866d2343a0b7ec7b2a163dc797c7)。**主代理已部署並完成限定範圍驗收，等待外部驗收**；最新證據見 [正式發布驗收](RELEASE-ACCEPTANCE.md)。正式入口為 `https://media.glossquote.com/` 與 `/en/`；來源公開、live 驗證及外部驗收分開記錄。8 平台的 M0 URL 辨識測試不是平台下載相容證據；YouTube 等作品頁下載與更多輸出格式仍是未完成能力。

- [開始閱讀](START-HERE.md)
- [現行完整產品、技術與驗收契約](docs/WEB-M1.md)
- [實際交接與測試狀態](HANDOFF.md)
- [隱私界線](docs/PRIVACY-SECURITY.md)
- [架構取捨記錄：已選 C](docs/EXPERIENCE-OPTIONS.md)
- [正式發布分工與門檻](docs/WEB-RELEASE.md)
- [後續平台／格式路線（尚未實作）](docs/PRODUCT-NEXT.md)

原檔最多 32 MiB；WAV 的輸入最多 16 MiB、120 秒，解碼後最多 2 聲道、48 kHz、64 MiB PCM。是否能解碼依瀏覽器與來源；沒有 MP3 編碼、平台擷取、登入／cookie／DRM、媒體代理或本機助手。檔案準備完成不代表已保存到磁碟。

## 維護者重現

一般使用者不需 Node、安裝或解壓。以下是維護者命令，需 Node.js 24+，runtime/dev 外部依賴皆為零，不執行套件安裝。

```text
npm test
npm run check
npm run build
npm run serve -- --port=4218
```

`npm run build` 維持 preview/noindex，serve 只綁 `127.0.0.1`、不自動開瀏覽器。固定正式候選使用獨立入口：

```text
node --test test/release.test.mjs
node scripts/release.mjs
```

release 命令不收 origin／部署參數，只建立並驗證固定 `https://media.glossquote.com` 的 `dist`，不推送、不部署、不讀 Token。它確認雙語 canonical／hreflang／x-default、index/follow、robots/sitemap、原安全 headers、閉合 bytes/SHA manifest，以及 UI body／應用資產未被建置改寫。執行 preview build 會將同一 `dist` 改回 noindex；維護者發布前必須重新跑固定 release 入口並核對 hash。

[wrangler.jsonc](wrangler.jsonc) 固定 `glossquote-web-media-saver`、唯一 custom domain `media.glossquote.com`、靜態 `./dist`，無 Worker 程式或資源綁定。維護發布沿用家族已核准 Wrangler **4.147.0**，不以 npx 自動下載最新版。HTML routing 採 `auto-trailing-slash`，404 不回退 SPA；其行為參考 [Cloudflare HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)，實際 HTTPS redirect／404 與 headers 仍由主代理部署後驗證。

任務 A 已取得固定版本 GO；任務 B 已公開並驗證 repo 的 PUBLIC 可見性、完整 commit／tree 與乾淨發布副本。正式部署、雙語首頁與看板由主代理負責。未部署、原生人工保存、未測瀏覽器／真機及平台能力缺口都不能由離線測試代替。狀態與所有實際命令以 [HANDOFF](HANDOFF.md) 為準。
