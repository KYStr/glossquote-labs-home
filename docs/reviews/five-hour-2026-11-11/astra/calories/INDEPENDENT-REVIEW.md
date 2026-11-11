# Calories 固定候選獨立文件維護審查

結論：**FH-QC-A-03 已修復，三項維護要求各 100 分，建議 accepted。** 這是本人讀取公開固定候選後的技術判定，尚未寫入本任務 registry review。

- 任務：`labs-five-hour-calories-repair-20261111`；原 maker `local-codex:01a1c886-7981-73a0-9024-d9223c511862`，claim `fh-calories-claim-20261111030245000`。
- 候選：[PR288](https://github.com/KYStr/glossquote-labs-home/pull/288)，固定 head `76aeb64235e82de05970e18a2e1231859aa1ee2a`；[SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/76aeb64235e82de05970e18a2e1231859aa1ee2a/docs/specs/calories-burned-calculator/SPEC.md)。
- PR 的 base 是 `codex/run5-legacy-repair-20261110`，base SHA 與實際直接 parent 都是 `448bd9fc9865fe65f6014b66f4a2e2d54b76f539`。這是疊加於 PR283 的候選，**不是以 default 為基底的獨立整合 PR**。合併依賴留待主統籌處理。
- 審查者：`local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/five_hour_astra_review`，受派 Astra/ultra；未參與修正製作，未借原作者或主統籌身分。
- 本次未執行作者驗證程式、產品程式或 GUI；自行依 §4.3 撰寫 Python 文件契約模型並對照字面快照。模型通過只證明文件內部一致性。

## 預宣告三面向

| 面向 | 分數 | 可反駁證據 |
| --- | --- | --- |
| spec-corrections | 100 | SPEC §§3.2–3.3、4.3–4.4 現在明確定義每個 controller 事件、accepted/pending 的獨立快照、epoch、錯誤及結果顯示、取消／reset、pagehide／BFCache、報告拒絕和 URL 回收。§§5–6、8 給出 Node 24 ESM 零依賴命令、兩次 build bytes、產品九面向、瀏覽器實測方法與交接停止條件。比較畫面保留各替代活動的估算值；JSON 算術總和的意義與原字面數值保留。 |
| exact-fixtures | 100 | 獨立 Python 3.12.5 exit 0，95/95 checks。3 初始快照、34 完整字面步驟、9 次 delivery payload、3 次 byte-exact 下載、4 次拒絕、6 次忽略晚到交付均吻合。額外 10 個負向／邊界探測通過。原 20 個核心 record 的原始 UTF-8 內容與結構均未變，沿用前輪 20 PASS，未重新計算該核心套件；14 MET 列、兩個數值範圍與整數公式未變。 |
| provenance-and-scope | 100 | Connector 實讀 PR open/draft/unmerged、head/base、4 個 changed filenames；6 個候選檔案公開 raw bytes 皆吻合 connector Git blob。原五檔中只 SPEC/fixtures/BRIEF 有變；AUTHOR-CHECK 與 PROVENANCE-RECHECK 逐 byte 保留。新增 REPAIR-HANDOFF 為文件證據；14 個相對連結均解析至候選內存在的固定檔案，其中 4 份共用文件亦逐一 connector 讀取。原 task/spec/owner 保留，NOT_RUN 清楚，無部署或 ready 冒稱。 |

`rubricComplete=true`、`requiredChecksComplete=true` 只適用以上三項維護任務。正式 review 須先讀回作者同一 fixed candidate 的 submit，再取得主統籌 registry 串行 slot，由本人操作。

## 34 步的獨立推導

1. `state-dirty-error` 共 11 步：60 kg／30 min 中等步行交付 114 kcal；下載 URL 1。輸入改成 `60kg` 後 epoch 升至 2、結果及 URL 立即失效；清理回呼重送不再撤銷第二次。重新開始 epoch 3 後收到 DECIMAL_FORMAT；舊 epoch 1 成功不覆蓋錯誤。dirty／error 下載皆不產檔。
2. `state-cancel-late` 共 8 步：45 min 的 epoch 2 job 取消後保留草稿，171 kcal 晚到仍忽略。epoch 4 job 被 reset 後恢復 60／30／中等步行，epoch 4 的晚到值也不恢復結果。
3. `state-replace-late` 共 15 步：舊 epoch 2 的錯誤 job 被取代；epoch 5 採 `80.0` kg、30 min，快走 `4.8 × 80 × 0.5 = 192`、慢跑 `7.5 × 80 × 0.5 = 300`，JSON total 為 492。報告保留 `80.0`，兩次下載 bytes 一致；URL 1 正常清理，URL 2 由 pagehide 撤銷。返回時保持 hide 後 epoch 6，出廠值、empty、無下載、舊交付無效。

新增交付的算術只核對四種不同 controller job 輸入；不是重跑未變的 20 個核心套件。報告 canonical encoding 用排序 ASCII key、固定陣列順序、無 BOM、單一 LF，與兩個 SPEC 報告字面例及三次 fixture 下載逐字一致。

額外探測：同草稿連按 start、完成後重送 delivery、舊 cleanup 不撤銷新 URL、cleanup 冪等、改回舊輸入仍 dirty、busy 時 pagehide 與六種 inactive 事件、BFCache 後舊 epoch、非 busy cancel／active pageshow、注入小 encoder cap 拒絕下載、活動陣列與 job snapshot 不共用可變參照。完整輸入／預期及結果見 [independent-controller-review.json](independent-controller-review.json)。

## 八節內容覆核與後續狀態

這張表記錄本次實讀內容，與三面向評分分開；沒有執行 `mark-spec-ready`。

| 八節 | 候選實質內容 | 本次文件判定 |
| --- | --- | --- |
| goal | §§1.1–1.2：單次估算與同時長比較、成人族群、估算限制。 | 通過 |
| scope | §§1.3–1.4：14 活動、1–3 比較、gross、雙語及報告；排除每日 TDEE、飲食、儲存。 | 通過 |
| userFlow | §§4.2–4.4：選取順序、Calculate／edit／error／cancel／reset／download／離頁恢復與焦點。 | 通過 |
| inputsOutputs | §§2.1–2.7、3.3：精確 schema／文法／range／錯誤順序／結果／canonical bytes。 | 通過 |
| implementation | §§4.1–4.4、5.1：模組、純核心、事件狀態、快照、URL、Node 24、預覽與零依賴。 | 通過 |
| acceptance | §6：產品九面向，各自連結具體觀察方法與分數門檻；文件候選的產品執行全部 NOT_RUN。 | 通過 |
| tests | §§3.2–3.3、5.2–5.3：20 核心保留、34 字面步驟、額外邊界套件、精確報告、實際 browser／Network／Storage／zoom 方式。 | 通過 |
| handoff | §8：固定來源／claim／候選、逐命令 exits／manifests、兩語證據、NOT_RUN 原因、責任與停止條件。 | 通過 |

**阻止直接 ready／整合的後續條件**：原 spec 的 registry ref 與 criteria 尚未經合法維護套用；必須保留原作者並以固定維護來源完成該程序，再由非作者正式核對八節。疊加 PR 的基底依賴亦須處理。這些是後續登記／整合限制，不是本次三項修正仍有內容缺陷。

**非阻擋限制**：下一個 task 的產品實作，仍須按 §§5–6 真正執行命令、瀏覽器與裝置驗證，尤其 Blob URL 在下載 dispatch 後下一 task 回收，以及 BFCache 的實際 persisted 行為。文件模型沒有代替這些 gate；此處未發現需要增加本次修正範圍的缺陷。

## 證據與重現

- [verify-controller.py](verify-controller.py) 與 [independent-controller-review.json](independent-controller-review.json)：本 reviewer 的獨立模型與 95 checks；不是產品。公開入口可指定 source/candidate/output 目錄，依賴隨附的固定 manifests 與 [prior-core-evidence.json](prior-core-evidence.json) 首輪20核心摘錄；完整重現方式見 [README.md](README.md)。不能只下載單支腳本。可攜版實跑95/95、15個輸入Gitblob通過，見 [reproduction-result.json](reproduction-result.json)。
- [input-manifest.json](input-manifest.json)、[public-byte-verification.json](public-byte-verification.json)、[pr-readback.json](pr-readback.json)、[shared-link-targets.json](shared-link-targets.json)：固定 public bytes、PR 與來源。
- [independent-diff.patch](independent-diff.patch)：本人比較原始五檔與公開候選，只有三檔變動。
- Windows guard 前後 exit 0、完整 User／Machine Environment 與 PATH 指紋相同。原始私密機器指紋只留本地；公開僅保留 [environment-summary.json](environment-summary.json)。
- 未改作者 work、候選分支、registry 或原 owner；未 merge、部署、控制桌面、鍵鼠／IME／clipboard、啟動原生對話、安裝套件或讀取憑證。
