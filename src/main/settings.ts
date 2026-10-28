import { app } from "electron";
import type { Settings } from "../shared/types";
import { readJson, writeJson } from "./store";

export const DEFAULTS: Settings = {
  notifications: true,
  openedApps: true,
  hud: true,
  battery: true,
  launchAtLogin: false,
  calendarUrl: "",
  timerSound: true,
};

let current: Settings = DEFAULTS;

export function loadSettings() {
  current = readJson("settings.json", DEFAULTS);
  return current;
}

export const getSettings = () => current;

export function saveSettings(patch: Partial<Settings>) {
  // Only known keys, with the right types, are kept.
  const next = { ...current };
  for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (typeof value === typeof DEFAULTS[key]) (next as Record<string, unknown>)[key] = value;
  }
  next.calendarUrl = next.calendarUrl.trim().replace(/^webcal:\/\//i, "https://");
  current = next;
  writeJson("settings.json", current);
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: current.launchAtLogin });
  return current;
}
