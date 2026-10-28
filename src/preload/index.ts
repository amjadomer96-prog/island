import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from "electron";
import type { AskEvent, CalendarEvent, ClaudeState, HudFlash, HudState, IslandApi, MediaState, Notice, OpenApp, Settings, ShelfFile, SystemState } from "../shared/types";

function listen<T>(channel: string, cb: (value: T) => void) {
  const handler = (_e: IpcRendererEvent, value: T) => cb(value);
  ipcRenderer.on(channel, handler);
  return () => { ipcRenderer.removeListener(channel, handler); };
}

const api: IslandApi = {
  onMedia: (cb) => listen<MediaState>("media", cb),
  onClaude: (cb) => listen<ClaudeState>("claude", cb),
  onSystem: (cb) => listen<SystemState>("system", cb),
  onNotice: (cb) => listen<Notice>("notice", cb),
  onOpened: (cb) => listen<OpenApp>("opened", cb),
  onHud: (cb) => listen<HudState>("hud", cb),
  onFlash: (cb) => listen<HudFlash>("flash", cb),
  onShelf: (cb) => listen<ShelfFile[]>("shelf", cb),
  onCalendar: (cb) => listen<CalendarEvent[]>("calendar", cb),
  onSettings: (cb) => listen<Settings>("settings", cb),
  onPointer: (cb) => listen<boolean>("pointer", cb),
  media: (command) => ipcRenderer.send("media", command),
  system: (command) => ipcRenderer.send("system", command),
  hud: (command) => ipcRenderer.send("hud", command),
  // Dropped files only reveal their path here, in the preload.
  shelfAdd: (files) => ipcRenderer.send("shelf-add", files.map((f) => webUtils.getPathForFile(f)).filter(Boolean)),
  shelfRemove: (path) => ipcRenderer.send("shelf-remove", path),
  shelfOpen: (path) => ipcRenderer.send("shelf-open", path),
  shelfDrag: (path) => ipcRenderer.send("shelf-drag", path),
  openSettings: () => ipcRenderer.send("open-settings"),
  saveSettings: (patch) => ipcRenderer.invoke("save-settings", patch),
  setBounds: (rect) => ipcRenderer.send("bounds", rect),
  onSearchOpen: (cb) => listen<void>("search-open", () => cb()),
  searchFocus: (on) => ipcRenderer.send("search-focus", !!on),
  search: (query) => ipcRenderer.invoke("search", query),
  launch: (target) => ipcRenderer.send("launch", target),
  ask: (id, question) => ipcRenderer.send("ask", id, question),
  askCancel: () => ipcRenderer.send("ask-cancel"),
  onAsk: (cb) => listen<AskEvent>("ask", cb),
  hold: (on) => ipcRenderer.send("hold", !!on),
  connectClaude: () => ipcRenderer.invoke("connect-claude"),
  quit: () => ipcRenderer.send("quit"),
  state: () => ipcRenderer.invoke("state"),
};

contextBridge.exposeInMainWorld("island", api);
