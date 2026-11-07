// Tiny synthesized WebAudio SFX (no asset files → works in single-file build)
/* eslint-disable @typescript-eslint/no-explicit-any */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(master!);
    o.start();
    o.stop(c.currentTime + dur);
  } catch {
    /* audio unavailable */
  }
}

function noise(dur: number, vol: number, freq: number) {
  try {
    const c = ac();
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = vol;
    s.connect(f).connect(g).connect(master!);
    s.start();
  } catch {
    /* audio unavailable */
  }
}

export const sfx = {
  unlock: () => {
    try {
      ac();
    } catch {
      /* noop */
    }
  },
  shot: (heavy: boolean) => {
    noise(heavy ? 0.18 : 0.07, heavy ? 0.9 : 0.5, heavy ? 1800 : 3200);
    tone(heavy ? 140 : 220, heavy ? 0.12 : 0.05, 'square', 0.12, heavy ? 60 : 110);
  },
  hit: () => tone(1400, 0.04, 'triangle', 0.15),
  crit: () => {
    tone(1800, 0.05, 'triangle', 0.2);
    tone(2600, 0.08, 'sine', 0.15);
  },
  kill: () => {
    tone(520, 0.08, 'sine', 0.2, 880);
    noise(0.25, 0.3, 900);
  },
  hurt: () => tone(160, 0.15, 'sawtooth', 0.18, 90),
  reload: () => {
    tone(600, 0.05, 'square', 0.08);
    setTimeout(() => tone(900, 0.05, 'square', 0.08), 140);
  },
  boost: () => tone(300, 0.5, 'sine', 0.25, 1200),
  wave: () => {
    tone(440, 0.15, 'triangle', 0.2);
    setTimeout(() => tone(660, 0.2, 'triangle', 0.2), 160);
  },
  jump: () => tone(200, 0.08, 'sine', 0.12, 350),
  empty: () => tone(1200, 0.03, 'square', 0.06),
};
