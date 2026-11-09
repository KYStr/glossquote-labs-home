# 本地來源與責任盤點 — 2026-10-29

## 範圍與基線

本次共同來源接入包含 61 款既有工具、主頁整合責任與本機工作看板；沒有領取新製作工作。主頁的 15 份產品來源與 GitHub `26525d5f6380915ea95dde879dec769442db0d95` 完全相同。規則載入 commit 為 `f0b5c60a277ce73ce7297b2e7f7a20c78f4c3d4a`，契約 `2026-10-29.1`；新增協作文件沒有改變主頁產品基線。

本地主對話身分：`local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf`。自己的 ACK operationId 為 `local-01a0c75e-ack-20261029-01`，已在登記冊 revision 1 讀回，commit `1b8ef1229b0a3d44ef9db879fcfec6cf366ea699`。這不代表雲端或任何功能對話已簽收。

## 既有工作與保存

- [逐項盤點](inventory.json) 與 `items/` 記錄 61 款的固定 task/spec ID、原對話、固定來源、歷史階段、阻塞、下一步及原證據位置。
- 47 款既有獨立公開 repo 的固定 commit/package.json 均已實讀。47 款產品來源中 1,284 檔與遠端一致，沒有 public/ runtime 差異；本地新增的輔助腳本/fixture 存於 `local-deltas/`。暫存、快取和內部發布輔助程式依雜湊排除。
- 14 款尚無公開來源的候選保存在 `candidates/`，不是新開工或發布批准。影片與逐字稿另保存最新尚未整合的驗證器修正於 `checkpoints/11`、`checkpoints/12`，不可誤用較舊正式資料夾版本取代。
- 61 款既有規格保存在 `specs/`，歷史交接/規範保存在 `handoffs/`，規劃總文件保存在 `local-planning/`。歷史文件內的相對路徑是原工作區證據位置，不表示本分支已有該完整歷史產物。
- [原候選來源雜湊](source-files.json)、[補充保存來源雜湊](additional-source-files.json)、[候選排除項](source-omissions.json)、[補充排除項](additional-omissions.json) 共同說明保存邊界。第三方模型與 runtime 分發不重傳；保留其來源/manifest 與既有本地檔案。
- root 工作樹原本 6 個已修改檔案，以及 untracked 工具成果均保留；原 diff 另存本機。GlossGate 和帳戶設定不屬於本公開來源接入，未公開其程式修改、私人 diff 或憑證。

## 階段不能混用

61 款歷史狀態為 47 款已發布、待外部驗收/仍有具體待驗面向；3 款待主審；11 款受阻。逐項實際限制以 inventory 與各 HANDOFF 為準。新協議遷入時先 `blocked`、spec `reserved`，這是協作接入暫停，不撤銷歷史部署，也不把歷史測試換算成新的 90 分。此次無新產品 accepted、review 分數或部署。

62 個原實作 owner（61 款工具 + 看板）需本人讀規則及自行 acknowledge/adopt-existing。主對話僅處理自身共同主頁/發布整合責任。此份來源保存報告先固定，實際承接結果與 reconciliation 另在共同登記冊及後續收據中追加，不倒填本報告。

本機看板原 owner 是 `local-codex:01a14c66-8960-7021-b431-578746c63de1`；資料與發布整合由主對話維護。原契約明定本機私用，因此其程式與完整私用資料不進公開 repo，已完整本機保存及雜湊盤點。原入口為 loopback 4195；本輪未啟動/停止服務或宣稱已恢復可用。其共同工作登記只記錄範圍、owner、保存與待驗條件。

## 真實預案庫存

本地逐項確認的 61 份規格皆已進入原製作工作，不是未消耗預案。本地沒有發現完整且尚未被承接製作、並已取得新協議獨立完整度確認的可用規格。`FUTURE-IDEAS.md` 等構想不是 ready 庫存。

全域 readyInventory 仍為 **未知**：雲端尚未自行完成 ACK、來源保存、舊工作遷移與 reconciliation；本地原 owner 遷入仍在進行。本地觀測的零份不可拿來宣稱兩端正式庫存為零。兩端完成前不 claim 新 Labs 製作。工具製作 P3；已知可用預案不足 6 時補預案 P1，達 6 時降 P3；目前優先解除盤點缺口。

## 雲端重複與接手方案

從雲端看板取得 28 筆 Labs 歷史回報，確認 5 個同名方向：51 audio-cue-notes、56 flashcards、58 tournament-scheduler、60 contact-cards、61 agenda-conflicts。原作者/獨審提到六候選打包，但第六款身分未在可讀來源明確對應；不能臆測。

本地固定候選已保存，不覆蓋雲端修改。雲端需將對應完整候選與驗收證據先推 GitHub，給出固定 commit、PR、真正 actor 身分與所有檔案雜湊；之後逐檔比對共同基線、實際缺陷修正與回歸證據。採用可驗證修正整合到單一指定候選，雙邊歷史都保留，所有權仍由原 owner 用 offer-handoff/accept-handoff 明確移轉，不能因沒有新回報釋放工作。

雲端現有三筆 pending（agenda-conflicts、flashcards、quality-review）仍留給原雲端承接者本人處理，本地不冒簽、不以自己的同名工作消除此缺口。看板控制權顯示本地不可代行原統籌 ACK，因此不替它確認政策。

## 原雲端統籌待辦

1. 本人取得可追溯 cloud-dot 身分，讀最新契約/基線並 acknowledge。
2. 公開六候選的固定來源、規格、驗收資料與確切清單；各原作者/獨審自行遷入原責任，對應三筆 pending。
3. 與本地五個同名項目完成來源比對、明確選定整合與接手方式；第六項補上身分。
4. 提交自己的完整盤點證據並 reconcile。這些確認不能由本地主對話代辦。

## 本輪檢查

共同協作核心原有 18 項離線測試通過；來源/主頁以 Git blob 與固定 commit 比對。此次沒有執行產品瀏覽器驗收、原生流程或正式站操作；未使用桌面、鍵盤、IME、剪貼簿或使用者瀏覽器。產品未驗部分仍保留，不新增虛假 PASS。
