/* Gallery — saved art on this device: view, download, print, replay drawings, make a video, turn a drawing into a colouring page */
(function (SD) {
  const MODE_NAMES = { draw: '✨ Drawing', color: '🎨 Colouring', stickers: '🦄 Stickers' };
  let urls = [], replayStop = null;
  const cleanup = () => { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; if (replayStop) replayStop(); replayStop = null; };

  async function list() {
    cleanup(); SD.$('#screens').innerHTML = ''; SD.ui.clearTools(); SD.ui.setTitle('🖼️ My Gallery');
    const items = await SD.store.list();
    const s = SD.ui.screen(`<div class="sectionh">${items.length ? `${items.length} saved picture${items.length > 1 ? 's' : ''}` : 'No pictures yet'}</div>
      ${items.length ? '<div class="gal" id="gl"></div>' : '<p class="center" style="font-size:20px">Make something in Draw, Colour or Stickers and press 💾 Save.</p>'}`);
    const g = s.querySelector('#gl');
    items.forEach(it => { const b = SD.html(`<button class="hit tile c7"><img alt="" src="${it.thumb}"><div class="ds">${MODE_NAMES[it.mode] || ''} · ${new Date(it.date).toLocaleDateString()}</div></button>`); b.onclick = () => view(it.id); g.appendChild(b); });
  }
  async function view(id) {
    cleanup(); const it = await SD.store.get(id); if (!it) return list();
    SD.$('#screens').innerHTML = ''; SD.ui.clearTools(); SD.ui.setTitle(MODE_NAMES[it.mode] || '🖼️ Picture');
    const url = URL.createObjectURL(it.blob); urls.push(url);
    const s = SD.ui.screen(`<div class="viewer"><img alt="Saved picture" src="${url}" data-img><canvas data-cv hidden></canvas><div class="row" style="justify-content:center" data-row></div></div>`);
    const row = s.querySelector('[data-row]'), img = s.querySelector('[data-img]'), cv = s.querySelector('[data-cv]');
    const name = `shadowdraw-${it.mode}-${new Date(it.date).toISOString().slice(0, 10)}`;
    row.appendChild(SD.ui.btn('⬅️ Back', list, 'chip'));
    row.appendChild(SD.ui.btn('⬇️ Download', () => SD.downloadBlob(it.blob, name + '.png'), 'chip'));
    row.appendChild(SD.ui.btn('🖨️ Print', () => SD.printImage(url), 'chip'));
    if (it.strokes && it.strokes.length) {
      row.appendChild(SD.ui.btn('▶️ Replay', () => { img.hidden = true; cv.hidden = false; replay(cv, it); }, 'chip'));
      row.appendChild(SD.ui.btn('🎬 Make video', () => { img.hidden = true; cv.hidden = false; replay(cv, it, true, name); }, 'chip'));
      row.appendChild(SD.ui.btn('🎨 Colour it in', () => SD.go('color', { ownLines: outline(it) }), 'chip'));
    }
    row.appendChild(SD.ui.btn('🗑️ Delete', () => SD.ui.parentGate(async () => { await SD.store.remove(id); list(); }, 'Delete this picture?'), 'chip'));
  }
  function outline(it) {
    // render strokes as black lines into a square canvas cropped to the drawing
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    it.strokes.forEach(s => s.brush !== 'eraser' && s.pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }));
    const pad = 40, size = Math.max(x1 - x0, y1 - y0) + pad * 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const c = document.createElement('canvas'); c.width = c.height = 1000; const x = c.getContext('2d'); const k = 1000 / size;
    x.setTransform(k, 0, 0, k, (size / 2 - cx) * k, (size / 2 - cy) * k);
    it.strokes.forEach(s => { const st = { ...s, brush: s.brush === 'eraser' ? 'eraser' : 'pen', color: '#1f1640', size: s.brush === 'eraser' ? s.size : 7 / k, pts: s.pts.map(p => ({ x: p[0], y: p[1] })) }; SD.brush.begin(st); for (let i = 1; i < st.pts.length; i++) SD.brush.seg(x, st, i); });
    return c;
  }
  function replay(cv, it, record, name) {
    if (replayStop) replayStop();
    const sw = it.sw || 1280, sh = it.sh || 720; cv.width = sw; cv.height = sh; const ctx = cv.getContext('2d');
    // build timeline
    const strokes = it.strokes.map(s => ({ ...s, pts: s.pts.map(p => ({ x: p[0], y: p[1], t: p[2] })) }));
    const segs = []; let vt = 0, lastT = null;
    strokes.forEach((s, si) => s.pts.forEach((p, i) => { const dt = lastT === null ? 0 : Math.min(Math.max(p.t - lastT, 0), i === 0 ? 250 : 80); vt += dt; lastT = p.t; segs.push({ si, i, vt }); }));
    const speed = Math.max(1, vt / 10000);
    ctx.fillStyle = it.bg || '#fff'; ctx.fillRect(0, 0, sw, sh);
    const ink = document.createElement('canvas'); ink.width = sw; ink.height = sh; const ictx = ink.getContext('2d');
    let rec = null, chunks = [];
    if (record) {
      try { const stream = cv.captureStream(30); const mt = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
        rec = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined); rec.ondataavailable = e => e.data.size && chunks.push(e.data);
        rec.onstop = () => { const blob = new Blob(chunks, { type: rec.mimeType || 'video/webm' }); SD.downloadBlob(blob, name + (blob.type.includes('mp4') ? '.mp4' : '.webm')); SD.toast('Video saved ⬇️'); };
        rec.start(); SD.toast('Recording your time-lapse… 🎬'); } catch (e) { SD.toast('Video recording is not supported in this browser'); rec = null; }
    }
    let k = 0, start = SD.now(), raf = 0, begun = new Set(), stop = false;
    const step = () => {
      if (stop) return;
      const now = (SD.now() - start) * speed;
      while (k < segs.length && segs[k].vt <= now) { const g = segs[k], s = strokes[g.si]; if (!begun.has(g.si)) { begun.add(g.si); SD.brush.begin(s); } if (g.i > 0 && s.type !== 'clear') SD.brush.seg(ictx, s, g.i); k++; }
      ctx.fillStyle = it.bg || '#fff'; ctx.fillRect(0, 0, sw, sh); ctx.drawImage(ink, 0, 0);
      if (k < segs.length) raf = requestAnimationFrame(step); else { if (rec) setTimeout(() => rec.state !== 'inactive' && rec.stop(), 800); else SD.sfx('success'); }
    };
    raf = requestAnimationFrame(step);
    replayStop = () => { stop = true; cancelAnimationFrame(raf); if (rec && rec.state !== 'inactive') rec.stop(); };
  }

  SD.registerMode({ id: 'gallery', name: 'My Gallery', icon: '🖼️', color: 'c7', desc: 'Your saved art, time-lapse videos', title: '🖼️ My Gallery', enter() { list(); }, exit() { cleanup(); } });
})(window.SD);
