# 書籤匯出整理 / Bookmark Export Organizer

在目前分頁整理 Netscape bookmark HTML：預覽資料夾與網址、按完全相同的 URL 分組、明確保留或排除項目，再匯出可匯入 HTML 與 JSON 備份。所有輸入只在分頁記憶體處理，不上傳、不開啟書籤網址、不載入 favicon，也不修改原檔。

Review a Netscape bookmark export, inspect exact-URL groups, choose which entries to include, organize folder paths, and download HTML plus a JSON backup. Input stays in the page's memory; bookmark URLs are never opened or fetched.

限制 / Limits: UTF-8 Netscape HTML up to 2 MiB, 3,000 bookmarks and 12 folder levels. Only the documented Netscape profile is supported. The JSON report is a backup, not a supported import format.

## Local use and verification

Requires Node.js 24. No runtime/dev dependencies; no package installation is required.

```sh
npm test
npm run check
npm run build
npm run build:release
npm run check:release
```

The preview build is written to dist/. The reviewed release is written to release-artifacts/site/ with its manifest beside the site. Generated files and test scratch are excluded from Git. To preview manually, run npm run dev and open http://127.0.0.1:4229/; the server binds to loopback only.

## Release and review status

This repository publishes the reviewed source. Hosting and external review are pending. bookmarks.glossquote.com is the configured release target; this source publication does not establish a live site.

The frozen M2A offline results were 54 passing tests. The parent-run isolated browser review recorded 44 PASS, 10 NOT_RUN and 0 FAIL. The 10 NOT_RUN entries cover both languages: retained heap/BFCache internals, deliberately late worker completion, genuine 200% zoom, a real 20-minute observation, and native dialogs/clipboard/printing/real devices/assistive technology. No skipped check is presented as passing.

See [publication scope](PUBLICATION.md), [acceptance summary](review/acceptance-summary.json), [product profile](PRODUCT.md), [technical contract](TECHNICAL.md) and [release manifest](review/release-manifest.json). Other milestone documents preserve their dated historical status; the original pre-implementation README is in [review/original-README.md](review/original-README.md).
