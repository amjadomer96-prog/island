// Claude Code status through its HTTP hooks: each hook event is POSTed to a tiny local
// server, and the island shows whether each session is working, needs you, or is done.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { app } from "electron";
import type { ClaudeSession, ClaudeState } from "../shared/types";

export const HOOK_PORT = 47831;
const HOOK_PATH = "/island-hook";
const EVENTS = ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "PostToolUseFailure", "PermissionRequest", "Notification", "Stop", "StopFailure", "SessionEnd"];
const SETTINGS = join(homedir(), ".claude", "settings.json");

/** A per-install secret, so other local programs can't fake Claude's status. */
function token() {
  const file = join(app.getPath("userData"), "hook-token");
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  const t = randomBytes(24).toString("hex");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, t);
  return t;
}

const isOurs = (h: { url?: string }) => typeof h?.url === "string" && h.url.includes(`:${HOOK_PORT}${HOOK_PATH}`);

function readSettings(): Record<string, any> {
  return existsSync(SETTINGS) ? JSON.parse(readFileSync(SETTINGS, "utf8")) : {};
}

export function isConnected() {
  try {
    const hooks = readSettings().hooks ?? {};
    return EVENTS.every((e) => (hooks[e] ?? []).some((g: any) => (g.hooks ?? []).some(isOurs)));
  } catch {
    return false;
  }
}

/** Add Island's hooks to ~/.claude/settings.json, next to any hooks already there (a backup is kept). */
export function connectClaude(): { ok: boolean; error?: string } {
  try {
    const settings = readSettings();
    if (existsSync(SETTINGS)) copyFileSync(SETTINGS, SETTINGS + ".island-backup");
    const hooks = (settings.hooks ??= {});
    const entry = { type: "http", url: `http://127.0.0.1:${HOOK_PORT}${HOOK_PATH}`, timeout: 2, headers: { "X-Island-Token": token() } };
    for (const e of EVENTS) {
      // Drop any earlier Island entry, then add the current one; other tools' hooks stay as they are.
      const groups = (hooks[e] ?? []).filter((g: any) => !(g.hooks ?? []).some(isOurs));
      hooks[e] = [...groups, { hooks: [entry] }];
    }
    mkdirSync(dirname(SETTINGS), { recursive: true });
    writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + "\n");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export function startClaude(onChange: (state: ClaudeState) => void) {
  const secret = token();
  const sessions = new Map<string, ClaudeSession>();
  const emit = () => {
    // Most recent first; finished sessions fall away after 10 minutes.
    const cutoff = Date.now() - 10 * 60_000;
    for (const [id, s] of sessions) if (s.status === "done" && s.updated < cutoff) sessions.delete(id);
    onChange({ connected: isConnected(), sessions: [...sessions.values()].sort((a, b) => b.updated - a.updated) });
  };

  const apply = (e: Record<string, any>) => {
    const id = String(e.session_id ?? "default");
    const prev = sessions.get(id);
    const base: ClaudeSession = prev ?? { id, project: e.cwd ? basename(e.cwd) : "Claude Code", status: "idle", updated: Date.now() };
    const next: ClaudeSession = { ...base, project: e.cwd ? basename(e.cwd) : base.project, updated: Date.now() };
    switch (e.hook_event_name) {
      case "SessionStart": next.status = "idle"; break;
      case "UserPromptSubmit": next.status = "working"; next.tool = undefined; next.message = undefined; break;
      case "PreToolUse": next.status = "working"; next.tool = e.tool_name; next.message = undefined; break;
      case "PostToolUse": case "PostToolUseFailure": next.status = "working"; break;
      case "PermissionRequest": next.status = "waiting"; next.message = e.tool_name ? `Allow ${e.tool_name}?` : "Needs your permission"; break;
      case "Notification": next.status = "waiting"; next.message = e.message ?? "Needs your input"; break;
      case "Stop": next.status = "done"; next.tool = undefined; next.message = undefined; break;
      case "StopFailure": next.status = "error"; next.message = e.error ?? "Stopped with an error"; break;
      case "SessionEnd": sessions.delete(id); emit(); return;
      default: return;
    }
    sessions.set(id, next);
    emit();
  };

  const server = createServer((req, res) => {
    if (req.method !== "POST" || !req.url?.startsWith(HOOK_PATH) || req.headers["x-island-token"] !== secret) {
      res.writeHead(404).end();
      return;
    }
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", () => {
      // Answer at once with an empty decision: Island only watches, it never blocks Claude.
      res.writeHead(200, { "Content-Type": "application/json" }).end("{}");
      try { apply(JSON.parse(body)); } catch { /* ignore malformed events */ }
    });
  });
  server.on("error", () => { /* port taken: another Island is running; the single-instance lock normally prevents this */ });
  server.listen(HOOK_PORT, "127.0.0.1");
  const sweep = setInterval(emit, 60_000);
  emit();

  return { refresh: emit, stop: () => { clearInterval(sweep); server.close(); } };
}
