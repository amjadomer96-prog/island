// What's playing, from resources/media.ps1, which reads Windows' system media controls.
// Any player that shows up in the Windows volume flyout works, with no sign-in.
import type { MediaCommand, MediaState } from "../shared/types";
import { runHelper } from "./helper";

const EMPTY: MediaState = { playing: false, title: null, position: 0, duration: 0, at: 0, art: null };

export function startMedia(onChange: (state: MediaState) => void) {
  let state: MediaState = EMPTY;
  const arts = new Map<string, string | null>();

  const helper = runHelper("media.ps1", [], (msg) => {
    if (msg.type === "art") {
      arts.set(String(msg.key), msg.art ?? null);
      if (arts.size > 20) arts.delete(arts.keys().next().value!);
      return;
    }
    if (msg.type !== "state") return;
    state = msg.title
      ? {
          playing: !!msg.playing,
          title: String(msg.title),
          artist: msg.artist || undefined,
          album: msg.album || undefined,
          app: msg.app || undefined,
          position: Number(msg.position) || 0,
          duration: Number(msg.duration) || 0,
          at: Date.now(),
          art: arts.get(String(msg.key)) ?? null,
        }
      : { ...EMPTY, at: Date.now() };
    onChange(state);
  });

  return {
    get: () => state,
    command(cmd: MediaCommand) {
      helper.send(cmd);
      // Show the change right away; the helper confirms it within a second.
      if (cmd === "toggle" && state.title) {
        state = { ...state, playing: !state.playing, position: state.position + (state.playing ? Date.now() - state.at : 0), at: Date.now() };
        onChange(state);
      }
    },
    stop: helper.stop,
  };
}
