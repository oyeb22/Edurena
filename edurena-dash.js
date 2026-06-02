/**
 * edurena-dash.js — v5.2.1
 * Shared bootstrap for ALL Edurena dashboard + staff HTML pages on GitHub Pages.
 *
 * HOW IT WORKS:
 *   GAS only runs doPost (the API). All HTML lives on GitHub Pages.
 *   Pages need to know the GAS URL. Resolution order:
 *     1. ?script= URL parameter (wins — used by GAS redirects + cross-page links)
 *     2. localStorage cache from a previous visit
 *     3. BOOTSTRAP_URL hardcoded below (first-time visitors)
 *
 * AFTER EVERY GAS REDEPLOY:
 *   Run `printDeploymentInfo()` in the Apps Script editor.
 *   Update BOOTSTRAP_URL below with the printed URL.
 *   Commit + push. Done — one file, one line.
 *
 * EXPOSES:
 *   DASH.scriptUrl          — GAS deployment URL
 *   DASH.superadminEmail    — from ?page=config
 *   DASH.examPageUrl        — full URL to Exam.html on GitHub
 *   DASH.kahootPageUrl      — full URL to kahoot.html on GitHub
 *   DASH.racePageUrl        — full URL to race.html on GitHub
 *   DASH.post(action, data) — Promise-based POST to GAS
 *   DASH.callRaw(a, d, cb)  — callback-style POST (legacy compat)
 *   DASH.goLogin()          — redirect to TeacherLogin.html (with ?script= preserved)
 *   DASH.pageUrl(page)      — build GitHub URL for any page with ?script= appended
 *   DASH.ready              — Promise resolves when config loaded
 */
(function(window) {
  'use strict';

  // ════════════════════════════════════════════════════════════════════
  // ↓↓↓  THE ONE LINE YOU UPDATE AFTER EACH GAS REDEPLOY  ↓↓↓
  // ════════════════════════════════════════════════════════════════════
  var BOOTSTRAP_URL = 'https://script.google.com/macros/s/AKfycbzpche3AL4hntlg1-GtzEYh44yCP4pz5Ug21TXK8lqRWp5QmfQSpP4rM1in6yYSJPTu0g/exec';
  // ════════════════════════════════════════════════════════════════════

  var STORAGE_KEY = 'edurena_script_url';

  // ── Parse URL params ──────────────────────────────────────────────────
  var _params = {};
  window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, k, v) {
    _params[k] = decodeURIComponent(v.replace(/\+/g, ' '));
  });

  // ── Derive script URL ─────────────────────────────────────────────────
  // Priority: ?script= param → localStorage → BOOTSTRAP_URL fallback
  // localStorage survives browser restart (sessionStorage didn't)
  var _scriptUrl = (_params.script || '').trim();
  if (!_scriptUrl) {
    try { _scriptUrl = localStorage.getItem(STORAGE_KEY) || ''; } catch(_) {}
  }
  if (!_scriptUrl && BOOTSTRAP_URL && BOOTSTRAP_URL.indexOf('PASTE_YOUR') !== 0) {
    _scriptUrl = BOOTSTRAP_URL;
  }
  if (_scriptUrl) {
    try { localStorage.setItem(STORAGE_KEY, _scriptUrl); } catch(_) {}
  }

  // ── GitHub Pages base URL (same folder as this script) ───────────────
  var _base = window.location.href.split('?')[0].split('#')[0].replace(/\/[^\/]*$/, '/');

  // ── Config state ──────────────────────────────────────────────────────
  var _superadminEmail = '';
  var _platformName    = 'Edurena';
  var _version         = '5.2.1';
  var _examPageUrl     = '';
  var _kahootPageUrl   = '';
  var _racePageUrl     = '';
  var _resolveReady;
  var _ready = new Promise(function(res) { _resolveReady = res; });

  function _fetchConfig() {
    if (!_scriptUrl) {
      _resolveReady({ scriptUrl: '' });
      return;
    }
    fetch(_scriptUrl + '?page=config', { method: 'GET' })
      .then(function(r) { return r.json(); })
      .then(function(cfg) {
        var d = (cfg && cfg.data) ? cfg.data : cfg;
        if (d.supportEmail)     _superadminEmail = d.supportEmail;
        if (d.superadminEmail)  _superadminEmail = d.superadminEmail; // prefer specific key
        if (d.platformName)     _platformName    = d.platformName;
        if (d.brandName)        _platformName    = d.brandName;
        if (d.version)          _version         = d.version;
        if (d.examPageUrl)      _examPageUrl     = d.examPageUrl;
        if (d.kahootPageUrl)    _kahootPageUrl   = d.kahootPageUrl;
        if (d.racePageUrl)      _racePageUrl     = d.racePageUrl;
        _resolveReady({
          scriptUrl:       _scriptUrl,
          superadminEmail: _superadminEmail,
          examPageUrl:     _examPageUrl,
          kahootPageUrl:   _kahootPageUrl,
          racePageUrl:     _racePageUrl
        });
      })
      .catch(function() {
        // Config fetch failed — still resolve so pages don't hang
        _resolveReady({ scriptUrl: _scriptUrl });
      });
  }

  // ── POST helper ───────────────────────────────────────────────────────
  function _post(action, data) {
    return new Promise(function(resolve, reject) {
      if (!_scriptUrl) {
        reject(new Error('Edurena: no GAS URL. Open this page with ?script=YOUR_GAS_URL'));
        return;
      }
      fetch(_scriptUrl, {
        method: 'POST',
        body: JSON.stringify(Object.assign({ action: action }, data || {}))
      })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(resolve)
      .catch(reject);
    });
  }

  // Callback-style for legacy dashboard code (callRaw)
  function _callRaw(action, data, cb) {
    _post(action, data)
      .then(function(r) { if (cb) cb(null, r); })
      .catch(function(e) { if (cb) cb(e, null); });
  }

  // ── Navigation helpers ─────────────────────────────────────────────────
  // Build a URL to another GitHub page, preserving the ?script= param
  function _pageUrl(filename) {
    var scriptParam = _scriptUrl ? '?script=' + encodeURIComponent(_scriptUrl) : '';
    return _base + filename + scriptParam;
  }

  function _goLogin() {
    // Fixed in v5.2.1 — was 'Login.html' which doesn't exist
    window.location.href = _pageUrl('TeacherLogin.html');
  }

  // ── No-script warning ──────────────────────────────────────────────────
  // Only shown if BOOTSTRAP_URL is unset AND no ?script=/storage URL.
  // With BOOTSTRAP_URL filled in, this almost never fires.
  function _warnIfNoUrl() {
    if (_scriptUrl) return;
    var bar = document.createElement('div');
    bar.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
      'background:#f5a623', 'color:#03060f', 'font-family:Sora,sans-serif',
      'font-size:13px', 'font-weight:600', 'padding:10px 16px',
      'display:flex', 'align-items:center', 'gap:12px', 'flex-wrap:wrap'
    ].join(';');
    bar.innerHTML = '⚠️ Server not connected — this page needs <code style="background:rgba(0,0,0,0.15);padding:2px 6px;border-radius:4px">?script=YOUR_GAS_URL</code> in the URL. '
      + '<button onclick="(function(){var v=prompt(\'Paste your GAS deployment URL:\');if(v&&v.includes(\'script.google\')){localStorage.setItem(\'edurena_script_url\',v.trim());location.reload();}})()" '
      + 'style="padding:4px 12px;background:#03060f;color:#f5a623;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:12px;">Connect Now</button>';
    if (document.body) document.body.prepend(bar);
    else document.addEventListener('DOMContentLoaded', function(){ document.body.prepend(bar); });
  }

  // ── Manual refresh hook for debugging ─────────────────────────────────
  function _refresh() {
    return new Promise(function(resolve, reject) {
      if (!_scriptUrl) { reject(new Error('No script URL')); return; }
      fetch(_scriptUrl + '?page=config&_=' + Date.now(), { method: 'GET' })
        .then(function(r) { return r.json(); })
        .then(function(cfg) {
          var d = (cfg && cfg.data) ? cfg.data : cfg;
          if (d.examPageUrl)   _examPageUrl   = d.examPageUrl;
          if (d.kahootPageUrl) _kahootPageUrl = d.kahootPageUrl;
          if (d.racePageUrl)   _racePageUrl   = d.racePageUrl;
          resolve(d);
        })
        .catch(reject);
    });
  }

  // ── Export ─────────────────────────────────────────────────────────────
  window.DASH = {
    get scriptUrl()       { return _scriptUrl; },
    get superadminEmail() { return _superadminEmail; },
    get platformName()    { return _platformName; },
    get version()         { return _version; },
    get examPageUrl()     { return _examPageUrl; },
    get kahootPageUrl()   { return _kahootPageUrl; },
    get racePageUrl()     { return _racePageUrl; },
    get params()          { return _params; },
    ready:    _ready,
    post:     _post,
    callRaw:  _callRaw,
    goLogin:  _goLogin,
    pageUrl:  _pageUrl,
    refresh:  _refresh
  };

  // Boot
  _fetchConfig();
  setTimeout(_warnIfNoUrl, 800); // wait for DOM + possible config response

})(window);
