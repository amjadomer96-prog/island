import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { ClaudeSession, ClaudeState, MediaState } from "../../shared/types";
import { Bars } from "./components/Bars";
import { Expanded } from "./components/Expanded";
import { Spark } from "./components/icons";
import { FADE, leadSession, SPRING, STATUS_TEXT, useArtColor } from "./lib";

const api = window.island;
const COMPACT_H = 36;
const ALERT_MS = 5000;

export function App() {
  const [media, setMedia] = useState<MediaState | null>(null);
  const [claude, setClaude] = useState<ClaudeState>({ connected: false, sessions: [] });
  const [expanded, setExpanded] = useState(false);
  const [alert, setAlert] = useState<ClaudeSession | null>(null);
  const accent = useArtColor(media?.art);
  const timer = useRef<number | undefined>(undefined);
  const prevStatus = useRef(new Map<string, string>());

  useEffect(() => {
    const off = api.onMedia(setMedia);
    api.state().then((s) => {
      if (s.media) setMedia((m) => m ?? s.media);
      if (s.claude) setClaude((c) => (c.sessions.length ? c : s.claude!));
    });
    return off;
  }, []);
  useEffect(
    () =>
      api.onClaude((state) => {
        setClaude(state);
        // A session that just started needing you, finished or failed pops the island open briefly.
        for (const s of state.sessions) {
          const before = prevStatus.current.get(s.id);
          if (before && before !== s.status && (s.status === "waiting" || s.status === "done" || s.status === "error")) setAlert(s);
          prevStatus.current.set(s.id, s.status);
        }
      }),
    [],
  );
  useEffect(() => {
    if (!alert) return;
    const id = setTimeout(() => setAlert(null), ALERT_MS);
    return () => clearTimeout(id);
  }, [alert]);

  // Measure the expanded content so the island springs to its exact height.
  const content = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState(160);
  useLayoutEffect(() => {
    const el = content.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContentH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded]);

  const enter = () => {
    api.setInteractive(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setExpanded(true), 70);
  };
  const leave = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { setExpanded(false); api.setInteractive(false); }, 260);
  };

  const lead = leadSession(claude.sessions);
  const busy = lead && (lead.status === "working" || lead.status === "waiting" || lead.status === "error") ? lead : null;
  const music = media?.title ? media : null;

  // What the closed island shows, and how wide it is.
  type View = "expanded" | "alert" | "music" | "claude" | "idle";
  const view: View = expanded ? "expanded" : alert ? "alert" : music ? "music" : busy ? "claude" : "idle";
  const width = { expanded: 460, alert: 340, music: 272, claude: 252, idle: 168 }[view];
  const height = view === "expanded" ? contentH : view === "alert" ? 52 : COMPACT_H;
  const radius = view === "expanded" ? 34 : view === "alert" ? 26 : COMPACT_H / 2;
  // Music and an active Claude session at once: Claude gets its own bubble, like the iPhone's split island.
  const bubble = view === "music" && busy;

  return (
    <div className="stage" style={{ "--accent": accent } as CSSProperties}>
      <div className="anchor">
        <motion.div
          className="island"
          onPointerEnter={enter}
          onPointerLeave={leave}
          initial={false}
          animate={{ width, height, borderRadius: radius }}
          transition={SPRING}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {view === "expanded" && (
              <motion.div key="expanded" ref={content} {...FADE} style={{ width: 460 }}>
                <Expanded media={music} claude={claude} accent={accent} onConnect={() => api.connectClaude()} />
              </motion.div>
            )}
            {view === "alert" && alert && (
              <motion.div key={"alert" + alert.id + alert.status} className="compact compact--claude" {...FADE} style={{ width }}>
                <Spark size={18} className="spark" />
                <span className="compact__label" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{alert.project}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                  <span className={`dot dot--${alert.status}`} />
                  <span className="compact__label" style={{ color: "var(--text-2)", fontWeight: 500 }}>{alert.message && alert.status !== "done" ? alert.message : STATUS_TEXT[alert.status]}</span>
                </span>
              </motion.div>
            )}
            {view === "music" && music && (
              <motion.div key={"music" + music.title} className="compact" {...FADE} style={{ width }}>
                {music.art ? <img className="compact__art" src={music.art} alt="" /> : <span className="compact__art" style={{ background: "#1c1c1e" }} />}
                <Bars playing={music.playing} />
              </motion.div>
            )}
            {view === "claude" && busy && (
              <motion.div key={"claude" + busy.status} className="compact compact--claude" {...FADE} style={{ width }}>
                <Spark size={16} className={`spark${busy.status === "working" ? " spark--working" : ""}`} />
                <span className="compact__label" style={{ color: busy.status === "waiting" ? "var(--waiting)" : "var(--text)" }}>
                  {busy.status === "working" ? busy.tool ?? "Working" : STATUS_TEXT[busy.status]}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {bubble && (
            <motion.div
              key="bubble"
              className="bubble"
              onPointerEnter={enter}
              onPointerLeave={leave}
              initial={{ scale: 0.2, opacity: 0, x: -24 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.2, opacity: 0, x: -24 }}
              transition={SPRING}
              style={{ width: COMPACT_H, height: COMPACT_H, borderRadius: COMPACT_H / 2 }}
            >
              {busy.status === "working" ? <Spark size={16} className="spark spark--working" /> : <span className={`dot dot--${busy.status}`} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
