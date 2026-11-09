# 網址工具驗收

以下皆是預期結果，尚未執行。N=Node純函式/工具鏈；B=真實Chrome與Edge；L=正式HTTP/頁面。必要純邏輯與發布gate不能用人工NOT_RUN代替；設備/讀屏人工例外必須列明，不以部分通過算整體通過。

| ID/需求 | 層級 | 輸入或步驟 | 必要預期 |
|---|---|---|---|
| U01 FR01/02 | N/B | https://example.com/a | host=example.com、0列；產生結果逐字相同 |
| U02 FR03/06 | N/B | https://EXAMPLE.com:443/a/../b?x=1&x=2#ok | 重複兩列；未改輸出逐字保留；parser hostname=example.com/path=/b，與raw分開 |
| U03 FR03/04 | N/B | https://example.com/?q=a+b&plus=%2B&space=%20&nested=%2520 | 解碼 a b、+、一空白、%20；未改URL完全保留 |
| U04 FR03/06 | N | https://example.com/?flag&x=&=v&&#f | 5列含兩空片段；未改保留全部 |
| U05 FR04/06 | N/B | ?x=%2f&x=%2F，只改第二列為a b+c（完整base使用example.com/） | 首列仍x=%2f，第二列x=a+b%2Bc |
| U06 FR04 | N | 編輯x=%2f解碼/為a再改回/ | 原raw x=%2f恢復，changedRows=0 |
| U07 FR05 | N/B | ?utm_source=a&%75tm_medium=b&UTM_CAMPAIGN=c&custom=d | 按選追蹤後僅前三列選取；尚未產生不輸出，產生後?custom=d |
| U08 FR05 | N | ?utm_id=x&token=TEST_ONLY&xutm_source=a | 三者都不自動選取；不宣称自動移除秘密 |
| U09 FR06 | N/B | https://example.com/p?a=1#fragment，刪唯一列 | https://example.com/p#fragment |
| U10 FR06 | N | https://example.com/p?、https://example.com/p?# | 未改逐字保留空?和# |
| U11 FR03/06 | N | https://example.com/?x=1&，刪x列 | 剩空片段，結果https://example.com/? |
| U12 FR04 | N/B | ?q=%GG&x=%E0%A4&ok=1 | 前兩列無法解碼、不可編輯、可刪；未改保留raw，不阻止ok列編輯 |
| U13 FR04/06 | N | 沒query的https://example.com/#f，新增key=a、value=甲😀 | https://example.com/?a=%E7%94%B2%F0%9F%98%80#f |
| U14 FR01 | N/B | javascript:alert(1)、//example.com、example.com、data:text/plain,x | 固定錯誤且所有複製/下載無效 |
| U15 FR01 | N/B | https://user:pass@example.com、https://@example.com、https:////@example.com、https:///example.com | 全部拒絕，不在錯誤/console重顯帳密；new URL修復不能繞過raw authority非空規則 |
| U16 FR01 | N | 控制字元、反斜線、孤立surrogate、來源兩端ASCII spaces | 前三種拒絕；後者只修剪兩端spaces；原始source上限仍先檢查 |
| U17 FR01/03 | N/B | 65536/65537 code-unit網址、256/257 query segments | 各边界接受/拒絕；不截斷，新增/生成後也受限 |
| U18 FR06 | N | edits/removed含未知row id或重複新增id | 拒絕，沒有部分結果 |
| U19 FR07 | B | 產生A → 改來源/一個欄位/勾選移除 | 舊輸出立即清空/停用；重新產生才可copy/download |
| U20 FR08 | B | 真實copy；拒絕剪貼簿或不支援；清除 | 只有成功才顯示成功；fallback可選文字；清除所有本工具資料 |
| U21 FR08 | B | 下載含中文/emoji網址 | 本機實際TXT bytes為UTF-8輸出+LF、無BOM、固定檔名；不只檢查Blob mock |
| U22 FR09 | N/B | query解碼後為<img src=x onerror=...>、__proto__ | 只當字串，無執行/隱藏載入/物件prototype污染 |
| U23 FR09 | B | 真Network/Storage，輸入→產生→copy/download→隱藏/重回→清除 | 沒有工作內容上傳、beacon、storage；ResourceTiming只是輔證，無法捕獲完整Network須NOT_RUN |
| U24 FR10 | B | 两語、鍵盤全流程、320px/200%、最大輸入、decodeerror | 控制可達、文字不裁切、非色彩唯一提示、兩語功能同等 |
| U25 FR10 | B | zh↔en/Home navigation | href同語系，工具內容不入link/hash/query；切換清除有揭露 |
| U26 FR11 | N/L | production及preview build、404、MIME/headers/robots/sitemap | 符合RELEASE，未授權source不混入dist；正式自行實測HTTP |
| U27 FR04/06 | N/B | ?q=a%0Ab%09c及?q=a%0Db%0D%0Ac；先檢視未編輯，再編輯其他列 | 未編輯列的raw輸出逐字保留；換行/tab顯示不丟字、不被單行input去除；只編輯本列時才按新值重新編碼 |
| U28 FR04/06 | N/B | edited/additions鍵值合計65536/65537碼元 | 65537在序列化前拒絕且不截斷；65536仍需符合最終URL長度，編碼後超限也拒絕 |

另外以≥100組有界假輸入檢查未變更identity；同一組重複key的單列編輯不改其他rows。這是有意義的不變量，不只把實作輸出複製到expected。不得用隨機生成無預期斷言取代具體案例。
