import { useCallback, useEffect, useState } from "react";

/** A countdown that survives a restart: it's stored as the moment it ends, not a running clock. */
export interface TimerState {
  duration: number;
  /** When it ends while running; null while paused or stopped. */
  endsAt: number | null;
  /** Time left while paused. */
  left: number;
}

const KEY = "island.timer";
const IDLE: TimerState = { duration: 0, endsAt: null, left: 0 };

function load(): TimerState {
  try { return { ...IDLE, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return IDLE; }
}

/** A soft two-note chime, made on the spot so the app ships no sound files. */
export function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1318.5].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 1);
    });
    setTimeout(() => ctx.close(), 1600);
  } catch { /* no audio device */ }
}

export function useTimer(onDone: () => void) {
  const [state, setState] = useState<TimerState>(load);
  const [, tick] = useState(0);
  const save = (s: TimerState) => { setState(s); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage off */ } };

  const running = state.endsAt !== null;
  const left = running ? Math.max(0, state.endsAt! - Date.now()) : state.left;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (Date.now() >= state.endsAt!) { save(IDLE); onDone(); } else tick((n) => n + 1);
    }, 250);
    return () => clearInterval(id);
  }, [running, state.endsAt, onDone]);

  return {
    duration: state.duration,
    left,
    running,
    active: running || state.left > 0,
    start: useCallback((ms: number) => save({ duration: ms, endsAt: Date.now() + ms, left: 0 }), []),
    pause: () => save({ ...state, endsAt: null, left }),
    resume: () => save({ ...state, endsAt: Date.now() + state.left, left: 0 }),
    reset: () => save(IDLE),
    add: (ms: number) => save(running ? { ...state, duration: state.duration + ms, endsAt: state.endsAt! + ms } : { ...state, duration: state.duration + ms, left: state.left + ms }),
  };
}
export type Timer = ReturnType<typeof useTimer>;
