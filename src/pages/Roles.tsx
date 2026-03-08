import { Fragment, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Edit2, Plus, X } from 'lucide-react';
import type { AppStorage, MetricDefinition, Role } from '../types';
import { saveRole } from '../utils/storage';

const MELD_BLUE = '#1175CC';
const MELD_DARK = '#022935';

type DeptKey = 'bd' | 'bse' | 'cs' | 'css' | 'com' | 'mkt';

interface DeptConfig {
  label: string;
  color: string;
  light: string;
  border: string;
  textColor: string;
  levels: string[];
}

const DEPT: Record<DeptKey, DeptConfig> = {
  bd:  { label: 'Business Development', color: '#f59e0b', light: '#fffbeb', border: '#fde68a', textColor: '#92400e', levels: ['IC1', 'IC2', 'IC3'] },
  bse: { label: 'Business Solutions',   color: '#8b5cf6', light: '#f5f3ff', border: '#ddd6fe', textColor: '#4c1d95', levels: ['IC1', 'IC2', 'IC3'] },
  cs:  { label: 'Customer Success',     color: '#22c55e', light: '#f0fdf4', border: '#bbf7d0', textColor: '#14532d', levels: ['IC2', 'IC4'] },
  css: { label: 'Customer Support',     color: '#06b6d4', light: '#ecfeff', border: '#a5f3fc', textColor: '#164e63', levels: ['IC2', 'IC4'] },
  com: { label: 'Customer Onboarding',  color: MELD_BLUE, light: '#eff6ff', border: '#bfdbfe', textColor: '#1e3a5f', levels: ['IC2'] },
  mkt: { label: 'Marketing',            color: '#94a3b8', light: '#f8fafc', border: '#e2e8f0', textColor: '#334155', levels: ['IC2', 'IC3', 'L4'] },
};

const IC_LABELS: Record<string, string> = { IC1: 'Associate', IC2: 'Standard', IC3: 'Senior', IC4: 'Principal / MM' };
const L_LABELS:  Record<string, string> = { L1: 'Team Lead', L2: 'Manager', L3: 'Head of', L4: 'Director' };

// ── Helpers ──────────────────────────────────────────────────────────────────

function newId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function abbrev(name: string) {
  return name.split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 6) || 'M';
}

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface EditMetric {
  id: string;
  name: string;
  weight: number; // 0–100
  target: string; // display string
  inverse: boolean;
}

function toEditMetrics(role: Role): EditMetric[] {
  return role.metrics.map(m => ({
    id: m.id,
    name: m.name,
    weight: Math.round(m.weight * 1000) / 10,
    target: m.targetDisplay ?? (m.defaultTarget != null ? String(m.defaultTarget) : ''),
    inverse: m.inverse ?? false,
  }));
}

function fromEditMetrics(edits: EditMetric[], originals: MetricDefinition[]): MetricDefinition[] {
  return edits.map(e => {
    const orig = originals.find(m => m.id === e.id);
    return {
      id: e.id,
      name: e.name,
      abbreviation: orig?.abbreviation ?? abbrev(e.name),
      weight: Math.round(e.weight * 10) / 1000,
      description: orig?.description ?? '',
      defaultTarget: parseNum(e.target) || orig?.defaultTarget,
      targetDisplay: e.target,
      inverse: e.inverse,
    };
  });
}

// ── Level badge ──────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level?: string }) {
  if (!level) return null;
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
      {level}
    </span>
  );
}

// ── Draggable weight bar ─────────────────────────────────────────────────────
//
// Renders a segmented bar where dividers between segments are draggable.
// Pointer capture on the bar itself keeps events flowing during fast drags.

function WeightBar({
  metrics,
  color,
  editable,
  onWeightsChange,
}: {
  metrics: EditMetric[];
  color: string;
  editable: boolean;
  onWeightsChange: (w: number[]) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ idx: number; startX: number; startW: number[] } | null>(null);
  const SEG_OPACITIES = [1, 0.55, 0.3, 0.18];
  const MIN_W = 5; // minimum 5% per metric

  // Cumulative positions for handle placement
  let cum = 0;
  const handles = metrics.slice(0, -1).map(m => { cum += m.weight; return cum; });

  function onMove(e: React.PointerEvent) {
    if (!drag.current || !barRef.current) return;
    const { idx, startX, startW } = drag.current;
    const barW = barRef.current.offsetWidth;
    const delta = ((e.clientX - startX) / barW) * 100;
    const pool = startW[idx] + startW[idx + 1];
    // Snap to 2.5% increments for clean numbers
    const raw = startW[idx] + delta;
    let a = Math.round(raw / 2.5) * 2.5;
    a = Math.max(MIN_W, Math.min(pool - MIN_W, a));
    const b = pool - a;
    const next = [...startW];
    next[idx] = a;
    next[idx + 1] = b;
    onWeightsChange(next);
  }

  const BAR_H = editable ? 14 : 10;
  const WRAP_H = editable ? 28 : 10;

  return (
    <div
      ref={barRef}
      className="relative select-none"
      style={{ height: WRAP_H, touchAction: 'none' }}
      onPointerMove={onMove}
      onPointerUp={() => { drag.current = null; }}
    >
      {/* Segmented fill */}
      <div
        className="absolute left-0 right-0 rounded-full overflow-hidden flex bg-slate-100"
        style={{ top: editable ? (WRAP_H - BAR_H) / 2 : 0, height: BAR_H }}
      >
        {metrics.map((m, i) => (
          <div
            key={m.id}
            style={{ width: `${m.weight}%`, background: color, opacity: SEG_OPACITIES[i] ?? 0.15 }}
          />
        ))}
      </div>

      {/* Drag handles — only in edit mode */}
      {editable && handles.map((pos, i) => (
        <div
          key={i}
          className="absolute top-0 flex items-center justify-center z-10"
          style={{ left: `calc(${pos}% - 11px)`, width: 22, height: WRAP_H, cursor: 'col-resize' }}
          onPointerDown={(e) => {
            e.preventDefault();
            // Capture on bar so events keep firing even outside the handle
            barRef.current?.setPointerCapture(e.pointerId);
            drag.current = { idx: i, startX: e.clientX, startW: metrics.map(m => m.weight) };
          }}
        >
          <div
            className="flex flex-col items-center justify-center gap-0.5 rounded-md"
            style={{
              width: 14,
              height: 22,
              background: 'white',
              boxShadow: '0 1px 5px rgba(0,0,0,0.18)',
              border: '1.5px solid #cbd5e1',
            }}
          >
            <div className="w-0.5 h-1.5 rounded-full bg-slate-400" />
            <div className="w-0.5 h-1.5 rounded-full bg-slate-400" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Role card ────────────────────────────────────────────────────────────────

const CARD_GRADIENT = `linear-gradient(135deg, ${MELD_DARK} 0%, #0d4a6b 55%, ${MELD_BLUE} 100%)`;
const CARD_BORDER   = '#bfdbfe';
const CARD_LIGHT    = '#eff6ff';

function RoleCard({
  role,
  dept,
  onSaveRole,
}: {
  role: Role;
  dept: DeptKey;
  onSaveRole: (r: Role) => void;
}) {
  // dept kept for section-level differentiation only; cards use unified Meld palette
  void dept;
  const [editing, setEditing] = useState(false);
  const [em, setEm] = useState<EditMetric[]>([]);
  const SEG_OPACITIES = [1, 0.55, 0.3, 0.18];

  function enterEdit() {
    setEm(
      role.metrics.length > 0
        ? toEditMetrics(role)
        : [{ id: newId(), name: 'New Metric', weight: 100, target: '', inverse: false }]
    );
    setEditing(true);
  }

  function cancel() { setEditing(false); setEm([]); }

  function save() {
    onSaveRole({ ...role, metrics: fromEditMetrics(em, role.metrics) });
    setEditing(false);
  }

  function setWeights(ws: number[]) {
    setEm(prev => prev.map((m, i) => ({ ...m, weight: ws[i] ?? m.weight })));
  }

  function update(id: string, field: keyof EditMetric, val: string | number | boolean) {
    setEm(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
  }

  function addMetric() {
    const ADD = 10;
    const donor = [...em].sort((a, b) => b.weight - a.weight)[0];
    if (!donor || donor.weight <= MIN_STEAL + ADD) return;
    setEm(prev => [
      ...prev.map(m => m.id === donor.id ? { ...m, weight: m.weight - ADD } : m),
      { id: newId(), name: 'New Metric', weight: ADD, target: '', inverse: false },
    ]);
  }

  function removeMetric(id: string) {
    if (em.length <= 1) return;
    const removed = em.find(m => m.id === id)!;
    const rest = em.filter(m => m.id !== id);
    const heaviest = rest.reduce((mx, m) => m.weight > mx.weight ? m : mx, rest[0]);
    setEm(rest.map(m => m.id === heaviest.id ? { ...m, weight: m.weight + removed.weight } : m));
  }

  const totalW = em.reduce((s, m) => s + m.weight, 0);
  const weightOk = Math.abs(totalW - 100) < 0.6;

  // ── Read mode ──

  if (!editing) {
    return (
      <div
        className="bg-white rounded-2xl overflow-hidden group"
        style={{ border: `1.5px solid ${CARD_BORDER}`, boxShadow: '0 2px 8px rgba(17,117,204,0.08)' }}
      >
        {/* Gradient header */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ background: CARD_GRADIENT }}
        >
          <p className="flex-1 font-bold text-sm leading-tight min-w-0 text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {role.fullName || role.name}
          </p>
          <LevelBadge level={role.level} />
          <button
            onClick={enterEdit}
            className="ml-1 p-1.5 rounded-lg opacity-25 group-hover:opacity-100 transition-all hover:scale-110 hover:bg-white/20"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            title="Edit metrics & weights"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {role.metrics.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex-1 text-xs text-slate-400 italic">Metrics not yet configured — comp tracking only</span>
            <button onClick={enterEdit} className="text-xs font-semibold underline decoration-dotted" style={{ color: MELD_BLUE }}>
              + Configure
            </button>
          </div>
        ) : (
          <div className="px-5 pt-4 pb-3">
            <WeightBar metrics={toEditMetrics(role)} color={MELD_BLUE} editable={false} onWeightsChange={() => {}} />
            <div className="mt-3">
              {role.metrics.map((m, i) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2.5 py-2.5"
                  style={{ borderBottom: i < role.metrics.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MELD_BLUE, opacity: SEG_OPACITIES[i] ?? 0.15 }} />
                  <span className="flex-1 text-sm text-slate-700 leading-snug min-w-0">{m.name}</span>
                  <span className="text-xs font-mono text-slate-300 flex-shrink-0">{Math.round(m.weight * 100)}%</span>
                  <span
                    className="text-sm font-bold flex-shrink-0 tabular-nums"
                    style={{ color: MELD_BLUE, minWidth: '5.5rem', textAlign: 'right' }}
                  >
                    {m.targetDisplay ?? (m.defaultTarget != null ? String(m.defaultTarget) : '—')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Edit mode ──

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: `2px solid ${MELD_BLUE}`, boxShadow: `0 0 0 4px ${MELD_BLUE}1a` }}
    >
      {/* Gradient header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5"
        style={{ background: CARD_GRADIENT }}
      >
        <p className="flex-1 font-bold text-sm text-white min-w-0" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {role.fullName || role.name}
        </p>
        <LevelBadge level={role.level} />
        <span className="ml-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/20 text-white/80">
          editing
        </span>
      </div>

      <div className="px-5 pt-4 pb-2">
        {/* Draggable weight bar */}
        {em.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-slate-400">
              Drag handles to adjust weights · snap to 2.5%
            </p>
            <WeightBar metrics={em} color={MELD_BLUE} editable={true} onWeightsChange={setWeights} />
            {!weightOk && (
              <p className="text-[10px] text-red-400 mt-1">
                Weights sum to {totalW.toFixed(1)}% — must equal 100%
              </p>
            )}
          </>
        )}

        {/* Metric rows */}
        <div className="mt-4 space-y-2">
          {em.map((m, i) => (
            <div key={m.id} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: MELD_BLUE, opacity: SEG_OPACITIES[i] ?? 0.15 }}
              />

              <input
                type="text"
                value={m.name}
                onChange={e => update(m.id, 'name', e.target.value)}
                className="flex-1 text-sm rounded-lg px-2.5 py-1.5 min-w-0 focus:outline-none focus:ring-1"
                style={{ border: `1px solid ${CARD_BORDER}`, background: CARD_LIGHT }}
                placeholder="Metric name"
              />

              <input
                type="text"
                value={m.target}
                onChange={e => update(m.id, 'target', e.target.value)}
                className="w-28 text-sm rounded-lg px-2.5 py-1.5 text-right font-semibold focus:outline-none focus:ring-1"
                style={{ border: `1px solid ${CARD_BORDER}`, background: CARD_LIGHT, color: MELD_BLUE }}
                placeholder="Target"
              />

              <span className="text-xs font-mono tabular-nums flex-shrink-0 w-12 text-right text-slate-500">
                {m.weight.toFixed(1)}%
              </span>

              <button
                onClick={() => removeMetric(m.id)}
                disabled={em.length <= 1}
                className="p-1 rounded hover:bg-red-50 flex-shrink-0 disabled:opacity-20"
                title="Remove metric"
              >
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addMetric}
          className="mt-3 mb-1 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg w-full justify-center transition-colors"
          style={{ color: MELD_DARK, background: 'transparent', border: `1.5px dashed ${CARD_BORDER}` }}
        >
          <Plus className="w-3 h-3" /> Add metric
        </button>
      </div>

      {/* Footer: Save / Cancel */}
      <div
        className="flex justify-end gap-2 px-5 py-3"
        style={{ borderTop: `1px solid ${CARD_BORDER}`, background: CARD_LIGHT }}
      >
        <button
          onClick={cancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-white/60 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button
          onClick={save}
          disabled={!weightOk}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background: weightOk ? MELD_BLUE : '#94a3b8',
            cursor: weightOk ? 'pointer' : 'not-allowed',
          }}
        >
          <Check className="w-3.5 h-3.5" /> Save changes
        </button>
      </div>
    </div>
  );
}

const MIN_STEAL = 10;

// ── Dept section ─────────────────────────────────────────────────────────────

function DeptSection({ deptKey, children }: { deptKey: DeptKey; children: React.ReactNode }) {
  const d = DEPT[deptKey];
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
        <span className="text-xs font-bold uppercase tracking-widest flex-shrink-0" style={{ color: d.textColor }}>
          {d.label}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {d.levels.map((lv, i) => (
            <Fragment key={lv}>
              {i > 0 && <span className="text-xs text-slate-300 px-0.5">›</span>}
              <LevelBadge level={lv} />
            </Fragment>
          ))}
        </div>
        <div className="flex-1 h-px" style={{ background: d.border }} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function Roles({
  storage,
  onSave,
}: {
  storage: AppStorage;
  onSave: (updater: (prev: AppStorage) => AppStorage) => void;
}) {
  function handleSaveRole(updated: Role) {
    onSave(prev => saveRole(prev, updated));
  }

  function r(id: string): Role | undefined {
    return storage.roles.find(role => role.id === id);
  }

  function cards(ids: string[], dept: DeptKey) {
    return ids
      .map(id => r(id))
      .filter((role): role is Role => !!role)
      .map(role => (
        <RoleCard key={role.id} role={role} dept={dept} onSaveRole={handleSaveRole} />
      ));
  }

  const totalMetrics = storage.roles.reduce((s, role) => s + role.metrics.length, 0);

  return (
    <div className="min-h-screen" style={{ background: '#F1F1F1' }}>

      {/* Hero */}
      <div
        className="px-8 pt-8 pb-8"
        style={{ background: `linear-gradient(135deg, ${MELD_DARK} 0%, #0d4a6b 60%, ${MELD_BLUE} 100%)` }}
      >
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#B0E3FF', fontFamily: 'Rubik, sans-serif' }}>
            Property Meld · OTP System
          </p>
          <h1 className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Roles &amp; Metrics
          </h1>
          <p className="text-sm mb-5" style={{ color: '#B0E3FF' }}>
            Every OTP-covered role: what gets measured, how it's weighted, and what target defines success. Click the pencil icon on any card to edit weights and metrics.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mb-6">
            {[
              { stat: String(storage.roles.length), label: 'roles' },
              { stat: '6', label: 'departments' },
              { stat: String(totalMetrics), label: 'metric configs' },
            ].map(s => (
              <div key={s.label} className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{s.stat}</span>
                <span className="text-xs" style={{ color: '#B0E3FF' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Level legend */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide mr-1" style={{ color: 'rgba(176,227,255,0.5)' }}>IC</span>
            {Object.entries(IC_LABELS).map(([lv, label]) => (
              <div key={lv} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <span className="font-bold text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{lv}</span>
                <span className="text-xs" style={{ color: '#B0E3FF' }}>{label}</span>
              </div>
            ))}
            <div className="w-px h-5 mx-1 rounded-full" style={{ background: 'rgba(176,227,255,0.25)' }} />
            <span className="text-[11px] font-semibold uppercase tracking-wide mr-1" style={{ color: 'rgba(176,227,255,0.5)' }}>Leadership</span>
            {Object.entries(L_LABELS).map(([lv, label]) => (
              <div key={lv} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <span className="font-bold text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{lv}</span>
                <span className="text-xs" style={{ color: '#B0E3FF' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role sections */}
      <div className="max-w-6xl mx-auto px-8 py-10 space-y-12">
        <DeptSection deptKey="bd">{cards(['BDA', 'BDR', 'SR-BDR'], 'bd')}</DeptSection>
        <DeptSection deptKey="bse">{cards(['ASSOC-BSE', 'BSE', 'SR-BSE'], 'bse')}</DeptSection>
        <DeptSection deptKey="cs">{cards(['CSM', 'MM-CSM'], 'cs')}</DeptSection>
        <DeptSection deptKey="css">{cards(['CSS', 'MMES'], 'css')}</DeptSection>
        <DeptSection deptKey="com">{cards(['COM'], 'com')}</DeptSection>
        <DeptSection deptKey="mkt">{cards(['MKT-IC2', 'MKT-IC3', 'MKT-L4'], 'mkt')}</DeptSection>
      </div>

      <div className="max-w-6xl mx-auto px-8 pb-10 flex items-center justify-center gap-2 text-xs text-slate-400">
        <span>Changes save to your local browser session ·</span>
        <Link to="/export" className="underline decoration-dotted hover:text-slate-600">Export backup</Link>
      </div>
    </div>
  );
}
