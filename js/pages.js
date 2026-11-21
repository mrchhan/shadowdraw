/* Colouring-book pages — original line art drawn in a 1000×1000 space.
   Item kinds: "svg path", {c:[x,y,r]}, {e:[x,y,rx,ry,rot]}, {star:[x,y,r,n]}, {clip:shape, items}, {clipOut:[shapes], items}, {gen:fn} */
(function (SD) {
  const cloud = (x, y, s) => `M ${x - 1.3 * s} ${y + 0.4 * s} A ${0.45 * s} ${0.45 * s} 0 0 1 ${x - 0.7 * s} ${y - 0.2 * s} A ${0.55 * s} ${0.55 * s} 0 0 1 ${x + 0.2 * s} ${y - 0.45 * s} A ${0.5 * s} ${0.5 * s} 0 0 1 ${x + 1.0 * s} ${y - 0.05 * s} A ${0.4 * s} ${0.4 * s} 0 0 1 ${x + 1.3 * s} ${y + 0.4 * s} Z`;
  const rays = (x, y, r1, r2, n) => Array.from({ length: n }, (_, i) => { const a = i * Math.PI * 2 / n; return `M ${x + Math.cos(a) * r1} ${y + Math.sin(a) * r1} L ${x + Math.cos(a) * r2} ${y + Math.sin(a) * r2}`; }).join(' ');
  const grid = (x0, y0, x1, y1, step) => { let d = ''; for (let k = -1000; k < 1000; k += step) { d += `M ${x0 + k} ${y0} L ${x0 + k + (y1 - y0)} ${y1} M ${x0 + k} ${y1} L ${x0 + k + (y1 - y0)} ${y0} `; } return d; };

  const fishBody = { e: [450, 500, 260, 170, 0] };
  const roofTri = 'M 180 500 L 500 230 L 820 500 Z';
  const canopy = 'M 300 620 C 180 620 160 480 250 440 C 210 330 320 250 400 290 C 430 190 570 190 600 290 C 690 250 790 330 750 440 C 840 480 820 620 700 620 Z';
  const scoop1 = 'M 360 530 C 280 520 300 400 380 410 C 380 320 470 300 500 340 C 530 300 620 320 620 410 C 700 400 720 520 640 530 Z';
  const cone = 'M 380 528 L 620 528 L 500 930 Z';
  const shell = 'M 220 620 C 230 380 400 300 500 300 C 600 300 770 380 780 620 Z';
  const catHead = { e: [500, 390, 210, 180, 0] };
  const catBody = { e: [500, 760, 200, 180, 0] };
  const rocketBody = 'M 500 120 C 620 230 640 420 620 700 L 380 700 C 360 420 380 230 500 120 Z';

  SD.PAGES = [
    { id: 'fish', name: 'Happy Fish', items: [
      fishBody, 'M 700 500 L 900 350 L 880 500 L 900 650 Z', 'M 380 345 Q 450 220 560 345 Z', 'M 420 650 Q 470 760 540 655 Z',
      { clip: fishBody, items: ['M 500 300 Q 450 500 500 700', 'M 600 300 Q 560 500 600 700'] },
      { c: [310, 450, 42] }, { c: [322, 452, 16] }, 'M 205 545 Q 235 570 270 550',
      { c: [150, 300, 30] }, { c: [110, 200, 22] }, { c: [165, 120, 15] },
      'M 0 880 Q 125 840 250 880 T 500 880 T 750 880 T 1000 880', { c: [800, 180, 26] }, { c: [860, 110, 16] }] },
    { id: 'house', name: 'Sweet Home', items: [
      'M 0 850 L 1000 850', { clipOut: [roofTri], items: ['M 630 230 L 710 230 L 710 460 L 630 460 Z'] }, 'M 220 480 L 780 480 L 780 850 L 220 850 Z', roofTri,
      'M 450 850 L 450 690 Q 500 630 550 690 L 550 850 Z', { c: [530, 770, 9] },
      'M 280 560 L 400 560 L 400 670 L 280 670 Z M 340 560 L 340 670 M 280 615 L 400 615', 'M 600 560 L 720 560 L 720 670 L 600 670 Z M 660 560 L 660 670 M 600 615 L 720 615',
      { c: [500, 400, 46] }, { c: [140, 140, 70] }, rays(140, 140, 90, 140, 10), cloud(760, 190, 90),
      'M 470 850 L 420 1000 M 530 850 L 580 1000', { c: [110, 900, 22] }, { c: [880, 905, 22] }, 'M 110 922 L 110 990 M 880 927 L 880 990'] },
    { id: 'flower', name: 'Big Flower', items: [
      ...Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return { e: [500 + Math.cos(a) * 140, 330 + Math.sin(a) * 140, 80, 48, a] }; }),
      { c: [500, 330, 75] }, { c: [470, 310, 12] }, { c: [530, 310, 12] }, 'M 465 355 Q 500 385 535 355',
      { clipOut: [{ c: [500, 330, 75] }], items: ['M 488 410 C 470 550 510 650 488 745 L 512 745 C 534 650 494 550 512 410 Z'] },
      'M 495 610 Q 380 520 320 610 Q 400 670 495 610 Z', 'M 505 540 Q 620 450 690 540 Q 600 600 505 540 Z',
      'M 360 790 L 640 790 L 600 960 L 400 960 Z', 'M 340 740 L 660 740 L 660 790 L 340 790 Z', { c: [440, 870, 18] }, { c: [560, 870, 18] }] },
    { id: 'butterfly', name: 'Butterfly', items: [
      'M 480 430 C 300 200 120 260 170 420 C 200 520 350 540 480 520 Z', 'M 520 430 C 700 200 880 260 830 420 C 800 520 650 540 520 520 Z',
      'M 480 540 C 320 560 230 680 300 760 C 370 820 460 720 485 620 Z', 'M 520 540 C 680 560 770 680 700 760 C 630 820 540 720 515 620 Z',
      { e: [500, 520, 30, 190, 0] }, { c: [500, 305, 46] }, 'M 485 268 Q 440 180 400 160', 'M 515 268 Q 560 180 600 160', { c: [395, 155, 16] }, { c: [605, 155, 16] },
      { c: [285, 375, 50] }, { c: [715, 375, 50] }, { c: [390, 455, 24] }, { c: [610, 455, 24] }, { c: [365, 670, 36] }, { c: [635, 670, 36] },
      { c: [484, 300, 7] }, { c: [516, 300, 7] }] },
    { id: 'car', name: 'Zoom Car', items: [
      'M 0 800 L 1000 800', 'M 120 640 L 120 560 Q 130 520 180 515 L 300 510 L 380 400 Q 395 380 420 380 L 650 380 Q 680 380 700 405 L 780 510 L 860 520 Q 900 530 900 570 L 900 640 Q 900 660 880 660 L 140 660 Q 120 660 120 640 Z',
      'M 400 500 L 450 410 L 540 410 L 540 500 Z', 'M 570 500 L 570 410 L 650 410 Q 665 410 675 425 L 730 500 Z', 'M 555 515 L 555 650', 'M 590 565 L 630 565',
      { c: [290, 665, 88] }, { c: [290, 665, 38] }, { c: [720, 665, 88] }, { c: [720, 665, 38] }, { e: [872, 575, 16, 24, 0] }, { e: [140, 580, 12, 20, 0] },
      cloud(200, 180, 80), cloud(760, 140, 60), { c: [500, 140, 55] }] },
    { id: 'rocket', name: 'Space Rocket', items: [
      rocketBody, { clip: rocketBody, items: ['M 380 290 Q 500 255 620 290', 'M 370 640 L 630 640'] }, { c: [500, 400, 64] }, { c: [500, 400, 44] }, { c: [500, 540, 34] },
      'M 383 560 L 270 700 L 270 790 L 385 700 Z', 'M 617 560 L 730 700 L 730 790 L 615 700 Z', 'M 480 700 L 520 700 L 520 800 L 480 800 Z',
      { clipOut: ['M 480 700 L 520 700 L 520 800 L 480 800 Z'], items: ['M 400 700 Q 420 820 465 880 Q 480 830 500 920 Q 520 830 535 880 Q 580 820 600 700 Z'] },
      { star: [130, 600, 45, 5] }, { star: [860, 520, 40, 5] }, { star: [840, 880, 32, 5] }, { star: [170, 880, 30, 5] },
      { c: [160, 230, 70] }, { clipOut: [{ c: [160, 230, 70] }], items: [{ e: [160, 230, 125, 32, -0.35] }] }, { c: [820, 200, 40] }] },
    { id: 'cat', name: 'Kitty', items: [
      { clipOut: [catHead], items: [catBody, 'M 690 830 C 860 820 880 640 800 600 C 780 590 760 610 775 630 C 830 690 800 790 690 790 Z'] },
      catHead, 'M 330 285 L 320 120 L 450 222 Z', 'M 670 285 L 680 120 L 550 222 Z', 'M 345 250 L 340 165 L 415 222 Z', 'M 655 250 L 660 165 L 585 222 Z',
      { e: [420, 370, 36, 46, 0] }, { e: [580, 370, 36, 46, 0] }, { e: [425, 378, 12, 28, 0] }, { e: [585, 378, 12, 28, 0] },
      'M 480 450 L 520 450 L 500 475 Z', 'M 500 475 Q 500 510 460 510 M 500 475 Q 500 510 540 510',
      'M 320 455 L 440 470 M 320 500 L 440 490 M 680 455 L 560 470 M 680 500 L 560 490',
      { e: [420, 935, 62, 30, 0] }, { e: [580, 935, 62, 30, 0] }, { clip: catBody, items: [{ e: [500, 760, 110, 120, 0] }] }] },
    { id: 'tree', name: 'Apple Tree', items: [
      canopy, { clipOut: [canopy], items: ['M 450 955 L 462 560 L 538 560 L 550 955 Z'] },
      { c: [380, 420, 34] }, { c: [565, 375, 34] }, { c: [470, 520, 34] }, { c: [655, 500, 34] }, { c: [320, 545, 30] },
      'M 380 386 L 388 366 M 565 341 L 573 321 M 470 486 L 478 466 M 655 466 L 663 446',
      'M 0 955 L 1000 955', 'M 40 955 L 60 905 L 80 955 M 140 955 L 160 915 L 180 955 M 820 955 L 840 905 L 860 955 M 920 955 L 940 915 L 960 955',
      { c: [870, 130, 62] }, rays(870, 130, 80, 120, 8), 'M 120 200 Q 150 170 180 200 Q 210 170 240 200', 'M 200 120 Q 222 100 244 120 Q 266 100 288 120',
      { c: [510, 760, 32] }, { c: [490, 750, 8] }] },
    { id: 'icecream', name: 'Ice Cream', items: [
      cone, { clip: cone, items: [grid(380, 528, 620, 930, 70)] },
      { clipOut: [scoop1], items: ['M 390 390 C 330 260 440 180 500 215 C 560 180 670 260 610 390 Z'] }, scoop1,
      { clipOut: ['M 390 390 C 330 260 440 180 500 215 C 560 180 670 260 610 390 Z'], items: [{ c: [500, 190, 38] }] }, 'M 500 152 Q 510 100 560 80',
      { e: [420, 470, 10, 22, 0.6] }, { e: [560, 440, 10, 22, -0.4] }, { e: [480, 450, 10, 22, 1.2] }, { e: [600, 490, 10, 22, 0.2] }, { e: [470, 300, 10, 22, -0.8] }, { e: [550, 320, 10, 22, 0.5] },
      { star: [180, 220, 50, 5] }, { star: [820, 260, 42, 5] }, { c: [200, 700, 40] }, { c: [800, 680, 30] }] },
    { id: 'turtle', name: 'Turtle', items: [
      { clipOut: [shell, 'M 200 620 L 800 620 L 790 662 L 210 662 Z'], items: [{ c: [845, 565, 72] }, { e: [300, 660, 58, 44, 0] }, { e: [700, 660, 58, 44, 0] }, 'M 225 600 L 130 640 L 225 625 Z'] },
      shell, { clip: shell, items: ['M 440 380 L 560 380 L 600 470 L 560 560 L 440 560 L 400 470 Z M 440 380 L 400 300 M 560 380 L 600 300 M 600 470 L 800 470 M 400 470 L 200 470 M 440 560 L 410 640 M 560 560 L 590 640'] },
      'M 200 620 L 800 620 L 790 662 L 210 662 Z', { c: [868, 545, 11] }, 'M 860 595 Q 880 605 900 590',
      'M 0 760 Q 250 730 500 760 T 1000 760', { c: [150, 200, 60] }, cloud(760, 180, 80)] },
    { id: 'mandala', name: 'Magic Mandala', gen: (ctx, P) => {
      const c = 500; [430, 340, 250, 160, 70].forEach(r => P({ c: [c, c, r] }));
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; P({ clip: { c: [c, c, 430] }, items: [{ clipOut: [{ c: [c, c, 340] }], items: [{ e: [c + Math.cos(a) * 395, c + Math.sin(a) * 395, 52, 30, a] }] }] }); }
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, b = a + Math.PI / 12; P(`M ${c + Math.cos(a) * 250} ${c + Math.sin(a) * 250} L ${c + Math.cos(a) * 340} ${c + Math.sin(a) * 340}`); P({ c: [c + Math.cos(b) * 295, c + Math.sin(b) * 295, 22] }); }
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; P({ clip: { c: [c, c, 250] }, items: [{ clipOut: [{ c: [c, c, 160] }], items: [{ e: [c + Math.cos(a) * 205, c + Math.sin(a) * 205, 60, 34, a] }] }] }); }
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; P({ clip: { c: [c, c, 160] }, items: [{ clipOut: [{ c: [c, c, 70] }], items: [`M ${c} ${c} L ${c + Math.cos(a) * 160} ${c + Math.sin(a) * 160}`] }] }); }
      P({ star: [c, c, 45, 8] });
    } },
    { id: 'rainbow', name: 'Rainbow Day', items: [
      { clipOut: [cloud(150, 770, 95), cloud(850, 770, 95)], items: [[380, 330, 280, 230, 180].map(r => `M ${500 - r} 770 A ${r} ${r} 0 0 1 ${500 + r} 770`).join(' '), 'M 120 770 L 880 770'] },
      cloud(150, 770, 95), cloud(850, 770, 95), { c: [880, 140, 60] }, rays(880, 140, 78, 118, 10), 'M 120 150 Q 150 120 180 150 Q 210 120 240 150',
      'M 0 920 Q 250 880 500 920 T 1000 920', { star: [300, 140, 30, 5] }, { star: [620, 120, 24, 5] }] },
  ];

  const shapePath = (it) => {
    const p = new Path2D();
    if (typeof it === 'string') p.addPath(new Path2D(it));
    else if (it.c) { p.moveTo(it.c[0] + it.c[2], it.c[1]); p.arc(it.c[0], it.c[1], it.c[2], 0, Math.PI * 2); p.closePath(); }
    else if (it.e) { const [x, y, rx, ry, rot] = it.e; p.moveTo(x + Math.cos(rot || 0) * rx, y + Math.sin(rot || 0) * rx); p.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); p.closePath(); }
    else if (it.star) { const [x, y, r, n] = it.star; for (let i = 0; i < n * 2; i++) { const rr = i % 2 ? r * 0.45 : r, a = i * Math.PI / n - Math.PI / 2; i ? p.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : p.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } p.closePath(); }
    return p;
  };
  function drawItem(ctx, it) {
    if (typeof it === 'string' || it.c || it.e || it.star) { ctx.stroke(shapePath(it)); return; }
    if (it.clip) { ctx.save(); ctx.clip(shapePath(it.clip)); it.items.forEach(i => drawItem(ctx, i)); ctx.restore(); return; }
    if (it.clipOut) { ctx.save(); const p = new Path2D(); p.rect(-50, -50, 1100, 1100); it.clipOut.forEach(s => p.addPath(shapePath(s))); ctx.clip(p, 'evenodd'); it.items.forEach(i => drawItem(ctx, i)); ctx.restore(); }
  }
  // Draw a page into ctx at (x,y) with size s (square)
  SD.drawPage = (ctx, page, x, y, s, lw = 7) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 1000, s / 1000);
    ctx.lineWidth = lw * 1000 / s * (s / 700); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#1f1640';
    if (page.gen) page.gen(ctx, (it) => drawItem(ctx, it)); else page.items.forEach(it => drawItem(ctx, it));
    ctx.restore();
  };
  SD.pageThumb = (page, size = 220) => {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, size, size); SD.drawPage(x, page, size * 0.06, size * 0.06, size * 0.88, 5); return c.toDataURL();
  };
})(window.SD);
