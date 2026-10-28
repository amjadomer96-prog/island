// Bridge to resources/media.ps1, which reads Windows' system media controls.
// Any player that shows up in the Windows volume flyout works, with no sign-in.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { join } from "node:path";
import { app } from "electron";
import type { MediaCommand, MediaState } from "../shared/types";

const EMPTY: MediaState = { playing: false, title: null, position: 0, duration: 0, at: 0, art: null };

function scriptPath() {
  return app.isPackaged ? join(process.resourcesPath, "resources", "media.ps1") : join(app.getAppPath(), "resources", "media.ps1");
}

export function startMedia(onChange: (state: MediaState) => void) {
  let child: ChildProcessWithoutNullStreams | null = null;
  let state: MediaState = EMPTY;
  const arts = new Map<string, string | null>();
  let retry = 1000;
  let stopped = false;

  const handle = (line: string) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(line); } catch { return; }
    if (msg.type === "art") {
      arts.set(String(msg.key), (msg.art as string | null) ?? null);
      if (arts.size > 20) arts.delete(arts.keys().next().value!);
      return;
    }
    if (msg.type !== "state") return;
    retry = 1000; // a healthy helper resets the back-off
    state = msg.title
      ? {
          playing: !!msg.playing,
          title: String(msg.title),
          artist: (msg.artist as string) || undefined,
          album: (msg.album as string) || undefined,
          app: (msg.app as string) || undefined,
          position: Number(msg.position) || 0,
          duration: Number(msg.duration) || 0,
          at: Date.now(),
          art: arts.get(String(msg.key)) ?? null,
        }
      : { ...EMPTY, at: Date.now() };
    onChange(state);
  };

  const launch = () => {
    if (stopped) return;
    child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath()], { windowsHide: true });
    let buf = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); // trim() also drops the byte-order mark PowerShell may send first
        buf = buf.slice(i + 1);
        if (line) handle(line);
      }
    });
    child.on("exit", () => {
      child = null;
      if (stopped) return;
      // Restart with back-off, so a broken helper can't spin the CPU.
      setTimeout(launch, retry);
      retry = Math.min(retry * 2, 30_000);
    });
  };
  launch();

  return {
    get: () => state,
    command(cmd: MediaCommand) {
      child?.stdin.write(cmd + "\n");
      // Show the change right away; the helper confirms it within a second.
      if (cmd === "toggle" && state.title) {
        state = { ...state, playing: !state.playing, position: state.position + (state.playing ? Date.now() - state.at : 0), at: Date.now() };
        onChange(state);
      }
    },
    stop() {
      stopped = true;
      child?.stdin.end();
      child?.kill();
    },
  };
}
