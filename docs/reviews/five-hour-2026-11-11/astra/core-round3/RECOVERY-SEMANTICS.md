# A02 最窄一致語義

現有 core 沒有 `invalidate-spec` action，`invalid` 只是可讀狀態值。未派工的 stale ready 已可用新 mapping task、實際獨立 review、固定 primary 的既有 `apply-spec-maintenance` 回到 draft，再做獨立八節 readiness，不需要新增管理員作業。

這條恢復路徑已由 [獨立程式](effective-readiness-probes.mjs) 實跑：[結果](effective-readiness-results.json)保留第一輪 history 逐欄位相同及全部舊 tasks 不變，新完整來源 mapping 繼承晚到 ancestor，apply 清 readiness，獨立 ready 成功。不是只提建議。

應分開「歷史記錄可讀」與「現在還能當有效庫存」。來源後知資訊不應重寫或刪除過去 accepted/ready 的證據，也不應令整份 registry validate 失敗；但新庫存、承接與恢復判定應共用同一目前資格規則。

對目前已套用的規格，最窄資格語義是：來源閉包現在沒有 known pending/cycle；最新已套用 mapping 保留目前所有已知 makers，其 reviewer 目前仍是非 maker；現有 readiness 的 reviewer 亦非任何目前已知 maker，且仍指精確 document、八節與九產品條件。若 mapping reviewer 本身晚成祖先，換另一位 ready reviewer 不能補回 mapping 獨立性，需新的 mapping。

恢復時檢查最新 mapping 的有效性，保留舊 mapping 的原時點證據。若要求所有歷史 acceptance 永遠符合後知資訊，新的獨立 mapping 也永遠不能恢復該規格，反而破壞合法修復路徑。

production register 亦須在建立 task.specId 引用前拒絕不合格的 stale ready，避免新建紀錄觸發「任何已派工不可換 spec」凍結而阻斷原本合法的新 mapping 恢復。若在新資訊出現前已合法派工，保留舊 task/owner 並拒絕不合格的新 claim；本輪不應暗自放寬既有派工凍結規則，該情境需要明確另行界定的修正路徑。

以上是原 A01 來源獨立性要求在晚到資訊下的一致適用，沒有要求額外 actor 權限、重新替原作者簽名、放寬 accepted/ready 或改寫歷史。實作仍由原 owner 完成，新固定 head 才能重新評分。
