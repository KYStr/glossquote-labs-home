// Fictional acceptance inputs only. Expected values do not call the implementation.
export const request = (aText = '', bText = '', overrides = {}) => ({ aText, bText, trimItems: true, ignoreCase: false, ...overrides });
export const fixedExample = request('Ada\nBo\n\nAda', 'bo\nCy\nAda');
export const expectedExample = {
  ok: true,
  value: {
    a: { side: 'A', rawLineCount: 4, blankLineCount: 1, nonEmptyLineCount: 3, uniqueCount: 2, duplicateCount: 1, items: [
      { key: 'Ada', text: 'Ada', firstLine: 1, occurrences: 2 },
      { key: 'Bo', text: 'Bo', firstLine: 2, occurrences: 1 }
    ] },
    b: { side: 'B', rawLineCount: 3, blankLineCount: 0, nonEmptyLineCount: 3, uniqueCount: 3, duplicateCount: 0, items: [
      { key: 'bo', text: 'bo', firstLine: 1, occurrences: 1 },
      { key: 'Cy', text: 'Cy', firstLine: 2, occurrences: 1 },
      { key: 'Ada', text: 'Ada', firstLine: 3, occurrences: 1 }
    ] },
    summary: { aOnlyCount: 1, bOnlyCount: 2, intersectionCount: 1, mergedCount: 4 },
    results: {
      aOnly: [{ text: 'Bo', source: 'A', firstLine: 2, occurrences: 1, key: 'Bo' }],
      bOnly: [
        { text: 'bo', source: 'B', firstLine: 1, occurrences: 1, key: 'bo' },
        { text: 'Cy', source: 'B', firstLine: 2, occurrences: 1, key: 'Cy' }
      ],
      intersection: [{ text: 'Ada', aFirstLine: 1, bFirstLine: 3, aOccurrences: 2, bOccurrences: 1, key: 'Ada' }],
      merged: [
        { text: 'Ada', source: 'A', firstLine: 1, occurrences: 2, key: 'Ada' },
        { text: 'Bo', source: 'A', firstLine: 2, occurrences: 1, key: 'Bo' },
        { text: 'bo', source: 'B', firstLine: 1, occurrences: 1, key: 'bo' },
        { text: 'Cy', source: 'B', firstLine: 2, occurrences: 1, key: 'Cy' }
      ]
    }
  }
};
