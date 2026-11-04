# 報價單快速製作 — M2A assets-only 發布準備

2026-10-27（Asia/Taipei），任務 B20-57-M2A。**本輪只有正式免費 Cloudflare 靜態資產發布準備，尚未 push／部署／更新首頁。** requested gpt-6.1-sol/max，backend 身分不以自述確認。

root 的 b20-57-r1 瀏覽器報告實讀為 32 PASS、8 NOT_RUN、0 FAIL、prohibited 0。隔離及 parent cleanup 證據由 root 擁有；本輪未啟動 UI、server 或瀏覽器。8 個 NOT_RUN 保持原狀，沒有改稱真人／原生／真機／200% 或私有 FileReader 行為全數通過。

## 設定與產物

- `wrangler.jsonc` 是 JSON 相容的 JSONC，無 main、帳戶 ID、憑證、vars、binding 或可執行 Worker。name 固定 `glossquote-quote-builder`；compatibility_date 依明確任務固定 `2026-10-24`。
- workers_dev / preview_urls / send_metrics 全 false；routes 僅 quote.glossquote.com custom_domain true；observability、logs、invocation_logs、traces 全 false。使用者的固定設定優先於技能的最新日期／觀測預設。
- assets.directory `./release-artifacts/site`，run_worker_first false、html_handling none、not_found_handling none；build.command 固定 `node scripts/release.mjs build`。
- `scripts/deployment-config.mjs` 在 check/build:release/check:release 前驗精確 keys、型別和值；錯域名、多 route、telemetry、bindings、外部路徑、Worker-first、HTML beautification、SPA、不同 build command 都拒絕。沒有呼叫 Wrangler 或讀憑證。
- 正式 site 的 `_redirects` 必須為 **65 UTF-8 bytes**：

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

包含最後 LF，沒有其他路徑、外部 URL、rewrite 或第二段轉址。index.html / en/index.html 是實際檔案與 canonical 目標。離線測試只證明規則圖單次 301；真實 Cloudflare HTTP 行為仍須 root 部署後檢查。

site 閉合清單現為 12 檔：原 8 個 public allowlist 加 `_headers`、`_redirects`、robots.txt、sitemap.xml；manifest 位於 sibling，不進 site。manifest mode 仍為 release-candidate，表示尚未部署；sourceFiles 保持完整的 8 個 M1 public。部署設定另固定於 source evidence，不混入 public sourceFiles。

## 精確候選文字移除與功能保留

只在正式 HTML 產生時，以完整 span 一對一移除候選前綴：

```text
<span>本地候選版本 · 不自動儲存草稿</span>
→ <span>不自動儲存草稿</span>

<span>Local candidate · Drafts are not saved automatically</span>
→ <span>Drafts are not saved automatically</span>
```

保留資料生命週期提示；沒有廣泛刪除其他文字。原 public/dist 的 noindex 預覽和候選文案保留。除了既有正式 head SEO 及上述精確 span，兩語完整 HTML 原文均保持；6 份 JS/CSS runtime、核心、下載格式、CSP／隱私 headers 不改。

canonical 固定 https://quote.glossquote.com/index.html、https://quote.glossquote.com/en/index.html；每頁 zh-Hant/en/x-default 互返，x-default 中文。中文兩個首頁連結為 https://glossquote.com/index.html，英文為 https://glossquote.com/en/index.html。

## 重現與舊產物保留

在本工具根目錄，使用現有 Node 24+：

```text
npm test
npm run check
npm run build
npm run build:release
npm run check:release
```

無 npm install／新依賴；測試全離線假資料。release builder 保持「遇未知／修改輸出立即拒絕，合法輸出驗證後不重寫」；不新增 force／清空／隱式升級路徑。

本輪先以原 check 驗 M1B 輸出，再核全部 bytes/hash 及安全絕對路徑，將舊 release-artifacts 整體 rename 到本輪 owner 的 previous-release-artifacts，完整保留 12 檔與舊 manifest。之後才建立新版。此為一次授權準備操作，不是 builder 自動刪除或覆寫能力；遇不符的舊產物仍須保留並由 root 判斷。

本輪證據位於 workspace 的 `.runs/batch20-completion-2026-10-27/owner-57-release/`，包含 before、previous-release-artifacts、commands/logs、source/artifact hashes、scope/diff、Windows Environment guard。產品中的原 M1/M1B evidence 不覆寫。最新實際命令、hash 與 NOT_RUN 列於 [HANDOFF](HANDOFF.md) 的 M2A 追加段。

## 平台依據與剩餘驗證

已用 workers-best-practices 作設定檢查參考，未執行任何安裝或外部 hook。依官方 [Static Assets redirects](https://developers.cloudflare.com/workers/static-assets/redirects/) 規則，_redirects 位於 assets 目錄；依 [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/) 使用 none 保留明確 .html 目標；assets-first 參考 [Configuration and Bindings](https://developers.cloudflare.com/workers/static-assets/binding/)。這些文件不是實際部署證據。

本輪未執行 Wrangler schema/dry-run、GitHub、Cloudflare upload/deploy、live HTTP、根域／en／en/ 真301、正式 headers/免費帳戶配置或首頁整合。root 必須在另行發布里程碑使用已審核來源與現有權限完成平台檢查；本輪不擴權、不改持久設定、不讀任何 token。
