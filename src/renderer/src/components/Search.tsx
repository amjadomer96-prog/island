import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { AskEvent, LaunchTarget, SearchResults } from "../../../shared/types";
import { AppIcon, Spark } from "./icons";

const api = window.island;

type Row = { key: string; title: string; subtitle: string; icon: string | null; glyph?: "spark" | "web" | "calc" | "window"; run: () => void };

/**
 * Spotlight in the island: apps, open windows and files as you type, a quick sum, the web, and
 * Ask Claude (the Mac island's Siri). Arrow keys move, Enter opens, Escape closes.
 */
export function Search({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>({ apps: [], windows: [], files: [] });
  const [sel, setSel] = useState(0);
  const [asking, setAsking] = useState<{ id: number; question: string; answer: string; done: boolean; error?: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => { input.current?.focus(); }, [asking === null]);
  // Results follow the typing, a beat behind so each keystroke doesn't start a search.
  useEffect(() => {
    if (!q.trim()) { setResults({ apps: [], windows: [], files: [] }); return; }
    let live = true;
    const id = setTimeout(() => api.search(q).then((r) => { if (live && r) { setResults(r); setSel(0); } }), 110);
    return () => { live = false; clearTimeout(id); };
  }, [q]);
  useEffect(() => api.onAsk((e: AskEvent) => setAsking((a) => (a && a.id === e.id ? { ...a, answer: a.answer + (e.text ?? ""), done: a.done || !!e.done, error: e.error ?? a.error } : a))), []);

  const go = (t: LaunchTarget) => { api.launch(t); onClose(); };
  const ask = () => { const id = Date.now(); setAsking({ id, question: q.trim(), answer: "", done: false }); api.ask(id, q.trim()); };

  const sum = calculate(q);
  const rows: Row[] = q.trim()
    ? [
        ...(sum !== null ? [{ key: "calc", title: format(sum), subtitle: `${q.trim()} · Enter to copy`, icon: null, glyph: "calc" as const, run: () => go({ kind: "copy", text: String(sum) }) }] : []),
        ...results.windows.map((w) => ({ key: "w" + w.hwnd, title: w.name, subtitle: w.title, icon: w.icon ?? null, glyph: "window" as const, run: () => { api.system({ kind: "focus", hwnd: w.hwnd }); onClose(); } })),
        ...results.apps.map((a) => ({ key: "a" + a.id, title: a.name, subtitle: "Application", icon: a.icon, run: () => go({ kind: "app", id: a.id }) })),
        ...results.files.map((f) => ({ key: "f" + f.path, title: f.name, subtitle: f.path, icon: f.icon, run: () => go({ kind: "file", path: f.path }) })),
        { key: "ask", title: `Ask Claude “${q.trim()}”`, subtitle: "Answers here; it can’t change anything on your PC", icon: null, glyph: "spark" as const, run: ask },
        { key: "web", title: `Search the web for “${q.trim()}”`, subtitle: "Google", icon: null, glyph: "web" as const, run: () => go({ kind: "web", query: q.trim() }) },
      ]
    : [];

  const key = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); if (asking) { api.askCancel(); setAsking(null); } else onClose(); return; }
    if (asking) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.max(0, Math.min(rows.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1)));
      setSel(next);
      list.current?.children[next]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") { e.preventDefault(); rows[sel]?.run(); }
  };

  return (
    <div className="search" onKeyDown={key}>
      <div className="search__field">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
        <input ref={input} value={asking ? asking.question : q} readOnly={!!asking} onChange={(e) => setQ(e.target.value)} placeholder="Search, or ask Claude" spellCheck={false} aria-label="Search" />
        {asking && <button type="button" className="search__back" onClick={() => { api.askCancel(); setAsking(null); }}>Back</button>}
      </div>

      {asking ? (
        <div className="answer">
          <div className="answer__who"><Spark size={14} className={`spark${asking.done ? "" : " spark--working"}`} /> Claude</div>
          {asking.error ? <p className="answer__error">{asking.error}</p> : <p className="answer__text">{asking.answer || "Thinking…"}</p>}
          {asking.done && !asking.error && <button type="button" className="pill-btn pill-btn--dark" onClick={() => api.launch({ kind: "copy", text: asking.answer })}>Copy answer</button>}
        </div>
      ) : (
        rows.length > 0 && (
          <div className="results" ref={list} role="listbox" aria-label="Results">
            {rows.map((r, i) => (
              <button type="button" role="option" aria-selected={i === sel} key={r.key} className={`result${i === sel ? " result--on" : ""}`} onMouseEnter={() => setSel(i)} onClick={r.run}>
                <span className="result__icon">{r.icon ? <img src={r.icon} alt="" /> : <Glyph kind={r.glyph} />}</span>
                <span className="result__text"><span className="result__title">{r.title}</span><span className="result__sub">{r.subtitle}</span></span>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function Glyph({ kind }: { kind?: Row["glyph"] }) {
  if (kind === "spark") return <Spark size={18} className="spark" />;
  if (kind === "calc") return <span className="result__calc">=</span>;
  if (kind === "web")
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" /></svg>;
  return <AppIcon size={18} />;
}

const format = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 8 }));

/** "12*(3+4)/2" → 42, or null when it isn't a sum. A small parser, never eval. */
export function calculate(input: string): number | null {
  const s = input.replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/,/g, "");
  if (!/^[\d.+\-*/()%^]+$/.test(s) || !/\d[+\-*/%^]/.test(s)) return null;
  let i = 0;
  const peek = () => s[i];
  const num = (): number => {
    if (peek() === "(") { i++; const v = expr(); if (peek() !== ")") throw 0; i++; return v; }
    if (peek() === "-") { i++; return -num(); }
    const m = s.slice(i).match(/^\d*\.?\d+/);
    if (!m) throw 0;
    i += m[0].length;
    let v = Number(m[0]);
    if (peek() === "%") { i++; v /= 100; }
    return v;
  };
  const pow = (): number => { const b = num(); if (peek() === "^") { i++; return b ** pow(); } return b; };
  const term = (): number => { let v = pow(); while (peek() === "*" || peek() === "/") { const op = s[i++]; const r = pow(); v = op === "*" ? v * r : v / r; } return v; };
  const expr = (): number => { let v = term(); while (peek() === "+" || peek() === "-") { const op = s[i++]; const r = term(); v = op === "+" ? v + r : v - r; } return v; };
  try { const v = expr(); return i === s.length && Number.isFinite(v) ? v : null; } catch { return null; }
}
