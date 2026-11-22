# ShadowDraw — desktop app

The Electron wrapper that turns the web app at the repo root into an offline desktop app.

```bash
npm install
npm start          # copies the web app into ./app and runs it
npm run dist       # Windows installer + portable .exe → ./dist
```

- `sync.js` copies `index.html`, `css`, `js`, `vendor`, `icons`, `sw.js` and `manifest.webmanifest` from the repo root into `desktop/app/`. Edit the files at the root, not in `app/`.
- The app is served from a private `app://` address, so the camera, storage and hand-tracking files all work with no internet.
- Builds are not code-signed, so Windows SmartScreen shows "More info → Run anyway".
