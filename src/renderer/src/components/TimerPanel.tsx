import type { Timer } from "../timer";
import { clock } from "../lib";
import { Pause, Play } from "./icons";

const PRESETS = [1, 5, 10, 15, 25, 45];

/** A big countdown with presets, start/pause and reset. */
export function TimerPanel({ timer }: { timer: Timer }) {
  const progress = timer.duration ? 1 - timer.left / timer.duration : 0;
  return (
    <div className="timer">
      <div className="timer__face">
        <Ring progress={timer.active ? progress : 0} size={88} />
        <span className="timer__time">{clock(timer.active ? timer.left : 0)}</span>
      </div>
      <div className="timer__side">
        {timer.active ? (
          <div className="timer__buttons">
            <button type="button" className="round" aria-label={timer.running ? "Pause" : "Resume"} onClick={timer.running ? timer.pause : timer.resume}>
              {timer.running ? <Pause size={22} /> : <Play size={22} />}
            </button>
            <button type="button" className="pill-btn pill-btn--dark" onClick={() => timer.add(60_000)}>+1 min</button>
            <button type="button" className="pill-btn pill-btn--dark" onClick={timer.reset}>Cancel</button>
          </div>
        ) : (
          <div className="timer__presets">
            {PRESETS.map((m) => (
              <button type="button" key={m} className="preset" onClick={() => timer.start(m * 60_000)}>
                {m}<span>min</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Progress ring, Apple-orange like the iPhone's timer. */
export function Ring({ progress, size = 20, stroke }: { progress: number; size?: number; stroke?: number }) {
  const w = stroke ?? Math.max(2.5, size / 11);
  const r = (size - w) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,159,10,0.25)" strokeWidth={w} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--timer)" strokeWidth={w} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * progress} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}
