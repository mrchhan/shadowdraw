// Copies the web app (repo root) into desktop/app so Electron can package it.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'app');
const ITEMS = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'vendor', 'icons'];
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const it of ITEMS) fs.cpSync(path.join(ROOT, it), path.join(OUT, it), { recursive: true });
console.log('Copied web app into desktop/app');
