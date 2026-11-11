# FH-MAP8：八份已修訂規格的來源映射

Task ID：`labs-five-hour-eight-spec-mapping-20261111`。預定實際承接者 `local-codex:01a1c886-768c-7cc1-adb2-bf050f33316b`，要求 GPT-6.1 Sol / medium。先完成同一承接者的 MAP9 審查，不同時持有兩個 working 任務。

## 目標與非目標

讓八份經維護與獨立內容預審的規格，透過中央已合併的 `apply-spec-maintenance` 流程銜接正確來源、九產品面向及所有實際製作者。不得直接改 registry 的 spec document、來源、狀態、owner、acceptanceCriteria；不得略過 claim、固定候選、獨評、apply 或獨立 ready。

本任務只做位元組相同的映射候選。不得修規格內容、重算或改寫 fixtures、製作工具、部署、修改首頁、合併 PR。不是八款新工具。

## 固定來源

每列取 `docs/specs/<slug>/` 下 BRIEF.md、SPEC.md、fixtures.json、AUTHOR-CHECK.md 四檔，核 SHA-256 及 Git blob，不重新格式化或換行。

| slug | 固定 commit | 維護任務 |
| --- | --- | --- |
| wallpaper-calculator | c2c3f7715023990b1427e052a25c52f1987eaca9 | labs-five-hour-repair-wallpaper-ping-20261111 |
| ping-area-converter | c2c3f7715023990b1427e052a25c52f1987eaca9 | labs-five-hour-repair-wallpaper-ping-20261111 |
| breakeven-calculator | dbbf6eea51e5ea88bb58f34983aa915e584889b4 | labs-five-hour-repair-pricing-20261111 |
| markup-margin-calculator | dbbf6eea51e5ea88bb58f34983aa915e584889b4 | labs-five-hour-repair-pricing-20261111 |
| tax-included-converter | 9dde67ee408491dbfcef0cbadbb6a7f1a876bd02 | labs-five-hour-repair-tax-20261111 |
| stock-profit-calculator | 95ead301f8735dede61bc1911bbc7ed6c4b79bb5 | labs-five-hour-repair-stock-20261111 |
| baking-pan-converter | 8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927 | labs-five-hour-repair-baking-20261111 |
| savings-goal-calculator | 35b2d302033af86e48337b7019a286180d5e8259 | labs-five-hour-repair-savings-20261111 |

所有 repo 都是 `KYStr/glossquote-labs-home`。SPEC IDs 為 `spec-<slug>-20261109`。上表每個 SHA 必須由遠端固定候選和 source receipt 核實；任何不一致立即停在該列，不猜測替換。

中央規則以最新 `codex/initial-publication` 為準；PR295 的已接受 core 與 adapter 已合併於 `5645113ce5e7a1e54d049e93212b72993dfebca4`。用當前已審 core/adapter 驗證，若 blob 改變，先交主統籌核對。

## 既有工作與庫存

- wallpaper、ping 是原 PR270／274 的既有產品續作；本輪產品修正各有另案 owner。映射只改來源紀錄，不能覆蓋產品任務或當成新 ready。
- savings 是既有 compound-interest-calculator 的升級提案，不算新 ready，也不新增獨立重複網站。
- 其餘五份只是可能的新庫存，待主統籌完整去重及獨立 ready。作者不能自行標 ready。
- 必須保留每份原 author、歷史候選、全部有效來源維護任務與 makers。採 registry 中歷史閉包而非只取最近 owner。對作者、來源、claims 的疑問不可自行補造。

## 工作順序與允許修改範圍

先唯讀最新 registry、規則、八份來源、Astra 的 `.runs/five-hour-2026-11-11/astra-review/next-nine-preflight/`。該資料夾名稱沿用舊名，實際只有八份。它是預審而非正式 mapping acceptance；provided 算術紀錄不能改稱自己執行。

先在自己的 `.runs/five-hour-2026-11-11/dispatch/eight-spec-mapping/evidence/READY-TO-CLAIM.md` 整理設計、目前 expected spec snapshots、來源維護 accepted 狀態與 makers。尚未收到串行時段前，不寫 registry 或正式候選。收到時段後由本人 ACK/register/claim/start，最新版本 CAS，精確讀回同 operationId/requestHash/owner/claim 才製作。

工作目錄限定本 dispatch 的 `work/`、`evidence/`、HANDOFF 和必要唯讀驗證腳本。公開僅允許八份 `docs/specs/<slug>/` 的 32 個相同來源檔，以及 `docs/reviews/five-hour-2026-11-11/eight-spec-mapping/`。不可改主工作區原稿、其他對話檔案、共用 core、registry 手寫或首頁。

候選包含 mapping.json、固定 source manifest、HANDOFF.md 及可攜驗證入口。mapping 必須按現行 core 的精確 schema，32 個來源字節一致；八組 expectedAuthor/document/source/criteriaHash、replacement document/source/criteria、mappingRef、sourceMaintenanceTaskIds 都逐項核對。八份 replacement criteria 為各自 SPEC 明列的九產品面向；本映射任務則以八個文件面向評分，不能混用。

候選先公開 PR 並固定 commit，再在授權時段 submit，交非作者 reviewer。映射正式 review 必須驗作者、所有 contributors、claim、PR head、targets、來源接受歷史及八節實質證據。主統籌 apply 後也維持 draft；只有非作者 reviewer 可另行 ready，僅限去重通過且未承接製作的規格。

## 驗收與回報

必要文件面向：goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff；每項至少90且必要檢查完成。引用 Astra 預審時保留它的實測與 provided 界線。

核 32 來源檔 Gitblob/bytes/SHA-256、8 targets、72 產品面向 label、完整 makers 及 maintenance history、相對文件連結、純 core/adapter 對最新 snapshot 的 register/submit 模擬、候選 PR 實際 head。重用未變的既有算術證據，不任意重跑全庫或捏造產品測試。

回報實際修改檔、candidate/PR、本人 task/claim、命令與 exit、證據hash、未驗與阻塞。瀏覽器、產品九面向、正式SEO/部署均 NOT_RUN。遇來源未 accepted、scope/claim 衝突、未知結果、缺失權限、來源 bytes 不符或連續兩輪同失敗無進展，保存 checkpoint 並回主統籌。

不得互動操作本機 browser/native/鍵鼠/IME/clipboard、開視窗/音訊/原生dialog；只用背景CLI與windowsHide。不讀憑證、不改持久環境/globalGit/auth、不安裝、不付費、不遞迴委派。出版前後 Git guard，長automation前後 environment guard。2026-11-11 07:22:08 UTC 收尾，07:37:08 UTC 硬停，保留未完項與接續指令。
