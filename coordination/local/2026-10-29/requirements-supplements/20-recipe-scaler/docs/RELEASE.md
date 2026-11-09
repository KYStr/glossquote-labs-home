# 發布契約：食譜份量換算

狀態 SPEC_ONLY。預覽 build 必須 noindex/nofollow；M1 僅 localhost，不能發布。

以上為最初契約的歷史狀態。2026-10-13 主代理已正式 PASS 固定 M1 並放行 RECIPE-M2-T01；M2 公開來源與 production candidate 現已完成 owner gates，等待主代理獨立驗收。M3 與外部驗收尚未執行。

M2 只有主代理明確放行後才能發布 reviewed source copy 到 public KYStr/glossquote-labs-recipe-scaler。不得包含憑證、.runs、node_modules、兄弟產品或使用者資料。驗證 repo public visibility、commit SHA、release files 和 bytes/hash ZIP；本 gate 不做 live hosting。

M3 由主代理負責，候選網址 https://recipe.glossquote.com/index.html 及 /en/index.html。執行固定 build、production SEO、canonical/hreflang、robots/sitemap、CSP與HTTP security headers、404、雙語 live 流程；確認免費 Cloudflare release 後才更新共用首頁 catalog 並部署首頁，驗證中英文入口及返回路徑。

來源公開與正式網站發布分開記錄。交使用者驗收時狀態 awaiting external review。使用者外審未通過或未有明確回覆前不得標功能 complete。不得支付費用、讀取憑證或擴權。

## M2 固定候選

Production origin 固定為 https://recipe.glossquote.com；正式 canonical 與 sitemap 只列 /index.html、/en/index.html。preview 仍 noindex/nofollow；production 以 build helper 加入 index/follow、self canonical、reciprocal zh-Hant/en/x-default、OG 與實際 WebApplication JSON-LD，並僅省略預覽 footer caption。操作工作表沒有改變，所有 JS/CSS 與原 M1 semantic tests 的12個檔案 byte hashes 固定於 scripts/m1-frozen.json。

dist-production 為14個檔案的 closed tree：兩語 HTML、八個原 JS/CSS、robots、sitemap、404、_headers。CSP 只允許 self 與兩個精確 JSON-LD SHA-256 hashes，不用 unsafe-inline/eval。matching-language family link 使用既有 nav 44px target。404頁雙語、無SPA fallback。HTML/CSS/ESM/XML/TXT MIME與headers在真 loopback Node HTTP 上驗證，Host/query不影響canonical。這是本機候選驗證，不是Cloudflare原生HTTP或deployment證據。

wrangler.jsonc 使用 static-assets-only：directory=./dist-production、html_handling=none、not_found_handling=404-page；固定 custom domain recipe.glossquote.com。無 Worker script、binding、runtime package或secret；workers_dev/preview_urls/send_metrics與observability/logs/traces均false。未呼叫Wrangler，dry-run非本gate必要項，因此NOT_RUN；不安裝CLI、不讀憑證或token。

官方配置參考（2026-10-13）：[HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)、[custom headers](https://developers.cloudflare.com/workers/static-assets/headers/)、[Wrangler config](https://developers.cloudflare.com/workers/wrangler/configuration/)。依使用者及根契約，observability off優先於skill預設建議。

Public source: https://github.com/KYStr/glossquote-labs-recipe-scaler，PUBLIC，remote HEAD=af2e7145606bf45fbf02ccd8d304e9301570c136，branch codex/m2-production-candidate。來源ZIP為git archive固定commit輸出，SHA-256 c1a83a5800f79842151df5f97490f9823f6bf4a372a1bfb7d2a09653a30b3caa。ZIP 39檔逐Git blob byte相符，乾淨解壓49tests/check/build/production build/check/manifest全通過，production14檔54668bytes與原候選完全相同。

新增Git發布規則已讀並遵守；使用新git-settings-before.json capture及verify，三個known user/system config fingerprints未變。只在reviewed source copy用單次git -c（包括一次gh git-credential helper），未執行任何auth setup/login/refresh或global/system config寫入。temporary source-publication hold在主代理正式解除後才create/push。主代理的已確認四個helper assignment移除為既有事件處置，不宣稱恢復未知pre-state。本工具未執行該回復。

所有固定source/ZIP/manifest、命令與guard證據在 .runs/github-publish/glossquote-labs-recipe-scaler/m2-2026-10-13-t01/；完整流程及未测界線見HANDOFF.md。沒有建立第二個commit或為進度文件再次push。

最終更新：主代理M2驗收已PASS，並完成recipe部署version499da687-502c-45e0-959c-67830684e6b6；正式38HTTPresponses與雙語比例/適量/nativeclipboard/stale也由主代理驗證。證據20-primary/result.json、20-deployment.json、20-live.json在其.runs/handoff-release-2026-10-13/。首頁整批及外審尚待主代理，owner不執行M3、不改publiccommit。

已讀Git trace追加禁令；後續publishing child清除GIT_TRACE_CURL/GIT_CURL_VERBOSE/GH_DEBUG=api等debug env，只調整process，沒有persistent寫入。原始trace不交驗收包，不動歷史原件，只保留不含認證值的處置摘要／guards。完整goal未達外審確認，不標complete。
