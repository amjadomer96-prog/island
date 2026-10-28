import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import type { CalendarEvent, ClaudeSession, ClaudeState, HudFlash, HudState, MediaState, Notice, OpenApp, Settings, ShelfFile, SystemState } from "../../shared/types";
import { Bars } from "./components/Bars";
import { Expanded, type Tab } from "./components/Expanded";
import { AppIcon, Battery, Speaker, Spark, Sun, Timer as TimerIcon, Tray } from "./components/icons";
import { NoticeCard } from "./components/Notices";
import { Ring } from "./components/TimerPanel";
import { CALM, clock, FADE, FADE_CALM, leadSession, OPEN, SETTLE, STATUS_TEXT, useArtColor } from "./lib";
import { chime, useTimer } from "./timer";

const api = window.island;
const WINDOW_W = 640; // matches the window in src/main/index.ts
const SHOULDER = 12;
const NOTCH_H = 34;
const NOTICE_MS = 6000;
const ALERT_MS = 5000;
const OPENED_MS = 2200;
const FLASH_MS = { volume: 1500, brightness: 1500, charging: 3000, "low-battery": 4000 } as const;

/** Bottom-only corners: the notch grows out of the top edge of the screen, as on a Mac. */
const corners = (r: number) => `0px 0px ${r}px ${r}px`;

const DEFAULT_SETTINGS: Settings = { notifications: true, openedApps: true, hud: true, battery: true, launchAtLogin: false, calendarUrl: "", timerSound: true };

export function App() {
  const [media, setMedia] = useState<MediaState | null>(null);
  const [claude, setClaude] = useState<ClaudeState>({ connected: false, sessions: [] });
  const [system, setSystem] = useState<SystemState>({ apps: [], notifications: [], access: "Unspecified" });
  const [hud, setHud] = useState<HudState>({ volume: null, brightness: null, battery: null });
  const [shelf, setShelf] = useState<ShelfFile[]>([]);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [alert, setAlert] = useState<ClaudeSession | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [opened, setOpened] = useState<OpenApp | null>(null);
  const [flash, setFlash] = useState<{ kind: HudFlash; at: number } | null>(null);
  const [timerDone, setTimerDone] = useState(false);
  const [dropping, setDropping] = useState(false);
  const accent = useArtColor(media?.art);
  // Windows "Show animations" off: no springs, blur or slides, only short cross-fades.
  const reduce = useReducedMotion();
  const fade = reduce ? FADE_CALM : FADE;
  const hoverTimer = useRef<number | undefined>(undefined);
  const prevStatus = useRef(new Map<string, string>());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onTimerDone = useCallback(() => {
    setTimerDone(true);
    if (settingsRef.current.timerSound) chime();
  }, []);
  const timer = useTimer(onTimerDone);

  useEffect(() => {
    const offs = [
      api.onMedia(setMedia),
      api.onSystem(setSystem),
      api.onHud(setHud),
      api.onShelf(setShelf),
      api.onCalendar(setCalendar),
      api.onSettings(setSettings),
      api.onFlash((kind) => setFlash({ kind, at: Date.now() })),
      api.onNotice((n) => setNotices((q) => [...q.filter((x) => x.id !== n.id), n].slice(-5))),
      api.onOpened(setOpened),
      api.onClaude((state) => {
        setClaude(state);
        // A session that starts needing you, finishes or fails drops down from the notch briefly.
        for (const s of state.sessions) {
          const before = prevStatus.current.get(s.id);
          if (before && before !== s.status && (s.status === "waiting" || s.status === "done" || s.status === "error")) setAlert(s);
          prevStatus.current.set(s.id, s.status);
        }
      }),
    ];
    api.state().then((s) => {
      if (s.media) setMedia((m) => m ?? s.media);
      if (s.claude) setClaude((c) => (c.sessions.length ? c : s.claude!));
      if (s.system) setSystem((x) => (x.apps.length ? x : s.system!));
      setHud(s.hud);
      setShelf(s.shelf);
      setCalendar(s.calendar);
      setSettings(s.settings);
    });
    return () => offs.forEach((off) => off());
  }, []);

  // Banners leave on their own, but wait while the pointer is on them.
  const notice = notices[0] ?? null;
  useEffect(() => {
    if (!notice || hovered) return;
    const id = setTimeout(() => setNotices((q) => q.slice(1)), NOTICE_MS);
    return () => clearTimeout(id);
  }, [notice, hovered]);
  useEffect(() => {
    if (!alert || hovered) return;
    const id = setTimeout(() => setAlert(null), ALERT_MS);
    return () => clearTimeout(id);
  }, [alert, hovered]);
  useEffect(() => {
    if (!opened) return;
    const id = setTimeout(() => setOpened(null), OPENED_MS);
    return () => clearTimeout(id);
  }, [opened]);
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), FLASH_MS[flash.kind]);
    return () => clearTimeout(id);
  }, [flash]);
  useEffect(() => {
    if (!timerDone || hovered) return;
    const id = setTimeout(() => setTimerDone(false), 8000);
    return () => clearTimeout(id);
  }, [timerDone, hovered]);

  const lead = leadSession(claude.sessions);
  const busy = lead && (lead.status === "working" || lead.status === "waiting" || lead.status === "error") ? lead : null;
  const music = media?.title ? media : null;

  // What the notch shows, most urgent first. A level change you're making from the open notch
  // doesn't close it; banners win over hover so they can be clicked.
  type View = "drop" | "notice" | "alert" | "timerDone" | "flash" | "expanded" | "opened" | "timer" | "music" | "claude" | "idle";
  const view: View = dropping ? "drop"
    : notice ? "notice"
    : alert ? "alert"
    : timerDone ? "timerDone"
    : flash && !expanded ? "flash"
    : expanded ? "expanded"
    : opened ? "opened"
    : timer.active ? "timer"
    : music ? "music"
    : busy ? "claude"
    : "idle";

  // Measure open content so the notch springs to its exact height.
  const content = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState(160);
  const measured = view === "expanded" || view === "notice";
  useLayoutEffect(() => {
    const el = content.current;
    if (!measured || !el) return;
    const ro = new ResizeObserver(() => setContentH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [measured, view, tab]);

  const width = { drop: 420, notice: 400, alert: 360, timerDone: 320, flash: flash?.kind === "low-battery" || flash?.kind === "charging" ? 320 : 300, expanded: 580, opened: 300, timer: 260, music: 300, claude: 280, idle: 200 }[view];
  const height = measured ? contentH : view === "drop" ? 120 : view === "alert" ? 52 : NOTCH_H;
  const radius = view === "expanded" ? 28 : measured || view === "alert" || view === "drop" ? 22 : 14;

  // Tell the main process where the notch is (with its shoulders), so only that area catches the pointer.
  useEffect(() => {
    api.setBounds({ x: Math.round((WINDOW_W - width) / 2 - SHOULDER), y: 0, width: Math.round(width + SHOULDER * 2), height: Math.round(height) });
  }, [width, height]);

  const enterRef = useRef<() => void>(() => {});
  const leaveRef = useRef<() => void>(() => {});
  useEffect(() => api.onPointer((inside) => (inside ? enterRef.current() : leaveRef.current())), []);
  const enter = () => {
    setHovered(true);
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setExpanded(true), 90);
  };
  const leave = () => {
    setHovered(false);
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => { setExpanded(false); setTab("home"); }, 260);
  };
  enterRef.current = enter;
  leaveRef.current = leave;

  // Files dragged from anywhere onto the notch go on its shelf.
  const dragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!dropping) setDropping(true);
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setDropping(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) { api.shelfAdd(files); setTab("shelf"); setExpanded(true); }
  };

  const bat = hud.battery;

  return (
    <div className="stage" style={{ "--accent": accent } as CSSProperties}>
      <div className="anchor">
        <motion.div
          className="island"
          onDragEnter={dragOver}
          onDragOver={dragOver}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropping(false); }}
          onDrop={drop}
          initial={false}
          animate={{ width, height, borderRadius: corners(radius) }}
          // Opening is yours (a hover, a dragged file), so it may overshoot a little; everything else settles.
          transition={reduce ? CALM : view === "expanded" || view === "drop" ? OPEN : SETTLE}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {view === "drop" && (
              <motion.div key="drop" className="dropzone" {...fade} style={{ ...fade.style, width }}>
                <Tray size={26} />
                <span>Drop to keep on the shelf</span>
              </motion.div>
            )}
            {view === "notice" && notice && (
              <motion.div key={"notice" + notice.id} ref={content} {...fade} className="banner" style={{ ...fade.style, width }}>
                <NoticeCard n={notice} onClose={() => { api.system({ kind: "dismiss", id: notice.id }); setNotices((q) => q.slice(1)); }} />
              </motion.div>
            )}
            {view === "alert" && alert && (
              <motion.div key={"alert" + alert.id + alert.status} className="compact" {...fade} style={{ ...fade.style, width }}>
                <Spark size={18} className="spark" />
                <span className="compact__label compact__grow">{alert.project}</span>
                <span className={`dot dot--${alert.status}`} />
                <span className="compact__label compact__dim">{alert.message && alert.status !== "done" ? alert.message : STATUS_TEXT[alert.status]}</span>
              </motion.div>
            )}
            {view === "timerDone" && (
              <motion.div key="timerDone" className="compact" {...fade} style={{ ...fade.style, width }} onClick={() => setTimerDone(false)}>
                <span className="compact__timer"><TimerIcon size={18} /></span>
                <span className="compact__label">Timer done</span>
              </motion.div>
            )}
            {view === "flash" && flash && (
              <motion.div key={"flash" + flash.kind} className="compact" {...fade} style={{ ...fade.style, width }}>
                {flash.kind === "volume" && hud.volume && (
                  <>
                    <span className="compact__icon"><Speaker size={18} muted={hud.volume.muted} level={hud.volume.level} /></span>
                    <Level value={hud.volume.muted ? 0 : hud.volume.level} />
                  </>
                )}
                {flash.kind === "brightness" && hud.brightness !== null && (
                  <>
                    <span className="compact__icon"><Sun size={18} /></span>
                    <Level value={hud.brightness / 100} />
                  </>
                )}
                {(flash.kind === "charging" || flash.kind === "low-battery") && bat && (
                  <>
                    <span className="compact__label" style={{ color: flash.kind === "charging" ? "var(--done)" : "var(--error)" }}>{flash.kind === "charging" ? "Charging" : "Low battery"}</span>
                    <span className="compact__right">
                      <span className="compact__label">{bat.percent}%</span>
                      <Battery percent={bat.percent} charging={bat.charging} color={flash.kind === "charging" ? "var(--done)" : "var(--error)"} />
                    </span>
                  </>
                )}
              </motion.div>
            )}
            {view === "expanded" && (
              <motion.div key="expanded" ref={content} {...fade} style={{ ...fade.style, width }}>
                <Expanded tab={tab} onTab={setTab} media={music} claude={claude} system={system} hud={hud} shelf={shelf} calendar={calendar} settings={settings} timer={timer} accent={accent} />
              </motion.div>
            )}
            {view === "opened" && opened && (
              <motion.div key={"opened" + opened.hwnd} className="compact" {...fade} style={{ ...fade.style, width }}>
                {opened.icon ? <img className="compact__art compact__icon" src={opened.icon} alt="" /> : <span className="compact__icon"><AppIcon size={18} /></span>}
                <span className="compact__label compact__dim">{opened.name}</span>
              </motion.div>
            )}
            {view === "timer" && (
              <motion.div key="timer" className="compact" {...fade} style={{ ...fade.style, width }}>
                <Ring progress={timer.duration ? 1 - timer.left / timer.duration : 0} size={20} />
                <span className="compact__label compact__timer-text">{clock(timer.left)}</span>
              </motion.div>
            )}
            {view === "music" && music && (
              <motion.div key={"music" + music.title} className="compact" {...fade} style={{ ...fade.style, width }}>
                {music.art ? <img className="compact__art" src={music.art} alt="" /> : <span className="compact__art" style={{ background: "#1c1c1e" }} />}
                <span className="compact__right">
                  {busy && <Spark size={14} className={`spark${busy.status === "working" ? " spark--working" : ""}`} />}
                  <Bars playing={music.playing} />
                </span>
              </motion.div>
            )}
            {view === "claude" && busy && (
              <motion.div key={"claude" + busy.status} className="compact" {...fade} style={{ ...fade.style, width }}>
                <Spark size={16} className={`spark${busy.status === "working" ? " spark--working" : ""}`} />
                <span className="compact__label" style={{ color: busy.status === "waiting" ? "var(--waiting)" : "var(--text)" }}>
                  {busy.status === "working" ? busy.tool ?? "Working" : STATUS_TEXT[busy.status]}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

/** A slim level bar for volume and brightness, like the Mac's. */
function Level({ value }: { value: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="level">
      <motion.span className="level__fill" initial={false} animate={{ scaleX: Math.max(0, Math.min(1, value)) }} transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.25 }} />
    </span>
  );
}
