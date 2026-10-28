import type { MediaState } from "../../../shared/types";
import { appName, time, usePosition } from "../lib";
import { Bars } from "./Bars";
import { Next, Note, Pause, Play, Previous } from "./icons";

const api = window.island;

/** Now playing, with progress and controls. */
export function Player({ media, accent }: { media: MediaState | null; accent: string }) {
  const position = usePosition(media);
  if (!media) return <p className="empty">Nothing playing</p>;
  return (
    <div className="player-block">
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
    </div>
  );
}
