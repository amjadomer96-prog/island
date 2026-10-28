import { join } from "node:path";
import { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, Tray } from "electron";
import type { CalendarEvent, ClaudeState, HudCommand, HudState, MediaCommand, MediaState, Settings, ShelfFile, SystemCommand, SystemState } from "../shared/types";
import { startCalendar } from "./calendar";
import { connectClaude, startClaude } from "./claude";
import { startHud } from "./hud";
import { startMedia } from "./media";
import { getSettings, loadSettings, saveSettings } from "./settings";
import { startShelf } from "./shelf";
import { startSystem } from "./system";

// The window is a fixed transparent canvas big enough for the open notch; the notch itself is
// drawn by the UI. The window only catches the pointer over the notch; everywhere else, clicks
// (and dragged files) go through to whatever is below.
const WIDTH = 640;
const HEIGHT = 560;

if (!app.requestSingleInstanceLock()) app.quit();

let win: BrowserWindow | null = null;
let settingsWin: BrowserWindow | null = null;
let tray: Tray | null = null;
let media: ReturnType<typeof startMedia> | null = null;
let claude: ReturnType<typeof startClaude> | null = null;
let system: ReturnType<typeof startSystem> | null = null;
let hud: ReturnType<typeof startHud> | null = null;
let shelf: ReturnType<typeof startShelf> | null = null;
let calendar: ReturnType<typeof startCalendar> | null = null;
let lastMedia: MediaState | null = null;
let lastClaude: ClaudeState | null = null;
let lastSystem: SystemState | null = null;
let lastHud: HudState = { volume: null, brightness: null, battery: null };
let lastShelf: ShelfFile[] = [];
let lastCalendar: CalendarEvent[] = [];

const send = (channel: string, value: unknown) => {
  win?.webContents.send(channel, value);
  if (channel === "settings") settingsWin?.webContents.send(channel, value);
};

function rendererUrl(hash = "") {
  return process.env.ELECTRON_RENDERER_URL ? `${process.env.ELECTRON_RENDERER_URL}${hash}` : null;
}
function load(w: BrowserWindow, hash = "") {
  const url = rendererUrl(hash);
  if (url) w.loadURL(url);
  else w.loadFile(join(__dirname, "../renderer/index.html"), { hash: hash.replace(/^#/, "") });
}

function place() {
  if (!win) return;
  const { workArea } = screen.getPrimaryDisplay();
  win.setBounds({ x: Math.round(workArea.x + (workArea.width - WIDTH) / 2), y: workArea.y, width: WIDTH, height: HEIGHT });
}

function createWindow() {
  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false, // never steals focus from the app you're working in
    show: false,
    backgroundColor: "#00000000",
    webPreferences: { preload: join(__dirname, "../preload/index.js") },
  });
  win.setAlwaysOnTop(true, "screen-saver");
  win.setIgnoreMouseEvents(true, { forward: true });
  place();
  win.once("ready-to-show", () => win?.showInactive());
  // UI errors land in the app log, so a blank notch can be diagnosed.
  win.webContents.on("console-message", (e) => { if (e.level === "error") console.error("[ui]", e.message); });
  load(win);
}

function openSettings() {
  if (settingsWin) { settingsWin.show(); settingsWin.focus(); return; }
  settingsWin = new BrowserWindow({
    width: 460,
    height: 680,
    title: "Island Settings",
    backgroundColor: "#111113",
    autoHideMenuBar: true,
    resizable: false,
    maximizable: false,
    icon: appIcon(),
    webPreferences: { preload: join(__dirname, "../preload/index.js") },
  });
  load(settingsWin, "#settings");
  settingsWin.on("closed", () => { settingsWin = null; });
}

/** Where the notch is, in window pixels; the window catches the pointer only there. */
let notch = { x: 0, y: 0, width: 0, height: 0 };
let catching = false;
function watchPointer() {
  setInterval(() => {
    if (!win) return;
    const p = screen.getCursorScreenPoint();
    const b = win.getBounds();
    const pad = 4;
    const inside = p.x >= b.x + notch.x - pad && p.x <= b.x + notch.x + notch.width + pad && p.y >= b.y + notch.y - pad && p.y <= b.y + notch.y + notch.height + pad;
    if (inside !== catching) {
      catching = inside;
      // Catching the pointer also makes the notch a drop target for files dragged from anywhere.
      win.setIgnoreMouseEvents(!inside, { forward: true });
      // The UI learns about enter/leave from here: once the window lets the pointer through,
      // the page itself never hears that the pointer left.
      win.webContents.send("pointer", inside);
    }
  }, 50);
}

/** A white pill on black: placeholder mark until the product has its own logo. */
function appIcon(size = 256) {
  const px = Buffer.alloc(size * size * 4);
  const r = size * 0.22, pillW = size * 0.3, pillH = size * 0.13;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Rounded square
      const qx = Math.max(0, Math.abs(x + 0.5 - size / 2) - (size / 2 - r)), qy = Math.max(0, Math.abs(y + 0.5 - size / 2) - (size / 2 - r));
      const inSquare = Math.hypot(qx, qy) <= r;
      // Pill near the top, like the notch
      const px2 = Math.max(0, Math.abs(x + 0.5 - size / 2) - pillW / 2), py2 = Math.abs(y + 0.5 - size * 0.3);
      const inPill = Math.hypot(px2, py2) <= pillH / 2;
      const v = inPill ? 245 : 12;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = inSquare ? 255 : 0;
    }
  return nativeImage.createFromBitmap(px, { width: size, height: size });
}

app.whenReady().then(() => {
  loadSettings();
  createWindow();
  watchPointer();
  screen.on("display-metrics-changed", place);
  screen.on("display-added", place);
  screen.on("display-removed", place);

  const on = (key: keyof Settings) => getSettings()[key] === true;
  media = startMedia((s) => { lastMedia = s; send("media", s); });
  claude = startClaude((s) => { lastClaude = s; send("claude", s); });
  system = startSystem({
    onChange: (s) => { lastSystem = s; send("system", s); },
    onNotice: (n) => { if (on("notifications")) send("notice", n); },
    onOpened: (a) => { if (on("openedApps")) send("opened", a); },
  });
  hud = startHud({
    onChange: (s) => { lastHud = s; send("hud", s); },
    onFlash: (f) => {
      const allowed = f === "volume" || f === "brightness" ? on("hud") : on("battery");
      if (allowed) send("flash", f);
    },
  });
  shelf = startShelf((files) => { lastShelf = files; send("shelf", files); });
  calendar = startCalendar(() => getSettings().calendarUrl, (events) => { lastCalendar = events; send("calendar", events); });

  tray = new Tray(appIcon(32));
  tray.setToolTip("Island");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Settings…", click: openSettings },
    { label: "Connect Claude Code", click: () => { connectClaude(); claude?.refresh(); } },
    { type: "separator" },
    { label: "Quit Island", click: () => app.quit() },
  ]));
  tray.on("click", openSettings);

  ipcMain.on("media", (_e, cmd: MediaCommand) => { if (cmd === "toggle" || cmd === "next" || cmd === "previous") media?.command(cmd); });
  ipcMain.on("system", (_e, cmd: SystemCommand) => system?.command(cmd));
  ipcMain.on("hud", (_e, cmd: HudCommand) => hud?.command(cmd));
  ipcMain.on("bounds", (_e, r: typeof notch) => {
    if ([r?.x, r?.y, r?.width, r?.height].every(Number.isFinite)) notch = r;
  });
  ipcMain.on("shelf-add", (_e, paths: string[]) => { if (Array.isArray(paths)) shelf?.add(paths.filter((p) => typeof p === "string")); });
  ipcMain.on("shelf-remove", (_e, path: string) => shelf?.remove(path));
  ipcMain.on("shelf-open", (_e, path: string) => shelf?.open(path));
  ipcMain.on("shelf-drag", (e, path: string) => shelf?.drag(path, e.sender));
  ipcMain.on("open-settings", openSettings);
  ipcMain.handle("save-settings", (_e, patch: Partial<Settings>) => {
    const before = getSettings().calendarUrl;
    const s = saveSettings(patch ?? {});
    send("settings", s);
    if (s.calendarUrl !== before) calendar?.refresh();
    return s;
  });
  ipcMain.handle("connect-claude", () => { const r = connectClaude(); claude?.refresh(); return r; });
  ipcMain.on("quit", () => app.quit());
  // The UI asks once it is listening; state that never changes (a paused song) would otherwise never arrive.
  ipcMain.handle("state", () => ({ media: lastMedia, claude: lastClaude, system: lastSystem, hud: lastHud, shelf: lastShelf, calendar: lastCalendar, settings: getSettings() }));
});

app.on("second-instance", openSettings);
app.on("before-quit", () => { media?.stop(); claude?.stop(); system?.stop(); hud?.stop(); calendar?.stop(); });
app.on("window-all-closed", () => app.quit());
