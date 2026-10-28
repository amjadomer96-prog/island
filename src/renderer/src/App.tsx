import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent } from "react";
import type { CalendarEvent, ClaudeSession, ClaudeState, HudFlash, HudState, MediaState, Notice, OpenApp, Settings, ShelfFile, SystemState } from "../../shared/types";
import { Bars } from "./components/Bars";
import { Expanded, type Tab } from "./components/Expanded";
import { AppIcon, Battery, Speaker, Spark, Sun, Timer as TimerIcon, Tray } from "./components/icons";
import { ClaudeActivity, MusicActivity, TimerActivity } from "./components/LiveActivity";
import { NoticeCard } from "./components/Notices";
import { Ring } from "./components/TimerPanel";
import { CALM, clock, FADE, FADE_CALM, leadSession, OPEN, SETTLE, STATUS_TEXT, useArtColor } from "./lib";
import { chime, useTimer } from "./timer";

const api = window.island;
const WINDOW_W = 640; // matches the window in src/main/index.ts

// Measured from Apple's macOS 27 Dynamic Island (MacBook Pro, late 2026): a pill that floats just
// below the top edge, centred in the menu bar, and opens into a rounded card with ~24pt corners.
const TOP = 6;
const PILL_H = 24;
const IDLE_W = 52;
const BUBBLE = PILL_H; // the second activity's circle, like the iPhone's split island
const GAP = 6;

const NOTICE_MS = 6000;
const ALERT_MS = 5000;
const OPENED_MS = 2200;
const FLASH_MS = { volume: 1500, brightness: 1500, charging: 3000, "low-battery": 4000 } as const;

const DEFAULT_SETTINGS: Settings = { notifications: true, openedApps: true, hud: true, battery: true, launchAtLogin: false, calendarUrl: "", timerSound: true };

type Activity = "music" | "timer" | "claude";

export function App() {
  const [media, setMedia] = useState<MediaState | null>(null);
  const [claude, setClaude] = useState<ClaudeState>({ connected: false, sessions: [] });
  const [system, setSystem] = useState<SystemState>({ apps: [], notifications: [], access: "Unspecified" });
  const [hud, setHud] = useState<HudState>({ volume: null, brightness: null, battery: null });
  const [shelf, setShelf] = useState<ShelfFile[]>([]);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  /** Hovering opens the live activity; clicking opens the panel with everything else. */
  const [expanded, setExpanded] = useState(false);
  const [panel, setPanel] = useState(false);
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
        // A session that starts needing you, finishes or fails drops down briefly.
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

  // Live activities, most important first. The first owns the island; a second gets the bubble.
  const activities: Activity[] = [
    ...(busy?.status === "waiting" ? (["claude"] as const) : []),
    ...(timer.active ? (["timer"] as const) : []),
    ...(music ? (["music"] as const) : []),
    ...(busy && busy.status !== "waiting" ? (["claude"] as const) : []),
  ];
  const main = activities[0] ?? null;
  const second = activities[1] ?? null;

  // What the island shows, most urgent first. Banners win over hover so they can be clicked.
  type View = "drop" | "notice" | "alert" | "timerDone" | "flash" | "panel" | "activity" | "opened" | "compact" | "idle";
  const view: View = dropping ? "drop"
    : notice ? "notice"
    : alert ? "alert"
    : timerDone ? "timerDone"
    : flash && !panel && !expanded ? "flash"
    : panel ? "panel"
    : expanded && main ? "activity"
    : opened ? "opened"
    : main ? "compact"
    : "idle";

  // Measure open content so the island springs to its exact height.
  const content = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState(150);
  const measured = view === "panel" || view === "notice" || view === "activity";
  useLayoutEffect(() => {
    const el = content.current;
    if (!measured || !el) return;
    const ro = new ResizeObserver(() => setContentH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [measured, view, tab, main]);

  const compactW = { music: 196, timer: 150, claude: 184 }[main ?? "music"];
  const width = {
    drop: 360, notice: 360, alert: 300, timerDone: 200, flash: flash?.kind === "charging" || flash?.kind === "low-battery" ? 236 : 220,
    panel: 560, activity: 282, opened: 210, compact: compactW, idle: IDLE_W,
  }[view];
  const height = measured ? contentH : view === "drop" ? 110 : view === "alert" ? 40 : PILL_H;
  // A pill while small; a rounded card (Apple's ~24pt corners) once open.
  const radius = measured || view === "drop" ? 24 : height / 2;
  const showBubble = view === "compact" && !!second;

  // Where the island is, for the main process: it catches the pointer only there. The area runs
  // up to the top edge, so flicking the pointer to the top of the screen still reaches it.
  useEffect(() => {
    const w = width + (showBubble ? GAP + BUBBLE : 0);
    api.setBounds({ x: Math.round((WINDOW_W - width) / 2), y: 0, width: Math.round(w), height: Math.round(TOP + height) });
  }, [width, height, showBubble]);

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
    hoverTimer.current = window.setTimeout(() => { setExpanded(false); setPanel(false); setTab("home"); }, 260);
  };
  enterRef.current = enter;
  leaveRef.current = leave;

  // A click on the island itself (not on one of its controls) opens or closes the panel.
  const click = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, [role=slider], [draggable=true]")) return;
    if (view === "notice" || view === "alert" || view === "drop") return;
    setPanel((p) => !p);
  };

  // Files dragged from anywhere onto the island go on its shelf.
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
    if (files.length) { api.shelfAdd(files); setTab("shelf"); setPanel(true); }
  };

  const bat = hud.battery;
  const st = (w: number) => ({ ...fade.style, width: w });

  return (
    <div className="stage" style={{ "--accent": accent, paddingTop: TOP } as CSSProperties}>
      <div className="anchor">
        <motion.div
          className="island"
          onClick={click}
          onDragEnter={dragOver}
          onDragOver={dragOver}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropping(false); }}
          onDrop={drop}
          initial={false}
          animate={{ width, height, borderRadius: radius }}
          // Opening is yours (a hover, a click, a dragged file), so it may overshoot a little; everything else settles.
          transition={reduce ? CALM : view === "activity" || view === "panel" || view === "drop" ? OPEN : SETTLE}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {view === "drop" && (
              <motion.div key="drop" className="dropzone" {...fade} style={st(width)}>
                <Tray size={26} />
                <span>Drop to keep on the shelf</span>
              </motion.div>
            )}
            {view === "notice" && notice && (
              <motion.div key={"notice" + notice.id} ref={content} {...fade} className="banner" style={st(width)}>
                <NoticeCard n={notice} onClose={() => { api.system({ kind: "dismiss", id: notice.id }); setNotices((q) => q.slice(1)); }} />
              </motion.div>
            )}
            {view === "alert" && alert && (
              <motion.div key={"alert" + alert.id + alert.status} className="compact compact--wide" {...fade} style={st(width)}>
                <Spark size={16} className="spark" />
                <span className="compact__label compact__grow">{alert.project}</span>
                <span className={`dot dot--${alert.status}`} />
                <span className="compact__label compact__dim">{alert.message && alert.status !== "done" ? alert.message : STATUS_TEXT[alert.status]}</span>
              </motion.div>
            )}
            {view === "timerDone" && (
              <motion.div key="timerDone" className="compact" {...fade} style={st(width)}>
                <span className="compact__timer"><TimerIcon size={14} /></span>
                <span className="compact__label">Timer done</span>
              </motion.div>
            )}
            {view === "flash" && flash && (
              <motion.div key={"flash" + flash.kind} className="compact" {...fade} style={st(width)}>
                {flash.kind === "volume" && hud.volume && (
                  <>
                    <span className="compact__icon"><Speaker size={15} muted={hud.volume.muted} level={hud.volume.level} /></span>
                    <Level value={hud.volume.muted ? 0 : hud.volume.level} />
                  </>
                )}
                {flash.kind === "brightness" && hud.brightness !== null && (
                  <>
                    <span className="compact__icon"><Sun size={15} /></span>
                    <Level value={hud.brightness / 100} />
                  </>
                )}
                {(flash.kind === "charging" || flash.kind === "low-battery") && bat && (
                  <>
                    <span className="compact__label" style={{ color: flash.kind === "charging" ? "var(--done)" : "var(--error)" }}>{flash.kind === "charging" ? "Charging" : "Low Battery"}</span>
                    <span className="compact__right">
                      <span className="compact__label">{bat.percent}%</span>
                      <Battery size={20} percent={bat.percent} charging={bat.charging} color={flash.kind === "charging" ? "var(--done)" : "var(--error)"} />
                    </span>
                  </>
                )}
              </motion.div>
            )}
            {view === "panel" && (
              <motion.div key="panel" ref={content} {...fade} style={st(width)}>
                <Expanded tab={tab} onTab={setTab} media={music} claude={claude} system={system} hud={hud} shelf={shelf} calendar={calendar} settings={settings} timer={timer} accent={accent} />
              </motion.div>
            )}
            {view === "activity" && main && (
              <motion.div key={"activity" + main} ref={content} {...fade} style={st(width)}>
                {main === "music" && music && <MusicActivity media={music} />}
                {main === "timer" && <TimerActivity timer={timer} />}
                {main === "claude" && busy && <ClaudeActivity session={busy} />}
              </motion.div>
            )}
            {view === "opened" && opened && (
              <motion.div key={"opened" + opened.hwnd} className="compact" {...fade} style={st(width)}>
                {opened.icon ? <img className="compact__art compact__icon" src={opened.icon} alt="" /> : <span className="compact__icon"><AppIcon size={15} /></span>}
                <span className="compact__label compact__dim">{opened.name}</span>
              </motion.div>
            )}
            {view === "compact" && main && (
              <motion.div key={"compact" + main} className="compact" {...fade} style={st(width)}>
                <Compact kind={main} music={music} timer={timer} busy={busy} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {showBubble && second && (
            <motion.div
              key={"bubble" + second}
              className="bubble"
              initial={reduce ? { opacity: 0 } : { scale: 0.3, opacity: 0, x: -BUBBLE }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { scale: 0.3, opacity: 0, x: -BUBBLE }}
              transition={reduce ? CALM : OPEN}
              style={{ width: BUBBLE, height: BUBBLE, borderRadius: BUBBLE / 2, left: `calc(100% + ${GAP}px)` }}
            >
              <Minimal kind={second} music={music} timer={timer} busy={busy} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

type Parts = { music: MediaState | null; timer: ReturnType<typeof useTimer>; busy: ClaudeSession | null };

/** The closed island with an activity: leading content left of the camera, trailing content right. */
function Compact({ kind, music, timer, busy }: Parts & { kind: Activity }) {
  if (kind === "music" && music)
    return (
      <>
        {music.art ? <img className="compact__art" src={music.art} alt="" /> : <span className="compact__art" style={{ background: "#1c1c1e" }} />}
        <Bars playing={music.playing} />
      </>
    );
  if (kind === "timer")
    return (
      <>
        <Ring progress={timer.duration ? 1 - timer.left / timer.duration : 0} size={15} />
        <span className="compact__label compact__timer-text">{clock(timer.left)}</span>
      </>
    );
  if (kind === "claude" && busy)
    return (
      <>
        <Spark size={14} className={`spark${busy.status === "working" ? " spark--working" : ""}`} />
        <span className="compact__label" style={{ color: busy.status === "waiting" ? "var(--waiting)" : "var(--text-2)" }}>
          {busy.status === "working" ? busy.tool ?? "Working" : STATUS_TEXT[busy.status]}
        </span>
      </>
    );
  return null;
}

/** The second activity, reduced to one glyph in its own circle. */
function Minimal({ kind, music, timer, busy }: Parts & { kind: Activity }) {
  if (kind === "music" && music) return music.art ? <img className="bubble__art" src={music.art} alt="" /> : <Bars playing={music.playing} />;
  if (kind === "timer") return <Ring progress={timer.duration ? 1 - timer.left / timer.duration : 0} size={15} />;
  if (kind === "claude" && busy) return <Spark size={13} className={`spark${busy.status === "working" ? " spark--working" : ""}`} />;
  return null;
}

/** A slim level bar for volume and brightness. */
function Level({ value }: { value: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="level">
      <motion.span className="level__fill" initial={false} animate={{ scaleX: Math.max(0, Math.min(1, value)) }} transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.25 }} />
    </span>
  );
}
