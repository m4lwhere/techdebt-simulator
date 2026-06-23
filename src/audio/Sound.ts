/**
 * Procedural sound — zero asset files. Everything is synthesized with the Web
 * Audio API on the fly: oscillator "blips" and filtered noise bursts, routed
 * through a master gain + compressor so overlapping chaos never clips.
 *
 * Mobile browsers require an AudioContext to start inside a user gesture, so
 * unlock() is called on the first pointerdown (see main.ts).
 */
class SoundManager {
  private ctx?: AudioContext;
  private master?: GainNode;
  private noiseBuf?: AudioBuffer;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem('tds_muted') === '1';
    } catch {
      this.muted = false;
    }
  }

  /** Create/resume the audio graph. Safe to call on every gesture. */
  unlock() {
    if (!this.ctx) {
      const AC: typeof AudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();

      const comp = this.ctx.createDynamicsCompressor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.85;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);

      // One second of white noise, reused for every burst.
      const len = Math.floor(this.ctx.sampleRate);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem('tds_muted', m ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (this.master) this.master.gain.value = m ? 0 : 0.85;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // --- primitives ----------------------------------------------------------

  private blip(
    freq: number,
    freqEnd: number,
    dur: number,
    type: OscillatorType = 'square',
    vol = 0.25,
    delay = 0,
  ) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  private noise(
    dur: number,
    vol = 0.3,
    filterType: BiquadFilterType = 'lowpass',
    f0 = 1400,
    f1 = 200,
    delay = 0,
  ) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(f0, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.03);
  }

  private arp(notes: number[], step: number, dur: number, type: OscillatorType, vol: number) {
    notes.forEach((f, i) => this.blip(f, f, dur, type, vol, i * step));
  }

  // --- game events ---------------------------------------------------------

  squash() {
    const f = 560 + Math.random() * 240;
    this.blip(f, f * 1.7, 0.09, 'square', 0.2);
  }

  ship() {
    this.blip(180, 520, 0.14, 'sawtooth', 0.26);
    this.noise(0.05, 0.12, 'highpass', 2200, 4000);
  }

  pay() {
    this.blip(540, 300, 0.16, 'sine', 0.2);
  }

  incident() {
    this.noise(0.4, 0.4, 'lowpass', 1800, 120);
    this.blip(180, 48, 0.4, 'sawtooth', 0.3);
  }

  powerup() {
    this.arp([523, 659, 784, 1047], 0.05, 0.08, 'triangle', 0.22);
  }

  tick() {
    this.blip(1300, 1300, 0.03, 'square', 0.11);
  }

  spinWin() {
    this.arp([523, 659, 784, 1047, 1319], 0.09, 0.12, 'square', 0.26);
  }

  spinLose() {
    this.blip(170, 80, 0.3, 'sawtooth', 0.3);
    this.blip(120, 55, 0.35, 'sawtooth', 0.26, 0.16);
    this.noise(0.4, 0.22, 'lowpass', 800, 70, 0.02);
  }

  bossHit() {
    this.noise(0.06, 0.2, 'highpass', 1600, 3200);
    this.blip(260, 170, 0.07, 'square', 0.18);
  }

  bossAttack() {
    this.blip(110, 88, 0.25, 'sawtooth', 0.24);
    this.noise(0.3, 0.18, 'lowpass', 420, 80);
  }

  bossDefeat() {
    this.noise(0.5, 0.4, 'lowpass', 2200, 80);
    this.arp([392, 523, 659, 784, 1047], 0.08, 0.13, 'square', 0.26);
  }

  promote() {
    this.arp([523, 659, 784, 1047, 1319], 0.1, 0.14, 'square', 0.27);
  }

  victory() {
    this.arp([523, 659, 784, 1047], 0.12, 0.16, 'square', 0.28);
    this.arp([659, 784, 988, 1319], 0.12, 0.18, 'triangle', 0.24);
  }

  gameOver() {
    // Descending sad-trombone-ish slide.
    this.blip(392, 360, 0.3, 'sawtooth', 0.26);
    this.blip(330, 300, 0.32, 'sawtooth', 0.26, 0.3);
    this.blip(262, 200, 0.55, 'sawtooth', 0.26, 0.62);
  }

  start() {
    this.blip(220, 880, 0.22, 'sawtooth', 0.24);
    this.noise(0.18, 0.12, 'bandpass', 800, 3000);
  }
}

export const sound = new SoundManager();
