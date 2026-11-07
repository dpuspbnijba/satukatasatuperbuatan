# PANDUAN INSTALASI — KASBURUH v2.0.0
### Server di Google Apps Script (API) + Tampilan di GitHub Pages · untuk Windows

Ada **dua bagian** yang dipasang di dua tempat berbeda:

| Bagian | Berkas | Dipasang di |
|---|---|---|
| **Server (API)** | `Kode.gs` (berkas terpisah, **tidak** ada di ZIP) | script.google.com |
| **Tampilan** | isi ZIP `kasburuh-web.zip` | GitHub Pages |

Urutannya wajib: **A → B → C**. Server dipasang dulu karena URL-nya diperlukan oleh tampilan.

---

## A. Pasang server di Google Apps Script (± 10 menit)

1. Buka **https://script.google.com** → **Proyek baru**. Klik judul "Proyek tanpa judul" → beri nama **KASBURUH API**.
2. Di kiri, klik file **Code.gs** → titik tiga → **Ganti nama** → `Kode`.
   Hapus seluruh isinya (Ctrl+A → Delete), lalu tempel **seluruh isi `Kode.gs`** → tekan **Ctrl+S**.
3. Klik ikon ⚙️ **Setelan Proyek** → **Zona waktu**: `(GMT+07:00) Jakarta`.
4. Kembali ke **Editor** (ikon `< >`). Di menu fungsi (sebelah tombol ▶ Jalankan) pilih **`setupAppEnvironment`** → klik **▶ Jalankan**.
   - Muncul "Otorisasi diperlukan" → **Tinjau izin** → pilih akun Google → **Lanjutan** → **Buka KASBURUH API (tidak aman)** → **Izinkan**.
     (Peringatan ini wajar untuk skrip buatan sendiri.)
   - Buka **Log eksekusi** di bawah. Pastikan ada `✅ Setup selesai.`
   - **Catat akun awal** yang tampil (contoh `superadmin / Ab3dEf9h (Super Admin)`) — hanya ditampilkan **sekali**.
   - Jalankan **sekali saja**. Bila diulang tidak merusak data, tetapi tidak perlu.
5. Klik **Terapkan** (kanan atas) → **Deployment baru** → ikon ⚙️ di "Pilih jenis" → **Aplikasi web**:
   - Deskripsi: `KASBURUH API v2.0.0`
   - **Jalankan sebagai: Saya**
   - **Yang memiliki akses: Siapa saja** ← wajib. Bila dipilih "Siapa saja yang memiliki Akun Google", tampilan tidak bisa terhubung.
   - Klik **Terapkan** → salin **URL Aplikasi web** (berakhiran `/exec`). Simpan di Notepad.
6. Uji server: buka **jendela Incognito** (Chrome: **Ctrl+Shift+N**), lalu buka `URL_EXEC?action=info` (tempel URL lalu tambahkan `?action=info`).
   Hasil benar: teks seperti `{"success":true,"data":{"app":"KASBURUH API","version":"2.0.0",...,"siap":true}}`.
   > Jangan uji di jendela biasa bila browser login dengan **lebih dari satu akun Google**: Google akan menampilkan
   > "Maaf, saat ini tidak dapat membuka file" walaupun server sebenarnya sudah benar.

> 💡 Membuka URL `/exec` tanpa tambahan apa pun akan menampilkan halaman "KASBURUH sudah pindah alamat". Itu normal: URL ini sekarang **server**, bukan tampilan.

---

## B. Siapkan tampilan

1. Ekstrak **`kasburuh-web.zip`** (klik kanan → **Extract All…**), misalnya ke `C:\Users\NAMA\Documents\kasburuh-web`.
   Isi folder itu harus langsung:
   ```
   kasburuh-web\
   ├── index.html
   ├── README.md
   ├── PANDUAN-INSTALASI.md
   ├── css\style.css
   └── js\config.js, api.js, app.js
   ```
2. Buka **`js\config.js`** dengan **Notepad** (klik kanan → Buka dengan → Notepad).
   Ganti teks `https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT/exec` dengan **URL /exec dari langkah A5**.
   Jangan hapus tanda kutip `'…'`. Simpan (Ctrl+S).

---

## C. Upload ke GitHub & aktifkan GitHub Pages

> Folder kerja untuk semua perintah di bawah = **`kasburuh-web`** (folder yang berisi `index.html`). Bukan folder di atasnya.

1. Di **github.com** → tombol **+** (kanan atas) → **New repository**
   - Repository name: `kasburuh` (boleh lain; ini menjadi bagian alamat situs)
   - Pilih **Public**
   - **Jangan** centang "Add a README", ".gitignore", atau "license"
   - Klik **Create repository**, biarkan halamannya terbuka.
2. Buka folder `kasburuh-web` di File Explorer → klik **address bar** → ketik `powershell` → Enter.
3. Pastikan foldernya benar:
   ```powershell
   dir
   ```
   Harus terlihat `index.html`, folder `css`, dan `js`. Bila yang terlihat justru folder `kasburuh-web` lagi, jalankan `cd kasburuh-web` dulu.
4. Kirim ke GitHub (jalankan satu per satu):
   ```powershell
   git init
   git add .
   git commit -m "KASBURUH v2.0.0"
   git branch -M main
   git remote add origin https://github.com/USERNAME/kasburuh.git
   git push -u origin main
   ```
   - Ganti `USERNAME` dengan username GitHub Anda.
   - Saat `git push` meminta **Password**, tempel **Personal Access Token** (bukan sandi akun). Token dibuat di https://github.com/settings/tokens → *Generate new token (classic)* → centang **repo**.
   - Saat menempel token **layar tetap kosong**. Itu normal; tekan Enter.
   - Berhasil bila muncul `* [new branch] main -> main`.
5. Di halaman repository GitHub: **Settings** → **Pages** (menu kiri):
   - Source: **Deploy from a branch**
   - Branch: **main** · **/ (root)** → **Save**
   - Centang **Enforce HTTPS**
   - Tunggu 1–2 menit, refresh. Muncul *"Your site is live at https://USERNAME.github.io/kasburuh/"*.
6. Buka alamat itu → klik **Masuk** → login dengan akun dari langkah **A4** → ganti kata sandi bila diminta.
7. (Super Admin) **Peminjaman → TTD Digital Pengurus → "Alamat aplikasi untuk QR tanda tangan"** → **Simpan & Uji**.
   Ini mengunci alamat GitHub Pages sebagai alamat resmi QR tanda tangan.

---

## D. Memperbarui di kemudian hari

**Server (Kode.gs) berubah:** tempel isi baru → Ctrl+S → **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan**.
URL `/exec` tetap sama, jadi `js/config.js` tidak perlu diubah.

**Tampilan berubah:** salin berkas baru ke folder `kasburuh-web`, lalu di PowerShell (folder yang sama):
```powershell
git add .
git commit -m "Update tampilan"
git push
```
Tunggu 1–2 menit → buka situs → **Ctrl+Shift+R**.

---

## E. Bila sebelumnya sudah memakai KASBURUH lama (v1.9.x)

**Cara termudah: perbarui proyek Apps Script LAMA.** Data, kata sandi, dan QR lama otomatis tetap berlaku.
1. Di proyek lama: ganti seluruh isi `Kode.gs`, lalu **hapus** file `Index`, `Stylesheet`, dan `JavaScript`.
2. Jalankan **Terapkan → Kelola deployment → Edit → Versi baru**. URL `/exec` lama tetap dipakai.
3. Lanjut ke bagian **B** dengan URL tersebut. Lewati bagian A.

**Bila tetap memakai proyek Apps Script BARU di akun Google yang sama:**
- `setupAppEnvironment` otomatis memakai folder **KASBURUH_App** dan database lama, jadi data tidak hilang.
- **Sebelum** menjalankan setup, salin kunci sandi lama: di proyek **lama**, buka ⚙️ Setelan Proyek → **Properti skrip** → salin nilai **`AUTH_PEPPER`**. Di proyek **baru**, buka ⚙️ → Properti skrip → **Tambahkan properti** `AUTH_PEPPER` = nilai tadi. Dengan begitu semua sandi lama tetap berlaku.
  - Kalau lupa: jalankan fungsi **`resetSandiSuperAdmin`** (sandi baru tampil di Log). Setelah itu Super Admin mereset sandi pengguna lain di Pengaturan → Pengguna & Hak Akses.
- Isi ulang **token WhatsApp** di Pengaturan, karena token tersimpan per proyek.
- Di proyek **lama**: buka ikon ⏰ **Pemicu** → hapus semua pemicu, supaya pengingat WA tidak terkirim dua kali. **Jangan arsipkan** deployment lama bila QR pada surat yang sudah dicetak masih perlu bisa dipindai.

---

## F. Masalah umum

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| Kotak **"Alamat server belum diatur"** | `js/config.js` belum diisi | Isi `GAS_URL` (langkah B2), lalu `git add .` → `git commit -m "isi URL"` → `git push` |
| Halaman **Google Drive "Maaf, saat ini tidak dapat membuka file"** saat membuka URL /exec | Browser login dengan beberapa akun Google, URL salah salin (ada `/u/1/`, berakhiran `/dev`, atau yang disalin "ID deployment"), atau akses bukan "Siapa saja" | Buka di **Incognito** (Ctrl+Shift+N). Salin ulang lewat Kelola deployment → tombol **Salin** di bawah "URL Aplikasi web". Hapus `/u/1/` bila ada. Pastikan akses **Siapa saja** |
| **"Tidak bisa terhubung ke server Apps Script"** | Akses deployment bukan "Siapa saja", URL salah, atau internet putus | Periksa langkah A5. URL harus berakhiran `/exec` |
| **"Server membalas halaman HTML, bukan data JSON"** | `Kode.gs` v2.0.0 belum di-deploy | Simpan `Kode.gs`, lalu Kelola deployment → Edit → **Versi baru** |
| **"Fungsi server … belum tersedia"** | `Kode.gs` di server masih versi lama | Sama seperti baris di atas |
| Toast **"Versi server belum diperbarui"** | Versi `Kode.gs` dan tampilan berbeda | Perbarui bagian yang tertinggal (D) |
| GitHub Pages **404** | `index.html` tidak berada di akar repository | Buka repo di GitHub: `index.html` harus terlihat langsung. Bila terlihat folder `kasburuh-web`, push ulang dari folder yang benar |
| Tampilan **tanpa warna/gaya** | Folder `css`/`js` tidak ikut ter-upload | Selalu upload lewat `git push`, jangan lewat "Upload files" di web GitHub |
| Masih tampil versi lama | Cache browser | **Ctrl+Shift+R** atau buka di jendela Incognito |
| `remote origin already exists` | `git remote add` sudah pernah dijalankan | Lewati, langsung `git push -u origin main` |
| `Password authentication is not supported` | GitHub menolak sandi akun | Pakai **Personal Access Token** (langkah C4) |

---

## G. Keamanan

- Repository GitHub **Public** hanya berisi tampilan. Tidak ada sandi, token, ID spreadsheet, atau data di dalamnya.
- `Kode.gs` **tidak pernah** di-upload ke GitHub.
- Semua data keuangan hanya keluar setelah login, dengan token sesi. Satu akun hanya untuk satu perangkat, dan sesi keluar otomatis saat tidak dipakai.
- Dari internet hanya **34 fungsi aplikasi** yang bisa dipanggil. Fungsi setup, data contoh, pemicu, dan reset sandi hanya bisa dijalankan pemilik dari editor Apps Script.
