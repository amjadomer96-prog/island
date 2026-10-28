import { useEffect, useState } from "react";
import type { ClaudeState, Settings } from "../../shared/types";

const api = window.island;

type Toggle = { key: keyof Settings; title: string; text: string };
const TOGGLES: Toggle[] = [
  { key: "notifications", title: "Notifications", text: "Show notifications from every app in the notch." },
  { key: "openedApps", title: "Opened apps", text: "Briefly show an app in the notch when you open it." },
  { key: "hud", title: "Volume and brightness", text: "Show the level in the notch when it changes." },
  { key: "battery", title: "Battery", text: "Show when the charger goes in and when the battery runs low." },
  { key: "noticeSound", title: "Notification sound", text: "Play a light tap when a notification drops down. Quiet during Do Not Disturb." },
  { key: "timerSound", title: "Timer sound", text: "Play a chime when a timer ends." },
  { key: "launchAtLogin", title: "Open at login", text: "Start Island when you sign in to Windows." },
];

/** The settings window: features on and off, calendar link, Claude Code. */
export function SettingsApp() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [claude, setClaude] = useState<ClaudeState | null>(null);
  const [calendar, setCalendar] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.body.classList.add("settings-body");
    document.title = "Island Settings";
    api.state().then((s) => { setSettings(s.settings); setCalendar(s.settings.calendarUrl); setClaude(s.claude); });
    const offs = [api.onSettings(setSettings), api.onClaude(setClaude)];
    return () => offs.forEach((off) => off());
  }, []);

  if (!settings) return null;
  const save = async (patch: Partial<Settings>) => setSettings(await api.saveSettings(patch));

  return (
    <main className="settings">
      <h1>Island</h1>
      <p className="settings__lead">Everything the notch shows, and what it connects to.</p>

      <section>
        <h2>Show in the notch</h2>
        {TOGGLES.map((t) => (
          <label className="row" key={t.key}>
            <span className="row__text"><strong>{t.title}</strong><span>{t.text}</span></span>
            <input type="checkbox" className="switch" checked={settings[t.key] as boolean} onChange={(e) => save({ [t.key]: e.target.checked })} />
          </label>
        ))}
      </section>

      <section>
        <h2>Calendar</h2>
        <p className="settings__hint">
          Paste your calendar&apos;s private address (ends in .ics). Google Calendar: Settings → your calendar → “Secret address in iCal format”.
          Outlook: Settings → Calendar → Shared calendars → Publish. iCloud: share the calendar as a public link.
        </p>
        <form className="field" onSubmit={async (e) => { e.preventDefault(); await save({ calendarUrl: calendar }); setSaved(true); setTimeout(() => setSaved(false), 1600); }}>
          <input type="url" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" value={calendar} onChange={(e) => setCalendar(e.target.value)} spellCheck={false} />
          <button type="submit" className="pill-btn">{saved ? "Saved" : "Save"}</button>
        </form>
      </section>

      <section>
        <h2>Claude Code</h2>
        <div className="row">
          <span className="row__text">
            <strong>{claude?.connected ? "Connected" : "Not connected"}</strong>
            <span>{claude?.connected ? "Sessions show in the notch while they work, when they need you and when they finish." : "Adds Island’s hooks to Claude Code’s settings, next to any you already have (a backup is kept)."}</span>
          </span>
          {!claude?.connected && <button type="button" className="pill-btn" onClick={() => api.connectClaude()}>Connect</button>}
        </div>
      </section>

      <footer className="settings__foot">
        <span>Island 0.1 · Legit Design Studio</span>
        <button type="button" className="link" onClick={() => api.quit()}>Quit Island</button>
      </footer>
    </main>
  );
}
