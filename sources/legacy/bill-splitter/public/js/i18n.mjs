export const messages = Object.freeze({
  'zh-Hant': Object.freeze({
    quickCalculate: '算出誰付給誰', advancedCalculate: '算出誰付給誰', quickExampleButton: '載入900／300／0範例', advancedExampleButton: '載入份數2／1／1範例',
    quickInitial: '填入每人已付的共同費用，沒付的人也列入並填0。', quickExample: '已載入範例：甲900、乙300、丙0。按「算出誰付給誰」查看建議。',
    quickZero: '目前沒有人付款，不需要轉帳。', quickTotal: '總共花多少', quickDue: '應分攤', quickCleared: '已清除。填入每人已付的共同費用開始新結算。',
    PAID_TOTAL_MAX: '已付合計超過99,999,999（0位）或99,999,999.99（2位）。請核對各人的金額。',
    person: '人員', name: '姓名', weight: '份數', paid: '已付金額', remove: '移除', minimum: '至少保留兩人。', maximum: '最多可加入50人。', count: '人參與',
    initial: '填入每人已付的共同費用，選擇平均或依份數分攤。', changed: '資料已變更，請重新計算。', complete: '✓ 結算已計算。', cleared: '已清除。填入每人已付金額開始新結算。', example: '已載入範例：甲900份數2、乙300份數1、丙0份數1。按計算查看建議。',
    total: '總額', due: '應分攤', receive: '需收', owe: '需補付', even: '已平衡', settlement: '建議結算', none: '已付金額與應分攤一致，無需補付。', pays: '支付', rule: '尾數依餘數大小分配，相同時由較前建立的人員取得。',
    copyBusy: '正在複製…', copyDone: '✓ 明細已複製。', copyFail: '無法存取剪貼簿。請在下方文字明細按 Ctrl+A（Mac：⌘A）後複製。', downloadDone: 'TXT 下載已交給瀏覽器，請確認下載清單。', downloadFail: '無法建立下載。請複製下方文字明細。',
    INPUT_SCHEMA: '資料格式不正確。請清除後重新輸入。', PRECISION: '請選擇0位或2位小數。', LOCALE: '語言設定不正確。請重新載入頁面。', AMOUNT_LENGTH: '金額輸入不可超過32個字元。', AMOUNT_FORMAT: '請輸入一般十進位金額，不加逗號或符號，並符合所選小數位數。', AMOUNT_ZERO: '總額必須大於0。', AMOUNT_MAX: '金額上限為99,999,999（0位）或99,999,999.99（2位）。', TOTAL_INVALID: '請輸入大於0的總額。',
    PEOPLE_COUNT: '參與人數必須為2至50人。', PERSON_ID: '人員順序不正確。請清除後重新輸入。', NAME_EMPTY: '請輸入姓名。', NAME_LENGTH: '姓名最多40個 Unicode 字元。', NAME_CONTROL: '姓名不可包含控制字元或換行。', NAME_UNICODE: '姓名包含不完整的 Unicode 字元，請修正。', MODE: '請選擇平均或依份數分攤。', WEIGHT_FORMAT: '份數須為0至1000的整數，不可留白。', WEIGHT_RANGE: '份數須為0至1000的整數。', WEIGHTS_ZERO: '至少一人的份數必須大於0。'
  }),
  en: Object.freeze({
    quickCalculate: 'Calculate who pays whom', advancedCalculate: 'Calculate who pays whom', quickExampleButton: 'Load 900 / 300 / 0 example', advancedExampleButton: 'Load 2 / 1 / 1 shares example',
    quickInitial: 'Enter what each person paid for shared costs. Include anyone who paid nothing with 0.', quickExample: 'Example loaded: Alice 900, Bob 300, Charlie 0. Calculate who pays whom to see the suggestions.',
    quickZero: 'Nobody has paid yet. No transfer is needed.', quickTotal: 'Spent in total', quickDue: 'Equal share', quickCleared: 'Cleared. Enter each person’s payments to start a new settlement.',
    PAID_TOTAL_MAX: 'Payments add up to more than 99,999,999 (0 decimals) or 99,999,999.99 (2 decimals). Check each payment.',
    person: 'Person', name: 'Name', weight: 'Shares', paid: 'Amount paid', remove: 'Remove', minimum: 'Keep at least two people.', maximum: 'You can add up to 50 people.', count: 'people participating',
    initial: 'Enter each person’s payments and choose equal splitting or shares.', changed: 'Details changed. Calculate again.', complete: '✓ Settlement calculated.', cleared: 'Cleared. Enter each person’s payments to start a new settlement.', example: 'Example loaded: Alice paid 900 with 2 shares, Bob paid 300 with 1 share, Charlie paid 0 with 1 share. Calculate to see the suggestions.',
    total: 'Total', due: 'Share', receive: 'To receive', owe: 'To pay', even: 'Settled', settlement: 'Suggested settlement', none: 'Paid amounts match shares. No settlement is needed.', pays: 'pays', rule: 'Leftover units go to the largest remainders; ties follow creation order.',
    copyBusy: 'Copying…', copyDone: '✓ Details copied.', copyFail: 'Clipboard access is unavailable. Select the text below with Ctrl+A (Mac: ⌘A), then copy it.', downloadDone: 'TXT download handed to your browser. Check your downloads list.', downloadFail: 'Could not create the download. Copy the text below instead.',
    INPUT_SCHEMA: 'The data format is invalid. Clear and enter the details again.', PRECISION: 'Choose 0 or 2 decimal places.', LOCALE: 'The language setting is invalid. Reload the page.', AMOUNT_LENGTH: 'An amount can contain up to 32 characters.', AMOUNT_FORMAT: 'Enter a plain decimal amount without commas or symbols, using the selected decimal places.', AMOUNT_ZERO: 'The total must be greater than zero.', AMOUNT_MAX: 'The limit is 99,999,999 (0 decimals) or 99,999,999.99 (2 decimals).', TOTAL_INVALID: 'Enter a total greater than zero.',
    PEOPLE_COUNT: 'Include between 2 and 50 people.', PERSON_ID: 'The people order is invalid. Clear and enter the details again.', NAME_EMPTY: 'Enter a name.', NAME_LENGTH: 'Names can contain up to 40 Unicode characters.', NAME_CONTROL: 'Names cannot contain control characters or line breaks.', NAME_UNICODE: 'The name contains an incomplete Unicode character. Please correct it.', MODE: 'Choose equal shares or split by shares.', WEIGHT_FORMAT: 'Shares must be integers from 0 to 1000 and cannot be blank.', WEIGHT_RANGE: 'Shares must be integers from 0 to 1000.', WEIGHTS_ZERO: 'At least one person must have a share greater than zero.'
  })
});
