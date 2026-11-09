# Box Shadow Builder 作者文件查核

Spec ID：`spec-box-shadow-builder-v1`  
對應版本：v1 r2，2026-10-30  
狀態：作者已依原非作者 R1 修訂並完成受影響文件自核，等待獨立複審。不是產品測試、品質分數、ready 或部署聲明。

## 精確文件

- [SPEC.md](./SPEC.md)：37,635 UTF-8 bytes；SHA-256 `4befa00eed81e5510ffa1996f2fe26247514572de2277a902e8761a6de76ae6f`。
- [固定開工 brief](https://github.com/KYStr/glossquote-labs-home/blob/368fb4ba06b884bc126d0186355d197efc90b285/docs/specs/box-shadow-builder/BRIEF.md)：5,421 bytes；SHA-256 `61509d91a6b8662de04ae45fa4a3c8789a32309cad69d97f78a2d1a4d27943c0`。
- 文件使用 UTF-8、無 BOM、LF、末行 LF。提交後仍須以固定 commit 讀回，不能只有本地 hash。

## 已實際做的文件核對

| 必要章節 | 本次核對到的具體內容 | 邊界 |
| --- | --- | --- |
| goal | 網站維護者的卡片陰影幾何/層次用途、可觀察成功條件與需求假設 | 沒有虛構訪談或使用率 |
| scope | 1–4 層及排除項；Color Palette、Gradient Builder、Image Overlay 固定來源及用途/輸入輸出差異 | 不搬既有 reserved owner，不把 catalog 展示數當庫存 |
| userFlow | 初始空 HEX、顯式產生、整層排序、修錯、複製/下載、取消及生命週期 | 不依賴隱藏輸入或自動範例完成 |
| inputsOutputs | 字串 schema、端點、首錯優先、RGBA alpha、三行 CSS、MIME/檔名/bytes、URL 與 generation | 長度先於格式；blur -64 與 -1 的不同錯誤已明說 |
| implementation | 純核心/controller/真 DOM、靜態 ESM/Node24 零依賴、CSSOM 固定 rule、CSP、雙語/可及性 | 沒有新增產品程式或套件 |
| acceptance | 九面向各自方法/期望/證據與 NOT_RUN 界線 | 不預先給分、不用測試數換品質 |
| tests | T01–T11 計畫及 B01–B08 必要原生情境，獨立 expected 與晚到事件負例 | 標號存在不代表任何產品測試已執行 |
| handoff | 同 ID 固定候選、非作者八布林、修訂及另 production claim | 作者不可自 ready，不捏造文件八項 90 |

已實際讀相近三件固定規格與主頁基線，再比較輸入、主要操作及輸出；本件不是把背景漸層改名。CSS 語義依 SPEC 所連結的固定 W3C 章節核對，特別避免把不同繪製平面說成任意前後層、把 inset 正偏移說成 outer 的右下投影，或要求模糊跨瀏覽器像素完全相同。

本次以標準函式做文件查核：八個頂層章節恰為 1–8；九面向列齊；T01–T11/B01–B08 計畫標號存在；無 BOM/CR、末行 LF。直接抄錄規格單層期望文字獨立計算為 **228 bytes**；四個最長合法 token 組合（inset、兩個 -48、blur64、spread-24、三位 RGB、0.99）加固定中文註解為 **411 bytes**，小於 1024 上限。這是文件長度推導，不是呼叫未存在的產品 serializer 得出的綠測。

逐項人工核數值計畫：x/y −49/−48/−47/47/48/49，blur −1/0/1/63/64/65，spread −25/−24/−23/23/24/25，opacity −1/0/1/99/100/101；保留原始長度、符號、格式、mode/HEX、0/1/4/5 層及首錯順序。防守性 E_OUTPUT_LIMIT 不能在有界合法輸入下自然到達，規格明示由長度上界保障，不假造正常使用反例。

## r2 窄修與保留歷史

原 r1 固定候選 `600927aad37872a47d1507f380066c103ba8f025` 及 [非作者報告](https://github.com/KYStr/glossquote-labs-home/blob/1da9b9b8d51ab56f50b32fa654fc97173b9d05b2/docs/specs/box-shadow-builder/REVIEW-600927a.md) 保留。R1 指出「編輯或再下載立即 revoke」與「不得早於瀏覽器接收」沒有可觀察 ACK 可同時滿足；作者接受這個文件矛盾，沒有稱已重現原生下載 bug。

本次只改版號及 §3.2、§3.3、§3.4、§4.4、T09、B06 的受影響敘述：有效結果及新的取出權立即失效；已提出下載的獨立單一 lease 保留原 30 秒期限。普通 edit、確認清除、重新產生及連按不撤銷、不替換、不延長 lease；lease 活著時停用新下載。到期僅依目前有效結果/對話框/頁面狀態開放新下載，舊 timer 不影響新 URL。hidden/pagehide/dispose 可提前 purge，明示可能中止尚未接收的下載，不承諾 OS 完成/取消。Blob/URL/click 失敗清理的原契約保留。

文件自核重新執行，八節、九面向及 228/411-byte 算術結果未變。精確差異只有上述 8 個文字替換（含版號），反向還原逐字等於原 r1 SPEC；第 6 節九面向表逐字未改。T09/B06 現要求下載後立即編輯、重產生、清除、連按、到期與晚到 timer 的明確結果。這些是新文件計畫與契約一致性自核，不是已執行產品測試或獨立通過。

## 公開內容與未完成項

人工核本次文件只含產品需求、固定公開來源、契約、測試計畫與交接；另掃描私人工作區/家目錄樣式、內部對話/操作卡識別及常見憑證標記，沒有命中。沒有真實使用者輸入、憑證、私人路徑或聊天摘錄。必要協作登記依原協議另存，不混入產品文案。掃描不是對所有秘密形式的萬能證明，因此仍保留人工全文核對。

產品程式：NOT_CREATED。產品純測、正常瀏覽器/剪貼簿/下載、可及性實機、完整九面向：NOT_RUN。這份文件沒有聲稱獨立審查已通過，也沒有聲稱已具備公開可用網址或授權條款。

下一步：固定 commit 的 SPEC/本文件與 open draft PR 交非作者；若有漏項，同 spec ID 留歷史窄修及複審。只有原協議八節布林完整度通過並合法登記才能算 spec ready；正式產品另 claim，仍須完成九面向必要證據。
