import { useState } from "react";
import type { ClaudeState } from "../../../shared/types";
import { STATUS_TEXT } from "../lib";
import { Spark } from "./icons";

const api = window.island;

/** Every Claude Code session, or the button that connects Claude Code. */
export function ClaudeList({ claude }: { claude: ClaudeState }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setConnecting(true);
    const r = await api.connectClaude();
    setConnecting(false);
    setError(r.ok ? null : r.error ?? "Could not update Claude Code settings");
  };

  return (
    <div className="claude">
      {claude.sessions.length > 0 ? (
        claude.sessions.slice(0, 3).map((s) => (
          <div className="claude__row" key={s.id}>
            <Spark size={14} className={`spark${s.status === "working" ? " spark--working" : ""}`} />
            <span className="claude__project">{s.project}</span>
            <span className="claude__status" title={s.message}>
              {s.status === "working" && s.tool ? `${STATUS_TEXT.working} · ${s.tool}` : s.message && s.status === "waiting" ? s.message : STATUS_TEXT[s.status]}
            </span>
            <span className={`dot dot--${s.status}`} />
          </div>
        ))
      ) : (
        <div className="claude__row">
          <Spark size={14} className="spark" />
          <span className="claude__project">Claude Code</span>
          {claude.connected ? (
            <span className="claude__status">Waiting for a session</span>
          ) : (
            <button type="button" className="pill-btn" onClick={connect} disabled={connecting}>{connecting ? "Connecting…" : "Connect"}</button>
          )}
        </div>
      )}
      {error && <p className="claude__row" style={{ color: "var(--error)" }}>{error}</p>}
    </div>
  );
}
