/* ============================================================
   KASBURUH — Penghubung ke server Google Apps Script (REST API JSON)
   ------------------------------------------------------------
   Menggantikan google.script.run. Semua panggilan memakai fetch():
     • POST  GAS_URL   body {"action": "...", "args": [...]}   → fungsi aplikasi (login, simpan, dll.)
     • GET   GAS_URL?action=landing | ttd&t=KODE | info       → data publik
   Content-Type WAJIB "text/plain;charset=utf-8": dengan application/json browser mengirim
   CORS preflight (OPTIONS) yang tidak didukung Apps Script, sehingga permintaan gagal.
   ============================================================ */
(function () {
  'use strict';
  var CFG = window.KASBURUH_CONFIG || {};
  var URL_GAS = String(CFG.GAS_URL || '').trim();
  var TIMEOUT_MS = 120000;   // Apps Script bisa berjalan lama (impor besar, cadangan); batas aman 2 menit

  /** Pesan ramah untuk kegagalan jaringan / CORS (fetch hanya memberi "Failed to fetch"). */
  function netError(err, aborted) {
    if (aborted) return new Error('Server Apps Script tidak merespons dalam 2 menit. Periksa koneksi lalu coba lagi.');
    if (!navigator.onLine) return new Error('Tidak ada koneksi internet. Periksa jaringan lalu coba lagi.');
    var e = new Error('Tidak bisa terhubung ke server Apps Script. Periksa koneksi internet. Bila terus terjadi: pastikan URL di js/config.js benar dan deployment Apps Script diatur "Jalankan sebagai: Saya" + "Akses: Siapa saja".');
    e.network = true; e.cause = err;
    return e;
  }

  function withTimeout(promiseFactory) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : 0;
    return promiseFactory(ctl ? ctl.signal : undefined).then(function (res) {
      clearTimeout(timer);
      return res.text().then(function (txt) {
        var data;
        try { data = JSON.parse(txt); }
        catch (e) {
          // Apps Script mengirim halaman HTML (bukan JSON) bila deployment tidak publik atau Kode.gs masih versi lama
          throw new Error(/<html|<!doctype/i.test(txt)
            ? 'Server membalas halaman HTML, bukan data JSON. Pastikan Kode.gs versi 2.0.0 sudah disimpan, deployment memakai "Versi baru", dan aksesnya "Siapa saja".'
            : 'Respons server tidak valid (' + res.status + ').');
        }
        return data;
      });
    }, function (err) {
      clearTimeout(timer);
      throw netError(err, err && err.name === 'AbortError');
    });
  }

  var KB_API = {
    /** URL /exec yang dipakai (dari js/config.js). */
    url: URL_GAS,
    /** true bila GAS_URL sudah diisi dengan URL yang masuk akal. */
    configured: function () {
      return /^https?:\/\/[^\s]+$/i.test(URL_GAS) && !/GANTI_DENGAN/i.test(URL_GAS);
    },
    /** Panggil fungsi aplikasi: KB_API.call('login', ['npp', 'sandi', {...}]) → Promise<{success, data, message, code}> */
    call: function (action, args) {
      var body = JSON.stringify({ action: action, args: args || [] });
      return withTimeout(function (signal) {
        return fetch(URL_GAS, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // jangan diganti application/json (CORS)
          body: body,
          redirect: 'follow',
          credentials: 'omit',
          cache: 'no-store',
          signal: signal
        });
      });
    },
    /** Data publik lewat GET: KB_API.get('landing') / KB_API.get('ttd', {t: 'KODE'}) */
    get: function (action, params) {
      var q = '?action=' + encodeURIComponent(action);
      Object.keys(params || {}).forEach(function (k) { q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); });
      var once = function () {
        return withTimeout(function (signal) {
          return fetch(URL_GAS + q, { method: 'GET', redirect: 'follow', credentials: 'omit', cache: 'no-store', signal: signal });
        });
      };
      // GET aman diulang sekali bila jaringan sempat putus
      return once().catch(function (e) { if (e && e.network) return new Promise(function (r) { setTimeout(r, 800); }).then(once); throw e; });
    }
  };
  window.KB_API = KB_API;
})();
