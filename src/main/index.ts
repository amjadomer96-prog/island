import { join } from "node:path";
import { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, Tray } from "electron";
import type { ClaudeState, MediaCommand, MediaState, SystemCommand, SystemState } from "../shared/types";
import { connectClaude, startClaude } from "./claude";
import { startMedia } from "./media";
import { startSystem } from "./system";

// The window is a fixed transparent canvas big enough for the expanded island; the island
// itself is drawn by the UI. Clicks outside the island pass through to whatever is below.
const WIDTH = 640;
const HEIGHT = 560;

if (!app.requestSingleInstanceLock()) app.quit();

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let media: ReturnType<typeof startMedia> | null = null;
let claude: ReturnType<typeof startClaude> | null = null;
let system: ReturnType<typeof startSystem> | null = null;
let lastMedia: MediaState | null = null;
let lastClaude: ClaudeState | null = null;
let lastSystem: SystemState | null = null;

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
  // UI errors land in the app log, so a blank island can be diagnosed.
  win.webContents.on("console-message", (e) => { if (e.level === "error") console.error("[ui]", e.message); });
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else win.loadFile(join(__dirname, "../renderer/index.html"));
}

/** A small white pill for the tray, drawn in code so the app needs no icon file yet. */
function trayIcon() {
  const s = 32;
  const px = Buffer.alloc(s * s * 4);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const dx = Math.max(0, Math.abs(x - 15.5) - 6), dy = Math.abs(y - 15.5);
      const inside = Math.hypot(dx, dy) <= 8;
      const i = (y * s + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = 255; // BGRA white
      px[i + 3] = inside ? 255 : 0;
    }
  return nativeImage.createFromBitmap(px, { width: s, height: s });
}

app.whenReady().then(() => {
  createWindow();
  screen.on("display-metrics-changed", place);
  screen.on("display-added", place);
  screen.on("display-removed", place);

  media = startMedia((state) => { lastMedia = state; win?.webContents.send("media", state); });
  claude = startClaude((state) => { lastClaude = state; win?.webContents.send("claude", state); });
  system = startSystem({
    onChange: (state) => { lastSystem = state; win?.webContents.send("system", state); },
    onNotice: (n) => win?.webContents.send("notice", n),
    onOpened: (a) => win?.webContents.send("opened", a),
  });

  tray = new Tray(trayIcon());
  tray.setToolTip("Island");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Connect Claude Code", click: () => { connectClaude(); claude?.refresh(); } },
    { type: "separator" },
    { label: "Quit Island", click: () => app.quit() },
  ]));

  ipcMain.on("media", (_e, cmd: MediaCommand) => {
    if (cmd === "toggle" || cmd === "next" || cmd === "previous") media?.command(cmd);
  });
  ipcMain.on("system", (_e, cmd: SystemCommand) => system?.command(cmd));
  ipcMain.on("interactive", (_e, on: boolean) => win?.setIgnoreMouseEvents(!on, { forward: true }));
  ipcMain.handle("connect-claude", () => { const r = connectClaude(); claude?.refresh(); return r; });
  ipcMain.on("quit", () => app.quit());
  // The UI asks once it is listening; a paused song never changes, so it would otherwise never arrive.
  ipcMain.handle("state", () => ({ media: lastMedia, claude: lastClaude, system: lastSystem }));
});

app.on("before-quit", () => { media?.stop(); claude?.stop(); system?.stop(); });
app.on("window-all-closed", () => app.quit());
