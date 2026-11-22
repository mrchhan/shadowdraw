/* Magic Hands Sticker World — pinch to grab & move, two hands to grow/shrink/rotate */
(function (SD) {
  const EMOJI = ['🦁', '🐶', '🐱', '🐰', '🐼', '🐸', '🦋', '🐠', '🐳', '🦄', '🦖', '🐞', '🌸', '🌻', '🌳', '🌈', '☀️', '🌙', '⭐', '☁️', '🚀', '🚗', '✈️', '🚂', '🏠', '🏰', '🎈', '🎁', '⚽', '🍎', '🍦', '🍩'];
  const BGS = [['sky', '🌤️ Sky'], ['sea', '🌊 Sea'], ['space', '🪐 Space'], ['farm', '🌾 Farm'], ['plain', '📄 Plain']];
  const st = { bg: 'sky', items: [], grabs: new Map(), duo: null, hover: null };
  let BG = null, S = null;
  const EF = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  function drawBg() {
    const c = BG.ctx, W = SD.W, H = SD.H; c.clearRect(0, 0, W, H);
    const lin = (a, b) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H); };
    if (st.bg === 'sky') { lin('#8fd8ff', '#e6f8ff'); c.fillStyle = '#ffd84d'; c.beginPath(); c.arc(W * .85, H * .18, 60, 0, 7); c.fill();
      c.fillStyle = '#7ed957'; c.beginPath(); c.ellipse(W * .25, H * 1.02, W * .5, H * .3, 0, 0, 7); c.fill(); c.fillStyle = '#5cc93f'; c.beginPath(); c.ellipse(W * .8, H * 1.05, W * .55, H * .32, 0, 0, 7); c.fill(); }
    else if (st.bg === 'sea') { lin('#5ad1f5', '#0b5fa8'); c.fillStyle = '#f5d68b'; c.beginPath(); c.ellipse(W / 2, H * 1.04, W * .7, H * .14, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 18; i++) { c.beginPath(); c.arc((i * 97) % W, (i * 173) % H, 6 + (i % 4) * 4, 0, 7); c.fill(); } }
    else if (st.bg === 'space') { lin('#120a3a', '#2c1470'); c.fillStyle = '#fff'; for (let i = 0; i < 120; i++) { c.globalAlpha = (i % 5) / 5 + .2; c.fillRect((i * 137.5) % W, (i * 89.3) % H, 2, 2); } c.globalAlpha = 1;
      c.fillStyle = '#ff9f6b'; c.beginPath(); c.arc(W * .15, H * .8, 70, 0, 7); c.fill(); }
    else if (st.bg === 'farm') { lin('#bfe9ff', '#fff3c4'); c.fillStyle = '#8cd35f'; c.fillRect(0, H * .62, W, H * .38); c.fillStyle = '#c47a3a'; for (let x = 0; x < W; x += 40) c.fillRect(x, H * .58, 10, H * .08); c.fillRect(0, H * .6, W, 8); }
    else { c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); }
  }
  const trash = () => ({ x: SD.S.lefty ? SD.W - 70 : 70, y: SD.H - 160, r: 46 });
  const hitItem = (p) => { for (let i = st.items.length - 1; i >= 0; i--) { const it = st.items[i]; if (Math.hypot(p.x - it.x, p.y - it.y) < it.s * 0.62) return it; } return null; };
  const bringFront = (it) => { st.items.splice(st.items.indexOf(it), 1); st.items.push(it); };
  function add(e) { const it = { e, x: SD.W / 2 + SD.rnd(-80, 80), y: SD.H / 2 + SD.rnd(-60, 60), s: Math.min(SD.W, SD.H) * 0.16, rot: 0, pop: SD.now() }; st.items.push(it); SD.sfx('stamp'); }

  function render() {
    const c = S.ctx; c.clearRect(0, 0, SD.W, SD.H); const t = SD.now();
    for (const it of st.items) {
      const k = Math.min(1, (t - (it.pop || 0)) / 250), bounce = k < 1 ? 0.6 + Math.sin(k * Math.PI) * 0.5 + k * 0.4 : 1;
      c.save(); c.translate(it.x, it.y); c.rotate(it.rot); c.font = `${it.s * bounce}px ${EF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (st.hover === it || [...st.grabs.values()].some(g => g.it === it)) { c.shadowBlur = 24; c.shadowColor = '#ffc93c'; }
      c.fillText(it.e, 0, it.s * 0.05); c.restore();
    }
  }

  SD.registerMode({
    id: 'stickers', name: 'Sticker World', icon: '🦄', color: 'c8', desc: 'Grab, grow & spin stickers with two hands', title: '🦄 Sticker World',
    enter() {
      BG = SD.makeLayer('stkBg'); S = SD.makeLayer('stk'); BG.show(); S.show(); drawBg();
      const tray = SD.html('<div class="palette"></div>');
      EMOJI.forEach(e => { const b = SD.html(`<button class="hit sw" style="background:#fff;font-size:28px;display:grid;place-items:center">${e}</button>`); b.onclick = () => add(e); tray.appendChild(b); });
      SD.$('#sideTools').appendChild(tray);
      SD.$('#modeTools').appendChild(SD.ui.group(BGS, () => st.bg, v => { st.bg = v; drawBg(); }, 'chip small'));
      const bot = SD.$('#bottomTools');
      bot.appendChild(SD.ui.btn('↩️ Remove last', () => { st.items.pop(); SD.sfx('whoosh'); }, 'chip small'));
      bot.appendChild(SD.ui.btn('🧹 Clear', () => { st.items = []; SD.sfx('whoosh'); }, 'chip small'));
      bot.appendChild(SD.ui.btn('💾 Save', async () => { render(); await SD.saveArt('stickers', [BG.canvas, S.canvas], '#ffffff'); SD.praise(); }, 'chip small'));
      const h = SD.ui.hint('Tap a sticker to add it · 🤏 pinch to grab & move · 🤏🤏 two hands to grow and spin · drop on 🗑️ to remove'); setTimeout(() => h.remove(), 9000);
      if (!st.items.length) { add('🦁'); add('🌈'); }
    },
    exit() { BG.hide(); S.hide(); st.grabs.clear(); st.duo = null; },
    onResize() { drawBg(); },
    cursorColor: () => '#22c39a',
    twoHands: () => true,
    update(dt, hands) {
      const live = hands.filter(h => !h.gone);
      st.hover = null; for (const h of live) if (!h.overUI) { const it = hitItem(h); if (it) st.hover = it; }
      // releases
      for (const [k, g] of [...st.grabs]) {
        const h = live.find(x => x.key === k);
        if (!h || !h.pinch) { st.grabs.delete(k);
          if (st.duo && (st.duo.a === k || st.duo.b === k)) { st.duo = null; for (const [k2, g2] of st.grabs) { const h2 = live.find(x => x.key === k2); if (h2) { g2.dx = g2.it.x - h2.x; g2.dy = g2.it.y - h2.y; } } }
          const tr = trash(); if (h && Math.hypot(g.it.x - tr.x, g.it.y - tr.y) < tr.r + 30 && ![...st.grabs.values()].some(o => o.it === g.it)) { st.items.splice(st.items.indexOf(g.it), 1); SD.sfx('whoosh'); SD.burst(tr.x, tr.y, 12); } else SD.sfx('drop'); }
      }
      // new grabs
      for (const h of live) {
        if (!h.pinchDown || h.overUI || st.grabs.has(h.key)) continue;
        let it = hitItem(h);
        const other = [...st.grabs.entries()].find(([k]) => k !== h.key);
        if (!it && other && !st.duo) it = other[1].it; // second hand anywhere = two-hand transform on held sticker
        if (!it) continue;
        bringFront(it); st.grabs.set(h.key, { it, dx: it.x - h.x, dy: it.y - h.y }); SD.sfx('grab');
        const o = [...st.grabs.entries()].find(([k, g]) => k !== h.key && g.it === it);
        if (o) { const h2 = live.find(x => x.key === o[0]); if (h2) st.duo = { a: o[0], b: h.key, it, d0: SD.dist(h, h2) || 1, a0: Math.atan2(h.y - h2.y, h.x - h2.x), s0: it.s, r0: it.rot, mx0: (h.x + h2.x) / 2, my0: (h.y + h2.y) / 2, x0: it.x, y0: it.y }; }
      }
      // move
      if (st.duo) {
        const A = live.find(x => x.key === st.duo.a), Bh = live.find(x => x.key === st.duo.b);
        if (A && Bh) { const D = st.duo, d = SD.dist(A, Bh), ang = Math.atan2(Bh.y - A.y, Bh.x - A.x);
          D.it.s = SD.clamp(D.s0 * d / D.d0, 30, Math.min(SD.W, SD.H) * 0.8); D.it.rot = D.r0 + (ang - D.a0); D.it.x = D.x0 + (A.x + Bh.x) / 2 - D.mx0; D.it.y = D.y0 + (A.y + Bh.y) / 2 - D.my0; }
      } else for (const [k, g] of st.grabs) { const h = live.find(x => x.key === k); if (h) { g.it.x = h.x + g.dx; g.it.y = h.y + g.dy; } }
      render();
    },
    drawFx(ctx) {
      if (!st.grabs.size) return; const tr = trash(); ctx.save(); ctx.fillStyle = 'rgba(255,93,115,.9)'; ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, 7); ctx.fill();
      ctx.font = `40px ${EF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🗑️', tr.x, tr.y + 2); ctx.restore();
    },
  });
})(window.SD);
