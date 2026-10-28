// Runs one of the PowerShell helpers in resources/, reads its JSON lines, and restarts it
// with back-off if it ever exits, so a broken helper can't spin the CPU.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { join } from "node:path";
import { app } from "electron";

function scriptPath(name: string) {
  return app.isPackaged ? join(process.resourcesPath, "resources", name) : join(app.getAppPath(), "resources", name);
}

export function runHelper(script: string, args: string[], onMessage: (msg: Record<string, any>) => void) {
  let child: ChildProcessWithoutNullStreams | null = null;
  let retry = 1000;
  let stopped = false;

  const launch = () => {
    if (stopped) return;
    child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath(script), ...args], { windowsHide: true });
    let buf = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); // trim() also drops the byte-order mark PowerShell may send first
        buf = buf.slice(i + 1);
        if (!line) continue;
        try {
          onMessage(JSON.parse(line));
          retry = 1000; // a healthy helper resets the back-off
        } catch { /* ignore a malformed line */ }
      }
    });
    child.on("exit", () => {
      child = null;
      if (stopped) return;
      setTimeout(launch, retry);
      retry = Math.min(retry * 2, 30_000);
    });
  };
  launch();

  return {
    send(line: string) { child?.stdin.write(line + "\n"); },
    stop() { stopped = true; child?.stdin.end(); child?.kill(); },
  };
}
