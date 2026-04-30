import type { DayEntry, Holiday } from './types';

const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function getDayName(date: Date): string {
  return DAY_NAMES_ID[date.getDay()];
}

export function getMonthName(month: number): string {
  return MONTH_NAMES_ID[month - 1];
}

export function isWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDisplayDate(dateStr: string): string {
  const date = parseDate(dateStr);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

export function calcHours(start: string, end: string): string {
  if (!start || !end) return '0:00';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return '0:00';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function generateDaysForMonth(
  month: number,
  year: number,
  holidays: Holiday[],
  existingEntries: DayEntry[] = []
): DayEntry[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const entries: DayEntry[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = formatDate(date);
    const existing = existingEntries.find(e => e.date === dateStr);
    const holiday = holidays.find(h => h.date === dateStr);
    const weekend = isWeekend(date);

    if (existing) {
      // Preserve existing entry, just update holiday metadata
      entries.push({
        ...existing,
        isHoliday: weekend || !!holiday,
        holidayName: holiday?.name || (weekend ? getDayName(date) : undefined),
        holidayType: holiday?.type || (weekend ? 'weekend' : undefined),
      });
    } else {
      const isOff = weekend || !!holiday;
      entries.push({
        date: dateStr,
        // Default working hours only for normal workdays
        workStart: isOff ? '' : '8:00',
        workEnd: isOff ? '' : '17:00',
        otStart: '',
        otEnd: '',
        totalHour: isOff ? '' : '9:00',
        totalOT: '0:00',
        // Activity: show holiday name, but leave blank so user can fill lembur
        activity: holiday?.name || (weekend ? getDayName(date) : ''),
        isHoliday: isOff,
        holidayName: holiday?.name || (weekend ? getDayName(date) : undefined),
        holidayType: holiday?.type || (weekend ? 'weekend' : undefined),
        workType: isOff ? '' : 'WFH',
      });
    }
  }

  return entries;
}

// Fetch from libur.deno.dev — covers public holidays + cuti bersama
export async function fetchIndonesianHolidays(year: number): Promise<Holiday[]> {
  const results: Holiday[] = [];

  try {
    // Fetch month by month for the full year because the summary API might lack metadata
    const fetches = Array.from({ length: 12 }, (_, i) =>
      fetch(`https://libur.deno.dev/api?year=${year}&month=${i + 1}`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
    );
    const allMonths = await Promise.all(fetches);

    for (const monthData of allMonths) {
      if (!Array.isArray(monthData)) continue;
      for (const item of monthData) {
        // API response fields: date, name, is_cuti_bersama
        if (!item.date) continue;
        const type: Holiday['type'] = item.is_cuti_bersama ? 'collective' : 'public';
        results.push({
          date: item.date,
          name: item.name || 'Hari Libur',
          type,
        });
      }
    }

    if (results.length > 0) return results;
  } catch { /* fall through */ }

  // Fallback: nager.date
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/ID`);
    if (res.ok) {
      const data: Array<{ date: string; localName: string; name: string }> = await res.json();
      return data.map(h => ({ date: h.date, type: 'public' as const, name: h.localName || h.name }));
    }
  } catch { /* fall through */ }

  return getFallbackHolidays(year);
}

function getFallbackHolidays(year: number): Holiday[] {
  return [
    { date: `${year}-01-01`, name: 'Tahun Baru Masehi', type: 'public' },
    { date: `${year}-03-19`, name: 'Hari Suci Nyepi (Tahun Baru Saka)', type: 'public' },
    { date: `${year}-03-20`, name: 'Cuti Bersama Idul Fitri', type: 'collective' },
    { date: `${year}-03-23`, name: 'Cuti Bersama Idul Fitri', type: 'collective' },
    { date: `${year}-03-24`, name: 'Cuti Bersama Idul Fitri', type: 'collective' },
    { date: `${year}-03-28`, name: 'Hari Raya Idul Fitri', type: 'public' },
    { date: `${year}-03-29`, name: 'Hari Raya Idul Fitri', type: 'public' },
    { date: `${year}-04-18`, name: 'Wafat Isa Al Masih', type: 'public' },
    { date: `${year}-05-01`, name: 'Hari Buruh Internasional', type: 'public' },
    { date: `${year}-05-14`, name: 'Kenaikan Isa Al Masih', type: 'public' },
    { date: `${year}-06-01`, name: 'Hari Lahir Pancasila', type: 'public' },
    { date: `${year}-08-17`, name: 'Hari Kemerdekaan RI', type: 'public' },
    { date: `${year}-12-25`, name: 'Hari Raya Natal', type: 'public' },
  ];
}

export function mergeHolidays(apiHolidays: Holiday[], manual: Holiday[]): Holiday[] {
  const map = new Map<string, Holiday>();
  for (const h of apiHolidays) map.set(h.date, h);
  for (const h of manual) map.set(h.date, h);
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export { MONTH_NAMES_ID, DAY_NAMES_ID };
