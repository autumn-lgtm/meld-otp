import {
  AlertCircle, CheckCircle, ChevronDown, Download, Edit2, Eye, EyeOff,
  FileSpreadsheet, Plus, Trash2, Upload, XCircle,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useSalaryVisible } from '../hooks/useSalaryVisible';
import type { AppStorage, CompPlan, CompPlanComponent } from '../types';
import type { ExcelImportResult } from '../utils/excelImport';
import { importCompPlanExcel } from '../utils/excelImport';
import { deleteCompPlan, generateId, saveCompPlan, saveMelder } from '../utils/storage';

const MELD_BLUE = '#1175CC';
const MELD_DARK = '#022935';
const MELD_GOLD = '#FFB41B';

const DEPT_ORDER = [
  'Marketing', 'Business Development', 'Business Solutions',
  'Customer Onboarding', 'Customer Success', 'Customer Support & Enablement',
  'People Ops', 'Product', 'Engineering & Data', 'Engineering',
];

function deptRank(d: string) {
  const i = DEPT_ORDER.indexOf(d);
  return i === -1 ? 99 : i;
}

interface Props {
  storage: AppStorage;
  onSave: (updater: (s: AppStorage) => AppStorage) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return n > 0
    ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : '—';
}

function pctColor(pct: number) {
  if (pct >= 50) return MELD_GOLD;
  if (pct >= 30) return '#1175CC';
  return '#22c55e';
}

// Template CSV rows for download
const COMP_PLAN_TEMPLATE_CSV = [
  'Department,Role/Title,Annual OTE,Annual Base,Annual Variable,Variable %,Comp 1 Name,Comp 1 Type,Comp 1 Frequency,Comp 1 Annual Target,Comp 2 Name,Comp 2 Type,Comp 2 Frequency,Comp 2 Annual Target,Notes',
  'Marketing,Marketing Specialist (IC2),72000,48000,24000,33%,Monthly Commission,commission,monthly,24000,,,,,"Effective 2026-01"',
  'Business Development,Business Development Rep,87800,43900,43900,50%,Monthly Commission,commission,monthly,43900,,,,,"50/50 base/variable plan"',
  'Customer Success,Customer Success Manager,110000,88000,22000,20%,Quarterly Bonus,bonus,quarterly,22000,,,,,"Q-bonus tied to GRR"',
  'Engineering,Software Engineer (IC2),130000,117000,13000,10%,Annual Bonus,bonus,annual,13000,,,,,"10% annual target"',
].join('\n');

function downloadTemplate() {
  const blob = new Blob([COMP_PLAN_TEMPLATE_CSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'comp-plans-template.csv'; a.click();
  URL.revokeObjectURL(url);
}

// Market alignment: compare plan's annualOTE to current avg marketRate for matching Melders
function getMarketAlignment(plan: CompPlan, storage: { melders: { roleId: string; marketRate: number }[] }): {
  label: string; color: string; bg: string; pct: number | null;
} | null {
  // Try to match by roleId first, then by roleName partial match
  const matching = storage.melders.filter((m) => {
    if (plan.roleId && m.roleId === plan.roleId) return true;
    return m.roleId.toLowerCase().includes(plan.roleName.toLowerCase().slice(0, 4));
  });
  if (matching.length === 0 || plan.annualOTE === 0) return null;

  const avgMonthlyMarket = matching.reduce((s, m) => s + m.marketRate, 0) / matching.length;
  const annualMarket = avgMonthlyMarket * 12;
  if (annualMarket === 0) return null;

  const pct = Math.round((plan.annualOTE / annualMarket) * 100);

  if (pct >= 95 && pct <= 110) return { label: 'Aligned', color: '#16a34a', bg: '#f0fdf4', pct };
  if (pct >= 85) return { label: pct < 95 ? 'Below Target' : 'Above Target', color: '#d97706', bg: '#fffbeb', pct };
  if (pct < 85)  return { label: 'Below Market', color: '#dc2626', bg: '#fef2f2', pct };
  return { label: 'Above Market', color: '#7c3aed', bg: '#faf5ff', pct };
}

const COMPONENT_TYPE_LABELS: Record<CompPlanComponent['type'], string> = {
  commission: 'Commission',
  bonus:      'Bonus',
  spiff:      'SPIF',
  other:      'Other',
};

const FREQ_LABELS: Record<CompPlanComponent['frequency'], string> = {
  monthly:   'Monthly',
  quarterly: 'Quarterly',
  annual:    'Annual',
};

// ─── Blank Plan Factory ───────────────────────────────────────────────────────

function blankPlan(): CompPlan {
  return {
    id: generateId(),
    department: '',
    roleName: '',
    basePct: 80,
    variablePct: 20,
    annualOTE: 0,
    annualBase: 0,
    annualVariable: 0,
    components: [],
    source: 'Manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Comp Plan Card ───────────────────────────────────────────────────────────

function CompPlanCard({ plan, storage, masked, onEdit, onDelete }: {
  plan: CompPlan;
  storage: Props['storage'];
  masked: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasComponents = plan.components.length > 0;
  const alignment = getMarketAlignment(plan, storage);
  const m$ = (n: number) => masked ? '••••' : fmt$(n);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800 truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {plan.roleName}
            </p>
            {plan.planTierLabel && plan.planTierLabel !== plan.roleName && (
              <p className="text-xs text-slate-400 mt-0.5">{plan.planTierLabel}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: '#eef5fc', color: MELD_BLUE }}
              >
                {plan.department}
              </span>
              {alignment && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: alignment.bg, color: alignment.color }}
                  title={`Plan OTE is ${alignment.pct}% of current market rate`}
                >
                  {alignment.label} {alignment.pct}%
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onEdit}   className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"><Edit2  className="w-3.5 h-3.5" /></button>
            <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 transition-colors text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* Base / Variable split bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[11px] font-semibold mb-1.5">
            <span className="text-slate-500">Base <span className="text-slate-700">{plan.basePct}%</span></span>
            <span style={{ color: pctColor(plan.variablePct) }}>Variable {plan.variablePct}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden flex" style={{ background: '#f1f5f9' }}>
            <div
              className="h-full rounded-l-full transition-all"
              style={{ width: `${plan.basePct}%`, background: '#94a3b8' }}
            />
            <div
              className="h-full flex-1 rounded-r-full transition-all"
              style={{ background: pctColor(plan.variablePct) }}
            />
          </div>
        </div>

        {/* Dollar breakdown */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Annual OTE', val: plan.annualOTE, bold: true },
            { label: 'Base',       val: plan.annualBase },
            { label: 'Variable',   val: plan.annualVariable },
          ].map(({ label, val, bold }) => (
            <div key={label} className="rounded-xl p-2.5" style={{ background: '#f8fafc' }}>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
              <p className={`text-sm mt-0.5 ${bold ? 'font-black text-slate-800' : 'font-semibold text-slate-600'}`}
                 style={{ fontFamily: 'Poppins, sans-serif' }}>
                {m$(val)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Components accordion */}
      {hasComponents && (
        <div className="border-t border-slate-50">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>{plan.components.length} variable component{plan.components.length !== 1 ? 's' : ''}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          {expanded && (
            <div className="px-5 pb-4 space-y-2">
              {plan.components.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-700">{c.name}</span>
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{ background: '#f1f5f9', color: '#64748b' }}>
                      {COMPONENT_TYPE_LABELS[c.type]} · {FREQ_LABELS[c.frequency]}
                    </span>
                  </div>
                  <span className="font-bold text-slate-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {m$(c.annualTarget)}<span className="text-slate-400 font-normal">/yr</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Source badge */}
      {plan.source && (
        <div className="px-5 pb-3">
          <span className="text-[10px] text-slate-400">{plan.source}{plan.effectiveDate ? ` · ${plan.effectiveDate}` : ''}</span>
        </div>
      )}

      {/* OAP Metric Targets */}
      {plan.metricTargets && plan.metricTargets.length > 0 && (
        <div className="px-5 pb-4 border-t border-slate-50 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">OAP Targets</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.metricTargets.map((mt) => (
              <span key={mt.abbreviation}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: '#eef5fc', color: MELD_BLUE }}
                title={mt.label}
              >
                {mt.abbreviation}: {mt.abbreviation === 'GRR' ? `${mt.monthlyTarget}%` : `$${mt.monthlyTarget.toLocaleString('en-US')}/mo`}
              </span>
            ))}
          </div>
          {plan.melderName && (
            <p className="text-[10px] text-slate-400 mt-1.5">For: <span className="font-semibold text-slate-500">{plan.melderName}</span></p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ plan: initial, onSave, onClose }: {
  plan: CompPlan;
  onSave: (p: CompPlan) => void;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState<CompPlan>(initial);

  function set<K extends keyof CompPlan>(k: K, v: CompPlan[K]) {
    setPlan((p) => {
      const next = { ...p, [k]: v, updatedAt: new Date().toISOString() };
      // Auto-derive when OTE + one pct changes
      if (k === 'variablePct') {
        const vp = Number(v);
        next.basePct = 100 - vp;
        if (next.annualOTE > 0) {
          next.annualVariable = Math.round(next.annualOTE * vp / 100);
          next.annualBase     = next.annualOTE - next.annualVariable;
        }
      }
      if (k === 'annualOTE') {
        const ote = Number(v);
        next.annualVariable = Math.round(ote * next.variablePct / 100);
        next.annualBase     = ote - next.annualVariable;
      }
      return next;
    });
  }

  function addComponent() {
    const c: CompPlanComponent = {
      id: generateId(), name: '', type: 'commission', frequency: 'monthly', annualTarget: 0,
    };
    setPlan((p) => ({ ...p, components: [...p.components, c] }));
  }

  function updateComponent(id: string, patch: Partial<CompPlanComponent>) {
    setPlan((p) => ({
      ...p,
      components: p.components.map((c) => c.id === id ? { ...c, ...patch } : c),
    }));
  }

  function removeComponent(id: string) {
    setPlan((p) => ({ ...p, components: p.components.filter((c) => c.id !== id) }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,41,53,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {initial.roleName ? `Edit: ${initial.roleName}` : 'New Comp Plan'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><XCircle className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Role + Dept */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Role / Title</label>
              <input
                value={plan.roleName}
                onChange={(e) => set('roleName', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                placeholder="e.g. Business Development Rep"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Department</label>
              <input
                list="dept-list"
                value={plan.department}
                onChange={(e) => set('department', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                placeholder="e.g. Business Development"
              />
              <datalist id="dept-list">
                {DEPT_ORDER.map((d) => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>

          {/* Variable % + OTE */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Variable % of Total Cash</label>
              <div className="relative">
                <input
                  type="number" min={0} max={100}
                  value={plan.variablePct}
                  onChange={(e) => set('variablePct', Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Base = {plan.basePct}% · Variable = {plan.variablePct}%</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Annual OTE (Total Cash)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number" min={0}
                  value={plan.annualOTE || ''}
                  onChange={(e) => set('annualOTE', Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 pl-6 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Derived display */}
          {plan.annualOTE > 0 && (
            <div className="rounded-xl p-3 grid grid-cols-2 gap-3" style={{ background: '#f8fafc' }}>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Annual Base</p>
                <p className="font-bold text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{fmt$(plan.annualBase)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Annual Variable Target</p>
                <p className="font-bold" style={{ fontFamily: 'Poppins, sans-serif', color: pctColor(plan.variablePct) }}>{fmt$(plan.annualVariable)}</p>
              </div>
            </div>
          )}

          {/* Variable components */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500">Variable Components</label>
              <button
                onClick={addComponent}
                className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-[#eef5fc] transition-colors"
                style={{ color: MELD_BLUE }}
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {plan.components.length === 0 && (
              <p className="text-xs text-slate-400 italic">No components yet — click Add to break down variable pay.</p>
            )}
            <div className="space-y-2">
              {plan.components.map((c) => (
                <div key={c.id} className="flex gap-2 items-center">
                  <input
                    value={c.name}
                    onChange={(e) => updateComponent(c.id, { name: e.target.value })}
                    className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1175CC]"
                    placeholder="e.g. Monthly Commission"
                  />
                  <select
                    value={c.type}
                    onChange={(e) => updateComponent(c.id, { type: e.target.value as CompPlanComponent['type'] })}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1175CC]"
                  >
                    <option value="commission">Commission</option>
                    <option value="bonus">Bonus</option>
                    <option value="spiff">SPIF</option>
                    <option value="other">Other</option>
                  </select>
                  <select
                    value={c.frequency}
                    onChange={(e) => updateComponent(c.id, { frequency: e.target.value as CompPlanComponent['frequency'] })}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1175CC]"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <input
                      type="number" min={0}
                      value={c.annualTarget || ''}
                      onChange={(e) => updateComponent(c.id, { annualTarget: Number(e.target.value) })}
                      className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 pl-5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1175CC]"
                      placeholder="Annual"
                    />
                  </div>
                  <button onClick={() => removeComponent(c.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
            <textarea
              value={plan.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC] resize-none"
              placeholder="Effective date, quota structure notes, etc."
            />
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
          <button
            onClick={() => onSave(plan)}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: MELD_DARK }}
          >
            Save Plan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import Result Banner ─────────────────────────────────────────────────────

function ImportBanner({ result, onDismiss }: { result: ExcelImportResult & { meldersUpdated?: number }; onDismiss: () => void }) {
  const ok = result.errors.length === 0;
  return (
    <div className="rounded-2xl border p-4 mb-6"
      style={ok ? { background: '#f0fdf4', borderColor: '#bbf7d0' } : { background: '#fff7ed', borderColor: '#fed7aa' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {ok ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />}
          <div>
            <p className={`font-bold text-sm ${ok ? 'text-green-800' : 'text-amber-800'}`}>
              {ok ? `Imported ${result.plans.length} comp plan${result.plans.length !== 1 ? 's' : ''} from ${result.sheetsSeen.length} sheet${result.sheetsSeen.length !== 1 ? 's' : ''}` : 'Import completed with issues'}
            </p>
            {result.sheetsSeen.length > 0 && (
              <p className="text-xs mt-0.5 text-green-700">Sheets: {result.sheetsSeen.join(', ')}</p>
            )}
            {result.meldersUpdated != null && result.meldersUpdated > 0 && (
              <p className="text-xs mt-0.5 text-green-700">{result.meldersUpdated} Melder{result.meldersUpdated !== 1 ? 's' : ''} updated with OAP metric targets</p>
            )}
            {result.warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-700 mt-0.5">⚠ {w}</p>
            ))}
            {result.errors.map((e, i) => (
              <p key={i} className="text-xs text-red-600 mt-0.5">✕ {e}</p>
            ))}
          </div>
        </div>
        <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 flex-shrink-0"><XCircle className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CompPlans({ storage, onSave }: Props) {
  const [editingPlan, setEditingPlan] = useState<CompPlan | null>(null);
  const [activeDept, setActiveDept]   = useState<string>('All');
  const [importResult, setImportResult] = useState<(ExcelImportResult & { meldersUpdated?: number }) | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { salaryVisible, toggleSalary } = useSalaryVisible();
  const masked = !salaryVisible;

  const plans = storage.compPlans ?? [];

  // Departments present in plans, sorted by journey order
  const depts = ['All', ...Array.from(new Set(plans.map((p) => p.department)))
    .sort((a, b) => deptRank(a) - deptRank(b))];

  const visible = activeDept === 'All'
    ? [...plans].sort((a, b) => deptRank(a.department) - deptRank(b.department) || a.roleName.localeCompare(b.roleName))
    : plans.filter((p) => p.department === activeDept)
           .sort((a, b) => a.roleName.localeCompare(b.roleName));

  // Summary stats
  const avgVariable = plans.length > 0
    ? Math.round(plans.reduce((s, p) => s + p.variablePct, 0) / plans.length)
    : 0;
  const totalOTE = plans.reduce((s, p) => s + p.annualOTE, 0);
  const deptCount = new Set(plans.map((p) => p.department)).size;

  function handleSavePlan(plan: CompPlan) {
    onSave((s) => saveCompPlan(s, plan));
    setEditingPlan(null);
  }

  function handleDelete(id: string) {
    if (confirm('Delete this comp plan?')) {
      onSave((s) => deleteCompPlan(s, id));
    }
  }

  function handleFile(file: File) {
    setImporting(true);
    setImportResult(null);
    importCompPlanExcel(file, (result) => {
      let meldersUpdated = 0;
      if (result.plans.length > 0) {
        onSave((s) => {
          let next = s;
          // Save all comp plans
          for (const plan of result.plans) next = saveCompPlan(next, plan);
          // Apply metric targets to matching Melders
          for (const plan of result.plans) {
            if (!plan.melderName && !plan.metricTargets?.length) continue;
            const melder = next.melders.find(
              (m) => plan.melderName && m.name.toLowerCase().includes(plan.melderName.toLowerCase())
            );
            if (!melder) continue;
            const overrides: Record<string, number> = { ...(melder.metricTargetOverrides ?? {}) };
            for (const mt of plan.metricTargets ?? []) {
              overrides[mt.abbreviation] = mt.monthlyTarget;
            }
            const updated = {
              ...melder,
              targetCompensation: plan.annualOTE > 0 ? Math.round(plan.annualOTE / 12) : melder.targetCompensation,
              metricTargetOverrides: overrides,
              updatedAt: new Date().toISOString(),
            };
            next = saveMelder(next, updated);
            meldersUpdated++;
          }
          return next;
        });
      }
      setImportResult({ ...result, meldersUpdated });
      setImporting(false);
    });
  }

  return (
    <div className="min-h-screen" style={{ background: '#F1F1F1' }}>

      {/* Hero */}
      <div
        className="px-8 pt-8 pb-8"
        style={{ background: `linear-gradient(135deg, ${MELD_DARK} 0%, #0d4a6b 60%, ${MELD_BLUE} 100%)` }}
      >
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-[#B0E3FF]" style={{ fontFamily: 'Rubik, sans-serif' }}>
            Property Meld · OTP System
          </p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Comp Plans
              </h1>
              <p className="text-sm text-[#B0E3FF]">Base-to-variable structure by role — the pay mix that bridges market position to performance</p>
            </div>
            <div className="flex gap-3 flex-shrink-0 flex-wrap">
              <button
                onClick={toggleSalary}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/20 text-white hover:bg-white/10 transition-all"
                title={masked ? 'Show salary data' : 'Hide salary data'}
              >
                {masked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {masked ? 'Salaries hidden' : 'Salaries visible'}
              </button>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/20 text-white hover:bg-white/10 transition-all"
              >
                <Download className="w-4 h-4" />
                Template CSV
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/20 text-white hover:bg-white/10 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Import Excel
              </button>
              <button
                onClick={() => setEditingPlan(blankPlan())}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#022935] hover:opacity-90 transition-all"
                style={{ background: '#FFB41B' }}
              >
                <Plus className="w-4 h-4" />
                Add Plan
              </button>
            </div>
          </div>

          {/* Stats */}
          {plans.length > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                { label: 'Comp Plans', value: plans.length.toString() },
                { label: 'Departments',  value: deptCount.toString() },
                { label: 'Avg Variable', value: `${avgVariable}%` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <p className="text-xs font-semibold text-[#B0E3FF] uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-black text-white mt-0.5" style={{ fontFamily: 'Poppins, sans-serif' }}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">

        {importResult && (
          <ImportBanner result={importResult} onDismiss={() => setImportResult(null)} />
        )}

        {importing && (
          <div className="text-center text-slate-500 text-sm animate-pulse mb-6">Parsing your Excel file…</div>
        )}

        {/* Empty state */}
        {plans.length === 0 && !importing && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#eef5fc' }}>
              <FileSpreadsheet className="w-8 h-8" style={{ color: MELD_BLUE }} />
            </div>
            <h3 className="font-bold text-slate-700 text-lg mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>No Comp Plans Yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              Import your existing comp plan Excel files or add plans manually. Each plan defines the base-to-variable split and target OTE for a role.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all hover:bg-slate-50"
                style={{ borderColor: '#e2e8f0', color: '#64748b' }}
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all hover:bg-[#eef5fc]"
                style={{ borderColor: MELD_BLUE, color: MELD_BLUE }}
              >
                <Upload className="w-4 h-4" />
                Import Excel / CSV
              </button>
              <button
                onClick={() => setEditingPlan(blankPlan())}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: MELD_DARK }}
              >
                <Plus className="w-4 h-4" />
                Add Manually
              </button>
            </div>

            {/* Framework reminder */}
            <div className="mt-8 rounded-xl p-4 text-left border max-w-lg mx-auto" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <p className="text-xs font-bold uppercase tracking-widest text-green-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Meld Comp Framework
              </p>
              <ul className="text-sm text-green-800 space-y-1">
                <li><strong>Total Cash target</strong> — 50th percentile (market median)</li>
                <li><strong>Base salary</strong> — 25th–50th percentile by role</li>
                <li><strong>Variable comp</strong> — bridges base to 50th percentile OTE</li>
                <li><strong>Marketing example</strong> — 66% base / <strong>34% variable</strong></li>
              </ul>
            </div>
          </div>
        )}

        {/* Dept tabs */}
        {plans.length > 0 && (
          <>
            <div className="flex gap-2 flex-wrap mb-6">
              {depts.map((d) => (
                <button
                  key={d}
                  onClick={() => setActiveDept(d)}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all"
                  style={activeDept === d
                    ? { borderColor: MELD_BLUE, background: MELD_BLUE, color: 'white' }
                    : { borderColor: '#e2e8f0', background: 'white', color: '#64748b' }
                  }
                >
                  {d}
                  {d !== 'All' && (
                    <span className="ml-1.5 text-xs opacity-70">
                      {plans.filter((p) => p.department === d).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Cards grid */}
            {visible.length === 0 ? (
              <p className="text-slate-400 text-sm">No comp plans for this department.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {visible.map((p) => (
                  <CompPlanCard
                    key={p.id}
                    plan={p}
                    storage={storage}
                    masked={masked}
                    onEdit={() => setEditingPlan(p)}
                    onDelete={() => handleDelete(p.id)}
                  />
                ))}
              </div>
            )}

            {/* Overall mix summary */}
            <div className="mt-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {activeDept === 'All' ? 'Company-Wide Pay Mix' : `${activeDept} Pay Mix`}
              </p>
              <div className="space-y-3">
                {(activeDept === 'All' ? [...DEPT_ORDER].filter((d) => plans.some((p) => p.department === d)) : [activeDept]).map((dept) => {
                  const deptPlans = plans.filter((p) => p.department === dept);
                  if (deptPlans.length === 0) return null;
                  const avgVar = Math.round(deptPlans.reduce((s, p) => s + p.variablePct, 0) / deptPlans.length);
                  return (
                    <div key={dept}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-600">{dept}</span>
                        <span style={{ color: pctColor(avgVar) }} className="font-bold">{avgVar}% variable</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden flex" style={{ background: '#f1f5f9' }}>
                        <div className="h-full rounded-l-full" style={{ width: `${100 - avgVar}%`, background: '#94a3b8' }} />
                        <div className="h-full flex-1 rounded-r-full" style={{ background: pctColor(avgVar) }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Total OTE across all plans</p>
                  <p className="text-xl font-black text-slate-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {masked ? '••••' : (totalOTE > 0 ? fmt$(totalOTE) : '—')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Carta market target</p>
                  <p className="text-sm font-bold text-slate-500">50th percentile Total Cash</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Import note */}
        <div className="mt-6 rounded-xl p-4 border border-slate-200 bg-white">
          <div className="flex gap-3">
            <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-500">
              <strong className="text-slate-600">Excel Import:</strong> Upload any comp plan spreadsheet (.xlsx, .xls, .csv). The importer detects columns for Role, Base, Variable, OTE, and component breakdowns. Multiple sheets are supported — each sheet becomes a separate group. Unrecognized columns appear as warnings.
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />

      {/* Edit modal */}
      {editingPlan && (
        <EditModal
          plan={editingPlan}
          onSave={handleSavePlan}
          onClose={() => setEditingPlan(null)}
        />
      )}
    </div>
  );
}
