// Pure CSV serialiser for the monthly table (SPEC sections 2-3):
// the CSV serialises the currently computed monthly table exactly.
// Header labels are supplied by the caller (page language); values are
// plain decimals without grouping or currency symbols. No DOM/network.

import { formatCents } from './money.mjs';

export function monthlyTableCsv(rows, header) {
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push([
      String(row.month),
      formatCents(row.interestCents, false),
      formatCents(row.contributionCents, false),
      formatCents(row.balanceCents, false),
    ].join(','));
  }
  return lines.join('\n') + '\n';
}
