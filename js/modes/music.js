/* Air Music — string guitar (pinch two hands to make strings), air piano with songs, drum pads, theremin */
(function (SD) {
  const SUBS = [
    { id: 'guitar', name: 'Magic Strings', icon: '🎸', desc: 'Pinch both hands to make strings, swipe to play', c: 'c5' },
    { id: 'piano', name: 'Air Piano', icon: '🎹', desc: 'Press keys with your fingers + learn songs', c: 'c4' },
    { id: 'drums', name: 'Drum Pads', icon: '🥁', desc: 'Tap the pads to make a beat', c: 'c6' },
    { id: 'theremin', name: 'Wavy Sound', icon: '🌊', desc: 'Move your hand to change the sound', c: 'c3' },
  ];
  const PENTA = [0, 2, 4, 7, 9];
  const SCALE = []; for (let o = 0; o < 4; o++) PENTA.forEach(s => SCALE.push(48 + o * 12 + s)); SCALE.push(96);
  const SONGS = {
    twinkle: { name: '⭐ Twinkle Twinkle', notes: [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60, 67, 67, 65, 65, 64, 64, 62, 67, 67, 65, 65, 64, 64, 62, 60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60] },
    mary: { name: '🐑 Mary Had a Little Lamb', notes: [64, 62, 60, 62, 64, 64, 64, 62, 62, 62, 64, 67, 67, 64, 62, 60, 62, 64, 64, 64, 64, 62, 62, 64, 62, 60] },
    joy: { name: '🎶 Ode to Joy', notes: [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62, 64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60] },
  };
  const SOLFA = ['Do', '', 'Re', '', 'Mi', 'Fa', '', 'So', '', 'La', '', 'Ti'];
  const KEYCOL = ['#ff3b5c', '', '#ff8a1f', '', '#ffd21f', '#2bd46b', '', '#16b5a5', '', '#2f8cff', '', '#c04cff'];
  const PADS = [['kick', '🦶 Boom', '#ff5d73'], ['snare', '🥁 Snare', '#ffc93c'], ['hat', '🎩 Hat', '#22c39a'], ['tom', '🪘 Tom', '#3cb6f0'], ['clap', '👏 Clap', '#7b5cff'], ['cymbal', '💥 Crash', '#ff8fd1'], ['cowbell', '🔔 Bell', '#ff9f1c'], ['tabla', '🪇 Tabla', '#16b5a5']];

  const st = { sub: null, strings: [], live: null, pluckCool: new Map(), fingerKey: new Map(), pressed: new Map(), song: null, songIdx: 0, padState: new Map(), padHit: new Map(), snap: true, ther: { f: 0, v: 0, on: false } };

  function picker() {
    stopTher(); st.sub = null; SD.ui.clearTools(); SD.ui.setTitle('🎵 Air Music'); SD.$('#screens').innerHTML = '';
    const s = SD.ui.screen(`<div class="sectionh">Pick an instrument</div><div class="grid" id="mg"></div>`);
    SUBS.forEach(g => { const b = SD.html(`<button class="hit tile ${g.c}"><div class="ico">${g.icon}</div><div><div class="nm">${g.name}</div><div class="ds">${g.desc}</div></div></button>`); b.onclick = () => { SD.sfx('click'); open(g.id); }; s.querySelector('#mg').appendChild(b); });
  }
  function open(id) {
    SD.$('#screens').innerHTML = ''; SD.ui.clearTools(); st.sub = id; const g = SUBS.find(x => x.id === id); SD.ui.setTitle(g.icon + ' ' + g.name);
    const bot = SD.$('#bottomTools'); bot.appendChild(SD.ui.btn('🎵 Instruments', picker, 'chip small'));
    if (id === 'guitar') {
      bot.appendChild(SD.ui.btn('🎸 Add 6 strings', preset, 'chip small')); bot.appendChild(SD.ui.btn('🧹 Clear strings', () => { st.strings = []; SD.sfx('whoosh'); }, 'chip small'));
      const h = SD.ui.hint('🤏🤏 Pinch with <b>both hands</b> and pull apart to make a string · let go to pin it · swipe a finger across to play!'); setTimeout(() => h.remove(), 10000);
      if (!st.strings.length) preset();
    }
    if (id === 'piano') {
      const sg = SD.ui.group([['', '🎹 Free play'], ...Object.entries(SONGS).map(([k, s]) => [k, s.name])], () => st.song || '', v => { st.song = v || null; st.songIdx = 0; if (v) SD.say("Let's play " + SONGS[v].name.replace(/^\S+\s/, '')); }, 'chip small');
      SD.$('#modeTools').appendChild(sg);
    }
    if (id === 'theremin') { SD.$('#modeTools').appendChild(SD.ui.toggle('🎼 Nice notes', () => st.snap, v => st.snap = v, 'chip small')); const h = SD.ui.hint('Move your hand left/right for low/high sounds · up for loud, down for quiet'); setTimeout(() => h.remove(), 8000); }
    if (id !== 'theremin') stopTher();
  }
  function preset() {
    st.strings = []; const n = 6, notes = [40, 45, 50, 55, 59, 64].reverse();
    const top = SD.H * 0.22, bot = SD.H * 0.78;
    for (let i = 0; i < n; i++) { const y = top + (bot - top) * i / (n - 1); st.strings.push(mkString({ x: SD.W * 0.12, y }, { x: SD.W * 0.88, y: y + 30 }, notes[i] + 12)); }
    SD.sfx('star');
  }
  function mkString(a, b, midi) {
    if (midi === undefined) { const L = SD.dist(a, b), maxL = Math.hypot(SD.W, SD.H) * 0.8; const t = SD.clamp((L - 80) / (maxL - 80), 0, 1); midi = SCALE[Math.round((1 - t) * (SCALE.length - 1) * 0.8 + 2)]; }
    return { a, b, midi, amp: 0, t: 0, hue: ((midi * 37) % 360) };
  }
  function stopTher() { SD.theremin.stop(); st.ther.on = false; }

  // ---- geometry ----
  const pianoGeo = () => {
    const f = SD.ui.freeRect(); const top = f.y + f.h * 0.42, bottom = f.y + f.h, left = 12, right = SD.W - 12, nW = 14, ww = (right - left) / nW;
    const whites = [], blacks = []; const wNotes = [0, 2, 4, 5, 7, 9, 11];
    for (let i = 0; i < nW; i++) { const midi = 60 + Math.floor(i / 7) * 12 + wNotes[i % 7]; whites.push({ midi, x: left + i * ww, y: top, w: ww, h: bottom - top }); }
    for (let i = 0; i < nW; i++) { const n = wNotes[i % 7]; if (n === 4 || n === 11 || i === nW - 1) continue; const midi = 60 + Math.floor(i / 7) * 12 + n + 1; blacks.push({ midi, x: left + (i + 1) * ww - ww * 0.32, y: top, w: ww * 0.64, h: (bottom - top) * 0.6, black: true }); }
    return { top, bottom, whites, blacks };
  };
  const keyAt = (g, p) => { for (const k of g.blacks) if (p.x >= k.x && p.x < k.x + k.w && p.y >= k.y && p.y < k.y + k.h) return k; for (const k of g.whites) if (p.x >= k.x && p.x < k.x + k.w && p.y >= k.y && p.y < k.y + k.h) return k; return null; };
  const padGeo = () => {
    const cols = SD.W < 700 ? 2 : 4, rows = Math.ceil(PADS.length / cols); const f = SD.ui.freeRect(), top = f.y, bottom = f.y + f.h;
    const cw = (SD.W - 40) / cols, ch = (bottom - top) / rows, r = Math.min(cw, ch) * 0.4;
    return PADS.map((p, i) => ({ kind: p[0], label: p[1], c: p[2], x: 20 + cw * (i % cols + 0.5), y: top + ch * (Math.floor(i / cols) + 0.5), r }));
  };

  function playKey(midi, x, y) {
    SD.pianoNote(SD.midiFreq(midi)); st.pressed.set(midi, SD.now()); SD.burst(x, y - 20, 6, [KEYCOL[midi % 12] || '#5b3df5', '#fff'], { maxSpeed: 200, dur: 0.6 });
    if (st.song) { const s = SONGS[st.song]; if (midi === s.notes[st.songIdx]) { st.songIdx++; if (st.songIdx >= s.notes.length) { st.songIdx = 0; SD.confetti(); SD.praise('You played the song! 🎉'); } } }
  }

  SD.registerMode({
    id: 'music', name: 'Air Music', icon: '🎵', color: 'c6', desc: 'Guitar strings, piano, drums', title: '🎵 Air Music',
    enter(arg) { arg && arg.sub ? open(arg.sub) : picker(); },
    exit() { stopTher(); },
    cursorColor: () => '#ffc93c',
    twoHands: () => true,
    update(dt, hands) {
      const t = SD.now();
      if (st.sub === 'guitar') {
        // two pinching hands make a string
        const pinchers = hands.filter(h => h.pinch && !h.overUI && !h.gone);
        if (pinchers.length >= 2) { st.live = { a: { ...pinchers[0].pin }, b: { ...pinchers[1].pin } }; }
        else if (st.live) { if (SD.dist(st.live.a, st.live.b) > 80) { if (st.strings.length >= 10) st.strings.shift(); const s = mkString(st.live.a, st.live.b); st.strings.push(s); s.amp = 1; s.t = t; SD.pluck(SD.midiFreq(s.midi), 0.6); SD.sfx('stamp'); } st.live = null; }
        // plucking
        for (const h of hands) {
          if (h.overUI || h.gone || (st.live && h.pinch)) continue;
          if (h.src !== 'cam' && !h.pen) continue;
          const a = { x: h.src === 'cam' ? h.ptx : h.px, y: h.src === 'cam' ? h.pty : h.py }, b = h.src === 'cam' ? h.tip : { x: h.x, y: h.y };
          st.strings.forEach((s, i) => {
            const k = h.key + ':' + i; if (t - (st.pluckCool.get(k) || 0) < 120) return;
            if (SD.segCross(a, b, s.a, s.b)) { st.pluckCool.set(k, t); s.amp = 1; s.t = t; s.dir = Math.sign((b.x - a.x) * (s.b.y - s.a.y) - (b.y - a.y) * (s.b.x - s.a.x)) || 1;
              SD.pluck(SD.midiFreq(s.midi), 0.55, 0.6); const c = SD.segCross(a, b, s.a, s.b); SD.burst(s.a.x + (s.b.x - s.a.x) * c.u, s.a.y + (s.b.y - s.a.y) * c.u, 6, [`hsl(${s.hue},90%,60%)`, '#fff'], { maxSpeed: 180, dur: .5, g: 0 }); }
          });
        }
        st.strings.forEach(s => s.amp *= Math.pow(0.04, dt));
      }
      if (st.sub === 'piano') {
        const g = pianoGeo(); const seen = new Set();
        for (const h of hands) {
          if (h.gone) continue;
          const tips = h.src === 'cam' ? [4, 8, 12, 16, 20].map(i => h.lm[i]) : (h.pen ? [{ x: h.x, y: h.y }] : []);
          tips.forEach((p, fi) => {
            const id = h.key + ':' + fi; seen.add(id); const prev = st.fingerKey.get(id);
            let k = p.y > g.top + 6 ? keyAt(g, p) : null; if (!k && prev && p.y > g.top - 10) k = prev; // hysteresis
            if (k && (!prev || prev.midi !== k.midi)) playKey(k.midi, p.x, p.y);
            st.fingerKey.set(id, k);
          });
        }
        for (const k of [...st.fingerKey.keys()]) if (!seen.has(k)) st.fingerKey.delete(k);
      }
      if (st.sub === 'drums') {
        const pads = padGeo(); const seen = new Set();
        for (const h of hands) {
          if (h.overUI || h.gone) continue;
          const pts = h.src === 'cam' ? [h.tip, h.palm] : (h.pen ? [{ x: h.x, y: h.y }] : []);
          pts.forEach((p, pi) => {
            const id = h.key + ':' + pi; seen.add(id); const prev = st.padState.get(id);
            const pad = pads.find(d => Math.hypot(p.x - d.x, p.y - d.y) < d.r * (prev ? 1.08 : 0.95));
            if (pad && (!prev || prev !== pad.kind) && t - (st.padHit.get(pad.kind) || 0) > 110) { SD.drum(pad.kind); st.padHit.set(pad.kind, t); SD.burst(p.x, p.y, 8, [pad.c, '#fff'], { maxSpeed: 260, dur: .5 }); }
            st.padState.set(id, pad ? pad.kind : null);
          });
        }
        for (const k of [...st.padState.keys()]) if (!seen.has(k)) st.padState.delete(k);
      }
      if (st.sub === 'theremin') {
        const h = hands.find(h => !h.gone && !h.overUI && (h.src === 'cam' || h.pen));
        if (h) {
          if (!st.ther.on) { SD.theremin.start(); st.ther.on = true; }
          const p = h.src === 'cam' ? h.tip : h; const tx = SD.clamp(p.x / SD.W, 0, 1), ty = SD.clamp(p.y / SD.H, 0, 1);
          let midi = 48 + tx * 36; if (st.snap) midi = SCALE.reduce((a, b) => Math.abs(b - midi) < Math.abs(a - midi) ? b : a);
          st.ther.f = SD.midiFreq(midi); st.ther.v = (1 - ty) * 0.45; st.ther.x = p.x; st.ther.y = p.y; SD.theremin.set(st.ther.f, st.ther.v);
        } else if (st.ther.on) { SD.theremin.set(st.ther.f || 220, 0); st.ther.v *= 0.9; }
      }
    },
    drawFx(ctx) {
      const t = SD.now();
      if (st.sub === 'guitar') {
        const drawStr = (s, live) => {
          const age = (t - s.t) / 1000, vib = live ? 0 : s.amp * Math.sin(age * 55) * 16 * (s.dir || 1);
          const mx = (s.a.x + s.b.x) / 2, my = (s.a.y + s.b.y) / 2, L = SD.dist(s.a, s.b) || 1, nx = -(s.b.y - s.a.y) / L, ny = (s.b.x - s.a.x) / L;
          const col = live ? '#ffffff' : `hsl(${s.hue},90%,60%)`;
          ctx.save(); ctx.lineCap = 'round'; ctx.shadowBlur = 16 + s.amp * 20; ctx.shadowColor = col; ctx.strokeStyle = col; ctx.lineWidth = live ? 5 : 4 + s.amp * 3;
          ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y); ctx.quadraticCurveTo(mx + nx * vib * 2, my + ny * vib * 2, s.b.x, s.b.y); ctx.stroke();
          ctx.shadowBlur = 0; ctx.fillStyle = '#24194d'; [s.a, s.b].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 7); ctx.fill(); }); ctx.restore();
        };
        st.strings.forEach(s => drawStr(s, false));
        if (st.live) drawStr({ ...st.live, amp: 0, t: 0, hue: 0 }, true);
      }
      if (st.sub === 'piano') {
        const g = pianoGeo(); ctx.save();
        const nextMidi = st.song ? SONGS[st.song].notes[st.songIdx] : null;
        for (const k of g.whites) {
          const p = t - (st.pressed.get(k.midi) || 0) < 220; ctx.fillStyle = p ? (KEYCOL[k.midi % 12] || '#ddd') : '#ffffff'; ctx.strokeStyle = '#24194d'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(k.x + 2, k.y, k.w - 4, k.h, [0, 0, 14, 14]) : ctx.rect(k.x + 2, k.y, k.w - 4, k.h); ctx.fill(); ctx.stroke();
          if (k.midi === nextMidi) { ctx.fillStyle = 'rgba(255,201,60,.55)'; ctx.fill(); ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('👇', k.x + k.w / 2, k.y - 12); }
          ctx.fillStyle = KEYCOL[k.midi % 12]; ctx.beginPath(); ctx.arc(k.x + k.w / 2, k.y + k.h - 46, Math.min(16, k.w * 0.22), 0, 7); ctx.fill();
          ctx.fillStyle = '#24194d'; ctx.font = `800 ${Math.min(18, k.w * 0.28)}px "Baloo 2",sans-serif`; ctx.textAlign = 'center'; ctx.fillText(SOLFA[k.midi % 12], k.x + k.w / 2, k.y + k.h - 14);
        }
        for (const k of g.blacks) { const p = t - (st.pressed.get(k.midi) || 0) < 220; ctx.fillStyle = p ? '#7b5cff' : '#24194d'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(k.x, k.y, k.w, k.h, [0, 0, 10, 10]) : ctx.rect(k.x, k.y, k.w, k.h); ctx.fill(); if (k.midi === nextMidi) { ctx.fillStyle = 'rgba(255,201,60,.7)'; ctx.fill(); } }
        if (st.song) { const s = SONGS[st.song]; ctx.fillStyle = SD.S.board === 'night' ? '#fff' : '#24194d'; ctx.font = '800 24px "Baloo 2",sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${s.name}  —  note ${st.songIdx + 1} of ${s.notes.length}`, SD.W / 2, g.top - 50); }
        ctx.restore();
      }
      if (st.sub === 'drums') {
        ctx.save();
        for (const d of padGeo()) { const age = (t - (st.padHit.get(d.kind) || 0)) / 1000, k = age < 0.18 ? 1 + (0.18 - age) * 0.8 : 1;
          ctx.fillStyle = d.c; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(d.x, d.y, d.r * k, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.max(16, d.r * 0.28)}px "Baloo 2","Segoe UI Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.label, d.x, d.y); }
        ctx.restore();
      }
      if (st.sub === 'theremin') {
        const v = st.ther.v || 0, f = st.ther.f || 220; ctx.save();
        for (let w = 0; w < 4; w++) { ctx.strokeStyle = `hsla(${(Math.log2(f / 110) * 90 + w * 40) % 360},90%,60%,${0.25 + v})`; ctx.lineWidth = 6 - w; ctx.beginPath();
          for (let x = 0; x <= SD.W; x += 8) { const y = SD.H / 2 + Math.sin(x * f / 9000 + t / 160 + w) * v * SD.H * 0.5 * (1 - w * 0.15); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
        ctx.fillStyle = 'rgba(36,25,77,.35)'; ctx.font = '800 20px "Baloo 2",sans-serif'; ctx.textAlign = 'left'; ctx.fillText('🔈 low', 20, SD.H - 110); ctx.textAlign = 'right'; ctx.fillText('high 🔊', SD.W - 20, SD.H - 110);
        ctx.restore();
      }
    },
  });
})(window.SD);
