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
  media(command: MediaCommand): void;
  system(command: SystemCommand): void;
  setInteractive(on: boolean): void;
  connectClaude(): Promise<{ ok: boolean; error?: string }>;
  quit(): void;
  /** The latest state, for when the UI starts after the first updates went out. */
  state(): Promise<{ media: MediaState | null; claude: ClaudeState | null; system: SystemState | null }>;
}
