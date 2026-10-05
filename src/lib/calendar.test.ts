import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcHours, generateDaysForMonth } from './calendar.ts';
import { getAbsenceCounts, getAttendanceDays } from './summary.ts';
import type { TimesheetState } from './types.ts';

test('calcHours', () => {
  assert.equal(calcHours('08:00', '17:00'), '9:00');
  assert.equal(calcHours('22:00', '02:30'), '4:30');
  assert.equal(calcHours('', '17:00'), '0:00');
});

test('switching months keeps filled entries via the archive', () => {
  const oct = generateDaysForMonth(10, 2026, []);
  oct[0] = { ...oct[0], activity: 'Rapat sprint' };
  const nov = generateDaysForMonth(11, 2026, [], oct);
  assert.equal(nov[0].date, '2026-11-01');
  const archive = [...oct, ...nov];
  const octAgain = generateDaysForMonth(10, 2026, [], archive);
  assert.equal(octAgain[0].activity, 'Rapat sprint');
});

test('December period starting mid-month runs into next year', () => {
  const days = generateDaysForMonth(12, 2026, [{ date: '2027-01-01', name: 'Tahun Baru Masehi', type: 'public' }], [], 15);
  assert.equal(days.length, 31);
  assert.equal(days.at(-1)!.date, '2027-01-14');
  assert.equal(days.find(d => d.date === '2027-01-01')!.isHoliday, true);
});

test('attendance counts Ijin/Sakit/Cuti from per-day status', () => {
  const entries = generateDaysForMonth(10, 2026, []);
  const workdays = entries.filter(e => !e.isHoliday);
  workdays[0].workType = 'Sakit';
  workdays[1].workType = 'Sakit';
  workdays[2].workType = 'Cuti';
  const state: TimesheetState = {
    meta: { month: 10, year: 2026, employeeName: '', projectName: '', clientName: '', holidays: [] },
    entries,
  };
  assert.deepEqual(getAbsenceCounts(state), { absent: 0, sick: 2, leave: 1 });
  assert.equal(getAttendanceDays(state), workdays.length - 3);
});
