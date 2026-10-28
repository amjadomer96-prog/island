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
