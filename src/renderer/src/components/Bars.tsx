// Each bar gets its own rhythm, so the wave never looks like a metronome.
const RHYTHM: [number, number][] = [[0.9, -0.45], [0.75, -0.1], [1.05, -0.6], [0.85, -0.3], [0.95, -0.75], [0.8, -0.2], [1.0, -0.5]];

/** Sound bars that move while music plays and rest when it pauses. `count` bars, 4 in the closed island. */
export const Bars = ({ playing, count = 4 }: { playing: boolean; count?: number }) => (
  <span className={`bars${playing ? "" : " bars--paused"}`} aria-hidden>
    {RHYTHM.slice(0, count).map(([d, delay], i) => (
      <span key={i} style={{ animationDuration: `${d}s`, animationDelay: `${delay}s` }} />
    ))}
  </span>
);
