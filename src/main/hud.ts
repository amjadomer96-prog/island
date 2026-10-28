// Volume, brightness and battery from resources/hud.ps1, turned into "flashes" for the notch:
// a level that changed, the charger plugged in, the battery running low.
import type { HudCommand, HudFlash, HudState } from "../shared/types";
import { runHelper } from "./helper";

const LOW = [20, 10];

export function startHud(handlers: { onChange: (s: HudState) => void; onFlash: (f: HudFlash) => void }) {
  let state: HudState = { volume: null, brightness: null, battery: null };

  const helper = runHelper("hud.ps1", [], (msg) => {
    if (msg.type === "volume") {
      const next = { level: Number(msg.level) || 0, muted: !!msg.muted };
      const changed = state.volume && (state.volume.level !== next.level || state.volume.muted !== next.muted);
      state = { ...state, volume: next };
      if (changed) handlers.onFlash("volume");
    } else if (msg.type === "brightness") {
      const next = Number(msg.level);
      const changed = state.brightness !== null && state.brightness !== next;
      state = { ...state, brightness: next };
      if (changed) handlers.onFlash("brightness");
    } else if (msg.type === "battery") {
      const next = { present: !!msg.present, percent: Number(msg.percent) || 0, charging: !!msg.charging };
      const prev = state.battery;
      state = { ...state, battery: next };
      if (prev && next.present) {
        if (next.charging && !prev.charging) handlers.onFlash("charging");
        // Warn once on the way down through 20% and 10%, only while unplugged.
        else if (!next.charging && LOW.some((l) => prev.percent > l && next.percent <= l)) handlers.onFlash("low-battery");
      }
    } else return;
    handlers.onChange(state);
  });

  return {
    get: () => state,
    command(cmd: HudCommand) {
      if (cmd.kind === "volume" && Number.isFinite(cmd.level)) helper.send(`volume ${Math.max(0, Math.min(1, cmd.level)).toFixed(3)}`);
      else if (cmd.kind === "mute") helper.send(`mute ${cmd.muted ? 1 : 0}`);
      else if (cmd.kind === "brightness" && Number.isFinite(cmd.level)) helper.send(`brightness ${Math.round(Math.max(0, Math.min(100, cmd.level)))}`);
    },
    stop: helper.stop,
  };
}
