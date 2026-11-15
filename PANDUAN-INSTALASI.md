# PANDUAN INSTALASI — DPU SP JBA v2.1.0
### Server di Google Apps Script (API) + Tampilan di GitHub Pages · untuk Windows

Ada **dua bagian** yang dipasang di dua tempat berbeda:

| Bagian | Berkas | Dipasang di |
|---|---|---|
| **Server (API)** | `Kode.gs` (berkas terpisah, **tidak** ada di ZIP) | script.google.com |
| **Tampilan** | isi ZIP `dpuspjba-web.zip` | GitHub Pages |

**Sudah memakai v2.0.0?** Langsung ke bagian **0** di bawah. Pemasangan baru: bagian **A → B → C**.

---

## 0. Memperbarui v2.0.0 → v2.1.0 (± 10 menit)

### Yang baru di v2.1.0
1. **Nama aplikasi menjadi DPU SP JBA.** Nama di Pengaturan, teks halaman depan, folder Google Drive (`DPU_SP_JBA_App`), dan database (`DB_DPU_SP_JBA`) **diganti otomatis** saat aplikasi pertama dibuka setelah pembaruan.
2. **Halaman baru "Ucapan & Hari Besar"** (menu *Organisasi*):
   - Mengirim ucapan **ulang tahun** dan **hari besar** Islam, Kristen, Katolik, Hindu, dan Buddha ke WhatsApp anggota secara otomatis sesuai tanggalnya.
   - Penerima diambil dari daftar di halaman **Anggota**, berdasarkan tanggal lahir dan agama masing-masing.
   - Ada **15 template pesan** dan **kartu ucapan** (11 tema, ukuran 1080×1350). Super Admin bisa mengubah teks, warna, tema, dan isi pesan.
   - Ada **jadwal 60 hari ke depan**, **daftar hari besar 2026–2028** (sumber: SKB 3 Menteri), pengaturan **penerima** (berhenti berlangganan dan cek nomor WA), serta **riwayat kirim** dengan tombol *Kirim Ulang* dan *Batalkan*.
   - Pesan dikirim **bertahap** (10/20/50 pesan per menit) dengan **jeda acak** antar pesan, supaya nomor WhatsApp tidak diblokir.
3. **Tambah Anggota** kini mewajibkan **Jabatan, Unit, No. HP/WhatsApp, Tanggal Lahir, dan Agama**. Format Excel impor anggota ikut berubah. Unduh format baru di *Anggota → Impor → Unduh Format Excel*.
4. **Gathering → tab "Pembagian Kamar"**:
   - Kapasitas setiap kamar bisa diatur sendiri.
   - Peserta bisa dibagi **otomatis**, atau dimasukkan dan dipindahkan secara **seret & lepas**.
   - Hasilnya bisa diunduh sebagai **Excel** atau **PDF** yang siap cetak.
   - Bisa **impor massal** dari Excel. Format contohnya ada di tombol *Impor → Unduh Format Excel*.

### Langkah 1 — Perbarui server (Apps Script)
1. Buka proyek Apps Script Anda. (Opsional) Klik judul proyek di kiri atas → ganti menjadi **DPU SP JBA API**.
2. Buka file **Kode.gs** → **Ctrl+A** → **Delete** → tempel **seluruh isi `Kode.gs` v2.1.0** → **Ctrl+S**.
3. Di menu fungsi (sebelah ▶ Jalankan) pilih **`setupAppEnvironment`** → **▶ Jalankan**. Bila muncul *Otorisasi diperlukan*, klik **Izinkan** seperti saat pemasangan pertama.
   Langkah ini **aman**: data tidak berubah. Langkah ini hanya menyiapkan tab baru, folder `Kartu_Ucapan`, daftar hari besar, dan nama baru.
4. **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru** → Deskripsi `DPU SP JBA API v2.1.0` → **Terapkan**.
   URL `/exec` **tetap sama**, jadi `js/config.js` tidak perlu diubah.

### Langkah 2 — Perbarui tampilan (GitHub Pages)
1. (Disarankan) Ganti nama folder tampilan di komputer Anda menjadi **`dpuspjba-web`**: klik kanan folder → **Ganti nama**. Ini aman: riwayat git ikut pindah bersama folder.
2. Ekstrak `dpuspjba-web.zip`. **Salin semua isinya** ke folder tampilan Anda (folder yang berisi `index.html`). Pilih **Ganti file di tujuan** bila ditanya.
   `js/config.js` di ZIP sudah berisi URL server Anda.
3. Buka folder itu di File Explorer → klik **address bar** → ketik `powershell` → Enter. Jalankan satu per satu:
   ```powershell
   git add .
   git commit -m "DPU SP JBA v2.1.0"
   git push
   ```
4. Tunggu 1–2 menit → buka situs → tekan **Ctrl+Shift+R**.

### Langkah 3 — Aktifkan ucapan WhatsApp otomatis (Super Admin)
1. **Pengaturan → Notifikasi**: pilih mode WhatsApp **Gateway** dan isi **token Fonnte**. Token disimpan aman di server dan tidak tampil di layar.
2. Buka **Ucapan & Hari Besar → Pengaturan**:
   - Centang **Kirim ucapan otomatis**.
   - Pilih jam kirim (mis. 07.00 WIB), ukuran batch, dan jeda.
   - Klik **Simpan**.
3. Buka tab **Template & Kartu** → klik setiap kartu → sesuaikan → **Simpan**. Kartu otomatis diunggah ke Google Drive (`DPU_SP_JBA_App › Kartu_Ucapan`).
   Gunakan **Kirim Tes** untuk mencoba ke nomor Anda sendiri.
4. Buka tab **Penerima** → **Validasi Nomor WA** untuk menandai nomor yang tidak terdaftar di WhatsApp. Nomor yang tidak terdaftar akan dilewati.
5. Lengkapi data anggota lama: filter **"Data belum lengkap"** di tab Penerima menunjukkan anggota yang belum punya tanggal lahir, agama, atau No. HP.

> 💡 **Kartu bergambar** memerlukan paket Fonnte yang mendukung lampiran. Bila paket Anda belum mendukung, aplikasi otomatis mengirim **teks saja**, dan riwayat mencatat "Terkirim tanpa kartu".
>
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
   - Deskripsi: `DPU SP JBA API v2.1.0`
   - **Jalankan sebagai: Saya**
   - **Yang memiliki akses: Siapa saja** ← wajib. Bila dipilih "Siapa saja yang memiliki Akun Google", tampilan tidak bisa terhubung.
   - Klik **Terapkan** → salin **URL Aplikasi web** (berakhiran `/exec`). Simpan di Notepad.
6. Uji server: buka **jendela Incognito** (Chrome: **Ctrl+Shift+N**). Tempel URL tadi, tambahkan `?action=info` di belakangnya, lalu buka.
   Hasil yang benar berupa teks seperti `{"success":true,"data":{"app":"DPU SP JBA API","version":"2.1.0",...,"siap":true}}`.
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
   git commit -m "DPU SP JBA v2.1.0"
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
| **"Fungsi server … belum tersedia"** atau toast **"Versi server belum diperbarui"** | `Kode.gs` di server masih versi lama | Simpan `Kode.gs` v2.1.0, lalu Kelola deployment → Edit → **Versi baru** |
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
