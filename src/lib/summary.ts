import type { TimesheetMeta, TimesheetState } from './types';

export const DEFAULT_STANDARD_WORK_HOURS = '168:00';

export function toNonNegativeNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function getStandardWorkDays(state: TimesheetState): number {
  return state.entries.filter(e => !e.isHoliday).length;
}

export function getAttendanceDays(state: TimesheetState): number {
  const workDays = getStandardWorkDays(state);
  const absent = toNonNegativeNumber(state.meta.totalAbsent);
  const sick = toNonNegativeNumber(state.meta.totalSick);
  const leave = toNonNegativeNumber(state.meta.totalLeave);
  return workDays - absent - sick - leave;
}

export function getStandardWorkHours(meta: TimesheetMeta): string {
  const configured = meta.standardWorkHours?.trim();
  return configured || DEFAULT_STANDARD_WORK_HOURS;
}

export function parseHoursToMinutes(value: string | undefined): number {
  if (!value) return 0;
  const match = value.trim().match(/^(\d+)(?::([0-5]\d))?$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2] || 0);
}

export function formatMinutesAsHours(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : '';
  const absMinutes = Math.abs(totalMinutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  return `${sign}${h}:${String(m).padStart(2, '0')}`;
}

export function addHourStrings(...values: Array<string | undefined>): string {
  const total = values.reduce((acc, value) => acc + parseHoursToMinutes(value), 0);
  return formatMinutesAsHours(total);
}

export function formatWholePercent(numerator: number, denominator: number): string {
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}
