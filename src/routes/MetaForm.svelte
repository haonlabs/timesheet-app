<script lang="ts">
  import { timesheetStore } from '$lib/store';
  import { MONTH_NAMES_ID } from '$lib/calendar';

  let { onMonthYearChange } = $props<{ onMonthYearChange: (m: number, y: number) => void }>();

  let s = $state({ meta: { month: new Date().getMonth()+1, year: new Date().getFullYear(), employeeName:'', projectName:'', clientName:'', supervisorName:'', supervisor2Name:'' } });
  timesheetStore.subscribe(v => s = v as any);

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i);

  function set(field: string, val: string | number) {
    timesheetStore.setMeta({ [field]: val });
  }
</script>

<div class="rounded-xl p-4 space-y-3" style="background:var(--c-surface);border:1px solid var(--c-border);">
  <h2 class="font-semibold text-sm" style="color:var(--c-accent);">📋 Timesheet Info</h2>

  <div class="grid grid-cols-2 gap-2">
    <div>
      <label class="block text-xs mb-1" style="color:var(--c-muted);">Month</label>
      <select value={s.meta.month}
        onchange={e => { set('month', +e.currentTarget.value); onMonthYearChange(+e.currentTarget.value, s.meta.year); }}
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
        onchange={e => { set('year', +e.currentTarget.value); onMonthYearChange(s.meta.month, +e.currentTarget.value); }}
        class="w-full px-2 py-1.5 rounded-lg text-xs"
        style="background:var(--c-surface2);border:1px solid var(--c-border);color:var(--c-text);">
        {#each years as y}
          <option value={y}>{y}</option>
        {/each}
      </select>
    </div>
  </div>

  {#each [
    ['employeeName',  'Employee Name',  '👤'],
    ['projectName',   'Project(s)',     '💼'],
    ['clientName',    'Client / Location','🏢'],
    ['supervisorName','Supervisor 1 (Diperiksa)', '👔'],
    ['supervisor2Name','Supervisor 2 (Disetujui)', '👔'],
  ] as [field, label, icon]}
    <div>
      <label class="block text-xs mb-1" style="color:var(--c-muted);">{icon} {label}</label>
      <input type="text" value={s.meta[field] || ''}
        oninput={e => set(field, e.currentTarget.value)}
        class="w-full px-2 py-1.5 rounded-lg text-xs"
        style="background:var(--c-surface2);border:1px solid var(--c-border);color:var(--c-text);"
        placeholder={label} />
    </div>
  {/each}
</div>
