import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import type { AppStorage, MetricDefinition, Role } from '../types';
import { deleteRole, generateId, saveRole } from '../utils/storage';

const MELD_BLUE = '#1175CC';
const MELD_DARK = '#022935';

// ── Department grouping ──────────────────────────────────────────────────────

const DEPT_ORDER = [
  'Business Development',
  'Business Solutions',
  'Customer Success',
  'Customer Support & Enablement',
  'Customer Onboarding',
  'Marketing',
  'Engineering',
  'Product',
  'People Ops',
  'Custom',
];

const DEPT_COLORS: Record<string, { color: string; text: string; border: string }> = {
  'Business Development':          { color: '#f59e0b', text: '#92400e', border: '#fde68a' },
  'Business Solutions':            { color: '#8b5cf6', text: '#4c1d95', border: '#ddd6fe' },
  'Customer Success':              { color: '#22c55e', text: '#14532d', border: '#bbf7d0' },
  'Customer Support & Enablement': { color: '#06b6d4', text: '#164e63', border: '#a5f3fc' },
  'Customer Onboarding':           { color: MELD_BLUE, text: '#1e3a5f', border: '#bfdbfe' },
  'Marketing':                     { color: '#94a3b8', text: '#334155', border: '#e2e8f0' },
  'Engineering':                   { color: '#f97316', text: '#7c2d12', border: '#fed7aa' },
  'Product':                       { color: '#ec4899', text: '#831843', border: '#fbcfe8' },
  'People Ops':                    { color: '#14b8a6', text: '#134e4a', border: '#99f6e4' },
  'Custom':                        { color: '#64748b', text: '#1e293b', border: '#cbd5e1' },
};

const ROLE_DEPT: Record<string, string> = {
  BDA: 'Business Development', BDR: 'Business Development', 'SR-BDR': 'Business Development', 'BD-MGR': 'Business Development',
  'ASSOC-BSE': 'Business Solutions', BSE: 'Business Solutions', 'SR-BSE': 'Business Solutions', 'BS-DIR': 'Business Solutions',
  CSM: 'Customer Success', 'MM-CSM': 'Customer Success', 'CS-MGR': 'Customer Success',
  CSS: 'Customer Support & Enablement', MMES: 'Customer Support & Enablement', 'CSS-MGR': 'Customer Support & Enablement',
  COM: 'Customer Onboarding',
  'MKT-IC2': 'Marketing', 'MKT-IC3': 'Marketing', 'MKT-L4': 'Marketing',
  'ENG-IC1': 'Engineering', 'ENG-IC2': 'Engineering', 'ENG-IC3': 'Engineering',
  'ENG-IC4': 'Engineering', 'ENG-IC5': 'Engineering', 'ENG-MGR': 'Engineering',
  'DATA-IC5': 'Engineering', 'DATA-MGR': 'Engineering',
  'PROD-IC2': 'Product', 'PROD-IC3': 'Product', 'PROD-IC4': 'Product',
  'PEOPLE-OPS-IC': 'People Ops', 'PEOPLE-OPS-MGR': 'People Ops',
};

function getDept(role: Role): string {
  if (role.isCustom) return 'Custom';
  return ROLE_DEPT[role.id] ?? 'Custom';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  weight: number;
  target: string;
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

// ── Draggable weight bar ─────────────────────────────────────────────────────

const MIN_STEAL = 10;

function WeightBar({
  metrics, color, editable, onWeightsChange,
}: {
  metrics: EditMetric[];
  color: string;
  editable: boolean;
  onWeightsChange: (w: number[]) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ idx: number; startX: number; startW: number[] } | null>(null);
  const SEG_OPACITIES = [1, 0.55, 0.3, 0.18];
  const MIN_W = 5;

  let cum = 0;
  const handles = metrics.slice(0, -1).map(m => { cum += m.weight; return cum; });

  function onMove(e: React.PointerEvent) {
    if (!drag.current || !barRef.current) return;
    const { idx, startX, startW } = drag.current;
    const barW = barRef.current.offsetWidth;
    const delta = ((e.clientX - startX) / barW) * 100;
    const pool = startW[idx] + startW[idx + 1];
    let a = Math.round((startW[idx] + delta) / 2.5) * 2.5;
    a = Math.max(MIN_W, Math.min(pool - MIN_W, a));
    const next = [...startW];
    next[idx] = a;
    next[idx + 1] = pool - a;
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
      <div
        className="absolute left-0 right-0 rounded-full overflow-hidden flex bg-slate-100"
        style={{ top: editable ? (WRAP_H - BAR_H) / 2 : 0, height: BAR_H }}
      >
        {metrics.map((m, i) => (
          <div key={m.id} style={{ width: `${m.weight}%`, background: color, opacity: SEG_OPACITIES[i] ?? 0.15 }} />
        ))}
      </div>
      {editable && handles.map((pos, i) => (
        <div
          key={i}
          className="absolute top-0 flex items-center justify-center z-10"
          style={{ left: `calc(${pos}% - 11px)`, width: 22, height: WRAP_H, cursor: 'col-resize' }}
          onPointerDown={(e) => {
            e.preventDefault();
            barRef.current?.setPointerCapture(e.pointerId);
            drag.current = { idx: i, startX: e.clientX, startW: metrics.map(m => m.weight) };
          }}
        >
          <div
            className="flex flex-col items-center justify-center gap-0.5 rounded-md"
            style={{ width: 14, height: 22, background: 'white', boxShadow: '0 1px 5px rgba(0,0,0,0.18)', border: '1.5px solid #cbd5e1' }}
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
  onSaveRole,
  onDeleteRole,
}: {
  role: Role;
  onSaveRole: (r: Role) => void;
  onDeleteRole: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [em, setEm] = useState<EditMetric[]>([]);
  const [editName, setEditName] = useState('');
  const SEG_OPACITIES = [1, 0.55, 0.3, 0.18];

  function enterEdit() {
    setEditName(role.fullName || role.name);
    setEm(
      role.metrics.length > 0
        ? toEditMetrics(role)
        : [{ id: generateId(), name: 'New Metric', weight: 100, target: '', inverse: false }]
    );
    setEditing(true);
  }

  function cancel() { setEditing(false); setEm([]); }

  function save() {
    onSaveRole({
      ...role,
      fullName: editName.trim() || role.fullName,
      name: editName.trim() || role.name,
      metrics: fromEditMetrics(em, role.metrics),
    });
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
      { id: generateId(), name: 'New Metric', weight: ADD, target: '', inverse: false },
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

  if (!editing) {
    return (
      <div
        className="bg-white rounded-2xl overflow-hidden group"
        style={{ border: `1.5px solid ${CARD_BORDER}`, boxShadow: '0 2px 8px rgba(17,117,204,0.08)' }}
      >
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: CARD_GRADIENT }}>
          <p className="flex-1 font-bold text-sm leading-tight min-w-0 text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {role.fullName || role.name}
          </p>
          <button
            onClick={enterEdit}
            className="ml-1 p-1.5 rounded-lg opacity-25 group-hover:opacity-100 transition-all hover:scale-110 hover:bg-white/20"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            title="Edit title, metrics & weights"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {role.isCustom && (
            <button
              onClick={() => onDeleteRole(role.id)}
              className="p-1.5 rounded-lg opacity-25 group-hover:opacity-100 transition-all hover:scale-110 hover:bg-white/20"
              style={{ color: 'rgba(255,255,255,0.7)' }}
              title="Delete custom role"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
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
                  <span className="text-sm font-bold flex-shrink-0 tabular-nums" style={{ color: MELD_BLUE, minWidth: '5.5rem', textAlign: 'right' }}>
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

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: `2px solid ${MELD_BLUE}`, boxShadow: `0 0 0 4px ${MELD_BLUE}1a` }}
    >
      <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: CARD_GRADIENT }}>
        <input
          value={editName}
          onChange={e => setEditName(e.target.value)}
          className="flex-1 font-bold text-sm text-white bg-white/10 rounded-lg px-3 py-1.5 min-w-0 focus:outline-none focus:ring-2 focus:ring-white/40 placeholder-white/40"
          style={{ fontFamily: 'Poppins, sans-serif' }}
          placeholder="Role title…"
        />
        <span className="ml-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/20 text-white/80">
          editing
        </span>
      </div>

      <div className="px-5 pt-4 pb-2">
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

        <div className="mt-4 space-y-2">
          {em.map((m, i) => (
            <div key={m.id} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MELD_BLUE, opacity: SEG_OPACITIES[i] ?? 0.15 }} />
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

      <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: `1px solid ${CARD_BORDER}`, background: CARD_LIGHT }}>
        <button
          onClick={cancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-white/60 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button
          onClick={save}
          disabled={!weightOk || !editName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: weightOk && editName.trim() ? MELD_BLUE : '#94a3b8', cursor: weightOk && editName.trim() ? 'pointer' : 'not-allowed' }}
        >
          <Check className="w-3.5 h-3.5" /> Save changes
        </button>
      </div>
    </div>
  );
}

// ── New Role Modal ────────────────────────────────────────────────────────────

function NewRoleModal({ onSave, onClose }: { onSave: (r: Role) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [cadence, setCadence] = useState<'monthly' | 'quarterly'>('monthly');

  function handleSave() {
    if (!title.trim()) return;
    const id = title.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').slice(0, 20) + '-' + generateId().slice(0, 4);
    onSave({
      id,
      name: title.trim(),
      fullName: title.trim(),
      cadence,
      metrics: [],
      isCustom: true,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">New Role</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Role Title</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
              placeholder="e.g. Senior Account Executive"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Cadence</label>
            <select
              value={cadence}
              onChange={e => setCadence(e.target.value as 'monthly' | 'quarterly')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <p className="text-xs text-slate-400">You can add metrics after creating the role by clicking the pencil icon on its card.</p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-[#1175CC] rounded-xl hover:bg-[#0d62b0] disabled:opacity-40"
          >
            Create Role
          </button>
        </div>
      </div>
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
  const [showNewRole, setShowNewRole] = useState(false);

  function handleSaveRole(updated: Role) {
    onSave(prev => saveRole(prev, updated));
  }

  function handleDeleteRole(id: string) {
    onSave(prev => deleteRole(prev, id));
  }

  // Group roles by department
  const groups = new Map<string, Role[]>();
  for (const dept of DEPT_ORDER) groups.set(dept, []);
  for (const role of storage.roles) {
    const dept = getDept(role);
    if (!groups.has(dept)) groups.set(dept, []);
    groups.get(dept)!.push(role);
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Roles &amp; Metrics
              </h1>
              <p className="text-sm mb-5" style={{ color: '#B0E3FF' }}>
                Every OTP-covered role: what gets measured, how it's weighted, and what target defines success.
                Click the pencil icon on any card to edit the title, weights, and metrics.
              </p>
            </div>
            <button
              onClick={() => setShowNewRole(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 flex-shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Role
            </button>
          </div>

          <div className="flex gap-8">
            {[
              { stat: String(storage.roles.length), label: 'roles' },
              { stat: String(Array.from(groups.values()).filter(g => g.length > 0).length), label: 'departments' },
              { stat: String(totalMetrics), label: 'metric configs' },
            ].map(s => (
              <div key={s.label} className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{s.stat}</span>
                <span className="text-xs" style={{ color: '#B0E3FF' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role sections */}
      <div className="max-w-6xl mx-auto px-8 py-10 space-y-12">
        {DEPT_ORDER.map(dept => {
          const roles = groups.get(dept) ?? [];
          if (roles.length === 0) return null;
          const c = DEPT_COLORS[dept] ?? DEPT_COLORS['Custom'];
          return (
            <div key={dept}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
                <span className="text-xs font-bold uppercase tracking-widest flex-shrink-0" style={{ color: c.text }}>
                  {dept}
                </span>
                <div className="flex-1 h-px" style={{ background: c.border }} />
                <span className="text-xs font-medium" style={{ color: c.text }}>{roles.length}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {roles.map(role => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    onSaveRole={handleSaveRole}
                    onDeleteRole={handleDeleteRole}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="max-w-6xl mx-auto px-8 pb-10 flex items-center justify-center gap-2 text-xs text-slate-400">
        <span>Changes save to your local browser session ·</span>
        <Link to="/export" className="underline decoration-dotted hover:text-slate-600">Export backup</Link>
      </div>

      {showNewRole && (
        <NewRoleModal
          onSave={handleSaveRole}
          onClose={() => setShowNewRole(false)}
        />
      )}
    </div>
  );
}
