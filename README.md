# Island

An Apple-style Dynamic Island for Windows, by Legit Design Studio. A black pill at the top of the screen that springs open on hover.

## What works today

- **Music from any player** (Spotify, YouTube Music in a browser, Apple Music, VLC…): album art, sound bars in the album's colour, progress, play/pause/skip. Read from Windows' own media controls, so it needs no sign-in and no Spotify Premium.
- **Claude Code**: each session shows as working (with the tool it's using), needs you, done or stopped. When music plays at the same time, Claude gets its own bubble beside the island, like the iPhone's split island. A session that needs you or finishes pops the island open for a few seconds.
- **Connect Claude Code** (in the open island, or the tray menu) adds Island's hooks to `~/.claude/settings.json` next to any hooks already there, after saving a backup to `settings.json.island-backup`.

## Run it

```bash
npm install        # also downloads the Electron runtime
npm run dev        # live-reloading development build
npm run start      # production build, run locally
npm run dist       # Windows installer in dist/
```

If you start it from a VS Code terminal, clear `ELECTRON_RUN_AS_NODE` first (VS Code sets it, and it makes Electron run as plain Node): `env -u ELECTRON_RUN_AS_NODE npm run start`.

## How it's built

- `src/main/`: Electron main process. A transparent always-on-top window at the top centre that lets clicks through everywhere except the island (`index.ts`); the music bridge (`media.ts`); the Claude Code hook server on `127.0.0.1:47831` (`claude.ts`).
- `resources/media.ps1`: reads Windows' system media controls and streams one JSON line per change.
- `src/renderer/`: the island UI in React, animated with Motion springs.
