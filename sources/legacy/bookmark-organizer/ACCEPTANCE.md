# 驗收 oracle：書籤匯出整理

## 狀態

這些是 M1 的必需 oracle；規格階段產品、Node checks/build 和 browser 都未執行，標記 **NOT_RUN_SPEC_ONLY**。browser file picker、下載、鍵盤、320px/200% 及跨頁導覽均 **NOT_RUN_USER_FOCUS_INCIDENT**。Node tests 使用三種典型合成 Netscape export shape，不代表實際瀏覽器完整相容性。絕不開啟外部 URL。

| ID | FR | 合成輸入/操作 | 精確預期 |
|---|---|---|---|
| K49-01 | FR-02,03,04 | Firefox-like wrapper：doctype、comment、META UTF-8、TITLE、H1、DL/P、H3 ADD_DATE/LAST_MODIFIED、A HREF/ADD_DATE/ICON_URI | 解析成功；只得到結構 bookmark/folder；wrapper 和 metadata 不進結果；ICON_URI 不 fetch。 |
| K49-02 | FR-02,03,04 | Chrome-like folder H3 含 ADD_DATE、LAST_MODIFIED、PERSONAL_TOOLBAR_FOLDER；A 含 HREF、ADD_DATE、ICON、ICON_URI、SHORTCUTURL、LAST_CHARSET | 解析成功；href/title/tree 正確；metadata/icon 被忽略、不解碼、不輸出。 |
| K49-03 | FR-02,03 | Safari-like minimal Netscape profile：root DL、DT/A HREF、DT/H3、child DL | 解析成功；兩個 bookmarks 的 folderPath 正確；不推論 Safari 全部輸出格式。 |
| K49-04 | FR-02 | UTF-8 byteLength=2,097,152 的合法合成 input | limit 通過；parser 可完成。 |
| K49-05 | FR-02 | 同 input 加 1 byte | INPUT_TOO_LARGE；bookmarks=[]、HTML/JSON null。 |
| K49-06 | FR-02 | 非法 UTF-8、UTF-16 BOM | INVALID_ENCODING；零 partial preview。 |
| K49-07 | FR-02 | 正好3000個有效 A bookmark | 通過，sourceIndex 0..2999。 |
| K49-08 | FR-02 | 第3001個有效 A | TOO_MANY_BOOKMARKS；整份拒絕，零 partial preview。 |
| K49-09 | FR-02 | nesting 12 folder levels | 通過；最深 bookmark path 長度=12。 |
| K49-10 | FR-02 | nesting 13 folder levels | DEPTH_LIMIT；整份拒絕，零 outputs。 |
| K49-11 | FR-05 | href https://example.com/a 兩次 | 一 group，member indexes [0,1]，suggestedKeeper=0；兩個 included default=true。 |
| K49-12 | FR-05 | href /a?x=1 和 /a?x=2 | 兩個 singleton groups；query 不被忽略。 |
| K49-13 | FR-05 | href javascript:alert(1)、data:text/html,x、file:///x | 各自單獨測試均 UNSAFE_URL；不提供部分 preview/export。 |
| K49-14 | FR-05 | https://user:pass@example.com/ | UNSAFE_URL；credential 不接受。 |
| K49-15 | FR-05 | relative path /docs、首尾 whitespace、無效 URL | 各自 INVALID_URL；整個來源零 export。 |
| K49-16 | FR-03, FR-06, FR-09 | A bookmark title 原始內容 &lt;img src=x onerror=alert(1)&gt; | entity 解碼一次後 preview 顯示純字串 <img src=x onerror=alert(1)>，不產生 img；HTML export escape 一次回 &lt;img src=x onerror=alert(1)&gt;，不輸出 &amp;lt;。TITLE envelope 忽略且不顯示。 |
| K49-17 | FR-03 | A title 文字 Example &amp; Tools | decoded title 是 Example & Tools；匯出再 escape 為 Example &amp; Tools，不能二次解析。 |
| K49-18 | FR-03,04 | body 裡含 SCRIPT、STYLE、IFRAME 或未知 tag | UNSUPPORTED_MARKUP；全檔拒絕、沒有執行/網路/partial tree。 |
| K49-19 | FR-04 | A 有未知 attribute ONCLICK 或重複 HREF | UNSUPPORTED_ATTRIBUTE；無 export。 |
| K49-20 | FR-03 | 不完整 comment、unknown entity、未結束 A、錯誤 DL nesting | 對應 UNSUPPORTED_MARKUP/INVALID_ENTITY/INVALID_STRUCTURE；整份拒絕。 |
| K49-21 | FR-04 | 空 P separator 緊接 DL 開始/結束 | 接受且不建立 bookmark；P 帶文字、屬性或在其它位置均拒絕。 |
| K49-22 | FR-07,09 | 兩個 exact duplicate links，未操作直接匯出 | HTML 保留兩個；JSON 兩個 included=true；建議 keeper 不觸發排除。 |
| K49-23 | FR-07,09 | 手動排除 source 1 並確認 | HTML 只含 source0；JSON 保留 source1 並 included=false。 |
| K49-24 | FR-08,09 | 將 source0 從 A 移到 path [Work, 2026] | HTML folder path 為兩層 Work/2026；JSON 原路徑不變且 folderPath 更新。 |
| K49-25 | FR-09 | 無任何 user download click | 不自動建立/觸發下載、不打開 HTML；只顯示 preview。 |
| K49-26 | FR-10 | 解析完整合法 prefix 後最後一個 URL 不安全 | UNSAFE_URL；不顯示前段 parsed bookmarks、不輸出 partial artifact。 |
| K49-27 | FR-11 | /index.html 點 English link | 到 /en/index.html；離頁前警語可見；新頁沒有舊 file/tree/edit；無 query/hash/storage。 |
| K49-28 | FR-10 | Ready 後 fake clock 前進20分鐘，無操作 | 不設自動 expiry；編輯狀態維持、可下載。 |
| K49-29 | FR-10 | parse 中 cancel，worker 完成訊息延遲到達 | stale job 忽略；沒有 preview/Blob/object URL。 |
| K49-30 | FR-03,05 | parser 對任何 HREF 呼叫 fetch/open | 測試 spy 呼叫次數必須是0。 |

自動 Node 24 tests 覆蓋 K49-01–26、28–30；K49-27 和實際互動 file picker/下載/keyboard/reflow 須 browser test，維持 NOT_RUN_USER_FOCUS_INCIDENT。至少對三種合成形狀另做 parser table test；這些只驗本文 profile，不可在 HANDOFF 宣稱完整 Chrome/Firefox/Safari compatibility。HTML export test 需以 parser fixture重新解析輸出，且檢查輸出無 ICON/ICON_URI、script、remote resource 或 HREF entity injection。
