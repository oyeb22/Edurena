/**
 * edurena-dash.js — v5.1.0
 * Shared auth + config bootstrap for all Edurena GAS-hosted dashboards.
 *
 * Replaces <?= ScriptApp.getService().getUrl() ?> and
 * <?= CONFIG.SUPERADMIN_EMAIL ?> template tags.
 *
 * USAGE: Place this <script> BEFORE the dashboard's own <script> block.
 *
 * Exposes:
 *   window.DASH.scriptUrl      — this page's own GAS URL (from location)
 *   window.DASH.superadminEmail— fetched from getPublicConfig
 *   window.DASH.post(action,data) → Promise
 *   window.DASH.callRaw(action,data,cb) — callback style (legacy compat)
 *   window.DASH.ready          — Promise, resolves when config loaded
 *   window.DASH.goLogin()      — redirect to login page
 */

(function(window) {
  'use strict';

  // ── Derive GAS script URL from the current page URL ──────────────────
  // GAS dashboard pages are served from:
  //   https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec?page=teacher
  // We strip the ?page= param to get the base exec URL.
  var _scriptUrl = (function() {
    var loc = window.location.href;
    // Remove query string — the base exec URL is what we need
    var base = loc.split('?')[0];
    // Validate it looks like a GAS URL
    if (base.indexOf('script.google.com') !== -1 || base.indexOf('googleusercontent.com') !== -1) {
      return base;
    }
    // Fallback: check sessionStorage (set by Login.html)
    try { return sessionStorage.getItem('edurena_script_url') || ''; } catch(_) { return ''; }
  })();

  var _superadminEmail = '';
  var _platformName    = 'Edurena';
  var _version         = '5.1.0';

  // ── Config fetch ───────────────────────────────────────────────────────
  var _resolveReady, _rejectReady;
  var _readyPromise = new Promise(function(res, rej) {
    _resolveReady = res;
    _rejectReady  = rej;
  });

  function _fetchConfig() {
    if (!_scriptUrl) {
      _resolveReady({ scriptUrl: _scriptUrl });
      return;
    }
    fetch(_scriptUrl + '?page=config', { method: 'GET' })
      .then(function(r) { return r.json(); })
      .then(function(cfg) {
        var data = (cfg && cfg.data) ? cfg.data : cfg;
        if (data.supportEmail)  _superadminEmail = data.supportEmail;
        if (data.platformName)  _platformName    = data.platformName;
        if (data.version)       _version         = data.version;
        _resolveReady({ scriptUrl: _scriptUrl, superadminEmail: _superadminEmail });
      })
      .catch(function(e) {
        console.warn('[Edurena Dash] Config fetch failed:', e.message);
        _resolveReady({ scriptUrl: _scriptUrl });
      });
  }

  // ── Core API ───────────────────────────────────────────────────────────
  function _post(action, data) {
    return new Promise(function(resolve, reject) {
      if (!_scriptUrl) { reject(new Error('scriptUrl not available')); return; }
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

  // Callback-style wrapper for legacy dashboard code
  function _callRaw(action, data, cb) {
    _post(action, data)
      .then(function(r) { if (cb) cb(null, r); })
      .catch(function(e) { if (cb) cb(e, null); });
  }

  function _goLogin() {
    window.location.href = _scriptUrl ? _scriptUrl + '?page=login' : 'Login.html';
  }

  // ── Export ─────────────────────────────────────────────────────────────
  window.DASH = {
    get scriptUrl()       { return _scriptUrl; },
    get superadminEmail() { return _superadminEmail; },
    get platformName()    { return _platformName; },
    get version()         { return _version; },
    ready:   _readyPromise,
    post:    _post,
    callRaw: _callRaw,
    goLogin: _goLogin
  };

  _fetchConfig();

})(window);
