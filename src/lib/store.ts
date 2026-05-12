import { writable, derived } from 'svelte/store';
import type { TimesheetState, DayEntry, TimesheetMeta, Holiday } from './types';
import { generateDaysForMonth } from './calendar';
import {
  DEFAULT_STANDARD_WORK_HOURS,
  addHourStrings,
  formatWholePercent,
  getAttendanceDays,
  getStandardWorkDays,
  getStandardWorkHours,
  parseHoursToMinutes,
} from './summary';

const LS_KEY_TIMESHEET = 'timesheet_v1';
const LS_KEY_THEME = 'timesheet_theme_v1';

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

function clearStorage() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(LS_KEY_TIMESHEET);
  localStorage.removeItem(LS_KEY_THEME);
}

const defaultMeta: TimesheetMeta = {
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  employeeName: '',
  projectName: '',
  clientName: '',
  holidays: [],
  supervisorName: '',
  supervisor2Name: '',
  totalAbsent: 0,
  totalSick: 0,
  totalLeave: 0,
  standardWorkHours: DEFAULT_STANDARD_WORK_HOURS,
};

const defaultState: TimesheetState = {
  meta: defaultMeta,
  entries: [],
  templateParsed: false,
};

function createTimesheetStore() {
  const initial = loadFromStorage<TimesheetState>(LS_KEY_TIMESHEET, defaultState);
  const { subscribe, set, update } = writable<TimesheetState>(initial);

  subscribe(state => {
    const { templateBuffer: _, ...toSave } = state as TimesheetState & { templateBuffer?: unknown };
    saveToStorage(LS_KEY_TIMESHEET, toSave);
  });

  return {
    subscribe, set, update,

    setMeta(meta: Partial<TimesheetMeta>) {
      update(s => ({ ...s, meta: { ...s.meta, ...meta } }));
    },

    setMonthYear(month: number, year: number, startDate: number = 1) {
      update(s => {
        const newEntries = generateDaysForMonth(month, year, s.meta.holidays, s.entries, startDate);
        return { ...s, meta: { ...s.meta, month, year, startDate }, entries: newEntries };
      });
    },

    setHolidays(holidays: Holiday[]) {
      update(s => {
        const entries = regenerateWithHolidays(s.entries, holidays);
        return { ...s, meta: { ...s.meta, holidays }, entries };
      });
    },

    updateEntry(date: string, patch: Partial<DayEntry>) {
      update(s => ({
        ...s,
        entries: s.entries.map(e => e.date === date ? { ...e, ...patch } : e)
      }));
    },

    setEntries(entries: DayEntry[]) {
      update(s => ({ ...s, entries }));
    },

    setLogo(logo: string) {
      update(s => ({ ...s, meta: { ...s.meta, logo } }));
    },

    setSignature(role: 'employee' | 'supervisor1' | 'supervisor2', data: string) {
      update(s => ({
        ...s,
        meta: {
          ...s.meta,
          signatures: { ...s.meta.signatures, [role]: data }
        }
      }));
    },

    setTemplate(buffer: ArrayBuffer) {
      update(s => ({ ...s, templateBuffer: buffer, templateParsed: true }));
    },

    reset() {
      clearStorage();
      set(defaultState);
    },
  };
}

function regenerateWithHolidays(entries: DayEntry[], holidays: Holiday[]): DayEntry[] {
  return entries.map(entry => {
    const h = holidays.find(h => h.date === entry.date);
    if (h) {
      return {
        ...entry,
        isHoliday: true,
        holidayName: h.name,
        holidayType: h.type,
        activity: entry.overtimeOnHoliday ? entry.activity : (entry.activity || h.name),
      };
    }
    return { ...entry, isHoliday: false, holidayName: undefined, holidayType: undefined };
  });
}

export const timesheetStore = createTimesheetStore();

export type ThemeId = 'dark' | 'light' | 'ocean' | 'forest' | 'rose';

export interface ThemeDef {
  id: ThemeId;
  label: string;
  accent: string;
  bg: string;
}

export const themes: ThemeDef[] = [
  { id: 'dark',   label: 'Dark',   accent: '#4f8ef7', bg: '#0f1117' },
  { id: 'light',  label: 'Light',  accent: '#2563eb', bg: '#f4f6fb' },
  { id: 'ocean',  label: 'Ocean',  accent: '#38bdf8', bg: '#0a1628' },
  { id: 'forest', label: 'Forest', accent: '#4ade80', bg: '#0b1a0e' },
  { id: 'rose',   label: 'Rose',   accent: '#fb7185', bg: '#1a0d12' },
];

function createThemeStore() {
  const saved = loadFromStorage<ThemeId>(LS_KEY_THEME, 'light');
  const { subscribe, set } = writable<ThemeId>(saved);
  return {
    subscribe,
    set(id: ThemeId) {
      set(id);
      saveToStorage(LS_KEY_THEME, id);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', id);
      }
    },
    reset() {
      this.set('light');
    },
  };
}

export const themeStore = createThemeStore();

export const totalWorkHours = derived(timesheetStore, $s => {
  let total = 0;
  for (const e of $s.entries) {
    if (e.totalHour) {
      const [h, m] = e.totalHour.split(':').map(Number);
      total += (h || 0) * 60 + (m || 0);
    }
  }
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
});

export const totalOTHours = derived(timesheetStore, $s => {
  let total = 0;
  for (const e of $s.entries) {
    if (e.totalOT && e.totalOT !== '0:00') {
      const [h, m] = e.totalOT.split(':').map(Number);
      total += (h || 0) * 60 + (m || 0);
    }
  }
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
});

export const standardWorkDaysCount = derived(timesheetStore, $s => getStandardWorkDays($s));

export const workDaysCount = derived(timesheetStore, $s => getAttendanceDays($s));

export const attendanceDaysPercentage = derived(timesheetStore, $s =>
  formatWholePercent(getAttendanceDays($s), getStandardWorkDays($s))
);

export const standardWorkHours = derived(timesheetStore, $s => getStandardWorkHours($s.meta));

export const totalAttendanceHours = derived(
  [totalWorkHours, totalOTHours],
  ([$totalWorkHours, $totalOTHours]) => addHourStrings($totalWorkHours, $totalOTHours)
);

export const attendanceHoursPercentage = derived(
  [totalAttendanceHours, standardWorkHours],
  ([$totalAttendanceHours, $standardWorkHours]) =>
    formatWholePercent(parseHoursToMinutes($totalAttendanceHours), parseHoursToMinutes($standardWorkHours))
);
