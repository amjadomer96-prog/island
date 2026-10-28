import { useState } from "react";
import type { ClaudeState, MediaState } from "../../../shared/types";
import { Bars } from "./Bars";
import { appName, STATUS_TEXT, time, usePosition } from "../lib";
import { Next, Note, Pause, Play, Previous, Spark } from "./icons";

const api = window.island;

/** The open island: what's playing with its controls, then every Claude Code session. */
export function Expanded({ media, claude, accent, onConnect }: { media: MediaState | null; claude: ClaudeState; accent: string; onConnect: () => Promise<{ ok: boolean; error?: string }> }) {
  const position = usePosition(media);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setConnecting(true);
    const r = await onConnect();
    setConnecting(false);
    setError(r.ok ? null : r.error ?? "Could not update Claude Code settings");
  };

  return (
    <div className="expanded">
      {media ? (
        <>
          <div className="player">
            {media.art ? <img className="player__art" src={media.art} alt="" /> : <span className="player__art player__art--empty"><Note /></span>}
            <div className="player__meta">
              <p className="player__title">{media.title}</p>
              <p className="player__artist">{media.artist || media.album || " "}</p>
              <p className="player__app">{appName(media.app)}</p>
            </div>
            <Bars playing={media.playing} />
          </div>
          {media.duration > 0 && (
            <div className="progress">
              <span>{time(position)}</span>
              <div className="progress__track">
                <div className="progress__fill" style={{ transform: `scaleX(${Math.min(1, position / media.duration)})`, background: accent }} />
              </div>
              <span>-{time(media.duration - position)}</span>
            </div>
          )}
          <div className="controls">
            <button type="button" aria-label="Previous" onClick={() => api.media("previous")}><Previous /></button>
            <button type="button" aria-label={media.playing ? "Pause" : "Play"} onClick={() => api.media("toggle")}>{media.playing ? <Pause /> : <Play />}</button>
            <button type="button" aria-label="Next" onClick={() => api.media("next")}><Next /></button>
          </div>
        </>
      ) : (
        <p className="empty">Nothing playing</p>
      )}

      <div className="claude">
        {claude.sessions.length > 0 ? (
          claude.sessions.slice(0, 3).map((s) => (
            <div className="claude__row" key={s.id}>
              <Spark size={14} className={`spark${s.status === "working" ? " spark--working" : ""}`} />
              <span className="claude__project">{s.project}</span>
              <span className="claude__status" title={s.message}>
                {s.status === "working" && s.tool ? `${STATUS_TEXT.working} · ${s.tool}` : s.message && s.status === "waiting" ? s.message : STATUS_TEXT[s.status]}
              </span>
              <span className={`dot dot--${s.status}`} />
            </div>
          ))
        ) : (
          <div className="claude__row">
            <Spark size={14} className="spark" />
            <span className="claude__project">Claude Code</span>
            {claude.connected ? (
              <span className="claude__status">Waiting for a session</span>
            ) : (
              <button type="button" className="claude__connect" onClick={connect} disabled={connecting}>{connecting ? "Connecting…" : "Connect"}</button>
            )}
          </div>
        )}
        {error && <p className="claude__row" style={{ color: "var(--error)" }}>{error}</p>}
      </div>
    </div>
  );
}
