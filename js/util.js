/* ShadowDraw core helpers */
window.SD = window.SD || {};
(function (SD) {
  SD.$ = (s, r = document) => r.querySelector(s);
  SD.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  SD.html = (str) => { const t = document.createElement('template'); t.innerHTML = str.trim(); return t.content.firstElementChild; };
  SD.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  SD.lerp = (a, b, t) => a + (b - a) * t;
  SD.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  SD.rnd = (a, b) => a + Math.random() * (b - a);
  SD.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  SD.now = () => performance.now();
  SD.esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  SD.seeded = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

  // Segment intersection (for string plucking)
  SD.segCross = (p1, p2, p3, p4) => {
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (Math.abs(d) < 1e-6) return null;
    const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
    return (t >= 0 && t <= 1 && u >= 0 && u <= 1) ? { t, u } : null;
  };
  SD.distToSeg = (p, a, b) => {
    const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy || 1;
    const t = SD.clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / l2, 0, 1);
    return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
  };

  // One Euro filter — smooth when slow, responsive when fast
  class OneEuro {
    constructor(minCutoff = 1.2, beta = 0.02, dCutoff = 1) { this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff; this.x = null; this.dx = 0; this.t = 0; }
    alpha(cutoff, dt) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
    filter(x, t) {
      if (this.x === null) { this.x = x; this.t = t; return x; }
      const dt = Math.max(1e-3, (t - this.t) / 1000); this.t = t;
      const dx = (x - this.x) / dt;
      this.dx = this.dx + this.alpha(this.dCutoff, dt) * (dx - this.dx);
      const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
      this.x = this.x + this.alpha(cutoff, dt) * (x - this.x);
      return this.x;
    }
  }
  SD.OneEuro = OneEuro;

  // Screen + layers
  SD.W = innerWidth; SD.H = innerHeight; SD.dpr = Math.min(window.devicePixelRatio || 1, 2);
  SD.fitCanvas = (c) => {
    const w = Math.round(SD.W * SD.dpr), h = Math.round(SD.H * SD.dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const ctx = c.getContext('2d'); ctx.setTransform(SD.dpr, 0, 0, SD.dpr, 0, 0); return ctx;
  };
  SD.layers = {};
  SD.makeLayer = (name, keepOnResize = true) => {
    if (SD.layers[name]) return SD.layers[name];
    const c = document.createElement('canvas'); c.dataset.layer = name; c.hidden = true;
    SD.$('#layers').appendChild(c);
    const L = { canvas: c, ctx: null, keep: keepOnResize, show() { c.hidden = false; }, hide() { c.hidden = true; } };
    L.ctx = SD.fitCanvas(c);
    SD.layers[name] = L; return L;
  };
  SD.resizeLayers = () => {
    for (const L of Object.values(SD.layers)) {
      let copy = null;
      if (L.keep && L.canvas.width) { copy = document.createElement('canvas'); copy.width = L.canvas.width; copy.height = L.canvas.height; copy.getContext('2d').drawImage(L.canvas, 0, 0); }
      L.ctx = SD.fitCanvas(L.canvas);
      if (copy) { L.ctx.save(); L.ctx.setTransform(1, 0, 0, 1, 0, 0); L.ctx.drawImage(copy, 0, 0); L.ctx.restore(); }
    }
  };

  // Toast + praise
  let toastT = 0;
  SD.toast = (msg, ms = 2200) => { const t = SD.$('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); };

  // Particles (confetti, pops, sparkles) drawn on fx by main loop
  SD.particles = [];
  SD.burst = (x, y, n = 24, colors, opts = {}) => {
    const cols = colors || ['#ff5d73', '#ffc93c', '#22c39a', '#3cb6f0', '#5b3df5', '#ff9f1c'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = SD.rnd(opts.minSpeed || 120, opts.maxSpeed || 460);
      SD.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opts.lift || 120), life: 1, decay: SD.rnd(0.6, 1.2) / (opts.dur || 1.1),
        size: SD.rnd(opts.minSize || 5, opts.maxSize || 11), color: SD.pick(cols), rot: Math.random() * 6, vr: SD.rnd(-8, 8), shape: opts.shape || SD.pick(['rect', 'circle', 'star']), g: opts.g ?? 600 });
    }
  };
  SD.confetti = () => { for (let i = 0; i < 6; i++) setTimeout(() => SD.burst(SD.rnd(SD.W * .15, SD.W * .85), SD.rnd(SD.H * .15, SD.H * .5), 30), i * 120); };
  SD.drawStar = (ctx, x, y, r, points = 5, inner = 0.5) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) { const rr = i % 2 ? r * inner : r, a = (i * Math.PI) / points - Math.PI / 2; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath();
  };
  SD.updateParticles = (ctx, dt) => {
    const P = SD.particles;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.99; p.rot += p.vr * dt; p.life -= p.decay * dt;
      if (p.life <= 0) { P.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 1.5); ctx.fillStyle = p.color; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 7); ctx.fill(); }
      else if (p.shape === 'star') { SD.drawStar(ctx, 0, 0, p.size * 0.8); ctx.fill(); }
      else ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      ctx.restore();
    }
  };

  SD.COLORS = ['#ff3b5c', '#ff8a1f', '#ffd21f', '#2bd46b', '#16b5a5', '#2f8cff', '#6a4cff', '#c04cff', '#ff6fb5', '#8b5a2b', '#24194d', '#ffffff'];
  SD.downloadDataURL = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  SD.downloadBlob = (blob, name) => { const u = URL.createObjectURL(blob); SD.downloadDataURL(u, name); setTimeout(() => URL.revokeObjectURL(u), 4000); };
  SD.printImage = (dataUrl) => {
    let pa = SD.$('#printArea'); if (pa) pa.remove();
    pa = SD.html(`<div id="printArea"><img src="${dataUrl}" alt=""></div>`); document.body.appendChild(pa);
    const img = pa.querySelector('img');
    const go = () => { try { window.print(); } catch (e) { SD.toast('Printing is not available here'); } setTimeout(() => pa.remove(), 1500); };
    img.complete ? setTimeout(go, 50) : (img.onload = () => setTimeout(go, 50));
  };
})(window.SD);
