# 健保費試算 / NHI Premium Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-nhi-premium-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

在民營事業上班的受僱者，拿到薪資單或準備把家人加為眷屬時，要先確認三件事：自己的月薪落在健保投保金額分級表哪一級、每月從薪水扣的健保費（本人＋眷屬）是多少、公司與政府各負擔多少。他手上的資料只有月薪總額與眷屬人數；現在的做法是打開健保署的負擔金額表 PDF 或 Excel 逐列找金額，手機上尤其難讀。

- 桌面。人力資源或員工本人填月薪與眷屬數，立即對照級距、本人保費、員工合計與公司負擔，核對薪資單扣款。
- 行動。手機在談薪或家庭財務討論中快速試算「多一位眷屬每月多多少」，不登入、不查正式投保紀錄。

使用情境為試算假設。資料只保留在目前頁面草稿，結果是依公告表推算的估計值，不是健保署核定的應繳金額。

與既有功能的差異：本庫存的薪資換算（salary-converter）只換算薪資期間，不查投保級距；台灣水費（taiwan-water-bill）是另一種公用費率表。本工具的實質內容是「薪資 → 官方分級表查級 → 依官方公式與捨入規則分攤三方保費」，資料表與捨入規則全部釘版於本文。

## scope

MVP 必做：單一投保類別「第一類之公、民營事業、機構及有一定雇主之受僱者」的一般保險費試算。輸入月薪資總額與眷屬人數，輸出投保等級與投保金額、本人保費、每位眷屬保費、計費眷屬人數與上限標記、員工合計保費、投保單位負擔、政府補助。參數版本固定為衛生福利部中央健康保險署 115 年 1 月 1 日生效公告版（下稱「115 年版」），版次註記常駐頁面與報告。

非目標：

- 其他投保類別與身分：第一類的公務人員、公職人員（負擔比率 30/70/0）、私立學校教職員（30/35/35）、雇主、自營業主、專門職業及技術人員自行執業者（100%），以及第二類至第六類保險對象。
- 二代健保補充保險費（費率 2.11%，獎金、兼職所得、執行業務收入、股利、利息、租金等）完全不在範圍，頁面 FAQ 明示。
- 部分工時人員的較低投保金額級距、月中加保／退保／轉換的按日或按月比例計算、育嬰留職停薪等特殊計費期間。
- 眷屬資格認定（誰可以依附投保）、投保金額申報與調整、低報或高報的法律效果、滯納金與欠費。
- 查詢個人實際投保金額或應繳金額；本工具不連線任何政府系統。

資料界線：全部參數為本文釘版的字面常數，離線可算，無線上資料或外部服務依賴。性能界線：查表為 58 列線性或二元搜尋，整數運算，無浮點。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「月薪資總額、眷屬人數 / Monthly salary total and dependents」
- 「試算健保費 / Calculate NHI premium」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「投保級距與每月保費 / Insured grade and monthly premiums」先摘要（投保等級、投保金額、員工合計）再列明細：本人保費、每位眷屬保費、計費眷屬人數、投保單位負擔、政府補助，金額單位一律新臺幣元、整數。眷屬超過 3 人時顯示「眷屬超過 3 人，以 3 人計 / Only the first 3 dependents are charged.」。結果區常駐版次與估算註記「依健保署 115 年 1 月 1 日生效公告表試算，僅供估算 / Estimated from NHIA tables effective January 1, 2026.」。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果含上限標記時以文字及符號提示，不只靠顏色。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"monthlySalary":"45000","dependents":"0"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。明示檔案欄才處理原始 bytes，本工具無檔案欄。

欄位（順序固定）：

- `monthlySalary`：月薪資總額，新臺幣元。ASCII 十進整數字串，「0」或非零開頭，無空白／符號／小數／指數，raw 最多 8 單元。值域 1–99,999,999。
- `dependents`：依附投保的眷屬人數。同文法，raw 最多 8 單元。值域 0–99；超過 3 人接受輸入，計費只取 3 人並標記。

預設 `monthlySalary` 45000、`dependents` 0。

驗證順序：先 SCHEMA，再依 monthlySalary、dependents 欄序逐欄驗證；每欄先容量 INPUT_LIMIT、再不成對 surrogate UNICODE、再 EMPTY、再文法 INTEGER_FORMAT、再範圍 RANGE。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

參數（釘版，115 年版；來源見 handoff 與 AUTHOR-CHECK）：

- 保險費率 5.17%（自 110 年 1 月 1 日起）。
- 負擔比率：被保險人 30%、投保單位 60%、政府 10%。
- 平均眷口數 0.56 人（自 113 年 1 月 1 日起公告），投保單位與政府按 1＋0.56＝1.56 人份計算，與個人實際眷屬數無關。
- 眷屬計費上限 3 人（全民健康保險法第 18 條；健保署公式說明同）。

投保金額分級表（釘版字面資料，115 年版，全 58 級；「實際薪資月額」為含上下限的整數區間）：

| 級 | 月投保金額 | 實際薪資月額 | 級 | 月投保金額 | 實際薪資月額 |
| --- | --- | --- | --- | --- | --- |
| 1 | 29,500 | 29,500 以下 | 30 | 110,100 | 105,601–110,100 |
| 2 | 30,300 | 29,501–30,300 | 31 | 115,500 | 110,101–115,500 |
| 3 | 31,800 | 30,301–31,800 | 32 | 120,900 | 115,501–120,900 |
| 4 | 33,300 | 31,801–33,300 | 33 | 126,300 | 120,901–126,300 |
| 5 | 34,800 | 33,301–34,800 | 34 | 131,700 | 126,301–131,700 |
| 6 | 36,300 | 34,801–36,300 | 35 | 137,100 | 131,701–137,100 |
| 7 | 38,200 | 36,301–38,200 | 36 | 142,500 | 137,101–142,500 |
| 8 | 40,100 | 38,201–40,100 | 37 | 147,900 | 142,501–147,900 |
| 9 | 42,000 | 40,101–42,000 | 38 | 150,000 | 147,901–150,000 |
| 10 | 43,900 | 42,001–43,900 | 39 | 156,400 | 150,001–156,400 |
| 11 | 45,800 | 43,901–45,800 | 40 | 162,800 | 156,401–162,800 |
| 12 | 48,200 | 45,801–48,200 | 41 | 169,200 | 162,801–169,200 |
| 13 | 50,600 | 48,201–50,600 | 42 | 175,600 | 169,201–175,600 |
| 14 | 53,000 | 50,601–53,000 | 43 | 182,000 | 175,601–182,000 |
| 15 | 55,400 | 53,001–55,400 | 44 | 189,500 | 182,001–189,500 |
| 16 | 57,800 | 55,401–57,800 | 45 | 197,000 | 189,501–197,000 |
| 17 | 60,800 | 57,801–60,800 | 46 | 204,500 | 197,001–204,500 |
| 18 | 63,800 | 60,801–63,800 | 47 | 212,000 | 204,501–212,000 |
| 19 | 66,800 | 63,801–66,800 | 48 | 219,500 | 212,001–219,500 |
| 20 | 69,800 | 66,801–69,800 | 49 | 228,200 | 219,501–228,200 |
| 21 | 72,800 | 69,801–72,800 | 50 | 236,900 | 228,201–236,900 |
| 22 | 76,500 | 72,801–76,500 | 51 | 245,600 | 236,901–245,600 |
| 23 | 80,200 | 76,501–80,200 | 52 | 254,300 | 245,601–254,300 |
| 24 | 83,900 | 80,201–83,900 | 53 | 263,000 | 254,301–263,000 |
| 25 | 87,600 | 83,901–87,600 | 54 | 273,000 | 263,001–273,000 |
| 26 | 92,100 | 87,601–92,100 | 55 | 283,000 | 273,001–283,000 |
| 27 | 96,600 | 92,101–96,600 | 56 | 293,000 | 283,001–293,000 |
| 28 | 101,100 | 96,601–101,100 | 57 | 303,000 | 293,001–303,000 |
| 29 | 105,600 | 101,101–105,600 | 58 | 313,000 | 303,001 以上 |

計算規則（全部整數有理運算，禁止二進浮點；`RHU(p/q)` 表對非負有理數四捨五入至整數，即 floor(p/q ＋ 1/2)，恰 0.5 一律進位）：

1. 查級：取最小的級 g 使 monthlySalary ≤ 第 g 級月投保金額；monthlySalary 大於 313,000 時 g＝58。等價於上表區間查表：第 1 級涵蓋所有正整數月薪至 29,500，第 58 級涵蓋 303,001 以上無上限。insuredAmount 為第 g 級月投保金額。
2. 每人保費 selfPremium ＝ RHU(insuredAmount × 1551 / 100000)，即投保金額 × 5.17% × 30% 一次捨入。每位眷屬保費 dependentPremiumEach 與 selfPremium 相同（同一投保金額、同一負擔比率）。
3. dependentsCharged ＝ min(dependents, 3)；dependentsCapped ＝ dependents > 3。員工合計 employeeTotalPremium ＝ selfPremium × (1 ＋ dependentsCharged)，整數乘法，不再捨入。此順序（先每人捨入、再乘人數）由健保署負擔金額表的 ＋1／＋2／＋3 眷口欄恆為本人欄整數倍所證，見 AUTHOR-CHECK。
4. 投保單位負擔 employerPremium ＝ RHU(insuredAmount × 483912 / 10000000)，即投保金額 × 5.17% × 60% × 1.56，全程不先捨入、只在最後一次捨入。政府補助 governmentPremium ＝ RHU(insuredAmount × 80652 / 10000000)，即 × 5.17% × 10% × 1.56，同規則。

結果 `{grade, insuredAmount, dependentsCharged, dependentsCapped, selfPremium, dependentPremiumEach, employeeTotalPremium, employerPremium, governmentPremium}`，金額皆整數新臺幣元，grade 為 1–58 整數。機器值不隨 locale 改；顯示用的千分位只在呈現層。

固定下載 `nhi-premium-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

附錄：58 級保費對照（依上列公式計算；已與健保署公告負擔金額表逐列核對一致，核對紀錄見 AUTHOR-CHECK）。員工合計依眷屬人數為本人欄的 (1＋計費眷屬數) 倍，不另列表。

| 級 | 月投保金額 | 本人（每人） | 投保單位 | 政府 | 級 | 月投保金額 | 本人（每人） | 投保單位 | 政府 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 29,500 | 458 | 1,428 | 238 | 30 | 110,100 | 1,708 | 5,328 | 888 |
| 2 | 30,300 | 470 | 1,466 | 244 | 31 | 115,500 | 1,791 | 5,589 | 932 |
| 3 | 31,800 | 493 | 1,539 | 256 | 32 | 120,900 | 1,875 | 5,850 | 975 |
| 4 | 33,300 | 516 | 1,611 | 269 | 33 | 126,300 | 1,959 | 6,112 | 1,019 |
| 5 | 34,800 | 540 | 1,684 | 281 | 34 | 131,700 | 2,043 | 6,373 | 1,062 |
| 6 | 36,300 | 563 | 1,757 | 293 | 35 | 137,100 | 2,126 | 6,634 | 1,106 |
| 7 | 38,200 | 592 | 1,849 | 308 | 36 | 142,500 | 2,210 | 6,896 | 1,149 |
| 8 | 40,100 | 622 | 1,940 | 323 | 37 | 147,900 | 2,294 | 7,157 | 1,193 |
| 9 | 42,000 | 651 | 2,032 | 339 | 38 | 150,000 | 2,327 | 7,259 | 1,210 |
| 10 | 43,900 | 681 | 2,124 | 354 | 39 | 156,400 | 2,426 | 7,568 | 1,261 |
| 11 | 45,800 | 710 | 2,216 | 369 | 40 | 162,800 | 2,525 | 7,878 | 1,313 |
| 12 | 48,200 | 748 | 2,332 | 389 | 41 | 169,200 | 2,624 | 8,188 | 1,365 |
| 13 | 50,600 | 785 | 2,449 | 408 | 42 | 175,600 | 2,724 | 8,497 | 1,416 |
| 14 | 53,000 | 822 | 2,565 | 427 | 43 | 182,000 | 2,823 | 8,807 | 1,468 |
| 15 | 55,400 | 859 | 2,681 | 447 | 44 | 189,500 | 2,939 | 9,170 | 1,528 |
| 16 | 57,800 | 896 | 2,797 | 466 | 45 | 197,000 | 3,055 | 9,533 | 1,589 |
| 17 | 60,800 | 943 | 2,942 | 490 | 46 | 204,500 | 3,172 | 9,896 | 1,649 |
| 18 | 63,800 | 990 | 3,087 | 515 | 47 | 212,000 | 3,288 | 10,259 | 1,710 |
| 19 | 66,800 | 1,036 | 3,233 | 539 | 48 | 219,500 | 3,404 | 10,622 | 1,770 |
| 20 | 69,800 | 1,083 | 3,378 | 563 | 49 | 228,200 | 3,539 | 11,043 | 1,840 |
| 21 | 72,800 | 1,129 | 3,523 | 587 | 50 | 236,900 | 3,674 | 11,464 | 1,911 |
| 22 | 76,500 | 1,187 | 3,702 | 617 | 51 | 245,600 | 3,809 | 11,885 | 1,981 |
| 23 | 80,200 | 1,244 | 3,881 | 647 | 52 | 254,300 | 3,944 | 12,306 | 2,051 |
| 24 | 83,900 | 1,301 | 4,060 | 677 | 53 | 263,000 | 4,079 | 12,727 | 2,121 |
| 25 | 87,600 | 1,359 | 4,239 | 707 | 54 | 273,000 | 4,234 | 13,211 | 2,202 |
| 26 | 92,100 | 1,428 | 4,457 | 743 | 55 | 283,000 | 4,389 | 13,695 | 2,282 |
| 27 | 96,600 | 1,498 | 4,675 | 779 | 56 | 293,000 | 4,544 | 14,179 | 2,363 |
| 28 | 101,100 | 1,568 | 4,892 | 815 | 57 | 303,000 | 4,700 | 14,663 | 2,444 |
| 29 | 105,600 | 1,638 | 5,110 | 852 | 58 | 313,000 | 4,855 | 15,146 | 2,524 |

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/nhi-premium-calculator/`。src/core.mjs 放純驗證、查表、推導、格式化；分級表 58 列金額為 core 內的字面常數陣列（與本文表格逐值一致，測試以附錄對照全列斷言）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 精度：查級與三項保費使用精確整數（Number 安全整數內或 BigInt）。以 §4 的整數分子與分母計算，依商與餘數執行 half-up，僅在最後捨入。最大保費分子 insuredAmount × 483912 ≤ 313,000 × 483,912 ≈ 1.52e11，遠低於 2^53。第 1 級本人保費 457.545 → 458，恰半界以 150,000 元投保金額的 2,326.5 → 2,327 驗證。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「試算健保費」，畫面和完整報告符合核心 fixtures 與附錄 58 列對照，使用者取得對應產物。 |
| boundaries | 級距邊界（恰等於級金額、＋1 元）、上下限夾擠、眷屬 3／4 人分界、恰 0.5 捨入例、第一個錯誤、欄位順序和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。15 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `floor-grade-no-dependents` | 第 1 級、無眷屬；457.545 進位為 458 |
| `below-floor-clamps` | 月薪低於第 1 級仍按第 1 級計費 |
| `grade-boundary-exact` | 月薪恰等於級金額歸該級；1 眷屬 |
| `grade-boundary-plus-one` | 月薪多 1 元跳下一級 |
| `mid-grade-two-dependents` | 中段級距；2 眷屬合計 3 人份 |
| `dependents-cap-at-three` | 眷屬恰 3 人，無上限標記 |
| `dependents-over-cap` | 眷屬 5 人只計 3 人並標記 |
| `top-grade-clamp` | 月薪高於最高級按第 58 級計費 |
| `top-range-start-one-dependent` | 第 58 級薪資範圍下限 303,001 |
| `half-up-discriminator` | 恰 2,326.5 四捨五入為 2,327 |
| `salary-zero` | 月薪 0 為 RANGE |
| `salary-decimal` | 月薪小數為 INTEGER_FORMAT |
| `dependents-decimal` | 眷屬小數為 INTEGER_FORMAT |
| `salary-empty` | 月薪未填為 EMPTY |
| `salary-over-limit` | 月薪 9 位數為 INPUT_LIMIT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測：附錄 58 列全表斷言（每級的 selfPremium、employerPremium、governmentPremium 與附錄逐值相等）；每級邊界月薪（級金額與級金額＋1 分屬相鄰兩級）；dependents 3 與 4 的員工合計相同而 dependentsCapped 不同；dependents 99 合法、100 為 RANGE；錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息；核對核心以 §4 的精確整數分子／分母執行 half-up，並以獨立精確有理數逐級重算三項保費。用 `half-up-discriminator` 區分恰 0.5 進位與銀行家捨入。所有 employeeTotalPremium 恆等於 selfPremium × (1＋dependentsCharged)。

候選 gate（均 NOT_RUN）

- 於 `tools/nhi-premium-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「健保費試算」，title「健保費試算｜Gloss Tools」，description「以健保署 115 年投保金額分級表與保險費負擔金額表，試算第一類受僱者的投保級距、本人與眷屬保費、投保單位與政府負擔。」。英文 lang=en，H1 “NHI Premium Calculator”，title “NHI Premium Calculator | Gloss Tools”，description “Estimate a Category 1 employee's Taiwan NHI payroll bracket and the monthly premiums for the insured, dependents, employer and government, from the NHIA tables effective January 1, 2026.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。眷屬超過 3 人怎麼算？依全民健康保險法第 18 條，眷屬保費由被保險人繳納，超過 3 口以 3 口計。 / What if I have more than three dependents? Under Article 18 of the National Health Insurance Act, dependents beyond the first three are not charged.
- FAQ。公司負擔為什麼和我的眷屬人數無關？投保單位與政府依公告平均眷口數 0.56 人計算（合計 1.56 人份），不隨個人實際眷屬數變動。 / Why doesn't the employer's share depend on my dependents? The employer and government shares use the announced average of 0.56 dependents (1.56 persons in total), not your actual number of dependents.
- FAQ。有算二代健保補充保費嗎？沒有。本工具只試算一般保險費；獎金等補充保費不在範圍。 / Does this include the supplementary premium? No. This tool estimates the regular premium only; the second-generation supplementary premium on bonuses and other income is out of scope.
- FAQ。這是健保署核定的金額嗎？本工具依健保署 115 年 1 月 1 日生效的公告表試算，僅供估算；投保金額申報、部分工時與月中加退保等情形以健保署核定為準。 / Is this the amount the NHIA will bill? It is an estimate from the NHIA tables effective January 1, 2026. Reported salary basis, part-time work and mid-month enrollment changes follow the NHIA's own determination.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://nhi-premium.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

參數來源（衛生福利部中央健康保險署 nhi.gov.tw，2026-11-09 查閱）：[保險費負擔比率](https://www.nhi.gov.tw/ch/cp-3257-29d99-2570-1.html)（30/60/10）；[How Premiums Are Calculated](https://www.nhi.gov.tw/en/cp-1112-0dec1-201-2.html)（公式、費率 5.17%、眷屬上限 3、平均眷口數 0.56）；[保險費負擔金額表（五）115.1.1 生效](https://www.nhi.gov.tw/ch/cp-19439-f2f35-2580-1.html)（115 年版 58 級投保金額）；[保險費負擔金額表（三）114.1.1 生效](https://www.nhi.gov.tw/ch/cp-17545-f87bd-2576-1.html)（全表保費金額，公式核對基準）。參數版次會隨基本工資與費率審議變動；改版時須以新公告表重釘本文表格與附錄，不得只改數字不留查證紀錄。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/nhi-premium-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。


## 2026-11-10 維護覆核補記

[本輪來源覆核](PROVENANCE-RECHECK.md) 補充原先未直接取得的來源；其範圍不等於完整規格或產品驗收，原作者歷史證據保留。
