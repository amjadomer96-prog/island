import type { OpenApp } from "../../../shared/types";
import { AppIcon, Close } from "./icons";

const api = window.island;

/** Every app you have open: click to switch to it, × to close it. */
export function AppsGrid({ apps }: { apps: OpenApp[] }) {
  if (!apps.length) return <p className="empty">No apps open</p>;
  return (
    <div className="apps">
      {apps.slice(0, 15).map((a) => (
        <div className={`app${a.active ? " app--active" : ""}`} key={a.hwnd} title={a.title}>
          <button type="button" className="app__open" onClick={() => api.system({ kind: "focus", hwnd: a.hwnd })} aria-label={`Switch to ${a.title}`}>
            {a.icon ? <img src={a.icon} alt="" /> : <span className="app__fallback"><AppIcon /></span>}
            <span className="app__name">{a.name}</span>
          </button>
          <button type="button" className="app__close" onClick={() => api.system({ kind: "close", hwnd: a.hwnd })} aria-label={`Close ${a.title}`}><Close /></button>
        </div>
      ))}
    </div>
  );
}
