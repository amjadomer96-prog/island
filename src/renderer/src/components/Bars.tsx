/** Sound bars that move while music plays and rest when it pauses. */
export const Bars = ({ playing }: { playing: boolean }) => (
  <span className={`bars${playing ? "" : " bars--paused"}`} aria-hidden><span /><span /><span /><span /></span>
);
