import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { ClaudeState, IslandApi, MediaCommand, MediaState, Notice, OpenApp, SystemCommand, SystemState } from "../shared/types";

function listen<T>(channel: string, cb: (value: T) => void) {
  const handler = (_e: IpcRendererEvent, value: T) => cb(value);
  ipcRenderer.on(channel, handler);
  return () => { ipcRenderer.removeListener(channel, handler); };
}

const api: IslandApi = {
  onMedia: (cb) => listen<MediaState>("media", cb),
  onClaude: (cb) => listen<ClaudeState>("claude", cb),
  onSystem: (cb) => listen<SystemState>("system", cb),
  onNotice: (cb) => listen<Notice>("notice", cb),
  onOpened: (cb) => listen<OpenApp>("opened", cb),
  media: (command: MediaCommand) => ipcRenderer.send("media", command),
  system: (command: SystemCommand) => ipcRenderer.send("system", command),
  setInteractive: (on) => ipcRenderer.send("interactive", on),
  connectClaude: () => ipcRenderer.invoke("connect-claude"),
  quit: () => ipcRenderer.send("quit"),
  state: () => ipcRenderer.invoke("state"),
};

contextBridge.exposeInMainWorld("island", api);
