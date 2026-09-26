// 判断层：观察区判定、预备放行条件、记录变更规则（全部为纯函数，不碰存储与页面）

import { CanalRecord, LocationChange, TempSeal } from "./model";

export type Zone = "observation" | "ready" | "preparing";

export const ZONE_LABEL: Record<Zone, string> = {
  observation: "观察区",
  ready: "待预备",
  preparing: "预备中·冻结",
};

export type MutationResult =
  | { ok: true; record: CanalRecord }
  | { ok: false; error: string };

const FROZEN_ERROR = "根管已进入镍钛预备，记录已冻结";

/** 影像提示穿孔风险或超声工作尖已用过一次 → 需留观察区 */
export function needsObservation(rec: CanalRecord): boolean {
  return rec.perforationRisk || rec.ultrasonicTipUsed;
}

/** 分区由记录推导，不单独存储 */
export function zoneOf(rec: CanalRecord): Zone {
  if (rec.prepStarted) return "preparing";
  if (needsObservation(rec) && !rec.doctorConfirmed) return "observation";
  return "ready";
}

export function isFrozen(rec: CanalRecord): boolean {
  return rec.prepStarted;
}

export function canEnterPrep(rec: CanalRecord): { ok: boolean; reason?: string } {
  if (rec.prepStarted) return { ok: false, reason: "已进入镍钛预备" };
  if (!rec.locationResult.trim()) return { ok: false, reason: "尚未填写根管口定位结果" };
  if (zoneOf(rec) === "observation") {
    return { ok: false, reason: "观察区根管需医生确认根管口后解锁" };
  }
  return { ok: true };
}

function touch(rec: CanalRecord): CanalRecord {
  return { ...rec, updatedAt: new Date().toISOString() };
}

function fail(error: string): MutationResult {
  return { ok: false, error };
}

function guardFrozen(rec: CanalRecord): MutationResult | null {
  return rec.prepStarted ? fail(FROZEN_ERROR) : null;
}

export function updateFilmNo(rec: CanalRecord, filmNo: string): MutationResult {
  const blocked = guardFrozen(rec);
  if (blocked) return blocked;
  const value = filmNo.trim();
  if (!value) return fail("术前片号不能为空");
  return { ok: true, record: touch({ ...rec, filmNo: value }) };
}

export function updatePatencyDepth(rec: CanalRecord, depthMm: number | null): MutationResult {
  const blocked = guardFrozen(rec);
  if (blocked) return blocked;
  if (depthMm !== null && (!Number.isFinite(depthMm) || depthMm <= 0 || depthMm > 30)) {
    return fail("初始通畅深度需在 0–30mm 之间");
  }
  return { ok: true, record: touch({ ...rec, patencyDepthMm: depthMm }) };
}

export function updateTempSeal(rec: CanalRecord, tempSeal: TempSeal): MutationResult {
  const blocked = guardFrozen(rec);
  if (blocked) return blocked;
  return { ok: true, record: touch({ ...rec, tempSeal }) };
}

export function updateRiskFlags(
  rec: CanalRecord,
  flags: Partial<Pick<CanalRecord, "perforationRisk" | "ultrasonicTipUsed">>
): MutationResult {
  const blocked = guardFrozen(rec);
  if (blocked) return blocked;
  return { ok: true, record: touch({ ...rec, ...flags }) };
}

/** 修改定位结果：已有旧值时必须填写原因，旧值与原因留痕 */
export function changeLocationResult(
  rec: CanalRecord,
  next: string,
  reason: string
): MutationResult {
  const blocked = guardFrozen(rec);
  if (blocked) return blocked;
  const value = next.trim();
  if (!value) return fail("定位结果不能为空");
  const previous = rec.locationResult.trim();
  if (value === previous) return fail("定位结果未变化");
  let locationHistory = rec.locationHistory;
  if (previous) {
    const why = reason.trim();
    if (!why) return fail("修改定位结果必须填写原因，旧值将留痕保存");
    const entry: LocationChange = {
      from: rec.locationResult,
      to: value,
      reason: why,
      at: new Date().toISOString(),
    };
    locationHistory = [...locationHistory, entry];
  }
  return { ok: true, record: touch({ ...rec, locationResult: value, locationHistory }) };
}

/** 医生确认根管口 → 观察区解锁 */
export function confirmOrifice(rec: CanalRecord, doctor: string): MutationResult {
  const blocked = guardFrozen(rec);
  if (blocked) return blocked;
  if (zoneOf(rec) !== "observation") return fail("仅观察区根管需要医生确认解锁");
  if (!rec.locationResult.trim()) return fail("请先填写根管口定位结果，再由医生确认");
  const name = doctor.trim();
  if (!name) return fail("请填写确认医生姓名");
  return {
    ok: true,
    record: touch({
      ...rec,
      doctorConfirmed: true,
      confirmedBy: name,
      confirmedAt: new Date().toISOString(),
    }),
  };
}

/** 进入镍钛预备 → 记录冻结 */
export function enterPrep(rec: CanalRecord): MutationResult {
  const check = canEnterPrep(rec);
  if (!check.ok) return fail(check.reason ?? "当前状态不能进入镍钛预备");
  return {
    ok: true,
    record: touch({ ...rec, prepStarted: true, prepStartedAt: new Date().toISOString() }),
  };
}

export interface BoardMetrics {
  total: number;
  observation: number;
  ready: number;
  preparing: number;
  avgDepth: number | null;
}

/** 顶部指标：与筛选列表、牙位详情读同一份记录 */
export function boardMetrics(records: CanalRecord[]): BoardMetrics {
  let observation = 0;
  let ready = 0;
  let preparing = 0;
  let depthSum = 0;
  let depthCount = 0;
  for (const rec of records) {
    const zone = zoneOf(rec);
    if (zone === "observation") observation += 1;
    else if (zone === "ready") ready += 1;
    else preparing += 1;
    if (rec.patencyDepthMm !== null) {
      depthSum += rec.patencyDepthMm;
      depthCount += 1;
    }
  }
  return {
    total: records.length,
    observation,
    ready,
    preparing,
    avgDepth: depthCount > 0 ? depthSum / depthCount : null,
  };
}
