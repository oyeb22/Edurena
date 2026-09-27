/* Edurena 3D Penalty Shootout — code shared by PenaltyShootout3D.html (student) and
   PenaltyShootoutHost3D.html (projector).
   - seedFor(str): turns any string into a small deterministic int. Every viewer of the same
     kick (kicker's phone, keeper's phone, the projector) calls this with the SAME string
     (sessionId+qIndex+pairId) and gets the SAME number, which is all Unity needs to pick the
     same corner/dive for everyone — nothing about ball placement has to be sent over the wire.
   - loadUnity(): loads the Unity WebGL build and returns a small handle with queueKick().
   - canRunUnity(): same device check as the 3D race view. */
(function (w) {
  'use strict';

  function seedFor(str) {
    var h = 0;
    str = String(str || '');
    for (var i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) | 0; }
    return h;
  }

  function canRunUnity() {
    try {
      var c = document.createElement('canvas');
      if (!c.getContext('webgl2')) return false;
      if (navigator.deviceMemory && navigator.deviceMemory < 2) return false;
      return true;
    } catch (e) { return false; }
  }

  // opts: canvas, buildUrl, productName (Unity names every build file after this — the student
  // and projector builds were built separately as "PenaltyGame" / "PenaltyHostGame"), onProgress(0-1), onKickStart(obj), onKickDone(obj)
  function loadUnity(opts) {
    var buildUrl = opts.buildUrl;
    var name = opts.productName || 'PenaltyGame';
    var ready = new Promise(function (resolve) { w.onPenaltyViewReady = resolve; });
    w.onPenaltyKickStart = function (json) { try { if (opts.onKickStart) opts.onKickStart(JSON.parse(json)); } catch (e) {} };
    w.onPenaltyKickDone = function (json) { try { if (opts.onKickDone) opts.onKickDone(JSON.parse(json)); } catch (e) {} };
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = buildUrl + '/' + name + '.loader.js';
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Could not load the 3D penalty view')); };
      document.body.appendChild(s);
    }).then(function () {
      return w.createUnityInstance(opts.canvas, {
        dataUrl: buildUrl + '/' + name + '.data.unityweb',
        frameworkUrl: buildUrl + '/' + name + '.framework.js.unityweb',
        codeUrl: buildUrl + '/' + name + '.wasm.unityweb',
        companyName: 'Edurena', productName: name, productVersion: '1.0'
      }, opts.onProgress);
    }).then(function (unity) {
      return ready.then(function () {
        var send = function (m, a) { try { unity.SendMessage('PenaltyBridge', m, a); } catch (e) {} };
        return {
          unity: unity,
          queueKick: function (kick) { send('QueueKick', JSON.stringify(kick)); },
          setStandings: function (rows) { send('SetStandings', JSON.stringify({ rows: rows })); },
          quit: function () { w.onPenaltyKickStart = null; w.onPenaltyKickDone = null; try { return unity.Quit(); } catch (e) {} }
        };
      });
    });
  }

  w.SHOOT3D = { seedFor: seedFor, canRunUnity: canRunUnity, loadUnity: loadUnity };
})(window);
