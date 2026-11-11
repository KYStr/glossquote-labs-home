# PR304 九份規格：八節內容與映射獨立預查

結論：固定候選 `4bc6d4e300d315597a4b1ea5feb86f6f2d6fc1c0` 的來源、映射與既有八節內容證據相符，沒有觀察到新增內容阻擋。這是準備檢查，本預查所綁 r1588 快照尚無已登記 mapping task/claim/submission，不是正式八節 accepted 或 ready。核心 PR295 最新固定 93595abc7b2f9c46a07aaaa74418b3882c8901b4 已有本人技術 PASS 證據；正式接受、合法整合與新 mapping 任務流程仍是必要前置。

[PR304](https://github.com/KYStr/glossquote-labs-home/pull/304) open/draft/unmerged；實際 parent `17ac162a0b3e41fb372c91c1be1f7ffbb1631677`，tree `26e2994efd2c430e77bfcefffe6d6f27a40c8c64`。PR 有 44 新檔；另讀 README 共 45 個候選檔，README 原已存在且 1810 bytes 未變，兩種數量不衝突。

本人以 GitHub connector 分別讀取 45 候選與 41 來源，再以公開固定 raw URL 實讀 86 個輸入 bytes、核 Git blob，未採用整合者自己的測試輸出作判斷。40 份 SPEC/fixtures/BRIEF/來源查核文件全部逐位元相同。新版可攜入口另下載 14 個共用連結目標及完整 r1588 registry blob，共 101 個固定輸入；從完整 registry 再核本報告的精確 excerpt，不把 excerpt 自身當外部來源。來源為 legacy `448bd9fc9865fe65f6014b66f4a2e2d54b76f539`、precision `23fa1265837f66fbedc04441db260dbb2a5ed924`、calories `76aeb64235e82de05970e18a2e1231859aa1ee2a`；後兩者的 legacy 祖先亦在 targets 明列。

[可攜入口](reproduce-preflight.mjs)與[獨立檢查器](verify-mapping.mjs) exit 0，[逐項結果](preflight-results.json)：81 criteria labels 逐字等於九份 SPEC 的九產品表，mapping descriptor 的 bytes/SHA-256、九份舊 author/document/source/criteriaHash 皆精確，r1588 當時九份 draft、consumedBy=null、無 task.specId 指向。三個來源 task 均 accepted，owner/claim/submission/acceptance exact candidate 與 SOURCE-HISTORY 原快照一致。159 個相對連結對應候選或 14 個另經 connector 讀取且在可攜驗證中下載核 blob 的共用目標；未由標題數或維護三分數推定文件完整。

八節實質內容沿用本 reviewer 已讀且已獨算的相同 bytes，修正部分另引用自己的 fixed precision/calories 獨評；這次不重跑未變數值套件，也沒有產品/GUI 測試。下表為逐份內容依據，不是已登記的正式分數。

| 規格 | goal | scope | userFlow | inputsOutputs | implementation | acceptance | tests | handoff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| age | 生日/足歲決策 | 年月日借位與下次生日 | 今天、修改、重設、取消 | Gregorian、2/29→3/1、2101生日 | JDN核心/時鐘分層/Node24 | 九產品方法與NOT_RUN | 18核心及3字面控制案例 | 固定來源/另claim/獨審 |
| workdays | 排程與倒推 | 手動假日/固定週末 | count/shift及狀態恢復 | 有向半開區間、±3660、400列 | 有界整數日期、世代與清理 | 九方法及有條件逆運算 | 23核心、3控制、反例/列號 | 同ID/owner/另產品流程 |
| salary | 四基準薪資理解 | 慣例換算、非稅務判定 | 六列結果/修改失效 | 各基準上限、獎金、一次half-up | BigInt有理數與純核心 | 九方法、四基準邊界 | 15核心及3控制 | 不冒稱合法薪資/部署 |
| bill | 付款前每人應付 | 稅/小費均分，非墊款結算 | 基數、尾分與報告失效 | 逐階段整分、前序分餘數 | 精確金額/安全DOM | 九方法及shares總和 | 18核心及3控制 | 原owner/另claim/八節 |
| dew | 結露/生活濕度 | 固定經驗模型、非感測器 | 三結果、分級、錯誤恢復 | Magnus/216.7、定義域與分級 | 單點常數/核心/Worker清理 | 九方法、RH100/邊界 | 19核心及3控制 | 固定模型來源/獨審 |
| cooking | 料理食材換算 | 12食材、240ml模型 | 單位/食材/取消與下載 | 精確有理數、227g/cup來源已修 | BigInt/core/controller/DOM | 九方法、密度與fraction | 20核心及3控制保留 | 固定來源/另產品claim |
| NHI | 指定受僱者估算 | 固定2026表，非所有身分 | 級距/眷屬/負擔方 | 58級、上限3眷屬、half-up | 整數公式、錯誤浮點例已修 | 九方法、58列/半界 | 15核心、58附錄、3控制 | 固定表版更新/責任分離 |
| race | 已知成績估目標 | existing-tool-upgrade | 自訂目標、條件恆等列 | Riegel1.06、四列及選填列 | 純核心、世代/資源清理 | 九方法/可信度限制 | 16核心、條件列、控制案例 | 不開重複站、不增ready |
| calories | 成人單次活動比較 | 14活動、1–3選項、gross | accepted/pending/epoch/取消/離頁 | 精確range/schema/首錯/報告bytes | Node24、核心/controller、URL回收 | 九方法逐項具體觀察 | 20核心沿用、34控制步、95獨立檢查 | milestones/stop/claim/NOT_RUN |

八份同名章節定位於各 SPEC 的 goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff。calories 對應 §§1.1–1.2、1.3–1.4、4.2–4.4、2.1–2.7及3.3、4.1–4.4及5.1、6、3.2–3.3及5.2–5.3、8。

先前獨立證據：[首輪五份未變文件內容摘錄](UNCHANGED-FIVE-SECTION-EVIDENCE.md)對 age/workdays/salary/bill/dew 八節逐份詳述，原算術分別18/23/15/18/19；[precision fixed review](https://github.com/KYStr/glossquote-labs-home/blob/a36e68a4b4afcb2fad575798ad991592df0ea718/docs/reviews/five-hour-2026-11-11/astra/precision/INDEPENDENT-REVIEW.md)關閉 cooking/NHI/race 三缺口，portable143；[calories fixed review](https://github.com/KYStr/glossquote-labs-home/blob/dc46b7e5124afd2e930f709800de6ed16fbfac7f/docs/reviews/five-hour-2026-11-11/astra/calories/INDEPENDENT-REVIEW.md)有單獨八節表與95檢查。這些是 reviewer 自己的工作，不借原作者616/646為本人測試。

非阻擋原文觀察保留：age BRIEF 對既有日期工具缺星期的描述已過時，但真正區隔是借位/生日；workdays 反運算須依端點條件；dew 分級是釘版經驗模型。整合者在 HANDOFF 已揭露這些，沒有悄悄修改來源。race 固定 scope 已清楚是既有 running-pace 自訂目標/簡化流程升級，這版保留 draft、不作新工具庫存。

正式登記需繼承的 maker 集合至少四位：原 cloud spec author、root 整合/legacy maker、precision maker、calories maker；其實際 ID 在結果中列明。本人獨立 reviewer 不在此 maker 集合中，擔任來源 review 不等於製作者。後續實際承接者 claim 時還須正常加入其 actor；不得假稱 root 沒有製作整合。

文件八節內容可接受，與可供新製作庫存是不同結論。本人已直接讀取[固定庫存裁定](https://github.com/KYStr/glossquote-labs-home/blob/0f47e8c0061ee81004b49814e5f7f4f67b891528/docs/reviews/five-hour-2026-11-11/EXISTING-CANDIDATE-STOCK-AMENDMENT.md)（Git blob `8f37f7cf1a96a2b0593c547683c498518ac3ded0`）；該裁定已取代 PR304 HANDOFF 的「其餘八份」計畫，候選 bytes 保留歷史原貌：

| 規格 | 文件八節預查 | 庫存／續行用途 |
| --- | --- | --- |
| age、workdays、salary、bill、dew、cooking | 內容符合，待正式 mapping review | 已有原 build/PR283 維護程式；legacy candidate continuation，保持 draft，不得以無 task.specId 重領製作 |
| race | 內容符合，待正式 mapping review | existing-tool-upgrade，保持 draft，不計新工具庫存 |
| NHI、calories | 內容符合，待正式 mapping review | 尚須另查無既有成品重複；完成合法流程後才可能 ready，現在不算庫存 |

先完成核心正式接受與合法整合，再核對新 task `labs-five-hour-nine-spec-mapping-20261111` 的九個 targets／八節 rubric、全部繼承 makers、實際 owner/claim/submission/candidate；本預查並未證明該新任務已登記。預定實際承接者為 precision 的原 App actor，root 仍須保留為實際整合 maker。只有正式非作者八節 accepted 後才可 primary apply，另獨立考量上述庫存限制與 ready。沒有此程序前不能把本預查或維護三項接受當成 ready。

可攜檢查只重驗來源 bytes、歷史狀態、criteria、連結及獨立性；未重算未變算術、未跑產品/GUI，也沒有 registry 寫入。公開腳本只讀固定公開來源並寫指定全新輸出目錄；不讀認證或持久環境。

核心技術證據為[PR309 固定獨評](https://github.com/KYStr/glossquote-labs-home/blob/7bd26f63ee90edfe1d916161ed6bdb0f384cf81b/docs/reviews/five-hour-2026-11-11/astra/core-final/INDEPENDENT-REVIEW.md)。本預查不宣稱核心已 merge，也不使尚未提交的 mapping 任務正式 accepted。
