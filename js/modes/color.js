/* Colour & Paint — colouring book with magic fill, brushes, own-lines, print, undo */
(function (SD) {
  const st = { page: null, tool: 'fill', color: '#ff3b5c', brush: 'pen', size: 14, box: null, undo: [], lineMask: null, active: new Map() };
  let P = null, Ln = null;

  const calcBox = () => { const f = SD.ui.freeRect(); const s = Math.round(Math.max(160, Math.min(f.w, f.h))); return { x: Math.round(f.x + (f.w - s) / 2), y: Math.round(f.y + (f.h - s) / 2), s }; };
  const inBox = (p) => st.box && p.x >= st.box.x && p.y >= st.box.y && p.x < st.box.x + st.box.s && p.y < st.box.y + st.box.s;
  const devRect = () => { const d = SD.dpr, b = st.box; return { x: Math.round(b.x * d), y: Math.round(b.y * d), w: Math.round(b.s * d), h: Math.round(b.s * d) }; };

  function renderLines() {
    Ln.ctx.clearRect(0, 0, SD.W, SD.H);
    if (st.page && st.page !== 'own') SD.drawPage(Ln.ctx, st.page, st.box.x, st.box.y, st.box.s);
    if (st.ownLines) Ln.ctx.drawImage(st.ownLines, st.box.x, st.box.y, st.box.s, st.box.s);
    st.lineMask = null;
  }
  function paper() { const c = P.ctx; c.clearRect(0, 0, SD.W, SD.H); c.fillStyle = '#ffffff'; c.fillRect(st.box.x, st.box.y, st.box.s, st.box.s); }

  function pushUndo() {
    const r = devRect(); try { st.undo.push({ paint: P.canvas.getContext('2d').getImageData(r.x, r.y, r.w, r.h), lines: Ln.canvas.getContext('2d').getImageData(r.x, r.y, r.w, r.h) }); } catch (e) {}
    if (st.undo.length > 20) st.undo.shift();
  }
  function undo() { const u = st.undo.pop(); if (!u) return; const r = devRect(); P.canvas.getContext('2d').putImageData(u.paint, r.x, r.y); Ln.canvas.getContext('2d').putImageData(u.lines, r.x, r.y); st.lineMask = null; SD.sfx('whoosh'); }

  // Scanline flood fill: lines layer = walls, paint layer = what gets coloured
  function fill(px, py) {
    const r = devRect(), d = SD.dpr; const sx = Math.round(px * d) - r.x, sy = Math.round(py * d) - r.y;
    if (sx < 0 || sy < 0 || sx >= r.w || sy >= r.h) return false;
    const pc = P.canvas.getContext('2d'), lc = Ln.canvas.getContext('2d');
    if (!st.lineMask) { const ld = lc.getImageData(r.x, r.y, r.w, r.h).data; const m = new Uint8Array(r.w * r.h); for (let i = 0; i < m.length; i++) m[i] = ld[i * 4 + 3] > 150 ? 1 : 0; st.lineMask = m; }
    const mask = st.lineMask, W = r.w, H = r.h;
    // if pinched right on a line, look for the nearest open pixel
    let seed = sy * W + sx;
    if (mask[seed]) { let found = -1; for (let rad = 1; rad < 12 * d && found < 0; rad++) for (let a = 0; a < 8; a++) { const x = sx + Math.round(Math.cos(a * .785) * rad), y = sy + Math.round(Math.sin(a * .785) * rad); if (x >= 0 && y >= 0 && x < W && y < H && !mask[y * W + x]) { found = y * W + x; break; } } if (found < 0) return false; seed = found; }
    const img = pc.getImageData(r.x, r.y, W, H), px32 = new Uint32Array(img.data.buffer);
    const target = px32[seed];
    const rainbow = st.color === 'rainbow';
    const fc = rainbow ? 0 : hexTo32(st.color);
    if (!rainbow && target === fc) return false;
    const seen = new Uint8Array(W * H); const stack = [seed]; let count = 0;
    const ok = (i) => !seen[i] && !mask[i] && px32[i] === target;
    while (stack.length) {
      let i = stack.pop(); if (!ok(i)) continue;
      let x = i % W; const y = (i - x) / W;
      while (x > 0 && ok(i - 1)) { i--; x--; }
      let up = false, dn = false;
      while (x < W && ok(i)) {
        seen[i] = 1; px32[i] = rainbow ? hslTo32(((x + y) / (W + H)) * 360 * 1.5) : fc; count++;
        if (y > 0) { const u = i - W; if (ok(u)) { if (!up) { stack.push(u); up = true; } } else up = false; }
        if (y < H - 1) { const dd = i + W; if (ok(dd)) { if (!dn) { stack.push(dd); dn = true; } } else dn = false; }
        i++; x++;
      }
    }
    // grow 1px under anti-aliased line edges to avoid white halos
    for (let pass = 0; pass < Math.ceil(d * 1.5); pass++) {
      const grow = [];
      for (let i = W; i < W * H - W; i++) if (seen[i] === 1) { for (const n of [i - 1, i + 1, i - W, i + W]) if (!seen[n] && mask[n] && px32[n] === target) grow.push(n); }
      for (const n of grow) { seen[n] = 1; const x = n % W, y = (n / W) | 0; px32[n] = rainbow ? hslTo32(((x + y) / (W + H)) * 540) : fc; }
    }
    pc.putImageData(img, r.x, r.y);
    return count > 0;
  }
  function hexTo32(hex) { const n = parseInt(hex.slice(1), 16); return (255 << 24 | (n & 255) << 16 | ((n >> 8) & 255) << 8 | (n >> 16)) >>> 0; }
  function hslTo32(h) { h = ((h % 360) + 360) % 360; const s = 0.9, l = 0.62; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return (255 << 24 | Math.round(f(4) * 255) << 16 | Math.round(f(8) * 255) << 8 | Math.round(f(0) * 255)) >>> 0; }

  function tools() {
    SD.ui.clearTools();
    const top = SD.$('#modeTools');
    const tg = SD.ui.group([['fill', '🪣 Fill'], ['brush', '🖌️ Paint'], ['lines', '✏️ Lines']], () => st.tool, v => { st.tool = v; }, 'chip small'); top.appendChild(tg);
    top.appendChild(SD.ui.group([['pen', '🖊️'], ['crayon', '🖍️'], ['glitter', '✨'], ['spray', '💨']], () => st.brush, v => { st.brush = v; if (st.tool === 'fill') { st.tool = 'brush'; tg.refresh(); } }, 'chip small'));
    top.appendChild(SD.ui.group([[7, 'S'], [14, 'M'], [28, 'L']], () => st.size, v => { st.size = +v; }, 'chip small'));
    SD.$('#sideTools').appendChild(SD.ui.palette(() => st.color, c => { st.color = c; }, { rainbow: true, colors: SD.COLORS.slice(0, 11).concat(['#ffd8b1', '#a6e3ff']) }));
    const bot = SD.$('#bottomTools');
    bot.appendChild(SD.ui.btn('📚 Pages', () => picker(), 'chip small'));
    bot.appendChild(SD.ui.btn('⏭️ Next', () => { const i = SD.PAGES.indexOf(st.page); openPage(SD.PAGES[(i + 1) % SD.PAGES.length]); }, 'chip small'));
    bot.appendChild(SD.ui.btn('↩️ Undo', undo, 'chip small'));
    bot.appendChild(SD.ui.btn('🧼 Clean page', () => { pushUndo(); paper(); SD.sfx('whoosh'); }, 'chip small'));
    bot.appendChild(SD.ui.btn('🖨️ Print', () => { SD.snapshot([Ln.canvas], '#ffffff', { x: st.box.x, y: st.box.y, w: st.box.s, h: st.box.s }).then(s => SD.printImage(URL.createObjectURL(s.blob))); }, 'chip small'));
    bot.appendChild(SD.ui.btn('💾 Save', async () => { await SD.saveArt('color', [P.canvas, Ln.canvas], '#ffffff', { title: st.page === 'own' ? 'My page' : st.page.name }, { x: st.box.x, y: st.box.y, w: st.box.s, h: st.box.s }); SD.praise(); }, 'chip small'));
  }
  function openPage(page) {
    SD.$('#screens').innerHTML = ''; tools();
    st.page = page; st.ownLines = null; st.undo = []; st.box = calcBox(); paper(); renderLines();
    SD.ui.setTitle('🎨 ' + (page === 'own' ? 'My Own Page' : page.name));
    if (page === 'own') { st.tool = 'lines'; tools(); SD.toast('Draw your own picture lines, then use 🪣 Fill to colour!', 3500); }
  }
  function picker() {
    SD.ui.clearTools(); SD.ui.setTitle('🎨 Colour & Paint');
    const s = SD.ui.screen(`<div class="sectionh">Pick a page to colour</div><div class="grid" id="pg"></div>`);
    const g = s.querySelector('#pg');
    const own = SD.html(`<button class="hit tile c2 small"><div class="ico">✏️</div><div class="nm">Draw my own page</div><div class="ds">Draw lines, then fill with colour</div></button>`);
    own.onclick = () => { SD.sfx('click'); openPage('own'); }; g.appendChild(own);
    SD.PAGES.forEach(p => { const b = SD.html(`<button class="hit tile c7"><img alt="" src="${SD.pageThumb(p)}"><div class="nm">${SD.esc(p.name)}</div></button>`); b.onclick = () => { SD.sfx('click'); openPage(p); }; g.appendChild(b); });
    P.ctx.clearRect(0, 0, SD.W, SD.H); Ln.ctx.clearRect(0, 0, SD.W, SD.H); st.page = null;
  }

  SD.registerMode({
    id: 'color', name: 'Colour & Paint', icon: '🎨', color: 'c1', desc: 'Colouring book — pinch to fill', title: '🎨 Colour & Paint',
    enter(arg) { P = SD.makeLayer('colorPaint'); Ln = SD.makeLayer('colorLines'); P.show(); Ln.show();
      if (arg && arg.ownLines) { openPage('own'); st.ownLines = arg.ownLines; st.tool = 'fill'; tools(); renderLines(); SD.ui.setTitle('🎨 My Drawing'); SD.toast('Your drawing is now a colouring page! 🪣', 3000); }
      else if (arg && arg.page) openPage(arg.page); else picker(); },
    exit() { P.hide(); Ln.hide(); st.active.clear(); },
    cursorColor: () => st.tool === 'lines' ? '#24194d' : st.color,
    onResize() {
      if (!st.page) return; const old = st.box; const nb = calcBox(); if (old && nb.x === old.x && nb.y === old.y && nb.s === old.s) return;
      const grab = (L) => { const c = document.createElement('canvas'); c.width = old.s * SD.dpr; c.height = old.s * SD.dpr; c.getContext('2d').drawImage(L.canvas, old.x * SD.dpr, old.y * SD.dpr, c.width, c.height, 0, 0, c.width, c.height); return c; };
      const pimg = grab(P), limg = grab(Ln); st.box = nb;
      P.ctx.clearRect(0, 0, SD.W, SD.H); P.ctx.drawImage(pimg, nb.x, nb.y, nb.s, nb.s); Ln.ctx.clearRect(0, 0, SD.W, SD.H); Ln.ctx.drawImage(limg, nb.x, nb.y, nb.s, nb.s); st.lineMask = null; st.undo = [];
    },
    update(dt, hands) {
      if (!st.page) return;
      for (const h of hands) {
        let s = st.active.get(h.key);
        const live = h.pen && !h.overUI && !h.gone;
        if (st.tool === 'fill') {
          if (h.penDown && live && inBox(h)) { pushUndo(); if (fill(h.x, h.y)) { SD.sfx('fill'); SD.burst(h.x, h.y, 10, [st.color === 'rainbow' ? '#ffc93c' : st.color, '#fff'], { maxSpeed: 220, dur: 0.6 }); } else st.undo.pop(); }
          continue;
        }
        if (live && inBox(h)) {
          const target = st.tool === 'lines' ? Ln : P;
          if (!s) { pushUndo(); s = { brush: st.tool === 'lines' ? 'pen' : (st.color === 'rainbow' ? 'rainbow' : st.brush), color: st.tool === 'lines' ? '#1f1640' : (st.color === 'rainbow' ? '#f00' : st.color), size: st.tool === 'lines' ? 6 : st.size, sym: 'off', cx: 0, cy: 0, seed: (Math.random() * 1e9) | 0, hue0: Math.random() * 360, pts: [{ x: h.x, y: h.y }], target };
            SD.brush.begin(s); st.active.set(h.key, s); }
          else if (SD.dist(s.pts[s.pts.length - 1], h) > 1.5) {
            s.pts.push({ x: h.x, y: h.y }); const c = s.target.ctx; c.save(); c.beginPath(); c.rect(st.box.x, st.box.y, st.box.s, st.box.s); c.clip(); SD.brush.seg(c, s, s.pts.length - 1); c.restore();
            if (st.tool === 'lines') st.lineMask = null;
          }
        } else if (s) st.active.delete(h.key);
      }
    },
    drawFx(ctx) { if (st.page && st.box) { ctx.save(); ctx.strokeStyle = 'rgba(36,25,77,.15)'; ctx.lineWidth = 3; ctx.strokeRect(st.box.x - 2, st.box.y - 2, st.box.s + 4, st.box.s + 4); ctx.restore(); } },
  });
})(window.SD);
