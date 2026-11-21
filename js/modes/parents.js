/* Grown-ups area — settings behind a simple maths gate */
(function (SD) {
  function seg(key, opts, after) { return { key, kind: 'seg', opts, after }; }
  function range(key, min, max, step, fmt, after) { return { key, kind: 'range', min, max, step, fmt, after }; }
  const restartCam = () => { SD.tracker.stop(); SD.tracker.start(); };
  const ROWS = [
    ['Hand camera', 'Turn off to use touch or mouse only', seg('camera', [[true, 'On'], [false, 'Off']], restartCam)],
    ['Which camera', 'Tablets and phones have two', seg('facing', [['user', 'Front'], ['environment', 'Back']], restartCam)],
    ['Mirror view', 'Moves like a mirror (best for front camera)', seg('mirror', [[true, 'On'], [false, 'Off']])],
    ['Drawing board', '', seg('board', [['paper', '📄 Paper'], ['night', '🌙 Night'], ['camera', '📷 Camera']])],
    ['See yourself', 'How much camera shows behind the board', range('camOpacity', 0, 0.8, 0.02, v => Math.round(v * 100) + '%')],
    ['Draw by…', 'Pinch = thumb + pointer finger together · Point = one finger up', seg('drawGesture', [['pinch', '🤏 Pinch'], ['point', '☝️ Point']])],
    ['Pinch sensitivity', 'Higher = easier to pinch', range('pinchSens', 0.6, 1.6, 0.05, v => v.toFixed(2))],
    ['Smoothing', 'Higher = steadier lines, a bit slower', range('smoothing', 0, 1, 0.05, v => Math.round(v * 100) + '%')],
    ['Reach', 'Higher = small hand moves cover the whole screen', range('reach', 1, 1.7, 0.05, v => v.toFixed(2) + '×')],
    ['Hover-to-click time', 'How long to hold a hand over a button', range('dwellMs', 500, 2000, 100, v => (v / 1000).toFixed(1) + 's')],
    ['Show hand lines', 'Draws the hand skeleton', seg('showSkeleton', [[false, 'Off'], [true, 'On']])],
    ['Left-handed', 'Moves the colour bar to the right', seg('lefty', [[false, 'Off'], [true, 'On']], () => document.body.classList.toggle('lefty', SD.S.lefty))],
    ['Sounds', '', seg('sound', [[true, 'On'], [false, 'Off']])],
    ['Voice', 'Spoken praise and letter names', seg('voice', [[true, 'On'], [false, 'Off']])],
    ['Praise language', 'Urdu is spoken only if the device has an Urdu voice', seg('praiseLang', [['en', 'English'], ['ur', 'اردو'], ['both', 'Both']])],
    ['Screen time limit', 'Shows a break screen, unlocked with the maths question', seg('timeLimit', [[0, 'Off'], [10, '10m'], [20, '20m'], [30, '30m'], [45, '45m'], [60, '60m']], () => SD.ui.resetTimer())],
    ['Tracking quality', 'Fast is better for older phones', seg('modelComplexity', [[0, 'Fast'], [1, 'Best']])],
    ['Hands to track', '', seg('maxHands', [[1, 'One'], [2, 'Two']])],
  ];
  function render() {
    SD.$('#screens').innerHTML = ''; SD.ui.clearTools(); SD.ui.setTitle('⚙️ Grown-ups');
    const s = SD.ui.screen(`<div class="panel" id="pp"></div><div class="panel" style="margin-top:16px" id="pa"></div>`);
    const pp = s.querySelector('#pp');
    ROWS.forEach(([label, help, c]) => {
      const row = SD.html(`<div class="set"><label>${label}${help ? `<small>${help}</small>` : ''}</label><div class="seg"></div></div>`); const box = row.querySelector('.seg');
      if (c.kind === 'seg') {
        const btns = c.opts.map(([v, l]) => { const b = SD.html(`<button class="hit chip small">${l}</button>`); b.onclick = () => { SD.setSetting(c.key, v); btns.forEach((x, i) => x.classList.toggle('on', c.opts[i][0] === SD.S[c.key])); c.after && c.after(); SD.sfx('click'); }; b.classList.toggle('on', v === SD.S[c.key]); box.appendChild(b); return b; });
      } else {
        const out = SD.html(`<span class="pill">${c.fmt(SD.S[c.key])}</span>`); const inp = SD.html(`<input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${SD.S[c.key]}">`);
        inp.oninput = () => { SD.setSetting(c.key, +inp.value); out.textContent = c.fmt(+inp.value); c.after && c.after(); }; box.appendChild(inp); box.appendChild(out);
      }
      pp.appendChild(row);
    });
    const pa = s.querySelector('#pa');
    pa.innerHTML = `<div class="set"><label>Install as an app<small>Works offline on computer, tablet and phone</small></label><div class="seg" data-inst></div></div>
      <div class="set"><label>Offline ready<small>${navigator.serviceWorker && navigator.serviceWorker.controller ? 'Yes — everything is saved on this device' : (location.protocol === 'app:' || /electron/i.test(navigator.userAgent) ? 'Yes — desktop app' : 'After the first visit online')}</small></label><div class="seg"></div></div>
      <div class="set"><label>Hand tracking<small>${SD.tracker.status} · ${SD.tracker.fps || 0} fps</small></label><div class="seg"></div></div>
      <div class="set"><label>Reset<small>Settings back to normal, or delete all saved pictures</small></label><div class="seg" data-reset></div></div>
      <p style="font-size:15px;opacity:.75;margin:10px 0 0">🔒 Privacy: the camera picture is processed only on this device. Nothing is uploaded and there are no ads or accounts.<br>ShadowDraw — Shadow Creative Studio</p>`;
    const inst = pa.querySelector('[data-inst]');
    if (SD.installPrompt) inst.appendChild(SD.ui.btn('📲 Install', async () => { SD.installPrompt.prompt(); SD.installPrompt = null; }, 'chip small'));
    else inst.appendChild(SD.html(`<span class="pill">${matchMedia('(display-mode: standalone)').matches ? 'Installed ✓' : 'Use browser menu → Install / Add to Home Screen'}</span>`));
    const rs = pa.querySelector('[data-reset]');
    rs.appendChild(SD.ui.btn('↩️ Settings', () => { SD.resetSettings(); document.body.classList.toggle('lefty', SD.S.lefty); restartCam(); render(); SD.toast('Settings reset'); }, 'chip small'));
    rs.appendChild(SD.ui.btn('🗑️ All pictures', () => SD.ui.confirm('Delete all pictures?', 'This removes every saved picture on this device.', 'Delete', async () => { for (const it of await SD.store.list()) await SD.store.remove(it.id); SD.toast('Gallery emptied'); }), 'chip small'));
  }
  SD.registerMode({ id: 'parents', name: 'Grown-ups', icon: '⚙️', hidden: true, title: '⚙️ Grown-ups', enter() { render(); } });
})(window.SD);
