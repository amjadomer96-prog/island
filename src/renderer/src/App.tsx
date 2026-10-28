import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { ClaudeSession, ClaudeState, MediaState, Notice, OpenApp, SystemState } from "../../shared/types";
import { Bars } from "./components/Bars";
import { Expanded } from "./components/Expanded";
import { AppIcon, Spark } from "./components/icons";
import { NoticeCard } from "./components/Notices";
import { FADE, leadSession, SPRING, STATUS_TEXT, useArtColor } from "./lib";

const api = window.island;
const NOTCH_H = 34;
const NOTICE_MS = 6000;
const ALERT_MS = 5000;
const OPENED_MS = 2200;

/** Bottom-only corners: the notch grows out of the top edge of the screen, as on a Mac. */
const corners = (r: number) => `0px 0px ${r}px ${r}px`;

export function App() {
  const [media, setMedia] = useState<MediaState | null>(null);
  const [claude, setClaude] = useState<ClaudeState>({ connected: false, sessions: [] });
  const [system, setSystem] = useState<SystemState>({ apps: [], notifications: [], access: "Unspecified" });
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [alert, setAlert] = useState<ClaudeSession | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [opened, setOpened] = useState<OpenApp | null>(null);
  const accent = useArtColor(media?.art);
  const timer = useRef<number | undefined>(undefined);
  const prevStatus = useRef(new Map<string, string>());

  useEffect(() => {
    const offs = [
      api.onMedia(setMedia),
      api.onSystem(setSystem),
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

  const lead = leadSession(claude.sessions);
  const busy = lead && (lead.status === "working" || lead.status === "waiting" || lead.status === "error") ? lead : null;
  const music = media?.title ? media : null;

  // What the notch shows. A banner (notification, Claude alert) wins over hover, so it can be clicked.
  type View = "notice" | "alert" | "expanded" | "opened" | "music" | "claude" | "idle";
  const view: View = notice ? "notice" : alert ? "alert" : expanded ? "expanded" : opened ? "opened" : music ? "music" : busy ? "claude" : "idle";

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
  }, [measured, view]);

  const width = { notice: 400, alert: 360, expanded: 520, opened: 300, music: 300, claude: 280, idle: 200 }[view];
  const height = measured ? contentH : view === "alert" ? 52 : NOTCH_H;
  const radius = view === "expanded" ? 28 : measured || view === "alert" ? 22 : 14;

  const enter = () => {
    api.setInteractive(true);
    setHovered(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setExpanded(true), 90);
  };
  const leave = () => {
    setHovered(false);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { setExpanded(false); api.setInteractive(false); }, 260);
  };

  return (
    <div className="stage" style={{ "--accent": accent } as CSSProperties}>
      <div className="anchor">
        <motion.div
          className="island"
          onPointerEnter={enter}
          onPointerLeave={leave}
          initial={false}
          animate={{ width, height, borderRadius: corners(radius) }}
          transition={SPRING}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {view === "notice" && notice && (
              <motion.div key={"notice" + notice.id} ref={content} {...FADE} className="banner" style={{ width }}>
                <NoticeCard n={notice} onClose={() => { api.system({ kind: "dismiss", id: notice.id }); setNotices((q) => q.slice(1)); }} />
              </motion.div>
            )}
            {view === "alert" && alert && (
              <motion.div key={"alert" + alert.id + alert.status} className="compact" {...FADE} style={{ width }}>
                <Spark size={18} className="spark" />
                <span className="compact__label compact__grow">{alert.project}</span>
                <span className={`dot dot--${alert.status}`} />
                <span className="compact__label compact__dim">{alert.message && alert.status !== "done" ? alert.message : STATUS_TEXT[alert.status]}</span>
              </motion.div>
            )}
            {view === "expanded" && (
              <motion.div key="expanded" ref={content} {...FADE} style={{ width }}>
                <Expanded media={music} claude={claude} system={system} accent={accent} />
              </motion.div>
            )}
            {view === "opened" && opened && (
              <motion.div key={"opened" + opened.hwnd} className="compact" {...FADE} style={{ width }}>
                {opened.icon ? <img className="compact__art compact__icon" src={opened.icon} alt="" /> : <span className="compact__icon"><AppIcon size={18} /></span>}
                <span className="compact__label compact__dim">{opened.name}</span>
              </motion.div>
            )}
            {view === "music" && music && (
              <motion.div key={"music" + music.title} className="compact" {...FADE} style={{ width }}>
                {music.art ? <img className="compact__art" src={music.art} alt="" /> : <span className="compact__art" style={{ background: "#1c1c1e" }} />}
                <span className="compact__right">
                  {busy && <Spark size={14} className={`spark${busy.status === "working" ? " spark--working" : ""}`} />}
                  <Bars playing={music.playing} />
                </span>
              </motion.div>
            )}
            {view === "claude" && busy && (
              <motion.div key={"claude" + busy.status} className="compact" {...FADE} style={{ width }}>
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
