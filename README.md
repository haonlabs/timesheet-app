# 🗓️ Timesheet App

Aplikasi web untuk membuat, mengisi, dan mengekspor timesheet bulanan karyawan. Mendukung export PDF siap cetak, backup/pindah data antar browser, manajemen hari libur Indonesia, dan AI polish aktivitas kerja via Google Gemini.

---

## ✨ Fitur Utama

- **Export PDF** — Hasilkan timesheet siap cetak format A4 landscape dengan logo dan tanda tangan
- **Backup Export/Import** — Simpan semua data ke file `.json` dan muat di browser lain
- **Hari Libur Otomatis** — Fetch hari libur nasional & cuti bersama Indonesia dari API publik
- **AI Polish** — Perbaiki deskripsi aktivitas otomatis menggunakan Google Gemini API
- **Multi Tema** — Pilih dari 5 tema tampilan: Dark, Light, Ocean, Forest, Rose
- **Persistent State** — Data tersimpan otomatis di `localStorage`, tidak hilang saat refresh atau ganti bulan
- **Upload Aset** — Upload logo perusahaan dan tanda tangan (employee, supervisor 1 & 2)

---

## 🚀 Mulai Cepat

### Prasyarat

- Node.js ≥ 18
- npm / pnpm / yarn

### Instalasi

```bash
# Clone repository
git clone <repo-url>
cd timesheet-app

# Install dependencies
npm install

# Jalankan dev server
npm run dev
```

Buka browser di `http://localhost:5173`.

### Build Produksi

```bash
npm run build
npm run preview
```

---

## 📖 Panduan Penggunaan

### 1. Isi Informasi Timesheet

Di sidebar kiri tab **Info**, isi:

| Field               | Keterangan                                          |
| ------------------- | --------------------------------------------------- |
| Month / Year        | Bulan dan tahun periode timesheet                   |
| Start Date          | Tanggal awal periode (default: 1)                   |
| Employee Name       | Nama karyawan                                       |
| Project(s)          | Nama proyek yang dikerjakan                         |
| Client / Location   | Nama klien atau lokasi penempatan                   |
| Supervisor 1 & 2    | Nama penandatangan (Diperiksa & Disetujui)          |
| Gemini API Key      | API key untuk fitur AI Polish (opsional)            |
| Jam Kerja Standar   | Total jam kerja standar sebulan (default: `168:00`) |

### 2. Isi Tabel Timesheet

Tabel di tengah menampilkan semua hari dalam bulan yang dipilih. Untuk setiap hari kerja:

- Isi **jam mulai** dan **jam selesai** kerja
- Isi **jam lembur** (OT) jika ada
- Isi **deskripsi aktivitas**
- Tandai **Ijin**, **Sakit**, atau **Cuti** lewat pilihan di bawah tanggal (ringkasan dihitung otomatis; pilih **—** untuk kembali hadir)
- Klik **⏱ Terapkan jam ke semua hari kerja** untuk menyalin jam dari hari kerja pertama yang terisi
- Klik **⤵** di kolom aktivitas untuk menyalin aktivitas hari kerja sebelumnya
- Gunakan tombol **✨** untuk AI Polish deskripsi (butuh Gemini API Key)
- Centang **OT on Holiday** jika ada lembur di hari libur

Hari weekend dan libur nasional ditandai otomatis dengan warna berbeda dan tidak bisa diisi jam kerja biasa.

### 3. Kelola Hari Libur

Tab **Libur** di sidebar kiri:

- Klik **Refresh from API** untuk mengambil data hari libur Indonesia terbaru
- Tambah hari libur manual dengan mengisi tanggal, nama, dan tipe
- Hapus hari libur manual yang tidak diperlukan

### 4. Upload Logo & Tanda Tangan

Tab **Aset** di sidebar kiri:

- Upload **logo perusahaan** (PNG/SVG transparan direkomendasikan)
- Upload **tanda tangan** untuk 3 kolom: Pegawai, Supervisor 1, Supervisor 2
- Gambar otomatis diperkecil (maks 600px) agar muat di penyimpanan browser

### 5. Export

| Tombol          | Fungsi                                       |
| --------------- | -------------------------------------------- |
| 📄 Export PDF   | Buka popup cetak browser, simpan sebagai PDF |
| ⬇ Export        | Download backup `.json` semua data (tanpa Gemini API key) |
| ⬆ Import        | Muat backup `.json`, misalnya di browser lain |

---

## 🏗️ Struktur Proyek

```
src/
├── lib/
│   ├── aiRefactor.ts      # Integrasi Google Gemini API
│   ├── calendar.ts        # Kalender, hari libur, utilitas tanggal
│   ├── pdfExport.ts       # Generate HTML untuk export PDF
│   ├── store.ts           # State management (Svelte store + localStorage)
│   ├── summary.ts         # Kalkulasi ringkasan jam & hari kerja
│   └── types.ts           # TypeScript interface & type definitions
└── routes/
    ├── +layout.svelte     # Layout utama
    ├── +page.svelte       # Halaman utama
    ├── AssetUpload.svelte # Upload logo & tanda tangan
    ├── HolidayManager.svelte  # Manajemen hari libur
    ├── MetaForm.svelte    # Form metadata timesheet
    ├── TimesheetTable.svelte  # Tabel input timesheet
    └── UploadZone.svelte  # Komponen drag-and-drop
```

---

## 🔧 Teknologi

| Teknologi                                             | Versi     | Kegunaan                         |
| ----------------------------------------------------- | --------- | -------------------------------- |
| [SvelteKit](https://kit.svelte.dev)                   | ^2.57.0   | Framework aplikasi               |
| [Svelte](https://svelte.dev)                          | ^5.55.2   | Komponen UI reaktif (Runes mode) |
| [TypeScript](https://www.typescriptlang.org)          | ^6.0.2    | Type safety                      |
| [Vite](https://vitejs.dev)                            | ^8.0.7    | Build tool                       |
| [TailwindCSS](https://tailwindcss.com)                | ^4.2.4    | Styling                          |
| [Google Gemini API](https://aistudio.google.com)      | 3.8 Flash | AI refactoring teks              |

---

## 🌴 API Hari Libur Indonesia

Aplikasi menggunakan 3 sumber data dengan fallback otomatis:

1. **[indonesia-holiday-api.onrender.com](https://indonesia-holiday-api.onrender.com)** — Sumber utama (libur nasional + cuti bersama)
2. **[libur.deno.dev](https://libur.deno.dev)** — Fallback pertama (libur nasional + cuti bersama)
3. **[date.nager.at](https://date.nager.at)** — Fallback kedua (libur nasional saja)
4. **Data statis hardcoded** — Fallback terakhir jika semua API tidak tersedia

---

## 🤖 Fitur AI (Google Gemini)

Fitur AI Polish memperbaiki deskripsi aktivitas kerja agar lebih profesional dalam bahasa Indonesia.

**Cara setup:**

1. Buka [Google AI Studio](https://aistudio.google.com)
2. Buat API key gratis
3. Masukkan key di field **Gemini API Key** di tab Info
4. Klik tombol **✨** pada baris aktivitas yang ingin diperbaiki

> API key tersimpan di `localStorage`, dikirim lewat header langsung dari browser ke Gemini API, dan tidak ikut dalam file backup.

---

## 🎨 Tema

Klik ikon tema di header untuk memilih tampilan:

| Tema   | Background | Aksen                |
| ------ | ---------- | -------------------- |
| Light  | `#F4F6FB`  | Biru `#2563EB`       |
| Dark   | `#0F1117`  | Biru `#4F8EF7`       |
| Ocean  | `#0A1628`  | Cyan `#38BDF8`       |
| Forest | `#0B1A0E`  | Hijau `#4ADE80`      |
| Rose   | `#1A0D12`  | Merah muda `#FB7185` |

---

## 📄 Lisensi

Proyek ini bersifat privat (`"private": true` di `package.json`).
