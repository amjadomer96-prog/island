// The island's sounds, made on the spot so the app ships no sound files.

let ctx: AudioContext | null = null;
const audio = () => {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
};

/** One struck note: a sine with a few quieter, faster-fading overtones, like tapping glass. */
function strike(c: AudioContext, at: number, freq: number, level: number) {
  const out = c.createGain();
  out.gain.value = level;
  out.connect(c.destination);
  [[1, 1, 1.1], [2.76, 0.28, 0.45], [5.4, 0.08, 0.2]].forEach(([ratio, gain, decay]) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.value = freq * ratio;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + decay + 0.05);
  });
}

let lastNotice = 0;
/** A light two-note glass tap for a new notification. A burst of them plays once. */
export function noticeSound() {
  if (Date.now() - lastNotice < 1200) return;
  lastNotice = Date.now();
  try {
    const c = audio(), t = c.currentTime + 0.01;
    strike(c, t, 1318.5, 0.16);       // E6
    strike(c, t + 0.085, 1975.5, 0.1); // B6, softer
  } catch { /* no audio device */ }
}

/** A soft two-note chime when a timer ends. */
export function chime() {
  try {
    const c = audio();
    [880, 1318.5].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = f;
      const t = c.currentTime + i * 0.18;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 1);
    });
  } catch { /* no audio device */ }
}
