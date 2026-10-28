// Calendar from a private .ics address (Google Calendar, Outlook and iCloud all offer one).
// Handles time zones and the common repeats: daily and weekly (with weekdays), INTERVAL, COUNT,
// UNTIL and cancelled single occurrences (EXDATE). Refreshed every 10 minutes.
import { net } from "electron";
import type { CalendarEvent } from "../shared/types";

const DAY = 86_400_000;
const AHEAD_DAYS = 7;

export function startCalendar(getUrl: () => string, onChange: (events: CalendarEvent[]) => void) {
  let events: CalendarEvent[] = [];
  let lastUrl = "";

  const refresh = async () => {
    const url = getUrl();
    if (!url) { if (events.length || lastUrl) { events = []; lastUrl = ""; onChange(events); } return; }
    if (!/^https:\/\//i.test(url)) return;
    try {
      const res = await net.fetch(url, { headers: { Accept: "text/calendar" } });
      if (!res.ok) return;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      events = expand(parse(await res.text()), today.getTime(), today.getTime() + AHEAD_DAYS * DAY);
      lastUrl = url;
      onChange(events);
    } catch { /* offline: keep what we had */ }
  };
  refresh();
  const timer = setInterval(refresh, 10 * 60_000);

  return { get: () => events, refresh, stop: () => clearInterval(timer) };
}

interface Raw { uid: string; title: string; location?: string; start: number; end: number; allDay: boolean; rrule?: Record<string, string>; exdates: number[] }

function parse(ics: string): Raw[] {
  // Long lines are folded onto continuation lines that start with a space.
  const lines = ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const out: Raw[] = [];
  let cur: Partial<Raw> & { exdates: number[] } | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = { exdates: [] }; continue; }
    if (line === "END:VEVENT") {
      if (cur?.start !== undefined) out.push({ uid: cur.uid ?? String(cur.start), title: cur.title ?? "Busy", location: cur.location, start: cur.start, end: cur.end ?? cur.start + (cur.allDay ? DAY : 3_600_000), allDay: !!cur.allDay, rrule: cur.rrule, exdates: cur.exdates });
      cur = null;
      continue;
    }
    if (!cur) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const [name, ...params] = line.slice(0, i).split(";");
    const value = line.slice(i + 1);
    const tz = params.find((p) => p.startsWith("TZID="))?.slice(5);
    if (name === "UID") cur.uid = value;
    else if (name === "SUMMARY") cur.title = unescape(value);
    else if (name === "LOCATION") cur.location = unescape(value) || undefined;
    else if (name === "DTSTART") { const t = when(value, tz); cur.start = t.ms; cur.allDay = t.allDay; }
    else if (name === "DTEND") cur.end = when(value, tz).ms;
    else if (name === "RRULE") cur.rrule = Object.fromEntries(value.split(";").map((kv) => kv.split("=") as [string, string]));
    else if (name === "EXDATE") for (const v of value.split(",")) cur.exdates.push(when(v, tz).ms);
  }
  return out;
}

const unescape = (s: string) => s.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();

/** "20261029T100000Z", "20261029T100000" (in TZID or local) or "20261029" (all day). */
function when(v: string, tz?: string): { ms: number; allDay: boolean } {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return { ms: Date.parse(v) || 0, allDay: false };
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined) return { ms: new Date(+y, +mo - 1, +d).getTime(), allDay: true };
  if (z) return { ms: Date.UTC(+y, +mo - 1, +d, +h, +mi, +s), allDay: false };
  if (!tz) return { ms: new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime(), allDay: false };
  return { ms: zoned(+y, +mo - 1, +d, +h, +mi, +s, tz), allDay: false };
}

/** Wall-clock time in an IANA time zone → epoch ms. */
function zoned(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string) {
  const guess = Date.UTC(y, mo, d, h, mi, s);
  try {
    const offset = (t: number) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(t).map((x) => [x.type, x.value]));
      return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - t;
    };
    const first = guess - offset(guess);
    return guess - offset(first); // second pass settles daylight-saving edges
  } catch {
    return new Date(y, mo, d, h, mi, s).getTime(); // unknown zone name: treat as local
  }
}

const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function expand(raw: Raw[], from: number, to: number): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const e of raw) {
    const length = e.end - e.start;
    const add = (start: number) => {
      if (start + length > from && start < to && !e.exdates.includes(start)) out.push({ id: `${e.uid}@${start}`, title: e.title, start, end: start + length, allDay: e.allDay, location: e.location });
    };
    const r = e.rrule;
    if (!r || (r.FREQ !== "DAILY" && r.FREQ !== "WEEKLY")) { if (!r) add(e.start); continue; }
    const step = Math.max(1, Number(r.INTERVAL) || 1);
    const until = r.UNTIL ? when(r.UNTIL).ms : Infinity;
    const count = r.COUNT ? Number(r.COUNT) : Infinity;
    const days = r.FREQ === "WEEKLY" && r.BYDAY ? r.BYDAY.split(",").map((x) => DAYS.indexOf(x.slice(-2))) : null;
    let n = 0;
    // Walk day by day from the first occurrence (keeping its time of day) until past the window.
    const first = new Date(e.start);
    for (let i = 0; n < count; i++) {
      const t = new Date(first); t.setDate(first.getDate() + i);
      const start = t.getTime();
      if (start > until || start >= to) break;
      const weeks = Math.floor(i / 7);
      const ok = r.FREQ === "DAILY" ? i % step === 0 : weeks % step === 0 && (days ? days.includes(t.getDay()) : t.getDay() === first.getDay());
      if (!ok) continue;
      n++;
      add(start);
    }
  }
  return out.sort((a, b) => a.start - b.start).slice(0, 60);
}
