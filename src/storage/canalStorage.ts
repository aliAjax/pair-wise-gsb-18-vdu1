/**
 * 钙化根管通路台 —— 存储层
 * localStorage 持久化：重开页面可继续处理；存储不可用时静默降级为内存数据。
 */

import type { CanalAccessRecord } from "../domain/canalAccess";

const STORAGE_KEY = "hxwl-04:canal-access:v1";

export function loadCanalRecords(fallback: CanalAccessRecord[]): CanalAccessRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed as CanalAccessRecord[];
  } catch {
    return fallback;
  }
}

export function saveCanalRecords(records: CanalAccessRecord[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 存储不可用（隐私模式等）时静默失败，页面仍可使用
  }
}
