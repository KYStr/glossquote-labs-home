# 檔案SHA-256驗收

SPEC_ONLY。全部產品案例NOT_RUN。A表示可自動測純邏輯/協定；B表示真瀏覽器，不得用Node或mock代替。fixture由Node內建fs/crypto產生固定假bytes，絕不讀私人檔案。

| ID | 需求 | 層 | 輸入/步驟 | 預期 |
|---|---|---|---|---|
| H01 | FR-01,02 | A+B | 0-byte檔案，點計算 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| H02 | FR-02 | A+B | bytes 61 62 63（abc，無換行/BOM） | ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad |
| H03 | FR-02 | A+B | abc改名/改MIME/mtime | hash與H02完全相同 |
| H04 | FR-02 | A+B | abc+LF bytes61 62 63 0a | edeaaff3f1774ad2888673770c6d64097e391bc362d7d6fb34982ddf0efd18cb |
| H05 | FR-01,02 | A+B | [00,ff,80,0d,0a,ef,bb,bf]二進位 | ef7599427575c12d74a02c29d770363b67b7b4ab158aa04464938118c8f13003；不解碼或移除BOM |
| H06 | FR-03,04 | A+B | H02結果，預期碼大寫並加兩端ASCII空白 | match且hash保持小寫 |
| H07 | FR-03,04 | A+B | 預期64個0，已算abc | mismatch，不顯示「有病毒」 |
| H08 | FR-03,04 | A+B | 63/65hex、64字含g、0x前綴、內部空白、U+200B、兩端NBSP | invalid無match徽章；合法hash仍可copy |
| H09 | FR-03,04 | A+B | 空碼或只有space/tab/CR/LF | not-provided；不當作錯誤或match |
| H10 | FR-03 | A+B | 原始碼元256與257界線，64hex外ASCII空白 | 256可trim判合法，257先EXPECTED_LENGTH，不能截斷 |
| H11 | FR-01 | A+B | 128MiB零bytes假檔 | 允許、真Worker結果等於獨立Node hash，畫面可取消；記瀏覽器/時間 |
| H12 | FR-01,05 | A+B | 成功後選128MiB+1byte | SIZE_LIMIT；舊hash立刻移除，未新建worker且未讀File bytes |
| H13 | FR-01,02 | B | 選檔但不按計算、取消選檔dialog | 選檔不讀內容；取消dialog維持既有狀態 |
| H14 | FR-04,05 | A+B | 計算中改expected；完成後match→invalid→mismatch | 比對最新值，無舊徽章；預期碼變更不重新hash |
| H15 | FR-05 | A+B | 讀取/計算兩階段取消，再重算 | 原job失效、worker終止、無舊结果，重新算正確 |
| H16 | FR-05 | A+B | A工作未完成改選B，再讓A晚到done/error | 僅B結果；A任何狀態/錯誤無法覆蓋 |
| H17 | FR-05,08 | A+B | 開始後清除、再發舊消息 | inputs/hash/expected空、無busy、無結果復活 |
| H18 | FR-05,06 | A+B | 60秒production deadline；晚成功/visibility恢復 | TIMEOUT且worker終止，超時success不得接受；真60秒harness和快速unit分開 |
| H19 | FR-06 | A+B | unavailable WebCrypto/Worker、讀取reject、digestreject、worker error/messageerror | 分別安全失敗，可重試，無雲端fallback/洩露raw錯誤 |
| H20 | FR-02,06 | A | 31byte digest、超限File size、未知協定key、bytes不符、hex格式錯誤 | fail closed，不返回部分hash；舊job消息則忽略 |
| H21 | FR-07 | A+B | 成功copy；clipboard拒絕；clear後舊promise resolve/reject | copy恰64字；拒絕fallback；舊提示不回寫 |
| H22 | FR-07 | A+B | zh/en下載H02結果，實際讀落盤文件 | 固定檔名、65bytes、hash+LF、無BOM/名稱/預期碼；Blob URL清理 |
| H23 | FR-08 | B | 假檔名含HTML/control/bidi；比對欄惡意文字 | 只文字顯示且檔名隔離方向，無執行、無動態連結 |
| H24 | FR-08,09 | B | fresh頁面Network/Storage完整觀察；計算/取消/輸出/hidden | 無檔案或hash傳輸、無storage新增，检查同源/cdn-cgi/rum；證據缺則NOT_RUN |
| H25 | FR-09 | B | 完整頁面載入後真DevTools Offline，首次計算+取消後重算+換檔 | 全部正確，沒有worker/依賴HTTP缺檔；不以serverstop代替真Offline |
| H26 | FR-05,09 | A+B | pagehide/bfcache返回、clear後返回 | File/hash/expected/input為空且idle；單純visibility hidden→visible不當pagehide清除，改核deadline；實測與reducer模擬分開 |
| H27 | FR-10 | B | Chrome/Edge鍵盤、320px、真200%zoom、兩語切換/首頁往返 | 可操作/可讀、有focus、同語URL；Firefox/真機/讀屏未做列NOT_RUN |
| H28 | FR-10 | A+B | preview與固定origin production | noindex隔離；正式canonical/雙語/x-default/robots/sitemap/404/CSP無誤，真HTTP另驗 |
| H29 | FR-02,09 | A | worker-source與hash.worker逐bytes，篡改生成檔後check | 一致通過；過期/篡改失敗，不發布舊worker |
| H30 | FR-01,05 | A+B | 連點開始10次、計算完成重算3次 | 最多一個活躍worker；完成每次terminate/revoke；無多份同時讀buffer |

T00建立npm test/check/build；T04後才存在build:production/check:production。必要演算法/協定/競態/發布FAIL不得略過。真瀏覽器主要選檔/hash/錯誤/取消/最大檔及實際下載必做；能力缺口不得寫PASS，告知主對話。完整Network、真Offline、讀屏/其他裝置等人工NOT_RUN依使用者既有許可可逐條披露，但不能稱全面隱私/所有瀏覽器驗收通過。

先跑受影響gate；最終必要checks對固定輸入/源碼一次，未變不要反覆全重跑。交接每例輸入bytes與SHA/瀏覽器版本、觀察、PASS/FAIL/NOT_RUN、證據路徑；主代理另獨立驗收，外部確認才能完成版本。
