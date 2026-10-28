# Island

An Apple-style Dynamic Island for Windows, by Legit Design Studio. A black pill at the top of the screen that springs open on hover.

## What it does

A black notch that grows out of the top edge of the screen, like the Mac's, and springs open on hover.

- **Music from any player** (Spotify, YouTube Music in a browser, Apple Music, VLC…): album art, sound bars in the album's colour, progress, play/pause/skip. Read from Windows' own media controls, so it needs no sign-in and no Spotify Premium.
- **Notifications from every app** drop down from the notch; click to open the app, × to clear.
- **Apps**: every open window with its icon; click to switch, × to close. A newly opened app shows briefly in the notch.
- **Volume and brightness**: change either (even with keyboard keys) and the notch shows the level; sliders in Home.
- **Battery**: "Charging" when the charger goes in, a warning at 20% and 10%, the level in the open notch.
- **File shelf**: drag files onto the notch to keep them, drag them back out into any app.
- **Timer**: presets from 1 to 45 minutes; runs in the closed notch with an orange ring, chimes when done.
- **Calendar**: month view and the next 7 days from a private .ics address (Google, Outlook, iCloud).
- **Search** (Alt+Space; Ctrl+Alt+Space or Alt+Shift+Space when another app already uses it, or the magnifier in the open notch): apps, open windows, files from the Windows Search index, quick sums, the web.
- **Ask Claude** from search, in place of Siri: the answer streams into the island. It runs with no tools, so it can't change anything on the PC. Needs Claude Code installed.
- **Sound output**: switching to headphones or AirPods shows "Connected" in the notch; other switches show the new device.
- **Focus**: Do Not Disturb on or off shows in the notch.
- **Calls and Nearby Share** notifications (Phone Link, Windows sharing) get their own badges, like calls and AirDrop on a Mac.
- **Claude Code**: each session as working (with its tool), needs you, done or stopped; pops open when one needs you or finishes.
- **Settings window** (tray icon, or the gear in the notch): every feature on or off, open at login, calendar link, Connect Claude Code.

Connect Claude Code adds Island's hooks to `~/.claude/settings.json` next to any hooks already there, after saving a backup to `settings.json.island-backup`.

## Run it

```bash
npm install        # also downloads the Electron runtime
npm run dev        # live-reloading development build
npm run start      # production build, run locally
npm run dist       # Windows installer: dist/Island Setup <version>.exe (unsigned for now)
```

If you start it from a VS Code terminal, clear `ELECTRON_RUN_AS_NODE` first (VS Code sets it, and it makes Electron run as plain Node): `env -u ELECTRON_RUN_AS_NODE npm run start`.

## How it's built

- `src/main/`: Electron main process. A transparent always-on-top window at the top centre that lets clicks through everywhere except the island (`index.ts`); the music bridge (`media.ts`); the Claude Code hook server on `127.0.0.1:47831` (`claude.ts`).
- `resources/*.ps1`: small PowerShell helpers that stream one JSON line per change: `media.ps1` (system media controls), `system.ps1` (open windows, notifications), `hud.ps1` (volume, brightness, battery, sound output, Focus), `search.ps1` (Start menu apps and icons, Windows Search index).
- `build/icon.png`: placeholder app icon until the product has its own.
- `src/renderer/`: the island UI in React, animated with Motion springs.
