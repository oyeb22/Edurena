/* Edurena 3D Race — code shared by Race3D.html (student) and RaceHost3D.html (projector).
   - configFor(totalQ): the race rules; must match RACE_BOOST in code.gs and Unity's RaceMath.cs
   - distance/speed/finishTime: twin of Unity's RaceMath (used by the projector to rank everyone)
   - loadUnity(): loads the Unity WebGL build and returns a small handle
   - audio: procedural engine / correct / wrong / finish sounds (same style as the old Race.html) */
(function (w) {
  'use strict';

  /* ───────────── rules ───────────── */
  // Race length grows with the number of questions (about 110 m per question, 800-3000 m) so a good
  // student crosses the line about when the questions run out. Slow students keep moving at base speed.
  function configFor(totalQ) {
    var q = Math.max(1, parseInt(totalQ, 10) || 10);
    var len = Math.max(800, Math.min(3000, Math.round(q * 110 / 50) * 50));
    return { baseSpeed: 12, maxBoost: 38, tau: 3.5, raceLength: len, refSeconds: 10, minBoostFraction: 0.15, countdown: 3, attack: 0.5, startRamp: 1.5 };
  }
  function tauUp(c) { return 1 / (1 / c.tau + 1 / c.attack); }
  function distance(c, events, t) {
    if (t <= 0) return 0;
    var up = tauUp(c), d = c.baseSpeed * (t - c.startRamp * (1 - Math.exp(-t / c.startRamp)));
    for (var i = 0; i < events.length; i++) {
      var a = t - events[i].t;
      if (a > 0) d += events[i].boost * (c.tau * (1 - Math.exp(-a / c.tau)) - up * (1 - Math.exp(-a / up)));
    }
    return d;
  }
  function finishTime(c, events, tMax) {
    tMax = tMax || 2000;
    if (distance(c, events, tMax) < c.raceLength) return Infinity;
    var lo = 0, hi = tMax;
    for (var i = 0; i < 50; i++) { var mid = (lo + hi) / 2; if (distance(c, events, mid) >= c.raceLength) hi = mid; else lo = mid; }
    return hi;
  }

  /* ───────────── snapshot for Unity ───────────── */
  // players: {pid:{name,car}}   events: {pid:{pushId:{t,boost}}}   startedAtMs: Firebase server time of the Start press
  function snapshot(cfg, startedAtMs, offsetMs, players, events) {
    var list = Object.keys(players || {}).map(function (id) {
      var p = players[id] || {};
      return { id: id, name: String(p.name || '?').slice(0, 14), car: p.car | 0,
               events: Object.keys((events || {})[id] || {}).map(function (k) { var e = events[id][k]; return { t: +e.t || 0, boost: +e.boost || 0 }; }) };
    });
    return { config: cfg, raceStart: startedAtMs ? startedAtMs / 1000 + cfg.countdown : 0, serverNow: (Date.now() + (offsetMs || 0)) / 1000, players: list };
  }

  /* ───────────── device check ───────────── */
  function canRunUnity() {
    try {
      var c = document.createElement('canvas');
      if (!c.getContext('webgl2')) return false;
      if (navigator.deviceMemory && navigator.deviceMemory < 2) return false;
      return true;
    } catch (e) { return false; }
  }

  /* ───────────── Unity loader ───────────── */
  // opts: canvas, buildUrl, onProgress(0-1), onStatus(obj), quality
  function loadUnity(opts) {
    var buildUrl = opts.buildUrl || './assets/race3d/Build';
    var ready = new Promise(function (resolve) { w.onRaceViewReady = resolve; });
    w.onRaceStatus = function (json) { try { if (opts.onStatus) opts.onStatus(JSON.parse(json)); } catch (e) {} };
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = buildUrl + '/RaceGame.loader.js';
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Could not load the 3D race view')); };
      document.body.appendChild(s);
    }).then(function () {
      return w.createUnityInstance(opts.canvas, {
        dataUrl: buildUrl + '/RaceGame.data.unityweb',
        frameworkUrl: buildUrl + '/RaceGame.framework.js.unityweb',
        codeUrl: buildUrl + '/RaceGame.wasm.unityweb',
        companyName: 'Edurena', productName: 'RaceGame', productVersion: '1.0'
      }, opts.onProgress);
    }).then(function (unity) {
      return ready.then(function () {
        var send = function (m, a) { try { unity.SendMessage('RaceBridge', m, a); } catch (e) {} };
        if (opts.quality) send('SetQuality', opts.quality);
        return {
          unity: unity,
          applySnapshot: function (snap) { send('ApplySnapshot', JSON.stringify(snap)); },
          setLocalPlayer: function (id) { send('SetLocalPlayer', String(id)); },
          setQuality: function (t) { send('SetQuality', t); },
          setHud: function (on) { send('SetHudVisible', on ? '1' : '0'); },
          quit: function () { w.onRaceStatus = null; try { return unity.Quit(); } catch (e) {} }
        };
      });
    });
  }

  /* ───────────── audio ───────────── */
  var AC = w.AudioContext || w.webkitAudioContext, ac = null, master = null, engGain = null, osc1 = null, osc2 = null, bufs = {}, musicTimer = null;
  var audio = {
    init: function (withMusic) {
      if (ac || !AC) return;
      try {
        ac = new AC(); master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination);
        engGain = ac.createGain(); engGain.gain.value = 0; engGain.connect(master);
        var f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200; f.Q.value = 1.5; f.connect(engGain);
        osc1 = ac.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = 80; osc1.connect(f); osc1.start();
        osc2 = ac.createOscillator(); osc2.type = 'sawtooth'; osc2.frequency.value = 82; osc2.connect(f); osc2.start();
        ['crash_thud', 'nitro_whoosh', 'crowd', 'start_beep'].forEach(function (n) {
          fetch('./assets/race/sounds/' + n + '.mp3').then(function (r) { return r.arrayBuffer(); })
            .then(function (b) { return ac.decodeAudioData(b); }).then(function (d) { bufs[n] = d; }).catch(function () {});
        });
        if (withMusic) audio.music();
      } catch (e) { ac = null; }
    },
    sfx: function (n, g) {
      if (!ac || !bufs[n]) return;
      var s = ac.createBufferSource(); s.buffer = bufs[n]; var gn = ac.createGain(); gn.gain.value = g || 0.7; s.connect(gn); gn.connect(ac.destination); s.start();
    },
    engine: function (kmh) {
      if (!ac || !engGain) return;
      engGain.gain.setTargetAtTime(Math.min(0.5, 0.04 + kmh / 650), ac.currentTime, 0.08);
      var fr = 80 + kmh * 1.8; osc1.frequency.setTargetAtTime(fr, ac.currentTime, 0.08); osc2.frequency.setTargetAtTime(fr + 2, ac.currentTime, 0.08);
    },
    tone: function (freqs, type, step, peak, len) {
      if (!ac) return;
      freqs.forEach(function (fq, i) {
        var t = ac.currentTime + i * step, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = fq;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + len);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + len + 0.05);
      });
    },
    correct: function () { audio.tone([523.25, 659.25, 783.99], 'sine', 0.07, 0.4, 0.3); },
    wrong: function () { audio.tone([220, 180], 'sawtooth', 0.08, 0.3, 0.35); audio.sfx('crash_thud', 0.4); },
    boost: function () { audio.sfx('nitro_whoosh', 0.7); },
    finish: function () { audio.sfx('crowd', 0.7); audio.tone([523, 659, 784, 1047], 'sine', 0.12, 0.5, 1); },
    music: function () {
      if (!ac || musicTimer) return;
      var beat = 60 / 128, step = 0, bass = [55, 55, 69, 55, 58, 55, 62, 55];
      musicTimer = setInterval(function () {
        if (!ac) return;
        var s = step % 8, t = ac.currentTime;
        if (s === 0 || s === 4) { var o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.14); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.connect(g); g.connect(master); o.start(); o.stop(t + 0.25); }
        if (s % 2 === 0) { var o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g2 = ac.createGain(); o2.type = 'sawtooth'; o2.frequency.value = bass[Math.floor(step / 2) % bass.length]; f.type = 'lowpass'; f.frequency.value = 320; g2.gain.setValueAtTime(0.18, t); g2.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.85); o2.connect(f); f.connect(g2); g2.connect(master); o2.start(); o2.stop(t + beat); }
        step++;
      }, beat * 500);
    },
    stop: function () { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } if (engGain && ac) engGain.gain.setTargetAtTime(0, ac.currentTime, 0.1); }
  };

  w.RACE3D = { configFor: configFor, distance: distance, finishTime: finishTime, snapshot: snapshot, canRunUnity: canRunUnity, loadUnity: loadUnity, audio: audio };
})(window);
