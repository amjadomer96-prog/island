// Volume, brightness and battery from resources/hud.ps1, turned into "flashes" for the notch:
// a level that changed, the charger plugged in, the battery running low.
import type { HudCommand, HudFlash, HudState } from "../shared/types";
import { runHelper } from "./helper";

const LOW = [20, 10];

export function startHud(handlers: { onChange: (s: HudState) => void; onFlash: (f: HudFlash) => void }) {
  let state: HudState = { volume: null, brightness: null, battery: null, output: null, focus: null };

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
    } else if (msg.type === "output") {
      const next = { id: String(msg.id), name: String(msg.name ?? "") };
      const changed = state.output && state.output.id !== next.id;
      state = { ...state, output: next };
      if (changed) handlers.onFlash("output"); // headphones connected, or sound moved to another device
    } else if (msg.type === "focus") {
      const next = Number(msg.profile);
      const changed = state.focus !== null && (state.focus === 0) !== (next === 0);
      state = { ...state, focus: next };
      if (changed) handlers.onFlash("focus");
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

  // A dragged slider sends a value every frame; Windows only needs the latest. Each kind is
  // coalesced and sent at a steady pace (brightness goes through slower WMI calls).
  const pending: Partial<Record<"volume" | "brightness", string>> = {};
  const timers: Partial<Record<"volume" | "brightness", NodeJS.Timeout>> = {};
  const PACE = { volume: 40, brightness: 120 };
  const queue = (kind: "volume" | "brightness", line: string) => {
    pending[kind] = line;
    if (timers[kind]) return;
    const flush = () => {
      const next = pending[kind];
      if (!next) { timers[kind] = undefined; return; }
      pending[kind] = undefined;
      helper.send(next);
      timers[kind] = setTimeout(flush, PACE[kind]);
    };
    flush();
  };

  return {
    get: () => state,
    command(cmd: HudCommand) {
      if (cmd.kind === "volume" && Number.isFinite(cmd.level)) queue("volume", `volume ${Math.max(0, Math.min(1, cmd.level)).toFixed(3)}`);
      else if (cmd.kind === "mute") helper.send(`mute ${cmd.muted ? 1 : 0}`);
      else if (cmd.kind === "brightness" && Number.isFinite(cmd.level)) queue("brightness", `brightness ${Math.round(Math.max(0, Math.min(100, cmd.level)))}`);
    },
    stop: helper.stop,
  };
}
