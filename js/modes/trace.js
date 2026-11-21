/* Trace & Learn — trace letters (English + Urdu), numbers and shapes; earn stars */
(function (SD) {
  const ABC = [['A', 'Apple', '🍎'], ['B', 'Ball', '⚽'], ['C', 'Cat', '🐱'], ['D', 'Dog', '🐶'], ['E', 'Elephant', '🐘'], ['F', 'Fish', '🐟'], ['G', 'Grapes', '🍇'], ['H', 'Hat', '🎩'], ['I', 'Ice cream', '🍦'],
    ['J', 'Juice', '🧃'], ['K', 'Kite', '🪁'], ['L', 'Lion', '🦁'], ['M', 'Moon', '🌙'], ['N', 'Nest', '🪺'], ['O', 'Orange', '🍊'], ['P', 'Pencil', '✏️'], ['Q', 'Queen', '👑'], ['R', 'Rainbow', '🌈'],
    ['S', 'Sun', '☀️'], ['T', 'Tree', '🌳'], ['U', 'Umbrella', '☂️'], ['V', 'Van', '🚐'], ['W', 'Watermelon', '🍉'], ['X', 'Xylophone', '🎼'], ['Y', 'Yo-yo', '🪀'], ['Z', 'Zebra', '🦓']];
  const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const URDU = [['ا', 'alif', 'انار', 'anaar'], ['ب', 'bay', 'بلی', 'billi 🐱'], ['پ', 'pay', 'پتنگ', 'patang 🪁'], ['ت', 'tay', 'تتلی', 'titli 🦋'], ['ٹ', 'ttay', 'ٹماٹر', 'tamatar 🍅'],
    ['ث', 'say', '', ''], ['ج', 'jeem', 'جہاز', 'jahaz ✈️'], ['چ', 'chay', 'چڑیا', 'chirya 🐦'], ['ح', 'hay', 'حلوہ', 'halwa'], ['خ', 'khay', 'خرگوش', 'khargosh 🐰'], ['د', 'daal', 'دودھ', 'doodh 🥛'],
    ['ڈ', 'ddaal', 'ڈبہ', 'dabba 📦'], ['ذ', 'zaal', '', ''], ['ر', 'ray', 'رسی', 'rassi'], ['ڑ', 'rray', '', ''], ['ز', 'zay', 'زرافہ', 'zarafa 🦒'], ['ژ', 'zhay', '', ''], ['س', 'seen', 'سیب', 'saib 🍎'],
    ['ش', 'sheen', 'شیر', 'sher 🦁'], ['ص', 'suad', 'صابن', 'sabun 🧼'], ['ض', 'zuad', '', ''], ['ط', 'toay', 'طوطا', 'tota 🦜'], ['ظ', 'zoay', '', ''], ['ع', 'ain', 'عینک', 'ainak 👓'],
    ['غ', 'ghain', 'غبارہ', 'ghubbara 🎈'], ['ف', 'fay', 'فاختہ', 'fakhta 🕊️'], ['ق', 'qaaf', 'قلم', 'qalam 🖊️'], ['ک', 'kaaf', 'کتاب', 'kitab 📖'], ['گ', 'gaaf', 'گاجر', 'gajar 🥕'],
    ['ل', 'laam', 'لیموں', 'lemon 🍋'], ['م', 'meem', 'مچھلی', 'machli 🐟'], ['ن', 'noon', 'ناک', 'naak 👃'], ['و', 'wao', '', ''], ['ہ', 'hay', 'ہاتھی', 'haathi 🐘'], ['ی', 'chhoti yay', '', ''], ['ے', 'bari yay', '', '']];
  const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
  const SETS = { ABC: ABC.map(a => ({ ch: a[0], say: `${a[0]}. ${a[0]} is for ${a[1]}`, label: `${a[0]} is for ${a[1]} ${a[2]}` })),
    abc: ABC.map(a => ({ ch: a[0].toLowerCase(), say: `${a[0].toLowerCase()}. ${a[0].toLowerCase()} is for ${a[1].toLowerCase()}`, label: `${a[0].toLowerCase()} is for ${a[1].toLowerCase()} ${a[2]}` })),
    '123': NUM.map((n, i) => ({ ch: String(i), say: n, label: `${i} — ${n} ${'⭐'.repeat(i)}` })),
    urdu: URDU.map(u => ({ ch: u[0], urdu: true, say: u[0], label: `${u[1]}${u[2] ? ' — ' + u[2] + ' (' + u[3] + ')' : ''}` })),
    shapes: SHAPES.map(s => ({ shape: s, say: s, label: s[0].toUpperCase() + s.slice(1) })) };

  const st = { set: 'ABC', idx: 0, box: null, samples: [], covered: 0, good: 0, bad: 0, done: false, active: new Map(), mask: null };
  let G = null, I = null, info = null;

  const calcBox = () => { const f = SD.ui.freeRect(); const iy = info ? info.getBoundingClientRect().bottom + 6 : f.y; const y0 = Math.max(f.y, iy), h = f.y + f.h - y0; const s = Math.round(Math.max(160, Math.min(f.w, h))); return { x: Math.round(f.x + (f.w - s) / 2), y: Math.round(y0 + (h - s) / 2), s }; };

  function shapePath(ctx, kind, cx, cy, r) {
    ctx.beginPath();
    if (kind === 'circle') ctx.arc(cx, cy, r, 0, 7);
    else if (kind === 'square') ctx.rect(cx - r * .85, cy - r * .85, r * 1.7, r * 1.7);
    else if (kind === 'triangle') { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * .95, cy + r * .75); ctx.lineTo(cx - r * .95, cy + r * .75); ctx.closePath(); }
    else if (kind === 'star') { SD.drawStar(ctx, cx, cy + r * .08, r, 5, 0.45); }
    else if (kind === 'diamond') { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * .7, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * .7, cy); ctx.closePath(); }
    else if (kind === 'heart') { ctx.moveTo(cx, cy + r * .85); ctx.bezierCurveTo(cx - r * 1.3, cy - r * .1, cx - r * .6, cy - r * 1.05, cx, cy - r * .4); ctx.bezierCurveTo(cx + r * .6, cy - r * 1.05, cx + r * 1.3, cy - r * .1, cx, cy + r * .85); ctx.closePath(); }
  }
  // draw the guide into ctx (box coords) — mode 'fill' (core shape) or 'tol' (with tolerance)
  function guide(ctx, item, b, mode) {
    const s = b.s, cx = b.x + s / 2, cy = b.y + s / 2;
    if (item.shape) { shapePath(ctx, item.shape, cx, cy, s * 0.36); ctx.lineJoin = 'round'; ctx.lineWidth = s * (mode === 'tol' ? 0.16 : 0.075); ctx.stroke(); return; }
    const fs = item.urdu ? s * 0.62 : s * 0.78; ctx.font = item.urdu ? `700 ${fs}px Naskh, "Noto Naskh Arabic", serif` : `800 ${fs}px "Baloo 2", ui-rounded, sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText(item.ch); const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const x = cx - w / 2 + m.actualBoundingBoxLeft, y = cy - h / 2 + m.actualBoundingBoxAscent;
    if (mode === 'tol') { ctx.lineWidth = s * 0.07; ctx.lineJoin = 'round'; ctx.strokeText(item.ch, x, y); }
    ctx.fillText(item.ch, x, y);
  }
  function setup() {
    const item = SETS[st.set][st.idx];
    info.querySelector('[data-label]').innerHTML = item.urdu ? `<span class="urdu" style="font-size:1.4em">${item.ch}</span> ${SD.esc(item.label)}` : SD.esc(item.label);
    st.box = calcBox(); const b = st.box;
    G.ctx.clearRect(0, 0, SD.W, SD.H); I.ctx.clearRect(0, 0, SD.W, SD.H);
    const g = G.ctx; g.save(); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.roundRect ? g.roundRect(b.x, b.y, b.s, b.s, 36) : g.rect(b.x, b.y, b.s, b.s); g.fill();
    g.fillStyle = '#e4dcff'; g.strokeStyle = '#e4dcff'; guide(g, item, b, 'fill');
    g.lineWidth = Math.max(2, b.s * 0.006); g.strokeStyle = '#a996ff'; g.setLineDash([b.s * 0.02, b.s * 0.02]); g.lineCap = 'round';
    if (item.shape) { shapePath(g, item.shape, b.x + b.s / 2, b.y + b.s / 2, b.s * 0.36); g.stroke(); } else { const [ch, tx, ty] = textPos(g, item, b); g.strokeText(ch, tx, ty); }
    g.restore();
    // masks at CSS-pixel scale
    const mk = (mode) => { const c = document.createElement('canvas'); c.width = SD.W; c.height = SD.H; const x = c.getContext('2d'); x.fillStyle = '#000'; x.strokeStyle = '#000'; guide(x, item, b, mode); return x.getImageData(0, 0, SD.W, SD.H).data; };
    const core = mk('fill'); st.mask = mk('tol');
    st.samples = []; const step = Math.max(8, Math.round(b.s / 38));
    for (let y = b.y; y < b.y + b.s; y += step) for (let x = b.x; x < b.x + b.s; x += step) if (core[(y * SD.W + x) * 4 + 3] > 128) st.samples.push({ x, y, hit: false });
    st.covered = 0; st.good = 0; st.bad = 0; st.done = false; st.active.clear();
    info.querySelector('[data-stars]').textContent = '☆☆☆'; info.querySelector('i').style.width = '0%';
    SD.$('#traceNext') && SD.$('#traceNext').remove();
    setTimeout(() => SD.say(item.say, item.urdu && SD.hasUrduVoice() ? 'ur' : 'en'), 250);
  }
  function textPos(ctx, item, b) { const s = b.s, cx = b.x + s / 2, cy = b.y + s / 2; const m = ctx.measureText(item.ch); const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent; return [item.ch, cx - w / 2 + m.actualBoundingBoxLeft, cy - h / 2 + m.actualBoundingBoxAscent]; }

  function score(p, rad) {
    const xi = Math.round(p.x), yi = Math.round(p.y);
    if (xi >= 0 && yi >= 0 && xi < SD.W && yi < SD.H && st.mask[(yi * SD.W + xi) * 4 + 3] > 100) st.good++; else st.bad++;
    for (const s of st.samples) if (!s.hit && Math.abs(s.x - p.x) < rad && Math.abs(s.y - p.y) < rad && Math.hypot(s.x - p.x, s.y - p.y) < rad) { s.hit = true; st.covered++; }
    const cov = st.samples.length ? st.covered / st.samples.length : 0, acc = st.good / Math.max(1, st.good + st.bad);
    info.querySelector('i').style.width = Math.round(cov * 100) + '%';
    if (!st.done && cov > 0.72 && acc > 0.6) {
      st.done = true; const stars = cov > 0.9 && acc > 0.85 ? 3 : cov > 0.8 && acc > 0.72 ? 2 : 1;
      info.querySelector('[data-stars]').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      SD.confetti(); SD.praise();
      const nb = SD.ui.btn('Next ➡️', () => next(1), 'bigbtn'); nb.id = 'traceNext'; nb.style.cssText = 'position:absolute;right:24px;bottom:110px'; SD.$('#screens').appendChild(nb);
    }
  }
  const next = (d) => { const n = SETS[st.set].length; st.idx = (st.idx + d + n) % n; setup(); };

  SD.registerMode({
    id: 'trace', name: 'Trace & Learn', icon: '🔤', color: 'c3', desc: 'ABC, 123, اردو and shapes', title: '🔤 Trace & Learn',
    enter() {
      G = SD.makeLayer('traceGuide', false); I = SD.makeLayer('traceInk', false); G.show(); I.show();
      const top = SD.$('#modeTools');
      top.appendChild(SD.ui.group([['ABC', 'ABC'], ['abc', 'abc'], ['123', '123'], ['urdu', 'اردو'], ['shapes', '⭐ Shapes']], () => st.set, v => { st.set = v; st.idx = 0; setup(); }, 'chip small'));
      const bot = SD.$('#bottomTools');
      bot.appendChild(SD.ui.btn('⬅️', () => next(-1), 'chip')); bot.appendChild(SD.ui.btn('🔊 Hear it', () => { const it = SETS[st.set][st.idx]; SD.say(it.say, it.urdu && SD.hasUrduVoice() ? 'ur' : 'en'); }, 'chip'));
      bot.appendChild(SD.ui.btn('🔄 Again', () => setup(), 'chip')); bot.appendChild(SD.ui.btn('➡️', () => next(1), 'chip'));
      info = SD.html(`<div class="hint" style="top:calc(var(--topH) + 4px);bottom:auto;padding:4px 14px"><div data-label class="scorebox"></div><div class="row" style="justify-content:center"><span class="meter"><i></i></span><span class="stars" data-stars>☆☆☆</span></div></div>`);
      SD.$('#screens').appendChild(info);
      const fonts = document.fonts ? Promise.all(['800 100px "Baloo 2"', '700 100px Naskh'].map(f => document.fonts.load(f).catch(() => {}))) : Promise.resolve();
      fonts.then(() => { if (SD.current && SD.current.id === 'trace') setup(); });
    },
    exit() { G.hide(); I.hide(); },
    cursorColor: () => 'rainbow',
    onResize() { setup(); },
    update(dt, hands) {
      if (!st.box || !st.mask) return;
      for (const h of hands) {
        let s = st.active.get(h.key);
        if (h.pen && !h.overUI && !h.gone) {
          if (!s) { s = { brush: 'rainbow', color: '#f00', size: Math.max(10, st.box.s * 0.045), sym: 'off', seed: 1, hue0: Math.random() * 360, pts: [{ x: h.x, y: h.y }] }; SD.brush.begin(s); st.active.set(h.key, s); }
          else if (SD.dist(s.pts[s.pts.length - 1], h) > 2) { s.pts.push({ x: h.x, y: h.y }); SD.brush.seg(I.ctx, s, s.pts.length - 1); score(h, Math.max(14, st.box.s * 0.05)); }
        } else if (s) st.active.delete(h.key);
      }
    },
  });
})(window.SD);
