# DPU SP JBA v2.3.1 — Tampilan (GitHub Pages)

Aplikasi keuangan, inventaris, anggota, ucapan WhatsApp, dan kegiatan serikat pekerja **DPU SP JBA**.
Repository ini **hanya berisi tampilan** (HTML/CSS/JS statis). Data dan logika ada di **Google Apps Script** (`Kode.gs`), yang disimpan **terpisah** di script.google.com, bukan di sini.

```
index.html        halaman aplikasi
css/style.css     tampilan
js/config.js      ⚙️ URL server Apps Script (GAS_URL) — satu-satunya file yang perlu diedit
js/api.js         penghubung ke server (fetch, Content-Type text/plain)
js/app.js         seluruh fitur aplikasi
```

## Cara kerja
- Browser membuka `https://USERNAME.github.io/REPO/`, lalu tampilan dimuat dari GitHub Pages.
- Setiap aksi (login, simpan, laporan, dan lainnya) dikirim lewat `fetch()` ke URL `/exec` Apps Script, lalu dijawab dalam format JSON.
- Tidak ada rahasia di repository ini. Semua data tetap di Google Sheets dan hanya bisa diakses setelah login.

## Memperbarui tampilan
1. Ubah file di folder ini.
2. Naikkan angka `?v=2.3.1` di `index.html` (mis. `?v=2.3.2`) agar browser tidak memakai versi lama.
3. Jalankan:
   ```
   git add .
   git commit -m "Deskripsi perubahan"
   git push
   ```
4. Tunggu 1–2 menit, buka situs, lalu tekan **Ctrl+Shift+R**.

Panduan lengkap ada di **PANDUAN-INSTALASI.md**.
