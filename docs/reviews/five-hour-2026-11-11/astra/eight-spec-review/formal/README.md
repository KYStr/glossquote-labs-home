# MAP8 正式綁定可攜證據

本目錄補充已公開的MAP8預審；[正式報告](INDEPENDENT-REVIEW.md) 建議八節接受，但沒有寫registry。

Node24+與公開GitHub HTTPS讀取：
~~~
node reproduce-binding.mjs <尚不存在的新輸出資料夾>
~~~
入口複製本目錄的input-manifest、fetch-inputs、verify-task-binding、registered-task、registered-commands、scores至新資料夾，下載10個固定輸入後，純記憶體驗原4命令hash、實際提交、8targets、8結構化makers＋root assembler及本人非maker身分。預期exit0。Windows子行程windowsHide；無憑證或GUI。

必要依賴明列於入口；不是單檔程式。原完整登記與已審core由固定commit/blob下載；三份先前預審資料由PR326固定4e89a9a下載。已有64格與未變算術沿用，不在此重算。詳細[結果](binding-results.json)、[評分](scores.json)、[10pins](input-manifest.json)及[四原命令](registered-commands.json)。

prepare-current-review.mjs另是GET-only準備器，需傳當前registry blob/revision與本正式報告的已公開固定commit；只有主統籌授予writer slot後才可給新真實operation UUID。沒有API寫入函式；無UUID時輸出offline-only，禁止提交。正式提交必須使用reviewed core＋GitHub connector CAS，並讀回exactevent/candidate/owner/claim/hash。

