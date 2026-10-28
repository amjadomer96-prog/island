// Ask Claude from the island, the way Siri lives in the Mac's: a one-off question to Claude Code
// with no tools (it can only answer, never touch the computer), streamed into the island.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { app } from "electron";

/** Claude Code's command: on the PATH, or the copy inside the VS Code / Cursor extension. */
export function findClaude(): string | null {
  for (const dir of (process.env.PATH ?? "").split(";")) {
    for (const name of ["claude.exe", "claude.cmd"]) if (dir && existsSync(join(dir, name))) return join(dir, name);
  }
  for (const root of [".vscode", ".vscode-insiders", ".cursor", ".windsurf"]) {
    const ext = join(homedir(), root, "extensions");
    if (!existsSync(ext)) continue;
    const found = readdirSync(ext).filter((d) => d.startsWith("anthropic.claude-code-")).sort().reverse()
      .map((d) => join(ext, d, "resources", "native-binary", "claude.exe")).find(existsSync);
    if (found) return found;
  }
  return null;
}

export function startAsk(send: (event: { id: number; text?: string; done?: boolean; error?: string }) => void) {
  let child: ChildProcessWithoutNullStreams | null = null;
  const cwd = join(app.getPath("userData"), "ask");
  mkdirSync(cwd, { recursive: true });

  const cancel = () => { child?.kill(); child = null; };

  return {
    ask(id: number, question: string) {
      cancel();
      const bin = findClaude();
      if (!bin) { send({ id, error: "Claude Code isn't installed. Install it from claude.com/code, then try again." }); return; }
      // No tools, and none of your settings files: no hooks fire, nothing on the PC is touched,
      // and the answer starts in ~3 s instead of ~10 s.
      child = spawn(bin, ["-p", question, "--tools", "", "--setting-sources", "", "--output-format", "stream-json", "--include-partial-messages", "--verbose"], { cwd, windowsHide: true });
      let buf = "";
      let any = false;
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        buf += chunk;
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          try {
            const m = JSON.parse(line);
            const delta = m.event?.delta?.text;
            if (delta) { any = true; send({ id, text: delta }); }
            if (m.type === "result") send({ id, done: true, error: m.is_error ? String(m.result ?? "Claude couldn't answer that.") : undefined });
          } catch { /* not JSON */ }
        }
      });
      child.on("exit", (code) => {
        if (code !== 0 && !any) send({ id, done: true, error: "Claude didn't answer. Check that you're signed in to Claude Code." });
        child = null;
      });
    },
    cancel,
  };
}
