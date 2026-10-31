# Preserved specification excerpt

Original file: `README.md`; original SHA-256: `c8b6be5629a77a1e95e7ae89cbf10f3f1f7413c4709159ed874edd66154917a7`.
Included lines: 19–65; unrelated operational history is excluded.
This is historical specification evidence, not a new completeness review or acceptance.

---

## 功能與精確契約

手動填入同一天、同一時間基準的議程，核對場地重疊、講者重疊及換場緩衝；不自動改排、不連行事曆、不判旅行時間、設備或容量。

- 1–60 列，最多 1770 個配對；每列 0–5 位講者，以 ASCII `;` 分隔。全空表示沒有講者；同列不得有重複講者或空白分隔項。
- 名稱、場地、講者 trim 後 exact 比對，大小寫敏感、不做 Unicode 正規化、不合併別名；同名指同一場地／講者。
- title 1–80、room 每個 1–40、speaker 每個 1–40、timeBasis 1–60 UTF-16 code units；每原始欄位最多 256。拒絕控制碼、LF/CR、U+2028/U+2029 與不完整 surrogate。
- 日期為 0001–9999 真實 Gregorian 的共同標籤，不讀系統今天；時間嚴格 ASCII HH:MM，開始 00:00–23:59、結束另可 24:00，start < end。
- 單日、同區時鐘，**不換算時區／DST，不支援跨午夜、DST 跳時或重複時刻，也不自動偵測它們**。
- 區間 `[start,end)`；端點相接不重疊；roomBuffer 與 speakerBuffer 為 0–180 整分鐘，ASCII 1–3 位數，接受前導零。
- 相同場地套 roomBuffer；共同講者跨不同場地才套 speakerBuffer；同房不套講者轉場。
- overlap > 0 列實際資源重疊，不另列緩衝；non-overlap 的 gap < buffer 才不足，等於合法。
- 相同 title、room、起訖與講者集合為重複列。保留所有列；同一配對可有多個原因但只計一次，不默默合併或截斷。
- 配對依原始列號 i,j 輸出，非時間排序。包含／同 start 使用同一半開規則。

### API

`public/js/core.mjs`：

- `validateDraft(input)`、`checkAgenda(input)` → `{ok:true,value}` 或 `{ok:false,error:{code,field,row}}`。
- `formatClock(minute)` 接受 0–1440 整數。
- `buildReport(result, locale)` 只接受核心生成的可信 result，locale 為 `zh-Hant` 或 `en`，非任意 JSON 匯入入口。

Root exact keys：`dateRaw,timeBasisRaw,roomBufferRaw,speakerBufferRaw,rows`。
Row exact keys：`id,titleRaw,roomRaw,speakersRaw,startRaw,endRaw`；除 rows 外全為 primitive string。ID 為 `r[1-9][0-9]{0,8}`，全表唯一。

只接受 prototype 正好 Object.prototype 的普通 record 與 Array.prototype 的 dense array；拒絕未知／隱藏／symbol／accessor 欄位。先檢長度，拒絕普通 getter 而不執行；Proxy 反射本身仍可能執行 trap，不能宣稱任意 Proxy 無副作用。被拋出例外以內部 WeakSet 身分比對，不讀未知 throw 的欄位或 getter。

驗證先 root/rows 形狀，再原始型別/文字，再 ID，root 日期/基準/buffer，最後逐列 title/room/speakers/time/order；回第一錯誤，不回顯原文。

## UI / 隱私

- 兩語分頁 `/index.html`、`/en/index.html`；完整標籤、FAQ、結果／錯誤同語；同語返回已存在的 Gloss Tools 首頁。
- JS 綁定 submit.preventDefault 後才啟用 fieldset；未載入時不能輸入或送出，原文字段沒有 `name`，meta/header CSP `form-action 'none'`。
- 輸入／change／組字／增刪立即清 report、錯誤與下載，使用者明確提交才計算。IME 組字中阻止提交。
- native `<dialog>` 確認清除／切語言，取消／Escape 保留輸入、結果與焦點；dialog 開啟時 workspace disabled。showModal 拋錯會清 pending、解鎖、保留資料、顯示固定雙語錯誤及回焦點；close 拋錯則移出 dialog、移除 open 再放回同一節點。原生 modal／例外 fallback 的實際 top-layer/inert 行為仍待真 browser 驗證。
- 明確下載手勢才建立 TXT Blob，UTF-8、無 BOM、無尾 LF，檔名 `glossquote-agenda-conflicts.txt`。最多 8 活動 URLs、60 秒 lease；編輯／重算／確認清除立即取消新下載權，但不提前撤銷已開始的 URL。pagehide／語言確認離頁才立即全部 revoke。timer 只回收 URL，不改 DOM，不會復活清空後按鈕。只稱交給瀏覽器，不宣稱檔案已保存。
- pagehide 清 DOM 值、列、report、pending、URLs／timer；persisted pageshow 空白重設；此行為的受控事件測試不等真 BFCache。
- 不外傳資料，不用 network API、storage、analytics、console 或遠端資產；初次載入靜態頁仍需要網路。使用者字串一律 value/textContent，不 HTML parsing。下載／瀏覽器歷史由使用者與瀏覽器管理，不宣稱可以撤回已開始下載。

## 安全工具鏈

`files.mjs` 精確 allowlist 9 個 public/dist 資產與兩個目錄。拒絕未知檔／目錄、缺檔、symlink（含祖先）、hardlink、非普通檔、超大檔；O_NOFOLLOW 及 stat 身分檢查；快照前後驗樹與位元組。

build 與 check 都先以 `snapshotProject(root)` 安全讀取 package.json/public，package 前後 bytes 一致才回傳同一快照；共用 `validateProject(snapshot)` 先核 package 必為 object/private=true/type=module，四種 dependencies maps 只能省略或為空普通 object，接著核 noindex／robots／CSP／HTML／runtime API／ESM 語法；語法直接核相同 snapshot bytes。任何語意失敗在建立 stage 之前停止，既有 dist 不變。其後核既有 dist，完成同磁碟 stage，再次核目標後 rename；未知 dist 不會被刪除。完整已知 backup 清除前再核樹；stage 無法安全確認時保留人工檢查。這是合作工作目錄下的防誤操作與可測拒絕契約，**不是對惡意並行 filesystem racer 的完整證明**。

check 為靜態掃描／Node syntax／header/link/noindex 契約，不等 full Network/Storage。沒有正式 canonical、hreflang、sitemap、JSON-LD、worker/deploy 設定或猜測 liveURL。
