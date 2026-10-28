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
