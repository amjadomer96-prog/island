import { useState, type ReactElement } from "react";
import type { ClaudeState, MediaState, SystemState } from "../../../shared/types";
import { AppsGrid } from "./AppsGrid";
import { ClaudeList } from "./ClaudeList";
import { Bell, Grid, Home } from "./icons";
import { Notices } from "./Notices";
import { Player } from "./Player";

type Tab = "home" | "apps" | "alerts";

/** The open notch: Home (music and Claude), Apps (everything open) and Notifications. */
export function Expanded({ media, claude, system, accent }: { media: MediaState | null; claude: ClaudeState; system: SystemState; accent: string }) {
  const [tab, setTab] = useState<Tab>("home");
  const count = system.notifications.length;
  const tabs: [Tab, string, ReactElement][] = [
    ["home", "Home", <Home key="h" />],
    ["apps", "Apps", <Grid key="a" />],
    ["alerts", "Notifications", <Bell key="n" />],
  ];

  return (
    <div className="expanded">
      <div className="tabs" role="tablist">
        {tabs.map(([id, label, icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} aria-label={label} title={label} className={`tab${tab === id ? " tab--on" : ""}`} onClick={() => setTab(id)}>
            {icon}
            {id === "alerts" && count > 0 && <span className="tab__badge">{count > 9 ? "9+" : count}</span>}
          </button>
        ))}
      </div>
      {tab === "home" && (
        <>
          <Player media={media} accent={accent} />
          <ClaudeList claude={claude} />
        </>
      )}
      {tab === "apps" && <AppsGrid apps={system.apps} />}
      {tab === "alerts" && <Notices items={system.notifications} access={system.access} />}
    </div>
  );
}
