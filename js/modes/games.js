/* Air Games — Bubble Pop, Star Catch, Letter Hunt, Fruit Swipe */
(function (SD) {
  const GAMES = [
    { id: 'bubbles', name: 'Bubble Pop', icon: '🫧', desc: 'Pop the bubbles with your finger', c: 'c4' },
    { id: 'stars', name: 'Star Catch', icon: '⭐', desc: 'Catch the falling stars', c: 'c2' },
    { id: 'letters', name: 'Letter Hunt', icon: '🔠', desc: 'Find and pop the right letter', c: 'c3' },
    { id: 'fruit', name: 'Fruit Swipe', icon: '🍉', desc: 'Swipe fast to slice the fruit', c: 'c1' },
  ];
  const FRUITS = ['🍉', '🍎', '🍊', '🍌', '🍍', '🥝', '🍓', '🍑', '🍇', '🥭'];
  const BUBBLE_COLS = ['#ff5d73', '#ffc93c', '#22c39a', '#3cb6f0', '#7b5cff', '#ff8fd1'];
  const st = { game: null, objs: [], score: 0, time: 0, running: false, spawnT: 0, target: '', hud: null, pool: [] };

  function picker() {
    st.running = false; st.game = null; SD.ui.clearTools(); SD.ui.setTitle('🎮 Air Games'); SD.$('#screens').innerHTML = '';
    const s = SD.ui.screen(`<div class="sectionh">Pick a game</div><div class="grid" id="gg"></div>`);
    GAMES.forEach(g => { const b = SD.html(`<button class="hit tile ${g.c}"><div class="ico">${g.icon}</div><div><div class="nm">${g.name}</div><div class="ds">${g.desc}</div></div></button>`); b.onclick = () => { SD.sfx('click'); start(g.id); }; s.querySelector('#gg').appendChild(b); });
  }
  function start(id) {
    SD.$('#screens').innerHTML = ''; SD.ui.clearTools();
    const g = GAMES.find(x => x.id === id); st.game = id; st.objs = []; st.score = 0; st.time = 60; st.running = true; st.spawnT = 0;
    SD.ui.setTitle(g.icon + ' ' + g.name);
    st.hud = SD.html(`<div class="row"><span class="pill scorebox" data-sc>⭐ 0</span><span class="pill scorebox" data-tm>⏱️ 60</span><span class="pill scorebox" data-tg hidden></span></div>`);
    SD.$('#modeTools').appendChild(st.hud);
    SD.$('#bottomTools').appendChild(SD.ui.btn('🎮 Games', picker, 'chip small'));
    SD.$('#bottomTools').appendChild(SD.ui.btn('🔄 Restart', () => start(id), 'chip small'));
    if (id === 'letters') { st.pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); newTarget(); }
    SD.say({ bubbles: 'Pop the bubbles!', stars: 'Catch the stars!', letters: 'Find the letter!', fruit: 'Swipe to slice the fruit!' }[id]);
  }
  function newTarget() { st.target = SD.pick(st.pool); const t = st.hud.querySelector('[data-tg]'); t.hidden = false; t.textContent = 'Find: ' + st.target; setTimeout(() => SD.say('Find ' + st.target), 300); }
  function addScore(n, x, y) { st.score += n; st.hud.querySelector('[data-sc]').textContent = '⭐ ' + st.score; if (st.score % 10 === 0) SD.praise(); }

  function spawn() {
    const W = SD.W, H = SD.H, g = st.game;
    if (g === 'bubbles') st.objs.push({ k: 'b', x: SD.rnd(80, W - 80), y: H + 60, r: SD.rnd(32, 62), vy: -SD.rnd(70, 150), c: SD.pick(BUBBLE_COLS), ph: Math.random() * 6 });
    else if (g === 'stars') st.objs.push({ k: 's', x: SD.rnd(80, W - 80), y: -40, r: SD.rnd(28, 44), vy: SD.rnd(90, 170), rot: 0, gold: Math.random() < 0.15 });
    else if (g === 'letters') {
      const ch = Math.random() < 0.38 ? st.target : SD.pick(st.pool.filter(c => c !== st.target));
      st.objs.push({ k: 'l', x: SD.rnd(90, W - 90), y: H + 60, r: 52, vy: -SD.rnd(60, 100), c: SD.pick(BUBBLE_COLS), ch, ph: Math.random() * 6 });
    } else if (g === 'fruit') st.objs.push({ k: 'f', x: SD.rnd(W * .2, W * .8), y: H + 50, r: 46, vx: SD.rnd(-120, 120), vy: -SD.rnd(H * 0.95, H * 1.25), e: SD.pick(FRUITS), rot: 0, vr: SD.rnd(-3, 3) });
  }

  function end() {
    st.running = false; const stars = st.score >= 30 ? 3 : st.score >= 15 ? 2 : st.score >= 5 ? 1 : 0;
    SD.confetti(); SD.praise();
    const s = SD.ui.screen(`<div class="welcome"><div style="font-size:80px">🏆</div><h1>${st.score}</h1><div class="stars" style="font-size:54px">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><div class="row" style="justify-content:center"></div></div>`);
    const row = s.querySelector('.row'); const g = st.game;
    row.appendChild(SD.ui.btn('🔄 Play again', () => start(g), 'bigbtn')); row.appendChild(SD.ui.btn('🎮 Other games', picker, 'bigbtn alt'));
  }

  SD.registerMode({
    id: 'games', name: 'Air Games', icon: '🎮', color: 'c4', desc: 'Pop, catch & slice with your hands', title: '🎮 Air Games',
    enter(arg) { arg && arg.game ? start(arg.game) : picker(); },
    exit() { st.running = false; st.objs = []; },
    cursorColor: () => '#ff5d73',
    update(dt, hands) {
      if (!st.running) return;
      st.time -= dt; st.hud.querySelector('[data-tm]').textContent = '⏱️ ' + Math.max(0, Math.ceil(st.time));
      if (st.time <= 0) { end(); return; }
      st.spawnT -= dt;
      if (st.spawnT <= 0) { spawn(); const base = { bubbles: 0.55, stars: 0.7, letters: 1.1, fruit: 1.0 }[st.game]; st.spawnT = base * SD.rnd(0.7, 1.3); }
      // touch points
      const pts = [];
      for (const h of hands) { if (h.overUI || h.gone) continue; if (h.src === 'cam') { pts.push({ x: h.tip.x, y: h.tip.y, px: h.ptx, py: h.pty }); } else if (h.pen) pts.push({ x: h.x, y: h.y, px: h.px, py: h.py }); }
      const W = SD.W, H = SD.H;
      for (let i = st.objs.length - 1; i >= 0; i--) {
        const o = st.objs[i];
        if (o.k === 'half') { o.vy += 1400 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; if (o.y > H + 100) st.objs.splice(i, 1); continue; }
        if (o.k === 'f') { o.vy += 900 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; }
        else { o.y += o.vy * dt; if (o.ph !== undefined) { o.ph += dt * 2; o.x += Math.sin(o.ph) * 0.5; } if (o.rot !== undefined) o.rot += dt; }
        let hit = false;
        for (const p of pts) {
          if (o.k === 'f') { const sp = Math.hypot(p.x - p.px, p.y - p.py) / Math.max(dt, 1 / 120); if (sp > 500 && SD.distToSeg(o, { x: p.px, y: p.py }, p) < o.r) hit = true; }
          else if (Math.hypot(p.x - o.x, p.y - o.y) < o.r + 10) hit = true;
        }
        if (hit) {
          if (o.k === 'l' && o.ch !== st.target) { SD.sfx('error'); o.vy = -40; o.x += SD.rnd(-20, 20); continue; }
          st.objs.splice(i, 1);
          if (o.k === 'b') { SD.sfx('pop'); SD.burst(o.x, o.y, 16, [o.c, '#fff'], { maxSpeed: 300, dur: .7 }); addScore(1); }
          if (o.k === 's') { SD.sfx('star'); SD.burst(o.x, o.y, 18, ['#ffd21f', '#fff6a8', '#fff'], { shape: 'star' }); addScore(o.gold ? 3 : 1); }
          if (o.k === 'l') { SD.sfx('star'); SD.burst(o.x, o.y, 26); addScore(2); SD.say(o.ch); newTarget(); }
          if (o.k === 'f') { SD.sfx('whoosh'); SD.burst(o.x, o.y, 14, ['#ff3b5c', '#ffd21f', '#2bd46b'], { maxSpeed: 260, shape: 'circle' }); addScore(1);
            st.objs.push({ k: 'half', e: o.e, x: o.x - 10, y: o.y, r: o.r, vx: -160, vy: -200, rot: o.rot, vr: -4, side: -1 }, { k: 'half', e: o.e, x: o.x + 10, y: o.y, r: o.r, vx: 160, vy: -200, rot: o.rot, vr: 4, side: 1 }); }
          continue;
        }
        if (o.y < -120 || o.y > H + 140 || o.x < -150 || o.x > W + 150) st.objs.splice(i, 1);
      }
    },
    drawFx(ctx) {
      for (const o of st.objs) {
        ctx.save();
        if (o.k === 'b' || o.k === 'l') {
          const g = ctx.createRadialGradient(o.x - o.r * .35, o.y - o.r * .4, o.r * .1, o.x, o.y, o.r);
          g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, o.c + 'aa'); g.addColorStop(1, o.c + '55');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = o.c; ctx.stroke();
          if (o.k === 'l') { ctx.fillStyle = '#24194d'; ctx.font = `800 ${o.r * 1.1}px "Baloo 2", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.ch, o.x, o.y + 4); }
        } else if (o.k === 's') {
          ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.shadowBlur = 18; ctx.shadowColor = o.gold ? '#ff9f1c' : '#ffd21f';
          ctx.fillStyle = o.gold ? '#ffb020' : '#ffd21f'; SD.drawStar(ctx, 0, 0, o.r, 5, 0.48); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
        } else if (o.k === 'f' || o.k === 'half') {
          ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.font = `${o.r * 1.8}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (o.k === 'half') { ctx.beginPath(); ctx.rect(o.side < 0 ? -o.r * 1.2 : 0, -o.r * 1.2, o.r * 1.2, o.r * 2.4); ctx.clip(); }
          ctx.fillText(o.e, 0, 0);
        }
        ctx.restore();
      }
    },
  });
})(window.SD);
