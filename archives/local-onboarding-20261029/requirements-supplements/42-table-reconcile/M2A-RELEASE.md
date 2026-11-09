# 兩份表格對帳 · M2A 發布來源準備

2026-10-25（Asia/Taipei）。狀態：**BROWSER_CORE_PRIMARY_PASS_MANUAL_RETAINED / M2A_SOURCE_READY_FOR_PRIMARY_REVIEW**。正式站未部署，GitHub 未推送，外部驗收待進行。此輪不是 M2B 放行。

## 已驗基準與保留項

主代理親自執行的 B20-BR42 r1：28 PASS、0 FAIL、0 禁止事件；parent-cleanup PASS，Chromium 145.0.7632.6。兩語 5,000 列真取消、完整 JSON/TXT 下載、2,001 列分頁、320px、protocol keyboard、真 pagehide 可見清理、Network/Storage 均通過。讀取收據後的摘要、原檔 SHA-256 與 12 個 NOT_RUN 見 [browser-primary-provenance.json](evidence/m2a/browser-primary-provenance.json)。本對話沒有啟動 browser 或服務。

201 列取消競速未及時（5,000 列已實際覆蓋取消）、真 200% zoom、原生儲存／選檔、實體鍵盤與 IME、AT／真機、heap／直接 Blob revoke／BFCache 內部觀察仍為 NOT_RUN，沿用使用者允許的人工／條件保留，沒有轉成 PASS。原 M1/M1B、owner harness 與舊 browser execution receipts 不修改。

## 精確 HTML 差異

只在 release HTML 移除每語 introduction 裡唯一且字串完全相同的候選 `<p class="preview">…</p>`，中文減少 69 bytes，英文減少 68 bytes。對已驗 M1B 的兩語 HTML，各自精確移除這一個節點即可得到 M2A；其餘 head/body 全部逐 byte 相同。11 個非 HTML release 資產（含全部 JS/CSS、headers、robots、sitemap）不變。

public 與 dist preview 仍保留 noindex 及原候選提示。建置器依固定 public hash 重建 expected，只允許 SEO head 轉換與上述唯一節點移除；沒有擴大成任意 body 字串替換。檢查器仍拒絕其他 body 改動、提示還原與 manifest+asset 共同竄改。

原 active M1B 產物完整驗證後，移至 [before-release-artifacts](evidence/m2a/before-release-artifacts/) 保存；沒有刪除或覆寫。當前 [release-artifacts/site](release-artifacts/site/) 是新 M2A 產物，舊版 [manifest](evidence/m2a/before-release-artifacts/manifest.json) 仍為 `d018c185ebd4b716881518eb15007462a7cea1793bca09b8ca97e42d28410408`。舊 evidence 中的歷史 hash 不改為新版數值。

## 靜態部署設定

[wrangler.jsonc](wrangler.jsonc) 使用純 JSON 子集，離線用 Node 驗精確欄位，沒有新增解析套件。

- name `glossquote-table-reconcile`，compatibility_date `2026-10-25`。
- 只有 `reconcile.glossquote.com` 的 custom_domain route；workers_dev、preview_urls、send_metrics 均 false。
- observability.enabled、logs.enabled、logs.invocation_logs、traces.enabled 均 false，遵循本輪使用者的明確隱私設定。
- assets.directory `./release-artifacts/site`；run_worker_first false，html_handling/not_found_handling 均 none。
- build.command `node scripts/release.mjs build`。沒有 main、runtime Worker、bindings、付費儲存、account ID、vars、secret 或新增依賴。

readDeploymentConfig 同時納入 check 與 release build/check，拒絕額外欄位、其他 domain、Worker 執行、遙測、儲存及不符的 build command。原 canonical `/index.html`、`/en/index.html`、hreflang 與 sitemap 約定不變。

本輪沒有安裝或執行 Wrangler、schema CLI、dry-run、帳戶／DNS／憑證操作或部署。這是離線設定及產物驗證，實際 Cloudflare routing／headers／可見性由主代理後續部署階段驗證。官方欄位參考與 skill 範圍說明見 [references.md](evidence/m2a/references.md)。

## 驗證與固定值

|命令|Exit|實際結果|
|---|---:|---|
|`node --test test/release.test.mjs test/deployment-config.test.mjs`|0|22/22，0 fail、0 skipped|
|`npm run check`|0|12 public、25 語法檔|
|`npm run build:release`|0|13 assets、78,326 bytes，BUILT_OFFLINE|
|`npm run check:release`|0|CHECKED_OFFLINE|

stdout 與結束碼見 [commands.json](evidence/m2a/commands.json)。沒有無理由重跑產品核心／UI 替身／原 preview build，既有 58 項核心與 M1B 全 suite 證據保留。test/toolchain 只更換測試暫存根至 M2A，避免後續命令碰凍結 evidence。

- M2A source-set（33 檔／185,414 bytes）：`9a5d367350f5bcc755fe05f5ef102b78306dd9edbef2408beaa6c97f5bf9ec47`。
- source-manifest 本身：`73e5986c4461502b40debdb9174578d73ba2849c08a7cd50ffba855ec0f698d9`。
- 新 release site-set：`3e5d00db4a6093640cb10af547f7f8f27e8fb3584c526019ff6839a21cea640d`。
- 新 release manifest（3,892 bytes）：`fa158ccabe8346e1df911d731d1d163a09d035766ad19f6cac3654107befdd1c`。
- wrangler.jsonc（603 bytes）：`fbdf13b1327bac38bd7d8823253c61787c1dc6c2ee1515620cb829285bd04f16`。

set hash 是排序後各檔 `path + NUL + bytes + NUL + sha256 + LF` 的 SHA-256。逐檔值見 [source-manifest](evidence/m2a/source-manifest.json)／[release manifest](release-artifacts/manifest.json)；精確 patch、保護區與 before/after 比對見 [changes.patch](evidence/m2a/changes.patch)／[verification.json](evidence/m2a/verification.json)。環境 guard 前後完整 Snapshots 相同。

主代理 r1 的完整 browser 綁定仍指向舊 M1B HTML；本輪以精確 byte delta 保留既有核心驗收，不改舊 harness／收據或聲稱重新跑過新版 browser。主代理應先獨立審查這份兩節點差異、設定與新 manifest，再下 M2B 指令允許原對話使用審核 publishing copy 推送。正式站、首頁整合、公開 commit 與外部驗收均尚未完成。
