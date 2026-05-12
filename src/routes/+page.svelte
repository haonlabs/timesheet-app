<script lang="ts">
  import { onMount } from 'svelte';
  import { timesheetStore, totalWorkHours, totalOTHours, workDaysCount, themeStore, themes } from '$lib/store';
  import type { ThemeId } from '$lib/store';
  import { fetchIndonesianHolidays, generateDaysForMonth, mergeHolidays, getMonthName } from '$lib/calendar';
  import { parseTimesheetExcel } from '$lib/excelParser';
  import { exportToExcel } from '$lib/excelExporter';
  import { exportToPDF } from '$lib/pdfExport';
  import TimesheetTable from './TimesheetTable.svelte';
  import UploadZone from './UploadZone.svelte';
  import MetaForm from './MetaForm.svelte';
  import HolidayManager from './HolidayManager.svelte';
  import AssetUpload from './AssetUpload.svelte';
  import type { DayEntry, TimesheetState } from '$lib/types';

  let activeTab = $state('editor');
  let isLoading = $state(false);
  let loadingMsg = $state('');
  let toastMsg = $state('');
  let toastType = $state('ok');
  let toastVisible = $state(false);
  let showThemePicker = $state(false);
  let activeTheme = $state<ThemeId>('light');
  themeStore.subscribe(v => activeTheme = v);
  let storeState = $state<TimesheetState>({
    meta: {
      month: new Date().getMonth()+1,
      year: new Date().getFullYear(),
      employeeName: '',
      projectName: '',
      clientName: '',
      holidays: [],
      logo: '',
      signatures: {},
      totalAbsent: 0,
      totalSick: 0,
      totalLeave: 0,
      standardWorkHours: '168:00',
    },
    entries: [],
    templateParsed: false,
  });

  timesheetStore.subscribe(v => storeState = v);

  function showToast(msg: string, type = 'ok') {
    toastMsg = msg; toastType = type; toastVisible = true;
    setTimeout(() => toastVisible = false, 3500);
  }

  async function loadHolidaysAndGenerate(month: number, year: number, startDate: number, preEntries?: DayEntry[]) {
    loadingMsg = 'Fetching Indonesian holidays...';
    try {
      const apiHolidays = await fetchIndonesianHolidays(year);
      const manualHolidays = storeState.meta.holidays.filter(h => h.type === 'manual');
      const merged = mergeHolidays(apiHolidays, manualHolidays);
      timesheetStore.setHolidays(merged);
      const entries = generateDaysForMonth(month, year, merged, preEntries || storeState.entries, startDate);
      timesheetStore.setEntries(entries);
    } catch(e) { console.error(e); }
  }

  async function handleTemplateUpload(file: File) {
    isLoading = true; loadingMsg = 'Parsing template...';
    try {
      const buf = await file.arrayBuffer();
      const result = await parseTimesheetExcel(buf);
      timesheetStore.setTemplate(buf);
      if (result.meta.employeeName) timesheetStore.setMeta(result.meta);
      const m = result.meta.month || new Date().getMonth()+1;
      const y = result.meta.year || new Date().getFullYear();
      const sd = result.meta.startDate || 1;
      timesheetStore.setMeta({ month: m, year: y, startDate: sd });
      await loadHolidaysAndGenerate(m, y, sd, result.entries.length > 0 ? result.entries : undefined);
      templateUploaded = true;
      showToast('Template imported!');
    } catch(e) { showToast('Failed to parse template', 'err'); console.error(e); }
    finally { isLoading = false; }
  }

  async function onMonthYearChange(month: number, year: number, startDate: number) {
    isLoading = true; loadingMsg = 'Generating calendar...';
    try {
      timesheetStore.setMeta({ month, year, startDate });
      await loadHolidaysAndGenerate(month, year, startDate);
    } finally { isLoading = false; }
  }

  async function handleExportExcel() {
    isLoading = true; loadingMsg = 'Generating Excel...';
    try {
      const blob = await exportToExcel(storeState);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Timesheet_${storeState.meta.employeeName || 'Export'}_${getMonthName(storeState.meta.month)}_${storeState.meta.year}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
      showToast('Excel exported!');
    } catch(e) { showToast('Export failed', 'err'); }
    finally { isLoading = false; }
  }

  function handleExportPDF() {
    exportToPDF(storeState);
  }

  function clearData() {
    if (!confirm('Clear all saved data? This cannot be undone.')) return;
    timesheetStore.reset();
    themeStore.reset();
    showToast('Data cleared.');
  }

  async function startFresh() {
    const m = storeState.meta.month; const y = storeState.meta.year; const sd = storeState.meta.startDate || 1;
    isLoading = true; loadingMsg = 'Setting up...';
    try {
      timesheetStore.setMeta({ month: m, year: y, startDate: sd });
      await loadHolidaysAndGenerate(m, y, sd);
      showToast('Ready! Fill in your timesheet.');
    } finally { isLoading = false; }
  }

  onMount(async () => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    if (storeState.entries.length === 0) {
      isLoading = true; loadingMsg = 'Loading holidays...';
      try { await loadHolidaysAndGenerate(storeState.meta.month, storeState.meta.year, storeState.meta.startDate || 1); }
      finally { isLoading = false; }
    }
  });
</script>

<div class="min-h-screen" style="background:var(--c-bg);color:var(--c-text);">
  <!-- Topbar -->
  <header class="sticky top-0 z-50 border-b" style="background:var(--c-surface);border-color:var(--c-border);">
    <div class="max-w-screen-2xl mx-auto px-4 flex items-center gap-3 h-14">
      <div class="flex items-center gap-2 mr-2">
        {#if storeState.meta.logo}
          <img src={storeState.meta.logo} alt="Logo" class="h-8 object-contain" />
        {:else}
          <div class="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs"
            style="background:linear-gradient(135deg,var(--c-accent),var(--c-accent2));">TS</div>
        {/if}
        <span class="font-semibold text-sm hidden sm:block">Timesheet</span>
      </div>
      <nav class="flex gap-1 flex-1">
        {#each [['editor','📝 Editor'],['holidays','🗓 Holidays'],['assets','🖼 Assets'],['preview','👁 Preview']] as [id, label]}
          <button onclick={() => activeTab = id}
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
            style={activeTab === id ? 'background:var(--c-accent);color:white;' : 'color:var(--c-muted);'}>
            {label}
          </button>
        {/each}
      </nav>
      <div class="relative ml-2">
        <button
          onclick={() => showThemePicker = !showThemePicker}
          class="px-2 py-1.5 rounded-md text-sm transition-all flex items-center gap-1.5"
          style="color:var(--c-muted);border:1px solid var(--c-border);"
          title="Pick theme">
          <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:{themes.find(t=>t.id===activeTheme)?.accent ?? '#4f8ef7'};"></span>
          <span class="hidden sm:inline text-xs">Theme</span>
        </button>
        {#if showThemePicker}
          <div class="fixed inset-0 z-[299]" onclick={() => showThemePicker = false}></div>
          <div class="absolute right-0 top-full mt-1 z-[300] rounded-xl shadow-xl p-2 flex flex-col gap-1 min-w-[120px]"
            style="background:var(--c-surface);border:1px solid var(--c-border);">
            {#each themes as t}
              <button
                onclick={() => { themeStore.set(t.id); showThemePicker = false; }}
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-all hover:opacity-80"
                style="background:{activeTheme===t.id ? 'var(--c-surface2)' : 'transparent'};color:var(--c-text);border:1px solid {activeTheme===t.id ? 'var(--c-border)' : 'transparent'};">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:{t.accent};flex-shrink:0;"></span>
                {t.label}
                {#if activeTheme === t.id}<span style="color:var(--c-accent);margin-left:auto;">✓</span>{/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <div class="hidden lg:flex items-center gap-4 text-xs" style="color:var(--c-muted);">
        <span>Days: <b style="color:var(--c-text);">{$workDaysCount}</b></span>
        <span>Hours: <b style="color:var(--c-success);">{$totalWorkHours}</b></span>
        <span>OT: <b style="color:var(--c-warn);">{$totalOTHours}</b></span>
      </div>
      <div class="flex gap-2 ml-2">
        <button onclick={handleExportPDF}
          class="px-3 py-1.5 rounded-md text-xs font-semibold hover:opacity-90"
          style="background:var(--c-danger);color:white;">🖨 PDF</button>
        <button onclick={clearData}
          class="px-3 py-1.5 rounded-md text-xs font-semibold hover:opacity-90"
          style="background:var(--c-surface2);border:1px solid var(--c-border);color:var(--c-muted);"
          title="Clear all saved data">🗑 Clear</button>
      </div>
    </div>
  </header>

  {#if isLoading}
    <div class="fixed inset-0 z-[100] flex items-center justify-center"
      style="background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);">
      <div class="rounded-xl p-8 flex flex-col items-center gap-4"
        style="background:var(--c-surface);border:1px solid var(--c-border);">
        <div class="w-10 h-10 border-4 rounded-full animate-spin"
          style="border-color:var(--c-border);border-top-color:var(--c-accent);"></div>
        <p class="text-sm" style="color:var(--c-muted);">{loadingMsg}</p>
      </div>
    </div>
  {/if}

  {#if toastVisible}
    <div class="fixed bottom-6 right-6 z-[200] px-4 py-3 rounded-xl text-sm font-semibold shadow-xl fade-in"
      style="background:{toastType==='ok'?'var(--c-success)':'var(--c-danger)'};color:{toastType==='ok'?'#000':'#fff'};">
      {toastMsg}
    </div>
  {/if}

  <main class="max-w-screen-2xl mx-auto px-4 py-6">
    {#if activeTab === 'editor'}
      <div class="flex gap-6">
        <div class="w-80 flex-shrink-0 space-y-4">
          <MetaForm {onMonthYearChange} />
        </div>
        <div class="flex-1 min-w-0">
          <TimesheetTable />
        </div>
      </div>
    {:else if activeTab === 'holidays'}
      <HolidayManager onRefresh={() => loadHolidaysAndGenerate(storeState.meta.month, storeState.meta.year, storeState.meta.startDate || 1)} />
    {:else if activeTab === 'assets'}
      <AssetUpload />
    {:else if activeTab === 'preview'}
      <div class="rounded-xl overflow-auto" style="background:var(--c-bg);color:var(--c-text);">
        <div id="print-area" class="p-6">
          <TimesheetTable printMode={true} />
        </div>
      </div>
    {/if}
  </main>
</div>

<script context="module" lang="ts">
  // noop
</script>
