import type { CalendarEvent } from "../../../shared/types";
import { eventTime } from "../lib";

const api = window.island;
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

/** This month at a glance, and what's coming up. */
export function CalendarPanel({ events, connected }: { events: CalendarEvent[]; connected: boolean }) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // weeks start on Monday
  const busy = new Set(events.map((e) => new Date(e.start).toDateString()));
  const upcoming = events.filter((e) => e.end > Date.now()).slice(0, 4);

  return (
    <div className="cal">
      <div className="cal__month">
        <p className="cal__title">{now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
        <div className="cal__grid">
          {WEEK.map((d, i) => <span key={"h" + i} className="cal__head">{d}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={"b" + i} />)}
          {Array.from({ length: days }, (_, i) => {
            const date = new Date(now.getFullYear(), now.getMonth(), i + 1);
            const today = i + 1 === now.getDate();
            return (
              <span key={i} className={`cal__day${today ? " cal__day--today" : ""}`}>
                {i + 1}
                {busy.has(date.toDateString()) && !today && <i />}
              </span>
            );
          })}
        </div>
      </div>
      <div className="cal__events">
        {!connected ? (
          <div className="cal__connect">
            <p>See your meetings here: add your calendar&apos;s private address in Settings.</p>
            <button type="button" className="pill-btn" onClick={() => api.openSettings()}>Add calendar</button>
          </div>
        ) : upcoming.length ? (
          upcoming.map((e) => (
            <div className="event" key={e.id}>
              <span className="event__bar" />
              <span className="event__text">
                <span className="event__title">{e.title}</span>
                <span className="event__time">{eventTime(e)}{e.location ? ` · ${e.location}` : ""}</span>
              </span>
            </div>
          ))
        ) : (
          <p className="empty">Nothing in the next 7 days</p>
        )}
      </div>
    </div>
  );
}
