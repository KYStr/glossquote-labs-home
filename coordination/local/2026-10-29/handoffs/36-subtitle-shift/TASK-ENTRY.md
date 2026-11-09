# B19-36-M2

<!-- PUBLIC-SNAPSHOT-START -->
2026-10-19：主代理已依固定 M1 的 scoped browser acceptance 明確 GO M2；不是外驗完成。正式來源候選及公開 GitHub 由本原功能對話負責，M3 部署與首頁由主代理負責。

本輪新增正式工具鏈、exact static-only config、15 檔正式產物與 assets 外 manifest。M1 public 13 檔原樣固定，production HTML 僅 head SEO／JSON-LD 與兩個精確核准 footer 標籤替換。`test/check/build/build:production/check:production` 通過；102 有斷言案例 + 1 fixture runner；5216 production HTTP 43 checks 通過；Wrangler 4.147.0 dry-run exit 0、1702 runtime 檔前後一致；8 個 CLI 反向案例如預期拒絕。最終 release/source-publication receipt 見 [HANDOFF](HANDOFF.md)。

公開來源目標：[KYStr/glossquote-labs-subtitle-shift](https://github.com/KYStr/glossquote-labs-subtitle-shift)，branch `codex/subtitle-shift-m2`。本狀態檔是 source-candidate checkpoint，精確 published commit 與 ZIP receipt 由 Git／外部交付記錄固定，不在檔案中自我引用。

主代理 M1 browser consolidation：30 PASS／17 scoped PARTIAL／6 manual NOT_RUN，另有 native large paste `NOT_RUN_ENVIRONMENT`。真 IME／AT／native zoom／native save與real-device／low-end與virtual keyboard／real crash 等排除原樣保留，詳 [primary summary](docs/M1-ACCEPTANCE-SUMMARY.md)。此對話不執行任何 browser/CUA/native UI，不部署，不更新首頁，不宣告外驗完成。
固定 M2 code/docs 候選（55 檔，排除三個可變狀態檔）SHA-256：`3c293e19b7f15c312811f83dff8b76433ad0fe4e3ecd853844d9de9375530c82`。
<!-- PUBLIC-SNAPSHOT-END -->

## M2 工作區最終 receipt

M2 來源已發布至上述 PUBLIC repository，branch／default branch `codex/subtitle-shift-m2`，遠端固定 commit `8cd25b8d39eb426cfbe13b6181e83b05fe87f42a`。直接取自該 commit 的 ZIP：根 `.runs/github-publish/glossquote-labs-subtitle-shift/m2-20261019-01a1520e/subtitle-shift-source-8cd25b8d39eb426cfbe13b6181e83b05fe87f42a.zip`，127446 bytes、58 files／64 entries，SHA-256 `d5092d9b1d97fbbe26bf5012cdfe3257f0718e4407a95c209a39fd210c2a0fcc`。逐檔與 Git blobs 相同；解壓後六個必要命令均 exit 0。環境及 Git settings 前後 guard PASS、無 drift。完整 manifests／命令／邊界見 [HANDOFF](HANDOFF.md)。

狀態為等待主代理獨立 M2 驗收；M3 部署與首頁交由主代理，仍未部署、未執行 UI、未宣告外驗完成。上方 PUBLIC-SNAPSHOT 保留發布時 checkpoint，本段為 workspace-only 最終 receipt。

## R1 task entry 歷史（已由上述 M2 GO 取代）

2026-10-19：W19-36-R1 的 M1 CLI 修正候選已建立，等待主代理獨立複驗。完整 M1 尚未通過；B01–B28 全部為 NOT_RUN_USER_FOCUS_INCIDENT。M2 未放行。

交付條件：雙語本機候選、確定性核心與 C01–C40、Worker／revision／下載 URL 狀態契約、零依賴工具鏈、閉合 noindex 產物、127.0.0.1:4216 HTTP、前後環境 guard 及固定 hashes。詳細結果見 [HANDOFF](HANDOFF.md)。

R1 修正 public/protocol.mjs、test/state.test.mjs，新增 test/protocol.test.mjs；重建 dist/protocol.mjs，並更新三份狀態紀錄。拒絕稀疏／額外／symbol／accessor 陣列，逐段比對 canonical 輸出與實際 UTF-8 bytes，檢查 Unicode／行數／code points／支援子集合及錯誤碼的 field／位置語意。未變更核心、controller、app、timer、規格或其他來源檔。

R1 gate：npm test exit 0（88 個有斷言案例；Node 顯示 89，另含一個 fixture 模組自動載入項）、npm run build exit 0、npm run check exit 0（existingBuild IDENTICAL）、npm run dev -- --smoke exit 0（35 HTTP checks）。三個主代理反例與 controller 拒絕／result null／禁下載／保留草稿通過；29 種真核心 error 與 1 MiB／2,000 cue 真成功回覆仍通過守衛。環境前後指紋一致。初版反向工具鏈證據原樣保留，未因未變的工具鏈重跑。

R1 來源候選 SHA-256：43f921617c3478558b113bc39a666a017bd54274478179c3a8746bdca1c5f5a0

R1 預覽產物 inventory SHA-256：0326098381c7f70510374488259b1dd50a3a9a0e95a1b31390e02ab0bcc06404

最新工作區證據（未隨可攜來源包）：根 .runs/subtitle-shift/m1-r1-20261019-01a1520e/。28 個來源檔及 13 個產物逐檔 bytes/hash 已凍結；HANDOFF、TASK-ENTRY、project.json 的狀態文字不納入自我引用雜湊。初版候選與完整歷史證據仍在根 .runs/subtitle-shift/m1-20261019-01a1520e/，其 hash 已由 R1 取代。

requested gpt-6.1-sol/max；backend identity 未獨立確認，沒有以自述驗證執行模型。現有 threadId 未獨立記錄，保留 null。

本輪不發布 GitHub、不部署、不更新首頁、不建立 production 候選、不新增依賴、不操作 browser/CUA/native UI。主代理先獨立審查此候選；必要 UI 需真正隔離能力及另行放行。M2 僅於主代理書面 GO 後由本原功能對話繼續，M3 部署／首頁由主代理負責。
