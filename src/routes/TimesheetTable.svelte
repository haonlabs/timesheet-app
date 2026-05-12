<script lang="ts">
  import {
    attendanceDaysPercentage,
    attendanceHoursPercentage,
    standardWorkDaysCount,
    standardWorkHours,
    timesheetStore,
    totalAttendanceHours,
    totalOTHours,
    totalWorkHours,
    workDaysCount,
  } from '$lib/store';
  import { calcHours, formatDisplayDate, getDayName, parseDate } from '$lib/calendar';
  import { refactorActivity } from '$lib/aiRefactor';
  import type { DayEntry, TimesheetState } from '$lib/types';

  let { printMode = false } = $props<{ printMode?: boolean }>();

  let s = $state<TimesheetState>(buildDefault());
  timesheetStore.subscribe(v => s = v as any);

  let polishing = $state<Record<string, boolean>>({});

  function buildDefault(): TimesheetState {
    return {
      meta: {
        month:1,
        year:2026,
        employeeName:'',
        projectName:'',
        clientName:'',
        holidays:[],
        logo:'',
        signatures:{},
        supervisorName:'',
        supervisor2Name:'',
        geminiApiKey:'',
        totalAbsent: 0,
        totalSick: 0,
        totalLeave: 0,
        standardWorkHours: '168:00',
      },
      entries: [],
      templateParsed: false,
    };
  }

  async function aiPolish(date: string, text: string) {
    if (!s.meta.geminiApiKey) {
      alert('Please set your Gemini API Key in the Timesheet Info section first.');
      return;
    }
    if (!text || text.trim().length === 0) return;

    polishing[date] = true;
    try {
      const refactored = await refactorActivity(text, s.meta.geminiApiKey);
      update(date, 'activity', refactored);
    } catch (err: any) {
      alert('AI Refactor failed: ' + err.message);
    } finally {
      polishing[date] = false;
    }
  }

  function update(date: string, field: keyof DayEntry, value: string) {
    const entry = s.entries.find(e => e.date === date);
    if (!entry) return;
    const patch: Partial<DayEntry> = { [field]: value };
    if (field === 'workStart' || field === 'workEnd') {
      const start = field === 'workStart' ? value : entry.workStart || '';
      const end   = field === 'workEnd'   ? value : entry.workEnd   || '';
      patch.totalHour = (start && end) ? calcHours(start, end) : '';
    }
    if (field === 'otStart' || field === 'otEnd') {
      const start = field === 'otStart' ? value : entry.otStart || '';
      const end   = field === 'otEnd'   ? value : entry.otEnd   || '';
      patch.totalOT = (start && end) ? calcHours(start, end) : '0:00';
    }
    timesheetStore.updateEntry(date, patch);
  }

  function primeTimePicker(input: HTMLInputElement) {
    if (!input.value) input.value = '06:00';
  }

  // Holiday rows CAN be edited (lembur), just visually different
  // Weekend / holiday = still fully editable

  function rowStyle(e: DayEntry): string {
    if (e.holidayType === 'weekend')    return 'background:var(--c-weekend);';
    if (e.holidayType === 'public')     return 'background:var(--c-holiday);border-left:3px solid var(--c-danger);';
    if (e.holidayType === 'collective') return 'background:var(--c-collective);border-left:3px solid var(--c-accent2);';
    if (e.holidayType === 'manual')     return 'background:var(--c-manual);border-left:3px solid var(--c-success);';
    if (e.workType === 'WFH')           return 'background:var(--c-wfh);';
    if (e.workType === 'WFO')           return 'background:var(--c-wfo);';
    return '';
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function growAction(el: HTMLTextAreaElement) {
    autoResize(el);
    const handler = () => autoResize(el);
    el.addEventListener('input', handler);
    return { destroy() { el.removeEventListener('input', handler); } };
  }

  function labelColor(e: DayEntry): string {
    if (e.holidayType === 'public')     return 'color:var(--c-danger);';
    if (e.holidayType === 'collective') return 'color:var(--c-accent2);';
    if (e.holidayType === 'manual')     return 'color:var(--c-success);';
    return 'color:var(--c-muted);';
  }

  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
</script>

<div class="fade-in">
  <!-- Header bar -->
  <div class="rounded-t-xl p-4 flex items-start justify-between"
    style="background:var(--c-surface);border:1px solid var(--c-border);border-bottom:none;">
    <div class="flex items-start gap-4">
      {#if s.meta.logo}
        <!-- Logo: constrained, object-fit contain -->
        <div style="width:80px;height:60px;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
          <img src={s.meta.logo} alt="Logo"
            style="max-width:80px;max-height:60px;width:auto;height:auto;object-fit:contain;display:block;" />
        </div>
      {:else if !printMode}
        <div class="w-16 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
          style="background:linear-gradient(135deg,var(--c-accent),var(--c-accent2));">
          <span class="text-white font-bold text-xl">LG</span>
        </div>
      {/if}
      <div>
        <p class="text-xs" style="color:var(--c-muted);">Employee</p>
        <p class="font-semibold text-base">{s.meta.employeeName || '—'}</p>
        <p class="text-xs mt-1" style="color:var(--c-muted);">Project</p>
        <p class="text-sm">{s.meta.projectName || '—'}</p>
      </div>
    </div>
    <div class="text-right">
      <p class="text-xs" style="color:var(--c-muted);">Client / Location</p>
      <p class="font-semibold">{s.meta.clientName || '—'}</p>
      <p class="text-xs mt-1" style="color:var(--c-muted);">Period</p>
      <p class="text-sm font-medium">{months[s.meta.month - 1]} {s.meta.year}</p>
    </div>
  </div>

  <!-- Table -->
  <div class="overflow-x-auto rounded-b-xl" style="border:1px solid var(--c-border);">
    <table class="w-full text-sm border-collapse">
      <colgroup>
        <col style="width:96px;" />
        <col style="width:60px;" /><col style="width:60px;" />
        <col style="width:60px;" /><col style="width:60px;" />
        <col style="width:66px;" /><col style="width:66px;" />
        <col />
      </colgroup>
      <thead>
        <tr style="background:var(--c-surface2);">
          <th rowspan="2" class="border px-2 py-2 text-left text-xs font-semibold" style="border-color:var(--c-border);color:var(--c-muted);">Date</th>
          <th colspan="2" class="border px-2 py-2 text-center text-xs font-semibold" style="border-color:var(--c-border);color:var(--c-muted);">Working Hour</th>
          <th colspan="2" class="border px-2 py-2 text-center text-xs font-semibold" style="border-color:var(--c-border);color:var(--c-muted);">Over Time</th>
          <th rowspan="2" class="border px-2 py-2 text-center text-xs font-semibold" style="border-color:var(--c-border);color:var(--c-muted);">Total<br/>Hour</th>
          <th rowspan="2" class="border px-2 py-2 text-center text-xs font-semibold" style="border-color:var(--c-border);color:var(--c-muted);">Total<br/>OT</th>
          <th rowspan="2" class="border px-3 py-2 text-left text-xs font-semibold" style="border-color:var(--c-border);color:var(--c-muted);">Activity / Remark</th>
        </tr>
        <tr style="background:var(--c-surface2);">
          {#each ['Start','End','Start','End'] as lbl}
            <th class="border px-1 py-1 text-center text-xs" style="border-color:var(--c-border);color:var(--c-muted);">{lbl}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each s.entries as entry (entry.date)}
          <tr style="{rowStyle(entry)} transition:background 0.15s;">
            <!-- Date -->
            <td class="border px-2 py-1.5 text-xs font-mono whitespace-nowrap align-top" style="border-color:var(--c-border);">
              <div>{formatDisplayDate(entry.date)}</div>
              {#if entry.holidayName}
                <div class="text-xs font-sans mt-0.5" style="{labelColor(entry)}font-size:10px;line-height:1.2;">{entry.holidayName}</div>
              {/if}
            </td>

            <!-- Work Start -->
            <td class="border px-1 py-1 text-center align-top" style="border-color:var(--c-border);">
              {#if !printMode}
                <input type="time" value={entry.workStart || ''}
                  min="06:00"
                  onfocus={e => primeTimePicker(e.currentTarget)}
                  oninput={e => update(entry.date, 'workStart', e.currentTarget.value)}
                  class="w-full text-center text-xs bg-transparent border-0 outline-none"
                  style="color:var(--c-text);font-family:var(--font-mono);min-width:0;" />
              {:else}
                <span class="text-xs font-mono">{entry.workStart || ''}</span>
              {/if}
            </td>

            <!-- Work End -->
            <td class="border px-1 py-1 text-center align-top" style="border-color:var(--c-border);">
              {#if !printMode}
                <input type="time" value={entry.workEnd || ''}
                  min="06:00"
                  onfocus={e => primeTimePicker(e.currentTarget)}
                  oninput={e => update(entry.date, 'workEnd', e.currentTarget.value)}
                  class="w-full text-center text-xs bg-transparent border-0 outline-none"
                  style="color:var(--c-text);font-family:var(--font-mono);min-width:0;" />
              {:else}
                <span class="text-xs font-mono">{entry.workEnd || ''}</span>
              {/if}
            </td>

            <!-- OT Start -->
            <td class="border px-1 py-1 text-center align-top" style="border-color:var(--c-border);">
              {#if !printMode}
                <input type="time" value={entry.otStart || ''}
                  min="06:00"
                  onfocus={e => primeTimePicker(e.currentTarget)}
                  oninput={e => update(entry.date, 'otStart', e.currentTarget.value)}
                  class="w-full text-center text-xs bg-transparent border-0 outline-none"
                  style="color:var(--c-text);font-family:var(--font-mono);min-width:0;" />
              {:else}
                <span class="text-xs font-mono">{entry.otStart || ''}</span>
              {/if}
            </td>

            <!-- OT End -->
            <td class="border px-1 py-1 text-center align-top" style="border-color:var(--c-border);">
              {#if !printMode}
                <input type="time" value={entry.otEnd || ''}
                  min="06:00"
                  onfocus={e => primeTimePicker(e.currentTarget)}
                  oninput={e => update(entry.date, 'otEnd', e.currentTarget.value)}
                  class="w-full text-center text-xs bg-transparent border-0 outline-none"
                  style="color:var(--c-text);font-family:var(--font-mono);min-width:0;" />
              {:else}
                <span class="text-xs font-mono">{entry.otEnd || ''}</span>
              {/if}
            </td>

            <!-- Total Hour -->
            <td class="border px-1 py-1 text-center align-top" style="border-color:var(--c-border);">
              <span class="text-xs font-mono" style="color:var(--c-success);">{entry.totalHour || ''}</span>
            </td>

            <!-- Total OT -->
            <td class="border px-1 py-1 text-center align-top" style="border-color:var(--c-border);">
              <span class="text-xs font-mono"
                style="color:{entry.totalOT && entry.totalOT !== '0:00' ? 'var(--c-warn)' : 'var(--c-muted)'};">
                {entry.totalOT || '0:00'}
              </span>
            </td>

            <!-- Activity — always editable with suggestions -->
            <td class="border px-2 py-1 align-top relative group" style="border-color:var(--c-border);min-width:280px;">
              {#if !printMode}
                <div class="relative flex flex-col">
                  <textarea
                    value={entry.activity || ''}
                    oninput={e => { update(entry.date, 'activity', e.currentTarget.value); autoResize(e.currentTarget); }}
                    rows="1"
                    use:growAction
                    class="w-full text-xs bg-transparent border-0 outline-none resize-none leading-relaxed py-1 pr-14 overflow-hidden"
                    style="color:var(--c-text);font-family:var(--font-sans);"
                    placeholder={entry.isHoliday ? 'Kosong atau isi untuk lembur...' : 'Activity description...'}
                  ></textarea>
                  
                  <div class="absolute right-0 top-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {#if s.meta.geminiApiKey && entry.activity}
                      <button
                        onclick={() => aiPolish(entry.date, entry.activity || '')}
                        disabled={polishing[entry.date]}
                        class="p-1 rounded hover:bg-white/10 disabled:opacity-50"
                        title="AI Polish (Refactor)"
                      >
                        {#if polishing[entry.date]}
                          <div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {:else}
                          ✨
                        {/if}
                      </button>
                    {/if}
                    
                    {#if s.entries.some(e => e.activity && e.activity.trim().length > 0 && e.activity !== entry.activity)}
                      <div class="relative group/hist">
                        <button class="p-1 rounded hover:bg-white/10" title="Recent Activities">📋</button>
                        <div class="absolute right-full top-0 mr-2 w-64 max-h-48 overflow-y-auto z-50 rounded-lg shadow-xl hidden group-hover/hist:block"
                          style="background:var(--c-surface);border:1px solid var(--c-border);">
                          {#each [...new Set(s.entries.map(e => e.activity).filter(a => a && a.trim().length > 0 && a !== entry.activity))] as item}
                            <button
                              onclick={() => update(entry.date, 'activity', item)}
                              class="w-full text-left px-3 py-2 text-[10px] hover:bg-white/5 border-b border-white/5 last:border-0"
                              style="color:var(--c-muted);"
                            >
                              {item}
                            </button>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                </div>
              {:else}
                <div class="text-xs whitespace-pre-wrap leading-relaxed py-1"
                  style="color:{entry.isHoliday && !entry.workStart ? 'var(--c-muted)' : 'var(--c-text)'};">
                  {entry.activity || ''}
                </div>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
      <tfoot>
        <tr style="background:var(--c-surface2);">
          <td class="border px-2 py-2 text-xs font-bold" colspan="5" style="border-color:var(--c-border);">Total Hours ==&gt;</td>
          <td class="border px-2 py-2 text-center text-xs font-bold font-mono" style="border-color:var(--c-border);color:var(--c-success);">{$totalWorkHours}</td>
          <td class="border px-2 py-2 text-center text-xs font-bold font-mono" style="border-color:var(--c-border);color:var(--c-warn);">{$totalOTHours}</td>
          <td class="border px-2 py-2" style="border-color:var(--c-border);"></td>
        </tr>
      </tfoot>
    </table>
  </div>

  <datalist id="activity-suggestions">
    {#each [...new Set(s.entries.map(e => e.activity).filter(a => a && a.trim().length > 0))] as activity}
      <option value={activity}></option>
    {/each}
  </datalist>

  <!-- Summary + Signature -->
  <div class="mt-4 grid grid-cols-2 gap-4">
    <!-- Attendance summary -->
    <div class="rounded-xl p-4" style="background:var(--c-surface);border:1px solid var(--c-border);">
      <h3 class="font-semibold text-sm mb-3" style="color:var(--c-accent);">Hari Kerja</h3>
      <table class="w-full text-xs"><tbody>
        {#each [
          ['a. Jumlah hari kerja satu bulan', $standardWorkDaysCount],
          ['b. Jumlah hari pegawai Ijin', s.meta.totalAbsent ?? 0],
          ['c. Jumlah hari pegawai sakit', s.meta.totalSick ?? 0],
          ['d. Jumlah hari pegawai Cuti', s.meta.totalLeave ?? 0],
          ['e. Jumlah kehadiran pegawai', $workDaysCount],
          ['f. Persentase Kehadiran', $attendanceDaysPercentage],
        ] as [lbl, val]}
          <tr>
            <td class="py-0.5" style="color:var(--c-muted);">{lbl}</td>
            <td class="py-0.5 text-right font-mono font-semibold">{val}</td>
          </tr>
        {/each}
      </tbody></table>
      <h3 class="font-semibold text-sm mt-3 mb-2" style="color:var(--c-accent);">Jam Kerja</h3>
      <table class="w-full text-xs"><tbody>
        {#each [
          ['g. Total Jam Kerja Standar', $standardWorkHours],
          ['h. Total Kehadiran Jam Kerja', $totalWorkHours],
          ['i. Total Kehadiran Jam Lembur', $totalOTHours],
          ['j. Total Jam Kerja (h+i)', $totalAttendanceHours],
          ['k. Presentase Jam Kehadiran', $attendanceHoursPercentage],
        ] as [lbl, val]}
          <tr>
            <td class="py-0.5" style="color:var(--c-muted);">{lbl}</td>
            <td class="py-0.5 text-right font-mono font-semibold">{val}</td>
          </tr>
        {/each}
      </tbody></table>
    </div>

    <!-- Signatures — 3 kolom: Employee + Supervisor 1 + Supervisor 2 -->
    <div class="rounded-xl p-4" style="background:var(--c-surface);border:1px solid var(--c-border);">
      <h3 class="font-semibold text-sm mb-3" style="color:var(--c-accent);">Tanda Tangan</h3>
      <div class="grid grid-cols-3 gap-3">
        <!-- Employee -->
        <div class="text-center">
          <p class="text-xs mb-2" style="color:var(--c-muted);">Pegawai</p>
          <div class="h-16 rounded-lg flex items-center justify-center mb-2 overflow-hidden"
            style="background:var(--c-surface2);border:1px dashed var(--c-border);">
            {#if s.meta.signatures?.employee}
              <img src={s.meta.signatures.employee} alt="TTD"
                style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;" />
            {:else}
              <span class="text-xs" style="color:var(--c-muted);">Upload Assets</span>
            {/if}
          </div>
          <p class="text-xs font-semibold truncate">{s.meta.employeeName || '—'}</p>
        </div>
        <!-- Supervisor 1 -->
        <div class="text-center">
          <p class="text-xs mb-2" style="color:var(--c-muted);">Diperiksa Oleh</p>
          <div class="h-16 rounded-lg flex items-center justify-center mb-2 overflow-hidden"
            style="background:var(--c-surface2);border:1px dashed var(--c-border);">
            {#if s.meta.signatures?.supervisor1}
              <img src={s.meta.signatures.supervisor1} alt="TTD Spv1"
                style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;" />
            {:else}
              <span class="text-xs" style="color:var(--c-muted);">Upload Assets</span>
            {/if}
          </div>
          <p class="text-xs font-semibold truncate">{s.meta.supervisorName || '—'}</p>
        </div>
        <!-- Supervisor 2 -->
        <div class="text-center">
          <p class="text-xs mb-2" style="color:var(--c-muted);">Disetujui Oleh</p>
          <div class="h-16 rounded-lg flex items-center justify-center mb-2 overflow-hidden"
            style="background:var(--c-surface2);border:1px dashed var(--c-border);">
            {#if s.meta.signatures?.supervisor2}
              <img src={s.meta.signatures.supervisor2} alt="TTD Spv2"
                style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;" />
            {:else}
              <span class="text-xs" style="color:var(--c-muted);">Upload Assets</span>
            {/if}
          </div>
          <p class="text-xs font-semibold truncate">{s.meta.supervisor2Name || '—'}</p>
        </div>
      </div>
    </div>
  </div>
</div>
