> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：453151c4519e5e9ef4ecaa12343077e66983116b7e76d1166bfa47a31121bb8f。

# 照明流明計算獨立文件審查

審查時間 2026-11-11T03:12:04Z。文件需退修。維持原 task、spec ID 與 owner，由修訂後的新 head 提供複驗。

- 任務 labs-lighting-lumen-calculator-spec-20261109，預案 spec-lighting-lumen-calculator-20261109。
- 固定候選 3119dccbc0c684ef07ef46aadb30e1b600f9544f。[SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/3119dccbc0c684ef07ef46aadb30e1b600f9544f/docs/specs/lighting-lumen-calculator/SPEC.md) · [PR #251](https://github.com/KYStr/glossquote-labs-home/pull/251)
- Reviewer local-codex:01a1c87c-f580-7382-b037-3b6d83eee0f7，未參與候選製作。Registry r1530，blob e01da965f28e5248ca13158094ca356254a25c2b。原 owner 與 claim 已讀回。固定來源查核（本地證據：../source-check.json）
- 文件評定 FAIL。審查時的遠端狀態為 task reviewing、spec draft。

## 八節評分

| 面向 | 完整度 | 分數 | 證據 |
| --- | --- | ---: | --- |
| goal | FAIL | 87 | §goal 界定在家與賣場用燈泡標示估顆數的情境，卻承諾裝完後的實際照度，與資料及模型能力不合（LIGHT-03）。 |
| scope | FAIL | 74 | §scope 有單房、局部照明和係數的界線。原版標準的表號、住宅走道列和書寫閱讀混合照明均需校正（LIGHT-02）。 |
| userFlow | FAIL | 84 | §userFlow 明定雙模式、選項來源、dirty／cancel／reset 和下載。停用欄位仍可能成為首錯而未給復原路徑（LIGHT-04）。 |
| inputsOutputs | FAIL | 78 | §inputsOutputs 的精確坪換算、欄位驗序與報告 shape 可重算。先把需求取到整流明再取顆數，合法例達不到簡化目標（LIGHT-01）。 |
| implementation | PASS | 95 | §implementation 採 BigInt 有理數、純核心、控制層世代、靜態雙語與 CSP。精確面積及整數進位皆可在零依賴瀏覽器重現。 |
| acceptance | PASS | 95 | §acceptance 九項產品 gate 包含兩模式及邊界、隱私、鍵盤、雙語 SEO、隔離瀏覽器與重現性，產品維持 NOT_RUN。 |
| tests | FAIL | 85 | 14 核心及 3 controller 均相符。現有整數倍與 +1 lm 檢查漏掉精確需求僅比整數倍多不到半流明的案例（LIGHT-01）。 |
| handoff | PASS | 97 | §handoff 固定四檔與 owner，另領製作 claim，列 Node 建置、獨立交驗與部署順序。 |

## 阻擋缺陷

### LIGHT-01 先取整需求流明可能少算一顆

- **重現與實際** `mode=area, areaUnit=ping, areaValue=1.09, roomType=kitchen, bulbLumens=360`。面積 `436/121 m²`，100 lx 需 `43600/121 ≈ 360.3306 lm`。規格先捨入到 360 再進位得 1 顆，模型結果 99.9 lx。精確需求直接除以單顆後進位為 2 顆。現有整倍 fixture 則恰為 100 lx，FAQ 的一律超過目標也不成立。
- **預期與複驗** 在簡化模型下用未捨入的需求決定足夠顆數，或明定不足可接受的容差與顯示狀態。若沿用可手算的整流明展示，可另定義向上顯示的整數需求。增列 1.09 坪及恰整倍案例。
- **影響** 產品的主要任務是判斷要買幾顆，合法輸入可能推薦低於自己的目標。

### LIGHT-02 住宅照度原表的表號、走道列與作業適用性失實

- **重現與實際** GB 50034-2013 的住宅原表是 5.2.1，續表已有走道／樓梯間地面 50 lx。GB/T 50034-2024 表 5.2.1 列住宅走廊／樓梯間地面 100 lx。兩版的住宅起居室書寫閱讀 300 lx 均有混合照明星號。候選稱舊版表 5.1.1 無走廊，並將居家書寫列命名為「書房／辦公」一般照明。
- **預期與複驗** 更正表號、原列及參考平面。可固定現行 GB/T 50034-2024 表 5.2.1 作住宅預設，維持目前數值。若保留 EN 工作場所走廊作住宅估算參考，說明採用理由及適用差異。300 lx 說明為居家閱讀／書寫參考，保留混合照明前提。
- **影響** 來源列的選擇會改變顆數，14 m² 走廊搭配 800 lm，50 lx 需 1 顆，100 lx 需 2 顆。原表和適用範圍需可追溯。 [2013 國標原文表 5.2.1（教育主管機關存本）](https://jyt.nmg.gov.cn/nmgzbzx/ywgz/zbjs/202408/P020240830428934615813.pdf)、[2024 國標原文表 5.2.1（高校存本）](https://zcsys.ncepu.edu.cn/docs/2025-01/d5c197c2837e4892ac7d02faae298500.pdf)、[住建部換版公告](https://www.mohurd.gov.cn/gongkai/zc/wjk/art/2024/art_17339_777466.html)

### LIGHT-03 用燈泡標示流明算不出實際照度

- **重現與實際** 預設案例 14 m²、2 × 800 lm 得 114.3 lx。這是把發出的總流明除以房間面積，沒有入射至參考面比例、配光及維護資料。BRIEF、§goal、§userFlow 使用「實際照度」，即使旁邊已有簡化揭露也會讓主要結果看似測值。
- **預期與複驗** 把雙語結果及 FAQ 定義為簡化模型的估算平均照度，保留利用與維護係數的限制，並使下載欄位的定義一致。產品驗收核對值與標籤。
- **影響** 同房間、同額定流明的不同燈具或安裝位置會有不同的入射照度，無法用現有欄位判定實際讀值。 [CIE 照度定義](https://cie.co.at/eilvterm/17-21-060)

### LIGHT-04 未啟用欄位可阻擋送出但無可驗的復原路徑

- **重現與實際** 既有 `inactive-field-over-limit` 在長寬模式留下 `areaValue='123456789'`，首錯 `INPUT_LIMIT/areaValue`。該欄僅面積模式啟用。送出失敗要求焦點到首錯欄，但規格未定義如何顯示或啟用目前不可編輯的欄位。
- **預期與複驗** 保留核心檢查並定義 UI 可達復原，例如在切換前處理超限、把錯誤關聯到可操作的模式切換，或明定輸入層可防止此狀態並測鍵入／貼上／切換。用上述草稿和實際鍵盤測例檢查。
- **影響** 使用者改回合法的長寬後，仍可能無法完成計算，也無法依規格聚焦造成首錯的欄。

## 製作驗收繼承

- **REG-01 實際** 原規格製作 task 的八節 criteria 與文件審查一致。登記冊的 spec.acceptanceCriteria 也填入 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。
- **預期** 製作 task 依協作規則繼承 spec.acceptanceCriteria，該欄位須保存 SPEC 的九個產品面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility。目前九項皆未繼承。
- **處置** 由主統籌依合法修訂流程處理同一 spec ID，重讀登記及候選後才可標記 ready。

## 非阻擋事項

- 移除無檔案欄、無列輸入的 File.arrayBuffer 與待修列模板描述，保留必要的 Worker 和報告回收。

## 字面案例與檢查

命令 `node .runs/five-hour-2026-11-11/dispatch/spec-review-04/review/lighting-lumen-calculator/verify.mjs` 在 v24.14.0 離線執行，exit 0，逐案 17/17 相符。三組 controller 為文件狀態模型，完整輸入、獨立輸出與額外探針均已保存。重算腳本（本地證據：verify.mjs） · 逐案證據（本地證據：fixture-results.json） · 命令輸出（本地證據：fixture-run.log）

產品九面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility 均為 NOT_RUN，分數為 null。瀏覽器、畫面、下載、正式 HTTPS／SEO 與部署為產品階段的檢查。

## 來源

- 實讀第 17–18 頁表 5.2.1 與續表，含住宅走道 50 lx 和書寫閱讀 300 lx 的混合照明註記。 [GB 50034-2013 原文](https://jyt.nmg.gov.cn/nmgzbzx/ywgz/zbjs/202408/P020240830428934615813.pdf)
- 核對 GB/T 50034-2024 自 2024-08-01 實施並廢止 2013 版。 [住建部正式公告及附件](https://www.mohurd.gov.cn/gongkai/zc/wjk/art/2024/art_17339_777466.html)
- 實讀第 25–26 頁表 5.2.1，核對居住用途六個候選值，住宅走廊 100 lx，床頭閱讀 200 lx、廚房操作台 300 lx 屬另外的列。 [GB/T 50034-2024 原文](https://zcsys.ncepu.edu.cn/docs/2025-01/d5c197c2837e4892ac7d02faae298500.pdf)
- 官方條目確認採用版次與室內工作場所範圍。表 9 的工作場所走廊 100 lx 與 2024 住宅列同值，兩者適用情境有別。 [BSI BS EN 12464-1:2021](https://landingpage.bsigroup.com/LandingPage/Standard?UPI=000000000030385601)
- 官方 1 m² = 0.3025 坪，倒數化為 400/121 m²/坪。 [淡水地政事務所面積換算](https://www.tamsui.land.ntpc.gov.tw/cp.aspx?n=6396)
- 定義照度使用入射光通量，支持估算欄位的語義更正。 [CIE e-ILV](https://cie.co.at/eilvterm/17-21-060)
- 核對其核心是四種面積單位換算與速查表。電費工具使用瓦數與期間而非照度。 [坪數換算固定規格](https://github.com/KYStr/glossquote-labs-home/blob/6d7cc4cd18a273b0d386b19b85b883573d097cba/docs/specs/ping-area-converter/SPEC.md)
