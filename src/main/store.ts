// Small JSON files in the app's data folder: settings and the file shelf survive restarts.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { app } from "electron";

export function readJson<T>(name: string, fallback: T): T {
  try {
    const file = join(app.getPath("userData"), name);
    return existsSync(file) ? { ...fallback, ...JSON.parse(readFileSync(file, "utf8")) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(name: string, value: unknown) {
  const file = join(app.getPath("userData"), name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2));
}
