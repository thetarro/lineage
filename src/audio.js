// Procedural music and sound effects with the Web Audio API. No audio files needed.

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Ambient score per habitat: root note, scale, pad timbre, brightness and note spacing (s).
const MUSIC = {
  primordial: { root: 45, scale: [0, 3, 5, 7, 10], wave: 'triangle', cutoff: 700, spacing: 1.6 },
  ocean: { root: 50, scale: [0, 2, 4, 7, 9], wave: 'sine', cutoff: 1200, spacing: 1.0 },
  deep: { root: 38, scale: [0, 1, 5, 7, 8], wave: 'sawtooth', cutoff: 380, spacing: 2.2 },
  reef: { root: 55, scale: [0, 2, 4, 7, 9], wave: 'triangle', cutoff: 2000, spacing: 0.7 },
  land: { root: 48, scale: [0, 2, 4, 5, 7, 9], wave: 'triangle', cutoff: 1500, spacing: 0.85 },
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.theme = MUSIC.primordial;
  }

  /** Must be called from a user gesture (browser autoplay rules). */
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const ctx = (this.ctx = new AudioContext());
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(comp);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.5);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    this.reverb.connect(wet).connect(this.master);

    this.music = ctx.createGain();
    this.music.gain.value = 0.35;
    this.music.connect(this.master);
    this.music.connect(this.reverb);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);
    this.sfx.connect(this.reverb);

    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    this.nextNote = ctx.currentTime + 0.5;
    this.nextPad = ctx.currentTime;
    setInterval(() => this.scheduleMusic(), 100);
  }

  impulse(seconds) {
    const len = this.ctx.sampleRate * seconds;
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.5;
    }
    return buf;
  }

  get now() { return this.ctx.currentTime; }

  setMuted(muted) {
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.now, 0.1);
  }

  setTheme(key) { this.theme = MUSIC[key] ?? MUSIC.ocean; }

  /** Fade the score: 1 = normal, 0 = silent. */
  duck(level, seconds = 1) {
    if (this.ctx) this.music.gain.setTargetAtTime(0.35 * level, this.now, seconds / 3);
  }

  // ── Music ──────────────────────────────────────────────────────────────

  scheduleMusic() {
    if (this.ctx.state !== 'running') return;
    const th = this.theme;
    while (this.nextPad < this.now + 0.3) {
      // A new chord every 8 seconds, overlapping the previous one.
      const deg = pick([0, 0, 2, 3]);
      const notes = [0, 2, 4].map((i) => th.root + th.scale[(deg + i) % th.scale.length] + (deg + i >= th.scale.length ? 12 : 0));
      for (const n of notes) this.padVoice(this.nextPad, midi(n), th);
      this.nextPad += 8;
    }
    while (this.nextNote < this.now + 0.3) {
      const n = th.root + 12 * pick([1, 2, 2]) + pick(th.scale);
      this.pluck(this.nextNote, midi(n), th);
      this.nextNote += th.spacing * pick([0.5, 1, 1, 1.5, 2]);
    }
  }

  padVoice(t, freq, th) {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = th.cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 3);
    g.gain.setValueAtTime(0.05, t + 7);
    g.gain.linearRampToValueAtTime(0, t + 10);
    filter.connect(g).connect(this.music);
    for (const detune of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = th.wave;
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(filter);
      o.start(t);
      o.stop(t + 10.1);
    }
  }

  pluck(t, freq, th) {
    this.tone(t, freq, 1.6, { type: th.wave === 'sawtooth' ? 'sine' : th.wave, gain: 0.12, bus: this.music });
  }

  // ── Synthesis helpers ──────────────────────────────────────────────────

  tone(t, freq, dur, { type = 'sine', gain = 0.2, freqEnd, attack = 0.01, bus = this.sfx } = {}) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(t, dur, { type = 'lowpass', freq = 1000, freqEnd, q = 1, gain = 0.3, attack = 0.01 } = {}) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t, rand(0, 1));
    src.stop(t + dur + 0.05);
  }

  boom(t, size = 1) {
    this.tone(t, 90, 1.4 * size, { gain: 0.9 * size, freqEnd: 28 });
    this.noise(t, 1.6 * size, { freq: 500, freqEnd: 60, gain: 0.7 * size });
  }

  wind(t, dur, gain = 0.3) {
    this.noise(t, dur, { type: 'bandpass', freq: 350, freqEnd: 900, q: 1.5, gain, attack: dur * 0.4 });
    this.noise(t + dur * 0.3, dur * 0.7, { type: 'bandpass', freq: 800, freqEnd: 250, q: 2, gain: gain * 0.7, attack: dur * 0.3 });
  }

  // ── Game sounds ────────────────────────────────────────────────────────

  click() {
    if (!this.ctx) return;
    this.tone(this.now, 880, 0.08, { type: 'triangle', gain: 0.06 });
  }

  generation() {
    if (!this.ctx) return;
    this.tone(this.now, midi(62), 0.5, { gain: 0.08 });
    this.tone(this.now + 0.12, midi(69), 0.6, { gain: 0.07 });
  }

  evolve() {
    if (!this.ctx) return;
    [72, 76, 79, 84].forEach((n, i) => this.tone(this.now + i * 0.07, midi(n), 0.9, { type: 'triangle', gain: 0.09 }));
    this.noise(this.now, 0.6, { type: 'highpass', freq: 4000, gain: 0.04 });
  }

  /** Disaster soundscapes, timed to the matching visuals in world.playEvent. */
  extinction(id) {
    if (!this.ctx) return;
    const t = this.now;
    this.duck(0.05, 0.8);
    // Ominous gong to open every catastrophe.
    this.tone(t, 55, 4, { gain: 0.35 });
    this.tone(t, 82.4, 3.5, { gain: 0.2 });
    switch (id) {
      case 'greatOxidation':
        for (let i = 0; i < 45; i++) {
          const f = rand(300, 900);
          this.tone(t + rand(0.2, 3.4), f, 0.14, { gain: 0.1, freqEnd: f * 2.4 });
        }
        this.noise(t, 3.5, { type: 'highpass', freq: 3000, gain: 0.05, attack: 1 });
        break;
      case 'snowball':
        this.wind(t, 4, 0.35);
        for (let i = 0; i < 9; i++) this.tone(t + 0.4 + i * 0.35, midi(pick([84, 86, 88, 91, 93, 96])), 2, { gain: 0.06 });
        break;
      case 'oceanAnoxia':
        for (const n of [33, 33.4, 40]) this.tone(t, midi(n), 4, { type: 'sawtooth', gain: 0.08, attack: 1.5 });
        for (let i = 0; i < 6; i++) this.noise(t + rand(0.3, 3), 0.5, { freq: 180, gain: 0.35, attack: 0.1 });
        break;
      case 'greatDying':
        this.noise(t, 4, { freq: 120, gain: 0.6, attack: 1 });
        [0.3, 1.2, 2.4].forEach((d, i) => this.boom(t + d, 0.6 + i * 0.2));
        break;
      case 'meteor':
        // Whoosh in, impact at 1.6s (matches the meteor animation), then a long rumble.
        this.noise(t, 1.6, { type: 'bandpass', freq: 2500, freqEnd: 200, q: 2, gain: 0.5, attack: 1.4 });
        this.boom(t + 1.6, 1.4);
        this.noise(t + 1.8, 2.6, { freq: 90, gain: 0.5, attack: 0.3 });
        break;
      case 'iceAge':
        this.wind(t, 4, 0.3);
        for (let i = 0; i < 6; i++) {
          const c = t + rand(0.5, 3.4);
          this.noise(c, 0.06, { type: 'highpass', freq: 1800, gain: 0.45 });
          this.tone(c, 140, 0.35, { type: 'sawtooth', gain: 0.05, freqEnd: 70 });
        }
        break;
    }
  }

  discover() {
    if (!this.ctx) return;
    [79, 86].forEach((n, i) => this.tone(this.now + i * 0.1, midi(n), 0.9, { gain: 0.07 }));
  }

  survived() {
    if (!this.ctx) return;
    [67, 72, 79].forEach((n, i) => this.tone(this.now + i * 0.15, midi(n), 1.2, { type: 'triangle', gain: 0.12 }));
  }

  wipedOut() {
    if (!this.ctx) return;
    this.boom(this.now, 0.6);
  }

  win() {
    if (!this.ctx) return;
    const t = this.now;
    this.duck(0.15, 0.3);
    [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => this.tone(t + i * 0.11, midi(n), 0.8, { type: 'triangle', gain: 0.14 }));
    for (const n of [48, 60, 64, 67, 72]) this.tone(t + 0.85, midi(n), 3.5, { type: 'triangle', gain: 0.1, attack: 0.05 });
    this.noise(t + 0.85, 2.5, { type: 'highpass', freq: 5000, gain: 0.05, attack: 0.3 });
    setTimeout(() => this.duck(1, 3), 4000);
  }

  lose() {
    if (!this.ctx) return;
    const t = this.now;
    this.duck(0, 0.5);
    [69, 65, 62, 57].forEach((n, i) => this.tone(t + i * 0.55, midi(n), 1.4, { type: 'triangle', gain: 0.14 }));
    this.tone(t + 2.2, midi(33), 4, { gain: 0.3, attack: 0.5 });
  }
}
