import ExcelJS from 'exceljs';
import type { TimesheetMeta, DayEntry } from './types';
import { formatDate, getDayName, isWeekend } from './calendar';

export interface ParseResult {
  meta: Partial<TimesheetMeta>;
  entries: DayEntry[];
  templateBuffer: ArrayBuffer;
}

// Real Lamjaya template column layout:
// B(2)=Date, D(4)=WorkStart, F(6)=WorkEnd
// G(7)=OTStart, I(9)=OTEnd
// K(11)=TotalHour, L(12)=TotalOT, M(13)=Activity
// Header: G4=EmployeeName, M4=Project, O4=Client, S5=PeriodStart, V5=PeriodEnd

export async function parseTimesheetExcel(buffer: ArrayBuffer): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];

  let employeeName = '';
  let projectName = '';
  let clientName = '';
  let month = new Date().getMonth() + 1;
  let year = new Date().getFullYear();
  const entries: DayEntry[] = [];

  // Read meta from header cells
  try {
    employeeName = String(ws.getCell('G4').value || '').trim();
    projectName = String(ws.getCell('M4').value || '').trim();
    clientName = String(ws.getCell('O4').value || '').trim();

    const periodStart = ws.getCell('S5').value;
    if (periodStart instanceof Date) {
      month = periodStart.getMonth() + 1;
      year = periodStart.getFullYear();
    }
  } catch { /* ignore */ }

  // Scan rows for date entries (rows 11 onwards, col B)
  ws.eachRow((row, rowNum) => {
    if (rowNum < 11 || rowNum > 60) return;

    const dateCell = row.getCell(2); // B
    const dateVal = dateCell.value;
    if (!(dateVal instanceof Date)) return;

    const date = dateVal as Date;
    const dateStr = formatDate(date);
    const weekend = isWeekend(date);

    const workStartVal = row.getCell(4).value; // D
    const workEndVal = row.getCell(6).value;   // F
    const otStartVal = row.getCell(7).value;   // G
    const otEndVal = row.getCell(9).value;     // I
    const activityVal = row.getCell(13).value; // M

    const workStart = toTimeStr(workStartVal);
    const workEnd = toTimeStr(workEndVal);
    const otStart = toTimeStr(otStartVal);
    const otEnd = toTimeStr(otEndVal);
    const activity = String(activityVal || '').trim();

    // Detect holiday from activity text
    const isHoliday = weekend
      || activity === 'Sabtu' || activity === 'Minggu'
      || activity.startsWith('Libur')
      || activity.startsWith('Cuti Bersama');

    let holidayType: DayEntry['holidayType'] = undefined;
    if (activity === 'Sabtu' || activity === 'Minggu' || weekend) holidayType = 'weekend';
    else if (activity.startsWith('Libur')) holidayType = 'public';
    else if (activity.startsWith('Cuti Bersama')) holidayType = 'collective';

    entries.push({
      date: dateStr,
      workStart: isHoliday ? '' : workStart,
      workEnd: isHoliday ? '' : workEnd,
      otStart: isHoliday ? '' : otStart,
      otEnd: isHoliday ? '' : otEnd,
      totalHour: isHoliday ? '' : computeHours(workStart, workEnd),
      totalOT: isHoliday ? '' : (otStart && otEnd ? computeHours(otStart, otEnd) : '0:00'),
      activity,
      isHoliday,
      holidayName: isHoliday ? activity || getDayName(date) : undefined,
      holidayType: holidayType || (weekend ? 'weekend' : undefined),
      workType: activity.startsWith('WFH') ? 'WFH' : activity.startsWith('WFO') ? 'WFO' : '',
    });

    if (month === new Date().getMonth() + 1) {
      month = date.getMonth() + 1;
      year = date.getFullYear();
    }
  });

  return { meta: { employeeName, projectName, clientName, month, year }, entries, templateBuffer: buffer };
}

function toTimeStr(val: ExcelJS.CellValue): string {
  if (!val) return '';
  if (val instanceof Date) {
    const h = val.getHours();
    const m = val.getMinutes();
    return `${h}:${String(m).padStart(2, '0')}`;
  }
  if (typeof val === 'number') {
    const totalMin = Math.round(val * 24 * 60);
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  if (/^\d+:\d+/.test(s)) return s;
  return '';
}

function computeHours(start: string, end: string): string {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return '';
  return `${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, '0')}`;
}
