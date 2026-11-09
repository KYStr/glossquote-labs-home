# 從完整預案製作一款工具

此清單是所有工具的最低交接規則。產品算法、I/O、例外與確切測試以固定 `SPEC.md` 和 `fixtures.json` 為準；不得為了套模板縮減產品流程。

## 開工資料

取得 GitHub 上的 task/spec IDs、source、document、九面向 acceptanceCriteria、allowedExecutors。確認自己ACK與claim readback。`tools/<slug>` 是唯一實作範圍，shared catalog/registry/部署由統籌整合。先讀 SPEC 八節與其中與舊工具差異，確認非重複製作。

## 檔案契約

新工具至少提供：

- `package.json`：Node >=24、ESM、明確 test/check/build:preview/check:generated:preview；不新增runtime dependency。
- `public/index.html`、`public/en/index.html` 或產生它們的可重現來源：繁中/英文獨立URL，介面、錯誤、空狀態、說明都翻譯。
- `public/js/core/`：純資料驗證與算法；不接觸DOM/網路/storage，測試能直接import。
- `public/js/app.js`：事件、狀態與安全DOM。使用textContent/value，不能將貼上內容當HTML。
- `scripts/`：可重現preview build、靜態check、loopback serve；不可自動開瀏覽器或變更系統。
- `test/`：依規格字面expected的正常/非法/極限/狀態轉移；獨立推導，不從受測程式生成expected。
- `HANDOFF.md`、`VERIFICATION.md`：固定來源、允許範圍、結果和明確NOT_RUN、使用環境、已知限制、下一位責任人。

媒體/特殊API若原規格需要額外runtime，先完成核准任務與來源授權，不沿用此最低模板假裝可行。不要在產品UI露出內部taskId、agent、claim或測試程序。

## 一個 milestone 的完成順序

1. 寫core資料schema、嚴格驗證與算法，逐項重算fixtures；禁止未知欄位、靜默截斷、幫人猜單位/小數慣例。
2. 完成實際任務主畫面；使用者輸入是中心，示例不冒充真實資料。手機和桌面情境都要可完成該任務。
3. 每次來源/選項修改即使舊結果失效；舊copy/download按鈕同步停用。錯誤可修正且保留原輸入，reset清輸入/輸出/暫存。
4. 非同步重工作使用generation ID防止晚回覆覆蓋新結果；提供有實際作用的取消。純同步短工作不假造進度條。
5. 匯出檔案內容必須與最後一次有效結果同snapshot；需要公式保護時明確告知，不能無聲更改資料。匯出/clipboard只能由使用者觸發。
6. 依SPEC跑離線單元/邊界/狀態與build/check，再用真正隔離瀏覽器驗核心兩語流程、keyboard、尺寸、Network/Storage。未取得隔離或真機不標PASS。
7. GitHub固定commit+PR交驗，交接列完整九面向，等非作者review；修改後保存新commit與受影響測試。

## 共通 UI / SEO / 隱私底線

共用 paper/ink、字級、間距與斷點的實際值見 [工具設計基線](TOOL-DESIGN-BASELINE.md)。按 SPEC 選用，不憑空假設另一個未取得的設計文件。

兩語 `lang`、title、description、h1、canonical及互返 hreflang、x-default；預覽noindex、robots禁止索引，無捏造正式網域。正式域名由主統籌確定後production build才輸出正式canonical/sitemap與index。連回同語系首頁。

純本地工具不傳輸/儲存使用者內容，不加analytics/beacon/remote fonts/CDN。觀察實際Network/Storage，包含同源`/cdn-cgi/rum`及頁面hidden事件；原始碼沒有fetch並非充分證據。CSP/安全標頭依各工具實際需要最小化，不能為消除console錯誤放寬。

可及性：可見label、關聯錯誤、鍵盤完整流程、清楚focus、status不過量打斷、正常字4.5:1/大型字與必要控制3:1、320px及真200%zoom，核心控制不被虛擬鍵盤遮住。指定Chrome+Edge的版本/OS/視窗與限制要有真實記錄；缺證據就是NOT_RUN。
