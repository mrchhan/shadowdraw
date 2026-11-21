/* App start-up, home screen, main loop, offline install */
(function (SD) {
  const bg = SD.$('#bg'), fx = SD.$('#fx'), cur = SD.$('#cursors');
  let bgx = SD.fitCanvas(bg), fxx = SD.fitCanvas(fx), cux = SD.fitCanvas(cur);
  document.body.classList.toggle('lefty', SD.S.lefty);

  // ---------- Home ----------
  SD.registerMode({
    id: 'home', name: 'Home', hidden: true, title: 'ShadowDraw',
    enter() {
      const s = SD.ui.screen(`<div class="home-hero"><h1>Magic <b>Hands</b> Studio</h1><p>Wave, pinch and point — no mouse needed!</p></div>
        <div class="grid" id="hg"></div>
        <div class="row" style="max-width:1100px;margin:22px auto 0;justify-content:space-between">
          <span class="pill" style="font-size:15px">🤏 Pinch = click & draw · ✋ hold your hand over a button to press it</span>
          <span class="row" id="hx"></span></div>`);
      const g = s.querySelector('#hg');
      SD.modeOrder.forEach(id => { const m = SD.modes[id]; const b = SD.html(`<button class="hit tile ${m.color || 'c7'}"><div class="ico">${m.icon}</div><div><div class="nm">${m.name}</div><div class="ds">${m.desc || ''}</div></div></button>`); b.onclick = () => SD.go(id); g.appendChild(b); });
      const hx = s.querySelector('#hx');
      hx.appendChild(SD.ui.btn('⚙️ Grown-ups', () => SD.ui.parentGate(() => SD.go('parents')), 'chip small'));
      if (!SD.S.camera || ['touch', 'error'].includes(SD.tracker.status)) hx.appendChild(SD.ui.btn('📷 Start camera', async () => { SD.setSetting('camera', true); await SD.tracker.start(); SD.go('home'); }, 'chip small'));
    },
  });

  // ---------- Welcome ----------
  function welcome() {
    SD.$('#btnHome').style.visibility = 'hidden'; SD.ui.setTitle('ShadowDraw');
    const s = SD.ui.screen(`<div class="welcome"><img class="logo" src="icons/icon-192.png" alt=""><h1>ShadowDraw</h1>
      <p>Draw in the air, colour pictures, trace letters, pop bubbles and play music — just with your hands and the camera.</p>
      <div class="row" style="justify-content:center"><button class="hit bigbtn" id="go">✋ Let's Play!</button><button class="hit bigbtn alt" id="nocam">👆 Play with touch</button></div>
      <p class="note">🔒 The camera picture stays on this device. Nothing is uploaded.</p></div>`);
    const begin = async (cam) => {
      SD.audio(); SD.sfx('success');
      if (!cam) SD.setSetting('camera', false); else if (!SD.S.camera) SD.setSetting('camera', true);
      const target = (location.hash || '').slice(1); SD.go(SD.modes[target] && target !== 'parents' ? target : 'home');
      await SD.tracker.start();
    };
    s.querySelector('#go').onclick = () => begin(true); s.querySelector('#nocam').onclick = () => begin(false);
  }
  SD.$('#btnHome').onclick = () => { SD.sfx('click'); SD.go('home'); };
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && SD.current) SD.go('home'); });

  // ---------- Background (board + camera) ----------
  function drawBg() {
    const v = SD.tracker.video, b = SD.S.board, ctx = bgx;
    document.body.classList.toggle('dark-board', b === 'night');
    ctx.fillStyle = b === 'night' ? '#141033' : '#fff8ec'; ctx.fillRect(0, 0, SD.W, SD.H);
    if (b === 'paper') { ctx.fillStyle = 'rgba(91,61,245,.06)'; for (let y = 40; y < SD.H; y += 40) ctx.fillRect(0, y, SD.W, 2); }
    const op = b === 'camera' ? 1 : SD.S.camOpacity;
    if (op > 0 && v && v.readyState >= 2 && SD.tracker.stream) {
      const r = SD.tracker.videoRect(); ctx.save(); ctx.globalAlpha = op;
      if (SD.S.mirror) { ctx.translate(SD.W, 0); ctx.scale(-1, 1); }
      ctx.drawImage(v, r.x, r.y, r.w, r.h); ctx.restore();
    }
  }

  // ---------- Main loop ----------
  let last = SD.now();
  function frame() {
    const t = SD.now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
    SD.tracker.pump();
    const hands = SD.tracker.tick();
    SD.ui.handUI(hands);
    try { drawBg(); } catch (e) {}
    fxx.clearRect(0, 0, SD.W, SD.H);
    const m = SD.current;
    if (m) { try { m.update && m.update(dt, hands); m.drawFx && m.drawFx(fxx); } catch (e) { console.error(e); } }
    SD.updateParticles(fxx, dt);
    SD.ui.drawCursors(cux, hands);
    SD.ui.timeTick();
    requestAnimationFrame(frame);
  }

  // keep layout below the (wrapping) top bar
  const tb = SD.$('#topbar'); const setTop = () => { const h = Math.round(tb.getBoundingClientRect().height); document.documentElement.style.setProperty('--topH', h + 'px'); SD.topH = h; };
  const bb = SD.$('#bottomTools'); const setBot = () => { const h = bb.children.length ? Math.round(SD.H - bb.getBoundingClientRect().top) : 0; document.documentElement.style.setProperty('--botH', h + 'px'); };
  try { new ResizeObserver(setTop).observe(tb); new ResizeObserver(setBot).observe(bb); } catch (e) {} setTop(); setBot();

  // ---------- Resize ----------
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => {
    SD.W = innerWidth; SD.H = innerHeight; SD.dpr = Math.min(window.devicePixelRatio || 1, 2);
    bgx = SD.fitCanvas(bg); fxx = SD.fitCanvas(fx); cux = SD.fitCanvas(cur); SD.resizeLayers();
    SD.current && SD.current.onResize && SD.current.onResize();
  }, 120); });

  // ---------- Offline + install ----------
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('sw', e));
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); SD.installPrompt = e; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) SD.theremin.stop(); });

  welcome();
  requestAnimationFrame(frame);
})(window.SD);
