/* Gallery storage — IndexedDB on this device (memory fallback) */
(function (SD) {
  const S = SD.store = {}; let dbp = null; const mem = new Map();
  const open = () => dbp || (dbp = new Promise((res) => {
    try {
      const r = indexedDB.open('shadowdraw', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('art', { keyPath: 'id' });
      r.onsuccess = () => res(r.result); r.onerror = () => res(null);
    } catch (e) { res(null); }
  }));
  const tx = async (mode, fn) => { const db = await open(); if (!db) return null; return new Promise((res, rej) => { const t = db.transaction('art', mode); const st = t.objectStore('art'); const r = fn(st); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); };

  S.save = async (item) => {
    item.id = item.id || Date.now() + '-' + Math.floor(Math.random() * 1e4); item.date = item.date || Date.now();
    try { const ok = await tx('readwrite', st => st.put(item)); if (ok === null) mem.set(item.id, item); } catch (e) { mem.set(item.id, item); }
    return item.id;
  };
  S.list = async () => {
    let all = []; try { all = (await tx('readonly', st => st.getAll())) || []; } catch (e) {}
    return [...all, ...mem.values()].sort((a, b) => b.date - a.date);
  };
  S.get = async (id) => { if (mem.has(id)) return mem.get(id); try { return await tx('readonly', st => st.get(id)); } catch (e) { return null; } };
  S.remove = async (id) => { mem.delete(id); try { await tx('readwrite', st => st.delete(id)); } catch (e) {} };

  // Snapshot helper: composite canvases on a background into a PNG + thumbnail
  SD.snapshot = async (canvases, bg = '#ffffff', crop = null) => {
    const src = canvases[0]; const cw = crop ? crop.w * SD.dpr : src.width, ch = crop ? crop.h * SD.dpr : src.height;
    const c = document.createElement('canvas'); c.width = Math.round(cw); c.height = Math.round(ch); const x = c.getContext('2d');
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); }
    for (const cv of canvases) { if (!cv) continue; if (crop) x.drawImage(cv, crop.x * SD.dpr, crop.y * SD.dpr, cw, ch, 0, 0, c.width, c.height); else x.drawImage(cv, 0, 0); }
    const t = document.createElement('canvas'); const k = 320 / Math.max(c.width, c.height); t.width = Math.round(c.width * k); t.height = Math.round(c.height * k);
    t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    return { blob, thumb: t.toDataURL('image/jpeg', 0.8), w: c.width, h: c.height };
  };
  SD.saveArt = async (mode, canvases, bg, extra = {}, crop = null) => {
    const snap = await SD.snapshot(canvases, bg, crop);
    await S.save({ mode, blob: snap.blob, thumb: snap.thumb, w: snap.w, h: snap.h, ...extra });
    SD.sfx('star'); SD.burst(SD.W - 80, SD.H - 80, 26); SD.toast('Saved to your Gallery ⭐');
  };
})(window.SD);
