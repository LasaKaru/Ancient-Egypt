/* ============================================================
   audio.js — Procedural sound via the Web Audio API.
   No asset files needed. Exposes global `Sound`.
   Must be started from a user gesture (handled by game start btn).
   ============================================================ */
(function (global) {
  "use strict";

  let ctx = null;
  let ambientGain = null;
  let master = null;
  let started = false;
  let _vol = 0.7;   // 0..1 master volume
  let _mute = false;

  function init() {
    if (started) return;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = _mute ? 0 : _vol;
    master.connect(ctx.destination);
    started = true;
    startAmbient();
  }

  const out = () => master || (ctx && ctx.destination);

  // Low, breathy temple drone built from a couple of detuned oscillators
  // plus filtered noise wind.
  function startAmbient() {
    ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.0;
    ambientGain.connect(out());
    ambientGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 4);

    const drone = ctx.createGain();
    drone.gain.value = 0.5;
    drone.connect(ambientGain);
    [55, 82.4, 110].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.detune.value = (i - 1) * 6;
      const g = ctx.createGain();
      g.gain.value = 0.3 / (i + 1);
      // slow tremolo
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07 + i * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.12;
      lfo.connect(lfoGain).connect(g.gain);
      o.connect(g).connect(drone);
      o.start();
      lfo.start();
    });

    // wind: filtered noise
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 480;
    bp.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.value = 0.06;
    noise.connect(bp).connect(ng).connect(ambientGain);
    noise.start();
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(out());
    o.start();
    o.stop(ctx.currentTime + dur + 0.05);
  }

  function noiseBurst(dur, filterFreq, vol) {
    if (!ctx) return;
    const src = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = filterFreq || 800;
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(bp).connect(g).connect(out());
    src.start();
  }

  // Public, named SFX -------------------------------------------------
  const Sound = {
    init,
    isReady: () => started,
    setVolume(v) { _vol = Math.max(0, Math.min(1, v)); if (master) master.gain.value = _mute ? 0 : _vol; },
    setMute(b) { _mute = !!b; if (master) master.gain.value = _mute ? 0 : _vol; },

    // "come alive" whoosh when entering a painting
    whoosh() {
      noiseBurst(0.7, 600, 0.25);
      tone(180, 0.7, "sawtooth", 0.12, 900);
    },
    // exit back to 3D
    unwhoosh() {
      tone(700, 0.5, "sine", 0.12, 160);
    },
    step() {
      tone(140 + Math.random() * 30, 0.08, "triangle", 0.07);
    },
    success() {
      [523, 659, 784, 1046].forEach((f, i) =>
        setTimeout(() => tone(f, 0.35, "triangle", 0.18), i * 110)
      );
    },
    stoneSlide() {
      noiseBurst(1.2, 200, 0.35);
      tone(70, 1.2, "sawtooth", 0.1, 50);
    },
    lightUp() {
      tone(330, 0.6, "sine", 0.15, 990);
      noiseBurst(0.4, 1600, 0.15);
    },
    bossRoar() {
      tone(90, 1.4, "sawtooth", 0.3, 50);
      noiseBurst(1.4, 300, 0.3);
    },
    hit() {
      noiseBurst(0.2, 1200, 0.3);
      tone(220, 0.15, "square", 0.2, 110);
    },
    bossDown() {
      [400, 300, 200, 120, 70].forEach((f, i) =>
        setTimeout(() => { tone(f, 0.5, "sawtooth", 0.22); }, i * 160)
      );
      setTimeout(() => Sound.success(), 900);
    },
  };

  global.Sound = Sound;
})(window);
