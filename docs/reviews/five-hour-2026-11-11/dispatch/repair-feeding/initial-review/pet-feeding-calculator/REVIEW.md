> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：6b411347acdc4f66572048b257fba7baf6656f51088cb7444a2422dc8421dbf7。

# 寵物餵食量計算獨立文件審查

- 文件結果 **FAIL**。建議退修。REG-01 亦阻止標為可開工 ready。 產品九面向皆 **NOT_RUN**。
- Task `labs-pet-feeding-calculator-spec-20261109`。Spec `spec-pet-feeding-calculator-20261109`。[PR #263](https://github.com/KYStr/glossquote-labs-home/pull/263) 為 open draft。
- 固定候選 `282fb18912c0435257c13b96b5562e410e3a2521`。Reviewer `local-codex:01a1c87c-fc33-75e3-9aee-09999e6d38b1`，未參與本候選的製作。
- 登記冊 r1530，blob `e01da965f28e5248ca13158094ca356254a25c2b`。原承接者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，claim `muse-r4-pet-feeding-calcul-claim-20261109T155737Z-5b1f1`。
- 核對範圍為 BRIEF、SPEC、fixtures、AUTHOR-CHECK。四檔本地 Git blob 均與 PR diff 及固定 GitHub 檔案相同。來源與讀回紀錄（本地證據：../intake.json）

## 八節逐項查核

| 面向 | 分數 | 達標 | 實際證據 |
| --- | ---: | --- | --- |
| `goal` | 94 | 是 | 桌面比較飼料與店內手機查包裝的場景明確，首例結果可驗。只印 kcal/cup 的包裝無法完成必填欄，宜縮準情境文字。 |
| `scope` | 95 | 是 | 犬貓、單一飼料熱量、11 固定倍率、1–6 餐，排除孕哺、臨床照護、特殊飲食。比對 r1530、source-index、catalog 與 open PR，與成人 TDEE 和嬰兒配方奶有不同族群、算法及輸出，未見同 slug 製作。 |
| `userFlow` | 81 | 否 | 物種連動、取消、回復、離頁、估算說明與結果可及性有規則。減重體重的欄位標籤仍通用，重要前提只保證在結果顯示。PET-01。 |
| `inputsOutputs` | 82 | 否 | 11 個倍率與來源吻合，雙精度與 60 位 Decimal 驗算一致。允許組合可讓實際為正的餐量呈現 0 g、0 杯，卻仍呈現正熱量。PET-02。 |
| `implementation` | 96 | 是 | Node 24／原生 ESM 零依賴，固定 Worker、離線、CSP、無工作資料傳輸及清理明確。倍率為固定字面資料。 |
| `acceptance` | 85 | 否 | 九個產品證據及門檻明確，11 列 fixture 都覆蓋。沒有減重目標體重先行提示與低於輸出精度的可用性 gate。PET-01、PET-02。 |
| `tests` | 93 | 是 | 21 核心與 3 controller cases 深比對全吻合。獨立補例證明目標體重語義、非零份量捨為零及整數 DER 順序的可驗差異。 |
| `handoff` | 96 | 是 | 四檔、固定來源追查、中央工具路徑、另領 claim、交驗與發布責任均明文。 |

## 離線驗算

執行 `& '.runs/five-hour-2026-11-11/dispatch/spec-review-06/review/run-verifier.ps1' -Slug 'pet-feeding-calculator'`，Python 3.12.5，exit `0`。核心 21/21、controller 3/3。完整的字面輸入、獨立推導、候選預期與補充案例見 驗算輸出（本地證據：verification.json）。重現用 驗算腳本（本地證據：verify.py）。

- 以雙精度遵循 SPEC 步驟，另以 60 位 Decimal 四次方根的立方求 `kg^0.75`。所有成功案例的 RER、DER、克數與杯數捨入結果一致。
- 逐列讀取 MSD 獸醫手冊的健康犬貓九個維持／生長倍率。減重的犬 1.0、貓 0.8 由 AAHA Box 1 與 SACN Table 5-2 核對，PNA 也涵蓋兩值。恰 4 月的犬使用 2.0 可追溯到 AAHA ≥4 月列。
- 合成首例 10 kg 的 RER 393.6389… → 394。未捨入 RER × 1.6 = 629.822… → 630。`630 × 100 ÷ 360 = 175` 克，分為 88、87。13 個成功 fixture 涵蓋所有 11 個 (species, lifeStage)。
- 每筆成功案例均以商與餘數獨立分配熱量及克數，合計分別等於日 DER 與日克數。三組 controller 以世代模型逐 checkpoint 重算。

## 阻止開工的問題

### PET-01 減重目標體重未在輸入時明確區隔

- 重現 在合成貓減重案例選 `species="cat"`、`lifeStage="weight-loss"`，在通用 `Weight (kg)` 欄輸入 `12` 或 `6`。其餘為每 100g `330` kcal、每天 `2` 餐。 [體重欄與結果](https://github.com/KYStr/glossquote-labs-home/blob/282fb18912c0435257c13b96b5562e410e3a2521/docs/specs/pet-feeding-calculator/SPEC.md#L34)
- 觀察 兩個數字都通過同一欄位驗證，合成輸出分別為 361 kcal／109 g 與 215 kcal／65 g。規格在選項文字提及理想體重，附註只保證在結果，未規定切換時如何處理已輸入的當前體重。報告也省去體重及其基準。 [下載格式](https://github.com/KYStr/glossquote-labs-home/blob/282fb18912c0435257c13b96b5562e410e3a2521/docs/specs/pet-feeding-calculator/SPEC.md#L99)
- 預期 減重列應在輸入與送出前明示使用獸醫確認的理想／目標體重。規定從一般列切入時清空或重新確認目前值，保留可復原草稿。報告應辨識體重基準及估算用途，讓合成結果可追溯。
- 影響 拿飼主手上的當前體重代入即可得到另一份看似有效的減重份量。AAHA 減重段明確採理想體重。 [AAHA 指引](https://www.aaha.org/wp-content/uploads/globalassets/02-guidelines/2021-nutrition-and-weight-management/resourcepdfs/new-2021-aaha-nutrition-and-weight-management-guidelines-with-ref.pdf)
- 重審 重核犬與貓減重、選項切換、送出前可見提示、舊輸出失效與獨立報告。保持現有源係數與有效數值的算術不變。

### PET-02 合法端點的逐餐克數與杯數把非零份量顯示為零

- 重現 合成邊界 `species="cat", lifeStage="weight-loss", weightKg="0.5", foodKcalPer100g="900", foodKcalPerCup="1500", mealsPerDay="6"`。全數位於 SPEC 數值範圍。 [捨入與分餐](https://github.com/KYStr/glossquote-labs-home/blob/282fb18912c0435257c13b96b5562e410e3a2521/docs/specs/pet-feeding-calculator/SPEC.md#L94)
- 觀察 日量 33 kcal、4 g、0.02 杯。克數列表為 `[1,1,1,1,0,0]`，杯數六餐皆 0，熱量六餐皆正值。頁面只要求標示杯數捨入差，仍將零值列為各餐餵食量。
- 預期 定義低於測量精度的呈現與機器語義，讓正熱量的餐可辨為低於目前顯示單位或無法用此精度分餐。保留可追溯日量與原始計算。適當調整精度時仍驗分餐合計規則。
- 影響 量杯與克數同時顯示零會被讀成該餐不用餵，與同列熱量互相衝突。
- 重審 加入全端點組合的字面 UI／JSON expected，以及既有 24 cases 和一般有／無杯數兩路的重驗。


## 非阻擋改善

- 把只知道 kcal/cup 的情境改為需要包裝上的 kcal/100g，與必填限制一致。
- 把重症排除理由明訂為臨床監護。PNA 與 SACN 皆列有單值，屬適用範圍問題。
- 可補 `10 kg` 已絕育犬與 `400 kcal/100 g` 的字面案例。依已捨入 DER 得 158 g，直接用未捨入 DER 會得 157 g。

## 登記冊繼承契約 REG-01

登記冊 r1530 的 `spec.acceptanceCriteria` 使用 `goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff`。這八項適用於原 `workType=spec` 任務。SPEC §acceptance 的九個產品面向須成為 production 可繼承的 rubric。現有核心會要求 production 的驗收陣列與 spec 完全一致，因此 REG-01 阻止標為可開工 ready。需由主統籌依授權的修訂流程修正後重新讀回。逐筆比較（本地證據：../production-rubric-check.json）

## 預先約定的九項產品證據

| 面向 | 狀態 | SPEC 要求的證據 |
| --- | --- | --- |
| `functionality` | NOT_RUN | 11 列與真表單輸入、完整報告 |
| `boundaries` | NOT_RUN | 兩物種端點、密度、餐數、首錯與世代 |
| `privacy` | NOT_RUN | 零工作網路、storage、URL 和 log |
| `security` | NOT_RUN | 敵意輸入 inert、CSP、上限、Worker 與 Blob dispose |
| `usability` | NOT_RUN | 兩語手機與桌面、物種連動、取消、重設、下載 |
| `accessibility` | NOT_RUN | 鍵盤、焦點、狀態與錯誤、320px、200% zoom、觸控 |
| `localization-seo` | NOT_RUN | 雙語標籤及估算聲明、同語首頁和預覽 noindex，正式另驗 SEO |
| `toolchain-provenance` | NOT_RUN | Node 24、離線命令、重建 hash、同一 PR head |
| `compatibility` | NOT_RUN | Chrome/Edge 隔離實際表單、Worker、Blob、reflow |

## 核對來源

- 2026-11-11 逐格核對九列固定倍率與僅供估算起點的註記。 [MSD Veterinary Manual 犬貓每日維持能量表](https://www.msdvetmanual.com/multimedia/table/daily-maintenance-energy-requirements-for-dogs-and-cats)
- 核實 RER 指數公式及維持量用途。 [MSD 小動物營養需求](https://www.msdvetmanual.com/management-and-nutrition/nutrition-small-animals/nutritional-requirements-of-small-animals)
- 查讀 Weight Reduction in the Obese Pet 與 Box 1，核實理想體重、犬貓各自減重倍率與四個月邊界。 [AAHA 2021 營養與體重管理指引](https://www.aaha.org/wp-content/uploads/globalassets/02-guidelines/2021-nutrition-and-weight-management/resourcepdfs/new-2021-aaha-nutrition-and-weight-management-guidelines-with-ref.pdf)
- 查讀 RER、低活動範圍、兩物種減重、個體差異與 BCS 調整。 [Pet Nutrition Alliance 能量估算表](https://petnutritionalliance.org/wp-content/uploads/2023/03/MER.RER_.PNA_.pdf)
- 讀 Basic Calorie Calculator 原文和 Table 1 原始圖，核對犬減重須用理想體重、幼犬兩段與犬維持倍率。 [Ohio State VMC 伴侶動物營養支援](https://vmc.vet.osu.edu/services/companion-animal-nutrition-support-service)
- 讀原書表格，核對犬貓減重、維持和生長倍率，並區分重症與其他非目標的來源情境。 [SACN 5th ed. 第 5 章 Table 5-2](https://s3.amazonaws.com/mmi_sacn5/2019/SACN5_5.pdf#page=13)

保留原 owner 與 claim。修正 PET-01、PET-02、REG-01 後重核新 head、來源、雙語輸入與報告。正式登記等主統籌安排。
