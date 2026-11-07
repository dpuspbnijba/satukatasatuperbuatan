'use strict';
/* ============================================================
   KASBURUH v2.0.0 — Frontend (js/app.js) · di-host di GitHub Pages
   Prinsip: SPA murni (tanpa ?page=) · data di memori · navigasi 0 ms
   · optimistic UI + antrean sinkron · snapshot localStorage
   Server = Google Apps Script REST API (lihat js/api.js & js/config.js), tanpa iframe / google.script.run
   ============================================================ */

// ════════════════ KONFIGURASI ════════════════
const NAV = [
  { group: 'Keuangan' },
  { id: 'ringkasan', icon: 'bi-grid-1x2', label: 'Ringkasan' },
  { id: 'transaksi', icon: 'bi-arrow-left-right', label: 'Transaksi' },
  { id: 'dompet', icon: 'bi-wallet2', label: 'Dompet' },
  { id: 'kategori', icon: 'bi-tags', label: 'Kategori' },
  { id: 'anggaran', icon: 'bi-pie-chart', label: 'Anggaran' },
  { id: 'tabungan', icon: 'bi-piggy-bank', label: 'Tabungan' },
  { id: 'tagihan', icon: 'bi-receipt', label: 'Tagihan', badge: () => dueBills().length },
  { group: 'Organisasi' },
  { id: 'inventaris', icon: 'bi-box-seam', label: 'Inventaris' },
  { id: 'peminjaman', icon: 'bi-clipboard2-check', label: 'Peminjaman', badge: () => (isApprover() ? S.db.Peminjaman.filter((l) => l.status === 'Menunggu').length : 0) },
  { id: 'anggota', icon: 'bi-people', label: 'Anggota' },
  { id: 'laporan', icon: 'bi-file-earmark-bar-graph', label: 'Laporan' },
  { group: 'Kegiatan' },
  { id: 'gathering', icon: 'bi-balloon-heart', label: 'Gathering', badge: () => dueGathering().length },
  { id: 'undian', icon: 'bi-gift', label: 'Spin Wheel' },
  { group: 'Sistem' },
  { id: 'pengaturan', icon: 'bi-gear', label: 'Pengaturan' }
];
const isSuper = () => !!(S.user && S.user.isSuper);
const isMember = () => !!(S.user && S.user.isMember);
const isKetua = () => !!(S.user && S.user.peran === 'Ketua');
/** Data & Cadangan: Super Admin dan Ketua. */
const isDataAdmin = () => isSuper() || isKetua();
/** Hak akses per halaman dari server: 0 tidak ada · 1 lihat · 2 kelola. Super Admin selalu penuh. */
const can = (pg, lvl) => !!S.user && (S.user.isSuper || ((S.user.perms || {})[pg] || 0) >= (lvl || 1));
const canNav = (id) => id === 'pengaturan' || can(id, 1);
const navLink = (id, html) => (canNav(id) ? html : '');
const ENTITIES = ['Dompet', 'Transaksi', 'Kategori', 'Anggaran', 'Tabungan', 'Tagihan', 'Inventaris', 'Anggota', 'Gathering', 'UndianPeserta', 'UndianHadiah', 'UndianPemenang', 'Peminjaman'];
const DIRTY_BY_ENTITY = {
  Transaksi: ['ringkasan', 'transaksi', 'dompet', 'kategori', 'anggaran', 'tabungan', 'laporan'],
  Dompet: ['ringkasan', 'transaksi', 'dompet', 'tabungan', 'laporan'],
  Kategori: ['ringkasan', 'transaksi', 'kategori', 'anggaran', 'tagihan', 'inventaris', 'laporan'],
  Anggaran: ['ringkasan', 'anggaran'],
  Tabungan: ['ringkasan', 'tabungan'],
  Tagihan: ['ringkasan', 'tagihan'],
  Inventaris: ['inventaris', 'laporan', 'peminjaman'],
  Anggota: ['anggota'],
  Gathering: ['gathering'],
  UndianPeserta: ['undian'], UndianHadiah: ['undian'], UndianPemenang: ['undian'],
  Peminjaman: ['peminjaman', 'inventaris']
};
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const PALETTE = ['#6247EA', '#2F6FED', '#F59E0B', '#12A150', '#EC4899', '#0EA5E9', '#8B5CF6', '#64748B'];
const ICONS = ['bi-people', 'bi-buildings', 'bi-heart', 'bi-bank', 'bi-flag', 'bi-briefcase', 'bi-trophy', 'bi-printer', 'bi-hand-thumbs-up',
  'bi-people-fill', 'bi-cash-coin', 'bi-truck', 'bi-cup-hot', 'bi-megaphone', 'bi-heart-pulse', 'bi-dribbble', 'bi-pc-display',
  'bi-lightning-charge', 'bi-house', 'bi-mortarboard', 'bi-gift', 'bi-plus-circle', 'bi-three-dots', 'bi-flag-fill'];
/** Pustaka dimuat belakangan (tidak menghambat buka aplikasi). Urutan = CDN cadangan. */
const LIBS = {
  chart: ['https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js', 'https://unpkg.com/chart.js@4.4.1/dist/chart.umd.js', 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'],
  xlsx: ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'],
  jspdf: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'],
  autotable: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js', 'https://unpkg.com/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js', 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js']
};

// ════════════════ STATE (memori) ════════════════
const S = {
  token: null, user: null, settings: {}, meta: {}, users: [],
  db: { Dompet: [], Transaksi: [], Kategori: [], Anggaran: [], Tabungan: [], Tagihan: [], Inventaris: [], Anggota: [], Gathering: [], UndianPeserta: [], UndianHadiah: [], UndianPemenang: [], Peminjaman: [] },
  range: null, current: null, dirty: new Set(), charts: {},
  ui: {
    dr: {}, permRole: 'Anggota', userQ: '', userRole: '',
    trx: { q: '', dompet: '', kat: '', jenis: '', page: 1, size: 10 },
    inv: { q: '', kat: '', kondisi: '', tahun: '', view: 'grid' },
    agt: { q: '', status: '', page: 1 },
    tag: { tab: 'semua', q: '', cal: null },
    gat: { tab: 'semua', q: '', acara: '', sel: {} },
    pjm: { tab: 'semua', view: 'surat', q: '', page: 1 },
    und: { hadiah: '', n: 1, exclude: true, title: null, q: '', present: false },
    katTab: 'Keluar', angPeriod: null, setTab: 'identitas', lapTab: 'keuangan', lapYear: null
  },
  hideBal: false, lastSync: 0, queue: Promise.resolve(), pending: 0, idMap: {}, portal: null, portalPeriod: null
};

// ════════════════ UTILITAS ════════════════
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = (v) => String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
const fmtNum = (n) => Math.round(num(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fmtRp = (n, opt) => {
  opt = opt || {};
  if (S.hideBal && opt.mask) return 'Rp ••••••••';
  const v = Math.round(num(n));
  const sign = opt.sign ? (v > 0 ? '+' : v < 0 ? '-' : '') : (v < 0 ? '-' : '');
  return sign + 'Rp ' + fmtNum(Math.abs(v));
};
const fmtShort = (n) => {
  const v = Math.abs(num(n)), s = num(n) < 0 ? '-' : '';
  if (v >= 1e9) return s + (v / 1e9).toFixed(1).replace('.', ',') + ' M';
  if (v >= 1e6) return s + (v / 1e6).toFixed(v >= 1e7 ? 1 : 2).replace('.', ',') + ' Jt';
  if (v >= 1e3) return s + Math.round(v / 1e3) + ' Rb';
  return s + Math.round(v);
};
const pct = (a, b) => (b ? (a / b) * 100 : 0);
const fmtPct = (p, d) => (isFinite(p) ? p : 0).toFixed(d === undefined ? 1 : d).replace('.', ',') + '%';
const pad = (n) => String(n).padStart(2, '0');
const toYmd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayStr = () => toYmd(new Date());
const parseYmd = (s) => { const p = String(s).slice(0, 10).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2] || 1); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return toYmd(d); };
const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
const ym = (s) => String(s || '').slice(0, 7);
const monthStart = (y, m) => y + '-' + pad(m) + '-01';
const monthEnd = (y, m) => toYmd(new Date(y, m, 0));
const fmtDate = (s, style) => {
  if (!s) return '-';
  const str = String(s);
  if (/^\d{4}-\d{2}$/.test(str)) return BLN[Number(str.slice(5)) - 1] + ' ' + str.slice(0, 4);
  const d = parseYmd(str);
  if (isNaN(d)) return str;
  if (style === 'long') return d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();
  return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear();
};
const fmtTime = (s) => (String(s).length > 10 ? String(s).slice(11, 16) : '');
const ymLabel = (s) => BULAN[Number(s.slice(5, 7)) - 1] + ' ' + s.slice(0, 4);
const initials = (n) => String(n || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms || 200); }; };
const tmpId = () => 'tmp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = (o) => JSON.parse(JSON.stringify(o));
const parseMoney = (s) => num(String(s || '').replace(/[^\d-]/g, ''));
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* kuota penuh / mode privat */ } };
const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
const ssSet = (k, v) => { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) { } };
const waLink = (phone, text) => 'https://wa.me/' + (phone ? String(phone).replace(/\D/g, '').replace(/^0/, '62') : '') + '?text=' + encodeURIComponent(text || '');
// ── Jam server (WIB) ──
const CLOCK = { off: 0, tz: 'Asia/Jakarta', t: null, lastMin: -1 };
function syncClock(serverNow, tz) { if (serverNow) CLOCK.off = Number(serverNow) - Date.now(); if (tz) CLOCK.tz = tz; if (!CLOCK.t) { tickClock(); CLOCK.t = setInterval(tickClock, 1000); } }
const srvNow = () => new Date(Date.now() + CLOCK.off);
function srvParts() {
  const d = srvNow();
  try {
    const date = new Intl.DateTimeFormat('id-ID', { timeZone: CLOCK.tz, weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: CLOCK.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(d);
    return { date, time, hour: Number(time.slice(0, 2)) % 24, min: Number(time.slice(3, 5)) };
  } catch (e) { return { date: d.toLocaleDateString('id-ID'), time: d.toTimeString().slice(0, 8), hour: d.getHours(), min: d.getMinutes() }; }
}
function tickClock() {
  const p = srvParts(), tzl = { 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' }[CLOCK.tz] || '';
  const el = (id) => document.getElementById(id);
  if (el('srv-date')) { el('srv-date').textContent = p.date; el('srv-time').textContent = p.time; el('srv-tz').textContent = tzl || 'Server'; }
  if (el('sb-clock')) el('sb-clock').textContent = p.date + ' · ' + p.time.slice(0, 5) + ' ' + tzl;
  if (p.min !== CLOCK.lastMin) { CLOCK.lastMin = p.min; updateGreeting(); }
}
const greetingWord = () => { const h = srvParts().hour; return h < 11 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 19 ? 'Selamat Sore' : 'Selamat Malam'; };

// ════════════════ API (fetch ke Apps Script → Promise) ════════════════
const CLIENT_VERSION = '2.0.0';   // harus sama dengan APP_VERSION di Kode.gs
const PERF = { calls: [] };
/** Pesan jelas bila fungsi server belum ada (Kode.gs di Apps Script masih versi lama / belum "Versi baru"). */
function serverFnMissing(fn) {
  return new Error('Fungsi server "' + fn + '" belum tersedia. Kode.gs di Apps Script masih versi lama: ganti seluruh isi Kode.gs dengan versi ' + CLIENT_VERSION + ', simpan, lalu Terapkan → Kelola deployment → Edit → Versi baru.');
}
/** Belum ada URL server di js/config.js. */
function serverNotConfigured() {
  return new Error('Alamat server belum diatur. Isi GAS_URL di file js/config.js dengan URL /exec dari Apps Script, lalu upload ulang ke GitHub.');
}
/**
 * Panggil fungsi server: api('login', npp, sandi, opsi) → Promise<{success, data, message}>.
 * Dikirim sebagai POST {action, args} ke Apps Script (js/api.js). Kode error khusus ditangani di sini.
 */
function api(fn, ...args) {
  const t0 = performance.now();
  const done = (ok) => { const ms = Math.round(performance.now() - t0); PERF.calls.push([fn, ms, ok]); console.info('[KASBURUH] ' + fn + ': ' + ms + ' ms' + (ok ? '' : ' (gagal)')); };
  if (!window.KB_API || !KB_API.configured()) { done(false); return Promise.reject(serverNotConfigured()); }
  return KB_API.call(fn, args).then((res) => {
    done(res && res.success);
    if (res && res.success) return res;
    if (res && res.code === 'SESSION_EXPIRED') { sessionExpired(); throw new Error(res.message); }
    if (res && res.code === 'MUST_CHANGE') { showForcedChange(PWC.user || S.user || {}); throw new Error(res.message); }
    if (res && res.code === 'SESSION_REPLACED') { sessionReplaced(res); throw new Error(res.message); }
    if (res && res.code === 'UNKNOWN_ACTION') throw serverFnMissing(fn);
    const er = new Error((res && res.message) || 'Respons server tidak valid.'); er.code = res && res.code; er.data = res && res.data; throw er;
  }, (err) => { done(false); throw err; });
}

/** Antrean tulis berurutan → id sementara diganti id server sebelum dikirim. */
function enqueue(task) {
  S.pending++; setSync('busy');
  const p = S.queue.then(task, task);
  S.queue = p.catch(() => { }).then(() => { S.pending--; if (!S.pending) setSync('ok'); });
  return p;
}
function resolveIds(obj) {
  const o = Object.assign({}, obj);
  Object.keys(o).forEach((k) => { if (typeof o[k] === 'string' && S.idMap[o[k]]) o[k] = S.idMap[o[k]]; });
  return o;
}
function setSync(state) {
  const d = $('#sync-dot'); if (!d) return;
  d.className = 'sync-dot' + (state === 'busy' ? ' busy' : state === 'err' ? ' err' : '');
  d.title = state === 'busy' ? 'Menyimpan ke server…' : state === 'err' ? 'Gagal sinkron' : 'Tersinkron dengan Google Sheets';
}

// ════════════════ BOOT ════════════════
// Script berada di akhir <body> → elemen sudah ada; boot SEGERA tanpa menunggu CDN apa pun.
function boot() {
  try { bootInner(); }
  catch (e) {
    console.error('[KASBURUH] boot gagal:', e);
    (window.__ERR__ = window.__ERR__ || []).push('boot: ' + (e && e.message) + (e && e.stack ? '\n' + String(e.stack).split('\n').slice(0, 4).join('\n') : ''));
    if (window.__showBootError) window.__showBootError();
  }
}
function bootInner() {
  // QR tanda tangan pengurus (…/?t=KODE): tampilkan halaman verifikasi publik saja, tanpa memuat aplikasi
  const qs = new URLSearchParams(location.search), kodeTtd = qs.get('t') || qs.get('ttd');
  if (kodeTtd) { showVerifTtd(kodeTtd); return; }
  $('#portal-year').textContent = new Date().getFullYear();
  try { localStorage.removeItem('kb_portal'); } catch (e) { }   // portal kini wajib login → hapus cache publik lama
  // Data halaman depan: tampil seketika dari cache, lalu diperbarui dari server (GET ?action=landing)
  const pub = lsGet('kb_pub', null);
  if (pub && pub.settings) syncClock(pub.serverNow, pub.tz);
  loadPublic();
  setRangePreset('bulan_ini', true);
  S.current = lsGet('kb_last', 'ringkasan');
  applyBrand(Object.assign({}, lsGet('kb_brand_full', null) || {}, (pub && pub.settings) || {}));
  updateThemeSwitch();
  const tok = ssGet('kb_tok');
  if (tok) {
    S.token = tok;
    const snap = lsGet('kb_snap', null);
    if (snap && snap.user) { applyBoot(snap, true); showApp(); } else { showSplash(); }
    const act = num(lsGet('kb_act', 0));
    if (act && Date.now() - act >= idleLimitMs()) { hideSplash(); idleLogout(idleLimitMs()); }
    else refreshAll(true);
  } else {
    showLanding();
  }
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', debounce(() => { updateGreeting(); if (!$('#drp-pop').hidden) positionDrp(); }, 150));
  document.addEventListener('click', onDocClick);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) backgroundSync(); });
  setInterval(backgroundSync, 60000);   // sekaligus detak sesi (cek login di perangkat lain)
  hideSplash();
  window.__BOOTED__ = true;
  PERF.boot = Math.round(performance.now());
  console.info('[KASBURUH] aplikasi tampil: ' + PERF.boot + ' ms sejak halaman dibuka · server: ' + (window.KB_API ? KB_API.url : '-'));
  if (!window.KB_API || !KB_API.configured()) showConfigMissing();
  // Grafik dimuat di latar belakang; setelah siap, halaman yang tampil digambar ulang
  loadLib(LIBS.chart).then(onChartReady).catch(() => console.warn('Chart.js gagal dimuat dari semua CDN.'));
}
function onChartReady() {
  if (S.user && !$('#view-app').hidden) { markDirty(['ringkasan', 'dompet', 'laporan']); }
}

/**
 * Data publik halaman depan (nama, logo, warna, teks landing) + jam server dari GET ?action=landing.
 * Disimpan di localStorage agar kunjungan berikutnya langsung tampil tanpa menunggu server.
 */
function loadPublic() {
  if (!window.KB_API || !KB_API.configured()) return Promise.resolve(null);
  const t0 = performance.now();
  return KB_API.get('landing').then((res) => {
    console.info('[KASBURUH] landing: ' + Math.round(performance.now() - t0) + ' ms');
    if (!res || !res.success || !res.data || !res.data.settings) return null;
    lsSet('kb_pub', res.data);
    if (!S.user) { syncClock(res.data.serverNow, res.data.tz); applyBrand(Object.assign({}, lsGet('kb_brand_full', null) || {}, res.data.settings)); }
    return res.data;
  }).catch((e) => { console.warn('[KASBURUH] data halaman depan belum bisa dimuat:', e.message); return null; });
}

/** js/config.js belum diisi: tampilkan petunjuk singkat untuk pengelola (bukan layar kosong). */
function showConfigMissing() {
  const box = document.createElement('div');
  box.className = 'cfg-missing';
  box.innerHTML = `<div class="cfg-card"><i class="bi bi-plug"></i><b>Alamat server belum diatur</b>
    <p>Aplikasi belum tersambung ke Google Apps Script. Buka file <code>js/config.js</code>, ganti nilai <code>GAS_URL</code> dengan URL yang berakhiran <code>/exec</code>
    (Apps Script → Terapkan → Kelola deployment → URL Aplikasi web), lalu upload ulang ke GitHub.</p>
    <button class="btn btn-secondary btn-sm" onclick="this.closest('.cfg-missing').remove()">Tutup</button></div>`;
  document.body.appendChild(box);
}

/** Halaman verifikasi QR tanda tangan pengurus (publik): …/?t=KODE → data dari GET ?action=ttd. */
function showVerifTtd(kode) {
  document.title = 'Verifikasi Tanda Tangan';
  const wrap = document.createElement('div');
  wrap.className = 'vt-page';
  wrap.innerHTML = '<div class="vt-card"><div class="vt-top"><small>Verifikasi tanda tangan digital</small><b>Memeriksa…</b></div><div class="vt-in"><div class="sk" style="height:180px;border-radius:14px"></div></div></div>';
  // Elemen aplikasi tetap ada (disembunyikan lewat CSS) supaya pendengar global (resize, keydown, dll.) tidak error
  document.body.classList.add('vt-mode'); document.body.appendChild(wrap);
  window.__BOOTED__ = true;
  const tgl = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(v || '')); if (!m) return '-';
    const bl = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return m[3] + ' ' + bl[Number(m[2]) - 1] + ' ' + m[1] + (m[4] ? ' · ' + m[4] + '.' + m[5] + ' WIB' : ''); };
  const render = (d, err) => {
    if (d && /^#[0-9a-f]{6}$/i.test(d.warna || '')) wrap.style.setProperty('--vt', d.warna);
    const org = esc((d && d.org) || 'KASBURUH');
    const body = err ? `<div class="vt-bad"><b>Belum bisa memeriksa</b><p>${esc(err)}</p><button class="btn btn-primary btn-sm" onclick="location.reload()">Coba lagi</button></div>`
      : !d.ditemukan ? `<div class="vt-bad"><b>QR tidak dikenali</b><p>Kode tanda tangan ini tidak terdaftar di aplikasi ${org}.</p></div>`
      : `<div class="vt-badge ${d.aktif ? 'ok' : 'old'}">${d.aktif ? '&#10004; Tanda tangan digital sah &amp; berlaku' : '&#9888; Tanda tangan ini sudah diganti'}</div>
        <div class="vt-sig">${d.ttd ? `<img src="${esc(d.ttd)}" alt="Tanda tangan">` : ''}</div>
        <div class="vt-who"><b>${esc(d.nama)}</b><span>${esc(d.peran)}${d.jabatan ? ' · ' + esc(d.jabatan) : ''}</span></div>
        <table><tr><td>Organisasi</td><td>${org}</td></tr><tr><td>Terdaftar sejak</td><td>${esc(tgl(d.dibuat_pada))}</td></tr>
          ${d.aktif ? '' : `<tr><td>Berlaku sampai</td><td>${esc(tgl(d.direset_pada))}</td></tr>`}<tr><td>Kode</td><td class="mono">${esc(d.kode)}</td></tr></table>
        ${d.aktif ? '' : '<p class="vt-note">Surat yang disetujui sebelum tanggal tersebut tetap sah. Persetujuan setelahnya memakai tanda tangan baru.</p>'}`;
    wrap.innerHTML = `<div class="vt-card"><div class="vt-top"><small>Verifikasi tanda tangan digital</small><b>${org}</b></div><div class="vt-in">${body}</div></div>`;
  };
  if (!window.KB_API || !KB_API.configured()) { render(null, 'Alamat server belum diatur di js/config.js.'); return; }
  KB_API.get('ttd', { t: String(kode).replace(/[^a-zA-Z0-9]/g, '').slice(0, 40) })
    .then((res) => { if (res && res.success) render(res.data); else render(null, (res && res.message) || 'Server tidak memberi jawaban.'); })
    .catch((e) => render(null, e.message));
}

function showSplash() { $('#splash').classList.remove('out'); }
function hideSplash() { $('#splash').classList.add('out'); }

function refreshAll(silent) {
  return api('getBootstrapData', S.token).then((res) => {
    applyBoot(res.data); saveSnapshot(); showApp(); hideSplash(); S.lastSync = Date.now();
  }).catch((e) => { hideSplash(); if (!silent) toast(e.message, 'error'); else if (S.user) setSync('err'); });
}

function backgroundSync() {
  if (!S.token || document.hidden || S.pending || Date.now() - S.lastSync < 55000) return;
  S.lastSync = Date.now();
  api('getDataVersion', S.token).then((res) => {
    if (res.data.serverNow) syncClock(res.data.serverNow);
    if (res.data.version !== S.meta.version && !S.pending) refreshAll(true);
  }).catch(() => { });
}

function applyBoot(boot, fromSnapshot) {
  S.user = boot.user; S.settings = boot.settings || {}; S.meta = boot.meta || {}; S.users = boot.users || [];
  S.permsAll = boot.permsAll || null; S.defaultPerms = boot.defaultPerms || null; S.roles = boot.roles || null; S.portalStale = true; S.permEdit = null;
  if (!fromSnapshot) {
    syncClock(S.meta.serverNow, S.meta.tz);
    if (S.meta.appVersion !== CLIENT_VERSION && !S.verWarned) {
      S.verWarned = true;
      setTimeout(() => toast('Kode.gs di server versi ' + (S.meta.appVersion || 'lama') + ', sedangkan tampilan versi ' + CLIENT_VERSION + '. Ganti isi Kode.gs dengan versi terbaru lalu buat "Versi baru" pada deployment agar semua fitur (hapus pengguna, portal, dll.) berfungsi.', 'warning', 'Versi server belum diperbarui'), 600);
    }
  }
  ENTITIES.forEach((n) => {
    const t = boot.tables && boot.tables[n];
    S.db[n] = t ? t.r.map((r) => { const o = {}; t.h.forEach((k, i) => { o[k] = r[i]; }); return o; }) : (boot.db && boot.db[n]) || [];
  });
  if (!fromSnapshot) {
    const nowS = todayStr();
    if (S.meta.serverToday && S.meta.serverToday !== nowS) console.info('Zona waktu perangkat berbeda dengan server.');
  }
  applyBrand(S.settings);
  if (!lsGet('kb_theme', null) && S.settings.mode_default) setTheme(S.settings.mode_default, true);
  renderUserChrome(); renderNav();
  invalidate(); markDirty(NAV.filter((n) => n.id).map((n) => n.id));
  renderCurrent(); updateBell();
}

const saveSnapshot = debounce(() => {
  if (!S.user) return;
  const snap = { user: S.user, settings: S.settings, meta: S.meta, users: S.users, db: S.db, permsAll: S.permsAll, defaultPerms: S.defaultPerms, roles: S.roles, at: Date.now() };
  try { const s = JSON.stringify(snap); if (s.length < 4000000) localStorage.setItem('kb_snap', s); } catch (e) { /* abaikan */ }
}, 800);

// ════════════════ VIEW: PORTAL / LOGIN / APP ════════════════
function showView(id) { ['view-landing', 'view-login', 'view-app'].forEach((v) => { $('#' + v).hidden = v !== id; }); closeDrp(); }

/** Landing page publik (tanpa data keuangan; portal transparansi kini wajib login). */
function showLanding() { showView('view-landing'); hideSplash(); window.scrollTo(0, 0); }
function lpScroll(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const nav = $('#lp-nav2'); if (nav) nav.classList.remove('open');
  $$('.lp-links button').forEach((b) => b.classList.toggle('on', b.dataset.to === id));
}
function lpMenu() { const nav = $('#lp-nav2'); if (nav) nav.classList.toggle('open'); }
/** Sorot menu sesuai bagian yang sedang terlihat (ringan, via requestAnimationFrame). */
let lpSpyRaf = 0;
window.addEventListener('scroll', () => {
  if (lpSpyRaf || !$('#view-landing') || $('#view-landing').hidden) return;
  lpSpyRaf = requestAnimationFrame(() => {
    lpSpyRaf = 0; let cur = '';
    $$('.lp-links button').forEach((b) => { const s = document.getElementById(b.dataset.to); if (s && s.getBoundingClientRect().top < 140) cur = b.dataset.to; });
    if (!cur) { const f = $('.lp-links button'); cur = f ? f.dataset.to : ''; }
    $$('.lp-links button').forEach((b) => b.classList.toggle('on', b.dataset.to === cur));
    const nav = $('#lp-nav2'); if (nav) nav.classList.toggle('stuck', window.scrollY > 40);
  });
}, { passive: true });

const LP_DEF = { lp_eyebrow: 'TRANSPARAN · AKUNTABEL · SOLIDARITAS', lp_judul1: 'Kas Serikat Kita,', lp_judul2: 'Terbuka & Terpercaya',
  lp_deskripsi: 'Satu tempat resmi untuk mencatat keuangan, aset, dan data anggota serikat pekerja. Rapi, aman, dan siap dipertanggungjawabkan kapan saja.',
  lp_tombol: 'Masuk ke Aplikasi', lp_stat1: '100%|Transaksi tercatat digital', lp_stat2: '24 Jam|Akses pengurus & anggota', lp_stat3: 'Real-time|Laporan siap rapat', lp_bg_opacity: '70' };
const lpVal = (st, k) => (st && st[k] !== undefined && st[k] !== null && String(st[k]) !== '' ? st[k] : LP_DEF[k]);

/** Skema isi landing page (semua diatur Super Admin, disimpan sebagai JSON di Pengaturan.lp_config).
 *  Tipe: t = teks, a = paragraf, u = tautan https, img = gambar, logo = logo. */
const LPC_GROUPS = [
  { id: 'idn', title: 'Identitas, Menu & Kontak', icon: 'bi-person-vcard', fields: [
    ['logo', 'Logo landing (kosong = logo aplikasi)', 'logo', 0, ''],
    ['nama', 'Nama di menu (kosong = nama aplikasi)', 't', 40, ''], ['sub', 'Sub nama (kosong = sub judul aplikasi)', 't', 70, ''],
    ['nav1', 'Menu 1', 't', 20, 'Beranda'], ['nav2', 'Menu 2', 't', 20, 'Tentang'], ['nav3', 'Menu 3', 't', 20, 'Fitur'], ['nav4', 'Menu 4', 't', 20, 'Transparansi'], ['nav5', 'Menu 5', 't', 20, 'Kontak'],
    ['top_alamat', 'Alamat (bar atas)', 't', 90, 'Sekretariat Serikat Pekerja, Indonesia'], ['top_email', 'Email', 't', 60, 'sekretariat@serikat.or.id'],
    ['top_jam', 'Jam layanan', 't', 50, 'Senin – Jumat: 08.00 – 16.00'], ['top_telp', 'Nomor telepon / WA', 't', 25, '0812-0000-0000'], ['cta_label', 'Label di atas nomor', 't', 30, 'Hubungi kami'],
    ['sos_fb', 'Facebook (https)', 'u', 200, ''], ['sos_ig', 'Instagram (https)', 'u', 200, ''], ['sos_yt', 'YouTube (https)', 'u', 200, ''], ['sos_wa', 'WhatsApp (https)', 'u', 200, '']] },
  { id: 'hero', title: 'Hero (Bagian Utama)', icon: 'bi-stars', fields: [
    ['hero_eyebrow', 'Teks kecil di atas judul', 't', 50, 'Kas Serikat Digital'],
    ['hero_j1', 'Judul — awal', 't', 60, 'Kelola Kas Serikat secara'], ['hero_jline', 'Judul — kata bergaris bawah', 't', 40, 'Transparan'], ['hero_j2', 'Judul — akhir', 't', 60, '& Akuntabel'],
    ['hero_desc', 'Deskripsi', 'a', 320, 'Satu aplikasi resmi untuk mencatat keuangan, tagihan, aset, dan data anggota serikat pekerja. Rapi, aman, dan siap dipertanggungjawabkan di setiap rapat.'],
    ['hero_btn', 'Tombol utama', 't', 30, 'Masuk ke Aplikasi'], ['hero_btn2', 'Tombol kedua (kosong = sembunyikan)', 't', 30, 'Lihat Fitur'],
    ['hero_stat', 'Kartu statistik — angka', 't', 14, '100%'], ['hero_stat_txt', 'Kartu statistik — keterangan', 't', 60, 'Transaksi tercatat digital & terverifikasi'],
    ['hero_img', 'Gambar kartu statistik', 'img', 0, '']] },
  { id: 'about', title: 'Tentang Kami', icon: 'bi-info-circle', fields: [
    ['about_chip', 'Label kecil', 't', 30, 'Tentang Kami'], ['about_judul', 'Judul', 't', 110, 'Kami membantu serikat mengelola kas dengan jujur, rapi, dan terbuka'],
    ['about_desc', 'Deskripsi', 'a', 400, 'KASBURUH dibuat untuk bendahara dan pengurus serikat pekerja. Setiap pemasukan, pengeluaran, tagihan, dan aset tercatat rapi sehingga laporan bisa dipertanggungjawabkan kepada seluruh anggota.'],
    ['about_c1', 'Poin 1', 't', 80, 'Setiap rupiah tercatat lengkap dengan bukti'], ['about_c2', 'Poin 2', 't', 80, 'Laporan bulanan siap dibagikan ke anggota'], ['about_c3', 'Poin 3', 't', 80, 'Hak akses pengurus sesuai peran masing-masing'],
    ['about_f1_j', 'Keunggulan 1 — judul', 't', 30, 'Data Aman'], ['about_f1_d', 'Keunggulan 1 — keterangan', 't', 70, 'Tersimpan di Google Drive milik serikat'],
    ['about_f2_j', 'Keunggulan 2 — judul', 't', 30, 'Audit Trail'], ['about_f2_d', 'Keunggulan 2 — keterangan', 't', 70, 'Setiap perubahan tercatat otomatis'],
    ['about_stat', 'Kartu biru — angka', 't', 14, '24 Jam'], ['about_stat_txt', 'Kartu biru — keterangan', 't', 50, 'Akses pengurus & anggota'],
    ['about_img', 'Gambar bagian Tentang', 'img', 0, '']] },
  { id: 'svc', title: 'Fitur (4 kartu)', icon: 'bi-grid', fields: [
    ['svc_chip', 'Label kecil', 't', 30, 'Fitur Utama'], ['svc_judul', 'Judul', 't', 110, 'Semua kebutuhan bendahara serikat dalam satu aplikasi'],
    ['svc_desc', 'Deskripsi singkat', 'a', 260, 'Dirancang khusus untuk serikat pekerja: cepat dipakai di ponsel maupun laptop, tanpa perlu instalasi.'],
    ['svc1_j', 'Kartu 1 — judul', 't', 40, 'Dompet & Buku Kas'], ['svc1_d', 'Kartu 1 — keterangan', 'a', 160, 'Rekening, e-wallet, dan kas tunai dengan saldo yang dihitung otomatis.'], ['svc1_img', 'Kartu 1 — gambar', 'img', 0, ''],
    ['svc2_j', 'Kartu 2 — judul', 't', 40, 'Tagihan & Pengingat'], ['svc2_d', 'Kartu 2 — keterangan', 'a', 160, 'Iuran federasi, sewa, dan vendor diingatkan otomatis via Email & WhatsApp.'], ['svc2_img', 'Kartu 2 — gambar', 'img', 0, ''],
    ['svc3_j', 'Kartu 3 — judul', 't', 40, 'Inventaris Aset'], ['svc3_d', 'Kartu 3 — keterangan', 'a', 160, 'Data barang serikat beserta foto, kondisi, lokasi, dan nilainya.'], ['svc3_img', 'Kartu 3 — gambar', 'img', 0, ''],
    ['svc4_j', 'Kartu 4 — judul', 't', 40, 'Laporan Siap Rapat'], ['svc4_d', 'Kartu 4 — keterangan', 'a', 160, 'Rekap bulanan & tahunan, ekspor Excel dan PDF untuk rentang tanggal bebas.'], ['svc4_img', 'Kartu 4 — gambar', 'img', 0, '']] },
  { id: 'sol', title: 'Transparansi', icon: 'bi-shield-check', fields: [
    ['sol_chip', 'Label kecil', 't', 30, 'Portal Transparansi'], ['sol_judul', 'Judul', 't', 110, 'Anggota dapat memantau kas serikat kapan saja'],
    ['sol_desc', 'Deskripsi', 'a', 360, 'Ringkasan resmi pemasukan, pengeluaran, dan saldo kas tersedia untuk anggota terdaftar setelah login, tanpa menampilkan data pribadi.'],
    ['sol_c1', 'Poin 1', 't', 80, 'Ringkasan kas per rentang tanggal'], ['sol_c2', 'Poin 2', 't', 80, 'Akun anggota memakai NPP masing-masing'], ['sol_c3', 'Poin 3', 't', 80, 'Kata sandi wajib diganti saat login pertama'],
    ['sol_btn', 'Teks tombol', 't', 30, 'Masuk Sekarang'], ['sol_img', 'Gambar bagian Transparansi', 'img', 0, '']] },
  { id: 'foot', title: 'Footer', icon: 'bi-layout-text-window-reverse', fields: [
    ['foot', 'Teks footer', 'a', 200, 'Aplikasi resmi pengelolaan kas serikat pekerja. Untuk informasi akun, hubungi Super Admin / Sekretariat.'],
    ['foot_cta', 'Judul ajakan masuk', 't', 40, 'Sudah punya akun?']] },
];
const LPC_DEF = {}, LPC_TYPE = {};
LPC_GROUPS.forEach((g) => g.fields.forEach((f) => { LPC_DEF[f[0]] = f[4]; LPC_TYPE[f[0]] = f[2]; }));
/** Nilai lama (versi sebelumnya) dipakai bila Super Admin pernah mengubahnya. */
const LPC_LEGACY = { hero_eyebrow: 'lp_eyebrow', hero_j1: 'lp_judul1', hero_j2: 'lp_judul2', hero_desc: 'lp_deskripsi', hero_btn: 'lp_tombol' };
function lpcGet(st) {
  let o = {}; try { o = JSON.parse((st && st.lp_config) || '{}') || {}; } catch (e) { o = {}; }
  const out = {};
  Object.keys(LPC_DEF).forEach((k) => {
    if (o[k] !== undefined && o[k] !== null) { out[k] = String(o[k]); return; }
    const lg = LPC_LEGACY[k];
    out[k] = lg && st && st[lg] && st[lg] !== LP_DEF[lg] ? String(st[lg]) : LPC_DEF[k];
  });
  return out;
}
const lpCss = (u) => esc(String(u || '').replace(/["'\\\s]/g, ''));
const LP_ICO = { svc1_img: 'bi-wallet2', svc2_img: 'bi-receipt', svc3_img: 'bi-box-seam', svc4_img: 'bi-file-earmark-bar-graph', hero_img: 'bi-graph-up-arrow', about_img: 'bi-people', sol_img: 'bi-shield-check' };
function lpImg(c, k, cls) {
  const u = c[k];
  return u ? `<div class="${cls} lp-img" style="background-image:url('${lpCss(u)}')" role="img" aria-label=""></div>`
    : `<div class="${cls} lp-ph" aria-hidden="true"><i class="bi ${LP_ICO[k] || 'bi-image'}"></i></div>`;
}
function lpHtml(c, st) {
  const name = c.nama || st.nama_aplikasi || 'KASBURUH', sub = c.sub || st.subjudul || '';
  const logo = c.logo || st.logo_data || st.link_logo;
  const logoH = logo ? `<img src="${esc(logo)}" alt="Logo ${esc(name)}">` : '<i class="bi bi-bank2"></i>';
  const tel = String(c.top_telp || '').replace(/[^0-9+]/g, '');
  const soc = [['sos_fb', 'bi-facebook'], ['sos_ig', 'bi-instagram'], ['sos_yt', 'bi-youtube'], ['sos_wa', 'bi-whatsapp']]
    .filter(([k]) => /^https:/.test(c[k] || '')).map(([k, ic]) => `<a href="${esc(c[k])}" target="_blank" rel="noopener" aria-label="${k.slice(4)}"><i class="bi ${ic}"></i></a>`).join('');
  const nav = [['nav1', 'lp-top'], ['nav2', 'lp-tentang'], ['nav3', 'lp-fitur'], ['nav4', 'lp-transparansi'], ['nav5', 'lp-kontak']]
    .filter(([k]) => c[k]).map(([k, to], i) => `<button class="${i ? '' : 'on'}" data-to="${to}" onclick="lpScroll('${to}')">${esc(c[k])}</button>`).join('');
  const li = (v) => (v ? `<li><i class="bi bi-check-circle-fill"></i><span>${esc(v)}</span></li>` : '');
  const info = [['top_alamat', 'bi-geo-alt'], ['top_email', 'bi-envelope'], ['top_jam', 'bi-clock']].filter(([k]) => c[k]);
  const contact = info.concat(c.top_telp ? [['top_telp', 'bi-telephone']] : []);
  const brand = (cls) => `<div class="lp-brand2 ${cls || ''}"><span class="lp-logo">${logoH}</span><div><strong>${esc(name)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</div></div>`;
  const svcIco = ['bi-wallet2', 'bi-receipt', 'bi-box-seam', 'bi-file-earmark-bar-graph'];
  return `<div class="lp2">
  ${info.length || soc ? `<div class="lp-topbar"><div class="lp-wrap2 lp-topbar-in"><div class="lp-tb-info">${info.map(([k, ic]) => `<span><i class="bi ${ic}"></i>${esc(c[k])}</span>`).join('')}</div>${soc ? `<div class="lp-tb-soc">${soc}</div>` : ''}</div></div>` : ''}
  <header class="lp-nav2" id="lp-nav2"><div class="lp-wrap2 lp-nav2-in">
    ${brand()}
    <nav class="lp-links" aria-label="Navigasi halaman depan">${nav}</nav>
    <div class="lp-actions2">
      ${c.top_telp ? `<a class="lp-call" href="tel:${esc(tel)}"><span class="lp-call-ic"><i class="bi bi-telephone"></i></span><span class="lp-call-tx"><small>${esc(c.cta_label)}</small><b>${esc(c.top_telp)}</b></span></a>` : ''}
      <button class="lp-icon" onclick="toggleTheme()" aria-label="Ganti mode terang/gelap"><i class="bi bi-moon-stars"></i></button>
      <button class="lp-login" onclick="showLogin()">Masuk <i class="bi bi-box-arrow-in-right"></i></button>
      <button class="lp-burger" onclick="lpMenu()" aria-label="Buka menu"><i class="bi bi-list"></i></button>
    </div></div></header>
  <section class="lp-hero2" id="lp-top">
    <div id="lp-bg" class="lp-bg" aria-hidden="true"></div><div class="lp-shade2" aria-hidden="true"></div>
    <div class="lp-wrap2 lp-hero-in"><div class="lp-hero-copy">
      ${c.hero_eyebrow ? `<span class="lp-eb"><i class="bi bi-stars"></i>${esc(c.hero_eyebrow)}</span>` : ''}
      <h1>${esc(c.hero_j1)} ${c.hero_jline ? `<span class="lp-uline">${esc(c.hero_jline)}</span>` : ''} ${esc(c.hero_j2)}</h1>
      ${c.hero_desc ? `<p>${esc(c.hero_desc)}</p>` : ''}
      <div class="lp-btns"><button class="lp-btn-w" onclick="showLogin()">${esc(c.hero_btn || 'Masuk')} <i class="bi bi-arrow-right"></i></button>
        ${c.hero_btn2 ? `<button class="lp-btn-o" onclick="lpScroll('lp-fitur')">${esc(c.hero_btn2)}</button>` : ''}</div>
    </div></div>
    ${c.hero_stat || c.hero_stat_txt ? `<div class="lp-wrap2 lp-hero-foot"><div class="lp-statcard"><div class="lp-sc-txt"><b>${esc(c.hero_stat)}</b><span>${esc(c.hero_stat_txt)}</span></div>${lpImg(c, 'hero_img', 'lp-sc-img')}</div></div>` : ''}
  </section>
  <section class="lp-about" id="lp-tentang"><div class="lp-wrap2 lp-about-in">
    <div class="lp-about-media">${lpImg(c, 'about_img', 'lp-about-img')}
      ${c.about_stat || c.about_stat_txt ? `<div class="lp-about-stat"><i class="bi bi-people-fill"></i><b>${esc(c.about_stat)}</b><span>${esc(c.about_stat_txt)}</span></div>` : ''}</div>
    <div class="lp-about-copy">
      ${c.about_chip ? `<span class="lp-chip">${esc(c.about_chip)}</span>` : ''}
      <h2>${esc(c.about_judul)}</h2>${c.about_desc ? `<p>${esc(c.about_desc)}</p>` : ''}
      <ul class="lp-check">${li(c.about_c1)}${li(c.about_c2)}${li(c.about_c3)}</ul>
      <div class="lp-feats">${[['about_f1', 'bi-patch-check'], ['about_f2', 'bi-award']].filter(([k]) => c[k + '_j']).map(([k, ic]) => `<div class="lp-feat"><span class="lp-feat-ic"><i class="bi ${ic}"></i></span><div><b>${esc(c[k + '_j'])}</b><small>${esc(c[k + '_d'])}</small></div></div>`).join('')}</div>
    </div></div></section>
  <section class="lp-svc" id="lp-fitur"><div class="lp-wrap2">
    <div class="lp-svc-head"><div>${c.svc_chip ? `<span class="lp-chip lp-chip-d">${esc(c.svc_chip)}</span>` : ''}<h2>${esc(c.svc_judul)}</h2></div>${c.svc_desc ? `<p>${esc(c.svc_desc)}</p>` : ''}</div>
    <div class="lp-svc-grid">${[1, 2, 3, 4].filter((i) => c['svc' + i + '_j']).map((i) => `<article class="lp-svc-card">${lpImg(c, 'svc' + i + '_img', 'lp-svc-img')}
      <div class="lp-svc-body"><span class="lp-svc-ic"><i class="bi ${svcIco[i - 1]}"></i></span><b>${esc(c['svc' + i + '_j'])}</b><p>${esc(c['svc' + i + '_d'])}</p></div></article>`).join('')}</div>
  </div></section>
  <section class="lp-sol" id="lp-transparansi"><div class="lp-wrap2 lp-sol-in">
    <div class="lp-sol-copy">${c.sol_chip ? `<span class="lp-chip">${esc(c.sol_chip)}</span>` : ''}<h2>${esc(c.sol_judul)}</h2>${c.sol_desc ? `<p>${esc(c.sol_desc)}</p>` : ''}
      <ul class="lp-check">${li(c.sol_c1)}${li(c.sol_c2)}${li(c.sol_c3)}</ul>
      ${c.sol_btn ? `<button class="lp-btn-p" onclick="showLogin()">${esc(c.sol_btn)} <i class="bi bi-arrow-right"></i></button>` : ''}</div>
    <div class="lp-sol-media">${lpImg(c, 'sol_img', 'lp-sol-img')}</div>
  </div></section>
  <footer class="lp-foot2" id="lp-kontak"><div class="lp-wrap2 lp-foot2-in">
    <div class="lp-foot-col">${brand('lp-brand-foot')}${c.foot ? `<p>${esc(c.foot)}</p>` : ''}${soc ? `<div class="lp-tb-soc">${soc}</div>` : ''}</div>
    <div class="lp-foot-col"><b class="lp-foot-h">${esc(c.nav5 || 'Kontak')}</b><ul class="lp-foot-ct">${contact.map(([k, ic]) => `<li><i class="bi ${ic}"></i><span>${esc(c[k])}</span></li>`).join('')}</ul></div>
    <div class="lp-foot-col lp-foot-cta"><b class="lp-foot-h">${esc(c.foot_cta)}</b><button class="lp-btn-w" onclick="showLogin()">Masuk <i class="bi bi-arrow-right"></i></button></div>
  </div><div class="lp-wrap2 lp-copy2">© ${new Date().getFullYear()} ${esc(name)}${sub ? ' · ' + esc(sub) : ''}</div></footer>
</div>`;
}
let LP_SIG = '';
function applyLanding(st) {
  const root = $('#lp-root'); if (!root) return;
  st = st || {};
  const c = lpcGet(st);
  const sig = JSON.stringify([c, st.nama_aplikasi, st.subjudul, st.logo_data, st.link_logo]);
  if (sig !== LP_SIG || !root.firstChild) { root.innerHTML = lpHtml(c, st); LP_SIG = sig; }
  const bg = $('#lp-bg'), url = st.lp_bg;
  if (bg) {
    if (url) { bg.style.backgroundImage = 'url("' + String(url).replace(/["\\]/g, '') + '")'; bg.style.opacity = Math.max(0, Math.min(100, Number(lpVal(st, 'lp_bg_opacity')))) / 100; }
    else { bg.style.backgroundImage = ''; bg.style.opacity = 0; }
  }
  updateThemeSwitch();
}

function showLogin() {
  if (S.lpPreviewing) { lpcBack(); return; }
  showView('view-login');
  $('#login-form').hidden = false; $('#pwchange-form').hidden = true;
  setTimeout(() => $('#login-user').focus(), 50);
}
function showApp() { const wasHidden = $('#view-app').hidden; showView('view-app'); go(S.current || 'ringkasan', wasHidden || S.dirty.has(S.current)); }

function handleLogin(e, force) {
  if (e) e.preventDefault();
  const u = $('#login-user').value.trim(), p = $('#login-pass').value;
  const err = $('#login-error'); err.hidden = true; err.classList.remove('note');
  if (!u || !p) { err.textContent = 'Isi username dan kata sandi.'; err.hidden = false; return; }
  const btn = $('#login-btn'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span><span>Memverifikasi…</span>';
  api('login', u, p, { dev: devId(), devName: devName(), force: !!force }).then((res) => {
    S.token = res.data.token; ssSet('kb_tok', S.token); idleTouch(true);
    if (res.data.mustChange) { PWC.old = p; showForcedChange(res.data.user); $('#login-pass').value = ''; return; }
    applyBoot(res.data.boot); saveSnapshot(); S.lastSync = Date.now();
    $('#login-pass').value = '';
    S.current = 'ringkasan'; showApp(); toast(res.message, 'success');
  }).catch((ex) => { err.textContent = ex.message; err.hidden = false; })
    .finally(() => { btn.disabled = false; btn.innerHTML = '<span>Masuk</span>'; });
}

// ════════════════ SATU AKUN = SATU PERANGKAT · KELUAR OTOMATIS ════════════════
/** ID acak per browser (disimpan di perangkat) → server membedakan "perangkat ini" vs "perangkat lain". */
function devId() {
  let d = lsGet('kb_dev', '');
  if (!d) { d = 'd' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); lsSet('kb_dev', d); }
  return d;
}
function devName() {
  const ua = navigator.userAgent || '', has = (x) => ua.indexOf(x) >= 0;
  const b = has('Edg/') ? 'Edge' : has('OPR/') || has('Opera') ? 'Opera' : has('SamsungBrowser') ? 'Samsung Internet' : has('Firefox/') ? 'Firefox' : has('Chrome/') ? 'Chrome' : has('Safari/') ? 'Safari' : 'Browser';
  const o = has('Android') ? 'Android' : has('iPhone') ? 'iPhone' : has('iPad') ? 'iPad' : has('Windows') ? 'Windows' : has('Macintosh') || has('Mac OS X') ? 'macOS' : has('Linux') ? 'Linux' : 'Perangkat';
  return b + ' · ' + o;
}
/** Perangkat ini ditutup karena akun login di perangkat lain. */
function sessionReplaced(res) {
  if (!S.token) return;
  const d = res.data || {}, uname = (S.user && (S.user.username || '')) || '';
  idleHideWarn(); doLocalLogout();
  openModal({ title: 'Sesi Ditutup', size: 'sm', body: `<div class="sess-ic"><i class="bi bi-shield-lock"></i></div>
    <p class="center"><b>Akun Anda telah login di perangkat lain.</b></p>
    <div class="sess-dev"><i class="bi ${/Android|iPhone/.test(d.perangkat || '') ? 'bi-phone' : 'bi-laptop'}"></i><div><b>${esc(d.perangkat || 'Perangkat lain')}</b><small>${d.waktu ? esc(d.waktu) + ' ' + pjmTz() : 'baru saja'}</small></div></div>
    <p class="small muted mt-16">Satu akun hanya aktif di satu perangkat, jadi sesi di perangkat ini <b>ditutup otomatis</b> dan berpindah ke perangkat baru. Bukan Anda? Segera masuk lagi lalu ganti kata sandi.</p>`,
    foot: `<button class="btn btn-secondary" onclick="closeModal()">Tutup</button><button class="btn btn-primary" onclick="closeModal();showLogin();$('#login-user').value=${esc(JSON.stringify(uname))}"><i class="bi bi-box-arrow-in-right"></i>Masuk lagi di perangkat ini</button>` });
}
const IDLE = { last: Date.now(), saved: 0, warn: false };
const idleLimitMs = () => Math.max(1, Math.round(num(S.settings && S.settings.sesi_idle_menit)) || 15) * 60000;
/** Ada aktivitas (sentuh, ketik, gulir, gerak mouse) → hitung ulang. Dibagi antar-tab lewat localStorage. */
function idleTouch(force) {
  IDLE.last = Date.now();
  if (force || IDLE.last - IDLE.saved > 5000) { IDLE.saved = IDLE.last; lsSet('kb_act', IDLE.last); }
  if (IDLE.warn) idleHideWarn();
}
function idleCheck() {
  if (!S.token || !S.user || $('#view-app').hidden) { if (IDLE.warn) idleHideWarn(); return; }
  const lim = idleLimitMs(), idle = Date.now() - Math.max(IDLE.last, num(lsGet('kb_act', 0)));
  if (idle >= lim) idleLogout(lim);
  else if (idle >= lim - 60000) idleShowWarn(Math.ceil((lim - idle) / 1000));
  else if (IDLE.warn) idleHideWarn();
}
function idleShowWarn(sec) {
  let el = $('#idle-warn');
  if (!el) { el = document.createElement('div'); el.id = 'idle-warn'; el.className = 'idle-warn'; el.setAttribute('role', 'alert'); document.body.appendChild(el); }
  el.innerHTML = `<span class="idle-ic"><i class="bi bi-hourglass-split"></i></span><div><b>Sesi akan berakhir</b><span>Tidak ada aktivitas. Keluar otomatis dalam <b class="mono">${sec}</b> detik.</span></div><button class="btn btn-primary btn-sm" onclick="idleTouch(true)">Tetap masuk</button>`;
  el.hidden = false; IDLE.warn = true;
}
function idleHideWarn() { const el = $('#idle-warn'); if (el) el.hidden = true; IDLE.warn = false; }
function idleLogout(lim) {
  const t = S.token, menit = Math.round(lim / 60000);
  idleHideWarn(); if (!$('#modal-root').hidden) closeModal();
  doLocalLogout(); if (t) api('logout', t, 'idle').catch(() => { });
  showLogin();
  const err = $('#login-error'); err.textContent = 'Sesi berakhir karena tidak ada aktivitas selama ' + menit + ' menit. Silakan login ulang.'; err.classList.add('note'); err.hidden = false;
}
['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll', 'mousemove'].forEach((ev) => document.addEventListener(ev, () => { if (S.token) idleTouch(); }, { passive: true, capture: true }));
setInterval(idleCheck, 1000);
/** Cek sesi tiap 15 detik (dan saat tab kembali dibuka): bila akun login di perangkat lain, perangkat ini langsung ditutup. */
const SESI = { last: 0 };
function sesiCheck(force) {
  if (!S.token || !S.user || document.hidden || $('#view-app').hidden) return;
  if (!force && Date.now() - SESI.last < 14000) return;
  SESI.last = Date.now();
  api('cekSesi', S.token).catch(() => { });
}
setInterval(sesiCheck, 5000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { idleCheck(); if (Date.now() - SESI.last > 3000) sesiCheck(true); } });

// ── Wajib ganti kata sandi (login pertama / setelah reset) ──
const PWC = { old: '', user: null };
function showForcedChange(user) {
  PWC.user = user || {};
  showView('view-login');
  $('#login-form').hidden = true; $('#pwchange-form').hidden = false;
  $('#pwc-name').textContent = PWC.user.nama || PWC.user.username || '';
  $('#pwc-new').value = ''; $('#pwc-new2').value = ''; $('#pwc-error').hidden = true; pwRules();
  setTimeout(() => $('#pwc-new').focus(), 50);
}
function pwRules() {
  const n = $('#pwc-new').value, n2 = $('#pwc-new2').value, un = String(PWC.user && PWC.user.username || '').toLowerCase();
  const r = { len: n.length >= 8, user: !!n && n.toLowerCase() !== un, mix: /[a-z]/i.test(n) && /\d/.test(n), same: !!n && n === n2 };
  $$('#pw-rules li').forEach((li) => { const okR = r[li.dataset.r]; li.classList.toggle('ok', okR); li.querySelector('i').className = 'bi ' + (okR ? 'bi-check-circle-fill' : 'bi-circle'); });
  return r;
}
function handleForcedChange(e) {
  e.preventDefault();
  const r = pwRules(), err = $('#pwc-error'); err.hidden = true;
  if (!r.len || !r.user || !r.same) { err.textContent = !r.same ? 'Kedua isian kata sandi belum sama.' : 'Kata sandi belum memenuhi syarat.'; err.hidden = false; return; }
  if (!PWC.old) { err.textContent = 'Sesi login pertama berakhir. Silakan masuk ulang.'; err.hidden = false; return; }
  const btn = $('#pwc-btn'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span><span>Menyimpan…</span>';
  api('changeOwnPassword', S.token, PWC.old, $('#pwc-new').value).then((res) => {
    PWC.old = ''; PWC.user = null; idleTouch(true);
    applyBoot(res.data.boot); saveSnapshot(); S.lastSync = Date.now();
    S.current = 'ringkasan'; showApp(); toast('Kata sandi baru tersimpan. Selamat datang!', 'success');
  }).catch((ex) => { err.textContent = ex.message; err.hidden = false; })
    .finally(() => { btn.disabled = false; btn.innerHTML = '<span>Simpan &amp; Lanjutkan</span>'; });
}
function cancelForcedChange() {
  const t = S.token; PWC.old = ''; PWC.user = null;
  S.token = null; ssSet('kb_tok', null); if (t) api('logout', t).catch(() => { });
  showLogin();
}

function handleLogout() {
  confirmDlg('Keluar dari aplikasi?', { ok: 'Keluar' }).then((yes) => {
    if (!yes) return;
    const t = S.token; doLocalLogout(); api('logout', t).catch(() => { });
  });
}
function doLocalLogout() {
  S.token = null; S.user = null; ssSet('kb_tok', null);
  try { localStorage.removeItem('kb_snap'); } catch (e) { }
  Object.keys(S.charts).forEach(destroyChart);
  S.portal = null;
  showLanding();
}
function sessionExpired() {
  if (!S.token) return;
  doLocalLogout(); showLogin(); toast('Sesi berakhir. Silakan masuk kembali.', 'warning');
}
function togglePass(id, btn) {
  const i = $('#' + id); i.type = i.type === 'password' ? 'text' : 'password';
  btn.innerHTML = `<i class="bi ${i.type === 'password' ? 'bi-eye' : 'bi-eye-slash'}"></i>`;
}

// ════════════════ BRAND & TEMA ════════════════
function applyBrand(st) {
  st = st || {};
  const root = document.documentElement;
  if (/^#[0-9a-f]{6}$/i.test(st.warna_utama || '')) root.style.setProperty('--primary', st.warna_utama);
  if (/^#[0-9a-f]{6}$/i.test(st.warna_aksen || '')) root.style.setProperty('--accent', st.warna_aksen);
  const name = st.nama_aplikasi || 'KASBURUH', sub = st.subjudul || '';
  $$('[data-app-name]').forEach((el) => { el.textContent = name; });
  $$('[data-app-sub]').forEach((el) => { el.textContent = sub; });
  const logo = st.logo_data || st.link_logo;
  root.style.setProperty('--logo-k', String(Math.max(60, Math.min(200, Math.round(num(st.logo_skala)) || 100)) / 100));
  $$('[data-logo]').forEach((el) => { el.innerHTML = logo ? `<img src="${esc(logo)}" alt="Logo ${esc(name)}">` : '<i class="bi bi-bank2"></i>'; });
  document.title = name + (sub ? ' · ' + sub : '');
  applyWallpaper(st.login_bg, st.login_bg_opacity);
  applyLoginBrand(st);
  applyLanding(st);
  if (st.warna_utama) {
    lsSet('kb_brand', { p: st.warna_utama, a: st.warna_aksen });
    const keep = {};
    ['nama_aplikasi', 'subjudul', 'logo_data', 'link_logo', 'logo_skala', 'warna_utama', 'warna_aksen', 'login_bg', 'login_bg_opacity', 'login_logo', 'login_judul', 'login_sub', 'login_catatan', 'lp_bg', 'lp_bg_opacity', 'lp_eyebrow',
      'lp_judul1', 'lp_judul2', 'lp_deskripsi', 'lp_tombol', 'lp_stat1', 'lp_stat2', 'lp_stat3', 'lp_config'].forEach((k) => { if (st[k] !== undefined) keep[k] = st[k]; });
    keep.nama_aplikasi = name; keep.subjudul = sub;
    lsSet('kb_brand_full', keep);
  }
}
/** Wallpaper halaman login: gambar + opacity (0-100) dari Pengaturan. */
function applyWallpaper(url, opacity) {
  const bg = $('#login-bg');
  if (!bg) return;
  const op = Math.max(0, Math.min(100, Number(opacity === undefined || opacity === '' ? 35 : opacity))) / 100;
  if (url) { bg.style.backgroundImage = 'url("' + String(url).replace(/["\\]/g, '') + '")'; bg.style.opacity = op; }
  else { bg.style.backgroundImage = ''; bg.style.opacity = 0; }
}
/** Logo & tulisan halaman login (diatur Super Admin). login_catatan: "teks biasa|teks tebal". */
const LG_DEF = { login_judul: 'Selamat Datang Kembali', login_sub: 'Masuk untuk mengelola kas serikat', login_catatan: 'Belum punya akun?|Hubungi Super Admin' };
const lgVal = (st, k) => (st && st[k] !== undefined && st[k] !== null && String(st[k]) !== '' ? st[k] : LG_DEF[k]);
function applyLoginBrand(st) {
  const logoEl = $('#lg-logo'); if (!logoEl) return;
  const logo = (st && (st.login_logo || st.logo_data || st.link_logo)) || '';
  logoEl.innerHTML = logo ? `<img src="${esc(logo)}" alt="Logo">` : '<i class="bi bi-bank2"></i>';
  logoEl.classList.toggle('has-img', !!logo);
  $('#lg-title').textContent = lgVal(st, 'login_judul');
  $('#lg-sub').textContent = lgVal(st, 'login_sub');
  const parts = String(lgVal(st, 'login_catatan')).split('|');
  $('#lg-foot').innerHTML = esc(parts[0] || '') + (parts[1] ? ' <b>' + esc(parts[1]) + '</b>' : '');
}
function forgotPassword() {
  openModal({ title: 'Lupa kata sandi?', size: 'sm', body: `<div class="row" style="align-items:flex-start;gap:14px"><span class="kpi-ico ico-pri"><i class="bi bi-key"></i></span>
    <div><p>Hubungi <b>Super Admin</b> untuk mereset kata sandi Anda.</p><p class="small muted mt-8">Untuk akun Anggota, sandi akan dikembalikan ke NPP dan Anda diminta membuat sandi baru saat login berikutnya.</p></div></div>`,
    foot: '<button class="btn btn-primary" onclick="closeModal()">Mengerti</button>' });
}
function setTheme(t, silent) {
  document.documentElement.setAttribute('data-theme', t);
  if (!silent) lsSet('kb_theme', t);
  updateThemeSwitch();
  if (S.user) { markDirty(['ringkasan', 'dompet', 'anggaran', 'laporan']); }
  if (!$('#view-landing').hidden && !S.lpPreviewing) applyLanding(S.settings && S.settings.lp_judul1 !== undefined ? S.settings : lsGet('kb_brand_full', {}));
}
function toggleTheme() { setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }
function updateThemeSwitch() {
  const t = document.documentElement.getAttribute('data-theme');
  $$('.lp-icon i').forEach((i) => { i.className = 'bi ' + (t === 'dark' ? 'bi-sun' : 'bi-moon-stars'); });
  $$('.lp-icon').forEach((b) => { b.title = t === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'; });
  $$('[data-theme-set]').forEach((b) => b.classList.toggle('on', b.dataset.themeSet === t));
}

// ════════════════ ROUTER SPA (0 ms) ════════════════
const RENDER = {
  ringkasan: () => renderRingkasan(), transaksi: () => renderTransaksi(), dompet: () => renderDompet(),
  kategori: () => renderKategori(), anggaran: () => renderAnggaran(), tabungan: () => renderTabungan(),
  tagihan: () => renderTagihan(), inventaris: () => renderInventaris(), anggota: () => renderAnggota(),
  laporan: () => renderLaporan(), pengaturan: () => renderPengaturan(), peminjaman: () => renderPeminjaman(),
  gathering: () => renderGathering(), undian: () => renderUndian()
};
function go(id, force) {
  if (!RENDER[id] || !canNav(id)) id = 'ringkasan';
  const changed = S.current !== id;
  S.current = id; lsSet('kb_last', id);
  $$('.section').forEach((s) => s.classList.toggle('on', s.id === 'sec-' + id));
  $$('#sb-nav .sb-link').forEach((a) => { a.classList.toggle('on', a.dataset.page === id); a.setAttribute('aria-current', a.dataset.page === id ? 'page' : 'false'); });
  closeDrawer(); closePopovers();
  updateGreeting();
  if (S.dirty.has(id) || force) renderCurrent();
  if (changed) { $('#main').scrollTop = 0; window.scrollTo(0, 0); }
  $('#fab').hidden = !canW('transaksi');
}
function markDirty(ids) {
  ids.forEach((id) => S.dirty.add(id));
  if (ids.indexOf(S.current) >= 0 && S.user && !$('#view-app').hidden) renderCurrent();
}
function renderCurrent() {
  const id = S.current;
  S.dirty.delete(id);
  try { RENDER[id](); } catch (e) { console.error(e); $('#sec-' + id).innerHTML = `<div class="card empty"><i class="bi bi-bug"></i><strong>Gagal menampilkan halaman</strong>${esc(e.message)}</div>`; }
}
function renderNav() {
  const items = NAV.filter((n) => n.group || canNav(n.id))
    .filter((n, i, arr) => !n.group || (arr[i + 1] && !arr[i + 1].group));
  $('#sb-nav').innerHTML = items.map((n) => {
    if (n.group) return `<div class="sb-group">${n.group}</div>`;
    if (n.id === 'pengaturan' && !isDataAdmin()) n = Object.assign({}, n, { icon: 'bi-person-circle', label: 'Akun Saya' });
    const b = n.badge ? n.badge() : 0;
    return `<button class="sb-link${n.id === S.current ? ' on' : ''}" data-page="${n.id}" onclick="go('${n.id}')" title="${n.label}">
      <i class="bi ${n.icon}"></i><span>${n.label}</span>${b ? `<span class="badge">${b}</span>` : ''}</button>`;
  }).join('');
}
/** Sapaan: "Selamat Pagi, NAMA (huruf kapital)" + peran di bawahnya. Di HP diganti judul halaman. */
function updateGreeting() {
  if (!S.user || !$('#greeting')) return;
  const mobile = window.innerWidth < 768;
  $('#greeting').textContent = mobile ? ((NAV.find((n) => n.id === S.current) || {}).label || '') : greetingWord() + ', ' + String(S.user.nama || '').toUpperCase();
  $('#greet-role').textContent = mobile ? '' : (S.user.jabatan || S.user.peran);
  $('#greet-role').hidden = mobile;
}
function renderUserChrome() {
  if (!S.user) return;
  $('#sb-user-name').textContent = S.user.nama;
  $('#sb-user-role').textContent = S.user.jabatan || S.user.peran;
  $('#sb-avatar').textContent = initials(S.user.nama);
  updateGreeting();
}
function openDrawer() { $('#sidebar').classList.add('open'); $('#drawer-backdrop').classList.add('on'); }
function closeDrawer() { $('#sidebar').classList.remove('open'); $('#drawer-backdrop').classList.remove('on'); }

function onKey(e) {
  if (e.key === 'Escape') { if (!$('#drp-pop').hidden) closeDrp(); else if (!$('#modal-root').hidden) closeModal(); else { closePopovers(); closeDrawer(); } }
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
    const s = $('.section.on .search input'); if (s) { e.preventDefault(); s.focus(); }
  }
}
function onDocClick(e) {
  if (!document.contains(e.target)) return;             // elemen sudah diganti (render ulang kalender)
  const inDrp = e.target.closest('#drp-pop') || e.target.closest('.drp-host') || e.target.closest('#range-btn');
  if (!inDrp) closeDrp();
  if (!e.target.closest('.popover-host')) closePopovers();
}
function toggleMenuPop(id) {
  const p = $('#' + id); const willOpen = p.hidden; closePopovers();
  if (willOpen) { closeDrp(); p.hidden = false; if (id === 'notif-pop') renderNotifPop(); }
}
function closePopovers() { $$('.popover').forEach((p) => { p.hidden = true; }); }

// ════════════════ PERHITUNGAN (memo per versi data) ════════════════
let MEMO = {};
function invalidate() { MEMO = {}; }
function memo(key, fn) { if (!(key in MEMO)) MEMO[key] = fn(); return MEMO[key]; }
const dompetMap = () => memo('dm', () => Object.fromEntries(S.db.Dompet.map((d) => [d.id, d])));
const katMap = () => memo('km', () => Object.fromEntries(S.db.Kategori.map((k) => [k.id, k])));
const katOf = (id) => katMap()[id] || { nama: 'Tanpa kategori', warna: '#94A3B8', ikon: 'bi-question-circle' };
const dompetName = (id) => (dompetMap()[id] || {}).nama_dompet || '—';
const activeDompet = () => S.db.Dompet.filter((d) => String(d.aktif) !== 'false').sort((a, b) => num(a.urutan) - num(b.urutan));
const katsBy = (jenis) => S.db.Kategori.filter((k) => k.jenis === jenis).sort((a, b) => String(a.nama).localeCompare(b.nama));
const trxSorted = () => memo('ts', () => S.db.Transaksi.slice().sort((a, b) => (String(b.tanggal) + (b.dibuat_pada || '')).localeCompare(String(a.tanggal) + (a.dibuat_pada || ''))));

/** Saldo tiap dompet per tanggal (default: semua waktu). */
function saldoMap(until) {
  return memo('saldo_' + (until || 'all'), () => {
    const m = {};
    S.db.Dompet.forEach((d) => { m[d.id] = num(d.saldo_awal); });
    S.db.Transaksi.forEach((t) => {
      if (until && String(t.tanggal) > until) return;
      const j = num(t.jumlah);
      if (t.jenis === 'Masuk') m[t.id_dompet] = (m[t.id_dompet] || 0) + j;
      else if (t.jenis === 'Keluar') m[t.id_dompet] = (m[t.id_dompet] || 0) - j;
      else if (t.jenis === 'Transfer') { m[t.id_dompet] = (m[t.id_dompet] || 0) - j; m[t.id_dompet_tujuan] = (m[t.id_dompet_tujuan] || 0) + j; }
    });
    return m;
  });
}
const totalKas = (until) => S.db.Dompet.reduce((a, d) => a + (saldoMap(until)[d.id] || 0), 0);

/** Arus kas dalam rentang [from, to]. */
function flows(from, to) {
  return memo('fl_' + from + to, () => {
    const r = { masuk: 0, keluar: 0, transfer: 0, nMasuk: 0, nKeluar: 0, nTransfer: 0, outKat: {}, inKat: {}, perDompet: {}, list: [] };
    S.db.Transaksi.forEach((t) => {
      const d = String(t.tanggal);
      if (d < from || d > to) return;
      const j = num(t.jumlah);
      r.list.push(t);
      const pd = (id) => (r.perDompet[id] = r.perDompet[id] || { masuk: 0, keluar: 0, tIn: 0, tOut: 0 });
      if (t.jenis === 'Masuk') { r.masuk += j; r.nMasuk++; r.inKat[t.id_kategori] = (r.inKat[t.id_kategori] || 0) + j; pd(t.id_dompet).masuk += j; }
      else if (t.jenis === 'Keluar') { r.keluar += j; r.nKeluar++; r.outKat[t.id_kategori] = (r.outKat[t.id_kategori] || 0) + j; pd(t.id_dompet).keluar += j; }
      else { r.transfer += j; r.nTransfer++; pd(t.id_dompet).tOut += j; pd(t.id_dompet_tujuan).tIn += j; }
    });
    r.net = r.masuk - r.keluar;
    return r;
  });
}
/** Rentang sebelumnya dengan panjang sama (untuk persentase perubahan). */
function prevRange(from, to) {
  const f = parseYmd(from), t = parseYmd(to);
  if (f.getDate() === 1 && toYmd(new Date(t.getFullYear(), t.getMonth() + 1, 0)) === to) {
    const months = (t.getFullYear() - f.getFullYear()) * 12 + t.getMonth() - f.getMonth() + 1;
    const pf = new Date(f.getFullYear(), f.getMonth() - months, 1);
    return { from: toYmd(pf), to: toYmd(new Date(f.getFullYear(), f.getMonth(), 0)) };
  }
  const len = daysBetween(from, to) + 1;
  return { from: addDays(from, -len), to: addDays(from, -1) };
}
/** Seri bulanan n bulan berakhir di bulan `endYm`. */
function monthSeries(endYm, n) {
  const y = Number(endYm.slice(0, 4)), m = Number(endYm.slice(5, 7));
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const f = flows(monthStart(d.getFullYear(), d.getMonth() + 1), monthEnd(d.getFullYear(), d.getMonth() + 1));
    out.push({ ym: d.getFullYear() + '-' + pad(d.getMonth() + 1), label: BLN[d.getMonth()], masuk: f.masuk, keluar: f.keluar, net: f.net });
  }
  return out;
}
/** Realisasi anggaran per kategori untuk bulan `period` (yyyy-mm). */
function budgetRows(period) {
  return memo('bud_' + period, () => {
    const y = Number(period.slice(0, 4)), m = Number(period.slice(5, 7));
    const f = flows(monthStart(y, m), monthEnd(y, m));
    return S.db.Anggaran.filter((a) => num(a.bulan) === m && num(a.tahun) === y).map((a) => {
      const used = f.outKat[a.id_kategori] || 0, lim = num(a.batas_jumlah);
      const p = lim ? (used / lim) * 100 : (used ? 100 : 0);
      return { a, kat: katOf(a.id_kategori), used, lim, sisa: lim - used, p, status: p > 100 ? 'over' : p >= 100 ? 'full' : p >= 85 ? 'warn' : 'ok' };
    }).sort((x, z) => z.p - x.p);
  });
}
function goalProgress(g) {
  if (g.id_dompet) return Math.max(0, saldoMap()[g.id_dompet] || 0);
  return S.db.Transaksi.filter((t) => t.id_tabungan === g.id).reduce((a, t) => a + (t.jenis === 'Keluar' ? -1 : 1) * num(t.jumlah), 0);
}
function dueBills() {
  return memo('due', () => {
    const t = todayStr();
    return S.db.Tagihan.filter((b) => b.status !== 'Lunas' && daysBetween(t, b.jatuh_tempo) <= 7)
      .sort((a, b) => String(a.jatuh_tempo).localeCompare(b.jatuh_tempo));
  });
}
const billLabel = (b) => {
  const d = daysBetween(todayStr(), b.jatuh_tempo);
  if (b.status === 'Lunas') return { txt: 'Lunas', cls: 'chip-in' };
  if (d < 0) return { txt: 'Terlambat ' + -d + ' hr', cls: 'chip-out' };
  if (d === 0) return { txt: 'Hari ini', cls: 'chip-out' };
  return { txt: 'H-' + d, cls: d <= 3 ? 'chip-warn' : 'chip-mute' };
};

// ════════════════ RENTANG TANGGAL GLOBAL ════════════════
function setRangePreset(p, silent) { const r = computePreset(p); setRange(r.from, r.to, p, silent); }
function computePreset(p) {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth() + 1;
  let from, to;
  if (p === 'bulan_ini') { from = monthStart(y, m); to = monthEnd(y, m); }
  else if (p === 'bulan_lalu') { const d = new Date(y, m - 2, 1); from = monthStart(d.getFullYear(), d.getMonth() + 1); to = monthEnd(d.getFullYear(), d.getMonth() + 1); }
  else if (p === '3_bulan') { const d = new Date(y, m - 3, 1); from = monthStart(d.getFullYear(), d.getMonth() + 1); to = monthEnd(y, m); }
  else if (p === '6_bulan') { const d = new Date(y, m - 6, 1); from = monthStart(d.getFullYear(), d.getMonth() + 1); to = monthEnd(y, m); }
  else if (p === 'tahun_ini') { from = y + '-01-01'; to = y + '-12-31'; }
  else if (p === 'tahun_lalu') { from = (y - 1) + '-01-01'; to = (y - 1) + '-12-31'; }
  else if (p === '30_hari') { from = addDays(todayStr(), -29); to = todayStr(); }
  else { from = monthStart(y, m); to = monthEnd(y, m); }
  return { from, to };
}
function setRange(from, to, preset, silent) {
  if (from > to) { const x = from; from = to; to = x; }
  S.range = { from, to, preset: preset || 'custom' };
  const lbl = dmy(from) + ' – ' + dmy(to);
  const rl = $('#range-label'); if (rl) rl.textContent = lbl;
  $('#topbar-period').textContent = '· ' + (preset === 'bulan_ini' ? ymLabel(from) : lbl);
  S.ui.trx.page = 1;
  if (!silent) { closePopovers(); invalidate(); markDirty(['ringkasan', 'transaksi', 'dompet', 'kategori', 'laporan']); }
}

// ════════════════ PEMILIH RENTANG TANGGAL INTERAKTIF ════════════════
const dmy = (s) => (s ? String(s).slice(8, 10) + '-' + String(s).slice(5, 7) + '-' + String(s).slice(0, 4) : '');
function parseDmy(v) {
  const m = String(v || '').trim().match(/^(\d{1,2})[-.\s](\d{1,2})[-.\s](\d{4})$/) || String(v || '').trim().match(/^(\d{1,2})\u002F(\d{1,2})\u002F(\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return d.getDate() === +m[1] && d.getMonth() === +m[2] - 1 ? toYmd(d) : null;
}
const DRP = { key: null, from: null, to: null, view: null, anchor: null };
const DRP_PRESETS = [['bulan_ini', 'Bulan ini'], ['bulan_lalu', 'Bulan lalu'], ['30_hari', '30 hari terakhir'], ['3_bulan', '3 bulan terakhir'], ['6_bulan', '6 bulan terakhir'], ['tahun_ini', 'Tahun ini'], ['tahun_lalu', 'Tahun lalu']];
/** Setelah rentang dipilih: global = periode keuangan; lainnya = filter per halaman. */
const DRP_APPLY = {
  tagihan: () => renderTagihan(), inventaris: () => renderInventaris(), anggota: () => { S.ui.agt.page = 1; renderAnggota(); },
  tabungan: () => renderTabungan(), peminjaman: () => { S.ui.pjm.page = 1; renderPeminjaman(); },
  gathering: () => renderGathering()
};
const drpGet = (key) => (key === 'global' ? S.range : S.ui.dr[key] || null);
const drpLabel = (key) => { const r = drpGet(key); return r ? dmy(r.from) + ' – ' + dmy(r.to) : 'Semua tanggal'; };
/** Cocok dengan filter halaman? (tanggal 'yyyy-mm' dibandingkan per bulan) */
function inDr(key, d) {
  const r = S.ui.dr[key]; if (!r) return true; if (!d) return false;
  d = String(d);
  if (d.length === 7) return d >= r.from.slice(0, 7) && d <= r.to.slice(0, 7);
  return d.slice(0, 10) >= r.from && d.slice(0, 10) <= r.to;
}
function drpButton(key, label) {
  const r = drpGet(key), clearable = key !== 'global' && key !== 'portal' && r;
  return `<div class="drp-host"><button type="button" class="range-btn drp-btn${r && key !== 'global' && key !== 'portal' ? ' active' : ''}" onclick="openDrp('${key}', this)" title="Filter rentang tanggal">
    <i class="bi bi-calendar-range"></i>${label ? `<span class="hide-sm">${label}:</span>` : ''}<span class="mono">${drpLabel(key)}</span>
    ${clearable ? `<i class="bi bi-x-circle drp-clear" role="button" aria-label="Hapus filter tanggal" onclick="event.stopPropagation();drpClear('${key}')"></i>` : '<i class="bi bi-chevron-down small"></i>'}</button></div>`;
}
function drpClear(key) { delete S.ui.dr[key]; closeDrp(); DRP_APPLY[key](); }
function openDrp(key, btn) {
  closePopovers();
  const r = drpGet(key);
  DRP.key = key; DRP.from = r ? r.from : null; DRP.to = r ? r.to : null; DRP.anchor = btn;
  const base = parseYmd(DRP.to || todayStr());
  DRP.view = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  renderDrp(); positionDrp();
}
function closeDrp() { const p = document.getElementById('drp-pop'); if (p) p.hidden = true; }
function positionDrp() {
  const pop = $('#drp-pop'); pop.hidden = false;
  if (window.innerWidth <= 720 || !DRP.anchor || !document.contains(DRP.anchor)) { pop.style.left = ''; pop.style.top = ''; return; }
  const b = DRP.anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  let left = b.left; if (left + w > window.innerWidth - 12) left = b.right - w;
  left = Math.max(12, left);
  let top = b.bottom + 8; if (top + h > window.innerHeight - 12) top = Math.max(12, b.top - h - 8);
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
}
function drpMonth(y, m, idx) {
  const start = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), t = todayStr();
  let cells = HARI.map((h) => `<span class="dow">${h}</span>`).join('');
  for (let i = 0; i < start; i++) cells += '<button type="button" class="other" tabindex="-1" aria-hidden="true"></button>';
  for (let d = 1; d <= days; d++) {
    const ds = y + '-' + pad(m + 1) + '-' + pad(d), c = [];
    if (ds === t) c.push('today');
    if (DRP.from && ds === DRP.from) c.push('s');
    if (DRP.to && ds === DRP.to) c.push('e');
    if (DRP.from && DRP.to && ds > DRP.from && ds < DRP.to) c.push('inr');
    cells += `<button type="button" class="${c.join(' ')}" data-d="${ds}" onclick="drpPick('${ds}')" onmouseenter="drpHover('${ds}')">${d}</button>`;
  }
  const years = []; for (let yy = new Date().getFullYear() + 3; yy >= 2010; yy--) years.push(yy);
  const head = idx === 0
    ? `<button type="button" class="btn-icon sm" onclick="drpNav(-1)" aria-label="Bulan sebelumnya"><i class="bi bi-chevron-left"></i></button>
       <div class="row" style="gap:4px"><select aria-label="Bulan" onchange="drpJump(this.value, null)">${BULAN.map((b, i) => `<option value="${i}" ${i === m ? 'selected' : ''}>${b}</option>`).join('')}</select>
       <select aria-label="Tahun" onchange="drpJump(null, this.value)">${years.map((yy) => `<option ${yy === y ? 'selected' : ''}>${yy}</option>`).join('')}</select></div>
       <button type="button" class="btn-icon sm" onclick="drpNav(1)" aria-label="Bulan berikutnya"><i class="bi bi-chevron-right"></i></button>`
    : `<span></span><b>${BULAN[m]} ${y}</b><span></span>`;
  return `<div><div class="drp-head">${head}</div><div class="drp-grid">${cells}</div></div>`;
}
function renderDrp() {
  const v = DRP.view, v2 = new Date(v.getFullYear(), v.getMonth() + 1, 1);
  const presets = (DRP.key === 'global' || DRP.key === 'portal' ? [] : [['semua', 'Semua tanggal']]).concat(DRP_PRESETS);
  const days = DRP.from && DRP.to ? daysBetween(DRP.from, DRP.to) + 1 : 0;
  $('#drp-pop').innerHTML = `<div class="drp-body"><div class="drp-presets">${presets.map(([k, l]) => `<button type="button" onclick="drpPreset('${k}')">${l}</button>`).join('')}</div>
    <div class="drp-cals">${drpMonth(v.getFullYear(), v.getMonth(), 0)}${drpMonth(v2.getFullYear(), v2.getMonth(), 1)}</div></div>
    <div class="drp-foot"><div class="drp-inputs"><input class="input" id="drp-f" placeholder="dd-mm-yyyy" value="${dmy(DRP.from)}" onchange="drpType()" aria-label="Tanggal awal">
      <span class="muted">–</span><input class="input" id="drp-t" placeholder="dd-mm-yyyy" value="${dmy(DRP.to)}" onchange="drpType()" aria-label="Tanggal akhir"></div>
      <span class="drp-sum">${days ? days + ' hari dipilih' : DRP.from ? 'Pilih tanggal akhir' : 'Klik tanggal awal'}</span>
      <div class="row"><button type="button" class="btn btn-ghost btn-sm" onclick="closeDrp()">Batal</button><button type="button" class="btn btn-primary btn-sm" onclick="drpApply()" ${DRP.from ? '' : 'disabled'}>Terapkan</button></div></div>`;
}
function drpPick(ds) {
  if (!DRP.from || DRP.to) { DRP.from = ds; DRP.to = null; }
  else if (ds < DRP.from) DRP.from = ds;
  else DRP.to = ds;
  renderDrp();
}
function drpHover(ds) {
  if (!DRP.from || DRP.to) return;
  $$('#drp-pop .drp-grid button[data-d]').forEach((b) => { const d = b.dataset.d; b.classList.toggle('inr', d > DRP.from && d <= ds); });
}
function drpNav(n) { DRP.view = new Date(DRP.view.getFullYear(), DRP.view.getMonth() + n, 1); renderDrp(); }
function drpJump(m, y) { DRP.view = new Date(y === null ? DRP.view.getFullYear() : +y, m === null ? DRP.view.getMonth() : +m, 1); renderDrp(); }
function drpType() {
  const f = parseDmy($('#drp-f').value), t = parseDmy($('#drp-t').value);
  if ($('#drp-f').value && !f) { toast('Format tanggal awal: dd-mm-yyyy', 'warning'); return; }
  if ($('#drp-t').value && !t) { toast('Format tanggal akhir: dd-mm-yyyy', 'warning'); return; }
  DRP.from = f; DRP.to = t;
  if (f && t && f > t) { DRP.from = t; DRP.to = f; }
  if (DRP.from) { const b = parseYmd(DRP.to || DRP.from); DRP.view = new Date(b.getFullYear(), b.getMonth() - 1, 1); }
  renderDrp();
}
function drpPreset(k) {
  if (k === 'semua') { drpClear(DRP.key); return; }
  const r = computePreset(k); DRP.from = r.from; DRP.to = r.to; drpApply(k);
}
function drpApply(preset) {
  if (!DRP.from) return;
  if (!DRP.to) DRP.to = DRP.from;
  const key = DRP.key, r = { from: DRP.from, to: DRP.to };
  closeDrp();
  if (key === 'global') setRange(r.from, r.to, typeof preset === 'string' ? preset : 'custom');
  else { S.ui.dr[key] = r; DRP_APPLY[key](); }
}

// ════════════════ NOTIFIKASI (lonceng) ════════════════
function updateBell() {
  const n = dueBills().length + (can('gathering') ? dueGathering().length : 0);
  const c = $('#bell-count'); c.hidden = !n; c.textContent = n;
  renderNav();
}
function renderNotifPop() {
  const list = dueBills();
  $('#notif-pop').innerHTML = `<div class="row-between" style="padding:14px 16px;border-bottom:1px solid var(--border)"><strong>Tagihan mendekati jatuh tempo</strong><span class="chip chip-warn">${list.length}</span></div>
    ${list.length ? list.slice(0, 6).map((b) => { const l = billLabel(b); return `<div class="notif-item"><span class="kpi-ico ico-warn" style="width:36px;height:36px"><i class="bi bi-receipt"></i></span>
      <div style="flex:1;min-width:0"><div class="row-between"><b class="ellipsis">${esc(b.nama)}</b><span class="chip ${l.cls}">${l.txt}</span></div>
      <div class="mono small muted">${fmtRp(b.jumlah)} · ${fmtDate(b.jatuh_tempo)}</div></div></div>`; }).join('')
    : '<div class="empty"><i class="bi bi-check2-circle"></i>Tidak ada tagihan dalam 7 hari ke depan.</div>'}
    <div style="padding:10px 16px;border-top:1px solid var(--border)">${navLink('tagihan', `<button class="link" onclick="go('tagihan')">Kelola semua tagihan <i class="bi bi-arrow-right"></i></button>`)}</div>`;
  const gl = can('gathering') ? dueGathering() : [];
  if (gl.length) {
    $('#notif-pop').insertAdjacentHTML('beforeend', `<div class="row-between" style="padding:14px 16px;border-top:1px solid var(--border);border-bottom:1px solid var(--border)"><strong>Iuran gathering belum lunas</strong><span class="chip chip-out">${gl.length}</span></div>
      ${gl.slice(0, 5).map((g) => { const st = gatState(g); return `<div class="notif-item"><span class="kpi-ico ico-out" style="width:36px;height:36px"><i class="bi bi-balloon-heart"></i></span>
        <div style="flex:1;min-width:0"><div class="row-between"><b class="ellipsis">${esc(g.nama)}</b><span class="chip ${st.dueCls}">${st.due}</span></div>
        <div class="mono small muted">${fmtRp(g.nominal)} · ${esc(g.acara || 'Gathering')}</div></div></div>`; }).join('')}
      <div style="padding:10px 16px;border-top:1px solid var(--border)"><button class="link" onclick="S.ui.gat.tab='belum';go('gathering')">Kelola iuran gathering <i class="bi bi-arrow-right"></i></button></div>`);
  }
}

// ════════════════ MODAL, TOAST, KONFIRMASI ════════════════
let modalOnClose = null;
function openModal(o) {
  $('#modal-title').textContent = o.title || '';
  $('#modal-body').innerHTML = o.body || '';
  $('#modal-foot').innerHTML = o.foot || '';
  const m = $('.modal'); m.className = 'modal' + (o.size ? ' ' + o.size : '');
  $('#modal-root').hidden = false; modalOnClose = o.onClose || null;
  setTimeout(() => { const f = $('#modal-body [autofocus], #modal-body input:not([type=hidden]):not([type=file]), #modal-body select'); if (f && window.innerWidth > 767) f.focus(); }, 30);
}
function closeModal() {
  $('#modal-root').hidden = true; $('#modal-body').innerHTML = '';
  if (modalOnClose) { const f = modalOnClose; modalOnClose = null; f(); }
}
function toast(msg, type, title) {
  type = type || 'info';
  const ic = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }[type];
  const el = document.createElement('div');
  el.className = 'toast ' + type; el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `<i class="bi ${ic}"></i><div>${title ? `<strong>${esc(title)}</strong>` : ''}<p style="color:var(--text)">${esc(msg)}</p></div>`;
  $('#toast-root').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, type === 'error' ? 6000 : 3200);
}
function confirmDlg(msg, o) {
  o = o || {};
  return new Promise((res) => {
    let answered = false;
    openModal({ title: o.title || 'Konfirmasi', size: 'sm', body: `<p>${esc(msg)}</p>${o.extra || ''}`,
      foot: `<button class="btn btn-secondary" id="cf-no">Batal</button><button class="btn ${o.danger ? 'btn-danger' : 'btn-primary'}" id="cf-yes">${esc(o.ok || 'Ya')}</button>`,
      onClose: () => { if (!answered) res(false); } });
    $('#cf-no').onclick = () => { answered = true; closeModal(); res(false); };
    $('#cf-yes').onclick = () => { answered = true; closeModal(); res(true); };
  });
}

// ════════════════ FORM BUILDER ════════════════
/**
 * Field: { k, label, type, opts:[[val,label]], req, full, hint, show:(rec)=>bool, ph, kind, accept }
 * type: text|number|money|date|month|select|textarea|color|icon|check|checks|file|seg
 */
function buildForm(fields, rec) {
  rec = rec || {};
  return `<form id="dyn-form" class="form-grid" novalidate onsubmit="return false">${fields.map((f) => fieldHtml(f, rec)).join('')}</form>`;
}
function fieldHtml(f, rec) {
  const v = rec[f.k] === undefined || rec[f.k] === null ? (f.def !== undefined ? f.def : '') : rec[f.k];
  const hidden = f.show && !f.show(rec) ? ' hidden' : '';
  const lab = `<span>${esc(f.label)}${f.req ? ' <b class="req">*</b>' : ''}</span>`;
  const hint = f.hint ? `<small class="field-hint">${f.hint}</small>` : '';
  const cls = 'field' + (f.full ? ' full' : '');
  const id = 'f_' + f.k;
  switch (f.type) {
    case 'seg':
      return `<div class="${cls}" data-f="${f.k}"${hidden}>${lab}<div class="seg light" role="radiogroup">${f.opts.map(([val, l]) =>
        `<button type="button" class="${String(v) === String(val) ? 'on' : ''}" data-val="${esc(val)}" onclick="segPick(this)">${l}</button>`).join('')}</div>
        <input type="hidden" name="${f.k}" value="${esc(v)}">${hint}</div>`;
    case 'select': {
      const opts = typeof f.opts === 'function' ? f.opts(rec) : f.opts;
      return `<label class="${cls}" data-f="${f.k}"${hidden}>${lab}<select id="${id}" name="${f.k}" class="select" ${f.req ? 'required' : ''} onchange="formReflow()">
        ${f.ph !== undefined ? `<option value="">${esc(f.ph)}</option>` : ''}${opts.map(([val, l]) => `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}
        </select>${hint}</label>`;
    }
    case 'textarea':
      return `<label class="${cls}" data-f="${f.k}"${hidden}>${lab}<textarea id="${id}" name="${f.k}" class="textarea" placeholder="${esc(f.ph || '')}" maxlength="1000">${esc(v)}</textarea>${hint}</label>`;
    case 'money':
      return `<label class="${cls}" data-f="${f.k}"${hidden}>${lab}<div class="input-wrap has-prefix"><span class="prefix">Rp</span>
        <input id="${id}" name="${f.k}" class="input" inputmode="numeric" autocomplete="off" value="${v === '' ? '' : fmtNum(v)}" ${f.req ? 'required' : ''} oninput="moneyInput(this)" placeholder="0"></div>${hint}</label>`;
    case 'check':
      return `<label class="${cls} check" data-f="${f.k}"${hidden} style="flex-direction:row"><input type="checkbox" name="${f.k}" ${String(v) === 'true' || v === true ? 'checked' : ''} onchange="formReflow()"> ${esc(f.label)}</label>`;
    case 'checks': {
      const set = String(v).split(',').map((s) => s.trim());
      return `<div class="${cls}" data-f="${f.k}"${hidden}>${lab}<div class="row" style="flex-wrap:wrap;gap:14px">${f.opts.map(([val, l]) =>
        `<label class="check"><input type="checkbox" data-multi="${f.k}" value="${esc(val)}" ${set.indexOf(String(val)) >= 0 ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div>${hint}</div>`;
    }
    case 'color':
      return `<div class="${cls}" data-f="${f.k}"${hidden}>${lab}<div class="row"><input type="color" class="color-input" name="${f.k}" value="${esc(v || '#6247EA')}">
        <div class="swatches">${PALETTE.map((c) => `<button type="button" class="swatch" style="background:${c}" onclick="this.closest('.field').querySelector('input').value='${c}'" aria-label="Warna ${c}"></button>`).join('')}</div></div></div>`;
    case 'icon':
      return `<div class="${cls} full" data-f="${f.k}"${hidden}>${lab}<input type="hidden" name="${f.k}" value="${esc(v || ICONS[0])}">
        <div class="swatches">${ICONS.map((ic) => `<button type="button" class="swatch btn-icon ${ic === (v || ICONS[0]) ? 'on' : ''}" style="width:38px;height:38px;background:var(--surface-2)" onclick="iconPick(this,'${ic}')" aria-label="${ic}"><i class="bi ${ic}"></i></button>`).join('')}</div></div>`;
    case 'file': {
      const has = rec[f.idKey || 'id_bukti'] || rec[f.linkKey || 'link_bukti'];
      return `<div class="${cls}" data-f="${f.k}"${hidden}>${lab}<label class="file-drop" id="drop_${f.k}">
        <input type="file" accept="${f.accept || 'image/jpeg,image/png,image/webp,image/gif,image/heic,application/pdf'}" ${f.capture ? 'capture="environment"' : ''} onchange="fileChosen(this,'${f.k}','${f.kind}')">
        <span class="thumb-sm" id="thumb_${f.k}">${f.kind === 'inventaris' && rec.thumbnail ? `<img src="${esc(rec.thumbnail)}" alt="">` : '<i class="bi bi-cloud-arrow-up"></i>'}</span>
        <div style="flex:1;min-width:0"><b id="fname_${f.k}">${has ? 'Berkas terlampir · ganti?' : 'Pilih atau foto berkas'}</b>
        <div class="field-hint" id="fstat_${f.k}">${f.hint || 'JPG/PNG/PDF · foto dikompres otomatis'}</div></div></label></div>`;
    }
    default:
      return `<label class="${cls}" data-f="${f.k}"${hidden}>${lab}<input id="${id}" name="${f.k}" class="input${f.type === 'number' ? ' mono' : ''}" type="${f.type || 'text'}"
        value="${esc(v)}" placeholder="${esc(f.ph || '')}" ${f.req ? 'required' : ''} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} ${f.auto ? `autocomplete="${f.auto}"` : 'autocomplete="off"'}${f.list && f.list.length ? ` list="dl_${f.k}"` : ''}>${f.list && f.list.length ? `<datalist id="dl_${f.k}">${f.list.slice(0, 500).map((o) => `<option value="${esc(o)}"></option>`).join('')}</datalist>` : ''}${hint}</label>`;
  }
}
let FORM = { fields: [], uploads: {} };
function segPick(btn) {
  const wrap = btn.closest('.field');
  $$('button', wrap).forEach((b) => b.classList.toggle('on', b === btn));
  $('input[type=hidden]', wrap).value = btn.dataset.val;
  formReflow();
}
function iconPick(btn, ic) {
  const wrap = btn.closest('.field');
  $$('.swatch', wrap).forEach((b) => b.classList.toggle('on', b === btn));
  $('input[type=hidden]', wrap).value = ic;
}
function moneyInput(el) {
  const pos = el.value.length - el.selectionStart;
  const n = el.value.replace(/\D/g, '');
  el.value = n ? fmtNum(n) : '';
  try { el.setSelectionRange(el.value.length - pos, el.value.length - pos); } catch (e) { }
}
function readForm() {
  const form = $('#dyn-form'); const out = {};
  FORM.fields.forEach((f) => {
    const wrap = $(`[data-f="${f.k}"]`, form);
    if (!wrap || wrap.hidden) return;
    if (f.type === 'checks') { out[f.k] = $$(`[data-multi="${f.k}"]`, form).filter((c) => c.checked).map((c) => c.value).join(','); return; }
    if (f.type === 'file') return;
    const el = form.elements[f.k]; if (!el) return;
    if (f.type === 'check') out[f.k] = el.checked ? 'true' : 'false';
    else if (f.type === 'money') out[f.k] = parseMoney(el.value);
    else if (f.type === 'number') out[f.k] = el.value === '' ? '' : num(el.value);
    else out[f.k] = el.value.trim();
  });
  return out;
}
function formReflow() {
  const cur = readFormRaw();
  FORM.fields.forEach((f) => {
    const wrap = $(`#dyn-form [data-f="${f.k}"]`); if (!wrap) return;
    if (f.show) wrap.hidden = !f.show(cur);
    if (f.type === 'select' && typeof f.opts === 'function') {
      const sel = wrap.querySelector('select'), keep = sel.value;
      const opts = f.opts(cur);
      sel.innerHTML = (f.ph !== undefined ? `<option value="">${esc(f.ph)}</option>` : '') + opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
      if (opts.some(([v]) => String(v) === keep)) sel.value = keep;
    }
  });
  if (FORM.onChange) FORM.onChange(cur);
}
function readFormRaw() {
  const form = $('#dyn-form'); const o = {};
  if (!form) return o;
  Array.from(form.elements).forEach((el) => { if (el.name) o[el.name] = el.type === 'checkbox' ? (el.checked ? 'true' : 'false') : el.value; });
  return o;
}
function validateForm(data) {
  let okAll = true;
  $$('#dyn-form .field-error.auto').forEach((e) => e.remove());
  $$('#dyn-form .invalid').forEach((e) => e.classList.remove('invalid'));
  FORM.fields.forEach((f) => {
    const wrap = $(`#dyn-form [data-f="${f.k}"]`);
    if (!f.req || !wrap || wrap.hidden) return;
    const v = data[f.k];
    const bad = v === '' || v === undefined || (f.type === 'money' && f.positive && !(v > 0));
    if (bad) {
      okAll = false;
      const inp = $('input,select,textarea', wrap); if (inp) inp.classList.add('invalid');
      wrap.insertAdjacentHTML('beforeend', `<small class="field-error auto">${esc(f.label)} wajib diisi${f.positive ? ' (lebih dari 0)' : ''}.</small>`);
    }
  });
  if (!okAll) { const first = $('#dyn-form .invalid'); if (first) first.focus(); }
  return okAll;
}

/** Form standar entitas → simpan optimistik. */
function openEntityForm(entity, title, fields, rec, opts) {
  opts = opts || {};
  FORM = { fields, uploads: {}, onChange: opts.onChange || null };
  const isEdit = rec && rec.id;
  openModal({
    title, size: opts.size,
    body: buildForm(fields, rec || {}),
    foot: `${isEdit && opts.canDelete !== false ? `<button class="btn btn-ghost t-out" style="margin-right:auto" onclick="deleteEntity('${entity}','${rec.id}')"><i class="bi bi-trash"></i>Hapus</button>` : ''}
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" id="btn-save"><i class="bi bi-check2"></i>Simpan</button>`
  });
  formReflow();
  $('#btn-save').onclick = async () => {
    const data = readForm();
    if (!validateForm(data)) return;
    if (opts.validate) { const msg = opts.validate(data); if (msg) { toast(msg, 'warning'); return; } }
    // Tunggu unggahan berkas yang masih berjalan
    const ups = Object.values(FORM.uploads);
    if (ups.some((u) => u.promise && !u.done)) {
      const b = $('#btn-save'); b.disabled = true; b.innerHTML = '<span class="spin"></span> Mengunggah…';
      await Promise.all(ups.map((u) => u.promise).filter(Boolean)).catch(() => { });
    }
    for (const u of ups) { if (u.error) { toast('Unggahan gagal: ' + u.error, 'error'); const b = $('#btn-save'); b.disabled = false; b.innerHTML = 'Simpan'; return; } if (u.apply) u.apply(data); }
    const full = Object.assign({}, rec || {}, data);
    if (opts.beforeSave) opts.beforeSave(full);
    closeModal();
    saveEntity(entity, full);
  };
}

/** Simpan optimistik: UI langsung berubah, server menyusul di antrean. */
function saveEntity(entity, rec) {
  const isNew = !rec.id || String(rec.id).indexOf('tmp_') === 0 && !findLocal(entity, rec.id);
  const prev = isNew ? null : clone(findLocal(entity, rec.id));
  const local = Object.assign({}, rec, { id: isNew ? tmpId() : rec.id, _pending: true });
  if (entity === 'Transaksi' && isNew) { local.dibuat_oleh = S.user.nama; local.dibuat_pada = new Date().toISOString().slice(0, 19); }
  upsertLocal(entity, local);
  afterLocalChange(entity);
  toast(isNew ? 'Data ditambahkan.' : 'Perubahan tersimpan.', 'success');
  return enqueue(() => {
    const payload = resolveIds(Object.assign({}, local));
    delete payload._pending;
    if (isNew) payload.id = local.id; // id tmp_ → server membuat id baru
    return api('saveRecord', S.token, entity, payload).then((res) => {
      const real = res.data.record;
      if (isNew) S.idMap[local.id] = real.id;
      replaceLocal(entity, local.id, real);
      S.meta.version = res.data.version;
      afterLocalChange(entity, true);
      return real;
    }).catch((e) => {
      if (isNew) removeLocal(entity, local.id); else replaceLocal(entity, rec.id, prev);
      afterLocalChange(entity); setSync('err');
      toast(e.message, 'error', 'Gagal menyimpan — perubahan dibatalkan');
      throw e;
    });
  });
}
function deleteEntity(entity, id) {
  const item = findLocal(entity, id); if (!item) return;
  confirmDlg('Hapus data ini? Tindakan tercatat di log aktivitas.', { ok: 'Hapus', danger: true }).then((yes) => {
    if (!yes) return;
    const backup = clone(item);
    removeLocal(entity, id); afterLocalChange(entity);
    enqueue(() => api('deleteRecord', S.token, entity, resolveIds({ id }).id).then((res) => {
      S.meta.version = res.data.version;
      if (res.data.deactivated) { upsertLocal(entity, res.data.record); afterLocalChange(entity); toast(res.message, 'warning'); }
      else toast('Data dihapus.', 'success');
    }).catch((e) => { upsertLocal(entity, backup); afterLocalChange(entity); toast(e.message, 'error', 'Gagal menghapus'); }));
  });
}
const findLocal = (entity, id) => S.db[entity].find((r) => r.id === id || S.idMap[id] === r.id);
function upsertLocal(entity, rec) {
  const i = S.db[entity].findIndex((r) => r.id === rec.id);
  if (i >= 0) S.db[entity][i] = rec; else S.db[entity].push(rec);
}
function replaceLocal(entity, id, rec) {
  const i = S.db[entity].findIndex((r) => r.id === id || (S.idMap[id] && r.id === S.idMap[id]));
  if (!rec) { if (i >= 0) S.db[entity].splice(i, 1); return; }
  if (i >= 0) S.db[entity][i] = rec; else S.db[entity].push(rec);
  // Perbarui referensi id sementara di entitas lain
  if (id !== rec.id) ENTITIES.forEach((n) => S.db[n].forEach((r) => Object.keys(r).forEach((k) => { if (r[k] === id) r[k] = rec.id; })));
}
function removeLocal(entity, id) { S.db[entity] = S.db[entity].filter((r) => r.id !== id); }
function afterLocalChange(entity, quiet) {
  invalidate();
  S.portalStale = true;
  markDirty(DIRTY_BY_ENTITY[entity] || []);
  if (entity === 'Tagihan' || entity === 'Kategori' || entity === 'Gathering') updateBell();
  saveSnapshot();
}

// ════════════════ UNGGAH & PRATINJAU BERKAS ════════════════
function fileChosen(input, key, kind) {
  const file = input.files && input.files[0]; if (!file) return;
  if (file.size > 15 * 1024 * 1024) { toast('Berkas maksimal 15 MB.', 'warning'); return; }
  const stat = $('#fstat_' + key), name = $('#fname_' + key), th = $('#thumb_' + key);
  name.textContent = file.name; stat.innerHTML = '<span class="spin" style="width:12px;height:12px"></span> Mengompres & mengunggah…';
  const u = { done: false };
  u.promise = prepareFile(file, kind).then((p) => {
    if (p.preview) th.innerHTML = `<img src="${p.preview}" alt="">`;
    return api('uploadFile', S.token, { kind: kind, name: file.name, mime: p.mime, data: p.data, thumb: p.thumb });
  }).then((res) => {
    u.done = true; u.result = res.data; stat.innerHTML = '<i class="bi bi-check-circle-fill t-in"></i> Terunggah ke Google Drive';
    u.apply = (data) => {
      if (kind === 'inventaris') { data.id_foto = res.data.id; data.link_foto = res.data.url; data.thumbnail = res.data.thumbUrl; }
      else if (kind === 'logo') { data.link_logo = res.data.thumbUrl || res.data.url; }
      else { data.id_bukti = res.data.id; data.link_bukti = res.data.url; }
    };
  }).catch((e) => { u.done = true; u.error = e.message; stat.innerHTML = `<span class="t-out">${esc(e.message)}</span>`; });
  FORM.uploads[key] = u;
}
/** Kompres gambar di klien (maks 1600px, JPEG 0.8) + thumbnail 480px. PDF dikirim apa adanya. */
function prepareFile(file, kind) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].indexOf(file.type) < 0) {
      reader.onload = () => resolve({ mime: file.type || 'application/pdf', data: String(reader.result).split(',')[1], thumb: null, preview: null });
      reader.readAsDataURL(file); return;
    }
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const draw = (max, q, type) => {
          const r = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
          const ctx = c.getContext('2d'); if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, 0, 0, c.width, c.height); return c.toDataURL(type, q);
        };
        const keepPng = kind === 'logo' && file.type === 'image/png';
        const main = draw(kind === 'logo' ? 512 : 1600, 0.82, keepPng ? 'image/png' : 'image/jpeg');
        const thumb = draw(kind === 'logo' ? 160 : 480, 0.72, 'image/jpeg');
        resolve({ mime: keepPng ? 'image/png' : 'image/jpeg', data: main.split(',')[1], thumb: thumb.split(',')[1], preview: thumb, thumbDataUrl: thumb });
      };
      img.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function previewFile(fileId, title) {
  if (!fileId) return;
  openModal({ title: title || 'Pratinjau berkas', size: 'wide', body: '<div class="sk" style="height:60vh"></div>' });
  api('getFilePreview', S.token, fileId).then((res) => {
    const d = res.data;
    if (d.tooLarge) { $('#modal-body').innerHTML = `<div class="empty"><i class="bi bi-file-earmark"></i><strong>Berkas besar</strong>Buka langsung di Google Drive.</div>`; }
    else {
      const blob = b64ToBlob(d.data, d.mime), url = URL.createObjectURL(blob);
      $('#modal-body').innerHTML = String(d.mime).indexOf('image') === 0 ? `<img class="preview-img" src="${url}" alt="${esc(d.name)}">` : `<iframe class="preview-frame" src="${url}" title="${esc(d.name)}"></iframe>`;
      modalOnClose = () => URL.revokeObjectURL(url);
      $('#modal-foot').innerHTML = `<a class="btn btn-secondary" href="${esc(d.url)}" target="_blank" rel="noopener"><i class="bi bi-google"></i>Buka di Drive</a>
        <button class="btn btn-primary" id="pv-dl"><i class="bi bi-download"></i>Unduh</button>`;
      $('#pv-dl').onclick = () => downloadBlob(blob, d.name);
    }
    if (d.tooLarge) $('#modal-foot').innerHTML = `<a class="btn btn-primary" href="${esc(d.url)}" target="_blank" rel="noopener">Buka di Drive</a>`;
  }).catch((e) => { $('#modal-body').innerHTML = `<div class="empty"><i class="bi bi-exclamation-octagon"></i>${esc(e.message)}</div>`; });
}
function b64ToBlob(b64, mime) {
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function downloadBlob(blob, name) {
  const a = $('#dl-anchor'); const url = URL.createObjectURL(blob);
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ════════════════ GRAFIK (Chart.js) & SPARKLINE ════════════════
function destroyChart(k) { if (S.charts[k]) { S.charts[k].destroy(); delete S.charts[k]; } }
function mkChart(key, canvasId, cfg) {
  destroyChart(key);
  const el = document.getElementById(canvasId);
  if (!el || !window.Chart) return; // digambar otomatis saat Chart.js selesai dimuat
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.color = dark ? '#8C99B3' : '#64748B';
  Chart.defaults.borderColor = dark ? '#243149' : '#EEF2F7';
  S.charts[key] = new Chart(el, cfg);
}
const tooltipRp = { callbacks: { label: (c) => ' ' + (c.dataset.label ? c.dataset.label + ': ' : (c.label ? c.label + ': ' : '')) + fmtRp(c.parsed.y !== undefined && c.chart.config.type !== 'doughnut' ? c.parsed.y : c.parsed) } };
function donutCfg(labels, data, colors) {
  return { type: 'doughnut', data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 3, borderColor: cssVar('--surface'), hoverOffset: 6 }] },
    options: { cutout: '68%', responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: tooltipRp }, animation: { duration: 350 } } };
}
function sparkSvg(values, color) {
  if (!values.length || values.every((v) => v === values[0])) values = values.concat([values[0] || 0]).map((v, i) => v + i * 0.0001);
  const w = 300, h = 40, max = Math.max(...values), min = Math.min(...values), rng = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 6 - ((v - min) / rng) * (h - 12)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const gid = 'g' + Math.random().toString(36).slice(2, 7);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="${color}" stop-opacity=".22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L${w} ${h} L0 ${h} Z" fill="url(#${gid})"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round"/></svg>`;
}
function deltaChip(cur, prev, invert) {
  if (!prev) return '<span class="chip chip-mute">Baru</span>';
  const p = ((cur - prev) / Math.abs(prev)) * 100;
  const good = invert ? p <= 0 : p >= 0;
  return `<span class="chip ${good ? 'chip-in' : 'chip-out'}"><i class="bi ${p >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}"></i>${fmtPct(Math.abs(p))}</span>`;
}

// ════════════════ UI BERSAMA ════════════════
const canW = (pg) => can(pg || S.current, 2);
function pageHead(crumb, title, desc, actions) {
  return `<div class="page-head"><div><div class="crumb">Dasbor / <b>${esc(crumb)}</b></div><h1>${esc(title)}</h1>${desc ? `<p>${desc}</p>` : ''}</div>
    <div class="page-actions">${actions || ''}</div></div>`;
}
function jenisChip(j) {
  if (j === 'Masuk') return '<span class="chip chip-in"><i class="bi bi-arrow-up"></i>MASUK</span>';
  if (j === 'Keluar') return '<span class="chip chip-out"><i class="bi bi-arrow-down"></i>KELUAR</span>';
  return '<span class="chip chip-trf"><i class="bi bi-arrow-left-right"></i>TRANSFER</span>';
}
function katChip(t) {
  if (t.jenis === 'Transfer') return '<span class="chip chip-cat chip-trf">Transfer Kas</span>';
  const k = katOf(t.id_kategori);
  return `<span class="chip chip-cat" style="background:color-mix(in srgb, ${k.warna} 14%, transparent);color:color-mix(in srgb, ${k.warna} 80%, var(--text))">${esc(k.nama)}</span>`;
}
function amountCell(t) {
  const cls = t.jenis === 'Masuk' ? 't-in' : t.jenis === 'Keluar' ? 't-out' : 't-trf';
  const sign = t.jenis === 'Masuk' ? '+' : t.jenis === 'Keluar' ? '-' : '';
  return `<span class="mono ${cls}" style="font-weight:600">${sign}${fmtRp(t.jumlah)}</span>`;
}
function dompetCell(t) {
  if (t.jenis === 'Transfer') return `<span class="nowrap">${esc(dompetName(t.id_dompet))} <i class="bi bi-arrow-right muted"></i> ${esc(dompetName(t.id_dompet_tujuan))}</span>`;
  return `<span class="nowrap"><i class="bi ${dompetIcon(dompetMap()[t.id_dompet])} muted"></i> ${esc(dompetName(t.id_dompet))}</span>`;
}
const dompetIcon = (d) => ({ Rekening: 'bi-bank', 'E-wallet': 'bi-qr-code', Tunai: 'bi-cash-stack' }[(d || {}).jenis] || 'bi-wallet2');
const emptyState = (icon, title, sub, action) => `<div class="empty"><i class="bi ${icon}"></i><strong>${esc(title)}</strong>${sub ? esc(sub) : ''}${action ? `<div class="mt-16">${action}</div>` : ''}</div>`;
function pager(total, page, size, onPage) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return '';
  const btn = (p, l, on) => `<button class="${on ? 'on' : ''}" onclick="${onPage}(${p})" ${p < 1 || p > pages ? 'disabled' : ''}>${l}</button>`;
  const list = [];
  for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - page) <= 1) list.push(p); else if (list[list.length - 1] !== '…') list.push('…');
  return `<div class="pager">${btn(page - 1, '<i class="bi bi-chevron-left"></i>')}${list.map((p) => p === '…' ? '<span class="muted">…</span>' : btn(p, p, p === page)).join('')}${btn(page + 1, '<i class="bi bi-chevron-right"></i>')}</div>`;
}

// ════════════════ HALAMAN: RINGKASAN ════════════════
function renderRingkasan() {
  const { from, to } = S.range;
  const f = flows(from, to), pr = prevRange(from, to), fp = flows(pr.from, pr.to);
  const endYm = ym(to), series = monthSeries(endYm, 6);
  const budPeriod = ym(to), bud = budgetRows(budPeriod);
  const budLim = bud.reduce((a, b) => a + b.lim, 0), budUsed = bud.reduce((a, b) => a + b.used, 0);
  const total = totalKas(), doms = activeDompet(), sal = saldoMap();
  const outEntries = Object.entries(f.outKat).sort((a, b) => b[1] - a[1]);
  const top = outEntries.slice(0, 5), rest = outEntries.slice(5).reduce((a, e) => a + e[1], 0);
  const donutLabels = top.map(([k]) => katOf(k).nama).concat(rest ? ['Lainnya'] : []);
  const donutData = top.map((e) => e[1]).concat(rest ? [rest] : []);
  const donutColors = top.map(([k], i) => katOf(k).warna || PALETTE[i]).concat(rest ? ['#94A3B8'] : []);
  const recent = trxSorted().slice(0, 6);
  const bills = S.db.Tagihan.filter((b) => b.status !== 'Lunas').sort((a, b) => String(a.jatuh_tempo).localeCompare(b.jatuh_tempo)).slice(0, 3);
  const goals = S.db.Tabungan.slice().sort((a, b) => String(a.tanggal_target).localeCompare(b.tanggal_target));
  const goal = goals[0];

  $('#sec-ringkasan').innerHTML = `
  ${pageHead('Ringkasan', 'Ringkasan Keuangan', `Konsolidasi kas & anggaran ${esc(S.settings.subjudul || '')} · ${fmtDate(from)} – ${fmtDate(to)}`,
    `${drpButton('global', 'Periode')}${navLink('laporan', `<button class="btn btn-secondary" onclick="go('laporan')"><i class="bi bi-file-earmark-bar-graph"></i><span class="lbl">Laporan</span></button>`)}${rptMenu('ringkasan')}
     ${canW('transaksi') ? '<button class="btn btn-primary" onclick="openTransaksiForm()"><i class="bi bi-plus-lg"></i><span class="lbl">Catat Transaksi</span></button>' : ''}`)}
  <div class="grid g-4 g-kpi-m">
    <div class="card kpi has-spark"><div class="kpi-top"><span class="kpi-label">Total Pemasukan</span><span class="kpi-ico ico-in"><i class="bi bi-arrow-down-left"></i></span></div>
      <div class="kpi-value t-in"><span class="cur">Rp</span>${fmtNum(f.masuk)}</div>
      <div class="kpi-foot">${deltaChip(f.masuk, fp.masuk)}<span>vs periode lalu</span></div>${sparkSvg(series.map((s) => s.masuk), cssVar('--in'))}</div>
    <div class="card kpi has-spark"><div class="kpi-top"><span class="kpi-label">Total Pengeluaran</span><span class="kpi-ico ico-out"><i class="bi bi-arrow-up-right"></i></span></div>
      <div class="kpi-value t-out"><span class="cur">Rp</span>${fmtNum(f.keluar)}</div>
      <div class="kpi-foot">${deltaChip(f.keluar, fp.keluar, true)}<span>vs periode lalu</span></div>${sparkSvg(series.map((s) => s.keluar), cssVar('--out'))}</div>
    <div class="card kpi has-spark"><div class="kpi-top"><span class="kpi-label">Selisih Bersih</span><span class="kpi-ico ico-pri"><i class="bi bi-bank"></i></span></div>
      <div class="kpi-value ${f.net >= 0 ? 't-in' : 't-out'}">${f.net >= 0 ? '+' : '-'}<span class="cur">Rp</span>${fmtNum(Math.abs(f.net))}</div>
      <div class="kpi-foot"><span class="chip ${f.net >= 0 ? 'chip-in' : 'chip-out'}">${f.net >= 0 ? 'Surplus' : 'Defisit'} ${fmtPct(Math.abs(pct(f.net, f.masuk)))}</span></div>${sparkSvg(series.map((s) => s.net), cssVar('--accent'))}</div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Anggaran Terpakai</span><span class="kpi-ico ico-warn"><i class="bi bi-pie-chart"></i></span></div>
      <div class="kpi-value">${budLim ? fmtPct(pct(budUsed, budLim)) : '—'}</div>
      <div class="bar mt-8 ${pct(budUsed, budLim) > 100 ? 'over' : pct(budUsed, budLim) >= 85 ? 'warn' : ''}"><span style="width:${Math.min(100, pct(budUsed, budLim))}%"></span></div>
      <div class="kpi-foot mono">${budLim ? `${fmtShort(budUsed)} / ${fmtShort(budLim)} · ${BLN[Number(budPeriod.slice(5)) - 1]}` : navLink('anggaran', `<button class="link" onclick="go('anggaran')">Atur anggaran ${ymLabel(budPeriod)}</button>`)}</div></div>
  </div>

  <div class="row-between mt-24" style="margin-bottom:12px"><h3 style="font-size:18px"><i class="bi bi-bank2 t-primary"></i> Distribusi Saldo Dompet</h3>
    ${canW('dompet') ? '<button class="btn btn-soft btn-sm" onclick="openDompetForm()"><i class="bi bi-plus"></i>Tambah Dompet</button>' : ''}</div>
  <div class="card dist-strip">
    <div class="dist-total"><span class="caps" style="color:#A9B4CC">Total Kas · ${doms.length} dompet</span>
      <div class="big">${fmtRp(total, { mask: true })}</div>
      <span class="small" style="color:#A9B4CC"><i class="bi bi-check-circle t-in"></i> Dihitung dari saldo awal + mutasi</span></div>
    ${doms.length ? doms.map((d) => { const s = sal[d.id] || 0; return `<div class="dist-item" ${canNav('dompet') ? 'role="button" tabindex="0" onclick="go(\'dompet\')"' : ''}>
      <span class="chip chip-soft" style="align-self:flex-start">${esc(d.jenis)}</span><b>${esc(d.nama_dompet)}</b>
      <span class="mono small muted">${esc(d.no_rekening || d.keterangan || '-')}</span><span class="mono" style="font-weight:600">${fmtRp(s, { mask: true })}</span>
      <div class="bar"><span style="width:${Math.max(2, Math.min(100, pct(s, total)))}%"></span></div><span class="small muted mono">Porsi ${fmtPct(pct(s, total))}</span></div>`; }).join('')
      : `<div class="dist-item">${emptyState('bi-wallet2', 'Belum ada dompet', 'Tambahkan rekening/e-wallet/kas tunai.')}</div>`}
  </div>

  <div class="grid g-main mt-24">
    <div class="card card-pad"><div class="card-head"><div><h3>Pengeluaran per Kategori</h3><p>${fmtDate(from)} – ${fmtDate(to)}</p></div><span class="chip chip-soft">${f.nKeluar} transaksi</span></div>
      ${donutData.length ? `<div class="donut-wrap"><div class="chart-box"><canvas id="ch-donut" height="200"></canvas><div class="donut-center"><span class="small muted">Total Keluar</span><b>${fmtShort(f.keluar)}</b></div></div>
      <div class="legend">${donutLabels.map((l, i) => `<div class="legend-row" title="${esc(l)}: ${fmtRp(donutData[i])}"><span class="dot" style="background:${donutColors[i]}"></span><span class="ellipsis">${esc(l)}</span><span class="mono small nowrap">${fmtShort(donutData[i])} <span class="muted">· ${fmtPct(pct(donutData[i], f.keluar), 0)}</span></span></div>`).join('')}</div></div>
      <div class="callout"><i class="bi bi-star-fill t-primary"></i><span>Kategori terbesar: <b class="t-primary">${esc(donutLabels[0])}</b> (${fmtPct(pct(donutData[0], f.keluar))})</span></div>`
      : emptyState('bi-pie-chart', 'Belum ada pengeluaran', 'pada periode ini.')}
    </div>
    <div class="card card-pad"><div class="card-head"><div><h3>Tren Arus Kas</h3><p>Pemasukan vs pengeluaran 6 bulan terakhir</p></div>
      <div class="row small"><span class="row" style="gap:6px"><span class="dot" style="background:var(--in)"></span>Masuk</span><span class="row" style="gap:6px"><span class="dot" style="background:var(--primary)"></span>Keluar</span></div></div>
      <div class="chart-box" style="height:260px"><canvas id="ch-trend"></canvas></div>
      ${insightLine(series)}
    </div>
  </div>

  <div class="card card-pad mt-24"><div class="card-head"><div><h3>Status Anggaran ${ymLabel(budPeriod)}</h3><p>Batas pagu bulanan per pos kegiatan</p></div>
    ${navLink('anggaran', `<button class="link" onclick="go('anggaran')">Lihat semua <i class="bi bi-arrow-right"></i></button>`)}</div>
    ${bud.length ? `<div class="grid g-4 g-tight">${bud.slice(0, 4).map(budgetCard).join('')}</div>` : emptyState('bi-sliders', 'Belum ada anggaran bulan ini', '', canW('anggaran') ? `<button class="btn btn-soft btn-sm" onclick="go('anggaran')">Atur anggaran</button>` : '')}
  </div>

  <div class="grid g-side mt-24" style="grid-template-columns:minmax(0,1fr) minmax(0,2fr)">
    <div class="card card-pad"><div class="card-head"><div><h3>Tagihan & Kewajiban</h3><p>${dueBills().length} mendekati jatuh tempo</p></div>${dueBills().length ? `<span class="chip chip-warn">${dueBills().length} menunggu</span>` : ''}</div>
      <div class="stack" style="gap:10px">${bills.length ? bills.map((b) => { const l = billLabel(b); return `<div class="bill"><div class="row-between"><b>${esc(b.nama)}</b><span class="chip ${l.cls}">${l.txt}</span></div>
        <span class="small muted">Jatuh tempo: ${fmtDate(b.jatuh_tempo)}</span><div class="row-between"><span class="mono" style="font-weight:600">${fmtRp(b.jumlah)}</span>
        ${canW('tagihan') ? `<button class="btn ${daysBetween(todayStr(), b.jatuh_tempo) <= 3 ? 'btn-primary' : 'btn-soft'} btn-sm" onclick="openLunasForm('${b.id}')">Tandai Lunas</button>` : ''}</div></div>`; }).join('')
        : emptyState('bi-check2-circle', 'Tidak ada tagihan aktif')}</div>
      ${navLink('tagihan', `<button class="btn btn-soft btn-block mt-16" onclick="go('tagihan')">Kelola Semua Tagihan <i class="bi bi-chevron-right"></i></button>`)}
    </div>
    <div class="card"><div class="card-head card-pad" style="margin:0;padding-bottom:12px"><div><h3>Transaksi Terbaru</h3><p>Mutasi rekening & kas tunai</p></div>${navLink('transaksi', `<button class="link" onclick="go('transaksi')">Buka buku kas <i class="bi bi-arrow-right"></i></button>`)}</div>
      <div class="table-wrap">${recent.length ? trxTable(recent, true) : emptyState('bi-journal', 'Belum ada transaksi', '', canW('transaksi') ? '<button class="btn btn-primary btn-sm" onclick="openTransaksiForm()">Catat transaksi pertama</button>' : '')}</div>
    </div>
  </div>

  ${goal ? (() => { const p = goalProgress(goal), t = num(goal.target_jumlah); return `<div class="card goal-banner mt-24"><span class="kpi-ico"><i class="bi bi-shield-check"></i></span>
    <div style="flex:1;min-width:220px"><div class="row" style="gap:8px"><span class="chip chip-soft">Target Tabungan</span><span class="small muted">Target ${fmtDate(goal.tanggal_target)}</span></div>
    <h3 style="font-size:20px;margin:6px 0 10px">${esc(goal.nama_target)}</h3><div class="row"><div class="bar lg" style="flex:1;max-width:340px"><span style="width:${Math.min(100, pct(p, t))}%"></span></div>
    <span class="mono small"><b class="t-primary">${fmtRp(p)}</b> dari ${fmtRp(t)} (${fmtPct(pct(p, t), 0)})</span></div></div>
    <div class="row">${navLink('tabungan', `<button class="btn btn-secondary" onclick="go('tabungan')">Lihat Detail</button>`)}${canW('transaksi') ? `<button class="btn btn-primary" onclick="openSetorForm('${goal.id}')"><i class="bi bi-plus-circle"></i>Setor</button>` : ''}</div></div>`; })() : ''}
  `;
  if (donutData.length) mkChart('donut', 'ch-donut', donutCfg(donutLabels, donutData, donutColors));
  mkChart('trend', 'ch-trend', trendCfg(series));
}
function trendCfg(series) {
  const g = (c) => (ctx) => { const { chart } = ctx; const a = chart.chartArea; if (!a) return c; const gr = chart.ctx.createLinearGradient(0, a.top, 0, a.bottom); gr.addColorStop(0, c + '40'); gr.addColorStop(1, c + '00'); return gr; };
  const cin = cssVar('--in') || '#12A150', cout = cssVar('--primary') || '#6247EA';
  return { type: 'line', data: { labels: series.map((s) => s.label), datasets: [
    { label: 'Masuk', data: series.map((s) => s.masuk), borderColor: cin, backgroundColor: g(cin), fill: true, tension: .4, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5 },
    { label: 'Keluar', data: series.map((s) => s.keluar), borderColor: cout, backgroundColor: g(cout), fill: true, tension: .4, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5 }] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: tooltipRp },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => fmtShort(v) }, grid: { color: cssVar('--surface-3') } } } } };
}
function insightLine(series) {
  const cur = series[series.length - 1], avgNet = series.reduce((a, s) => a + s.net, 0) / series.length;
  const prev = series[series.length - 2] || { keluar: 0 };
  const chg = prev.keluar ? ((cur.keluar - prev.keluar) / prev.keluar) * 100 : 0;
  const good = avgNet >= 0;
  return `<div class="callout ${good ? '' : 'danger'}"><i class="bi ${good ? 'bi-graph-up-arrow t-in' : 'bi-graph-down-arrow t-out'}"></i>
    <span>Rata-rata ${good ? 'surplus' : 'defisit'} <b class="mono">${fmtRp(Math.abs(avgNet))}</b>/bulan. Pengeluaran bulan ini ${chg >= 0 ? 'naik' : 'turun'} <b>${fmtPct(Math.abs(chg))}</b> dibanding bulan lalu.</span></div>`;
}
function budgetCard(b) {
  const lbl = b.status === 'over' ? 'Melebihi' : b.status === 'full' ? 'Penuh' : b.status === 'warn' ? 'Kritis' : 'Aman';
  const cls = b.status === 'ok' ? 'chip-in' : b.status === 'warn' ? 'chip-warn' : 'chip-out';
  return `<div class="budget-card"><div class="row-between"><div class="row" style="gap:10px;min-width:0"><span class="cat-ico" style="background:color-mix(in srgb, ${b.kat.warna} 15%, transparent);color:${b.kat.warna}"><i class="bi ${b.kat.ikon}"></i></span>
    <b style="font-size:13px;line-height:1.3">${esc(b.kat.nama)}</b></div><span class="chip ${cls}">${fmtPct(b.p, 0)} ${lbl}</span></div>
    <div class="bar ${b.status === 'ok' ? '' : b.status === 'warn' ? 'warn' : 'over'}"><span style="width:${Math.min(100, b.p)}%"></span></div>
    <div class="budget-meta"><span>${fmtRp(b.used)}</span><span>Pagu ${fmtRp(b.lim)}</span></div></div>`;
}

// ════════════════ HALAMAN: TRANSAKSI ════════════════
function renderTransaksi() {
  const { from, to } = S.range, f = flows(from, to);
  const u = S.ui.trx;
  $('#sec-transaksi').innerHTML = `
  ${pageHead('Transaksi', 'Pencatatan Transaksi', 'Kelola seluruh mutasi uang masuk, keluar, dan pemindahan antar dompet secara transparan.',
    `${drpButton('global', 'Periode')}<button class="btn btn-secondary" onclick="exportExcel('transaksi')"><i class="bi bi-download"></i><span class="lbl">Ekspor Excel</span></button>${rptMenu('transaksi')}
     ${canW() ? '<button class="btn btn-secondary" onclick="openImport(\'transaksi\')"><i class="bi bi-file-earmark-arrow-up"></i><span class="lbl">Impor Excel</span></button><button class="btn btn-primary" onclick="openTransaksiForm()"><i class="bi bi-plus-circle"></i><span class="lbl">Catat Transaksi Baru</span></button>' : ''}`)}
  <div class="grid g-3">
    ${miniStat('Total Uang Masuk', f.masuk, 'ico-in', 'bi-arrow-down', 't-in', `${f.nMasuk} transaksi tercatat`, `<span class="chip chip-in">${ymLabel(ym(to)).toUpperCase()}</span>`)}
    ${miniStat('Total Uang Keluar', f.keluar, 'ico-out', 'bi-arrow-up', 't-out', `${f.nKeluar} transaksi beban`, `<span class="chip chip-out">${fmtPct(pct(f.keluar, f.masuk))} dari masuk</span>`)}
    ${miniStat('Selisih Bersih (Net)', f.net, 'ico-pri', 'bi-bank', f.net >= 0 ? 't-in' : 't-out', `<i class="bi bi-patch-check t-in"></i> Posisi likuiditas ${f.net >= 0 ? 'baik' : 'perlu perhatian'}`, `<span class="chip ${f.net >= 0 ? 'chip-in' : 'chip-out'}">${f.net >= 0 ? 'SURPLUS' : 'DEFISIT'}</span>`, true)}
  </div>
  <div class="card mt-24">
    <div class="filterbar">
      <div class="search"><i class="bi bi-search"></i><input class="input" placeholder="Cari keterangan, no. referensi…  ( / )" value="${esc(u.q)}" oninput="trxFilter('q', this.value)"></div>
      <select class="select" onchange="trxFilter('dompet', this.value)"><option value="">Semua Dompet</option>${S.db.Dompet.map((d) => `<option value="${d.id}" ${u.dompet === d.id ? 'selected' : ''}>${esc(d.nama_dompet)}</option>`).join('')}</select>
      <select class="select" onchange="trxFilter('kat', this.value)"><option value="">Semua Kategori</option>${S.db.Kategori.filter((k) => k.jenis !== 'Inventaris').map((k) => `<option value="${k.id}" ${u.kat === k.id ? 'selected' : ''}>${esc(k.nama)} (${k.jenis})</option>`).join('')}</select>
      <button class="btn btn-ghost btn-icon" title="Reset filter" onclick="S.ui.trx={q:'',dompet:'',kat:'',jenis:'',page:1,size:${u.size}};renderTransaksi()"><i class="bi bi-arrow-counterclockwise"></i></button>
    </div>
    <div class="row-between" style="padding:0 16px 16px;flex-wrap:wrap"><div class="seg" id="trx-seg"></div></div>
    <div id="trx-table"></div>
  </div>`;
  renderTrxTable();
}
function miniStat(label, value, ico, icon, cls, foot, chip, signed) {
  return `<div class="card kpi"><div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-ico ${ico}"><i class="bi ${icon}"></i></span></div>
    <div class="kpi-value ${cls}">${signed ? (value >= 0 ? '+' : '-') : ''}<span class="cur">Rp</span>${fmtNum(Math.abs(value))}</div>
    <div class="kpi-foot" style="justify-content:space-between;border-top:1px solid var(--border);padding-top:12px;margin-top:8px"><span class="mono">${foot}</span>${chip || ''}</div></div>`;
}
const trxFilter = debounce((k, v) => { S.ui.trx[k] = v; S.ui.trx.page = 1; renderTrxTable(); }, 150);
function filteredTrx() {
  const { from, to } = S.range, u = S.ui.trx, q = u.q.toLowerCase();
  return trxSorted().filter((t) => {
    const d = String(t.tanggal);
    if (d < from || d > to) return false;
    if (u.jenis && t.jenis !== u.jenis) return false;
    if (u.dompet && t.id_dompet !== u.dompet && t.id_dompet_tujuan !== u.dompet) return false;
    if (u.kat && t.id_kategori !== u.kat) return false;
    if (q && (String(t.keterangan) + ' ' + t.no_ref + ' ' + katOf(t.id_kategori).nama + ' ' + t.jumlah).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}
function renderTrxTable() {
  const u = S.ui.trx;
  const base = trxSorted().filter((t) => String(t.tanggal) >= S.range.from && String(t.tanggal) <= S.range.to);
  const c = { '': base.length, Masuk: 0, Keluar: 0, Transfer: 0 }; base.forEach((t) => c[t.jenis]++);
  $('#trx-seg').innerHTML = [['', 'Semua'], ['Masuk', 'Masuk'], ['Keluar', 'Keluar'], ['Transfer', 'Transfer']].map(([k, l]) =>
    `<button class="${u.jenis === k ? 'on' : ''}" onclick="S.ui.trx.jenis='${k}';S.ui.trx.page=1;renderTrxTable()">${k ? `<span class="dot" style="background:var(--${k === 'Masuk' ? 'in' : k === 'Keluar' ? 'out' : 'trf'})"></span>` : ''}${l} <span class="count">${c[k]}</span></button>`).join('');
  const list = filteredTrx(), start = (u.page - 1) * u.size, rows = list.slice(start, start + u.size);
  $('#trx-table').innerHTML = list.length ? `<div class="table-wrap">${trxTable(rows)}</div>
    <div class="tbl-foot"><span>Menampilkan <b>${start + 1}–${start + rows.length}</b> dari <b>${list.length}</b> transaksi · Net <b class="mono ${list.reduce((a, t) => a + (t.jenis === 'Masuk' ? 1 : t.jenis === 'Keluar' ? -1 : 0) * num(t.jumlah), 0) >= 0 ? 't-in' : 't-out'}">${fmtRp(list.reduce((a, t) => a + (t.jenis === 'Masuk' ? 1 : t.jenis === 'Keluar' ? -1 : 0) * num(t.jumlah), 0), { sign: true })}</b></span>
    <div class="row"><select class="select" style="width:auto;height:34px" onchange="S.ui.trx.size=Number(this.value);S.ui.trx.page=1;renderTrxTable()">${[10, 25, 50, 100].map((n) => `<option ${n === u.size ? 'selected' : ''} value="${n}">${n} / halaman</option>`).join('')}</select>
    ${pager(list.length, u.page, u.size, 'trxPage')}</div></div>`
    : emptyState('bi-search', 'Tidak ada transaksi', 'Ubah filter atau periode di pojok kanan atas.', canW() ? '<button class="btn btn-primary btn-sm" onclick="openTransaksiForm()">Catat transaksi</button>' : '');
}
function trxPage(p) { S.ui.trx.page = p; renderTrxTable(); $('#trx-table').scrollIntoView({ block: 'nearest' }); }
function trxTable(rows, compact) {
  return `<table class="tbl cards"><thead><tr><th>Tanggal</th><th>Keterangan & No. Ref</th><th>Kategori</th>${compact ? '' : '<th>Dompet</th><th>Jenis</th>'}<th class="num">Jumlah</th>${compact ? '' : '<th>Bukti</th><th></th>'}</tr></thead><tbody>
  ${rows.map((t) => `<tr class="${canW() ? 'clickable' : ''}" ${canW() && !compact ? `onclick="if(!event.target.closest('button,a'))openTransaksiForm('${t.id}')"` : ''} style="${t._pending ? 'opacity:.6' : ''}">
    <td data-m="full"><div class="mono small nowrap">${fmtDate(t.tanggal)}</div>${t.dibuat_pada && !compact ? `<div class="t-sub">${fmtTime(t.dibuat_pada)} WIB</div>` : ''}</td>
    <td><div class="t-main">${esc(t.keterangan || '(tanpa keterangan)')}</div><div class="t-sub t-primary">${esc(t.no_ref || (t._pending ? 'menyimpan…' : ''))}</div></td>
    <td data-m="${compact ? '' : 'hide'}">${katChip(t)}</td>
    ${compact ? '' : `<td data-m="hide">${dompetCell(t)}</td><td data-m="hide">${jenisChip(t.jenis)}</td>`}
    <td class="num">${amountCell(t)}${compact ? `<div class="t-sub">${esc(dompetName(t.id_dompet))}</div>` : ''}</td>
    ${compact ? '' : `<td data-m="hide">${t.id_bukti ? `<button class="btn btn-ghost btn-sm" onclick="previewFile('${t.id_bukti}','Bukti ${esc(t.no_ref)}')"><i class="bi bi-paperclip"></i>Lihat</button>` : '<span class="muted small">—</span>'}</td>
    <td data-m="hide">${canW() ? `<div class="row-actions"><button class="btn-icon sm" aria-label="Ubah" onclick="openTransaksiForm('${t.id}')"><i class="bi bi-pencil"></i></button></div>` : ''}</td>`}
  </tr>`).join('')}</tbody></table>`;
}

function openTransaksiForm(id, preset) {
  if (!canW('transaksi')) return;
  const rec = id ? clone(findLocal('Transaksi', id)) : Object.assign({ tanggal: todayStr(), jenis: 'Keluar', id_dompet: (activeDompet()[0] || {}).id }, preset || {});
  const dompetOpts = () => activeDompet().map((d) => [d.id, `${d.nama_dompet} · ${fmtRp(saldoMap()[d.id] || 0)}`]);
  openEntityForm('Transaksi', id ? 'Ubah Transaksi' : 'Catat Transaksi', [
    { k: 'jenis', label: 'Jenis transaksi', type: 'seg', full: true, opts: [['Masuk', '<i class="bi bi-arrow-down-left t-in"></i> Masuk'], ['Keluar', '<i class="bi bi-arrow-up-right t-out"></i> Keluar'], ['Transfer', '<i class="bi bi-arrow-left-right t-trf"></i> Transfer']] },
    { k: 'jumlah', label: 'Jumlah', type: 'money', req: true, positive: true },
    { k: 'tanggal', label: 'Tanggal', type: 'date', req: true },
    { k: 'id_dompet', label: 'Dompet', type: 'select', req: true, opts: dompetOpts, ph: '— pilih dompet —' },
    { k: 'id_dompet_tujuan', label: 'Ke dompet', type: 'select', req: true, opts: (r) => activeDompet().filter((d) => d.id !== r.id_dompet).map((d) => [d.id, d.nama_dompet]), ph: '— dompet tujuan —', show: (r) => r.jenis === 'Transfer' },
    { k: 'id_kategori', label: 'Kategori', type: 'select', req: true, ph: '— pilih kategori —', opts: (r) => katsBy(r.jenis === 'Masuk' ? 'Masuk' : 'Keluar').map((k) => [k.id, k.nama]), show: (r) => r.jenis !== 'Transfer' },
    { k: 'id_tabungan', label: 'Alokasikan ke target tabungan', type: 'select', ph: '— tidak —', opts: () => S.db.Tabungan.filter((g) => !g.id_dompet).map((g) => [g.id, g.nama_target]), show: () => S.db.Tabungan.some((g) => !g.id_dompet) },
    { k: 'keterangan', label: 'Keterangan', full: true, ph: 'mis. Iuran rutin anggota unit produksi' },
    { k: 'no_ref', label: 'No. referensi', ph: 'Otomatis bila kosong', hint: 'Boleh diisi nomor kuitansi/nota.' },
    { k: 'bukti', label: 'Bukti transfer / kuitansi / nota', type: 'file', kind: 'bukti', full: true, capture: false }
  ], rec, { validate: (d) => (d.jenis === 'Transfer' && d.id_dompet === d.id_dompet_tujuan ? 'Dompet asal dan tujuan harus berbeda.' : null),
    beforeSave: (d) => { if (d.jenis !== 'Keluar' && d.jenis !== 'Transfer') return; const s = saldoMap()[d.id_dompet] || 0; const own = id ? num(rec.jumlah) : 0;
      if (s + own < d.jumlah) setTimeout(() => toast('Saldo ' + dompetName(d.id_dompet) + ' menjadi minus. Periksa kembali.', 'warning'), 400); } });
  if (rec.id_bukti) $('#fstat_bukti').innerHTML = `<button type="button" class="link" onclick="event.preventDefault();previewFile('${rec.id_bukti}')">Lihat berkas saat ini</button>`;
}
function openTransferForm() { openTransaksiForm(null, { jenis: 'Transfer' }); }

// ════════════════ HALAMAN: DOMPET ════════════════
function renderDompet() {
  const { from, to } = S.range, f = flows(from, to), sal = saldoMap(), total = totalKas(), doms = S.db.Dompet.slice().sort((a, b) => num(a.urutan) - num(b.urutan));
  const act = activeDompet();
  const transfers = trxSorted().filter((t) => t.jenis === 'Transfer').slice(0, 8);
  const byJenis = {}; act.forEach((d) => { byJenis[d.jenis] = (byJenis[d.jenis] || 0) + (sal[d.id] || 0); });
  const jl = Object.keys(byJenis), jc = { Rekening: '#6247EA', 'E-wallet': '#2F6FED', Tunai: '#F59E0B', Lainnya: '#64748B' };
  const minLiq = num(S.settings.batas_likuiditas);
  $('#sec-dompet').innerHTML = `
  ${pageHead('Dompet', 'Dompet Kas & Rekening Serikat', 'Kelola akun likuiditas serikat, pantau saldo riil, mutasi masuk/keluar, dan transfer antar dompet.',
    drpButton('global', 'Periode') + (canW() ? `<button class="btn btn-secondary" onclick="openTransferForm()"><i class="bi bi-arrow-left-right"></i><span class="lbl">Transfer Antar Dompet</span></button>
    <button class="btn btn-primary" onclick="openDompetForm()"><i class="bi bi-plus-lg"></i><span class="lbl">Tambah Dompet</span></button>` : ''))}
  <div class="grid g-main" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">
    <div class="card hero-kas"><div class="row-between"><span class="kpi-label"><span class="dot" style="background:#34C77B"></span> Total Konsolidasi Kas DPU SP JBA</span><span class="chip" style="background:rgba(255,255,255,.1);color:#fff"><i class="bi bi-wallet2"></i>${act.length} dompet aktif</span></div>
      <div class="row mt-16" style="gap:14px"><div class="big">${S.hideBal ? 'Rp ••••••••' : `<span class="cur">Rp</span>${fmtNum(total)}`}</div>
      <button class="hero-eye" onclick="S.hideBal=!S.hideBal;markDirty(['dompet','ringkasan'])" aria-label="Sembunyikan saldo"><i class="bi ${S.hideBal ? 'bi-eye-slash' : 'bi-eye'}"></i></button></div>
      <div class="hero-tiles"><div><small>Penerimaan</small><b style="color:#5BE19A">+${fmtRp(f.masuk)}</b></div><div><small>Pengeluaran</small><b style="color:#FF8A8E">-${fmtRp(f.keluar)}</b></div><div><small>Arus bersih</small><b>${fmtRp(f.net, { sign: true })}</b></div></div>
      <div class="small mt-16" style="color:#A9B4CC;border-top:1px solid rgba(255,255,255,.08);padding-top:12px"><i class="bi bi-cloud-check" style="color:#5BE19A"></i> Tersinkron dengan Google Sheets · periode ${fmtDate(from)} – ${fmtDate(to)}</div>
    </div>
    <div class="card card-pad"><div class="card-head"><div><h3>Sebaran & Alokasi</h3><p>Rasio kas menurut instrumen simpanan</p></div></div>
      ${jl.length && total > 0 ? `<div class="donut-wrap" style="grid-template-columns:150px 1fr"><div class="chart-box"><canvas id="ch-dompet" height="150"></canvas><div class="donut-center"><b>${act.length}</b><span class="small muted">dompet</span></div></div>
      <div class="legend">${jl.map((j) => `<div class="legend-row" style="grid-template-columns:auto 1fr auto"><span class="dot" style="background:${jc[j]}"></span><span>${j}</span><span class="mono small">${fmtShort(byJenis[j])} <span class="muted">(${fmtPct(pct(byJenis[j], total))})</span></span></div>`).join('')}</div></div>` : emptyState('bi-pie-chart', 'Belum ada saldo')}
      ${minLiq ? `<div class="callout ${total >= minLiq ? '' : 'danger'}"><i class="bi bi-shield-check"></i><span>Batas minimum likuiditas <b class="mono">${fmtRp(minLiq)}</b> ${total >= minLiq ? '(tercukupi)' : '(BELUM tercukupi)'}</span></div>` : ''}
    </div>
  </div>
  <div class="row-between mt-24" style="margin-bottom:14px"><div><h3 style="font-size:20px">Daftar Dompet & Akun Likuiditas</h3><p class="muted small">Saldo = saldo awal + seluruh mutasi tercatat</p></div><span class="mono small muted">${doms.length} terdaftar</span></div>
  <div class="grid g-3">
    ${doms.map((d) => { const s = sal[d.id] || 0, pd = f.perDompet[d.id] || { masuk: 0, keluar: 0, tIn: 0, tOut: 0 }; const inactive = String(d.aktif) === 'false';
      return `<div class="card wallet ${inactive ? 'inactive' : ''}"><div class="wallet-head"><span class="kpi-ico ${d.jenis === 'Tunai' ? 'ico-warn' : d.jenis === 'E-wallet' ? 'ico-trf' : 'ico-pri'}"><i class="bi ${dompetIcon(d)}"></i></span>
        <div style="flex:1;min-width:0"><div class="wallet-name ellipsis">${esc(d.nama_dompet)} ${inactive ? '<span class="chip chip-mute">Nonaktif</span>' : ''}</div><div class="wallet-no ellipsis">${esc(d.no_rekening || d.jenis)}</div></div>
        ${canW() ? `<button class="btn-icon sm" aria-label="Atur dompet" onclick="openDompetForm('${d.id}')"><i class="bi bi-three-dots-vertical"></i></button>` : ''}</div>
        <div><div class="small muted">Saldo ${d.jenis === 'Tunai' ? 'fisik' : 'aktif'} tersedia</div><div class="wallet-bal ${s < 0 ? 't-out' : ''}">${fmtRp(s, { mask: true })}</div></div>
        <div><div class="row-between small muted mono" style="margin-bottom:6px"><span>Porsi likuiditas</span><span>${fmtPct(pct(s, total))}</span></div><div class="bar"><span style="width:${Math.max(0, Math.min(100, pct(s, total)))}%"></span></div></div>
        <div class="wallet-flow"><div><span class="muted">Masuk</span><b class="t-in">+${fmtRp(pd.masuk + pd.tIn)}</b></div><div><span class="muted">Keluar</span><b class="t-out">-${fmtRp(pd.keluar + pd.tOut)}</b></div></div>
        <button class="link" onclick="S.ui.trx={q:'',dompet:'${d.id}',kat:'',jenis:'',page:1,size:${S.ui.trx.size}};markDirty(['transaksi']);go('transaksi')">Lihat mutasi <i class="bi bi-arrow-right"></i></button></div>`; }).join('')}
    ${canW() ? `<div class="card add-tile" role="button" tabindex="0" onclick="openDompetForm()"><div><div class="plus">+</div><b style="color:var(--text)">Tambah Akun Dompet Baru</b><p class="small mt-8">Rekening bank resmi, virtual account iuran, e-wallet, atau brankas cabang.</p></div></div>` : ''}
  </div>
  <div class="card mt-24"><div class="card-head card-pad" style="margin:0;padding-bottom:12px"><div><h3><i class="bi bi-shield-check t-primary"></i> Riwayat Pemindahan Dana (Audit Trail)</h3><p>Log pemindahan likuiditas antar dompet</p></div></div>
    <div class="table-wrap">${transfers.length ? `<table class="tbl cards"><thead><tr><th>Tanggal</th><th>Referensi</th><th>Dari</th><th>Ke</th><th class="num">Nominal</th><th>Keperluan</th></tr></thead><tbody>
    ${transfers.map((t) => `<tr><td class="mono small nowrap" data-m="full">${fmtDate(t.tanggal)}${t.dibuat_pada ? ', ' + fmtTime(t.dibuat_pada) : ''}</td><td class="mono small t-primary" data-m="hide">${esc(t.no_ref)}</td>
      <td>${esc(dompetName(t.id_dompet))}</td><td data-m="hide"><i class="bi bi-arrow-right muted"></i> ${esc(dompetName(t.id_dompet_tujuan))}</td><td class="num mono t-trf">${fmtRp(t.jumlah)}</td><td data-m="full" class="small muted">${esc(t.keterangan)}</td></tr>`).join('')}
    </tbody></table>` : emptyState('bi-arrow-left-right', 'Belum ada transfer antar dompet')}</div></div>`;
  if (jl.length && total > 0) mkChart('dompet', 'ch-dompet', donutCfg(jl, jl.map((j) => Math.max(0, byJenis[j])), jl.map((j) => jc[j])));
}
function openDompetForm(id) {
  if (!canW('dompet')) return;
  const rec = id ? clone(findLocal('Dompet', id)) : { jenis: 'Rekening', aktif: 'true', saldo_awal: 0, urutan: S.db.Dompet.length + 1 };
  openEntityForm('Dompet', id ? 'Atur Dompet' : 'Tambah Dompet Baru', [
    { k: 'nama_dompet', label: 'Nama dompet', req: true, ph: 'mis. Bank Mandiri Giro', full: true },
    { k: 'jenis', label: 'Jenis', type: 'select', req: true, opts: [['Rekening', 'Rekening bank'], ['E-wallet', 'E-wallet / QRIS'], ['Tunai', 'Kas tunai / brankas'], ['Lainnya', 'Lainnya']] },
    { k: 'no_rekening', label: 'No. rekening / akun', ph: 'Opsional · tidak tampil di portal' },
    { k: 'saldo_awal', label: 'Saldo awal', type: 'money', hint: 'Saldo saat mulai memakai aplikasi. Saldo berjalan dihitung otomatis.' },
    { k: 'urutan', label: 'Urutan tampil', type: 'number', min: 1 },
    { k: 'keterangan', label: 'Keterangan', full: true },
    { k: 'aktif', label: 'Dompet aktif', type: 'check', full: true }
  ], rec, {});
}

// ════════════════ HALAMAN: KATEGORI ════════════════
function renderKategori() {
  const tab = S.ui.katTab, { from, to } = S.range, f = flows(from, to);
  const list = katsBy(tab);
  const usage = {};
  S.db.Transaksi.forEach((t) => { usage[t.id_kategori] = (usage[t.id_kategori] || 0) + 1; });
  S.db.Inventaris.forEach((b) => { usage[b.id_kategori] = (usage[b.id_kategori] || 0) + 1; });
  const totals = tab === 'Masuk' ? f.inKat : tab === 'Keluar' ? f.outKat : {};
  const sumT = Object.values(totals).reduce((a, b) => a + b, 0);
  $('#sec-kategori').innerHTML = `
  ${pageHead('Kategori', 'Kategori Transaksi & Aset', 'Kelompokkan pemasukan, pengeluaran, dan jenis inventaris agar laporan rapi dan mudah dibaca.',
    drpButton('global', 'Periode') + (canW() ? `<button class="btn btn-primary" onclick="openKategoriForm(null,'${tab}')"><i class="bi bi-plus-lg"></i><span class="lbl">Tambah Kategori</span></button>` : ''))}
  <div class="tabs">${[['Keluar', 'Pengeluaran', 'bi-arrow-up-right'], ['Masuk', 'Pemasukan', 'bi-arrow-down-left'], ['Inventaris', 'Inventaris', 'bi-box-seam']].map(([k, l, i]) =>
    `<button class="${tab === k ? 'on' : ''}" onclick="S.ui.katTab='${k}';renderKategori()"><i class="bi ${i}"></i>${l}<span class="count">${katsBy(k).length}</span></button>`).join('')}</div>
  <div class="grid g-3">${list.map((k) => `<div class="card card-pad" style="padding:18px"><div class="row" style="gap:14px">
    <span class="cat-ico" style="width:44px;height:44px;font-size:19px;background:color-mix(in srgb, ${k.warna} 15%, transparent);color:${k.warna}"><i class="bi ${esc(k.ikon)}"></i></span>
    <div style="flex:1;min-width:0"><b class="ellipsis" style="display:block">${esc(k.nama)}</b><span class="small muted">${usage[k.id] || 0} ${tab === 'Inventaris' ? 'barang' : 'transaksi'}</span></div>
    ${canW() ? `<button class="btn-icon sm" onclick="openKategoriForm('${k.id}')" aria-label="Ubah"><i class="bi bi-pencil"></i></button>` : ''}</div>
    ${tab !== 'Inventaris' ? `<div class="row-between mt-16 small"><span class="muted">Periode ini</span><b class="mono">${fmtRp(totals[k.id] || 0)}</b></div>
    <div class="bar mt-8"><span style="width:${pct(totals[k.id] || 0, sumT)}%;background:${k.warna}"></span></div>` : ''}</div>`).join('')}
    ${canW() ? `<div class="card add-tile" style="min-height:120px" role="button" onclick="openKategoriForm(null,'${tab}')"><div><div class="plus">+</div>Kategori ${tab.toLowerCase()} baru</div></div>` : ''}</div>`;
}
function openKategoriForm(id, jenis) {
  if (!canW('kategori')) return;
  const rec = id ? clone(findLocal('Kategori', id)) : { jenis: jenis || 'Keluar', warna: PALETTE[S.db.Kategori.length % PALETTE.length], ikon: 'bi-tag' };
  openEntityForm('Kategori', id ? 'Ubah Kategori' : 'Kategori Baru', [
    { k: 'nama', label: 'Nama kategori', req: true, full: true, ph: 'mis. Iuran Federasi' },
    { k: 'jenis', label: 'Jenis', type: 'seg', full: true, opts: [['Keluar', 'Pengeluaran'], ['Masuk', 'Pemasukan'], ['Inventaris', 'Inventaris']] },
    { k: 'warna', label: 'Warna', type: 'color', full: true },
    { k: 'ikon', label: 'Ikon', type: 'icon' }
  ], rec, {});
}

// ════════════════ HALAMAN: ANGGARAN ════════════════
function renderAnggaran() {
  const period = S.ui.angPeriod || ym(todayStr());
  const rows = budgetRows(period);
  const lim = rows.reduce((a, b) => a + b.lim, 0), used = rows.reduce((a, b) => a + b.used, 0), sisa = lim - used;
  const critical = rows.filter((r) => r.status !== 'ok');
  const y = Number(period.slice(0, 4)), m = Number(period.slice(5, 7));
  const f = flows(monthStart(y, m), monthEnd(y, m));
  const unbudget = Object.keys(f.outKat).filter((k) => !rows.some((r) => r.a.id_kategori === k));
  const months = []; for (let i = -6; i <= 2; i++) { const d = new Date(new Date().getFullYear(), new Date().getMonth() + i, 1); months.push(d.getFullYear() + '-' + pad(d.getMonth() + 1)); }
  if (months.indexOf(period) < 0) months.push(period);
  $('#sec-anggaran').innerHTML = `
  ${pageHead('Anggaran', 'Anggaran Program Kerja & Biaya', 'Pantau pagu anggaran bulanan per pos agar realisasi tidak melebihi batas yang disahkan rapat kerja.',
    `<select class="select" style="width:auto" onchange="S.ui.angPeriod=this.value;renderAnggaran()">${months.sort().map((p) => `<option value="${p}" ${p === period ? 'selected' : ''}>${ymLabel(p)}</option>`).join('')}</select>
     ${canW() ? `<button class="btn btn-secondary" onclick="copyBudget('${period}')"><i class="bi bi-copy"></i><span class="lbl">Salin Bulan Lalu</span></button>
     <button class="btn btn-primary" onclick="openAnggaranForm(null,'${period}')"><i class="bi bi-plus-circle"></i><span class="lbl">Atur Anggaran</span></button>` : ''}`)}
  ${critical.length ? `<div class="alert-banner"><i class="bi bi-exclamation-triangle"></i><div><b>Peringatan Dini Anggaran</b><p class="mt-8">${critical.map((c) => `<b>${esc(c.kat.nama)}</b> ${fmtPct(c.p)} (sisa <span class="mono">${fmtRp(c.sisa)}</span>)`).join(' · ')}. Tinjau rencana kegiatan sebelum pencairan kas.</p></div></div>` : ''}
  <div class="card card-pad"><div class="card-head"><div class="row"><span class="kpi-ico ico-pri"><i class="bi bi-bank"></i></span><div><h3>Ringkasan Anggaran Konsolidasian</h3><p>${ymLabel(period)} · ${rows.length} pos anggaran</p></div></div>
    <span class="chip ${pct(used, lim) > 100 ? 'chip-out' : pct(used, lim) >= 85 ? 'chip-warn' : 'chip-in'} chip-pill">${pct(used, lim) > 100 ? 'Melebihi pagu' : pct(used, lim) >= 85 ? 'Perlu pengawasan' : 'Aman terkendali'}</span></div>
    <div class="grid g-3 g-tight">
      <div class="budget-card"><span class="caps muted">Total batas pagu</span><span class="kpi-value">${fmtRp(lim)}</span></div>
      <div class="budget-card" style="background:var(--primary-softer)"><span class="caps t-primary">Realisasi terpakai</span><span class="kpi-value t-primary">${fmtRp(used)}</span><span class="small t-primary">${fmtPct(pct(used, lim))} penyerapan</span></div>
      <div class="budget-card"><span class="caps muted">Sisa anggaran</span><span class="kpi-value ${sisa < 0 ? 't-out' : ''}">${fmtRp(sisa)}</span><span class="small muted">${fmtPct(pct(sisa, lim))} sisa</span></div>
    </div>
    <div class="row-between mt-24 small"><span>Tingkat penyerapan kolektif</span><b class="mono t-primary">${fmtPct(pct(used, lim))}</b></div>
    <div class="bar lg mt-8 ${pct(used, lim) > 100 ? 'over' : ''}"><span style="width:${Math.min(100, pct(used, lim))}%"></span></div>
  </div>
  ${rows.length ? `<div class="card card-pad mt-24"><div class="card-head"><div><h3>Pagu vs Realisasi Aktual</h3><p>Penyerapan per pos anggaran</p></div></div>
    <div class="stack" style="gap:18px">${rows.map((r) => `<div><div class="row-between small"><b>${esc(r.kat.nama)}</b><span class="mono muted">${fmtRp(r.used)} / ${fmtRp(r.lim)} (${fmtPct(r.p)})</span></div>
      <div class="bar lg mt-8 ${r.status === 'ok' ? '' : r.status === 'warn' ? 'warn' : 'over'}"><span style="width:${Math.min(100, r.p)}%"></span></div></div>`).join('')}</div></div>
  <div class="card mt-24"><div class="card-head card-pad" style="margin:0;padding-bottom:12px"><div><h3>Rincian Pagu per Kategori</h3></div></div><div class="table-wrap"><table class="tbl cards"><thead><tr><th>Kategori</th><th class="num">Batas pagu</th><th class="num">Realisasi</th><th class="num">Sisa</th><th>Penyerapan</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td data-m="full"><div class="row" style="gap:10px"><span class="cat-ico" style="background:color-mix(in srgb, ${r.kat.warna} 15%, transparent);color:${r.kat.warna}"><i class="bi ${r.kat.ikon}"></i></span><b>${esc(r.kat.nama)}</b></div></td>
      <td class="num mono" data-m="hide">${fmtRp(r.lim)}</td><td class="num mono t-primary">${fmtRp(r.used)}</td><td class="num mono ${r.sisa < 0 ? 't-out' : ''}" data-m="hide">${fmtRp(r.sisa)}</td>
      <td data-m="hide" style="min-width:140px"><div class="row"><div class="bar" style="flex:1"><span style="width:${Math.min(100, r.p)}%;background:${r.status === 'ok' ? 'var(--primary)' : r.status === 'warn' ? 'var(--accent)' : 'var(--out)'}"></span></div><span class="mono small">${fmtPct(r.p)}</span></div></td>
      <td><span class="chip ${r.status === 'ok' ? 'chip-in' : r.status === 'warn' ? 'chip-warn' : 'chip-out'}">${r.status === 'ok' ? 'Aman' : r.status === 'warn' ? 'Hampir habis' : r.status === 'full' ? 'Tercapai penuh' : 'Melebihi'}</span></td>
      <td data-m="hide">${canW() ? `<button class="btn-icon sm" onclick="openAnggaranForm('${r.a.id}')" aria-label="Ubah"><i class="bi bi-sliders"></i></button>` : ''}</td></tr>`).join('')}
    </tbody></table></div><div class="tbl-foot"><span>${rows.length} pos anggaran</span><span class="mono">Total pagu ${fmtRp(lim)} · Realisasi <b class="t-primary">${fmtRp(used)}</b></span></div></div>`
    : `<div class="card mt-24">${emptyState('bi-sliders', 'Belum ada anggaran untuk ' + ymLabel(period), 'Atur batas per kategori atau salin dari bulan sebelumnya.', canW() ? `<button class="btn btn-primary btn-sm" onclick="openAnggaranForm(null,'${period}')">Atur anggaran</button>` : '')}</div>`}
  ${unbudget.length ? `<div class="callout warn mt-16"><i class="bi bi-info-circle"></i><span>Pengeluaran tanpa pagu bulan ini: ${unbudget.map((k) => `<b>${esc(katOf(k).nama)}</b> (${fmtRp(f.outKat[k])})`).join(', ')}</span></div>` : ''}`;
}
function openAnggaranForm(id, period) {
  if (!canW('anggaran')) return;
  period = period || S.ui.angPeriod || ym(todayStr());
  const rec = id ? clone(findLocal('Anggaran', id)) : { bulan: Number(period.slice(5, 7)), tahun: Number(period.slice(0, 4)) };
  const taken = S.db.Anggaran.filter((a) => a.id !== rec.id && num(a.bulan) === num(rec.bulan) && num(a.tahun) === num(rec.tahun)).map((a) => a.id_kategori);
  openEntityForm('Anggaran', (id ? 'Ubah' : 'Atur') + ' Anggaran · ' + BULAN[rec.bulan - 1] + ' ' + rec.tahun, [
    { k: 'id_kategori', label: 'Kategori pengeluaran', type: 'select', req: true, full: true, ph: '— pilih —', opts: () => katsBy('Keluar').filter((k) => taken.indexOf(k.id) < 0 || k.id === rec.id_kategori).map((k) => [k.id, k.nama]) },
    { k: 'batas_jumlah', label: 'Batas pagu', type: 'money', req: true, positive: true },
    { k: 'bulan', label: 'Bulan', type: 'select', opts: BULAN.map((b, i) => [i + 1, b]) },
    { k: 'tahun', label: 'Tahun', type: 'number', min: 2020 }
  ], rec, {});
}
function copyBudget(period) {
  const y = Number(period.slice(0, 4)), m = Number(period.slice(5, 7));
  enqueue(() => api('salinAnggaran', S.token, m, y).then((res) => {
    (res.data.records || []).forEach((r) => upsertLocal('Anggaran', r));
    afterLocalChange('Anggaran'); toast(res.message, res.data.records.length ? 'success' : 'info');
  }).catch((e) => toast(e.message, 'error')));
}

// ════════════════ HALAMAN: TABUNGAN ════════════════
function renderTabungan() {
  const goals = S.db.Tabungan.filter((g) => inDr('tabungan', g.tanggal_target)).sort((a, b) => String(a.tanggal_target).localeCompare(b.tanggal_target));
  const totT = goals.reduce((a, g) => a + num(g.target_jumlah), 0), totP = goals.reduce((a, g) => a + Math.max(0, goalProgress(g)), 0);
  $('#sec-tabungan').innerHTML = `
  ${pageHead('Tabungan', 'Target Tabungan & Dana Cadangan', 'Sisihkan dana untuk tujuan khusus: dana mogok, solidaritas, kegiatan tahunan, atau pembelian aset.',
    drpButton('tabungan', 'Target') + (canW() ? '<button class="btn btn-primary" onclick="openTabunganForm()"><i class="bi bi-plus-lg"></i><span class="lbl">Target Baru</span></button>' : ''))}
  <div class="grid g-3">
    ${miniStat('Total Target', totT, 'ico-pri', 'bi-bullseye', '', `${goals.length} target aktif`)}
    ${miniStat('Terkumpul', totP, 'ico-in', 'bi-piggy-bank', 't-in', `${fmtPct(pct(totP, totT))} tercapai`)}
    ${miniStat('Kekurangan', Math.max(0, totT - totP), 'ico-warn', 'bi-hourglass-split', '', 'menuju seluruh target')}
  </div>
  <div class="grid g-2 mt-24">${goals.length ? goals.map((g) => {
    const p = goalProgress(g), t = num(g.target_jumlah), left = daysBetween(todayStr(), g.tanggal_target || todayStr());
    const months = Math.max(1, Math.ceil(left / 30)), need = Math.max(0, t - p) / months;
    return `<div class="card goal"><div class="row-between"><div class="row"><span class="kpi-ico ico-pri"><i class="bi bi-shield-check"></i></span><div><b style="font-size:16px">${esc(g.nama_target)}</b>
      <div class="small muted">${g.id_dompet ? `Terhubung ke dompet <b>${esc(dompetName(g.id_dompet))}</b>` : 'Dari setoran tercatat'}</div></div></div>
      ${canW() ? `<button class="btn-icon sm" onclick="openTabunganForm('${g.id}')" aria-label="Ubah"><i class="bi bi-pencil"></i></button>` : ''}</div>
      <div class="row-between"><span class="kpi-value t-primary">${fmtRp(p)}</span><span class="mono muted small">dari ${fmtRp(t)}</span></div>
      <div class="bar lg ${pct(p, t) >= 100 ? 'ok' : ''}"><span style="width:${Math.min(100, pct(p, t))}%"></span></div>
      <div class="row-between small"><span class="muted"><i class="bi bi-calendar-event"></i> Target ${fmtDate(g.tanggal_target, 'long')} ${left >= 0 ? `· ${left} hari lagi` : '· <span class="t-out">lewat</span>'}</span><b>${fmtPct(pct(p, t), 0)}</b></div>
      ${pct(p, t) < 100 && left > 0 ? `<div class="callout" style="margin-top:0"><i class="bi bi-lightbulb t-primary"></i><span>Sisihkan ±<b class="mono">${fmtRp(need)}</b>/bulan agar target tercapai tepat waktu.</span></div>` : ''}
      ${g.catatan ? `<p class="small muted">${esc(g.catatan)}</p>` : ''}
      ${canW() && !g.id_dompet ? `<button class="btn btn-soft" onclick="openSetorForm('${g.id}')"><i class="bi bi-plus-circle"></i>Setor Tabungan</button>` : ''}</div>`; }).join('')
    : `<div class="card" style="grid-column:1/-1">${emptyState('bi-piggy-bank', 'Belum ada target tabungan', 'Buat target pertama, mis. Dana Cadangan Aksi.', canW() ? '<button class="btn btn-primary btn-sm" onclick="openTabunganForm()">Buat target</button>' : '')}</div>`}</div>`;
}
function openTabunganForm(id) {
  if (!canW('tabungan')) return;
  const rec = id ? clone(findLocal('Tabungan', id)) : { tanggal_target: new Date().getFullYear() + '-12-31' };
  openEntityForm('Tabungan', id ? 'Ubah Target Tabungan' : 'Target Tabungan Baru', [
    { k: 'nama_target', label: 'Nama target', req: true, full: true, ph: 'mis. Dana Cadangan Mogok & Aksi Solidaritas' },
    { k: 'target_jumlah', label: 'Target nominal', type: 'money', req: true, positive: true },
    { k: 'tanggal_target', label: 'Tanggal target', type: 'date', req: true },
    { k: 'id_dompet', label: 'Sumber progres', type: 'select', full: true, ph: 'Dari setoran yang dicatat (transaksi dialokasikan)', opts: () => activeDompet().map((d) => [d.id, 'Saldo dompet: ' + d.nama_dompet]),
      hint: 'Pilih dompet khusus tabungan agar progres = saldo dompet itu.' },
    { k: 'catatan', label: 'Catatan', type: 'textarea', full: true }
  ], rec, {});
}
function openSetorForm(goalId) { openTransaksiForm(null, { jenis: 'Masuk', id_tabungan: goalId, keterangan: 'Setoran ' + (findLocal('Tabungan', goalId) || {}).nama_target }); }

// ════════════════ HALAMAN: TAGIHAN ════════════════
function renderTagihan() {
  const t0 = todayStr(), u = S.ui.tag;
  const all = S.db.Tagihan.slice().sort((a, b) => String(a.jatuh_tempo).localeCompare(b.jatuh_tempo));
  const open = all.filter((b) => b.status !== 'Lunas');
  const soon = open.filter((b) => { const d = daysBetween(t0, b.jatuh_tempo); return d >= 0 && d <= 7; });
  const late = open.filter((b) => daysBetween(t0, b.jatuh_tempo) < 0);
  const curYm = ym(t0);
  const paidMonth = all.filter((b) => b.status === 'Lunas' && ym(b.tanggal_lunas) === curYm);
  const monthTotal = all.filter((b) => ym(b.jatuh_tempo) === curYm).reduce((a, b) => a + num(b.jumlah), 0);
  const tabs = { semua: all, akan: soon, terlambat: late, lunas: all.filter((b) => b.status === 'Lunas') };
  const q = u.q.toLowerCase();
  const list = (tabs[u.tab] || all).filter((b) => (!q || (b.nama + ' ' + (b.vendor || '') + ' ' + (b.catatan || '')).toLowerCase().indexOf(q) >= 0) && inDr('tagihan', b.jatuh_tempo))
    .sort((a, b) => (a.status === 'Lunas') - (b.status === 'Lunas') || String(a.jatuh_tempo).localeCompare(b.jatuh_tempo));
  const calYm = u.cal || curYm;
  const waManual = S.settings.wa_mode !== 'gateway';
  $('#sec-tagihan').innerHTML = `
  ${pageHead('Tagihan', 'Tagihan & Pengingat Otomatis', 'Kelola kewajiban berkala (iuran federasi, sewa lapangan, langganan, vendor, EO) dengan pengingat Email & WhatsApp.',
    `<button class="btn btn-secondary" onclick="exportExcel('tagihan')"><i class="bi bi-file-earmark-excel"></i><span class="lbl">Ekspor Excel</span></button>${rptMenu('tagihan')}` +
    (canW() ? '<button class="btn btn-secondary" onclick="openImport(\'tagihan\')"><i class="bi bi-file-earmark-arrow-up"></i><span class="lbl">Impor Excel</span></button><button class="btn btn-primary" onclick="openTagihanForm()"><i class="bi bi-plus-circle"></i><span class="lbl">Tambah Tagihan</span></button>' : ''))}
  <div class="grid g-4 g-kpi-m">
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Kewajiban ${BLN[Number(curYm.slice(5)) - 1]}</span><span class="kpi-ico ico-pri"><i class="bi bi-receipt"></i></span></div><div class="kpi-value">${fmtRp(monthTotal)}</div><div class="kpi-foot">${open.length} komitmen terjadwal</div></div>
    <div class="card kpi" style="background:var(--warn-soft)"><div class="kpi-top"><span class="kpi-label t-warn">Mendesak (7 hari)</span><span class="kpi-ico ico-warn"><i class="bi bi-alarm"></i></span></div><div class="kpi-value t-warn">${fmtRp(soon.reduce((a, b) => a + num(b.jumlah), 0))}</div><div class="kpi-foot t-warn">${soon.length} tagihan perlu disiapkan</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Terbayar bulan ini</span><span class="kpi-ico ico-in"><i class="bi bi-check2-circle"></i></span></div><div class="kpi-value t-in">${fmtRp(paidMonth.reduce((a, b) => a + num(b.jumlah), 0))}</div><div class="kpi-foot">${paidMonth.length} tagihan selesai</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Pengingat otomatis</span><span class="kpi-ico ico-trf"><i class="bi bi-send"></i></span></div>
      <div style="font-weight:600;font-size:16px">Setiap hari ${pad(num(S.settings.jam_pengingat || 8))}:00</div><div class="kpi-foot"><span class="dot" style="background:${S.meta.triggerActive ? 'var(--in)' : 'var(--out)'}"></span>${S.meta.triggerActive ? 'Trigger aktif' : 'Trigger belum aktif'} · WA ${waManual ? 'manual' : 'otomatis'}</div></div>
  </div>
  <div class="grid g-side mt-24">
    <div class="stack">
      <div class="card"><div class="filterbar" style="flex-direction:column;align-items:stretch">
        <div class="seg">${[['semua', 'Semua', all.length], ['akan', 'Akan Jatuh Tempo', soon.length], ['terlambat', 'Terlambat', late.length], ['lunas', 'Lunas', tabs.lunas.length]].map(([k, l, n]) =>
          `<button class="${u.tab === k ? 'on' : ''}" onclick="S.ui.tag.tab='${k}';renderTagihan()">${l} <span class="count">${n}</span></button>`).join('')}</div>
        <div class="row" style="flex-wrap:wrap"><div class="search"><i class="bi bi-search"></i><input class="input" placeholder="Cari nama kewajiban / vendor…" value="${esc(u.q)}" oninput="tagSearch(this.value)"></div>${drpButton('tagihan', 'Jatuh tempo')}</div></div>
        <div id="bill-list">${list.length ? list.map(billRow).join('') : emptyState('bi-receipt', 'Tidak ada tagihan', '', canW() ? '<button class="btn btn-primary btn-sm" onclick="openTagihanForm()">Tambah tagihan</button>' : '')}</div>
        <div class="tbl-foot"><span>Menampilkan ${list.length} dari ${all.length} komitmen</span></div>
      </div>
      <div class="card card-pad row" style="gap:16px;padding:18px 20px"><span class="kpi-ico ico-pri"><i class="bi bi-envelope-paper"></i></span>
        <div style="flex:1"><b>Pengingat Email & WhatsApp</b><p class="small muted">Email dikirim otomatis via Gmail (sisa kuota hari ini: <b class="mono">${S.meta.emailQuota !== undefined ? S.meta.emailQuota : '-'}</b>). WhatsApp ${waManual ? 'manual: klik ikon WA pada tagihan untuk mengirim pesan siap kirim.' : 'otomatis lewat gateway.'}</p></div>
        ${isSuper() ? `<button class="btn btn-secondary btn-sm" onclick="S.ui.setTab='notifikasi';go('pengaturan')">Atur</button>` : ''}</div>
    </div>
    <div class="stack">
      <div class="card card-pad">${calendarHtml(calYm, all)}</div>
      <div class="card card-pad"><div class="row-between"><h3 style="font-size:16px"><i class="bi bi-exclamation-triangle t-warn"></i> Jatuh Tempo 7 Hari</h3><span class="chip chip-warn">Mendesak</span></div>
        <div class="budget-card mt-16" style="background:var(--warn-soft);border:0"><span class="caps t-warn">Total likuiditas yang harus disiapkan</span><span class="kpi-value t-warn">${fmtRp(soon.concat(late).reduce((a, b) => a + num(b.jumlah), 0))}</span></div>
        <div class="stack mt-16" style="gap:12px">${soon.concat(late).slice(0, 5).map((b) => { const l = billLabel(b); return `<div class="row-between small"><div><b>${esc(b.nama)}</b><div class="${l.cls === 'chip-out' ? 't-out' : 't-warn'}">${l.txt} · ${fmtDate(b.jatuh_tempo)}</div></div><span class="mono">${fmtRp(b.jumlah)}</span></div>`; }).join('') || '<p class="small muted">Aman, tidak ada yang mendesak.</p>'}</div>
        <button class="btn btn-soft btn-block mt-16" onclick="go('dompet')"><i class="bi bi-wallet2"></i>Cek saldo kas operasional</button></div>
    </div>
  </div>`;
}
const tagSearch = debounce((v) => { S.ui.tag.q = v; renderTagihan(); const i = $('#sec-tagihan .search input'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 250);
/** Status tagihan untuk halaman Tagihan: Lunas · Terlambat · Jatuh tempo hari ini · Segera (≤7 hari) · Belum lunas. */
function billState(b) {
  if (b.status === 'Lunas') return { key: 'lunas', badge: 'Lunas', badgeCls: 'chip-in', icon: 'bi-check-circle-fill', due: 'Dibayar ' + fmtDate(b.tanggal_lunas || b.jatuh_tempo), dueCls: 'chip-in' };
  const d = daysBetween(todayStr(), b.jatuh_tempo);
  if (d < 0) return { key: 'telat', badge: 'Belum Lunas', badgeCls: 'chip-out', icon: 'bi-exclamation-octagon-fill', due: 'Terlambat ' + -d + ' hari', dueCls: 'chip-out' };
  if (d === 0) return { key: 'hariini', badge: 'Belum Lunas', badgeCls: 'chip-out', icon: 'bi-alarm-fill', due: 'Jatuh tempo hari ini', dueCls: 'chip-out' };
  if (d <= 7) return { key: 'segera', badge: 'Belum Lunas', badgeCls: 'chip-warn', icon: 'bi-hourglass-split', due: 'Jatuh tempo H-' + d, dueCls: 'chip-warn' };
  return { key: 'belum', badge: 'Belum Lunas', badgeCls: 'chip-trf', icon: 'bi-clock', due: 'H-' + d, dueCls: 'chip-mute' };
}
function billRow(b) {
  const done = b.status === 'Lunas', k = katOf(b.id_kategori), st = billState(b);
  const msg = fillWaTemplate(b);
  const rep = { sekali: 'Sekali', mingguan: 'Mingguan', bulanan: 'Bulanan', tahunan: 'Tahunan' }[b.pengulangan] || '';
  return `<div class="bill-row ${done ? 'done' : ''} st-${st.key}">
    <span class="cat-ico" style="background:${done ? 'var(--in-soft)' : `color-mix(in srgb, ${k.warna} 14%, transparent)`};color:${done ? 'var(--in)' : k.warna}"><i class="bi ${done ? 'bi-check-lg' : k.ikon || 'bi-receipt'}"></i></span>
    <div style="flex:1;min-width:0"><div class="row" style="gap:8px;flex-wrap:wrap"><b class="ellipsis">${esc(b.nama)}</b><span class="chip ${st.badgeCls}"><i class="bi ${st.icon}"></i>${st.badge}</span></div>
      <div class="small muted ellipsis">${esc(b.vendor || k.nama)} · ${rep}${b.kanal ? ' · ' + esc(b.kanal).replace('WA', 'WhatsApp') : ''}${b.catatan && b.catatan !== 'BELUM LUNAS' ? ' · ' + esc(String(b.catatan).replace(/^BELUM LUNAS\s*·?\s*/, '')) : ''}</div></div>
    <div class="right"><div class="mono" style="font-weight:600">${fmtRp(b.jumlah)}</div><div class="small ${done ? 't-in' : ''}">${done ? 'Dibayar ' + fmtDate(b.tanggal_lunas) : `<span class="mono strike">${fmtDate(b.jatuh_tempo)}</span>`}</div></div>
    <span class="chip ${st.dueCls} bill-due">${st.due}</span>
    <div class="row-actions">${!done ? `<a class="btn-icon sm" href="${waLink('', msg)}" target="_blank" rel="noopener" title="Kirim via WhatsApp" aria-label="Kirim via WhatsApp"><i class="bi bi-whatsapp" style="color:#25D366"></i></a>` : ''}
      ${canW() ? `${!done ? `<button class="btn btn-soft btn-sm" onclick="openLunasForm('${b.id}')" title="Tandai tagihan ini sudah dibayar"><i class="bi bi-check2-circle"></i>Tandai Lunas</button>` : ''}<button class="btn-icon sm" onclick="openTagihanForm('${b.id}')" aria-label="Ubah"><i class="bi bi-pencil"></i></button>` : ''}</div></div>`;
}
function fillWaTemplate(b) {
  const d = daysBetween(todayStr(), b.jatuh_tempo);
  return String(S.settings.wa_template || '').replace(/\{nama\}/g, b.nama).replace(/\{jumlah\}/g, fmtRp(b.jumlah)).replace(/\{jatuh_tempo\}/g, fmtDate(b.jatuh_tempo, 'long'))
    .replace(/\{sisa\}/g, d > 0 ? 'H-' + d : d === 0 ? 'HARI INI' : 'terlambat ' + -d + ' hari').replace(/\{vendor\}/g, b.vendor || '-').replace(/\{organisasi\}/g, S.settings.subjudul || S.settings.nama_aplikasi);
}
function calendarHtml(calYm, bills) {
  const y = Number(calYm.slice(0, 4)), m = Number(calYm.slice(5, 7)), first = new Date(y, m - 1, 1), start = first.getDay(), days = new Date(y, m, 0).getDate(), t0 = todayStr();
  const due = {}, paid = {};
  bills.forEach((b) => { if (ym(b.jatuh_tempo) === calYm) (b.status === 'Lunas' ? paid : due)[Number(String(b.jatuh_tempo).slice(8, 10))] = true; });
  const prevDays = new Date(y, m - 1, 0).getDate();
  let cells = '';
  for (let i = 0; i < start; i++) cells += `<span class="d other">${prevDays - start + 1 + i}</span>`;
  for (let d = 1; d <= days; d++) { const ds = calYm + '-' + pad(d); cells += `<span class="d ${ds === t0 ? 'today' : ''} ${due[d] ? 'due' : paid[d] ? 'paid' : ''}" title="${due[d] ? 'Jatuh tempo' : ''}">${d}</span>`; }
  const nav = (n) => { const dd = new Date(y, m - 1 + n, 1); return dd.getFullYear() + '-' + pad(dd.getMonth() + 1); };
  return `<div class="row-between" style="margin-bottom:12px"><b style="font-size:16px"><i class="bi bi-calendar3 t-primary"></i> ${BULAN[m - 1]} ${y}</b>
    <div><button class="btn-icon sm" onclick="S.ui.tag.cal='${nav(-1)}';renderTagihan()" aria-label="Bulan sebelumnya"><i class="bi bi-chevron-left"></i></button><button class="btn-icon sm" onclick="S.ui.tag.cal='${nav(1)}';renderTagihan()" aria-label="Bulan berikutnya"><i class="bi bi-chevron-right"></i></button></div></div>
    <div class="cal">${HARI.map((h) => `<span class="dow">${h}</span>`).join('')}${cells}</div>
    <div class="row small muted mt-16" style="gap:16px"><span class="row" style="gap:6px"><span class="dot" style="background:var(--primary)"></span>Hari ini</span><span class="row" style="gap:6px"><span class="dot" style="background:var(--warn)"></span>Jatuh tempo</span><span class="row" style="gap:6px"><span class="dot" style="background:var(--in)"></span>Lunas</span></div>`;
}
function openTagihanForm(id) {
  if (!canW('tagihan')) return;
  const rec = id ? clone(findLocal('Tagihan', id)) : { jatuh_tempo: addDays(todayStr(), 14), pengulangan: 'bulanan', pengingat_hari: '7,3,1,0', kanal: 'Email,WA', status: 'Belum' };
  openEntityForm('Tagihan', id ? 'Ubah Tagihan' : 'Tagihan Baru', [
    { k: 'nama', label: 'Nama tagihan', req: true, full: true, ph: 'mis. Iuran Federasi Nasional' },
    { k: 'vendor', label: 'Penerima pembayaran / vendor', ph: 'mis. DPN SP / GOR / EO' },
    { k: 'jumlah', label: 'Nominal', type: 'money', req: true },
    { k: 'jatuh_tempo', label: 'Jatuh tempo', type: 'date', req: true },
    { k: 'pengulangan', label: 'Pengulangan', type: 'select', opts: [['sekali', 'Sekali'], ['mingguan', 'Mingguan'], ['bulanan', 'Bulanan'], ['tahunan', 'Tahunan']] },
    { k: 'id_kategori', label: 'Kategori pengeluaran', type: 'select', ph: '— pilih —', opts: () => katsBy('Keluar').map((k) => [k.id, k.nama]), full: true },
    { k: 'pengingat_hari', label: 'Kirim pengingat', type: 'checks', full: true, opts: [['14', 'H-14'], ['7', 'H-7'], ['3', 'H-3'], ['1', 'H-1'], ['0', 'Hari H']] },
    { k: 'kanal', label: 'Kanal', type: 'checks', opts: [['Email', 'Email'], ['WA', 'WhatsApp']] },
    { k: 'status', label: 'Status', type: 'select', opts: [['Belum', 'Belum lunas'], ['Lunas', 'Lunas']] },
    { k: 'penerima', label: 'Penerima pengingat', full: true, ph: 'email@contoh.com, 0812xxxx (pisahkan koma)', hint: 'Kosongkan untuk mengirim ke semua pengurus aktif.' },
    { k: 'catatan', label: 'Catatan', type: 'textarea', full: true }
  ], rec, {});
}
function openLunasForm(id) {
  if (!canW('tagihan')) return;
  const b = findLocal('Tagihan', id); if (!b) return;
  FORM = { fields: [
    { k: 'catat', label: 'Catat sebagai transaksi pengeluaran', type: 'check', full: true },
    { k: 'id_dompet', label: 'Dibayar dari dompet', type: 'select', req: true, full: true, opts: () => activeDompet().map((d) => [d.id, `${d.nama_dompet} · ${fmtRp(saldoMap()[d.id] || 0)}`]), show: (r) => r.catat === 'true' },
    { k: 'id_kategori', label: 'Kategori', type: 'select', req: true, full: true, ph: '— pilih —', opts: () => katsBy('Keluar').map((k) => [k.id, k.nama]), show: (r) => r.catat === 'true' && !b.id_kategori },
    { k: 'tanggal', label: 'Tanggal bayar', type: 'date', req: true },
    { k: 'bukti', label: 'Bukti pembayaran', type: 'file', kind: 'bukti', full: true }
  ], uploads: {} };
  openModal({ title: 'Tandai Lunas', body: `<div class="budget-card" style="margin-bottom:16px"><div class="row-between"><b>${esc(b.nama)}</b><span class="mono" style="font-weight:600">${fmtRp(b.jumlah)}</span></div>
    <span class="small muted">Jatuh tempo ${fmtDate(b.jatuh_tempo, 'long')}${b.pengulangan !== 'sekali' ? ' · jadwal berikutnya dibuat otomatis (' + b.pengulangan + ')' : ''}</span></div>` +
    buildForm(FORM.fields, { catat: 'true', tanggal: todayStr(), id_dompet: (activeDompet()[0] || {}).id }),
    foot: '<button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-lunas"><i class="bi bi-check2-circle"></i>Tandai Lunas</button>' });
  formReflow();
  $('#btn-lunas').onclick = async () => {
    const d = readForm(); if (!validateForm(d)) return;
    const up = FORM.uploads.bukti; if (up && up.promise) await up.promise.catch(() => { });
    const opts = { catatTransaksi: d.catat === 'true', id_dompet: d.id_dompet, id_kategori: d.id_kategori, tanggal: d.tanggal,
      id_bukti: up && up.result ? up.result.id : '', link_bukti: up && up.result ? up.result.url : '' };
    closeModal();
    // Optimistik: status lunas langsung tampil
    const prev = clone(b);
    upsertLocal('Tagihan', Object.assign({}, b, { status: 'Lunas', tanggal_lunas: d.tanggal, _pending: true }));
    afterLocalChange('Tagihan'); toast('Tagihan ditandai lunas.', 'success');
    enqueue(() => api('markTagihanLunas', S.token, resolveIds({ id: b.id }).id, resolveIds(opts)).then((res) => {
      replaceLocal('Tagihan', b.id, res.data.tagihan);
      if (res.data.transaksi) upsertLocal('Transaksi', res.data.transaksi);
      if (res.data.next) upsertLocal('Tagihan', res.data.next);
      S.meta.version = res.data.version;
      afterLocalChange('Tagihan'); afterLocalChange('Transaksi');
      if (res.data.next) toast('Jadwal berikutnya: ' + fmtDate(res.data.next.jatuh_tempo, 'long'), 'info');
    }).catch((e) => { replaceLocal('Tagihan', b.id, prev); afterLocalChange('Tagihan'); toast(e.message, 'error', 'Gagal'); }));
  };
}

// ════════════════ HALAMAN: INVENTARIS ════════════════
function renderInventaris() {
  const u = S.ui.inv, items = S.db.Inventaris, cats = katsBy('Inventaris');
  const units = items.reduce((a, b) => a + num(b.jumlah), 0);
  const by = (k) => items.filter((b) => b.kondisi === k).reduce((a, b) => a + num(b.jumlah), 0);
  const years = Array.from(new Set(items.map((b) => String(b.tanggal_beli || '').slice(0, 4)).filter(Boolean))).sort().reverse();
  $('#sec-inventaris').innerHTML = `
  ${pageHead('Inventaris', 'Inventaris & Aset Fisik Serikat', 'Pencatatan sarana pendukung kegiatan aksi, advokasi, olahraga, dan kesekretariatan lengkap dengan foto dan status fisik.',
    `<div class="seg light"><button class="${u.view === 'grid' ? 'on' : ''}" onclick="S.ui.inv.view='grid';renderInvList()" aria-label="Tampilan grid"><i class="bi bi-grid"></i><span class="hide-sm">Grid</span></button><button class="${u.view === 'tabel' ? 'on' : ''}" onclick="S.ui.inv.view='tabel';renderInvList()" aria-label="Tampilan tabel"><i class="bi bi-table"></i><span class="hide-sm">Tabel</span></button></div>
     ${rptMenu('inventaris')}${canW() ? '<button class="btn btn-secondary" onclick="openImport(\'inventaris\')"><i class="bi bi-file-earmark-arrow-up"></i><span class="lbl">Impor Excel</span></button><button class="btn btn-primary" onclick="openInventarisForm()"><i class="bi bi-plus-lg"></i><span class="lbl">Tambah Barang</span></button>' : ''}`)}
  <div class="grid g-5 g-kpi-m">
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Total terdaftar</span><span class="kpi-ico ico-pri"><i class="bi bi-archive"></i></span></div><div class="kpi-value">${items.length} <span class="small muted" style="font-family:var(--font)">jenis</span></div><div class="kpi-foot">${cats.length} kategori</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Total unit fisik</span><span class="kpi-ico ico-trf"><i class="bi bi-boxes"></i></span></div><div class="kpi-value">${fmtNum(units)} <span class="small muted" style="font-family:var(--font)">unit</span></div><div class="kpi-foot">${new Set(items.map((b) => b.lokasi).filter(Boolean)).size} titik lokasi</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Kondisi baik</span><span class="kpi-ico ico-in"><i class="bi bi-patch-check"></i></span></div><div class="kpi-value t-in">${by('Baik')}</div><div class="kpi-foot">${fmtPct(pct(by('Baik'), units))} siap pakai</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Perlu servis</span><span class="kpi-ico ico-warn"><i class="bi bi-tools"></i></span></div><div class="kpi-value t-warn">${by('Perlu Servis')}</div><div class="kpi-foot">${fmtPct(pct(by('Perlu Servis'), units))}</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Rusak / afkir</span><span class="kpi-ico ico-out"><i class="bi bi-exclamation-octagon"></i></span></div><div class="kpi-value t-out">${by('Rusak')}</div><div class="kpi-foot">Nilai aset ${fmtShort(items.reduce((a, b) => a + num(b.nilai) , 0))}</div></div>
  </div>
  <div class="card filterbar mt-24">
    <div class="search"><i class="bi bi-search"></i><input class="input" placeholder="Cari nama barang, kode aset, lokasi…" value="${esc(u.q)}" oninput="invFilter('q',this.value)"></div>
    <select class="select" onchange="invFilter('kat',this.value)"><option value="">Kategori: Semua</option>${cats.map((k) => `<option value="${k.id}" ${u.kat === k.id ? 'selected' : ''}>${esc(k.nama)}</option>`).join('')}</select>
    <select class="select" onchange="invFilter('kondisi',this.value)"><option value="">Kondisi: Semua</option>${['Baik', 'Perlu Servis', 'Rusak'].map((k) => `<option ${u.kondisi === k ? 'selected' : ''}>${k}</option>`).join('')}</select>
    <select class="select" onchange="invFilter('tahun',this.value)"><option value="">Tahun: Semua</option>${years.map((y) => `<option ${u.tahun === y ? 'selected' : ''}>${y}</option>`).join('')}</select>
    ${drpButton('inventaris', 'Tgl beli')}
    <button class="btn btn-soft btn-icon" title="Ekspor Excel inventaris" onclick="exportExcel('inventaris')"><i class="bi bi-download"></i></button>
  </div>
  <div id="inv-list" class="mt-24"></div>`;
  renderInvList();
}
const invFilter = debounce((k, v) => { S.ui.inv[k] = v; renderInvList(); }, 150);
function condMini(k) {
  const c = k === 'Baik' ? 'var(--in)' : k === 'Perlu Servis' ? 'var(--accent)' : 'var(--out)';
  return `<span class="chip tl" style="color:${c}"><span class="dot" style="background:${c}"></span>${k === 'Baik' ? 'Kondisi Baik' : esc(k || '-')}</span>`;
}
function condChip(k) { return k === 'Baik' ? '<span class="chip chip-in"><span class="dot" style="background:var(--in)"></span>Kondisi Baik</span>' : k === 'Perlu Servis' ? '<span class="chip chip-warn"><span class="dot" style="background:var(--accent)"></span>Perlu Servis</span>' : '<span class="chip chip-out"><span class="dot" style="background:var(--out)"></span>Rusak</span>'; }
/** Peminjaman yang sedang berjalan (Disetujui): ringkasan server + data lokal terbaru. */
function invLoans() {
  const map = {};
  ((S.meta && S.meta.pinjamAktif) || []).forEach((l) => { map[l.id] = l; });
  S.db.Peminjaman.forEach((l) => {
    if (l.status === 'Disetujui') map[l.id] = { id: l.id, nomor: l.nomor, nama: l.nama_pemohon, jabatan: l.jabatan_pemohon || l.peran_pemohon || '', tgl_pinjam: l.tgl_pinjam, tgl_kembali: l.tgl_kembali,
      barang: pjmItems(l).map((x) => ({ id: x.id, jumlah: num(x.jumlah), satuan: x.satuan || 'Unit' })) };
    else delete map[l.id];
  });
  return Object.values(map).sort((a, b) => String(a.tgl_kembali).localeCompare(String(b.tgl_kembali)));
}
/** Peminjam barang tertentu: [{nama, jabatan, jumlah, tgl_pinjam, tgl_kembali, telat}] */
function invLoansOf(itemId, all) {
  const t0 = todayStr();
  return (all || invLoans()).map((l) => { const x = (l.barang || []).find((y) => y.id === itemId); return x ? Object.assign({}, l, { jumlah: num(x.jumlah), satuan: x.satuan, telat: l.tgl_kembali < t0 ? daysBetween(l.tgl_kembali, t0) : 0 }) : null; }).filter(Boolean);
}
function invLoanHtml(b, loans, mini) {
  if (!loans.length) return '';
  const out = loans.reduce((a, l) => a + l.jumlah, 0), sisa = Math.max(0, num(b.jumlah) - out);
  if (mini) return `<div class="inv-loan-mini">${loans.map((l) => `<span><i class="bi bi-box-arrow-up-right"></i> <b>${esc(l.nama)}</b> · ${l.jumlah} ${esc(l.satuan || b.satuan || 'Unit')} · ${dmy(l.tgl_pinjam)} → ${dmy(l.tgl_kembali)}${l.telat ? ` <em class="t-out">terlambat ${l.telat} hari</em>` : ''}</span>`).join('')}</div>`;
  return `<div class="inv-loan"><div class="inv-loan-h"><span><i class="bi bi-box-arrow-up-right"></i> Sedang dipinjam ${out} ${esc(b.satuan || 'Unit')}</span><span class="small">tersedia ${sisa}</span></div>
    ${loans.map((l) => `<div class="inv-loan-r${l.telat ? ' late' : ''}"><div><b>${esc(l.nama)}</b>${l.jabatan ? `<span>${esc(l.jabatan)}</span>` : ''}</div>
      <div class="inv-loan-d"><span><i class="bi bi-calendar-event"></i> Dipinjam <b class="mono">${esc(dmy(l.tgl_pinjam))}</b></span><span><i class="bi bi-calendar-check"></i> Kembali <b class="mono">${esc(dmy(l.tgl_kembali))}</b></span>
        <span class="mono">${l.jumlah} ${esc(l.satuan || b.satuan || 'Unit')}</span>${l.telat ? `<span class="t-out"><i class="bi bi-alarm"></i> Terlambat ${l.telat} hari</span>` : ''}</div></div>`).join('')}</div>`;
}
function renderInvList() {
  const u = S.ui.inv, q = u.q.toLowerCase();
  $$('#sec-inventaris .page-actions .seg button').forEach((b, i) => b.classList.toggle('on', (i === 0) === (u.view === 'grid')));
  const list = S.db.Inventaris.filter((b) => (!u.kat || b.id_kategori === u.kat) && (!u.kondisi || b.kondisi === u.kondisi) && (!u.tahun || String(b.tanggal_beli).slice(0, 4) === u.tahun) && inDr('inventaris', b.tanggal_beli) &&
    (!q || (b.nama_barang + ' ' + b.kode + ' ' + b.lokasi + ' ' + katOf(b.id_kategori).nama).toLowerCase().indexOf(q) >= 0)).sort((a, b) => String(a.kode).localeCompare(b.kode));
  if (!list.length) { $('#inv-list').innerHTML = `<div class="card">${emptyState('bi-box-seam', 'Belum ada barang', 'Tambahkan aset beserta fotonya.', canW() ? '<button class="btn btn-primary btn-sm" onclick="openInventarisForm()">Tambah barang</button>' : '')}</div>`; return; }
  const loansAll = invLoans();
  if (u.view === 'tabel') {
    $('#inv-list').innerHTML = `<div class="card"><div class="table-wrap"><table class="tbl cards"><thead><tr><th>Barang</th><th>Kategori</th><th>Lokasi</th><th>Dibeli</th><th class="num">Jumlah</th><th class="num">Nilai</th><th>Kondisi</th></tr></thead><tbody>
    ${list.map((b) => `<tr class="${canW() ? 'clickable' : ''}" ${canW() ? `onclick="openInventarisForm('${b.id}')"` : ''}><td data-m="full"><div class="row" style="gap:12px"><span class="thumb-sm">${b.thumbnail ? `<img src="${esc(b.thumbnail)}" alt="" loading="lazy">` : '<i class="bi bi-box"></i>'}</span><div style="min-width:0"><div class="t-main">${esc(b.nama_barang)}</div><div class="t-sub">${esc(b.kode)}</div>${invLoanHtml(b, invLoansOf(b.id, loansAll), true)}</div></div></td>
      <td data-m="hide"><span class="chip chip-mute">${esc(katOf(b.id_kategori).nama)}</span></td><td data-m="hide" class="small">${esc(b.lokasi || '-')}</td><td data-m="hide" class="mono small">${fmtDate(b.tanggal_beli)}</td>
      <td class="num mono">${num(b.jumlah)} ${esc(b.satuan || 'Unit')}</td><td class="num mono" data-m="hide">${b.nilai ? fmtRp(b.nilai) : '-'}</td><td>${condChip(b.kondisi)}</td></tr>`).join('')}</tbody></table></div>
    <div class="tbl-foot"><span>${list.length} jenis barang · ${list.reduce((a, b) => a + num(b.jumlah), 0)} unit</span><span class="mono">Total nilai ${fmtRp(list.reduce((a, b) => a + num(b.nilai), 0))}</span></div></div>`;
    return;
  }
  $('#inv-list').innerHTML = `<div class="grid g-3">${list.map((b) => `<div class="card inv-card">
    <div class="inv-photo">${b.thumbnail ? `<img src="${esc(b.thumbnail)}" alt="${esc(b.nama_barang)}" loading="lazy" onerror="this.remove()">` : ''}<i class="bi bi-image"></i>
      ${condMini(b.kondisi)}<span class="chip tr">${esc(b.kode)}</span><span class="qty">${num(b.jumlah)} ${esc(b.satuan || 'Unit')}</span>${invLoansOf(b.id, loansAll).length ? '<span class="chip bl inv-out"><i class="bi bi-box-arrow-up-right"></i>Dipinjam</span>' : ''}</div>
    <div class="inv-body"><div class="row-between"><span class="caps t-primary">${esc(katOf(b.id_kategori).nama)}</span><span class="mono small muted">Dibeli ${fmtDate(b.tanggal_beli)}</span></div>
      <b style="font-size:16px">${esc(b.nama_barang)}</b><span class="small muted"><i class="bi bi-geo-alt"></i> ${esc(b.lokasi || '-')}</span>
      ${b.catatan && b.kondisi !== 'Baik' ? `<div class="callout danger" style="margin-top:6px;padding:8px 10px"><i class="bi bi-exclamation-triangle t-out"></i><span class="small">${esc(b.catatan)}</span></div>` : ''}
      ${invLoanHtml(b, invLoansOf(b.id, loansAll))}</div>
    <div class="inv-foot"><div><span class="caps muted" style="font-size:10px">Nilai pembukuan</span><div class="mono" style="font-weight:600">${b.nilai ? fmtRp(b.nilai) : '—'}</div></div>
      <div class="row-actions">${b.id_foto ? `<a class="btn-icon sm" href="${esc(b.link_foto)}" target="_blank" rel="noopener" aria-label="Foto asli"><i class="bi bi-arrows-fullscreen"></i></a>` : ''}${canW() ? `<button class="btn-icon sm" onclick="openInventarisForm('${b.id}')" aria-label="Ubah"><i class="bi bi-pencil"></i></button>` : ''}</div></div></div>`).join('')}</div>`;
}
function openInventarisForm(id) {
  if (!canW('inventaris')) return;
  const rec = id ? clone(findLocal('Inventaris', id)) : { kondisi: 'Baik', jumlah: 1, satuan: 'Unit', tanggal_beli: ym(todayStr()) };
  openEntityForm('Inventaris', id ? 'Ubah Barang' : 'Tambah Barang', [
    { k: 'foto', label: 'Foto barang', type: 'file', kind: 'inventaris', accept: 'image/jpeg,image/png,image/webp,image/gif,image/heic', full: true, hint: 'Dikompres & dibuat thumbnail otomatis' },
    { k: 'nama_barang', label: 'Nama barang', req: true, full: true, ph: 'mis. Set Kostum & Bola Futsal' },
    { k: 'id_kategori', label: 'Kategori', type: 'select', ph: '— pilih —', opts: () => katsBy('Inventaris').map((k) => [k.id, k.nama]) },
    { k: 'kode', label: 'Kode aset', ph: 'Otomatis bila kosong' },
    { k: 'jumlah', label: 'Jumlah', type: 'number', min: 0, req: true },
    { k: 'satuan', label: 'Satuan', type: 'select', opts: [['Unit', 'Unit'], ['Set', 'Set'], ['Buah', 'Buah'], ['Pasang', 'Pasang'], ['Lusin', 'Lusin']] },
    { k: 'kondisi', label: 'Kondisi', type: 'seg', full: true, opts: [['Baik', 'Baik'], ['Perlu Servis', 'Perlu Servis'], ['Rusak', 'Rusak / Afkir']] },
    { k: 'lokasi', label: 'Lokasi penyimpanan', ph: 'mis. Gudang Sekretariat' },
    { k: 'tanggal_beli', label: 'Bulan & tahun pembelian', type: 'month' },
    { k: 'nilai', label: 'Nilai / harga beli (opsional)', type: 'money', full: true },
    { k: 'catatan', label: 'Catatan kondisi', type: 'textarea', full: true }
  ], rec, {});
}

// ════════════════ HALAMAN: ANGGOTA ════════════════
function renderAnggota() {
  const u = S.ui.agt, all = S.db.Anggota;
  const units = Array.from(new Set(all.map((a) => a.unit).filter(Boolean))).sort();
  const aktif = all.filter((a) => a.status === 'Aktif').length;
  const thisYear = all.filter((a) => String(a.tanggal_gabung).slice(0, 4) === String(new Date().getFullYear())).length;
  $('#sec-anggota').innerHTML = `
  ${pageHead('Anggota', 'Data Anggota Serikat', 'Daftar anggota beserta unit kerja dan kontak. Data kontak hanya terlihat oleh pengurus.',
    `<button class="btn btn-secondary" onclick="exportExcel('anggota')"><i class="bi bi-download"></i><span class="lbl">Ekspor</span></button>${rptMenu('anggota')}${canW() ? '<button class="btn btn-secondary" onclick="openImport(\'anggota\')"><i class="bi bi-file-earmark-arrow-up"></i><span class="lbl">Impor Excel</span></button>' : ''}${canW() ? '<button class="btn btn-primary" onclick="openAnggotaForm()"><i class="bi bi-person-plus"></i><span class="lbl">Tambah Anggota</span></button>' : ''}`)}
  <div class="grid g-4 g-kpi-m">
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Total anggota</span><span class="kpi-ico ico-pri"><i class="bi bi-people"></i></span></div><div class="kpi-value">${all.length}</div><div class="kpi-foot">${units.length} unit kerja</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Aktif</span><span class="kpi-ico ico-in"><i class="bi bi-person-check"></i></span></div><div class="kpi-value t-in">${aktif}</div><div class="kpi-foot">${fmtPct(pct(aktif, all.length))}</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Nonaktif / keluar</span><span class="kpi-ico ico-out"><i class="bi bi-person-dash"></i></span></div><div class="kpi-value">${all.length - aktif}</div><div class="kpi-foot">&nbsp;</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Bergabung ${new Date().getFullYear()}</span><span class="kpi-ico ico-trf"><i class="bi bi-person-plus"></i></span></div><div class="kpi-value">${thisYear}</div><div class="kpi-foot">anggota baru</div></div>
  </div>
  <div class="card mt-24"><div class="filterbar">
    <div class="search"><i class="bi bi-search"></i><input class="input" placeholder="Cari nama, nomor anggota, unit…" value="${esc(u.q)}" oninput="agtFilter('q',this.value)"></div>
    <select class="select" onchange="agtFilter('unit',this.value)"><option value="">Semua unit</option>${units.map((x) => `<option ${u.unit === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
    <select class="select" onchange="agtFilter('status',this.value)"><option value="">Semua status</option>${['Aktif', 'Nonaktif', 'Keluar'].map((x) => `<option ${u.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
    ${drpButton('anggota', 'Bergabung')}</div>
    <div id="agt-table"></div></div>`;
  renderAgtTable();
}
const agtFilter = debounce((k, v) => { S.ui.agt[k] = v; S.ui.agt.page = 1; renderAgtTable(); }, 150);
function renderAgtTable() {
  const u = S.ui.agt, q = (u.q || '').toLowerCase(), size = 25;
  const list = S.db.Anggota.filter((a) => (!u.status || a.status === u.status) && (!u.unit || a.unit === u.unit) && inDr('anggota', a.tanggal_gabung) && (!q || (a.nama + ' ' + a.no_anggota + ' ' + a.unit + ' ' + a.kontak).toLowerCase().indexOf(q) >= 0))
    .sort((a, b) => String(a.nama).localeCompare(b.nama));
  const start = (u.page - 1) * size, rows = list.slice(start, start + size);
  $('#agt-table').innerHTML = list.length ? `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>Anggota</th><th>No. anggota</th><th>Unit / perusahaan</th><th>Kontak</th><th>Bergabung</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.map((a) => `<tr><td data-m="full"><div class="row" style="gap:10px"><span class="avatar" style="background:var(--primary-soft);color:var(--primary)">${initials(a.nama)}</span><b>${esc(a.nama)}</b></div></td>
      <td class="mono small">${esc(a.no_anggota || '-')}</td><td data-m="hide">${esc(a.unit || '-')}</td><td data-m="hide" class="mono small">${esc(a.kontak || '-')}${a.email ? `<div class="t-sub">${esc(a.email)}</div>` : ''}</td>
      <td data-m="hide" class="mono small">${fmtDate(a.tanggal_gabung)}</td><td><span class="chip ${a.status === 'Aktif' ? 'chip-in' : 'chip-mute'}">${esc(a.status || '-')}</span></td>
      <td data-m="hide"><div class="row-actions">${a.kontak ? `<a class="btn-icon sm" href="${waLink(a.kontak, 'Halo ' + a.nama + ',')}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="bi bi-whatsapp" style="color:#25D366"></i></a>` : ''}${canW() ? `<button class="btn-icon sm" onclick="openAnggotaForm('${a.id}')" aria-label="Ubah"><i class="bi bi-pencil"></i></button>` : ''}</div></td></tr>`).join('')}
    </tbody></table></div><div class="tbl-foot"><span>Menampilkan ${start + 1}–${start + rows.length} dari ${list.length} anggota</span>${pager(list.length, u.page, size, 'agtPage')}</div>`
    : emptyState('bi-people', 'Belum ada anggota', '', canW() ? '<button class="btn btn-primary btn-sm" onclick="openAnggotaForm()">Tambah anggota</button>' : '');
}
function agtPage(p) { S.ui.agt.page = p; renderAgtTable(); }
function openAnggotaForm(id) {
  if (!canW('anggota')) return;
  const rec = id ? clone(findLocal('Anggota', id)) : { status: 'Aktif', tanggal_gabung: todayStr() };
  openEntityForm('Anggota', id ? 'Ubah Data Anggota' : 'Tambah Anggota', [
    { k: 'nama', label: 'Nama lengkap', req: true, full: true },
    { k: 'no_anggota', label: 'No. anggota', ph: 'mis. SP-0001' },
    { k: 'unit', label: 'Unit / perusahaan', ph: 'mis. Produksi 1' },
    { k: 'kontak', label: 'No. HP / WhatsApp', type: 'tel', ph: '08xxxxxxxxxx' },
    { k: 'email', label: 'Email', type: 'email' },
    { k: 'tanggal_gabung', label: 'Tanggal bergabung', type: 'date' },
    { k: 'status', label: 'Status', type: 'select', opts: [['Aktif', 'Aktif'], ['Nonaktif', 'Nonaktif'], ['Keluar', 'Keluar']] }
  ], rec, {});
}

// ════════════════ HALAMAN: LAPORAN ════════════════
function renderLaporan() {
  const tab = S.ui.lapTab, { from, to } = S.range, f = flows(from, to);
  const year = S.ui.lapYear || Number(to.slice(0, 4));
  const yearsAvail = Array.from(new Set(S.db.Transaksi.map((t) => Number(String(t.tanggal).slice(0, 4))).concat([new Date().getFullYear()]))).filter(Boolean).sort((a, b) => b - a);
  const head = pageHead('Laporan', 'Laporan & Rekapitulasi', 'Grafik dan tabel siap cetak untuk rapat atau pertanggungjawaban. Ekspor ke Excel atau PDF sesuai rentang tanggal.',
    `${tab === 'inventaris' ? '' : drpButton('global', 'Periode')}<button class="btn btn-secondary" onclick="exportExcel('${tab === 'inventaris' ? 'inventaris' : 'laporan'}')"><i class="bi bi-file-earmark-excel"></i><span class="lbl">Ekspor Excel</span></button>
     <button class="btn btn-primary" onclick="exportPDF('${tab === 'inventaris' ? 'inventaris' : 'laporan'}')"><i class="bi bi-file-earmark-pdf"></i><span class="lbl">Cetak / PDF</span></button>`);
  const tabs = `<div class="tabs">${[['keuangan', 'Laporan Keuangan', 'bi-graph-up'], ['bulanan', 'Rekap Bulanan', 'bi-calendar3'], ['tahunan', 'Rekap Tahunan', 'bi-calendar-range'], ['inventaris', 'Laporan Inventaris', 'bi-box-seam']]
    .map(([k, l, i]) => `<button class="${tab === k ? 'on' : ''}" onclick="S.ui.lapTab='${k}';renderLaporan()"><i class="bi ${i}"></i>${l}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'keuangan') {
    const months = monthsBetween(from, to);
    const series = months.map((m) => { const ff = flows(m + '-01', monthEnd(Number(m.slice(0, 4)), Number(m.slice(5)))); return { label: BLN[Number(m.slice(5)) - 1] + (months.length > 12 ? " '" + m.slice(2, 4) : ''), masuk: ff.masuk, keluar: ff.keluar }; });
    const outE = Object.entries(f.outKat).sort((a, b) => b[1] - a[1]), inE = Object.entries(f.inKat).sort((a, b) => b[1] - a[1]);
    const awal = totalKas(addDays(from, -1)), akhir = totalKas(to);
    body = `<div class="grid g-4 g-kpi-m">
      <div class="card kpi"><span class="kpi-label">Saldo awal periode</span><div class="kpi-value">${fmtRp(awal)}</div><div class="kpi-foot">per ${fmtDate(addDays(from, -1))}</div></div>
      <div class="card kpi"><span class="kpi-label">Pemasukan</span><div class="kpi-value t-in">+${fmtRp(f.masuk)}</div><div class="kpi-foot">${f.nMasuk} transaksi</div></div>
      <div class="card kpi"><span class="kpi-label">Pengeluaran</span><div class="kpi-value t-out">-${fmtRp(f.keluar)}</div><div class="kpi-foot">${f.nKeluar} transaksi</div></div>
      <div class="card kpi"><span class="kpi-label">Saldo akhir periode</span><div class="kpi-value t-primary">${fmtRp(akhir)}</div><div class="kpi-foot">${deltaChip(akhir, awal)} per ${fmtDate(to)}</div></div></div>
    <div class="grid g-2 mt-24">
      <div class="card card-pad"><div class="card-head"><div><h3>Komposisi Pengeluaran</h3><p>Per kategori</p></div></div>${outE.length ? `<div class="chart-box" style="height:240px"><canvas id="ch-lap-out"></canvas></div>` : emptyState('bi-pie-chart', 'Tidak ada data')}</div>
      <div class="card card-pad"><div class="card-head"><div><h3>Arus Kas per Bulan</h3><p>Pemasukan vs pengeluaran</p></div></div><div class="chart-box" style="height:240px"><canvas id="ch-lap-bar"></canvas></div></div></div>
    <div class="grid g-2 mt-24">
      ${katTableCard('Rincian Pemasukan per Kategori', inE, f.masuk, 't-in')}
      ${katTableCard('Rincian Pengeluaran per Kategori', outE, f.keluar, 't-out')}</div>
    <div class="card mt-24"><div class="card-head card-pad" style="margin:0;padding-bottom:12px"><div><h3>Rekap per Dompet</h3><p>Mutasi dan saldo akhir tiap dompet</p></div></div><div class="table-wrap"><table class="tbl"><thead><tr><th>Dompet</th><th class="num">Saldo awal</th><th class="num">Masuk</th><th class="num">Keluar</th><th class="num">Transfer masuk</th><th class="num">Transfer keluar</th><th class="num">Saldo akhir</th></tr></thead><tbody>
      ${S.db.Dompet.map((d) => { const p = f.perDompet[d.id] || { masuk: 0, keluar: 0, tIn: 0, tOut: 0 }; return `<tr><td><b>${esc(d.nama_dompet)}</b></td><td class="num mono">${fmtRp(saldoMap(addDays(from, -1))[d.id] || 0)}</td><td class="num mono t-in">${fmtRp(p.masuk)}</td><td class="num mono t-out">${fmtRp(p.keluar)}</td><td class="num mono t-trf">${fmtRp(p.tIn)}</td><td class="num mono t-trf">${fmtRp(p.tOut)}</td><td class="num mono"><b>${fmtRp(saldoMap(to)[d.id] || 0)}</b></td></tr>`; }).join('')}
      </tbody></table></div></div>`;
    setTimeout(() => {
      if (outE.length) mkChart('lapOut', 'ch-lap-out', { type: 'bar', data: { labels: outE.map(([k]) => katOf(k).nama), datasets: [{ data: outE.map((e) => e[1]), backgroundColor: outE.map(([k]) => katOf(k).warna), borderRadius: 6, maxBarThickness: 22 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ' ' + fmtRp(c.parsed.x) } } }, scales: { x: { ticks: { callback: (v) => fmtShort(v) } }, y: { grid: { display: false } } } } });
      mkChart('lapBar', 'ch-lap-bar', { type: 'bar', data: { labels: series.map((s) => s.label), datasets: [{ label: 'Masuk', data: series.map((s) => s.masuk), backgroundColor: cssVar('--in'), borderRadius: 5, maxBarThickness: 18 }, { label: 'Keluar', data: series.map((s) => s.keluar), backgroundColor: cssVar('--out'), borderRadius: 5, maxBarThickness: 18 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }, tooltip: tooltipRp }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => fmtShort(v) } } } } });
    });
  } else if (tab === 'bulanan') {
    const rows = rekapBulanan(year);
    const tot = rows.reduce((a, r) => ({ masuk: a.masuk + r.masuk, keluar: a.keluar + r.keluar }), { masuk: 0, keluar: 0 });
    body = `<div class="row" style="margin-bottom:16px"><span class="muted">Tahun</span><select class="select" style="width:auto" onchange="S.ui.lapYear=Number(this.value);renderLaporan()">${yearsAvail.map((y) => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
    <div class="card card-pad"><div class="chart-box" style="height:260px"><canvas id="ch-rekap-b"></canvas></div></div>
    <div class="card mt-24"><div class="table-wrap"><table class="tbl"><thead><tr><th>Bulan</th><th class="num">Pemasukan</th><th class="num">Pengeluaran</th><th class="num">Selisih</th><th class="num">Saldo kas akhir bulan</th><th class="num">Transaksi</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td><b>${BULAN[r.m - 1]}</b></td><td class="num mono t-in">${fmtRp(r.masuk)}</td><td class="num mono t-out">${fmtRp(r.keluar)}</td><td class="num mono ${r.net >= 0 ? 't-in' : 't-out'}">${fmtRp(r.net, { sign: true })}</td><td class="num mono">${fmtRp(r.saldo)}</td><td class="num mono">${r.n}</td></tr>`).join('')}
      <tr style="background:var(--surface-2)"><td><b>Total ${year}</b></td><td class="num mono t-in"><b>${fmtRp(tot.masuk)}</b></td><td class="num mono t-out"><b>${fmtRp(tot.keluar)}</b></td><td class="num mono"><b>${fmtRp(tot.masuk - tot.keluar, { sign: true })}</b></td><td></td><td></td></tr></tbody></table></div></div>`;
    setTimeout(() => mkChart('rekapB', 'ch-rekap-b', { type: 'bar', data: { labels: BLN, datasets: [{ label: 'Masuk', data: rows.map((r) => r.masuk), backgroundColor: cssVar('--in'), borderRadius: 5, maxBarThickness: 16 }, { label: 'Keluar', data: rows.map((r) => r.keluar), backgroundColor: cssVar('--out'), borderRadius: 5, maxBarThickness: 16 }, { type: 'line', label: 'Saldo kas', data: rows.map((r) => r.saldo), borderColor: cssVar('--primary'), tension: .35, pointRadius: 2, yAxisID: 'y' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }, tooltip: tooltipRp }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => fmtShort(v) } } } } }));
  } else if (tab === 'tahunan') {
    const rows = rekapTahunan();
    body = `<div class="card"><div class="table-wrap"><table class="tbl"><thead><tr><th>Tahun</th><th class="num">Pemasukan</th><th class="num">Pengeluaran</th><th class="num">Selisih</th><th class="num">Saldo kas akhir tahun</th><th class="num">Pertumbuhan kas</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td><b>${r.y}</b></td><td class="num mono t-in">${fmtRp(r.masuk)}</td><td class="num mono t-out">${fmtRp(r.keluar)}</td><td class="num mono ${r.net >= 0 ? 't-in' : 't-out'}">${fmtRp(r.net, { sign: true })}</td><td class="num mono"><b>${fmtRp(r.saldo)}</b></td><td class="num">${rows[i + 1] ? deltaChip(r.saldo, rows[i + 1].saldo) : '—'}</td></tr>`).join('') || `<tr><td colspan="6">${emptyState('bi-calendar', 'Belum ada data')}</td></tr>`}
      </tbody></table></div></div>`;
  } else {
    const items = S.db.Inventaris.slice().sort((a, b) => String(a.kode).localeCompare(b.kode));
    const byKat = {}; items.forEach((b) => { const k = katOf(b.id_kategori).nama; byKat[k] = byKat[k] || { n: 0, unit: 0, nilai: 0 }; byKat[k].n++; byKat[k].unit += num(b.jumlah); byKat[k].nilai += num(b.nilai); });
    body = `<div class="grid g-2"><div class="card"><div class="card-head card-pad" style="margin:0;padding-bottom:12px"><h3>Ringkasan per Kategori Aset</h3></div><div class="table-wrap"><table class="tbl" style="min-width:0"><thead><tr><th>Kategori</th><th class="num">Jenis</th><th class="num">Unit</th><th class="num">Nilai</th></tr></thead><tbody>
      ${Object.entries(byKat).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num mono">${v.n}</td><td class="num mono">${v.unit}</td><td class="num mono">${fmtRp(v.nilai)}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="card card-pad"><h3 style="font-size:18px">Kondisi Aset</h3><div class="chart-box mt-16" style="height:220px"><canvas id="ch-inv"></canvas></div></div></div>
    <div class="card mt-24"><div class="table-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Nama barang</th><th>Kategori</th><th>Lokasi</th><th>Dibeli</th><th class="num">Jumlah</th><th class="num">Nilai</th><th>Kondisi</th></tr></thead><tbody>
      ${items.map((b) => `<tr><td class="mono small">${esc(b.kode)}</td><td><b>${esc(b.nama_barang)}</b></td><td>${esc(katOf(b.id_kategori).nama)}</td><td>${esc(b.lokasi || '-')}</td><td class="mono small">${fmtDate(b.tanggal_beli)}</td><td class="num mono">${num(b.jumlah)} ${esc(b.satuan || '')}</td><td class="num mono">${b.nilai ? fmtRp(b.nilai) : '-'}</td><td>${condChip(b.kondisi)}</td></tr>`).join('')}</tbody></table></div></div>`;
    setTimeout(() => { const c = ['Baik', 'Perlu Servis', 'Rusak'].map((k) => items.filter((b) => b.kondisi === k).reduce((a, b) => a + num(b.jumlah), 0));
      mkChart('inv', 'ch-inv', { type: 'doughnut', data: { labels: ['Baik', 'Perlu Servis', 'Rusak'], datasets: [{ data: c, backgroundColor: [cssVar('--in'), cssVar('--accent'), cssVar('--out')], borderWidth: 3, borderColor: cssVar('--surface') }] }, options: { cutout: '65%', maintainAspectRatio: false, plugins: { legend: { position: 'right' } } } }); });
  }
  $('#sec-laporan').innerHTML = head + tabs + body;
}
function katTableCard(title, entries, total, cls) {
  return `<div class="card"><div class="card-head card-pad" style="margin:0;padding-bottom:12px"><h3>${title}</h3></div><div class="table-wrap"><table class="tbl" style="min-width:0"><thead><tr><th>Kategori</th><th class="num">Jumlah</th><th class="num">Porsi</th></tr></thead><tbody>
    ${entries.map(([k, v]) => `<tr><td><span class="dot" style="background:${katOf(k).warna};margin-right:8px"></span>${esc(katOf(k).nama)}</td><td class="num mono ${cls}">${fmtRp(v)}</td><td class="num mono muted">${fmtPct(pct(v, total))}</td></tr>`).join('') || '<tr><td colspan="3" class="muted center">Tidak ada data</td></tr>'}
    <tr style="background:var(--surface-2)"><td><b>Total</b></td><td class="num mono ${cls}"><b>${fmtRp(total)}</b></td><td class="num mono">100%</td></tr></tbody></table></div></div>`;
}
function monthsBetween(from, to) {
  const out = []; let d = new Date(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, 1); const end = new Date(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, 1);
  while (d <= end && out.length < 60) { out.push(d.getFullYear() + '-' + pad(d.getMonth() + 1)); d = new Date(d.getFullYear(), d.getMonth() + 1, 1); }
  return out;
}
function rekapBulanan(year) {
  return BULAN.map((_, i) => { const m = i + 1, ff = flows(monthStart(year, m), monthEnd(year, m)); return { m, masuk: ff.masuk, keluar: ff.keluar, net: ff.net, n: ff.list.length, saldo: totalKas(monthEnd(year, m)) }; });
}
function rekapTahunan() {
  const ys = Array.from(new Set(S.db.Transaksi.map((t) => Number(String(t.tanggal).slice(0, 4))))).filter(Boolean).sort((a, b) => b - a);
  return ys.map((y) => { const ff = flows(y + '-01-01', y + '-12-31'); return { y, masuk: ff.masuk, keluar: ff.keluar, net: ff.net, saldo: totalKas(y + '-12-31') }; });
}

// ════════════════ EKSPOR EXCEL & PDF (di klien, tanpa beban server) ════════════════
const libCache = {};
/** Muat skrip dari daftar CDN berurutan (maks 7 detik per CDN), di-cache per pustaka. */
function loadLib(urls) {
  urls = [].concat(urls);
  const key = urls[0];
  if (libCache[key]) return libCache[key];
  const tryOne = (i) => new Promise((res, rej) => {
    if (i >= urls.length) return rej(new Error('Gagal memuat pustaka. Periksa koneksi internet.'));
    const sc = document.createElement('script');
    let done = false;
    const fail = () => { if (done) return; done = true; sc.remove(); tryOne(i + 1).then(res, rej); };
    const t = setTimeout(fail, 7000);
    sc.src = urls[i]; sc.async = true;
    sc.onload = () => { if (done) return; done = true; clearTimeout(t); res(); };
    sc.onerror = () => { clearTimeout(t); fail(); };
    document.head.appendChild(sc);
  });
  libCache[key] = tryOne(0).catch((e) => { delete libCache[key]; throw e; });
  return libCache[key];
}
function fileStamp() { return (S.settings.nama_aplikasi || 'KASBURUH').replace(/\W+/g, '_') + '_' + S.range.from + '_sd_' + S.range.to; }
// ════════════════ EXCEL (.xlsx) — penulis & pembaca bawaan, tanpa CDN ════════════════
/**
 * Penulis xlsx minimal namun lengkap gaya: warna isi, huruf, garis, format Rupiah/tanggal,
 * gabung sel, kunci baris judul, filter otomatis, dan daftar pilihan (dropdown).
 * Berkas disusun sebagai ZIP (tanpa kompresi) langsung di browser.
 */
const XL = (() => {
  const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const NS = ['http:', '', 'schemas.openxmlformats.org', ''].join('/');  // dirakit agar tidak dianggap komentar oleh Apps Script
  const XMLH = '<' + '?xml version="1.0" encoding="UTF-8" standalone="yes"?' + '>';
  const enc = new TextEncoder();
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const x = (v) => String(v === null || v === undefined ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const colL = (i) => { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const ref = (r, c) => colL(c) + (r + 1);
  const hex = (h) => 'FF' + String(h || '000000').replace('#', '').toUpperCase().slice(0, 6);

  function zip(files) {
    const parts = [], central = []; let off = 0;
    files.forEach((f) => {
      const nm = enc.encode(f.name), d = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(d);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 33, true); h.setUint32(14, crc, true); h.setUint32(18, d.length, true);
      h.setUint32(22, d.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nm, d);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 33, true); c.setUint32(16, crc, true);
      c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, nm.length, true);
      c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true);
      c.setUint32(38, 0, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), nm);
      off += 30 + nm.length + d.length;
    });
    const size = central.reduce((a, b) => a + b.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(4, 0, true); e.setUint16(6, 0, true); e.setUint16(8, files.length, true);
    e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true); e.setUint16(20, 0, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: MIME });
  }

  /** Registri gaya: objek gaya {b,i,sz,color,fill,border,h,v,wrap,fmt,indent} → indeks cellXfs. */
  function Styles() {
    const fonts = ['<font><sz val="10"/><color rgb="FF0B1C30"/><name val="Calibri"/><family val="2"/></font>'];
    const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
    const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    const FMT = { rp: 164, int: 3, pct: 165, date: 166, text: 49 };
    const NUMFMTS = [[164, '"Rp" #,##0;[Red]-"Rp" #,##0'], [165, '0.0%'], [166, 'dd mmm yyyy']];
    const cache = {};
    const put = (arr, v) => { let i = arr.indexOf(v); if (i < 0) { arr.push(v); i = arr.length - 1; } return i; };
    const side = (n, st, col) => (st ? `<${n} style="${st}"><color rgb="${hex(col)}"/></${n}>` : `<${n}/>`);
    function get(s) {
      if (!s) return 0;
      const key = JSON.stringify(s);
      if (key in cache) return cache[key];
      const f = put(fonts, `<font>${s.b ? '<b/>' : ''}${s.i ? '<i/>' : ''}<sz val="${s.sz || 10}"/><color rgb="${hex(s.color || '0B1C30')}"/><name val="Calibri"/><family val="2"/></font>`);
      const fi = s.fill ? put(fills, `<fill><patternFill patternType="solid"><fgColor rgb="${hex(s.fill)}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
      let bo = 0;
      if (s.border) {
        const c = s.borderColor || 'E2E8F0', all = s.border === 'all', bt = s.border === 'bottom' || all, tp = s.border === 'top' || all;
        bo = put(borders, `<border>${side('left', all ? 'thin' : '', c)}${side('right', all ? 'thin' : '', c)}${side('top', tp ? (s.border === 'top' ? 'medium' : 'thin') : '', c)}${side('bottom', bt ? (s.border === 'bottom' ? 'medium' : 'thin') : '', c)}<diagonal/></border>`);
      }
      const nf = s.fmt ? FMT[s.fmt] : 0;
      const al = `<alignment${s.h ? ` horizontal="${s.h}"` : ''} vertical="${s.v || 'center'}"${s.wrap ? ' wrapText="1"' : ''}${s.indent ? ` indent="${s.indent}"` : ''}/>`;
      const i = put(xfs, `<xf numFmtId="${nf}" fontId="${f}" fillId="${fi}" borderId="${bo}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${al}</xf>`);
      cache[key] = i; return i;
    }
    function xml() {
      return XMLH + `<styleSheet xmlns="${NS}spreadsheetml/2006/main"><numFmts count="${NUMFMTS.length}">${NUMFMTS.map(([id, c]) => `<numFmt numFmtId="${id}" formatCode="${x(c)}"/>`).join('')}</numFmts>` +
        `<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
        `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    }
    return { get, xml };
  }

  /** Tanggal 'yyyy-mm-dd' → nomor seri Excel. */
  function serial(s) {
    const p = String(s || '').slice(0, 10).split('-').map(Number);
    if (p.length < 3 || !p[0]) return null;
    return (Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(1899, 11, 30)) / 86400000;
  }

  function sheetXml(sh, st) {
    const rows = sh.rows || [];
    const width = Math.max(1, (sh.cols || []).length, ...rows.map((r) => (r ? r.length : 0)));
    const out = [];
    rows.forEach((row, ri) => {
      const ht = sh.heights && sh.heights[ri];
      const cells = (row || []).map((cell, ci) => {
        if (cell === null || cell === undefined || cell === '') return '';
        const o = typeof cell === 'object' && !(cell instanceof Date) ? cell : { v: cell };
        const s = st.get(o.s);
        const r = ref(ri, ci);
        let v = o.v;
        if (o.f) return `<c r="${r}" s="${s}"><f>${x(o.f)}</f></c>`;
        if (o.date) { const n = serial(v); if (n !== null) return `<c r="${r}" s="${s}"><v>${n}</v></c>`; }
        if (v === null || v === undefined || v === '') return s ? `<c r="${r}" s="${s}"/>` : '';
        if (typeof v === 'number' && isFinite(v)) return `<c r="${r}" s="${s}"><v>${v}</v></c>`;
        return `<c r="${r}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
      }).join('');
      out.push(`<row r="${ri + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>${cells}</row>`);
    });
    const fr = sh.freeze || 0;
    const view = `<sheetViews><sheetView workbookViewId="0" showGridLines="0"${sh.zoom ? ` zoomScale="${sh.zoom}"` : ''}>` +
      (fr ? `<pane ySplit="${fr}" topLeftCell="A${fr + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${fr + 1}" sqref="A${fr + 1}"/>` : '') + '</sheetView></sheetViews>';
    const cols = (sh.cols || []).map((c, i) => { const o = typeof c === 'object' ? c : { w: c };
      return `<col min="${i + 1}" max="${i + 1}" width="${o.w || 12}" customWidth="1"${o.s ? ` style="${st.get(o.s)}"` : ''}/>`; }).join('');
    const merges = (sh.merges || []);
    const vals = (sh.validations || []);
    return XMLH + `<worksheet xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships">` +
      `<sheetPr>${sh.tab ? `<tabColor rgb="${hex(sh.tab)}"/>` : ''}<pageSetUpPr fitToPage="1"/></sheetPr>` +
      `<dimension ref="A1:${ref(Math.max(0, rows.length - 1), width - 1)}"/>` + view + '<sheetFormatPr defaultRowHeight="18"/>' +
      (cols ? `<cols>${cols}</cols>` : '') + `<sheetData>${out.join('')}</sheetData>` +
      (sh.autofilter ? `<autoFilter ref="${sh.autofilter}"/>` : '') +
      (merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '') +
      (vals.length ? `<dataValidations count="${vals.length}">${vals.map((v) => `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="Nilai tidak valid" error="Pilih dari daftar." sqref="${v.sqref}"><formula1>${v.ref ? x(v.ref) : '"' + x(v.list.join(',')) + '"'}</formula1></dataValidation>`).join('')}</dataValidations>` : '') +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
      `<pageSetup paperSize="9" orientation="${sh.portrait ? 'portrait' : 'landscape'}" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  }

  /** sheets: [{name, cols, rows, merges, heights, freeze, autofilter, validations, tab}] → Blob .xlsx */
  function build(sheets) {
    const st = Styles();
    const clean = (n, i) => (String(n || 'Sheet' + (i + 1)).replace(/[\[\]:*?\\/]/g, ' ').slice(0, 31) || 'Sheet' + (i + 1));
    const names = sheets.map((sh, i) => clean(sh.name, i));
    const xmls = sheets.map((sh) => sheetXml(sh, st));
    const defs = sheets.map((sh, i) => (sh.autofilter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${names[i].replace(/'/g, "''")}'!${sh.autofilter.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')}</definedName>` : '')).join('');
    const files = [
      { name: '[Content_Types].xml', data: XMLH + `<Types xmlns="${NS}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        xmls.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>' },
      { name: '_rels/.rels', data: XMLH + `<Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rId1" Type="${NS}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: 'xl/workbook.xml', data: XMLH + `<workbook xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>` +
        names.map((n, i) => `<sheet name="${x(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"${sheets[i].hidden ? ' state="hidden"' : ''}/>`).join('') + `</sheets>${defs ? `<definedNames>${defs}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
      { name: 'xl/_rels/workbook.xml.rels', data: XMLH + `<Relationships xmlns="${NS}package/2006/relationships">` +
        names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
        `<Relationship Id="rId${names.length + 1}" Type="${NS}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` }
    ];
    xmls.forEach((d, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: d }));
    files.push({ name: 'xl/styles.xml', data: st.xml() });
    return zip(files);
  }

  // ── Pembaca: .xlsx (ZIP + XML) dan .csv → array baris sheet pertama ──
  async function inflate(data) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Browser terlalu lama untuk membaca Excel. Gunakan Chrome/Firefox/Edge terbaru atau simpan sebagai CSV.');
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const d = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === d) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  /** Buka berkas .xlsx: daftar sheet (nama, path, tersembunyi) + pembaca baris per sheet. */
  async function openBook(file) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const dv = new DataView(buf.buffer);
    let e = buf.length - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('Berkas bukan Excel .xlsx yang valid.');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
    const dec = new TextDecoder(), entries = {};
    for (let i = 0; i < n; i++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
      entries[dec.decode(buf.subarray(p + 46, p + 46 + nl))] = { method, csize, lho };
      p += 46 + nl + el + cl;
    }
    const get = async (fn) => {
      const en = entries[fn]; if (!en) return null;
      const start = en.lho + 30 + dv.getUint16(en.lho + 26, true) + dv.getUint16(en.lho + 28, true);
      const raw = buf.subarray(start, start + en.csize);
      return dec.decode(en.method === 8 ? await inflate(raw) : raw);
    };
    const dom = (s) => new DOMParser().parseFromString(s, 'application/xml');
    const tags = (d, t) => Array.from(d.getElementsByTagNameNS('*', t));
    const sheets = [];
    const wb = await get('xl/workbook.xml'), rels = await get('xl/_rels/workbook.xml.rels');
    if (wb && rels) {
      const relEls = tags(dom(rels), 'Relationship');
      tags(dom(wb), 'sheet').forEach((s1) => {
        const rid = s1.getAttribute('r:id') || s1.getAttributeNS(NS + 'officeDocument/2006/relationships', 'id');
        const rel = relEls.find((r) => r.getAttribute('Id') === rid);
        if (!rel) return;
        let t = String(rel.getAttribute('Target') || '');
        while (t.charAt(0) === '/' || t.charAt(0) === '.') t = t.slice(1);
        if (t.indexOf('xl/') === 0) t = t.slice(3);
        const stt = s1.getAttribute('state') || '';
        sheets.push({ name: s1.getAttribute('name') || '', path: 'xl/' + t, hidden: stt === 'hidden' || stt === 'veryHidden' });
      });
    }
    const any = Object.keys(entries).find((k) => /^xl\/worksheets\/[^\/]+\.xml$/.test(k)) || '';
    if (!sheets.length && any) sheets.push({ name: 'Sheet1', path: any, hidden: false });
    const sstXml = await get('xl/sharedStrings.xml');
    const sst = sstXml ? tags(dom(sstXml), 'si').map((si) => tags(si, 't').map((t) => t.textContent).join('')) : [];
    const rowsOf = async (path) => {
      const sx = await get(path); if (!sx) return null;
      const rows = [];
      tags(dom(sx), 'row').forEach((rw, idx) => {
        const rn = Number(rw.getAttribute('r')) || idx + 1, arr = [];
        tags(rw, 'c').forEach((c, ci) => {
          const r = c.getAttribute('r'); let col = ci;
          if (r) { const L = r.replace(/\d+/g, ''); col = 0; for (let k = 0; k < L.length; k++) col = col * 26 + (L.charCodeAt(k) - 64); col -= 1; }
          const t = c.getAttribute('t'), vEl = tags(c, 'v')[0];
          let v = vEl ? vEl.textContent : '';
          if (t === 's') v = sst[Number(v)] || '';
          else if (t === 'inlineStr') v = tags(c, 't').map((z) => z.textContent).join('');
          else if (t === 'b') v = v === '1';
          else if (t !== 'str' && t !== 'e' && v !== '' && isFinite(Number(v))) v = Number(v);
          arr[col] = v;
        });
        rows[rn - 1] = arr;
      });
      for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
      return rows;
    };
    return { sheets, any, rowsOf };
  }
  async function read(file) {
    const name = String(file.name || '').toLowerCase();
    if (/\.csv$/.test(name)) return parseCsv(await file.text());
    if (/\.xls$/.test(name)) throw new Error('Format .xls lama tidak didukung. Buka di Excel lalu "Simpan Sebagai" .xlsx.');
    const bk = await openBook(file);
    const rows = (bk.sheets[0] && await bk.rowsOf(bk.sheets[0].path)) || (bk.any && await bk.rowsOf(bk.any));
    if (!rows) throw new Error('Sheet pertama tidak ditemukan di berkas.');
    return rows;
  }
  /** Semua sheet: [{name, hidden, rows}] (CSV = satu sheet). */
  async function readAll(file) {
    const name = String(file.name || '').toLowerCase();
    if (/\.csv$/.test(name)) return [{ name: file.name.replace(/\.csv$/i, ''), hidden: false, rows: parseCsv(await file.text()) }];
    if (/\.xls$/.test(name)) throw new Error('Format .xls lama tidak didukung. Buka di Excel lalu "Simpan Sebagai" .xlsx.');
    const bk = await openBook(file), out = [];
    for (const sh of bk.sheets) { const rows = await bk.rowsOf(sh.path); if (rows) out.push({ name: sh.name, hidden: sh.hidden, rows }); }
    return out;
  }
  return { build, read, readAll, serial, MIME, zip };
})();

// ── Tema Excel mengikuti warna aplikasi ──
function xlTheme() {
  const p = String(S.settings.warna_utama || '#6247EA').replace('#', '');
  const mix = (h, w) => { const n = parseInt(h, 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const m = (c) => Math.round(c + (255 - c) * w).toString(16).padStart(2, '0'); return (m(r) + m(g) + m(b)).toUpperCase(); };
  const T = { p, soft: mix(p, 0.88), navy: '141B2B', muted: '64748B', line: 'E2E8F0', alt: 'F8FAFC', inn: '12A150', out: 'E5484D', trf: '2F6FED', warn: 'B45309' };
  const S0 = {
    title: { b: true, sz: 16, color: 'FFFFFF', fill: T.navy, indent: 1 },
    sub: { sz: 10, color: 'C9D1E3', fill: T.navy, indent: 1 },
    band: { fill: T.navy },
    accent: { fill: T.p },
    meta: { sz: 9, color: T.muted, i: true, indent: 1 },
    section: { b: true, sz: 12, color: T.navy, border: 'bottom', borderColor: T.p },
    th: { b: true, color: 'FFFFFF', fill: T.p, h: 'center', border: 'all', borderColor: T.p, wrap: true },
    kLabel: { sz: 9, b: true, color: T.muted, fill: T.alt, border: 'all', indent: 1 },
    kVal: { sz: 14, b: true, color: T.navy, fill: 'FFFFFF', border: 'all', fmt: 'rp', h: 'left', indent: 1 }
  };
  const td = (alt, extra) => Object.assign({ border: 'all', fill: alt ? T.alt : 'FFFFFF' }, extra || {});
  return { T, S: S0, td };
}
/** Bagian judul standar: pita navy + garis aksen + info cetak. Mengembalikan jumlah baris terpakai. */
function xlHeader(sheet, ncol, title, subtitle) {
  const { S: X } = xlTheme();
  const last = String.fromCharCode(64 + Math.min(26, ncol));
  const fill = (s, v) => Array.from({ length: ncol }, (_, i) => ({ v: i === 0 ? v : '', s }));
  sheet.rows.push(fill(X.title, title), fill(X.sub, subtitle), fill(X.accent, ''),
    [{ v: 'Dicetak ' + new Date().toLocaleString('id-ID') + (S.user ? ' oleh ' + S.user.nama + ' (' + S.user.peran + ')' : '') + ' · ' + (S.settings.nama_aplikasi || 'KASBURUH'), s: X.meta }], []);
  sheet.merges.push('A1:' + last + '1', 'A2:' + last + '2', 'A3:' + last + '3', 'A4:' + last + '4');
  sheet.heights = Object.assign(sheet.heights || {}, { 0: 32, 1: 20, 2: 4 });
  return sheet.rows.length;
}
/** Tabel bergaya: header warna utama, baris belang, garis halus, total. cols: [{h, k, w, fmt, color(row)}] */
function xlTable(sheet, cols, data, opt) {
  opt = opt || {};
  const { S: X, td, T } = xlTheme();
  const hr = sheet.rows.length;
  sheet.rows.push(cols.map((c) => ({ v: c.h, s: X.th })));
  sheet.heights[hr] = 24;
  data.forEach((row, i) => {
    sheet.rows.push(cols.map((c) => {
      const v = typeof c.k === 'function' ? c.k(row) : row[c.k];
      const color = c.color ? c.color(row) : null;
      const s = td(i % 2 === 1, { fmt: c.fmt, h: c.h2 || (c.fmt === 'rp' || c.fmt === 'int' ? 'right' : (c.fmt === 'date' || c.center ? 'center' : 'left')),
        color: color || undefined, b: c.bold || undefined, wrap: c.wrap || undefined, indent: c.fmt ? undefined : 1 });
      const rf = opt.rowFill ? opt.rowFill(row) : null; if (rf) s.fill = rf;
      return { v: v === undefined || v === null ? '' : v, s, date: c.fmt === 'date' };
    }));
  });
  if (opt.total) {
    sheet.rows.push(cols.map((c, i) => ({ v: opt.total[i] === undefined ? '' : opt.total[i],
      s: { b: true, fill: T.soft, border: 'all', borderColor: T.line, fmt: typeof opt.total[i] === 'number' ? c.fmt || 'rp' : undefined,
        h: typeof opt.total[i] === 'number' ? 'right' : 'left', color: T.navy, indent: typeof opt.total[i] === 'number' ? undefined : 1 } })));
  }
  if (!data.length) sheet.rows.push([{ v: 'Tidak ada data pada periode ini.', s: { i: true, color: T.muted, indent: 1 } }]);
  if (opt.filter !== false && data.length) {
    const lastCol = String.fromCharCode(64 + cols.length);
    sheet.autofilter = 'A' + (hr + 1) + ':' + lastCol + (hr + 1 + data.length);
  }
  if (opt.freeze) sheet.freeze = hr + 1;
  return hr;
}
function xlSave(sheets, filename) {
  downloadBlob(XL.build(sheets), filename.replace(/[\\/:*?"<>|]+/g, '_') + '.xlsx');
}

/** Ekspor Excel bergaya (mengikuti tampilan aplikasi). kind: laporan | transaksi | inventaris | anggota */
async function exportExcel(kind) {
  if (kind === 'tagihan' || kind === 'gathering' || kind === 'undian') { try { exportExcelX(kind); } catch (e) { console.error(e); toast(e.message, 'error', 'Ekspor gagal'); } return; }
  try {
    const { T, S: X } = xlTheme();
    const app = S.settings.nama_aplikasi || 'KASBURUH', org = S.settings.subjudul || '';
    const { from, to } = S.range, f = flows(from, to);
    const per = fmtDate(from, 'long') + ' s.d. ' + fmtDate(to, 'long');
    const inOut = (r) => (r.jenis === 'Masuk' ? T.inn : r.jenis === 'Keluar' ? T.out : T.trf);
    if (kind === 'inventaris') {
      const items = S.db.Inventaris.slice().sort((a, b) => String(a.kode).localeCompare(b.kode));
      const sh = { name: 'Inventaris', cols: [12, 34, 20, 10, 10, 15, 22, 13, 17, 34], rows: [], merges: [], heights: {}, tab: T.p };
      xlHeader(sh, 10, 'LAPORAN INVENTARIS & ASET FISIK', org + ' · per ' + fmtDate(todayStr(), 'long'));
      const units = items.reduce((a, b) => a + num(b.jumlah), 0), nilai = items.reduce((a, b) => a + num(b.nilai), 0);
      const k = sh.rows.length;
      sh.rows.push([{ v: 'JENIS BARANG', s: X.kLabel }, { v: '', s: X.kLabel }, { v: 'TOTAL UNIT', s: X.kLabel }, { v: '', s: X.kLabel }, { v: 'NILAI ASET', s: X.kLabel }, { v: '', s: X.kLabel }, { v: 'PERLU SERVIS / RUSAK', s: X.kLabel }, { v: '', s: X.kLabel }]);
      sh.rows.push([{ v: items.length, s: Object.assign({}, X.kVal, { fmt: 'int' }) }, { v: '', s: X.kVal }, { v: units, s: Object.assign({}, X.kVal, { fmt: 'int' }) }, { v: '', s: X.kVal },
        { v: nilai, s: X.kVal }, { v: '', s: X.kVal }, { v: items.filter((b) => b.kondisi !== 'Baik').length + ' jenis', s: Object.assign({}, X.kVal, { fmt: undefined, color: T.warn }) }, { v: '', s: X.kVal }]);
      ['A', 'C', 'E', 'G'].forEach((c) => { const n = String.fromCharCode(c.charCodeAt(0) + 1); sh.merges.push(c + (k + 1) + ':' + n + (k + 1), c + (k + 2) + ':' + n + (k + 2)); });
      sh.heights[k + 1] = 28; sh.rows.push([]);
      xlTable(sh, [{ h: 'Kode', k: 'kode', center: true }, { h: 'Nama Barang', k: 'nama_barang', bold: true }, { h: 'Kategori', k: (b) => katOf(b.id_kategori).nama },
        { h: 'Jumlah', k: (b) => num(b.jumlah), fmt: 'int' }, { h: 'Satuan', k: (b) => b.satuan || 'Unit', center: true },
        { h: 'Kondisi', k: 'kondisi', center: true, color: (b) => (b.kondisi === 'Baik' ? T.inn : b.kondisi === 'Rusak' ? T.out : T.warn), bold: true },
        { h: 'Lokasi', k: (b) => b.lokasi || '-' }, { h: 'Dibeli', k: (b) => (b.tanggal_beli ? fmtDate(b.tanggal_beli) : '-'), center: true },
        { h: 'Nilai', k: (b) => num(b.nilai), fmt: 'rp' }, { h: 'Catatan', k: (b) => b.catatan || '', wrap: true }], items,
      { freeze: true, total: ['TOTAL', items.length + ' jenis', '', units, '', '', '', '', nilai, ''] });
      xlSave([sh], app + '_Inventaris_' + todayStr());
    } else if (kind === 'anggota') {
      const list = S.db.Anggota.slice().sort((a, b) => String(a.nama).localeCompare(b.nama));
      const sh = { name: 'Anggota', cols: [6, 14, 32, 26, 18, 26, 15, 12], rows: [], merges: [], heights: {}, tab: T.p };
      xlHeader(sh, 8, 'DATA ANGGOTA SERIKAT', org + ' · ' + list.length + ' anggota · ' + list.filter((a) => a.status === 'Aktif').length + ' aktif');
      xlTable(sh, [{ h: 'No', k: (a) => list.indexOf(a) + 1, fmt: 'int' }, { h: 'No. Anggota', k: (a) => a.no_anggota || '-', center: true }, { h: 'Nama', k: 'nama', bold: true },
        { h: 'Organisasi / Unit', k: (a) => a.unit || '-' }, { h: 'No HP', k: (a) => a.kontak || '-' }, { h: 'Email', k: (a) => a.email || '-' },
        { h: 'Bergabung', k: 'tanggal_gabung', fmt: 'date' }, { h: 'Status', k: (a) => (a.status === 'Nonaktif' ? 'Tidak Aktif' : a.status), center: true, bold: true, color: (a) => (a.status === 'Aktif' ? T.inn : T.muted) }],
      list, { freeze: true });
      xlSave([sh], app + '_Anggota_' + todayStr());
    } else {
      // ── Sheet 1: Ringkasan
      const awal = totalKas(addDays(from, -1)), akhir = totalKas(to);
      const r1 = { name: 'Ringkasan', cols: [26, 18, 26, 18, 26, 18], rows: [], merges: [], heights: {}, tab: T.p, portrait: true };
      xlHeader(r1, 6, 'LAPORAN KEUANGAN', org + ' · Periode ' + per);
      const kp = [['SALDO AWAL', awal, T.navy], ['TOTAL PEMASUKAN', f.masuk, T.inn], ['TOTAL PENGELUARAN', f.keluar, T.out], ['SALDO AKHIR', akhir, T.p]];
      const k0 = r1.rows.length;
      r1.rows.push(kp.slice(0, 2).flatMap(([l]) => [{ v: l, s: X.kLabel }, { v: '', s: X.kLabel }]).concat([{ v: 'SELISIH BERSIH', s: X.kLabel }, { v: '', s: X.kLabel }]));
      r1.rows.push(kp.slice(0, 2).flatMap(([, v, c]) => [{ v, s: Object.assign({}, X.kVal, { color: c }) }, { v: '', s: X.kVal }]).concat([{ v: f.net, s: Object.assign({}, X.kVal, { color: f.net >= 0 ? T.inn : T.out }) }, { v: '', s: X.kVal }]));
      r1.rows.push(kp.slice(2).flatMap(([l]) => [{ v: l, s: X.kLabel }, { v: '', s: X.kLabel }]).concat([{ v: 'JUMLAH TRANSAKSI', s: X.kLabel }, { v: '', s: X.kLabel }]));
      r1.rows.push(kp.slice(2).flatMap(([, v, c]) => [{ v, s: Object.assign({}, X.kVal, { color: c }) }, { v: '', s: X.kVal }]).concat([{ v: f.list.length, s: Object.assign({}, X.kVal, { fmt: 'int' }) }, { v: '', s: X.kVal }]));
      for (let r = 0; r < 4; r++) ['A', 'C', 'E'].forEach((c) => r1.merges.push(c + (k0 + r + 1) + ':' + String.fromCharCode(c.charCodeAt(0) + 1) + (k0 + r + 1)));
      r1.heights[k0 + 1] = 30; r1.heights[k0 + 3] = 30;
      r1.rows.push([]);
      const sec = (t) => { const n = r1.rows.length; r1.rows.push(Array.from({ length: 6 }, (_, i) => ({ v: i ? '' : t, s: X.section }))); r1.merges.push('A' + (n + 1) + ':F' + (n + 1)); r1.heights[n] = 24; };
      sec('Rincian per Kategori');
      const katRows = Object.entries(f.inKat).sort((a, b) => b[1] - a[1]).map(([kk, v]) => ({ nama: katOf(kk).nama, jenis: 'Masuk', v, p: f.masuk ? v / f.masuk : 0 }))
        .concat(Object.entries(f.outKat).sort((a, b) => b[1] - a[1]).map(([kk, v]) => ({ nama: katOf(kk).nama, jenis: 'Keluar', v, p: f.keluar ? v / f.keluar : 0 })));
      xlTable(r1, [{ h: 'Kategori', k: 'nama', bold: true }, { h: 'Jenis', k: 'jenis', center: true, color: inOut, bold: true }, { h: 'Jumlah', k: 'v', fmt: 'rp', color: inOut }, { h: 'Porsi', k: 'p', fmt: 'pct' }], katRows, { filter: false });
      r1.rows.push([]);
      sec('Rekap per Dompet');
      const ps = saldoMap(addDays(from, -1)), pe = saldoMap(to);
      xlTable(r1, [{ h: 'Dompet', k: 'nama_dompet', bold: true }, { h: 'Saldo Awal', k: (d) => ps[d.id] || 0, fmt: 'rp' }, { h: 'Masuk', k: (d) => (f.perDompet[d.id] || {}).masuk || 0, fmt: 'rp', color: () => T.inn },
        { h: 'Keluar', k: (d) => (f.perDompet[d.id] || {}).keluar || 0, fmt: 'rp', color: () => T.out }, { h: 'Transfer ±', k: (d) => ((f.perDompet[d.id] || {}).tIn || 0) - ((f.perDompet[d.id] || {}).tOut || 0), fmt: 'rp', color: () => T.trf },
        { h: 'Saldo Akhir', k: (d) => pe[d.id] || 0, fmt: 'rp', bold: true }], S.db.Dompet,
      { filter: false, total: ['TOTAL', awal, f.masuk, f.keluar, 0, akhir] });
      // ── Sheet 2: Transaksi (buku kas)
      const list = (kind === 'transaksi' ? filteredTrx() : f.list).slice().sort((a, b) => String(a.tanggal).localeCompare(b.tanggal));
      const t2 = { name: 'Buku Kas', cols: [13, 22, 11, 22, 26, 42, 16, 16, 16, 18], rows: [], merges: [], heights: {}, tab: T.inn };
      xlHeader(t2, 10, 'BUKU KAS · RINCIAN TRANSAKSI', org + ' · Periode ' + per + ' · ' + list.length + ' transaksi');
      const sum = (j) => list.filter((t) => t.jenis === j).reduce((a, t) => a + num(t.jumlah), 0);
      xlTable(t2, [{ h: 'Tanggal', k: 'tanggal', fmt: 'date' }, { h: 'No. Referensi', k: (t) => t.no_ref || '', color: () => T.p },
        { h: 'Jenis', k: 'jenis', center: true, bold: true, color: inOut }, { h: 'Kategori', k: (t) => (t.jenis === 'Transfer' ? 'Transfer Kas' : katOf(t.id_kategori).nama) },
        { h: 'Dompet', k: (t) => (t.jenis === 'Transfer' ? dompetName(t.id_dompet) + ' → ' + dompetName(t.id_dompet_tujuan) : dompetName(t.id_dompet)) },
        { h: 'Keterangan', k: (t) => t.keterangan || '', wrap: true }, { h: 'Masuk', k: (t) => (t.jenis === 'Masuk' ? num(t.jumlah) : ''), fmt: 'rp', color: () => T.inn },
        { h: 'Keluar', k: (t) => (t.jenis === 'Keluar' ? num(t.jumlah) : ''), fmt: 'rp', color: () => T.out }, { h: 'Transfer', k: (t) => (t.jenis === 'Transfer' ? num(t.jumlah) : ''), fmt: 'rp', color: () => T.trf },
        { h: 'Dicatat oleh', k: (t) => t.dibuat_oleh || '' }], list,
      { freeze: true, total: ['TOTAL', '', '', '', '', 'Selisih: ' + fmtRp(sum('Masuk') - sum('Keluar'), { sign: true }), sum('Masuk'), sum('Keluar'), sum('Transfer'), ''] });
      // ── Sheet 3: Rekap bulanan
      const yr = Number(to.slice(0, 4)), rb = rekapBulanan(yr);
      const t3 = { name: 'Rekap Bulanan ' + yr, cols: [16, 18, 18, 18, 20, 12], rows: [], merges: [], heights: {}, tab: T.trf, portrait: true };
      xlHeader(t3, 6, 'REKAP BULANAN ' + yr, org);
      xlTable(t3, [{ h: 'Bulan', k: (r) => BULAN[r.m - 1], bold: true }, { h: 'Pemasukan', k: 'masuk', fmt: 'rp', color: () => T.inn }, { h: 'Pengeluaran', k: 'keluar', fmt: 'rp', color: () => T.out },
        { h: 'Selisih', k: 'net', fmt: 'rp', bold: true }, { h: 'Saldo Akhir Bulan', k: 'saldo', fmt: 'rp' }, { h: 'Transaksi', k: 'n', fmt: 'int' }], rb,
      { filter: false, total: ['TOTAL ' + yr, rb.reduce((a, r) => a + r.masuk, 0), rb.reduce((a, r) => a + r.keluar, 0), rb.reduce((a, r) => a + r.net, 0), '', rb.reduce((a, r) => a + r.n, 0)] });
      // ── Sheet 4: Rekap tahunan
      const ry = rekapTahunan();
      const t4 = { name: 'Rekap Tahunan', cols: [12, 18, 18, 18, 20], rows: [], merges: [], heights: {}, tab: T.warn, portrait: true };
      xlHeader(t4, 5, 'REKAP TAHUNAN', org);
      xlTable(t4, [{ h: 'Tahun', k: 'y', center: true, bold: true }, { h: 'Pemasukan', k: 'masuk', fmt: 'rp', color: () => T.inn }, { h: 'Pengeluaran', k: 'keluar', fmt: 'rp', color: () => T.out },
        { h: 'Selisih', k: 'net', fmt: 'rp', bold: true }, { h: 'Saldo Akhir Tahun', k: 'saldo', fmt: 'rp' }], ry, { filter: false });
      xlSave([r1, t2, t3, t4], fileStamp());
    }
    toast('Berkas Excel terunduh.', 'success');
  } catch (e) { console.error(e); toast(e.message, 'error', 'Ekspor gagal'); }
}

// ════════════════ IMPOR EXCEL MASSAL (Anggota · Inventaris · Pengguna) ════════════════
const IMPORT_CFG = {
  anggota: {
    title: 'Impor Anggota dari Excel', file: 'Format_Impor_Anggota',
    cols: [
      { k: 'nama', h: 'Nama', req: true, w: 30, al: ['nama', 'nama lengkap', 'nama anggota'], note: 'Wajib. Nama lengkap anggota.' },
      { k: 'hp', h: 'No HP', w: 18, text: true, al: ['no hp', 'nohp', 'hp', 'no telepon', 'telepon', 'nomor hp', 'no wa', 'whatsapp'], note: 'Opsional. Format 08xxxxxxxxxx (kolom sudah berformat teks).' },
      { k: 'organisasi', h: 'Organisasi', w: 28, al: ['organisasi', 'unit', 'perusahaan', 'unit kerja'], note: 'Opsional. Unit kerja / perusahaan / PUK.' },
      { k: 'status', h: 'Status', w: 16, list: ['Aktif', 'Tidak Aktif'], al: ['status'], note: 'Pilih Aktif atau Tidak Aktif (kosong = Aktif).' }
    ],
    sample: [['Budi Santoso', '081234567890', 'PT Maju Jaya - Produksi', 'Aktif'], ['Siti Rahmawati', '085712345678', 'PT Maju Jaya - Logistik', 'Aktif'], ['Agus Prasetyo', '081398765432', 'PUK Cikarang', 'Tidak Aktif']],
    check(r) {
      if (!r.nama) return 'Nama kosong';
      const st = String(r.status || '').trim().toLowerCase();
      if (st && ['aktif', 'tidak aktif', 'nonaktif', 'non aktif', 'keluar'].indexOf(st) < 0) return 'Status harus Aktif/Tidak Aktif';
      const hp = String(r.hp || '').replace(/[^\d+]/g, '');
      if (hp && !/^(\+?62|0)?8\d{7,13}$/.test(hp)) return 'No HP tidak valid';
      return '';
    }
  },
  inventaris: {
    title: 'Impor Barang Inventaris dari Excel', file: 'Format_Impor_Inventaris',
    cols: [
      { k: 'nama', h: 'Nama Barang', req: true, w: 32, al: ['nama barang', 'barang', 'nama', 'nama aset'], note: 'Wajib. Nama barang/aset.' },
      { k: 'kategori', h: 'Kategori', w: 22, al: ['kategori', 'jenis', 'kategori aset'], note: 'Opsional. Kategori baru dibuat otomatis bila belum ada.' },
      { k: 'jumlah', h: 'Jumlah', req: true, w: 10, al: ['jumlah', 'qty', 'unit', 'banyak'], note: 'Wajib. Angka (unit).' },
      { k: 'kondisi', h: 'Kondisi', w: 16, list: ['Baik', 'Perlu Servis', 'Rusak'], al: ['kondisi'], note: 'Baik / Perlu Servis / Rusak (kosong = Baik).' },
      { k: 'nilai', h: 'Nilai', w: 16, money: true, al: ['nilai', 'harga', 'nilai aset', 'harga beli'], note: 'Opsional. Nilai/harga dalam Rupiah, angka saja.' },
      { k: 'catatan', h: 'Catatan', w: 34, al: ['catatan', 'keterangan', 'ket'], note: 'Opsional.' }
    ],
    sample: [['Tenda Posko 4x4m', 'Logistik Aksi', 3, 'Baik', 4500000, ''], ['Bola Futsal Mikasa', 'Olahraga', 10, 'Baik', 1500000, 'Untuk turnamen antar-PUK'], ['Proyektor Epson', 'Elektronik Kantor', 1, 'Perlu Servis', 5800000, 'Lampu redup']],
    check(r) {
      if (!r.nama) return 'Nama barang kosong';
      if (r.jumlah === '' || r.jumlah === undefined || !isFinite(Number(String(r.jumlah).replace(/[^\d.-]/g, ''))) || String(r.jumlah).replace(/[^\d.-]/g, '') === '') return 'Jumlah harus angka';
      const k = String(r.kondisi || '').trim().toLowerCase();
      if (k && !/^(baik|perlu servis|servis|rusak|afkir|rusak \/ afkir)$/.test(k)) return 'Kondisi harus Baik/Perlu Servis/Rusak';
      return '';
    }
  },
  pengguna: {
    title: 'Impor Pengguna dari Excel', file: 'Format_Impor_Pengguna',
    cols: [
      { k: 'nama', h: 'Nama', req: true, w: 30, al: ['nama', 'nama lengkap'], note: 'Wajib. Nama lengkap pengguna.' },
      { k: 'npp', h: 'NPP', req: true, w: 16, text: true, al: ['npp', 'username', 'nik', 'no pegawai'], note: 'Wajib. Dipakai sebagai username & sandi awal. Role Anggota = 5 digit angka (contoh 67221).' },
      { k: 'jabatan', h: 'Jabatan', req: true, w: 26, al: ['jabatan', 'jabatan kerja', 'posisi', 'jabatan pekerjaan'], note: 'Wajib. Jabatan pekerjaan, mis. Branch Manager, Supervisor, Wakil Pemimpin. Tidak memengaruhi hak akses.' },
      { k: 'peran', h: 'Peran', w: 22, list: ['Anggota', 'Ketua', 'Wakil Ketua', 'Bendahara', 'Sekretaris', 'Humas & Publikasi', 'Sosial & Agama', 'OR & Seni', 'Advokasi & Hukum'], al: ['peran', 'role', 'peran aplikasi', 'hak akses'], note: 'Hak akses di aplikasi. Pilih dari daftar (kosong = Anggota). Super Admin hanya lewat formulir.' }
    ],
    sample: [['Dedi Kurniawan', '67221', 'Supervisor', 'Anggota'], ['Eka Lestari', '67222', 'Wakil Pemimpin', 'Anggota'], ['Fajar Nugroho', 'fajar.bendahara', 'Branch Manager', 'Bendahara']],
    check(r) {
      if (!r.nama) return 'Nama kosong';
      if (!String(r.jabatan === undefined || r.jabatan === null ? '' : r.jabatan).trim()) return 'Jabatan wajib diisi';
      const npp = String(r.npp === undefined ? '' : r.npp).trim().toLowerCase();
      const pr = String(r.peran || 'Anggota').trim().toLowerCase();
      if (editableRoles().map((x) => x.toLowerCase()).indexOf(pr) < 0) return pr === 'super admin' ? 'Super Admin hanya lewat formulir' : 'Peran tidak dikenal';
      if (pr === 'anggota' && !/^\d{5}$/.test(npp)) return 'NPP Anggota wajib 5 digit angka';
      if (pr !== 'anggota' && !/^[a-z0-9._]{3,30}$/.test(npp)) return 'NPP/username 3-30 karakter tanpa spasi';
      if (S.users.some((u) => String(u.username).toLowerCase() === npp)) return 'NPP sudah terdaftar';
      return '';
    }
  }
};
IMPORT_CFG.tagihan = {
  title: 'Impor Tagihan dari Excel', file: 'Format_Impor_Tagihan',
  cols: [
    { k: 'nama', h: 'Nama/Vendor', req: true, w: 36, al: ['nama vendor', 'nama', 'vendor', 'nama tagihan', 'tagihan', 'nama dan vendor'], note: 'Wajib. Nama tagihan dan/atau vendor, mis. "Iuran Federasi - DPN SP".' },
    { k: 'nominal', h: 'Nominal', req: true, w: 18, money: true, al: ['nominal', 'jumlah', 'nilai', 'biaya'], note: 'Wajib. Angka Rupiah, mis. 5000000.' },
    { k: 'jatuh_tempo', h: 'Jatuh Tempo', req: true, w: 16, date: true, al: ['jatuh tempo', 'tanggal jatuh tempo', 'tanggal', 'due date', 'tgl jatuh tempo'], note: 'Wajib. Tanggal Excel atau teks dd-mm-yyyy (contoh 28-11-2026).' },
    { k: 'pengulangan', h: 'Pengulangan', w: 16, list: ['Sekali', 'Mingguan', 'Bulanan', 'Tahunan'], al: ['pengulangan', 'berulang', 'periode', 'siklus'], note: 'Sekali / Mingguan / Bulanan / Tahunan (kosong = Sekali).' },
    { k: 'status', h: 'Status', w: 16, list: ['Lunas', 'Belum Lunas'], al: ['status'], note: 'Lunas / Belum Lunas (kosong = Belum Lunas).' },
    { k: 'keterangan', h: 'Keterangan', w: 32, formula: (row) => 'IF(E' + row + '="Belum Lunas","BELUM LUNAS","")', al: ['keterangan', 'catatan', 'ket'], note: 'Otomatis "BELUM LUNAS" bila status Belum Lunas. Boleh diganti catatan lain.' }
  ],
  sample: [['Iuran Federasi Nasional - DPN SP', 5000000, '2026-11-28', 'Bulanan', 'Belum Lunas'], ['Sewa Lapangan Futsal - GOR Cikarang', 600000, '2026-11-30', 'Mingguan', 'Belum Lunas'], ['Langganan Zoom Serikat', 250000, '2026-10-01', 'Bulanan', 'Lunas']],
  check(r) {
    if (!r.nama) return 'Nama/Vendor kosong';
    if (!(Number(String(r.nominal).replace(/[^\d-]/g, '')) > 0)) return 'Nominal harus angka > 0';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.jatuh_tempo))) return 'Jatuh tempo tidak valid (dd-mm-yyyy)';
    const pg = String(r.pengulangan || '').trim().toLowerCase();
    if (pg && ['sekali', 'mingguan', 'bulanan', 'tahunan'].indexOf(pg) < 0) return 'Pengulangan harus Sekali/Mingguan/Bulanan/Tahunan';
    const st = String(r.status || '').trim().toLowerCase();
    if (st && ['lunas', 'belum lunas', 'belum'].indexOf(st) < 0) return 'Status harus Lunas/Belum Lunas';
    return '';
  }
};
/** Nilai tanggal dari Excel (nomor seri / dd-mm-yyyy / yyyy-mm-dd) → 'yyyy-mm-dd' atau null. */
function xlDateIso(v) {
  if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10);
  const t = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  return parseDmy(t);
}
const IMP = { kind: null, rows: [], file: '' };

/** Unduh format Excel impor (lengkap dengan dropdown, kolom teks, dan petunjuk). */
function downloadTemplate(kind) {
  if (IMPORT_CFG[kind].template) { try { IMPORT_CFG[kind].template(); } catch (e) { console.error(e); toast(e.message, 'error'); } return; }
  const cfg = IMPORT_CFG[kind], { T, S: X } = xlTheme();
  const n = cfg.cols.length, lastRow = 1005;
  const sh = { name: 'Format Impor', cols: cfg.cols.map((c) => ({ w: c.w, s: c.text ? { fmt: 'text' } : c.date ? { fmt: 'date', h: 'center' } : c.money ? { fmt: 'rp' } : null })), rows: [], merges: [], heights: {}, tab: T.p, validations: [] };
  xlHeader(sh, n, cfg.title.toUpperCase(), 'Isi data mulai baris 7 · Jangan ubah judul kolom · Ganti/hapus 3 baris contoh');
  const hr = sh.rows.length;
  sh.rows.push(cfg.cols.map((c) => ({ v: c.h + (c.req ? ' *' : ''), s: X.th })));
  sh.heights[hr] = 26;
  cfg.sample.forEach((r) => sh.rows.push(r.map((v, i) => ({ v, date: !!cfg.cols[i].date, s: { i: true, color: T.muted, border: 'all', fill: T.soft, fmt: cfg.cols[i].text ? 'text' : cfg.cols[i].money ? 'rp' : cfg.cols[i].date ? 'date' : undefined, indent: cfg.cols[i].date ? undefined : 1, h: cfg.cols[i].date ? 'center' : undefined } }))));
  sh.freeze = hr + 1;
  // Kolom berformula (mis. Keterangan "BELUM LUNAS" otomatis) untuk baris contoh + 200 baris isian
  cfg.cols.forEach((c, ci) => {
    if (!c.formula) return;
    for (let r = hr + 1; r <= hr + 200; r++) { if (!sh.rows[r]) sh.rows[r] = []; sh.rows[r][ci] = { f: c.formula(r + 1), s: { b: true, color: T.out, indent: 1, border: r <= hr + cfg.sample.length ? 'all' : undefined, fill: r <= hr + cfg.sample.length ? T.soft : undefined } }; }
  });
  cfg.cols.forEach((c, i) => { if (c.list) { const L = String.fromCharCode(65 + i); sh.validations.push({ sqref: L + (hr + 2) + ':' + L + lastRow, list: c.list }); } });
  const help = { name: 'Petunjuk', cols: [22, 12, 70], rows: [], merges: [], heights: {}, tab: T.navy, portrait: true };
  xlHeader(help, 3, 'PETUNJUK PENGISIAN', cfg.title);
  xlTable(help, [{ h: 'Kolom', k: 'h', bold: true }, { h: 'Wajib', k: (c) => (c.req ? 'Ya' : 'Tidak'), center: true, color: (c) => (c.req ? T.out : T.muted) },
    { h: 'Keterangan & nilai yang diterima', k: (c) => c.note + (c.list ? ' Pilihan: ' + c.list.join(', ') + '.' : ''), wrap: true }], cfg.cols, { filter: false });
  help.rows.push([]);
  const tips = ['1. Isi data pada sheet "Format Impor" mulai baris 7 (di bawah judul kolom).', '2. Baris contoh berwarna boleh ditimpa; jika dibiarkan, baris contoh otomatis dilewati.',
    '3. Simpan sebagai .xlsx lalu unggah di aplikasi. Maksimal 500 baris per impor.', '4. Aplikasi menampilkan pratinjau & baris bermasalah sebelum data disimpan.'];
  if (kind === 'inventaris') tips.push('5. Kategori yang sudah ada: ' + (katsBy('Inventaris').map((k) => k.nama).join(', ') || '-') + '.');
  if (kind === 'pengguna') tips.push('5. Sandi awal setiap akun = NPP. Pengguna wajib membuat sandi baru saat login pertama.');
  (cfg.tips || []).forEach((t) => tips.push(t));
  tips.forEach((t) => help.rows.push([{ v: t, s: { color: T.navy, indent: 1 } }]));
  xlSave([sh, help], cfg.file);
  toast('Format Excel terunduh.', 'success');
}

function openImport(kind) {
  const cfg = IMPORT_CFG[kind]; IMP.kind = kind; IMP.rows = []; IMP.file = '';
  openModal({ title: cfg.title, size: 'wide', body: `
    <div class="imp-steps">
      <div class="imp-step on" id="imp-s1"><span class="n">1</span><div><b>Unduh format</b><small>${cfg.colsText ? esc(cfg.colsText) : 'Kolom: ' + cfg.cols.map((c) => c.h).join(', ')}</small></div></div>
      <div class="imp-step" id="imp-s2"><span class="n">2</span><div><b>Isi &amp; unggah</b><small>.xlsx atau .csv, maks. 500 baris</small></div></div>
      <div class="imp-step" id="imp-s3"><span class="n">3</span><div><b>Periksa &amp; impor</b><small>Baris bermasalah ditandai</small></div></div>
    </div>
    <div class="row-between" style="margin-bottom:14px;flex-wrap:wrap"><span class="small muted"><i class="bi bi-info-circle"></i> Format berisi contoh, daftar pilihan (dropdown), dan petunjuk.</span>
      <button class="btn btn-soft btn-sm" onclick="downloadTemplate('${kind}')"><i class="bi bi-file-earmark-excel"></i>Unduh Format Excel</button></div>
    <label class="drop" id="imp-drop"><input type="file" accept=".xlsx,.csv" hidden onchange="importFile(this.files[0])">
      <i class="bi bi-cloud-arrow-up"></i><b>Klik untuk memilih berkas</b> atau seret ke sini<div class="small muted mt-8" id="imp-fname">Belum ada berkas</div></label>
    ${cfg.extra ? cfg.extra() : ''}<div id="imp-preview" class="mt-16"></div>`,
    foot: '<button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="imp-go" disabled><i class="bi bi-upload"></i>Impor</button>' });
  const dz = $('#imp-drop');
  ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) importFile(f); });
  $('#imp-go').onclick = runImport;
}
const normH = (s) => String(s || '').toLowerCase().split('*').join('').replace(/[^a-z0-9]+/g, ' ').trim();
async function importFile(file) {
  if (!file) return;
  const cfg = IMPORT_CFG[IMP.kind];
  $('#imp-fname').textContent = file.name + ' · membaca…';
  if (cfg.read) {
    try { const res = await cfg.read(file); IMP.rows = res.rows; IMP.file = file.name; renderImportPreview(res.samples); }
    catch (e) { $('#imp-fname').textContent = file.name; $('#imp-preview').innerHTML = `<div class="callout danger"><i class="bi bi-exclamation-octagon t-out"></i><span>${esc(e.message)}</span></div>`; $('#imp-go').disabled = true; }
    return;
  }
  try {
    const grid = await XL.read(file);
    // Cari baris judul kolom (yang memuat kolom wajib pertama)
    let hi = -1, map = {};
    for (let r = 0; r < Math.min(grid.length, 25) && hi < 0; r++) {
      const m = {};
      (grid[r] || []).forEach((v, ci) => { const h = normH(v); cfg.cols.forEach((c) => { if (m[c.k] === undefined && c.al.indexOf(h) >= 0) m[c.k] = ci; }); });
      if (m[cfg.cols[0].k] !== undefined && Object.keys(m).length >= Math.min(2, cfg.cols.length)) { hi = r; map = m; }
    }
    if (hi < 0) throw new Error('Judul kolom tidak ditemukan. Gunakan format Excel dari tombol "Unduh Format Excel".');
    const sampleNames = cfg.sample.map((s) => String(s[0]).toLowerCase());
    let samples = 0;
    const rows = [];
    for (let r = hi + 1; r < grid.length; r++) {
      const g = grid[r] || [];
      if (!g.some((v) => String(v === undefined ? '' : v).trim() !== '')) continue;
      const o = { _row: r + 1 };
      cfg.cols.forEach((c) => { const v = map[c.k] === undefined ? '' : g[map[c.k]]; o[c.k] = typeof v === 'string' ? v.trim() : (v === undefined ? '' : v); });
      if (sampleNames.indexOf(String(o.nama).toLowerCase()) >= 0) { samples++; continue; }
      cfg.cols.forEach((c) => { if (c.date) { const iso = xlDateIso(o[c.k]); if (iso) o[c.k] = iso; } });
      rows.push(o);
    }
    // Duplikat di dalam berkas
    const seen = {};
    rows.forEach((o) => {
      o._err = cfg.check(o);
      const key = IMP.kind === 'anggota' ? String(o.hp || '').replace(/\D/g, '').replace(/^(62|0)/, '') : IMP.kind === 'pengguna' ? String(o.npp).trim().toLowerCase() : '';
      if (!o._err && key) { if (seen[key]) o._err = 'Duplikat di berkas (baris ' + seen[key] + ')'; else seen[key] = o._row; }
    });
    IMP.rows = rows; IMP.file = file.name;
    renderImportPreview(samples);
  } catch (e) {
    $('#imp-fname').textContent = file.name;
    $('#imp-preview').innerHTML = `<div class="callout danger"><i class="bi bi-exclamation-octagon t-out"></i><span>${esc(e.message)}</span></div>`;
    $('#imp-go').disabled = true;
  }
}
function renderImportPreview(samples) {
  const cfg = IMPORT_CFG[IMP.kind], rows = IMP.rows, good = rows.filter((r) => !r._err), bad = rows.length - good.length;
  $('#imp-s1').className = 'imp-step done'; $('#imp-s2').className = 'imp-step done'; $('#imp-s3').className = 'imp-step on';
  $('#imp-fname').textContent = IMP.file + ' · ' + rows.length + ' baris data';
  const fmtCell = (c, v) => (c.money && v !== '' ? fmtRp(Number(String(v).replace(/[^\d-]/g, '')) || 0) : c.date && /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? dmy(v) : esc(v));
  $('#imp-preview').innerHTML = `
    <div class="row" style="flex-wrap:wrap;margin-bottom:10px"><span class="chip chip-in">${good.length} siap diimpor</span>${bad ? `<span class="chip chip-out">${bad} bermasalah (dilewati)</span>` : ''}${samples ? `<span class="chip chip-mute">${samples} baris contoh dilewati</span>` : ''}
      ${rows.length > IMPORT_LIMIT ? `<span class="chip chip-warn">Maks. ${IMPORT_LIMIT} baris per impor</span>` : ''}</div>
    ${rows.length ? `<div class="imp-table"><table class="tbl"><thead><tr><th>Baris</th>${cfg.cols.map((c) => `<th>${c.h}</th>`).join('')}<th>Status</th></tr></thead><tbody>
      ${rows.slice(0, 200).map((r) => `<tr class="${r._err ? 'bad' : ''}"><td class="mono small">${r._row}</td>${cfg.cols.map((c) => `<td>${fmtCell(c, r[c.k])}</td>`).join('')}
        <td>${r._err ? `<span class="small t-out"><i class="bi bi-x-circle"></i> ${esc(r._err)}</span>` : '<span class="small t-in"><i class="bi bi-check-circle"></i> OK</span>'}</td></tr>`).join('')}
    </tbody></table></div>${rows.length > 200 ? `<p class="small muted mt-8">Menampilkan 200 dari ${rows.length} baris.</p>` : ''}`
    : emptyState('bi-inbox', 'Tidak ada baris data', 'Isi data di bawah judul kolom lalu unggah lagi.')}
    ${IMP.kind === 'pengguna' && good.length ? '<div class="callout mt-16"><i class="bi bi-key t-primary"></i><span>Sandi awal setiap akun = NPP. Pengguna wajib membuat sandi baru saat login pertama.</span></div>' : ''}`;
  const go = $('#imp-go');
  go.disabled = !good.length || good.length > IMPORT_LIMIT;
  go.innerHTML = `<i class="bi bi-upload"></i>Impor ${good.length} data`;
}
const IMPORT_LIMIT = 500;
function runImport() {
  const good = IMP.rows.filter((r) => !r._err);
  if (!good.length) return;
  const btn = $('#imp-go'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Menyimpan ke Google Sheets…';
  const cfgI = IMPORT_CFG[IMP.kind];
  const payload = good.map((r) => { if (cfgI.payload) return cfgI.payload(r); const o = { _row: r._row }; cfgI.cols.forEach((c) => { o[c.k] = r[c.k]; }); return o; });
  const args = ['importData', S.token, IMP.kind, payload];
  if (cfgI.opts) args.push(cfgI.opts());
  api(...args).then((res) => {
    const d = res.data;
    if (IMP.kind === 'anggota') { d.records.forEach((r) => upsertLocal('Anggota', r)); afterLocalChange('Anggota'); }
    if (IMP.kind === 'inventaris') { (d.kategori || []).forEach((k) => upsertLocal('Kategori', k)); d.records.forEach((r) => upsertLocal('Inventaris', r)); afterLocalChange('Kategori'); afterLocalChange('Inventaris'); }
    if (IMP.kind === 'pengguna') { d.users.forEach((u) => S.users.push(u)); saveSnapshot(); if (S.current === 'pengaturan') renderPengaturan(); }
    if (IMP.kind === 'tagihan') { d.records.forEach((r) => upsertLocal('Tagihan', r)); afterLocalChange('Tagihan'); }
    if (cfgI.done) cfgI.done(d);
    if (d.version) S.meta.version = d.version;
    const n = (d.records || d.users || []).length;
    $('#imp-preview').innerHTML = `<div class="budget-card" style="text-align:center;padding:28px"><i class="bi bi-check-circle-fill t-in" style="font-size:40px"></i>
      <b style="font-size:18px">${n} data berhasil diimpor${(d.hadiah || []).length ? ' + ' + d.hadiah.length + ' hadiah' : ''}</b>${(d.kategori || []).length ? `<span class="small muted">${d.kategori.length} kategori baru dibuat: ${d.kategori.map((k) => esc(k.nama)).join(', ')}</span>` : ''}
      ${d.skipped.length ? `<span class="small t-out">${d.skipped.length} baris dilewati server:</span><div class="small" style="text-align:left;max-height:140px;overflow:auto">${d.skipped.map((s) => `Baris ${s.row}: ${esc(s.reason)}`).join('<br>')}</div>` : ''}</div>`;
    $('#modal-foot').innerHTML = '<button class="btn btn-primary" onclick="closeModal()">Selesai</button>';
    toast(res.message, 'success');
  }).catch((e) => { btn.disabled = false; btn.innerHTML = `<i class="bi bi-upload"></i>Impor ${good.length} data`; toast(e.message, 'error', 'Impor gagal'); });
}

async function exportPDF(kind, portalData) {
  toast('Menyiapkan PDF…', 'info');
  try {
    await loadLib(LIBS.jspdf); await loadLib(LIBS.autotable);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth(), primary = (portalData ? portalData.settings.warna_utama : S.settings.warna_utama) || '#6247EA';
    const st = portalData ? portalData.settings : S.settings;
    const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const header = (title, sub) => {
      doc.setFillColor(20, 27, 43); doc.rect(0, 0, W, 78, 'F');
      doc.setFillColor(...hex(primary)); doc.rect(0, 78, W, 4, 'F');
      doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text((st.nama_aplikasi || 'KASBURUH') + ' — ' + title, 40, 36);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text((st.subjudul || '') + '  ·  ' + sub, 40, 56);
      doc.setTextColor(30);
    };
    const footer = () => { const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.text('Dicetak ' + new Date().toLocaleString('id-ID') + (S.user && !portalData ? ' oleh ' + S.user.nama : '') + '  ·  Halaman ' + i + '/' + n, 40, doc.internal.pageSize.getHeight() - 20); } };
    const tbl = (startY, head, body, colStyles) => { doc.autoTable({ startY, head: [head], body, theme: 'grid', styles: { fontSize: 8.5, cellPadding: 5, lineColor: [226, 232, 240] }, headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: 'bold' }, columnStyles: colStyles || {}, margin: { left: 40, right: 40 } }); return doc.lastAutoTable.finalY; };
    const kpis = (y, items) => { const w = (W - 80 - 10 * (items.length - 1)) / items.length; items.forEach(([l, v, c], i) => { const x = 40 + i * (w + 10); doc.setDrawColor(226, 232, 240); doc.roundedRect(x, y, w, 54, 6, 6); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text(l.toUpperCase(), x + 10, y + 18); doc.setFontSize(12); doc.setTextColor(...(c || [11, 28, 48])); doc.setFont('courier', 'bold'); doc.text(v, x + 10, y + 40); doc.setFont('helvetica', 'normal'); }); return y + 70; };
    const chartImg = (key, y, h) => { const ch = S.charts[key]; if (!ch) return y; try { const img = ch.toBase64Image('image/png', 1); const ratio = ch.width / ch.height; const w = Math.min(W - 80, h * ratio); doc.addImage(img, 'PNG', 40, y, w, w / ratio); return y + w / ratio + 14; } catch (e) { return y; } };
    const R = [0, 0, 0], money = { halign: 'right' };
    if (portalData) {
      const p = portalData;
      header('Ringkasan Transparansi', dmy(p.from) + ' s.d. ' + dmy(p.to));
      let y = kpis(100, [['Total kas', fmtRp(p.totalKas)], ['Pemasukan', fmtRp(p.bulanIni.masuk), [18, 161, 80]], ['Pengeluaran', fmtRp(p.bulanIni.keluar), [229, 72, 77]], ['Selisih', fmtRp(p.bulanIni.masuk - p.bulanIni.keluar, { sign: true })]]);
      y = tbl(y, ['Dompet', 'Jenis', 'Saldo', 'Porsi'], p.dompet.map((d) => [d.nama, d.jenis, fmtRp(d.saldo), fmtPct(pct(d.saldo, p.totalKas))]), { 2: money, 3: money }) + 16;
      y = tbl(y, ['Bulan', 'Pemasukan', 'Pengeluaran', 'Selisih'], p.tren.map((t) => [ymLabel(t.bulan), fmtRp(t.masuk), fmtRp(t.keluar), fmtRp(t.masuk - t.keluar, { sign: true })]), { 1: money, 2: money, 3: money }) + 16;
      tbl(y, ['Kode', 'Barang', 'Kategori', 'Jumlah', 'Kondisi'], p.inventaris.map((b) => [b.kode, b.nama, b.kategori, b.jumlah + ' ' + b.satuan, b.kondisi]));
      footer(); doc.save((st.nama_aplikasi || 'Portal') + '_Ringkasan_' + p.periode + '.pdf'); toast('PDF terunduh.', 'success'); return;
    }
    const { from, to } = S.range, f = flows(from, to), per = fmtDate(from, 'long') + ' s.d. ' + fmtDate(to, 'long');
    if (kind === 'inventaris') {
      header('Laporan Inventaris', 'Per ' + fmtDate(todayStr(), 'long'));
      const items = S.db.Inventaris;
      let y = kpis(100, [['Jenis barang', String(items.length)], ['Total unit', String(items.reduce((a, b) => a + num(b.jumlah), 0))], ['Nilai aset', fmtRp(items.reduce((a, b) => a + num(b.nilai), 0))]]);
      tbl(y, ['Kode', 'Nama barang', 'Kategori', 'Lokasi', 'Dibeli', 'Jumlah', 'Nilai', 'Kondisi'], items.map((b) => [b.kode, b.nama_barang, katOf(b.id_kategori).nama, b.lokasi || '-', fmtDate(b.tanggal_beli), num(b.jumlah) + ' ' + (b.satuan || ''), b.nilai ? fmtRp(b.nilai) : '-', b.kondisi]), { 6: money });
      footer(); doc.save((st.nama_aplikasi || 'KASBURUH') + '_Inventaris_' + todayStr() + '.pdf'); toast('PDF terunduh.', 'success'); return;
    }
    header('Laporan Keuangan', per);
    let y = kpis(100, [['Saldo awal', fmtRp(totalKas(addDays(from, -1)))], ['Pemasukan', fmtRp(f.masuk), [18, 161, 80]], ['Pengeluaran', fmtRp(f.keluar), [229, 72, 77]], ['Saldo akhir', fmtRp(totalKas(to))]]);
    if (S.current === 'laporan' && S.ui.lapTab === 'keuangan') { y = chartImg('lapBar', y, 180); }
    y = tbl(y, ['Kategori', 'Jenis', 'Jumlah', 'Porsi'], Object.entries(f.inKat).sort((a, b) => b[1] - a[1]).map(([k, v]) => [katOf(k).nama, 'Masuk', fmtRp(v), fmtPct(pct(v, f.masuk))])
      .concat(Object.entries(f.outKat).sort((a, b) => b[1] - a[1]).map(([k, v]) => [katOf(k).nama, 'Keluar', fmtRp(v), fmtPct(pct(v, f.keluar))])), { 2: money, 3: money }) + 16;
    y = tbl(y, ['Dompet', 'Saldo awal', 'Masuk', 'Keluar', 'Transfer ±', 'Saldo akhir'], S.db.Dompet.map((d) => { const p = f.perDompet[d.id] || { masuk: 0, keluar: 0, tIn: 0, tOut: 0 };
      return [d.nama_dompet, fmtRp(saldoMap(addDays(from, -1))[d.id] || 0), fmtRp(p.masuk), fmtRp(p.keluar), fmtRp(p.tIn - p.tOut, { sign: true }), fmtRp(saldoMap(to)[d.id] || 0)]; }), { 1: money, 2: money, 3: money, 4: money, 5: money }) + 16;
    doc.addPage(); header('Buku Kas (Rincian Transaksi)', per);
    tbl(100, ['Tanggal', 'No. Ref', 'Keterangan', 'Kategori', 'Dompet', 'Masuk', 'Keluar'], f.list.slice().sort((a, b) => String(a.tanggal).localeCompare(b.tanggal)).map((t) => [fmtDate(t.tanggal), t.no_ref || '', t.keterangan || '',
      t.jenis === 'Transfer' ? 'Transfer' : katOf(t.id_kategori).nama, t.jenis === 'Transfer' ? dompetName(t.id_dompet) + ' → ' + dompetName(t.id_dompet_tujuan) : dompetName(t.id_dompet),
      t.jenis === 'Masuk' ? fmtRp(t.jumlah) : '', t.jenis === 'Keluar' ? fmtRp(t.jumlah) : (t.jenis === 'Transfer' ? '(' + fmtRp(t.jumlah) + ')' : '')]), { 5: money, 6: money });
    const ys = doc.lastAutoTable.finalY + 40; if (ys < doc.internal.pageSize.getHeight() - 90) {
      doc.setFontSize(9); doc.setTextColor(30); doc.text('Mengetahui,', 60, ys); doc.text('Ketua', 60, ys + 14); doc.text('Bendahara', W - 180, ys + 14);
      doc.text('( ____________________ )', 60, ys + 70); doc.text('( ____________________ )', W - 180, ys + 70);
    }
    footer(); doc.save(fileStamp() + '.pdf'); toast('PDF terunduh.', 'success');
  } catch (e) { toast(e.message, 'error', 'Ekspor PDF gagal'); }
}

// ════════════════ LAPORAN PDF & CETAK (gaya tampilan aplikasi) ════════════════
/**
 * Satu "spec" laporan → dua keluaran: PDF (jsPDF, diunduh) dan Cetak (HTML di iframe tersembunyi → dialog cetak).
 * spec: { title, subtitle, period, orientation, file, kpis:[{label,value,tone,sub}], blocks:[...] }
 * blok: section{title,note} · table{head,rows,align,chip,tone,rowTone,foot,widths} · bars{items} · chart{key} · text{text} · sign{}
 */
const RPT_TONE = { in: [18, 161, 80], out: [229, 72, 77], trf: [47, 111, 237], warn: [180, 83, 9], mute: [100, 116, 139], navy: [20, 27, 43] };
const RPT_SOFT = { in: [232, 247, 238], out: [253, 236, 236], trf: [234, 241, 254], warn: [254, 243, 226], mute: [241, 245, 249], navy: [226, 232, 240] };
const rgbHex = (a) => '#' + a.map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('');
function rptPrimary() { const h = /^#[0-9a-f]{6}$/i.test(String(S.settings.warna_utama)) ? S.settings.warna_utama : '#6247EA'; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
const rptMix = (c, w) => c.map((v) => Math.round(v + (255 - v) * w));
const toneRgb = (t) => (t === 'pri' ? rptPrimary() : RPT_TONE[t] || RPT_TONE.navy);
const toneSoft = (t) => (t === 'pri' ? rptMix(rptPrimary(), 0.88) : RPT_SOFT[t] || RPT_SOFT.mute);
/** Teks aman untuk font standar PDF (Latin-1). */
const pdfTxt = (v) => String(v === null || v === undefined ? '' : v).replace(/[–—]/g, '-').replace(/→/g, '>').replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
const rptStamp = () => { const d = srvNow(); return dmy(toYmd(d)) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const rptBy = () => (S.user ? S.user.nama + ' (' + S.user.peran + ')' : '');

/** Tombol "PDF / Cetak" (menu kecil) untuk kepala halaman. */
function rptMenu(kind) {
  return `<div class="popover-host"><button class="btn btn-secondary" onclick="toggleMenuPop('rpt-${kind}')" aria-haspopup="menu"><i class="bi bi-printer"></i><span class="lbl">PDF / Cetak</span><i class="bi bi-chevron-down small"></i></button>
    <div id="rpt-${kind}" class="popover popover-right menu-pop" hidden role="menu">
      <button role="menuitem" onclick="closePopovers();exportReport('${kind}','pdf')"><i class="bi bi-file-earmark-pdf t-out"></i><span><b>Unduh PDF</b><small>Berkas siap dibagikan</small></span></button>
      <button role="menuitem" onclick="closePopovers();exportReport('${kind}','print')"><i class="bi bi-printer t-primary"></i><span><b>Cetak</b><small>Langsung ke printer / simpan PDF</small></span></button></div></div>`;
}

async function exportReport(kind, mode) {
  try {
    const spec = RPT_SPEC[kind]();
    if (mode === 'print') { rptPrint(rptHtml(spec)); return; }
    toast('Menyiapkan PDF…', 'info');
    const doc = await rptPdf(spec);
    doc.save(spec.file.replace(/[\\/:*?"<>|]+/g, '_') + '.pdf');
    toast('PDF terunduh.', 'success');
  } catch (e) { console.error(e); toast(e.message, 'error', mode === 'print' ? 'Cetak gagal' : 'Ekspor PDF gagal'); }
}

async function rptPdf(spec) {
  await loadLib(LIBS.jspdf); await loadLib(LIBS.autotable);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: spec.orientation || 'portrait' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 34, P = rptPrimary();
  const st = S.settings, app = st.nama_aplikasi || 'KASBURUH';
  const decorated = new Set([1]);
  const mini = () => {
    doc.setFillColor(20, 27, 43); doc.rect(0, 0, W, 26, 'F'); doc.setFillColor(...P); doc.rect(0, 26, W, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255); doc.text(pdfTxt(app + '  ·  ' + spec.title), M, 17);
    if (spec.period) { doc.setFont('helvetica', 'normal'); doc.setTextColor(201, 209, 227); doc.text(pdfTxt(spec.period), W - M, 17, { align: 'right' }); }
  };
  const curPage = () => doc.internal.getCurrentPageInfo().pageNumber;
  // ── Kepala halaman pertama: pita navy + garis warna utama + logo
  doc.setFillColor(20, 27, 43); doc.rect(0, 0, W, 94, 'F');
  doc.setFillColor(30, 38, 62); doc.circle(W - 40, -10, 90, 'F');
  doc.setFillColor(...P); doc.rect(0, 94, W, 4, 'F');
  let tx = M + 62;
  const logo = String(st.logo_data || '');
  doc.setFillColor(...(/^data:image\/(png|jpe?g)/i.test(logo) ? [255, 255, 255] : P)); doc.roundedRect(M, 22, 50, 50, 11, 11, 'F');
  if (/^data:image\/(png|jpe?g)/i.test(logo)) {
    try { doc.addImage(logo, /^data:image\/png/i.test(logo) ? 'PNG' : 'JPEG', M + 5, 27, 40, 40); } catch (e) { }
  } else { doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text(pdfTxt(initials(app)), M + 25, 53, { align: 'center' }); }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(167, 177, 201);
  doc.text(pdfTxt((app + (st.subjudul ? '  ·  ' + st.subjudul : '')).toUpperCase()), tx, 34, { charSpace: 0.5 });
  doc.setFontSize(18); doc.setTextColor(255); doc.text(pdfTxt(spec.title), tx, 56);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(201, 209, 227); doc.text(pdfTxt(spec.subtitle || ''), tx, 72, { maxWidth: W - tx - 190 });
  if (spec.period) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    const pw = Math.max(118, doc.getTextWidth(pdfTxt(spec.period)) + 26), px = W - M - pw;
    doc.setFillColor(35, 44, 68); doc.roundedRect(px, 30, pw, 38, 8, 8, 'F');
    doc.setFontSize(6.5); doc.setTextColor(167, 177, 201); doc.text(pdfTxt(spec.periodLabel || 'PERIODE'), px + 13, 44, { charSpace: 0.6 });
    doc.setFontSize(9.5); doc.setTextColor(255); doc.text(pdfTxt(spec.period), px + 13, 59);
  }
  let y = 116;
  const ensure = (h) => { if (y + h > H - 48) { doc.addPage(); decorated.add(curPage()); mini(); y = 48; } };
  // ── Kartu KPI
  if (spec.kpis && spec.kpis.length) {
    const per = Math.min(spec.kpis.length, spec.orientation === 'landscape' ? 5 : 4), gap = 10, w = (W - 2 * M - gap * (per - 1)) / per, h = 60;
    spec.kpis.forEach((k, i) => {
      const kx = M + (i % per) * (w + gap), ky = y + Math.floor(i / per) * (h + gap), c = toneRgb(k.tone || 'navy');
      doc.setFillColor(255, 255, 255); doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.8); doc.roundedRect(kx, ky, w, h, 8, 8, 'FD');
      doc.setFillColor(...c); doc.roundedRect(kx, ky + 12, 3, h - 24, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(100, 116, 139); doc.text(pdfTxt(String(k.label).toUpperCase()), kx + 13, ky + 18, { charSpace: 0.4, maxWidth: w - 20 });
      let fs = 14; doc.setFontSize(fs); const val = pdfTxt(k.value);
      while (doc.getTextWidth(val) > w - 22 && fs > 8) { fs -= 0.5; doc.setFontSize(fs); }
      doc.setTextColor(...(k.tone ? c : [11, 28, 48])); doc.text(val, kx + 13, ky + 38);
      if (k.sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2); doc.setTextColor(100, 116, 139); doc.text(pdfTxt(k.sub), kx + 13, ky + 51, { maxWidth: w - 20 }); }
    });
    y += Math.ceil(spec.kpis.length / per) * (h + gap) + 8;
  }
  const blocks = spec.blocks || [];
  blocks.forEach((b) => {
    if (b.t === 'section') {
      ensure(48);
      doc.setFillColor(...P); doc.roundedRect(M, y, 4, 15, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20, 27, 43); doc.text(pdfTxt(b.title), M + 12, y + 11.5);
      if (b.note) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(100, 116, 139); doc.text(pdfTxt(b.note), W - M, y + 11.5, { align: 'right' }); }
      y += 22;
    } else if (b.t === 'text') {
      ensure(24); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(pdfTxt(b.text), W - 2 * M); doc.text(lines, M, y + 8); y += lines.length * 11 + 10;
    } else if (b.t === 'bars') {
      b.items.forEach((it) => {
        ensure(30);
        const p = it.max ? Math.max(0, Math.min(1, it.value / it.max)) : 0, c = toneRgb(it.tone || 'pri');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(20, 27, 43); doc.text(pdfTxt(it.label), M, y + 8);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...c); doc.text(pdfTxt(it.right || fmtPct(p * 100)), W - M, y + 8, { align: 'right' });
        doc.setFillColor(238, 242, 247); doc.roundedRect(M, y + 13, W - 2 * M, 7, 3.5, 3.5, 'F');
        if (p > 0) { doc.setFillColor(...c); doc.roundedRect(M, y + 13, Math.max(7, (W - 2 * M) * p), 7, 3.5, 3.5, 'F'); }
        y += 30;
      });
      y += 4;
    } else if (b.t === 'chart') {
      const ch = S.charts[b.key]; if (!ch) return;
      try {
        const img = ch.toBase64Image('image/png', 1), ratio = ch.width / ch.height, w = W - 2 * M, h = Math.min(b.h || 170, w / ratio);
        ensure(h + 12);
        doc.setDrawColor(226, 232, 240); doc.roundedRect(M, y, w, h + 8, 8, 8, 'S');
        doc.addImage(img, 'PNG', M + (w - h * ratio) / 2, y + 4, h * ratio, h); y += h + 22;
      } catch (e) { }
    } else if (b.t === 'sign') {
      ensure(100);
      const cx = [M + 30, W - M - 170];
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 41, 59);
      doc.text(pdfTxt((st.subjudul || app) + ', ' + fmtDate(todayStr(), 'long')), W - M - 170, y + 6);
      (b.labels || ['Mengetahui, Ketua', 'Bendahara']).forEach((l, i) => { doc.text(l, cx[i], y + 22); doc.setDrawColor(148, 163, 184); doc.line(cx[i], y + 80, cx[i] + 140, y + 80); });
      y += 96;
    } else if (b.t === 'table') {
      ensure(56);
      const align = b.align || {}, cs = {};
      Object.keys(align).forEach((c) => { cs[c] = Object.assign(cs[c] || {}, { halign: align[c] }); });
      Object.keys(b.widths || {}).forEach((c) => { cs[c] = Object.assign(cs[c] || {}, { cellWidth: b.widths[c] }); });
      Object.keys(b.bold || {}).forEach((c) => { cs[c] = Object.assign(cs[c] || {}, { fontStyle: 'bold' }); });
      const fillOf = (f) => (Array.isArray(f) ? f : typeof f === 'number' ? [f, f, f] : [255, 255, 255]);
      doc.autoTable({
        startY: y, head: [b.head.map(pdfTxt)], body: b.rows.length ? b.rows.map((r) => r.map(pdfTxt)) : [[{ content: b.empty || 'Tidak ada data.', colSpan: b.head.length, styles: { halign: 'center', textColor: [100, 116, 139], fontStyle: 'italic' } }]],
        foot: b.foot && b.rows.length ? [b.foot.map(pdfTxt)] : undefined, showFoot: 'lastPage', showHead: 'everyPage',
        theme: 'grid', margin: { left: M, right: M, top: 44, bottom: 48 }, columnStyles: cs,
        styles: { font: 'helvetica', fontSize: b.small ? 7.4 : 8, cellPadding: { top: 5, bottom: 5, left: 6, right: 6 }, lineColor: [226, 232, 240], lineWidth: 0.5, textColor: [30, 41, 59], valign: 'middle', overflow: 'linebreak' },
        headStyles: { fillColor: P, textColor: 255, fontStyle: 'bold', fontSize: 7.8, lineColor: P },
        footStyles: { fillColor: rptMix(P, 0.88), textColor: [20, 27, 43], fontStyle: 'bold', lineColor: [226, 232, 240] },
        bodyStyles: { fillColor: [255, 255, 255] }, alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (d) => {
          const a = align[d.column.index];
          if (d.section !== 'body') { if (a) d.cell.styles.halign = a; return; }
          if (!b.rows.length) return;
          const i = d.row.index, c = d.column.index;
          if (b.rowTone) { const t = b.rowTone(i); if (t) d.cell.styles.fillColor = toneSoft(t).map((v) => Math.min(255, v + 4)); }
          if (b.tone && b.tone[c]) { const t = b.tone[c](i); if (t) { d.cell.styles.textColor = toneRgb(t); d.cell.styles.fontStyle = 'bold'; } }
          if (b.chip && b.chip[c]) { d.cell.styles.halign = 'center'; d.cell.styles.fontStyle = 'bold'; d.cell.styles.fontSize = 7; d.cell.styles.textColor = toneRgb(b.chip[c](i) || 'mute'); }
        },
        willDrawCell: (d) => {
          if (d.section !== 'body' || !b.rows.length || !b.chip || !b.chip[d.column.index]) return;
          const txt = (d.cell.text || []).join(' ').trim(); if (!txt) return;
          const t = b.chip[d.column.index](d.row.index) || 'mute';
          doc.setFillColor(...fillOf(d.cell.styles.fillColor)); doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
          const tw = Math.min(d.cell.width - 4, doc.getTextWidth(txt) + 12), ph = 13;
          doc.setFillColor(...toneSoft(t)); doc.roundedRect(d.cell.x + (d.cell.width - tw) / 2, d.cell.y + (d.cell.height - ph) / 2, tw, ph, 6.5, 6.5, 'F');
          d.cell.styles.fillColor = false;
        },
        didDrawPage: () => { const pn = curPage(); if (!decorated.has(pn)) { decorated.add(pn); mini(); } }
      });
      y = doc.lastAutoTable.finalY + 18;
    }
  });
  // ── Kaki tiap halaman
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.6); doc.line(M, H - 32, W - M, H - 32);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2); doc.setTextColor(...P); doc.text(pdfTxt(app), M, H - 19);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text(pdfTxt('Dicetak ' + rptStamp() + (rptBy() ? ' oleh ' + rptBy() : '')), W / 2, H - 19, { align: 'center' });
    doc.text('Halaman ' + i + ' dari ' + n, W - M, H - 19, { align: 'right' });
  }
  return doc;
}

/** Versi HTML (untuk Cetak): tampilan sama dengan PDF, memakai font aplikasi. */
function rptHtml(spec) {
  const st = S.settings, app = st.nama_aplikasi || 'KASBURUH', P = rgbHex(rptPrimary()), PS = rgbHex(rptMix(rptPrimary(), 0.9));
  const tc = (t) => rgbHex(toneRgb(t)), ts = (t) => rgbHex(toneSoft(t));
  const logo = st.logo_data || st.link_logo;
  const kp = (spec.kpis || []).map((k) => `<div class="kpi"><i style="background:${k.tone ? tc(k.tone) : '#141B2B'}"></i><span>${esc(k.label)}</span><b style="color:${k.tone ? tc(k.tone) : '#0B1C30'}">${esc(k.value)}</b>${k.sub ? `<small>${esc(k.sub)}</small>` : ''}</div>`).join('');
  const body = (spec.blocks || []).map((b) => {
    if (b.t === 'section') return `<h2><i></i>${esc(b.title)}${b.note ? `<small>${esc(b.note)}</small>` : ''}</h2>`;
    if (b.t === 'text') return `<p class="note">${esc(b.text)}</p>`;
    if (b.t === 'bars') return `<div class="bars">${b.items.map((it) => { const p = it.max ? Math.max(0, Math.min(1, it.value / it.max)) : 0;
      return `<div class="bar"><div><b>${esc(it.label)}</b><span style="color:${tc(it.tone || 'pri')}">${esc(it.right || fmtPct(p * 100))}</span></div><em><u style="width:${(p * 100).toFixed(1)}%;background:${tc(it.tone || 'pri')}"></u></em></div>`; }).join('')}</div>`;
    if (b.t === 'chart') { const ch = S.charts[b.key]; if (!ch) return ''; try { return `<div class="chart"><img src="${ch.toBase64Image('image/png', 1)}" alt=""></div>`; } catch (e) { return ''; } }
    if (b.t === 'sign') return `<div class="sign"><p>${esc((st.subjudul || app) + ', ' + fmtDate(todayStr(), 'long'))}</p><div>${(b.labels || ['Mengetahui, Ketua', 'Bendahara']).map((l) => `<span>${esc(l)}<i></i></span>`).join('')}</div></div>`;
    if (b.t === 'table') {
      const al = b.align || {};
      const cell = (v, i, c) => {
        const a = b.chip && b.chip[c] ? 'center' : al[c] || 'left';
        if (b.chip && b.chip[c] && String(v).trim()) { const t = b.chip[c](i) || 'mute'; return `<td style="text-align:center"><span class="chip" style="background:${ts(t)};color:${tc(t)}">${esc(v)}</span></td>`; }
        const t = b.tone && b.tone[c] ? b.tone[c](i) : null;
        return `<td style="text-align:${a}${t ? ';color:' + tc(t) + ';font-weight:600' : ''}${b.bold && b.bold[c] ? ';font-weight:600' : ''}">${esc(v)}</td>`;
      };
      return `<table class="${b.small ? 'small' : ''}"><thead><tr>${b.head.map((h, c) => `<th style="text-align:${al[c] || 'left'}">${esc(h)}</th>`).join('')}</tr></thead><tbody>
        ${b.rows.length ? b.rows.map((r, i) => { const rt = b.rowTone ? b.rowTone(i) : null; return `<tr${rt ? ` style="background:${ts(rt)}"` : ''}>${r.map((v, c) => cell(v, i, c)).join('')}</tr>`; }).join('')
        : `<tr><td colspan="${b.head.length}" class="empty">${esc(b.empty || 'Tidak ada data.')}</td></tr>`}</tbody>
        ${b.foot && b.rows.length ? `<tfoot><tr>${b.foot.map((v, c) => `<td style="text-align:${al[c] || 'left'}">${esc(v)}</td>`).join('')}</tr></tfoot>` : ''}</table>`;
    }
    return '';
  }).join('');
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(spec.file)}</title>
<link rel="stylesheet" href="https:&#47;&#47;fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap">
<style>
@page { size: A4 ${spec.orientation === 'landscape' ? 'landscape' : 'portrait'}; margin: 11mm 10mm 14mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 11px/1.45 Inter, Arial, sans-serif; color: #1E293B; background: #fff; }
.hd { background: #141B2B; color: #fff; border-radius: 14px; padding: 18px 20px; display: flex; gap: 16px; align-items: center; position: relative; overflow: hidden; border-bottom: 4px solid ${P}; }
.hd:after { content: ''; position: absolute; right: -60px; top: -90px; width: 220px; height: 220px; border-radius: 50%; background: rgba(255,255,255,.05); }
.lg { width: 52px; height: 52px; border-radius: 12px; background: ${logo ? '#fff' : P}; display: grid; place-items: center; overflow: hidden; flex: none; font-weight: 700; font-size: 19px; }
.lg img { width: 100%; height: 100%; object-fit: cover; }
.hd .t { flex: 1; min-width: 0; } .hd small { display: block; font-size: 8.5px; letter-spacing: .14em; color: #A7B1C9; font-weight: 700; text-transform: uppercase; }
.hd h1 { margin: 2px 0 2px; font-size: 21px; letter-spacing: -.02em; } .hd p { margin: 0; color: #C9D1E3; font-size: 10.5px; }
.per { background: #232C44; border-radius: 10px; padding: 8px 14px; position: relative; z-index: 1; } .per span { display: block; font-size: 7.5px; letter-spacing: .14em; color: #A7B1C9; font-weight: 700; } .per b { font-size: 12px; }
.kpis { display: grid; grid-template-columns: repeat(${Math.min((spec.kpis || []).length || 1, spec.orientation === 'landscape' ? 5 : 4)}, 1fr); gap: 9px; margin: 14px 0 6px; }
.kpi { border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px 10px 15px; position: relative; break-inside: avoid; }
.kpi i { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 2px; }
.kpi span { display: block; font-size: 8px; font-weight: 700; letter-spacing: .08em; color: #64748B; text-transform: uppercase; }
.kpi b { display: block; font-size: 16px; margin: 3px 0 1px; font-family: 'JetBrains Mono', monospace; letter-spacing: -.02em; } .kpi small { color: #64748B; font-size: 9px; }
h2 { font-size: 13px; margin: 18px 0 8px; display: flex; align-items: center; gap: 8px; color: #141B2B; break-after: avoid; }
h2 i { width: 4px; height: 15px; border-radius: 2px; background: ${P}; } h2 small { margin-left: auto; font-weight: 400; color: #64748B; font-size: 9.5px; }
table { width: 100%; border-collapse: collapse; font-size: 10px; } table.small { font-size: 9px; }
thead { display: table-header-group; } tfoot { display: table-row-group; } tr { break-inside: avoid; }
th { background: ${P}; color: #fff; font-weight: 600; padding: 7px 8px; font-size: 9.5px; border: 1px solid ${P}; }
td { padding: 6px 8px; border: 1px solid #E2E8F0; vertical-align: middle; } tbody tr:nth-child(even) { background: #F8FAFC; }
tfoot td { background: ${PS}; font-weight: 700; color: #141B2B; } td.empty { text-align: center; color: #64748B; font-style: italic; padding: 14px; }
.chip { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 8.5px; font-weight: 700; white-space: nowrap; }
.bars { display: grid; gap: 9px; } .bar div { display: flex; justify-content: space-between; font-size: 10px; } .bar em { display: block; height: 7px; border-radius: 4px; background: #EEF2F7; margin-top: 4px; overflow: hidden; } .bar u { display: block; height: 100%; border-radius: 4px; }
.chart { border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px; text-align: center; margin: 10px 0; break-inside: avoid; } .chart img { max-width: 100%; max-height: 230px; }
.note { color: #475569; font-size: 10px; }
.sign { margin-top: 26px; break-inside: avoid; } .sign p { text-align: right; margin: 0 40px 6px 0; } .sign div { display: flex; justify-content: space-between; padding: 0 40px; }
.sign span { width: 190px; } .sign i { display: block; border-bottom: 1px solid #94A3B8; height: 62px; }
.ft { margin-top: 18px; padding-top: 8px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; color: #64748B; font-size: 9px; } .ft b { color: ${P}; }
</style></head><body>
<div class="hd"><div class="lg">${logo ? `<img src="${esc(logo)}" alt="">` : esc(initials(app))}</div><div class="t"><small>${esc(app + (st.subjudul ? ' · ' + st.subjudul : ''))}</small><h1>${esc(spec.title)}</h1><p>${esc(spec.subtitle || '')}</p></div>
${spec.period ? `<div class="per"><span>${esc(spec.periodLabel || 'PERIODE')}</span><b>${esc(spec.period)}</b></div>` : ''}</div>
${kp ? `<div class="kpis">${kp}</div>` : ''}${body}
<div class="ft"><b>${esc(app)}</b><span>Dicetak ${esc(rptStamp())}${rptBy() ? ' oleh ' + esc(rptBy()) : ''}</span></div>
</body></html>`;
}

/** Cetak lewat iframe tersembunyi (tanpa pop-up). Cadangan: jendela baru. */
function rptPrint(html) {
  const old = document.getElementById('rpt-frame'); if (old) old.remove();
  const fr = document.createElement('iframe');
  fr.id = 'rpt-frame'; fr.setAttribute('aria-hidden', 'true'); fr.title = 'Cetak';
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(fr);
  const d = fr.contentWindow.document; d.open(); d.write(html); d.close();
  let done = false;
  const go = () => {
    if (done) return; done = true;
    try { fr.contentWindow.focus(); fr.contentWindow.print(); }
    catch (e) {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 600); }
      else toast('Browser memblokir jendela cetak. Gunakan "Unduh PDF".', 'warning');
    }
  };
  const imgs = Array.from(d.images).map((im) => (im.complete ? null : new Promise((r) => { im.onload = r; im.onerror = r; })));
  Promise.all([d.fonts && d.fonts.ready].concat(imgs)).then(() => setTimeout(go, 200));
  setTimeout(go, 2500);
  toast('Membuka dialog cetak…', 'info');
}

// ── Isi laporan per halaman ──
const chipTone = { Masuk: 'in', Keluar: 'out', Transfer: 'trf' };
const RPT_SPEC = {
  ringkasan() {
    const { from, to } = S.range, f = flows(from, to), sal = saldoMap(), total = totalKas(), app = S.settings.nama_aplikasi || 'KASBURUH';
    const doms = activeDompet(), bud = budgetRows(ym(to));
    const katRows = Object.entries(f.inKat).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ n: katOf(k).nama, j: 'Masuk', v, p: pct(v, f.masuk) }))
      .concat(Object.entries(f.outKat).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ n: katOf(k).nama, j: 'Keluar', v, p: pct(v, f.keluar) })));
    const bills = S.db.Tagihan.filter((b) => b.status !== 'Lunas').sort((a, b) => String(a.jatuh_tempo).localeCompare(b.jatuh_tempo)).slice(0, 10);
    const recent = f.list.slice().sort((a, b) => String(b.tanggal).localeCompare(a.tanggal)).slice(0, 12);
    const blocks = [{ t: 'chart', key: 'trend', h: 160 },
      { t: 'section', title: 'Saldo per Dompet', note: 'Posisi per ' + fmtDate(todayStr(), 'long') },
      { t: 'table', head: ['Dompet', 'Jenis', 'No. Rekening', 'Saldo', 'Porsi'], rows: doms.map((d) => [d.nama_dompet, d.jenis, d.no_rekening || '-', fmtRp(sal[d.id] || 0), fmtPct(pct(sal[d.id] || 0, total))]),
        align: { 3: 'right', 4: 'right' }, bold: { 0: true }, foot: ['TOTAL KAS', '', '', fmtRp(total), '100%'] },
      { t: 'section', title: 'Arus Kas per Kategori', note: f.list.length + ' transaksi pada periode ini' },
      { t: 'table', head: ['Kategori', 'Jenis', 'Jumlah', 'Porsi'], rows: katRows.map((r) => [r.n, r.j, fmtRp(r.v), fmtPct(r.p)]), align: { 2: 'right', 3: 'right' },
        chip: { 1: (i) => chipTone[katRows[i].j] }, tone: { 2: (i) => chipTone[katRows[i].j] }, empty: 'Belum ada transaksi pada periode ini.' }];
    if (bud.length) blocks.push({ t: 'section', title: 'Realisasi Anggaran ' + ymLabel(ym(to)) },
      { t: 'bars', items: bud.map((b) => ({ label: b.kat.nama, value: b.used, max: b.lim || 1, tone: b.p > 100 ? 'out' : b.p >= 85 ? 'warn' : 'in', right: fmtRp(b.used) + ' / ' + fmtRp(b.lim) + ' (' + fmtPct(b.p, 0) + ')' })) });
    if (S.db.Tabungan.length) blocks.push({ t: 'section', title: 'Target Tabungan' },
      { t: 'bars', items: S.db.Tabungan.map((g) => ({ label: g.nama_target, value: goalProgress(g), max: num(g.target_jumlah) || 1, tone: 'pri', right: fmtRp(goalProgress(g)) + ' / ' + fmtRp(g.target_jumlah) })) });
    if (bills.length) blocks.push({ t: 'section', title: 'Tagihan Belum Lunas' },
      { t: 'table', head: ['Tagihan', 'Vendor', 'Jatuh Tempo', 'Nominal', 'Status'], rows: bills.map((b) => [b.nama, b.vendor || '-', fmtDate(b.jatuh_tempo), fmtRp(b.jumlah), billState(b).due]),
        align: { 3: 'right' }, chip: { 4: (i) => ({ telat: 'out', hariini: 'out', segera: 'warn' }[billState(bills[i]).key] || 'trf') } });
    blocks.push({ t: 'section', title: 'Transaksi Terbaru' },
      { t: 'table', small: true, head: ['Tanggal', 'Keterangan', 'Kategori', 'Dompet', 'Jumlah'], rows: recent.map((t) => [fmtDate(t.tanggal), t.keterangan || '-', t.jenis === 'Transfer' ? 'Transfer' : katOf(t.id_kategori).nama,
        t.jenis === 'Transfer' ? dompetName(t.id_dompet) + ' > ' + dompetName(t.id_dompet_tujuan) : dompetName(t.id_dompet), (t.jenis === 'Masuk' ? '+' : t.jenis === 'Keluar' ? '-' : '') + fmtRp(t.jumlah)]),
        align: { 4: 'right' }, tone: { 4: (i) => chipTone[recent[i].jenis] } }, { t: 'sign' });
    return { title: 'Ringkasan Keuangan', subtitle: 'Konsolidasi kas, arus kas, anggaran & kewajiban', period: dmy(from) + ' s.d. ' + dmy(to), file: app + '_Ringkasan_' + from + '_sd_' + to,
      kpis: [{ label: 'Total Pemasukan', value: fmtRp(f.masuk), tone: 'in', sub: f.nMasuk + ' transaksi masuk' }, { label: 'Total Pengeluaran', value: fmtRp(f.keluar), tone: 'out', sub: f.nKeluar + ' transaksi keluar' },
        { label: 'Selisih Bersih', value: fmtRp(f.net, { sign: true }), tone: f.net >= 0 ? 'in' : 'out', sub: f.net >= 0 ? 'Surplus' : 'Defisit' }, { label: 'Total Saldo Kas', value: fmtRp(total), tone: 'pri', sub: doms.length + ' dompet aktif' }],
      blocks };
  },
  transaksi() {
    const { from, to } = S.range, list = filteredTrx().slice().sort((a, b) => String(a.tanggal).localeCompare(b.tanggal)), app = S.settings.nama_aplikasi || 'KASBURUH';
    const sum = (j) => list.filter((t) => t.jenis === j).reduce((a, t) => a + num(t.jumlah), 0), u = S.ui.trx;
    const filt = [u.jenis && 'Jenis: ' + u.jenis, u.dompet && 'Dompet: ' + dompetName(u.dompet), u.kat && 'Kategori: ' + katOf(u.kat).nama, u.q && 'Cari: "' + u.q + '"'].filter(Boolean).join(' · ');
    return { title: 'Buku Kas · Rincian Transaksi', subtitle: filt || 'Seluruh transaksi masuk, keluar & transfer', period: dmy(from) + ' s.d. ' + dmy(to), orientation: 'landscape', file: app + '_Transaksi_' + from + '_sd_' + to,
      kpis: [{ label: 'Uang Masuk', value: fmtRp(sum('Masuk')), tone: 'in', sub: list.filter((t) => t.jenis === 'Masuk').length + ' transaksi' }, { label: 'Uang Keluar', value: fmtRp(sum('Keluar')), tone: 'out', sub: list.filter((t) => t.jenis === 'Keluar').length + ' transaksi' },
        { label: 'Transfer Antar Dompet', value: fmtRp(sum('Transfer')), tone: 'trf', sub: list.filter((t) => t.jenis === 'Transfer').length + ' transaksi' }, { label: 'Selisih Bersih', value: fmtRp(sum('Masuk') - sum('Keluar'), { sign: true }), tone: sum('Masuk') - sum('Keluar') >= 0 ? 'in' : 'out', sub: list.length + ' baris' },
        { label: 'Total Saldo Kas', value: fmtRp(totalKas(to)), tone: 'pri', sub: 'per ' + dmy(to) }],
      blocks: [{ t: 'table', head: ['No', 'Tanggal', 'No. Referensi', 'Keterangan', 'Kategori', 'Dompet', 'Jenis', 'Masuk', 'Keluar', 'Transfer'],
        rows: list.map((t, i) => [i + 1, fmtDate(t.tanggal), t.no_ref || '-', t.keterangan || '-', t.jenis === 'Transfer' ? 'Transfer Kas' : katOf(t.id_kategori).nama,
          t.jenis === 'Transfer' ? dompetName(t.id_dompet) + ' > ' + dompetName(t.id_dompet_tujuan) : dompetName(t.id_dompet), t.jenis,
          t.jenis === 'Masuk' ? fmtRp(t.jumlah) : '', t.jenis === 'Keluar' ? fmtRp(t.jumlah) : '', t.jenis === 'Transfer' ? fmtRp(t.jumlah) : '']),
        align: { 0: 'center', 7: 'right', 8: 'right', 9: 'right' }, widths: { 0: 26, 1: 62, 2: 92 }, chip: { 6: (i) => chipTone[list[i].jenis] }, tone: { 7: () => 'in', 8: () => 'out', 9: () => 'trf' },
        foot: ['', 'TOTAL', '', list.length + ' transaksi', '', '', '', fmtRp(sum('Masuk')), fmtRp(sum('Keluar')), fmtRp(sum('Transfer'))], empty: 'Tidak ada transaksi sesuai filter.' }, { t: 'sign' }] };
  },
  inventaris() {
    const u = S.ui.inv, q = (u.q || '').toLowerCase(), app = S.settings.nama_aplikasi || 'KASBURUH';
    const list = S.db.Inventaris.filter((b) => (!u.kat || b.id_kategori === u.kat) && (!u.kondisi || b.kondisi === u.kondisi) && (!u.tahun || String(b.tanggal_beli).slice(0, 4) === u.tahun) && inDr('inventaris', b.tanggal_beli) &&
      (!q || (b.nama_barang + ' ' + b.kode + ' ' + b.lokasi + ' ' + katOf(b.id_kategori).nama).toLowerCase().indexOf(q) >= 0)).sort((a, b) => String(a.kode).localeCompare(b.kode));
    const units = list.reduce((a, b) => a + num(b.jumlah), 0), nilai = list.reduce((a, b) => a + num(b.nilai), 0), by = (k) => list.filter((b) => b.kondisi === k).reduce((a, b) => a + num(b.jumlah), 0);
    const kt = { Baik: 'in', 'Perlu Servis': 'warn', Rusak: 'out' };
    return { title: 'Laporan Inventaris & Aset', subtitle: 'Daftar sarana & aset fisik serikat beserta kondisi dan nilainya', period: fmtDate(todayStr(), 'long'), periodLabel: 'PER TANGGAL', orientation: 'landscape', file: app + '_Inventaris_' + todayStr(),
      kpis: [{ label: 'Jenis Barang', value: fmtNum(list.length), sub: new Set(list.map((b) => b.id_kategori)).size + ' kategori' }, { label: 'Total Unit', value: fmtNum(units), tone: 'trf', sub: new Set(list.map((b) => b.lokasi).filter(Boolean)).size + ' lokasi' },
        { label: 'Kondisi Baik', value: fmtNum(by('Baik')) + ' unit', tone: 'in', sub: fmtPct(pct(by('Baik'), units)) + ' siap pakai' }, { label: 'Servis / Rusak', value: fmtNum(by('Perlu Servis') + by('Rusak')) + ' unit', tone: 'warn', sub: by('Rusak') + ' rusak' },
        { label: 'Nilai Aset', value: fmtRp(nilai), tone: 'pri', sub: 'nilai pembukuan' }],
      blocks: [{ t: 'table', head: ['No', 'Kode', 'Nama Barang', 'Kategori', 'Lokasi', 'Dibeli', 'Jumlah', 'Nilai', 'Kondisi', 'Catatan'],
        rows: list.map((b, i) => [i + 1, b.kode, b.nama_barang, katOf(b.id_kategori).nama, b.lokasi || '-', b.tanggal_beli ? fmtDate(b.tanggal_beli) : '-', num(b.jumlah) + ' ' + (b.satuan || 'Unit'), b.nilai ? fmtRp(b.nilai) : '-', b.kondisi || '-', b.catatan || '']),
        align: { 0: 'center', 6: 'right', 7: 'right' }, widths: { 0: 26, 1: 58 }, bold: { 2: true }, chip: { 8: (i) => kt[list[i].kondisi] || 'mute' },
        foot: ['', '', list.length + ' jenis barang', '', '', '', fmtNum(units) + ' unit', fmtRp(nilai), '', ''], empty: 'Tidak ada barang sesuai filter.' }] };
  },
  anggota() {
    const u = S.ui.agt, q = (u.q || '').toLowerCase(), app = S.settings.nama_aplikasi || 'KASBURUH';
    const list = S.db.Anggota.filter((a) => (!u.status || a.status === u.status) && (!u.unit || a.unit === u.unit) && inDr('anggota', a.tanggal_gabung) && (!q || (a.nama + ' ' + a.no_anggota + ' ' + a.unit + ' ' + a.kontak).toLowerCase().indexOf(q) >= 0))
      .sort((a, b) => String(a.nama).localeCompare(b.nama));
    const aktif = list.filter((a) => a.status === 'Aktif').length;
    return { title: 'Data Anggota Serikat', subtitle: [u.unit && 'Unit: ' + u.unit, u.status && 'Status: ' + u.status, u.q && 'Cari: "' + u.q + '"'].filter(Boolean).join(' · ') || 'Daftar anggota beserta unit kerja dan kontak',
      period: fmtDate(todayStr(), 'long'), periodLabel: 'PER TANGGAL', orientation: 'portrait', file: app + '_Anggota_' + todayStr(),
      kpis: [{ label: 'Total Anggota', value: fmtNum(list.length), sub: new Set(list.map((a) => a.unit).filter(Boolean)).size + ' unit kerja' }, { label: 'Aktif', value: fmtNum(aktif), tone: 'in', sub: fmtPct(pct(aktif, list.length)) },
        { label: 'Nonaktif / Keluar', value: fmtNum(list.length - aktif), tone: 'mute' }, { label: 'Bergabung ' + new Date().getFullYear(), value: fmtNum(list.filter((a) => String(a.tanggal_gabung).slice(0, 4) === String(new Date().getFullYear())).length), tone: 'pri', sub: 'anggota baru' }],
      blocks: [{ t: 'table', head: ['No', 'Nama', 'No. Anggota', 'Unit / Perusahaan', 'No HP', 'Bergabung', 'Status'],
        rows: list.map((a, i) => [i + 1, a.nama, a.no_anggota || '-', a.unit || '-', a.kontak || '-', a.tanggal_gabung ? fmtDate(a.tanggal_gabung) : '-', a.status === 'Nonaktif' ? 'Tidak Aktif' : a.status || '-']),
        align: { 0: 'center' }, widths: { 0: 26 }, bold: { 1: true }, chip: { 6: (i) => (list[i].status === 'Aktif' ? 'in' : list[i].status === 'Keluar' ? 'out' : 'mute') }, empty: 'Tidak ada anggota sesuai filter.' }] };
  },
  tagihan() {
    const list = tagFiltered(), app = S.settings.nama_aplikasi || 'KASBURUH', t0 = todayStr();
    const open = S.db.Tagihan.filter((b) => b.status !== 'Lunas'), late = open.filter((b) => daysBetween(t0, b.jatuh_tempo) < 0), soon = open.filter((b) => { const d = daysBetween(t0, b.jatuh_tempo); return d >= 0 && d <= 7; });
    const paidM = S.db.Tagihan.filter((b) => b.status === 'Lunas' && ym(b.tanggal_lunas) === ym(t0));
    const sumOf = (a) => a.reduce((x, b) => x + num(b.jumlah), 0);
    const tone = (b) => ({ lunas: 'in', telat: 'out', hariini: 'out', segera: 'warn' }[billState(b).key] || 'trf');
    const rep = { sekali: 'Sekali', mingguan: 'Mingguan', bulanan: 'Bulanan', tahunan: 'Tahunan' };
    const tabL = { semua: 'Semua tagihan', akan: 'Akan jatuh tempo', terlambat: 'Terlambat', lunas: 'Lunas' }[S.ui.tag.tab];
    return { title: 'Daftar Tagihan & Kewajiban', subtitle: tabL + (S.ui.tag.q ? ' · Cari: "' + S.ui.tag.q + '"' : '') + (S.ui.dr.tagihan ? ' · Jatuh tempo ' + drpLabel('tagihan') : ''),
      period: fmtDate(t0, 'long'), periodLabel: 'PER TANGGAL', orientation: 'landscape', file: app + '_Tagihan_' + t0,
      kpis: [{ label: 'Belum Lunas', value: fmtRp(sumOf(open)), tone: 'trf', sub: open.length + ' tagihan' }, { label: 'Terlambat', value: fmtRp(sumOf(late)), tone: 'out', sub: late.length + ' tagihan' },
        { label: 'Mendesak (7 hari)', value: fmtRp(sumOf(soon)), tone: 'warn', sub: soon.length + ' tagihan' }, { label: 'Terbayar Bulan Ini', value: fmtRp(sumOf(paidM)), tone: 'in', sub: paidM.length + ' tagihan' }],
      blocks: [{ t: 'table', head: ['No', 'Nama Tagihan', 'Vendor / Kategori', 'Pengulangan', 'Jatuh Tempo', 'Nominal', 'Status', 'Keterangan', 'Tgl Lunas'],
        rows: list.map((b, i) => [i + 1, b.nama, b.vendor || katOf(b.id_kategori).nama, rep[b.pengulangan] || '-', fmtDate(b.jatuh_tempo), fmtRp(b.jumlah), b.status === 'Lunas' ? 'Lunas' : 'Belum Lunas',
          billState(b).due, b.tanggal_lunas ? fmtDate(b.tanggal_lunas) : '-']),
        align: { 0: 'center', 5: 'right' }, widths: { 0: 26 }, bold: { 1: true }, chip: { 6: (i) => (list[i].status === 'Lunas' ? 'in' : 'out'), 7: (i) => tone(list[i]) },
        rowTone: (i) => ({ telat: 'out', hariini: 'out', segera: 'warn' }[billState(list[i]).key] || null),
        foot: ['', 'TOTAL', list.length + ' tagihan', '', '', fmtRp(sumOf(list)), '', '', ''], empty: 'Tidak ada tagihan sesuai filter.' }] };
  }
};
/** Daftar tagihan sesuai tab, pencarian & filter tanggal di halaman Tagihan. */
function tagFiltered() {
  const t0 = todayStr(), u = S.ui.tag, q = (u.q || '').toLowerCase();
  const all = S.db.Tagihan.slice();
  const open = all.filter((b) => b.status !== 'Lunas');
  const tabs = { semua: all, akan: open.filter((b) => { const d = daysBetween(t0, b.jatuh_tempo); return d >= 0 && d <= 7; }), terlambat: open.filter((b) => daysBetween(t0, b.jatuh_tempo) < 0), lunas: all.filter((b) => b.status === 'Lunas') };
  return (tabs[u.tab] || all).filter((b) => (!q || (b.nama + ' ' + (b.vendor || '') + ' ' + (b.catatan || '')).toLowerCase().indexOf(q) >= 0) && inDr('tagihan', b.jatuh_tempo))
    .sort((a, b) => (a.status === 'Lunas') - (b.status === 'Lunas') || String(a.jatuh_tempo).localeCompare(b.jatuh_tempo));
}

/** Ekspor Excel tambahan (Tagihan · Gathering · Undian) dengan gaya yang sama dengan laporan lain. */
function exportExcelX(kind) {
  const { T, S: X } = xlTheme();
  const app = S.settings.nama_aplikasi || 'KASBURUH', org = S.settings.subjudul || '';
  const kpiRow = (sh, items) => {
    // items: [[label, value, color, fmt]] → 2 kolom per kartu
    const k = sh.rows.length;
    sh.rows.push(items.flatMap(([l]) => [{ v: l, s: X.kLabel }, { v: '', s: X.kLabel }]));
    sh.rows.push(items.flatMap(([, v, c, f]) => [{ v, s: Object.assign({}, X.kVal, { color: c || T.navy, fmt: f === undefined ? 'rp' : f }) }, { v: '', s: X.kVal }]));
    items.forEach((_, i) => { const a = String.fromCharCode(65 + i * 2), b = String.fromCharCode(66 + i * 2); sh.merges.push(a + (k + 1) + ':' + b + (k + 1), a + (k + 2) + ':' + b + (k + 2)); });
    sh.heights[k + 1] = 30; sh.rows.push([]);
  };
  const soft = { out: 'FDECEC', warn: 'FEF3E2', in: 'E8F7EE' };
  if (kind === 'tagihan') {
    const list = tagFiltered(), t0 = todayStr();
    const open = S.db.Tagihan.filter((b) => b.status !== 'Lunas'), late = open.filter((b) => daysBetween(t0, b.jatuh_tempo) < 0);
    const soon = open.filter((b) => { const d = daysBetween(t0, b.jatuh_tempo); return d >= 0 && d <= 7; });
    const paidM = S.db.Tagihan.filter((b) => b.status === 'Lunas' && ym(b.tanggal_lunas) === ym(t0));
    const sumOf = (a) => a.reduce((x, b) => x + num(b.jumlah), 0);
    const rep = { sekali: 'Sekali', mingguan: 'Mingguan', bulanan: 'Bulanan', tahunan: 'Tahunan' };
    const sh = { name: 'Tagihan', cols: [6, 34, 24, 13, 15, 17, 15, 24, 15, 34], rows: [], merges: [], heights: {}, tab: T.warn };
    xlHeader(sh, 10, 'DAFTAR TAGIHAN & KEWAJIBAN', org + ' · per ' + fmtDate(t0, 'long') + ' · ' + list.length + ' tagihan');
    kpiRow(sh, [['BELUM LUNAS', sumOf(open), T.trf], ['TERLAMBAT', sumOf(late), T.out], ['MENDESAK (7 HARI)', sumOf(soon), T.warn], ['TERBAYAR BULAN INI', sumOf(paidM), T.inn], ['JUMLAH TAGIHAN', list.length, T.navy, 'int']]);
    const st = (b) => billState(b);
    xlTable(sh, [{ h: 'No', k: (b) => list.indexOf(b) + 1, fmt: 'int' }, { h: 'Nama Tagihan', k: 'nama', bold: true }, { h: 'Vendor / Kategori', k: (b) => b.vendor || katOf(b.id_kategori).nama },
      { h: 'Pengulangan', k: (b) => rep[b.pengulangan] || '-', center: true }, { h: 'Jatuh Tempo', k: 'jatuh_tempo', fmt: 'date' }, { h: 'Nominal', k: (b) => num(b.jumlah), fmt: 'rp' },
      { h: 'Status', k: (b) => (b.status === 'Lunas' ? 'Lunas' : 'Belum Lunas'), center: true, bold: true, color: (b) => (b.status === 'Lunas' ? T.inn : T.out) },
      { h: 'Keterangan Status', k: (b) => st(b).due, center: true, bold: true, color: (b) => ({ lunas: T.inn, telat: T.out, hariini: T.out, segera: T.warn }[st(b).key] || T.trf) },
      { h: 'Tanggal Lunas', k: (b) => b.tanggal_lunas || '', fmt: 'date' }, { h: 'Catatan', k: (b) => String(b.catatan || '').replace(/^BELUM LUNAS[\s·]{0,}/, ''), wrap: true }], list,
    { freeze: true, total: ['', 'TOTAL', list.length + ' tagihan', '', '', sumOf(list), '', '', '', ''], rowFill: (b) => soft[{ telat: 'out', hariini: 'out', segera: 'warn' }[st(b).key]] || null });
    sh.rows.push([], [{ v: 'Keterangan warna: merah = terlambat / jatuh tempo hari ini · oranye = jatuh tempo ≤ 7 hari · hijau = lunas', s: { i: true, color: T.muted, indent: 1 } }]);
    xlSave([sh], app + '_Tagihan_' + t0);
  } else if (kind === 'gathering') {
    const list = gatFiltered(), acara = S.ui.gat.acara || 'Semua acara', s = gatSummary(list);
    const sh = { name: 'Gathering', cols: [6, 30, 18, 24, 16, 15, 14, 24, 15, 30], rows: [], merges: [], heights: {}, tab: 'EC4899' };
    xlHeader(sh, 10, 'IURAN GATHERING · ' + String(acara).toUpperCase(), org + ' · ' + list.length + ' peserta · per ' + fmtDate(todayStr(), 'long'));
    kpiRow(sh, [['TARGET DANA', s.target, T.navy], ['TERKUMPUL', s.paid, T.inn], ['BELUM DIBAYAR', s.unpaid, T.warn], ['TERLAMBAT', s.lateSum, T.out], ['PROGRES', s.target ? s.paid / s.target : 0, T.p, 'pct']]);
    xlTable(sh, [{ h: 'No', k: (g) => list.indexOf(g) + 1, fmt: 'int' }, { h: 'Nama Peserta', k: 'nama', bold: true }, { h: 'No HP', k: (g) => g.kontak || '-' }, { h: 'Acara', k: (g) => g.acara || '-' },
      { h: 'Nominal', k: (g) => num(g.nominal), fmt: 'rp' }, { h: 'Jatuh Tempo', k: 'jatuh_tempo', fmt: 'date' },
      { h: 'Status', k: (g) => (g.status === 'Lunas' ? 'Lunas' : 'Belum Lunas'), center: true, bold: true, color: (g) => (g.status === 'Lunas' ? T.inn : T.out) },
      { h: 'Keterangan Status', k: (g) => gatState(g).due, center: true, bold: true, color: (g) => ({ lunas: T.inn, telat: T.out, hariini: T.out, segera: T.warn }[gatState(g).key] || T.trf) },
      { h: 'Tanggal Bayar', k: (g) => g.tanggal_bayar || '', fmt: 'date' }, { h: 'Catatan', k: (g) => g.catatan || '', wrap: true }], list,
    { freeze: true, total: ['', 'TOTAL', list.length + ' peserta', '', s.target, '', s.nLunas + ' lunas', s.nLate + ' terlambat', '', ''], rowFill: (g) => soft[{ telat: 'out', hariini: 'out', segera: 'warn' }[gatState(g).key]] || null });
    xlSave([sh], app + '_Gathering_' + String(S.ui.gat.acara || 'Semua').replace(/\W+/g, '_') + '_' + todayStr());
  } else if (kind === 'undian') {
    const W0 = undWinners(), H0 = undPrizes(), title = S.ui.und.title || 'Undian Doorprize';
    const w = { name: 'Pemenang', cols: [6, 32, 22, 30, 10, 20], rows: [], merges: [], heights: {}, tab: '8B5CF6' };
    xlHeader(w, 6, 'PEMENANG ' + String(title).toUpperCase(), org + ' · ' + W0.length + ' pemenang · ' + S.db.UndianPeserta.length + ' peserta');
    const pmap = Object.fromEntries(S.db.UndianPeserta.map((p) => [p.id, p]));
    xlTable(w, [{ h: 'No', k: (x) => W0.indexOf(x) + 1, fmt: 'int' }, { h: 'Nama Pemenang', k: 'nama_peserta', bold: true }, { h: 'Unit / Keterangan', k: (x) => (pmap[x.id_peserta] || {}).unit || '-' },
      { h: 'Hadiah', k: 'nama_hadiah', bold: true, color: () => T.p }, { h: 'Putaran', k: (x) => num(x.putaran), fmt: 'int' }, { h: 'Waktu', k: (x) => String(x.waktu || '').replace('T', ' ').slice(0, 16), center: true }], W0, { freeze: true });
    const h = { name: 'Hadiah', cols: [6, 34, 12, 12, 12], rows: [], merges: [], heights: {}, tab: 'F59E0B', portrait: true };
    xlHeader(h, 5, 'DAFTAR HADIAH', title);
    xlTable(h, [{ h: 'No', k: (x) => H0.indexOf(x) + 1, fmt: 'int' }, { h: 'Hadiah', k: 'nama_hadiah', bold: true }, { h: 'Jumlah', k: (x) => num(x.jumlah), fmt: 'int' },
      { h: 'Terundi', k: (x) => undUsed(x.id), fmt: 'int', color: () => T.inn }, { h: 'Sisa', k: (x) => Math.max(0, num(x.jumlah) - undUsed(x.id)), fmt: 'int', bold: true }], H0, { filter: false });
    const p = { name: 'Peserta', cols: [6, 32, 26, 16], rows: [], merges: [], heights: {}, tab: T.p, portrait: true };
    const won = new Set(W0.map((x) => x.id_peserta)), P0 = S.db.UndianPeserta.slice().sort((a, b) => String(a.nama).localeCompare(b.nama));
    xlHeader(p, 4, 'DAFTAR PESERTA UNDIAN', title + ' · ' + P0.length + ' peserta');
    xlTable(p, [{ h: 'No', k: (x) => P0.indexOf(x) + 1, fmt: 'int' }, { h: 'Nama', k: 'nama', bold: true }, { h: 'Unit / Keterangan', k: (x) => x.unit || '-' },
      { h: 'Status', k: (x) => (won.has(x.id) ? 'Menang' : 'Belum'), center: true, bold: true, color: (x) => (won.has(x.id) ? T.inn : T.muted) }], P0, { freeze: true });
    xlSave([w, h, p], app + '_Undian_' + String(title).replace(/\W+/g, '_') + '_' + todayStr());
  }
  toast('Berkas Excel terunduh.', 'success');
}

// ════════════════ IMPOR MASSAL: TRANSAKSI · GATHERING · UNDIAN ════════════════
const normNm = (s) => String(s === undefined || s === null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
/** Cari baris judul kolom: kembalikan {hi, map} bila kolom wajib ditemukan. */
function findHeaderRow(grid, AL, need) {
  for (let r = 0; r < Math.min(grid.length, 30); r++) {
    const m = {};
    (grid[r] || []).forEach((v, ci) => { const h = normH(v); Object.keys(AL).forEach((k) => { if (m[k] === undefined && AL[k].indexOf(h) >= 0) m[k] = ci; }); });
    if (need.every((k) => m[k] !== undefined)) return { hi: r, map: m };
  }
  return null;
}
const cellOf = (g, i) => { const v = i === undefined ? '' : g[i]; return typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : v; };
const moneyOf = (v) => (typeof v === 'number' ? Math.round(v) : num(String(v || '').replace(/[^\d-]/g, '')));

/** Sheet contoh bergaya untuk format impor multi-sheet. */
function tplSheet(name, title, tab, cols, samples, lastRow) {
  const { T, S: X } = xlTheme();
  const sh = { name, cols: cols.map((c) => ({ w: c.w, s: c.date ? { fmt: 'date', h: 'center' } : c.money ? { fmt: 'rp' } : c.text ? { fmt: 'text' } : null })), rows: [], merges: [], heights: {}, tab, validations: [] };
  xlHeader(sh, cols.length, title, 'Isi data mulai baris 7 · Jangan ubah judul kolom · Baris contoh (berwarna) boleh ditimpa/dihapus');
  const hr = sh.rows.length;
  sh.rows.push(cols.map((c) => ({ v: c.h + (c.req ? ' *' : ''), s: X.th }))); sh.heights[hr] = 28;
  samples.forEach((r) => sh.rows.push(r.map((v, i) => ({ v, date: !!cols[i].date, s: { i: true, color: T.muted, border: 'all', fill: T.soft,
    fmt: cols[i].money ? 'rp' : cols[i].date ? 'date' : cols[i].text ? 'text' : undefined, indent: cols[i].date || cols[i].money ? undefined : 1, h: cols[i].date ? 'center' : undefined } }))));
  sh.freeze = hr + 1;
  cols.forEach((c, i) => { if (c.ref || c.list) { const L = String.fromCharCode(65 + i); sh.validations.push({ sqref: L + (hr + 2) + ':' + L + (lastRow || 1005), ref: c.ref, list: c.list }); } });
  return sh;
}
function tplHelp(title, rows, tips) {
  const { T } = xlTheme();
  const help = { name: 'Petunjuk', cols: [26, 12, 74], rows: [], merges: [], heights: {}, tab: T.navy, portrait: true };
  xlHeader(help, 3, 'PETUNJUK PENGISIAN', title);
  xlTable(help, [{ h: 'Sheet / Kolom', k: 0, bold: true }, { h: 'Wajib', k: (r) => (r[1] ? 'Ya' : 'Tidak'), center: true, color: (r) => (r[1] ? T.out : T.muted) }, { h: 'Keterangan & nilai yang diterima', k: 2, wrap: true }], rows, { filter: false });
  help.rows.push([]);
  tips.forEach((t) => help.rows.push([{ v: t, s: { color: T.navy, indent: 1 } }]));
  return help;
}

/** Format impor transaksi: 3 sheet (Masuk · Keluar · Transfer) + dropdown dompet & kategori sesuai data aplikasi. */
function templateTransaksi() {
  const { T } = xlTheme();
  const doms = activeDompet().map((d) => d.nama_dompet), kin = katsBy('Masuk').map((k) => k.nama), kout = katsBy('Keluar').map((k) => k.nama);
  const n = Math.max(doms.length, kin.length, kout.length, 1);
  const daftar = { name: 'Daftar', hidden: true, cols: [30, 30, 30], rows: [['Dompet', 'Kategori Masuk', 'Kategori Keluar']], merges: [], heights: {} };
  for (let i = 0; i < n; i++) daftar.rows.push([doms[i] || '', kin[i] || '', kout[i] || '']);
  const ref = (col, arr) => (arr.length ? 'Daftar!$' + col + '$2:$' + col + '$' + (arr.length + 1) : null);
  const d0 = doms[0] || 'Bank Utama', d1 = doms[1] || d0, t0 = todayStr();
  const sMasuk = tplSheet('Transaksi Masuk', 'TRANSAKSI MASUK (PEMASUKAN)', T.inn,
    [{ h: 'Tanggal Transaksi', req: true, w: 19, date: true }, { h: 'Nominal Transaksi', req: true, w: 21, money: true }, { h: 'Dompet (Sumber Dana)', req: true, w: 30, ref: ref('A', doms) },
      { h: 'Kategori', req: true, w: 30, ref: ref('B', kin) }, { h: 'Keterangan', w: 44 }],
    [[t0, 1500000, d0, kin[0] || 'Iuran Anggota', 'Contoh: iuran rutin anggota (hapus baris ini)'], [t0, 750000, d1, kin[1] || kin[0] || 'Sumbangan & Donasi', 'Contoh: sumbangan sukarela (hapus baris ini)']]);
  const sKeluar = tplSheet('Transaksi Keluar', 'TRANSAKSI KELUAR (PENGELUARAN)', T.out,
    [{ h: 'Tanggal Transaksi', req: true, w: 19, date: true }, { h: 'Nominal Transaksi', req: true, w: 21, money: true }, { h: 'Dompet', req: true, w: 30, ref: ref('A', doms) },
      { h: 'Kategori', req: true, w: 30, ref: ref('C', kout) }, { h: 'Keterangan', w: 44 }],
    [[t0, 320000, d1, kout[0] || 'Operasional Sekretariat', 'Contoh: ATK & konsumsi rapat (hapus baris ini)'], [t0, 5000000, d0, kout[1] || kout[0] || 'Iuran Federasi', 'Contoh: iuran federasi (hapus baris ini)']]);
  const sTrf = tplSheet('Transfer', 'TRANSFER ANTAR DOMPET', T.trf,
    [{ h: 'Tanggal Transaksi', req: true, w: 19, date: true }, { h: 'Nominal Transaksi', req: true, w: 21, money: true }, { h: 'Dompet (Sumber Dana)', req: true, w: 30, ref: ref('A', doms) },
      { h: 'Ke Dompet (Dompet Tujuan)', req: true, w: 30, ref: ref('A', doms) }, { h: 'Keterangan', w: 44 }],
    [[t0, 3000000, d0, d1 === d0 ? 'Kas Tunai Kantor' : d1, 'Contoh: pengisian kas tunai (hapus baris ini)']]);
  const help = tplHelp('Impor Transaksi Massal', [
    ['Transaksi Masuk', true, 'Pemasukan: Tanggal Transaksi, Nominal Transaksi, Dompet (Sumber Dana), Kategori (pilih dari daftar), Keterangan (opsional).'],
    ['Transaksi Keluar', true, 'Pengeluaran: Tanggal Transaksi, Nominal Transaksi, Dompet, Kategori (pilih dari daftar), Keterangan (opsional).'],
    ['Transfer', true, 'Pemindahan antar dompet: Tanggal Transaksi, Nominal Transaksi, Dompet (Sumber Dana), Ke Dompet (Dompet Tujuan), Keterangan (opsional).'],
    ['Tanggal Transaksi', true, 'Tanggal Excel atau teks dd-mm-yyyy (contoh 05-11-2026).'],
    ['Nominal Transaksi', true, 'Angka Rupiah tanpa titik/koma, mis. 1500000.'],
    ['Dompet', true, 'Pilihan: ' + (doms.join(', ') || '-') + '.'],
    ['Kategori Masuk', true, 'Pilihan: ' + (kin.join(', ') || '-') + '.'],
    ['Kategori Keluar', true, 'Pilihan: ' + (kout.join(', ') || '-') + '.']],
  ['1. Isi ketiga sheet sesuai jenis transaksi (sheet yang tidak dipakai boleh dibiarkan kosong).', '2. Dompet & Kategori dipilih dari daftar (dropdown) agar sama persis dengan data di aplikasi.',
    '3. Baris contoh berwarna boleh ditimpa; jika keterangannya diawali "Contoh:" baris itu otomatis dilewati.', '4. Simpan sebagai .xlsx lalu unggah. Maksimal 500 baris per impor; nomor referensi dibuat otomatis.',
    '5. Bila menambah dompet/kategori baru di aplikasi, unduh ulang format ini agar daftar pilihannya ikut diperbarui.']);
  xlSave([sMasuk, sKeluar, sTrf, help, daftar], 'Format_Impor_Transaksi');
  toast('Format Excel terunduh.', 'success');
}
const TRX_AL = {
  tanggal: ['tanggal transaksi', 'tanggal', 'tgl', 'tgl transaksi', 'date'],
  nominal: ['nominal transaksi', 'nominal', 'jumlah', 'nilai', 'jumlah transaksi', 'amount'],
  dompet: ['dompet sumber dana', 'dompet', 'sumber dana', 'dompet sumber', 'dompet asal', 'dari dompet', 'dompet sumberdana'],
  kategori: ['kategori', 'kategori transaksi', 'jenis kategori'],
  tujuan: ['ke dompet dompet tujuan', 'ke dompet', 'dompet tujuan', 'tujuan', 'dompet penerima'],
  keterangan: ['keterangan', 'catatan', 'ket', 'uraian', 'deskripsi'],
  jenis: ['jenis', 'jenis transaksi', 'tipe']
};
async function readTrxBook(file) {
  const book = await XL.readAll(file);
  const domBy = {}, katBy = {};
  S.db.Dompet.forEach((d) => { if (!domBy[normNm(d.nama_dompet)]) domBy[normNm(d.nama_dompet)] = d; });
  S.db.Kategori.forEach((k) => { (katBy[normNm(k.nama)] = katBy[normNm(k.nama)] || []).push(k); });
  const rows = []; let samples = 0, used = 0;
  book.forEach((sh) => {
    const nm = normNm(sh.name);
    if (sh.hidden || /petunjuk|daftar/.test(nm)) return;
    const hd = findHeaderRow(sh.rows, TRX_AL, ['tanggal', 'nominal']);
    if (!hd) return;
    const sheetJenis = /transfer|pindah/.test(nm) ? 'Transfer' : /keluar|pengeluaran/.test(nm) ? 'Keluar' : /masuk|pemasukan/.test(nm) ? 'Masuk' : '';
    if (!sheetJenis && hd.map.jenis === undefined) return;
    used++;
    const label = sheetJenis || 'Baris';
    for (let r = hd.hi + 1; r < sh.rows.length; r++) {
      const g = sh.rows[r] || [];
      if (!g.some((v) => String(v === undefined || v === null ? '' : v).trim() !== '')) continue;
      const ket = String(cellOf(g, hd.map.keterangan));
      if (/^contoh\b/i.test(ket)) { samples++; continue; }
      let jenis = sheetJenis;
      if (!jenis) { const j = normNm(cellOf(g, hd.map.jenis)); jenis = j.indexOf('trans') === 0 ? 'Transfer' : j.indexOf('kel') === 0 ? 'Keluar' : j.indexOf('mas') === 0 ? 'Masuk' : ''; }
      const o = { _row: label + ' · ' + (r + 1), jenis, tanggal: xlDateIso(cellOf(g, hd.map.tanggal)) || String(cellOf(g, hd.map.tanggal)), nominal: moneyOf(cellOf(g, hd.map.nominal)),
        dompet: String(cellOf(g, hd.map.dompet)), kategori: String(cellOf(g, jenis === 'Transfer' ? (hd.map.tujuan !== undefined ? hd.map.tujuan : hd.map.kategori) : hd.map.kategori)), keterangan: ket };
      const d = domBy[normNm(o.dompet)];
      if (!jenis) o._err = 'Jenis transaksi tidak dikenal (Masuk/Keluar/Transfer)';
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(o.tanggal)) o._err = 'Tanggal tidak valid (dd-mm-yyyy)';
      else if (!(o.nominal > 0)) o._err = 'Nominal harus angka > 0';
      else if (!o.dompet) o._err = 'Dompet kosong';
      else if (!d) o._err = 'Dompet "' + o.dompet + '" tidak ada di aplikasi';
      else if (String(d.aktif) === 'false') o._err = 'Dompet "' + o.dompet + '" nonaktif';
      else if (jenis === 'Transfer') {
        const t = domBy[normNm(o.kategori)];
        if (!o.kategori) o._err = 'Dompet tujuan kosong';
        else if (!t) o._err = 'Dompet tujuan "' + o.kategori + '" tidak ada';
        else if (t.id === d.id) o._err = 'Dompet asal & tujuan sama';
        else { o.id_dompet = d.id; o.id_dompet_tujuan = t.id; }
      } else {
        const ks = katBy[normNm(o.kategori)] || [], k = ks.find((x) => x.jenis === jenis);
        if (!o.kategori) o._err = 'Kategori kosong';
        else if (!k) o._err = ks.length ? 'Kategori "' + o.kategori + '" bukan kategori ' + jenis : 'Kategori "' + o.kategori + '" tidak ada';
        else { o.id_dompet = d.id; o.id_kategori = k.id; }
      }
      rows.push(o);
    }
  });
  if (!used) throw new Error('Sheet Transaksi Masuk/Keluar/Transfer tidak ditemukan. Gunakan format dari tombol "Unduh Format Excel".');
  return { rows, samples };
}

/** Format impor undian: sheet Peserta & Hadiah. */
function templateUndian() {
  const { T } = xlTheme();
  const sP = tplSheet('Peserta', 'DAFTAR PESERTA UNDIAN DOORPRIZE', T.p,
    [{ h: 'No', w: 7 }, { h: 'Nama Peserta', req: true, w: 34 }, { h: 'Unit / Keterangan', w: 32 }],
    [[1, 'Budi Santoso (contoh)', 'Produksi 1'], [2, 'Siti Rahmawati (contoh)', 'Logistik'], [3, 'Agus Prasetyo (contoh)', 'PUK Cikarang']], 2005);
  const sH = tplSheet('Hadiah', 'DAFTAR HADIAH DOORPRIZE', 'F59E0B',
    [{ h: 'No', w: 7 }, { h: 'Nama Hadiah', req: true, w: 36 }, { h: 'Jumlah', req: true, w: 12 }, { h: 'Keterangan', w: 30 }],
    [[1, 'Kulkas 2 Pintu (contoh)', 1, 'Hadiah utama'], [2, 'Sepeda Gunung (contoh)', 2, 'Sponsor koperasi'], [3, 'Voucher Belanja Rp100.000 (contoh)', 20, '']]);
  const help = tplHelp('Impor Peserta & Hadiah Undian', [
    ['Peserta · Nama Peserta', true, 'Nama peserta undian (satu baris satu nama). Kolom No hanya penomoran, boleh dikosongkan.'],
    ['Peserta · Unit / Keterangan', false, 'Unit kerja, bagian, atau nomor kupon (ditampilkan di daftar pemenang).'],
    ['Hadiah · Nama Hadiah', true, 'Nama hadiah doorprize. Urutan baris = urutan pengundian (hadiah kecil biasanya lebih dulu).'],
    ['Hadiah · Jumlah', true, 'Banyaknya hadiah yang sama, mis. 20 voucher. Angka bulat minimal 1.'],
    ['Hadiah · Keterangan', false, 'Opsional, mis. nama sponsor.']],
  ['1. Isi sheet "Peserta" dan "Hadiah" mulai baris 7.', '2. Baris contoh berisi tulisan "(contoh)" otomatis dilewati saat impor.',
    '3. Centang "Kosongkan data lama" saat impor bila ingin memulai undian baru dari awal.', '4. Maksimal 500 baris per impor (gabungan peserta + hadiah).']);
  xlSave([sP, sH, help], 'Format_Impor_Undian');
  toast('Format Excel terunduh.', 'success');
}
const UND_AL = {
  nama_p: ['nama peserta', 'nama', 'nama lengkap', 'peserta'], unit: ['unit keterangan', 'unit', 'keterangan', 'organisasi', 'bagian', 'departemen', 'no kupon', 'kupon'],
  nama_h: ['nama hadiah', 'hadiah', 'doorprize', 'nama doorprize'], jumlah: ['jumlah', 'qty', 'banyak', 'jumlah hadiah'], ket_h: ['keterangan', 'catatan', 'sponsor']
};
async function readUndianBook(file) {
  const book = await XL.readAll(file);
  const rows = []; let samples = 0, used = 0;
  book.forEach((sh) => {
    const nm = normNm(sh.name);
    if (sh.hidden || /petunjuk/.test(nm)) return;
    const hh = findHeaderRow(sh.rows, { nama: UND_AL.nama_h, jumlah: UND_AL.jumlah, keterangan: UND_AL.ket_h }, ['nama']);
    const hp = findHeaderRow(sh.rows, { nama: UND_AL.nama_p, unit: UND_AL.unit }, ['nama']);
    const isH = /hadiah|doorprize|prize/.test(nm) ? !!hh : !hp && !!hh;
    const hd = isH ? hh : hp;
    if (!hd) return;
    used++;
    for (let r = hd.hi + 1; r < sh.rows.length; r++) {
      const g = sh.rows[r] || [];
      const nama = String(cellOf(g, hd.map.nama));
      if (!g.some((v) => String(v === undefined || v === null ? '' : v).trim() !== '') || (!nama && !isH && cellOf(g, hd.map.unit) === '')) continue;
      if (/\(contoh\)/i.test(nama)) { samples++; continue; }
      if (!nama && typeof g[0] === 'number' && g.filter((v) => String(v === undefined ? '' : v).trim() !== '').length === 1) continue;
      if (isH) {
        const jr = cellOf(g, hd.map.jumlah), j = jr === '' ? 1 : Math.round(Number(String(jr).replace(/[^\d.-]/g, '')));
        rows.push({ _row: 'Hadiah · ' + (r + 1), _t: 'hadiah', tipe: 'Hadiah', nama, jumlah: j, keterangan: String(cellOf(g, hd.map.keterangan)), info: j + ' buah',
          _err: !nama ? 'Nama hadiah kosong' : !(j >= 1) ? 'Jumlah minimal 1' : '' });
      } else {
        const unit = String(cellOf(g, hd.map.unit));
        rows.push({ _row: 'Peserta · ' + (r + 1), _t: 'peserta', tipe: 'Peserta', nama, unit, info: unit, _err: !nama ? 'Nama peserta kosong' : '' });
      }
    }
  });
  if (!used) throw new Error('Sheet Peserta/Hadiah tidak ditemukan. Gunakan format dari tombol "Unduh Format Excel".');
  return { rows, samples };
}

IMPORT_CFG.transaksi = {
  title: 'Impor Transaksi Massal dari Excel', file: 'Format_Impor_Transaksi', colsText: '3 sheet: Transaksi Masuk, Transaksi Keluar & Transfer (dropdown dompet/kategori)',
  cols: [{ k: 'jenis', h: 'Jenis' }, { k: 'tanggal', h: 'Tanggal', date: true }, { k: 'nominal', h: 'Nominal', money: true }, { k: 'dompet', h: 'Dompet' }, { k: 'kategori', h: 'Kategori / Ke Dompet' }, { k: 'keterangan', h: 'Keterangan' }],
  sample: [], template: templateTransaksi, read: readTrxBook,
  payload: (r) => ({ _row: r._row, jenis: r.jenis, tanggal: r.tanggal, nominal: r.nominal, id_dompet: r.id_dompet, id_kategori: r.id_kategori || '', id_dompet_tujuan: r.id_dompet_tujuan || '', keterangan: r.keterangan }),
  done: (d) => { d.records.forEach((r) => upsertLocal('Transaksi', r)); afterLocalChange('Transaksi'); }
};
IMPORT_CFG.undian = {
  title: 'Impor Peserta & Hadiah Undian', file: 'Format_Impor_Undian', colsText: 'Sheet Peserta (Nama, Unit) & sheet Hadiah (Nama Hadiah, Jumlah)',
  cols: [{ k: 'tipe', h: 'Data' }, { k: 'nama', h: 'Nama' }, { k: 'info', h: 'Unit / Jumlah' }], sample: [], template: templateUndian, read: readUndianBook,
  payload: (r) => ({ _row: r._row, _t: r._t, nama: r.nama, unit: r.unit || '', jumlah: r.jumlah || '', keterangan: r.keterangan || '' }),
  extra: () => '<label class="check mt-16" style="gap:10px"><input type="checkbox" id="imp-replace"> <span>Kosongkan peserta, hadiah &amp; pemenang lama sebelum impor (mulai undian baru)</span></label>',
  opts: () => ({ replace: !!($('#imp-replace') && $('#imp-replace').checked) }),
  done: (d) => {
    if (d.replaced) { S.db.UndianPeserta = []; S.db.UndianHadiah = []; S.db.UndianPemenang = []; }
    d.records.forEach((r) => upsertLocal('UndianPeserta', r)); (d.hadiah || []).forEach((h) => upsertLocal('UndianHadiah', h)); afterLocalChange('UndianPeserta');
  }
};
IMPORT_CFG.gathering = {
  title: 'Impor Peserta Gathering dari Excel', file: 'Format_Impor_Gathering',
  cols: [
    { k: 'nama', h: 'Nama', req: true, w: 30, al: ['nama', 'nama peserta', 'nama anggota', 'nama lengkap'], note: 'Wajib. Nama anggota yang ikut berpartisipasi.' },
    { k: 'nominal', h: 'Nominal', req: true, w: 18, money: true, al: ['nominal', 'jumlah', 'sumbangan', 'iuran', 'nilai'], note: 'Wajib. Besar sumbangan/iuran dalam Rupiah, mis. 250000.' },
    { k: 'jatuh_tempo', h: 'Tanggal Pembayaran / Jatuh Tempo', req: true, w: 24, date: true, al: ['tanggal pembayaran jatuh tempo', 'jatuh tempo', 'tanggal pembayaran', 'tanggal bayar', 'tgl bayar', 'tanggal', 'tgl jatuh tempo', 'due date'], note: 'Wajib. Batas bayar (atau tanggal bayar bila sudah lunas). Tanggal Excel atau dd-mm-yyyy.' },
    { k: 'status', h: 'Status', w: 16, list: ['Belum Lunas', 'Lunas'], al: ['status', 'status bayar', 'status pembayaran'], note: 'Belum Lunas / Lunas (kosong = Belum Lunas).' },
    { k: 'kontak', h: 'No HP', w: 18, text: true, al: ['no hp', 'nohp', 'hp', 'no wa', 'whatsapp', 'no telepon', 'kontak'], note: 'Opsional, untuk pengingat WhatsApp. Kosong = diambil dari data Anggota bila namanya sama.' },
    { k: 'acara', h: 'Acara', w: 24, al: ['acara', 'kegiatan', 'nama acara', 'event'], note: 'Opsional. Kosong = acara yang sedang dipilih di halaman Gathering.' },
    { k: 'keterangan', h: 'Keterangan', w: 30, al: ['keterangan', 'catatan', 'ket'], note: 'Opsional.' }
  ],
  sample: [['Budi Santoso (contoh)', 250000, '2026-12-01', 'Belum Lunas', '081234567890', 'Gathering Akhir Tahun', ''], ['Siti Rahmawati (contoh)', 250000, '2026-11-20', 'Lunas', '085712345678', 'Gathering Akhir Tahun', 'Transfer BCA'],
    ['Agus Prasetyo (contoh)', 150000, '2026-12-01', 'Belum Lunas', '', 'Gathering Akhir Tahun', 'Tanpa keluarga']],
  tips: ['5. Baris contoh berisi tulisan "(contoh)" otomatis dilewati saat impor.', '6. Peserta berstatus Belum Lunas akan diingatkan otomatis (bila WhatsApp gateway aktif) dan ditandai jatuh tempo / terlambat di aplikasi.'],
  extra: () => `<div class="callout mt-16"><i class="bi bi-info-circle t-primary"></i><span>Baris dengan kolom Acara kosong akan masuk ke acara <b>${esc(S.ui.gat.acara || gatDefaultAcara())}</b>.</span></div>`,
  opts: () => ({ acara: S.ui.gat.acara || gatDefaultAcara() }),
  check(r) {
    if (!r.nama) return 'Nama kosong';
    if (!(moneyOf(r.nominal) > 0)) return 'Nominal harus angka > 0';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.jatuh_tempo))) return 'Tanggal tidak valid (dd-mm-yyyy)';
    const st = normNm(r.status);
    if (st && ['lunas', 'belum lunas', 'belum'].indexOf(st) < 0) return 'Status harus Lunas/Belum Lunas';
    return '';
  },
  done: (d) => { d.records.forEach((r) => upsertLocal('Gathering', r)); afterLocalChange('Gathering'); }
};

// ════════════════ HALAMAN: GATHERING (iuran / sumbangan peserta) ════════════════
const GAT_TPL_DEF = 'Halo {nama},\nIni pengingat iuran *{acara}* sebesar *{jumlah}* yang jatuh tempo {jatuh_tempo} ({sisa}).\nMohon segera melakukan pembayaran. Terima kasih atas partisipasinya!\n— {organisasi}';
/** Status peserta: Lunas · Terlambat · Jatuh tempo hari ini · Segera (≤7 hari) · Belum lunas. */
function gatState(g) {
  if (g.status === 'Lunas') return { key: 'lunas', badge: 'Lunas', badgeCls: 'chip-in', icon: 'bi-check-circle-fill', due: 'Dibayar ' + fmtDate(g.tanggal_bayar || g.jatuh_tempo), dueCls: 'chip-in' };
  const d = daysBetween(todayStr(), g.jatuh_tempo);
  if (d < 0) return { key: 'telat', badge: 'Terlambat', badgeCls: 'chip-out', icon: 'bi-exclamation-octagon-fill', due: 'Terlambat ' + -d + ' hari', dueCls: 'chip-out' };
  if (d === 0) return { key: 'hariini', badge: 'Jatuh Tempo', badgeCls: 'chip-out', icon: 'bi-alarm-fill', due: 'Jatuh tempo hari ini', dueCls: 'chip-out' };
  if (d <= 7) return { key: 'segera', badge: 'Jatuh Tempo', badgeCls: 'chip-warn', icon: 'bi-hourglass-split', due: 'Jatuh tempo H-' + d, dueCls: 'chip-warn' };
  return { key: 'belum', badge: 'Belum Lunas', badgeCls: 'chip-trf', icon: 'bi-clock', due: 'H-' + d, dueCls: 'chip-mute' };
}
/** Daftar acara (terbaru dulu, menurut jatuh tempo terakhir). */
function gatAcaraList() {
  const m = {};
  S.db.Gathering.forEach((g) => { const a = g.acara || 'Gathering'; m[a] = String(g.jatuh_tempo) > (m[a] || '') ? String(g.jatuh_tempo) : m[a]; });
  return Object.keys(m).sort((a, b) => m[b].localeCompare(m[a]) || a.localeCompare(b));
}
const gatDefaultAcara = () => gatAcaraList()[0] || 'Gathering ' + new Date().getFullYear();
const gatOfAcara = () => S.db.Gathering.filter((g) => !S.ui.gat.acara || (g.acara || 'Gathering') === S.ui.gat.acara);
function gatFiltered() {
  const u = S.ui.gat, q = (u.q || '').toLowerCase();
  return gatOfAcara().filter((g) => {
    const k = gatState(g).key;
    if (u.tab === 'belum' && g.status === 'Lunas') return false;
    if (u.tab === 'tempo' && ['hariini', 'segera'].indexOf(k) < 0) return false;
    if (u.tab === 'telat' && k !== 'telat') return false;
    if (u.tab === 'lunas' && g.status !== 'Lunas') return false;
    if (q && (g.nama + ' ' + (g.kontak || '') + ' ' + (g.catatan || '') + ' ' + (g.acara || '')).toLowerCase().indexOf(q) < 0) return false;
    return inDr('gathering', g.jatuh_tempo);
  }).sort((a, b) => (a.status === 'Lunas') - (b.status === 'Lunas') || String(a.jatuh_tempo).localeCompare(b.jatuh_tempo) || String(a.nama).localeCompare(b.nama));
}
function gatSummary(list) {
  const s = { target: 0, paid: 0, unpaid: 0, lateSum: 0, n: list.length, nLunas: 0, nLate: 0, nSoon: 0 };
  list.forEach((g) => {
    const v = num(g.nominal), k = gatState(g).key;
    s.target += v;
    if (g.status === 'Lunas') { s.paid += v; s.nLunas++; } else { s.unpaid += v; }
    if (k === 'telat') { s.lateSum += v; s.nLate++; }
    if (k === 'hariini' || k === 'segera') s.nSoon++;
  });
  return s;
}
/** Peserta belum lunas yang jatuh tempo ≤ 7 hari / terlambat (untuk lonceng & menu). */
function dueGathering() {
  return memo('dueG', () => { const t = todayStr(); return S.db.Gathering.filter((g) => g.status !== 'Lunas' && daysBetween(t, g.jatuh_tempo) <= 7).sort((a, b) => String(a.jatuh_tempo).localeCompare(b.jatuh_tempo)); });
}
function fillGatTpl(g) {
  const d = daysBetween(todayStr(), g.jatuh_tempo);
  return String(S.settings.wa_template_gathering || GAT_TPL_DEF).replace(/\{nama\}/g, g.nama).replace(/\{jumlah\}/g, fmtRp(g.nominal)).replace(/\{jatuh_tempo\}/g, fmtDate(g.jatuh_tempo, 'long'))
    .replace(/\{sisa\}/g, d > 0 ? 'H-' + d : d === 0 ? 'HARI INI' : 'terlambat ' + -d + ' hari').replace(/\{acara\}/g, g.acara || 'Gathering').replace(/\{organisasi\}/g, S.settings.subjudul || S.settings.nama_aplikasi);
}

function renderGathering() {
  const u = S.ui.gat, acaras = gatAcaraList();
  if (u.acara && acaras.indexOf(u.acara) < 0) u.acara = '';
  const base = gatOfAcara(), s = gatSummary(base), list = gatFiltered();
  const visible = {}; list.forEach((g) => { visible[g.id] = true; });
  Object.keys(u.sel).forEach((id) => { if (!visible[id]) delete u.sel[id]; });
  const p = s.target ? Math.round((s.paid / s.target) * 1000) / 10 : 0;
  const cnt = { semua: base.length, belum: base.filter((g) => g.status !== 'Lunas').length, tempo: s.nSoon, telat: s.nLate, lunas: s.nLunas };
  const remind = base.filter((g) => g.status !== 'Lunas' && daysBetween(todayStr(), g.jatuh_tempo) <= 3);
  const gw = S.settings.wa_mode === 'gateway';
  $('#sec-gathering').innerHTML = `
  ${pageHead('Kegiatan', 'Iuran Gathering', 'Data anggota yang ikut berpartisipasi menyumbang dana gathering: target, dana terkumpul, status lunas, jatuh tempo, dan pengingat pembayaran.',
    `<button class="btn btn-secondary" onclick="exportExcel('gathering')"><i class="bi bi-file-earmark-excel"></i><span class="lbl">Excel</span></button>${rptMenu('gathering')}
     ${canW() ? `<button class="btn btn-secondary" onclick="openImport('gathering')"><i class="bi bi-file-earmark-arrow-up"></i><span class="lbl">Impor Excel</span></button>
       <button class="btn btn-primary" onclick="openGatheringForm()"><i class="bi bi-person-plus"></i><span class="lbl">Tambah Peserta</span></button>` : ''}`)}
  <div class="gat-acara">${[['', 'Semua acara', S.db.Gathering.length]].concat(acaras.map((a) => [a, a, S.db.Gathering.filter((g) => (g.acara || 'Gathering') === a).length])).map(([k, l, n]) =>
    `<button class="${u.acara === k ? 'on' : ''}" onclick="S.ui.gat.acara=this.dataset.a;renderGathering()" data-a="${esc(k)}"><i class="bi ${k ? 'bi-balloon-heart' : 'bi-collection'}"></i>${esc(l)} <span class="count">${n}</span></button>`).join('')}</div>
  <div class="grid g-4 g-kpi-m">
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Target dana</span><span class="kpi-ico ico-pri"><i class="bi bi-bullseye"></i></span></div><div class="kpi-value">${fmtRp(s.target)}</div><div class="kpi-foot">${s.n} peserta terdaftar</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Dana terkumpul</span><span class="kpi-ico ico-in"><i class="bi bi-cash-coin"></i></span></div><div class="kpi-value t-in">${fmtRp(s.paid)}</div>
      <div class="gat-prog"><span style="width:${Math.min(100, p)}%"></span></div><div class="kpi-foot">${fmtPct(p)} · ${s.nLunas} peserta lunas</div></div>
    <div class="card kpi" style="background:var(--warn-soft)"><div class="kpi-top"><span class="kpi-label t-warn">Belum dibayar</span><span class="kpi-ico ico-warn"><i class="bi bi-hourglass-split"></i></span></div><div class="kpi-value t-warn">${fmtRp(s.unpaid)}</div><div class="kpi-foot t-warn">${cnt.belum} peserta · ${s.nSoon} jatuh tempo ≤ 7 hari</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Terlambat</span><span class="kpi-ico ico-out"><i class="bi bi-exclamation-octagon"></i></span></div><div class="kpi-value t-out">${fmtRp(s.lateSum)}</div><div class="kpi-foot">${s.nLate} peserta lewat jatuh tempo</div></div>
  </div>
  <div class="grid g-side mt-24">
    <div class="card"><div class="filterbar" style="flex-direction:column;align-items:stretch">
      <div class="seg">${[['semua', 'Semua'], ['belum', 'Belum Lunas'], ['tempo', 'Jatuh Tempo'], ['telat', 'Terlambat'], ['lunas', 'Lunas']].map(([k, l]) =>
        `<button class="${u.tab === k ? 'on' : ''}" onclick="S.ui.gat.tab='${k}';renderGathering()">${k === 'telat' ? '<span class="dot" style="background:var(--out)"></span>' : k === 'tempo' ? '<span class="dot" style="background:var(--accent)"></span>' : k === 'lunas' ? '<span class="dot" style="background:var(--in)"></span>' : ''}${l} <span class="count">${cnt[k]}</span></button>`).join('')}</div>
      <div class="row" style="flex-wrap:wrap"><div class="search"><i class="bi bi-search"></i><input class="input" placeholder="Cari nama peserta, no HP, catatan…" value="${esc(u.q)}" oninput="gatSearch(this.value)"></div>${drpButton('gathering', 'Jatuh tempo')}</div></div>
      ${canW() && base.length ? `<div class="gat-tools"><label class="check gat-all"><input type="checkbox" id="gat-all" onchange="gatSelAll(this.checked)" ${list.length && list.every((g) => u.sel[g.id]) ? 'checked' : ''} ${list.length ? '' : 'disabled'}>
        <span>Pilih semua <span class="muted">(${list.length} tampil)</span></span></label>
        <button class="btn btn-ghost btn-sm t-out" onclick="gatHapusSemua()" title="Hapus semua peserta ${esc(u.acara || 'semua acara')}"><i class="bi bi-trash3"></i>Hapus Semua Peserta</button></div>
      <div id="gat-bulk"></div>` : ''}
      <div id="gat-list">${list.length ? list.map(gatRow).join('') : emptyState('bi-balloon-heart', S.db.Gathering.length ? 'Tidak ada peserta sesuai filter' : 'Belum ada peserta gathering', S.db.Gathering.length ? '' : 'Tambahkan peserta satu per satu atau impor dari Excel.', canW() ? '<button class="btn btn-primary btn-sm" onclick="openImport(\'gathering\')">Impor dari Excel</button>' : '')}</div>
      <div class="tbl-foot"><span>Menampilkan ${list.length} dari ${base.length} peserta</span><span class="mono">Total ${fmtRp(list.reduce((a, g) => a + num(g.nominal), 0))}</span></div>
    </div>
    <div class="stack">
      <div class="card card-pad"><div class="row-between"><h3 style="font-size:16px"><i class="bi bi-pie-chart t-primary"></i> Progres Dana</h3><span class="chip chip-soft">${esc(u.acara || 'Semua acara')}</span></div>
        <div class="gat-ring mt-16" style="--p:${Math.min(100, p)}"><div><b>${fmtPct(p, 0)}</b><small>terkumpul</small></div></div>
        <div class="stack mt-16" style="gap:10px">
          <div class="row-between small"><span><span class="dot" style="background:var(--in)"></span> Lunas (${s.nLunas})</span><b class="mono t-in">${fmtRp(s.paid)}</b></div>
          <div class="row-between small"><span><span class="dot" style="background:var(--accent)"></span> Belum lunas (${cnt.belum - s.nLate})</span><b class="mono t-warn">${fmtRp(s.unpaid - s.lateSum)}</b></div>
          <div class="row-between small"><span><span class="dot" style="background:var(--out)"></span> Terlambat (${s.nLate})</span><b class="mono t-out">${fmtRp(s.lateSum)}</b></div>
          <div class="row-between small" style="border-top:1px solid var(--border);padding-top:10px"><b>Sisa kekurangan</b><b class="mono">${fmtRp(s.unpaid)}</b></div></div></div>
      <div class="card card-pad"><div class="row-between"><h3 style="font-size:16px"><i class="bi bi-bell t-warn"></i> Perlu Diingatkan</h3><span class="chip ${remind.length ? 'chip-out' : 'chip-in'}">${remind.length}</span></div>
        <p class="small muted mt-8">Belum lunas dan jatuh tempo ≤ 3 hari atau sudah terlambat.${gw ? ' Pengingat WhatsApp juga terkirim otomatis setiap hari (H-3, H-1, hari H, dan tiap 7 hari bila terlambat).' : ''}</p>
        <div class="stack mt-16" style="gap:10px">${remind.slice(0, 6).map((g) => { const st = gatState(g); return `<div class="row-between small"><div style="min-width:0"><b class="ellipsis">${esc(g.nama)}</b><div class="${st.dueCls === 'chip-out' ? 't-out' : 't-warn'}">${st.due} · ${fmtRp(g.nominal)}</div></div>
          <a class="btn-icon sm" href="${waLink(g.kontak || '', fillGatTpl(g))}" target="_blank" rel="noopener" title="Kirim pengingat WhatsApp" aria-label="WhatsApp ${esc(g.nama)}"><i class="bi bi-whatsapp" style="color:#25D366"></i></a></div>`; }).join('') || '<p class="small muted">Aman, tidak ada yang perlu diingatkan.</p>'}</div>
        ${remind.length && canW() ? `<button class="btn btn-soft btn-block mt-16" onclick="openGatReminder()"><i class="bi bi-send"></i>Kirim Pengingat (${remind.length})</button>` : ''}</div>
    </div>
  </div>`;
  gatBulkBar();
}
const gatSearch = debounce((v) => { S.ui.gat.q = v; renderGathering(); const i = $('#sec-gathering .search input'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 250);
function gatRow(g) {
  const st = gatState(g), done = g.status === 'Lunas', sel = !!S.ui.gat.sel[g.id];
  return `<div class="bill-row ${done ? 'done' : ''} st-${st.key}${sel ? ' sel' : ''}" data-gid="${g.id}" style="${g._pending ? 'opacity:.6' : ''}">
    ${canW() ? `<label class="gat-chk" title="Pilih peserta ini"><input type="checkbox" ${sel ? 'checked' : ''} onchange="gatToggle('${g.id}', this.checked)" aria-label="Pilih ${esc(g.nama)}"></label>` : ''}
    <span class="avatar" style="background:${done ? 'var(--in-soft)' : 'var(--primary-soft)'};color:${done ? 'var(--in)' : 'var(--primary)'}">${done ? '<i class="bi bi-check-lg"></i>' : esc(initials(g.nama))}</span>
    <div class="gat-info" style="flex:1;min-width:0"><div class="row" style="gap:8px;flex-wrap:wrap"><b class="ellipsis">${esc(g.nama)}</b><span class="chip ${st.badgeCls}"><i class="bi ${st.icon}"></i>${st.badge}</span></div>
      <div class="small muted ellipsis">${esc(g.acara || 'Gathering')}${g.kontak ? ' · <span class="mono">' + esc(g.kontak) + '</span>' : ''}${g.catatan ? ' · ' + esc(g.catatan) : ''}</div></div>
    <div class="right"><div class="mono" style="font-weight:600">${fmtRp(g.nominal)}</div><div class="small ${done ? 't-in' : ''}">${done ? 'Dibayar ' + fmtDate(g.tanggal_bayar) : `<span class="mono">${fmtDate(g.jatuh_tempo)}</span>`}</div></div>
    <span class="chip ${st.dueCls} bill-due">${st.due}</span>
    <div class="row-actions">${!done ? `<a class="btn-icon sm" href="${waLink(g.kontak || '', fillGatTpl(g))}" target="_blank" rel="noopener" title="Kirim pengingat WhatsApp" aria-label="Kirim pengingat WhatsApp"><i class="bi bi-whatsapp" style="color:#25D366"></i></a>` : ''}
      ${canW() ? `${!done ? `<button class="btn btn-soft btn-sm" onclick="openGatLunas('${g.id}')" title="Tandai sudah membayar"><i class="bi bi-check2-circle"></i>Tandai Lunas</button>` : ''}<button class="btn-icon sm" onclick="openGatheringForm('${g.id}')" aria-label="Ubah"><i class="bi bi-pencil"></i></button>` : ''}</div></div>`;
}
// ── Pilih banyak peserta + aksi massal ──
function gatToggle(id, on) {
  if (on) S.ui.gat.sel[id] = true; else delete S.ui.gat.sel[id];
  const row = document.querySelector('#gat-list [data-gid="' + id + '"]'); if (row) row.classList.toggle('sel', !!on);
  gatBulkBar();
}
function gatSelAll(on) {
  const list = gatFiltered();
  list.forEach((g) => { if (on) S.ui.gat.sel[g.id] = true; else delete S.ui.gat.sel[g.id]; });
  $$('#gat-list [data-gid]').forEach((r) => { const c = r.querySelector('.gat-chk input'); r.classList.toggle('sel', !!on); if (c) c.checked = !!on; });
  gatBulkBar();
}
const gatSelected = () => S.db.Gathering.filter((g) => S.ui.gat.sel[g.id]);
function gatBulkBar() {
  const el = $('#gat-bulk'); if (!el) return;
  const sel = gatSelected(), all = $('#gat-all'), list = gatFiltered();
  if (all) { all.checked = list.length > 0 && list.every((g) => S.ui.gat.sel[g.id]); all.indeterminate = sel.length > 0 && !all.checked; }
  if (!sel.length) { el.innerHTML = ''; el.className = ''; return; }
  el.className = 'gat-bulk';
  el.innerHTML = `<div class="gat-bulk-info"><b>${sel.length} dipilih</b><span class="mono">${fmtRp(sel.reduce((a, g) => a + num(g.nominal), 0))}</span></div>
    <div class="gat-bulk-act"><span class="small">Tandai:</span>
      <button class="btn btn-sm b-in" onclick="gatBulk('lunas')"><i class="bi bi-check2-circle"></i>Lunas</button>
      <button class="btn btn-sm b-trf" onclick="gatBulk('belum')"><i class="bi bi-clock"></i>Belum Lunas</button>
      <button class="btn btn-sm b-warn" onclick="gatBulk('jatuh_tempo')"><i class="bi bi-hourglass-split"></i>Jatuh Tempo</button>
      <button class="btn btn-sm b-out" onclick="gatBulk('terlambat')"><i class="bi bi-exclamation-octagon"></i>Terlambat</button>
      <button class="btn btn-sm b-del" onclick="gatBulk('hapus')" title="Hapus peserta terpilih"><i class="bi bi-trash3"></i>Hapus</button>
      <button class="btn btn-sm b-x" onclick="gatSelAll(false)" title="Batalkan pilihan" aria-label="Batalkan pilihan"><i class="bi bi-x-lg"></i></button></div>`;
}
/** Buka konfirmasi aksi massal untuk peserta terpilih. */
function gatBulk(aksi) {
  if (!canW('gathering')) return;
  const sel = gatSelected(); if (!sel.length) return;
  const ids = sel.map((g) => g.id), n = sel.length, sum = fmtRp(sel.reduce((a, g) => a + num(g.nominal), 0));
  const head = `<div class="budget-card" style="margin-bottom:16px"><div class="row-between"><b>${n} peserta dipilih</b><span class="mono" style="font-weight:600">${sum}</span></div>
    <span class="small muted ellipsis">${sel.slice(0, 6).map((g) => esc(g.nama)).join(', ')}${n > 6 ? ' dan ' + (n - 6) + ' lainnya' : ''}</span></div>`;
  if (aksi === 'hapus') {
    confirmDlg('Hapus ' + n + ' peserta terpilih dari data gathering? Tindakan tercatat di log aktivitas.', { ok: 'Hapus ' + n + ' Peserta', danger: true, title: 'Hapus Peserta Terpilih' })
      .then((yes) => { if (yes) gatApply('hapus', ids, {}); });
    return;
  }
  if (aksi === 'belum') {
    confirmDlg('Tandai ' + n + ' peserta sebagai BELUM LUNAS? Tanggal bayar dikosongkan. Transaksi kas yang sudah tercatat tidak ikut dihapus.', { ok: 'Tandai Belum Lunas', title: 'Tandai Belum Lunas', extra: head })
      .then((yes) => { if (yes) gatApply('belum', ids, {}); });
    return;
  }
  const canTrx = can('transaksi', 2) && S.db.Dompet.length;
  const katDef = (katsBy('Masuk').find((k) => /sumbang|donasi|lain/i.test(k.nama)) || katsBy('Masuk')[0] || {}).id;
  const cfg = {
    lunas: { title: 'Tandai ' + n + ' Peserta Lunas', btn: 'Tandai Lunas', icon: 'bi-check2-circle', note: '',
      fields: [{ k: 'tanggal', label: 'Tanggal bayar', type: 'date', req: true },
        { k: 'catat', label: 'Catat juga sebagai pemasukan di Buku Kas (1 transaksi per peserta)', type: 'check', full: true, show: () => !!canTrx },
        { k: 'id_dompet', label: 'Diterima di dompet', type: 'select', req: true, full: true, opts: () => activeDompet().map((d) => [d.id, d.nama_dompet]), show: (r) => canTrx && r.catat === 'true' },
        { k: 'id_kategori', label: 'Kategori pemasukan', type: 'select', req: true, full: true, ph: '— pilih —', opts: () => katsBy('Masuk').map((k) => [k.id, k.nama]), show: (r) => canTrx && r.catat === 'true' }],
      rec: { tanggal: todayStr(), catat: 'false', id_dompet: (activeDompet()[0] || {}).id, id_kategori: katDef } },
    jatuh_tempo: { title: 'Tandai ' + n + ' Peserta Jatuh Tempo', btn: 'Simpan Jatuh Tempo', icon: 'bi-hourglass-split',
      note: 'Status menjadi Belum Lunas dengan tanggal jatuh tempo baru. Label "Jatuh Tempo" tampil bila tanggalnya hari ini s.d. 7 hari ke depan.',
      fields: [{ k: 'tanggal', label: 'Tanggal jatuh tempo', type: 'date', req: true }], rec: { tanggal: todayStr() } },
    terlambat: { title: 'Tandai ' + n + ' Peserta Terlambat', btn: 'Tandai Terlambat', icon: 'bi-exclamation-octagon',
      note: 'Status Terlambat dihitung dari tanggal jatuh tempo yang sudah lewat. Pilih tanggal jatuh tempo sebelum hari ini.',
      fields: [{ k: 'tanggal', label: 'Tanggal jatuh tempo (sudah lewat)', type: 'date', req: true, max: addDays(todayStr(), -1) }], rec: { tanggal: addDays(todayStr(), -1) } }
  }[aksi];
  FORM = { fields: cfg.fields, uploads: {} };
  openModal({ title: cfg.title, size: 'sm', body: head + (cfg.note ? `<div class="callout" style="margin:0 0 14px"><i class="bi bi-info-circle t-primary"></i><span>${cfg.note}</span></div>` : '') + buildForm(cfg.fields, cfg.rec),
    foot: `<button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-gbulk"><i class="bi ${cfg.icon}"></i>${cfg.btn}</button>` });
  formReflow();
  $('#btn-gbulk').onclick = () => {
    const d = readForm(); if (!validateForm(d)) return;
    if (aksi === 'terlambat' && !(d.tanggal < todayStr())) { toast('Tanggal jatuh tempo harus sebelum hari ini.', 'warning'); return; }
    closeModal();
    gatApply(aksi, ids, { tanggal: d.tanggal, catatTransaksi: d.catat === 'true', id_dompet: d.id_dompet, id_kategori: d.id_kategori });
  };
}
/** Terapkan aksi massal: tampilan langsung berubah, server menyusul (dibatalkan bila gagal). */
function gatApply(aksi, ids, opts) {
  const back = clone(S.db.Gathering), set = {};
  ids.forEach((id) => { set[id] = true; });
  if (aksi === 'hapus') S.db.Gathering = S.db.Gathering.filter((g) => !set[g.id]);
  else S.db.Gathering = S.db.Gathering.map((g) => {
    if (!set[g.id]) return g;
    const o = Object.assign({}, g, { _pending: true });
    if (aksi === 'lunas') { if (g.status !== 'Lunas') { o.status = 'Lunas'; o.tanggal_bayar = opts.tanggal; } }
    else { o.status = 'Belum'; o.tanggal_bayar = ''; o.id_transaksi = ''; if (aksi !== 'belum') o.jatuh_tempo = opts.tanggal; }
    return o;
  });
  S.ui.gat.sel = {};
  afterLocalChange('Gathering');
  const lbl = { lunas: 'ditandai Lunas', belum: 'ditandai Belum Lunas', jatuh_tempo: 'diubah jatuh temponya', terlambat: 'ditandai Terlambat', hapus: 'dihapus' }[aksi];
  toast(ids.length + ' peserta ' + lbl + '.', 'success');
  enqueue(() => api('gatheringMassal', S.token, ids.map((id) => resolveIds({ id }).id), aksi, opts).then((res) => {
    const d = res.data, upd = {};
    d.records.forEach((r) => { upd[r.id] = r; });
    S.db.Gathering = S.db.Gathering.filter((g) => d.removed.indexOf(g.id) < 0).map((g) => upd[g.id] || g);
    if (d.transaksi && d.transaksi.length) { d.transaksi.forEach((t) => upsertLocal('Transaksi', t)); afterLocalChange('Transaksi'); }
    S.meta.version = d.version; afterLocalChange('Gathering');
  }).catch((e) => { S.db.Gathering = back; afterLocalChange('Gathering'); toast(e.message, 'error', 'Gagal — perubahan dibatalkan'); }));
}
/** Hapus semua peserta pada acara yang sedang dipilih (atau semua acara). Wajib ketik HAPUS. */
function gatHapusSemua() {
  if (!canW('gathering')) return;
  const list = gatOfAcara(), acara = S.ui.gat.acara;
  if (!list.length) { toast('Tidak ada peserta untuk dihapus.', 'info'); return; }
  openModal({ title: 'Hapus Semua Peserta', size: 'sm', body: `<div class="callout danger" style="margin:0 0 14px"><i class="bi bi-exclamation-triangle t-out"></i>
      <span>Semua <b>${list.length} peserta</b> ${acara ? 'acara <b>' + esc(acara) + '</b>' : 'dari <b>semua acara</b>'} (total ${fmtRp(list.reduce((a, g) => a + num(g.nominal), 0))}) akan dihapus permanen. Transaksi kas yang sudah tercatat tidak ikut dihapus.</span></div>
    <label class="field" style="margin:0"><span>Ketik <b class="mono">HAPUS</b> untuk melanjutkan</span><input id="gat-del-confirm" class="input mono" autocomplete="off" oninput="$('#btn-gdel').disabled=this.value.trim().toUpperCase()!=='HAPUS'"></label>`,
    foot: `<button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-danger" id="btn-gdel" disabled><i class="bi bi-trash3"></i>Hapus ${list.length} Peserta</button>` });
  $('#btn-gdel').onclick = () => { closeModal(); gatApply('hapus', list.map((g) => g.id), {}); };
}
function openGatheringForm(id) {
  if (!canW('gathering')) return;
  const rec = id ? clone(findLocal('Gathering', id)) : { acara: S.ui.gat.acara || gatDefaultAcara(), jatuh_tempo: addDays(todayStr(), 14), status: 'Belum', nominal: (gatOfAcara()[0] || {}).nominal || '' };
  if (rec.status !== 'Lunas') rec.status = 'Belum';
  const names = can('anggota') ? S.db.Anggota.map((a) => a.nama) : [];
  openEntityForm('Gathering', id ? 'Ubah Peserta Gathering' : 'Tambah Peserta Gathering', [
    { k: 'acara', label: 'Acara', req: true, full: true, ph: 'mis. Gathering Akhir Tahun 2026', list: gatAcaraList(), hint: 'Pilih acara yang ada atau ketik nama acara baru.' },
    { k: 'nama', label: 'Nama peserta', req: true, full: true, ph: 'Nama anggota', list: names },
    { k: 'kontak', label: 'No. HP / WhatsApp', type: 'tel', ph: '08xxxxxxxxxx', hint: 'Untuk pengingat pembayaran.' },
    { k: 'nominal', label: 'Nominal sumbangan', type: 'money', req: true, positive: true },
    { k: 'jatuh_tempo', label: 'Jatuh tempo pembayaran', type: 'date', req: true },
    { k: 'status', label: 'Status', type: 'select', opts: [['Belum', 'Belum lunas'], ['Lunas', 'Lunas']] },
    { k: 'tanggal_bayar', label: 'Tanggal bayar', type: 'date', show: (r) => r.status === 'Lunas' },
    { k: 'catatan', label: 'Catatan', type: 'textarea', full: true }
  ], rec, { onChange: (r) => {
    if (!id && r.nama && !r.kontak) { const a = S.db.Anggota.find((x) => normNm(x.nama) === normNm(r.nama)); if (a && a.kontak) { const k = $('#dyn-form [name="kontak"]'); if (k && !k.value) k.value = a.kontak; } }
  }, beforeSave: (d) => { if (d.status === 'Lunas' && !d.tanggal_bayar) d.tanggal_bayar = todayStr(); if (d.status !== 'Lunas') d.tanggal_bayar = ''; } });
  const nm = $('#dyn-form [name="nama"]'); if (nm) nm.addEventListener('change', formReflow);
}
function openGatLunas(id) {
  if (!canW('gathering')) return;
  const g = findLocal('Gathering', id); if (!g) return;
  const canTrx = can('transaksi', 2) && S.db.Dompet.length;
  FORM = { fields: [
    { k: 'tanggal', label: 'Tanggal bayar', type: 'date', req: true },
    { k: 'catat', label: 'Catat juga sebagai pemasukan di Buku Kas', type: 'check', full: true, show: () => !!canTrx },
    { k: 'id_dompet', label: 'Diterima di dompet', type: 'select', req: true, full: true, opts: () => activeDompet().map((d) => [d.id, d.nama_dompet]), show: (r) => canTrx && r.catat === 'true' },
    { k: 'id_kategori', label: 'Kategori pemasukan', type: 'select', req: true, full: true, ph: '— pilih —', opts: () => katsBy('Masuk').map((k) => [k.id, k.nama]), show: (r) => canTrx && r.catat === 'true' }
  ], uploads: {} };
  const katDef = (katsBy('Masuk').find((k) => /sumbang|donasi|lain/i.test(k.nama)) || katsBy('Masuk')[0] || {}).id;
  openModal({ title: 'Tandai Lunas', size: 'sm', body: `<div class="budget-card" style="margin-bottom:16px"><div class="row-between"><b>${esc(g.nama)}</b><span class="mono" style="font-weight:600">${fmtRp(g.nominal)}</span></div>
    <span class="small muted">${esc(g.acara || 'Gathering')} · jatuh tempo ${fmtDate(g.jatuh_tempo, 'long')}</span></div>` + buildForm(FORM.fields, { tanggal: todayStr(), catat: 'false', id_dompet: (activeDompet()[0] || {}).id, id_kategori: katDef }),
    foot: '<button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-glunas"><i class="bi bi-check2-circle"></i>Tandai Lunas</button>' });
  formReflow();
  $('#btn-glunas').onclick = () => {
    const d = readForm(); if (!validateForm(d)) return;
    const opts = { tanggal: d.tanggal, catatTransaksi: d.catat === 'true', id_dompet: d.id_dompet, id_kategori: d.id_kategori };
    closeModal();
    const prev = clone(g);
    upsertLocal('Gathering', Object.assign({}, g, { status: 'Lunas', tanggal_bayar: d.tanggal, _pending: true }));
    afterLocalChange('Gathering'); toast(g.nama + ' ditandai lunas.', 'success');
    enqueue(() => api('markGatheringLunas', S.token, resolveIds({ id: g.id }).id, opts).then((res) => {
      replaceLocal('Gathering', g.id, res.data.record);
      if (res.data.transaksi) { upsertLocal('Transaksi', res.data.transaksi); afterLocalChange('Transaksi'); }
      S.meta.version = res.data.version; afterLocalChange('Gathering');
    }).catch((e) => { replaceLocal('Gathering', g.id, prev); afterLocalChange('Gathering'); toast(e.message, 'error', 'Gagal'); }));
  };
}
/** Modal pengingat: tombol WhatsApp per peserta (+ kirim otomatis bila gateway aktif). */
function openGatReminder() {
  const list = gatOfAcara().filter((g) => g.status !== 'Lunas' && daysBetween(todayStr(), g.jatuh_tempo) <= 3).sort((a, b) => String(a.jatuh_tempo).localeCompare(b.jatuh_tempo));
  const gw = S.settings.wa_mode === 'gateway' && S.meta.waConfigured;
  const withHp = list.filter((g) => g.kontak);
  openModal({ title: 'Kirim Pengingat Pembayaran', size: 'wide', body: `
    <div class="callout"><i class="bi bi-whatsapp" style="color:#25D366"></i><span>${gw ? `WhatsApp gateway aktif: klik <b>Kirim Otomatis</b> untuk mengirim ke ${withHp.length} peserta yang punya No HP, atau kirim satu per satu.` : 'Klik tombol WhatsApp pada tiap peserta untuk membuka pesan pengingat siap kirim.'}</span></div>
    <div class="stack mt-16" style="gap:0">${list.map((g) => { const st = gatState(g); return `<div class="bill-row st-${st.key}" style="padding:10px 12px">
      <div style="flex:1;min-width:0"><b>${esc(g.nama)}</b><div class="small muted">${esc(g.acara || 'Gathering')} · ${fmtRp(g.nominal)} · ${g.kontak ? '<span class="mono">' + esc(g.kontak) + '</span>' : '<span class="t-out">No HP belum ada</span>'}</div></div>
      <span class="chip ${st.dueCls}">${st.due}</span>
      <a class="btn btn-soft btn-sm" href="${waLink(g.kontak || '', fillGatTpl(g))}" target="_blank" rel="noopener"><i class="bi bi-whatsapp" style="color:#25D366"></i>Kirim</a></div>`; }).join('')}</div>
    <details class="mt-16"><summary class="small muted" style="cursor:pointer">Lihat contoh pesan</summary><div style="background:#E7F8EE;color:#0b2b18;border-radius:12px;padding:14px;white-space:pre-wrap;font-size:13px;margin-top:8px">${esc(list[0] ? fillGatTpl(list[0]) : '')}</div>
      <small class="field-hint">Template pesan dapat diubah Super Admin di Pengaturan → Integrasi Notifikasi.</small></details>`,
    foot: `<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>${gw && withHp.length ? `<button class="btn btn-primary" id="btn-gsend"><i class="bi bi-send"></i>Kirim Otomatis (${withHp.length})</button>` : ''}` });
  const b = $('#btn-gsend');
  if (b) b.onclick = () => {
    b.disabled = true; b.innerHTML = '<span class="spin"></span> Mengirim…';
    api('kirimPengingatGathering', S.token, withHp.map((g) => resolveIds({ id: g.id }).id)).then((res) => { closeModal(); toast(res.message, 'success'); })
      .catch((e) => { b.disabled = false; b.innerHTML = '<i class="bi bi-send"></i>Kirim Otomatis'; toast(e.message, 'error'); });
  };
}
RPT_SPEC.gathering = function () {
  const list = gatFiltered(), s = gatSummary(list), app = S.settings.nama_aplikasi || 'KASBURUH', acara = S.ui.gat.acara || 'Semua acara';
  const tone = (g) => ({ lunas: 'in', telat: 'out', hariini: 'out', segera: 'warn' }[gatState(g).key] || 'trf');
  const tabL = { semua: 'Semua peserta', belum: 'Belum lunas', tempo: 'Jatuh tempo', telat: 'Terlambat', lunas: 'Lunas' }[S.ui.gat.tab];
  return { title: 'Iuran Gathering · ' + acara, subtitle: tabL + (S.ui.gat.q ? ' · Cari: "' + S.ui.gat.q + '"' : '') + ' · ' + list.length + ' peserta', period: fmtDate(todayStr(), 'long'), periodLabel: 'PER TANGGAL',
    file: app + '_Gathering_' + String(S.ui.gat.acara || 'Semua').replace(/\W+/g, '_') + '_' + todayStr(),
    kpis: [{ label: 'Target Dana', value: fmtRp(s.target), sub: s.n + ' peserta' }, { label: 'Terkumpul', value: fmtRp(s.paid), tone: 'in', sub: s.nLunas + ' lunas · ' + fmtPct(pct(s.paid, s.target)) },
      { label: 'Belum Dibayar', value: fmtRp(s.unpaid), tone: 'warn', sub: (s.n - s.nLunas) + ' peserta' }, { label: 'Terlambat', value: fmtRp(s.lateSum), tone: 'out', sub: s.nLate + ' peserta' }],
    blocks: [{ t: 'bars', items: [{ label: 'Progres dana terkumpul', value: s.paid, max: s.target || 1, tone: 'in', right: fmtRp(s.paid) + ' dari ' + fmtRp(s.target) + ' (' + fmtPct(pct(s.paid, s.target)) + ')' }] },
      { t: 'table', head: ['No', 'Nama Peserta', 'No HP', 'Nominal', 'Jatuh Tempo', 'Status', 'Keterangan', 'Tgl Bayar'],
        rows: list.map((g, i) => [i + 1, g.nama, g.kontak || '-', fmtRp(g.nominal), fmtDate(g.jatuh_tempo), g.status === 'Lunas' ? 'Lunas' : 'Belum Lunas', gatState(g).due, g.tanggal_bayar ? fmtDate(g.tanggal_bayar) : '-']),
        align: { 0: 'center', 3: 'right' }, widths: { 0: 24 }, bold: { 1: true }, chip: { 5: (i) => (list[i].status === 'Lunas' ? 'in' : 'out'), 6: (i) => tone(list[i]) },
        rowTone: (i) => ({ telat: 'out', hariini: 'out', segera: 'warn' }[gatState(list[i]).key] || null),
        foot: ['', 'TOTAL', list.length + ' peserta', fmtRp(s.target), '', s.nLunas + ' lunas', s.nLate + ' terlambat', ''], empty: 'Tidak ada peserta sesuai filter.' }, { t: 'sign', labels: ['Ketua Panitia', 'Bendahara'] }] };
};

// ════════════════ HALAMAN: SPIN WHEEL DOORPRIZE ════════════════
const UND = { rot: 0, spinning: false, raf: 0, lastIdx: -1, audio: null };
const UND_COLORS = ['#6247EA', '#F59E0B', '#12A150', '#EC4899', '#2F6FED', '#E5484D', '#0EA5E9', '#8B5CF6', '#14B8A6', '#F97316'];
const undPrizes = () => S.db.UndianHadiah.slice().sort((a, b) => num(a.urutan) - num(b.urutan) || String(a.nama_hadiah).localeCompare(b.nama_hadiah));
const undWinners = () => S.db.UndianPemenang.slice().sort((a, b) => num(b.putaran) - num(a.putaran) || String(b.waktu).localeCompare(String(a.waktu)));
const undUsed = (hid) => S.db.UndianPemenang.filter((w) => w.id_hadiah === hid).length;
const undLeft = (h) => Math.max(0, num(h.jumlah) - undUsed(h.id));
function undPool() {
  const won = new Set(S.db.UndianPemenang.map((w) => w.id_peserta));
  return S.db.UndianPeserta.filter((p) => !S.ui.und.exclude || !won.has(p.id));
}
function undCurPrize() {
  const ps = undPrizes();
  const h = ps.find((x) => x.id === S.ui.und.hadiah && undLeft(x) > 0) || ps.find((x) => undLeft(x) > 0) || null;
  S.ui.und.hadiah = h ? h.id : '';
  return h;
}
/** Angka acak kriptografis (adil & tidak bisa ditebak). */
function undRand() { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch (e) { return Math.random(); } }
function undPick(n, k) { const idx = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(undRand() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; } return idx.slice(0, k); }

function renderUndian() {
  const u = S.ui.und;
  if (u.title === null) u.title = lsGet('kb_und_title', 'Undian Doorprize');
  const P = S.db.UndianPeserta, ps = undPrizes(), W0 = undWinners(), pool = undPool(), h = undCurPrize();
  const left = h ? undLeft(h) : 0, maxN = Math.max(1, Math.min(left || 1, pool.length || 1));
  u.n = Math.max(1, Math.min(num(u.n) || 1, maxN));
  const totalPrize = ps.reduce((a, x) => a + num(x.jumlah), 0);
  const dis = !canW() || !h || !pool.length || UND.spinning;
  const won = new Set(S.db.UndianPemenang.map((w) => w.id_peserta)), q = (u.q || '').toLowerCase();
  const plist = P.filter((p) => !q || (p.nama + ' ' + (p.unit || '')).toLowerCase().indexOf(q) >= 0).sort((a, b) => String(a.nama).localeCompare(b.nama));
  const logo = S.settings.logo_data || S.settings.link_logo;
  $('#sec-undian').innerHTML = `
  ${pageHead('Kegiatan', 'Spin Wheel Doorprize', 'Undi pemenang doorprize secara acak & transparan. Peserta dan hadiah dapat diimpor massal dari Excel; jumlah pemenang per putaran bisa diatur.',
    `${W0.length ? `<button class="btn btn-secondary" onclick="exportExcel('undian')"><i class="bi bi-file-earmark-excel"></i><span class="lbl">Excel</span></button>${rptMenu('undian')}` : ''}
     ${canW() ? `<button class="btn btn-secondary" onclick="openImport('undian')"><i class="bi bi-file-earmark-arrow-up"></i><span class="lbl">Impor Excel</span></button>
       <button class="btn btn-primary" onclick="openUndHadiah()"><i class="bi bi-gift"></i><span class="lbl">Tambah Hadiah</span></button>` : ''}`)}
  <div class="grid g-4 g-kpi-m">
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Peserta</span><span class="kpi-ico ico-pri"><i class="bi bi-people"></i></span></div><div class="kpi-value">${fmtNum(P.length)}</div><div class="kpi-foot">${fmtNum(pool.length)} masih di roda</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Total hadiah</span><span class="kpi-ico ico-warn"><i class="bi bi-gift"></i></span></div><div class="kpi-value">${fmtNum(totalPrize)}</div><div class="kpi-foot">${ps.length} jenis hadiah</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Sudah diundi</span><span class="kpi-ico ico-in"><i class="bi bi-trophy"></i></span></div><div class="kpi-value t-in">${fmtNum(W0.length)}</div><div class="kpi-foot">${W0.length ? Math.max(...W0.map((w) => num(w.putaran))) : 0} putaran</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="kpi-label">Sisa hadiah</span><span class="kpi-ico ico-trf"><i class="bi bi-box2-heart"></i></span></div><div class="kpi-value">${fmtNum(Math.max(0, totalPrize - W0.length))}</div><div class="kpi-foot">${h ? 'Berikutnya: ' + esc(h.nama_hadiah) : 'Semua hadiah sudah diundi'}</div></div>
  </div>
  <div class="und-grid mt-24">
    <div class="card und-stage${u.present && u.hideCtrl ? ' hide-ctrl' : ''}" id="und-stage">
      ${u.present ? `<div class="und-ptools" role="toolbar" aria-label="Kontrol layar penuh">
        <button type="button" onclick="S.ui.und.hideCtrl=!S.ui.und.hideCtrl;renderUndian()" title="${u.hideCtrl ? 'Tampilkan' : 'Sembunyikan'} panel pengaturan"><i class="bi ${u.hideCtrl ? 'bi-sliders' : 'bi-eye-slash'}"></i><span>${u.hideCtrl ? 'Tampilkan Kontrol' : 'Sembunyikan Kontrol'}</span></button>
        <button type="button" onclick="undSound()" title="${UNDS.on() ? 'Matikan' : 'Nyalakan'} suara"><i class="bi ${UNDS.on() ? 'bi-volume-up-fill' : 'bi-volume-mute'}"></i><span>${UNDS.on() ? 'Suara Aktif' : 'Suara Mati'}</span></button>
        <button type="button" class="min" onclick="undPresent()" title="Perkecil / keluar dari layar penuh (Esc)"><i class="bi bi-fullscreen-exit"></i><span>Perkecil</span><kbd>Esc</kbd></button></div>` : ''}
      <div class="und-top"><input class="und-title" id="und-title" value="${esc(u.title)}" maxlength="60" onchange="undSetTitle(this.value)" aria-label="Judul acara undian">
        <button class="btn btn-ghost btn-icon" onclick="undPresent()" title="${u.present ? 'Keluar mode presentasi' : 'Mode presentasi (layar penuh)'}"><i class="bi ${u.present ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen'}"></i></button></div>
      <div class="und-prize">${h ? `<span class="caps">Hadiah yang diundi</span><b>${esc(h.nama_hadiah)}</b><small>Sisa ${left} dari ${num(h.jumlah)}${h.catatan ? ' · ' + esc(h.catatan) : ''}</small>`
        : `<b>${ps.length ? 'Semua hadiah sudah diundi' : 'Belum ada hadiah'}</b><small>${ps.length ? 'Lihat daftar pemenang di samping.' : canW() ? 'Tambahkan hadiah atau impor dari Excel.' : ''}</small>`}</div>
      <div class="wheel-wrap"><canvas id="und-wheel" aria-label="Roda undian berisi ${pool.length} peserta"></canvas><span class="wheel-pin" aria-hidden="true"></span>
        <button class="wheel-hub" onclick="undSpin()" ${dis ? 'disabled' : ''} aria-label="Putar roda">${logo ? `<img src="${esc(logo)}" alt="">` : '<i class="bi bi-play-fill"></i>'}<span>PUTAR</span></button></div>
      <div class="und-ticker" id="und-ticker">${pool.length ? fmtNum(pool.length) + ' peserta siap diundi' : 'Belum ada peserta di roda'}</div>
      <div class="und-ctrl">
        <label class="field" style="margin:0"><span>Hadiah</span><select class="select" onchange="S.ui.und.hadiah=this.value;renderUndian()" ${UND.spinning ? 'disabled' : ''}>${ps.length ? ps.map((x) => `<option value="${x.id}" ${h && x.id === h.id ? 'selected' : ''} ${undLeft(x) ? '' : 'disabled'}>${esc(x.nama_hadiah)} · sisa ${undLeft(x)}/${num(x.jumlah)}</option>`).join('') : '<option>— belum ada hadiah —</option>'}</select></label>
        <div class="field" style="margin:0"><span>Jumlah pemenang per putaran</span>
          <div class="und-step"><button type="button" class="btn btn-secondary btn-icon" onclick="undSetN(${u.n - 1})" aria-label="Kurangi">−</button><input type="number" class="input mono" id="und-n" min="1" max="${maxN}" value="${u.n}" onchange="undSetN(this.value)" aria-label="Jumlah pemenang"><button type="button" class="btn btn-secondary btn-icon" onclick="undSetN(${u.n + 1})" aria-label="Tambah">+</button></div>
          <div class="und-quick">${Array.from(new Set([1, 3, 5, 10].filter((n) => n <= maxN).concat(maxN > 1 ? [maxN] : []))).map((n) => `<button type="button" class="${u.n === n ? 'on' : ''}" onclick="undSetN(${n})">${n === maxN && n > 1 ? 'Semua sisa · ' + n : n + ' orang'}</button>`).join('')}</div></div>
        <label class="check" style="gap:10px"><input type="checkbox" ${u.exclude ? 'checked' : ''} onchange="S.ui.und.exclude=this.checked;renderUndian()"> <span>Pemenang tidak ikut putaran berikutnya</span></label>
        <div class="und-sound"><button type="button" class="btn btn-icon ${UNDS.on() ? 'btn-soft' : 'btn-secondary'}" onclick="undSound()" title="${UNDS.on() ? 'Matikan' : 'Nyalakan'} suara" aria-label="${UNDS.on() ? 'Matikan' : 'Nyalakan'} suara"><i class="bi ${UNDS.on() ? 'bi-volume-up-fill' : 'bi-volume-mute'}"></i></button>
          <div style="flex:1;min-width:0"><div class="row-between small"><span>Suara menegangkan ${UNDS.on() ? '<span class="chip chip-in" style="padding:1px 8px">Aktif</span>' : '<span class="chip chip-mute" style="padding:1px 8px">Mati</span>'}</span><b class="mono" id="und-vol-val">${Math.round(UNDS.vol() * 100)}%</b></div>
            <input type="range" class="range" min="0" max="100" step="5" value="${Math.round(UNDS.vol() * 100)}" oninput="undVol(this.value)" aria-label="Volume suara" ${UNDS.on() ? '' : 'disabled'}></div>
          <button type="button" class="btn btn-ghost btn-sm" onclick="UNDS.preview()" title="Dengarkan contoh suara"><i class="bi bi-play-circle"></i>Coba</button></div>
        <button class="btn btn-primary btn-block und-go" onclick="undSpin()" ${dis ? 'disabled' : ''}><i class="bi bi-arrow-repeat"></i>PUTAR RODA${u.n > 1 ? ' · ' + u.n + ' PEMENANG' : ''}</button>
        ${!canW() ? '<p class="small muted" style="text-align:center">Peran Anda hanya dapat melihat hasil undian.</p>' : ''}
      </div>
    </div>
    <div class="stack">
      <div class="card"><div class="card-head card-pad" style="margin:0;padding-bottom:10px"><h3><i class="bi bi-trophy t-warn"></i> Pemenang</h3>
        <div class="row">${canW() && W0.length ? '<button class="btn btn-ghost btn-sm" onclick="undReset(\'pemenang\')" title="Hapus semua pemenang, undi ulang"><i class="bi bi-arrow-counterclockwise"></i>Ulang</button>' : ''}<span class="chip chip-in">${W0.length}</span></div></div>
        <div class="und-list">${W0.length ? W0.slice(0, 150).map((w) => { const p = S.db.UndianPeserta.find((x) => x.id === w.id_peserta) || {}; return `<div class="und-item" style="${w._pending ? 'opacity:.6' : ''}">
          <span class="und-put" title="Putaran ${num(w.putaran)}">#${num(w.putaran)}</span><div style="flex:1;min-width:0"><b class="ellipsis">${esc(w.nama_peserta)}</b><div class="small muted ellipsis">${p.unit ? esc(p.unit) + ' · ' : ''}<span class="t-primary">${esc(w.nama_hadiah)}</span></div></div>
          ${canW() && !w._pending ? `<button class="btn-icon sm" onclick="deleteEntity('UndianPemenang','${w.id}')" aria-label="Batalkan pemenang" title="Batalkan pemenang (peserta kembali ke roda)"><i class="bi bi-x-lg"></i></button>` : ''}</div>`; }).join('')
          : '<div class="empty" style="padding:24px"><i class="bi bi-trophy"></i>Belum ada pemenang. Putar roda untuk mulai.</div>'}</div></div>
      <div class="card"><div class="card-head card-pad" style="margin:0;padding-bottom:10px"><h3><i class="bi bi-gift t-primary"></i> Hadiah</h3>${canW() ? '<button class="btn btn-soft btn-sm" onclick="openUndHadiah()"><i class="bi bi-plus-lg"></i>Hadiah</button>' : ''}</div>
        <div class="und-list">${ps.length ? ps.map((x) => { const used = undUsed(x.id), p = num(x.jumlah) ? (used / num(x.jumlah)) * 100 : 0; return `<div class="und-item${x.id === S.ui.und.hadiah ? ' on' : ''}">
          <div style="flex:1;min-width:0"><div class="row-between"><b class="ellipsis">${esc(x.nama_hadiah)}</b><span class="mono small ${used >= num(x.jumlah) ? 't-in' : ''}">${used}/${num(x.jumlah)}</span></div><div class="gat-prog" style="margin:6px 0 0"><span style="width:${Math.min(100, p)}%"></span></div></div>
          ${canW() ? `<button class="btn-icon sm" onclick="openUndHadiah('${x.id}')" aria-label="Ubah hadiah"><i class="bi bi-pencil"></i></button>` : ''}</div>`; }).join('') : '<div class="empty" style="padding:24px"><i class="bi bi-gift"></i>Belum ada hadiah.</div>'}</div></div>
      <div class="card"><div class="card-head card-pad" style="margin:0;padding-bottom:10px"><h3><i class="bi bi-people t-primary"></i> Peserta</h3>
        <div class="row">${canW() ? '<button class="btn btn-soft btn-sm" onclick="openUndPeserta()"><i class="bi bi-plus-lg"></i>Peserta</button>' : ''}<span class="chip chip-soft">${P.length}</span></div></div>
        <div style="padding:0 16px 10px"><div class="search"><i class="bi bi-search"></i><input class="input" placeholder="Cari peserta…" value="${esc(u.q || '')}" oninput="undSearch(this.value)"></div></div>
        <div class="und-list" style="max-height:320px">${plist.length ? plist.slice(0, 200).map((p) => `<div class="und-item"><span class="avatar" style="width:30px;height:30px;font-size:11px;background:${won.has(p.id) ? 'var(--in-soft)' : 'var(--primary-soft)'};color:${won.has(p.id) ? 'var(--in)' : 'var(--primary)'}">${won.has(p.id) ? '<i class="bi bi-trophy-fill"></i>' : esc(initials(p.nama))}</span>
          <div style="flex:1;min-width:0"><b class="ellipsis">${esc(p.nama)}</b>${p.unit ? `<div class="small muted ellipsis">${esc(p.unit)}</div>` : ''}</div>${won.has(p.id) ? '<span class="chip chip-in">Menang</span>' : ''}
          ${canW() ? `<button class="btn-icon sm" onclick="openUndPeserta('${p.id}')" aria-label="Ubah peserta"><i class="bi bi-pencil"></i></button>` : ''}</div>`).join('') + (plist.length > 200 ? `<p class="small muted" style="padding:10px 16px">Menampilkan 200 dari ${plist.length} peserta.</p>` : '')
          : `<div class="empty" style="padding:24px"><i class="bi bi-people"></i>${P.length ? 'Tidak ditemukan.' : 'Belum ada peserta.'}${canW() && !P.length ? '<button class="btn btn-primary btn-sm mt-16" onclick="openImport(\'undian\')">Impor dari Excel</button>' : ''}</div>`}</div>
        ${canW() && (P.length || ps.length) ? '<div class="tbl-foot"><button class="link t-out" onclick="undReset(\'semua\')"><i class="bi bi-trash"></i> Kosongkan semua data undian</button></div>' : ''}</div>
    </div>
  </div>`;
  document.body.classList.toggle('und-present', !!u.present);
  drawWheel();
}
const undSearch = debounce((v) => { S.ui.und.q = v; renderUndian(); const i = $('#sec-undian .und-grid .search input'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 250);
function undSetN(v) { S.ui.und.n = Math.max(1, Math.round(num(v)) || 1); renderUndian(); }
function undSetTitle(v) { S.ui.und.title = String(v || '').trim() || 'Undian Doorprize'; lsSet('kb_und_title', S.ui.und.title); }
function undPresent() {
  const on = !S.ui.und.present; S.ui.und.present = on;
  document.body.classList.toggle('und-present', on);
  try {
    if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { });
    if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => { });
  } catch (e) { }
  renderUndian();
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && S.ui.und.present && $('#modal-root').hidden && !UND.spinning) { e.preventDefault(); undPresent(); }
});
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && S.ui.und.present) { S.ui.und.present = false; document.body.classList.remove('und-present'); if (S.current === 'undian') renderUndian(); } });
window.addEventListener('resize', debounce(() => { if (S.current === 'undian' && !UND.spinning) drawWheel(); }, 150));

/** Gambar roda: segmen berwarna, nama peserta (bila muat), cincin lampu. */
function drawWheel() {
  const cv = document.getElementById('und-wheel'); if (!cv) return;
  const items = undPool(), dpr = Math.min(2, window.devicePixelRatio || 1), size = Math.max(200, cv.clientWidth || 420);
  const px = Math.round(size * dpr);
  if (cv.width !== px) { cv.width = px; cv.height = px; }
  const ctx = cv.getContext('2d'), R = px / 2, n = items.length;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, px, px); ctx.translate(R, R);
  const rIn = R * 0.92;
  if (!n) {
    ctx.beginPath(); ctx.arc(0, 0, rIn, 0, Math.PI * 2); ctx.fillStyle = cssVar('--surface-2') || '#F1F5F9'; ctx.fill();
    ctx.fillStyle = cssVar('--muted') || '#64748B'; ctx.font = '600 ' + Math.round(R * 0.07) + 'px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Belum ada peserta', 0, R * 0.42);
  } else {
    const seg = (Math.PI * 2) / n, L = UND_COLORS.length;
    ctx.save(); ctx.rotate(UND.rot);
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rIn, i * seg, (i + 1) * seg); ctx.closePath();
      let c = i % L; if (i === n - 1 && n > 1 && c === 0) c = 1;
      ctx.fillStyle = n === 1 ? UND_COLORS[0] : UND_COLORS[c]; ctx.fill();
      if (n <= 160) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = Math.max(1, R * 0.004); ctx.stroke(); }
    }
    if (n <= 90) {
      const fs = Math.max(8 * dpr, Math.min(R * 0.068, seg * R * 0.5));
      ctx.font = '600 ' + fs + 'px Inter, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 3 * dpr;
      for (let i = 0; i < n; i++) {
        let t = String(items[i].nama || ''); const maxW = rIn * 0.66;
        while (t.length > 3 && ctx.measureText(t).width > maxW) t = t.slice(0, -2);
        if (t !== String(items[i].nama || '')) t = t.replace(/\s+$/, '') + '…';
        ctx.save(); ctx.rotate(i * seg + seg / 2); ctx.fillText(t, rIn * 0.9, 0); ctx.restore();
      }
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
  // Cincin luar + lampu
  ctx.beginPath(); ctx.arc(0, 0, R * 0.955, 0, Math.PI * 2); ctx.lineWidth = R * 0.07; ctx.strokeStyle = '#141B2B'; ctx.stroke();
  const bulbs = 28, phase = UND.spinning ? Math.floor(performance.now() / 120) % 2 : 0;
  for (let k = 0; k < bulbs; k++) {
    const a = (k / bulbs) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.955, Math.sin(a) * R * 0.955, R * 0.014, 0, Math.PI * 2);
    ctx.fillStyle = (k + phase) % 2 ? '#FCD34D' : '#FFFFFF'; ctx.fill();
  }
}
/** Indeks segmen di bawah penunjuk (atas). */
function undIdxAtPointer(n) {
  if (!n) return -1;
  const seg = (Math.PI * 2) / n, a = ((-Math.PI / 2 - UND.rot) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2);
  return Math.floor(a / seg) % n;
}
function undTick() { UNDS.tick(); }
function undSpin() {
  if (UND.spinning || !canW('undian')) return;
  const h = undCurPrize(), pool = undPool();
  if (!h) { toast('Tidak ada hadiah yang tersisa untuk diundi.', 'warning'); return; }
  if (!pool.length) { toast('Belum ada peserta di roda.', 'warning'); return; }
  const k = Math.max(1, Math.min(S.ui.und.n, undLeft(h), pool.length));
  const idx = undPick(pool.length, k), winners = idx.map((i) => pool[i]);
  const N = pool.length, seg = (Math.PI * 2) / N, TAU = Math.PI * 2;
  const want = -Math.PI / 2 - (idx[0] + 0.5) * seg + (undRand() - 0.5) * seg * 0.6;
  const base = UND.rot;
  let delta = (((want - base) % TAU) + TAU) % TAU; delta += TAU * (6 + Math.floor(undRand() * 3));
  const dur = 5600 + undRand() * 1400, t0 = performance.now();
  UND.spinning = true; UND.lastIdx = -1;
  UNDS.start(dur);
  $$('#sec-undian .und-go, #sec-undian .wheel-hub').forEach((b) => { b.disabled = true; });
  const tk = $('#und-ticker'); if (tk) tk.classList.add('live');
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 4);
    UND.rot = base + delta * e;
    drawWheel();
    const ii = undIdxAtPointer(N);
    if (ii !== UND.lastIdx) { UND.lastIdx = ii; if (tk && pool[ii]) tk.textContent = pool[ii].nama; if (t < 0.97) undTick(); }
    if (t < 1) { UND.raf = requestAnimationFrame(step); return; }
    UND.spinning = false; UND.rot = ((UND.rot % TAU) + TAU) % TAU;
    if (tk) { tk.classList.remove('live'); tk.textContent = winners[0].nama; }
    UNDS.finish();
    undReveal(h, winners);
  };
  UND.raf = requestAnimationFrame(step);
}
function undReveal(h, winners) {
  const put = S.db.UndianPemenang.reduce((a, w) => Math.max(a, num(w.putaran)), 0) + 1;
  const d = srvNow(), stamp = toYmd(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  const recs = winners.map((p) => ({ id: tmpId(), id_peserta: p.id, nama_peserta: p.nama, id_hadiah: h.id, nama_hadiah: h.nama_hadiah, waktu: stamp, putaran: put, dicatat_oleh: S.user.nama, _pending: true }));
  recs.forEach((r) => S.db.UndianPemenang.push(r));
  const leftAfter = undLeft(h);
  const conf = Array.from({ length: 36 }, (_, i) => `<i style="left:${(i * 2.9 + 1) % 100}%;background:${UND_COLORS[i % UND_COLORS.length]};animation-delay:${(i % 12) * 0.12}s;animation-duration:${2.4 + (i % 5) * 0.35}s"></i>`).join('');
  openModal({ title: 'Selamat kepada pemenang!', size: winners.length > 6 ? 'wide' : '', body: `<div class="win-wrap"><div class="confetti" aria-hidden="true">${conf}</div>
      <span class="caps muted">${esc(S.ui.und.title || 'Undian Doorprize')} · Putaran #${put}</span>
      <div class="win-prize"><i class="bi bi-gift-fill"></i>${esc(h.nama_hadiah)}</div>
      <div class="win-names ${winners.length > 1 ? 'multi' : ''}">${winners.map((p, i) => `<div class="win-card" style="animation-delay:${Math.min(i, 20) * 0.08}s">${winners.length > 1 ? `<span class="n">${i + 1}</span>` : ''}<b>${esc(p.nama)}</b>${p.unit ? `<small>${esc(p.unit)}</small>` : ''}</div>`).join('')}</div>
      <p class="small muted">Sisa ${esc(h.nama_hadiah)}: ${leftAfter} · hasil tersimpan otomatis.</p></div>`,
    foot: `<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>${(leftAfter > 0 || undPrizes().some((x) => undLeft(x) > 0)) && undPool().length ? '<button class="btn btn-primary" onclick="closeModal();setTimeout(undSpin,250)"><i class="bi bi-arrow-repeat"></i>Putar Lagi</button>' : ''}` });
  afterLocalChange('UndianPemenang');
  enqueue(() => api('simpanPemenang', S.token, recs.map((r) => ({ id_peserta: resolveIds({ id: r.id_peserta }).id, id_hadiah: resolveIds({ id: r.id_hadiah }).id, putaran: put }))).then((res) => {
    const ids = recs.map((r) => r.id);
    S.db.UndianPemenang = S.db.UndianPemenang.filter((w) => ids.indexOf(w.id) < 0).concat(res.data.records);
    S.meta.version = res.data.version; afterLocalChange('UndianPemenang');
  }).catch((e) => {
    const ids = recs.map((r) => r.id);
    S.db.UndianPemenang = S.db.UndianPemenang.filter((w) => ids.indexOf(w.id) < 0); afterLocalChange('UndianPemenang');
    toast(e.message, 'error', 'Pemenang gagal disimpan');
  }));
}
function undReset(scope) {
  const all = scope === 'semua';
  confirmDlg(all ? 'Kosongkan SEMUA peserta, hadiah, dan pemenang undian? Tindakan ini tidak dapat dibatalkan.' : 'Hapus semua pemenang dan ulang undian dari awal? Peserta & hadiah tetap ada.',
    { ok: all ? 'Kosongkan' : 'Ulang Undian', danger: true, title: all ? 'Kosongkan Data Undian' : 'Ulang Undian' }).then((yes) => {
    if (!yes) return;
    const back = { p: S.db.UndianPeserta, h: S.db.UndianHadiah, w: S.db.UndianPemenang };
    S.db.UndianPemenang = []; if (all) { S.db.UndianPeserta = []; S.db.UndianHadiah = []; }
    afterLocalChange('UndianPemenang');
    enqueue(() => api('resetUndian', S.token, all ? 'semua' : 'pemenang').then((res) => { S.meta.version = res.data.version; toast(res.message, 'success'); })
      .catch((e) => { S.db.UndianPeserta = back.p; S.db.UndianHadiah = back.h; S.db.UndianPemenang = back.w; afterLocalChange('UndianPemenang'); toast(e.message, 'error'); }));
  });
}
function openUndPeserta(id) {
  if (!canW('undian')) return;
  openEntityForm('UndianPeserta', id ? 'Ubah Peserta Undian' : 'Tambah Peserta Undian', [
    { k: 'nama', label: 'Nama peserta', req: true, full: true, list: can('anggota') ? S.db.Anggota.map((a) => a.nama) : [] },
    { k: 'unit', label: 'Unit / keterangan', full: true, ph: 'mis. Produksi 1 / No. kupon 017' }
  ], id ? clone(findLocal('UndianPeserta', id)) : {}, {});
}
function openUndHadiah(id) {
  if (!canW('undian')) return;
  const rec = id ? clone(findLocal('UndianHadiah', id)) : { jumlah: 1, urutan: S.db.UndianHadiah.reduce((a, x) => Math.max(a, num(x.urutan)), 0) + 1 };
  openEntityForm('UndianHadiah', id ? 'Ubah Hadiah' : 'Tambah Hadiah', [
    { k: 'nama_hadiah', label: 'Nama hadiah', req: true, full: true, ph: 'mis. Kulkas 2 Pintu' },
    { k: 'jumlah', label: 'Jumlah', type: 'number', req: true, min: 1 },
    { k: 'urutan', label: 'Urutan diundi', type: 'number', min: 1, hint: 'Angka kecil diundi lebih dulu.' },
    { k: 'catatan', label: 'Keterangan', full: true, ph: 'mis. Sponsor koperasi' }
  ], rec, { validate: (d) => (num(d.jumlah) < Math.max(1, id ? undUsed(id) : 1) ? 'Jumlah tidak boleh lebih kecil dari pemenang yang sudah diundi (' + undUsed(id) + ').' : null) });
}
RPT_SPEC.undian = function () {
  const W0 = undWinners().slice().sort((a, b) => num(a.putaran) - num(b.putaran)), ps = undPrizes(), app = S.settings.nama_aplikasi || 'KASBURUH', title = S.ui.und.title || 'Undian Doorprize';
  const pmap = Object.fromEntries(S.db.UndianPeserta.map((p) => [p.id, p]));
  return { title: 'Pemenang ' + title, subtitle: W0.length + ' pemenang dari ' + S.db.UndianPeserta.length + ' peserta', period: fmtDate(todayStr(), 'long'), periodLabel: 'TANGGAL', file: app + '_Pemenang_' + title.replace(/\W+/g, '_') + '_' + todayStr(),
    kpis: [{ label: 'Peserta', value: fmtNum(S.db.UndianPeserta.length), tone: 'pri' }, { label: 'Jenis Hadiah', value: fmtNum(ps.length), tone: 'warn', sub: ps.reduce((a, x) => a + num(x.jumlah), 0) + ' buah' },
      { label: 'Pemenang', value: fmtNum(W0.length), tone: 'in', sub: (W0.length ? Math.max(...W0.map((w) => num(w.putaran))) : 0) + ' putaran' }],
    blocks: [{ t: 'section', title: 'Daftar Pemenang' }, { t: 'table', head: ['No', 'Nama Pemenang', 'Unit / Keterangan', 'Hadiah', 'Putaran', 'Waktu'],
      rows: W0.map((w, i) => [i + 1, w.nama_peserta, (pmap[w.id_peserta] || {}).unit || '-', w.nama_hadiah, '#' + num(w.putaran), String(w.waktu || '').replace('T', ' ').slice(0, 16)]),
      align: { 0: 'center', 4: 'center' }, widths: { 0: 26 }, bold: { 1: true }, tone: { 3: () => 'pri' }, empty: 'Belum ada pemenang.' },
      { t: 'section', title: 'Rekap Hadiah' }, { t: 'table', head: ['Hadiah', 'Jumlah', 'Terundi', 'Sisa'], rows: ps.map((x) => [x.nama_hadiah, num(x.jumlah), undUsed(x.id), Math.max(0, num(x.jumlah) - undUsed(x.id))]),
        align: { 1: 'center', 2: 'center', 3: 'center' }, bold: { 0: true }, tone: { 2: () => 'in' } }, { t: 'sign', labels: ['Ketua Panitia', 'Saksi'] }] };
};

/** Pengaturan → Data & Cadangan: rapikan format semua sheet database (Super Admin & Ketua). */
function doRapikan() {
  const b = $('#btn-rapikan'); if (b) { b.disabled = true; b.innerHTML = '<span class="spin"></span> Merapikan…'; }
  api('rapikanSpreadsheet', S.token).then((res) => toast(res.message + ' Buka spreadsheet untuk melihat hasilnya.', 'success', 'Spreadsheet rapi'))
    .catch((e) => toast(e.message, 'error', 'Gagal merapikan'))
    .finally(() => { if (b) { b.disabled = false; b.innerHTML = '<i class="bi bi-magic"></i>Rapikan Format Spreadsheet'; } });
}

// ════════════════ QR CODE (pembuat mandiri, tanpa CDN · mode byte UTF-8, koreksi galat L / M) ════════════════
const QR = (() => {
  const ECC_T = {
    L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28] };
  const BLK_T = {
    L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49] };
  const FMT_T = { L: 1, M: 0 };
  let ECC = [ECC_T.M], BLK = [BLK_T.M], FMT_M = 0;
  const rawModules = (v) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
  const dataCw = (v) => Math.floor(rawModules(v) / 8) - ECC[0][v] * BLK[0][v];
  const gmul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 255; };
  function rsDivisor(deg) {
    const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1;
    for (let i = 0; i < deg; i++) { for (let j = 0; j < deg; j++) { r[j] = gmul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; } root = gmul(root, 2); }
    return r;
  }
  function rsRemainder(data, div) {
    const r = new Array(div.length).fill(0);
    data.forEach((b) => { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gmul(c, f); }); });
    return r;
  }
  function utf8(s) { const out = []; const e = unescape(encodeURIComponent(String(s))); for (let i = 0; i < e.length; i++) out.push(e.charCodeAt(i)); return out; }
  function encode(text, ecl) {
    ecl = ecl === 'L' ? 'L' : 'M'; ECC = [ECC_T[ecl]]; BLK = [BLK_T[ecl]]; FMT_M = FMT_T[ecl];
    const bytes = utf8(text);
    let v = 1;
    for (; v <= 40; v++) { const cc = v < 10 ? 8 : 16; if (4 + cc + bytes.length * 8 <= dataCw(v) * 8) break; }
    if (v > 40) throw new Error('Teks terlalu panjang untuk QR.');
    const bits = [], put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach((b) => put(b, 8));
    const cap = dataCw(v) * 8;
    put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
    const data = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
    for (let pad = 0xEC; data.length < dataCw(v); pad ^= 0xEC ^ 0x11) data.push(pad);
    // Blok + ECC + interleave
    const nb = BLK[0][v], eccLen = ECC[0][v], raw = Math.floor(rawModules(v) / 8), nShort = nb - (raw % nb), shortLen = Math.floor(raw / nb), div = rsDivisor(eccLen);
    const blocks = []; let k = 0;
    for (let i = 0; i < nb; i++) {
      const d = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1)); k += d.length;
      const e = rsRemainder(d, div); if (i < nShort) d.push(0); blocks.push(d.concat(e));
    }
    const cw = [];
    for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= nShort) cw.push(b[i]); });
    // Matriks
    const size = v * 4 + 17, M = [], F = [];
    for (let y = 0; y < size; y++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
    const set = (x, y, d) => { M[y][x] = !!d; F[y][x] = true; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, dist = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, dist !== 2 && dist !== 4);
      }
    });
    const al = [];
    if (v > 1) {
      const n = Math.floor(v / 7) + 2, step = Math.floor((v * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
      al.push(6); for (let pos = size - 7; al.length < n; pos -= step) al.splice(1, 0, pos);
    }
    al.forEach((ax, i) => al.forEach((ay, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
    const drawFormat = (mask) => {
      const d = (FMT_M << 3) | mask; let rem = d;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const b = ((d << 10) | rem) ^ 0x5412, bit = (i) => ((b >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
      set(8, size - 8, true);
    };
    drawFormat(0);
    if (v >= 7) {
      let rem = v; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      const b = (v << 12) | rem;
      for (let i = 0; i < 18; i++) { const bt = ((b >>> i) & 1) === 1, a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, bt); set(c, a, bt); }
    }
    // Isi data (zig-zag)
    let bi = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!F[y][x] && bi < cw.length * 8) { M[y][x] = ((cw[bi >>> 3] >>> (7 - (bi & 7))) & 1) === 1; bi++; }
      }
    }
    const maskFn = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
      (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];
    const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && maskFn[m](x, y)) M[y][x] = !M[y][x]; };
    const penalty = () => {
      let p = 0, dark = 0;
      const line = (get) => {
        for (let a = 0; a < size; a++) {
          let run = 1, s = '';
          for (let b = 0; b < size; b++) {
            const c = get(a, b); s += c ? '1' : '0';
            if (b > 0) { if (c === get(a, b - 1)) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
          }
          let i = -1; while ((i = s.indexOf('1011101', i + 1)) >= 0) { if (s.slice(Math.max(0, i - 4), i) === '0000' || s.slice(i + 7, i + 11) === '0000') p += 40; }
        }
      };
      line((a, b) => M[a][b]); line((a, b) => M[b][a]);
      for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (M[y][x]) dark++;
      p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
      return p;
    };
    let best = 0, bestP = Infinity;
    for (let m = 0; m < 8; m++) { applyMask(m); drawFormat(m); const pv = penalty(); if (pv < bestP) { bestP = pv; best = m; } applyMask(m); }
    applyMask(best); drawFormat(best);
    return { size, mods: M, version: v };
  }
  const cache = {};
  function get(text, ecl) { const k = (ecl || 'M') + '|' + text; if (!cache[k]) cache[k] = encode(text, ecl); return cache[k]; }
  /**
   * SVG tajam untuk tampilan & cetak. o: { ecl: 'L'|'M', quiet: modul tepi (bawaan 4), fit: true = ukuran
   * dibulatkan ke kelipatan piksel per modul (garis QR rata → jauh lebih mudah dipindai dari layar) }.
   */
  function svg(text, px, o) {
    o = o || {};
    const q = get(text, o.ecl), qz = o.quiet === undefined ? 4 : o.quiet, n = q.size + qz * 2; let d = '';
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.mods[y][x]) d += 'M' + (x + qz) + ' ' + (y + qz) + 'h1v1h-1z';
    let w = px || 120;
    if (o.fit) w = Math.max(o.min || 1, Math.round(w / n)) * n;
    return `<svg viewBox="0 0 ${n} ${n}" width="${w}" height="${w}" shape-rendering="crispEdges" role="img" aria-label="QR code"${o.attr || ''}><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }
  /** Lebar SVG (px) yang dihasilkan svg(text, px, {fit:true}). */
  function fitPx(text, px, o) { o = o || {}; const n = get(text, o.ecl).size + (o.quiet === undefined ? 4 : o.quiet) * 2; return Math.max(o.min || 1, Math.round(px / n)) * n; }
  /** PNG (data URL) untuk dokumen Word. */
  function png(text, scale, o) {
    o = o || {};
    const q = get(text, o.ecl), qz = o.quiet === undefined ? 4 : o.quiet, s = scale || 8, n = q.size + qz * 2, c = document.createElement('canvas');
    c.width = c.height = n * s;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.mods[y][x]) g.fillRect((x + qz) * s, (y + qz) * s, s, s);
    return c.toDataURL('image/png');
  }
  return { encode: get, svg, png, fitPx };
})();

// ════════════════ PEMINJAMAN BARANG INVENTARIS (surat + tanda tangan) ════════════════
/** Pengurus penyetuju peminjaman (sama dengan LOAN_APPROVERS di server). */
const PJM_APPROVERS = ['Super Admin', 'Ketua', 'Bendahara', 'Sekretaris'];
const SURAT_DEF = {
  kop_nama: '', kop_sub: 'Sekretariat Serikat Pekerja', kop_alamat: 'Alamat sekretariat · Telp. 0812-0000-0000 · Email sekretariat@serikat.or.id',
  judul: 'SURAT PERMOHONAN PEMINJAMAN BARANG INVENTARIS', nomor_format: '{no}/SP-INV/{bulan_romawi}/{tahun}',
  pembuka: 'Yang bertanda tangan di bawah ini:',
  isi: 'Dengan ini mengajukan permohonan peminjaman barang inventaris milik {organisasi} untuk keperluan {keperluan}, dengan rincian barang sebagai berikut:',
  penutup: 'Saya bertanggung jawab penuh atas barang yang dipinjam, akan menjaga dan mengembalikannya dalam kondisi baik paling lambat tanggal {tgl_kembali}. Apabila terjadi kerusakan atau kehilangan, saya bersedia mengganti sesuai ketentuan organisasi.\n\nDemikian surat permohonan ini saya buat dengan sebenarnya. Atas perhatian dan persetujuannya saya ucapkan terima kasih.',
  kota: 'Jakarta', label_setuju: 'Menyetujui,', jabatan_setuju: 'Ketua', nama_ketua: '', label_pemohon: 'Pemohon',
  catatan_kaki: 'Surat ini dibuat secara elektronik melalui aplikasi {aplikasi}.', font: 'Times New Roman', sufiks_jabatan: 'SP'
};
const SURAT_FIELDS = [
  ['kop_nama', 'Kop surat · nama organisasi', 't', 'Kosong = memakai sub judul aplikasi'], ['kop_sub', 'Kop surat · baris kedua', 't'], ['kop_alamat', 'Kop surat · alamat / kontak', 't'],
  ['judul', 'Judul surat', 't'], ['nomor_format', 'Format nomor surat', 't', 'Variabel: {no} {bulan_romawi} {bulan} {tahun}'],
  ['pembuka', 'Kalimat pembuka', 'a'], ['isi', 'Isi permohonan (sebelum daftar barang)', 'a'], ['penutup', 'Penutup (baris kosong = paragraf baru)', 'a'],
  ['kota', 'Kota penandatanganan', 't'], ['label_setuju', 'Label persetujuan', 't'], ['jabatan_setuju', 'Jabatan penyetuju (sebelum disetujui)', 't', 'Setelah disetujui otomatis mengikuti peran pengurus yang menyetujui (Ketua / Bendahara / Sekretaris)'],
  ['nama_ketua', 'Nama Ketua (bila belum disetujui)', 't', 'Setelah disetujui, otomatis memakai nama akun yang menyetujui'], ['label_pemohon', 'Label pemohon', 't'],
  ['catatan_kaki', 'Catatan kaki', 't'], ['sufiks_jabatan', 'Sufiks jabatan di QR persetujuan', 't', 'Contoh: SP → "disetujui Ferawati Lubis Ketua SP"'], ['font', 'Jenis huruf', 'f']
];
const PJM_ST = { Menunggu: ['chip-warn', 'bi-hourglass-split', 'Menunggu Persetujuan'], Disetujui: ['chip-in', 'bi-patch-check-fill', 'Disetujui · Dipinjam'],
  Ditolak: ['chip-out', 'bi-x-octagon-fill', 'Ditolak'], Dikembalikan: ['chip-trf', 'bi-box-arrow-in-down', 'Dikembalikan'] };
const isApprover = () => !!S.user && PJM_APPROVERS.indexOf(S.user.peran) >= 0;
function pjmTpl() {
  let t = {}; try { t = JSON.parse(S.settings.surat_pinjam || '{}') || {}; } catch (e) { t = {}; }
  const o = Object.assign({}, SURAT_DEF, t);
  if (o.label_pemohon === 'Hormat saya, Pemohon') o.label_pemohon = 'Pemohon';   // format v1.8.0
  if (o.sufiks_jabatan === undefined) o.sufiks_jabatan = SURAT_DEF.sufiks_jabatan;
  return o;
}
const pjmOrg = () => S.settings.subjudul || S.settings.nama_aplikasi || 'Serikat Pekerja';
const pjmCanEditTpl = () => isSuper() || String(S.settings.surat_editor || '').split(',').indexOf(String(S.user && S.user.id)) >= 0;
const pjmItems = (l) => { try { return JSON.parse(l.barang || '[]') || []; } catch (e) { return []; } };
/** Stok tersedia = jumlah barang − yang sedang dipinjam (disetujui, belum kembali). */
function pjmAvail(itemId, exceptId) {
  const b = S.db.Inventaris.find((x) => x.id === itemId); if (!b) return 0;
  const used = S.db.Peminjaman.filter((l) => l.status === 'Disetujui' && l.id !== exceptId).reduce((a, l) => a + pjmItems(l).filter((x) => x.id === itemId).reduce((s, x) => s + num(x.jumlah), 0), 0);
  return Math.max(0, num(b.jumlah) - used);
}
function pjmFill(text, l, t) {
  const items = pjmItems(l);
  const map = { nomor: l.nomor || '…/…/…', tanggal: fmtDate(String(l.dibuat_pada || todayStr()).slice(0, 10), 'long'), nama: l.nama_pemohon, npp: l.npp_pemohon || '-', jabatan: l.jabatan_pemohon || l.peran_pemohon,
    kontak: l.kontak || '-', keperluan: l.keperluan || '-', lokasi: l.lokasi || '-', tgl_pinjam: fmtDate(l.tgl_pinjam, 'long'), tgl_kembali: fmtDate(l.tgl_kembali, 'long'),
    organisasi: pjmOrg(), aplikasi: S.settings.nama_aplikasi || 'KASBURUH', kota: t.kota || '', jumlah_barang: String(items.reduce((a, x) => a + num(x.jumlah), 0)) };
  return String(text || '').replace(/\{(\w+)\}/g, (m, k) => (map[k] !== undefined ? map[k] : m));
}

/** Gaya dokumen (dipakai pop-up, pratinjau, dan cetak). */
const PJM_CSS = `.doc-page{background:#fff;color:#111;width:794px;min-height:1123px;margin:0 auto;padding:60px 72px 56px 80px;box-shadow:0 2px 12px rgba(0,0,0,.18);position:relative;font-size:15px;line-height:1.5;box-sizing:border-box}
.doc-page p{margin:0 0 10px;text-align:justify}.dk{display:flex;align-items:center;gap:18px}.dk-logo{width:78px;height:78px;flex:none;display:grid;place-items:center}.dk-logo img{max-width:78px;max-height:78px;object-fit:contain}
.doc-page.ftr-qr{padding-bottom:178px}.dk-t{flex:1;text-align:center}.dk-t b{display:block;font-size:20px;letter-spacing:.5px}.dk-t span{display:block;font-size:15px}.dk-t small{display:block;font-size:12px;color:#333}
.dk-line{border-bottom:4px double #111;margin:10px 0 22px}.dj{font-size:16px;text-align:center;text-decoration:underline;margin:0;font-weight:700;letter-spacing:.3px}.dn{text-align:center;margin:2px 0 22px}
.dt-id{border-collapse:collapse;margin:0 0 12px 24px}.dt-id td{padding:2px 6px;vertical-align:top}.dt-id td:first-child{width:170px;padding-left:0}.dt-id td:nth-child(2){width:10px}
.dt-items{width:100%;border-collapse:collapse;margin:4px 0 14px}.dt-items th,.dt-items td{border:1px solid #111;padding:5px 8px;font-size:14px}.dt-items th{background:#E7ECF6;font-weight:700}
.dt-items td.c{text-align:center}.dsig{display:flex;justify-content:space-between;gap:40px;margin-top:26px}.ds{width:46%;text-align:center;position:relative}.ds span{display:block}
.ds-img{height:var(--dsh,92px);display:grid;place-items:center;position:relative}.ds-img img{max-height:88px;max-width:220px}.ds-wait{color:#888;font-style:italic;font-size:12.5px}
.ds b{display:inline-block;text-decoration:underline;margin-top:2px}.ds small{display:block;font-size:13px}
.dstamp{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-12deg);border:3px double;border-radius:10px;padding:4px 14px;font:800 20px/1.1 Arial,sans-serif;letter-spacing:2px;opacity:.85;text-align:center;pointer-events:none}
.dstamp small{display:block;font-size:10.5px;letter-spacing:1px;font-weight:700}.dstamp.ok{color:#12A150;border-color:#12A150}.dstamp.no{color:#E5484D;border-color:#E5484D}.dstamp.back{color:#2F6FED;border-color:#2F6FED;top:auto;bottom:-18px;transform:rotate(-6deg);left:auto;right:0;font-size:12px}
.dnote{margin-top:16px;font-size:13px;border-left:3px solid #999;padding-left:10px}.ds-img svg{display:block}.ds-qr,.dfv-qr{cursor:zoom-in;line-height:0}
.dfooter{position:absolute;left:80px;right:72px;bottom:24px;border-top:1px solid #ccc;padding-top:8px}.dfv{display:flex;align-items:center;gap:14px;margin-bottom:6px}.dfv svg{display:block;flex:none}
.dfv b{display:block;font-size:12.5px}.dfv span{display:block;font-size:11.5px;color:#444;line-height:1.35}.dfv small{display:block;font-size:11px;color:#12A150;margin-top:3px;font-family:Arial,sans-serif}
.dfoot-t{font-size:11px;color:#777;text-align:center;font-style:italic}
.ds-ok{display:table;margin:0 auto 4px;padding:1px 8px;border:1.5px solid #12A150;color:#12A150;border-radius:6px;font:700 10.5px/1.6 Arial,sans-serif;letter-spacing:1px}
.dverif{display:flex;align-items:center;gap:14px;margin-top:18px;padding:10px 12px;border:1px solid #d6dbe4;border-radius:8px;max-width:470px;page-break-inside:avoid}.dverif svg{display:block;flex:none}
.dverif b{display:block;font-size:13px}.dverif span{display:block;font-size:12px;color:#444;line-height:1.35}.dverif small{display:block;font-size:11.5px;color:#12A150;margin-top:4px;font-family:Arial,sans-serif}.dfoot{position:absolute;left:80px;right:72px;bottom:28px;border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#777;text-align:center;font-style:italic}`;

function pjmDocHtml(l, t) {
  const items = pjmItems(l), logo = S.settings.logo_data || S.settings.link_logo, f = (x) => esc(pjmFill(x, l, t)).replace(/\n/g, '<br>');
  const paras = (x) => String(pjmFill(x, l, t)).split(/\n\s*\n/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const ok = l.status === 'Disetujui' || l.status === 'Dikembalikan', no = l.status === 'Ditolak';
  const ketua = ok || no ? l.disetujui_oleh : (t.nama_ketua || '');
  const jabSetuju = (ok || no) && l.peran_setuju ? l.peran_setuju : pjmFill(t.jabatan_setuju, l, t);
  const qrSig = ok && l.kode_ttd, qrOk = ok && l.waktu_setuju, w = pjmWaktu(l);
  const sigTxt = qrSig ? pjmSigUrl(l.kode_ttd, l.disetujui_oleh, l.peran_setuju) : '', sigPx = qrSig ? QR.fitPx(sigTxt, 88, PJM_QR) : 0;
  return `<div class="doc-page${qrOk ? ' ftr-qr' : ''}" style="font-family:'${esc(t.font || 'Times New Roman')}',${/Arial|Calibri/.test(t.font) ? 'Arial,sans-serif' : 'Georgia,serif'}">
    <div class="dk">${logo ? `<div class="dk-logo"><img src="${esc(logo)}" alt=""></div>` : ''}<div class="dk-t"><b>${f(t.kop_nama || pjmOrg().toUpperCase())}</b>${t.kop_sub ? `<span>${f(t.kop_sub)}</span>` : ''}${t.kop_alamat ? `<small>${f(t.kop_alamat)}</small>` : ''}</div>${logo ? '<div class="dk-logo"></div>' : ''}</div>
    <div class="dk-line"></div>
    <h1 class="dj">${f(t.judul)}</h1><div class="dn">Nomor: ${esc(l.nomor || '…')}</div>
    ${paras(t.pembuka)}
    <table class="dt-id"><tr><td>Nama</td><td>:</td><td><b>${esc(l.nama_pemohon)}</b></td></tr><tr><td>NPP</td><td>:</td><td>${esc(l.npp_pemohon || '-')}</td></tr>
      <tr><td>Jabatan</td><td>:</td><td>${esc(pjmJab(l))}</td></tr></table>
    ${paras(t.isi)}
    <table class="dt-items"><thead><tr><th style="width:40px">No</th><th style="width:100px">Kode</th><th>Nama Barang</th><th style="width:90px">Jumlah</th><th style="width:100px">Kondisi</th></tr></thead>
      <tbody>${items.map((x, i) => `<tr><td class="c">${i + 1}</td><td class="c">${esc(x.kode || '-')}</td><td>${esc(x.nama)}</td><td class="c">${num(x.jumlah)} ${esc(x.satuan || 'Unit')}</td><td class="c">${esc(x.kondisi || '-')}</td></tr>`).join('')}</tbody></table>
    <table class="dt-id"><tr><td>Tanggal pinjam</td><td>:</td><td>${esc(fmtDate(l.tgl_pinjam, 'long'))}</td></tr><tr><td>Tanggal kembali</td><td>:</td><td>${esc(fmtDate(l.tgl_kembali, 'long'))}</td></tr>
      <tr><td>Tempat / kegiatan</td><td>:</td><td>${esc(l.lokasi || '-')}</td></tr></table>
    ${paras(t.penutup)}
    <div class="dsig"${sigPx > 88 ? ` style="--dsh:${sigPx + 4}px"` : ''}>
      <div class="ds"><span>&nbsp;</span><span>${f(t.label_setuju)}</span>
        <div class="ds-img">${qrSig ? `<span class="ds-qr" role="button" tabindex="0" title="Klik untuk memperbesar QR tanda tangan ${esc(ketua)}" onclick="pjmQrZoom('${l.id}','ttd')">${QR.svg(sigTxt, 88, PJM_QR)}</span>` : ok && l.ttd_ketua ? `<img src="${esc(l.ttd_ketua)}" alt="Tanda tangan ${esc(ketua)}">` : !no ? '<span class="ds-wait">(menunggu persetujuan)</span>' : ''}
          ${ok && !qrSig ? `<div class="dstamp ok">DISETUJUI<small>${esc(dmy(l.tgl_setuju))}</small></div>` : no ? `<div class="dstamp no">DITOLAK<small>${esc(dmy(l.tgl_setuju))}</small></div>` : ''}</div>
        <b>${esc(ketua || '.................................')}</b><small>${esc(jabSetuju)}</small></div>
      <div class="ds"><span>${esc((t.kota ? t.kota + ', ' : '') + fmtDate(String(l.dibuat_pada || todayStr()).slice(0, 10), 'long'))}</span><span>${f(t.label_pemohon)}</span>
        <div class="ds-img">${l.ttd_pemohon ? `<img src="${esc(l.ttd_pemohon)}" alt="Tanda tangan ${esc(l.nama_pemohon)}">` : ''}
          ${l.status === 'Dikembalikan' ? `<div class="dstamp back">DIKEMBALIKAN ${esc(dmy(l.tgl_dikembalikan))}</div>` : ''}</div>
        <b>${esc(l.nama_pemohon)}</b><small>${esc(pjmJab(l))}</small></div></div>
    ${l.catatan_ketua ? `<div class="dnote"><b>Catatan ${esc(jabSetuju || 'Pengurus')}:</b> ${esc(l.catatan_ketua)}</div>` : ''}
    ${qrOk || t.catatan_kaki ? `<div class="dfooter">${qrOk ? `<div class="dfv"><span class="dfv-qr" role="button" tabindex="0" title="Klik untuk memperbesar" onclick="pjmQrZoom('${l.id}','ok')">${QR.svg(pjmQrText(l, t), 88, PJM_QR)}</span>
      <div><b>Verifikasi persetujuan</b><span>Pindai QR ini untuk melihat tanggal, jam, dan pengurus yang menyetujui peminjaman.</span>
      <small>Disetujui ${esc(l.disetujui_oleh)} (${esc(l.peran_setuju || '')}) · ${esc(w.tgl)}${w.jam ? ' · ' + w.jam + ' ' + w.tz : ''}</small></div></div>` : ''}
      ${t.catatan_kaki ? `<div class="dfoot-t">${f(t.catatan_kaki)}</div>` : ''}</div>` : ''}</div>`;
}
/** Sesuaikan lebar kertas A4 dengan layar (HP/tablet). */
/** openModal + mulai dari atas (modal sebelumnya bisa saja sudah tergulir ke bawah). */
function pjmModal(o) { openModal(o); const b = $('#modal-body'); if (b) b.scrollTop = 0; }
function pjmFit(root) {
  (root || document).querySelectorAll('.doc-scaler').forEach((w) => {
    const pg = w.querySelector('.doc-page'); if (!pg) return;
    const sc = Math.min(1, (w.clientWidth - 8) / 794);
    pg.style.zoom = sc < 1 ? sc : '';
  });
}

// ── Halaman Peminjaman (riwayat lengkap) ──
const PJM_TABS = [['semua', 'Semua'], ['Menunggu', 'Menunggu'], ['Disetujui', 'Dipinjam'], ['Dikembalikan', 'Dikembalikan'], ['Ditolak', 'Ditolak']];
const pjmTz = () => ({ 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' }[(S.meta && S.meta.tz) || CLOCK.tz] || 'WIB');
/** "2026-11-04" → "04 November 2026" */
const pjmTglPanjang = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? m[3] + ' ' + BULAN[Number(m[2]) - 1] + ' ' + m[1] : '-'; };
/** Waktu persetujuan → { tgl: '04 November 2026', jam: '10.00', tz: 'WIB' } */
function pjmWaktu(l) {
  const w = String(l.waktu_setuju || ''), m = /T(\d{2}):(\d{2})/.exec(w);
  return { tgl: pjmTglPanjang(w || l.tgl_setuju), jam: m ? m[1] + '.' + m[2] : '', tz: pjmTz() };
}
const pjmJab = (l) => l.jabatan_pemohon || l.peran_pemohon || '-';
/** Isi QR persetujuan: dibaca langsung oleh kamera HP tanpa internet. */
function pjmQrText(l, t) {
  const w = pjmWaktu(l);
  return 'Tanggal ' + w.tgl + (w.jam ? ' Jam ' + w.jam + ' ' + w.tz : '') + ', peminjaman barang disetujui ' + (l.disetujui_oleh || '-') + ' ' + (l.peran_setuju || t.jabatan_setuju || 'Ketua') +
    (t.sufiks_jabatan ? ' ' + t.sufiks_jabatan : '') + '.\nNo. Surat: ' + l.nomor;
}
/**
 * Isi QR tanda tangan: link /exec web app + kode pendek (12 karakter) → membuka halaman tanda tangan pengurus.
 * Link diambil dari isian Super Admin (URL Web App). Bila belum diisi, QR berisi teks identitas tanda tangan.
 */
/** Alamat halaman ini (GitHub Pages), tanpa ?query/#hash dan tanpa index.html. Kosong bila bukan https. */
const pageBaseUrl = () => (location.protocol === 'https:' ? location.origin + location.pathname.replace(/index\.html$/i, '') : '');
/** Alamat aplikasi untuk QR tanda tangan: isian Super Admin bila ada, selain itu alamat halaman yang sedang dibuka. */
const appBaseUrl = () => (S.meta && S.meta.appUrl) || pageBaseUrl();
const pjmSigUrl = (kode, nama, peran) => (appBaseUrl() ? appBaseUrl() + '?t=' + String(kode).slice(0, 12)
  : 'Tanda tangan digital sah' + (nama ? ': ' + nama + (peran ? ' (' + peran + (pjmTpl().sufiks_jabatan ? ' ' + pjmTpl().sufiks_jabatan : '') + ')' : '') : '') + ' · kode ' + String(kode).slice(0, 12));
/** Pengaturan QR: koreksi galat L (modul lebih sedikit & besar), garis tepi 1 modul (kertas putih jadi quiet zone). */
const PJM_QR = { ecl: 'L', quiet: 2, fit: true, min: 2 };   // min 2px/modul: tidak pernah menciut jadi 1px
/** Perbesar QR di layar (mudah dipindai kamera HP dari layar laptop/HP lain). */
function pjmQrZoom(id, kind) {
  const l = S.db.Peminjaman.find((x) => x.id === id); if (!l) return;
  const isSig = kind === 'ttd', txt = isSig ? pjmSigUrl(l.kode_ttd, l.disetujui_oleh, l.peran_setuju) : pjmQrText(l, pjmTpl());
  pjmModal({ title: isSig ? 'QR Tanda Tangan ' + (l.peran_setuju || '') : 'QR Verifikasi Persetujuan', size: 'sm', body: `<div class="qr-zoom">${QR.svg(txt, 264, { ecl: 'L', quiet: 4, fit: true })}</div>
    <p class="center small muted mt-16">${isSig ? (appBaseUrl() ? 'Pindai dengan kamera HP untuk membuka tanda tangan <b>' + esc(l.disetujui_oleh) + '</b>.' : 'Alamat aplikasi belum diatur Super Admin, jadi QR ini baru berisi teks identitas tanda tangan.') : 'Pindai untuk melihat tanggal, jam, dan pengurus yang menyetujui.'}</p>
    <div class="qr-txt mono small">${esc(txt)}</div>`,
    foot: `<button class="btn btn-secondary" onclick="pjmOpenDoc('${id}')"><i class="bi bi-arrow-left"></i>Kembali ke surat</button>` });
}
function openPeminjaman() { if (!$('#modal-root').hidden) closeModal(); go('peminjaman'); }
function pjmSearch(v) { S.ui.pjm.q = v; S.ui.pjm.page = 1; renderPeminjamanBody(); }
const pjmSearchD = debounce(pjmSearch, 160);
function pjmPage(p) { S.ui.pjm.page = p; renderPeminjamanBody(); const c = $('#pjm-card'); if (c && c.getBoundingClientRect().top < 0) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function pjmSetTab(k) { S.ui.pjm.tab = k; S.ui.pjm.page = 1; renderPeminjaman(); }
function pjmSetView(v) { S.ui.pjm.view = v; S.ui.pjm.page = 1; renderPeminjaman(); }
function pjmBase() {
  return S.db.Peminjaman.filter((l) => inDr('peminjaman', l.tgl_pinjam)).sort((a, b) => String(b.dibuat_pada).localeCompare(String(a.dibuat_pada)));
}
function pjmMatch(l, q) {
  if (!q) return true;
  return (l.nomor + ' ' + l.nama_pemohon + ' ' + pjmJab(l) + ' ' + l.keperluan + ' ' + (l.lokasi || '') + ' ' + (l.disetujui_oleh || '') + ' ' + pjmItems(l).map((x) => x.kode + ' ' + x.nama).join(' ')).toLowerCase().indexOf(q) >= 0;
}
function renderPeminjaman() {
  const u = S.ui.pjm || (S.ui.pjm = { tab: 'semua', view: 'surat', q: '', page: 1 });
  if (!u.view) u.view = 'surat'; if (!u.page) u.page = 1; if (u.q === undefined) u.q = '';
  const base = pjmBase(), t0 = todayStr();
  const cnt = { semua: base.length, Menunggu: 0, Disetujui: 0, Dikembalikan: 0, Ditolak: 0 }; base.forEach((l) => { cnt[l.status] = (cnt[l.status] || 0) + 1; });
  const late = base.filter((l) => l.status === 'Disetujui' && l.tgl_kembali < t0).length;
  const unitOut = base.filter((l) => l.status === 'Disetujui').reduce((a, l) => a + pjmItems(l).reduce((s, x) => s + num(x.jumlah), 0), 0);
  const kpi = (k, label, val, foot, ico, cls) => `<button class="card kpi pjm-kpi${u.tab === k ? ' on' : ''}" onclick="pjmSetTab('${k}')"><div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-ico ${ico}"><i class="bi ${cls}"></i></span></div>
    <div class="kpi-value">${val}</div><div class="kpi-foot">${foot}</div></button>`;
  const appr = isApprover();
  $('#sec-peminjaman').innerHTML = `
  ${pageHead('Organisasi', 'Peminjaman Barang', 'Ajukan peminjaman barang inventaris serikat, surat permohonan dibuat otomatis, disetujui pengurus dengan tanda tangan digital (QR), lengkap dengan riwayatnya.',
    `${appr || isSuper() ? `<button class="btn btn-secondary" onclick="openTtdPanel()"><i class="bi bi-qr-code"></i><span class="lbl">${isSuper() ? 'TTD Digital Pengurus' : 'TTD Digital Saya'}</span></button>` : ''}
     ${pjmCanEditTpl() ? '<button class="btn btn-secondary" onclick="pjmEditTpl()"><i class="bi bi-file-earmark-word"></i><span class="lbl">Format Surat</span></button>' : ''}
     ${can('peminjaman', 1) ? '<button class="btn btn-primary" onclick="openPinjamForm()"><i class="bi bi-plus-lg"></i><span class="lbl">Ajukan Peminjaman</span></button>' : ''}`)}
  ${appr && cnt.Menunggu ? `<div class="callout warn" style="margin:0 0 16px"><i class="bi bi-pen t-warn"></i><span><b>${cnt.Menunggu} permohonan</b> menunggu persetujuan pengurus. Buka suratnya lalu klik <b>Setujui</b>.</span></div>` : ''}
  <div class="grid g-4 g-kpi-m">
    ${kpi('Menunggu', 'Menunggu', fmtNum(cnt.Menunggu), 'permohonan menunggu persetujuan', 'ico-warn', 'bi-hourglass-split')}
    ${kpi('Disetujui', 'Sedang dipinjam', fmtNum(cnt.Disetujui), `${fmtNum(unitOut)} unit${late ? ` · <b class="t-out">${late} terlambat</b>` : ' di luar gudang'}`, 'ico-in', 'bi-box-arrow-up-right')}
    ${kpi('Dikembalikan', 'Dikembalikan', fmtNum(cnt.Dikembalikan), 'peminjaman selesai', 'ico-trf', 'bi-box-arrow-in-down')}
    ${kpi('Ditolak', 'Ditolak', fmtNum(cnt.Ditolak), 'tidak disetujui', 'ico-out', 'bi-x-octagon')}
  </div>
  <div class="card mt-24" id="pjm-card"><div class="filterbar pjm-filter">
      <div class="seg">${PJM_TABS.map(([k, l]) => `<button class="${u.tab === k ? 'on' : ''}" onclick="pjmSetTab('${k}')">${l} <span class="count">${cnt[k] || 0}</span></button>`).join('')}</div>
      <div class="row pjm-tools"><div class="search"><i class="bi bi-search"></i><input class="input" placeholder="Cari nama, nomor surat, barang, keperluan…" value="${esc(u.q)}" oninput="pjmSearchD(this.value)"></div>
        ${drpButton('peminjaman', 'Tgl pinjam')}
        <div class="seg light pjm-view"><button class="${u.view === 'surat' ? 'on' : ''}" onclick="pjmSetView('surat')"><i class="bi bi-list-ul"></i>Per pengajuan</button><button class="${u.view === 'barang' ? 'on' : ''}" onclick="pjmSetView('barang')"><i class="bi bi-box-seam"></i>Per barang</button></div></div></div>
    <div id="pjm-body"></div></div>`;
  renderPeminjamanBody();
}
function renderPeminjamanBody() {
  const el = $('#pjm-body'); if (!el) return;
  const u = S.ui.pjm, q = String(u.q || '').trim().toLowerCase(), t0 = todayStr();
  const list = pjmBase().filter((l) => (u.tab === 'semua' || l.status === u.tab) && pjmMatch(l, q));
  if (u.view === 'barang') { el.innerHTML = pjmItemTable(list); return; }
  const size = 10, pages = Math.max(1, Math.ceil(list.length / size)), pg = Math.min(Math.max(1, u.page || 1), pages), start = (pg - 1) * size;
  u.page = pg;
  el.innerHTML = list.length ? `<div class="pjm-hist">${list.slice(start, start + size).map((l) => pjmRow(l, t0)).join('')}</div>
    <div class="tbl-foot"><span>Menampilkan <b>${start + 1}–${Math.min(list.length, start + size)}</b> dari <b>${fmtNum(list.length)}</b> pengajuan</span>${pager(list.length, pg, size, 'pjmPage')}</div>`
    : emptyState('bi-clipboard2-check', S.db.Peminjaman.length ? 'Tidak ada peminjaman sesuai filter' : 'Belum ada peminjaman', S.db.Peminjaman.length ? 'Ubah tab status, kata kunci, atau rentang tanggal.' : 'Ajukan peminjaman barang inventaris; surat permohonan dibuat otomatis.',
      can('peminjaman', 1) && !S.db.Peminjaman.length ? '<button class="btn btn-primary btn-sm" onclick="openPinjamForm()"><i class="bi bi-plus-lg"></i>Ajukan Peminjaman</button>' : '');
}
/** Satu baris riwayat: pemohon, barang, keperluan + linimasa (diajukan → disetujui/ditolak → dikembalikan). */
function pjmRow(l, t0) {
  const st = PJM_ST[l.status] || PJM_ST.Menunggu, items = pjmItems(l), late = l.status === 'Disetujui' && l.tgl_kembali < t0;
  const w = pjmWaktu(l), dibuat = String(l.dibuat_pada || ''), jamAju = /T(\d{2}):(\d{2})/.exec(dibuat);
  const step = (cls, ico, txt) => `<span class="pjm-step ${cls}"><i class="bi ${ico}"></i>${txt}</span>`;
  const tl = [step('s-aju', 'bi-send', 'Diajukan ' + esc(dmy(dibuat)) + (jamAju ? ' ' + jamAju[1] + '.' + jamAju[2] : ''))];
  if (l.status === 'Disetujui' || l.status === 'Dikembalikan') tl.push(step('s-ok', 'bi-patch-check', 'Disetujui ' + esc(l.disetujui_oleh || '-') + (l.peran_setuju ? ' (' + esc(l.peran_setuju) + ')' : '') + ' · ' + esc(dmy(l.waktu_setuju || l.tgl_setuju)) + (w.jam ? ' ' + w.jam : '')));
  if (l.status === 'Ditolak') tl.push(step('s-no', 'bi-x-octagon', 'Ditolak ' + esc(l.disetujui_oleh || '-') + (l.peran_setuju ? ' (' + esc(l.peran_setuju) + ')' : '') + ' · ' + esc(dmy(l.waktu_setuju || l.tgl_setuju))));
  if (l.status === 'Dikembalikan') tl.push(step('s-back', 'bi-box-arrow-in-down', 'Dikembalikan ' + esc(dmy(l.tgl_dikembalikan))));
  if (l.status === 'Menunggu') tl.push(step('s-wait', 'bi-hourglass-split', 'Menunggu persetujuan pengurus'));
  return `<div class="pjm-hrow st-${esc(l.status)}${late ? ' late' : ''}" role="button" tabindex="0" onclick="pjmOpenDoc('${l.id}')" onkeydown="if(event.key==='Enter')pjmOpenDoc('${l.id}')">
    <span class="pjm-ico"><i class="bi bi-file-earmark-word-fill"></i></span>
    <div class="pjm-main">
      <div class="pjm-top"><b>${esc(l.nama_pemohon)}</b><span class="pjm-jab">${esc(pjmJab(l))}</span><span class="mono small muted">${esc(l.nomor)}</span></div>
      <div class="pjm-items">${items.map((x) => `<span class="pjm-it"><b>${esc(x.nama)}</b> ×${num(x.jumlah)}</span>`).join('')}</div>
      <div class="pjm-kep">${esc(l.keperluan)}${l.lokasi ? ' · ' + esc(l.lokasi) : ''}</div>
      <div class="pjm-tl">${tl.join('')}</div></div>
    <div class="pjm-side"><span class="chip ${st[0]}"><i class="bi ${st[1]}"></i>${st[2]}</span>
      <span class="mono small pjm-dates">${dmy(l.tgl_pinjam)} → ${dmy(l.tgl_kembali)}</span>${late ? `<span class="small t-out"><i class="bi bi-alarm"></i> Terlambat ${daysBetween(l.tgl_kembali, t0)} hari</span>` : ''}</div>
  </div>`;
}
/** Riwayat per barang: berapa kali dipinjam, yang sedang keluar, menunggu, dikembalikan, ditolak. */
function pjmItemTable(list) {
  const agg = {};
  list.slice().reverse().forEach((l) => pjmItems(l).forEach((x) => {
    const a = agg[x.id] || (agg[x.id] = { id: x.id, kode: x.kode, nama: x.nama, satuan: x.satuan || 'Unit', kali: 0, unit: 0, out: 0, wait: 0, back: 0, no: 0, last: null });
    a.kali++; a.unit += num(x.jumlah);
    if (l.status === 'Disetujui') a.out += num(x.jumlah); if (l.status === 'Menunggu') a.wait++; if (l.status === 'Dikembalikan') a.back++; if (l.status === 'Ditolak') a.no++;
    a.last = l;
  }));
  const rows = Object.values(agg).sort((a, b) => b.kali - a.kali || String(a.kode).localeCompare(String(b.kode)));
  if (!rows.length) return emptyState('bi-box-seam', 'Belum ada riwayat barang', 'Riwayat muncul setelah ada pengajuan peminjaman.');
  return `<div class="table-wrap"><table class="tbl cards pjm-itbl"><thead><tr><th>Barang</th><th class="num">Stok</th><th class="num">Dipinjam</th><th>Sedang keluar</th><th>Menunggu</th><th>Kembali</th><th>Ditolak</th><th>Terakhir dipinjam</th></tr></thead><tbody>
    ${rows.map((a) => { const inv = S.db.Inventaris.find((b) => b.id === a.id);
      return `<tr onclick="pjmItemHistory('${a.id}')" style="cursor:pointer"><td data-m="full"><div class="row" style="gap:10px"><span class="pjm-ico sm"><i class="bi bi-box-seam"></i></span><div style="min-width:0"><b>${esc(a.nama)}</b><div class="t-sub mono">${esc(a.kode || '-')}</div></div></div></td>
        <td class="num mono" data-m="hide">${inv ? num(inv.jumlah) + ' ' + esc(inv.satuan || '') : '-'}</td>
        <td class="num mono"><b>${a.kali}×</b><div class="t-sub">${a.unit} ${esc(a.satuan)}</div></td>
        <td data-l="Sedang keluar" class="${a.out ? '' : 'z'}">${a.out ? `<span class="chip chip-in">${a.out} ${esc(a.satuan)}</span>` : '<span class="muted">-</span>'}</td>
        <td data-l="Menunggu" class="${a.wait ? '' : 'z'}">${a.wait ? `<span class="chip chip-warn">${a.wait}</span>` : '<span class="muted">-</span>'}</td>
        <td data-l="Kembali" class="${a.back ? '' : 'z'}">${a.back ? `<span class="chip chip-trf">${a.back}</span>` : '<span class="muted">-</span>'}</td>
        <td data-l="Ditolak" class="${a.no ? '' : 'z'}">${a.no ? `<span class="chip chip-out">${a.no}</span>` : '<span class="muted">-</span>'}</td>
        <td data-m="full" class="small">${a.last ? `${esc(a.last.nama_pemohon)} <span class="muted mono">· ${dmy(a.last.tgl_pinjam)}</span>` : '-'}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="tbl-foot"><span>${rows.length} barang pernah diajukan · klik baris untuk melihat riwayatnya</span></div>`;
}
function pjmItemHistory(itemId) {
  const t0 = todayStr(), it = S.db.Inventaris.find((b) => b.id === itemId);
  const L = pjmBase().filter((l) => pjmItems(l).some((x) => x.id === itemId));
  const nm = it ? it.nama_barang : ((pjmItems(L[0] || {}).find((x) => x.id === itemId) || {}).nama || 'Barang');
  pjmModal({ title: 'Riwayat ' + nm, size: 'wide', body: `<div class="pjm-who" style="margin-bottom:14px"><span class="avatar"><i class="bi bi-box-seam"></i></span><div><b>${esc(nm)}</b><small>${esc(it ? (it.kode || '-') + ' · stok ' + num(it.jumlah) + ' ' + (it.satuan || '') + ' · tersedia ' + pjmAvail(itemId) : 'Barang sudah dihapus dari inventaris')}</small></div><span class="chip chip-soft">${L.length}× diajukan</span></div>
    <div class="pjm-hist">${L.map((l) => pjmRow(l, t0)).join('') || emptyState('bi-clock-history', 'Belum ada riwayat')}</div>`,
    foot: '<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>' });
}

// ── Tanda tangan digital pengurus (QR) ──
function openTtdPanel() {
  pjmModal({ title: isSuper() ? 'Tanda Tangan Digital Pengurus' : 'Tanda Tangan Digital Saya', size: 'wide', body: '<div id="ttd-list"><div class="sk" style="height:120px;border-radius:14px"></div></div>',
    foot: '<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>' });
  api('listTtdPengurus', S.token).then((res) => {
    if (res.data.appUrl) S.meta.appUrl = res.data.appUrl;
    const rows = res.data.rows, el = $('#ttd-list'); if (!el) return;
    el.innerHTML = `${isSuper() ? urlWebAppCard() : ''}<div class="callout" style="margin:0 0 14px"><i class="bi bi-qr-code t-primary"></i><span>Tanda tangan dibuat <b>sekali</b> saat pengurus pertama kali menyetujui peminjaman, lalu dipakai otomatis sebagai QR di setiap surat. Saat QR dipindai, tampil tanda tangan & identitas pengurus.${isSuper() ? ' <b>Reset</b> bila pengurus ingin mengganti tanda tangannya.' : ' Untuk mengganti, minta Super Admin mereset.'}</span></div>
      ${isSuper() && rows.some((r) => r.status !== 'Aktif') ? `<div class="ttd-histbar"><span class="small muted"><i class="bi bi-clock-history"></i> ${rows.filter((r) => r.status !== 'Aktif').length} histori tanda tangan (sudah direset)</span>
        <button class="btn btn-ghost btn-sm t-out" onclick="ttdHapus(${esc(JSON.stringify(rows.filter((r) => r.status !== 'Aktif').map((r) => r.id)))})"><i class="bi bi-trash3"></i>Hapus semua histori</button></div>` : ''}
      ${rows.length ? `<div class="ttd-grid">${rows.map((r) => `<div class="ttd-card${r.status === 'Aktif' ? '' : ' old'}">
        <div class="ttd-qr">${QR.svg(pjmSigUrl(r.kode, r.nama, r.peran), 96, PJM_QR)}</div>
        <div class="ttd-info"><div class="row" style="gap:8px;flex-wrap:wrap"><b>${esc(r.nama)}</b><span class="chip ${r.status === 'Aktif' ? 'chip-in' : 'chip-mute'}">${esc(r.status === 'Aktif' ? 'Aktif' : 'Direset')}</span></div>
          <span class="small muted">${esc(r.peran)}${r.jabatan ? ' · ' + esc(r.jabatan) : ''}</span>
          <div class="ttd-img">${r.ttd ? `<img src="${esc(r.ttd)}" alt="Tanda tangan ${esc(r.nama)}">` : ''}</div>
          <span class="small muted">Dibuat ${esc(dmy(r.dibuat_pada))} · dipakai di ${r.dipakai} surat${r.status !== 'Aktif' ? ' · direset ' + esc(dmy(r.direset_pada)) + (r.direset_oleh ? ' oleh ' + esc(r.direset_oleh) : '') : ''}</span>
          ${isSuper() && r.status === 'Aktif' ? `<button class="btn btn-ghost btn-sm t-out" style="align-self:flex-start" onclick="ttdReset('${r.id}', this)"><i class="bi bi-arrow-counterclockwise"></i>Reset tanda tangan</button>` : ''}
          ${isSuper() && r.status !== 'Aktif' ? `<button class="btn btn-ghost btn-sm t-out" style="align-self:flex-start" onclick="ttdHapus(['${r.id}'])"><i class="bi bi-trash3"></i>Hapus histori</button>` : ''}</div></div>`).join('')}</div>`
        : emptyState('bi-pen', 'Belum ada tanda tangan digital', 'Tanda tangan dibuat saat pengurus (Ketua / Bendahara / Sekretaris) pertama kali menyetujui peminjaman.')}`;
  }).catch((e) => { const el = $('#ttd-list'); if (el) el.innerHTML = `<p class="t-out">${esc(e.message)}</p>`; });
}
/** Alamat aplikasi (GitHub Pages) untuk QR tanda tangan — hanya Super Admin. Terdeteksi otomatis, bisa dikunci. */
function urlWebAppCard() {
  const saved = String(S.settings.url_webapp || ''), cur = pageBaseUrl(), on = !!appBaseUrl();
  const beda = saved && cur && saved !== cur;
  return `<div class="url-card ${on ? 'ok' : 'warn'}"><div class="row-between" style="gap:8px;flex-wrap:wrap"><b><i class="bi bi-link-45deg"></i> Alamat aplikasi untuk QR tanda tangan</b>
      <span class="chip ${on ? 'chip-in' : 'chip-warn'}"><i class="bi ${on ? 'bi-check-circle' : 'bi-exclamation-triangle'}"></i>${saved ? 'Dikunci' : on ? 'Otomatis' : 'Belum diatur'}</span></div>
    <p class="small muted mt-8">QR tanda tangan membuka <b>${esc(appBaseUrl() || '(belum ada)')}?t=…</b>. ${saved ? 'Alamat ini dikunci Super Admin.' : 'Alamat diambil otomatis dari halaman ini (GitHub Pages).'}
      Klik <b>Simpan &amp; Uji</b> untuk mengunci alamat resmi agar QR tetap sama walau aplikasi dibuka dari alamat lain.</p>
    ${beda ? `<div class="callout warn" style="margin:8px 0 0"><i class="bi bi-exclamation-triangle t-warn"></i><span>Alamat tersimpan berbeda dengan halaman ini (<b>${esc(cur)}</b>). <button class="link" onclick="$('#url-webapp').value='${esc(cur)}'">Pakai alamat ini</button></span></div>` : ''}
    <div class="url-row"><input id="url-webapp" class="input mono" placeholder="https:&#47;&#47;username.github.io/kasburuh/" value="${esc(saved || cur)}">
      <button class="btn btn-primary btn-sm" onclick="saveUrlWebApp(this)"><i class="bi bi-shield-check"></i>Simpan &amp; Uji</button></div>
    <div id="url-cek" class="small mt-8" hidden></div></div>`;
}
function saveUrlWebApp(btn) {
  const v = $('#url-webapp').value.trim();
  if (!v && !S.settings.url_webapp) { toast('Isi dulu alamat aplikasi, contoh https://username.github.io/kasburuh/', 'warning'); $('#url-webapp').focus(); return; }
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Menguji…';
  api('simpanUrlWebApp', S.token, v).then((res) => {
    S.settings = res.data.settings; S.meta.appUrl = res.data.appUrl; saveSnapshot();
    const c = res.data.cek || {};
    toast(res.message, v && !c.ok ? 'warning' : 'success', v ? (c.ok ? 'Alamat aplikasi aktif' : 'Alamat disimpan, periksa lagi') : '');
    openTtdPanel();
  }).catch((e) => { btn.disabled = false; btn.innerHTML = '<i class="bi bi-shield-check"></i>Simpan &amp; Uji'; const el = $('#url-cek'); if (el) { el.hidden = false; el.className = 'small mt-8 t-out'; el.textContent = e.message; } });
}
/** Hapus histori tanda tangan (status Direset) — khusus Super Admin. */
function ttdHapus(ids) {
  if (!isSuper() || !ids || !ids.length) return;
  confirmDlg((ids.length > 1 ? 'Hapus ' + ids.length + ' histori tanda tangan' : 'Hapus histori tanda tangan ini') + ' secara permanen? QR tanda tangan lama pada surat yang pernah memakainya tidak akan bisa menampilkan tanda tangan lagi.',
    { ok: 'Hapus', danger: true, title: 'Hapus Histori Tanda Tangan' }).then((yes) => {
    if (!yes) { openTtdPanel(); return; }
    api('hapusTtdPengurus', S.token, ids).then((res) => { toast(res.message, 'success'); openTtdPanel(); })
      .catch((e) => { toast(e.message, 'error'); openTtdPanel(); });
  });
}
function ttdReset(id, btn) {
  confirmDlg('Reset tanda tangan digital pengurus ini? Surat yang sudah disetujui tetap sah. Pada persetujuan berikutnya, pengurus diminta membuat tanda tangan baru (QR baru).', { ok: 'Reset', danger: true, title: 'Reset Tanda Tangan' }).then((yes) => {
    if (!yes) { openTtdPanel(); return; }
    api('resetTtdPengurus', S.token, id).then((res) => {
      if (S.user.ttd && res.data.record && res.data.record.kode === S.user.ttd.kode) { S.user.ttd = null; saveSnapshot(); }
      toast(res.message, 'success'); openTtdPanel();
    }).catch((e) => { toast(e.message, 'error'); openTtdPanel(); });
  });
}

// ── Formulir pengajuan + tanda tangan ──
function openPinjamForm(preId) {
  const avail = S.db.Inventaris.filter((b) => pjmAvail(b.id) > 0).sort((a, b) => String(a.kode).localeCompare(b.kode));
  if (!avail.length) { toast('Tidak ada barang inventaris yang tersedia untuk dipinjam.', 'warning'); return; }
  PJM_FORM.rows = [{ id: preId || '', jumlah: 1 }];
  pjmModal({ title: 'Ajukan Peminjaman Barang', size: 'wide', body: `
    <div class="pjm-who"><span class="avatar">${esc(initials(S.user.nama))}</span><div><b>${esc(S.user.nama)}</b><small>${esc(S.user.jabatan || S.user.peran)} · NPP ${esc(S.user.npp || S.user.username)}</small></div><span class="chip chip-soft"><i class="bi bi-person-check"></i>Pemohon</span></div>
    <div class="field-label" style="margin:16px 0 8px">Barang yang dipinjam <b class="req">*</b></div>
    <div id="pjm-items"></div>
    <button type="button" class="btn btn-soft btn-sm mt-8" onclick="pjmAddRow()"><i class="bi bi-plus-lg"></i>Tambah barang</button>
    <div class="form-grid mt-16">
      <label class="field full"><span>Keperluan <b class="req">*</b></span><textarea id="pjm-kep" class="textarea" rows="2" maxlength="500" placeholder="Contohnya: Kegiatan Turnamen Futsal, kegiatan meeting, dll."></textarea></label>
      <label class="field"><span>Tempat / kegiatan</span><input id="pjm-lok" class="input" maxlength="200" placeholder="mis. Bundaran HI, Jakarta"></label>
      <label class="field"><span>No. HP / WhatsApp</span><input id="pjm-hp" class="input" type="tel" placeholder="08xxxxxxxxxx"></label>
      <label class="field"><span>Tanggal pinjam <b class="req">*</b></span><input id="pjm-t1" class="input" type="date" value="${todayStr()}"></label>
      <label class="field"><span>Tanggal kembali <b class="req">*</b></span><input id="pjm-t2" class="input" type="date" value="${addDays(todayStr(), 3)}"></label>
    </div>
    ${sigPadHtml('pjm-sig', 'Tanda tangan pemohon')}`,
    foot: '<button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-pjm"><i class="bi bi-send-check"></i>Kirim &amp; Buka Surat</button>' });
  pjmRenderRows();
  const pad = sigPadInit('pjm-sig');
  $('#btn-pjm').onclick = () => {
    const rows = PJM_FORM.rows.filter((r) => r.id);
    const rec = { keperluan: $('#pjm-kep').value.trim(), lokasi: $('#pjm-lok').value.trim(), kontak: $('#pjm-hp').value.trim(), tgl_pinjam: $('#pjm-t1').value, tgl_kembali: $('#pjm-t2').value,
      barang: rows.map((r) => ({ id: r.id, jumlah: Math.round(num(r.jumlah)) })) };
    const err = !rows.length ? 'Pilih minimal satu barang.' : rows.some((r) => num(r.jumlah) < 1 || num(r.jumlah) > pjmAvail(r.id)) ? 'Jumlah barang melebihi stok yang tersedia.'
      : !rec.keperluan ? 'Keperluan wajib diisi.' : !rec.tgl_pinjam || !rec.tgl_kembali ? 'Tanggal pinjam & kembali wajib diisi.' : rec.tgl_kembali < rec.tgl_pinjam ? 'Tanggal kembali tidak boleh sebelum tanggal pinjam.'
      : pad.empty() ? 'Silakan bubuhkan tanda tangan Anda.' : '';
    if (err) { toast(err, 'warning'); return; }
    rec.ttd = pad.data(); pad.remember();
    const b = $('#btn-pjm'); b.disabled = true; b.innerHTML = '<span class="spin"></span> Mengirim…';
    api('ajukanPeminjaman', S.token, rec).then((res) => {
      upsertLocal('Peminjaman', res.data.record); S.meta.version = res.data.version; afterLocalChange('Peminjaman');
      toast(res.message, 'success');
      pjmOpenDoc(res.data.record.id);
    }).catch((e) => { b.disabled = false; b.innerHTML = '<i class="bi bi-send-check"></i>Kirim &amp; Buka Surat'; toast(e.message, 'error'); });
  };
}
const PJM_FORM = { rows: [] };
function pjmRenderRows() {
  const used = PJM_FORM.rows.map((r) => r.id);
  $('#pjm-items').innerHTML = PJM_FORM.rows.map((r, i) => {
    const opts = S.db.Inventaris.filter((b) => pjmAvail(b.id) > 0 && (b.id === r.id || used.indexOf(b.id) < 0)).sort((a, b) => String(a.kode).localeCompare(b.kode));
    const max = r.id ? pjmAvail(r.id) : 1, it = S.db.Inventaris.find((b) => b.id === r.id);
    return `<div class="pjm-item"><select class="select" onchange="PJM_FORM.rows[${i}].id=this.value;PJM_FORM.rows[${i}].jumlah=1;pjmRenderRows()"><option value="">— pilih barang —</option>
      ${opts.map((b) => `<option value="${b.id}" ${b.id === r.id ? 'selected' : ''}>${esc(b.kode)} · ${esc(b.nama_barang)} (tersedia ${pjmAvail(b.id)} ${esc(b.satuan || 'Unit')})</option>`).join('')}</select>
      <div class="pjm-qty"><input type="number" class="input mono" min="1" max="${max}" value="${r.jumlah}" oninput="PJM_FORM.rows[${i}].jumlah=this.value" aria-label="Jumlah"><span class="small muted">${esc(it ? it.satuan || 'Unit' : '')}</span></div>
      <button type="button" class="btn-icon sm" onclick="PJM_FORM.rows.splice(${i},1);if(!PJM_FORM.rows.length)PJM_FORM.rows.push({id:'',jumlah:1});pjmRenderRows()" aria-label="Hapus baris"><i class="bi bi-x-lg"></i></button></div>`;
  }).join('');
}
function pjmAddRow() { PJM_FORM.rows.push({ id: '', jumlah: 1 }); pjmRenderRows(); }

// ── Bantalan tanda tangan (sentuh/mouse) ──
function sigPadHtml(id, label) {
  return `<div class="sig-box mt-16"><div class="row-between"><span class="field-label" style="margin:0">${esc(label)} <b class="req">*</b></span>
    <div class="row" style="gap:6px"><button type="button" class="btn btn-ghost btn-sm" id="${id}-use" hidden><i class="bi bi-clock-history"></i>Pakai tersimpan</button><button type="button" class="btn btn-ghost btn-sm" id="${id}-clr"><i class="bi bi-eraser"></i>Hapus</button></div></div>
    <div class="sig-pad"><canvas id="${id}"></canvas><span class="sig-hint" id="${id}-hint"><i class="bi bi-pen"></i> Tanda tangan di sini (jari / mouse)</span><i class="sig-line"></i></div>
    <label class="check small mt-8" style="gap:8px"><input type="checkbox" id="${id}-save" checked> Simpan tanda tangan di perangkat ini untuk dipakai lagi</label></div>`;
}
function sigPadInit(id) {
  const cv = document.getElementById(id), key = 'kb_ttd_' + (S.user ? S.user.id : 'x');
  const dpr = 2, w = cv.clientWidth || 600, h = cv.clientHeight || 170;
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1E3A8A'; ctx.lineWidth = 2.4;
  let drawing = false, drawn = false, last = null;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const hint = document.getElementById(id + '-hint');
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); drawing = true; last = pos(e); ctx.beginPath(); ctx.arc(last.x, last.y, 1.1, 0, Math.PI * 2); ctx.fillStyle = '#1E3A8A'; ctx.fill(); drawn = true; if (hint) hint.hidden = true; });
  cv.addEventListener('pointermove', (e) => {
    if (!drawing) return; const p = pos(e), mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => cv.addEventListener(ev, () => { drawing = false; }));
  const clear = () => { ctx.clearRect(0, 0, w, h); drawn = false; if (hint) hint.hidden = false; };
  document.getElementById(id + '-clr').onclick = clear;
  const saved = lsGet(key, null), use = document.getElementById(id + '-use');
  if (saved && use) {
    use.hidden = false;
    use.onclick = () => { const im = new Image(); im.onload = () => { clear(); const s = Math.min((w - 20) / im.width, (h - 20) / im.height, 1); ctx.drawImage(im, (w - im.width * s) / 2, (h - im.height * s) / 2, im.width * s, im.height * s); drawn = true; if (hint) hint.hidden = true; }; im.src = saved; };
  }
  /** Potong area kosong & perkecil → PNG ringan (aman disimpan di Sheets). */
  const data = () => {
    const W0 = cv.width, H0 = cv.height, px = ctx.getImageData(0, 0, W0, H0).data;
    let x1 = W0, y1 = H0, x2 = 0, y2 = 0;
    for (let y = 0; y < H0; y += 2) for (let x = 0; x < W0; x += 2) if (px[(y * W0 + x) * 4 + 3] > 10) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
    if (x2 <= x1 || y2 <= y1) return '';
    const pd = 12; x1 = Math.max(0, x1 - pd); y1 = Math.max(0, y1 - pd); x2 = Math.min(W0, x2 + pd); y2 = Math.min(H0, y2 + pd);
    const sc = Math.min(1, 420 / (x2 - x1), 150 / (y2 - y1)), o = document.createElement('canvas');
    o.width = Math.max(1, Math.round((x2 - x1) * sc)); o.height = Math.max(1, Math.round((y2 - y1) * sc));
    o.getContext('2d').drawImage(cv, x1, y1, x2 - x1, y2 - y1, 0, 0, o.width, o.height);
    return o.toDataURL('image/png');
  };
  return { empty: () => !drawn, data, clear, remember: () => { const sv = document.getElementById(id + '-save'); if (sv && sv.checked) { const d = data(); if (d) lsSet(key, d); } } };
}

// ── Pop-up surat bergaya Word ──
function pjmOpenDoc(id) {
  const l = S.db.Peminjaman.find((x) => x.id === id); if (!l) return;
  const t = pjmTpl(), st = PJM_ST[l.status] || PJM_ST.Menunggu, mine = String(l.id_pemohon) === String(S.user.id);
  const canBack = l.status === 'Disetujui' && (can('peminjaman', 2) || isApprover());
  const fname = 'Surat_Peminjaman_' + String(l.nomor).replace(/[^\w]+/g, '_');
  pjmModal({ title: 'Surat Peminjaman ' + l.nomor, size: 'doc', body: `<style>${PJM_CSS}</style>
    <div class="word-bar"><span class="word-ic"><i class="bi bi-file-earmark-word-fill"></i></span><div style="min-width:0"><b class="ellipsis">${esc(fname)}.docx</b><small>Mode baca · ${esc(t.font)} · A4</small></div>
      <span class="chip ${st[0]}" style="margin-left:auto"><i class="bi ${st[1]}"></i>${st[2]}</span></div>
    <div class="word-tools">
      <button class="btn btn-sm word-btn" onclick="pjmDocx('${l.id}')"><i class="bi bi-file-earmark-word"></i>Unduh Word</button>
      <button class="btn btn-sm btn-secondary" onclick="pjmPrint('${l.id}')"><i class="bi bi-printer"></i>Cetak / PDF</button>
      ${isApprover() && l.status === 'Menunggu' ? `<button class="btn btn-sm b-ok" onclick="pjmApprove('${l.id}')"><i class="bi bi-qr-code"></i>Setujui &amp; Tanda Tangan</button><button class="btn btn-sm btn-ghost t-out" onclick="pjmReject('${l.id}')"><i class="bi bi-x-octagon"></i>Tolak</button>` : ''}
      ${canBack ? `<button class="btn btn-sm btn-soft" onclick="pjmReturn('${l.id}')"><i class="bi bi-box-arrow-in-down"></i>Tandai Dikembalikan</button>` : ''}
      ${(mine && l.status === 'Menunggu') || can('peminjaman', 2) ? `<button class="btn btn-sm btn-ghost t-out" onclick="pjmCancel('${l.id}')"><i class="bi bi-trash3"></i>${mine && l.status === 'Menunggu' ? 'Batalkan' : 'Hapus'}</button>` : ''}
      ${pjmCanEditTpl() ? `<button class="btn btn-sm btn-ghost" onclick="pjmEditTpl('${l.id}')"><i class="bi bi-sliders"></i>Edit Format</button>` : ''}</div>
    ${l.kode_ttd && !appBaseUrl() && (isSuper() || isApprover()) ? `<div class="callout warn" style="margin:0 0 12px"><i class="bi bi-qr-code t-warn"></i><span>QR tanda tangan belum bisa membuka halaman tanda tangan karena <b>alamat aplikasi</b> belum diatur.${isSuper() ? ' <button class="link" onclick="openTtdPanel()">Atur sekarang</button>' : ' Minta Super Admin mengaturnya.'}</span></div>` : ''}
    ${l.status === 'Menunggu' ? `<div class="callout warn" style="margin:0 0 12px"><i class="bi bi-hourglass-split t-warn"></i><span>Menunggu persetujuan pengurus (Ketua / Bendahara / Sekretaris).${isApprover() ? ' Klik <b>Setujui &amp; Tanda Tangan</b> untuk memproses.' : ''}</span></div>` : ''}
    <div class="doc-scaler">${pjmDocHtml(l, t)}</div>`,
    foot: `<button class="btn btn-ghost" style="margin-right:auto" onclick="openPeminjaman()"><i class="bi bi-arrow-left"></i>${S.current === 'peminjaman' ? 'Kembali ke riwayat' : 'Halaman peminjaman'}</button><button class="btn btn-secondary" onclick="closeModal()">Tutup</button>` });
  setTimeout(() => pjmFit($('#modal-body')), 0);
}
function pjmPrint(id) {
  const l = S.db.Peminjaman.find((x) => x.id === id); if (!l) return;
  rptPrint(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(l.nomor)}</title><style>@page{size:A4;margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0}${PJM_CSS}
    .doc-page{box-shadow:none;width:210mm;min-height:297mm;margin:0}</style></head><body>${pjmDocHtml(l, pjmTpl())}</body></html>`);
}
function pjmApprove(id) {
  const l = S.db.Peminjaman.find((x) => x.id === id); if (!l) return;
  const reg = S.user.ttd;
  pjmModal({ title: 'Setujui Peminjaman', body: `<div class="budget-card" style="margin-bottom:6px"><div class="row-between"><b>${esc(l.nama_pemohon)}</b><span class="mono small">${esc(l.nomor)}</span></div>
      <span class="small muted">${esc(pjmItems(l).map((x) => x.nama + ' ×' + num(x.jumlah)).join(', '))} · ${dmy(l.tgl_pinjam)} → ${dmy(l.tgl_kembali)}</span></div>
    <div class="callout mt-16" style="margin-bottom:0"><i class="bi bi-person-badge t-primary"></i><span>Disetujui sebagai <b>${esc(S.user.nama)} · ${esc(S.user.peran)}</b>. Tulisan penyetuju di surat otomatis menjadi <b>${esc(S.user.peran)}</b>.</span></div>
    ${reg ? `<div class="ttd-card mt-16"><div class="ttd-qr">${QR.svg(pjmSigUrl(reg.kode, S.user.nama, S.user.peran), 96, PJM_QR)}</div><div class="ttd-info"><b>Tanda tangan digital Anda</b>
        <span class="small muted">Terdaftar sejak ${esc(dmy(reg.dibuat_pada))} · dipakai otomatis sebagai QR di surat.</span><div class="ttd-img">${reg.img ? `<img src="${esc(reg.img)}" alt="Tanda tangan">` : ''}</div>
        <span class="small muted"><i class="bi bi-info-circle"></i> Ingin mengganti? Minta Super Admin mereset tanda tangan Anda.</span></div></div>`
      : `<div class="callout warn mt-16" style="margin-bottom:0"><i class="bi bi-qr-code t-warn"></i><span>Ini persetujuan pertama Anda. Tanda tangan di bawah disimpan <b>sekali</b> sebagai tanda tangan digital (QR) dan dipakai otomatis untuk persetujuan berikutnya.</span></div>
        ${sigPadHtml('pjm-sig-k', 'Tanda tangan ' + S.user.peran)}`}
    <label class="field mt-16" style="margin-bottom:0"><span>Catatan (opsional)</span><input id="pjm-cat" class="input" maxlength="300" placeholder="mis. Barang dikembalikan ke sekretariat"></label>`,
    foot: `<button class="btn btn-secondary" onclick="pjmOpenDoc('${id}')">Batal</button><button class="btn btn-primary" id="btn-pjm-ok"><i class="bi bi-patch-check"></i>Setujui</button>` });
  const pad = reg ? null : sigPadInit('pjm-sig-k');
  $('#btn-pjm-ok').onclick = () => {
    if (pad && pad.empty()) { toast('Silakan bubuhkan tanda tangan.', 'warning'); return; }
    if (pad) pad.remember();
    pjmAct(id, 'setujui', { ttd: pad ? pad.data() : '', catatan: $('#pjm-cat').value.trim() }, $('#btn-pjm-ok'));
  };
}
function pjmReject(id) {
  pjmModal({ title: 'Tolak Peminjaman', size: 'sm', body: '<label class="field" style="margin:0"><span>Alasan penolakan</span><textarea id="pjm-cat" class="textarea" rows="3" maxlength="300" placeholder="mis. Barang sedang dipakai kegiatan lain"></textarea></label>',
    foot: `<button class="btn btn-secondary" onclick="pjmOpenDoc('${id}')">Batal</button><button class="btn btn-danger" id="btn-pjm-no"><i class="bi bi-x-octagon"></i>Tolak</button>` });
  $('#btn-pjm-no').onclick = () => pjmAct(id, 'tolak', { catatan: $('#pjm-cat').value.trim() }, $('#btn-pjm-no'));
}
function pjmReturn(id) {
  pjmModal({ title: 'Tandai Barang Dikembalikan', size: 'sm', body: `<label class="field" style="margin:0"><span>Tanggal dikembalikan</span><input id="pjm-tk" type="date" class="input" value="${todayStr()}"></label>`,
    foot: `<button class="btn btn-secondary" onclick="pjmOpenDoc('${id}')">Batal</button><button class="btn btn-primary" id="btn-pjm-bk"><i class="bi bi-box-arrow-in-down"></i>Simpan</button>` });
  $('#btn-pjm-bk').onclick = () => pjmAct(id, 'kembali', { tanggal: $('#pjm-tk').value }, $('#btn-pjm-bk'));
}
function pjmCancel(id) {
  confirmDlg('Hapus permohonan peminjaman ini? Surat tidak dapat dikembalikan.', { ok: 'Hapus', danger: true, title: 'Hapus Peminjaman' }).then((yes) => {
    if (!yes) { pjmOpenDoc(id); return; }
    api('prosesPeminjaman', S.token, id, 'batal', {}).then((res) => { removeLocal('Peminjaman', id); S.meta.version = res.data.version; afterLocalChange('Peminjaman'); toast(res.message, 'success'); closeModal(); })
      .catch((e) => toast(e.message, 'error'));
  });
}
function pjmAct(id, aksi, opts, btn) {
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Memproses…'; }
  api('prosesPeminjaman', S.token, id, aksi, opts).then((res) => {
    replaceLocal('Peminjaman', id, res.data.record); S.meta.version = res.data.version;
    if (res.data.ttd) S.user.ttd = res.data.ttd;
    afterLocalChange('Peminjaman'); renderNav();
    toast(res.message, 'success'); pjmOpenDoc(id);
  }).catch((e) => { toast(e.message, 'error'); if (btn) { btn.disabled = false; btn.textContent = 'Coba lagi'; } });
}

// ── Unduh sebagai Word (.docx asli, lengkap dengan tanda tangan) ──
const DOCX = (() => {
  const NS = ['http:', '', 'schemas.openxmlformats.org', ''].join('/');
  const XMLH = '<' + '?xml version="1.0" encoding="UTF-8" standalone="yes"?' + '>';
  const x = (v) => String(v === null || v === undefined ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const run = (t, o) => {
    o = o || {};
    const rp = '<w:rPr>' + (o.font ? `<w:rFonts w:ascii="${x(o.font)}" w:hAnsi="${x(o.font)}" w:cs="${x(o.font)}"/>` : '') + (o.b ? '<w:b/>' : '') + (o.i ? '<w:i/>' : '') + (o.caps ? '<w:caps/>' : '') +
      (o.color ? `<w:color w:val="${o.color}"/>` : '') + (o.sz ? `<w:sz w:val="${Math.round(o.sz * 2)}"/><w:szCs w:val="${Math.round(o.sz * 2)}"/>` : '') + (o.u ? '<w:u w:val="single"/>' : '') + '</w:rPr>';
    return String(t).split('\n').map((seg, i) => `<w:r>${rp}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${x(seg)}</w:t></w:r>`).join('');
  };
  const para = (runs, o) => {
    o = o || {};
    return '<w:p><w:pPr>' + (o.border ? '<w:pBdr><w:bottom w:val="double" w:sz="6" w:space="1" w:color="000000"/></w:pBdr>' : '') + (o.topLine ? '<w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="BBBBBB"/></w:pBdr>' : '') +
      `<w:spacing w:before="${o.before || 0}" w:after="${o.after === undefined ? 120 : o.after}" w:line="${o.line || 276}" w:lineRule="auto"/>` + (o.ind ? `<w:ind w:left="${o.ind}"/>` : '') +
      (o.align ? `<w:jc w:val="${o.align}"/>` : '') + '</w:pPr>' + (runs || '') + '</w:p>';
  };
  const cell = (content, w, o) => {
    o = o || {};
    return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>` : ''}<w:vAlign w:val="${o.v || 'top'}"/></w:tcPr>${content || para('', { after: 0 })}</w:tc>`;
  };
  const table = (rows, widths, o) => {
    o = o || {};
    const sides = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'];
    const bd = '<w:tblBorders>' + sides.map((s) => (o.borders ? `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>` : `<w:${s} w:val="nil"/>`)).join('') + '</w:tblBorders>';
    return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/>${o.indent ? `<w:tblInd w:w="${o.indent}" w:type="dxa"/>` : ''}${bd}<w:tblLayout w:type="fixed"/>` +
      `<w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>` +
      rows.map((r) => '<w:tr>' + (r.h ? `<w:trPr><w:trHeight w:val="${r.h}" w:hRule="exact"/></w:trPr>` : '') + (Array.isArray(r) ? r : r.cells).map((c, i) => cell(c.xml !== undefined ? c.xml : c, widths[i], c.o)).join('') + '</w:tr>').join('') + '</w:tbl>';
  };
  const image = (rid, n, wpx, hpx) => {
    const cx = Math.round(wpx * 9525), cy = Math.round(hpx * 9525);
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${n}" name="Gambar ${n}"/>` +
      `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${NS}drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="${NS}drawingml/2006/main">` +
      `<a:graphicData uri="${NS}drawingml/2006/picture"><pic:pic xmlns:pic="${NS}drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="gambar${n}"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  };
  /** ftr (opsional): { xml, images } → kaki halaman (footer) Word, tampil di bawah setiap halaman surat. */
  function build(bodyXml, images, font, mar, ftr) {
    mar = mar || { t: 1134, b: 1134 };
    const NSA = `xmlns:w="${NS}wordprocessingml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships" xmlns:wp="${NS}drawingml/2006/wordprocessingDrawing" xmlns:a="${NS}drawingml/2006/main" xmlns:pic="${NS}drawingml/2006/picture"`;
    const doc = XMLH + `<w:document xmlns:w="${NS}wordprocessingml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships" xmlns:wp="${NS}drawingml/2006/wordprocessingDrawing"` +
      ` xmlns:a="${NS}drawingml/2006/main" xmlns:pic="${NS}drawingml/2006/picture"><w:body>${bodyXml}` +
      `<w:sectPr>${ftr ? '<w:footerReference w:type="default" r:id="rIdFooter1"/>' : ''}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${mar.t}" w:right="1134" w:bottom="${mar.b}" w:left="1418" w:header="709" w:footer="${mar.f || 709}" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const styles = XMLH + `<w:styles xmlns:w="${NS}wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${x(font)}" w:hAnsi="${x(font)}" w:eastAsia="${x(font)}" w:cs="${x(font)}"/>` +
      '<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>';
    const rels = XMLH + `<Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rIdStyles" Type="${NS}officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      images.map((im) => `<Relationship Id="${im.rid}" Type="${NS}officeDocument/2006/relationships/image" Target="media/${im.name}"/>`).join('') +
      (ftr ? `<Relationship Id="rIdFooter1" Type="${NS}officeDocument/2006/relationships/footer" Target="footer1.xml"/>` : '') + '</Relationships>';
    const files = [
      { name: '[Content_Types].xml', data: XMLH + `<Types xmlns="${NS}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        '<Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        (ftr ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : '') + '</Types>' },
      { name: '_rels/.rels', data: XMLH + `<Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rId1" Type="${NS}officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
      { name: 'word/document.xml', data: doc }, { name: 'word/styles.xml', data: styles }, { name: 'word/_rels/document.xml.rels', data: rels }
    ].concat(images.map((im) => ({ name: 'word/media/' + im.name, data: im.bytes })));
    if (ftr) {
      files.push({ name: 'word/footer1.xml', data: XMLH + `<w:ftr ${NSA}>${ftr.xml || '<w:p/>'}</w:ftr>` });
      files.push({ name: 'word/_rels/footer1.xml.rels', data: XMLH + `<Relationships xmlns="${NS}package/2006/relationships">` +
        (ftr.images || []).map((im) => `<Relationship Id="${im.rid}" Type="${NS}officeDocument/2006/relationships/image" Target="media/${im.name}"/>`).join('') + '</Relationships>' });
      (ftr.images || []).forEach((im) => files.push({ name: 'word/media/' + im.name, data: im.bytes }));
    }
    return new Blob([XL.zip(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  return { run, para, table, image, build };
})();
/** Data URL gambar → {bytes, w, h, ext} (null bila tidak bisa). */
function imgInfo(src) {
  return new Promise((res) => {
    const m = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(String(src || ''));
    if (!m) { res(null); return; }
    const im = new Image();
    im.onload = () => { const b = atob(m[2]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); res({ bytes: u, w: im.width, h: im.height, ext: m[1] === 'png' ? 'png' : 'jpeg' }); };
    im.onerror = () => res(null); im.src = src;
  });
}
async function pjmDocx(id) {
  const l = S.db.Peminjaman.find((x) => x.id === id); if (!l) return;
  try {
    const t = pjmTpl(), D = DOCX, F = t.font || 'Times New Roman', R = (s, o) => D.run(s, Object.assign({ font: F }, o || {})), P = D.para, f = (s) => pjmFill(s, l, t);
    const items = pjmItems(l), ok = l.status === 'Disetujui' || l.status === 'Dikembalikan', no = l.status === 'Ditolak';
    const qrSig = ok && l.kode_ttd, qrOk = ok && l.waktu_setuju;
    const [logo, sigP, sigK, qS, qA] = await Promise.all([imgInfo(S.settings.logo_data), imgInfo(l.ttd_pemohon), ok && !qrSig ? imgInfo(l.ttd_ketua) : Promise.resolve(null),
      qrSig ? imgInfo(QR.png(pjmSigUrl(l.kode_ttd, l.disetujui_oleh, l.peran_setuju), 8, PJM_QR)) : Promise.resolve(null), qrOk ? imgInfo(QR.png(pjmQrText(l, t), 8, PJM_QR)) : Promise.resolve(null)]);
    // Ukuran tampil QR di Word = 2px per modul (PNG dibuat 8px/modul → skala tepat 1:4, tajam saat dicetak)
    const qSPx = qrSig ? QR.fitPx(pjmSigUrl(l.kode_ttd, l.disetujui_oleh, l.peran_setuju), 88, PJM_QR) : 0, qAPx = qrOk ? QR.fitPx(pjmQrText(l, t), 88, PJM_QR) : 0;
    const images = []; let n = 0;
    const pic = (info, maxW, maxH) => { if (!info) return ''; n += 1; const rid = 'rIdImg' + n, sc = Math.min(maxW / info.w, maxH / info.h, 1); images.push({ rid, name: 'gambar' + n + '.' + info.ext, bytes: info.bytes }); return D.image(rid, n, info.w * sc, info.h * sc); };
    const paras = (s, o) => String(f(s)).split(/\n\s*\n/).map((p) => P(R(p), Object.assign({ align: 'both', after: 140 }, o || {}))).join('');
    let b = '';
    const kop = P(R(t.kop_nama || pjmOrg().toUpperCase(), { b: true, sz: 15 }), { align: 'center', after: 0 }) + (t.kop_sub ? P(R(f(t.kop_sub), { sz: 12 }), { align: 'center', after: 0 }) : '') +
      (t.kop_alamat ? P(R(f(t.kop_alamat), { sz: 9 }), { align: 'center', after: 0 }) : '');
    b += logo ? D.table([[{ xml: P(pic(logo, 72, 72), { align: 'center', after: 0 }), o: { v: 'center' } }, { xml: kop, o: { v: 'center' } }, { xml: P('', { after: 0 }) }]], [1300, 6754, 1300]) : kop;
    b += P('', { border: true, after: qA ? 160 : 240 });
    b += P(R(f(t.judul), { b: true, u: true }), { align: 'center', after: 0 }) + P(R('Nomor: ' + (l.nomor || '')), { align: 'center', after: qA ? 200 : 280 });
    b += paras(t.pembuka);
    const idRow = (k, v, bold) => [P(R(k), { after: 40 }), P(R(':'), { after: 40 }), P(R(v, { b: !!bold }), { after: 40 })];
    b += D.table([idRow('Nama', l.nama_pemohon, true), idRow('NPP', l.npp_pemohon || '-'), idRow('Jabatan', pjmJab(l))], [2400, 300, 6254], { indent: 360 });
    const gap = qA ? 20 : 120;   // surat ber-QR dirapatkan agar tetap 1 halaman
    b += P('', { after: gap }) + paras(t.isi);
    const th = (s) => ({ xml: P(R(s, { b: true }), { align: 'center', after: 0 }), o: { fill: 'E7ECF6', v: 'center' } });
    const td = (s, c) => ({ xml: P(R(s), { align: c ? 'center' : 'left', after: 0 }), o: { v: 'center' } });
    b += D.table([[th('No'), th('Kode'), th('Nama Barang'), th('Jumlah'), th('Kondisi')]].concat(items.map((it, i) => [td(String(i + 1), 1), td(it.kode || '-', 1), td(it.nama), td(num(it.jumlah) + ' ' + (it.satuan || 'Unit'), 1), td(it.kondisi || '-', 1)])),
      [700, 1500, 4054, 1500, 1600], { borders: true });
    b += P('', { after: gap });
    b += D.table([idRow('Tanggal pinjam', fmtDate(l.tgl_pinjam, 'long')), idRow('Tanggal kembali', fmtDate(l.tgl_kembali, 'long')), idRow('Tempat / kegiatan', l.lokasi || '-')], [2400, 300, 6254], { indent: 360 });
    b += P('', { after: gap }) + paras(t.penutup);
    const ketua = ok || no ? l.disetujui_oleh : (t.nama_ketua || '');
    const tglSurat = fmtDate(String(l.dibuat_pada || todayStr()).slice(0, 10), 'long');
    const jabSetuju = (ok || no) && l.peran_setuju ? l.peran_setuju : f(t.jabatan_setuju);
    // Blok tanda tangan = tabel 3 baris (judul · gambar setinggi tetap · nama + jabatan) → kolom penyetuju & pemohon selalu sejajar
    const c = (x) => ({ xml: x, o: { v: 'center' } }), cap = (s, color) => P(R(s, { b: true, sz: 9, color }), { align: 'center', after: 0 });
    const stL = ok && !qS ? cap('DISETUJUI · ' + dmy(l.waktu_setuju || l.tgl_setuju), '12A150') : no ? cap('DITOLAK · ' + dmy(l.tgl_setuju), 'E5484D') : '';
    const stR = l.status === 'Dikembalikan' ? cap('DIKEMBALIKAN · ' + dmy(l.tgl_dikembalikan), '2F6FED') : '';
    const imgL = qS ? P(pic(qS, qSPx, qSPx), { align: 'center', after: 0, line: 240 }) : ok && sigK ? P(pic(sigK, 190, 80), { align: 'center', after: 0, line: 240 }) :
      P(R(no ? '' : '(menunggu persetujuan)', { i: true, sz: 9, color: '888888' }), { align: 'center', after: 0 });
    const imgR = sigP ? P(pic(sigP, 190, qS ? Math.min(qSPx, 88) : 80), { align: 'center', after: 0, line: 240 }) : P('', { after: 0 });
    const hImg = Math.max(qS ? Math.round(qSPx * 15) : 0, 1200) + (stL || stR ? 280 : 0) + 120;
    b += P('', { after: qS ? 40 : qA ? 60 : 200 }) + D.table([
      [c(P(R(' '), { align: 'center', after: 0 }) + P(R(f(t.label_setuju)), { align: 'center', after: 0 })),
        c(P(R((t.kota ? t.kota + ', ' : '') + tglSurat), { align: 'center', after: 0 }) + P(R(f(t.label_pemohon)), { align: 'center', after: 0 }))],
      { h: hImg, cells: [c(imgL + stL), c(imgR + stR)] },
      [c(P(R(ketua || '.................................', { b: true, u: !!ketua }), { align: 'center', after: 0 }) + P(R(jabSetuju, { sz: 11 }), { align: 'center', after: 0 })),
        c(P(R(l.nama_pemohon, { b: true, u: true }), { align: 'center', after: 0 }) + P(R(pjmJab(l), { sz: 11 }), { align: 'center', after: 0 }))]], [4677, 4677]);
    if (l.catatan_ketua) b += P(R('Catatan ' + (jabSetuju || 'Pengurus') + ': ', { b: true, sz: 11 }) + R(l.catatan_ketua, { sz: 11 }), { before: qA ? 120 : 240 });
    // Kaki halaman (footer Word): QR verifikasi persetujuan + catatan kaki → selalu menempel di bawah surat
    const fImgs = []; let fx = '';
    if (qA) {
      const w = pjmWaktu(l); n += 1; const rid = 'rIdF' + n; fImgs.push({ rid, name: 'gambar' + n + '.' + qA.ext, bytes: qA.bytes });
      fx += P('', { topLine: true, after: 0, line: 60 }) + D.table([[{ xml: P(D.image(rid, n, qAPx, qAPx), { align: 'left', after: 0, line: 240 }), o: { v: 'center' } },
        { xml: P(R('Verifikasi persetujuan', { b: true, sz: 9.5 }), { after: 0 }) + P(R('Pindai QR ini untuk melihat tanggal, jam, dan pengurus yang menyetujui peminjaman.', { sz: 8.5 }), { after: 30 }) +
          P(R('Disetujui ' + l.disetujui_oleh + ' (' + (l.peran_setuju || '') + ') · ' + w.tgl + (w.jam ? ' · ' + w.jam + ' ' + w.tz : ''), { sz: 8.5, color: '12A150' }), { after: 0 }), o: { v: 'center' } }]], [1500, 7854]);
    }
    if (t.catatan_kaki) fx += P(R(f(t.catatan_kaki), { i: true, sz: 8, color: '777777' }), { align: 'center', before: 40, after: 0, topLine: !qA });
    downloadBlob(D.build(b, images, F, qA ? { t: 720, b: Math.max(1900, 320 + 180 + Math.round(qAPx * 15) + (t.catatan_kaki ? 300 : 0)), f: 320 } : null, fx ? { xml: fx, images: fImgs } : null), 'Surat_Peminjaman_' + String(l.nomor).replace(/[^\w]+/g, '_') + '.docx');
    toast('Dokumen Word terunduh.', 'success');
  } catch (e) { console.error(e); toast(e.message, 'error', 'Gagal membuat Word'); }
}

// ── Editor format surat (Super Admin / pengguna yang diizinkan) ──
function pjmEditTpl(fromId) {
  if (!pjmCanEditTpl()) return;
  const t = pjmTpl(), sample = S.db.Peminjaman.find((x) => x.id === fromId) || S.db.Peminjaman[0] || { nomor: '001/SP-INV/XI/2026', nama_pemohon: S.user.nama, npp_pemohon: S.user.npp || S.user.username, peran_pemohon: S.user.peran,
    jabatan_pemohon: S.user.jabatan || 'Supervisor', keperluan: 'Kegiatan Turnamen Futsal', lokasi: 'Sekretariat', tgl_pinjam: todayStr(), tgl_kembali: addDays(todayStr(), 3), status: 'Menunggu', dibuat_pada: todayStr(),
    barang: JSON.stringify([{ kode: 'AST-001', nama: 'Tenda Posko 4x4m', jumlah: 2, satuan: 'Unit', kondisi: 'Baik' }, { kode: 'AST-002', nama: 'Megaphone Portable', jumlah: 1, satuan: 'Unit', kondisi: 'Baik' }]) };
  PJM_EDIT.sample = Object.assign({}, sample, { ttd_ketua: '', status: sample.status === 'Menunggu' ? 'Menunggu' : sample.status });
  const editors = String(S.settings.surat_editor || '').split(',').filter(String);
  const field = ([k, label, type, hint]) => type === 'a' ? `<label class="field full"><span>${esc(label)}</span><textarea class="textarea" rows="${k === 'penutup' ? 5 : 3}" data-k="${k}" oninput="pjmTplPrev()">${esc(t[k])}</textarea>${hint ? `<small class="field-hint">${esc(hint)}</small>` : ''}</label>`
    : type === 'f' ? `<label class="field"><span>${esc(label)}</span><select class="select" data-k="${k}" onchange="pjmTplPrev()">${['Times New Roman', 'Arial', 'Calibri', 'Cambria', 'Georgia'].map((o) => `<option ${t[k] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`
      : `<label class="field ${['kop_alamat', 'judul', 'catatan_kaki', 'kop_nama'].indexOf(k) >= 0 ? 'full' : ''}"><span>${esc(label)}</span><input class="input" data-k="${k}" value="${esc(t[k])}" placeholder="${esc(k === 'kop_nama' ? pjmOrg().toUpperCase() : '')}" oninput="pjmTplPrev()">${hint ? `<small class="field-hint">${esc(hint)}</small>` : ''}</label>`;
  pjmModal({ title: 'Format Surat Peminjaman', size: 'doc', body: `<style>${PJM_CSS}</style><div class="tpl-grid">
    <div class="tpl-form"><div class="callout" style="margin:0 0 14px"><i class="bi bi-braces t-primary"></i><span>Variabel otomatis: ${['{nomor}', '{tanggal}', '{nama}', '{npp}', '{jabatan}', '{keperluan}', '{lokasi}', '{tgl_pinjam}', '{tgl_kembali}', '{organisasi}', '{kota}', '{jumlah_barang}', '{aplikasi}'].map((v) => `<span class="code-chip">${v}</span>`).join(' ')}</span></div>
      <div class="form-grid" id="tpl-form">${SURAT_FIELDS.map(field).join('')}</div>
      ${isSuper() ? `<div class="card card-pad mt-16" style="box-shadow:none"><div class="row-between"><b><i class="bi bi-person-gear t-primary"></i> Izinkan pengguna mengedit format surat</b><span class="chip chip-soft" id="tpl-ed-n">${editors.length} dipilih</span></div>
        <p class="small muted mt-8">Pengguna terpilih akan melihat tombol "Format Surat" dan dapat mengubah contoh surat ini (tanpa akses Pengaturan lain).</p>
        <div class="tpl-users">${S.users.filter((x) => x.peran !== 'Super Admin').sort((a, b) => String(a.nama).localeCompare(b.nama)).map((x) => `<label class="check"><input type="checkbox" class="tpl-ed" value="${x.id}" ${editors.indexOf(x.id) >= 0 ? 'checked' : ''} onchange="$('#tpl-ed-n').textContent=$$('.tpl-ed:checked').length+' dipilih'"> <span><b>${esc(x.nama)}</b> <small class="muted">${esc(x.peran)} · ${esc(x.username)}</small></span></label>`).join('') || '<p class="small muted">Belum ada pengguna lain.</p>'}</div></div>` : ''}</div>
    <div class="tpl-prev"><div class="small muted" style="margin-bottom:8px"><i class="bi bi-eye"></i> Pratinjau langsung</div><div class="doc-scaler" id="tpl-prev"></div></div></div>`,
    foot: '<button class="btn btn-ghost" style="margin-right:auto" onclick="pjmTplReset()"><i class="bi bi-arrow-counterclockwise"></i>Contoh bawaan</button><button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-tpl"><i class="bi bi-floppy"></i>Simpan Format</button>' });
  pjmTplPrev();
  $('#btn-tpl').onclick = () => {
    const tpl = pjmTplRead(), b = $('#btn-tpl'); b.disabled = true; b.innerHTML = '<span class="spin"></span> Menyimpan…';
    const args = ['simpanFormatSurat', S.token, tpl]; if (isSuper()) args.push($$('.tpl-ed:checked').map((c) => c.value));
    api(...args).then((res) => { S.settings = res.data.settings; S.meta.version = res.data.version; saveSnapshot(); toast(res.message, 'success'); if (fromId) pjmOpenDoc(fromId); else { closeModal(); markDirty(['peminjaman']); } })
      .catch((e) => { b.disabled = false; b.innerHTML = '<i class="bi bi-floppy"></i>Simpan Format'; toast(e.message, 'error'); });
  };
}
const PJM_EDIT = { sample: null };
function pjmTplRead() { const o = {}; $$('#tpl-form [data-k]').forEach((el) => { o[el.dataset.k] = el.value; }); return o; }
function pjmTplPrev() { const el = $('#tpl-prev'); if (!el) return; el.innerHTML = pjmDocHtml(PJM_EDIT.sample, Object.assign({}, SURAT_DEF, pjmTplRead())); pjmFit(el.parentNode); }
function pjmTplReset() { $$('#tpl-form [data-k]').forEach((el) => { el.value = SURAT_DEF[el.dataset.k] || (el.tagName === 'SELECT' ? 'Times New Roman' : ''); }); pjmTplPrev(); }
window.addEventListener('resize', debounce(() => { if (!$('#modal-root').hidden) pjmFit($('#modal-body')); }, 150));

// ════════════════ SUARA SPIN WHEEL (Web Audio, tanpa berkas) ════════════════
/**
 * Selama roda berputar: genderang (drum roll) yang makin keras, dengung tegang yang nadanya naik,
 * detak "klik" tiap nama lewat, dan detak jantung menjelang berhenti. Saat berhenti: simbal + fanfare.
 */
const UNDS = {
  ctx: null, master: null, noise: null, live: [],
  on() { return lsGet('kb_und_sound', true) !== false; },
  vol() { return Math.max(0, Math.min(100, num(lsGet('kb_und_vol', 80)))) / 100; },
  init() {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return false;
    if (!this.ctx) {
      this.ctx = new C();
      const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      this.master = this.ctx.createGain(); this.master.connect(comp); comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.master.gain.setValueAtTime(this.vol() * 0.9, this.ctx.currentTime);
    return true;
  },
  track(n, end) { this.live.push(n); n.onended = () => { const i = this.live.indexOf(n); if (i >= 0) this.live.splice(i, 1); }; return n; },
  env(t, peak, a, d) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); return g; },
  snare(t, v) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900 + Math.random() * 500; bp.Q.value = 0.9;
    const g = this.env(t, v, 0.002, 0.07); s.connect(bp); bp.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 1.5, 0.1); this.track(s);
  },
  thump(t, v) {
    const c = this.ctx, o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(78, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    const g = this.env(t, v, 0.006, 0.2); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.26); this.track(o);
  },
  tick() {
    if (!this.on() || !this.init()) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.03);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const g = this.env(t, 0.06, 0.001, 0.035); o.connect(hp); hp.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.05);
  },
  /** Jadwalkan seluruh suasana tegang sepanjang `ms` milidetik. */
  start(ms) {
    if (!this.on() || !this.init()) return;
    this.stop();
    const c = this.ctx, t0 = c.currentTime + 0.03, T = ms / 1000;
    // 1) Dengung tegang: dua gergaji sedikit fals + sub-bass, filter makin terbuka & nada naik satu oktaf
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 7; lp.frequency.setValueAtTime(180, t0); lp.frequency.exponentialRampToValueAtTime(1700, t0 + T);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.08, t0 + 1); g.gain.linearRampToValueAtTime(0.15, t0 + T - 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t0 + T + 0.15);
    lp.connect(g); g.connect(this.master);
    [[55, 'sawtooth', -9], [55, 'sawtooth', 9], [27.5, 'sine', 0], [82.4, 'triangle', 0]].forEach(([f, ty, det]) => {
      const o = c.createOscillator(); o.type = ty; o.detune.value = det; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * 2, t0 + T);
      o.connect(lp); o.start(t0); o.stop(t0 + T + 0.2); this.track(o);
    });
    // 2) Genderang: pukulan rapat yang makin keras (crescendo)
    for (let s = 0.12; s < T - 0.04; s += 0.05 + Math.random() * 0.012) { const k = s / T; this.snare(t0 + s, 0.05 + 0.33 * k * k * (0.85 + Math.random() * 0.3)); }
    // 3) Detak jantung "deg-degan" menjelang berhenti, makin cepat
    let hb = T * 0.5, gap = 0.82;
    while (hb < T - 0.15) { this.thump(t0 + hb, 0.55); this.thump(t0 + hb + 0.17, 0.35); hb += gap; gap = Math.max(0.4, gap * 0.88); }
    // 4) Desis naik (riser) 1,5 detik terakhir
    const rs = c.createBufferSource(); rs.buffer = this.noise; rs.loop = true;
    const rf = c.createBiquadFilter(); rf.type = 'bandpass'; rf.Q.value = 2; rf.frequency.setValueAtTime(400, t0 + Math.max(0, T - 1.6)); rf.frequency.exponentialRampToValueAtTime(5000, t0 + T);
    const rg = c.createGain(); rg.gain.setValueAtTime(0.0001, t0); rg.gain.setValueAtTime(0.0001, t0 + Math.max(0, T - 1.6)); rg.gain.exponentialRampToValueAtTime(0.09, t0 + T - 0.05); rg.gain.exponentialRampToValueAtTime(0.0001, t0 + T + 0.1);
    rs.connect(rf); rf.connect(rg); rg.connect(this.master); rs.start(t0); rs.stop(t0 + T + 0.15); this.track(rs);
  },
  /** Pengumuman: simbal + fanfare (akor mayor naik). */
  finish() {
    if (!this.on() || !this.init()) return;
    const c = this.ctx, t = c.currentTime + 0.02;
    const cy = c.createBufferSource(); cy.buffer = this.noise; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5500;
    const cg = this.env(t, 0.35, 0.004, 2.2); cy.connect(hp); hp.connect(cg); cg.connect(this.master); cy.start(t, 0, 2.3); this.track(cy);
    this.thump(t, 0.8);
    const note = (f, at, dur, v) => {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + 0.03); g.gain.setValueAtTime(v, at + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      lp.connect(g); g.connect(this.master);
      [-6, 6].forEach((det) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = det; o.frequency.value = f; o.connect(lp); o.start(at); o.stop(at + dur + 0.05); this.track(o); });
    };
    [[523.25, 0], [659.25, 0.13], [783.99, 0.26]].forEach(([f, d]) => note(f, t + d, 0.22, 0.09));
    [523.25, 659.25, 783.99, 1046.5].forEach((f) => note(f, t + 0.4, 1.5, 0.07));
  },
  stop() { this.live.splice(0).forEach((n) => { try { n.stop(); } catch (e) { } }); },
  preview() { if (!this.init()) return; const on = this.on(); if (!on) lsSet('kb_und_sound', true); this.start(2600); setTimeout(() => this.finish(), 2600); if (!on) setTimeout(() => lsSet('kb_und_sound', false), 2700); }
};
function undSound(v) { lsSet('kb_und_sound', v === undefined ? !UNDS.on() : !!v); if (!UNDS.on()) UNDS.stop(); renderUndian(); }
function undVol(v) { lsSet('kb_und_vol', num(v)); if (UNDS.ctx && UNDS.master) UNDS.master.gain.setValueAtTime(UNDS.vol() * 0.9, UNDS.ctx.currentTime); const o = $('#und-vol-val'); if (o) o.textContent = Math.round(num(v)) + '%'; }

// ════════════════ LOG AKTIVITAS (10 per halaman) ════════════════
/** Info arsip log terakhir (Super Admin). */
function logArsipInfo() {
  let a = null; try { a = JSON.parse(S.settings.arsip_log || 'null'); } catch (e) { a = null; }
  if (!a || !a.url) return '';
  return `<div class="log-arsip"><i class="bi bi-archive t-primary"></i><span>Reset terakhir ${esc(String(a.waktu || '').replace('T', ' ').slice(0, 16))} oleh ${esc(a.oleh || '-')} · <b>${fmtNum(a.baris)}</b> aktivitas diarsipkan.</span>
    <a class="link" href="${esc(a.url)}" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i>Buka arsip</a>${a.folder ? `<a class="link" href="${esc(a.folder)}" target="_blank" rel="noopener"><i class="bi bi-folder2-open"></i>Folder Arsip_Log</a>` : ''}</div>`;
}
/** Reset log aktivitas: KHUSUS Super Admin. Data lama disimpan dulu ke Google Drive. */
function resetLogUi() {
  if (!isSuper()) return;
  const n = num(S.ui.logTotal);
  openModal({ title: 'Reset Log Aktivitas', size: 'sm', body: `<div class="callout danger" style="margin:0 0 14px"><i class="bi bi-exclamation-triangle t-out"></i>
      <span>Seluruh log aktivitas${n ? ' (<b>' + fmtNum(n) + ' aktivitas</b>)' : ''} akan <b>disimpan dulu ke Google Drive</b> sebagai spreadsheet di folder <b>KASBURUH_App › Arsip_Log</b>, lalu log di aplikasi dikosongkan.</span></div>
    <ul class="small muted" style="margin:0 0 14px 18px;padding:0;line-height:1.6"><li>Setelah direset, log lama <b>tidak tampil lagi</b> di aplikasi.</li><li>Log lama tetap bisa dibuka di file Drive (akun Google pemilik aplikasi).</li><li>Aktivitas reset ini sendiri tercatat sebagai log pertama yang baru.</li></ul>
    <label class="field" style="margin:0"><span>Ketik <b class="mono">RESET</b> untuk melanjutkan</span><input id="log-reset-ok" class="input mono" autocomplete="off" oninput="$('#btn-log-reset').disabled=this.value.trim().toUpperCase()!=='RESET'"></label>`,
    foot: '<button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-danger" id="btn-log-reset" disabled><i class="bi bi-archive"></i>Arsipkan &amp; Reset</button>' });
  $('#btn-log-reset').onclick = () => {
    const b = $('#btn-log-reset'); b.disabled = true; b.innerHTML = '<span class="spin"></span> Mengarsipkan…';
    api('resetLogAktivitas', S.token).then((res) => {
      S.settings = res.data.settings; saveSnapshot();
      const a = res.data.arsip;
      openModal({ title: 'Log Berhasil Direset', size: 'sm', body: `<div class="sess-ic" style="background:var(--in-soft);color:var(--in)"><i class="bi bi-cloud-check"></i></div>
        <p class="center"><b>${fmtNum(a.baris)} aktivitas</b> sudah disimpan ke Google Drive lalu log di aplikasi dikosongkan.</p>
        <div class="sess-dev"><i class="bi bi-file-earmark-spreadsheet"></i><div><b class="mono" style="font-size:13px">${esc(a.nama)}</b><small>Folder KASBURUH_App › Arsip_Log</small></div></div>`,
        foot: `<a class="btn btn-secondary" href="${esc(a.folder || a.url)}" target="_blank" rel="noopener"><i class="bi bi-folder2-open"></i>Folder</a><a class="btn btn-primary" href="${esc(a.url)}" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i>Buka Arsip</a>` });
      if (S.current === 'pengaturan') { renderPengaturan(); }
      toast(res.message, 'success');
    }).catch((e) => { b.disabled = false; b.innerHTML = '<i class="bi bi-archive"></i>Arsipkan &amp; Reset'; toast(e.message, 'error'); });
  };
}
const LOG_TONE = [[/^(TAMBAH|IMPOR|LUNAS|SETUJUI|CADANGAN|PINJAM)/, 'in'], [/^(UBAH|FORMAT|SALIN|MASSAL|UNGGAH)/, 'trf'], [/^(HAPUS|NONAKTIFKAN|BATAL|TOLAK|RESET)/, 'out'],
  [/^(PENGINGAT|KEMBALI|TES)/, 'warn'], [/^(UNDIAN)/, 'pri'], [/^(LOGIN|LOGOUT)/, 'mute']];
function loadLog(page) {
  const el = $('#log-list'); if (!el) return;
  page = Math.max(1, Math.round(num(page)) || S.ui.logPage || 1); S.ui.logPage = page;
  el.style.minHeight = el.offsetHeight ? el.offsetHeight + 'px' : '';
  el.innerHTML = '<div class="log-sk">' + '<div class="sk" style="height:46px;margin:8px 0;border-radius:12px"></div>'.repeat(5) + '</div>';
  api('getLogAktivitas', S.token, 10, page).then((res) => {
    const d = res.data;
    const rows = Array.isArray(d) ? d.slice(0, 10) : d.rows, total = Array.isArray(d) ? d.length : d.total, pg = Array.isArray(d) ? 1 : d.page, size = 10;
    if (!rows.length) { el.innerHTML = emptyState('bi-clock', 'Belum ada aktivitas'); el.style.minHeight = ''; return; }
    const tone = (a) => (LOG_TONE.find(([re]) => re.test(String(a).toUpperCase())) || [0, 'mute'])[1];
    const start = (pg - 1) * size; S.ui.logTotal = total;
    el.innerHTML = `<div class="log-list2">${rows.map((r, i) => {
      const m = /^(.*) \((.*)\)$/.exec(String(r[1] || '')), nm = m ? m[1] : String(r[1] || 'Sistem'), role = m ? m[2] : '';
      const w = String(r[0] || ''), dt = w.slice(0, 10), tm = w.slice(11, 16), tn = tone(r[2]);
      return `<div class="log-item"><span class="log-no mono">${start + i + 1}</span><span class="log-av t-${tn}">${esc(initials(nm))}</span>
        <div class="log-main"><div class="log-top"><b>${esc(nm)}</b>${role ? `<span class="log-role">${esc(role)}</span>` : ''}<span class="log-chip c-${tn}">${esc(r[2])}</span></div>
          <div class="log-desc">${esc(r[3] || '-')}</div></div>
        <div class="log-time"><b class="mono">${esc(tm || '--:--')}</b><small>${esc(dt ? fmtDate(dt) : '')}</small></div></div>`;
    }).join('')}</div>
    <div class="log-foot"><span class="small muted">Menampilkan <b>${start + 1}–${start + rows.length}</b> dari <b>${fmtNum(total)}</b> aktivitas</span>
      ${pager(total, pg, size, 'loadLog') || '<span class="small muted">Halaman 1 dari 1</span>'}</div>`;
    el.style.minHeight = '';
  }).catch((e) => { el.innerHTML = `<p class="t-out">${esc(e.message)}</p>`; el.style.minHeight = ''; });
}

// ════════════════ HALAMAN: PENGATURAN ════════════════
function renderPengaturan() {
  // Hanya Super Admin yang punya akses penuh; pengguna lain hanya "Akun Saya"
  const allTabs = [['identitas', 'Identitas Aplikasi', 'bi-palette'], ['pengguna', 'Pengguna & Hak Akses', 'bi-person-gear'], ['notifikasi', 'Integrasi Notifikasi', 'bi-bell'], ['data', 'Data & Cadangan', 'bi-database'], ['akun', 'Akun Saya', 'bi-shield-lock']];
  const tabs = isSuper() ? allTabs : isKetua() ? allTabs.filter((t) => t[0] === 'data' || t[0] === 'akun') : allTabs.filter((t) => t[0] === 'akun');
  if (!tabs.some((t) => t[0] === S.ui.setTab)) S.ui.setTab = tabs[0][0];
  const tab = S.ui.setTab;
  let body = '';
  const st = S.settings;
  if (tab === 'identitas') {
    body = `<div class="grid g-main" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)"><div class="stack">
      <div class="card card-pad"><div class="card-head"><h3><i class="bi bi-buildings t-primary"></i> Branding & Atribut Organisasi</h3></div>
        <div class="logo-up"><span class="logo-slot" id="set-logo">${st.logo_data || st.link_logo ? `<img src="${esc(st.logo_data || st.link_logo)}" alt="Logo">` : '<i class="bi bi-bank2"></i>'}</span>
          <div><label class="btn btn-secondary btn-sm"><i class="bi bi-upload"></i>Unggah Logo<input type="file" accept="image/png,image/jpeg,image/webp" hidden onchange="uploadLogo(this)"></label>
          ${st.logo_data || st.link_logo ? '<button class="btn btn-ghost btn-sm t-out" onclick="removeLogo()"><i class="bi bi-trash"></i></button>' : ''}<p class="small muted mt-8">PNG/JPG, otomatis dikecilkan jadi thumbnail 160px.</p></div></div>
        <div class="logo-size"><div><b class="small">Ukuran logo</b><small>Berlaku di menu samping, halaman login & halaman depan</small></div>
          <div class="logo-size-ctl"><button type="button" class="btn-icon sm" onclick="logoZoom(-10)" aria-label="Perkecil logo" title="Perkecil logo"><i class="bi bi-zoom-out"></i></button>
            <input type="range" id="set-logo-k" min="60" max="200" step="10" value="${Math.max(60, Math.min(200, Math.round(num(st.logo_skala)) || 100))}" oninput="logoZoom(0, this.value)" aria-label="Ukuran logo">
            <button type="button" class="btn-icon sm" onclick="logoZoom(10)" aria-label="Perbesar logo" title="Perbesar logo"><i class="bi bi-zoom-in"></i></button>
            <b class="mono" id="logo-k-val">${Math.max(60, Math.min(200, Math.round(num(st.logo_skala)) || 100))}%</b>
            <button type="button" class="btn btn-ghost btn-sm" onclick="logoZoom(0, 100)">Reset</button></div></div>
        <div class="form-grid mt-24"><label class="field"><span>Nama aplikasi</span><input id="set-name" class="input" value="${esc(st.nama_aplikasi)}" maxlength="40" oninput="previewBrand()"><small class="field-hint">Judul browser & header</small></label>
          <label class="field"><span>Subjudul / nama unit</span><input id="set-sub" class="input" value="${esc(st.subjudul)}" maxlength="80" oninput="previewBrand()"><small class="field-hint">mis. DPU SP JBA (Serikat Pekerja)</small></label></div></div>
      <div class="card card-pad"><div class="card-head"><h3><i class="bi bi-palette t-primary"></i> Skema Warna (Tema Dinamis)</h3><span class="chip chip-mute">CSS TOKENS</span></div>
        <div class="grid g-2 g-tight"><div class="budget-card"><b class="small">Warna utama</b><div class="row"><input type="color" id="set-p" class="color-input" value="${esc(st.warna_utama)}" oninput="previewBrand()"><input class="input mono" id="set-p-hex" value="${esc(st.warna_utama)}" oninput="if(/^#[0-9a-f]{6}$/i.test(this.value)){$('#set-p').value=this.value;previewBrand()}"></div>
          <div class="swatches">${['#6247EA', '#2F6FED', '#12A150', '#DC2626', '#EA580C', '#0F766E', '#141B2B'].map((c) => `<button class="swatch" style="background:${c}" onclick="$('#set-p').value='${c}';previewBrand()" aria-label="${c}"></button>`).join('')}</div></div>
          <div class="budget-card"><b class="small">Warna aksen / peringatan</b><div class="row"><input type="color" id="set-a" class="color-input" value="${esc(st.warna_aksen)}" oninput="previewBrand()"><input class="input mono" id="set-a-hex" value="${esc(st.warna_aksen)}" oninput="if(/^#[0-9a-f]{6}$/i.test(this.value)){$('#set-a').value=this.value;previewBrand()}"></div>
          <div class="swatches">${['#F59E0B', '#E11D48', '#8B5CF6', '#0EA5E9'].map((c) => `<button class="swatch" style="background:${c}" onclick="$('#set-a').value='${c}';previewBrand()" aria-label="${c}"></button>`).join('')}</div></div></div>
        <div class="field mt-16"><span>Mode tampilan bawaan</span><div class="seg light" id="set-mode">${[['light', '<i class="bi bi-sun"></i> Terang'], ['dark', '<i class="bi bi-moon"></i> Gelap']].map(([k, l]) => `<button class="${(st.mode_default || 'light') === k ? 'on' : ''}" data-v="${k}" onclick="$$('#set-mode button').forEach(b=>b.classList.toggle('on',b===this))">${l}</button>`).join('')}</div></div></div>
      <div class="card card-pad"><div class="card-head"><div><h3><i class="bi bi-image t-primary"></i> Halaman Login</h3><p>Wallpaper, opacity, logo, dan tulisan pada halaman login</p></div><span class="chip chip-soft">SUPER ADMIN</span></div>
        <div class="grid g-2 g-tight" style="align-items:start">
          <div class="stack" style="gap:12px">
            <div class="lgm"><div class="lgm-img" id="wp-img" style="${st.login_bg ? `background-image:url('${esc(st.login_bg)}');` : ''}opacity:${num(st.login_bg_opacity === undefined ? 35 : st.login_bg_opacity) / 100}"></div>
              <div class="lgm-card"><span class="lg-logo ${st.login_logo || st.logo_data || st.link_logo ? 'has-img' : ''}" id="lgm-logo">${st.login_logo || st.logo_data || st.link_logo ? `<img src="${esc(st.login_logo || st.logo_data || st.link_logo)}" alt="">` : '<i class="bi bi-bank2"></i>'}</span>
                <b id="lgm-title">${esc(lgVal(st, 'login_judul'))}</b><small id="lgm-sub">${esc(lgVal(st, 'login_sub'))}</small><i class="bar"></i><i class="bar"></i><i class="btn2"></i></div></div>
            <div class="row" style="flex-wrap:wrap"><label class="btn btn-secondary btn-sm"><i class="bi bi-person-badge"></i>Unggah Logo Login<input type="file" accept="image/png,image/jpeg,image/webp" hidden onchange="uploadLoginLogo(this)"></label>
              <button class="btn btn-ghost btn-sm t-out" onclick="removeLoginLogo()"><i class="bi bi-x-circle"></i>Pakai logo aplikasi</button></div>
            <small class="field-hint">Kosong = memakai logo aplikasi. PNG/JPG persegi, dikecilkan otomatis.</small>
            <label class="field" style="margin:0"><span>Judul</span><input id="lg-f-title" class="input" maxlength="50" value="${esc(lgVal(st, 'login_judul'))}" oninput="lgPreview()"></label>
            <label class="field" style="margin:0"><span>Sub judul</span><input id="lg-f-sub" class="input" maxlength="90" value="${esc(lgVal(st, 'login_sub'))}" oninput="lgPreview()"></label>
            <div class="form-grid" style="gap:0 10px"><label class="field" style="margin:0"><span>Teks bawah</span><input id="lg-f-foot1" class="input" maxlength="50" value="${esc(String(lgVal(st, 'login_catatan')).split('|')[0] || '')}"></label>
              <label class="field" style="margin:0"><span>Teks tebal</span><input id="lg-f-foot2" class="input" maxlength="50" value="${esc(String(lgVal(st, 'login_catatan')).split('|')[1] || '')}"></label></div>
          </div>
          <div class="stack" style="gap:12px">
            <div class="row" style="flex-wrap:wrap"><label class="btn btn-secondary btn-sm"><i class="bi bi-upload"></i>Unggah Gambar<input type="file" accept="image/jpeg,image/png,image/webp" hidden onchange="uploadWallpaper(this)"></label>
              <button class="btn btn-ghost btn-sm t-out" onclick="setWallpaper('')"><i class="bi bi-trash"></i>Hapus</button></div>
            <small class="field-hint" id="wp-status">${st.login_bg ? 'Wallpaper aktif.' : 'Belum ada wallpaper (latar gradien bawaan).'} JPG/PNG lanskap, dikompres otomatis.</small>
            <label class="field" style="margin:0"><span>atau tempel tautan gambar (https)</span><input id="set-wp-url" class="input" placeholder="https:&#47;&#47;…" value="${esc(String(st.login_bg || '').indexOf('data:') === 0 ? '' : st.login_bg || '')}" onchange="setWallpaper(this.value.trim())"></label>
            <label class="field" style="margin:0"><span class="row-between">Opacity wallpaper <b class="mono" id="wp-op-val">${esc(st.login_bg_opacity === undefined ? '35' : st.login_bg_opacity)}%</b></span>
              <input type="range" min="0" max="100" step="5" class="range" id="set-wp-op" value="${esc(st.login_bg_opacity === undefined ? '35' : st.login_bg_opacity)}" oninput="previewWallpaper()"></label>
            <small class="field-hint">0% = tidak terlihat · 100% = gambar penuh. Klik "Simpan Perubahan Identitas" untuk menerapkan.</small>
          </div></div></div>
      ${lpcEditorHtml(st)}
      <div class="row-between"><button class="btn btn-ghost" onclick="resetBrand()"><i class="bi bi-arrow-counterclockwise"></i>Kembalikan default</button>${canW() ? '<button class="btn btn-primary" onclick="saveBrand()"><i class="bi bi-floppy"></i>Simpan Perubahan Identitas</button>' : ''}</div></div>
      <div class="card card-pad" style="align-self:start"><div class="card-head"><h3><span class="dot" style="background:var(--in)"></span> Pratinjau Langsung</h3><span class="chip chip-soft">REALTIME</span></div>
        <div class="mini-preview" id="mini-prev"><div class="mp-sb"><b style="color:#fff;font-size:11px" class="ellipsis" id="mp-name">${esc(st.nama_aplikasi)}</b><span class="on"></span><span></span><span></span><span></span></div>
          <div class="mp-main"><div class="card" style="padding:12px"><span class="small muted">Total saldo kas</span><div class="mono" style="font-weight:600;font-size:16px">${fmtRp(totalKas())}</div></div>
          <div class="row-between"><span class="chip chip-warn">Mendesak</span><button class="btn btn-primary btn-sm">+ Catat Kas</button></div></div></div>
        <p class="small muted mt-16">Perubahan warna memengaruhi tombol, menu aktif, badge, grafik, dan portal anggota tanpa mengubah kode.</p></div></div>`;
  } else if (tab === 'pengguna') {
    const counts = {}; S.users.forEach((u) => { counts[u.peran] = (counts[u.peran] || 0) + 1; });
    if (!S.permEdit) S.permEdit = clone(S.permsAll || {});
    body = `<div class="role-chips">${ROLE_LIST.map(([r, ic]) => `<span class="role-chip"><i class="bi ${ic} t-primary"></i>${esc(r)} <b>${counts[r] || 0}</b></span>`).join('')}</div>
    <div class="card"><div class="card-head card-pad" style="margin:0;padding-bottom:12px;flex-wrap:wrap"><div><h3>Pengguna</h3><p>Tambah, ganti peran, aktif/nonaktifkan, reset sandi, atau hapus akun. Role Anggota memakai NPP 5 digit.</p></div>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-secondary" onclick="openImport('pengguna')"><i class="bi bi-file-earmark-arrow-up"></i>Impor Excel</button><button class="btn btn-primary" onclick="openUserForm()"><i class="bi bi-person-plus"></i>Tambah Pengguna</button></div></div>
      <div class="filterbar" style="padding-top:0"><div class="search"><i class="bi bi-search"></i><input class="input" placeholder="Cari nama, username/NPP…" value="${esc(S.ui.userQ || '')}" oninput="userSearch(this.value)"></div>
        <select class="select" onchange="S.ui.userRole=this.value;renderUserRows()"><option value="">Semua peran</option>${ROLE_LIST.map(([r]) => `<option ${S.ui.userRole === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>
      <div class="table-wrap"><table class="tbl cards"><thead><tr><th>Nama</th><th>Username / NPP</th><th>Peran</th><th>Status</th><th>Sandi</th><th></th></tr></thead><tbody id="user-rows"></tbody></table></div>
      <div class="tbl-foot"><span><i class="bi bi-shield-check t-in"></i> Sandi disimpan sebagai hash bergaram · perubahan peran/hapus akun berlaku seketika</span><span class="mono" id="user-count"></span></div></div>
    <div class="card card-pad mt-24 sess-card"><div class="sess-card-ic"><i class="bi bi-shield-lock"></i></div><div class="sess-card-txt"><h3>Keamanan Sesi</h3>
        <p class="small muted">Satu akun hanya aktif di <b>satu perangkat</b> (login ganda ditanya: lanjutkan di perangkat baru atau tutup). Pengguna yang tidak beraktivitas otomatis keluar dan harus login ulang.</p></div>
      <div class="sess-card-set"><label class="field" style="margin:0"><span>Keluar otomatis bila tidak aktif</span><div class="row" style="gap:8px"><input id="sesi-idle" class="input mono" type="number" min="1" max="480" value="${esc(String(Math.round(num(st.sesi_idle_menit)) || 15))}" style="width:96px"><span class="muted">menit</span></div></label>
        <button class="btn btn-primary btn-sm" onclick="saveIdleSetting(this)"><i class="bi bi-floppy"></i>Simpan</button></div></div>
    <div class="card card-pad mt-24"><div class="card-head" style="flex-wrap:wrap"><div><h3><i class="bi bi-sliders t-primary"></i> Hak Akses per Peran</h3><p>Pilih peran, lalu atur tiap halaman: <b>Tidak</b> (tersembunyi), <b>Lihat</b> (baca saja), <b>Kelola</b> (tambah/ubah/hapus). Super Admin selalu akses penuh.</p></div>
      <div class="row"><span class="chip chip-warn" id="perm-dirty" hidden>Belum disimpan</span><button class="btn btn-ghost btn-sm" onclick="resetPerms()"><i class="bi bi-arrow-counterclockwise"></i>Default peran ini</button><button class="btn btn-primary btn-sm" onclick="savePerms()"><i class="bi bi-floppy"></i>Simpan Hak Akses</button></div></div>
      <div id="perm-editor">${permEditorHtml()}</div></div>
    <div class="card mt-24"><div class="card-head card-pad" style="margin:0;padding-bottom:12px"><div><h3><i class="bi bi-diagram-3 t-primary"></i> Ringkasan Matriks Hak Akses</h3><p><i class="bi bi-pencil-square t-in"></i> Kelola · <i class="bi bi-eye t-trf"></i> Lihat · <i class="bi bi-dash-lg muted"></i> Tidak ada</p></div></div>
      <div class="table-wrap" id="perm-matrix">${permMatrixHtml()}</div></div>`;
    setTimeout(renderUserRows, 0);
  } else if (tab === 'notifikasi') {
    const gw = st.wa_mode === 'gateway';
    body = `<div class="grid g-main" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)"><div class="card card-pad">
      <div class="card-head"><h3><i class="bi bi-envelope t-primary"></i> Email (Gmail · MailApp)</h3><span class="chip chip-in">Terhubung</span></div>
      <div class="form-grid"><label class="field"><span>Nama pengirim email</span><input id="n-sender" class="input" value="${esc(st.email_nama_pengirim)}"></label>
        <label class="field"><span>Jam eksekusi pengingat harian</span><select id="n-jam" class="select">${Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${num(st.jam_pengingat) === h ? 'selected' : ''}>${pad(h)}:00 WIB</option>`).join('')}</select></label></div>
      <p class="small muted">Sisa kuota email hari ini: <b class="mono">${S.meta.emailQuota !== undefined ? S.meta.emailQuota : '-'}</b> (akun Google biasa ±100/hari). Pengingat dikelompokkan per penerima agar hemat kuota.</p>
      <div class="card-head mt-24"><h3><i class="bi bi-whatsapp" style="color:#25D366"></i> WhatsApp</h3></div>
      <div class="grid g-2 g-tight">${[['manual', 'Tautan WhatsApp manual', 'GRATIS', 'Tombol WA di tiap tagihan membuka pesan siap kirim (wa.me). Tanpa biaya server.'], ['gateway', 'Gateway otomatis', 'LANJUTAN', 'Pengingat terkirim otomatis lewat API gateway (mis. Fonnte) via UrlFetchApp. Token aman di Script Properties.']]
        .map(([k, t, c, d]) => `<label class="budget-card" style="cursor:pointer;${(gw ? 'gateway' : 'manual') === k ? 'border-color:var(--primary);background:var(--primary-softer)' : ''}"><div class="row"><input type="radio" name="wamode" value="${k}" ${(gw ? 'gateway' : 'manual') === k ? 'checked' : ''} onchange="S.settings.wa_mode=this.value;renderPengaturan()" style="accent-color:var(--primary)"><b class="small">${t}</b><span class="chip ${k === 'manual' ? 'chip-in' : 'chip-soft'}">${c}</span></div><span class="small muted">${d}</span></label>`).join('')}</div>
      ${gw ? `<div class="form-grid mt-16"><label class="field full"><span>URL endpoint gateway</span><input id="n-url" class="input mono" value="${esc(S.meta.waGatewayUrl || 'https://api.fonnte.com/send')}"></label>
        <label class="field full"><span>Token API gateway ${S.meta.waConfigured ? '<span class="chip chip-in">tersimpan</span>' : '<span class="chip chip-warn">belum diisi</span>'}</span><input id="n-token" class="input mono" type="password" placeholder="${S.meta.waConfigured ? '•••••••• (biarkan kosong bila tidak diganti)' : 'tempel token di sini'}" autocomplete="off"><small class="field-hint">Disimpan di Script Properties, tidak pernah dikirim kembali ke browser.</small></label></div>` : ''}
      <label class="field mt-16"><span>Template pesan pengingat</span><textarea id="n-tpl" class="textarea" rows="5">${esc(st.wa_template)}</textarea><small class="field-hint">Variabel: <span class="code-chip">{nama}</span> <span class="code-chip">{jumlah}</span> <span class="code-chip">{jatuh_tempo}</span> <span class="code-chip">{sisa}</span> <span class="code-chip">{vendor}</span> <span class="code-chip">{organisasi}</span></small></label>
      <label class="field mt-16"><span>Template pengingat iuran Gathering (dikirim ke peserta)</span><textarea id="n-tpl-g" class="textarea" rows="5">${esc(st.wa_template_gathering || GAT_TPL_DEF)}</textarea><small class="field-hint">Variabel: <span class="code-chip">{nama}</span> <span class="code-chip">{acara}</span> <span class="code-chip">{jumlah}</span> <span class="code-chip">{jatuh_tempo}</span> <span class="code-chip">{sisa}</span> <span class="code-chip">{organisasi}</span></small></label>
      <div class="row-between mt-16" style="flex-wrap:wrap"><div class="row" style="flex-wrap:wrap"><input id="n-test-email" class="input" style="width:200px" placeholder="email uji"><input id="n-test-wa" class="input" style="width:150px" placeholder="08… (uji WA)"><button class="btn btn-secondary" onclick="testNotif()"><i class="bi bi-send"></i>Kirim Tes</button></div>
        ${canW() ? '<button class="btn btn-primary" onclick="saveNotif()"><i class="bi bi-floppy"></i>Simpan</button>' : ''}</div></div>
      <div class="stack"><div class="card card-pad"><div class="card-head"><h3><i class="bi bi-chat-square-text t-primary"></i> Pratinjau Pesan</h3></div>
        <div style="background:#E7F8EE;color:#0b2b18;border-radius:12px;padding:14px;white-space:pre-wrap;font-size:13px">${esc(fillWaTemplate({ nama: 'Iuran Federasi Nasional', jumlah: 5000000, jatuh_tempo: addDays(todayStr(), 3), vendor: 'DPN' }))}</div></div>
        <div class="card card-pad"><div class="row-between"><b>Google Apps Script Trigger</b><span class="chip ${S.meta.triggerActive ? 'chip-in' : 'chip-out'}">${S.meta.triggerActive ? 'Aktif' : 'Belum aktif'}</span></div>
          <p class="small muted mt-8">Fungsi <span class="code-chip">jalankanPengingatHarian()</span> berjalan setiap hari pukul ${pad(num(st.jam_pengingat || 8))}:00. ${S.meta.triggerActive ? '' : 'Jalankan <span class="code-chip">setupAppEnvironment()</span> dari editor untuk memasang trigger.'}</p></div></div></div>`;
  } else if (tab === 'data') {
    body = `<div class="grid g-2"><div class="card card-pad"><div class="card-head"><h3><i class="bi bi-database t-primary"></i> Database Google Sheets</h3></div>
      <dl class="kv"><dt>Versi aplikasi</dt><dd class="mono">${esc(S.meta.appVersion || '-')}</dd><dt>Versi data</dt><dd class="mono">#${esc(S.meta.version)}</dd>
      <dt>Jumlah transaksi</dt><dd class="mono">${fmtNum(S.db.Transaksi.length)} baris</dd><dt>Sinkron terakhir</dt><dd>${S.lastSync ? new Date(S.lastSync).toLocaleTimeString('id-ID') : '-'}</dd></dl>
      <div class="row mt-24" style="flex-wrap:wrap"><a class="btn btn-secondary" href="${esc(S.meta.spreadsheetUrl || '#')}" target="_blank" rel="noopener"><i class="bi bi-table"></i>Buka Spreadsheet</a>
      <button class="btn btn-secondary" onclick="refreshAll().then(()=>toast('Data dimuat ulang dari server.','success'))"><i class="bi bi-arrow-repeat"></i>Muat Ulang Data</button></div></div>
      <div class="card card-pad"><div class="card-head"><h3><i class="bi bi-cloud-arrow-up t-primary"></i> Cadangan</h3></div><p class="small muted">Salinan spreadsheet dibuat otomatis tiap Minggu pukul 23:00 ke folder <b>Cadangan</b> (8 terbaru disimpan).</p>
      ${isDataAdmin() ? '<button class="btn btn-primary mt-16" id="btn-backup" onclick="doBackup()"><i class="bi bi-cloud-check"></i>Cadangkan Sekarang</button>' : ''}</div></div>
      ${isDataAdmin() ? `<div class="card card-pad mt-24"><div class="card-head" style="flex-wrap:wrap"><div><h3><i class="bi bi-palette2 t-primary"></i> Format Spreadsheet</h3><p>Rapikan tampilan setiap sheet database agar mudah dibaca langsung di Google Sheets.</p></div>
        <button class="btn btn-primary" id="btn-rapikan" onclick="doRapikan()"><i class="bi bi-magic"></i>Rapikan Format Spreadsheet</button></div>
        <div class="ss-prev"><div class="ss-h">${['id', 'tanggal', 'jenis', 'jumlah', 'keterangan'].map((h) => `<span>${h}</span>`).join('')}</div>
          ${[['tra_8f2a…', '2026-11-01', 'Masuk', 'Rp 18.250.000', 'Iuran rutin anggota'], ['tra_91bc…', '2026-11-04', 'Keluar', 'Rp 5.000.000', 'Iuran federasi'], ['tra_a07d…', '2026-11-05', 'Transfer', 'Rp 3.500.000', 'Pengisian kas tunai']]
            .map((r) => `<div class="ss-r">${r.map((v, i) => `<span class="${i === 0 ? 'mute' : i === 2 ? 'st st-' + v.toLowerCase() : i === 3 ? 'mono num' : ''}">${v}</span>`).join('')}</div>`).join('')}</div>
        <ul class="small muted ss-list"><li><i class="bi bi-check2 t-in"></i> Baris judul berwarna utama aplikasi, dibekukan, dan rapi</li><li><i class="bi bi-check2 t-in"></i> Baris belang, lebar kolom proporsional, font Inter</li>
          <li><i class="bi bi-check2 t-in"></i> Nominal berformat Rupiah, status &amp; jenis berwarna (Masuk/Keluar/Lunas/Terlambat)</li><li><i class="bi bi-check2 t-in"></i> Berlaku untuk ${Object.keys(S.db).length + 3} sheet yang terhubung, termasuk Gathering &amp; Undian. Data tidak diubah.</li></ul></div>` : ''}
      <div class="card card-pad mt-24"><div class="card-head"><div><h3><i class="bi bi-clock-history t-primary"></i> Log Aktivitas (Jejak Audit)</h3><p>Semua tambah/ubah/hapus tercatat · 10 aktivitas per halaman</p></div><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn btn-secondary btn-sm" onclick="loadLog()"><i class="bi bi-arrow-repeat"></i>Muat Ulang</button>${isSuper() ? '<button class="btn btn-ghost btn-sm t-out" onclick="resetLogUi()"><i class="bi bi-archive"></i>Reset Log</button>' : ''}</div></div>${isSuper() ? logArsipInfo() : ''}<div id="log-list">${'<div class="sk" style="height:46px;margin:8px 0;border-radius:12px"></div>'.repeat(5)}</div></div>`;
    setTimeout(() => loadLog(1), 0);
  } else {
    body = `<div class="card card-pad" style="max-width:520px"><div class="card-head"><h3><i class="bi bi-key t-primary"></i> Ganti Kata Sandi</h3></div>
      <label class="field"><span>Kata sandi lama</span><input id="pw-old" type="password" class="input" autocomplete="current-password"></label>
      <label class="field"><span>Kata sandi baru</span><input id="pw-new" type="password" class="input" autocomplete="new-password" minlength="8"><small class="field-hint">Minimal 8 karakter.</small></label>
      <label class="field"><span>Ulangi kata sandi baru</span><input id="pw-new2" type="password" class="input" autocomplete="new-password"></label>
      <button class="btn btn-primary" onclick="changePwd()"><i class="bi bi-shield-check"></i>Simpan Kata Sandi</button></div>`;
  }
  $('#sec-pengaturan').innerHTML = pageHead('Pengaturan', 'Pengaturan Aplikasi', 'Kustomisasi identitas serikat, hak akses pengurus, dan konfigurasi notifikasi.', '') +
    `<div class="tabs">${tabs.map(([k, l, i]) => `<button class="${tab === k ? 'on' : ''}" onclick="S.ui.setTab='${k}';renderPengaturan()"><i class="bi ${i}"></i>${l}</button>`).join('')}</div>` + body;
  lpcMini();
}
function previewBrand() {
  const p = $('#set-p').value, a = $('#set-a').value;
  $('#set-p-hex').value = p; $('#set-a-hex').value = a;
  document.documentElement.style.setProperty('--primary', p); document.documentElement.style.setProperty('--accent', a);
  $('#mp-name').textContent = $('#set-name').value;
}
function resetBrand() { $('#set-p').value = '#6247EA'; $('#set-a').value = '#F59E0B'; previewBrand(); }
let pendingLogo = null;
function uploadLogo(input) {
  const f = input.files[0]; if (!f) return;
  prepareFile(f, 'logo').then((p) => { pendingLogo = p.thumbDataUrl; $('#set-logo').innerHTML = `<img src="${pendingLogo}" alt="Logo">`; toast('Logo siap. Klik Simpan untuk menerapkan.', 'info'); })
    .catch((e) => toast(e.message, 'error'));
}
let pendingWall = null, pendingLpWall = null;
/** tgt: 'login' (wallpaper halaman login) atau 'lp' (wallpaper landing page). */
const WPID = { login: { img: 'wp-img', st: 'wp-status', url: 'set-wp-url', op: 'set-wp-op', val: 'wp-op-val' }, lp: { img: 'lpw-img', st: 'lpw-status', url: 'set-lpw-url', op: 'set-lpw-op', val: 'lpw-op-val' } };
function previewWallpaper(tgt) {
  const id = WPID[tgt || 'login'], op = $('#' + id.op).value;
  $('#' + id.val).textContent = op + '%'; $('#' + id.img).style.opacity = op / 100;
}
function setWallpaper(url, tgt) {
  tgt = tgt || 'login'; const id = WPID[tgt];
  if (url && !/^(https:|data:image)/.test(url)) { toast('Tautan harus diawali https.', 'warning'); return; }
  if (tgt === 'lp') pendingLpWall = url; else pendingWall = url;
  $('#' + id.img).style.backgroundImage = url ? 'url("' + url.replace(/["\\]/g, '') + '")' : '';
  $('#' + id.st).textContent = url ? 'Wallpaper siap. Klik Simpan untuk menerapkan.' : 'Wallpaper akan dihapus saat disimpan.';
  if (!url && $('#' + id.url)) $('#' + id.url).value = '';
}
function uploadWallpaper(input, tgt) {
  tgt = tgt || 'login'; const id = WPID[tgt];
  const f = input.files && input.files[0]; if (!f) return;
  $('#' + id.st).innerHTML = '<span class="spin" style="width:12px;height:12px"></span> Mengompres & mengunggah…';
  prepareWallpaper(f).then((p) => {
    $('#' + id.img).style.backgroundImage = 'url("' + p.preview + '")';
    return api('uploadFile', S.token, { kind: 'wallpaper', name: f.name, mime: 'image/jpeg', data: p.data, thumb: p.thumb });
  }).then((res) => { setWallpaper(res.data.thumbUrl || '', tgt); if (!res.data.thumbUrl) toast('Gambar tidak dapat dibagikan publik. Coba tempel tautan gambar.', 'warning'); })
    .catch((e) => { $('#' + id.st).innerHTML = `<span class="t-out">${esc(e.message)}</span>`; });
}
let pendingLoginLogo = null;
function uploadLoginLogo(input) {
  const f = input.files && input.files[0]; if (!f) return;
  prepareFile(f, 'logo').then((p) => {
    pendingLoginLogo = p.thumbDataUrl;
    $('#lgm-logo').innerHTML = `<img src="${pendingLoginLogo}" alt="">`; $('#lgm-logo').classList.add('has-img');
    toast('Logo login siap. Klik Simpan untuk menerapkan.', 'info');
  }).catch((e) => toast(e.message, 'error'));
}
function removeLoginLogo() {
  pendingLoginLogo = '';
  const app = S.settings.logo_data || S.settings.link_logo;
  $('#lgm-logo').innerHTML = app ? `<img src="${esc(app)}" alt="">` : '<i class="bi bi-bank2"></i>';
  $('#lgm-logo').classList.toggle('has-img', !!app);
}
function lgPreview() { $('#lgm-title').textContent = $('#lg-f-title').value; $('#lgm-sub').textContent = $('#lg-f-sub').value; }
/** Editor landing page (Super Admin): grup lipat, gambar via unggah/tautan, pratinjau penuh. */
function lpcEditorHtml(st) {
  const c = lpcGet(st); S.lpcImg = {};
  const fld = (f) => {
    const [k, label, t, max] = f, v = c[k];
    if (t === 'img' || t === 'logo') {
      S.lpcImg[k] = v;
      const shown = v || (t === 'logo' ? st.logo_data || st.link_logo : '');
      return `<div class="lpc-img"><div class="lpc-thumb ${t === 'logo' ? 'is-logo' : ''}" id="lpci-${k}" style="${shown ? `background-image:url('${lpCss(shown)}')` : ''}">${shown ? '' : `<i class="bi ${t === 'logo' ? 'bi-bank2' : 'bi-image'}"></i>`}</div>
        <div class="lpc-img-r"><span class="lpc-lbl">${esc(label)}</span>
          <div class="row" style="gap:6px;flex-wrap:wrap"><label class="btn btn-secondary btn-sm"><i class="bi bi-upload"></i>Unggah<input type="file" accept="image/jpeg,image/png,image/webp" hidden onchange="lpcUpload(this, '${k}')"></label>
            <button type="button" class="btn btn-ghost btn-sm t-out" onclick="lpcSetImg('${k}', '')"><i class="bi bi-trash"></i>Hapus</button></div>
          ${t === 'img' ? `<input class="input" id="lpcu-${k}" placeholder="atau tempel tautan gambar https" value="${esc(String(v).indexOf('data:') === 0 ? '' : v)}" onchange="lpcSetImg('${k}', this.value.trim())">` : ''}
          <small class="field-hint" id="lpcs-${k}">${t === 'logo' ? 'PNG/JPG persegi, dikecilkan otomatis.' : v ? 'Gambar aktif.' : 'Kosong = ilustrasi ikon bawaan.'}</small></div></div>`;
    }
    const input = t === 'a' ? `<textarea id="lpc-${k}" class="textarea" rows="3" maxlength="${max}" oninput="lpcMini()">${esc(v)}</textarea>`
      : `<input id="lpc-${k}" class="input" ${t === 'u' ? 'type="url" placeholder="awali dengan https"' : ''} maxlength="${max}" value="${esc(v)}" oninput="lpcMini()">`;
    return `<label class="field ${t === 'a' ? 'lpc-wide' : ''}" style="margin:0"><span>${esc(label)}</span>${input}</label>`;
  };
  const op = lpVal(st, 'lp_bg_opacity');
  return `<div class="card card-pad" id="lpc-form"><div class="card-head"><div><h3><i class="bi bi-window-desktop t-primary"></i> Landing Page (Halaman Depan)</h3><p>Wallpaper, opacity, logo, gambar, dan seluruh tulisan di halaman depan</p></div><span class="chip chip-soft">SUPER ADMIN</span></div>
    <div class="grid g-2 g-tight" style="align-items:start">
      <div class="lpm2"><div class="lpm2-bar"><span class="lpm2-logo" id="lpm2-logo"></span><b id="lpm2-name"></b><i></i><i></i><i></i><span class="lpm2-pill"></span></div>
        <div class="lpm2-hero"><div class="lpm2-bg" id="lpw-img" style="${st.lp_bg ? `background-image:url('${lpCss(st.lp_bg)}');` : ''}opacity:${num(op) / 100}"></div><div class="lpm2-shade"></div>
          <div class="lpm2-in"><small id="lpm2-eb"></small><b id="lpm2-title"></b><span class="lpm2-btn" id="lpm2-btn"></span></div><div class="lpm2-card"><b id="lpm2-stat"></b></div></div></div>
      <div class="stack" style="gap:12px">
        <div class="field-label" style="margin:0">Wallpaper hero</div>
        <div class="row" style="flex-wrap:wrap"><label class="btn btn-secondary btn-sm"><i class="bi bi-upload"></i>Unggah Wallpaper<input type="file" accept="image/jpeg,image/png,image/webp" hidden onchange="uploadWallpaper(this, 'lp')"></label>
          <button class="btn btn-ghost btn-sm t-out" onclick="setWallpaper('', 'lp')"><i class="bi bi-trash"></i>Hapus</button></div>
        <small class="field-hint" id="lpw-status">${st.lp_bg ? 'Wallpaper aktif.' : 'Belum ada wallpaper (latar gelap bawaan).'} Gunakan foto lanskap ≥ 1600px.</small>
        <label class="field" style="margin:0"><span>atau tautan gambar (https)</span><input id="set-lpw-url" class="input" placeholder="https:&#47;&#47;…" value="${esc(String(st.lp_bg || '').indexOf('data:') === 0 ? '' : st.lp_bg || '')}" onchange="setWallpaper(this.value.trim(), 'lp')"></label>
        <label class="field" style="margin:0"><span class="row-between">Opacity wallpaper <b class="mono" id="lpw-op-val">${esc(op)}%</b></span>
          <input type="range" min="0" max="100" step="5" class="range" id="set-lpw-op" value="${esc(op)}" oninput="previewWallpaper('lp')"></label>
        <small class="field-hint">0% = tidak terlihat · 100% = gambar penuh (lapisan gelap tetap menjaga tulisan terbaca).</small>
      </div></div>
    <div class="lpc-groups mt-16">${LPC_GROUPS.map((g, i) => `<details class="lpc-grp" ${i === 1 ? 'open' : ''}><summary><i class="bi ${g.icon} t-primary"></i><b>${esc(g.title)}</b><span class="muted small">${g.fields.length} isian</span><i class="bi bi-chevron-down lpc-chev"></i></summary>
      <div class="lpc-body">${g.fields.map(fld).join('')}</div></details>`).join('')}</div>
    <div class="row-between mt-16" style="flex-wrap:wrap;gap:10px"><small class="muted">Isian yang dikosongkan akan disembunyikan dari halaman depan. Klik "Simpan Perubahan Identitas" untuk menerapkan.</small>
      <div class="row" style="gap:8px"><button class="btn btn-ghost btn-sm" onclick="lpcReset()"><i class="bi bi-arrow-counterclockwise"></i>Teks bawaan</button><button class="btn btn-secondary btn-sm" onclick="lpcPreview()"><i class="bi bi-eye"></i>Pratinjau Halaman Depan</button></div></div>
  </div>`;
}
function readLpc() {
  const out = {};
  Object.keys(LPC_DEF).forEach((k) => {
    const t = LPC_TYPE[k];
    let v;
    if (t === 'img' || t === 'logo') v = S.lpcImg && S.lpcImg[k] !== undefined ? S.lpcImg[k] : LPC_DEF[k];
    else { const el = $('#lpc-' + k); v = el ? el.value.trim() : LPC_DEF[k]; }
    if (v !== LPC_DEF[k]) out[k] = v;
  });
  return out;
}
function lpcMini() {
  if (!$('#lpm2-title')) return;
  const st = S.settings || {}, g = (k) => { const el = $('#lpc-' + k); return el ? el.value.trim() : ''; };
  const logo = (S.lpcImg && S.lpcImg.logo) || st.logo_data || st.link_logo;
  $('#lpm2-logo').innerHTML = logo ? `<img src="${esc(logo)}" alt="">` : '<i class="bi bi-bank2"></i>';
  $('#lpm2-name').textContent = g('nama') || st.nama_aplikasi || 'KASBURUH';
  $('#lpm2-eb').textContent = g('hero_eyebrow');
  $('#lpm2-title').innerHTML = esc(g('hero_j1')) + ' <u>' + esc(g('hero_jline')) + '</u> ' + esc(g('hero_j2'));
  $('#lpm2-btn').textContent = g('hero_btn') || 'Masuk';
  $('#lpm2-stat').textContent = g('hero_stat');
}
function lpcSetImg(k, url) {
  if (url && !/^(https:|data:image)/.test(url)) { toast('Tautan gambar harus diawali https.', 'warning'); return; }
  if (url && url.indexOf('data:') === 0 && LPC_TYPE[k] !== 'logo') { toast('Gunakan tombol Unggah atau tautan https.', 'warning'); return; }
  S.lpcImg[k] = url;
  const th = $('#lpci-' + k), st = S.settings || {};
  const shown = url || (LPC_TYPE[k] === 'logo' ? st.logo_data || st.link_logo : '');
  th.style.backgroundImage = shown ? "url('" + lpCss(shown) + "')" : '';
  th.innerHTML = shown ? '' : `<i class="bi ${LPC_TYPE[k] === 'logo' ? 'bi-bank2' : 'bi-image'}"></i>`;
  if (!url && $('#lpcu-' + k)) $('#lpcu-' + k).value = '';
  $('#lpcs-' + k).textContent = url ? 'Gambar siap. Klik Simpan untuk menerapkan.' : 'Gambar akan dihapus saat disimpan.';
  if (k === 'logo') lpcMini();
}
function lpcUpload(input, k) {
  const f = input.files && input.files[0]; if (!f) return;
  const st = $('#lpcs-' + k);
  if (LPC_TYPE[k] === 'logo') {
    prepareFile(f, 'logo').then((p) => lpcSetImg(k, p.thumbDataUrl)).catch((e) => toast(e.message, 'error'));
    return;
  }
  st.innerHTML = '<span class="spin" style="width:12px;height:12px"></span> Mengompres & mengunggah…';
  prepareWallpaper(f).then((p) => {
    $('#lpci-' + k).style.backgroundImage = 'url("' + p.preview + '")'; $('#lpci-' + k).innerHTML = '';
    return api('uploadFile', S.token, { kind: 'wallpaper', name: f.name, mime: 'image/jpeg', data: p.data, thumb: p.thumb });
  }).then((res) => {
    if (res.data.thumbUrl) lpcSetImg(k, res.data.thumbUrl);
    else { st.innerHTML = '<span class="t-out">Gambar tidak dapat dibagikan publik. Tempel tautan gambar https.</span>'; }
  }).catch((e) => { st.innerHTML = `<span class="t-out">${esc(e.message)}</span>`; });
  input.value = '';
}
function lpcReset() {
  Object.keys(LPC_DEF).forEach((k) => {
    const t = LPC_TYPE[k];
    if (t === 'img' || t === 'logo') return;
    const el = $('#lpc-' + k); if (el) el.value = LPC_DEF[k];
  });
  lpcMini(); toast('Teks bawaan dipulihkan (gambar tidak diubah). Klik Simpan untuk menerapkan.', 'info');
}
function lpcPreview() {
  const st = Object.assign({}, S.settings, { lp_config: JSON.stringify(readLpc()), lp_bg: pendingLpWall !== null ? pendingLpWall : S.settings.lp_bg, lp_bg_opacity: $('#set-lpw-op').value });
  S.lpPreviewing = true; S.lpReturnY = window.scrollY;
  applyLanding(st); showView('view-landing'); $('#lp-prevbar').hidden = false; window.scrollTo(0, 0);
}
function lpcBack() {
  S.lpPreviewing = false; $('#lp-prevbar').hidden = true;
  showView('view-app'); applyLanding(S.settings);
  setTimeout(() => window.scrollTo(0, S.lpReturnY || 0), 0);
}
/** Wallpaper: 1920px JPEG (diunggah ke Drive) + cadangan kecil 640px bila Drive menolak berbagi publik. */
function prepareWallpaper(file) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onerror = () => reject(new Error('Gagal membaca gambar.'));
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const draw = (max, q) => { const r = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas');
          c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); };
        const main = draw(1920, 0.8), small = draw(640, 0.5);
        resolve({ data: main.split(',')[1], thumb: small.split(',')[1], preview: small });
      };
      img.onerror = () => reject(new Error('File bukan gambar yang valid.'));
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
}
/** Perbesar / perkecil logo (60%–200%), pratinjau langsung; tersimpan lewat "Simpan Perubahan Identitas". */
function logoZoom(delta, val) {
  const r = $('#set-logo-k'); if (!r) return;
  const v = Math.max(60, Math.min(200, Math.round((val !== undefined ? num(val) : num(r.value) + delta) / 10) * 10));
  r.value = v; $('#logo-k-val').textContent = v + '%';
  document.documentElement.style.setProperty('--logo-k', String(v / 100));
}
function removeLogo() { pendingLogo = ''; $('#set-logo').innerHTML = '<i class="bi bi-bank2"></i>'; }
function saveBrand() {
  const data = { nama_aplikasi: $('#set-name').value.trim() || 'KASBURUH', subjudul: $('#set-sub').value.trim(), warna_utama: $('#set-p').value, warna_aksen: $('#set-a').value,
    mode_default: ($('#set-mode .on') || {}).dataset ? $('#set-mode .on').dataset.v : 'light' };
  if (pendingLogo !== null) { data.logo_data = pendingLogo; data.link_logo = ''; }
  if ($('#set-logo-k')) data.logo_skala = String($('#set-logo-k').value);
  if (pendingWall !== null) data.login_bg = pendingWall;
  if ($('#set-wp-op')) data.login_bg_opacity = $('#set-wp-op').value;
  if (pendingLpWall !== null) data.lp_bg = pendingLpWall;
  if (pendingLoginLogo !== null) data.login_logo = pendingLoginLogo;
  if ($('#lg-f-title')) {
    const f1 = $('#lg-f-foot1').value.trim().split('|').join(' '), f2 = $('#lg-f-foot2').value.trim().split('|').join(' ');
    Object.assign(data, { login_judul: $('#lg-f-title').value.trim(), login_sub: $('#lg-f-sub').value.trim(), login_catatan: f1 || f2 ? f1 + (f2 ? '|' + f2 : '') : '' });
  }
  if ($('#lpc-form')) { data.lp_bg_opacity = $('#set-lpw-op').value; data.lp_config = JSON.stringify(readLpc()); }
  const prev = Object.assign({}, S.settings);
  Object.assign(S.settings, data); applyBrand(S.settings); saveSnapshot(); pendingLogo = null; pendingWall = null; pendingLpWall = null; pendingLoginLogo = null;
  toast('Identitas diterapkan.', 'success', 'Berhasil disimpan');
  enqueue(() => api('savePengaturan', S.token, data).then((res) => { S.settings = res.data.settings; S.meta.version = res.data.version; })
    .catch((e) => { S.settings = prev; applyBrand(prev); toast(e.message, 'error', 'Gagal menyimpan pengaturan'); }));
}
function saveNotif() {
  const data = { email_nama_pengirim: $('#n-sender').value.trim(), jam_pengingat: $('#n-jam').value, wa_template: $('#n-tpl').value, wa_mode: S.settings.wa_mode === 'gateway' ? 'gateway' : 'manual' };
  if ($('#n-tpl-g')) data.wa_template_gathering = $('#n-tpl-g').value;
  if ($('#n-token') && $('#n-token').value.trim()) data.wa_token = $('#n-token').value.trim();
  if ($('#n-url')) data.wa_gateway_url = $('#n-url').value.trim();
  enqueue(() => api('savePengaturan', S.token, data).then((res) => {
    S.settings = res.data.settings; S.meta.waConfigured = res.data.waConfigured; S.meta.waGatewayUrl = data.wa_gateway_url || S.meta.waGatewayUrl; S.meta.triggerActive = true;
    saveSnapshot(); toast('Pengaturan notifikasi disimpan.', 'success'); renderPengaturan();
  }).catch((e) => toast(e.message, 'error')));
}
function testNotif() {
  const email = $('#n-test-email').value.trim(), wa = $('#n-test-wa').value.trim();
  if (!email && !wa) { toast('Isi email atau nomor WA untuk uji.', 'warning'); return; }
  api('tesNotifikasi', S.token, { email, wa }).then((res) => toast(res.message, 'success')).catch((e) => toast(e.message, 'error'));
}
function doBackup() {
  const b = $('#btn-backup'); b.disabled = true; b.innerHTML = '<span class="spin"></span> Mencadangkan…';
  api('buatCadangan', S.token).then((res) => toast(res.message, 'success')).catch((e) => toast(e.message, 'error'))
    .finally(() => { b.disabled = false; b.innerHTML = '<i class="bi bi-cloud-check"></i>Cadangkan Sekarang'; });
}
function changePwd() {
  const o = $('#pw-old').value, n = $('#pw-new').value, n2 = $('#pw-new2').value;
  if (n.length < 8) return toast('Kata sandi baru minimal 8 karakter.', 'warning');
  if (n !== n2) return toast('Konfirmasi kata sandi tidak sama.', 'warning');
  api('changeOwnPassword', S.token, o, n).then((res) => { toast(res.message, 'success'); ['#pw-old', '#pw-new', '#pw-new2'].forEach((s) => { $(s).value = ''; }); }).catch((e) => toast(e.message, 'error'));
}
const ROLE_LIST = [['Super Admin', 'bi-shield-lock'], ['Ketua', 'bi-person-badge'], ['Wakil Ketua', 'bi-person-badge-fill'], ['Bendahara', 'bi-wallet2'],
  ['Sekretaris', 'bi-journal-text'], ['Humas & Publikasi', 'bi-megaphone'], ['Sosial & Agama', 'bi-heart'], ['OR & Seni', 'bi-trophy'], ['Advokasi & Hukum', 'bi-briefcase'], ['Anggota', 'bi-people']];
const PAGE_META = [['ringkasan', 'Ringkasan', 'Dasbor & KPI'], ['transaksi', 'Transaksi', 'Buku kas masuk/keluar'], ['dompet', 'Dompet', 'Rekening, e-wallet, kas tunai'],
  ['kategori', 'Kategori', 'Kategori transaksi & aset'], ['anggaran', 'Anggaran', 'Pagu per kategori'], ['tabungan', 'Tabungan', 'Target dana cadangan'],
  ['tagihan', 'Tagihan', 'Kewajiban & pengingat'], ['inventaris', 'Inventaris', 'Aset fisik & foto'], ['peminjaman', 'Peminjaman', 'Pinjam barang & surat'],
  ['anggota', 'Anggota', 'Data anggota & kontak'], ['laporan', 'Laporan', 'Rekap & ekspor Excel/PDF'],
  ['gathering', 'Gathering', 'Iuran peserta & pengingat'], ['undian', 'Spin Wheel', 'Undian doorprize']];
const editableRoles = () => ROLE_LIST.map((r) => r[0]).filter((r) => r !== 'Super Admin');
function permEditorHtml() {
  const role = S.ui.permRole || 'Anggota', pr = (S.permEdit || {})[role] || {};
  return `<div class="perm-roles" role="tablist">${editableRoles().map((r) => `<button type="button" class="${r === role ? 'on' : ''}" onclick="S.ui.permRole=this.dataset.r;$('#perm-editor').innerHTML=permEditorHtml()" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div>
    <div class="perm-list">${PAGE_META.map(([k, l, d]) => `<div class="perm-item"><div><b>${l}</b><small>${d}</small></div><div class="seg light">${[[0, 'Tidak'], [1, 'Lihat'], [2, 'Kelola']].map(([v, t]) =>
      `<button type="button" class="lv${v} ${Number(pr[k] || 0) === v ? 'on' : ''}" onclick="setPerm('${k}', ${v})">${t}</button>`).join('')}</div></div>`).join('')}</div>`;
}
function permMatrixHtml() {
  const ic = (v) => (v === 2 ? '<i class="bi bi-pencil-square t-in" title="Kelola"></i>' : v === 1 ? '<i class="bi bi-eye t-trf" title="Lihat"></i>' : '<i class="bi bi-dash-lg muted" title="Tidak ada"></i>');
  return `<table class="tbl role-matrix"><thead><tr><th>Peran</th>${PAGE_META.map((m) => `<th>${m[1]}</th>`).join('')}</tr></thead><tbody>
    <tr><td><b>Super Admin</b></td>${PAGE_META.map(() => `<td>${ic(2)}</td>`).join('')}</tr>
    ${editableRoles().map((r) => `<tr><td><b>${esc(r)}</b></td>${PAGE_META.map((m) => `<td>${ic(Number(((S.permEdit || {})[r] || {})[m[0]] || 0))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function saveIdleSetting(btn) {
  const v = Math.round(num($('#sesi-idle').value));
  if (v < 1 || v > 480) { toast('Isi antara 1 sampai 480 menit.', 'warning'); return; }
  btn.disabled = true;
  api('savePengaturan', S.token, { sesi_idle_menit: String(v) }).then((res) => { S.settings = res.data.settings; saveSnapshot(); idleTouch(true); toast('Keluar otomatis diatur ' + v + ' menit tanpa aktivitas.', 'success'); })
    .catch((e) => toast(e.message, 'error')).finally(() => { btn.disabled = false; });
}
function setPerm(page, v) {
  const role = S.ui.permRole || 'Anggota';
  S.permEdit[role] = Object.assign({}, S.permEdit[role] || {}, { [page]: v });
  $('#perm-editor').innerHTML = permEditorHtml(); $('#perm-matrix').innerHTML = permMatrixHtml(); $('#perm-dirty').hidden = false;
}
function resetPerms() {
  const role = S.ui.permRole || 'Anggota';
  if (S.defaultPerms && S.defaultPerms[role]) S.permEdit[role] = clone(S.defaultPerms[role]);
  $('#perm-editor').innerHTML = permEditorHtml(); $('#perm-matrix').innerHTML = permMatrixHtml(); $('#perm-dirty').hidden = false;
}
function savePerms() {
  const data = {}; editableRoles().forEach((r) => { if (S.permEdit[r]) data[r] = S.permEdit[r]; });
  api('savePengaturan', S.token, { hak_akses: JSON.stringify(data) }).then((res) => {
    S.permsAll = res.data.permsAll; S.permEdit = clone(S.permsAll); S.settings = res.data.settings; saveSnapshot();
    $('#perm-dirty').hidden = true; $('#perm-matrix').innerHTML = permMatrixHtml();
    toast('Hak akses disimpan. Berlaku seketika untuk semua pengguna.', 'success');
  }).catch((e) => toast(e.message, 'error', 'Gagal menyimpan hak akses'));
}
function deleteUserUi(id) {
  const u = S.users.find((x) => x.id === id); if (!u) return;
  confirmDlg(`Hapus akun ${u.nama} (${u.username})? Akun tidak bisa login lagi dan tindakan tercatat di log audit.`, { ok: 'Hapus Akun', danger: true, title: 'Hapus Pengguna' }).then((yes) => {
    if (!yes) return;
    api('deleteUser', S.token, id).then((res) => { S.users = S.users.filter((x) => x.id !== id); saveSnapshot(); renderPengaturan(); toast(res.message, 'success'); })
      .catch((e) => toast(e.message, 'error'));
  });
}
const userSearch = debounce((v) => { S.ui.userQ = v; renderUserRows(); }, 150);
function renderUserRows() {
  const tb = $('#user-rows'); if (!tb) return;
  const q = String(S.ui.userQ || '').toLowerCase(), rf = S.ui.userRole || '';
  const order = {}; ROLE_LIST.forEach((r, i) => { order[r[0]] = i; });
  const list = S.users.filter((u) => (!rf || u.peran === rf) && (!q || (u.nama + ' ' + u.username + ' ' + (u.npp || '') + ' ' + (u.jabatan || '')).toLowerCase().indexOf(q) >= 0))
    .sort((a, b) => (order[a.peran] - order[b.peran]) || String(a.nama).localeCompare(b.nama));
  tb.innerHTML = list.slice(0, 300).map((u) => `<tr><td data-m="full"><div class="row" style="gap:10px"><span class="avatar">${initials(u.nama)}</span><div style="min-width:0"><b>${esc(u.nama)}</b>${u.id === S.user.id ? ' <span class="chip chip-soft">Anda</span>' : ''}<div class="t-sub">${u.jabatan ? `<i class="bi bi-briefcase"></i> ${esc(u.jabatan)}` : '<span class="t-warn"><i class="bi bi-exclamation-triangle"></i> Jabatan belum diisi</span>'} · sejak ${fmtDate(u.dibuat_pada)}</div></div></div></td>
    <td class="mono">${esc(u.username)}</td>
    <td><select class="select" style="height:34px;min-width:140px" aria-label="Peran ${esc(u.nama)}" onchange="quickRole('${u.id}', this)" ${u.id === S.user.id ? 'disabled title="Tidak dapat mengubah peran sendiri"' : ''}>${ROLE_LIST.map(([r]) => `<option ${u.peran === r ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
    <td><span class="chip ${u.status === 'Aktif' ? 'chip-in' : 'chip-mute'}">${esc(u.status)}</span></td>
    <td data-m="hide">${u.wajib_ganti ? '<span class="chip chip-warn">Belum diganti</span>' : '<span class="chip chip-mute">Pribadi</span>'}</td>
    <td data-m="full"><div class="row-actions"><button class="btn btn-secondary btn-sm" onclick="resetUserPwd('${u.id}')"><i class="bi bi-key"></i>Reset</button><button class="btn btn-secondary btn-sm" onclick="openUserForm('${u.id}')"><i class="bi bi-pencil"></i>Ubah</button>${u.id !== S.user.id ? `<button class="btn-icon sm t-out" title="Hapus akun" aria-label="Hapus akun ${esc(u.nama)}" onclick="deleteUserUi('${u.id}')"><i class="bi bi-trash"></i></button>` : ''}</div></td></tr>`).join('')
    || `<tr><td colspan="6">${emptyState('bi-people', 'Tidak ada pengguna')}</td></tr>`;
  $('#user-count').textContent = 'Menampilkan ' + Math.min(300, list.length) + ' dari ' + S.users.length + ' akun';
}
function quickRole(id, sel) {
  const u = S.users.find((x) => x.id === id); const peran = sel.value;
  if (!u || u.peran === peran) return;
  if (!u.jabatan) { toast('Lengkapi Jabatan ' + u.nama + ' terlebih dahulu lewat tombol Ubah.', 'warning'); sel.value = u.peran; openUserForm(id); return; }
  if (peran === 'Anggota' && !/^\d{5}$/.test(String(u.username))) {
    toast('Role Anggota butuh username 5 digit angka. Ubah username lewat tombol Ubah.', 'warning'); sel.value = u.peran; return;
  }
  confirmDlg(`Ubah peran ${u.nama} dari ${u.peran} menjadi ${peran}? Hak aksesnya langsung berubah.`, { ok: 'Ubah Peran' }).then((yes) => {
    if (!yes) { sel.value = u.peran; return; }
    sel.disabled = true;
    api('saveUser', S.token, Object.assign({}, u, { peran }), '').then((res) => {
      Object.assign(u, res.data.user); saveSnapshot(); renderPengaturan(); toast('Peran diperbarui.', 'success');
    }).catch((e) => { sel.value = u.peran; sel.disabled = false; toast(e.message, 'error'); });
  });
}
function openUserForm(id) {
  const rec = id ? clone(S.users.find((u) => u.id === id)) : { peran: 'Anggota', status: 'Aktif' };
  FORM = { fields: [
    { k: 'nama', label: 'Nama lengkap', req: true, full: true },
    { k: 'jabatan', label: 'Jabatan', req: true, ph: 'contoh: Branch Manager, Supervisor, Wakil Pemimpin', hint: 'Jabatan pekerjaan anggota. Tidak memengaruhi hak akses.' },
    { k: 'peran', label: 'Peran (hak akses)', type: 'select', opts: ROLE_LIST.map(([r]) => [r, r]), hint: 'Anggota hanya dapat melihat Ringkasan & Peminjaman.' },
    { k: 'username', label: 'Username / NPP', req: true, ph: 'Anggota: 5 digit, mis. 67221' },
    { k: 'email', label: 'Email (penerima pengingat)', type: 'email', show: (r) => r.peran !== 'Anggota' },
    { k: 'wa', label: 'No. WhatsApp', type: 'tel', ph: '08…', show: (r) => r.peran !== 'Anggota' },
    { k: 'status', label: 'Status', type: 'select', opts: [['Aktif', 'Aktif'], ['Nonaktif', 'Nonaktif']] },
    { k: 'password', label: 'Kata sandi awal (opsional)', type: 'password', show: (r) => !id && r.peran !== 'Anggota', hint: 'Kosongkan agar dibuatkan otomatis.' }
  ], uploads: {}, onChange: (r) => {
    const h = $('#dyn-form [data-f="username"] .field-hint') || (() => { const el = document.createElement('small'); el.className = 'field-hint'; const w = $('#dyn-form [data-f="username"]'); if (w) w.appendChild(el); return el; })();
    if (h) h.textContent = r.peran === 'Anggota' ? 'Wajib 5 digit angka (NPP). Sandi awal = NPP, diganti saat login pertama.' : '3-30 karakter: huruf kecil, angka, titik, garis bawah.';
  } };
  openModal({ title: id ? 'Ubah Pengguna' : 'Tambah Pengguna', body: buildForm(FORM.fields, rec),
    foot: '<button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-user">Simpan</button>' });
  formReflow();
  $('#btn-user').onclick = () => {
    const d = readForm(); if (!validateForm(d)) return;
    d.jabatan = String(d.jabatan || '').trim();
    if (!d.jabatan) { toast('Jabatan wajib diisi (contoh: Branch Manager).', 'warning'); return; }
    d.username = String(d.username).trim().toLowerCase();
    if (d.peran === 'Anggota' && !/^\d{5}$/.test(d.username)) { toast('Username role Anggota wajib 5 digit angka (contoh 67221).', 'warning'); return; }
    const pw = d.password; delete d.password;
    const b = $('#btn-user'); b.disabled = true; b.innerHTML = '<span class="spin"></span>';
    api('saveUser', S.token, Object.assign({}, rec, d), pw || '').then((res) => {
      const i = S.users.findIndex((u) => u.id === res.data.user.id); if (i >= 0) S.users[i] = res.data.user; else S.users.push(res.data.user);
      if (res.data.user.id === S.user.id) { S.user.jabatan = res.data.user.jabatan || ''; S.user.nama = res.data.user.nama || S.user.nama; renderUserChrome(); }
      closeModal(); renderPengaturan(); saveSnapshot();
      if (res.data.password) showPassword(res.data.user.username, res.data.password);
      else if (res.data.defaultIsUsername) showPassword(res.data.user.username, res.data.user.username, true);
      else toast(res.message, 'success');
    }).catch((e) => { b.disabled = false; b.textContent = 'Simpan'; toast(e.message, 'error'); });
  };
}
function resetUserPwd(id) {
  const u = S.users.find((x) => x.id === id);
  const msg = u.peran === 'Anggota' ? `Kembalikan sandi ${u.nama} ke default (sama dengan NPP ${u.username})? Ia wajib menggantinya saat login.` : `Buat kata sandi baru untuk ${u.nama}? Sandi lama tidak berlaku lagi.`;
  confirmDlg(msg, { ok: 'Reset Sandi', danger: true }).then((yes) => {
    if (!yes) return;
    api('resetPasswordUser', S.token, id).then((res) => {
      if (res.data.isDefault) { u.wajib_ganti = true; renderUserRows(); }
      showPassword(u.username, res.data.password, res.data.isDefault);
    }).catch((e) => toast(e.message, 'error'));
  });
}
function showPassword(user, pwd, isDefault) {
  openModal({ title: 'Kata Sandi Sementara', size: 'sm', body: `<p>${isDefault ? `Sandi awal akun <b>${esc(user)}</b> sama dengan username/NPP-nya. Pengguna <b>wajib membuat sandi baru</b> saat login pertama.` : `Sampaikan secara pribadi kepada pengguna <b>${esc(user)}</b>. Kata sandi ini hanya ditampilkan sekali.`}</p>
    <div class="budget-card mt-16 center"><span class="mono" style="font-size:22px;font-weight:600;letter-spacing:.05em">${esc(pwd)}</span></div>`,
    foot: `<button class="btn btn-secondary" onclick="navigator.clipboard&&navigator.clipboard.writeText('${esc(pwd)}').then(()=>toast('Tersalin.','success'))"><i class="bi bi-clipboard"></i>Salin</button><button class="btn btn-primary" onclick="closeModal()">Selesai</button>` });
}

// Mulai aplikasi (dipanggil paling akhir agar semua fungsi & konstanta sudah terdefinisi)
boot();
