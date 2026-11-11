# 題庫抽卷與答案表 / Quiz Paper Builder

研究 brief，2026-11-11。建議 slug `quiz-paper-builder`。

## 目標與使用情境

補習班助教或社區課程講師已用試算表整理單選題，今天要從兩到五個主題各抽幾題，印給沒有線上測驗帳號的學員。臨時改題時，最費工的是重抄題號、選項和答案表，還要確保學生版沒有答案標記。講師在桌面一次輸入各主題的題數、預覽對應題號，分別帶走兩份可列印 HTML。平板可核對主題配額與預覽。

成功成果是同批同號的學員題本與講師答案表。相同題庫、主題配額及抽卷代碼可重建同一批題目，供講師下次比對。抽卷代碼只用於可重現取樣。

## 替代方案與差異

- Moodle 的 Quiz 可從題庫分類加入隨機題，也能以 GIFT 匯入題目。已經使用 Moodle 且要發佈線上考試時，這條路包含完整作答流程。本案聚焦手上已有 CSV、需離線分享或印出同一份題本的情境。 [Moodle Building Quiz](https://docs.moodle.org/404/en/Editing_a_quiz) · [Moodle GIFT format](https://docs.moodle.org/502/en/GIFT)
- Google Forms 可建立選擇題、答案鍵和配分，並設定考生能見的回饋。現場沒有登入或網路、需要一份獨立學員檔與一份講師檔時，講師可直接從題庫完成這次交付。 [Google Forms 建立與評閱測驗](https://support.google.com/docs/answer/7032287?hl=en)
- Labs 問答卡製作與練習將 CSV 的問、答兩欄變成可翻面的自學題卡，可用 seed 洗牌並列印同一 HTML 的題目頁與答案對照。此案用四個選項、正解字母及主題題數抽卷，兩個下載各有獨立資料契約，學員檔的標記從生成時只取題目及選項。 [flashcards 固定 SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/56-flashcards/SPEC.md)
- Labs 批次文字套版將來源 CSV 每列套入單一文字模板，輸出逐筆 TXT/JSON。本案先按主題抽出子集並編號，再生成同編號的兩種角色用文件。 [template-merge 固定 SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/43-template-merge/SPEC.md)

## 範圍與流程

1. 選取題庫 CSV 或貼上，按「讀取題庫」。顯示題數、主題、各自可抽題數及格式錯誤位置。提供明確標示的假題範例。
2. 選主題題數、輸入題本標題及抽卷代碼。題數預設每主題 0，標題預設對應語言的「練習題」／「Practice quiz」，代碼預設 `lesson-1`。主按鈕「預覽題本與答案」。主題及配額保留在結果旁。
3. 預覽先見學員題本，可切至講師答案表。結果有明顯區別的「下載學員題本」及「下載講師答案」，兩次點選各帶走一個檔案。講師以自己的瀏覽器開啟後列印或分享。
4. 桌面以文件預覽為主，手機按題庫、配額、預覽、下載直排。首版範圍之外含發佈線上考試、評分及分數管理、帳號、多人同步、主觀題、圖片／數學式渲染、選項洗牌、考試公平性認證和固定頁數保證。

## 輸入、輸出與字面案例

- 一份 ≤512 KiB 的 UTF-8 逗號 CSV，可有檔首一個 BOM，支援雙引號、雙引號轉義與 CRLF/LF。表頭精確 `id,topic,prompt,a,b,c,d,correct`，1–500 題，1–30 主題。fatal 解碼；壞欄、無效 Unicode、NUL 或單獨代理碼元阻止整份題庫。格式錯指到 CSV record／欄。
- `id` 全庫唯一，為 ASCII 字母或數字開頭，之後 0–31 個 ASCII 字母、數字、底線或連字號。主題 1–60 Unicode 碼點，單行，首尾無 ASCII 空格，按精確字串分組。題目 1–500 碼點，四個選項各 1–200 碼點；都需非全空白，保留文字與引用欄內換行。四個選項的原字串必須兩兩不同。正解固定 `A`–`D`。草稿標題 1–80 碼點，單行。除題目和選項的換行外，文字欄拒絕 C0/C1 控制碼。
- 每主題配額為 0 至該主題題數，總數 1–60。抽卷代碼 1–32 個 ASCII 字母、數字、底線或連字號，不去空格。輸出各 ≤2 MiB。兩個檔名固定 `quiz-student.html` 及 `quiz-answer-key.html`。UTF-8 無 BOM、LF、末尾一個 LF。學員檔只有標題、題號、題目、A–D 選項；講師檔只有標題和題號、題庫 ID、主題、正解字母與正解文字。兩者可見文字沿頁面語言，題庫字串照原值。

```csv
id,topic,prompt,a,b,c,d,correct
G01,地理,哪一個是島？,蘭嶼,中央山脈,大肚溪,霧峰,A
G02,地理,哪一個是河流？,阿里山,淡水河,澎湖,玉山,B
M01,音樂,以四分音符為一拍時，四分休止符占幾拍？,兩拍,三拍,四拍,一拍,D
M02,音樂,四分音符等於幾個八分音符？,一個,兩個,三個,四個,B
```

各主題選 1 題，代碼 `lesson-1`，標題「混合練習」。學員檔可見文字如下；正式驗收以固定語義結構及凍結的序列化案例為準。

```text
混合練習
1. 哪一個是島？
   A. 蘭嶼  B. 中央山脈  C. 大肚溪  D. 霧峰
2. 以四分音符為一拍時，四分休止符占幾拍？
   A. 兩拍  B. 三拍  C. 四拍  D. 一拍
```

講師檔的兩筆對照依序為 `1 | G01 | 地理 | A | 蘭嶼` 及 `2 | M01 | 音樂 | D | 一拍`。學員檔使用同樣題號，HTML bytes 不隨這些題的正解字母改變。

## 演算法、狀態、資料生命週期及依賴

每題計算 `SHA-256(UTF8("gq-quiz-v1\n" + seed + "\n" + id))`，十六進位小寫，固定以字串逐位順序比較。各主題按雜湊由小到大挑前 N 題，平手以 ASCII ID 字典序；按主題 UTF-16 code unit 順序，再按該主題抽取順序連續編號。題庫排序調動不改結果，新增題目可能改變該主題結果，換代碼可能抽到相同題。SHA-256 只作固定排序值。

題庫解析與雜湊取樣用 Worker，執行中提供取消。讀取、可抽卷、運算中、可預覽、錯誤與取消有清楚文字。任一來源、配額、標題或代碼變動立即撤銷兩種下載及舊預覽。取消保留可用題庫與設定，重設、pagehide、換語及 BFCache 返回釋放本機資料、Worker 和 Blob URL。產物只有明確點下載才生成 Blob URL。

學員與講師各自使用只帶當前文件必要欄位的資料模型。固定 HTML 模板以安全文字跳脫動態資料，無使用者 HTML、script、遠端圖片、字型或超連結。HTML 本身含 charset、lang、noindex 與內嵌的固定列印 CSS，題組避免跨頁的處理由實際紙張驗收確認。使用 Web Crypto、File、Worker、Blob、TextDecoder 及純 JS parser，無安裝與第三方 API。初始靜態載入後不因處理題庫發出網路請求。

## 語言、SEO 與驗證

繁中搜尋文字為「題庫抽卷與答案表」與「依主題從 CSV 抽題，分開下載題本和解答」，英文為「Quiz Paper Builder」與「Draw multiple-choice questions by topic and download separate student and answer-key files」。雙語靜態入口、canonical、hreflang、同語首頁、候選 noindex。內容字串原語保留。

| 案例 | 獨立預期 |
| --- | --- |
| 上述例，`lesson-1` | 取 G01、M01，正解 A、D。SHA-256 的 G01 前綴 `99daada7`、G02 `af2294ab`、M01 `091965b7`、M02 `d3157a50`。 |
| 原 CSV 四列倒序 | 同配額和代碼仍取 G01、M01，兩種檔案 bytes 一致。 |
| 抽卷代碼換 `lesson-3` | 取 G02、M01，正解 B、D。G02 前綴 `b8f8eed7` 小於 G01 `bf40a7e4`。 |
| 將 G01 的正解 A 改成 B | 學員檔 bytes 相同，講師首列的題號、ID、主題保持 1、G01、地理，答案變 B、中央山脈。 |
| 地理配額 3、題庫有 2 題 | 定位該主題配額錯誤，兩份檔案皆停用。 |
| 題目為 `<img src=x onerror=alert(1)>` | 瀏覽器只顯示字面字串，獨立 HTML 中是已跳脫文字，沒有新增 img、handler 或網路請求。 |
| 合法輸出 60 題與 61 題 | 60 可出檔，61 阻止抽卷。 |
| 改代碼後取消並注入延遲舊 Worker 結果 | 顯示現行草稿及取消，舊題本和答案均無法下載。 |

九面向預計採樣 functionality（題號配額、字面案例、兩檔結構）、boundaries（重名、配額、容量、取消）、privacy（Network/Storage 與學員檔資料最小化）、security（輸入跳脫、兩文件模型、CSP）、usability（從題庫到兩角色文件交付）、accessibility（鍵盤、讀屏、320 CSS px、200% zoom、印刷可讀性）、localization-seo（雙語及同語導航）、toolchain-provenance（固定 bytes 及同一 PR head）、compatibility（隔離環境實際下載及代表性瀏覽器列印預覽，原生列印依相應驗收許可）。產品檢查皆待執行。

## 接續

主對話確認與問答卡的使用者和成果差異後，可發布至 `docs/specs/quiz-paper-builder/BRIEF.md`。正式承接者須固定兩種 HTML 語義結構及 SHA-256 取樣案例，再補 SPEC、fixtures 與作者自查交非作者審查。產品預定 `tools/quiz-paper-builder/`，以同一生成快照驗證兩個輸出。
