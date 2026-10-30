# CSS Grid Layout Planner 規格作者查核

Spec ID：`spec-css-grid-layout-planner-v1`。版本v1 r1，2026-10-30。這是文件作者自查，不是非作者完整度決定、產品測試／品質分數或部署。

## 固定文件

- 開工BRIEF：commit `6c956a57f5ef3cafc690adb1d4b3c72a6ccb144d`，`docs/specs/css-grid-layout-planner/BRIEF.md`，6715 UTF-8 bytes，SHA-256 `05cc91b84179de466535943535d06ce74f9a6184e7e5b89d3c13580682372966`。
- 本版SPEC：33391 UTF-8 bytes，SHA-256 `d477e1a12ff93c8c28be3e52803b08fa7823525a7a19fc11e1b804396286f0c1`；同目錄 `SPEC.md`。以含兩份文件的固定PR head交非作者。
- 主頁與六個近似方向的固定來源在SPEC §2；它們是參照，不移轉既有工具owner，也不是其產品的新驗收。

## 八節逐項自查

| 必要節 | 本版位置 | 可反駁內容 |
| --- | --- | --- |
| goal | §1 | 特定網頁布局情境、六個正常成果、假設與非目標；未偽造市場研究 |
| scope | §2 | 欄列／高度／gap／塊數硬界，六相近項用途差異，固定brief/source及不重複依據 |
| userFlow | §3 | 初值未產生、正常增刪／來源排序、交易失敗、copy期限與晚到、download lease、modal與背景重設 |
| inputsOutputs | §4 | 所有結構先驗、raw長度／canonical整數／範圍／起訖／pair次序；半開矩形及確定CSS字面例 |
| implementation | §5 | core/controller/app責任、真CSSOM及幾何、安全sink/CSP、雙語/AT、零依賴clean命令和FAQ擴充／復原 |
| acceptance | §6 | 九個未來產品面向各有方法／預期／同候選證據；必要未測不算過、無平均補分 |
| tests | §7 | A–D獨立手算、T01–T20明確反例與預期、B01–B03恢復；純測不代正常原生 |
| handoff | §8 | 固定兩檔及draft PR、非作者八節ready、同ID修訂；production另task/claim，不自評或部署 |

## 已執行的文件核對

- 八個主節1–8唯一且完整，T01–T20唯一且完整；全文未含BOM或字面跳行跳脫排版錯誤。
- §4.3例A為18行、最後LF、1034 UTF-8 bytes；SHA-256 `cb0693497791adca1d43c7719499fddc2e6f34decb3439ac35e459bfc558c364`。所有CSS行有固定中文說明。
- 以同字面模板替換合法最大C6/R6/H160/G32及12個來源序號，54行、3052 bytes，小於8192bytes防守上限。這是規格模板算術，不是未來serializer已實作或測試通過。
- 有理數另核A欄寬584/3、第三塊x608/3與寬1192/3；C高度1120、欄寬220/3；A面積6、B面積2、C十二單格面積12、D面積1與描述一致。
- 讀回固定CSS Grid標準入口；只用線／track／來源順序語義作依據，產品上限、非重疊限制及格式是本版決策。
- 已人工檢查結果generation與下載lease互不混用：編輯／清除不撤已啟動lease；hidden/pagehide/dispose是明示purge例外；邏輯30秒不假稱凍結主執行緒仍可準時實際revoke；無下載完成ACK承諾。
- 公開兩檔只含必要產品規格、來源及自查；不含私人路徑、執行身分、內部對話、真實使用者輸入、憑證或新增服務設定。

## 尚未做及限制

產品程式尚未製作；產品test/check/build、真瀏覽器幾何／鍵盤／Network/Storage、clipboard/download、BFCache、讀屏、真200%zoom及非作者FAQ擴充均NOT_RUN。文件自查不能換成這些證據，也不宣稱九面向已90分。

本版普通物件API不保證檢視敵意Proxy；外部HTML/CSS內容適配不保證；不自動修閱讀順序。下載30秒邏輯lease不保證瀏覽器接收／落盤，背景purge可能中止未接收下載；系統clipboard可能在本頁取消後仍完成。正式origin／部署／SEO與其他瀏覽器、mobile未驗狀態保持明確。

請非作者針對同PR head逐節核實，特別檢查錯誤優先序、清除／背景與copy/lease並行、預覽幾何及CSS模板是否一致。如需修訂，保留本版來源及報告，同spec ID另版重交。未獨核前不計ready庫存；不補造文件數值分數。
