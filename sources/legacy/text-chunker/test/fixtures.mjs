// Synthetic inputs only. Literal expected chunks come from ACCEPTANCE.md.
export const VALID_CASES = [
  { id: 'A01', source: 'A', limit: 1, mode: 'strict', expected: ['A'] },
  { id: 'A02', source: 'ABCDE', limit: 4, mode: 'strict', expected: ['ABCD', 'E'] },
  { id: 'A03', source: 'A😀BC', limit: 2, mode: 'strict', expected: ['A😀', 'BC'] },
  { id: 'A04', source: 'ab\ncdEF', limit: 4, mode: 'prefer-lf', expected: ['ab\n', 'cdEF'] },
  { id: 'A05', source: 'abcdEF', limit: 4, mode: 'prefer-lf', expected: ['abcd', 'EF'] },
  { id: 'A06', source: '\n\n\n', limit: 2, mode: 'prefer-lf', expected: ['\n\n', '\n'] },
  { id: 'A07', source: 'A\r\nB', limit: 2, mode: 'strict', expected: ['A\r', '\nB'] },
  { id: 'A08', source: 'A\r\nB', limit: 3, mode: 'prefer-lf', expected: ['A\r\n', 'B'] },
  { id: 'A09', source: 'AB\n', limit: 10, mode: 'strict', expected: ['AB\n'] },
  { id: 'A10', source: '  A  ', limit: 2, mode: 'strict', expected: ['  ', 'A ', ' '] },
  { id: 'A21', source: '👨‍👩‍👧‍👦', limit: 1, mode: 'strict', expected: ['👨', '\u200d', '👩', '\u200d', '👧', '\u200d', '👦'] }
];
export const MARKUP_SOURCE = '<script>globalThis.fixtureExecuted=true</script><img src=x onerror=alert(1)> & "draft"';
