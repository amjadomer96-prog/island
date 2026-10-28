// Open apps and Windows notifications, from resources/system.ps1.
import type { Notice, OpenApp, SystemCommand, SystemState } from "../shared/types";
import { runHelper } from "./helper";

export function startSystem(handlers: { onChange: (s: SystemState) => void; onNotice: (n: Notice) => void; onOpened: (a: OpenApp) => void }) {
  let state: SystemState = { apps: [], notifications: [], access: "Unspecified" };
  let known: Set<number> | null = null; // windows seen so far; null until the first list

  const helper = runHelper("system.ps1", ["-SkipPid", String(process.pid)], (msg) => {
    if (msg.type === "apps") {
      const apps: OpenApp[] = (msg.apps ?? []).map((a: any) => ({ hwnd: Number(a.hwnd), title: String(a.title ?? ""), name: String(a.name ?? ""), exe: a.exe ?? undefined, icon: a.icon ?? null, active: !!a.active }));
      // A window that wasn't there before is an app you just opened (the first list is just what's already open).
      if (known) for (const a of apps) if (!known.has(a.hwnd)) handlers.onOpened(a);
      known = new Set(apps.map((a) => a.hwnd));
      state = { ...state, apps };
    } else if (msg.type === "notifications") {
      state = { ...state, access: String(msg.access ?? "Unspecified"), notifications: (msg.items ?? []).map(withIcon) };
    } else if (msg.type === "notification") {
      handlers.onNotice(withIcon(msg.item));
      return;
    } else return;
    handlers.onChange(state);
  });

  // Windows gives no logo for some apps (Chrome, for one); borrow the icon of that app's open window.
  const withIcon = (raw: any): Notice => {
    const n = toNotice(raw);
    if (n.icon) return n;
    const app = state.apps.find((a) => a.icon && a.name.toLowerCase() === n.app.toLowerCase());
    return app ? { ...n, icon: app.icon } : n;
  };

  return {
    get: () => state,
    command(cmd: SystemCommand) {
      // Only well-formed commands reach PowerShell.
      if ((cmd.kind === "focus" || cmd.kind === "close") && Number.isSafeInteger(cmd.hwnd)) helper.send(`${cmd.kind} ${cmd.hwnd}`);
      else if (cmd.kind === "open" && /^[\w.!{}\\:-]+$/.test(cmd.aumid)) helper.send(`open ${cmd.aumid}`);
      else if (cmd.kind === "dismiss" && Number.isSafeInteger(cmd.id)) {
        helper.send(`dismiss ${cmd.id}`);
        state = { ...state, notifications: state.notifications.filter((n) => n.id !== cmd.id) };
        handlers.onChange(state);
      }
    },
    stop: helper.stop,
  };
}

function toNotice(n: any): Notice {
  return { id: Number(n.id), app: String(n.app ?? ""), aumid: String(n.aumid ?? ""), title: n.title ?? null, body: n.body ?? null, at: Number(n.at) || Date.now(), icon: n.icon ?? null };
}
