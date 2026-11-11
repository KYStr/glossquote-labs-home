# SRT 字幕可讀性批次檢查 / Batch SRT Readability Audit

研究 brief，2026-11-11。建議 slug `srt-readability-audit`。

## 目標與使用情境

小型教學頻道的字幕校對者，發布前收到一批短片的 SRT。字幕可能字太密、停留太短或同軌重疊。校對者用借來的筆電或平板選入數個檔案，套用團隊約定的門檻，帶走可回給製作人的問題清單。清單用檔名、字幕編號和來源行定位，不帶出整段字幕。

一次完成可下載的跨檔診斷，指出每檔成功檢查的範圍、未能解析的檔案及具體問題。預設是產品示例值，使用者可自行調整，結果只描述本次 SRT 文本和規則。

## 替代方案與差異

- Subtitle Edit 的 List Errors 已能檢查速度、行長、重疊等，並匯出當前字幕的錯誤清單。已有桌面字幕編輯器且需就地修檔時，該流程完整。本案聚焦同一規則檢查一批現成檔，產出一份只有位置與測值的跨檔交接。 [Subtitle Edit List Errors](https://subtitleedit.github.io/subtitleedit/features/list-errors.html)
- Subtitle Edit Online 可調 CPS、單行最大長度及持續時間，適合已在瀏覽器編輯單一字幕。此案以批次唯讀檢查和逐檔覆蓋範圍為核心。Netflix 的繁中指南示範平台會依語言、節目類型與交付情況使用不同門檻，首版避免宣稱任何平台相容評分。 [Subtitle Edit Online](https://www.nikse.dk/SubtitleEdit/Online) · [Netflix 繁中 timed text 指南](https://partnerhelp.netflixstudios.com/hc/en-us/articles/215994807-Chinese-Traditional-Timed-Text-Style-Guide)
- Labs 字幕時間平移讀一份 SRT，對每個 cue 加減同一偏移，輸出改時的 SRT，並允許原始重疊和時間錯序。本案讀一批 SRT，保留字幕原樣，只輸出可讀性與重疊診斷。 [subtitle-shift PRODUCT.md](https://github.com/KYStr/glossquote-labs-subtitle-shift/blob/8cd25b8d39eb426cfbe13b6181e83b05fe87f42a/PRODUCT.md)
- Labs 雙語字幕合併讀主副 SRT，依區間 IoU 對齊兩軌，人工解決歧義後下載雙語 SRT。本案只在各自的字幕軌內檢查，門檻與報告供編輯者定位問題。 [subtitle-bilingual PRODUCT.md](https://github.com/KYStr/glossquote-labs-subtitle-bilingual/blob/576726f053bf266958a57c77e0889db0ae8967b2/PRODUCT.md)

## 範圍與流程

1. 多選 SRT 檔或載入合成範例。顯示檔案順序與大小，可移除一檔。
2. 檢視可讀性門檻後按「檢查字幕」。工作區優先顯示逐檔結果，常用條件就在結果旁。桌面分欄，手機先輸入及門檻再看結果，保留檔案及問題類別切換。
3. 報告摘要標示已檢查檔數、格式失敗檔數、待處理 cue。點選問題展開檔名、字幕編號、時間、測值與必要規則。只在畫面可選看原文片段，下載只包含定位與測值。
4. 按「下載檢查報告」，使用者在原有編輯流程修正 SRT 後重跑。首版範圍之外含字幕同步、重切文字、VTT／ASS、畫面渲染、字體占用寬度、檢查語意、平台認證及多軌互相配對。

## 輸入、輸出與字面案例

- 1–12 個 UTF-8 SRT，單檔 ≤512 KiB，整批 ≤2 MiB；每檔 1–1,500 cues，合計 ≤6,000 cues。顯示順序以選取順序為準。同名檔以從 1 起的來源序號區別。fatal 解碼，接受檔首一個 BOM、LF/CRLF；裸 CR、NUL 及非法控制碼報格式錯。每 cue 先有 1–6 位 ASCII 數字索引（數值正且嚴格遞增），再有固定 `HH:MM:SS,mmm --> HH:MM:SS,mmm`，小時 00–99、分秒 00–59、開始早於結束，箭頭前後各至少一個 ASCII 空格或 Tab。1–10 個非空字幕行，每行最多 1,000 Unicode 碼點。以空行分段，輸出實體行從 1 起算。 [美國國會圖書館 SRT 格式](https://www.loc.gov/preservation/digital/formats/fdd/fdd000569.shtml)
- 支援純文字及整個 cue 內正確成對、可巢狀的 `<i>`、`<b>`、`<u>`。只透過受限 tokenizer 辨識，絕不交給 HTML parser。可識別為其他標籤、HTML 實體形式、ASS 花括號控制標記或未平衡的支援標記時，該 cue 標 `unsupported_markup`，字數與行數測值為 null；仍檢查時間規則。正式 SPEC 需凍結「可識別」語法及相對應假資料。其餘文字逐 grapheme 計數。
- 可設定最大 graphemes/秒（整數 1–100，預設 15）、單行最大 graphemes（1–120，預設 42）、最大行數（1–10，預設 2）、最短停留 ms（1–10,000，預設 800）。全部等於邊界視為合格。總量越界停全批。個別檔讀取、解碼或文法失敗時該檔為 `parse_error`、附第一個錯誤行，其他檔繼續。
- 下載 `srt-readability-report.json`，UTF-8 無 BOM、compact、末尾 LF、最多 4 MiB。包含 `schemaVersion`、`rules` 及選取順序的 `files`。每檔含 `fileIndex,name,status,cueCount,findings,error`；格式失敗則 `cueCount=null`、`findings=[]`、`error={code,line}`，成功則 `error=null`。每個 `findings` 列記 `cue,line,startMs,endMs,durationMs,graphemes,longestLine,lines,overlapsCue,codes`，按來源 cue 順序。報告留檔名與定位，原文留在頁面。

```srt
1
00:00:00,000 --> 00:00:01,000
好好讀

2
00:00:00,800 --> 00:00:01,300
<i>A</i> B！
第二行

3
00:00:01,300 --> 00:00:02,300
é👩‍🔧
```

把第一檔命名 `lesson.srt`，門檻設 CPS 4、單行 3、最多 1 行、最短 700 ms。三個 cue 均可解析。第一個 cue 有 3 個 grapheme、1000 ms；第三個含分解重音及 ZWJ emoji，各為一個 grapheme，共 2 個。唯一 finding 的資料如下。

```json
{"cue":"2","line":5,"startMs":800,"endMs":1300,"durationMs":500,"graphemes":6,"longestLine":3,"lines":2,"overlapsCue":"1","codes":["too_fast","too_many_lines","too_short","overlap"]}
```

## 演算法、狀態、資料生命週期及依賴

每檔讀取與驗證後掃描一次 cue 文字。剝除限定成對的樣式標記，使用 `Intl.Segmenter("en",{granularity:"grapheme"})` 切分。只排除整個 cluster 都屬 Unicode White_Space 的項目，標點計入。由來源行統計最大值和總和，以 `graphemes × 1000 > maxCps × durationMs` 判超速。畫面有需要時顯示帶約號的小數，報告保留整數測值。版本差異可能使新增的 emoji 被不同瀏覽器分段，候選驗收時記實際引擎版本。 [Unicode UAX #29](https://www.unicode.org/reports/tr29/tr29-49.html)

重疊使用 `[startMs,endMs)`。各檔以 startMs、原 cue 序做排序，一次掃描維護先前最大的 endMs 及其 cue，平手保留排序中先遇到者。當前 startMs 小於該 endMs 就回報一個可定位的 earlier cue；相接無重疊。結果按原 cue 序，問題碼順序固定為 `too_fast,line_too_long,too_many_lines,too_short,overlap,unsupported_markup`。不比較不同檔案的時間。

使用瀏覽器 File、TextDecoder、Worker、Intl.Segmenter、Blob，無第三方解析器。掃描可取消，進度用完成檔數。取消停止 Worker，保留目前選擇與門檻。編輯來源／設定立即撤銷舊報告，過期訊息不會復活。個別格式錯保留診斷，全部無問題的摘要需確認所有檔案都完成。重設、離頁、語言切換與 BFCache 返回清掉檔案、字幕、工作狀態及 Blob URL。使用者明確點下載才建立報告檔。

初始靜態資產載入後可離線執行。文字與檔名皆為惰性，處理中無工作資料網路請求或持久儲存。正式規格應固定受支援 SRT 子集，依測例核對 tokenizer 和行號，不自動修檔。

## 語言、SEO 與驗證

繁中標題「SRT 字幕可讀性批次檢查」，英文「Batch SRT Readability Audit」。描述可讀性、停留和重疊，英文對應 `subtitle reading speed, line length and timing overlap`。雙語靜態入口、同語首頁、lang/canonical/hreflang、候選 noindex，機器報告固定欄位。

| 案例 | 獨立預期 |
| --- | --- |
| 上述例 | 只標 cue 2，CPS 12、2 行、500 ms、與 cue 1 重疊 200 ms。 |
| `字字字字`、恰 1000 ms、CPS 限 4、行長限 3 | 只有 `line_too_long`，CPS 等於門檻。 |
| `é👩‍🔧`、1000 ms、行長限 2 | 兩個 graphemes，無超限。 |
| `<font color="red">A</font>` | `unsupported_markup`，文字測值為 null，仍可看時長；頁面不出現 font 元素。 |
| `[0,1000)`、`[1000,2000)` | 無重疊。第三個 cue 若為 `[1500,1800)`，只標與第二個重疊。 |
| 同批好檔 1、第二檔時戳分鐘 60 | 保留首檔結果，第二檔 `parse_error`，錯誤指時戳行。 |
| 超過整批 2 MiB 1 byte | 預檢停止，沒有分析或報告。 |
| 變更 CPS 後開始、取消、再收到舊檔成功訊息 | 保留新版門檻與草稿，無舊結果、無下載。 |

九面向預計採樣 functionality（定位、Unicode、時間和機器報告）、boundaries（等值、容量、壞檔、取消）、privacy（報告限定位、Network/Storage）、security（字幕與檔名 inert、worker 與 CSP）、usability（批次診斷與來源追溯）、accessibility（鍵盤、表格、320 CSS px、200% zoom）、localization-seo（雙語首頁與 metadata）、toolchain-provenance（離線重建、固定來源與 head）、compatibility（隔離瀏覽器的 grapheme、Worker 與實際下載）。產品檢查皆待執行。

## 接續

確認本案仍與已登記的字幕工具分工相符後，主對話可發布固定 brief 至 `docs/specs/srt-readability-audit/BRIEF.md`。正式承接者補 SPEC、fixtures 及作者自查，先定義完整 SRT 子集和文字測例，再交非作者審查。產品預定 `tools/srt-readability-audit/`。
