<script lang="ts">
  let { accept = '*', label = 'Drop file here', onUpload } = $props<{
    accept?: string;
    label?: string;
    onUpload: (file: File) => void;
  }>();

  let isDragOver = $state(false);
  let inputEl: HTMLInputElement;

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) onUpload(file);
  }

  function handleFileInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) onUpload(file);
  }
</script>

<div
  role="button"
  tabindex="0"
  ondragover={e => { e.preventDefault(); isDragOver = true; }}
  ondragleave={() => isDragOver = false}
  ondrop={handleDrop}
  onclick={() => inputEl.click()}
  onkeydown={e => e.key === 'Enter' && inputEl.click()}
  class="w-full rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-all text-center"
  style="
    border: 2px dashed {isDragOver ? 'var(--c-accent)' : 'var(--c-border)'};
    background: {isDragOver ? 'rgba(79,142,247,0.08)' : 'var(--c-surface2)'};
  "
>
  <div class="text-3xl">📄</div>
  <p class="text-sm" style="color:var(--c-muted);">{label}</p>
  <p class="text-xs" style="color:var(--c-border);">Click or drag & drop</p>
  <input
    bind:this={inputEl}
    type="file"
    {accept}
    class="hidden"
    onchange={handleFileInput}
  />
</div>
