import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import type { HudState } from "../../../shared/types";
import { Speaker, Sun } from "./icons";

const api = window.island;

/** Volume and (on laptops) brightness, as Control Center-style fill sliders. */
export function Controls({ hud }: { hud: HudState }) {
  const vol = hud.volume;
  return (
    <div className="sliders">
      {vol && (
        <Slider
          label="Volume"
          value={vol.muted ? 0 : vol.level}
          onChange={(v) => api.hud({ kind: "volume", level: v })}
          icon={<Speaker size={16} muted={vol.muted} level={vol.level} />}
          onIconTap={() => api.hud({ kind: "mute", muted: !vol.muted })}
          iconLabel={vol.muted ? "Unmute" : "Mute"}
        />
      )}
      {hud.brightness !== null && (
        <Slider label="Brightness" value={hud.brightness / 100} onChange={(v) => api.hud({ kind: "brightness", level: v * 100 })} icon={<Sun size={16} />} />
      )}
    </div>
  );
}

/** Past the ends the bar gives a little, with more resistance the further you pull (Apple's rubber band). */
const rubberband = (over: number, size: number, c = 0.55) => (over * size * c) / (size + c * Math.abs(over));

const ICON_ZONE = 36; // px at the left of the bar where a tap toggles mute instead of setting the level

/**
 * A thick fill slider that follows the pointer exactly. While you drag (and briefly after), it
 * shows your value rather than the system's, which reports back a little later.
 */
function Slider({ label, value, onChange, icon, onIconTap, iconLabel }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  icon: ReactNode;
  onIconTap?: () => void;
  iconLabel?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [local, setLocal] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  // The bar's untransformed box, taken at press time: the stretch below must not feed back into it.
  const start = useRef<{ x: number; inIcon: boolean; moved: boolean; box: DOMRect } | null>(null);
  const [stretch, setStretch] = useState(0); // px past an end, already rubber-banded; + right, - left
  const settle = useRef<number | undefined>(undefined);
  useEffect(() => () => { window.clearTimeout(settle.current); api.hold(false); }, []);

  const shown = local ?? value;
  const at = (clientX: number, box = start.current?.box ?? track.current!.getBoundingClientRect()) =>
    Math.max(0, Math.min(1, (clientX - box.left) / box.width));
  const set = (v: number) => { setLocal(v); onChange(v); };
  // After you let go, hold your value until the system has caught up, then follow it again.
  const release = () => { window.clearTimeout(settle.current); settle.current = window.setTimeout(() => setLocal(null), 700); };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const box = track.current!.getBoundingClientRect();
    const inIcon = !!onIconTap && e.clientX - box.left < ICON_ZONE;
    start.current = { x: e.clientX, inIcon, moved: false, box };
    window.clearTimeout(settle.current);
    setDragging(true);
    api.hold(true);
    if (!inIcon) set(at(e.clientX)); // tap anywhere else jumps there, like Control Center
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    if (!s.moved && Math.abs(e.clientX - s.x) < 3) return;
    s.moved = true;
    api.hold(true); // renew: the notch stays open while the drag continues
    set(at(e.clientX));
    const over = e.clientX < s.box.left ? e.clientX - s.box.left : e.clientX > s.box.right ? e.clientX - s.box.right : 0;
    setStretch(over ? rubberband(over, s.box.width) : 0);
  };
  const up = () => {
    const s = start.current;
    start.current = null;
    setDragging(false);
    setStretch(0); // springs back (CSS transition on the bar)
    api.hold(false);
    if (s?.inIcon && !s.moved) onIconTap?.();
    release();
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key.toLowerCase() === "m" && onIconTap) { onIconTap(); return; }
    const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.05 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.05 : 0;
    if (!step) return;
    e.preventDefault();
    set(Math.max(0, Math.min(1, shown + step)));
    release();
  };

  // The icon sits over the fill once the fill reaches it, so it turns dark there, as on the Mac.
  const dark = shown > 0.13;
  return (
    <div
      ref={track}
      className={`fill-slider${dragging ? " fill-slider--drag" : ""}`}
      style={{ transform: stretch ? `scaleX(${1 + Math.abs(stretch) / (start.current?.box.width ?? 200)})` : undefined, transformOrigin: stretch > 0 ? "left center" : "right center" }}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown * 100)}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={() => { if (start.current) up(); }}
      onKeyDown={key}
    >
      <span className="fill-slider__fill" style={{ transform: `scaleX(${shown})` }} />
      <span className={`fill-slider__icon${dark ? " fill-slider__icon--dark" : ""}`} title={iconLabel} aria-hidden>{icon}</span>
    </div>
  );
}
