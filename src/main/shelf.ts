// The file shelf: files dropped on the notch, kept (by path, not copied) until removed.
import { existsSync, statSync } from "node:fs";
import { basename } from "node:path";
import { app, shell, type WebContents } from "electron";
import type { ShelfFile } from "../shared/types";
import { readJson, writeJson } from "./store";

const MAX = 24;

export function startShelf(onChange: (files: ShelfFile[]) => void) {
  // Files that were moved or deleted since last time quietly drop off the shelf.
  let files: ShelfFile[] = readJson<{ files: ShelfFile[] }>("shelf.json", { files: [] }).files.filter((f) => existsSync(f.path));
  const save = () => { writeJson("shelf.json", { files: files.map(({ icon: _icon, ...f }) => f) }); onChange(files); };

  // Icons come from Windows itself, the same ones Explorer shows.
  const withIcons = async () => {
    files = await Promise.all(files.map(async (f) => (f.icon ? f : { ...f, icon: await app.getFileIcon(f.path, { size: "large" }).then((i) => i.toDataURL()).catch(() => null) })));
    onChange(files);
  };
  withIcons();

  return {
    get: () => files,
    async add(paths: string[]) {
      for (const path of paths) {
        if (!path || !existsSync(path) || files.some((f) => f.path === path)) continue;
        const stat = statSync(path);
        files.unshift({ path, name: basename(path), size: stat.isDirectory() ? 0 : stat.size, added: Date.now() });
      }
      files = files.slice(0, MAX);
      save();
      await withIcons();
    },
    remove(path: string) { files = files.filter((f) => f.path !== path); save(); },
    open(path: string) { if (files.some((f) => f.path === path)) shell.openPath(path); },
    /** Drag a shelf file out of the notch into any app, like dragging from Explorer. */
    async drag(path: string, contents: WebContents) {
      const f = files.find((x) => x.path === path);
      if (!f || !existsSync(path)) return;
      const icon = await app.getFileIcon(path, { size: "normal" });
      contents.startDrag({ file: path, icon });
    },
  };
}
