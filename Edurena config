/**
 * edurena-config.js — v5.1.0
 * Shared bootstrap for all Edurena GitHub Pages HTML files.
 *
 * USAGE: Include this script BEFORE any page logic.
 *   <script src="edurena-config.js"></script>
 *
 * Exposes:
 *   window.EDURENA.scriptUrl    — GAS deployment URL
 *   window.EDURENA.ready        — Promise that resolves when config is loaded
 *   window.EDURENA.post(action, data) — Promise-based API call
 *   window.EDURENA.pricing      — live pricing config object
 *
 * URL parameter precedence (highest → lowest):
 *   1. ?script=  URL param
 *   2. sessionStorage 'edurena_script_url'
 *   3. Config fetched from FALLBACK_CONFIG_URL (?page=config)
 */

(function (window) {
  'use strict';

  // ── Supabase credentials (anon key — safe to expose) ──────────────
  var SUPABASE_URL  = 'https://hrslazwxaciooqowvzcy.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyc2xhend4YWNpb29xb3d2emN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MDk3NzksImV4cCI6MjA5MzM4NTc3OX0.UbEko3d0zyHguOq9w5Zy-_89OhAbQaV7Z6uBw_nS_yk';

  // ── Parse URL params ───────────────────────────────────────────────
  var _params = {};
  window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, k, v) {
    _params[k] = decodeURIComponent(v.replace(/\+/g, ' '));
  });

  // ── Determine script URL from URL param or sessionStorage ─────────
  var _scriptUrl = (_params.script || '').trim()
    || sessionStorage.getItem('edurena_script_url')
    || '';

  // Persist to sessionStorage so sub-pages don't need ?script= again
  if (_scriptUrl) sessionStorage.setItem('edurena_script_url', _scriptUrl);

  // ── Config promise — fetches from GAS ?page=config ─────────────────
  var _resolveReady, _rejectReady;
  var _readyPromise = new Promise(function (res, rej) {
    _resolveReady = res;
    _rejectReady  = rej;
  });

  var _pricing = {};
  var _version = '5.1.0';
  var _platformName = 'Edurena';

  function _fetchConfig() {
    if (!_scriptUrl) {
      // No script URL at all — resolve with empty config; page handles gracefully
      _resolveReady({ scriptUrl: '', pricing: {} });
      return;
    }
    fetch(_scriptUrl + '?page=config', { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        // cfg may be { status:'success', data:{...} } or the data object directly
        var data = (cfg && cfg.data) ? cfg.data : cfg;
        if (data.scriptUrl) {
          _scriptUrl = data.scriptUrl;
          sessionStorage.setItem('edurena_script_url', _scriptUrl);
        }
        if (data.pricing)      _pricing      = data.pricing;
        if (data.version)      _version      = data.version;
        if (data.platformName) _platformName = data.platformName;
        _resolveReady({ scriptUrl: _scriptUrl, pricing: _pricing });
      })
      .catch(function (e) {
        console.warn('[Edurena] Config fetch failed:', e.message, '— proceeding with URL-param scriptUrl');
        _resolveReady({ scriptUrl: _scriptUrl, pricing: {} });
      });
  }

  // ── Core API post ──────────────────────────────────────────────────
  function _post(action, data) {
    return new Promise(function (resolve, reject) {
      if (!_scriptUrl) {
        reject(new Error('Edurena: scriptUrl not set. Pass ?script=YOUR_GAS_URL'));
        return;
      }
      fetch(_scriptUrl, {
        method: 'POST',
        body: JSON.stringify(Object.assign({ action: action }, data || {}))
      })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(resolve)
        .catch(reject);
    });
  }

  // ── Supabase direct query (for fast reads that bypass GAS) ─────────
  function _supabaseGet(table, filters, select) {
    var url = SUPABASE_URL + '/rest/v1/' + table + '?select=' + (select || '*');
    Object.keys(filters || {}).forEach(function (k) {
      url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(filters[k]);
    });
    return fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + SUPABASE_ANON
      }
    }).then(function (r) {
      if (!r.ok) throw new Error('Supabase error: ' + r.status);
      return r.json();
    });
  }

  // ── Build login / exam / live URLs ─────────────────────────────────
  function _loginUrl()  { return _scriptUrl ? _scriptUrl + '?page=login'       : '/login'; }
  function _examUrl()   { return 'Exam.html'   + (_scriptUrl ? '?script=' + encodeURIComponent(_scriptUrl) : ''); }
  function _liveUrl()   { return 'Webapp.html' + (_scriptUrl ? '?script=' + encodeURIComponent(_scriptUrl) : ''); }
  function _pricingUrl(){ return 'Pricing.html'+ (_scriptUrl ? '?script=' + encodeURIComponent(_scriptUrl) : ''); }

  // ── Export public API ──────────────────────────────────────────────
  window.EDURENA = {
    get scriptUrl()    { return _scriptUrl; },
    get pricing()      { return _pricing; },
    get version()      { return _version; },
    get platformName() { return _platformName; },
    get params()       { return _params; },
    ready:             _readyPromise,
    post:              _post,
    supabaseGet:       _supabaseGet,
    loginUrl:          _loginUrl,
    examUrl:           _examUrl,
    liveUrl:           _liveUrl,
    pricingUrl:        _pricingUrl,
    SUPABASE_URL:      SUPABASE_URL,
    SUPABASE_ANON:     SUPABASE_ANON
  };

  // ── Kick off config fetch immediately ─────────────────────────────
  _fetchConfig();

})(window);
