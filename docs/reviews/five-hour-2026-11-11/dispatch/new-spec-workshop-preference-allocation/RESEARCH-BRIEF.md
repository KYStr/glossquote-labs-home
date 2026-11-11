# 工作坊志願與座位分配 / Workshop Preference Allocation

研究 brief，2026-11-11。建議 slug `workshop-preference-allocation`。

## 目標與使用情境

社區活動的志工已收齊同一時段的手作課報名。每個人填了最多三個志願，每間教室有固定座位。志工在桌面整理好優先次序後，要一次分配座位，交給各教室的值班人員一份名單，同時保留未分到的名單供人工聯絡。現場人員可在手機核對一間教室的人數及報名代碼。

成果包含各教室的已分配人數、剩餘名額和名單，以及未分到座位的報名代碼及原因。可下載整批或目前所選教室的 CSV。規則是依已排定的報名表資料列順序，讓每個人拿到當下仍有座位的最高志願。先處理者可能用掉後面某人的唯一志願，因此分配結果適用於已選擇這個優先規則的活動。

## 替代方案與差異

- Google Forms 可下載回覆或連到試算表。操作者可以用試算表排序與逐列扣名額；只要名額或次序有改變，就需要重做之後的列並維護各班名單。此案接收已排定順序的精簡 CSV，畫面預先展示實際分配順序。 [Google Forms 管理回覆](https://support.google.com/docs/answer/139706?hl=en)
- SignUpGenius 可設定某時段的報名名額並讓參加者直接選擇。主辦方能重開報名時可採這種流程。此案服務已收完志願、只剩分班和交接的主辦人。 [SignUpGenius 編輯時段名額](https://support.signupgenius.com/hc/en-us/articles/29465622089879-Edit-Sign-Up-Slot-Quantity)
- Labs 名單隨機分組輸入一人一行及組數，以洗牌後平衡切組，核心成功條件是組間人數差 ≤1。本案保留主辦人指定的優先順序，教室容量可相異，且可能留下未分配者。 [random-groups PRODUCT.md](https://github.com/KYStr/glossquote-labs-random-groups/blob/a8711a7cb8dc477dfee18c5667935c5be44602e1/PRODUCT.md)
- Labs 同行群分桌對不可拆散的群體做回溯，滿足指定桌、容量和無階通行，結果是完整可行配置或無解。本案逐人比對有序志願，允許自然形成的未分配名單，並交付各場名單。 [table-seating SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/c8edde6a8d2a83d69a5ef863057184d0ee5022d0/docs/specs/table-seating/SPEC.md)
- Labs 交換禮物配對以禁配方向和完整匹配找一人一送一收，且個別揭示結果。本案以一個教室容納多位參加者，產物是主持人可核對的分班清單。 [gift-exchange-match SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/c8edde6a8d2a83d69a5ef863057184d0ee5022d0/docs/specs/gift-exchange-match/SPEC.md)

## 範圍與流程

1. 貼上或分別選取工作坊與志願 CSV。以報名代碼辨識參加者，來源欄限定為下列最小欄位。範例使用虛構代碼和課名。
2. 預覽教室名額、報名順序和志願。主按鈕「依表格順序分配」旁說明先到的資料列先分配，讓使用者在來源表排序後重新匯入。
3. 確定分配後，結果區以各班已分配／剩餘名額為主。切換至「未分配」顯示志願已滿或未填志願。下載整批分配，或選一間教室後下載該班名單。
4. 桌面讓名單／候補為主區，教室切換及下載放結果旁。手機保留同樣操作，表格超寬時在具名結果區捲動。首版範圍之外含收集報名、寄送、抽籤、跨時段、團體一起分班、最大化總錄取、指定特權與自動遞補。

## 輸入、輸出與字面案例

- 兩份 UTF-8 逗號 CSV，各 ≤128 KiB。可有開頭一個 BOM，使用雙引號與雙引號轉義，接受 LF/CRLF，固定表頭。表頭、欄數、結構、控制碼、UTF-8 或參照有錯時，報來源及 record／欄號，保留草稿。
- 工作坊 CSV 表頭 `workshop_id,title,capacity`，1–30 列。課名 1–80 Unicode 碼點、非全空白，單行且禁止控制碼，畫面按原字串顯示。名額為 1–500 的 ASCII 整數，首字元 1–9。
- 志願 CSV 表頭 `participant_id,pref1,pref2,pref3`，1–500 列。兩種 ID 都用 ASCII 字母或數字開頭，之後 0–31 個 ASCII 字母、數字、底線或連字號。以原字串區分大小寫，各來源 ID 必須唯一。志願必須引用工作坊 ID、互異且從左連續。三欄皆空保留，狀態為 `no_preference`。使用全 ASCII 的識別欄，避免自動把姓名、電話或電郵帶進名單。
- `workshop-assignments.csv` 使用 UTF-8 無 BOM、CRLF、末列無 CRLF，欄序固定 `participant_id,workshop_id,status,preference_rank`，資料列遵照志願表原順序。分配成功是 `assigned` 和 1–3 的志願序，已滿是 `choices_full`，未填是 `no_preference`。後兩者的工作坊與志願序欄空白。單一教室的 `workshop-01-roster.csv` 以教室輸入順序做固定的安全數字尾碼，欄位相同且只含該教室的已分配列，空班可下載表頭。

工作坊與志願 CSV 如下。

```csv
workshop_id,title,capacity
W1,手縫,1
W2,木工,2
```

```csv
participant_id,pref1,pref2,pref3
R01,W1,W2,
R02,W1,W2,
R03,W1,,
R04,W2,,
R05,,,
```

整批下載的邏輯內容如下。W1 使用 1/1，W2 使用 2/2，未分配 2 位。W2 的單班檔只有 R02、R04 的資料列，仍以 R02 在前。

```csv
participant_id,workshop_id,status,preference_rank
R01,W1,assigned,1
R02,W2,assigned,2
R03,,choices_full,
R04,W2,assigned,1
R05,,no_preference,
```

## 演算法、狀態、資料生命週期及依賴

先檢查兩表全部語法、列數、ID 與參照，再以 `Map` 以工作坊 ID 記錄容量與剩餘數。按報名表原順序逐列處理，按志願 1、2、3 檢查。找到第一個剩餘數大於 0 的志願便扣一席，留下該志願名次。三欄皆空和所有志願無位是不同結果。資料核對有效時，清單總計符合「已分配＋志願已滿＋未填志願＝總人數」，每班座位數與合計匹配。

空白、讀取、可分配、分配完成、錯誤與已取消均有文案。兩個來源讀取各有工作代號，取消或更換來源停止讀取並保留可重試草稿。分配核心上限 1,500 次志願檢查，採有界同步運算；可取消的是讀取，短分配操作直接更新結果。欄位或來源一變更，名單及 Blob URL 即失效。重設、pagehide、語言切頁、BFCache 返回清空資料引用；匯出由使用者點擊，單班檔內容限該班代碼與分配欄位。

純 JS、FileReader、Blob 及已核對可重用的嚴格 CSV parser。課名只用安全文字節點，ID 字元集和固定欄位使匯出值具明確語法。含前導零的數字 ID 建議用試算表的文字欄匯入。初始資產載入後全程在瀏覽器記憶體處理，無登入、API、儲存或工作資料網路請求。

## 語言、SEO 與驗證

繁中標題「工作坊志願與座位分配」，英文「Workshop Preference Allocation」。搜尋敘述使用「依報名優先順序、志願和座位數產生分班名單」與「Assign workshop seats from ranked preferences and export class rosters」。雙語靜態入口、同語首頁、lang、canonical、hreflang；預覽 noindex。英文及繁中 CSV 內容一致。

| 案例 | 獨立預期 |
| --- | --- |
| 上述例 | W1 R01、W2 R02/R04、志願已滿 R03、未填 R05。 |
| 只將 R03 移到首列 | R03 取得 W1，R01/R02 取得 W2，R04 志願已滿，R05 未填。 |
| 將 R01 改為 `R01,W1,,W2` | 志願空缺錯誤，定位第 2 record，分配停止。 |
| 將 R02 改為 `R02,W1,W1,` 或 `R02,W9,,` | 分別為重複志願、未知工作坊，無匯出。 |
| 工作坊 W1 名額 2，兩個參加者都只填 W1 | 兩人均分配，剩餘 0；將名額降到 1，第二列 `choices_full`。 |
| 合法 500 位及額外第 501 位 | 500 位可分配；501 位在解析預檢被拒絕。 |
| 修改檔案後先看到新輸入錯誤，再收到舊讀取成功 | 保留目前錯誤，沒有舊結果及下載。 |

九面向的驗證包括 functionality（順序、名額守恆及兩種 CSV）、boundaries（重名、引用、空志願、取消及大小）、privacy（分頁、下載及 storage/Network）、security（資料 inert、固定輸出名、限制與 CSP）、usability（名單預覽、單班交付與未分配原因）、accessibility（鍵盤、錯誤定位、320 CSS px、200% zoom）、localization-seo（兩語頁面及同語導覽）、toolchain-provenance（離線固定候選與 bytes）、compatibility（獲准隔離的桌面和代表性行動端下載）。產品檢查皆待執行。

## 接續

主對話重新確認本案和已登記分組工具的實際差異後，可發布固定 brief 至 `docs/specs/workshop-preference-allocation/BRIEF.md`。正式規格需先固定優先順序、CSV schema、取消與資料分享範圍，由非作者重算。產品預定 `tools/workshop-preference-allocation/`，依正式 claim 及 PR 流程承接。
