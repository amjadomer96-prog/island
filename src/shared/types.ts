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

/** The API the preload script exposes to the island UI as `window.island`. */
export interface IslandApi {
  onMedia(cb: (state: MediaState) => void): () => void;
  onClaude(cb: (state: ClaudeState) => void): () => void;
  media(command: MediaCommand): void;
  setInteractive(on: boolean): void;
  connectClaude(): Promise<{ ok: boolean; error?: string }>;
  quit(): void;
  /** The latest state, for when the UI starts after the first updates went out. */
  state(): Promise<{ media: MediaState | null; claude: ClaudeState | null }>;
}
