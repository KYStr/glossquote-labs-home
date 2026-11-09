# 驗收 oracle：重複檔案找出來

## 狀態與分類

本表定義實作者需要的行為；規格作者未執行產品、tests、check、build 或 browser，狀態為 **NOT_RUN_SPEC_ONLY**。互動瀏覽器、file picker、下載、鍵盤、320px/200% 項目維持 **NOT_RUN_USER_FOCUS_INCIDENT**。Node tests 只能驗 core bytes 和 worker 協議，不能冒充 browser PASS。所有自動 fixtures 是合成內容，不讀真實使用者檔案。

| ID | FR | 輸入 | 精確預期 |
|---|---|---|---|
| D48-01 | FR-02 | 200 個 0-byte descriptors，唯一 sourceIndex | count 通過；total=0；初始 result=null。 |
| D48-02 | FR-02 | 201 個合法 empty descriptors | TOO_MANY_FILES；files/groups=[]；不讀任何 bytes。 |
| D48-03 | FR-02 | 一檔 size=33,554,432 | 單檔上限通過；可進 hashing。 |
| D48-04 | FR-02 | 一檔 size=33,554,433 | FILE_TOO_LARGE，列該 index；read count=0。 |
| D48-05 | FR-02 | 四檔各32 MiB | 合計134,217,728 bytes，總量通過。 |
| D48-06 | FR-02 | 四檔各32 MiB，再加1 byte | TOTAL_SIZE_LIMIT；read count=0，無部分結果。 |
| D48-07 | FR-03,04 | a=ASCII abc,b=ASCII abc,c=ASCII abd,d=empty,e=empty | groups members [0,1],[2],[3,4]；兩個 duplicate groups；unique=3、duplicates=2、savedBytes=3。 |
| D48-08 | FR-03,04 | source0 name=same content=abc，source1 name=same content=abd | 兩個 singleton；duplicateFileCount=0。 |
| D48-09 | FR-03,04 | name one/content=abc 與 name two/content=abc | 一組 [0,1]；預設 keeper=0、duplicate=1。 |
| D48-10 | FR-03,04 | 兩份 empty bytes | 一組 [0,1]；savedBytes=0、duplicateFileCount=1、hash=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855。 |
| D48-11 | FR-04 | 注入 digest provider，使 abc 與 abd 回傳相同固定 32-byte digest | byte compare 分開兩個 singleton；不得因 hash 相同而合併。 |
| D48-12 | FR-03 | bytes ASCII abc | SHA-256=ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad。 |
| D48-13 | FR-06 | group members source [2,5]，操作者選 source 5 | keeper=5；source2 status=duplicate、keeperSourceIndex=5；members/hash/bytes 不變。 |
| D48-14 | FR-06 | 操作者將 singleton source 8 設為 keeper source 2（不在此組） | 選擇拒絕，原結果與 keeper 值不變。 |
| D48-15 | FR-07 | D48-07 成功 JSON export | exact keys/schemaVersion=1/kind/algorithm；summary={selectedFileCount:5,uniqueContentCount:3,duplicateFileCount:2,savedBytes:3}；source/group order 固定；不含內容和路徑。 |
| D48-16 | FR-07,09 | 檔名 <img src=x onerror=alert(1)> | UI 顯示純文字且沒有 img element/event；TXT name 欄是 JSON-quoted string，JSON parse 還原原名。 |
| D48-17 | FR-09 | 檔名含 tab、LF、bidi override | DOM 不執行 markup；控制字元顯示 escape；TXT 表格恰有 6 欄；JSON serializer 合法。 |
| D48-18 | FR-05,10 | job A hashing 時取消、啟動 B，最後送 A complete | A result 忽略，不覆蓋 B，不可下載；A worker terminated。 |
| D48-19 | FR-05 | progress completedFiles=0..N | 顯示單調不減且不大於 total；每檔完成恰發一次；不傳檔名或內容。 |
| D48-20 | FR-06,10 | Ready 後改變來源順序或移除一檔 | 舊 result 和 keeper state 清除，報告下載按鈕消失，提示重跑。 |
| D48-21 | FR-10 | Ready 後 reset 或 pagehide | 每個 object URL 恰 revoke 一次；result/hash/buffer 清除。 |
| D48-22 | FR-08 | 任意 successful result | 所有來源 File size/name 未變；沒有 delete/move/write API 或 source mutation。 |
| D48-23 | FR-07 | 完成後下載 TXT | 檔名 duplicate-report.txt；UTF-8 固定標題/summary/header；rows 按 sourceIndex。 |
| D48-24 | FR-01,09 | 兩個同名檔案 | 兩列分別顯示 index 0、1；使用者可分辨和選擇。 |
| D48-25 | FR-10,11 | Ready 後 fake clock 前進 20 分鐘，無來源操作 | 不設 auto-expiry timer；結果和 URL 仍有效。 |
| D48-26 | FR-11 | 在 /index.html 點 English link | anchor 到 /en/index.html；點擊前有未匯出資料遺失警語；新頁沒有舊 files/result，URL 無 query/hash 狀態。 |

D48-01–15、18–23、25 用 Node 24 node:test；D48-16–17、24、26 需 browser evidence，目前 NOT_RUN_USER_FOCUS_INCIDENT。Core tests 用 injected digest 明確模擬 collision，並測 byte compare 差異在 offset 0、65535、65536、最後一 byte 和全等。至少測 size buckets、progress、read/digest error、取消 stale、report escaping、失敗時零 partial result。

Browser gates 待 parent 核准隔離方式後：file input/drop、keeper keyboard radio、language link 導頁與警語、重選檔 invalidation、JSON/TXT downloads、320px、200% zoom、focus/live regions。不可觸發 native dialogs 或控制使用者桌面。
