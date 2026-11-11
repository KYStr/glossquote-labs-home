# 九份規格映射：正式提交後的獨立八面向審查

結論：建議接受 task `labs-five-hour-nine-spec-mapping-20261111` 已提交的固定 PR304 候選 `4bc6d4e300d315597a4b1ea5feb86f6f2d6fc1c0`。八項文件面向均達 90；九份、72 節的內容證據完整，沒有阻止本次文件映射驗收的缺陷。這是正式提交後的獨立評分，registry review 寫入仍待統籌排程；不是已落盤 accepted、規格 ready、產品通過或部署。

本人 actor：`local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/five_hour_astra_review`。要求設定 Astra/ultra，未獨立確認 backend。本人沒有製作原規格、修正候選或 mapping；來源 review 身分不等於 maker。

## 已核對的實際提交與責任

實讀遠端 r1601，固定 registry commit `945b8b11cc1fb7c98c2c74fd794ed5e94bedeb79`、blob `3f5b2e367cf857b17b85b2d8e7786fe3923ac01e`。任務為 reviewing；owner 是 precision 原實作者 `local-codex:01a1c886-768c-7cc1-adb2-bf050f33316b`，claim `map9-claim-883b52df-a86b-4485-823d-5a4650e602f4`。實際提交入口為候選 `docs/reviews/five-hour-2026-11-11/nine-spec-mapping/HANDOFF.md`；submission evidenceRef 為同 commit 的 mapping.json。

[完整任務快照](registered-task.json)、[原四個 commands](registered-commands.json)與[本人核對結果](binding-results.json)證明 register/claim/start/submit 依 r1598–1601 完成，四個原 command 的 canonical requestHash 逐一符合 GitHub event。九個 targets 的舊 author/document/source/criteriaHash 與當時 spec 全等，新的固定 refs、81 個產品 labels 及 source task IDs 與原 mapping 相符；沒有事後更換 rubric 或範圍。

contributors 精確包含原 cloud spec author、root 整合／legacy maker、precision maker、calories maker共四位，未隱藏 root 製作整合。本人不在集合內，既有 personal ACK 仍符合 contract/baseline。現行 merged core blob `9a766ff99cb412a7b4a8e40f7a9d4b9951ef00e1` 驗證完整 registry，並對此任務做一次純記憶體 review eligibility 檢查；來源 ancestry、makers 與獨立性 gate 通過，specs 未改。該 dry command 沒有傳往 GitHub。

## 八項正式評分

這八項是任務登記前固定的文件 rubric；九份 SPEC 內的產品九面向另存於 targets，兩者沒有混用。[機器可讀分數](scores.json)逐項附證據。[逐規格、逐節分數與證據](per-spec-evidence.json)包含全部 72 格。

| 面向 | 分數 | 主要依據及限制 |
| --- | ---: | --- |
| goal | 98 | 九份受眾、用途、產物與假設清楚；工作日簡介的逆運算措辭不如正文端點條件精確，正文與反例已消除實作歧義。 |
| scope | 98 | 九份邊界、相似工具與固定來源均有實核；年齡舊星期比較過時、露點分級屬經驗模型，保留非阻擋註記。六既有 build 與 race 不作新站庫存。 |
| userFlow | 100 | 初始、執行、修改、錯誤、取消、恢復、切語及下載有效性具體；race 條件列已修，calories 34 步字面狀態可重現。 |
| inputsOutputs | 100 | Schema、容量、首錯、邊界、捨入與報告生命週期完整；沿用本人獨算的相同 bytes，料理227g來源與健保反例修正已核。 |
| implementation | 100 | 核心／controller／DOM、Node24零依賴、雙語、安全輸出與資源清理具體；calories 已補完整命令與生命周期。 |
| acceptance | 100 | 81 labels 與 SPEC 九產品表逐字相符，逐項列觀察方法、實際瀏覽器及未驗 gate；沒有用維護三分數代替八節或產品九項。 |
| tests | 100 | 九份字面案例、邊界／錯誤與重現方法完整；本人先前算術、precision143、calories95 與本次精確 task 綁定形成可追溯證據。未變算術未重跑。 |
| handoff | 98 | 原作者、維護來源、實際 claim/submission、獨評及 apply/ready 分工清楚；原 HANDOFF 八份可補庫方案已被固定庫存修正取代，歷史原文保留並明示優先次序。 |

## 九份的八節內容證據

以下各格都是本人先前已讀的實質內容，並已驗明 PR304 文件 bytes 相同；不是由標題存在或測試數推定完整。

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

八份非 calories SPEC 以同名八節定位；calories 對應 §§1.1–1.2、1.3–1.4、4.2–4.4、2.1–2.7及3.3、4.1–4.4及5.1、6、3.2–3.3及5.2–5.3、8。各份完整固定 document ref 見逐節 JSON。

既有內容與數值證據：[PR313 固定預查與101個輸入驗證](https://github.com/KYStr/glossquote-labs-home/blob/2ea9784222f60f720d531b45cb2d67fbe4cb82d9/docs/reviews/five-hour-2026-11-11/astra/nine-spec-preflight/INDEPENDENT-PREFLIGHT.md)、[五份未變文件詳述及93筆本人先前數值](https://github.com/KYStr/glossquote-labs-home/blob/2ea9784222f60f720d531b45cb2d67fbe4cb82d9/docs/reviews/five-hour-2026-11-11/astra/nine-spec-preflight/UNCHANGED-FIVE-SECTION-EVIDENCE.md)、[precision固定143檢查](https://github.com/KYStr/glossquote-labs-home/blob/a36e68a4b4afcb2fad575798ad991592df0ea718/docs/reviews/five-hour-2026-11-11/astra/precision/INDEPENDENT-REVIEW.md)、[calories固定95檢查與八節表](https://github.com/KYStr/glossquote-labs-home/blob/dc46b7e5124afd2e930f709800de6ed16fbfac7f/docs/reviews/five-hour-2026-11-11/astra/calories/INDEPENDENT-REVIEW.md)。來源同一固定 bytes，這次不重算；沒有把原作者616/646當本 reviewer 新測。

## 本次實際執行與可重現範圍

Node v24.14.0 執行 `node reproduce-binding.mjs NEW_OUTPUT_DIRECTORY`，exit0。新下載9個固定公開輸入：r1601完整registry、merged純core、4個mapping候選資料、2個本人預查證據、固定庫存裁定。逐 Git blob 驗證，再檢查4個原commands的hash、九targets、八criteria、四makers、實際submit與current ACK。[可攜結果](portable-result.json)、[輸入bytes清單](download-verification.json)、[GitHub實讀快照](remote-snapshot.json)均隨附。

本入口只補足「預查 → 正式任務」綁定，不再次執行101個預查輸入或數值套件；完整預查可用PR313自己的入口另外重現。以上維護／文件檢查已足夠本task要求。產品實作、真controller、GUI/Network/Storage/可及性裝置、正式站與部署均未在本task執行，不冒稱PASS。

## 庫存與後續動作限制

[固定主統籌裁定0f47e8](https://github.com/KYStr/glossquote-labs-home/blob/0f47e8c0061ee81004b49814e5f7f4f67b891528/docs/reviews/five-hour-2026-11-11/EXISTING-CANDIDATE-STOCK-AMENDMENT.md)已被作者正式submission明確引用，優先於PR304歷史HANDOFF的八份ready計畫：

| 規格 | 文件結論 | 正式套用後用途 |
| --- | --- | --- |
| age、workdays、salary、bill、dew、cooking | 八節可接受 | legacy candidate continuation；維持draft，保留原build/owner，不重做新站或算未製作庫存。 |
| race | 八節可接受 | existing-tool-upgrade，維持draft，不計新工具庫存。既有running-pace固定40a7dc689e8e2fc2c527c323ca68398d95e9db19之§3已有時間＋距離，§4已有相同四目標Riegel；新增僅自訂目標及簡化流程。 |
| NHI、calories | 八節可接受 | 需另確認中央來源未有成品／製作承接，並在合法apply後由非作者fresh核對再ready；本報告不自行計庫存。 |

本次沒有registry mutation、apply、ready、merge、產品accepted或部署。正式review寫入時仍要fresh核同一task/claim/submission/PRhead、當前makers與CAS；快照不能取代當時狀態。primary獨占apply權是協作身分規則，沒有新增平台認證保證；PR head核對與registry CAS亦不是同一交易。

必要阻塞：本候選文件映射內容無未解阻擋；正式紀錄尚待統籌授寫入slot。非必要改善限上述三類舊文案，不要求為此改候選、重算或延長本輪。Windows環境完整前後指紋相同，未碰UI、憑證或持久設定；公開版本只保留guard摘要。
