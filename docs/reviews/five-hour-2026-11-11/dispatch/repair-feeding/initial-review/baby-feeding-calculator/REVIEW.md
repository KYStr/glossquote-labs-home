> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：6059b2d0b3bee2296da4646606559613116af3a8eb23a2066d602944efba5580。

# 嬰兒奶量計算獨立文件審查

- 文件結果 **FAIL**。建議退修。REG-01 亦阻止標為可開工 ready。 產品九面向皆 **NOT_RUN**。
- Task `labs-baby-feeding-calculator-spec-20261109`。Spec `spec-baby-feeding-calculator-20261109`。[PR #262](https://github.com/KYStr/glossquote-labs-home/pull/262) 為 open draft。
- 固定候選 `558e5afa80f14c686e40a306435b81672219fa68`。Reviewer `local-codex:01a1c87c-fc33-75e3-9aee-09999e6d38b1`，未參與本候選的製作。
- 登記冊 r1530，blob `e01da965f28e5248ca13158094ca356254a25c2b`。原承接者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，claim `muse-r4-baby-feeding-calcu-claim-20261109T155434Z-4a705`。
- 核對範圍為 BRIEF、SPEC、fixtures、AUTHOR-CHECK。四檔本地 Git blob 均與 PR diff 及固定 GitHub 檔案相同。來源與讀回紀錄（本地證據：../intake.json）

## 八節逐項查核

| 面向 | 分數 | 達標 | 實際證據 |
| --- | ---: | --- | --- |
| `goal` | 95 | 是 | 行動夜間估算、桌面比較係數的場景具體。每日總量和逐餐分配具可驗算語義。 |
| `scope` | 85 | 否 | 明確限健康足月、第一週後至約 6 個月的配方奶一般估算，排除直接哺乳與診斷。產品規格仍要求對已超過來源年齡的資料給成功餵食表。BABY-01。 |
| `userFlow` | 78 | 否 | 有按鈕、範例、焦點、dirty、cancel、reset 與可見免責。月齡只提示，畫面照常給出超出指引期間的個別逐餐量與下載。BABY-01。 |
| `inputsOutputs` | 83 | 否 | 文法、先錯、整數捨入及不變量清楚。下載固定只有 result，醫療來源、適用聲明與重要上下文遺失。BABY-02。 |
| `implementation` | 96 | 是 | 原生靜態頁與 Node 24 零依賴，固定 Worker、錯誤回復、CSP、禁工作請求與敏感資料持久化，計算可離線。 |
| `acceptance` | 84 | 否 | 九個面向有量化方法、逐項門檻與候選 noindex、正式 SEO。健康內容的門檻只覆蓋頁面免責，尚未涵蓋不適用輸入及脫離頁面的報告。BABY-01、BABY-02。 |
| `tests` | 84 | 否 | 現有 16 核心及三個狀態案例算術全吻合，覆蓋精確進位與餘數。age-beyond-notice 與 max-boundary 固定了臨床範圍之外仍顯示逐餐量的路徑。 |
| `handoff` | 96 | 是 | 固定四檔、來源與日期重核、另行 claim、同 commit 產品證據及隱私停止條件皆明文。 |

## 離線驗算

執行 `& '.runs/five-hour-2026-11-11/dispatch/spec-review-06/review/run-verifier.ps1' -Slug 'baby-feeding-calculator'`，Python 3.12.5，exit `0`。核心 16/16、controller 3/3。完整的字面輸入、獨立推導、候選預期與補充案例見 驗算輸出（本地證據：verification.json）。重現用 驗算腳本（本地證據：verify.py）。

- 先用 Fraction 精確算未捨入日量，以 `floor(x + 1/2)` 取整。用 `divmod` 分解日量，平均另以精確分數取到 0.1 mL。
- 合成 4.55 × 150 = 682.5 → 683 mL，683 = 7 × 97 + 4，陣列為 4 個 98 與 3 個 97，平均 97.6。最小邊界的平均 6.25 mL 進為 6.3。
- 月齡 `""/"0"/"01"/"6"/"7"/"9"/"24"` 的合成補例只變動提示與 age，算術輸出相同。另取獨立序列化的 JSON 檢查所攜帶的語境。
- r1530、source-index、catalog 與 open PR 未見同一工具的另行製作。同批寵物案使用犬貓能量公式，其他成人熱量工具也與本案不同。

## 阻止開工的問題

### BABY-01 超出引用指引期間仍輸出個別逐餐餵食量

- 重現 執行合成 `age-beyond-notice`，輸入 `weight="8", factor="150", feedsPerDay="5", ageMonths="9"`。對照 `age-newborn-notice`，月齡 0 不能區分第一週與其後。 [來源適用範圍](https://github.com/KYStr/glossquote-labs-home/blob/558e5afa80f14c686e40a306435b81672219fa68/docs/specs/baby-feeding-calculator/SPEC.md#L29)
- 觀察 9 月的合成案例仍成功回 1200 mL 與五餐各 240 mL，附一個超齡提示並開放下載。月齡空白時無提示，`max-boundary` 可成功產出 3000 mL 單餐。這些是規格算術輸出。 [字面案例](https://github.com/KYStr/glossquote-labs-home/blob/558e5afa80f14c686e40a306435b81672219fa68/docs/specs/baby-feeding-calculator/fixtures.json)
- 預期 讓使用入口、結果與下載一致限定為來源適用的配方奶一般估算。對明確超出範圍的資料只呈現適用範圍說明。對未提供或 0 月而無法判斷是否已過第一週的資料，明訂如何確認適用與顯示。把按餐拆分說明為算術分配，配合來源的回應式餵食說明。
- 影響 夜間照顧場景可能將表格當成可執行餵食計畫。NHS 111 Wales 文字只支持第一週結束後到約六個月的一般配方奶日量區間，沒有這些個別餐量或時程。 [NHS 111 Wales](https://111.wales.nhs.uk/doityourself/pregnancy/bottleformulacommonquest/)
- 重審 重核第一週、之後未滿一個月、未填、約 6 月及超過適用範圍的入口、輸出及下載。修正兩語 scope、結果標籤與 fixtures。保留適用區間內的純算術驗算。

### BABY-02 下載失去醫療來源和適用上下文

- 重現 按現行規格序列化 `age-beyond-notice` 的成功 `result` 為 `baby-feeding-report.json`，脫離頁面後單獨打開。 [報告格式](https://github.com/KYStr/glossquote-labs-home/blob/558e5afa80f14c686e40a306435b81672219fa68/docs/specs/baby-feeding-calculator/SPEC.md#L87)
- 觀察 報告有分餐數值與內部 notice ID，缺少指引出處、適用人群與年齡、一般估算說明。適用性未確認的 `max-boundary` 報告甚至有空 notices。
- 預期 如保留下載，固定 schema 應攜帶可追溯的來源、適用範圍和一般估算／非個人餐量指示，並為脫離頁面的報告補上字面驗收案例。
- 影響 頁面旁的雙語警示無法隨報告保留，接收者不能從檔案辨別數字用途。
- 重審 用合成輸入匯出，核對可獨立讀取的語境與固定排序／UTF-8 bytes。同步更新九個面向中報告證據與字面 expected。


## 非阻擋改善

- 把「實務最常用」改為有來源支持的「該工具取引用區間下限」。NHS 頁面未比較各預設值的普及程度。
- 讓 BRIEF 的首例和 Load example 第一個 fixture 對齊，或明說前者是捨入驗算例。
- 新生兒提示的 150–200 應完整寫成每公斤每日 mL，兩語統一。

## 登記冊繼承契約 REG-01

登記冊 r1530 的 `spec.acceptanceCriteria` 使用 `goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff`。這八項適用於原 `workType=spec` 任務。SPEC §acceptance 的九個產品面向須成為 production 可繼承的 rubric。現有核心會要求 production 的驗收陣列與 spec 完全一致，因此 REG-01 阻止標為可開工 ready。需由主統籌依授權的修訂流程修正後重新讀回。逐筆比較（本地證據：../production-rubric-check.json）

## 預先約定的九項產品證據

| 面向 | 狀態 | SPEC 要求的證據 |
| --- | --- | --- |
| `functionality` | NOT_RUN | 真輸入、分配總和及下載 |
| `boundaries` | NOT_RUN | 體重、係數、餐數、月齡、首錯、精確進位 |
| `privacy` | NOT_RUN | 健康資料零工作請求、零儲存、URL 與 log |
| `security` | NOT_RUN | 敵意輸入 inert、CSP、固定檔名、資源回收 |
| `usability` | NOT_RUN | 兩語桌面手機、狀態與免責／指引位置 |
| `accessibility` | NOT_RUN | 鍵盤、焦點、錯誤、狀態、320px、200% zoom 與觸控 |
| `localization-seo` | NOT_RUN | 兩語全文、同語首頁、noindex 與正式 SEO |
| `toolchain-provenance` | NOT_RUN | Node 24、離線命令、SHA-256、同 head |
| `compatibility` | NOT_RUN | 隔離 Chrome/Edge 實際 Worker、Blob 和 reflow |

## 核對來源

- 2026-11-11 讀到頁尾更新日期 19/04/2021。確認第一週結束後到約六個月、150–200 mL/kg/day 是多數嬰兒的一般區間，按需求餵食。 [NHS 111 Wales 配方奶常見問題](https://111.wales.nhs.uk/doityourself/pregnancy/bottleformulacommonquest/)
- 核實飢餓與飽足訊號優先於固定時程。 [NHS Best Start in Life 的回應式瓶餵](https://www.nhs.uk/best-start-in-life/baby/feeding-your-baby/bottle-feeding/bottle-feeding-your-baby/feeding-on-demand/)
- 核實最初幾天、後續週月、6–12 個月依需求變化，僅核對期間差異。 [CDC 配方奶餵食量與頻率](https://www.cdc.gov/infant-toddler-nutrition/formula-feeding/how-much-and-how-often.html)
- 查讀作者列出的不同指引。這份審查沿用規格的單一主來源，不引入其他數值。 [AAP 配方奶餵食資訊](https://www.healthychildren.org/English/ages-stages/baby/formula-feeding/Pages/amount-and-schedule-of-formula-feedings.aspx)
- 查讀作者列出的澳洲年齡分段資料，確認其指引來源與適用分段不同。 [Pregnancy, Birth and Baby](https://www.pregnancybirthbaby.org.au/babies/feeding-and-nutrition/feeding-your-baby-with-formula)

保留原 owner 與 claim。修正 BABY-01、BABY-02、REG-01 後重核同一新 head、主來源及兩語範圍。正式登記仍待主統籌安排。
