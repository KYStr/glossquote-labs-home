> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：4cf9066addfea2e144d9a598ba500731fb2027c0e3ef4669936bd13e5cbb5f6a。

# 台灣水費試算獨立文件審查

審查時間 2026-11-11T03:02:17Z。文件需退修。維持原 task、spec ID 與 owner，由修訂後的新 head 提供複驗。

- 任務 labs-taiwan-water-bill-spec-20261109，預案 spec-taiwan-water-bill-20261109。
- 固定候選 b23afd542d5252c179207f78cb95518925e42923。[SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/b23afd542d5252c179207f78cb95518925e42923/docs/specs/taiwan-water-bill/SPEC.md) · [PR #248](https://github.com/KYStr/glossquote-labs-home/pull/248)
- Reviewer local-codex:01a1c87c-f580-7382-b037-3b6d83eee0f7，未參與候選製作。Registry r1530，blob e01da965f28e5248ca13158094ca356254a25c2b。原 owner 與 claim 已讀回。固定來源查核（本地證據：../source-check.json）
- 文件評定 FAIL。審查時的遠端狀態為 task reviewing、spec draft。

## 八節評分

| 面向 | 完整度 | 分數 | 證據 |
| --- | --- | ---: | --- |
| goal | PASS | 96 | §goal 說明家戶持帳單用電腦逐項核對與租屋者用手機估算，成果有一期用量、口徑、週期及費用拆解。 |
| scope | FAIL | 82 | §scope 區隔台水與北水及 appliance kWh 自填費率，列出分攤、優惠及調整界線。台水一般用戶範圍仍涵蓋部分回饋費免附徵用戶（WATER-02）。 |
| userFlow | FAIL | 81 | §userFlow 說明兩週期、清除與污水費選填、錯誤及取消。預設週期會立即被欄位容量拒絕，回饋費無法依帳單適用性處理（WATER-01、WATER-02）。 |
| inputsOutputs | FAIL | 59 | §inputsOutputs 有毫元精度、錯序與完整結果。8 字元與 9 字元週期矛盾，且附徵範圍與官方稅額語義須修（WATER-01 至 03）。 |
| implementation | PASS | 93 | §implementation 純核心、世代管理、固定 Blob Worker、JSON 與離線建置可行。四級價表、26 筆基本費與 24 個跨界驗算相符。 |
| acceptance | PASS | 94 | §acceptance 九產品面向各有固定 ID 和必要證據，包含價目逐值、兩語真實瀏覽器、下載與隱私。產品目前 NOT_RUN。 |
| tests | FAIL | 62 | 照字面上限執行只有 5/22 相符，另外 17 案集中在 cycle 先失敗。僅把 cycle 上限改成 9 作對照時 22/22 相符，尚有官方費用反例須補。 |
| handoff | PASS | 97 | §handoff 界定固定來源、重審、製作另取 claim 與主統籌發布，並要求抽核台水表與公式。本次已核對 26 筆基本費與兩組完整級距。 |

## 阻擋缺陷

### WATER-01 隔月抄表及預設範例被容量先拒絕

- **重現與實際** `{cycle:'bimonthly',diameterMm:'20',usageM3:'30',sewerRateNt:'',wasteRateNt:''}` 中 `bimonthly` 長 9。每欄最多 8 且先驗容量，得到 `INPUT_LIMIT/cycle`，範例卻要求成功 325 元。`quarterly` 長 9，也先得到 `INPUT_LIMIT`，與 fixture 的 `ENUM` 不符。
- **預期與複驗** 固定 cycle 專屬容量或列舉的容量例外，讓兩種有效週期通過且明定無效值的首錯。重跑 22 個 fixtures、預設及 24 個級距界線。
- **影響** 預設隔月模式無法完成計算，16 個其他案例也與字面契約不符。

### WATER-02 部分台水帳單免附徵，預案一律加入保育費

- **重現與實際** 行政院台水代收附表列明少數非取自水質水量保護區的用戶不納入。隔月 20 公厘、30 度且無其他代徵時，預案加入 12 元得到 325 元。相同一般價目且免附徵時，312.90 元水費小計取整為 313 元。台水說明對適用者列未稅用水費的 5%，公告亦說百分比按年度。
- **預期與複驗** 讓使用者按帳單確認是否附徵，或把工具適用對象明確限為已附徵的一般台水用戶，讓免附徵用戶在輸入時看得到限制。把 5% 記為有查閱日期的台水條件，補相同輸入的附徵及免附徵／不適用驗收例。
- **影響** 即使其他資料輸入正確，涵蓋範圍內的免附徵帳單也會被固定高估。 [行政院台水附徵代收項目附表二](https://www.ey.gov.tw/File/7FDEED4876C964AF?A=C)、[台水官方水費說明](https://www.water.gov.tw/ch/Subject/Detail/1288?nodeId=813)、[水源保育與回饋費收費辦法](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=J0110068)

### WATER-03 營業稅取至角被當成官方帳單稅額

- **重現與實際** `monthly-first-tier-top` 的基本費 17.85 元、用水費 73.50 元，含稅小計 91.35 元反算稅 4.35 元。預案取至角成 4.40 元。台水價表第 10 點寫角以下四捨五入，營業稅法第 14 條銷項稅額按整元。台水並指出非營業用戶帳單不另列。
- **預期與複驗** 若聲稱重現帳單稅額，以官方整元規則處理適用帳單，本例為 4 元。若保留含稅拆解資訊，明示為工具估算及非營業帳單的列示差異，並使結果、FAQ 和 fixture 語義一致。兩種情境均不加進總額。
- **影響** 目前的欄名及公式註會使使用者拿推算值當官方分項。這筆差異不影響已含稅的總水費。 [台水費率表第 10 點](https://www.water.gov.tw/ch/ServerFile/Get/37beec88-3c61-4beb-afd5-db4883b1357b?nodeId=4571)、[加值型及非加值型營業稅法第 14 條](https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=14)

## 製作驗收繼承

- **REG-01 實際** 原規格製作 task 的八節 criteria 與文件審查一致。登記冊的 spec.acceptanceCriteria 也填入 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。
- **預期** 製作 task 依協作規則繼承 spec.acceptanceCriteria，該欄位須保存 SPEC 的九個產品面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility。目前九項皆未繼承。
- **處置** 由主統籌依合法修訂流程處理同一 spec ID，重讀登記及候選後才可標記 ready。

## 非阻擋事項

- 補兩個可直接開啟的官方價表及計費說明連結。移除未有維護承諾的「本頁將隨之更新」，保留費率查閱日期與帳單優先。

## 字面案例與檢查

命令 `node .runs/five-hour-2026-11-11/dispatch/spec-review-04/review/taiwan-water-bill/verify.mjs` 在 v24.14.0 離線執行，exit 1，逐案 5/22 相符。三組 controller 為文件狀態模型，完整輸入、獨立輸出與額外探針均已保存。重算腳本（本地證據：verify.mjs） · 逐案證據（本地證據：fixture-results.json） · 命令輸出（本地證據：fixture-run.log）

- `node .runs/five-hour-2026-11-11/dispatch/spec-review-04/review/taiwan-water-bill/verify.mjs --cycle-cap-nine`，exit 0。僅放寬 cycle 容量的診斷對照，22/22 相符，適用性與稅額問題仍存在。 逐案證據（本地證據：fixture-results-cycle-cap-nine.json） · 命令輸出（本地證據：fixture-run-cycle-cap-nine.log）
- `curl.exe --fail --silent --show-error --max-time 15 "https://www.water.gov.tw/ch/Subject/Detail/1288?nodeId=813"`，exit 0。直接讀台水說明，擷取相應公開段落。

產品九面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility 均為 NOT_RUN，分數為 null。瀏覽器、畫面、下載、正式 HTTPS／SEO 與部署為產品階段的檢查。

## 來源

- 核對單價 7.35、9.45、11.55、12.075，兩套抄表界線與差額，13 種口徑兩欄共 26 值。抽列 13 公厘 17.85/35.70、100 公厘 1909.95/3819.90、400+ 公厘 58119.60/116239.20。 [台水官方收費標準 PDF](https://www.water.gov.tw/ch/ServerFile/Get/37beec88-3c61-4beb-afd5-db4883b1357b?nodeId=4571)
- 背景 HTTP GET 成功，檢視 HTML 第 873–934 行。直接讀到兩種 110 度公式皆 1107.75 元、未稅用水費×5% 及營業稅和代徵取整原文。 [台水抄表計費說明](https://www.water.gov.tw/ch/Subject/Detail/1288?nodeId=813)
- 證實附徵對象有例外，百分比另依收費辦法。 [行政院台水附徵代收項目附表二](https://www.ey.gov.tw/File/7FDEED4876C964AF?A=C)
- 核對北水五段價及每月基本費，確認獨立於本案台水規則。 [臺北自來水事業處價目](https://www.water.gov.taipei/cp.aspx?n=19BB786E67F1CC20)
- §1–2 核對只對家電的用電量套自填單價，無台水帳單計費重疊。 [固定電費規格](https://github.com/KYStr/glossquote-labs-home/blob/8a5612dc53c01de1bcb3d135136ee37154759d50/docs/specs/electricity-cost-calculator/SPEC.md)
