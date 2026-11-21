/* Hand tracking: webcam + MediaPipe Hands (runs locally, nothing uploaded) + touch/mouse fallback.
   Produces SD.hands every frame: [{key, src, x, y, pt, tip, pen, penDown, penUp, pinch, pinchDown, pinchUp, open, fist, fingers, lm, overUI, ...}] */
(function (SD) {
  const T = SD.tracker = { status: 'idle', camHands: new Map(), ptrHands: new Map(), video: null, mp: null, busy: false, stream: null, lastResultAt: 0, fps: 0 };
  SD.hands = [];

  const setStatus = (s, text) => {
    T.status = s; const el = SD.$('#trackStatus'); if (!el) return;
    el.className = 'pill ' + ({ ready: 'ok', loading: 'warn', error: 'off', touch: 'off', off: 'off' }[s] || '');
    el.textContent = text;
  };
  T.setStatus = setStatus;

  // ---------- Camera + model ----------
  T.start = async () => {
    T.video = SD.$('#video');
    if (!SD.S.camera) { setStatus('touch', '👆 Touch mode'); return false; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setStatus('touch', '👆 Touch mode'); SD.toast('Camera needs a secure (https) page — touch mode is on'); return false; }
    setStatus('loading', '📷 Starting camera…');
    try {
      T.stop();
      T.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: SD.S.facing, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } });
      T.video.srcObject = T.stream; await T.video.play().catch(() => {});
    } catch (e) {
      console.warn('camera', e); setStatus('touch', '👆 Touch mode'); SD.toast('Camera not available — you can draw with touch or mouse'); return false;
    }
    if (!T.mp) {
      setStatus('loading', '✋ Loading magic…');
      try {
        if (typeof Hands === 'undefined') throw new Error('Hands library missing');
        if (!T.loading) T.loading = (async () => {
          const mp = new Hands({ locateFile: (f) => 'vendor/mediapipe-hands/' + f });
          await mp.initialize();          // initialise first — setting options before this starts a second load
          mp.onResults(onResults);
          T.mp = mp; T.applyOptions();
        })();
        await T.loading;
      } catch (e) { console.warn('mediapipe', e); T.mp = null; T.loading = null; setStatus('error', '✋ Tracking failed — touch mode'); return false; }
    }
    setStatus('ready', '✋ Show your hand!');
    return true;
  };
  T.applyOptions = () => { if (T.mp) T.mp.setOptions({ maxNumHands: SD.S.maxHands, modelComplexity: SD.S.modelComplexity, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5, selfieMode: false }); };
  T.stop = () => { if (T.stream) { T.stream.getTracks().forEach(t => t.stop()); T.stream = null; } T.camHands.clear(); };
  T.cameraOn = () => !!(T.stream && T.mp);

  // Called every animation frame
  let frames = 0, fpsT = 0;
  T.pump = () => {
    const v = T.video;
    if (!T.mp || !T.stream || T.busy || !v || v.readyState < 2) return;
    T.busy = true;
    T.mp.send({ image: v }).then(() => { T.busy = false; }).catch((e) => { T.busy = false; if (!T.err) { T.err = 1; console.warn(e); } });
  };

  // ---------- Coordinate mapping ----------
  T.videoRect = () => {
    const v = T.video, vw = (v && v.videoWidth) || 640, vh = (v && v.videoHeight) || 480;
    const s = Math.max(SD.W / vw, SD.H / vh), dw = vw * s, dh = vh * s;
    return { x: (SD.W - dw) / 2, y: (SD.H - dh) / 2, w: dw, h: dh };
  };
  const toScreen = (nx, ny, r) => {
    let x = r.x + nx * r.w, y = r.y + ny * r.h;
    if (SD.S.mirror) x = SD.W - x;
    const k = SD.S.reach; x = SD.W / 2 + (x - SD.W / 2) * k; y = SD.H / 2 + (y - SD.H / 2) * k;
    return { x, y };
  };

  // ---------- Gesture analysis ----------
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function analyse(lmN) {
    // lmN: normalised landmarks (x,y in 0..1 of video). Use aspect-correct coords for ratios.
    const v = T.video, ar = ((v && v.videoWidth) || 640) / ((v && v.videoHeight) || 480);
    const P = lmN.map(p => ({ x: p.x * ar, y: p.y }));
    const palm = d(P[0], P[9]) || 1e-3;
    const pinchR = d(P[4], P[8]) / palm;
    const ext = (tip, pip) => d(P[0], P[tip]) / (d(P[0], P[pip]) || 1e-3);
    const e = [ext(8, 6), ext(12, 10), ext(16, 14), ext(20, 18)];
    const up = e.map(r => r > 1.18), down = e.map(r => r < 1.02);
    const thumbUp = d(P[4], P[17]) / palm > 1.05;
    const fingers = up.filter(Boolean).length + (thumbUp ? 1 : 0);
    return { pinchR, up, down, fingers, open: up.every(Boolean) && thumbUp, fist: down.every(Boolean), point: up[0] && down[1] && down[2] && down[3], peace: up[0] && up[1] && down[2] && down[3] };
  }

  let nextId = 1;
  function onResults(res) {
    const t = SD.now();
    frames++; if (t - fpsT > 1000) { T.fps = frames; frames = 0; fpsT = t; }
    T.lastResultAt = t;
    const r = T.videoRect();
    const list = (res.multiHandLandmarks || []).map((lmN, i) => {
      const lm = lmN.map(p => toScreen(p.x, p.y, r));
      return { lmN, lm, g: analyse(lmN), label: (res.multiHandedness && res.multiHandedness[i] && res.multiHandedness[i].label) || '' };
    });
    // match to existing tracked hands by nearest wrist
    const used = new Set();
    for (const h of list) {
      let best = null, bd = 1e9;
      for (const [k, th] of T.camHands) { if (used.has(k)) continue; const dd = d(th.raw.lm[0], h.lm[0]); if (dd < bd) { bd = dd; best = k; } }
      let th = best && bd < Math.max(SD.W, SD.H) * 0.35 ? T.camHands.get(best) : null;
      if (!th) { th = makeCamHand(); T.camHands.set(th.key, th); }
      used.add(th.key); updateCamHand(th, h, t);
    }
    for (const [k, th] of T.camHands) if (!used.has(k) && t - th.seen > 280) T.camHands.delete(k);
  }

  function makeCamHand() {
    const sm = SD.S.smoothing, mc = SD.lerp(3.0, 0.6, sm), beta = SD.lerp(0.05, 0.006, sm);
    return { key: 'c' + (nextId++), src: 'cam', f: { tx: new SD.OneEuro(mc, beta), ty: new SD.OneEuro(mc, beta), px: new SD.OneEuro(mc, beta), py: new SD.OneEuro(mc, beta) },
      pinch: false, penState: false, penFrames: 0, openFrames: 0, seen: 0, raw: null };
  }
  function updateCamHand(th, h, t) {
    th.raw = h; th.seen = t;
    const tip = h.lm[8], mid = { x: (h.lm[4].x + h.lm[8].x) / 2, y: (h.lm[4].y + h.lm[8].y) / 2 };
    th.tip = { x: th.f.tx.filter(tip.x, t), y: th.f.ty.filter(tip.y, t) };
    th.pin = { x: th.f.px.filter(mid.x, t), y: th.f.py.filter(mid.y, t) };
    const s = SD.S.pinchSens, on = 0.30 * s, off = 0.45 * s;
    if (!th.pinch && h.g.pinchR < on) th.pinch = true; else if (th.pinch && h.g.pinchR > off) th.pinch = false;
    // pen = drawing gesture
    if (SD.S.drawGesture === 'point') {
      const want = (h.g.point && !th.pinch) || th.pinch;
      if (want !== th.penState) { th.penFrames++; if (th.penFrames >= 2) { th.penState = want; th.penFrames = 0; } } else th.penFrames = 0;
    } else th.penState = th.pinch; // pinch already has hysteresis
    th.openFrames = h.g.open && !th.pinch ? th.openFrames + 1 : 0;
    th.fistFrames = h.g.fist ? (th.fistFrames || 0) + 1 : 0;
    const p = h.lm, cx = (p[0].x + p[5].x + p[9].x + p[13].x + p[17].x) / 5, cy = (p[0].y + p[5].y + p[9].y + p[13].y + p[17].y) / 5;
    th.palm = { x: cx, y: cy }; th.size = d(p[0], p[9]);
  }

  // ---------- Touch / mouse fallback ----------
  const isUI = (el) => el && el.closest && el.closest('.hit, button, input, select, label, .screen:not(.clear), #modal, .dialog');
  function ptr(e, down) {
    if (down === true && isUI(e.target)) return;
    const k = 'p' + e.pointerId; let h = T.ptrHands.get(k);
    if (down === true) { h = { key: k, src: e.pointerType === 'mouse' ? 'mouse' : 'touch', x: e.clientX, y: e.clientY, down: true, seenDown: false, t: SD.now() }; T.ptrHands.set(k, h); SD.audio(); }
    else if (h) { h.x = e.clientX; h.y = e.clientY; h.t = SD.now(); if (down === false) { if (h.down && !h.seenDown) h.releaseLater = true; else h.down = false; if (h.src !== 'mouse') h.remove = true; } }
    else if (e.pointerType === 'mouse' && down === null) { T.ptrHands.set(k, { key: k, src: 'mouse', x: e.clientX, y: e.clientY, down: false, t: SD.now() }); }
  }
  window.addEventListener('pointerdown', e => ptr(e, true), { passive: true });
  window.addEventListener('pointermove', e => ptr(e, null), { passive: true });
  window.addEventListener('pointerup', e => ptr(e, false), { passive: true });
  window.addEventListener('pointercancel', e => ptr(e, false), { passive: true });
  document.addEventListener('mouseleave', () => { for (const [k, h] of T.ptrHands) if (h.src === 'mouse') T.ptrHands.delete(k); });

  // ---------- Per-frame snapshot with edges ----------
  const prev = new Map();
  T.tick = () => {
    const out = [], t = SD.now();
    for (const th of T.camHands.values()) {
      if (!th.tip) continue;
      const pt = th.pinch ? th.pin : th.tip; // finger tip when pointing, pinch point when pinching
      out.push({ key: th.key, src: 'cam', x: pt.x, y: pt.y, pt: { x: pt.x, y: pt.y }, tip: { ...th.tip }, pin: { ...th.pin }, palm: th.palm, size: th.size,
        pen: th.penState, pinch: th.pinch, open: th.openFrames >= 3, fist: th.fistFrames >= 3, fingers: th.raw.g.fingers, g: th.raw.g, lm: th.raw.lm, label: th.raw.label });
    }
    for (const [k, h] of T.ptrHands) {
      if (h.src === 'mouse' && !h.down && t - h.t > 3000) continue;
      const p = { x: h.x, y: h.y };
      out.push({ key: k, src: h.src, x: h.x, y: h.y, pt: p, tip: p, pin: p, palm: p, size: 80, pen: h.down, pinch: h.down, open: false, fist: false, fingers: 1, lm: null });
    }
    for (const h of out) {
      const pv = prev.get(h.key);
      h.penDown = h.pen && !(pv && pv.pen); h.penUp = !h.pen && !!(pv && pv.pen);
      h.pinchDown = h.pinch && !(pv && pv.pinch); h.pinchUp = !h.pinch && !!(pv && pv.pinch);
      h.px = pv ? pv.x : h.x; h.py = pv ? pv.y : h.y; h.ptx = pv ? pv.tip.x : h.tip.x; h.pty = pv ? pv.tip.y : h.tip.y;
      h.age = pv ? pv.age + 1 : 0; h.side = h.x < SD.W / 2 ? 0 : 1;
    }
    // hands that vanished while drawing -> synthetic penUp
    for (const [k, pv] of prev) if (!out.find(h => h.key === k) && pv.pen) out.push({ ...pv, pen: false, pinch: false, penDown: false, penUp: true, pinchDown: false, pinchUp: true, gone: true });
    prev.clear(); for (const h of out) if (!h.gone) prev.set(h.key, h);
    for (const [k, h] of T.ptrHands) {
      if (h.down) { if (h.releaseLater) { h.down = false; h.releaseLater = false; } else h.seenDown = true; } else h.seenDown = false;
      if (h.remove && !h.down) T.ptrHands.delete(k);
    }
    SD.hands = out;
    if (T.status === 'ready' || T.status === 'seen') {
      const n = out.filter(h => h.src === 'cam').length;
      setStatus(n ? 'seen' : 'ready', n ? `✋ ${n} hand${n > 1 ? 's' : ''}` : '✋ Show your hand!');
      SD.$('#trackStatus').className = 'pill ok';
    }
    return out;
  };

  // Test hook: feed normalised landmark sets [[{x,y},...21], ...]
  T.inject = (sets) => onResults({ multiHandLandmarks: sets, multiHandedness: sets.map(() => ({ label: 'Right' })) });

  SD.onSetting((k) => { if (k === 'maxHands' || k === 'modelComplexity') T.applyOptions(); if (k === 'smoothing') T.camHands.clear(); });
})(window.SD);
