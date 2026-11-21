/* UI framework: modes, toolbars, hand-hover clicking, cursors, dialogs, parent gate, screen time */
(function (SD) {
  const ui = SD.ui = {};
  SD.modes = {}; SD.modeOrder = [];
  SD.registerMode = (m) => { SD.modes[m.id] = m; if (!m.hidden) SD.modeOrder.push(m.id); };
  SD.current = null;

  ui.clearTools = () => { ['#modeTools', '#sideTools', '#bottomTools'].forEach(s => SD.$(s).innerHTML = ''); SD.$$('.p2wrap').forEach(e => e.remove()); };
  ui.setTitle = (t) => { SD.$('#modeTitle').textContent = t; };
  ui.add = (where, node) => { const host = SD.$(where); if (typeof node === 'string') node = SD.html(node); host.appendChild(node); return node; };
  // "🖊️ Pen" -> emoji + <span class=lbl>Pen</span> so small screens can show just the icon
  const fmtLabel = (label) => { const m = /^(\S+)\s+(.+)$/.exec(label); return m && !/[A-Za-z0-9\u0600-\u06FF]/.test(m[1]) ? `${m[1]} <span class="lbl">${m[2]}</span>` : label; };
  ui.btn = (label, onClick, cls = 'chip', title = '') => {
    const plain = String(label).replace(/<[^>]+>/g, '');
    const b = SD.html(`<button class="hit ${cls}" title="${SD.esc(title || plain)}">${fmtLabel(label)}</button>`);
    b.onclick = (e) => { SD.sfx('click'); onClick(b, e); }; return b;
  };
  ui.toggle = (label, getOn, onChange, cls = 'chip') => {
    const b = ui.btn(label, () => { onChange(!getOn()); b.classList.toggle('on', getOn()); }, cls); b.classList.toggle('on', getOn()); return b;
  };
  ui.group = (items, getVal, onPick, cls = 'chip') => {
    const wrap = SD.html('<div class="row"></div>');
    const btns = items.map(([val, label, title]) => { const b = ui.btn(label, () => { onPick(val); refresh(); }, cls, title); b.dataset.v = val; wrap.appendChild(b); return b; });
    const refresh = () => btns.forEach(b => b.classList.toggle('on', String(getVal()) === b.dataset.v));
    refresh(); wrap.refresh = refresh; return wrap;
  };
  ui.palette = (getColor, setColor, opts = {}) => {
    const wrap = SD.html('<div class="palette"></div>');
    const cols = opts.colors || SD.COLORS; const all = opts.rainbow ? [...cols, 'rainbow'] : cols;
    const sws = all.map(c => {
      const b = SD.html(`<button class="hit sw ${c === 'rainbow' ? 'rainbow' : ''}" aria-label="colour ${c}" style="${c === 'rainbow' ? '' : 'background:' + c}"></button>`);
      b.dataset.c = c; b.onclick = () => { SD.sfx('click'); setColor(c); refresh(); }; wrap.appendChild(b); return b;
    });
    const refresh = () => sws.forEach(b => b.classList.toggle('on', b.dataset.c === getColor()));
    refresh(); wrap.refresh = refresh; return wrap;
  };

  // ---------- Navigation ----------
  SD.go = (id, arg) => {
    const m = SD.modes[id]; if (!m) return;
    if (SD.current && SD.current.exit) SD.current.exit();
    SD.$('#toast').classList.remove('show');
    ui.clearTools(); SD.$('#screens').innerHTML = '';
    SD.current = m; ui.setTitle(m.title || m.name);
    SD.$('#btnHome').style.visibility = id === 'home' ? 'hidden' : 'visible';
    m.enter && m.enter(arg);
    try { history.replaceState(null, '', id === 'home' ? location.pathname : '#' + id); } catch (e) {}
  };
  ui.screen = (html, clear = false) => { const s = SD.html(`<div class="screen ${clear ? 'clear' : ''}">${html}</div>`); SD.$('#screens').appendChild(s); return s; };

  // ---------- Modal + parent gate ----------
  ui.modal = (html, bind) => {
    const m = SD.$('#modal'); m.innerHTML = `<div class="dialog">${html}</div>`; m.hidden = false;
    const close = () => { m.hidden = true; m.innerHTML = ''; };
    bind && bind(m.firstElementChild, close); return close;
  };
  ui.confirm = (title, text, yesLabel, onYes) => ui.modal(`<h2>${title}</h2><p>${text}</p><div class="row" style="justify-content:center"><button class="hit bigbtn alt" data-no>Cancel</button><button class="hit bigbtn" data-yes>${yesLabel}</button></div>`,
    (d, close) => { d.querySelector('[data-no]').onclick = close; d.querySelector('[data-yes]').onclick = () => { close(); onYes(); }; });
  ui.parentGate = (onPass, title = 'Grown-ups only') => {
    const a = 3 + Math.floor(Math.random() * 7), b = 4 + Math.floor(Math.random() * 6), ans = a * b;
    let typed = '';
    ui.modal(`<h2>${title}</h2><p>What is <b>${a} × ${b}</b>?</p><div class="pill" style="font-size:30px;min-height:52px" data-out>&nbsp;</div>
      <div class="numpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].map(n => `<button data-n="${n}">${n}</button>`).join('')}</div>
      <button class="hit bigbtn alt" data-close>Back</button>`, (d, close) => {
      const out = d.querySelector('[data-out]');
      d.querySelectorAll('[data-n]').forEach(btn => btn.onclick = () => {
        const n = btn.dataset.n;
        if (n === '⌫') typed = typed.slice(0, -1); else if (n === '✓') { if (+typed === ans) { close(); onPass(); } else { typed = ''; SD.sfx('error'); } } else if (typed.length < 3) typed += n;
        out.textContent = typed || ' ';
      });
      d.querySelector('[data-close]').onclick = close;
    });
  };

  // ---------- Screen time ----------
  let playedMs = 0, lastT = SD.now(), locked = false;
  ui.timeTick = () => {
    const t = SD.now(), dt = t - lastT; lastT = t;
    if (document.hidden || locked || !SD.S.timeLimit) return;
    playedMs += Math.min(dt, 1000);
    if (playedMs > SD.S.timeLimit * 60000) {
      locked = true;
      ui.modal(`<div style="font-size:72px">🌙</div><h2>Time for a break!</h2><p>Great playing today. Rest your eyes and hands.</p><button class="hit bigbtn alt" data-p>Grown-up: more time</button>`,
        (d, close) => d.querySelector('[data-p]').onclick = () => ui.parentGate(() => { close(); playedMs = 0; locked = false; }, 'Unlock more time'));
      SD.say('Time for a break! Great playing today.');
    }
  };
  ui.resetTimer = () => { playedMs = 0; };

  // ---------- Hand hover-to-click + cursors ----------
  const dwell = new Map(), penBlocked = new Set();
  const hitOf = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const h = el.closest('button, .hit, select');
    if (!h || h.disabled) return null;
    if (!SD.$('#modal').hidden && !h.closest('#modal')) return null;
    return h;
  };
  ui.handUI = (hands) => {
    const t = SD.now(), seen = new Set();
    for (const h of hands) {
      if (h.src !== 'cam') { h.overUI = !!hitOf(h.x, h.y) && !h.pen; continue; }
      seen.add(h.key);
      const el = hitOf(h.x, h.y); h.overUI = !!el;
      let st = dwell.get(h.key);
      if (!st || st.el !== el) {
        if (st && st.el) st.el.classList.remove('hovering');
        st = { el, start: t, done: false, lastY: h.y }; dwell.set(h.key, st);
        if (el) { el.classList.add('hovering'); SD.sfx('hover'); }
      }
      h.dwell = 0;
      if (el && !st.done) {
        h.dwell = (t - st.start) / SD.S.dwellMs;
        if (h.dwell >= 1 || h.pinchDown) { st.done = true; el.classList.add('hover-press'); setTimeout(() => el.classList.remove('hover-press'), 150); el.click(); if (h.pen) penBlocked.add(h.key); }
      }
      if (el && h.pen && !h.penDown && !penBlocked.has(h.key)) { /* already drawing, slid onto UI: keep it UI */ }
      if (penBlocked.has(h.key)) { if (h.pen) h.overUI = true; else penBlocked.delete(h.key); }
      // pinch-drag to scroll a full screen with the hand
      if (!el && h.pinch) {
        const scr = document.elementFromPoint(h.x, h.y); const s = scr && scr.closest('.screen:not(.clear)');
        if (s) { s.scrollTop -= (h.y - st.lastY) * 1.5; h.overUI = true; }
      }
      st.lastY = h.y;
    }
    for (const [k, st] of dwell) if (!seen.has(k)) { if (st.el) st.el.classList.remove('hovering'); dwell.delete(k); }
  };

  ui.drawCursors = (ctx, hands) => {
    ctx.clearRect(0, 0, SD.W, SD.H);
    for (const h of hands) {
      if (h.gone) continue;
      if (SD.S.showSkeleton && h.lm) drawSkeleton(ctx, h.lm);
      if (h.src === 'touch' || h.src === 'mouse') { if (SD.current && SD.current.id === 'home') continue; }
      const col = (SD.current && SD.current.cursorColor && SD.current.cursorColor(h)) || '#5b3df5';
      const r = h.src === 'cam' ? 18 : 12;
      ctx.save();
      if (h.pen && !h.overUI) { ctx.fillStyle = col === 'rainbow' ? `hsl(${(SD.now() / 5) % 360},90%,60%)` : col; ctx.beginPath(); ctx.arc(h.x, h.y, r * 0.6, 0, 7); ctx.fill(); }
      ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, 7); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = h.overUI ? '#ffc93c' : (col === '#ffffff' ? '#24194d' : col === 'rainbow' ? '#5b3df5' : col); ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, 7); ctx.stroke();
      if (h.dwell > 0) { ctx.lineWidth = 7; ctx.strokeStyle = '#ff5d73'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(h.x, h.y, r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, h.dwell)); ctx.stroke(); }
      if (h.src === 'cam' && h.open && SD.current && SD.current.palmErase && SD.current.palmErase()) {
        ctx.setLineDash([8, 8]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(36,25,77,.5)'; ctx.beginPath(); ctx.arc(h.palm.x, h.palm.y, h.size * 0.9, 0, 7); ctx.stroke();
      }
      ctx.restore();
    }
  };
  const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
  function drawSkeleton(ctx, lm) {
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(91,61,245,.55)'; ctx.fillStyle = 'rgba(255,93,115,.8)';
    ctx.beginPath(); for (const [a, b] of BONES) { ctx.moveTo(lm[a].x, lm[a].y); ctx.lineTo(lm[b].x, lm[b].y); } ctx.stroke();
    for (const p of lm) { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  // Free area not covered by tool bars (for boards, pages, keyboards)
  ui.freeRect = () => {
    const narrow = SD.W < 600, tb = SD.$('#topbar').getBoundingClientRect(), bt = SD.$('#bottomTools'), sd = SD.$('#sideTools');
    let top = tb.bottom + 6, bottom = SD.H - 6, left = 8, right = SD.W - 8;
    if (bt.children.length) bottom = Math.min(bottom, bt.getBoundingClientRect().top - 6);
    if (sd.children.length) { const r = sd.getBoundingClientRect(); if (narrow) bottom = Math.min(bottom, r.top - 6); else if (SD.S.lefty) right = Math.min(right, r.left - 8); else left = Math.max(left, r.right + 8); }
    return { x: left, y: top, w: Math.max(100, right - left), h: Math.max(100, bottom - top) };
  };

  // Hints
  ui.hint = (html) => { const h = SD.html(`<div class="hint">${html}</div>`); SD.$('#screens').appendChild(h); return h; };
})(window.SD);
