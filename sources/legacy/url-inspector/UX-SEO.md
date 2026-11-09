# 網址工具介面與SEO

規格狀態，採Product App與 [完整設計系統](docs/DESIGN-SYSTEM.md)。核心物件是網址參數清單，使用表格/列內編輯，不做大型hero或同尺寸卡片牆。warm paper背景、ink文字、acid只突出目前主要動作，系統字型。

Desktop：

```text
GlossQuote / 網址工具                    English / 工具首頁
貼入網址 [多行輸入                                   ]
僅在此瀏覽器處理；不會開啟網址     [檢視網址] [清除]
原始來源 / 解析後主機與路徑（唯讀，可展開）
參數  序號 | 名稱 | 值 | 原始片段/無法解碼 | 移除
      ... [新增參數] [選取常見追蹤參數]
改動說明                     [產生新網址]
結果（readonly text，不是link）[複製網址] [下載TXT]
使用說明 / 不變與可能失效的部分 / FAQ
```

Mobile將每列轉為有序fieldset，名稱/值上下排列，保留raw disclosure與刪除控制。解碼後名稱/值使用textarea或等效保真編輯器，不能用會刪換行的單行input；原CR/CRLF不可被DOM標準化成LF後無意生成改動，控制器保留原解碼值，使用者真正編輯後才採新值。初始化記錄每欄DOM初始顯示值，input後若該列兩欄都回到初始顯示值，移除該列edit並恢復原raw；不以讀取全部DOM欄位建立全量edits。含CR/CRLF列顯示「此列編輯後換行使用LF；要精確修改換行編碼，請修改上方原始網址」及英文等義說明，未編輯一律保留。結果位於產生按鈕下方；長字串overflow-wrap:anywhere。頁面不横向捲動，桌面表格可用帶名稱的region局部捲動。初始無假資料；「載入範例」按鈕只填 https://example.com/page?utm_source=demo&tag=A&tag=B#details。

兩語必需文案：

| 狀態 | 繁中 | English |
|---|---|---|
| 初始 | 貼入含 http:// 或 https:// 的網址 | Paste a URL starting with http:// or https:// |
| 檢視 | 檢視網址 | Inspect URL |
| 來源錯誤 | 請輸入有效的 HTTP 或 HTTPS 網址，且勿包含帳號或密碼。 | Enter a valid HTTP or HTTPS URL without a username or password. |
| 解碼錯誤 | 無法解碼，保留原始片段 | Cannot decode; keeping the original segment |
| 編輯草稿 | 內容已變更，請重新產生網址。 | Changes pending. Generate the URL again. |
| 有風險的改動提示 | 修改參數可能使簽名或驗證連結失效。 | Changing parameters may invalidate signed or verification links. |
| 成功 | 已產生網址，未開啟或驗證連結。 | URL generated. The link has not been opened or verified. |
| 複製拒絕 | 無法自動複製，請選取結果後手動複製。 | Could not copy automatically. Select and copy the result manually. |
| 切換語言 | 切換語言會清除目前內容。 | Switching language clears the current content. |

其餘錯誤（大小、列數、unsupported API、生成超限）也須兩語固定code字典，不能顯示raw exception。支持no-JS時清楚提示啟用JavaScript且不留下可送出資料的form。

## 靜態SEO內容（兩語各獨立寫入HTML）

- 中文 title：網址參數檢視與整理｜本機 URL 工具 — GlossQuote
- 中文 H1：網址參數檢視與整理
- 中文 description：在瀏覽器檢視網址與重複參數，選擇修改或移除追蹤參數，再複製新網址。未修改部分保留原始編碼，不會開啟輸入連結。
- English title：URL Inspector & Query Editor — GlossQuote
- English H1：Inspect and edit URL parameters
- English description：Inspect repeated query parameters, edit selected values, and remove selected tracking parameters locally. Unchanged segments keep their encoding; links are never opened.
- 各頁100–250字（英文約100–180words）的工作說明、使用步驟、格式限制，以真實功能為準，不堆疊關鍵字。
- FAQ 1：會打開或縮短網址嗎？/ Does it open or shorten links? → 不會，只有字串處理 / No, it only processes text.
- FAQ 2：為什麼 + 會顯示成空白？/ Why does + appear as a space? → query表單解碼規則；%2B才是加號 / Form query decoding uses + for spaces; %2B represents a plus sign.
- FAQ 3：刪除所有追蹤參數就安全了嗎？/ Does removing tracking parameters make a link safe? → 不保證；沒有安全掃描且可能破壞簽名 / No; there is no safety scan, and edits may break signed links.
- FAQ 4：會改變重複參數或其他編碼嗎？/ Are duplicate parameters or other encodings changed? → 原順序與未改片段保留，只重新編碼編輯列 / Order and untouched segments are preserved; only edited rows are re-encoded.

正式兩語候選/index.html與/en/index.html採self-canonical、zh-Hant/en互返、x-default指中文；WebApplication結構化資料只描述可見工具，不加假評分。回首頁為同語言 https://glossquote.com/index.html 或 /en/index.html。正式發布以前不宣稱網域可用，其他SEO/HTTP規則見 [發布契約](docs/RELEASE.md)。
