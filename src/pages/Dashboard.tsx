import { AlertTriangle, ArrowDownRight, ArrowUpRight, Calculator, ChevronDown, ChevronRight, Edit2, Eye, EyeOff, GraduationCap, PieChart, Plus, Search, Shield, Trash2, TrendingUp, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSalaryVisible } from '../hooks/useSalaryVisible';
import { Link } from 'react-router-dom';
import { HealthBadge } from '../components/shared/HealthBadge';
import { Header } from '../components/layout/Header';
import type { AnnualSnapshot, AppStorage, HealthColor, Melder, MonthlyReport } from '../types';
import { MONTHS } from '../types';
import { aggregateTeamReports, fmtPct } from '../utils/calculations';
import { deleteMelder, saveAnnualSnapshot, saveMelder } from '../utils/storage';

interface Props {
  storage: AppStorage;
  onSave: (updater: (s: AppStorage) => AppStorage) => void;
}

interface MelderForm {
  name: string;
  roleId: string;
  department: string;
  email: string;
  targetCompensation: string;
  marketRate: string;
}

// Latest report per melder
function getLatestReports(_melders: Melder[], reports: MonthlyReport[]): Map<string, MonthlyReport> {
  const map = new Map<string, MonthlyReport>();
  for (const report of reports) {
    const existing = map.get(report.melderId);
    if (!existing || report.year > existing.year || (report.year === existing.year && report.month > existing.month)) {
      map.set(report.melderId, report);
    }
  }
  return map;
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl p-5 text-white bg-gradient-to-br ${color} shadow-md`}>
      <p className="text-white/70 text-sm font-medium">{label}</p>
      <p className="text-3xl font-black mt-1">{value}</p>
      {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
    </div>
  );
}

const healthRank: Record<HealthColor, number> = { red: 0, yellow: 1, green: 2, blue: 3 };

// Customer journey department order
const DEPT_ORDER = [
  'Marketing',
  'Business Development',
  'Business Solutions',
  'Customer Onboarding',
  'Customer Success',
  'Customer Support & Enablement',
  'People Ops',
  'Product',
  'Engineering & Data',
  'Engineering',
];
const deptRank = (name: string) => { const i = DEPT_ORDER.indexOf(name); return i === -1 ? 999 : i; };

// Fallback: infer department from roleId when no snapshot or explicit dept is set
const ROLE_TO_DEPT: Record<string, string> = {
  'MKT-IC1': 'Marketing', 'MKT-IC2': 'Marketing', 'MKT-IC3': 'Marketing', 'MKT-L4': 'Marketing',
  'BDA': 'Business Development', 'BDR': 'Business Development', 'SR-BDR': 'Business Development', 'BD-MGR': 'Business Development',
  'BSE': 'Business Solutions', 'ASSOC-BSE': 'Business Solutions', 'SR-BSE': 'Business Solutions', 'BS-DIR': 'Business Solutions',
  'COM': 'Customer Onboarding',
  'CSM': 'Customer Success', 'MM-CSM': 'Customer Success', 'CS-MGR': 'Customer Success',
  'CSS': 'Customer Support & Enablement', 'CSS-MGR': 'Customer Support & Enablement', 'MMES': 'Customer Support & Enablement',
  'PEOPLE-OPS-MGR': 'People Ops', 'PEOPLE-OPS-IC': 'People Ops',
  'PROD-IC1': 'Product', 'PROD-IC2': 'Product', 'PROD-IC3': 'Product', 'PROD-IC4': 'Product', 'PROD-MGR': 'Product',
  'DATA-MGR': 'Engineering & Data', 'DATA-IC1': 'Engineering & Data', 'DATA-IC2': 'Engineering & Data',
  'DATA-IC3': 'Engineering & Data', 'DATA-IC4': 'Engineering & Data', 'DATA-IC5': 'Engineering & Data',
  'ENG-MGR': 'Engineering', 'ENG-IC1': 'Engineering', 'ENG-IC2': 'Engineering',
  'ENG-IC3': 'Engineering', 'ENG-IC4': 'Engineering', 'ENG-IC5': 'Engineering',
};

const KNOWN_DEPTS = new Set(DEPT_ORDER);

function melderDept(melder: { roleId: string; department?: string }, snapshot?: { team: string }): string {
  // Only accept melder.department if it's a recognized dept name (ignores CSV values like 'OpEx', 'CAC')
  const explicitDept = melder.department && KNOWN_DEPTS.has(melder.department) ? melder.department : undefined;
  return explicitDept ?? snapshot?.team ?? ROLE_TO_DEPT[melder.roleId] ?? 'Other';
}

// Explicit department leader IDs — drives "leader card" styling and sort-first within dept
const DEPT_LEADER_IDS = new Set([
  'melder-madison',             // Marketing
  'melder-elizabeth-greenway',  // Marketing (reports to Madison)
  'melder-nicholas-nagel',      // Business Development
  'melder-john-kearns',        // Business Solutions
  'melder-aaron-seaholm',      // Customer Onboarding
  'melder-anna-torvi',         // Customer Success
  'melder-nathanael-hockley',  // Customer Support & Enablement
  'melder-autumn-hughes',      // People Ops
  'melder-austin-wentz',       // Engineering
  'melder-martin-graham',      // Engineering
  'melder-david-turner',       // Engineering & Data
  'melder-erin-karam',         // Engineering & Data
]);

// Name-based fallback — matches regardless of stored ID (handles CSV imports / localStorage drift)
const DEPT_LEADER_NAMES = new Set([
  'Madison',
  'Elizabeth Greenway', 'Liz Greenway',
  'Nicholas J Nagel', 'Nicholas Nagel', 'Nick Nagel',
  'John Kearns',
  'Aaron Seaholm',
  'Anna Torvi',
  'Nathanael Hockley',
  'Autumn Hughes',
  'Austin Wentz',
  'Martin Graham',
  'David Turner',
  'Erin Karam',
]);

function isLeader(melder: Melder): boolean {
  return DEPT_LEADER_IDS.has(melder.id) || DEPT_LEADER_NAMES.has(melder.name.trim());
}

function isIntern(melder: Melder): boolean {
  return melder.roleId === 'INTERN';
}

// Nickname → canonical seed name for snapshot lookup (lowercased keys)
const NAME_ALIASES: Record<string, string> = {
  'nick nagel':           'nicholas j nagel',
  'nicholas nagel':       'nicholas j nagel',
  'liz greenway':         'elizabeth greenway',
  'jonathan martin':      'jon martin',
  'andrew mcglashan':     'andrew d mcglashan',
  'johnathon bintliff':   'johnathon l bintliff',
  'jonathon bintliff':    'johnathon l bintliff',
};

export function Dashboard({ storage, onSave }: Props) {
  const { melders, reports, roles, annualSnapshots } = storage;
  const [editingMelder, setEditingMelder] = useState<Melder | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<AnnualSnapshot | null>(null);
  const [form, setForm] = useState<MelderForm>({ name: '', roleId: '', department: '', email: '', targetCompensation: '', marketRate: '' });
  const { salaryVisible: showSalary, toggleSalary } = useSalaryVisible();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());

  const toggleDept = (dept: string) =>
    setCollapsedDepts((prev) => {
      const next = new Set(prev);
      next.has(dept) ? next.delete(dept) : next.add(dept);
      return next;
    });

  // Map snapshot by lowercased name for fast lookup (last snapshot wins if duplicate names)
  const snapshotByName = useMemo(() => {
    const map = new Map<string, AnnualSnapshot>();
    for (const s of annualSnapshots) {
      map.set(s.name.toLowerCase().trim(), s);
    }
    return map;
  }, [annualSnapshots]);

  // Resolve a melder's stored name to a snapshot, accounting for nicknames/aliases
  const getSnapshot = (name: string): AnnualSnapshot | undefined => {
    const key = name.toLowerCase().trim();
    return snapshotByName.get(key) ?? snapshotByName.get(NAME_ALIASES[key] ?? '');
  };

  function openEdit(melder: Melder) {
    setEditingMelder(melder);
    setForm({
      name: melder.name,
      roleId: melder.roleId,
      department: KNOWN_DEPTS.has(melder.department ?? '') ? (melder.department ?? '') : '',
      email: melder.email ?? '',
      targetCompensation: melder.targetCompensation > 0 ? String(Math.round(melder.targetCompensation * 12)) : '',
      marketRate: melder.marketRate > 0 ? String(Math.round(melder.marketRate * 12)) : '',
    });
  }

  function handleSaveEdit() {
    if (!editingMelder || !form.name.trim() || !form.roleId) return;
    const updated: Melder = {
      ...editingMelder,
      name: form.name.trim(),
      roleId: form.roleId,
      department: form.department || undefined,
      email: form.email.trim() || undefined,
      targetCompensation: (parseFloat(form.targetCompensation) || 0) / 12,
      marketRate: (parseFloat(form.marketRate) || 0) / 12,
      updatedAt: new Date().toISOString(),
    };
    onSave((s) => saveMelder(s, updated));
    setEditingMelder(null);
  }

  function handleDelete(id: string) {
    onSave((s) => deleteMelder(s, id));
    setDeleteConfirm(null);
  }

  const latestReports = useMemo(() => getLatestReports(melders, reports), [melders, reports]);

  const teamSummary = useMemo(() => {
    const all = Array.from(latestReports.values());
    return aggregateTeamReports(all);
  }, [latestReports]);

  const criticalAlerts = useMemo(() => {
    return Array.from(latestReports.values()).flatMap((r) =>
      r.alerts.filter((a) => a.severity === 'critical').map((a) => ({ ...a, melderName: r.melderName, reportId: r.id, melderId: r.melderId }))
    );
  }, [latestReports]);

  // Compute team OAP trend (latest month avg vs previous month avg)
  const teamMomentum = useMemo(() => {
    const byMonth = new Map<string, number[]>();
    for (const r of reports) {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(r.oapResult.oap);
    }
    const sorted = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));
    if (sorted.length < 2) return null;
    const last = sorted[sorted.length - 1][1];
    const prev = sorted[sorted.length - 2][1];
    const avgLast = last.reduce((s, v) => s + v, 0) / last.length;
    const avgPrev = prev.reduce((s, v) => s + v, 0) / prev.length;
    return { delta: avgLast - avgPrev, avgLast };
  }, [reports]);

  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.fullName]));
  const searchLower = searchQuery.toLowerCase().trim();

  // Sort melders: by department (customer journey order), leaders first, then worst OTP health
  const sortedMelders = useMemo(() => {
    return [...melders].sort((a, b) => {
      const snapA = getSnapshot(a.name);
      const snapB = getSnapshot(b.name);
      const teamA = melderDept(a, snapA);
      const teamB = melderDept(b, snapB);
      const teamCmp = deptRank(teamA) - deptRank(teamB);
      if (teamCmp !== 0) return teamCmp;
      const aLead = isLeader(a), bLead = isLeader(b);
      if (aLead !== bLead) return aLead ? -1 : 1;
      const aIntern = isIntern(a), bIntern = isIntern(b);
      if (aIntern !== bIntern) return aIntern ? 1 : -1;
      const ra = latestReports.get(a.id);
      const rb = latestReports.get(b.id);
      if (!ra && !rb) return 0;
      if (!ra) return 1;
      if (!rb) return -1;
      const worstA = Math.min(healthRank[ra.oapResult.health], healthRank[ra.capResult.health], healthRank[ra.ratioResult.health]);
      const worstB = Math.min(healthRank[rb.oapResult.health], healthRank[rb.capResult.health], healthRank[rb.ratioResult.health]);
      return worstA - worstB;
    }).filter((m) =>
      !searchLower ||
      m.name.toLowerCase().includes(searchLower) ||
      (roleMap[m.roleId] ?? '').toLowerCase().includes(searchLower)
    );
  }, [melders, latestReports, snapshotByName, searchLower, roleMap]);

  // Group sorted melders by department (preserves existing sort order within groups)
  const groupedMelders = useMemo(() => {
    const groups: [string, Melder[]][] = [];
    for (const m of sortedMelders) {
      const snap = getSnapshot(m.name);
      const team = melderDept(m, snap);
      const last = groups[groups.length - 1];
      if (last && last[0] === team) last[1].push(m);
      else groups.push([team, [m]]);
    }
    return groups;
  }, [sortedMelders, snapshotByName]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Header
        title="OTP Dashboard"
        subtitle="Overview of all Melders — sorted by department and OTP health"
        actions={
          <div className="flex gap-2">
            <button
              onClick={toggleSalary}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              title={showSalary ? 'Hide salary data' : 'Show salary data'}
            >
              {showSalary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showSalary ? 'Hide Salary' : 'Show Salary'}
            </button>
            <Link
              to="/melders"
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Melder
            </Link>
            <Link
              to="/calculator"
              className="flex items-center gap-2 px-4 py-2 bg-[#1175CC] text-white text-sm font-medium rounded-xl hover:bg-[#0d62b0] transition-colors"
            >
              <Calculator className="w-4 h-4" />
              New Report
            </Link>
          </div>
        }
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or title…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1175CC] shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Team Summary */}
      {teamSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Melders" value={String(melders.length)} sub={`${latestReports.size} with reports`} color="from-[#1175CC] to-[#0d4a6b]" />
          <StatCard label="Avg OAP" value={fmtPct(teamSummary.avgOAP)} sub="Team outcome attainment" color={teamSummary.oapHealth === 'green' ? 'from-green-500 to-emerald-600' : teamSummary.oapHealth === 'yellow' ? 'from-yellow-500 to-amber-500' : 'from-red-500 to-red-600'} />
          <StatCard label="Avg CAP" value={fmtPct(teamSummary.avgCAP)} sub="Comp attainment" color={teamSummary.capHealth === 'green' ? 'from-green-500 to-emerald-600' : teamSummary.capHealth === 'yellow' ? 'from-yellow-500 to-amber-500' : 'from-red-500 to-red-600'} />
          <StatCard label="Avg Ratio" value={fmtPct(teamSummary.avgRatio)} sub="Market competitiveness" color={teamSummary.ratioHealth === 'green' || teamSummary.ratioHealth === 'blue' ? 'from-green-500 to-emerald-600' : teamSummary.ratioHealth === 'yellow' ? 'from-yellow-500 to-amber-500' : 'from-red-500 to-red-600'} />
        </div>
      )}

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-red-800">Needs Attention ({criticalAlerts.length})</h2>
          </div>
          <div className="space-y-2">
            {criticalAlerts.map((a, i) => (
              <div key={i} className="flex items-start justify-between gap-3 bg-white rounded-xl p-3 border border-red-100">
                <div>
                  <p className="font-semibold text-red-700 text-sm">{a.melderName} — {a.title}</p>
                  <p className="text-red-600 text-xs mt-0.5 opacity-80">{a.description}</p>
                </div>
                <Link
                  to={`/history/${a.melderId}`}
                  className="text-xs text-red-600 font-medium whitespace-nowrap hover:underline"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Momentum + Analytics shortcut */}
      {(teamMomentum || reports.length > 0) && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {teamMomentum && (
            <div
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium ${
                teamMomentum.delta > 0.5
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : teamMomentum.delta < -0.5
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-slate-50 text-slate-600 border border-slate-200'
              }`}
            >
              {teamMomentum.delta > 0.5 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : teamMomentum.delta < -0.5 ? (
                <ArrowDownRight className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              Team OAP{' '}
              {teamMomentum.delta > 0.5
                ? `+${teamMomentum.delta.toFixed(1)}pts`
                : teamMomentum.delta < -0.5
                ? `${teamMomentum.delta.toFixed(1)}pts`
                : 'stable'}{' '}
              month-over-month
            </div>
          )}
          <Link
            to="/analytics"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#eef5fc] text-[#1175CC] border border-[#b8d9f5] hover:bg-[#dceefa] transition-colors ml-auto"
          >
            <PieChart className="w-4 h-4" />
            Team Analytics
          </Link>
        </div>
      )}

      {/* Melder Grid — grouped by department */}
      {melders.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {groupedMelders.map(([dept, deptMelders]) => {
            const collapsed = collapsedDepts.has(dept);
            const deptOaps = deptMelders.map((m) => latestReports.get(m.id)?.oapResult.oap).filter((v): v is number => v !== null && v !== undefined);
            const avgOap = deptOaps.length > 0 ? deptOaps.reduce((s, v) => s + v, 0) / deptOaps.length : null;
            const avgHealth: HealthColor | null = avgOap === null ? null : avgOap >= 110 ? 'blue' : avgOap >= 100 ? 'green' : avgOap >= 90 ? 'yellow' : 'red';
            const healthDot: Record<HealthColor, string> = { blue: 'bg-[#1175CC]', green: 'bg-green-500', yellow: 'bg-yellow-500', red: 'bg-red-500' };
            return (
              <div key={dept}>
                <button
                  onClick={() => toggleDept(dept)}
                  className="w-full flex items-center gap-3 mb-3 group cursor-pointer"
                >
                  {collapsed
                    ? <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                    : <ChevronDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                  }
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap group-hover:text-slate-600 transition-colors">{dept}</h2>
                  {avgOap !== null && avgHealth && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${healthDot[avgHealth]}`} />
                      {avgOap.toFixed(1)}% OAP
                    </span>
                  )}
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs font-medium text-slate-300">{deptMelders.length}</span>
                </button>
                {!collapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {deptMelders.map((melder) => {
                      const report = latestReports.get(melder.id);
                      const melderHistory = reports
                        .filter((r) => r.melderId === melder.id)
                        .sort((a, b) => a.year - b.year || a.month - b.month)
                        .slice(-6);
                      const snapshot = getSnapshot(melder.name);
                      const isLead = isLeader(melder);
                      const isInt = isIntern(melder);
                      return (
                        <MelderCard
                          key={melder.id}
                          melder={melder}
                          report={report}
                          roleName={roleMap[melder.roleId] ?? melder.roleId}
                          sparkReports={melderHistory}
                          snapshot={snapshot}
                          isLead={isLead}
                          isIntern={isInt}
                          onEdit={() => openEdit(melder)}
                          onDelete={() => setDeleteConfirm(melder.id)}
                          onEditSnapshot={() => snapshot && setEditingSnapshot(snapshot)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}


      {/* Edit Melder Modal */}
      {editingMelder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Edit Melder</h2>
              <button onClick={() => setEditingMelder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <FormField label="Name">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]" />
              </FormField>
              <FormField label="Role">
                <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1175CC]">
                  <option value="">— select —</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.id} — {r.fullName}</option>)}
                </select>
                <Link to="/roles" className="text-xs text-[#1175CC] hover:underline mt-1 inline-block">+ Add new role</Link>
              </FormField>
              <FormField label="Department">
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1175CC]">
                  <option value="">— auto (from role) —</option>
                  {DEPT_ORDER.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </FormField>
              <FormField label="Email (optional)">
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Target Comp ($/yr)">
                  <input type="number" value={form.targetCompensation} onChange={(e) => setForm({ ...form, targetCompensation: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]" placeholder="e.g. 108000" />
                </FormField>
                <FormField label="Market Rate ($/yr)">
                  <input type="number" value={form.marketRate} onChange={(e) => setForm({ ...form, marketRate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]" placeholder="e.g. 114000" />
                </FormField>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setEditingMelder(null)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
              <button onClick={handleSaveEdit} disabled={!form.name.trim() || !form.roleId}
                className="px-5 py-2 text-sm font-medium text-white bg-[#1175CC] rounded-xl hover:bg-[#0d62b0] disabled:opacity-40">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quarterly OA Edit Modal */}
      {editingSnapshot && (
        <QuarterlyEditModal
          snapshot={editingSnapshot}
          onSave={(updated) => {
            onSave((s) => saveAnnualSnapshot(s, updated));
            setEditingSnapshot(null);
          }}
          onClose={() => setEditingSnapshot(null)}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Delete this Melder?</h3>
            <p className="text-slate-500 text-sm mb-5">This will also delete all their reports. Cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}

function MelderCard({
  melder,
  report,
  roleName,
  sparkReports,
  snapshot,
  isLead,
  isIntern: isInt,
  onEdit,
  onDelete,
  onEditSnapshot,
}: {
  melder: Melder;
  report?: MonthlyReport;
  roleName: string;
  sparkReports: MonthlyReport[];
  snapshot?: AnnualSnapshot;
  isLead: boolean;
  isIntern: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onEditSnapshot: () => void;
}) {
  const monthLabel = report ? `${MONTHS[report.month - 1]} ${report.year}` : null;

  const cardWrap = isLead
    ? 'bg-white border border-[#0d4a6b]'
    : isInt
      ? 'bg-[#fdf8f0] border border-[#e8c97a]'
      : 'bg-[#f4faff] border border-[#B0E3FF]';
  const headerBg = isLead
    ? 'border-white/10 bg-gradient-to-br from-[#1175CC] to-[#0a3a5c]'
    : isInt
      ? 'border-[#e8c97a]/40 bg-gradient-to-br from-[#fef3c7] to-[#fde68a]'
      : 'border-[#c8e8f8] bg-gradient-to-br from-[#dceefa] to-[#B0E3FF]';
  const nameColor = isLead ? 'text-white' : isInt ? 'text-[#78350f]' : 'text-[#022935]';
  const roleColor = isLead ? 'text-white/70' : isInt ? 'text-[#92400e]/80' : 'text-[#1175CC]/80';
  const chipColor = isLead ? 'text-white/60 bg-white/10' : isInt ? 'text-[#92400e]/60 bg-white/40' : 'text-[#1175CC]/60 bg-white/50';
  const editColor = isLead ? 'text-white/40 hover:text-white hover:bg-white/10' : isInt ? 'text-[#92400e]/40 hover:text-[#78350f] hover:bg-white/60' : 'text-[#1175CC]/40 hover:text-[#1175CC] hover:bg-white/60';
  const deleteColor = isLead ? 'text-white/40 hover:text-red-300 hover:bg-white/10' : isInt ? 'text-[#92400e]/40 hover:text-red-600 hover:bg-red-50' : 'text-[#1175CC]/40 hover:text-red-500 hover:bg-red-50';

  return (
    <div className={`rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow ${cardWrap}`}>
      {/* Card Header */}
      <div className={`px-5 py-4 border-b ${headerBg}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isLead && <Shield className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />}
              {isInt && <GraduationCap className="w-3.5 h-3.5 text-[#92400e]/70 flex-shrink-0" />}
              <h3 className={`font-bold truncate ${nameColor}`}>{melder.name}</h3>
            </div>
            <p className={`text-sm ${roleColor}`}>{roleName}</p>
          </div>
          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            {sparkReports.length >= 2 && (
              <MiniSparkline reports={sparkReports} melderId={melder.id} />
            )}
            {report && (
              <span className={`text-xs px-2 py-1 rounded-lg ${chipColor}`}>
                {monthLabel}
              </span>
            )}
            <button onClick={onEdit} className={`p-1.5 rounded-lg transition-colors ${editColor}`} title="Edit">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className={`p-1.5 rounded-lg transition-colors ${deleteColor}`} title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {report ? (
        <div className="px-5 py-4 space-y-3">
          <MetricRow label="OAP" value={report.oapResult.oap} health={report.oapResult.health} question="Did we deliver to the plan?" />
          <MetricRow label="CAP" value={report.capResult.cap} health={report.capResult.health} question="Did pay reflect delivery?" />
          <MetricRow label="Ratio" value={report.ratioResult.ratio} health={report.ratioResult.health} question="Are we paying competitively?" />

          {/* Alerts */}
          {report.alerts.length > 0 && (
            <div className="pt-1">
              {report.alerts.slice(0, 2).map((a, i) => (
                <div key={i} className={`text-xs px-3 py-1.5 rounded-lg mt-1 ${a.severity === 'critical' ? 'bg-red-50 text-red-700' : a.severity === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                  {a.title}
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <Link
              to={`/history/${melder.id}`}
              className="flex-1 text-center text-xs font-medium text-[#1175CC] bg-[#eef5fc] px-3 py-2 rounded-xl hover:bg-[#dceefa] transition-colors"
            >
              View History
            </Link>
            <Link
              to={`/calculator?melder=${melder.id}`}
              className="flex-1 text-center text-xs font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              New Report
            </Link>
          </div>
        </div>
      ) : (
        <div className="px-5 py-6 text-center">
          <p className="text-slate-400 text-sm mb-3">No reports yet</p>
          <Link
            to={`/calculator?melder=${melder.id}`}
            className="text-xs font-medium text-[#1175CC] bg-[#eef5fc] px-4 py-2 rounded-xl hover:bg-[#dceefa] transition-colors"
          >
            Create First Report
          </Link>
        </div>
      )}

      {/* 2025 Annual Snapshot */}
      {snapshot && (
        <AnnualSnapshotPanel snapshot={snapshot} onEdit={onEditSnapshot} />
      )}
    </div>
  );
}

function MetricRow({ label, value, health, question }: { label: string; value: number; health: HealthColor; question: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</span>
        <p className="text-xs text-slate-400">{question}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-900 text-sm">{value.toFixed(1)}%</span>
        <HealthBadge health={health} size="sm" />
      </div>
    </div>
  );
}

// ── Annual Snapshot Panel ────────────────────────────────────────────────────────

const QTR_COLORS = {
  good:  { bar: '#22c55e', text: '#16a34a' },
  ok:    { bar: '#f59e0b', text: '#b45309' },
  low:   { bar: '#ef4444', text: '#b91c1c' },
  none:  { bar: '#e2e8f0', text: '#94a3b8' },
};

function qtrColor(v: number | null) {
  if (v === null) return QTR_COLORS.none;
  if (v >= 100) return QTR_COLORS.good;
  if (v >= 85)  return QTR_COLORS.ok;
  return QTR_COLORS.low;
}

function fmt$(n: number | null) {
  if (n === null) return '—';
  return '$' + (n >= 1000 ? (n / 1000).toFixed(0) + 'k' : n.toFixed(0));
}

function AnnualSnapshotPanel({ snapshot, onEdit }: { snapshot: AnnualSnapshot; onEdit: () => void }) {
  const { salaryVisible } = useSalaryVisible();
  const qtrs: { label: string; val: number | null }[] = [
    { label: 'Q1', val: snapshot.q1Oa },
    { label: 'Q2', val: snapshot.q2Oa },
    { label: 'Q3', val: snapshot.q3Oa },
    { label: 'Q4', val: snapshot.q4Oa },
  ];
  const maxVal = Math.max(...qtrs.map((q) => q.val ?? 0), 130);

  return (
    <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/60">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {snapshot.year} Annual
          </span>
          {snapshot.team && (
            <span className="text-[10px] text-slate-300">· {snapshot.team}</span>
          )}
        </div>
        <button
          onClick={onEdit}
          className="text-[10px] font-semibold text-[#1175CC] hover:underline"
          title="Update quarterly OA"
        >
          Update Quarter
        </button>
      </div>

      {/* Quarterly OA bars */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {qtrs.map((q) => {
          const col = qtrColor(q.val);
          const pct = q.val !== null ? Math.min((q.val / maxVal) * 100, 100) : 0;
          return (
            <div key={q.label} className="flex flex-col items-center gap-1">
              <div className="w-full h-10 bg-slate-200 rounded-md overflow-hidden flex items-end">
                <div
                  className="w-full rounded-md transition-all"
                  style={{ height: q.val !== null ? `${pct}%` : '100%', background: col.bar, opacity: q.val !== null ? 1 : 0.25 }}
                />
              </div>
              <span className="text-[10px] font-bold" style={{ color: col.text }}>
                {q.val !== null ? `${q.val.toFixed(0)}%` : '—'}
              </span>
              <span className="text-[9px] text-slate-400 font-medium">{q.label}</span>
            </div>
          );
        })}
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'OAP', value: snapshot.oaPct !== null ? `${snapshot.oaPct.toFixed(1)}%` : '—' },
          { label: 'CAP', value: snapshot.capPct !== null ? `${snapshot.capPct.toFixed(1)}%` : '—' },
          { label: 'Ratio', value: snapshot.compRatio !== null ? `${snapshot.compRatio.toFixed(1)}%` : '—' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-lg px-2 py-1.5 border border-slate-100">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{m.label}</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Compensation detail */}
      {(snapshot.currentSalary !== null || snapshot.marketSalary !== null) && (
        <div className="mt-2 flex gap-2 text-[10px] text-slate-500">
          {snapshot.currentSalary !== null && (
            <span>Salary <strong className="text-slate-700">{salaryVisible ? fmt$(snapshot.currentSalary) : '$••••'}</strong></span>
          )}
          {snapshot.marketSalary !== null && (
            <span className="ml-auto">Market <strong className="text-slate-700">{salaryVisible ? fmt$(snapshot.marketSalary) : '$••••'}</strong></span>
          )}
        </div>
      )}
      {snapshot.tenure && (
        <div className="mt-1 text-[10px] text-slate-400">
          Tenure <strong className="text-slate-600">{snapshot.tenure}</strong>
        </div>
      )}
    </div>
  );
}

// ── Quarterly Edit Modal ─────────────────────────────────────────────────────────

function QuarterlyEditModal({
  snapshot,
  onSave,
  onClose,
}: {
  snapshot: AnnualSnapshot;
  onSave: (updated: AnnualSnapshot) => void;
  onClose: () => void;
}) {
  const [q1, setQ1] = useState(snapshot.q1Oa !== null ? String(snapshot.q1Oa) : '');
  const [q2, setQ2] = useState(snapshot.q2Oa !== null ? String(snapshot.q2Oa) : '');
  const [q3, setQ3] = useState(snapshot.q3Oa !== null ? String(snapshot.q3Oa) : '');
  const [q4, setQ4] = useState(snapshot.q4Oa !== null ? String(snapshot.q4Oa) : '');

  function toNum(s: string): number | null {
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  function handleSave() {
    const updated: AnnualSnapshot = {
      ...snapshot,
      q1Oa: toNum(q1),
      q2Oa: toNum(q2),
      q3Oa: toNum(q3),
      q4Oa: toNum(q4),
      // Recalculate annual OAP as average of available quarters
      oaPct: (() => {
        const vals = [toNum(q1), toNum(q2), toNum(q3), toNum(q4)].filter((v): v is number => v !== null);
        return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : snapshot.oaPct;
      })(),
    };
    onSave(updated);
  }

  const qFields = [
    { label: 'Q1 OA%', val: q1, set: setQ1 },
    { label: 'Q2 OA%', val: q2, set: setQ2 },
    { label: 'Q3 OA%', val: q3, set: setQ3 },
    { label: 'Q4 OA%', val: q4, set: setQ4 },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">{snapshot.name}</h2>
            <p className="text-xs text-slate-400">{snapshot.year} · {snapshot.team} — Update Quarterly OA</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {qFields.map((f) => (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{f.label}</label>
              <input
                type="number"
                value={f.val}
                onChange={(e) => f.set(e.target.value)}
                placeholder="—"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2 text-sm font-medium text-white bg-[#1175CC] rounded-xl hover:bg-[#0d62b0]">
            Save Quarter
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mini OAP Sparkline ──────────────────────────────────────────────────────────
function MiniSparkline({
  reports,
  melderId,
}: {
  reports: MonthlyReport[];
  melderId: string;
}) {
  const vals = reports.map((r) => r.oapResult.oap);
  const W = 68, H = 28, PAD = 2;
  const minV = Math.min(...vals, 70);
  const maxV = Math.max(...vals, 110);
  const range = maxV - minV || 1;

  const pts = vals.map((v, i) => {
    const x = PAD + (vals.length > 1 ? (i / (vals.length - 1)) : 0.5) * (W - PAD * 2);
    const y = PAD + (H - PAD * 2) - ((v - minV) / range) * (H - PAD * 2);
    return [x, y] as [number, number];
  });

  const lastVal = vals[vals.length - 1];
  const prevVal = vals[vals.length - 2] ?? lastVal;
  const trending = lastVal > prevVal + 1 ? 'up' : lastVal < prevVal - 1 ? 'down' : 'flat';
  const color = trending === 'up' ? '#10b981' : trending === 'down' ? '#ef4444' : '#94a3b8';

  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const areaPath = [
    ...pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`),
    `L ${pts[pts.length - 1][0]} ${H - PAD}`,
    `L ${pts[0][0]} ${H - PAD}`,
    'Z',
  ].join(' ');
  const gradId = `sg-${melderId.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg width={W} height={H} aria-label={`OAP trend: ${lastVal.toFixed(1)}%`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r={2.5}
        fill={color}
        stroke="white"
        strokeWidth={1}
      />
    </svg>
  );
}


function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-[#dceefa] flex items-center justify-center mx-auto mb-4">
        <Users className="w-8 h-8 text-[#1175CC]" />
      </div>
      <h2 className="text-xl font-bold text-slate-700 mb-2">No Melders yet</h2>
      <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
        Add your first Melder to start tracking Outcome-to-Pay metrics. You can also import a CSV to add multiple at once.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          to="/melders"
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1175CC] text-white text-sm font-medium rounded-xl hover:bg-[#0d62b0] transition-colors"
        >
          <Users className="w-4 h-4" />
          Add Melder
        </Link>
        <Link
          to="/import"
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          Import CSV
        </Link>
      </div>
    </div>
  );
}
