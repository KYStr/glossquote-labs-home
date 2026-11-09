# A 組獨立預案覆核

審查者 `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/stock_b`，與 A 組文件原作者不同。固定候選 `aab724b71589664b26c8d92735a637ac37f0c4b2`，tree `344f4a6a262fe77fd1867ed43a4d584071ff4661`。覆核開始時 PR open、固定 head 相符。 [PR 72](https://github.com/KYStr/glossquote-labs-home/pull/72)

以 GitHub PR changed files、固定 commit tree 和本機位元組計算 Git blob。81 件共 576,332 bytes 全數吻合，80 份文件的 SHA-256 也與 manifest 相符。依 r807 的 130 筆快照核對題目與來源，核對 29 個固定相近原規格的來源與相關範圍。A 組範圍集中在資料、文件與開發操作。連續數值區間與 B 組實體票號／器材周轉以不同單位、約束和交付物分開。

逐份閱讀目標、範圍、流程、輸入輸出、實作、驗收、測試、交接及 BRIEF。判斷包含可操作的桌面與手機情境、手動輸入界線、有限演算法、確定排序、錯誤及輸出規格。逐份核對 6 件以上字面案例，合計讀 145 件核心案例。Node 24.14.0 的證據腳本對每件重算代表性核心及邊界、核 60 件 controller 的輸入、期望、取消和較舊結果。共同驗收節包含九項固定證據和門檻、同一固定 PR、雙語 SEO、實際隔離 Chrome 與 Edge、Network/Storage，及正式站獨立檢查。這些皆為預案中的未來產品 gate，維持 NOT_RUN。

| 規格 | 工作與範圍證據 | 算例／界線證據 | 文件結論 |
| --- | --- | --- | --- |
| `unicode-key-collisions` | 資料整理者由來源欄查 alias，桌面用列號回表，手機展開碼點。舊文字整理／翻譯鍵比較各處理不同產物。 | NFC 把第 1、2、4 列 é 合群，U+0065 U+0301 保留原碼點。NFKC 才合全形 A。64 scalar、控制字元與未配對 surrogate 有界線。 | 八節核實，可進 ready 登記 |
| `text-offset-map` | 開發者由單一診斷 offset 回源，桌面與手機都可用來源行欄。現有 UTF-8 Base64 與文字分段各處理整份轉換。 | A😀 後為 UTF-8 5／UTF-16 3／scalar 2。LF 後座標 8／5／4、行 2 欄 1。中段拒絕，空文結尾游標 0 合法。 | 八節核實，可進 ready 登記 |
| `text-file-line-endings` | 維護者桌面選檔看 raw bytes，手機先看換行計數及轉換副本。舊文字／CSV 工具各未提供同類逐終止符的輸入位元組證據。 | 首 BOM、混合 CRLF/CR/LF、空檔和 overlong 已重算。雙 BOM 的 strip 契約與無條件冪等測試衝突，見下。 | tests 需退修，其他七節已核實 |
| `decimal-column-parser` | 來源欄匯入時先選慣例，桌面逐列回填，手機讀壞列。現有算術工具求結果，CSV 工具整理原始欄。 | 1.005→1.00、1.015→1.02。負 tie -2.5→-2、-3.5→-4。18 位整數保真，混合壞列不提供 cleanValues。 | 八節核實，可進 ready 登記 |
| `weighted-percentile` | 品質工程師查實測離散頻次，手機讀秩與來源列。骰子理論分布／權重決策各為不同工作。 | N=10 時 P60 秩 6、累計到 6 選 20，P60.01 秩 7 選 30。核 P0/P100、負零合群、整數總頻次與錯列。 | 八節核實，可進 ready 登記 |
| `candidate-key-audit` | 同一匯入表測多組欄並回原列。既有對帳需要兩份表及事先決定的鍵。 | id 在物理 2、3 列撞鍵，dept+id 是測過的最小唯一組。a+b/c 與 a/b+c tuple 不碰撞。空值與重複分列。 | 八節核實，可進 ready 登記 |
| `json-patch-preflight` | 開發者桌面兩欄預檢設定和操作，手機重現首個失敗。既有 JSON 格式化及雙語鍵檢查各有自己的輸入／產物。 | /\~01/a\~1b 先解 ~1 再解 ~0 得 ~1 和 a/b。陣列插入移除後 [b,c]。test 第 2 步失敗停止整批，禁 prototype 路徑。 | 八節核實，可進 ready 登記 |
| `markdown-anchor-audit` | README 維護者在桌面修來源列、手機查重名。舊 Markdown 渲染、書籤整理無這個靜態檢查。 | 連結第 1 列可指第 2 列 setup。兩個 build-notes 目標依本工具窄規則為 ambiguous。fence 內假標題被跳過。 | 八節核實，可進 ready 登記 |
| `unified-patch-check` | 維護者兩欄檢核指定位置的單檔補丁，手機查空白差。既有文字差異工具以兩份文件產生 diff。 | 雙 hunk 舊／新索引 (1,1)、(2,3)，結果 a/x/b/C。零長區間可全刪，空白不同在補丁第 4 列中止。 | 八節核實，可進 ready 登記 |
| `fixed-width-slicer` | 移轉人員依規格上的 bytes 欄寬驗原記錄，手機看中文字切界。不同於 CSV 分隔或文字分段。 | A中加兩空格各欄 byte 1/3/2。😀X 在 byte 2 截斷，é 寬度不合先報 LENGTH，U+FEFF 在欄首保留。 | 八節核實，可進 ready 登記 |
| `binary-record-inspector` | 開發者桌面以 offset 讀多欄，手機可查 signed 值。單整數表示與全檔校驗各無有向 endian 欄位。 | DataView 重算 FF80 的 65408／33023、80 為 -128，u64 全 FF 為 18446744073709551615。越界拒絕。 | 八節核實，可進 ready 登記 |
| `log-gap-audit` | 維運從事件的原序查相鄰缺口，手機看最小重現。工時與活動流程關注工作時長及計畫。 | 10→13 少 11、12 且 1500 ms 超門檻。時間差等於門檻不報，18 位相鄰值差仍為 1。 | 八節核實，可進 ready 登記 |
| `retry-budget` | 在桌面／手機檢查固定 timeout 的同一個重試模型。cron 與工作日倒排各生成另一類時間安排。 | 延遲 0、500、1000 使前三次 end 為 1000、2500、4500。cap 1200 令第 4 次 6700 超 5500。等於期限保留。 | 八節核實，可進 ready 登記 |
| `dependency-reduction` | 工程師由依賴圖查冗邊、層與循環，手機讀最小 witness。倒排工期及選項全集無這個任務。 | 拿掉 A→D，仍有 A/B/D 和 A/C/D，依字典序取 B。分層 A、B/C、D。A/B/C/A 與自環都回實際邊。 | 八節核實，可進 ready 登記 |
| `pairwise-test-matrix` | QA 選兩兩覆蓋的測試輸入，桌面追逐筆 gain、手機讀實例。既有選項矩陣明確是全集。 | 三二元維度共有 12 pairs，000、011、101、110 各新增 3。驗證真正覆蓋、穩定順序與母集合過界。 | 八節核實，可進 ready 登記 |
| `range-coverage-audit` | 資料處理人員核連續小數域及來源列，手機讀相接段。既有會議重疊、PDF 和本輪票本的資料模型不同。 | [0,10) 的 covered/uncovered/overlapped=8/2/1。負小數相接無重疊，三層覆蓋重疊長度只計一次。 | 八節核實，可進 ready 登記 |
| `semver-precedence` | 開發者比較一對發布標籤並解釋首差，桌面與手機可見。現有整數表示或文字 diff 無版本順位。 | rc.10 大於 rc.2，僅 build 不同同順位，字母比較按 ASCII。兩個超 Number 安全界的主號仍精確。 | 八節核實，可進 ready 登記 |
| `spacing-token-audit` | 前端或設計同事以輸入量測對照既有 token，手機可核某列門檻。CSS 盒模型與流式字體是產生／推導。 | 10 距 8、12 同 2，取 8。14.001 距 12 差 2.001，超 2。相同 token 值取來源較前。 | 八節核實，可進 ready 登記 |
| `archive-path-preflight` | 發布人員用貼上的 manifest 查祖先和別名，手機可讀衝突列。既有檔案分包與批次改名會產生不同產物。 | Data/a 與 data/b 共享隱式目錄別名。F a 與 D a 為 SAME_MEMBER，F a 阻 a/b 為另一 PARENT_FILE。 | 八節核實，可進 ready 登記 |
| `route-overlap-audit` | API 維護者從規格表拿到同方法交疊的 witness，手機看單對。網址整理及任意 regex 各無這個有限路徑語言。 | 縮小的字彙窮舉驗 /users/new 同時匹配兩樣式。tail 至少一段，GET/HEAD 區分，/ 根路徑仍可重複。 | 八節核實，可進 ready 登記 |

## 待原作者修訂

`text-file-line-endings` 在 `tests` 要求同目標兩次處理 bytes 冪等，與 `inputsOutputs` 中的只辨識首個 BOM 和下列情況無法同時成立。

- `double-bom` 的 `EF BB BF EF BB BF 0D` 以 `strip`、`lf` 轉成 `EF BB BF 0A`。再按同一條件處理會把保留在第一個位置的 BOM 剝去，得到 `0A`。修訂保留第一次轉換的有效預期並限縮冪等測試。
- 65,536 個 `0A` 在輸入上限內，轉成 CRLF 後是 131,072 bytes。重新讀取會先到輸入上限，冪等驗證須要求第一次輸出仍可作合法輸入。

將例外列為可複查測例。其餘 19 件的文件八節均核實，可依本人 CAS 流程登記。此報告尚未變更 registry。

## 重算所依公開規格

- NFC 與 NFKC 等價範圍，以及 BOM 與 fatal 解碼選項。 [Unicode UAX #15](https://www.unicode.org/reports/tr15/tr15-58.html) · [WHATWG Encoding Standard](https://encoding.spec.whatwg.org/#interface-textdecoder)
- JSON Pointer 解碼順序及 JSON Patch 的插入／失敗行為。 [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901.html#section-4) · [RFC 6902](https://www.rfc-editor.org/rfc/rfc6902.html#section-4)
- GitHub 的自動重名編號與本工具的窄格式是兩套規則。 [GitHub 章節連結](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#section-links)
- prerelease 順位與忽略 build metadata，以及 Win32 保留檔名。 [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html) · [Win32 檔名規則](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#naming-conventions)
- GNU 手冊兩次讀取逾時。單檔補丁以固定產品契約和字面 hunk 座標獨立重算。

## 本機證據

- [固定候選讀回](candidate-readback.json)
- [固定版本重現方式](README.md)
- [核心與控制器案例重算](recompute-a-witnesses.mjs)
- [逐份八節結論](readiness-aab724.json)
