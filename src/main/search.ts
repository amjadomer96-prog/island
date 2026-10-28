// Spotlight in the island: apps from the Start menu, files from the Windows Search index,
// and the windows you have open. Results come back with real icons.
import { existsSync } from "node:fs";
import { app } from "electron";
import type { OpenApp, SearchResults } from "../shared/types";
import { runHelper } from "./helper";

// Start menu ids for classic apps begin with a known-folder id instead of a drive.
const FOLDERS: Record<string, string | undefined> = {
  "{6D809377-6AF0-444B-8957-A3773F02200E}": process.env.ProgramW6432 ?? process.env.ProgramFiles,
  "{7C5A40EF-A0FB-4BFC-874A-C0F2E0B9FA8E}": process.env["ProgramFiles(x86)"],
  "{F38BF404-1D43-42F2-9305-67DE0B28FC23}": process.env.windir,
  "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}": process.env.windir ? `${process.env.windir}\\System32` : undefined,
};

function exeOf(id: string) {
  const m = id.match(/^(\{[0-9A-F-]+\})\\(.+)$/i);
  const path = m ? (FOLDERS[m[1].toUpperCase()] ? `${FOLDERS[m[1].toUpperCase()]}\\${m[2]}` : null) : /^[A-Z]:\\/i.test(id) ? id : null;
  return path && existsSync(path) ? path : null;
}

/** How well `name` matches `q`: start of the name beats start of a word beats anywhere; 0 = no match. */
export function score(name: string, q: string) {
  const n = name.toLowerCase(), s = q.toLowerCase().trim();
  if (!s) return 0;
  if (n === s) return 100;
  if (n.startsWith(s)) return 80 - n.length / 100;
  if (n.split(/[\s\-_.]+/).some((w) => w.startsWith(s))) return 60 - n.length / 100;
  // Initials: "vsc" finds "Visual Studio Code".
  const initials = n.split(/[\s\-_.]+/).map((w) => w[0]).join("");
  if (initials.startsWith(s)) return 50;
  if (n.includes(s)) return 30 - n.length / 100;
  return 0;
}

export function startSearch(getWindows: () => OpenApp[]) {
  let apps: { name: string; id: string }[] = [];
  const icons = new Map<string, string | null>();
  const pending = new Map<number, (files: { path: string; name: string; folder: boolean }[]) => void>();
  const pendingIcons = new Map<number, (data: string | null) => void>();
  let seq = 0;

  const helper = runHelper("search.ps1", [], (msg) => {
    if (msg.type === "apps") apps = (msg.apps ?? []).map((a: any) => ({ name: String(a.name), id: String(a.id) }));
    else if (msg.type === "files") { pending.get(Number(msg.id))?.(msg.items ?? []); pending.delete(Number(msg.id)); }
    else if (msg.type === "icon") { pendingIcons.get(Number(msg.id))?.(typeof msg.data === "string" ? msg.data : null); pendingIcons.delete(Number(msg.id)); }
  });
  // The Start menu changes as apps are installed; refresh it every 10 minutes.
  const timer = setInterval(() => helper.send("apps"), 10 * 60_000);

  const iconFor = async (key: string, path: string | null) => {
    if (icons.has(key)) return icons.get(key) ?? null;
    const data = path ? await app.getFileIcon(path, { size: "normal" }).then((i) => i.toDataURL()).catch(() => null) : null;
    icons.set(key, data);
    return data;
  };

  // Store apps have no .exe, so their icon comes from the shell's Start menu entry.
  const shellIcon = (aumid: string) =>
    new Promise<string | null>((resolve) => {
      if (/[\r\n]/.test(aumid)) return resolve(null);
      const id = ++seq;
      pendingIcons.set(id, resolve);
      helper.send(`icon ${id} ${aumid}`);
      setTimeout(() => { if (pendingIcons.delete(id)) resolve(null); }, 2500);
    });
  const appIcon = async (id: string) => {
    if (icons.has(id)) return icons.get(id) ?? null;
    const exe = exeOf(id);
    const data = exe ? await iconFor(id, exe) : await shellIcon(id);
    icons.set(id, data);
    return data;
  };

  const files = (q: string) =>
    new Promise<{ path: string; name: string; folder: boolean }[]>((resolve) => {
      const id = ++seq;
      pending.set(id, resolve);
      helper.send(`files ${id} ${q.replace(/[\r\n]/g, " ")}`);
      setTimeout(() => { if (pending.delete(id)) resolve([]); }, 2500); // a slow index never blocks typing
    });

  return {
    async search(q: string): Promise<SearchResults> {
      const query = q.trim();
      if (!query) return { apps: [], windows: [], files: [] };
      const topApps = apps.map((a) => ({ a, s: score(a.name, query) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 6);
      const windows = getWindows().map((w) => ({ w, s: Math.max(score(w.name, query), score(w.title, query)) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 4).map((x) => x.w);
      const [found, appIcons] = await Promise.all([
        files(query),
        Promise.all(topApps.map(({ a }) => appIcon(a.id))),
      ]);
      const fileIcons = await Promise.all(found.map((f) => iconFor(f.folder ? "<folder>" : f.path.split(".").pop()!.toLowerCase(), f.path)));
      return {
        apps: topApps.map(({ a }, i) => ({ name: a.name, id: a.id, icon: appIcons[i] })),
        windows,
        files: found.map((f, i) => ({ ...f, icon: fileIcons[i] })),
      };
    },
    stop() { clearInterval(timer); helper.stop(); },
  };
}
