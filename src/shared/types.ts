/** What is playing, from Windows' system media controls. Positions are in milliseconds. */
export interface MediaState {
  playing: boolean;
  title: string | null;
  artist?: string;
  album?: string;
  /** Player that owns the session, e.g. "Spotify.exe" or a Store app id. */
  app?: string;
  position: number;
  duration: number;
  /** When `position` was measured (Date.now()), so the UI can run the clock between updates. */
  at: number;
  art?: string | null;
}

export type ClaudeStatus = "working" | "waiting" | "done" | "error" | "idle";

/** One Claude Code session, as reported by its hooks. */
export interface ClaudeSession {
  id: string;
  project: string;
  status: ClaudeStatus;
  /** The tool it is using right now, while working. */
  tool?: string;
  /** What it needs from you, while waiting. */
  message?: string;
  updated: number;
}

export interface ClaudeState {
  connected: boolean;
  sessions: ClaudeSession[];
}

export type MediaCommand = "toggle" | "next" | "previous";

/** A window you have open, as Alt+Tab would list it. */
export interface OpenApp {
  hwnd: number;
  title: string;
  name: string;
  exe?: string;
  icon?: string | null;
  active: boolean;
}

/** A Windows notification from any app. */
export interface Notice {
  id: number;
  app: string;
  /** The app's id, used to open it. */
  aumid: string;
  title: string | null;
  body: string | null;
  at: number;
  icon?: string | null;
}

export interface SystemState {
  apps: OpenApp[];
  notifications: Notice[];
  /** Windows' notification-access setting: "Allowed", "Denied" or "Unspecified". */
  access: string;
}

export type SystemCommand = { kind: "focus" | "close"; hwnd: number } | { kind: "open"; aumid: string } | { kind: "dismiss"; id: number };

/** The API the preload script exposes to the island UI as `window.island`. */
export interface IslandApi {
  onMedia(cb: (state: MediaState) => void): () => void;
  onClaude(cb: (state: ClaudeState) => void): () => void;
  onSystem(cb: (state: SystemState) => void): () => void;
  /** A notification that just arrived, to pop the island open. */
  onNotice(cb: (notice: Notice) => void): () => void;
  /** An app that was just opened, to show briefly in the island. */
  onOpened(cb: (app: OpenApp) => void): () => void;
  onHud(cb: (state: HudState) => void): () => void;
  onFlash(cb: (flash: HudFlash) => void): () => void;
  onShelf(cb: (files: ShelfFile[]) => void): () => void;
  onCalendar(cb: (events: CalendarEvent[]) => void): () => void;
  onSettings(cb: (settings: Settings) => void): () => void;
  /** The pointer entered (true) or left (false) the notch. */
  onPointer(cb: (inside: boolean) => void): () => void;
  hud(command: HudCommand): void;
  shelfAdd(files: File[]): void;
  shelfRemove(path: string): void;
  shelfOpen(path: string): void;
  shelfDrag(path: string): void;
  openSettings(): void;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
  /** Where the island is, in window pixels, so the window only catches the pointer there. */
  setBounds(rect: { x: number; y: number; width: number; height: number }): void;
  /** The search shortcut (Alt+Space, or a fallback when another app holds it) or the search button asks the island to show Spotlight. */
  onSearchOpen(cb: () => void): () => void;
  /** Search takes the keyboard while open; closing hands it back to the app you were in. */
  searchFocus(on: boolean): void;
  search(query: string): Promise<SearchResults>;
  launch(target: LaunchTarget): void;
  ask(id: number, question: string): void;
  askCancel(): void;
  onAsk(cb: (event: AskEvent) => void): () => void;
  /** Keep the notch open and catching the pointer, e.g. while a slider is dragged past its edge. */
  hold(on: boolean): void;
  media(command: MediaCommand): void;
  system(command: SystemCommand): void;
  connectClaude(): Promise<{ ok: boolean; error?: string }>;
  quit(): void;
  /** The latest state, for when the UI starts after the first updates went out. */
  state(): Promise<{ media: MediaState | null; claude: ClaudeState | null; system: SystemState | null; hud: HudState; shelf: ShelfFile[]; calendar: CalendarEvent[]; settings: Settings; shortcut: string | null }>;
}

/** Volume, brightness and battery, for the notch's HUD. Brightness is null on screens that don't report it. */
export interface HudState {
  volume: { level: number; muted: boolean } | null;
  brightness: number | null;
  battery: { present: boolean; percent: number; charging: boolean } | null;
  /** The sound output in use, e.g. "Headphones (AirPods Pro)". */
  output: { id: string; name: string } | null;
  /** Do Not Disturb / Focus: 0 off, 1 priority only, 2 alarms only. */
  focus: number | null;
}
/** Something the notch should flash: a level that just changed, the charger going in, a low battery. */
export type HudFlash = "volume" | "brightness" | "charging" | "low-battery" | "output" | "focus";

/** Spotlight-style results from the island's search. */
export interface SearchResults {
  apps: { name: string; id: string; icon: string | null }[];
  windows: OpenApp[];
  files: { path: string; name: string; folder: boolean; icon: string | null }[];
}
export type LaunchTarget = { kind: "app"; id: string } | { kind: "file"; path: string } | { kind: "web"; query: string } | { kind: "copy"; text: string };
export interface AskEvent { id: number; text?: string; done?: boolean; error?: string }
export type HudCommand = { kind: "volume"; level: number } | { kind: "mute"; muted: boolean } | { kind: "brightness"; level: number };

/** A file dropped on the notch, kept on its shelf until removed. */
export interface ShelfFile {
  path: string;
  name: string;
  size: number;
  icon?: string | null;
  added: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  allDay: boolean;
  location?: string;
}

export interface Settings {
  notifications: boolean;
  openedApps: boolean;
  hud: boolean;
  battery: boolean;
  launchAtLogin: boolean;
  /** A private calendar address (.ics) from Google Calendar, Outlook or iCloud. */
  calendarUrl: string;
  timerSound: boolean;
  /** A short sound when a notification drops down. */
  noticeSound: boolean;
}
