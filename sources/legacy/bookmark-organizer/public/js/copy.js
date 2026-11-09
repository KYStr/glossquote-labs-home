export const copy = {
  'zh-Hant': {
    empty: '選擇匯出檔，開始檢閱書籤。', selected: '已選擇來源，正在準備讀取…', decoding: '正在讀取並檢查 UTF-8 編碼…', tokenizing: '正在檢查標記、路徑與網址…', canceled: '已取消。頁面內的資料與下載暫存已清除，可重新選檔。', ready: '✓ 可檢閱與匯出；所有項目一開始均保留。',
    root: '根目錄', allFolders: '全部資料夾', folders: '資料夾', count: '筆', duplicateGroup: '完全相同的網址', singleton: '單一網址', suggested: '建議保留', keepSelected: '只保留所選項', include: '納入 HTML', move: '移動資料夾', titleEmpty: '（無標題）', original: '原路徑', current: '目前路徑', sourceIndex: '來源序號', noMatches: '沒有符合條件的書籤。調整搜尋或篩選條件。', emptyTree: '這份檔案沒有書籤。可以下載空的匯入檔或重新選檔。',
    summary: (total, included, groups) => `${total} 筆書籤 · ${included} 筆納入 HTML · ${groups} 組重複網址`,
    outputSummary: (total, included, folders) => `HTML：${included} 筆書籤、${folders} 個非空資料夾。JSON：${total} 筆（含排除項目）。依來源順序建立路徑樹，不含圖示 metadata。`,
    visible: (count, total) => `目前顯示 ${count} / ${total} 筆`, groupCount: count => `${count} 筆來源項目`,
    confirmExclude: count => `確認從 HTML 排除 ${count} 筆書籤？JSON 備份仍保留所有項目；之後可重新勾選。`,
    confirmGroup: count => `確認納入所選保留項，並從 HTML 排除其餘 ${count} 筆目前納入的副本？JSON 仍保留全部項目。`,
    editTitle: (title, index) => `移動「${title}」（來源序號 ${index}）`,
    moved: '✓ 資料夾已更新。原路徑仍保留在 JSON 備份。', renamed: '✓ 資料夾及其子路徑已更新。', confirmed: '✓ 已更新納入項目。檢閱下方的輸出摘要。',
    errorIntro: '整份檔案未接受，沒有部分結果或可下載產物。請修正來源或重新選擇支援的書籤 HTML。', offset: 'UTF-16 位置', errorCode: '錯誤碼',
    folderError: '路徑未更新。每行一個資料夾名稱，最多 12 層；每層 1–255 UTF-8 bytes，不可為空、.、.. 或含控制字元。',
    downloadError: '無法產生下載。資料仍在目前頁面，可重新檢閱後再試；也可重新選檔。', downloaded: name => `已交給瀏覽器下載：${name}。請確認下載結果。`,
    errors: {
      INPUT_TOO_LARGE: '檔案超過 2 MiB 上限。', INVALID_ENCODING: '檔案不是有效的 UTF-8，或編碼宣告不受支援。', UNSUPPORTED_MARKUP: '檔案含不支援或不完整的標記／註解。', UNSUPPORTED_ATTRIBUTE: '標記含未知、重複或缺少值的屬性。', INVALID_ENTITY: '文字含不支援或不完整的字元參照。', INVALID_STRUCTURE: '檔案結構、資料夾名稱或檔案讀取不符合本工具支援的格式。', DEPTH_LIMIT: '資料夾超過 12 層上限。', TOO_MANY_BOOKMARKS: '檔案超過 3000 筆書籤上限。', INVALID_URL: '網址不是有效的絕對 HTTP/HTTPS 網址，或含首尾空白、控制字元、錯誤百分比編碼。', UNSAFE_URL: '網址含帳號密碼，或使用 HTTP/HTTPS 以外的協定。', CANCELED: '處理已取消。'
    }
  },
  en: {
    empty: 'Choose an export to start reviewing bookmarks.', selected: 'Source selected. Preparing to read…', decoding: 'Reading and validating UTF-8 encoding…', tokenizing: 'Checking markup, folder paths, and URLs…', canceled: 'Canceled. Page data and temporary download URLs were cleared. Choose a file to start again.', ready: '✓ Ready to review and export. All entries start included.',
    root: 'Root', allFolders: 'All folders', folders: 'Folders', count: 'entries', duplicateGroup: 'Exact URL match', singleton: 'Unique URL', suggested: 'Suggested keeper', keepSelected: 'Keep only the selected entry', include: 'Include in HTML', move: 'Move folder', titleEmpty: '(Untitled)', original: 'Original path', current: 'Current path', sourceIndex: 'Source index', noMatches: 'No bookmarks match. Change the search or filters.', emptyTree: 'This file has no bookmarks. Download an empty import file or choose another source.',
    summary: (total, included, groups) => `${total} bookmarks · ${included} included in HTML · ${groups} duplicate URL groups`,
    outputSummary: (total, included, folders) => `HTML: ${included} bookmarks in ${folders} nonempty folders. JSON: all ${total} entries, including exclusions. Folder trees keep source order; icon metadata is omitted.`,
    visible: (count, total) => `Showing ${count} of ${total} entries`, groupCount: count => `${count} source entries`,
    confirmExclude: count => `Exclude ${count} bookmarks from HTML? JSON keeps all entries. You can include them again later.`,
    confirmGroup: count => `Include the selected keeper and exclude the other ${count} currently included copies from HTML? JSON will keep every entry.`,
    editTitle: (title, index) => `Move “${title}” (source index ${index})`,
    moved: '✓ Folder updated. JSON retains the original path.', renamed: '✓ Folder and descendant paths updated.', confirmed: '✓ Included entries updated. Review the output summary below.',
    errorIntro: 'The whole file was rejected. No partial results or downloads are available. Fix the source or choose a supported bookmark HTML export.', offset: 'UTF-16 offset', errorCode: 'Error code',
    folderError: 'The path was not changed. Use one folder name per line, up to 12 levels and 1–255 UTF-8 bytes per name. Names cannot be empty, . or .., or contain control characters.',
    downloadError: 'The download could not be generated. Your data remains in this page. Review it and try again, or choose another source.', downloaded: name => `Download handed to your browser: ${name}. Check the downloaded file.`,
    errors: {
      INPUT_TOO_LARGE: 'The file exceeds the 2 MiB limit.', INVALID_ENCODING: 'The file is not valid UTF-8, or its encoding declaration is unsupported.', UNSUPPORTED_MARKUP: 'The file contains unsupported or incomplete markup or comments.', UNSUPPORTED_ATTRIBUTE: 'A tag has an unknown, duplicate, or missing-value attribute.', INVALID_ENTITY: 'Text contains an unsupported or incomplete character reference.', INVALID_STRUCTURE: 'The structure, folder names, or file read do not match the supported profile.', DEPTH_LIMIT: 'Folders exceed the 12-level limit.', TOO_MANY_BOOKMARKS: 'The file exceeds 3000 bookmarks.', INVALID_URL: 'A URL is not an absolute HTTP/HTTPS URL, or contains surrounding whitespace, control characters, or invalid percent escapes.', UNSAFE_URL: 'A URL contains credentials or uses a protocol other than HTTP/HTTPS.', CANCELED: 'Processing was canceled.'
    }
  }
};
