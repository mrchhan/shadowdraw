/* Sounds, music synthesis and spoken praise — all generated offline with Web Audio */
(function (SD) {
  let ac = null, master = null, noiseBuf = null;
  SD.audio = () => {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ac = new AC(); master = ac.createGain(); master.gain.value = 0.8;
      const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };
  const ok = () => SD.S.sound && SD.audio();
  SD.midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function env(g, t, a, peak, d, sus = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(sus, t + a + d); }
  function tone(type, f, dur, vol = 0.3, f2 = null, when = 0) {
    if (!ok()) return; const t = ac.currentTime + when;
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, 0.008, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, filterType, freq, q = 1, when = 0) {
    if (!ok()) return; const t = ac.currentTime + when;
    const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); env(g, t, 0.003, vol, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }

  SD.sfx = (name) => {
    switch (name) {
      case 'click': tone('sine', 660, 0.08, 0.25, 880); break;
      case 'hover': tone('sine', 520, 0.05, 0.06); break;
      case 'pop': tone('sine', SD.rnd(500, 900), 0.12, 0.35, 120); noise(0.05, 0.15, 'highpass', 2000); break;
      case 'fill': tone('triangle', 300, 0.25, 0.25, 900); break;
      case 'whoosh': noise(0.4, 0.25, 'bandpass', 900, 0.7); break;
      case 'star': [0, 4, 7, 12].forEach((s, i) => tone('triangle', SD.midiFreq(84 + s), 0.18, 0.18, null, i * 0.06)); break;
      case 'success': [0, 4, 7, 12, 16].forEach((s, i) => tone('triangle', SD.midiFreq(72 + s), 0.3, 0.2, null, i * 0.09)); break;
      case 'stamp': tone('square', 180, 0.1, 0.12, 90); break;
      case 'grab': tone('sine', 400, 0.07, 0.15, 600); break;
      case 'drop': tone('sine', 600, 0.08, 0.15, 300); break;
      case 'error': tone('sawtooth', 200, 0.15, 0.08, 150); break;
    }
  };

  // Karplus–Strong plucked string
  SD.pluck = (freq, vol = 0.5, bright = 0.5) => {
    if (!ok()) return; const sr = ac.sampleRate, len = Math.floor(sr * 2.2);
    const buf = ac.createBuffer(1, len, sr), out = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / freq)), ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    const decay = 0.996 + Math.min(0.0035, 60 / freq * 0.001), mix = 0.5 - bright * 0.25;
    let idx = 0, prev = 0;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx]; const nxt = ring[(idx + 1) % N];
      const v = decay * ((1 - mix) * cur + mix * nxt);
      ring[idx] = v; out[i] = cur; prev = cur; idx = (idx + 1) % N;
    }
    const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = vol;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000 + bright * 5000;
    s.connect(lp); lp.connect(g); g.connect(master); s.start();
  };

  SD.pianoNote = (freq, vol = 0.35) => {
    if (!ok()) return; const t = ac.currentTime;
    const g = ac.createGain(); env(g, t, 0.005, vol, 1.6);
    [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].forEach(([m, type, v]) => {
      const o = ac.createOscillator(), og = ac.createGain(); o.type = type; o.frequency.value = freq * m; og.gain.value = v; o.connect(og); og.connect(g); o.start(t); o.stop(t + 1.8);
    });
    g.connect(master);
  };

  SD.drum = (kind) => {
    if (!ok()) return; const t = ac.currentTime;
    if (kind === 'kick') { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.35); env(g, t, 0.003, 0.9, 0.4); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5); }
    else if (kind === 'snare') { noise(0.22, 0.5, 'highpass', 1500); tone('triangle', 200, 0.12, 0.3, 140); }
    else if (kind === 'hat') noise(0.06, 0.35, 'highpass', 7000);
    else if (kind === 'tom') tone('sine', 220, 0.35, 0.6, 110);
    else if (kind === 'clap') { [0, 0.012, 0.024].forEach(w => noise(0.09, 0.35, 'bandpass', 1200, 0.8, w)); }
    else if (kind === 'cymbal') noise(1.2, 0.3, 'highpass', 5000, 0.5);
    else if (kind === 'cowbell') { tone('square', 540, 0.25, 0.12); tone('square', 800, 0.25, 0.1); }
    else if (kind === 'tabla') { tone('sine', 330, 0.5, 0.5, 300); noise(0.03, 0.2, 'bandpass', 2500); }
  };

  // Theremin: a continuous voice
  SD.theremin = {
    o: null, g: null, f: null,
    start() { if (!ok() || this.o) return; this.o = ac.createOscillator(); this.o.type = 'sine'; const v = ac.createOscillator(), vg = ac.createGain(); v.frequency.value = 5.5; vg.gain.value = 6; v.connect(vg); vg.connect(this.o.frequency); v.start(); this.v = v;
      this.g = ac.createGain(); this.g.gain.value = 0; this.o.connect(this.g); this.g.connect(master); this.o.start(); },
    set(freq, vol) { if (!this.o) return; const t = ac.currentTime; this.o.frequency.setTargetAtTime(freq, t, 0.03); this.g.gain.setTargetAtTime(vol, t, 0.05); },
    stop() { if (!this.o) return; const t = ac.currentTime; this.g.gain.setTargetAtTime(0, t, 0.05); const o = this.o, v = this.v; setTimeout(() => { try { o.stop(); v.stop(); } catch (e) {} }, 300); this.o = null; },
  };

  // Speech
  let voices = [];
  const loadVoices = () => { try { voices = speechSynthesis.getVoices(); } catch (e) {} };
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  SD.hasUrduVoice = () => voices.some(v => /^ur/i.test(v.lang));
  SD.say = (text, lang = 'en') => {
    if (!SD.S.voice || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; u.pitch = 1.15;
      const v = voices.find(v => lang === 'ur' ? /^ur/i.test(v.lang) : /^en/i.test(v.lang));
      if (lang === 'ur' && !v) return; // no Urdu voice installed — show text only
      if (v) { u.voice = v; u.lang = v.lang; }
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) {}
  };

  const PRAISE_EN = ['Well done!', 'Amazing!', 'Super star!', 'Great job!', 'Beautiful!', 'Wow!', 'Fantastic!', 'You did it!'];
  const PRAISE_UR = [['Shabash!', 'شاباش'], ['Bohat khoob!', 'بہت خوب'], ['Zabardast!', 'زبردست'], ['Kamaal!', 'کمال'], ['Wah wah!', 'واہ واہ']];
  let lastPraise = 0;
  SD.praise = (text) => {
    if (SD.now() - lastPraise < 1200) return; lastPraise = SD.now();
    let shown = text, spoken = text, lang = 'en';
    if (!text) {
      const mode = SD.S.praiseLang === 'both' ? (Math.random() < 0.5 ? 'en' : 'ur') : SD.S.praiseLang;
      if (mode === 'ur') { const p = SD.pick(PRAISE_UR); shown = p[0]; spoken = p[1]; lang = 'ur'; if (!SD.hasUrduVoice()) { spoken = null; } }
      else { shown = spoken = SD.pick(PRAISE_EN); }
    }
    const el = SD.$('#praise'); el.textContent = shown; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    SD.sfx('success'); if (spoken) SD.say(spoken, lang);
  };
})(window.SD);
