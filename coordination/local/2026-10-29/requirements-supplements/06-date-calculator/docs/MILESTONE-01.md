# 日期工具雙語實作 milestone

2026-09-29。範圍：依現有T00–T06順序，交付日期差、含起訖日計數、帶符號加減天數的獨立靜態網站。兩語完整介面／說明／SEO，無套件、無Date時間點計算，0001-01-01..9999-12-31。未完成目前task必要驗收不開始下一task。

## 結構與設計

模式為 Product App／Operate。主要工作是填日期後直接讀答案；日期差的兩個答案須同時可見。暖紙#f3f0e8、墨色#111410、白#ffffff、酸綠#c8f56a、邊線#60645c、錯誤#8f2119沿用家族語意token。Segoe UI/system sans作介面、Cascadia Mono僅用於數字結果；不下載字型或插圖。

桌面：簡短品牌／語言列 → H1及一句說明 → 原生radio模式 → 開始日期／交换／結束日期的一列 → 主日期差與含起訖日的兩欄答案 → 規則＋清除 → 操作教學／FAQ。加減模式於相同工作區顯示基準日期／帶符號天數 → ISO結果日期。手機保持順序，輸入與答案各單欄；不把核心工具藏在摺疊項內。沒有裝飾卡片網格、巨型品牌hero或自製日曆。

依frontend-design、Impeccable及UI/UX Pro Max的任務優先、欄位錯誤、鍵盤、對比及觸控原則審查。品牌與既定線框已固定，直接延伸；不執行不在本任務範圍的外部技能binary／下載／hook／設計生成器，不把未執行的搜尋說成資料庫結果。視覺採一次桌面＋手機檢查、集中修正，再確認一輪。

## 驗收門檻

- T00工具鏈與路徑邊界通過；T01官方日期規則及邊界研究有紀錄。
- 核心D01–D17 exact assertions；每年1月1日及月末共129987日期round-trip；獨立Python datetime oracle核對邊界與合成樣本。它只當離線測試依據，產品不使用Date／時間／時區。
- dateDifference/addDays重驗schema，非string、未知key、getter、超長、Unicode、錯誤日期、非整數及超界全拒絕；不能只靠HTML date欄位。
- 兩語原始HTTP頁面測正向／負向／同日／閏日／極值／超界、交換、切模式、清除／焦點、語言切換、鍵盤、320px。不能測的人工項目明列NOT_RUN。
- 原生date配合核心驗證；不支援時有ISO文字fallback。no-JS控制保持disabled、規則仍可讀；fallback需以真實產品同源fixture驗證並恢復原檔。
- 最終test/check/build全數通過；dist只含public且hash一致；檔案修改限本工具及本機證據，既有單位工具／GlossGate變更保持。
- SEO：兩語title/description/lang/H1/操作說明/FAQ/可見互鏈完整；預览noindex保留，不填虛構canonical或假分數。

所有人工待驗允許繼續的授權只影響不能執行項目，不將它們變成PASS；完整MVP人工驗收與正式發布狀態維持分開。

## T03 固定 DOM／i18n 介面（供分離派工）

兩語頁面擁有完全相同的id。form=`date-form`（novalidate，submit由app.preventDefault），全部工作控制放在初始disabled的fieldset=`calculator-controls`，標題=`page-title`。原生radio name=`calculation-mode`：`mode-diff` value=diff預選、`mode-offset` value=offset；可見label包住radio，至少44px。

`diff-panel` 初始可見，含type=date的`date-start`／`date-end`、交換button=`swap-dates`。`offset-panel` 初始hidden，含type=date的`date-base`、type=text的`day-offset` value=0；天數inputmode=text以保留正負號輸入（真機另驗）。所有date都有min/max，無value預填；date不支援時瀏覽器自然退化text。HTML不設maxlength造成靜默截斷，核心先驗原長度。

四欄依序對應help/error：start-help/start-error、end-help/end-error、base-help/base-error、days-help/days-error；error初始hidden且空白。input用label for及aria-describedby連help，app發現錯誤加上error id與aria-invalid=true。原生date若value空但validity.badInput為true，呈DATE_FORMAT，真正留白為EMPTY；原生檔案格式的sanitization不能取代核心驗證。

`diff-results` 初始可見，包含output=`diff-result`與`inclusive-result`；`offset-results` 初始hidden，包含output=`date-result`。output都以—初始、aria-live=off；可見規則／方向文字=`result-note`。清除button=`clear-input`始終可見。獨立status=`calculation-status` role=status aria-live=polite aria-atomic=true，節制播報；可用visually-hidden類別。`unsupported-note` 初始可見，app成功後hidden；noscript說明另保留。

app.mjs只讀document.documentElement.lang（zh-Hant或en）並import固定本地getMessages(lang)。i18n.mjs提供深凍結字典：`empty.diff/offset`；`errors`含全部固定錯誤碼但不含EMPTY；`direction.forward/backward/same`；`status.diff`字串含{delta}/{inclusive}，`status.offset`含{iso}；`offsetRule`為正負天數規則。模板僅插入已驗證的整数／ISO結果，再用textContent。兩語靜態標籤、標題、說明不由app整頁翻譯。

事件同步input/change：先清output/error，再驗當前所有欄；錯誤按視覺順序，不跳焦點。state在empty/invalid/valid間變化或change才更新live文字；input有效→有效不逐字朗讀。交換只交換原始date.value。清除日期／錯誤／結果、offset回0、焦點至當前首個date。切模式清所有日期、offset回0，顯示匹配panel/results；焦點留在radio。載入／重整／語言導覽／pagehide後返回初始diff與空日期；pagehide清工作內容、停用，pageshow重新初始化，不累積重複事件。
