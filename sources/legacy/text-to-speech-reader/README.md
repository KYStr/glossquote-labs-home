# 文字朗讀 · Text-to-Speech Reader

把貼上的文字用瀏覽器提供的聲音朗讀出來的工具：逐句分段、逐句標示，播放／
暫停／繼續／停止齊全，可點任一句從該句開始，也可調語速與音高。文字只留在
分頁記憶體——不儲存、不上傳；唯一的例外是使用者自己選的「網路聲音」，頁面
在選到時會先明示。零 runtime 依賴。

A reader that speaks pasted text with the voices your browser offers:
rule-based sentence segmentation and highlighting, play / pause / resume /
stop, play-from-any-sentence, and rate and pitch controls. Text lives only
in the tab's memory — never stored, never uploaded; the single exception is
a network voice you pick yourself, which the page discloses the moment you
pick it. Zero runtime dependencies.

## 功能 · Features

- 分句規則（規格 §4）：中文以 。！？ 為界並吸附結尾引號括號；英文以
  . ! ? 後接空白與大寫／數字／開引號為界；換行一律分句。縮寫清單
  （Mr.、Mrs.、Dr.、e.g.、i.e.、etc.、vs.）是封閉清單、以資料形式出貨，
  小數點（3.14）不分句
  Segmentation (SPEC section 4): CJK terminators attach following closing
  quotes/brackets; Latin terminators need whitespace plus an uppercase
  letter, digit or opening quote; newlines always split. The abbreviation
  list (Mr., Mrs., Dr., e.g., i.e., etc., vs.) is closed and shipped as
  data; decimal points (3.14) never split
- 分段規則：超過 200 字元的句子在最後一個子句分隔符（，、；：,）切分，
  其次是最後一個空白，最後才是硬切；每段記所屬句子，標示停在該句直到
  其最後一段讀完
  Chunking: a sentence over 200 characters splits at the last clause
  separator (，、；：,), else the last space, else a hard cut; each chunk
  records its sentence, so the highlight stays on the sentence until its
  last chunk ends
- 播放狀態機（規格 §3）：一次只送一段給語音引擎，下一段在前一段結束時
  才送出——停止立即生效，播放中改聲音／語速／音高從下一段生效（送出時
  快照）；朗讀出錯即停並顯示錯誤名稱，不自動重試
  Playback state machine (SPEC section 3): one chunk at a time, the next
  enqueued only when the current one ends — Stop is immediate, and voice /
  rate / pitch changes apply from the next chunk (snapshotted at enqueue);
  an utterance error stops playback and names the error, never retries
- 進度：句子 k/N 與字元百分比都由分段清單算出（百分比無條件捨去），
  不依賴各瀏覽器不一致的 boundary 事件，所以同一段文字在任何瀏覽器
  進度都相同
  Progress: sentence k of N and a character percentage both derive from
  the chunk list (percentage rounds down), never from boundary events, so
  progress is identical across browsers for the same text
- 聲音清單：名稱、語言標籤與本機／網路標籤並列；預設先選與介面語言
  相符的聲音，其次瀏覽器預設，其次第一個；清單晚到（voiceschanged）
  與 1 秒備援重查都處理
  Voices: name, language tag and a local/network label side by side; the
  default is the first voice matching the UI language, else the browser
  default, else the first; late lists (voiceschanged) and a 1-second
  fallback re-poll are both handled
- 誠實的界線：本工具不能匯出音檔（平台 API 無法擷取自己的語音輸出，
  頁面明說，不做假按鈕）；暫停在某些平台聲音上可能被忽略，頁面在
  使用須知中明說
  Honest limits: no audio export (the platform API cannot capture its
  own output — stated on the page, no fake button); pause may be ignored
  by some platform voices, also stated on the page

## 本機開發 · Local development

```sh
npm run dev    # serve the preview at http://127.0.0.1:4173
npm test       # node:test suites (core fixtures; controller vs a fake engine)
npm run check  # project check (structure, CSP, forbidden APIs, normative fixtures)
npm run build  # copy public/ to dist/ byte-identically (preview only; production is refused)
```

## 隱私與安全 · Privacy and security

文字只以文字節點呈現（句子清單逐一 createElement 與 textContent），貼上的
標籤不存在任何 innerHTML 路徑；不寫入 URL、標題、任何儲存或日誌。開啟的
.txt 檔案只在本機以 UTF-8 嚴格解碼（解碼失敗是具名錯誤）。工具本身不發出
任何網路請求；只有使用者選定的網路聲音會把文字送給其提供者，且送出前已
在頁面揭露。

Text renders only as text nodes (the sentence list is built element by
element with textContent); pasted markup has no innerHTML path anywhere.
Nothing is written to the URL, the title, any storage, or any log. A picked
.txt file is decoded locally as strict UTF-8 (a decode failure is a named
error). The tool itself makes no network requests; only a network voice the
user selected sends text to its provider, disclosed on the page before it
speaks.
