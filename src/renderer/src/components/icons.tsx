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
