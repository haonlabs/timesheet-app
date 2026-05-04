import ExcelJS from 'exceljs';
import type { TimesheetState } from './types';
import { getMonthName } from './calendar';

// Column mapping from the actual Lamjaya template:
// B = Date, D = Work Start, F = Work End
// G = OT Start, I = OT End
// K = Total Hour (formula =F-D), L = Total OT (formula =I-G)
// M:X merged = Activity/Remark

function timeStrToDate(timeStr: string): Date | null {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h)) return null;
  const d = new Date(1899, 11, 30); // Excel epoch base
  d.setHours(h, m || 0, 0, 0);
  return d;
}

export async function exportToExcel(state: TimesheetState): Promise<Blob> {
  const { meta, entries, templateBuffer } = state;

  if (!templateBuffer) {
    return buildFromScratch(state);
  }

  // Load the original template buffer
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBuffer);
  const ws = wb.worksheets[0];

  // Update header meta cells (based on real template structure)
  // G4 = employee name, M4 = project name, O4 = client name
  // S5 = period start, V5 = period end
  ws.getCell('G4').value = meta.employeeName || '';
  ws.getCell('M4').value = meta.projectName || '';
  ws.getCell('O4').value = meta.clientName || '';

  const periodStart = new Date(meta.year, meta.month - 1, 1, 12, 0, 0);
  const periodEnd = new Date(meta.year, meta.month, 0, 12, 0, 0);
  ws.getCell('S5').value = periodStart;
  ws.getCell('V5').value = periodEnd;

  // Data rows start at row 11, each date occupies one row (B11..B41 for March)
  // Find the row offset: row 11 = day 1 of the month
  // We scan B column to find matching dates
  const rowMap = new Map<string, number>(); // "YYYY-MM-DD" -> row number

  ws.eachRow((row, rowNum) => {
    if (rowNum < 11 || rowNum > 60) return;
    const dateCell = row.getCell(2); // Column B
    const val = dateCell.value;
    if (val instanceof Date) {
      // Use a safe reference by resetting to noon local to avoid TZ shift
      const dSafe = new Date(val.getFullYear(), val.getMonth(), val.getDate(), 12, 0, 0);
      const y = dSafe.getFullYear();
      const m = String(dSafe.getMonth() + 1).padStart(2, '0');
      const d = String(dSafe.getDate()).padStart(2, '0');
      rowMap.set(`${y}-${m}-${d}`, rowNum);
    }
  });

  // Inject each entry into its row
  for (const entry of entries) {
    const rowNum = rowMap.get(entry.date);
    if (!rowNum) continue;

    const row = ws.getRow(rowNum);

    if (entry.isHoliday && !entry.overtimeOnHoliday) {
      // Holiday/weekend: just write the name in M column, clear times
      row.getCell(4).value = null; // D = work start
      row.getCell(6).value = null; // F = work end
      row.getCell(7).value = null; // G = OT start
      row.getCell(9).value = null; // I = OT end
      // K and L have formulas, leave them
      row.getCell(13).value = entry.activity || entry.holidayName || ''; // M = activity
    } else if (entry.workStart && entry.workEnd) {
      // Work day: set times
      const startTime = timeStrToDate(entry.workStart);
      const endTime = timeStrToDate(entry.workEnd);
      if (startTime) {
        row.getCell(4).value = startTime; // D = work start
        row.getCell(4).numFmt = 'h:mm';
      }
      if (endTime) {
        row.getCell(6).value = endTime; // F = work end
        row.getCell(6).numFmt = 'h:mm';
      }

      // OT
      if (entry.otStart) {
        const otStart = timeStrToDate(entry.otStart);
        if (otStart) { row.getCell(7).value = otStart; row.getCell(7).numFmt = 'h:mm'; }
      }
      if (entry.otEnd) {
        const otEnd = timeStrToDate(entry.otEnd);
        if (otEnd) { row.getCell(9).value = otEnd; row.getCell(9).numFmt = 'h:mm'; }
      }

      // Activity in M (col 13) — keep formula in K and L
      row.getCell(13).value = entry.activity || '';

      // Auto-calc total if no formula exists
      const kCell = row.getCell(11); // K = Total Hour
      const lCell = row.getCell(12); // L = Total OT
      const kVal = kCell.value;
      if (typeof kVal !== 'string' || !String(kVal).startsWith('=')) {
        // No formula, write computed value
        if (entry.totalHour) {
          const [h, m] = entry.totalHour.split(':').map(Number);
          kCell.value = ((h || 0) * 60 + (m || 0)) / (24 * 60);
          kCell.numFmt = '[h]:mm';
        }
      }
      const lVal = lCell.value;
      if (typeof lVal !== 'string' || !String(lVal).startsWith('=')) {
        if (entry.totalOT && entry.totalOT !== '0:00') {
          const [h, m] = entry.totalOT.split(':').map(Number);
          lCell.value = ((h || 0) * 60 + (m || 0)) / (24 * 60);
          lCell.numFmt = '[h]:mm';
        }
      }
    }

    row.commit();
  }

  // Update summary section
  // L44 = work days count
  const workDays = entries.filter(e => !e.isHoliday && e.workStart).length;
  ws.getCell('L44').value = workDays;
  // Supervisor name P62
  if (meta.supervisorName) ws.getCell('P62').value = meta.supervisorName;
  if ((meta as any).supervisor2Name) ws.getCell('T62').value = (meta as any).supervisor2Name;
  // Employee name E62
  ws.getCell('E62').value = meta.employeeName || '';
  // date C62
  ws.getCell('C62').value = new Date(meta.year, meta.month, 0, 12, 0, 0); // last day of month

  // Ensure column B (Date) is wide enough for "Day, DD-MM-YYYY"
  ws.getColumn(2).width = 22;

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

async function buildFromScratch(state: TimesheetState): Promise<Blob> {
  const { meta, entries } = state;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('TS');

  // Header
  ws.mergeCells('A1:L1');
  ws.getCell('A1').value = 'TIMESHEET';
  ws.getCell('A1').font = { bold: true, size: 16 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.getCell('A2').value = 'Nama Pegawai:';
  ws.getCell('C2').value = meta.employeeName;
  ws.getCell('A3').value = 'Proyek:';
  ws.getCell('C3').value = meta.projectName;
  ws.getCell('A4').value = 'Klien:';
  ws.getCell('C4').value = meta.clientName;
  ws.getCell('A5').value = 'Periode:';
  ws.getCell('C5').value = `${getMonthName(meta.month)} ${meta.year}`;

  const headerRow = ws.getRow(7);
  ['Tanggal', 'Mulai', 'Selesai', 'OT Mulai', 'OT Selesai', 'Total Jam', 'Total OT', 'Aktivitas / Keterangan'].forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  entries.forEach((entry, idx) => {
    const row = ws.getRow(8 + idx);
    const isHoliday = entry.isHoliday;

    const [y, m, d] = entry.date.split('-').map(Number);
    row.getCell(1).value = new Date(y, m - 1, d, 12, 0, 0);
    row.getCell(1).numFmt = 'dddd, dd-mm-yyyy';

    if (!isHoliday && entry.workStart) {
      const s = timeStrToDate(entry.workStart);
      const e = timeStrToDate(entry.workEnd || '');
      if (s) { row.getCell(2).value = s; row.getCell(2).numFmt = 'h:mm'; }
      if (e) { row.getCell(3).value = e; row.getCell(3).numFmt = 'h:mm'; }
    }
    if (!isHoliday && entry.otStart) {
      const os = timeStrToDate(entry.otStart);
      const oe = timeStrToDate(entry.otEnd || '');
      if (os) { row.getCell(4).value = os; row.getCell(4).numFmt = 'h:mm'; }
      if (oe) { row.getCell(5).value = oe; row.getCell(5).numFmt = 'h:mm'; }
    }
    if (entry.totalHour && !isHoliday) {
      const [h, m] = entry.totalHour.split(':').map(Number);
      row.getCell(6).value = ((h || 0) * 60 + (m || 0)) / (24 * 60);
      row.getCell(6).numFmt = '[h]:mm';
    }
    const otVal = entry.totalOT || '0:00';
    const [oh, om] = otVal.split(':').map(Number);
    row.getCell(7).value = ((oh || 0) * 60 + (om || 0)) / (24 * 60);
    row.getCell(7).numFmt = '[h]:mm';
    row.getCell(8).value = entry.activity || '';
    row.getCell(8).alignment = { wrapText: true };

    if (isHoliday) {
      for (let c = 1; c <= 8; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEEEE' } };
      }
    }

    for (let c = 1; c <= 8; c++) {
      row.getCell(c).border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    }

    row.commit();
  });

  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 8;
  ws.getColumn(5).width = 8;
  ws.getColumn(6).width = 10;
  ws.getColumn(7).width = 10;
  ws.getColumn(8).width = 60;

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}
