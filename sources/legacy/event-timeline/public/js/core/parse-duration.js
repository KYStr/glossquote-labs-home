export function parseDuration(raw) {
  if (typeof raw !== 'string' || raw === '' || /[^0-9]/.test(raw)) return { ok: false, code: 'DURATION_FORMAT' };
  const digits = raw.replace(/^0+/, '') || '0';
  if (digits === '0' || digits.length > 3 || digits.length === 3 && digits > '720') return { ok: false, code: 'DURATION_RANGE' };
  return { ok: true, minutes: Number(digits) };
}
