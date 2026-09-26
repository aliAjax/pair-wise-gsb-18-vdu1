/**
 * 钙化根管通路台 —— 判断层
 * 纯函数：观察区锁定、解锁、进入预备、定位留痕、登记校验、指标与筛选。
 * 不碰状态、不碰存储，页面拿到 RuleOutcome 后自行落地。
 */

import type { CanalAccessRecord, TempSealStatus } from "./canalAccess";

export interface RuleOutcome {
  ok: boolean;
  message: string;
  /** ok 时携带更新后的记录 */
  record?: CanalAccessRecord;
}

const fail = (message: string): RuleOutcome => ({ ok: false, message });
const pass = (message: string, record: CanalAccessRecord): RuleOutcome => ({
  ok: true,
  message,
  record,
});

/** 必须留在观察区的原因：影像提示穿孔风险 / 超声工作尖已用过一次 */
export function observationReasons(record: CanalAccessRecord): string[] {
  const reasons: string[] = [];
  if (record.perforationRisk) reasons.push("影像提示穿孔风险");
  if (record.ultrasonicTipUsed) reasons.push("超声工作尖已用过一次");
  return reasons;
}

/** 观察区且医生未确认根管口 → 锁定，不能直接进入镍钛预备 */
export function isPrepLocked(record: CanalAccessRecord): boolean {
  return record.stage === "observation" && !record.orificeConfirmed;
}

/** 医生确认根管口 → 观察区解锁为可预备 */
export function confirmOrifice(record: CanalAccessRecord, now: string): RuleOutcome {
  if (record.frozen) return fail("该根管已进入预备，记录已冻结");
  if (record.orificeConfirmed) return fail("根管口已确认过，无需重复确认");
  const next: CanalAccessRecord = {
    ...record,
    orificeConfirmed: true,
    stage: record.stage === "observation" ? "ready" : record.stage,
    updatedAt: now,
  };
  return pass("医生已确认根管口，解锁进入可预备", next);
}

/** 进入镍钛预备：观察区未解锁的根管会被拦下；进入后记录冻结 */
export function enterPrep(record: CanalAccessRecord, now: string): RuleOutcome {
  if (record.frozen || record.stage === "prep") return fail("该根管已在预备中，记录已冻结");
  if (isPrepLocked(record)) {
    const reasons = observationReasons(record).join("、") || "观察区限制";
    return fail(`${reasons}：须医生确认根管口后才能进入镍钛预备`);
  }
  const next: CanalAccessRecord = {
    ...record,
    stage: "prep",
    frozen: true,
    updatedAt: now,
  };
  return pass("已进入镍钛预备，根管记录冻结", next);
}

/** 修改根管口定位结果：旧值与原因自动留痕；冻结记录拒绝修改 */
export function reviseLocation(
  record: CanalAccessRecord,
  nextValue: string,
  reason: string,
  now: string
): RuleOutcome {
  if (record.frozen) return fail("该根管已进入预备，定位结果已冻结，不能再修改");
  const value = nextValue.trim();
  const why = reason.trim();
  if (!value) return fail("请填写新的根管口定位结果");
  if (!why) return fail("请填写修改原因，用于留痕");
  if (value === record.locationResult) return fail("新定位结果与当前一致，无需修改");
  const next: CanalAccessRecord = {
    ...record,
    locationResult: value,
    locationHistory: [
      ...record.locationHistory,
      { from: record.locationResult, to: value, reason: why, changedAt: now },
    ],
    updatedAt: now,
  };
  return pass("定位结果已更新，旧值与原因已留痕", next);
}

export interface RegistrationPatch {
  preOpFilmNo: string;
  initialPatencyDepthMm: number | null;
  tempSealStatus: TempSealStatus;
}

/** 登记信息（术前片号 / 初始通畅深度 / 暂封状态）；冻结记录拒绝修改 */
export function updateRegistration(
  record: CanalAccessRecord,
  patch: RegistrationPatch,
  now: string
): RuleOutcome {
  if (record.frozen) return fail("该根管已进入预备，登记信息已冻结");
  if (!patch.preOpFilmNo.trim()) return fail("术前片号不能为空");
  if (
    patch.initialPatencyDepthMm !== null &&
    (Number.isNaN(patch.initialPatencyDepthMm) || patch.initialPatencyDepthMm < 0)
  ) {
    return fail("初始通畅深度需为不小于 0 的数字");
  }
  const next: CanalAccessRecord = {
    ...record,
    preOpFilmNo: patch.preOpFilmNo.trim(),
    initialPatencyDepthMm: patch.initialPatencyDepthMm,
    tempSealStatus: patch.tempSealStatus,
    updatedAt: now,
  };
  return pass("登记信息已保存", next);
}

export type CanalFilter = "all" | "observation" | "ready" | "prep" | "risk";

export function matchesFilter(record: CanalAccessRecord, filter: CanalFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "observation":
      return record.stage === "observation";
    case "ready":
      return record.stage === "ready";
    case "prep":
      return record.stage === "prep";
    case "risk":
      return record.perforationRisk || record.ultrasonicTipUsed;
  }
}

export interface CanalMetrics {
  total: number;
  observation: number;
  ready: number;
  prep: number;
}

/** 顶部指标：与筛选列表、牙位详情读同一份记录 */
export function summarize(records: CanalAccessRecord[]): CanalMetrics {
  return {
    total: records.length,
    observation: records.filter((r) => r.stage === "observation").length,
    ready: records.filter((r) => r.stage === "ready").length,
    prep: records.filter((r) => r.stage === "prep").length,
  };
}
