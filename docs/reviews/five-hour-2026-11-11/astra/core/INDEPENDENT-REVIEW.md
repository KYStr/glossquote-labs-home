# Core 維護套用路徑：獨立審查

**結論：需修正，不能接受此固定候選。** 目前一項 blocking：FH-CORE-A-01。已知 accepted maintenance A → B 的來源鏈若只在 mapping 列 B，A 的實際製作者會被遺漏，能自評 mapping 並將規格標 ready。這個缺陷已在純核心與真實候選 adapter 的離線假 transport 各自重現；不是推測，也沒有寫正式 registry。

受審為 [PR295](https://github.com/KYStr/glossquote-labs-home/pull/295) 的固定 `e1c4d5d50b23cd8e9449632d3eb697f217dea305`，實際 parent `13184525dadf56e2e451e4509015daaeecfa08e9`。六個變更檔：AGENTS、workflow、commands、pure core、GitHub adapter、既有 test 檔。六候選與六 parent 檔已實讀，原始 bytes 對應 GitHub connector 的 12 個 Git blob 全等。[輸入清單](input-manifest.json)及[雜湊讀回](public-byte-verification.json)固定這個版本；未以後續本地修正取代受審內容。

本 reviewer 身分為 `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/five_hour_astra_review`，未製作候選、未修改 maker work，也未在本 core 審查執行任何正式 ACK/review/apply/ready。測試的假 actors 只存在記憶體資料；候選 primary 常數僅用來測其協議比較，不是冒簽正式主統籌。

以下按[原固定任務](https://github.com/KYStr/glossquote-labs-home/blob/8040cc2dfbbfb40c2ac587133d1c03578deab224/docs/reviews/five-hour-2026-11-11/dispatch/repair-coordination-core/TASK.md)三項預宣告面向評分。評分是對此候選行為的判斷，並非以測試通過比例換算。

| 面向 | 分數 | 可反駁證據與判定 |
| --- | ---: | --- |
| core-transition-correctness | 80 | 精確舊 ref/author/criteria、單次套用、draft/reset、八節與九產品 rubric 分離、原 task/owner 不變、多輪歷史、原子 rollback、重放均通過。但 A01 讓歷任 maker 跨 review/apply/ready，必要不自評不變條件失敗。 |
| scope-owner-provenance | 60 | 40 ID 與 brief 精確一致；指定 primary、無派工限制、同 repo/path/author、原 task/evidence/claim 保存通過。來源解析只取明列 task，已知 maintenance 祖先未繼承；A01 阻止接受。 |
| test-and-adapter-evidence | 85 | 原 49/49、追加 16/16、兩舊 registry validate 均 PASS；固定 mapping JSON、Git blob/base64、bytes、PR head、單 CAS 機制有實跑負向證據。完整 adapter 仍允許 A01 的 7 個 synthetic PUT，因此原套件的全綠不足以證明完整來源鏈。 |

具體重現、程式位置與窄修要求見 [FINDINGS.md](FINDINGS.md)。只需修正可機器辨識的既知來源祖先閉包及 maker 繼承，並在登記、覆核、套用、後續 ready/history 保持一致；不得只在測例手動補 contributor。原 owner 負責修正，再發布新固定 head 後獨立複驗。

實際執行的證據如下，均使用 Node 24 built-ins、無安裝及真憑證。

| 檢查 | 結果 | 證據 |
| --- | --- | --- |
| 候選完整離線套件 | exit 0，49/49 | [摘要](candidate-tests.json)、[完整 stdout](candidate-tests.stdout.txt) |
| reviewer 自寫額外矩陣 | exit 0，16/16 | [逐案結果](independent-matrix-results.json)、[程式](independent-matrix.mjs) |
| 已知祖先遺漏，純核心 | 缺陷重現，exit 0 | [結果](omitted-ancestor-result.json)、[入口](reproduce-omitted-ancestor.mjs) |
| 同缺陷，adapter 全檢查開啟 | 缺陷重現，7 synthetic PUT，exit 0 | [結果](omitted-ancestor-adapter-result.json)、[入口](reproduce-ancestor-adapter.mjs) |
| 既有完整 registry 相容 | r1549、r1568 均 exit 0；ready 2、門檻 40、容量 5/1 不變 | [快照驗證](snapshot-validation.json) |
| 40 個固定 run5 ID | 順序、成員、唯一性精確一致 | [結果](scope-verification.json)、[固定清單](run5-spec-ids.json) |

16 項獨立矩陣涵蓋：明列的五位 makers 不可審 mapping/ready；原 task 完全不動；八文件與九產品分離；同 operation 重放不增 history；第二輪保留前輪 readiness、六位歷任 makers；作者 intervening revision 後 stale apply 拒絕；最後一批操作失敗整批 rollback；未知欄位/替換 rubric 拒絕；空來源只有舊 document byte-identical 可過、source 編修拒絕；PR 移動或關閉、關閉一般 reference 檢查仍不能跳過 mapping、CAS 409、PUT 回應丟失後精確讀回都按預期。

限制不構成新增權限或額外任務：固定 primary ID 是協作身分比對，GitHub 寫入權限與實際 actor 身分仍靠既有受信任流程；它不是新的認證系統。PR head 檢查與 registry CAS 是兩個 HTTP 動作，中間存在時間窗口，沒有宣稱跨 Git ref 的交易原子性。純 core 不連網，只有 adapter 讀固定 bytes；八節語義、九面向 label 與實際 SPEC 的對應仍須真正獨立內容審查。合法維護 accepted 不等於規格 ready 或產品九面向 accepted，race 仍屬 existing-tool-upgrade、不能算新工具庫存。

Windows 永久環境前後完整欄位一致；僅公開 [PASS 摘要](environment-summary.json)，私人路徑與原始 fingerprint 不在此證據包。沒有桌面、本機互動瀏覽器、鍵鼠/IME/clipboard、原生對話框、部署或 merge。重現請用 [README](README.md) 的可攜入口；這份證據保存舊候選缺陷，不代表日後修正 head 的評分。
