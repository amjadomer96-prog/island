import type { CSSProperties } from "react";
import type { HudState } from "../../../shared/types";
import { Speaker, Sun } from "./icons";

const api = window.island;

/** Volume and (on laptops) brightness sliders, like Control Center. */
export function Controls({ hud }: { hud: HudState }) {
  const vol = hud.volume;
  return (
    <div className="sliders">
      {vol && (
        <div className="slider">
          <button type="button" className="slider__icon" aria-label={vol.muted ? "Unmute" : "Mute"} onClick={() => api.hud({ kind: "mute", muted: !vol.muted })}>
            <Speaker muted={vol.muted} level={vol.level} />
          </button>
          <input type="range" min={0} max={100} value={Math.round(vol.level * 100)} aria-label="Volume"
            style={{ "--fill": `${vol.muted ? 0 : vol.level * 100}%` } as CSSProperties}
            onChange={(e) => api.hud({ kind: "volume", level: Number(e.target.value) / 100 })} />
        </div>
      )}
      {hud.brightness !== null && (
        <div className="slider">
          <span className="slider__icon"><Sun /></span>
          <input type="range" min={0} max={100} value={hud.brightness} aria-label="Brightness"
            style={{ "--fill": `${hud.brightness}%` } as CSSProperties}
            onChange={(e) => api.hud({ kind: "brightness", level: Number(e.target.value) })} />
        </div>
      )}
    </div>
  );
}
