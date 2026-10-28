import { useEffect, useState, type ReactElement } from "react";
import type { CalendarEvent, ClaudeState, HudState, MediaState, Settings, ShelfFile, SystemState } from "../../../shared/types";
import { eventTime } from "../lib";
import type { Timer as TimerApi } from "../timer";
import { AppsGrid } from "./AppsGrid";
import { CalendarPanel } from "./CalendarPanel";
import { ClaudeList } from "./ClaudeList";
import { Controls } from "./Controls";
import { Battery, Bell, Calendar, Gear, Grid, Home, SearchIcon, Timer, Tray } from "./icons";
import { Notices } from "./Notices";
import { Player } from "./Player";
import { Shelf } from "./Shelf";
import { TimerPanel } from "./TimerPanel";

export type Tab = "home" | "apps" | "shelf" | "timer" | "calendar" | "alerts";

const api = window.island;

interface Props {
  shortcut: string | null;
  onSearch: () => void;
  tab: Tab;
  onTab: (t: Tab) => void;
  media: MediaState | null;
  claude: ClaudeState;
  system: SystemState;
  hud: HudState;
  shelf: ShelfFile[];
  calendar: CalendarEvent[];
  settings: Settings;
  timer: TimerApi;
  accent: string;
}

/** The open notch: a tab bar with the date and battery, then the chosen tab. */
export function Expanded({ shortcut, onSearch, tab, onTab, media, claude, system, hud, shelf, calendar, settings, timer, accent }: Props) {
  const count = system.notifications.length;
  const tabs: [Tab, string, ReactElement][] = [
    ["home", "Home", <Home key="h" />],
    ["apps", "Apps", <Grid key="a" />],
    ["shelf", "File shelf", <Tray key="s" />],
    ["timer", "Timer", <Timer key="t" />],
    ["calendar", "Calendar", <Calendar key="c" />],
    ["alerts", "Notifications", <Bell key="n" />],
  ];
  const bat = hud.battery?.present ? hud.battery : null;
  const next = calendar.find((e) => e.end > Date.now());
  const searchLabel = shortcut ? `Search (${shortcut.replace("Control", "Ctrl")})` : "Search";

  return (
    <div className="expanded">
      <div className="topbar">
        <div className="tabs" role="tablist">
          {tabs.map(([id, label, icon]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} aria-label={label} title={label} className={`tab${tab === id ? " tab--on" : ""}`} onClick={() => onTab(id)}>
              {icon}
              {id === "alerts" && count > 0 && <span className="tab__badge">{count > 9 ? "9+" : count}</span>}
              {id === "shelf" && shelf.length > 0 && <span className="tab__badge tab__badge--soft">{shelf.length}</span>}
            </button>
          ))}
        </div>
        <div className="topbar__right">
          <button type="button" className="tab" aria-label={searchLabel} title={searchLabel} onClick={onSearch}><SearchIcon /></button>
          <Today />
          {bat && (
            <span className="chip" title={bat.charging ? "Charging" : "On battery"}>
              {bat.percent}%
              <Battery percent={bat.percent} charging={bat.charging} color={bat.charging ? "var(--done)" : bat.percent <= 20 ? "var(--error)" : "var(--text)"} />
            </span>
          )}
          <button type="button" className="tab" aria-label="Settings" title="Settings" onClick={() => api.openSettings()}><Gear /></button>
        </div>
      </div>

      {tab === "home" && (
        <>
          <Player media={media} accent={accent} />
          <Controls hud={hud} />
          {next && (
            <button type="button" className="next-event" onClick={() => onTab("calendar")}>
              <span className="event__bar" />
              <span className="event__text">
                <span className="event__title">{next.title}</span>
                <span className="event__time">{eventTime(next)}</span>
              </span>
            </button>
          )}
          <ClaudeList claude={claude} />
        </>
      )}
      {tab === "apps" && <AppsGrid apps={system.apps} />}
      {tab === "shelf" && <Shelf files={shelf} />}
      {tab === "timer" && <TimerPanel timer={timer} />}
      {tab === "calendar" && <CalendarPanel events={calendar} connected={!!settings.calendarUrl} />}
      {tab === "alerts" && <Notices items={system.notifications} access={system.access} />}
    </div>
  );
}

/** "Thu 29 Oct  1:05", ticking with the minute. */
function Today() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="today">
      {now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
      <b>{now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</b>
    </span>
  );
}
