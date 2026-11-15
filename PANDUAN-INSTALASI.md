# PANDUAN INSTALASI — DPU SP JBA v2.2.0
### Server di Google Apps Script (API) + Tampilan di GitHub Pages · untuk Windows

Ada **dua bagian** yang dipasang di dua tempat berbeda:

| Bagian | Berkas | Dipasang di |
|---|---|---|
| **Server (API)** | `Kode.gs` (berkas terpisah, **tidak** ada di ZIP) | script.google.com |
| **Tampilan** | isi ZIP `dpuspjba-web.zip` | GitHub Pages |

**Sudah memakai v2.1.0?** Langsung ke bagian **0**. Masih v2.0.0? Kerjakan bagian **0** lalu **0B**. Pemasangan baru: bagian **A → B → C**, lalu **0B**.

---

## 0. Memperbarui ke v2.2.0 (± 5 menit)

### Yang baru di v2.2.0
1. **Halaman Ucapan → Template & Kartu dirapikan.**
   - Semua kartu kini sama ukurannya, dan tombol aktif/nonaktif tidak lagi keluar dari kotaknya.
   - **Semua kartu diunggah otomatis** ke Google Drive saat Super Admin membuka halaman ini (ada progresnya). Kartu yang siap bertanda **"Kartu siap dikirim"**, dan ucapan WhatsApp langsung melampirkan kartunya.
   - Teks kartu baru: di bawah logo tertulis sub judul **"DPU SP JBA"**, lalu **"Mengucapkan"**. Di bagian bawah tertulis **"Keluarga Besar"** + **"DPU SP JBA"**.
   - Kedua teks itu bisa diubah Super Admin di kotak **"Teks pada semua kartu"**. Setelah disimpan, semua kartu otomatis dibuat ulang dan diunggah ulang.
2. **Spin Wheel: pengumuman pemenang seirama musik.**
   - Setelah roda berhenti, musik tegang (denyut bass, genderang menggulung, dengung yang makin tinggi) mengiringi pengumuman.
   - Bila pemenang lebih dari satu, nama **muncul satu per satu**. Setiap nama keluar tepat pada hentakan musik, dengan nada yang naik dari nama ke nama, dan ditutup fanfare di nama terakhir.
   - Sebelum muncul, kotak nama bergetar dan nama-nama peserta berganti cepat mengikuti irama genderang.
   - Tombol **Tampilkan Semua** membuka semua nama sekaligus. Daftar pemenang di samping baru terisi setelah semua nama diumumkan.
   - Semua nada dibuat langsung oleh aplikasi; tidak perlu berkas musik atau internet tambahan.
3. **Tema tampilan.** Super Admin bisa memilih satu dari 12 tema di **Pengaturan → Identitas → Tema Tampilan**:
   Ungu Klasik, Biru Samudra, Hijau Zamrud, Merah Juang, Senja Jingga, Hitam Emas, Pastel Lavender, Teal Modern, Malam Neon, Monokrom, Batik Nusantara, dan Aurora.
   - Tema mengubah menu samping, latar, dan warna aplikasi untuk **semua pengguna**, di mode terang maupun gelap.

### Langkah 1 — Server (Apps Script)
1. Buka proyek Apps Script yang URL-nya ada di `js/config.js`. Cek di **Terapkan → Kelola deployment**.
2. Buka **Kode.gs** → **Ctrl+A** → **Delete** → tempel **seluruh isi `Kode.gs` v2.2.0** → **Ctrl+S**.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru** → Deskripsi `DPU SP JBA API v2.2.0` → **Terapkan**. URL `/exec` tetap sama.

### Langkah 2 — Tampilan (GitHub Pages)
1. Ekstrak `dpuspjba-web.zip`. **Salin semua isinya** ke folder tampilan Anda (folder yang berisi `index.html`), lalu pilih **Ganti file di tujuan**.
2. Buka PowerShell di folder itu dan jalankan satu per satu:
   ```powershell
   git add .
   git commit -m "DPU SP JBA v2.2.0"
   git push
   ```
3. Tunggu 1–2 menit → buka situs → **Ctrl+Shift+R**.

### Langkah 3 — Setelah pembaruan (Super Admin)
1. Buka **Ucapan & Hari Besar → Template & Kartu**. Biarkan halaman terbuka ± 1 menit sampai muncul **"Semua 15 kartu siap dikirim"**.
2. (Opsional) Ubah teks kartu di kotak **"Teks pada semua kartu"** → **Simpan & Perbarui Kartu**.
3. (Opsional) Pilih tema di **Pengaturan → Identitas → Tema Tampilan** → **Simpan Perubahan Identitas**.

> 💡 Kartu harus memakai **logo yang diunggah sebagai file** (Pengaturan → Identitas → Unggah Logo). Logo berupa tautan dari situs lain tidak bisa digambar ke kartu.
>
> 💡 Agar kartu ikut terkirim, **Lampirkan kartu ucapan** di Ucapan → Pengaturan harus dicentang, dan paket Fonnte harus mendukung lampiran gambar. Bila belum mendukung, ucapan tetap terkirim sebagai teks.

---

## 0B. Mengaktifkan ucapan WhatsApp otomatis (Super Admin)
1. Bila memperbarui dari v2.0.0: jalankan sekali fungsi **`setupAppEnvironment`** di editor Apps Script. Langkah ini aman (data tidak berubah); fungsinya menyiapkan tab baru, folder `Kartu_Ucapan`, dan daftar hari besar.
2. **Pengaturan → Notifikasi**: pilih mode WhatsApp **Gateway** dan isi **token Fonnte**. Token disimpan aman di server dan tidak tampil di layar.
3. Buka **Ucapan & Hari Besar → Pengaturan**:
   - Centang **Kirim ucapan otomatis**.
   - Pilih jam kirim (mis. 07.00 WIB), ukuran batch, dan jeda.
   - Klik **Simpan**.
4. Buka tab **Template & Kartu**, lalu tunggu sampai semua kartu siap. Klik kartu untuk mengubah teks, warna, atau tema, lalu klik **Simpan**. Gunakan **Kirim Tes** untuk mencoba ke nomor Anda sendiri.
5. Buka tab **Penerima** → **Validasi Nomor WA** untuk menandai nomor yang tidak terdaftar di WhatsApp. Nomor yang tidak terdaftar akan dilewati.
6. Lengkapi data anggota lama. Filter **"Data belum lengkap"** di tab Penerima menunjukkan anggota yang belum punya tanggal lahir, agama, atau No. HP.

> 📅 **Tanggal hari besar 2028** (Idul Fitri, Idul Adha, Nyepi, Waisak, dll.) baru bisa diisi setelah SKB 3 Menteri 2028 terbit. Aplikasi akan menampilkan peringatan. Tambahkan lewat tab **Hari Besar → Tambah Hari Besar**.

---

## A. Pasang server di Google Apps Script (± 10 menit) — pemasangan baru

1. Buka **https://script.google.com** → **Proyek baru**. Klik judul "Proyek tanpa judul" → beri nama **DPU SP JBA API**.
2. Di kiri, klik file **Code.gs** → titik tiga → **Ganti nama** → `Kode`.
   Hapus seluruh isinya (Ctrl+A → Delete), lalu tempel **seluruh isi `Kode.gs`** → tekan **Ctrl+S**.
3. Klik ikon ⚙️ **Setelan Proyek** → **Zona waktu**: `(GMT+07:00) Jakarta`.
4. Kembali ke **Editor** (ikon `< >`). Di menu fungsi (sebelah tombol ▶ Jalankan) pilih **`setupAppEnvironment`** → klik **▶ Jalankan**.
   - Bila muncul "Otorisasi diperlukan": klik **Tinjau izin** → pilih akun Google → **Lanjutan** → **Buka DPU SP JBA API (tidak aman)** → **Izinkan**.
     (Peringatan ini wajar untuk skrip buatan sendiri.)
   - Buka **Log eksekusi** di bawah. Pastikan ada `✅ Setup selesai.`
   - **Catat akun awal** yang tampil (contoh `superadmin / Ab3dEf9h (Super Admin)`). Akun ini hanya ditampilkan **sekali**.
5. Klik **Terapkan** (kanan atas) → **Deployment baru** → ikon ⚙️ di "Pilih jenis" → **Aplikasi web**:
   - Deskripsi: `DPU SP JBA API v2.2.0`
   - **Jalankan sebagai: Saya**
   - **Yang memiliki akses: Siapa saja** ← wajib. Bila dipilih "Siapa saja yang memiliki Akun Google", tampilan tidak bisa terhubung.
   - Klik **Terapkan** → salin **URL Aplikasi web** (berakhiran `/exec`). Simpan di Notepad.
6. Uji server: buka **jendela Incognito** (Chrome: **Ctrl+Shift+N**). Tempel URL tadi, tambahkan `?action=info` di belakangnya, lalu buka.
   Hasil yang benar berupa teks seperti `{"success":true,"data":{"app":"DPU SP JBA API","version":"2.2.0",...,"siap":true}}`.
   > Jangan uji di jendela biasa bila browser login dengan **lebih dari satu akun Google**. Google akan menampilkan
   > "Maaf, saat ini tidak dapat membuka file" walaupun server sebenarnya sudah benar.

> 💡 Membuka URL `/exec` tanpa tambahan apa pun menampilkan halaman "sudah pindah alamat". Itu normal, karena URL ini sekarang adalah **server**, bukan tampilan.

---

## B. Siapkan tampilan

1. Ekstrak **`dpuspjba-web.zip`** (klik kanan → **Extract All…**), misalnya ke `C:\Users\NAMA\Documents\dpuspjba-web`.
   Isi folder itu harus langsung seperti ini:
   ```
   dpuspjba-web\
   ├── index.html
   ├── README.md
   ├── PANDUAN-INSTALASI.md
   ├── css\style.css
   └── js\config.js, api.js, app.js
   ```
2. Buka **`js\config.js`** dengan **Notepad** (klik kanan → Buka dengan → Notepad).
   Pastikan `GAS_URL` berisi **URL /exec dari langkah A5**. Jangan hapus tanda kutip `'…'`. Simpan (Ctrl+S).

---

## C. Upload ke GitHub & aktifkan GitHub Pages

> Semua perintah di bawah dijalankan di **`dpuspjba-web`**, yaitu folder yang berisi `index.html`. Bukan folder di atasnya.

1. Di **github.com** → tombol **+** (kanan atas) → **New repository**:
   - Repository name: bebas, misalnya `dpuspjba`. Nama ini menjadi bagian alamat situs.
   - Pilih **Public**.
   - **Jangan** centang "Add a README", ".gitignore", atau "license".
   - Klik **Create repository**, lalu biarkan halamannya terbuka.
2. Buka folder `dpuspjba-web` di File Explorer → klik **address bar** → ketik `powershell` → Enter.
3. Pastikan foldernya benar dengan perintah `dir`. Harus terlihat `index.html`, folder `css`, dan folder `js`.
4. Kirim ke GitHub (jalankan satu per satu):
   ```powershell
   git init
   git add .
   git commit -m "DPU SP JBA v2.2.0"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO.git
   git push -u origin main
   ```
   - Ganti `USERNAME` dan `REPO` dengan milik Anda.
   - Saat `git push` meminta **Password**, tempel **Personal Access Token**, bukan sandi akun. Buat token di https://github.com/settings/tokens → *Generate new token (classic)* → centang **repo**.
   - Saat token ditempel, **layar tetap kosong**. Itu normal; tekan Enter.
   - Push berhasil bila muncul `* [new branch] main -> main`.
5. Di halaman repository GitHub, buka **Settings** → **Pages** (menu kiri):
   - Source: **Deploy from a branch**
   - Branch: **main** · **/ (root)** → **Save**
   - Centang **Enforce HTTPS**
   - Tunggu 1–2 menit, lalu refresh sampai muncul *"Your site is live at https://USERNAME.github.io/REPO/"*.
6. Buka alamat itu → klik **Masuk** → login dengan akun dari langkah **A4** → ganti kata sandi bila diminta.
7. (Super Admin) Buka **Peminjaman → TTD Digital Pengurus → "Alamat aplikasi untuk QR tanda tangan"** → **Simpan & Uji**.

---

## D. Memperbarui di kemudian hari

**Bila server (Kode.gs) berubah:** tempel isi baru → Ctrl+S → **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan**.

**Bila tampilan berubah:** salin berkas baru ke folder tampilan, lalu jalankan `git add .` → `git commit -m "Update tampilan"` → `git push`. Setelah itu, buka situs dan tekan **Ctrl+Shift+R**.

---

## E. Bila sebelumnya sudah memakai versi lama (v1.9.x, satu proyek Apps Script)

**Cara termudah: perbarui proyek Apps Script LAMA.** Data, kata sandi, dan QR lama otomatis tetap berlaku.
1. Di proyek lama, ganti seluruh isi `Kode.gs`. Lalu **hapus** file `Index`, `Stylesheet`, dan `JavaScript`.
2. Jalankan **Terapkan → Kelola deployment → Edit → Versi baru**. URL `/exec` lama tetap dipakai.
3. Lanjutkan ke bagian **B** dengan URL tersebut. Bagian A dilewati.

**Bila tetap memakai proyek Apps Script BARU di akun Google yang sama:**
- `setupAppEnvironment` otomatis menemukan folder aplikasi dan database lama, jadi data tidak hilang. Nama keduanya juga langsung diganti ke nama baru.
- **Sebelum** menjalankan setup, salin nilai **`AUTH_PEPPER`** dari ⚙️ Setelan Proyek → **Properti skrip** di proyek lama. Tambahkan properti yang sama di proyek baru, supaya semua sandi lama tetap berlaku.
  - Kalau lupa: jalankan fungsi **`resetSandiSuperAdmin`** (sandi baru tampil di Log).
- Isi ulang **token WhatsApp** di Pengaturan, karena token tersimpan per proyek.
- Di proyek **lama**: buka ikon ⏰ **Pemicu** → hapus semua pemicu, supaya pesan WA tidak terkirim dua kali.

---

## F. Masalah umum

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| Kotak **"Alamat server belum diatur"** | `js/config.js` belum diisi | Isi `GAS_URL` (langkah B2), lalu `git add .` → `git commit -m "isi URL"` → `git push` |
| Halaman Google Drive **"Maaf, saat ini tidak dapat membuka file"** saat membuka URL /exec | Browser login dengan beberapa akun Google, URL salah salin, atau akses bukan "Siapa saja" | Buka di **Incognito** (Ctrl+Shift+N). Salin ulang lewat Kelola deployment → **Salin**. Pastikan akses **Siapa saja** |
| **"Tidak bisa terhubung ke server Apps Script"** | Akses deployment bukan "Siapa saja", URL salah, atau internet putus | Periksa langkah A5. URL harus berakhiran `/exec` |
| **"Fungsi server … belum tersedia"** atau toast **"Versi server belum diperbarui"** | `Kode.gs` di server masih versi lama | Simpan `Kode.gs` v2.2.0, lalu Kelola deployment → Edit → **Versi baru** |
| Menu **Ucapan & Hari Besar** tidak muncul | Peran Anda tidak punya akses | Super Admin mengatur akses di Pengaturan → Pengguna & Hak Akses |
| Tombol **Kirim otomatis** tidak bisa dicentang | WhatsApp belum mode Gateway | Pengaturan → Notifikasi → mode **Gateway** + token Fonnte |
| Riwayat **"Terkirim tanpa kartu"** | Paket Fonnte belum mendukung lampiran gambar | Normal: ucapan teks tetap terkirim. Tingkatkan paket Fonnte bila ingin kartu ikut terkirim |
| Riwayat **"Gagal"** | Nomor salah, tidak terdaftar di WA, atau gateway sedang putus | Periksa nomor anggota → pilih baris di Riwayat Kirim → **Kirim Ulang** |
| GitHub Pages **404** | `index.html` tidak berada di akar repository | Di GitHub, `index.html` harus terlihat langsung. Bila terlihat di dalam sebuah folder, push ulang dari folder yang benar |
| Masih tampil versi lama | Cache browser | **Ctrl+Shift+R** atau buka di jendela Incognito |
| `Password authentication is not supported` | GitHub menolak sandi akun | Pakai **Personal Access Token** (langkah C4) |

---

## G. Keamanan

- Repository GitHub **Public** hanya berisi tampilan. Tidak ada sandi, token, ID spreadsheet, atau data di dalamnya.
- `Kode.gs` **tidak pernah** di-upload ke GitHub. Token Fonnte disimpan di *Script Properties* dan tidak pernah dikirim ke tampilan.
- Semua data hanya bisa dibuka setelah login dengan token sesi.
- Dari internet hanya **42 fungsi aplikasi** yang bisa dipanggil. Fungsi setup, data contoh, pemicu terjadwal (ucapan harian dan antrean WA), serta reset sandi hanya bisa dijalankan pemilik dari editor Apps Script.
