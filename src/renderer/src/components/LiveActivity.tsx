import type { ClaudeSession, MediaState } from "../../../shared/types";
import { clock, STATUS_TEXT, time, usePosition } from "../lib";
import type { Timer } from "../timer";
import { Bars } from "./Bars";
import { Close, Next, Note, Pause, Play, Previous, Spark, Timer as TimerIcon } from "./icons";

const api = window.island;

/**
 * Now playing, laid out like macOS 27's Dynamic Island: art with title and artist, a small
 * waveform top right; elapsed, a thin progress bar and time left; then the three transport controls.
 */
export function MusicActivity({ media }: { media: MediaState }) {
  const position = usePosition(media);
  const progress = media.duration ? Math.min(1, position / media.duration) : 0;
  return (
    <div className="la la--music">
      <div className="la-music__head">
        {media.art ? <img className="la-music__art" src={media.art} alt="" /> : <span className="la-music__art la-music__art--empty"><Note size={22} /></span>}
        <div className="la-music__meta">
          <p className="la-music__title">{media.title}</p>
          <p className="la-music__artist">{media.artist || media.album || " "}</p>
        </div>
        <span className="la-music__wave"><Bars playing={media.playing} count={7} /></span>
      </div>
      {media.duration > 0 && (
        <div className="la-music__time">
          <span>{time(position)}</span>
          <div className="la-music__track"><div className="la-music__fill" style={{ transform: `scaleX(${progress})` }} /></div>
          <span>−{time(media.duration - position)}</span>
        </div>
      )}
      <div className="la-music__controls">
        <button type="button" aria-label="Previous" onClick={() => api.media("previous")}><Previous size={30} /></button>
        <button type="button" className="la-music__play" aria-label={media.playing ? "Pause" : "Play"} onClick={() => api.media("toggle")}>
          {media.playing ? <Pause size={34} /> : <Play size={34} />}
        </button>
        <button type="button" aria-label="Next" onClick={() => api.media("next")}><Next size={30} /></button>
      </div>
    </div>
  );
}

/** A running timer, like the iPhone's: label left, big orange countdown right, pause and cancel. */
export function TimerActivity({ timer }: { timer: Timer }) {
  return (
    <div className="la la--timer">
      <div className="la-timer__buttons">
        <button type="button" className="la-timer__btn" aria-label={timer.running ? "Pause" : "Resume"} onClick={timer.running ? timer.pause : timer.resume}>
          {timer.running ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button type="button" className="la-timer__btn la-timer__btn--x" aria-label="Cancel timer" onClick={timer.reset}><Close size={14} /></button>
      </div>
      <div className="la-timer__right">
        <span className="la-timer__label"><TimerIcon size={13} /> Timer</span>
        <span className="la-timer__time">{clock(timer.left)}</span>
      </div>
    </div>
  );
}

/** The busiest Claude Code session: project, what it's doing, and what it needs from you. */
export function ClaudeActivity({ session }: { session: ClaudeSession }) {
  const detail = session.status === "working" && session.tool ? session.tool : session.message;
  return (
    <div className="la la--claude">
      <span className="la-claude__icon"><Spark size={22} className={`spark${session.status === "working" ? " spark--working" : ""}`} /></span>
      <div className="la-claude__meta">
        <p className="la-claude__project">{session.project}</p>
        <p className={`la-claude__status la-claude__status--${session.status}`}>{STATUS_TEXT[session.status]}{detail ? ` · ${detail}` : ""}</p>
      </div>
    </div>
  );
}
