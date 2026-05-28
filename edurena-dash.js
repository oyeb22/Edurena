/**
 * edurena-dash.js — v5.2.0
 * Shared bootstrap for ALL Edurena dashboard + staff HTML pages on GitHub Pages.
 *
 * HOW IT WORKS:
 *   GAS only runs doPost (the API). All HTML lives on GitHub.
 *   Every page URL includes ?script=GAS_EXEC_URL so we know where to POST.
 *   After first load it is saved to sessionStorage so sub-pages don't need it.
 *
 * EXPOSES:
 *   DASH.scriptUrl          — GAS deployment URL
 *   DASH.superadminEmail    — from ?page=config
 *   DASH.post(action, data) — Promise-based POST to GAS
 *   DASH.callRaw(a, d, cb)  — callback-style POST (legacy compat)
 *   DASH.goLogin()          — redirect to Login.html (with ?script= preserved)
 *   DASH.pageUrl(page)      — build GitHub URL for any page with ?script= appended
 *   DASH.ready              — Promise resolves when config loaded
 */
(function(window) {
  'use strict';

  // ── Parse URL params ──────────────────────────────────────────────────
  var _params = {};
  window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, k, v) {
    _params[k] = decodeURIComponent(v.replace(/\+/g, ' '));
  });

  // ── Derive script URL ─────────────────────────────────────────────────
  // Priority: ?script= param → sessionStorage → nothing
  var _scriptUrl = (_params.script || '').trim();
  if (!_scriptUrl) {
    try { _scriptUrl = sessionStorage.getItem('edurena_script_url') || ''; } catch(_) {}
  }
  if (_scriptUrl) {
    try { sessionStorage.setItem('edurena_script_url', _scriptUrl); } catch(_) {}
  }

  // ── GitHub Pages base URL (same folder as this script) ───────────────
  var _base = window.location.href.split('?')[0].replace(/\/[^\/]*$/, '/');

  // ── Config state ──────────────────────────────────────────────────────
  var _superadminEmail = '';
  var _platformName    = 'Edurena';
  var _version         = '5.2.0';
  var _resolveReady, _rejectReady;
  var _ready = new Promise(function(res, rej) { _resolveReady = res; _rejectReady = rej; });

  function _fetchConfig() {
    if (!_scriptUrl) { _resolveReady({ scriptUrl: '' }); return; }
    fetch(_scriptUrl + '?page=config', { method: 'GET' })
      .then(function(r) { return r.json(); })
      .then(function(cfg) {
        var d = (cfg && cfg.data) ? cfg.data : cfg;
        if (d.supportEmail)  _superadminEmail = d.supportEmail;
        if (d.platformName)  _platformName    = d.platformName;
        if (d.version)       _version         = d.version;
        _resolveReady({ scriptUrl: _scriptUrl, superadminEmail: _superadminEmail });
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
    window.location.href = _pageUrl('Login.html');
  }

  // ── No-script warning ──────────────────────────────────────────────────
  // If DASH loads without a script URL, inject a visible warning bar
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
      + '<button onclick="(function(){var v=prompt(\'Paste your GAS deployment URL:\');if(v&&v.includes(\'script.google\')){sessionStorage.setItem(\'edurena_script_url\',v.trim());location.reload();}})()" '
      + 'style="padding:4px 12px;background:#03060f;color:#f5a623;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:12px;">Connect Now</button>';
    document.body ? document.body.prepend(bar) : document.addEventListener('DOMContentLoaded', function(){ document.body.prepend(bar); });
  }

  // ── Export ─────────────────────────────────────────────────────────────
  window.DASH = {
    get scriptUrl()       { return _scriptUrl; },
    get superadminEmail() { return _superadminEmail; },
    get platformName()    { return _platformName; },
    get version()         { return _version; },
    get params()          { return _params; },
    ready:    _ready,
    post:     _post,
    callRaw:  _callRaw,
    goLogin:  _goLogin,
    pageUrl:  _pageUrl
  };

  // Boot
  _fetchConfig();
  setTimeout(_warnIfNoUrl, 500); // wait for DOM

})(window);
