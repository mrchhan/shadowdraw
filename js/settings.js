/* Settings (saved on this device) */
(function (SD) {
  const DEFAULTS = {
    camera: true,            // use webcam hand tracking
    facing: 'user',          // 'user' front / 'environment' back
    mirror: true,            // mirror view like a mirror
    camOpacity: 0.22,        // how much of the camera shows behind the board
    board: 'paper',          // paper | night | camera
    drawGesture: 'pinch',    // pinch | point
    pinchSens: 1.0,          // 0.6 (strict) .. 1.6 (easy)
    smoothing: 0.65,          // 0 (fast) .. 1 (very smooth)
    reach: 1.15,             // 1 = exact, >1 = small moves cover more screen
    dwellMs: 1000,           // hover-to-click time
    showSkeleton: false,
    lefty: false,
    sound: true,
    voice: true,
    praiseLang: 'both',      // en | ur | both
    timeLimit: 0,            // minutes, 0 = off
    modelComplexity: 1,      // 0 lite, 1 full
    maxHands: 2,
    brushSize: 14,
  };
  let data = { ...DEFAULTS };
  try { Object.assign(data, JSON.parse(localStorage.getItem('sd.settings') || '{}')); } catch (e) {}
  const listeners = [];
  SD.S = data;
  SD.DEFAULTS = DEFAULTS;
  SD.setSetting = (k, v) => {
    data[k] = v;
    try { localStorage.setItem('sd.settings', JSON.stringify(data)); } catch (e) {}
    listeners.forEach(fn => fn(k, v));
  };
  SD.onSetting = (fn) => listeners.push(fn);
  SD.resetSettings = () => { Object.keys(DEFAULTS).forEach(k => SD.setSetting(k, DEFAULTS[k])); };
})(window.SD);
