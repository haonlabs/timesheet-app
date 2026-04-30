<script lang="ts">
  import { timesheetStore } from '$lib/store';
  import UploadZone from './UploadZone.svelte';

  let s = $state({ meta: { logo: '', signatures: { employee: '', supervisor1: '', supervisor2: '' } } });
  timesheetStore.subscribe(v => s = v as any);

  async function toBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  async function uploadLogo(file: File) {
    timesheetStore.setLogo(await toBase64(file));
  }

  async function uploadSig(role: 'employee' | 'supervisor1' | 'supervisor2', file: File) {
    timesheetStore.setSignature(role, await toBase64(file));
  }

  const SIG_SLOTS = [
    { key: 'employee',   label: '✍️ Tanda Tangan Pegawai',        desc: 'Ditampilkan di kolom kiri tanda tangan' },
    { key: 'supervisor1', label: '🖊️ TTD Supervisor 1 (Diperiksa)', desc: 'Kolom tengah — Diperiksa Oleh' },
    { key: 'supervisor2', label: '🖊️ TTD Supervisor 2 (Disetujui)', desc: 'Kolom kanan — Disetujui Oleh' },
  ] as const;
</script>

<div class="space-y-4 fade-in">
  <!-- Logo -->
  <div class="rounded-xl p-4" style="background:var(--c-surface);border:1px solid var(--c-border);">
    <h2 class="font-semibold text-sm mb-1" style="color:var(--c-accent);">🏢 Company Logo</h2>
    <p class="text-xs mb-4" style="color:var(--c-muted);">PNG/SVG transparan recommended. Otomatis menyesuaikan ukuran kotak.</p>
    <div class="flex gap-4 items-start">
      <div class="flex-1">
        {#if s.meta.logo}
          <!-- Preview constrained -->
          <div class="rounded-lg mb-3 flex items-center justify-center overflow-hidden"
            style="background:var(--c-surface2);border:1px solid var(--c-border);width:160px;height:80px;">
            <img src={s.meta.logo} alt="Logo"
              style="max-width:152px;max-height:72px;width:auto;height:auto;object-fit:contain;display:block;" />
          </div>
          <button onclick={() => timesheetStore.setLogo('')}
            class="px-3 py-1.5 rounded-lg text-xs hover:opacity-90"
            style="background:var(--c-holiday);color:var(--c-danger);border:1px solid var(--c-holiday-border);">
            🗑 Hapus Logo
          </button>
        {:else}
          <UploadZone accept="image/*" label="Upload logo perusahaan" onUpload={uploadLogo} />
        {/if}
      </div>
      <div class="text-xs space-y-1" style="color:var(--c-muted);max-width:200px;">
        <p>• Gunakan rasio <strong style="color:var(--c-text);">lebar ≥ tinggi</strong> untuk tampilan terbaik</p>
        <p>• PNG transparan agar bersih di PDF</p>
        <p>• Logo akan otomatis di-<em>contain</em> dalam kotak</p>
      </div>
    </div>
  </div>

  <!-- Signatures grid -->
  <div class="grid grid-cols-3 gap-4">
    {#each SIG_SLOTS as slot}
      {@const sigVal = s.meta.signatures?.[slot.key] || ''}
      <div class="rounded-xl p-4" style="background:var(--c-surface);border:1px solid var(--c-border);">
        <h3 class="font-semibold text-sm mb-1" style="color:var(--c-accent);">{slot.label}</h3>
        <p class="text-xs mb-3" style="color:var(--c-muted);">{slot.desc}</p>

        {#if sigVal}
          <!-- Preview on white background, constrained -->
          <div class="rounded-lg mb-3 flex items-center justify-center overflow-hidden"
            style="background:#f8f8f8;border:1px solid var(--c-border);height:80px;">
            <img src={sigVal} alt="Signature"
              style="max-width:calc(100% - 16px);max-height:72px;width:auto;height:auto;object-fit:contain;display:block;" />
          </div>
          <button onclick={() => timesheetStore.setSignature(slot.key, '')}
            class="w-full py-1.5 rounded-lg text-xs hover:opacity-90"
            style="background:var(--c-holiday);color:var(--c-danger);border:1px solid var(--c-holiday-border);">
            🗑 Hapus
          </button>
        {:else}
          <UploadZone accept="image/png,image/jpeg,image/svg+xml"
            label="Upload tanda tangan (PNG transparan)"
            onUpload={f => uploadSig(slot.key, f)} />
        {/if}
      </div>
    {/each}
  </div>

  <div class="rounded-xl p-4" style="background:var(--c-surface);border:1px solid var(--c-border);">
    <h3 class="font-semibold text-sm mb-2" style="color:var(--c-accent);">💡 Tips Asset</h3>
    <div class="grid grid-cols-3 gap-4 text-xs" style="color:var(--c-muted);">
      <p>Tanda tangan dan logo <strong style="color:var(--c-text);">tidak akan melebihi kotak</strong> — otomatis di-resize dengan mempertahankan rasio.</p>
      <p>Untuk tanda tangan, gunakan <strong style="color:var(--c-text);">PNG transparan</strong> agar background putih di PDF terlihat bersih.</p>
      <p>Asset disimpan <strong style="color:var(--c-text);">hanya di sesi ini</strong>. Setelah export PDF/Excel, asset sudah ter-embed di dokumen.</p>
    </div>
  </div>
</div>
