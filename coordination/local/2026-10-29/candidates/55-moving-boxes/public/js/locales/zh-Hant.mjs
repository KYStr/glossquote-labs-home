export default {
  language: 'zh-Hant', locale: 'zh-Hant',
  words: {
    box: '箱號', room: '目的房間', priority: '優先開箱', standard: '一般開箱', notes: '備註', name: '物品名稱', quantity: '數量',
    saveBox: '儲存箱設定', boxSettings: '箱設定', addBox: '新增箱子', cancelEdit: '取消編輯', removeBox: '移除此箱', addItem: '加入物品', editItem: '編輯物品', saveItem: '儲存物品', removeItem: '移除物品', moveItem: '搬移物品', target: '搬移到另一箱', selectTarget: '選擇目的箱',
    emptyBoxes: '加入資料開始', emptyBoxHelp: '先加入箱號與目的房間，再記下裝進去的物品。', emptyItems: '這是空箱，從下方加入第一件物品。', noMatches: '沒有符合的項目，原清單保持不變。', noItems: '還沒有物品，先在箱子裡加入物品。',
    selected: '目前箱子', openBox: '開啟箱子', searchTitle: '搜尋結果', allItems: '全部物品', searchHelp: '搜尋名稱、備註、箱號和房間。搜尋只改變顯示，不刪除資料。',
    previous: '上一頁', next: '下一頁', page: '第', of: '／', boxes: '箱', items: '項物品紀錄', results: '項結果', example: '假例子',
    prepare: '預覽匯出', download: '下載檔案', outputLabel: '匯出預覽（可選取文字）',
    importHeading: '替換目前專案？', deleteHeading: '確認移除內容', confirmImport: '替換專案', confirmBox: '移除箱子與箱內物品', confirmItem: '移除物品', cancel: '取消',
    replacement: '確認後會替換所有現有箱子與物品。若要保留，請先下載目前專案 JSON。', incoming: '將匯入的專案', existing: '目前專案', deleteBoxWarning: '此箱與其中每一項物品紀錄都會移除。', deleteItemWarning: '此物品紀錄將從箱子中移除。', exampleWarning: '這是明確標示的虛構假例子資料。',
    dirty: '先儲存或取消每一處尚未儲存的編輯，再預覽匯出。清單使用已儲存的裝箱資料。',
    draft: '尚未儲存的編輯', ready: '可以下載', boxHelp: '箱號大小寫有別：a 與 A 是不同箱子。', itemHelp: '數量為 1–100,000 的整數；物名最多 120 字，備註最多 500 字。每個欄位限單行。',
    selectBox: '選擇要編輯的箱子', limits: '最多 100 箱、總共 1,000 項物品紀錄；物品數量另外記錄。', filename: '檔名', nativeDownload: '若瀏覽器阻擋下載，可自行選取並保存預覽文字。',
    languageHeading: '切換語言？', languageWarning: '切換頁面會失去本頁尚未匯出的資料與編輯。離開前請先下載專案 JSON。', languageContinue: '切換至 English', stay: '留在此頁',
    units: '件', deleteName: '物品', noDestination: '加入另一箱後即可搬移物品。', invalid: '請修正標示欄位，舊匯出已清除。', fieldLimit: '字，單行'
  },
  status: {
    INITIAL: '加入資料開始。', EDITING: '舊匯出已清除，準備好後可重新預覽。', DRAFTS: '有尚未儲存的編輯，請先儲存或取消再匯出。',
    SAVED: '已記錄在本頁記憶體；下載專案 JSON 才能保留。', SEARCH_UPDATED: '已更新搜尋，已儲存的裝箱資料不變。',
    IMPORT_PREVIEW: '專案已驗證，請確認數量後再替換。', DELETE_PREVIEW: '請檢查下方移除內容，目前尚未刪除。',
    DELETED: '已移除空箱。', CANCELLED: '已取消，目前裝箱資料保持不變。', CLEARED: '已清除本頁裝箱資料與準備好的匯出。',
    EXAMPLE_LOADED: '已載入虛構假例子，請換成自己的裝箱資料。', READING: '正在本機讀取專案，可取消。',
    EXPORT_READY: '匯出預覽已準備好，檢查後可下載檔案。', DOWNLOAD_REQUESTED: '已要求下載，請查看瀏覽器的下載狀態。'
  },
  errors: {
    REQUIRED: '請填寫必填欄位。', TEXT_TOO_LONG: '請將此欄位縮短至標示的字數上限。', INVALID_TEXT: '請使用有效 Unicode 單行文字，不包含控制字元。',
    INVALID_SCHEMA: '專案結構或欄位不符，請使用 schema 1 專案 JSON。', DANGEROUS_KEY: '專案含禁止的物件鍵，整份未匯入。',
    INVALID_PRIORITY: '請選擇是否優先開箱。', DUPLICATE_BOX_ID: '箱號已存在，請改用其他箱號；沒有覆蓋任何箱子。',
    INVALID_QUANTITY: '請輸入 1–100,000 的十進位整數，不接受指數或小數。', BOX_LIMIT: '一個專案最多 100 箱。', ITEM_LIMIT: '所有箱子合計最多 1,000 項物品紀錄。',
    INVALID_ITEM_ID: '專案的物品 ID 不符格式。', DUPLICATE_ITEM_ID: '專案有重複的物品 ID，整份未匯入。',
    ITEM_ID_EXHAUSTED: '這份專案無法再產生安全的物品 ID。', BOX_NOT_FOUND: '找不到此箱，請選擇現有箱子。', ITEM_NOT_FOUND: '找不到此物品，請檢查目前箱子。',
    CONFIRM_DELETE_REQUIRED: '移除非空箱前，請先檢查並確認。', NO_PENDING_IMPORT: '請重新選擇專案並預覽。', NO_PENDING_DELETE: '請重新選擇要移除的箱子。',
    INVALID_JSON: '無法讀取 JSON，請檢查保存的專案檔後重試。', IMPORT_TOO_LARGE: '請選擇非空且不超過 8 MiB（8,388,608 bytes）的 JSON 檔。', READ_FAILED: '無法讀取檔案；目前資料仍保留，請重選檔案。',
    UNSAVED_DRAFTS: '請先儲存或取消尚未儲存的編輯，再預覽匯出。', UNSAVED_EDITS: '移除資料前，請先儲存或取消尚未儲存的編輯。', INVALID_REPORT_MODE: '請選擇支援的匯出格式。', INVALID_LANGUAGE: '目前無法使用此語言。',
    UNSUPPORTED: '此瀏覽器需要 JavaScript 模組、Unicode 正規化、Blob URL、TextEncoder、TextDecoder 與 FileReader。請停止操作並改用支援的瀏覽器，不會改用雲端處理。',
    UNEXPECTED_ERROR: '無法完成操作；目前已儲存資料仍保留，請檢查欄位後重試。'
  }
};
