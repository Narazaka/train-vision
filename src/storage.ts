import type { Vision } from "./types";
import { DEFAULT_STYLE, DEFAULT_VISION } from "./defaults";

const CURRENT = "train-vision";
const PRESETS = "train-vision-presets";

/** style にキーが増えても古い保存値で壊れないよう既定値で埋める */
export function normalize(v: Vision): Vision {
  return { ...DEFAULT_VISION, ...v, style: { ...DEFAULT_STYLE, ...v.style } };
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadCurrent(): Vision {
  return normalize(read(CURRENT, DEFAULT_VISION));
}

export function saveCurrent(v: Vision): void {
  localStorage.setItem(CURRENT, JSON.stringify(v));
}

export type Presets = Record<string, Vision>;

export function loadPresets(): Presets {
  return read<Presets>(PRESETS, {});
}

export function savePresets(p: Presets): void {
  localStorage.setItem(PRESETS, JSON.stringify(p));
}
