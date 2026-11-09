import { exactRecord } from './core/date.mjs';

// The form retains both drafts; only the active mode crosses the core schema boundary.
export function projectDraft(fields) {
  exactRecord(fields, ['mode', 'title', 'location', 'notes', 'startDate', 'startTime', 'endDate', 'endTime', 'zone', 'startChoice', 'endChoice', 'allStartDate', 'lastDate']);
  const common = { mode: fields.mode, title: fields.title, location: fields.location, notes: fields.notes };
  if (fields.mode === 'all-day') return { ...common, startDate: fields.allStartDate, lastDate: fields.lastDate };
  return { ...common, startDate: fields.startDate, startTime: fields.startTime, endDate: fields.endDate,
    endTime: fields.endTime, zone: fields.zone, startChoice: fields.startChoice, endChoice: fields.endChoice };
}
