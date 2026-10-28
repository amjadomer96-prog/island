// Minimal glyphs in the SF Symbols spirit: filled, rounded, drawn on a 24px grid.
type P = { size?: number; className?: string };

export const Play = ({ size = 26 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5.6v12.8c0 .8.9 1.3 1.6.9l10.2-6.4a1 1 0 0 0 0-1.8L9.6 4.7C8.9 4.3 8 4.8 8 5.6Z" /></svg>
);
export const Pause = ({ size = 26 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4.2" height="14" rx="1.4" /><rect x="13.8" y="5" width="4.2" height="14" rx="1.4" /></svg>
);
export const Next = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M3 6.4v11.2c0 .8.9 1.3 1.6.8l8.1-5.6a1 1 0 0 0 0-1.6L4.6 5.6C3.9 5.1 3 5.6 3 6.4Zm9 0v11.2c0 .8.9 1.3 1.6.8l8.1-5.6a1 1 0 0 0 0-1.6l-8.1-5.6c-.7-.5-1.6 0-1.6.8Z" /></svg>
);
export const Previous = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ transform: "scaleX(-1)" }}><path d="M3 6.4v11.2c0 .8.9 1.3 1.6.8l8.1-5.6a1 1 0 0 0 0-1.6L4.6 5.6C3.9 5.1 3 5.6 3 6.4Zm9 0v11.2c0 .8.9 1.3 1.6.8l8.1-5.6a1 1 0 0 0 0-1.6l-8.1-5.6c-.7-.5-1.6 0-1.6.8Z" /></svg>
);
export const Note = ({ size = 26 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M19 3.5v11.6a3 3 0 1 1-2-2.8V8.2l-8 1.8v7.1a3 3 0 1 1-2-2.8V6.6c0-.5.3-.9.8-1l10-2.1c.6-.1 1.2.3 1.2 1Z" /></svg>
);
/** A generic eight-point spark for Claude Code (not Anthropic's logo). */
export const Spark = ({ size = 16, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    {[0, 45, 90, 135].map((a) => <rect key={a} x="10.6" y="2" width="2.8" height="20" rx="1.4" transform={`rotate(${a} 12 12)`} />)}
  </svg>
);
export const Close = ({ size = 12 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const AppIcon = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5" opacity=".9" /></svg>
);
export const Home = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M11.3 3.3a1 1 0 0 1 1.4 0l8 7.6c.6.6.2 1.6-.7 1.6H19v7a1.5 1.5 0 0 1-1.5 1.5H15v-5.5h-6V21H6.5A1.5 1.5 0 0 1 5 19.5v-7H4c-.9 0-1.3-1-.7-1.6l8-7.6Z" /></svg>
);
export const Grid = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="3" y="3" width="8" height="8" rx="2.4" /><rect x="13" y="3" width="8" height="8" rx="2.4" /><rect x="3" y="13" width="8" height="8" rx="2.4" /><rect x="13" y="13" width="8" height="8" rx="2.4" /></svg>
);
export const Bell = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5v3.6l-1.7 3a1 1 0 0 0 .9 1.4h14.6a1 1 0 0 0 .9-1.4l-1.7-3V9A6.5 6.5 0 0 0 12 2.5Zm-2.8 16.5a2.9 2.9 0 0 0 5.6 0Z" /></svg>
);
export const Speaker = ({ size = 16, muted = false, level = 1 }: P & { muted?: boolean; level?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M4 9.2h3.3L12 5.1c.7-.6 1.7-.1 1.7.8v12.2c0 .9-1 1.4-1.7.8l-4.7-4.1H4a1 1 0 0 1-1-1V10.2a1 1 0 0 1 1-1Z" />
    {muted ? (
      <path d="m16.5 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    ) : (
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none">
        {level > 0.02 && <path d="M16.3 9.3a4 4 0 0 1 0 5.4" />}
        {level > 0.4 && <path d="M19 6.8a7.6 7.6 0 0 1 0 10.4" />}
      </g>
    )}
  </svg>
);
export const Sun = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="12" cy="12" r="4.2" />
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d="M12 2.6v2.2" transform={`rotate(${a} 12 12)`} />)}</g>
  </svg>
);
export const Battery = ({ size = 22, percent = 100, charging = false, color = "currentColor" }: P & { percent?: number; charging?: boolean; color?: string }) => (
  <svg width={size} height={size * 0.55} viewBox="0 0 26 14" aria-hidden>
    <rect x="0.75" y="0.75" width="21.5" height="12.5" rx="3.6" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" />
    <rect x="2.5" y="2.5" width={Math.max(1.5, 18 * Math.min(1, percent / 100))} height="9" rx="2" fill={color} />
    <path d="M23.8 5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" fillOpacity=".45" />
    {charging && <path d="M12.6 1.8 8.4 7.6h3.1l-1 4.6 4.3-5.9h-3.1l.9-4.5Z" fill="#fff" stroke="#000" strokeWidth=".6" />}
  </svg>
);
export const Timer = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="13.5" r="7.5" /><path d="M12 13.5V9.5M9.5 2.5h5" /></svg>
);
export const Calendar = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 2.5a1 1 0 0 1 1 1V4.5h8V3.5a1 1 0 1 1 2 0v1h.5A2.5 2.5 0 0 1 21 7v11.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5V7a2.5 2.5 0 0 1 2.5-2.5H6v-1a1 1 0 0 1 1-1ZM5 10v8.5c0 .3.2.5.5.5h13c.3 0 .5-.2.5-.5V10H5Z" /></svg>
);
export const Tray = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M5.6 4h12.8a2 2 0 0 1 1.9 1.4L22 11v7.5a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5V11l1.7-5.6A2 2 0 0 1 5.6 4Zm-1.4 8.5v6c0 .3.2.5.5.5h14.6c.3 0 .5-.2.5-.5v-6h-4.5a3.3 3.3 0 0 1-6.6 0H4.2Zm.3-2h5.3a1 1 0 0 1 1 1 1.2 1.2 0 0 0 2.4 0 1 1 0 0 1 1-1h5.3L18.3 6H5.7l-1.2 4.5Z" /></svg>
);
export const Gear = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M10.4 2.2a1 1 0 0 1 1-.7h1.2a1 1 0 0 1 1 .7l.5 1.8c.5.2 1 .5 1.5.8l1.8-.5a1 1 0 0 1 1.1.4l.6 1a1 1 0 0 1-.1 1.2l-1.3 1.4c.1.5.1 1.1 0 1.7l1.3 1.3a1 1 0 0 1 .1 1.2l-.6 1a1 1 0 0 1-1.1.5l-1.8-.5c-.4.3-1 .6-1.5.8l-.5 1.8a1 1 0 0 1-1 .7h-1.2a1 1 0 0 1-1-.7l-.5-1.8a6 6 0 0 1-1.5-.8l-1.8.5a1 1 0 0 1-1.1-.5l-.6-1a1 1 0 0 1 .1-1.2l1.3-1.3a6 6 0 0 1 0-1.7L4.5 7.6a1 1 0 0 1-.1-1.2l.6-1a1 1 0 0 1 1.1-.4l1.8.5c.5-.3 1-.6 1.5-.8l.5-1.8ZM12 12.2a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Z" transform="translate(0 2.3)" /></svg>
);
export const Headphones = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 3a9 9 0 0 0-9 9v5.5A2.5 2.5 0 0 0 5.5 20H7a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H5v-1a7 7 0 0 1 14 0v1h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1.5a2.5 2.5 0 0 0 2.5-2.5V12a9 9 0 0 0-9-9Z" /></svg>
);
export const Moon = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M20.2 14.6A8.5 8.5 0 0 1 9.4 3.8a.6.6 0 0 0-.8-.7 9.5 9.5 0 1 0 12.3 12.3.6.6 0 0 0-.7-.8Z" /></svg>
);
export const Phone = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7.4 3.2 9.6 3a1 1 0 0 1 1 .7l1.1 3.6a1 1 0 0 1-.3 1L9.9 9.7a11.8 11.8 0 0 0 4.4 4.4l1.4-1.5a1 1 0 0 1 1-.3l3.6 1.1a1 1 0 0 1 .7 1l-.2 2.2a2.5 2.5 0 0 1-2.6 2.3C10.3 18.5 5.5 13.7 5.1 5.8a2.5 2.5 0 0 1 2.3-2.6Z" /></svg>
);
export const Share = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 15V3m0 0L8 7m4-4 4 4M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" /></svg>
);
export const SearchIcon = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
);
