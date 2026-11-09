# 產品需求：重複檔案找出來

M1 必須完成本機端完整工作：選擇檔案、掃描、檢視重複群組、改選 keeper、下載 keep/duplicate 清單並重設。任何輸出都是報告；來源檔不被刪除、修改或上傳。

## Job、result、contract、oracle

Job v1 是不可持久化的一次分析：

    {
      schemaVersion: 1,
      jobId: "job-1",
      files: [
        { sourceIndex: 0, file: File, name: "a", sizeBytes: 3 }
      ]
    }

sourceIndex 是加入時零起始的固定位置；相同檔名仍靠 sourceIndex 區分。新增、移除、替換或重排來源會使整個舊結果 stale；使用者需重新分析。Keeper 選擇只改報告映射，不改內容分組。

成功 Result v1：

    {
      schemaVersion: 1,
      jobId: "job-1",
      status: "ready",
      algorithm: "size-sha256-byte-verify-v1",
      files: [
        {
          sourceIndex: 0,
          name: "a",
          sizeBytes: 3,
          sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
          status: "keep",
          keeperSourceIndex: 0
        },
        {
          sourceIndex: 1,
          name: "b",
          sizeBytes: 3,
          sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
          status: "duplicate",
          keeperSourceIndex: 0
        }
      ],
      groups: [{
        groupId: "group-001",
        sizeBytes: 3,
        sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        keeperSourceIndex: 0,
        memberSourceIndexes: [0, 1],
        duplicateSourceIndexes: [1],
        savedBytes: 3
      }],
      summary: {
        selectedFileCount: 2,
        uniqueContentCount: 1,
        duplicateFileCount: 1,
        savedBytes: 3
      }
    }

SHA-256 是每個來源檔的 64 位小寫 hex。Groups 按其最小 sourceIndex 排列，members 和 duplicates 均按 sourceIndex 遞增；files 永遠按 sourceIndex 排列。單一檔案也有 singleton group，duplicateSourceIndexes 為 []、savedBytes 為 0、keeper 為自身。不同內容即使測試 digest provider 回傳相同 SHA 也必須分成不同 groups。報告不含檔案內容、路徑或時間戳。

JSON 下載為 duplicate-report.json，exact keys 是 schemaVersion、kind="glossquote-duplicate-report"、algorithm、files、groups、summary。Object 欄位和順序符合上述 Result；不准額外 keys。TXT 下載為 duplicate-report.txt，UTF-8；第一段列 file count、unique count、duplicate count、saved bytes，之後以固定欄名表格列每一檔案的 status、sourceIndex、JSON-quoted name、sizeBytes、sha256、keeperSourceIndex。空 keeper 寫 null；JSON quoting 使 tab/newline 和引號不會破壞欄位。兩份報告都只在使用者點下載時生成。

固定 error codes：NO_FILES、TOO_MANY_FILES、FILE_TOO_LARGE、TOTAL_SIZE_LIMIT、READ_FAILED、DIGEST_FAILED、VERIFY_FAILED、CANCELED。錯誤結果為 {schemaVersion:1, jobId, status:"error", error:{code,fileIndexes,messageKey}, files:[], groups:[], summary:null}；read/digest error 的 indexes 升序，不含內容或 stack trace。

## 功能需求

**FR-01 選擇檔案。** 多檔選取及可選拖放，初始空清單；最多 200 檔。顯示選取順序、檔名和 size。空檔案可以選取。名稱只是標籤，永不當路徑或 HTML。

**FR-02 驗證上限。** 每檔最多 33,554,432 bytes，合計最多 134,217,728 bytes。檔案數、單檔和總量都在讀內容前驗證。遇超限顯示明確原因和相關 sourceIndex，沒有部分報告。檔名相同不構成衝突或重複。

**FR-03 依大小及 SHA-256 篩候選。** 固定依 sourceIndex 順序逐檔分析，對每檔計算 SHA-256。候選鍵是 (sizeBytes, sha256)。空檔 SHA-256 是 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855。

**FR-04 逐 byte 確認。** 任何 size+SHA 候選都需以二進位 bytes 全量比對後才能同組。比較採 64 KiB chunks，遇第一個不同 byte 即判不同；全長和 bytes 都相同才屬重複。hash 僅是縮小候選的線索，不是內容相同證明。

**FR-05 進度與取消。** UI 顯示 hashing/byte verification 階段以及 completedFiles/totalFiles；每處理完一個檔案更新一次。取消由 Worker terminate，立即作廢 jobId epoch、釋放所有 buffer/hash 暫存且不產生部分報告。開始另一次分析也取消舊 job。

**FR-06 預設 keeper 和手動選擇。** 每個 group 預設 sourceIndex 最小的成員為 keeper。重複群組只可將 keeper 改成該 group 的 member；不能指定外部檔案，也不能把同一組標成全保留或全刪除。keeper 變更只重算 status、keeperSourceIndex 和 JSON/TXT preview。來源集合變化會清除全部分析和選擇。

**FR-07 結果與下載。** Ready 狀態顯示群組成員、keeper、重複檔、大小、hash、總檔案數、unique contents、duplicate count、savedBytes。下載 JSON 或 TXT 前產生當下 keeper mapping。報告只列檔名、sourceIndex、size、hash、group 和分類，不含內容、目錄路徑或可還原 bytes。

**FR-08 不改來源。** 沒有刪除、移動、重命名、覆寫按鈕。任何檔案改變須由使用者在檔案系統另行處理；工具只下載報告。

**FR-09 安全名稱顯示。** 檔名作 untrusted text，以文字節點呈現；不可 innerHTML、eval、URL 或 HTML parser。控制字元和 bidi 控制以可見 escape 顯示，JSON 仍保存原字串並由 JSON serializer escape。名稱相同時每個視覺列和報告都顯示 sourceIndex。

**FR-10 記憶體生命週期。** File、hash、buffer、結果和 object URLs 僅在目前分頁。取消、來源修改、reset、pagehide 清除暫存並 revoke URL。Ready 結果沒有時間期限，直到上述清理事件發生。沒有 localStorage、IndexedDB、Cache API、服務端或網路請求。

**FR-11 雙語頁面導覽。** 繁中版 /index.html 與英文版 /en/index.html 是獨立靜態頁面。語言選項為普通連結；切頁會失去目前的選檔、分析結果和未下載報告，連結旁必須明示。不得用 storage、query、hash 或跨頁 state 保存資料。

## 核心 Oracle

選取 a=ASCII abc、b=ASCII abc、c=ASCII abd、d=empty、e=empty 時，groups 依 sourceIndex 首見順序為 [0,1]、[2]、[3,4]；兩個 duplicate groups，c 是 singleton。uniqueContentCount=3，duplicateFileCount=2，savedBytes=3。相同檔名但內容不同屬不同 singleton。更多精確情境見 ACCEPTANCE.md。
