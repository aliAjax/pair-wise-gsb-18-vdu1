// 数据层：钙化根管通路台的记录模型与初始示例数据

export type TempSeal = "未暂封" | "已暂封" | "暂封脱落";

export const TEMP_SEALS: readonly TempSeal[] = ["未暂封", "已暂封", "暂封脱落"];

/** 定位结果修改留痕：保留旧值与修改原因 */
export interface LocationChange {
  from: string;
  to: string;
  reason: string;
  at: string;
}

/** 单个牙位根管的登记记录 */
export interface CanalRecord {
  id: string;
  tooth: string; // 牙位，如 #36
  canal: string; // 根管，如 MB
  filmNo: string; // 术前片号
  perforationRisk: boolean; // 影像提示穿孔风险
  ultrasonicTipUsed: boolean; // 超声工作尖已用过一次
  locationResult: string; // 根管口定位结果
  locationHistory: LocationChange[]; // 定位结果修改留痕
  patencyDepthMm: number | null; // 初始通畅深度（mm），null 表示未测
  tempSeal: TempSeal; // 暂封状态
  doctorConfirmed: boolean; // 医生已确认根管口
  confirmedBy: string | null;
  confirmedAt: string | null;
  prepStarted: boolean; // 已进入镍钛预备（记录冻结）
  prepStartedAt: string | null;
  updatedAt: string;
}

export interface NewRecordDraft {
  tooth: string;
  canal: string;
  filmNo: string;
  perforationRisk: boolean;
  ultrasonicTipUsed: boolean;
}

export function buildRecord(draft: NewRecordDraft): CanalRecord {
  return {
    id: `${draft.tooth}-${draft.canal}`.replace(/\s+/g, ""),
    tooth: draft.tooth,
    canal: draft.canal,
    filmNo: draft.filmNo,
    perforationRisk: draft.perforationRisk,
    ultrasonicTipUsed: draft.ultrasonicTipUsed,
    locationResult: "",
    locationHistory: [],
    patencyDepthMm: null,
    tempSeal: "未暂封",
    doctorConfirmed: false,
    confirmedBy: null,
    confirmedAt: null,
    prepStarted: false,
    prepStartedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export const seedRecords: CanalRecord[] = [
  {
    id: "36-MB",
    tooth: "#36",
    canal: "MB",
    filmNo: "RVG-260918-01",
    perforationRisk: true,
    ultrasonicTipUsed: false,
    locationResult: "髓室底偏近中，DG16探及根管口",
    locationHistory: [
      {
        from: "近中舌侧钙化点",
        to: "髓室底偏近中，DG16探及根管口",
        reason: "CBCT复核后修正定位",
        at: "2026-09-24T02:10:00.000Z",
      },
    ],
    patencyDepthMm: 8.5,
    tempSeal: "已暂封",
    doctorConfirmed: false,
    confirmedBy: null,
    confirmedAt: null,
    prepStarted: false,
    prepStartedAt: null,
    updatedAt: "2026-09-24T02:10:00.000Z",
  },
  {
    id: "36-DB",
    tooth: "#36",
    canal: "DB",
    filmNo: "RVG-260918-01",
    perforationRisk: false,
    ultrasonicTipUsed: true,
    locationResult: "",
    locationHistory: [],
    patencyDepthMm: null,
    tempSeal: "未暂封",
    doctorConfirmed: false,
    confirmedBy: null,
    confirmedAt: null,
    prepStarted: false,
    prepStartedAt: null,
    updatedAt: "2026-09-23T08:40:00.000Z",
  },
  {
    id: "46-MB",
    tooth: "#46",
    canal: "MB",
    filmNo: "RVG-260922-03",
    perforationRisk: false,
    ultrasonicTipUsed: false,
    locationResult: "近中颊根管口清晰可探",
    locationHistory: [],
    patencyDepthMm: 14.2,
    tempSeal: "未暂封",
    doctorConfirmed: false,
    confirmedBy: null,
    confirmedAt: null,
    prepStarted: false,
    prepStartedAt: null,
    updatedAt: "2026-09-22T06:15:00.000Z",
  },
  {
    id: "11-单根管",
    tooth: "#11",
    canal: "单根管",
    filmNo: "PA-260920-11",
    perforationRisk: false,
    ultrasonicTipUsed: false,
    locationResult: "根管口位于髓室中央",
    locationHistory: [],
    patencyDepthMm: 16.0,
    tempSeal: "已暂封",
    doctorConfirmed: false,
    confirmedBy: null,
    confirmedAt: null,
    prepStarted: true,
    prepStartedAt: "2026-09-21T03:05:00.000Z",
    updatedAt: "2026-09-21T03:05:00.000Z",
  },
  {
    id: "26-MB2",
    tooth: "#26",
    canal: "MB2",
    filmNo: "CBCT-260919-26",
    perforationRisk: true,
    ultrasonicTipUsed: true,
    locationResult: "MB2位于MB腭侧约1.5mm",
    locationHistory: [],
    patencyDepthMm: 6.8,
    tempSeal: "已暂封",
    doctorConfirmed: true,
    confirmedBy: "王医生",
    confirmedAt: "2026-09-25T01:30:00.000Z",
    prepStarted: false,
    prepStartedAt: null,
    updatedAt: "2026-09-25T01:30:00.000Z",
  },
  {
    id: "47-D",
    tooth: "#47",
    canal: "D",
    filmNo: "RVG-260925-02",
    perforationRisk: true,
    ultrasonicTipUsed: true,
    locationResult: "远中根管口探及，走向偏远中",
    locationHistory: [],
    patencyDepthMm: 10.4,
    tempSeal: "暂封脱落",
    doctorConfirmed: false,
    confirmedBy: null,
    confirmedAt: null,
    prepStarted: false,
    prepStartedAt: null,
    updatedAt: "2026-09-25T09:20:00.000Z",
  },
];
