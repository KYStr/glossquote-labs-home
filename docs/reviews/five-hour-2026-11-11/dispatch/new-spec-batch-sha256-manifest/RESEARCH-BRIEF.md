# 多檔交付 SHA-256 清單校驗 / Batch SHA-256 Manifest Check

研究 brief，2026-11-11。建議 slug `batch-sha256-manifest`。

## 目標與使用情境

學校行政助理從同事收到同層的會議附件，例如 PDF、簡報、CSV，以及同事另行傳來的 `SHA256SUMS`。助理在 Windows 瀏覽器選完檔案後，要一次知道漏了哪一份、哪一份同名但內容有變、哪一份屬清單之外，並把逐檔結果傳回交付者確認。合作方使用相同的檔名與清單即可重做。手機可檢視小批次結果，數十個檔案的選取以桌面為主。

成功成果是一份可下載的 JSON 核對報告，每個預期檔與額外檔都有唯一狀態。全部檔案各有配對且雜湊一致時，畫面顯示「所選檔案與清單完全相符」。一致的範圍是使用者提供的清單及所選位元組。清單來源及檔案內容風險由收件人另行判斷。

## 替代方案與差異

- 熟悉終端的人可在檔案所在目錄執行 `sha256sum --check SHA256SUMS`。它能讀清單比對其中指名的檔案，額外檔案仍需另盤點。這個工作台把所選集合的多件、漏件和同名不符放進同一份報告。 [GNU SHA-2 utilities](https://www.gnu.org/s/coreutils/manual/html_node/sha2-utilities.html) · [GNU checksum modes](https://www.gnu.org/software/coreutils/manual/html_node/cksum-output-modes.html)
- Windows PowerShell 的 `Get-FileHash` 可算出 SHA-256。當交付只有一個檔案，抄對一組值就夠；批次收件則還要把名稱及預期值對接，再整理缺件、多件和錯值。 [Microsoft Get-FileHash](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-filehash?view=powershell-5.1)
- Labs 檔案校驗的契約只收一個檔案和一個可選的 64 位預期碼，明列拒收清單。下載只含該檔的雜湊。本案輸入外部預期集合與多檔集合，輸出兩集合的逐件校驗。 [file-checksum PRODUCT.md](https://github.com/KYStr/glossquote-labs-file-checksum/blob/eab1da8e69e896be00ff1be54095641352a280a7/PRODUCT.md)
- Labs 重複檔案找出來對所選檔案依大小、雜湊與位元組比對分群。輸出 keeper／duplicate，並允許使用者挑保留成員。本案以交付方預期清單為對照，即使所有檔案位元組相異也可判定交付完整。 [duplicate-files PRODUCT.md](https://github.com/KYStr/glossquote-labs-duplicate-files/blob/32bae23bcfc9753cb60756ff9ef2381219565f67/PRODUCT.md)
- Labs 封存成員路徑預檢只接收類型及相對路徑文字，輸出路徑政策與目錄樹衝突。它的範圍明列排除驗內容。本案只處理已選檔的單層名稱與 SHA-256。 [archive-path-preflight SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/a5e7356dae36d2aac3db068352a916d76c7594c3/docs/specs/archive-path-preflight/SPEC.md)

## 範圍與流程

採 Product App。首屏提供清單來源、所選檔案和「核對整批」。結果畫布依序顯示摘要、預期清單、額外檔案，並可篩選待處理列。320 CSS px 改直排，表格放入具名捲動區，保留檔名、狀態及報告下載。合成範例由明確動作載入，等待使用者開始。

1. 貼上清單或獨立選取清單檔，兩個來源互斥。再多選待校驗檔案。顯示項目數、位元組數及來源名稱。
2. 按「核對整批」。預檢先完成文法、重名及容量核對，再顯示已核對的配對數。未選到任何檔案時仍可列出全數漏件。
3. 檢視「相符、雜湊不符、清單有但未選、已選但清單無、讀取失敗」。結果與下載同一份資料。
4. 明確下載 `sha256-manifest-report.json`，或更換清單、調整選檔後重跑。首版範圍之外包含掃描目錄、開啟壓縮檔、建立簽章、檔案安全判定、合併同名或改寫來源、產生新清單。

## 輸入、輸出與字面案例

- 清單 1–200 列、UTF-8 最多 64 KiB，允許開頭一個 BOM 及 LF 或 CRLF，末列換行可省略。每列是 64 個 ASCII 十六進位字元、ASCII 空格、模式字元（空格或 `*`）、完整檔名。模式只辨識輸入語法，瀏覽器一律讀原始位元組。空白列、裸 CR、BSD tagged、GNU 跳脫與 NUL 分隔清單顯示實體列號和格式原因。
- 檔名為 1–255 UTF-8 bytes 的 basename，禁止 `/`、反斜線、冒號、C0/C1 控制碼、DEL、單獨代理碼元、ASCII 空格首尾、`.`、`..` 和 GNU 用來代表標準輸入的 `-`。兩端名稱各自精確唯一。大小寫、Unicode 正規化與內部空格皆按原值配對，UI 只將雙向控制字元等不可見碼顯示為轉義。
- 待核對檔案 0–200 件、單檔最多 32 MiB、總和最多 128 MiB。接受 0 bytes。多檔選取是整批替換，結果區可先移除某一項再重跑。先檢查上限和名稱，失敗時保留草稿與定位，停用下載。

清單文字如下。

```text
BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD  notes.txt
2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824 *agenda.txt
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  empty.txt
```

按順序選擇 `extra.txt`（ASCII `hello`）、`agenda.txt`（ASCII `abc`）、`notes.txt`（ASCII `abc`）。前兩個預期檔都可讀，`empty.txt` 未選。下載內容的完整資料如下。實際 JSON 採 compact 序列化、末尾一個 LF，UTF-8 無 BOM。

```json
{
  "schemaVersion": 1,
  "algorithm": "SHA-256",
  "exactMatch": false,
  "counts": {"match": 1, "mismatch": 1, "missing": 1, "unexpected": 1, "read_error": 0},
  "rows": [
    {"name": "notes.txt", "status": "match", "sizeBytes": 3, "expectedSha256": "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "actualSha256": "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"},
    {"name": "agenda.txt", "status": "mismatch", "sizeBytes": 3, "expectedSha256": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "actualSha256": "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"},
    {"name": "empty.txt", "status": "missing", "sizeBytes": null, "expectedSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "actualSha256": null},
    {"name": "extra.txt", "status": "unexpected", "sizeBytes": 5, "expectedSha256": null, "actualSha256": null}
  ]
}
```

## 演算法、資料生命週期及依賴

1. 使用 fatal UTF-8 解碼並按實體列解析。以 `Map` 建立預期檔名與已選檔名索引，重名直接回原列或原檔位置。
2. 逐一走訪清單；只有配對成功才讀檔。安全環境的 Worker 用 `File.arrayBuffer()` 與 `crypto.subtle.digest("SHA-256", buffer)`，同時只讀一件。讀檔失敗保留 `sizeBytes` 和預期值，以 `read_error` 收斂該列，繼續檢查其餘檔。digest 或 Worker 故障是全批執行錯誤，保留草稿供重試。
3. 最後按選取順序追加額外項目。只有全列 `match` 時 `exactMatch=true`。錯值、漏件、多件及個別讀取錯誤仍可下載完整診斷。表格、下載 JSON 及狀態讀同一結果。
4. 清單、檔案或設定變更立即撤銷舊結果及下載。取消終止 Worker 並失效工作代號，保留草稿。重設、語言切換、pagehide 釋放引用與 Blob URL，返回頁面為空白。忽略延遲訊息。每次工作只在記憶體，下載由使用者點擊，報告包含檔名、大小及清單所載雜湊，出檔前顯示內容範圍。

依賴瀏覽器 Web Crypto、File、Worker、Blob 和 TextDecoder；原生 API 支援缺失時顯示本機環境錯誤。輸入檔保持上限，候選階段實測低記憶體裝置與瀏覽器 Worker API。頁面載入後的清單解析、校驗和下載均使用本機資源。使用固定 Worker 資產及固定輸出檔名，資料不上傳、不持久化、不執行，檔名用安全文字呈現。 [W3C Web Cryptography digest](https://www.w3.org/TR/webcrypto/#SubtleCrypto-method-digest)

## 語言、SEO 與驗證

繁中頁標題「多檔 SHA-256 清單校驗」，英文頁標題「Batch SHA-256 Manifest Check」。搜尋敘述聚焦「檢查 SHA256SUMS 清單、找漏件和校驗值不符」，英文對應「Check a SHA256SUMS manifest and find missing files or checksum mismatches」。兩語各自靜態入口、正確 lang、canonical、hreflang 與同語首頁連結，候選預覽 noindex，正式網址由發布流程確定。兩語報告使用同一機器欄位及值。

文件案例供獨審重算，產品測試待正式承接。

| 案例 | 獨立預期 |
| --- | --- |
| 上述整批 | match 1、mismatch 1、missing 1、unexpected 1，`exactMatch=false`。 |
| 選 `empty.txt`（0 bytes），清單只留第三列 | match 1，雜湊 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`，`exactMatch=true`。 |
| 清單 `notes.txt`；選 `Notes.txt` | 先 missing，再 unexpected。 |
| 貼兩列相同 `notes.txt` | 第二列重名，尚無檔案讀取或報告。 |
| 第一列把檔名改為 `../notes.txt` | 第 1 列檔名格式錯誤，檔案內容讀取次數為零。 |
| 清單一列，選取的同名 `File.arrayBuffer` 拒絕 | `read_error=1`，actual 為 null，仍有診斷報告。 |
| 單檔 33,554,432 bytes 與 33,554,433 bytes | 前者可開始，後者預檢阻擋且不讀檔。 |
| 校驗中取消、再改檔、注入舊 Worker 成功訊息 | 畫面保留現行草稿，下載維持停用。 |

產品九面向的預計證據依序為 functionality（固定已知雜湊與報告 bytes）、boundaries（格式、大小、重名、取消、逾代訊息）、privacy（Network/Storage 與離頁清理）、security（固定路徑、惰性檔名及 CSP）、usability（批次例、待處理篩選、下載及重跑）、accessibility（鍵盤、讀屏回饋、320 CSS px 與 200% zoom）、localization-seo（兩語靜態頁和同語導覽）、toolchain-provenance（同 head 離線重建及固定來源）、compatibility（獲准隔離的 Chrome／Edge 與代表性行動端的 File、Worker 及下載）。產品檢查皆待執行。

## 接續

主對話先確認本 brief 與當前登記、PR 的差異。若採用，發布固定 brief 至 `docs/specs/batch-sha256-manifest/BRIEF.md`，由正式承接者補 SPEC、fixtures、作者自查及獨立文件審查。產品來源預定 `tools/batch-sha256-manifest/`，配對核心與 Worker／UI 分開驗證，產品依正式 claim 與候選 PR 交驗。
