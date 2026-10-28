import { useEffect, useState } from "react";
import type { ClaudeSession, MediaState } from "../../shared/types";

/** Apple-like spring: quick, settles with a slight overshoot on the way out. */
export const SPRING = { type: "spring", stiffness: 420, damping: 32, mass: 0.9 } as const;
export const FADE = {
  initial: { opacity: 0, filter: "blur(6px)", scale: 0.96 },
  // At rest the filter and transform are removed entirely: a lingering blur(0) or scale layer
  // re-rasterises the album art and leaves it soft.
  animate: { opacity: 1, filter: "blur(0px)", scale: 1, transitionEnd: { filter: "none", transform: "none" } },
  exit: { opacity: 0, filter: "blur(6px)", scale: 0.96 },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
} as const;

export const time = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Live playback position: runs the clock between the helper's once-a-second updates. */
export function usePosition(m: MediaState | null) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!m?.playing) return;
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [m?.playing, m?.at]);
  if (!m) return 0;
  const pos = m.position + (m.playing ? Date.now() - m.at : 0);
  return m.duration ? Math.min(pos, m.duration) : pos;
}

/** A readable accent from the album art: the average colour, lifted so it shows on black. */
export function useArtColor(art?: string | null) {
  const [color, setColor] = useState("#ffffff");
  useEffect(() => {
    if (!art) { setColor("#ffffff"); return; }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 12;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 12, 12);
      const d = ctx.getImageData(0, 0, 12, 12).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
        const w = 1 + sat / 32; // colourful pixels count more than greys
        r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; n += w;
      }
      const [h, s] = hsl(r / n, g / n, b / n);
      setColor(`hsl(${Math.round(h)} ${Math.round(Math.max(s, 45))}% 68%)`);
    };
    img.src = art;
  }, [art]);
  return color;
}

function hsl(r: number, g: number, b: number): [number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return [0, 0];
  const l = (max + min) / 2;
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s * 100];
}

/** Player names from Windows app ids: "SpotifyAB.SpotifyMusic_…!Spotify" → "Spotify". */
export function appName(id?: string) {
  if (!id) return "";
  const known: [RegExp, string][] = [[/spotify/i, "Spotify"], [/chrome/i, "Chrome"], [/msedge/i, "Edge"], [/firefox/i, "Firefox"], [/applemusic|apple music/i, "Apple Music"], [/zune|mediaplayer/i, "Media Player"], [/vlc/i, "VLC"]];
  return known.find(([re]) => re.test(id))?.[1] ?? id.split(/[!\\/]/).pop()!.replace(/\.exe$/i, "");
}

export const STATUS_TEXT: Record<ClaudeSession["status"], string> = { working: "Working", waiting: "Needs you", done: "Done", error: "Stopped", idle: "Ready" };

/** The session that should own the island: one needing you beats one working beats one just done. */
export function leadSession(sessions: ClaudeSession[]) {
  const rank = { waiting: 0, error: 1, working: 2, done: 3, idle: 4 } as const;
  return [...sessions].sort((a, b) => rank[a.status] - rank[b.status] || b.updated - a.updated)[0];
}

/** "now", "5m", "2h", "3d": how long ago, the way notification centres show it. */
export function ago(at: number) {
  const s = Math.max(0, (Date.now() - at) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/** Timer display: "4:05", or "1:02:05" past an hour. */
export function clock(ms: number) {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

/** "10:00 – 10:30", with "Tomorrow" or the weekday when it isn't today. */
export function eventTime(e: { start: number; end: number; allDay: boolean }) {
  const d = new Date(e.start), today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  const day = d.toDateString() === today.toDateString() ? "" : d.toDateString() === tomorrow.toDateString() ? "Tomorrow " : d.toLocaleDateString(undefined, { weekday: "short" }) + " ";
  if (e.allDay) return `${day || "Today "}· all day`;
  const t = (n: number) => new Date(n).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day}${t(e.start)} – ${t(e.end)}`;
}
