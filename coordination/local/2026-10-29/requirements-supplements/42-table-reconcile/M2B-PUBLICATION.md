# M2B 公開來源發布與中斷後收尾

狀態：**PUBLIC_SOURCE_VERIFIED；正式 hosting／首頁整合未執行，外部待驗。**

2026-10-25 已完成公開來源發布；2026-10-27 依 RESUME-42-M2B-CLOSE 補齊交接與結束證據。這次復核沒有新 commit 或 push。公開 HANDOFF 已載明來源、驗證與未部署狀態，沒有需要另發附加 commit 的缺漏。

- 公開儲存庫：[KYStr/glossquote-labs-table-reconcile](https://github.com/KYStr/glossquote-labs-table-reconcile)。
- 已發布／本機 reviewed copy／目前遠端 main commit：[`35d4dc295459824dd27c924b13d941a606625170`](https://github.com/KYStr/glossquote-labs-table-reconcile/commit/35d4dc295459824dd27c924b13d941a606625170)。
- 遠端 tree：`9b35c659651868ce9ae92fc2eb6c61da54222ff3`。2026-10-27 無認證公開 GitHub API 三個 GET 均 200，確認 public／main／commit 與 59 個 blob 的 mode、size、Git blob hash 一致；本機逐檔 SHA-256 也一致。見 [復核結果](evidence/m2b/resume-verification.json)。
- 發布副本：`C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs/.runs/batch20-browser-release-2026-10-25/owner-42-publish/publishing-copy`。沒有使用根 repository 推送或 force push。

## 固定來源與發布內容

修正後 33 檔 source-set SHA-256：`c49494930c7fe8e5df00384a53dfe031b40e71faded1de7f5a171a884650c8b3`，見 [來源清單](evidence/m2b/source-manifest.json)。相對原 M2A 唯一變更為 `wrangler.jsonc`、`scripts/release.mjs`、`test/deployment-config.test.mjs` 的 UTC 日期與對應驗證／反例，固定為 `2026-10-24`。見 [日期修正紀錄](evidence/m2b/date-correction.json)。沒有修改產品 runtime、public、dist 或生成資產。

release manifest SHA-256 仍為 `fa158ccabe8346e1df911d731d1d163a09d035766ad19f6cac3654107befdd1c`；13 個資產共 78,326 bytes，工具資料夾與發布副本逐檔一致。原 M2A source manifest 本身仍為 `73e5986c4461502b40debdb9174578d73ba2849c08a7cd50ffba855ec0f698d9`；封存 M1B release manifest 仍為 `d018c185ebd4b716881518eb15007462a7cea1793bca09b8ca97e42d28410408`，其資產也逐檔符合。舊證據沒有覆寫成修正後來源。

公開 allowlist 共 59 檔：33 個固定來源、完整 13 檔 preview dist、8 份產品規格、1 份 release regression 所需的相對路徑 M1 fingerprint、2 個固定 manifest，以及公開安全版 README／HANDOFF。生成的 release-artifacts 未追蹤。內部 chat 契約、原始環境／帳號紀錄、profiles、.runs、憑證和其他工具沒有納入。見 [allowlist](evidence/m2b/tracked-allowlist.json)、[逐檔 bytes／SHA-256／Git blob 清單](evidence/m2b/tracked-inventory.json)、[復核掃描](evidence/m2b/copy-resume-audit.json)。

## 驗證與執行紀錄

|發布副本檢查|結果|
|---|---|
|`node --test test/release.test.mjs test/deployment-config.test.mjs`|22 PASS、0 FAIL、0 skipped，exit 0|
|`node scripts/check.mjs`|exit 0|
|`node scripts/release.mjs build`|exit 0，產物符合固定 manifest|
|`node scripts/release.mjs check`|exit 0|
|GitHub public／main／commit／59 檔 tree|發布時與 10/27 復核皆符合|
|本機 59 檔／工具來源 33 檔／兩份 release 13 資產|10/27 逐檔雜湊符合|

見 [發布副本驗證](evidence/m2b/copy-validation.json)、[發布收據](evidence/m2b/publication-receipt.json)、[34 個實際命令總表與原始命令證據連結](evidence/m2b/execution-ledger.json)。未變更的核心／UI 測試不重跑為新版驗收；復工時來源及產物完全符合已驗版本，沿用相關 PASS。

歷史失敗照實保留：首次副本掃描把 HTTPS 中的 `s:/` 誤判為 Windows drive，修正分類器並驗證六個合成案例後通過；首次復工 guard 包裝把 PowerShell script 後的 `$LASTEXITCODE` 當作原生命令 exit code，未保存該次 guard snapshot，改用呼叫成功狀態及 JSON `Status` 後完成完整比較。兩者均見總表，不計作 PASS。建立前兩次 repo-not-found exit 1 是已認證 owner 的預期不存在結果；create／push／遠端驗證均 exit 0。

## Git 與完整 Windows 環境

發行後 Git guard 當時已 exit 0。10/27 再驗原始 guard，並另存復工前／後 fingerprint，全數一致，沒有更動或還原任何 Git／auth 設定。

10/25 的結束 Windows snapshot 因中斷未寫完；10/27 補做復工前與結束 guard，完整 User／Machine `Snapshots` 與 10/25 起點一致。這是復工時的比較，不回填為 10/25 即時量測。PATH、TEMP／TMP、所有 Environment-key fingerprints 全部一致；User PATH ExpandString／834 chars，Machine PATH String／1,227 chars，兩者 ephemeral entries 都為 0。見 [環境比較](evidence/m2b/environment-comparison.json)、[原始起點](evidence/m2b/environment-before.json)、[復工前](evidence/m2b/environment-resume-before.json)、[復工後](evidence/m2b/environment-resume-after.json)。沒有讀取憑證值、安裝套件、改動持久環境／系統設定或停止既有程序。

## 尚未驗證與交接範圍

主代理既有 Chromium 145.0.7632.6 r1 核心證據為 28 PASS、0 FAIL／禁止事件、cleanup PASS，12 個人工／條件 NOT_RUN 保留。包含兩語 201 列取消競速（5,000 列取消已通過）、真 200% zoom、native dialogs、實體鍵盤／IME、AT／真機及 heap／BFCache 內部。M2A 只移除兩個候選提示節點的 delta 與舊 browser 證據分別保留，本輪沒有新增 browser 驗收宣稱。

正式 Cloudflare routing／HTTP headers／可用性、hosting、雙語首頁整合與外部驗收仍待主代理後續階段。本輪未執行 browser／native／OS 輸入／server／部署／首頁操作、未另委派，沒有新增 ZIP。主代理可使用 [M2B 證據複本雜湊清單](evidence/m2b/evidence-copy-manifest.json) 整合既定單一交付 archive。
