import { writable, derived } from 'svelte/store';
import type { TimesheetState, DayEntry, TimesheetMeta, Holiday } from './types';
import { generateDaysForMonth } from './calendar';

const defaultMeta: TimesheetMeta = {
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  employeeName: '',
  projectName: '',
  clientName: '',
  holidays: [],
  supervisorName: '',
  supervisor2Name: '',
};

const defaultState: TimesheetState = {
  meta: defaultMeta,
  entries: [],
  templateParsed: false,
};

function createTimesheetStore() {
  const { subscribe, set, update } = writable<TimesheetState>(defaultState);

  return {
    subscribe, set, update,

    setMeta(meta: Partial<TimesheetMeta>) {
      update(s => ({ ...s, meta: { ...s.meta, ...meta } }));
    },

    setMonthYear(month: number, year: number) {
      update(s => {
        const newEntries = generateDaysForMonth(month, year, s.meta.holidays, s.entries);
        return { ...s, meta: { ...s.meta, month, year }, entries: newEntries };
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

    reset() { set(defaultState); }
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
        // Don't override activity if user has filled something in overtimeOnHoliday mode
        activity: entry.overtimeOnHoliday ? entry.activity : (entry.activity || h.name),
      };
    }
    return { ...entry, isHoliday: false, holidayName: undefined, holidayType: undefined };
  });
}

export const timesheetStore = createTimesheetStore();

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

export const workDaysCount = derived(timesheetStore, $s =>
  $s.entries.filter(e => !e.isHoliday && e.workStart).length
);
