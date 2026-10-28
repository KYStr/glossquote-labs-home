# 雙語與正式發布界線

## T09 正式發布完成（2026-10-06 最新）

https://date.glossquote.com/index.html 與 https://date.glossquote.com/en/index.html 已正式上線。主代理真HTTP24案例及10份產物位元組比對PASS，確認canonical、雙向hreflang、index/follow、兩URL sitemap、robots及安全標頭；別名301、未知路徑404、HTTPS有效。來源和無旗標build仍noindex。GitHub9b7dc6d同步正式連結；此為手動Wrangler部署，Git自動部署未啟用。搜尋引擎收錄／Search Console未驗證。下方部署前狀態為歷史，詳見HANDOFF最新段落。

## 最新 T09（2026-10-06）

使用者已選定 glossquote.com／Cloudflare Free，並授權接入與日期工具部署準備。正式 origin 為 https://date.glossquote.com/；建置與check追加 `--cloudflare`（須保留 `--production --site-url https://date.glossquote.com/`），產生12檔與精確hosting headers/redirects，搭配wrangler.jsonc html_handling=none。主代理50項測試、dry-run、本機Cloudflare模擬24項HTTP檢查PASS；真主機尚未部署；zone及DNSSEC均Active、公開DS簽章驗證通過，受限部署Token已建立但CLI憑證交接待使用者操作。見 [部署文件](CLOUDFLARE-DEPLOYMENT.md) 與 HANDOFF。本節覆寫下方T08的「尚未選定域名／未授權部署」歷史狀態，其餘索引與安全驗收要求保留。

## T08 歷史契約

2026-09-30 T08。使用者尚未選定網址與主機，已選擇「先完成發布工具鏈，保留預覽不索引」。目前沒有正式部署。公開原始碼、本機預覽、部署與搜尋收錄分別記錄。

## 預覽與正式建置

無旗標執行 `npm run build`：public與dist均保留noindex, nofollow、相對語言連結，沒有canonical/sitemap/robots。`npm run dev`只讀public，不因正式build而改變；使用127.0.0.1:4174/index.html或/en/index.html，根路徑回404。

下列為**離線測試用佔位網址，不可正式部署**。網址確定後替換整個site-url：

```sh
npm test
npm run check
npm run build -- --production --site-url https://dates.example.invalid/tools/dates/
npm run check -- --production --site-url https://dates.example.invalid/tools/dates/
```

- 兩旗標必須一起提供，沒有預設正式網址。接受HTTPS、簡單ASCII主機與路徑，拒絕帳密、query、fragment、編碼、反斜線、重複斜線及點路徑；目錄末尾補斜線。國際域名請使用經確認的ASCII域名；不支援需百分比編碼的部署路徑。
- 唯一URL為 `<base>index.html` 與 `<base>en/index.html`。正式頁產生各語自指canonical、兩頁各含zh-Hant/en完整絕對hreflang及index, follow；不修改public來源。
- sitemap.xml只有上述兩頁；origin根目錄build另產生robots.txt及sitemap位置。子目錄build不產生robots：需檢查主站origin根目錄政策並提交sitemap或納入其清單，不覆寫主站政策。
- 根目錄正式產物10檔、子目錄9檔、preview8檔。無旗標重建會清除上次正式SEO產物並恢復noindex。
- build自動驗證正式產物；check同旗標可独立再驗dist。僅完全符合兩語URL與head位置的canonical/hreflang可用絕對網址；一般連結、JS、CSS和模組仍限本地。拒絕任意XML/TXT、inline script/style及外部資產。這是有界靜態檢查，非通用HTML安全解析器或安全認證。
- JSON-LD、分享圖與favicon非本輪必要項，不因此放寬inline script或白名單。

## 主機选定後必要驗收（NOT_RUN）

1. 確認HTTPS origin、子目錄及唯一URL。若主機強制將index.html導向目錄URL，先調整并測試URL契約，不能讓canonical指向重新導向頁。根目錄／語言目錄別名應301或308到唯一頁且無循環。
2. 用實際主機設定格式配置以下HTTP headers。build不攜帶Node開發伺服器標頭；CSP meta不能提供frame-ancestors保護。

```text
Content-Security-Policy: default-src 'self'; base-uri 'none'; object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

3. 兩語頁200/text/html、CSS text/css、所有.mjs為JavaScript MIME；未知路徑404，禁止SPA fallback將模組404變HTML200。確認HTTPS憑證；HSTS按實際域名與子域政策另定。
4. 記錄正式GET/HEAD回應、標頭及重新導向鏈。不得有X-Robots-Tag: noindex等索引衝突；origin /robots.txt不得封鎖兩語頁或必要資產。sitemap需回XML並含真實URL。不能用robots禁止抓取取代preview noindex。
5. 以未改寫HTML的真實HTTP瀏覽器驗證CSP、ESM、樣式、兩語鍵盤、手機、AT、Network/storage、真正關閉JS及額外瀏覽器。D20/D22/D23/D24人工待驗不可用模擬DOM或移除CSP的測試代替。
6. 真網址與主機驗收後才部署可索引版本；可選Search Console提交sitemap。未有環境數據前不宣稱收錄、排名或Core Web Vitals成績。

正式部署不屬本次授權。回退預覽時用無旗標build，並確認主機與快取實際回noindex；只改本機dist不會改已部署網站。

本輪官方核對：[Google語言版本](https://developers.google.com/search/docs/specialty/international/localized-versions)、[Google canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)、[MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)。
