import type { Notice } from "../../../shared/types";
import { ago } from "../lib";
import { AppIcon, Close, Phone, Share } from "./icons";

// Calls (Phone Link) and Nearby Share are the Windows counterparts of the Mac island's calls and
// AirDrop. Windows doesn't let other apps answer or accept them, so they open their own app.
const kindOf = (n: Notice) => {
  const text = `${n.app} ${n.title ?? ""} ${n.body ?? ""}`;
  if (/phone link|your phone/i.test(n.app) && /call/i.test(text)) return "call";
  if (/nearby shar/i.test(text)) return "share";
  return null;
};

const api = window.island;

/** Opening a notification switches to its app and clears it, like clicking it in Windows. */
export const openNotice = (n: Notice) => {
  if (n.aumid) api.system({ kind: "open", aumid: n.aumid });
  api.system({ kind: "dismiss", id: n.id });
};

/** One notification: app icon, app and time, title and message. */
export function NoticeCard({ n, onClose }: { n: Notice; onClose?: () => void }) {
  const kind = kindOf(n);
  return (
    <div className={`notice${kind ? ` notice--${kind}` : ""}`}>
      <button type="button" className="notice__open" onClick={() => openNotice(n)}>
        {kind === "call" ? <span className="notice__icon notice__badge notice__badge--call"><Phone size={18} /></span>
          : kind === "share" ? <span className="notice__icon notice__badge notice__badge--share"><Share size={18} /></span>
          : n.icon ? <img className="notice__icon" src={n.icon} alt="" /> : <span className="notice__icon notice__icon--empty"><AppIcon /></span>}
        <span className="notice__text">
          <span className="notice__meta">{n.app}<span> · {ago(n.at)}</span></span>
          {n.title && <span className="notice__title">{n.title}</span>}
          {n.body && <span className="notice__body">{n.body}</span>}
        </span>
      </button>
      <button type="button" className="notice__close" aria-label="Clear notification" onClick={onClose ?? (() => api.system({ kind: "dismiss", id: n.id }))}><Close /></button>
    </div>
  );
}

/** All recent notifications, or how to switch access on. */
export function Notices({ items, access }: { items: Notice[]; access: string }) {
  if (access !== "Allowed")
    return (
      <p className="empty">
        Turn on notification access to see them here: Windows Settings → Privacy &amp; security → Notifications → “Let apps access your notifications”.
      </p>
    );
  if (!items.length) return <p className="empty">No notifications</p>;
  return <div className="notices">{items.slice(0, 4).map((n) => <NoticeCard n={n} key={n.id} />)}</div>;
}
