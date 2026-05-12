<script lang="ts">
  import { timesheetStore } from '$lib/store';
  import { MONTH_NAMES_ID } from '$lib/calendar';
  import type { TimesheetMeta } from '$lib/types';

  let { onMonthYearChange } = $props<{ onMonthYearChange: (m: number, y: number, startDate: number) => void }>();

  let s = $state<{ meta: TimesheetMeta }>({
    meta: {
      month: new Date().getMonth()+1,
      year: new Date().getFullYear(),
      employeeName:'',
      projectName:'',
      clientName:'',
      holidays: [],
      supervisorName:'',
      supervisor2Name:'',
      geminiApiKey:'',
      totalAbsent: 0,
      totalSick: 0,
      totalLeave: 0,
      standardWorkHours: '168:00',
    }
  });
  timesheetStore.subscribe(v => s = v as any);

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i);
  const textFields = [
    ['employeeName',  'Employee Name',  '👤'],
    ['projectName',   'Project(s)',     '💼'],
    ['clientName',    'Client / Location','🏢'],
    ['supervisorName','Supervisor 1 (Diperiksa)', '👔'],
    ['supervisor2Name','Supervisor 2 (Disetujui)', '👔'],
    ['geminiApiKey', 'Gemini API Key (for AI Polish)', '✨'],
  ] as const;
  const dayFields = [
    ['totalAbsent', 'Ijin'],
    ['totalSick', 'Sakit'],
    ['totalLeave', 'Cuti'],
  ] as const;

  function set(field: keyof TimesheetMeta, val: string | number) {
    timesheetStore.setMeta({ [field]: val });
  }
</script>

<div class="rounded-xl p-4 space-y-3" style="background:var(--c-surface);border:1px solid var(--c-border);">
  <h2 class="font-semibold text-sm" style="color:var(--c-accent);">📋 Timesheet Info</h2>

  <div class="grid grid-cols-2 gap-2">
    <div>
      <label class="block text-xs mb-1" style="color:var(--c-muted);">Month</label>
      <select value={s.meta.month}
        onchange={e => { set('month', +e.currentTarget.value); onMonthYearChange(+e.currentTarget.value, s.meta.year, s.meta.startDate ?? 1); }}
        class="w-full px-2 py-1.5 rounded-lg text-xs"
        style="background:var(--c-surface2);border:1px solid var(--c-border);color:var(--c-text);">
        {#each MONTH_NAMES_ID as name, i}
          <option value={i+1}>{name}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="block text-xs mb-1" style="color:var(--c-muted);">Year</label>
      <select value={s.meta.year}
        onchange={e => { set('year', +e.currentTarget.value); onMonthYearChange(s.meta.month, +e.currentTarget.value, s.meta.startDate ?? 1); }}
        class="w-full px-2 py-1.5 rounded-lg text-xs"
        style="background:var(--c-surface2);border:1px solid var(--c-border);color:var(--c-text);">
        {#each years as y}
          <option value={y}>{y}</option>
        {/each}
      </select>
    </div>
  </div>

  <div>
    <label class="block text-xs mb-1" style="color:var(--c-muted);">📅 Start Date (day of month)</label>
    <input type="number" min="1" max="31" step="1" value={s.meta.startDate ?? 1}
      oninput={e => { set('startDate', +e.currentTarget.value); onMonthYearChange(s.meta.month, s.meta.year, +e.currentTarget.value); }}
      class="w-full px-2 py-1.5 rounded-lg text-xs"
      style="background:var(--c-surface2);border:1px solid var(--c-border);color:var(--c-text);"
      placeholder="1" />
    <p class="text-[10px] mt-1" style="color:var(--c-muted);">Timesheet will automatically cover the total number of days in the selected month (e.g., Feb: 4th → Mar 3rd = 28 days)</p>
  </div>

  {#each textFields as [field, label, icon]}
    <div>
      <label class="block text-xs mb-1" style="color:var(--c-muted);">{icon} {label}</label>
      <input type={field === 'geminiApiKey' ? 'password' : 'text'} value={s.meta[field] || ''}
        oninput={e => set(field, e.currentTarget.value)}
        class="w-full px-2 py-1.5 rounded-lg text-xs"
        style="background:var(--c-surface2);border:1px solid var(--c-border);color:var(--c-text);"
        placeholder={field === 'geminiApiKey' ? 'AI Studio API Key...' : label} />
    </div>
  {/each}

  <div class="pt-2 border-t" style="border-color:var(--c-border);">
    <h3 class="font-semibold text-xs mb-2" style="color:var(--c-accent);">Ringkasan Hari & Jam Kerja</h3>
    <div class="grid grid-cols-3 gap-2">
      {#each dayFields as [field, label]}
        <div>
          <label class="block text-xs mb-1" style="color:var(--c-muted);">{label}</label>
          <input type="number" min="0" step="1" value={s.meta[field] ?? 0}
            oninput={e => set(field, +e.currentTarget.value)}
            class="w-full px-2 py-1.5 rounded-lg text-xs"
            style="background:var(--c-surface2);border:1px solid var(--c-border);color:var(--c-text);"
            placeholder="0" />
        </div>
      {/each}
    </div>
    <div class="mt-2">
      <label class="block text-xs mb-1" style="color:var(--c-muted);">Total Jam Kerja Standar</label>
      <input type="text" inputmode="numeric" value={s.meta.standardWorkHours || '168:00'}
        oninput={e => set('standardWorkHours', e.currentTarget.value)}
        class="w-full px-2 py-1.5 rounded-lg text-xs font-mono"
        style="background:var(--c-surface2);border:1px solid var(--c-border);color:var(--c-text);"
        placeholder="168:00" />
    </div>
  </div>
</div>
