import { AlertTriangle, ArrowDownRight, ArrowUpRight, Calculator, PieChart, TrendingUp, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HealthBadge } from '../components/shared/HealthBadge';
import { Header } from '../components/layout/Header';
import type { AppStorage, HealthColor, Melder, MonthlyReport } from '../types';
import { MONTHS } from '../types';
import { aggregateTeamReports, fmtPct } from '../utils/calculations';

interface Props {
  storage: AppStorage;
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

export function Dashboard({ storage }: Props) {
  const { melders, reports, roles } = storage;

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

  // Team OAP momentum: last month avg vs previous month avg
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
    return {
      delta: last.reduce((s, v) => s + v, 0) / last.length - prev.reduce((s, v) => s + v, 0) / prev.length,
    };
  }, [reports]);

  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.fullName]));

  // Sort melders: by worst health first
  const sortedMelders = useMemo(() => {
    return [...melders].sort((a, b) => {
      const ra = latestReports.get(a.id);
      const rb = latestReports.get(b.id);
      if (!ra && !rb) return 0;
      if (!ra) return 1;
      if (!rb) return -1;
      const worstA = Math.min(healthRank[ra.oapResult.health], healthRank[ra.capResult.health], healthRank[ra.ratioResult.health]);
      const worstB = Math.min(healthRank[rb.oapResult.health], healthRank[rb.capResult.health], healthRank[rb.ratioResult.health]);
      return worstA - worstB;
    });
  }, [melders, latestReports]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Header
        title="OTP Dashboard"
        subtitle="Overview of all Melders — sorted by compensation health"
        actions={
          <Link
            to="/calculator"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Calculator className="w-4 h-4" />
            New Report
          </Link>
        }
      />

      {/* Team Summary */}
      {teamSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Melders" value={String(melders.length)} sub={`${latestReports.size} with reports`} color="from-indigo-500 to-purple-600" />
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
          {teamMomentum && Math.abs(teamMomentum.delta) > 0.5 && (
            <div
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium ${
                teamMomentum.delta > 0
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {teamMomentum.delta > 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              Team OAP {teamMomentum.delta > 0 ? '+' : ''}{teamMomentum.delta.toFixed(1)}pts month-over-month
            </div>
          )}
          <Link
            to="/analytics"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors ml-auto"
          >
            <PieChart className="w-4 h-4" />
            Team Analytics
          </Link>
        </div>
      )}

      {/* Melder Grid */}
      {melders.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedMelders.map((melder) => {
            const report = latestReports.get(melder.id);
            const sparkReports = reports
              .filter((r) => r.melderId === melder.id)
              .sort((a, b) => a.year - b.year || a.month - b.month)
              .slice(-6);
            return (
              <MelderCard
                key={melder.id}
                melder={melder}
                report={report}
                roleName={roleMap[melder.roleId] ?? melder.roleId}
                sparkReports={sparkReports}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function MelderCard({
  melder,
  report,
  roleName,
  sparkReports,
}: {
  melder: Melder;
  report?: MonthlyReport;
  roleName: string;
  sparkReports: MonthlyReport[];
}) {
  const monthLabel = report ? `${MONTHS[report.month - 1]} ${report.year}` : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-slate-900">{melder.name}</h3>
            <p className="text-slate-500 text-sm">{roleName}</p>
          </div>
          <div className="flex items-center gap-2">
            {sparkReports.length >= 2 && (
              <MiniSparkline reports={sparkReports} melderId={melder.id} />
            )}
            {report && (
              <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                {monthLabel}
              </span>
            )}
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
              className="flex-1 text-center text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors"
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
            className="text-xs font-medium text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors"
          >
            Create First Report
          </Link>
        </div>
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

  const pts = vals.map((v, i): [number, number] => [
    PAD + (vals.length > 1 ? (i / (vals.length - 1)) : 0.5) * (W - PAD * 2),
    PAD + (H - PAD * 2) - ((v - minV) / range) * (H - PAD * 2),
  ]);

  const lastVal = vals[vals.length - 1];
  const prevVal = vals[vals.length - 2] ?? lastVal;
  const color =
    lastVal > prevVal + 1 ? '#10b981' : lastVal < prevVal - 1 ? '#ef4444' : '#94a3b8';

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
      <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
        <Users className="w-8 h-8 text-indigo-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-700 mb-2">No Melders yet</h2>
      <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
        Add your first Melder to start tracking Outcome-to-Pay metrics. You can also import a CSV to add multiple at once.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          to="/melders"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
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
