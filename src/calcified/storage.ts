// 存储层：localStorage 持久化，重开页面后从上次记录继续处理

import { CanalRecord, seedRecords } from "./model";

const STORAGE_KEY = "hxwl04.calcified-canals.v1";

function freshSeed(): CanalRecord[] {
  return JSON.parse(JSON.stringify(seedRecords)) as CanalRecord[];
}

function isCanalRecord(value: unknown): value is CanalRecord {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === "string" &&
    typeof rec.tooth === "string" &&
    typeof rec.canal === "string" &&
    typeof rec.filmNo === "string" &&
    Array.isArray(rec.locationHistory)
  );
}

export function loadRecords(): CanalRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshSeed();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return freshSeed();
    const valid = parsed.filter(isCanalRecord);
    return valid.length > 0 ? valid : freshSeed();
  } catch {
    return freshSeed();
  }
}

export function saveRecords(records: CanalRecord[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 存储不可用时静默失败，页面内状态仍可继续操作
  }
}

export function resetRecords(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略
  }
}
