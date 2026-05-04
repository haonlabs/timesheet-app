import type { TimesheetState } from './types';
import { formatDisplayDate, getMonthName, parseDate, getDayName } from './calendar';
import {
  addHourStrings,
  formatWholePercent,
  getAttendanceDays,
  getStandardWorkDays,
  getStandardWorkHours,
  parseHoursToMinutes,
  toNonNegativeNumber,
} from './summary';

export function exportToPDF(state: TimesheetState) {
  const html = buildPrintHTML(state);
  const win = window.open('', '_blank', 'width=1400,height=900');
  if (!win) { alert('Popup diblokir browser. Izinkan popup untuk export PDF.'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 800);
}

// Helper: wrap image in a size-constrained container
function sigBox(base64: string | undefined, label: string, name: string): string {
  const img = base64
    ? `<img src="${base64}" alt="${label}"
         style="max-width:100%;max-height:52px;width:auto;height:auto;object-fit:contain;display:block;margin:0 auto;" />`
    : '<div style="height:52px;"></div>';
  return `
    <div style="text-align:center;padding:6px 8px 4px;flex:1;border-right:1px solid #ccc;">
      <div style="font-size:7pt;color:#666;margin-bottom:4px;">${label}</div>
      <div style="min-height:52px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
        ${img}
      </div>
      <div style="font-size:8pt;font-weight:600;border-top:1px solid #ccc;padding-top:3px;margin-top:3px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">
        ${name || '—'}
      </div>
    </div>`;
}

function buildPrintHTML(state: TimesheetState): string {
  const { meta, entries } = state;
  const monthName = getMonthName(meta.month);
  const lastDay = new Date(meta.year, meta.month, 0).getDate();
  const lastDateStr = formatDisplayDate(`${meta.year}-${String(meta.month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`);

  // Logo — constrained in header box
  const logoHTML = meta.logo
    ? `<img src="${meta.logo}" alt="Logo"
         style="max-width:120px;max-height:56px;width:auto;height:auto;object-fit:contain;display:block;" />`
    : `<div style="font-size:18px;font-weight:800;color:#1e3a5f;line-height:1.1;">LAMJAYA<br>
         <span style="font-size:9px;font-weight:400;letter-spacing:2px;color:#555;">G L O B A L &nbsp; S O L U S I</span>
       </div>`;

  // Total hours
  const totalMin = entries.reduce((acc, e) => {
    if (e.totalHour) {
      const [h, m] = e.totalHour.split(':').map(Number);
      return acc + (h||0)*60 + (m||0);
    }
    return acc;
  }, 0);
  const totalHStr = `${Math.floor(totalMin/60)}:${String(totalMin%60).padStart(2,'0')}`;
  const totalOTMin = entries.reduce((acc, e) => {
    if (e.totalOT && e.totalOT !== '0:00') {
      const [h, m] = e.totalOT.split(':').map(Number);
      return acc + (h||0)*60 + (m||0);
    }
    return acc;
  }, 0);
  const totalOTStr = `${Math.floor(totalOTMin/60)}:${String(totalOTMin%60).padStart(2,'0')}`;
  const standardWorkDays = getStandardWorkDays(state);
  const absentDays = toNonNegativeNumber(meta.totalAbsent);
  const sickDays = toNonNegativeNumber(meta.totalSick);
  const leaveDays = toNonNegativeNumber(meta.totalLeave);
  const attendanceDays = getAttendanceDays(state);
  const attendanceDaysPct = formatWholePercent(attendanceDays, standardWorkDays);
  const standardHours = getStandardWorkHours(meta);
  const totalAttendanceHours = addHourStrings(totalHStr, totalOTStr);
  const attendanceHoursPct = formatWholePercent(parseHoursToMinutes(totalAttendanceHours), parseHoursToMinutes(standardHours));

  // Build table rows
  const rows = entries.map(entry => {
    const isOff = entry.isHoliday;
    let bg = '#ffffff';
    let borderLeft = '';
    if (entry.holidayType === 'weekend')    { bg = '#f0f0f0'; }
    else if (entry.holidayType === 'public')     { bg = '#fff0f0'; borderLeft = 'border-left:3px solid #dc2626;'; }
    else if (entry.holidayType === 'collective') { bg = '#f5f0ff'; borderLeft = 'border-left:3px solid #7c3aed;'; }
    else if (entry.holidayType === 'manual')     { bg = '#f0fff4'; borderLeft = 'border-left:3px solid #16a34a;'; }
    else if (entry.workType === 'WFH') { bg = '#eff6ff'; }
    else if (entry.workType === 'WFO') { bg = '#f0fdf4'; }

    const labelColor = entry.holidayType === 'public' ? '#dc2626'
      : entry.holidayType === 'collective' ? '#7c3aed'
      : entry.holidayType === 'manual' ? '#16a34a'
      : '#888';

    const actHTML = (entry.activity || '').replace(/\n/g, '<br/>');
    const hasLembur = entry.workStart || entry.otStart;

    return `<tr style="background:${bg};${borderLeft}">
      <td style="padding:3px 6px;border:1px solid #ddd;font-size:8pt;white-space:nowrap;vertical-align:top;">
        ${formatDisplayDate(entry.date)}
        ${entry.holidayName
          ? `<br/><span style="font-size:7pt;color:${labelColor};">${entry.holidayName}</span>`
          : ''}
      </td>
      <td style="padding:3px 5px;border:1px solid #ddd;font-size:8pt;text-align:center;font-family:monospace;vertical-align:top;">${entry.workStart || ''}</td>
      <td style="padding:3px 5px;border:1px solid #ddd;font-size:8pt;text-align:center;font-family:monospace;vertical-align:top;">${entry.workEnd || ''}</td>
      <td style="padding:3px 5px;border:1px solid #ddd;font-size:8pt;text-align:center;font-family:monospace;vertical-align:top;">${entry.otStart || ''}</td>
      <td style="padding:3px 5px;border:1px solid #ddd;font-size:8pt;text-align:center;font-family:monospace;vertical-align:top;">${entry.otEnd || ''}</td>
      <td style="padding:3px 5px;border:1px solid #ddd;font-size:8pt;text-align:center;font-family:monospace;font-weight:600;vertical-align:top;color:${hasLembur?'#166534':'#666'};">${entry.totalHour || ''}</td>
      <td style="padding:3px 5px;border:1px solid #ddd;font-size:8pt;text-align:center;font-family:monospace;vertical-align:top;color:${totalOTMin>0?'#92400e':'#888'};">${entry.totalOT && entry.totalOT!=='0:00' ? entry.totalOT : ''}</td>
      <td style="padding:3px 8px;border:1px solid #ddd;font-size:8pt;line-height:1.5;vertical-align:top;">${actHTML}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Timesheet ${meta.employeeName} — ${monthName} ${meta.year}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Sora',Arial,sans-serif;background:white;color:#000;font-size:9pt;}
    @page{size:A4 landscape;margin:8mm 8mm;}
    @media print{
      body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
    }
    .wrap{width:100%;}
    table{border-collapse:collapse;}
    .main-table{width:100%;}
    .main-table th{background:#1e3a5f;color:white;padding:4px 5px;font-size:8pt;border:1px solid #1e3a5f;text-align:center;}
    .main-table th.left{text-align:left;padding-left:8px;}
  </style>
</head>
<body>
<div class="wrap">

  <!-- Header -->
  <table style="width:100%;border:2px solid #1e3a5f;border-collapse:collapse;margin-bottom:0;">
    <tr>
      <td style="width:130px;padding:8px 10px;border-right:1px solid #1e3a5f;text-align:center;vertical-align:middle;">
        ${logoHTML}
      </td>
      <td style="padding:0;border-right:1px solid #1e3a5f;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:50%;padding:4px 10px;border-bottom:1px solid #ddd;border-right:1px solid #ddd;vertical-align:top;">
              <div style="font-size:7pt;color:#666;">Name</div>
              <div style="font-size:9pt;font-weight:600;">${meta.employeeName || '—'}</div>
            </td>
            <td style="padding:4px 10px;border-bottom:1px solid #ddd;vertical-align:top;" colspan="2">
              <div style="font-size:7pt;color:#666;">Location</div>
              <div style="font-size:9pt;font-weight:600;">${meta.clientName || '—'}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 10px;border-right:1px solid #ddd;vertical-align:top;">
              <div style="font-size:7pt;color:#666;">Name of Project</div>
              <div style="font-size:9pt;font-weight:600;">${meta.projectName || '—'}</div>
            </td>
            <td style="padding:4px 10px;vertical-align:top;" colspan="2">
              <div style="font-size:7pt;color:#666;">Periode</div>
              <div style="font-size:9pt;font-weight:600;">1 ${monthName} ${meta.year} — ${lastDay} ${monthName} ${meta.year}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Timesheet table -->
  <table class="main-table">
    <thead>
      <tr>
        <th rowspan="2" class="left" style="width:86px;">Date</th>
        <th colspan="2" style="width:92px;">Working Hour</th>
        <th colspan="2" style="width:92px;">Over Time</th>
        <th rowspan="2" style="width:50px;">Total<br/>Hour</th>
        <th rowspan="2" style="width:48px;">Total<br/>OT</th>
        <th rowspan="2" class="left">Activity / Remark</th>
      </tr>
      <tr>
        <th style="width:46px;">Start</th>
        <th style="width:46px;">End</th>
        <th style="width:46px;">Start</th>
        <th style="width:46px;">End</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="background:#dde8f5;font-weight:700;">
        <td colspan="5" style="padding:4px 8px;border:1px solid #ccc;font-size:8pt;">Total Hours ==&gt;</td>
        <td style="padding:4px 5px;border:1px solid #ccc;font-size:8pt;text-align:center;font-family:monospace;">${totalHStr}</td>
        <td style="padding:4px 5px;border:1px solid #ccc;font-size:8pt;text-align:center;font-family:monospace;">${totalOTStr}</td>
        <td style="padding:4px 8px;border:1px solid #ccc;font-size:8pt;font-weight:400;color:#555;">Pernyataan Pegawai</td>
      </tr>
    </tbody>
  </table>

  <!-- Summary + Rating -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #ccc;border-top:none;">
    <tr>
      <td style="width:220px;padding:8px 10px;border-right:1px solid #ccc;vertical-align:top;">
        <div style="font-weight:700;font-size:8pt;color:#1e3a5f;margin-bottom:3px;">Hari Kerja :</div>
        <table style="width:100%;font-size:7.5pt;border-collapse:collapse;">
          <tr><td style="color:#444;padding:1px 0;">a. Jumlah hari kerja satu bulan</td><td style="text-align:right;font-weight:600;">${standardWorkDays}</td></tr>
          <tr><td style="color:#444;padding:1px 0;">b. Jumlah hari pegawai Ijin</td><td style="text-align:right;font-weight:600;">${absentDays}</td></tr>
          <tr><td style="color:#444;padding:1px 0;">c. Jumlah hari pegawai sakit</td><td style="text-align:right;font-weight:600;">${sickDays}</td></tr>
          <tr><td style="color:#444;padding:1px 0;">d. Jumlah hari pegawai Cuti</td><td style="text-align:right;font-weight:600;">${leaveDays}</td></tr>
          <tr><td style="color:#444;padding:1px 0;">e. Jumlah kehadiran pegawai</td><td style="text-align:right;font-weight:600;">${attendanceDays}</td></tr>
          <tr><td style="color:#444;padding:1px 0;">f. Persentase Kehadiran</td><td style="text-align:right;font-weight:600;">${attendanceDaysPct}</td></tr>
        </table>
        <div style="font-weight:700;font-size:8pt;color:#1e3a5f;margin:5px 0 3px;">Jam Kerja :</div>
        <table style="width:100%;font-size:7.5pt;border-collapse:collapse;">
          <tr><td style="color:#444;padding:1px 0;">g. Total Jam Kerja Standar</td><td style="text-align:right;font-weight:600;font-family:monospace;">${standardHours}</td></tr>
          <tr><td style="color:#444;padding:1px 0;">h. Total Kehadiran Jam Kerja</td><td style="text-align:right;font-weight:600;font-family:monospace;">${totalHStr}</td></tr>
          <tr><td style="color:#444;padding:1px 0;">i. Total Kehadiran Jam Lembur</td><td style="text-align:right;font-weight:600;font-family:monospace;">${totalOTStr}</td></tr>
          <tr><td style="color:#444;padding:1px 0;">j. Total Jam Kerja (h+i)</td><td style="text-align:right;font-weight:600;font-family:monospace;">${totalAttendanceHours}</td></tr>
          <tr><td style="color:#444;padding:1px 0;">k. Presentase Jam Kehadiran</td><td style="text-align:right;font-weight:600;">${attendanceHoursPct}</td></tr>
        </table>
      </td>
      <td style="padding:8px 10px;vertical-align:top;">
        <div style="font-size:7.5pt;color:#333;margin-bottom:6px;">
          Time report ini saya buat dengan sungguh-sungguh dan sebenarnya sesuai dengan nilai-nilai etika dan profesionalisme perusahaan.
        </div>
        <div style="font-weight:700;font-size:8pt;color:#1e3a5f;margin-bottom:4px;">Penilaian User — Performance Karyawan Bulan Ini :</div>
        <table style="width:100%;border-collapse:collapse;font-size:7.5pt;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="padding:3px 5px;border:1px solid #ccc;font-size:7pt;text-align:left;">Kualitas &amp; Kecepatan kerja</th>
              <th style="padding:3px 5px;border:1px solid #ccc;font-size:7pt;text-align:left;">Keterampilan &amp; kemampuan teknis</th>
              <th style="padding:3px 5px;border:1px solid #ccc;font-size:7pt;text-align:left;">Sikap Kerja</th>
              <th style="padding:3px 5px;border:1px solid #ccc;font-size:7pt;text-align:left;">Kedisiplinan</th>
            </tr>
          </thead>
          <tbody>
            ${['(4) Sangat Memuaskan','(3) Memuaskan','(2) Tidak Memuaskan','(1) Sangat Tidak Memuaskan'].map(r => `
            <tr>
              ${Array(4).fill(`<td style="padding:2px 5px;border:1px solid #ccc;">☐ ${r}</td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </td>
    </tr>
  </table>

  <!-- Signature section — Date | Employee | Supervisor 1 | Supervisor 2 -->
  <div style="display:flex;border:1px solid #ccc;border-top:none;">
    <!-- Date column -->
    <div style="padding:6px 10px 4px;border-right:1px solid #ccc;min-width:80px;text-align:center;">
      <div style="font-size:7pt;color:#666;margin-bottom:4px;">Date,</div>
      <div style="min-height:52px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;">
        <span style="font-size:8pt;font-weight:600;">${lastDateStr}</span>
      </div>
    </div>
    ${sigBox(meta.signatures?.employee,   'Tanda Tangan Pegawai,',        meta.employeeName   || '')}
    ${sigBox(meta.signatures?.supervisor1,'Diperiksa dan Disetujui oleh :', meta.supervisorName || '')}
    ${sigBox(meta.signatures?.supervisor2,'Diperiksa dan Disetujui oleh :', meta.supervisor2Name || '')}
  </div>

  <!-- Notes -->
  <div style="border:1px solid #ddd;border-top:none;padding:4px 10px;font-size:7pt;color:#555;">
    <span>1. Timesheet diisi setiap hari dan Jam kerja yang tertera harus real &nbsp;|&nbsp; </span>
    <span>2. User mengisi kolom penilaian dan menandatangani timesheet &nbsp;|&nbsp; </span>
    <span>3. Timesheet di email ke RO setiap bulan, maksimal 2 hari setelah tanggal akhir timesheet &nbsp;|&nbsp; </span>
    <span>4. Mohon dicek kembali kesesuaian isi timesheet, terutama untuk tanggal dan jam</span>
  </div>

</div>
</body>
</html>`;
}
