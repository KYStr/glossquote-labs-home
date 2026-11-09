# 自訂文字遮蔽 — 既有規格保存

Task ID: `labs-24-text-redactor` · Spec ID: `spec-24-text-redactor`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：自訂文字遮蔽

狀態：SPEC_ONLY；工作情境與價值仍為假設。尚無產品或測試證據。

## 使用者與工作

使用者準備把一小段訊息交給別人，希望先移除他已知道要隱藏的精確字串，例如某個 email 或參考編號。使用者貼入來源，新增遮蔽目標，查看替換後的完整輸出，自行逐行檢查，再複製或下載結果。

## 功能需求

- **FR-01 輸入：** 來源最多 100000 UTF-16 code units；空來源可輸入但不能執行遮蔽。拒絕 unpaired surrogate，合法 Unicode 原文保持 code point 順序，不 trim、不做 NFC/NFKC 或大小寫正規化。來源可含換行與一般控制字元，當作純文字處理。
- **FR-02 規則：** 最多 50 個依畫面順序排列的目標字串。每個目標長度 1–200 UTF-16 code units；精確、大小寫敏感、空白敏感，不 trim。空字串拒絕；單一空格或多個空格是有效字面目標。拒絕完全相同的重複目標和不成對 surrogate。目標是單行 literal；拒絕所有 C0/C1 控制碼（U+0000–001F、U+007F–009F），因此不接受換行。來源可含換行；工具處理 textarea.value 當下的字串且不再 normalize，瀏覽器貼上行為可能已把外部 CRLF/CR 轉成 LF。
- **FR-03 預設替代字串：** 所有匹配固定替換為 [REDACTED]，中英文介面一致；不提供自訂 replacement。固定詞不會再當作輸入掃描或觸發第二輪替換。
- **FR-04 字面比對：** 只做原文逐字比對；regex 特殊字元是一般文字。比對精確大小寫與 code point，不轉換標點、不正規化。從來源左至右一次消耗，不重疊替換。若多個目標同一起點匹配，最長目標優先；長度以 Unicode code point 計，若同長按規則順序先者優先。精確重複已拒絕，因此同起點同長 tie 僅為防禦性規則。
- **FR-05 重疊結果：** 規則 Ann、Anna，來源 Anna Ann，輸出 [REDACTED] [REDACTED]；Anna 命中 1 次、Ann 命中 1 次。若規則依序為 A、AB，來源 AB 應由較長 AB 命中。
- **FR-06 命中摘要：** 顯示總命中數與每條規則的命中數；未匹配規則顯示 0。命中計數是非重疊實際替換次數，不是候選重疊數。允許 0 次命中，明確顯示輸出與來源相同，並提醒要人工核對。
- **FR-07 執行與失效：** 只按「遮蔽指定字串」執行，不在每次輸入時處理。改來源或任一目標、增刪規則後立即清除舊輸出、命中數、copy/download 狀態。invalid 欄位不可沿用先前結果。
- **FR-08 複製：** 只提供複製遮蔽後輸出，不複製來源或報告。按下後捕捉 revision/requestId 和固定輸出 snapshot；單次 async clipboard busy 期間鎖定來源/規則/處理/清除/其它複製控制直到 resolve/reject。只在 request 仍最新時更新狀態。API 不存在或拒絕時選取輸出 textarea，提供手動複製指示，不顯示成功。
- **FR-09 TXT 下載：** 使用者按「下載遮蔽結果」才以原生 Blob/download 產生固定檔名 glossquote-redacted.txt；UTF-8 no BOM，文本內容不追加 LF，保留輸出原換行。mime 為 text/plain;charset=utf-8。沒有 metadata/timestamp/IP；不下載來源、規則或命中報告。
- **FR-10 警示：** 輸入與結果兩區明確分開。每次結果旁固定提醒：「只替換你列出的字串；工具不會自動偵測其他個資。分享前請自行檢查完整輸出。」不得聲稱匿名化、保證安全或刪除所有個資。
- **FR-11 清除確認：** 清除來源、規則與輸出需確認；取消保留所有目前資料/結果。確認回到空來源、一條空目標、無結果。Escape 等同取消，關 dialog 後還原焦點。
- **FR-12 邊界：** 來源長度 >100000、目標 >200、超過 50 條、空目標、重複目標、source/target invalid surrogate、C0/C1 target control 全部拒絕且不回傳部分 output。固定 replacement 長度 10 code units；最多 100000 個單碼點命中，output <=1,000,000 UTF-16 units。
- **FR-13 雙語：** 中文 /index.html、英文 /en/index.html。固定 replacement 保持英文標記兩語一致；所有告警、錯誤、數量複數和 controls 完整翻譯。
- **FR-14 隱私與生命週期：** 無 localStorage/IndexedDB/cookie/URL state、帳號、網路、telemetry、API。來源、規則、輸出只活在本分頁記憶體；pagehide 清理應用程式 references。錯誤/console/network 不得寫來源、目標或輸出。
- **FR-15 DOM 安全：** 所有來源、規則與輸出為不可信文字，只用 input.value/textContent。不得 innerHTML、eval、動態 code、regex construction 或標記語言解讀。
- **FR-16 下載與複製結果：** download/copy 只含處理結果；零命中也可以匯出，但仍顯示零命中提醒。原始來源永遠不加入下載副本。

## 非目標

不做智慧偵測、個資分類、格式檔案讀取、replacement 設定、規則匯出、批次處理、undo 歷史、雲端儲存、保證匿名化或法律/安全判斷。



---

## 原文件 TECHNICAL.md

# 技術規格：自訂文字遮蔽

狀態：SPEC_ONLY；以下介面與驗收尚未實作，均 NOT_RUN。

## 架構與檔案

純靜態繁中/英文 HTML/CSS/ESM。Browser 記憶體執行遮蔽、原生 clipboard/download。Node.js >=24 只提供 loopback preview、node:test/check/build。無 runtime dependency、worker、Server API、CDN/外部字體。

目標檔案：package.json；.gitignore；public/index.html、public/en/index.html；public/styles/app.css；public/js/app.mjs、i18n.mjs、state.mjs；public/js/core/text-redactor.mjs；scripts/serve.mjs、check.mjs、build.mjs、validation.mjs；test/text-redactor.test.mjs、test/ui-contract.test.mjs、test/toolchain.test.mjs。dev 預設 127.0.0.1:4204，隔離 spikePort 5204。port occupied 時不停止/kill既有程序，退回 OS 分配的空閒 loopback port，印出並記錄實際 URL。

## Core API、精確輸入 shape 與錯誤

唯一公開純函式為 redactText(request)。只接受 plain object（prototype 為 Object.prototype 或 null），exact own keys 僅 source 與 rules。兩欄都必須是 own enumerable data properties；拒絕額外/缺漏/symbol/non-enumerable/accessor key、getter/setter 和其它 prototype，不讀取任何 getter。

rules 是密集 string[]，不是 {target} object array。Array 的 own keys 僅可為標準 length 與 0..length-1 canonical 連續 numeric keys；length 是 non-enumerable、non-configurable data property，index 都必須是 enumerable data property。拒絕 holes、額外鍵、symbol、非 canonical index 和 accessor；index 的 writable/configurable flags 不修改也不要求特定值。所有 shape 先以 Reflect.ownKeys/descriptor 讀取，不呼叫 user-supplied getter。

- validateSource(source) → {ok:true,codePointLength,utf16Length} 或 {ok:false,code}。source 必須 string、UTF-16長度<=100000、不含 unpaired surrogate、非空；不 normalize。空 source 回 SOURCE_EMPTY。
- validateRules(rules) → {ok:true,validatedRules:string[]} 或 {ok:false,code,ruleIndex:null|number}。rules 必須密集 Array；length 0 回 NO_RULES，>50 回 TOO_MANY_RULES。按原始 index 逐條驗 string type、raw UTF-16 length<=200、非空、well-formed surrogate、無 C0/C1 control、與較早規則完全相同目標不重複。目標逐字保留，不 trim。ruleIndex 為 1-based；不是單一 target 錯誤時為 null。
- redactText(request) success exact result {ok:true,output,totalMatches,perRule:[{ruleIndex,matchCount}],sourceCodePointCount,outputCodeUnitLength}。perRule 按原始 1-based 順序，不包含 target text。
- failure exact union {ok:false,code,ruleIndex:null|number}；rule-specific errors 有 1-based index，其它錯誤 null。failure 不含 output/partial output/計數。
- 錯誤優先序固定：request object/prototype/exact keys/descriptors → validateSource（type、size、surrogate、empty）→ rules 必須為 Array 且 length descriptor 正確 → length>50 時 TOO_MANY_RULES（先於掃描 index，避免巨大 sparse length）；再檢 exact own keys/dense data index → length=0 時 NO_RULES → 按 index 順序逐條檢查 type、length、empty、surrogate、control、duplicate。第一個失敗回傳，沒有 partial output。
- codes 固定：INVALID_REQUEST、INVALID_SOURCE、SOURCE_TOO_LONG、INVALID_UNICODE、SOURCE_EMPTY、NO_RULES、TOO_MANY_RULES、INVALID_RULES、TARGET_TOO_LONG、TARGET_EMPTY、TARGET_CONTROL_CHARACTER、DUPLICATE_TARGET。
- Source/target 不做 trim、Unicode normalization、case folding；UTF-16 units 用於輸入硬上限，Unicode code points 用於 trie match 長度。HTML textarea.value 是 UI 當下 source；瀏覽器可能在貼上時先正規化換行，MVP 不承諾還原貼上前原始 newline bytes。source 可包含控制字元；target 不可包含任何 C0/C1 control（包括 tab、CR、LF）。
- UI 以 ruleDrafts 保存目前文字。可提供一個空白編輯列；該列若送出會得到 TARGET_EMPTY，不能 trim、忽略或轉成 NO_RULES。使用者刪除全部列後送出才是 NO_RULES。此區分保留空白 target 可被精確匹配的規則。

## 有界字面比對

每次執行先驗證 source/rules 全部有效，否則回錯且 output 不存在。將 source 與每條 target 轉成 code point arrays。建立 trie：每個邊是一個完整 code point；terminal stores rule index。最多 50 rules、每條 <=200 UTF-16 units，總 trie 節點上限 <=10001（根節點加所有目標 code points），沒有 regex、backtracking 或動態生成程式碼。

左至右遍歷來源 token index i。從 i 沿 trie 最多走 200 code points，記錄遇到的最深 terminal；找到匹配就輸出固定 [REDACTED]、對該規則計數加一，並讓 i 前進匹配長度（不重疊）；未匹配就輸出一個原 token、i+1。只讀原 source，輸出 token 不再掃描。最長 terminal 勝出；若同長則較小 ruleIndex 勝出。因完全相同 target 在驗證時拒絕，同一起點同長 tie 只保留防禦性規則。

Worst case trie walking <= sourceCodePoints × 200 <= 20,000,000 edge checks；source scan <=100,000 steps；target trie <=10,001 nodes；output UTF-16 <=1,000,000 units；所有值為固定上限。這給出明確操作上限，不承諾特定手機完成時間。同步處理，不新增 worker/cancel 介面。不得在失敗時回傳局部 output。

## State、async 與檔案

UI state exact conceptual fields: source:string、ruleDrafts:string[]、revision:number、output:string|null、matchCounts:null|array、totalMatches:number|null、fieldErrors、copy:{busy,requestId,revision,status}、notice、disposed:boolean。source 與 ruleDrafts 只在目前分頁記憶體；提交前不產生 output。

來源或任一 target draft 有改動時 revision++，同步 output=null、matchCounts=null、totalMatches=null，disable copy/download。只有明確 submit 且 core 成功時安裝 output；core failure 清空所有舊結果。ruleDrafts 依顯示順序逐字傳給 core，不 trim/normalize/過濾空字串。

clipboard writeText 僅由 user gesture。發出 request 前若 busy 或 disposed 就拒絕，不建立第二個並行請求。開始時 latestRequestId++、busy=true，鎖住編輯/清除/重新處理，保存不可變 output snapshot 與 revision。resolve/reject 及 finally 都先核對 latestRequestId、revision、disposed；只有目前 request 可更新通知或解除 busy。API 不存在或 reject 時將仍有效的 output 放入 readonly textarea、focus/select，顯示手動複製，不偽稱成功。pagehide 使 request 過期且 late Promise 不更新 DOM。

下載在 click handler 同步以 TextEncoder 將 output 編成 UTF-8，不加入 BOM；建立 Blob text/plain;charset=utf-8，anchor filename 固定 glossquote-redacted.txt，bytes 完全等於 output、不加 LF。click 後 object URL 延遲 60 秒 revoke，不在同步 finally 立刻撤銷；pagehide 標 disposed、revision/requestId 遞增、撤銷所有 URL 並將 source/ruleDrafts/output 引用設空。任何 late async completion 不得更新 DOM。Download 必須是真 browser evidence；mock Blob 不足以宣稱檔案 bytes 通過。

---

## 原文件 UX-SEO.md

# 介面與 SEO 規格：自訂文字遮蔽

狀態：SPEC_ONLY；畫面、SEO 和 browser API 均未驗收。

## Product App 畫布

第一屏展示來源大文字區，來源旁有顯眼的「只遮蔽你明確列出的字串」說明。下方是目標字串規則列表、加規則按鈕與「遮蔽指定字串」主動作。結果在輸入下方，清晰標為「處理後副本」，整段顯示，旁邊只有「複製遮蔽結果」「下載遮蔽結果」。不把來源和結果混在同一文字框或報告中。

桌面為單一寬畫布：來源 textarea → 遮蔽目標逐條列表（順序清楚）→ primary process action → 命中數 → 結果 textarea。手機 320px 使用單欄；規則每條獨立可編輯、刪除按鈕有標籤；來源與結果可垂直捲動但不造成整頁水平溢出。行動裝置虛擬鍵盤不得遮住目前焦點或主要動作。

## 介面文案

常駐警示：「只替換你列出的字串。工具不會自動找出其他個資；分享前請逐段檢查輸出。」
英文：“Only the exact strings you list are replaced. This tool does not detect other personal data. Review the full output before sharing.”

- 空來源：「貼入你要檢查的文字。」英文 “Paste the text you want to review.”
- 空規則：「新增至少一個要遮蔽的字串。」英文 “Add at least one string to redact.”
- 匹配成功：「已替換 N 處。這不是完整的個資偵測；請檢查全文。」零命中要說「找不到指定字串，輸出與來源相同。」
- target 欄標籤「要遮蔽的原字串 1」；help 說明大小寫與空白都精確匹配。目標只能是一行；換行與控制字元會被拒絕，前後空白不會被刪除。英文 help: “Match is case- and space-sensitive. Enter one line; line breaks and control characters are rejected. Leading and trailing spaces are kept.”
- replacement 固定說明：「每次符合都會替換為 [REDACTED]。」
- source 改動後：「來源或規則已變更；舊結果已清除，請重新處理。」
- 來源超限/錯誤不得回顯原文；目標重複指出第幾條衝突，但不在 console 印其內容。
- 清除確認明說清掉來源、規則和結果；取消保留目前畫面。
- Copy API reject 時選取輸出並說明如何手動複製，無成功提示。
- 刷新提示：「重新載入會清除目前文字和規則。下載結果前請先自行確認。」

結果旁持續顯示限制聲明。0 match 可複製/下載，但提醒輸出原文完全未變，不要把按鈕標成「已匿名化」。Source editing、rule changes、dialog cancel 都應保持焦點預期；狀態用文字與 icon，不只顏色。200% zoom、keyboard、reduced motion、screen reader labels 必須驗。

## SEO 草案

Slug text-redactor；預定 host redact.glossquote.com，尚未部署。預覽 noindex/nofollow/Disallow:/，不含正式 canonical/sitemap。

繁中 title：自訂文字遮蔽工具｜GlossQuote Tools
description：貼上文字並指定要遮蔽的字串，在瀏覽器本機逐字替換。工具不會自動偵測其他個資，分享前請自行檢查結果。
H1：自訂文字遮蔽
intro：只替換你列出的確切文字，固定以 [REDACTED] 取代。它不是自動個資偵測器。
FAQ：「會自動找出姓名或 email 嗎？」不會，只會替換你列出的字串，請檢查全文。「大小寫或空白一樣嗎？」大小寫和空白精確比對；目標限單行，拒絕換行和控制字元，也不 trim 或正規化。「原文會上傳嗎？」文字依設計在目前瀏覽器分頁處理，不提交給工具服務；不需要帳號或雲端，重新載入會清除目前文字。

English title: Custom Text Redactor | GlossQuote Tools
description: Replace exact strings you specify in text, locally in your browser. The tool does not detect other personal data; review the result before sharing.
H1: Redact strings you specify
English FAQ: “Does this find all personal data?” No. It only replaces strings you list; review the full output. “Do case and spaces matter?” Yes. Matching is case- and space-sensitive; targets must be one line, and line breaks/control characters are rejected. “Is my text uploaded?” The text is processed in this browser tab and is not submitted to the tool service by design. No account or cloud is required; reloading clears the text.

M2 才寫正式 HTTPS canonical、zh-Hant/en/x-default reciprocal hreflang、OG metadata、robots/sitemap 與和可見頁面一致的 WebApplication JSON-LD。禁止安全、合規、完全匿名、用戶量或排名宣稱。




---

## 原文件 ACCEPTANCE.md

# 驗收規格：自訂文字遮蔽

狀態：SPEC_ONLY；下列全部 NOT_RUN。自動核心測試與 browser 原生 copy/download 分開判定。

## 自動案例

| ID | 輸入/操作 | 預期 |
|---|---|---|
| A01 | source Alice email: a@example.test；target a@example.test | output Alice email: [REDACTED]；total=1 |
| A02 | targets Ann, Anna；source Anna Ann | [REDACTED] [REDACTED]；Ann=1、Anna=1 |
| A03 | targets A, AB；source AB | [REDACTED]；AB rule=1、A=0 |
| A04 | source xAxA、target A | x[REDACTED]x[REDACTED]；count=2 |
| A05 | source ababa、target aba | [REDACTED]ba；左至右非重疊 |
| A06 | source [REDACTED]、target [REDACTED] | [REDACTED]；single pass、count=1 |
| A07 | source x[REDACTED]、target x | [REDACTED][REDACTED]；替代結果不重新掃描 |
| A08 | source Anna、rule Anna first, Ann second | [REDACTED]；長字串優先，rule order deterministic |
| A09 | source ann、target Ann | 0 match，output ann 原樣，total=0 |
| A10 | source A A、target A␠（最後一格是空格） | output [REDACTED]A；不 trim target |
| A11 | target 空字串 | TARGET_EMPTY，不執行 |
| A12 | whitespace-only target 單一空格、source a b | 接受，單一空格被替換一次 |
| A13 | 完全重複 target | DUPLICATE_TARGET，整批不產生 output |
| A14 | 50 條有效 target | 接受；51 條 TOO_MANY_RULES |
| A15 | target 200 UTF-16 units | 接受；201 TARGET_TOO_LONG |
| A16 | source 100000 UTF-16 units | 接受上限內驗證 |
| A17 | source 100001 UTF-16 units | SOURCE_TOO_LONG、output absent |
| A18 | source unpaired high/low surrogate | INVALID_UNICODE |
| A19 | target unpaired surrogate | INVALID_UNICODE |
| A20 | target 含 U+000A | TARGET_CONTROL_CHARACTER |
| A21 | target 含 U+0085 | TARGET_CONTROL_CHARACTER |
| A22 | source 含 CRLF、emoji、漢字，target 漢字 | 只替換 matching scalar；原 CRLF/其餘 emoji 完整保留 |
| A23 | regex 特殊文字 .*+?[] | 只照字面匹配，不當 regex |
| A24 | 不同 Unicode normalization 形式 target | 不相等，不 normalize，不誤命中 |
| A25 | 0 rules | NO_RULES，不產生 output |
| A26 | output 0 match | output 等於 source、total=0、顯示未偵測其他個資警告 |
| A27 | 一碼點 source 全部命中最多 100000 次 | output <=1,000,000 UTF-16 units，count=100000 |
| A28 | 固定 output replacement 文字 | replacement 只能是 [REDACTED]，不可從輸入改掉 |
| A29 | 一個規則目標 10 次、另一個 0 次 | perRule counts 10 和 0；總數 10 |
| A30 | source 含 <script> 及 </textarea> | 全部只當 text，不執行/建立 DOM |
| A31 | source/rule 改動後 | result/counts 立即 null，copy/download disabled |
| A32 | clear confirm cancel | source/rules/results 完全保留 |
| A33 | clear confirm accept | source empty、1 empty draft rule、output absent |
| A34 | trie 最大限制值 targets/source | nodes <=10001；edge transitions <=20,000,000；沒有 regex backtracking |
| A35 | source 100000 個 A，target A | output 含 100000 個 fixed tokens，精確 count 100000，不溢位 |
| A36 | request 有 extra symbol/non-enumerable/accessor/missing key；另測 rules sparse/extra-key/accessor array | request fixtures 各回 INVALID_REQUEST；rules fixtures 各回 INVALID_RULES；getter call count=0，failure 不含 output |

## 真實瀏覽器 M1

- B01 繁中輸入 email 與重疊目標，執行後核對完整輸出與各規則命中數。
- B02 英文頁同樣完成來源、規則、執行、閱讀結果；無漏翻且固定 token 相同。
- B03 修改來源和 rule 各一次，確認舊 output、counts、copy/download 立即失效。
- B04 使用者點擊後只複製 redacted result；原生 clipboard 可讀回實際內容。若環境不能讀，標 NOT_RUN，不把 API mock 當 PASS。
- B05 下載檔案並檢查名稱、UTF-8 no BOM、內容完全等於 output、換行保留且無尾端新 LF；無真實下載能力標 NOT_RUN。
- B06 clear dialog 取消保留資料、確認清掉，focus restored。
- B07 keyboard-only 執行、查看 output、download/copy controls，focus 可見且順序合理。
- B08 320px viewport 必須實測：source/result/每條規則和主要動作可達，無整頁水平溢出。
- B09 200% zoom 若現有工具無法調整，單獨記 NOT_RUN，不和 B08 合併 PASS。
- B10 DevTools Network/Storage 觀察使用者輸入不離開本機、無持久存儲；缺乏完整工具時標 NOT_RUN。
- B11 pagehide/刷新提示準確，無自動恢復資料；console 沒有輸入字串。
- B12 source 含 CRLF/emoji 時可編輯，輸出相對於 textarea.value 完整保留；貼上來源若被瀏覽器標準化則不要求還原外部 bytes。目標含 newline 必須顯示 TARGET_CONTROL_CHARACTER 並拒絕處理。
- B13 故意輸入未列出的 email：工具不自動遮蔽，警告仍可見，避免誤認為已偵測。

## Gate

所有自動 A cases 必須通過。B01–B03、B06–B08、B11–B13 是 M1 真 browser 必驗；B08 的 320px viewport 必須實測。B09 zoom 與 B10 Network/Storage 在工具不支援時可分別記 NOT_RUN。原生 clipboard/download 如設備限制可記 NOT_RUN，但不可宣稱完成 M1 所需能力已人工通過。Network/Storage 能力不足同樣保留 NOT_RUN，不以靜態掃描冒充。



---

## 原文件 TASKS.md

# 任務與里程碑：自訂文字遮蔽

狀態：SPEC_ONLY。依序執行；每任務檢查只針對固定輸入。規格矛盾或安全邊界不明時停止回報。

## M1 / T00：雙語本機完整 MVP

前置：讀本資料夾六份產品文件與 docs/；確認 Node >=24；讀根 safety instructions；記錄初始 working-tree/path/hash 和 Windows env guard。若目標已有其他人修改/寫入，停止，不覆寫。

T00 allowed paths：public/**；scripts/serve.mjs、check.mjs、build.mjs、validation.mjs 及本工具必要 scripts/*.mjs helper；test/** 僅假資料；package.json、.gitignore、本工具 dist/**。交付狀態可更新本工具 HANDOFF.md、project.json、START-HERE.md、docs/RELEASE-CANDIDATE.md；TASK-ENTRY.md 僅 append。禁止改父目錄/根首頁/其它工具、Git root、憑證或外部服務。

1. 建 private ESM Node24 package 和真實 loopback-only server 127.0.0.1:4204，加入 test/check/build，先測 server/allowlist。
2. 實作 Unicode validation、target validation、trie 和單 pass longest-match redactor；測試 A01–A36 與 20M 上限/最壞多規則 fixtures，確認沒 partial output。
3. 實作來源/規則編輯、增刪、命中摘要、兩語輸出、立即 invalidate 與人工檢查提示；純文字 DOM。
4. 實作 async native copy busy/revision/requestId，拒絕 fallback，以及固定 UTF-8 no BOM TXT 原生下載/object URL cleanup。
5. 加入 clear confirm、keyboard/mobile/320/IME/privacy tests 與雙語 preview noindex；B08 的 320px 必實測，B09 的 200% zoom 依能力分開記錄，勿和 B08 合併；不得加 runtime dependency。
6. 僅在 scripts 建成後跑 npm test、npm run check、npm run build；手動完成 B01–B03、B06–B08、B11–B13。B08 的 320px 必須實測；B09 200% zoom、B10 Network/Storage 可依能力分開記 NOT_RUN。B04/B05 原生 clipboard/download 必須嘗試真 browser；缺能力時逐項標 NOT_RUN，不以 mock PASS。
7. 核對 Windows guard，固定 manifest/hash、append TASK-ENTRY、更新 HANDOFF/project.json，凍結交主代理。M1 gate 通過前不可進 M2。

M1 gate：A01–A36 與 npm test/check/build 通過；B01–B03、B06–B08、B11–B13 真 browser evidence 完成，涵蓋雙語主流程、即時失效、清除對話框、keyboard、必驗 320px、刷新與未列出個資警告。B09 zoom、B10 Network/Storage 可在工具能力不足時分項 NOT_RUN。B04/B05 原生 clipboard/download 若設備無法手動驗證可分項 NOT_RUN；mock 不可冒充人工通過。

## M2 / T01：production SEO 與 public GitHub source

前置：主代理明確放行 M1。allowed paths：本工具 public/**、scripts release/build/check/manifest helpers、test/** release tests、package.json、wrangler.jsonc、.gitignore、docs/RELEASE.md、docs/RELEASE-CANDIDATE.md、專用 publishing copy evidence。實作 canonical/hreflang/x-default、robots/sitemap、符合可見內容 JSON-LD、headers/404、production check/build。source ZIP 只含 reviewed tool files。

必要 tests 完成、diff 窄化後，用 reviewed copy 發布 KYStr/glossquote-labs-text-redactor public repository。驗 visibility、remote commit、固定 Git blob ZIP 與解壓副本 rebuild/check；不 force、不部署、不改首頁。記錄命令、SHA、manifest、NOT_RUN；遇權限或路徑漂移停止。

## M3 / T02：主代理部署與外部驗收

只由主代理做 Cloudflare free deploy、正式 header/SEO/功能驗證和雙語首頁 catalog。原 chat 不部署、不改首頁。已部署標 awaiting external review；外部報告交回原對話按具體問題返工、測試、公開更新，再由主代理重驗/部署。確認前不可標版本完成。

