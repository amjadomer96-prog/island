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
  noticeSound: true,
  notchSize: 1,
};

// The notch size zooms the whole island, from 80% to 140% in steps of 5%.
const notchSize = (n: number) => (Number.isFinite(n) ? Math.min(1.4, Math.max(0.8, Math.round(n * 20) / 20)) : 1);

let current: Settings = DEFAULTS;

export function loadSettings() {
  current = readJson("settings.json", DEFAULTS);
  current.notchSize = notchSize(current.notchSize);
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
  next.notchSize = notchSize(next.notchSize);
  current = next;
  writeJson("settings.json", current);
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: current.launchAtLogin });
  return current;
}
