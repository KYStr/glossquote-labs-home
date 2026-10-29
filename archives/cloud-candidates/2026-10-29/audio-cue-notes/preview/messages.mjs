// 完整雙語狀態與錯誤文字，避免將技術例外或私有內容顯示給使用者。
export const messages = {
  'zh-Hant': {
    ready: '音檔已就緒。播放後標記重要時刻。', loading: '正在讀取音檔資訊…最多等待 15 秒。', empty: '請先選擇本機音檔。',
    saved: '筆記已儲存。可點時間碼回到該片段。', canceled: '已取消編輯；已儲存筆記不變。', removed: '筆記已刪除。',
    marked: '已暫停並記下目前時間，請輸入筆記。', generated: '已產生目前已儲存筆記的 TXT 與 JSON。', download: '已交給瀏覽器下載；請確認瀏覽器的下載紀錄。',
    replace: '更換音檔？新音檔成功載入後，現有筆記與未儲存編輯將清除。請先下載需要的筆記。',
    clear: '清除音檔、所有筆記與未儲存編輯？此動作無法復原。', remove: '刪除這則筆記？', discard: '放棄目前未儲存的編輯？',
    leave: '離開此頁會清除音檔與筆記，尚未下載的資料將遺失。確定離開？',
    edit: '編輯', delete: '刪除', seek: '定位至', note: '筆記', count: n => `${n} / 300 則筆記`,
    editNew: '新增筆記', editExisting: '編輯筆記', noNotes: '尚無筆記。聆聽 → 標記 → 回聽。', player: '本機音檔播放器',
    errors: { FILE_SIZE: '請選擇非空且不超過 200 MiB 的音檔。', FILE_TYPE: '請選擇音訊檔案；可播放格式依瀏覽器而異。', AUDIO: '無法載入此音檔。請改用瀏覽器支援的音訊格式。原有筆記未被取代。', DURATION: '音檔需有可讀取的有限時長，介於 1 毫秒與 24 小時之間。', TIMEOUT: '讀取音檔逾時。請重選音檔或改用其他格式；原有筆記未被取代。', PLAYBACK: '音訊播放發生錯誤。筆記仍保留，可繼續編輯及匯出。', TIME_FORMAT: '請使用 HH:MM:SS.mmm，例如 00:01:23.450。', TIME_RANGE: '時間點必須介於 00:00:00.000 與音檔長度之間。', TEXT: '請輸入 1–2000 字元的筆記，並移除不支援的控制字元。', NOTES: '最多 300 則筆記；請先刪除一則。', EMPTY: '請先儲存至少一則筆記。', DIRTY: '請先儲存或取消目前編輯，再產生匯出。', COMPOSING: '請先完成輸入法組字。', DOWNLOAD_LIMIT: '已有 8 份下載正在處理，請等待最早的 60 秒期限到期。', DOWNLOAD: '無法啟動下載；可手動選取下方文字複製。', EXPORT: '請重新產生匯出。', SCHEMA: '筆記資料格式不正確，請清除後重試。' },
  },
  en: {
    ready: 'Audio is ready. Play, then mark an important moment.', loading: 'Reading audio metadata…allow up to 15 seconds.', empty: 'Choose a local audio file to begin.',
    saved: 'Note saved. Select its timestamp to return to that moment.', canceled: 'Edit canceled. Saved notes are unchanged.', removed: 'Note deleted.',
    marked: 'Playback paused and time captured. Write your note.', generated: 'TXT and JSON now reflect your saved notes.', download: 'Download handed to your browser. Check its download history.',
    replace: 'Replace this audio? Once the new file loads, existing notes and unsaved edits will be cleared. Download any notes you need first.',
    clear: 'Clear the audio, all notes and unsaved edits? This cannot be undone.', remove: 'Delete this note?', discard: 'Discard your unsaved edit?',
    leave: 'Leaving clears the audio and notes. Anything not downloaded will be lost. Leave this page?',
    edit: 'Edit', delete: 'Delete', seek: 'Seek to', note: 'Note', count: n => `${n} / 300 notes`,
    editNew: 'New note', editExisting: 'Edit note', noNotes: 'No notes yet. Listen → mark → replay.', player: 'Local audio player',
    errors: { FILE_SIZE: 'Choose a nonempty audio file no larger than 200 MiB.', FILE_TYPE: 'Choose an audio file. Playable formats depend on your browser.', AUDIO: 'This audio could not be loaded. Try a browser-supported format. Existing notes were not replaced.', DURATION: 'Audio must have a readable, finite duration between 1 millisecond and 24 hours.', TIMEOUT: 'Audio loading timed out. Choose it again or try another format. Existing notes were not replaced.', PLAYBACK: 'Audio playback failed. Your notes remain available for editing and export.', TIME_FORMAT: 'Use HH:MM:SS.mmm, for example 00:01:23.450.', TIME_RANGE: 'The timestamp must be between 00:00:00.000 and the audio duration.', TEXT: 'Enter 1–2000 characters and remove unsupported control characters.', NOTES: 'The limit is 300 notes. Delete a note first.', EMPTY: 'Save at least one note first.', DIRTY: 'Save or cancel your current edit before generating exports.', COMPOSING: 'Finish composing text before continuing.', DOWNLOAD_LIMIT: 'Eight downloads are pending. Wait for the earliest 60-second cleanup.', DOWNLOAD: 'Could not start the download. You can select and copy the text below manually.', EXPORT: 'Generate the exports again.', SCHEMA: 'The note data is invalid. Clear it and try again.' },
  },
};
