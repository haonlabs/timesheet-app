<script lang="ts">
  import { timesheetStore } from '$lib/store';
  import { fetchIndonesianHolidays, generateDaysForMonth, mergeHolidays, formatDisplayDate } from '$lib/calendar';
  import type { Holiday } from '$lib/types';

  let { onRefresh } = $props<{ onRefresh: () => void }>();

  let storeState = $state({ meta: { month: 1, year: 2026, holidays: [] as Holiday[] }, entries: [] });
  timesheetStore.subscribe(v => storeState = v);

  let newDate = $state('');
  let newName = $state('');
  let newType = $state<Holiday['type']>('manual');
  let loading = $state(false);

  async function refetchHolidays() {
    loading = true;
    try {
      const apiHolidays = await fetchIndonesianHolidays(storeState.meta.year);
      const manual = storeState.meta.holidays.filter(h => h.type === 'manual');
      const merged = mergeHolidays(apiHolidays, manual);
      timesheetStore.setHolidays(merged);
      onRefresh();
    } finally {
      loading = false;
    }
  }

  function addManual() {
    if (!newDate || !newName) return;
    const existing = storeState.meta.holidays.filter(h => h.date !== newDate);
    timesheetStore.setHolidays([...existing, { date: newDate, name: newName, type: newType }]);
    onRefresh();
    newDate = ''; newName = '';
  }

  function removeHoliday(date: string) {
    timesheetStore.setHolidays(storeState.meta.holidays.filter(h => h.date !== date));
    onRefresh();
  }

  const typeColors: Record<string, string> = {
    public: 'var(--c-danger)',
    collective: 'var(--c-accent2)',
    manual: 'var(--c-success)',
    weekend: 'var(--c-muted)',
  };

  const typeLabels: Record<string, string> = {
    public: 'Public Holiday',
    collective: 'Cuti Bersama',
    manual: 'Manual',
    weekend: 'Weekend',
  };

  const monthHolidays = $derived(
    storeState.meta.holidays
      .filter(h => {
        const d = new Date(h.date);
        return d.getMonth() + 1 === storeState.meta.month && d.getFullYear() === storeState.meta.year;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  );

  const allHolidays = $derived(
    storeState.meta.holidays
      .filter(h => h.type !== 'weekend')
      .sort((a, b) => a.date.localeCompare(b.date))
  );
</script>

<div class="grid grid-cols-[360px,1fr] gap-6 fade-in">
  <!-- Left: Add manual holiday -->
  <div class="space-y-4">
    <div class="rounded-xl p-4" style="background:var(--c-surface);border:1px solid var(--c-border);">
      <h2 class="font-semibold text-sm mb-3" style="color:var(--c-accent);">🗓 Holiday Manager</h2>
      <p class="text-xs mb-4" style="color:var(--c-muted);">
        Holidays are automatically fetched from the Indonesia Holiday API.
        You can add manual overrides below.
      </p>

      <button onclick={refetchHolidays} disabled={loading}
        class="w-full py-2 rounded-lg text-sm font-medium mb-4 flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
        style="background:var(--c-accent);color:white;">
        {#if loading}
          <div class="w-4 h-4 border-2 rounded-full animate-spin" style="border-color:rgba(255,255,255,0.3);border-top-color:white;"></div>
        {/if}
        🔄 Refresh from API ({storeState.meta.year})
      </button>

      <h3 class="font-medium text-xs mb-2" style="color:var(--c-muted);">Add Manual Holiday</h3>
      <div class="space-y-2">
        <div>
          <label class="block text-xs mb-1" style="color:var(--c-muted);">Date</label>
          <input type="date" bind:value={newDate}
            class="w-full px-2 py-1.5 rounded-lg text-xs"
            style="background:var(--c-surface2);border:1px solid var(--c-border);color:var(--c-text);" />
        </div>
        <div>
          <label class="block text-xs mb-1" style="color:var(--c-muted);">Name</label>
          <input type="text" bind:value={newName} placeholder="e.g. Company Annual Day"
            class="w-full px-2 py-1.5 rounded-lg text-xs"
            style="background:var(--c-surface2);border:1px solid var(--c-border);color:var(--c-text);" />
        </div>
        <div>
          <label class="block text-xs mb-1" style="color:var(--c-muted);">Type</label>
          <select bind:value={newType}
            class="w-full px-2 py-1.5 rounded-lg text-xs"
            style="background:var(--c-surface2);border:1px solid var(--c-border);color:var(--c-text);">
            <option value="manual">Manual</option>
            <option value="public">Public Holiday</option>
            <option value="collective">Cuti Bersama</option>
          </select>
        </div>
        <button onclick={addManual}
          class="w-full py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
          style="background:var(--c-success);color:#000;">
          + Add Holiday
        </button>
      </div>
    </div>

    <!-- Legend -->
    <div class="rounded-xl p-4" style="background:var(--c-surface);border:1px solid var(--c-border);">
      <h3 class="font-semibold text-sm mb-3" style="color:var(--c-accent);">Legend</h3>
      <div class="space-y-2">
        {#each Object.entries(typeColors).filter(([k]) => k !== 'weekend') as [type, color]}
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:{color};"></div>
            <span class="text-xs">{typeLabels[type]}</span>
          </div>
        {/each}
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded flex-shrink-0" style="background:var(--c-weekend);border:1px solid var(--c-border);"></div>
          <span class="text-xs">Weekend (Sabtu/Minggu)</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Right: Holiday list -->
  <div>
    <div class="rounded-xl overflow-hidden" style="background:var(--c-surface);border:1px solid var(--c-border);">
      <div class="px-4 py-3 border-b flex items-center justify-between" style="border-color:var(--c-border);">
        <h2 class="font-semibold text-sm" style="color:var(--c-accent);">
          All Holidays ({allHolidays.length})
        </h2>
        <span class="text-xs" style="color:var(--c-muted);">Year {storeState.meta.year}</span>
      </div>
      <div class="divide-y" style="border-color:var(--c-border);">
        {#if allHolidays.length === 0}
          <div class="p-8 text-center text-sm" style="color:var(--c-muted);">
            No holidays loaded. Click "Refresh from API" to fetch.
          </div>
        {/if}
        {#each allHolidays as h (h.date)}
          <div class="px-4 py-2.5 flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div class="w-2 h-2 rounded-full flex-shrink-0" style="background:{typeColors[h.type]};"></div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono" style="color:var(--c-muted);">{h.date}</span>
                <span class="text-xs px-1.5 py-0.5 rounded"
                  style="background:{typeColors[h.type]}22;color:{typeColors[h.type]};">
                  {typeLabels[h.type]}
                </span>
              </div>
              <p class="text-sm font-medium mt-0.5">{h.name}</p>
            </div>
            {#if h.type === 'manual'}
              <button onclick={() => removeHoliday(h.date)}
                class="text-xs px-2 py-1 rounded transition-all hover:opacity-90"
                style="background:var(--c-holiday);color:var(--c-danger);">
                Remove
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
