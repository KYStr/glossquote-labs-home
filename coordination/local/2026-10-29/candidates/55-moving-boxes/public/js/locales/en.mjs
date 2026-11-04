export default {
  language: 'en', locale: 'en',
  words: {
    box: 'Box', room: 'Destination room', priority: 'Open first', standard: 'Standard unpacking', notes: 'Notes', name: 'Item name', quantity: 'Quantity',
    saveBox: 'Save box settings', boxSettings: 'Box settings', addBox: 'Add a box', cancelEdit: 'Cancel edits', removeBox: 'Remove this box', addItem: 'Add item', editItem: 'Edit item', saveItem: 'Save item', removeItem: 'Remove item', moveItem: 'Move item', target: 'Move to box', selectTarget: 'Select a box',
    emptyBoxes: 'Add data to begin', emptyBoxHelp: 'Add a box and its destination room. Then record what goes inside.', emptyItems: 'This box is empty. Add its first item below.', noMatches: 'No matching items. Your inventory is retained.', noItems: 'No items yet. Add an item to a box.',
    selected: 'Selected box', openBox: 'Open box', searchTitle: 'Search results', allItems: 'All items', searchHelp: 'Search names, notes, box IDs and rooms. Search changes only this view.',
    previous: 'Previous', next: 'Next', page: 'Page', of: 'of', boxes: 'boxes', items: 'item entries', results: 'results', example: 'Example data',
    prepare: 'Preview export', download: 'Download file', outputLabel: 'Export preview (selectable text)',
    importHeading: 'Replace current project?', deleteHeading: 'Review removal', confirmImport: 'Replace project', confirmBox: 'Remove box and its items', confirmItem: 'Remove item', cancel: 'Cancel',
    replacement: 'This replaces all current boxes and items. Download your current project JSON first if you need to keep it.', incoming: 'Incoming project', existing: 'Current project', deleteBoxWarning: 'The box and every item entry in it will be removed.', deleteItemWarning: 'This item entry will be removed from the box.', exampleWarning: 'This is clearly labeled fictional example data.',
    dirty: 'Save or cancel every pending edit before preparing an export. Reports use the saved inventory.',
    draft: 'Unsaved edits', ready: 'Ready to download', boxHelp: 'Box IDs are case sensitive: a and A are different boxes.', itemHelp: '1–100,000 whole units. Item names: up to 120 characters; notes: up to 500. Use one line per field.',
    selectBox: 'Select a box to edit', limits: 'Up to 100 boxes and 1,000 item entries. Quantities are counted separately.', filename: 'Filename', nativeDownload: 'If your browser blocks the download, select and save the preview text yourself.',
    languageHeading: 'Switch language?', languageWarning: 'Switching pages discards this page’s unexported data and edits. Download the project JSON before leaving.', languageContinue: 'Switch to 繁體中文', stay: 'Stay on this page',
    units: 'units', deleteName: 'Item', noDestination: 'Add another box to move items.', invalid: 'Fix the marked fields; the previous export has been cleared.', fieldLimit: 'characters; one line'
  },
  status: {
    INITIAL: 'Add data to begin.', EDITING: 'Previous export cleared. Prepare a new export when ready.', DRAFTS: 'Unsaved edits. Save or cancel them before exporting.',
    SAVED: 'Saved in this page’s memory. Download the project JSON to keep it.', SEARCH_UPDATED: 'Search updated. Saved inventory is unchanged.',
    IMPORT_PREVIEW: 'Project validated. Review the counts before replacing.', DELETE_PREVIEW: 'Review the removal below; nothing has been removed yet.',
    DELETED: 'Empty box removed.', CANCELLED: 'Cancelled. Current inventory retained.', CLEARED: 'This page’s inventory and prepared export were cleared.',
    EXAMPLE_LOADED: 'Fictional example data loaded. Replace it with your own inventory.', READING: 'Reading project locally. You can cancel.',
    EXPORT_READY: 'Export preview ready. Check it, then download the file.', DOWNLOAD_REQUESTED: 'Download requested. Check your browser’s download status.'
  },
  errors: {
    REQUIRED: 'Complete the required field.', TEXT_TOO_LONG: 'Shorten this field to its stated limit.', INVALID_TEXT: 'Use valid Unicode text on one line, without control characters.',
    INVALID_SCHEMA: 'The project structure or fields are invalid. Restore a schema 1 project JSON.', DANGEROUS_KEY: 'The project has a forbidden object key. It was not imported.',
    INVALID_PRIORITY: 'Choose whether this box should be opened first.', DUPLICATE_BOX_ID: 'That box ID already exists. Choose a different ID; no box was overwritten.',
    INVALID_QUANTITY: 'Enter a whole decimal quantity from 1 to 100,000. Exponents and fractions are not accepted.', BOX_LIMIT: 'The project is limited to 100 boxes.', ITEM_LIMIT: 'The project is limited to 1,000 item entries across all boxes.',
    INVALID_ITEM_ID: 'The project has an invalid item ID.', DUPLICATE_ITEM_ID: 'The project repeats an item ID. Nothing was imported.',
    ITEM_ID_EXHAUSTED: 'No further safe item ID is available in this project.', BOX_NOT_FOUND: 'The box is no longer available. Select an existing box.', ITEM_NOT_FOUND: 'The item is no longer available. Review the current box.',
    CONFIRM_DELETE_REQUIRED: 'Review and confirm before removing a nonempty box.', NO_PENDING_IMPORT: 'Choose a project and review it again.', NO_PENDING_DELETE: 'Select the box for removal again.',
    INVALID_JSON: 'The JSON cannot be read. Check the saved project file and try again.', IMPORT_TOO_LARGE: 'Select a nonempty JSON file no larger than 8 MiB (8,388,608 bytes).', READ_FAILED: 'The file could not be read. Your current inventory is retained; try another file.',
    UNSAVED_DRAFTS: 'Save or cancel pending edits before preparing an export.', UNSAVED_EDITS: 'Save or cancel pending edits before removing data.', INVALID_REPORT_MODE: 'Choose a supported export format.', INVALID_LANGUAGE: 'This language is unavailable.',
    UNSUPPORTED: 'This browser needs JavaScript modules, Unicode normalization, Blob URLs, TextEncoder, TextDecoder and FileReader. Stop here and use a supported browser; no cloud fallback is used.',
    UNEXPECTED_ERROR: 'The operation could not finish. Current saved inventory is retained; review the fields and try again.'
  }
};
