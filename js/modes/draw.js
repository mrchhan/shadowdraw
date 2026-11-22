/* Draw in the Air — brushes, mirror/kaleidoscope, magic shapes (balloons), palm eraser, two players, undo, time-lapse data */
(function (SD) {
  const BRUSHES = [['pen', '🖊️ Pen'], ['neon', '💡 Neon'], ['rainbow', '🌈 Rainbow'], ['glitter', '✨ Glitter'], ['spray', '💨 Spray'], ['crayon', '🖍️ Crayon'], ['eraser', '🧽 Eraser']];
  const SIZES = [[7, 'S'], [14, 'M'], [26, 'L'], [44, 'XL']];

  // ---------- Shared brush renderer (also used by gallery replay) ----------
  const B = SD.brush = {};
  B.symFns = (sym, cx, cy) => {
    const id = p => p;
    if (sym === 'mirror') return [id, p => ({ x: 2 * cx - p.x, y: p.y })];
    if (sym === 'quad') return [id, p => ({ x: 2 * cx - p.x, y: p.y }), p => ({ x: p.x, y: 2 * cy - p.y }), p => ({ x: 2 * cx - p.x, y: 2 * cy - p.y })];
    if (sym === 'kaleido') {
      const out = [], n = 6;
      for (let k = 0; k < n; k++) { const a = k * Math.PI * 2 / n, ca = Math.cos(a), sa = Math.sin(a);
        const rot = p => ({ x: cx + (p.x - cx) * ca - (p.y - cy) * sa, y: cy + (p.x - cx) * sa + (p.y - cy) * ca });
        out.push(rot, p => rot({ x: 2 * cx - p.x, y: p.y })); }
      return out;
    }
    return [id];
  };
  B.begin = (s) => { s._rng = SD.seeded(s.seed); s._len = 0; s._fns = B.symFns(s.sym, s.cx, s.cy); };
  B.seg = (ctx, s, i) => {
    const a0 = s.pts[i - 1], b0 = s.pts[i]; if (!a0 || !b0) return;
    const segLen = Math.hypot(b0.x - a0.x, b0.y - a0.y); s._len += segLen;
    const rng = s._rng, size = s.size;
    for (const f of s._fns) {
      const a = f(a0), b = f(b0);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      switch (s.brush) {
        case 'eraser': ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = size * 2.2; line(ctx, a, b, '#000'); break;
        case 'neon': ctx.shadowBlur = size * 1.4; ctx.shadowColor = s.color; ctx.lineWidth = size; line(ctx, a, b, s.color); ctx.shadowBlur = 0; ctx.lineWidth = Math.max(2, size * 0.35); line(ctx, a, b, 'rgba(255,255,255,.9)'); break;
        case 'rainbow': ctx.lineWidth = size; line(ctx, a, b, `hsl(${(s.hue0 + s._len * 0.45) % 360},92%,58%)`); break;
        case 'glitter': {
          ctx.lineWidth = size * 0.55; ctx.globalAlpha = 0.55; line(ctx, a, b, s.color); ctx.globalAlpha = 1;
          const n = Math.max(1, Math.round(segLen / 6));
          for (let k = 0; k < n; k++) { const t = rng(), r = size * 1.3; const x = a.x + (b.x - a.x) * t + (rng() - .5) * r * 2, y = a.y + (b.y - a.y) * t + (rng() - .5) * r * 2;
            ctx.fillStyle = rng() < 0.35 ? '#fff6a8' : rng() < 0.5 ? '#ffffff' : s.color; SD.drawStar(ctx, x, y, 2 + rng() * size * 0.35, 4, 0.35); ctx.fill(); }
          break; }
        case 'spray': {
          ctx.fillStyle = s.color; const n = Math.max(2, Math.round(segLen * size * 0.05) + 4), r = size * 1.7;
          for (let k = 0; k < n; k++) { const t = rng(), ang = rng() * 6.283, rr = Math.sqrt(rng()) * r; ctx.globalAlpha = 0.5 + rng() * 0.5;
            ctx.fillRect(a.x + (b.x - a.x) * t + Math.cos(ang) * rr, a.y + (b.y - a.y) * t + Math.sin(ang) * rr, 1.8, 1.8); }
          break; }
        case 'crayon': {
          for (let k = 0; k < 5; k++) { const ox = (rng() - .5) * size * 0.8, oy = (rng() - .5) * size * 0.8; ctx.globalAlpha = 0.35 + rng() * 0.3; ctx.lineWidth = Math.max(1.5, size * 0.28);
            line(ctx, { x: a.x + ox, y: a.y + oy }, { x: b.x + ox, y: b.y + oy }, s.color); }
          break; }
        default: ctx.lineWidth = size; line(ctx, a, b, s.color);
      }
      ctx.restore();
    }
  };
  function line(ctx, a, b, col) { ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  B.redraw = (ctx, strokes, w = SD.W, h = SD.H) => {
    ctx.clearRect(0, 0, w, h);
    for (const s of strokes) { if (s.type === 'clear') { ctx.clearRect(0, 0, w, h); continue; } B.begin(s); for (let i = 1; i < s.pts.length; i++) B.seg(ctx, s, i); }
  };

  // ---------- Mode ----------
  const st = { strokes: [], active: new Map(), balloons: [], sym: 'off', magic: true, palmErase: true, twoP: false,
    players: [{ color: '#6a4cff', brush: 'neon', size: 14 }, { color: '#ff3b5c', brush: 'rainbow', size: 14 }], openSince: new Map() };
  let L = null;
  const playerFor = (h) => st.twoP ? st.players[h.x < SD.W / 2 ? 0 : 1] : st.players[0];

  function finish(key) {
    const s = st.active.get(key); if (!s) return; st.active.delete(key);
    if (s.pts.length === 1) { const p = s.pts[0]; s.pts.push({ x: p.x + 0.5, y: p.y + 0.5, t: p.t }); B.seg(L.ctx, s, 1); return; }
    if (st.magic && s.brush !== 'eraser' && s.type === 'brush' && st.sym === 'off') {
      const c = circleFit(s.pts);
      if (c) { st.strokes.splice(st.strokes.indexOf(s), 1); B.redraw(L.ctx, st.strokes);
        st.balloons.push({ x: c.x, y: c.y, r: SD.clamp(c.r, 30, 160), color: s.brush === 'rainbow' ? `hsl(${s.hue0},90%,60%)` : s.color, vy: -SD.rnd(40, 70), ph: Math.random() * 6, born: SD.now() });
        SD.sfx('star'); SD.burst(c.x, c.y, 18); SD.toast('Magic balloon! Pop it with your finger 🎈'); }
    }
  }
  function circleFit(pts) {
    if (pts.length < 14) return null;
    let cx = 0, cy = 0; pts.forEach(p => { cx += p.x; cy += p.y; }); cx /= pts.length; cy /= pts.length;
    const rs = pts.map(p => Math.hypot(p.x - cx, p.y - cy)), r = rs.reduce((a, b) => a + b, 0) / rs.length;
    if (r < 35) return null;
    const sd = Math.sqrt(rs.reduce((a, b) => a + (b - r) ** 2, 0) / rs.length);
    const closed = SD.dist(pts[0], pts[pts.length - 1]) < r * 0.6;
    let sweep = 0; for (let i = 1; i < pts.length; i++) { let d = Math.atan2(pts[i].y - cy, pts[i].x - cx) - Math.atan2(pts[i - 1].y - cy, pts[i - 1].x - cx); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; sweep += d; }
    return (closed || Math.abs(sweep) > Math.PI * 1.9) && sd / r < 0.3 && Math.abs(sweep) > Math.PI * 1.65 ? { x: cx, y: cy, r } : null;
  }

  function buildTools() {
    SD.ui.clearTools();
    const top = SD.$('#modeTools');
    if (!st.twoP) {
      const p = st.players[0];
      const bg = SD.ui.group(BRUSHES.map(([v, l]) => [v, l]), () => p.brush, v => { p.brush = v; }, 'chip small'); top.appendChild(bg);
      top.appendChild(SD.ui.group(SIZES.map(([v, l]) => [v, l]), () => p.size, v => { p.size = +v; }, 'chip small'));
      const pal = SD.ui.palette(() => p.color, c => { p.color = c; if (c === 'rainbow') { p.brush = 'rainbow'; bg.refresh(); } else if (p.brush === 'eraser' || p.brush === 'rainbow') { p.brush = 'pen'; bg.refresh(); } }, { rainbow: true });
      SD.$('#sideTools').appendChild(pal);
    } else {
      ['left', 'right'].forEach((side, i) => {
        const p = st.players[i]; const w = SD.html(`<div class="p2wrap ${side}"><div class="p2tag">Player ${i + 1}</div></div>`);
        const pal = SD.ui.palette(() => p.color, c => { p.color = c; if (p.brush === 'eraser') p.brush = 'pen'; upd(); }, { colors: SD.COLORS.slice(0, 9) }); w.appendChild(pal);
        const bb = SD.ui.btn('', () => { const k = BRUSHES.findIndex(b => b[0] === p.brush); p.brush = BRUSHES[(k + 1) % BRUSHES.length][0]; upd(); }, 'chip small'); w.appendChild(bb);
        const upd = () => { bb.textContent = BRUSHES.find(b => b[0] === p.brush)[1]; pal.refresh(); }; upd();
        SD.$('#ui').appendChild(w);
      });
    }
    const bot = SD.$('#bottomTools');
    bot.appendChild(SD.ui.group([['off', '✏️', 'Normal'], ['mirror', '🦋', 'Mirror'], ['quad', '❄️', '4-way mirror'], ['kaleido', '🔮', 'Kaleidoscope']], () => st.sym, v => { st.sym = v; }, 'chip small'));
    bot.appendChild(SD.ui.toggle('🎈 Magic', () => st.magic, v => st.magic = v, 'chip small'));
    bot.appendChild(SD.ui.toggle('🖐️ Rub out', () => st.palmErase, v => st.palmErase = v, 'chip small'));
    bot.appendChild(SD.ui.toggle('👫 2P', () => st.twoP, v => { st.twoP = v; buildTools(); }, 'chip small'));
    bot.appendChild(SD.ui.group([['paper', '📄', 'Paper'], ['night', '🌙', 'Night'], ['camera', '📷', 'Camera']], () => SD.S.board, v => SD.setSetting('board', v), 'chip small'));
    bot.appendChild(SD.ui.btn('↩️', undo, 'chip small', 'Undo'));
    bot.appendChild(SD.ui.btn('🗑️', clearAll, 'chip small', 'Clear'));
    bot.appendChild(SD.ui.btn('💾 Save', save, 'chip small'));
  }
  function undo() {
    for (const k of [...st.active.keys()]) st.active.delete(k);
    if (st.strokes.length) { st.strokes.pop(); B.redraw(L.ctx, st.strokes); SD.sfx('whoosh'); }
  }
  function clearAll() { st.active.clear(); if (!st.strokes.length || st.strokes[st.strokes.length - 1].type === 'clear') return; st.strokes.push({ type: 'clear', pts: [] }); L.ctx.clearRect(0, 0, SD.W, SD.H); st.balloons = []; SD.sfx('whoosh'); SD.toast('Fresh page! (Undo brings it back)'); }
  async function save() {
    const startIdx = st.strokes.map(s => s.type).lastIndexOf('clear') + 1;
    const strokes = st.strokes.slice(startIdx).map(s => ({ type: s.type, brush: s.brush, color: s.color, size: s.size, sym: s.sym, cx: s.cx, cy: s.cy, seed: s.seed, hue0: s.hue0, pts: s.pts.map(p => [Math.round(p.x), Math.round(p.y), Math.round(p.t)]) }));
    if (!strokes.length) { SD.toast('Draw something first ✨'); return; }
    const bg = SD.S.board === 'night' ? '#141033' : '#ffffff';
    await SD.saveArt('draw', [L.canvas], bg, { strokes, sw: SD.W, sh: SD.H, bg });
    SD.praise();
  }

  SD.registerMode({
    id: 'draw', name: 'Draw in the Air', icon: '✨', color: 'c5', desc: 'Neon, rainbow & glitter brushes', title: '✨ Draw in the Air',
    enter() { L = SD.makeLayer('draw'); L.show(); buildTools();
      st.hint = SD.ui.hint(SD.S.drawGesture === 'point' ? '☝️ Point your finger to draw · ✊ make a fist to stop · Draw a circle for a balloon!' : '🤏 Pinch (thumb + pointer finger) to draw · ✋ open hand to rub out · Draw a circle for a balloon!');
      setTimeout(() => st.hint && st.hint.remove(), 9000); },
    exit() { L.hide(); for (const k of [...st.active.keys()]) finish(k); },
    palmErase: () => st.palmErase,
    twoHands: () => st.twoP,
    cursorColor: (h) => { const p = playerFor(h); return p.brush === 'eraser' ? '#ffffff' : p.brush === 'rainbow' ? 'rainbow' : p.color; },
    update(dt, hands) {
      const t = SD.now();
      for (const h of hands) {
        // palm eraser
        if (h.src === 'cam' && st.palmErase && h.open && !h.overUI) {
          if (!st.openSince.has(h.key)) st.openSince.set(h.key, t);
          if (t - st.openSince.get(h.key) > 350) {
            let s = st.active.get(h.key + 'e');
            if (!s) { s = { type: 'brush', brush: 'eraser', color: '#000', size: h.size * 0.45, sym: 'off', cx: SD.W / 2, cy: SD.H / 2, seed: 1, hue0: 0, pts: [{ x: h.palm.x, y: h.palm.y, t }] }; B.begin(s); st.strokes.push(s); st.active.set(h.key + 'e', s); }
            else if (SD.dist(s.pts[s.pts.length - 1], h.palm) > 2) { s.pts.push({ x: h.palm.x, y: h.palm.y, t }); B.seg(L.ctx, s, s.pts.length - 1); }
          }
        } else { st.openSince.delete(h.key); if (st.active.has(h.key + 'e')) st.active.delete(h.key + 'e'); }

        const drawing = h.pen && !h.overUI && !h.gone;
        let s = st.active.get(h.key);
        if (drawing) {
          if (!s) {
            const p = playerFor(h);
            s = { type: 'brush', brush: p.color === 'rainbow' ? 'rainbow' : p.brush, color: p.color === 'rainbow' ? '#ff3b5c' : p.color, size: p.size, sym: st.sym, cx: SD.W / 2, cy: SD.H / 2,
              seed: (Math.random() * 1e9) | 0, hue0: Math.random() * 360, pts: [{ x: h.x, y: h.y, t }] };
            B.begin(s); st.strokes.push(s); st.active.set(h.key, s);
          } else {
            const last = s.pts[s.pts.length - 1];
            if (SD.dist(last, h) > 1.5) { s.pts.push({ x: h.x, y: h.y, t }); B.seg(L.ctx, s, s.pts.length - 1); }
          }
        } else if (s) finish(h.key);
      }
      for (const k of [...st.active.keys()]) if (!k.endsWith('e') && !hands.find(h => h.key === k)) finish(k);
      // balloons
      for (let i = st.balloons.length - 1; i >= 0; i--) {
        const b = st.balloons[i]; b.y += b.vy * dt; b.ph += dt * 2; b.x += Math.sin(b.ph) * 0.6;
        const age = t - b.born;
        const hit = age > 600 && hands.some(h => !h.overUI && (Math.hypot(h.tip.x - b.x, h.tip.y - b.y) < b.r || (h.src !== 'cam' && h.pen && Math.hypot(h.x - b.x, h.y - b.y) < b.r)));
        if (hit || b.y < -b.r * 2) { if (hit) { SD.sfx('pop'); SD.burst(b.x, b.y, 30, [b.color, '#fff', '#ffc93c']); } st.balloons.splice(i, 1); }
      }
    },
    drawFx(ctx) {
      if (st.twoP) { ctx.save(); ctx.setLineDash([14, 12]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(91,61,245,.35)'; ctx.beginPath(); ctx.moveTo(SD.W / 2, 70); ctx.lineTo(SD.W / 2, SD.H - 70); ctx.stroke(); ctx.restore(); }
      if (st.sym !== 'off') { ctx.save(); ctx.globalAlpha = 0.18; ctx.strokeStyle = '#5b3df5'; ctx.lineWidth = 2; ctx.setLineDash([6, 10]);
        B.symFns(st.sym, SD.W / 2, SD.H / 2).forEach(f => { const a = f({ x: SD.W / 2, y: SD.H / 2 }), b = f({ x: SD.W / 2, y: -SD.H }); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }); ctx.restore(); }
      for (const b of st.balloons) {
        ctx.save(); ctx.strokeStyle = 'rgba(36,25,77,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x, b.y + b.r); ctx.quadraticCurveTo(b.x + Math.sin(b.ph) * 14, b.y + b.r * 1.6, b.x, b.y + b.r * 2.2); ctx.stroke();
        const g = ctx.createRadialGradient(b.x - b.r * .35, b.y - b.r * .4, b.r * .1, b.x, b.y, b.r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, b.color); g.addColorStop(1, b.color);
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 0.9, b.r, 0, 0, 7); ctx.fill();
        ctx.fillStyle = b.color; ctx.beginPath(); ctx.moveTo(b.x - 8, b.y + b.r + 8); ctx.lineTo(b.x + 8, b.y + b.r + 8); ctx.lineTo(b.x, b.y + b.r - 4); ctx.fill(); ctx.restore();
      }
    },
    // for gallery "colour my drawing" and tests
    _state: st,
  });
})(window.SD);
