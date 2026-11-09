# 訂單揀貨與裝箱單：M2A 正式發布來源準備

2026-10-25。本輪僅完成正式來源準備，待主代理審查後另行 M2B 公開 GitHub；正式站未部署，外部待驗。原網址約定保持 https://picklist.glossquote.com/index.html 與 /en/index.html。本輪沒有 browser、服務、Wrangler CLI、憑證、Git/auth、持久設定、安裝或部署操作。

主代理的 M1B 隔離 browser 實驗 `b20-44-r1`：30 PASS、10 NOT_RUN、0 FAIL／0 prohibited，browser 145.0.7632.6；`b20-44-lifecycle2-r1`：兩語真 pagehide/back-forward 返回共 2 PASS、四個 mapping 均清空、0 FAIL／0 prohibited。兩次 parent-cleanup 均 PASS。這是主代理既有真 browser 證據，不是本對話的新執行或 Node 結果。

保留的 10 NOT_RUN 是兩語各 5 類：精確 source-replacement event 窗口、真正200% zoom、native chooser/save/print、真機/AT、exact8MiB browser boundary。使用者允許保留人工待驗；原 Node 邊界結果維持其原範圍，沒有將任一 NOT_RUN 改成 PASS。本輪最小 banner 轉換由精確 bytes 與針對性測試驗證，未另跑 browser。

## 最小 HTML 變更

public/dist 不改，仍有 noindex 與原候選提示。正式 release builder 只在每語系 HTML 中將唯一、精確的 `<p class="preview-label">…</p>` 文字替換：

- 本地預覽候選 → 檔案在此瀏覽器處理。
- Local preview candidate → Files are processed in this browser。

原標籤、class、其餘 body 與原 SEO head bytes 完全保持 M1B。Builder 仍先核固定 public SHA，再要求 body 僅等於這一項轉換；checker 重新構造 expected bytes。缺少／重複／變形 banner 拒絕；任意 body 差異即使連 manifest 一起改也拒絕。JS、CSS、CSP、robots/sitemap、其他資產 bytes 都不變。

舊 release-artifacts 已先核對完整15檔 bytes/SHA、拒絕未知檔／目錄／link，再驗證 resolved source/target 都在本工具內，以一次目錄 rename 保存為 evidence/m2a/release-before。沒有遞迴刪除、覆寫舊檔或放寬 builder 的 existing-output 保護。原 M1/M1B evidence、owner browser module 與舊執行證據均未改。

## 純靜態 Wrangler 設定

wrangler.jsonc 無 main 或任何 runtime/storage binding；assets.directory 固定 ./release-artifacts/site，name glossquote-order-picklist、compatibility_date **2026-10-24**，唯一 route picklist.glossquote.com custom_domain=true。主代理更正先前台北日期10-25，避免當時仍為UTC10-24而被判為future compatibility date；工作紀錄日期仍為台北10-25。舊設定與完整52檔來源／命令證據保留於 evidence/m2a/date-correction-before。workers_dev/preview_urls/send_metrics 與 observability/logs/invocation_logs/traces 均關閉；run_worker_first=false，html_handling=none，not_found_handling=none。build command=node scripts/release.mjs build。

欄位按指定 scope 與 [Cloudflare Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)／[Static assets configuration](https://developers.cloudflare.com/workers/static-assets/binding/)／[Workers invocation logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) 核對。此輪只做 Node JSON exact-object 契約檢查，沒有假稱 Wrangler schema/dry-run 或實際 hosting 已驗；未安裝 Wrangler 或新增 package 依賴。

## 重現與證據

在本工具：

```text
node --test test/release.test.mjs
npm run check
npm run build:release
npm run check:release
```

不重跑未改的核心/browser suite或 preview build。所有 test copies 現只寫 evidence/m2a/fixtures；原 evidence/m1b 不再被本輪測試使用。完整新來源／產物的 per-file bytes/SHA、精確新舊差異、前後環境 Snapshots、主代理 browser references 與命令結果均寫 evidence/m2a。固定證據命令為 node scripts/m2a-evidence.mjs，不呼叫會覆寫舊 evidence 的歷史生成器。

root 應審查 source-diff.json、artifact-diff.json、wrangler.jsonc、candidate.json，確認新 site 僅兩個 HTML banner 變更，才另發 M2B。此輪沒有 push/deploy 放行；無新增權限或依賴需求。
