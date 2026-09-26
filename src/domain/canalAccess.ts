/**
 * 钙化根管通路台 —— 数据层
 * 只放类型定义、常量与初始示例数据，不含判断逻辑。
 */

export type CanalStage = "observation" | "ready" | "prep";

export type TempSealStatus = "未暂封" | "已暂封" | "暂封松动";

/** 定位结果修改留痕：旧值、新值、原因、时间 */
export interface LocationRevision {
  from: string;
  to: string;
  reason: string;
  changedAt: string;
}

/** 每个牙位下每根钙化根管的一条通路记录 */
export interface CanalAccessRecord {
  id: string;
  tooth: string;
  canal: string;
  /** 术前片号 */
  preOpFilmNo: string;
  /** 影像提示穿孔风险 */
  perforationRisk: boolean;
  /** 超声工作尖已用过一次 */
  ultrasonicTipUsed: boolean;
  /** 根管口定位结果（当前值） */
  locationResult: string;
  /** 定位结果修改历史（旧值 + 原因） */
  locationHistory: LocationRevision[];
  /** 初始通畅深度（mm），未测为 null */
  initialPatencyDepthMm: number | null;
  /** 暂封状态 */
  tempSealStatus: TempSealStatus;
  /** 观察区 / 可预备 / 预备中 */
  stage: CanalStage;
  /** 医生已确认根管口 */
  orificeConfirmed: boolean;
  /** 已进入预备 → 冻结，禁止再改 */
  frozen: boolean;
  updatedAt: string;
}

export const CANAL_STAGE_LABEL: Record<CanalStage, string> = {
  observation: "观察区",
  ready: "可预备",
  prep: "预备中",
};

export const TEMP_SEAL_OPTIONS: TempSealStatus[] = ["未暂封", "已暂封", "暂封松动"];

/** 初始示例数据：覆盖观察区、可预备、预备中（冻结）各分支 */
export const seedCanalRecords: CanalAccessRecord[] = [
  {
    id: "36-MB",
    tooth: "#36",
    canal: "MB（近中颊）",
    preOpFilmNo: "PA-2026-0911",
    perforationRisk: true,
    ultrasonicTipUsed: false,
    locationResult: "髓室底近中偏颊，DG16 探及卡点",
    locationHistory: [],
    initialPatencyDepthMm: 8.5,
    tempSealStatus: "已暂封",
    stage: "observation",
    orificeConfirmed: false,
    frozen: false,
    updatedAt: "2026-09-24T09:20:00.000Z",
  },
  {
    id: "36-DB",
    tooth: "#36",
    canal: "DB（远中颊）",
    preOpFilmNo: "PA-2026-0911",
    perforationRisk: false,
    ultrasonicTipUsed: false,
    locationResult: "远中颊根管口清晰可见",
    locationHistory: [],
    initialPatencyDepthMm: 12.0,
    tempSealStatus: "已暂封",
    stage: "ready",
    orificeConfirmed: true,
    frozen: false,
    updatedAt: "2026-09-24T09:25:00.000Z",
  },
  {
    id: "46-MB",
    tooth: "#46",
    canal: "MB（近中颊）",
    preOpFilmNo: "PA-2026-0918",
    perforationRisk: false,
    ultrasonicTipUsed: true,
    locationResult: "超声工作尖疏通后探及近颊口",
    locationHistory: [
      {
        from: "初诊未探及明显根管口",
        to: "超声工作尖疏通后探及近颊口",
        reason: "超声工作尖第一次使用后复查",
        changedAt: "2026-09-25T02:10:00.000Z",
      },
    ],
    initialPatencyDepthMm: 6.0,
    tempSealStatus: "未暂封",
    stage: "observation",
    orificeConfirmed: false,
    frozen: false,
    updatedAt: "2026-09-25T02:10:00.000Z",
  },
  {
    id: "26-MB2",
    tooth: "#26",
    canal: "MB2（近颊第二根管）",
    preOpFilmNo: "CBCT-2026-0902",
    perforationRisk: true,
    ultrasonicTipUsed: true,
    locationResult: "CBCT 提示 MB2 位于 MB1 腭侧约 1.5mm",
    locationHistory: [],
    initialPatencyDepthMm: null,
    tempSealStatus: "暂封松动",
    stage: "observation",
    orificeConfirmed: false,
    frozen: false,
    updatedAt: "2026-09-23T07:40:00.000Z",
  },
  {
    id: "11-C",
    tooth: "#11",
    canal: "单根管",
    preOpFilmNo: "PA-2026-0830",
    perforationRisk: false,
    ultrasonicTipUsed: false,
    locationResult: "根管口居中，已确认",
    locationHistory: [],
    initialPatencyDepthMm: 15.5,
    tempSealStatus: "已暂封",
    stage: "prep",
    orificeConfirmed: true,
    frozen: true,
    updatedAt: "2026-09-22T06:30:00.000Z",
  },
];
