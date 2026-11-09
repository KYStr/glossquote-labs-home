# B20-47-M1 任務紀錄

2026-10-23（Asia/Taipei）。本原功能對話只執行 M1，requested gpt-6.1-sol/max；backend 未獨立核實。不推送、不部署、不另開 chat 或子代理、不開 devserver，不執行瀏覽器／桌面自動化。

已讀本工具 14 份自包含規格、root AGENTS、安全基線、產品論述和完整家族設計系統。本工具 docs/DESIGN-SYSTEM.md 與家族版 SHA-256 相同。規格及 docs 唯讀。

完成定義：實作真 ZIP STORE/分包/索引、可操作雙語靜態頁、取消與清理、全量離線 oracle、check/build、固定來源 hash 和交接。Browser/Network/Storage/原生項目維持 NOT_RUN_USER_FOCUS_INCIDENT，由主代理另行驗收。

## 介面決策

Product App 模式；使用者是要將多個附件交給有單檔上限的收件端，主要物件是所選檔案與可下載分包。輸入留記憶體；上限含 ZIP overhead，郵件傳輸編碼另留空間。經常操作是選檔、設定上限、開始分包；移除相鄰檔案，進度旁有取消；索引緊鄰結果。FAQ 放 disclosure。

桌面：`[品牌／語言] [選檔清單（主欄） | 上限／開始（輔欄）] [各 ZIP 與成員／下載]`。
窄版：`[品牌／語言] [選檔／清單] [上限／開始／取消] [各 ZIP／索引]`；不使用固定 action 遮擋內容。

依 TASKS 順序：T00 scaffold → T10 core/oracle → T20 UI/state → T30 邊界/SEO/evidence。初始 git status 含其他既有修改；不觸碰、不還原。

## 本輪結果

T00 2 tests、T10 22 tests、T20 34 tests、T30 42 tests 均全數通過；各輪 check/build exit 0。最終 Node v24.14.0；11 個 preview 資產逐 byte 複製至 dist。四輪的長測試前後 Environment guard 皆與入場快照完全相同。

自查時補強 CRC32 exact string/length（拒絕 numeric 與尾端換行）和 worker jobId 尾端 whitespace；最終 T30 已涵蓋這些輸入。另有一次 apply_patch 前置驗證拒絕同一路徑 delete/add，0 檔套用；改用 Update 後成功。沒有失敗測試被刪除或改成 skip。

收尾 freeze 證據腳本首次 exit 1，因文件連結指向尚未建立的腳本報告；改成先建立 PENDING 目標後再查連結／寫入完整報告，原始失敗保留 evidence/m1/freeze-attempt-1.json。未因此修改來源或重跑已通過且輸入未變的 T30 tests。

固定 source/spec SHA-256 `d5c4a4a622a05040c0ec228323b4c7bb609d7c8aaf46cf61841b780a4284d79f`（43 files；排除可變交接／證據）；詳 [source manifest](evidence/m1/source-manifest.json) 和 [HANDOFF](HANDOFF.md)。僅提交 M1 候選供主代理驗收，未發布、未部署、未做真 browser／原生操作、未開 server。後續 M2 必須有具體放行。

## B20-RP-47：M1B 離線發布準備（2026-10-23）

先完整閱讀 `.runs/batch20-release-prep-2026-10-23/TASK.md` 並對照現有 source/serve/CSP、M1 manifest 和交接。本輪限制為本工具 package/.gitignore/scripts/test/交接/M1B/evidence/m1b/release-artifacts；保留 public/dist/舊 evidence。requested gpt-6.1-sol/max；backend 不以自述核實。

已建立固定 origin、獨立 build:release/check:release、exact manifest、重建 expected bytes、HTML tokenizer/語義 SEO 驗證及原 headers 等價配置；release-artifacts/site 有 14 檔＋sibling manifest 共 15 檔。測試全部在合成 copy；既有 style-contract fixture 僅移到 m1b，防止寫入舊證據。

targeted 39/39 pass；固定最終 full suite 81/81、check、build:release、check:release 全 exit 0；capture-m1b exit 0。未重跑原 preview build。兩輪長測試前後環境一致，public/dist/舊 M1 evidence 共 48 檔相同。

M1B source SHA-256 `e202bda39f4618bcba3ca5fc1d7932c746daa3862101b8944380e94948173d9f`；artifact SHA-256 `422ac6779ef7208e57888530b413726d987b7db3f9f5b21104d3d4afcd3182cf`。見 [M1B-RELEASE](M1B-RELEASE.md) 與 [本輪 manifest](evidence/m1b/source-artifact-manifest.json)。本輪未發生失敗測試或 persistent drift，沒有安裝、服務、憑證、Git/auth、browser/native 操作或遞迴委派。

狀態 M1B_OFFLINE_PREP_AWAITING_PRIMARY_REVIEW；browser 等 NOT_RUN_USER_FOCUS_INCIDENT。下一步主代理獨立驗證，再決定必要 browser gates 與具體 M2 放行；未推送／部署／首頁納入。

## RESUME-47-M2A（2026-10-27）

沿用B20-47-M2A授權，先盤點中斷前實際檔案／舊artifact保存／commands／environment。已確認67/67相關tests、check/build:release/check:release與後置guard完整留存且各子命令exit0；外層工具回覆沒有回收，保留此區別。未為補外層回覆重跑通過命令，未覆寫舊M1/M1B證據。

發布變更限wrangler strict配置、release-only候選span移除、相關check/tests與M2A證據；public/dist/核心Runtime保持不變。compatibility_date維持2026-10-24；無main/runtime Worker、依賴或權限新增。舊15個release artifacts已完整移入evidence/m2a/previous-release-artifacts，hash相同。

復工seal／integrity各exit0：53 source、15新artifact、15舊artifact、61 protected files正確；source/config未在保存commands後改寫。環境guard與原入口相同。source-set `09a6767793ade734e5adf6f02595a354bab25a2f6993209dd0241777d8a1ac0c`，manifest `ec2021a4b64b38044f2684135dcf40b47c07517838ba12c74abf5940bfcaa91a`。

root browser r1保留原44 PASS/16 NOT_RUN/2 harness FAIL；cancel補驗6 PASS，原transport FileList後置誤拒已由root排除。此輪owner沒有browser/native/server，未GitHub/deploy<LOCAL_USER>/命令/hash/人工NOT_RUN見 [M2A-RELEASE](M2A-RELEASE.md)；待root審查再放行M2B。

## M2A入口轉址補充（2026-10-27）

按root具體指令，先核對並保存原M2A完整十五檔，再只改release.mjs與release.test.mjs，加入同首頁固定三行_redirects（真LF、65 bytes），manifest與output allowlist涵蓋。相關55/55、check/build:release/check:release均exit0；新增缺規則／錯目標／302／CRLF／字面escape及asset+manifest同改負例，拒絕而不自動修復。

原14個正式site檔、public/dist/runtime/CSP/wrangler/canonical未變，90個protected files與前後環境相同。最新source-set8e7c7ea1bc55d62ad7afe198359347aacb727694df1d04a76590b43cc99229bb、manifest7bfaadd07f9e7d3ca9bab9006495b60b1c77049e3c03e81624f4a1a52c69dc99。詳 [入口補充證據](evidence/m2a-entry-redirects/README.md)。不重跑已過browser，不push/deploy/home，等root再次驗證。


## B20-47-M2B：指定獨立公開來源發布（2026-10-27）

依root具體M2B放行，在reviewed publishing copy以既有CLI auth完成 https://github.com/KYStr/glossquote-labs-file-bundler PUBLIC發布，verified commit 5443cb3443118f195ba19083872999b199a01402，branch codex/source-publication。來源53檔逐path/bytes/SHA/blob/commit記錄完整，6個fixture純合成；排除task-only/internal/raw evidence/scratch/credentials。copy及remote clean-clone四項check/build/release命令皆exit0，16 artifacts/manifest hash與核准M2A入口轉址版本相同；未重跑未變產品tests/browser。Git/Windows前後指紋相同，原source/protected evidence保留。一次掃描負例literal誤拒已保留attempt記錄，無產品改動。詳evidence/m2b/README.md與publication-receipt.json。無部署、首頁、UI/native、另ZIP或委派；本階段source publication完成，外驗與live release由root接續。
