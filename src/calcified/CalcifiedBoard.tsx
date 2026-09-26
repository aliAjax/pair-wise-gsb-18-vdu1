// 页面层：钙化根管通路台。指标、筛选列表、牙位详情读同一份 records 状态

import { useEffect, useMemo, useState } from "react";
import {
  buildRecord,
  CanalRecord,
  NewRecordDraft,
  TEMP_SEALS,
  TempSeal,
} from "./model";
import {
  boardMetrics,
  canEnterPrep,
  changeLocationResult,
  confirmOrifice,
  enterPrep,
  isFrozen,
  MutationResult,
  updateFilmNo,
  updatePatencyDepth,
  updateRiskFlags,
  updateTempSeal,
  ZONE_LABEL,
  zoneOf,
  Zone,
} from "./rules";
import { loadRecords, resetRecords, saveRecords } from "./storage";

type FilterKey = "all" | Zone | "risk";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "observation", label: "观察区" },
  { key: "ready", label: "待预备" },
  { key: "preparing", label: "预备中·冻结" },
  { key: "risk", label: "穿孔风险" },
];

function matchesFilter(rec: CanalRecord, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "risk") return rec.perforationRisk;
  return zoneOf(rec) === filter;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("zh-CN", { hour12: false });
}

function RecordRow({
  record,
  active,
  onSelect,
}: {
  record: CanalRecord;
  active: boolean;
  onSelect: () => void;
}) {
  const zone = zoneOf(record);
  return (
    <button
      type="button"
      className={"record-row" + (active ? " active" : "")}
      onClick={onSelect}
    >
      <span className="row-top">
        <strong>
          {record.tooth} · {record.canal}
        </strong>
        <span className={"zone-badge zone-" + zone}>{ZONE_LABEL[zone]}</span>
      </span>
      <span className="row-meta">
        <span>片号 {record.filmNo}</span>
        <span>
          通畅 {record.patencyDepthMm === null ? "未测" : `${record.patencyDepthMm}mm`}
        </span>
        <span>{record.tempSeal}</span>
      </span>
      <span className="row-meta">
        {record.perforationRisk && <span className="flag">穿孔风险</span>}
        {record.ultrasonicTipUsed && <span className="flag">超声尖已用</span>}
        {record.doctorConfirmed && <span className="flag flag-ok">已确认解锁</span>}
        {!record.locationResult && <span className="flag flag-neutral">未定位</span>}
      </span>
    </button>
  );
}

function NewRecordForm({ onAdd }: { onAdd: (draft: NewRecordDraft) => string | null }) {
  const [tooth, setTooth] = useState("");
  const [canal, setCanal] = useState("");
  const [filmNo, setFilmNo] = useState("");
  const [perforationRisk, setPerforationRisk] = useState(false);
  const [ultrasonicTipUsed, setUltrasonicTipUsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!tooth.trim() || !canal.trim()) {
      setError("请填写牙位和根管");
      return;
    }
    if (!filmNo.trim()) {
      setError("请填写术前片号");
      return;
    }
    const err = onAdd({
      tooth: tooth.trim(),
      canal: canal.trim(),
      filmNo: filmNo.trim(),
      perforationRisk,
      ultrasonicTipUsed,
    });
    setError(err);
    if (!err) {
      setTooth("");
      setCanal("");
      setFilmNo("");
      setPerforationRisk(false);
      setUltrasonicTipUsed(false);
    }
  };

  return (
    <div className="new-record">
      <strong>登记钙化根管</strong>
      <div className="new-record-grid">
        <input
          value={tooth}
          placeholder="牙位，如 #36"
          onChange={(e) => setTooth(e.target.value)}
        />
        <input
          value={canal}
          placeholder="根管，如 MB"
          onChange={(e) => setCanal(e.target.value)}
        />
      </div>
      <input
        value={filmNo}
        placeholder="术前片号"
        onChange={(e) => setFilmNo(e.target.value)}
      />
      <div className="check-line">
        <label>
          <input
            type="checkbox"
            checked={perforationRisk}
            onChange={(e) => setPerforationRisk(e.target.checked)}
          />
          影像提示穿孔风险
        </label>
        <label>
          <input
            type="checkbox"
            checked={ultrasonicTipUsed}
            onChange={(e) => setUltrasonicTipUsed(e.target.checked)}
          />
          超声工作尖已用过一次
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="primary-action" onClick={submit}>
        登记
      </button>
    </div>
  );
}

function RecordDetail({
  record,
  apply,
}: {
  record: CanalRecord;
  apply: (id: string, mutate: (rec: CanalRecord) => MutationResult) => boolean;
}) {
  const frozen = isFrozen(record);
  const zone = zoneOf(record);
  const prepCheck = canEnterPrep(record);
  const [filmNo, setFilmNo] = useState(record.filmNo);
  const [depthText, setDepthText] = useState(
    record.patencyDepthMm === null ? "" : String(record.patencyDepthMm)
  );
  const [nextLocation, setNextLocation] = useState("");
  const [reason, setReason] = useState("");
  const [doctor, setDoctor] = useState("");

  const obsReasons = [
    record.perforationRisk && "影像提示穿孔风险",
    record.ultrasonicTipUsed && "超声工作尖已用过一次",
  ]
    .filter(Boolean)
    .join("、");

  const saveDepth = () => {
    const text = depthText.trim();
    if (text === "") {
      apply(record.id, (r) => updatePatencyDepth(r, null));
      return;
    }
    apply(record.id, (r) => updatePatencyDepth(r, Number(text)));
  };

  const saveLocation = () => {
    const ok = apply(record.id, (r) => changeLocationResult(r, nextLocation, reason));
    if (ok) {
      setNextLocation("");
      setReason("");
    }
  };

  const startPrep = () => {
    if (!window.confirm("进入镍钛预备后该根管记录将冻结，确认进入？")) return;
    apply(record.id, (r) => enterPrep(r));
  };

  return (
    <div className="detail">
      <div className="row-top detail-head">
        <h3>
          {record.tooth} · {record.canal}
        </h3>
        <span className={"zone-badge zone-" + zone}>{ZONE_LABEL[zone]}</span>
      </div>

      {frozen && (
        <p className="banner-frozen">
          已进入镍钛预备（{fmtTime(record.prepStartedAt ?? record.updatedAt)}），记录冻结，仅供查看。
        </p>
      )}
      {!frozen && zone === "observation" && (
        <p className="banner-obs">观察区：{obsReasons}。医生确认根管口前不得进入镍钛预备。</p>
      )}

      <div className="detail-grid">
        <label>
          <span>术前片号</span>
          <span className="field-row">
            <input
              value={filmNo}
              disabled={frozen}
              onChange={(e) => setFilmNo(e.target.value)}
            />
            <button
              type="button"
              disabled={frozen}
              onClick={() => apply(record.id, (r) => updateFilmNo(r, filmNo))}
            >
              保存
            </button>
          </span>
        </label>

        <label>
          <span>初始通畅深度（mm）</span>
          <span className="field-row">
            <input
              value={depthText}
              disabled={frozen}
              placeholder="未测"
              inputMode="decimal"
              onChange={(e) => setDepthText(e.target.value)}
            />
            <button type="button" disabled={frozen} onClick={saveDepth}>
              保存
            </button>
          </span>
        </label>

        <label>
          <span>暂封状态</span>
          <select
            value={record.tempSeal}
            disabled={frozen}
            onChange={(e) =>
              apply(record.id, (r) => updateTempSeal(r, e.target.value as TempSeal))
            }
          >
            {TEMP_SEALS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="field-label">风险标记</span>
          <div className="check-line">
            <label>
              <input
                type="checkbox"
                checked={record.perforationRisk}
                disabled={frozen}
                onChange={(e) =>
                  apply(record.id, (r) =>
                    updateRiskFlags(r, { perforationRisk: e.target.checked })
                  )
                }
              />
              影像提示穿孔风险
            </label>
            <label>
              <input
                type="checkbox"
                checked={record.ultrasonicTipUsed}
                disabled={frozen}
                onChange={(e) =>
                  apply(record.id, (r) =>
                    updateRiskFlags(r, { ultrasonicTipUsed: e.target.checked })
                  )
                }
              />
              超声工作尖已用过一次
            </label>
          </div>
        </div>

        <div className="detail-full">
          <span className="field-label">根管口定位结果</span>
          <p className="location-current">{record.locationResult || "（未定位）"}</p>
          {record.doctorConfirmed && (
            <p className="muted-text">
              医生 {record.confirmedBy} 已于 {fmtTime(record.confirmedAt ?? "")}{" "}
              确认根管口。
            </p>
          )}
          {!frozen && (
            <div className="field-row location-edit">
              <input
                value={nextLocation}
                placeholder="新的定位结果"
                onChange={(e) => setNextLocation(e.target.value)}
              />
              <input
                value={reason}
                placeholder="修改原因（改结果必填）"
                onChange={(e) => setReason(e.target.value)}
              />
              <button type="button" onClick={saveLocation}>
                保存
              </button>
            </div>
          )}
          {record.locationHistory.length > 0 && (
            <ul className="history-list">
              {record.locationHistory.map((h, i) => (
                <li key={`${h.at}-${i}`}>
                  「{h.from}」→「{h.to}」 · {h.reason} · {fmtTime(h.at)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="detail-actions">
        {zone === "observation" && (
          <>
            <input
              className="doctor-input"
              value={doctor}
              placeholder="确认医生姓名"
              onChange={(e) => setDoctor(e.target.value)}
            />
            <button
              type="button"
              className="primary-action"
              onClick={() => apply(record.id, (r) => confirmOrifice(r, doctor))}
            >
              确认根管口并解锁
            </button>
            <span className="muted-text">解锁后方可进入镍钛预备</span>
          </>
        )}
        {zone === "ready" && (
          <>
            <button
              type="button"
              className="primary-action"
              disabled={!prepCheck.ok}
              onClick={startPrep}
            >
              进入镍钛预备（冻结记录）
            </button>
            {!prepCheck.ok && <span className="muted-text">{prepCheck.reason}</span>}
          </>
        )}
      </div>

      <p className="muted-text detail-updated">最近更新：{fmtTime(record.updatedAt)}</p>
    </div>
  );
}

export default function CalcifiedBoard() {
  const [records, setRecords] = useState<CanalRecord[]>(() => loadRecords());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  const apply = (
    id: string,
    mutate: (rec: CanalRecord) => MutationResult
  ): boolean => {
    const target = records.find((r) => r.id === id);
    if (!target) return false;
    const res = mutate(target);
    if (!res.ok) {
      setLastError(res.error);
      return false;
    }
    setLastError(null);
    setRecords((prev) => prev.map((r) => (r.id === id ? res.record : r)));
    return true;
  };

  const addRecord = (draft: NewRecordDraft): string | null => {
    const rec = buildRecord(draft);
    if (records.some((r) => r.id === rec.id)) return "该牙位根管已登记，请勿重复";
    setLastError(null);
    setRecords((prev) => [...prev, rec]);
    setSelectedId(rec.id);
    return null;
  };

  const resetAll = () => {
    if (!window.confirm("恢复示例数据将清空当前全部改动，确认重置？")) return;
    resetRecords();
    setRecords(loadRecords());
    setSelectedId(null);
    setLastError(null);
  };

  const metrics = useMemo(() => boardMetrics(records), [records]);
  const filtered = useMemo(
    () => records.filter((r) => matchesFilter(r, filter)),
    [records, filter]
  );
  const selected = records.find((r) => r.id === selectedId) ?? null;

  return (
    <section className="panel station">
      <div className="section-heading">
        <div>
          <p>钙化根管通路台</p>
          <h2>根管口定位 · 观察放行 · 镍钛预备</h2>
        </div>
        <button type="button" onClick={resetAll}>
          重置示例数据
        </button>
      </div>

      <div className="station-metrics">
        <div className="station-metric">
          <span>观察区根管</span>
          <strong>{metrics.observation}</strong>
        </div>
        <div className="station-metric">
          <span>待预备</span>
          <strong>{metrics.ready}</strong>
        </div>
        <div className="station-metric">
          <span>预备中（冻结）</span>
          <strong>{metrics.preparing}</strong>
        </div>
        <div className="station-metric">
          <span>平均初始通畅深度</span>
          <strong>
            {metrics.avgDepth === null ? "—" : `${metrics.avgDepth.toFixed(1)} mm`}
          </strong>
        </div>
      </div>

      <div className="chips station-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={filter === f.key ? "chip-active" : ""}
            onClick={() => setFilter(f.key)}
          >
            {f.label} · {records.filter((r) => matchesFilter(r, f.key)).length}
          </button>
        ))}
      </div>

      {lastError && <p className="form-error">{lastError}</p>}

      <div className="station-columns">
        <div>
          <NewRecordForm onAdd={addRecord} />
          <div className="station-list">
            {filtered.length === 0 && (
              <p className="muted-text">当前筛选下没有根管记录。</p>
            )}
            {filtered.map((rec) => (
              <RecordRow
                key={rec.id}
                record={rec}
                active={rec.id === selectedId}
                onSelect={() => setSelectedId(rec.id)}
              />
            ))}
          </div>
        </div>
        {selected ? (
          <RecordDetail key={selected.id} record={selected} apply={apply} />
        ) : (
          <div className="detail detail-empty muted-text">
            从左侧列表选择牙位，或登记新的钙化根管。
          </div>
        )}
      </div>
    </section>
  );
}
