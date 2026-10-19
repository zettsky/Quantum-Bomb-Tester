/* Quantum Bomb Tester — chiptune sound effects and music, synthesised with WebAudio. */
(function () {
  'use strict';
  window.QBT = window.QBT || {};
  const { Settings } = window.QBT;

  let ctx = null;
  let master, musicBus, sfxBus;
  let musicOn = false;
  let musicTimer = null;
  let nextNoteTime = 0;
  let step = 0;

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);
    applyVolumes();
  }

  function applyVolumes() {
    if (!ctx) return;
    const s = Settings.get();
    master.gain.value = s.master / 100;
    musicBus.gain.value = (s.music / 100) * 0.18;
    sfxBus.gain.value = (s.sfx / 100) * 0.35;
  }
  Settings.onChange(applyVolumes);

  function tone(freq, dur, opts) {
    if (!ctx) return;
    const o = opts || {};
    const t0 = (o.at || ctx.currentTime) + (o.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
    const v = o.vol == null ? 1 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(o.bus || sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = vol == null ? 0.6 : vol;
    src.buffer = buf;
    src.connect(g);
    g.connect(sfxBus);
    src.start();
  }

  const sfx = {
    click: () => tone(660, 0.05, { vol: 0.5 }),
    select: () => {
      tone(880, 0.06, { vol: 0.5 });
      tone(1320, 0.08, { vol: 0.5, delay: 0.05 });
    },
    back: () => tone(440, 0.07, { vol: 0.4, slide: 330 }),
    type: () => tone(1100 + Math.random() * 200, 0.02, { vol: 0.12 }),
    step: () => tone(140, 0.03, { type: 'triangle', vol: 0.25 }),
    emit: () => tone(1200, 0.12, { type: 'sine', vol: 0.4, slide: 2400 }),
    d1: () => {
      tone(784, 0.1, { type: 'triangle', vol: 0.8 });
      tone(1046, 0.14, { type: 'triangle', vol: 0.7, delay: 0.06 });
    },
    d2: () => {
      tone(523, 0.1, { type: 'square', vol: 0.5 });
      tone(659, 0.1, { type: 'square', vol: 0.5, delay: 0.07 });
      tone(880, 0.18, { type: 'square', vol: 0.5, delay: 0.14 });
    },
    absorb: () => {
      noise(0.35, 0.5);
      tone(220, 0.35, { type: 'sawtooth', vol: 0.4, slide: 70 });
    },
    good: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, { vol: 0.45, delay: i * 0.07 })),
    bad: () => {
      tone(330, 0.12, { vol: 0.4 });
      tone(247, 0.22, { vol: 0.4, delay: 0.1 });
    },
    place: () => {
      tone(392, 0.06, { type: 'triangle', vol: 0.6 });
      tone(784, 0.1, { type: 'triangle', vol: 0.6, delay: 0.05 });
    },
    fanfare: () => [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { vol: 0.5, delay: i * 0.11 })),
  };

  function play(name) {
    init();
    if (sfx[name]) sfx[name]();
  }

  // Gentle looping chiptune: arpeggiated I–vi–IV–V in C, triangle bass.
  const CHORDS = [
    [261.6, 329.6, 392.0],
    [220.0, 261.6, 329.6],
    [174.6, 220.0, 261.6],
    [196.0, 246.9, 293.7],
  ];
  const STEP = 0.22;
  function scheduleMusic() {
    while (nextNoteTime < ctx.currentTime + 0.4) {
      const bar = Math.floor(step / 8) % CHORDS.length;
      const chord = CHORDS[bar];
      const i = step % 8;
      const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
      tone(chord[pattern[i]] * 2, STEP * 0.9, { type: 'square', vol: 0.18, at: nextNoteTime, bus: musicBus });
      if (i === 0 || i === 4) tone(chord[0] / 2, STEP * 3.6, { type: 'triangle', vol: 0.5, at: nextNoteTime, bus: musicBus });
      nextNoteTime += STEP;
      step++;
    }
  }
  function startMusic() {
    init();
    if (!ctx || musicOn) return;
    musicOn = true;
    nextNoteTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(scheduleMusic, 100);
  }
  function stopMusic() {
    musicOn = false;
    clearInterval(musicTimer);
  }

  window.QBT.Audio = { init, play, startMusic, stopMusic };
})();
