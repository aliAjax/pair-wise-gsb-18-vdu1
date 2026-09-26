import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import {
  CANAL_STAGE_LABEL,
  TEMP_SEAL_OPTIONS,
  seedCanalRecords,
  type CanalAccessRecord,
  type TempSealStatus,
} from "./domain/canalAccess";
import {
  confirmOrifice,
  enterPrep,
  isPrepLocked,
  matchesFilter,
  observationReasons,
  reviseLocation,
  summarize,
  updateRegistration,
  type CanalFilter,
  type RuleOutcome,
} from "./domain/canalRules";
import { loadCanalRecords, saveCanalRecords } from "./storage/canalStorage";

const project = {
  id: "hxwl-04",
  port: 5104,
  title: "牙科根管治疗 · 钙化根管通路台",
  subtitle:
    "按牙位登记术前片号、根管口定位结果、初始通畅深度与暂封状态；观察区根管须医生确认根管口后才能进入镍钛预备。",
};

const FILTERS: { key: CanalFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "observation", label: "观察区" },
  { key: "ready", label: "可预备" },
  { key: "prep", label: "预备中" },
  { key: "risk", label: "风险标记" },
];

const RULE_NOTES = [
  "影像提示穿孔风险或超声工作尖已用过一次的根管留在观察区，不能直接进入镍钛预备",
  "医生确认根管口后解锁，方可进入预备",
  "修改定位结果必须填写原因，旧值自动留痕",
  "已进入预备的根管冻结，登记与定位均不可再改",
];

interface Notice {
  kind: "ok" | "error";
  text: string;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function stageBadgeClass(record: CanalAccessRecord): string {
  return `badge badge-${record.stage}`;
}

function stageBadgeText(record: CanalAccessRecord): string {
  return CANAL_STAGE_LABEL[record.stage] + (record.frozen ? " · 冻结" : "");
}

function MetricCard({ label, value, index }: { label: string; value: number; index: number }) {
  const colors = ["status-ok", "status-watch", "status-danger"];
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={colors[index % colors.length]} />
    </article>
  );
}

function CanalListItem({
  record,
  selected,
  onSelect,
}: {
  record: CanalAccessRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  const reasons = observationReasons(record);
  return (
    <button
      type="button"
      className={"canal-item" + (selected ? " selected" : "")}
      onClick={onSelect}
    >
      <span className="line1">
        <span className="canal-title">
          {record.tooth} · {record.canal}
        </span>
        <span className={stageBadgeClass(record)}>{stageBadgeText(record)}</span>
      </span>
      <p>
        术前片号 {record.preOpFilmNo} · 通畅深度{" "}
        {record.initialPatencyDepthMm === null ? "未测" : `${record.initialPatencyDepthMm}mm`} ·{" "}
        {record.tempSealStatus}
      </p>
      {reasons.length > 0 && <p className="risk-line">⚠ {reasons.join("、")}</p>}
    </button>
  );
}

function CanalDetail({
  record,
  onOutcome,
}: {
  record: CanalAccessRecord;
  onOutcome: (outcome: RuleOutcome) => void;
}) {
  const [filmNo, setFilmNo] = useState(record.preOpFilmNo);
  const [depthText, setDepthText] = useState(
    record.initialPatencyDepthMm === null ? "" : String(record.initialPatencyDepthMm)
  );
  const [seal, setSeal] = useState<TempSealStatus>(record.tempSealStatus);
  const [nextLocation, setNextLocation] = useState("");
  const [locationReason, setLocationReason] = useState("");

  const reasons = observationReasons(record);
  const locked = isPrepLocked(record);
  const now = () => new Date().toISOString();

  const saveRegistration = () => {
    const depth = depthText.trim() === "" ? null : Number(depthText);
    onOutcome(
      updateRegistration(
        record,
        { preOpFilmNo: filmNo, initialPatencyDepthMm: depth, tempSealStatus: seal },
        now()
      )
    );
  };

  const saveLocation = () => {
    const outcome = reviseLocation(record, nextLocation, locationReason, now());
    onOutcome(outcome);
    if (outcome.ok) {
      setNextLocation("");
      setLocationReason("");
    }
  };

  return (
    <section className="panel records">
      <div className="section-heading">
        <div>
          <p>牙位详情</p>
          <h2>
            {record.tooth} · {record.canal}
          </h2>
        </div>
        <span className={stageBadgeClass(record)}>{stageBadgeText(record)}</span>
      </div>

      {record.frozen && (
        <div className="banner-frozen">
          该根管已进入镍钛预备，记录冻结：登记信息与定位结果不可再修改。
        </div>
      )}

      {!record.frozen && record.stage === "observation" && (
        <div className="banner-warn">
          观察区：{reasons.join("、") || "待评估"}。
          {locked ? "须医生确认根管口后才能解锁进入镍钛预备。" : "根管口已确认，可进入预备。"}
        </div>
      )}

      <div className="detail-grid">
        <label>
          <span>术前片号</span>
          <input
            value={filmNo}
            disabled={record.frozen}
            onChange={(e) => setFilmNo(e.target.value)}
          />
        </label>
        <label>
          <span>初始通畅深度（mm）</span>
          <input
            value={depthText}
            disabled={record.frozen}
            inputMode="decimal"
            placeholder="未测"
            onChange={(e) => setDepthText(e.target.value)}
          />
        </label>
        <label>
          <span>暂封状态</span>
          <select
            value={seal}
            disabled={record.frozen}
            onChange={(e) => setSeal(e.target.value as TempSealStatus)}
          >
            {TEMP_SEAL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!record.frozen && (
        <div className="action-row">
          <button className="primary-action" onClick={saveRegistration}>
            保存登记
          </button>
        </div>
      )}

      <div className="subsection">
        <h3>根管口定位</h3>
        <div className="current-value">{record.locationResult}</div>
        {!record.frozen && (
          <div className="location-form">
            <label>
              <span>新定位结果</span>
              <textarea
                value={nextLocation}
                placeholder="填写修正后的根管口定位"
                onChange={(e) => setNextLocation(e.target.value)}
              />
            </label>
            <label>
              <span>修改原因（留痕）</span>
              <input
                value={locationReason}
                placeholder="例如：超声疏通后复查 / CBCT 复核"
                onChange={(e) => setLocationReason(e.target.value)}
              />
            </label>
            <div className="action-row">
              <button onClick={saveLocation}>修改定位结果</button>
            </div>
          </div>
        )}
        {record.locationHistory.length > 0 ? (
          <div className="history-list">
            {record.locationHistory.map((rev, index) => (
              <div className="history-item" key={`${rev.changedAt}-${index}`}>
                <strong>旧值：</strong>
                {rev.from} → <strong>新值：</strong>
                {rev.to}
                <br />
                <strong>原因：</strong>
                {rev.reason} · {formatTime(rev.changedAt)}
              </div>
            ))}
          </div>
        ) : (
          <p className="hint">暂无修改记录</p>
        )}
      </div>

      <div className="subsection">
        <h3>流程操作</h3>
        <div className="action-row">
          {record.stage === "observation" && !record.orificeConfirmed && (
            <button
              className="primary-action"
              onClick={() => onOutcome(confirmOrifice(record, now()))}
            >
              医生确认根管口（解锁）
            </button>
          )}
          {record.stage !== "prep" && (
            <button disabled={locked} onClick={() => onOutcome(enterPrep(record, now()))}>
              进入镍钛预备
            </button>
          )}
          {record.stage === "prep" && <span className="hint">预备中，记录已冻结</span>}
        </div>
        {locked && (
          <p className="hint">进入预备被锁定：{reasons.join("、")}，需先确认根管口。</p>
        )}
        <p className="hint">最近更新 {formatTime(record.updatedAt)}</p>
      </div>
    </section>
  );
}

function App() {
  const [records, setRecords] = useState<CanalAccessRecord[]>(() =>
    loadCanalRecords(seedCanalRecords)
  );
  const [filter, setFilter] = useState<CanalFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    saveCanalRecords(records);
  }, [records]);

  const metrics = useMemo(() => summarize(records), [records]);
  const visible = useMemo(
    () => records.filter((record) => matchesFilter(record, filter)),
    [records, filter]
  );
  const selected =
    records.find((record) => record.id === selectedId) ?? visible[0] ?? records[0] ?? null;

  const applyOutcome = (outcome: RuleOutcome) => {
    if (outcome.ok && outcome.record) {
      const next = outcome.record;
      setRecords((prev) => prev.map((record) => (record.id === next.id ? next : record)));
    }
    setNotice({ kind: outcome.ok ? "ok" : "error", text: outcome.message });
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">
            {project.id} · port {project.port}
          </p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
        </div>
        <div className="stack-card">
          <span>数据持久化</span>
          <strong>本地自动保存，重开页面可继续处理</strong>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="在册根管" value={metrics.total} index={0} />
        <MetricCard label="观察区" value={metrics.observation} index={1} />
        <MetricCard label="可预备" value={metrics.ready} index={2} />
        <MetricCard label="预备中（冻结）" value={metrics.prep} index={3} />
      </section>

      {notice && (
        <div className={`notice ${notice.kind}`} onClick={() => setNotice(null)}>
          {notice.text}
        </div>
      )}

      <section className="workspace">
        <aside className="panel narrow">
          <h2>筛选</h2>
          <div className="chips muted">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                className={filter === item.key ? "active" : ""}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <h2>通路规则</h2>
          <ul className="rule-notes">
            {RULE_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </aside>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>钙化根管通路台</p>
              <h2>根管列表（{visible.length}）</h2>
            </div>
          </div>
          <div className="canal-list">
            {visible.map((record) => (
              <CanalListItem
                key={record.id}
                record={record}
                selected={selected?.id === record.id}
                onSelect={() => setSelectedId(record.id)}
              />
            ))}
            {visible.length === 0 && <p className="hint">当前筛选下没有根管记录</p>}
          </div>
        </section>
      </section>

      {selected && <CanalDetail key={selected.id} record={selected} onOutcome={applyOutcome} />}
    </main>
  );
}

export default App;
