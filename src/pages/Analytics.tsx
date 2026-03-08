import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, PieChart } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { HealthBadge } from '../components/shared/HealthBadge';
import type { AppStorage, HealthColor, MonthlyReport } from '../types';
import { MONTHS } from '../types';
import {
  aggregateTeamReports,
  fmtPct,
  getCAPHealth,
  getOAPHealth,
  getRatioHealth,
} from '../utils/calculations';
import type { TeamSummary } from '../utils/calculations';

interface Props {
  storage: AppStorage;
}

type PeriodFilter = '3' | '6' | '12' | 'all';

const ALERT_LABELS: Record<string, string> = {
  flight_risk: 'Flight Risk',
  comp_structure_broken: 'Comp Structure Broken',
  overpaid_underperformer: 'Overpaid vs Output',
  sweet_spot: 'Sweet Spot',
  below_market: 'Below Market',
  cap_misaligned: 'CAP Misaligned',
};

const ALERT_BAR_COLORS: Record<string, string> = {
  flight_risk: '#ef4444',
  comp_structure_broken: '#f97316',
  overpaid_underperformer: '#f59e0b',
  sweet_spot: '#1175CC',
  below_market: '#d97706',
  cap_misaligned: '#ea580c',
};

const ALERT_TEXT_COLORS: Record<string, string> = {
  flight_risk: 'text-red-700',
  comp_structure_broken: 'text-orange-700',
  overpaid_underperformer: 'text-amber-700',
  sweet_spot: 'text-blue-700',
  below_market: 'text-amber-700',
  cap_misaligned: 'text-orange-700',
};

// ─── Main Component ────────────────────────────────────────────────────────────

export function Analytics({ storage }: Props) {
  const { melders, reports, roles } = storage;
  const [period, setPeriod] = useState<PeriodFilter>('all');

  const filteredReports = useMemo(() => {
    if (period === 'all') return reports;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - parseInt(period));
    return reports.filter((r) => new Date(r.year, r.month - 1) >= cutoff);
  }, [reports, period]);

  // Latest report per melder within period
  const latestByMelder = useMemo(() => {
    const map = new Map<string, MonthlyReport>();
    for (const r of filteredReports) {
      const ex = map.get(r.melderId);
      if (!ex || r.year > ex.year || (r.year === ex.year && r.month > ex.month)) {
        map.set(r.melderId, r);
      }
    }
    return Array.from(map.values());
  }, [filteredReports]);

  // Monthly team averages for trend chart
  const monthlyTrends = useMemo(() => {
    const byMonth = new Map<string, MonthlyReport[]>();
    for (const r of filteredReports) {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(r);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, rpts]) => {
        const [year, month] = key.split('-').map(Number);
        return {
          year,
          month,
          label: `${MONTHS[month - 1].slice(0, 3)} '${String(year).slice(2)}`,
          avgOAP: rpts.reduce((s, r) => s + r.oapResult.oap, 0) / rpts.length,
          avgCAP: rpts.reduce((s, r) => s + r.capResult.cap, 0) / rpts.length,
          avgRatio: rpts.reduce((s, r) => s + r.ratioResult.ratio, 0) / rpts.length,
          count: rpts.length,
        };
      });
  }, [filteredReports]);

  // Health distribution across latest reports
  const healthDist = useMemo(() => {
    const d = {
      oap: { red: 0, yellow: 0, green: 0, blue: 0 } as Record<HealthColor, number>,
      cap: { red: 0, yellow: 0, green: 0, blue: 0 } as Record<HealthColor, number>,
      ratio: { red: 0, yellow: 0, green: 0, blue: 0 } as Record<HealthColor, number>,
    };
    for (const r of latestByMelder) {
      d.oap[r.oapResult.health]++;
      d.cap[r.capResult.health]++;
      d.ratio[r.ratioResult.health]++;
    }
    return d;
  }, [latestByMelder]);

  // Alert frequency (de-duped per melder)
  const alertFreq = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const r of latestByMelder) {
      const seen = new Set<string>();
      for (const a of r.alerts) {
        if (!seen.has(a.type)) {
          freq[a.type] = (freq[a.type] || 0) + 1;
          seen.add(a.type);
        }
      }
    }
    return Object.entries(freq).sort(([, a], [, b]) => b - a);
  }, [latestByMelder]);

  const teamSummary = useMemo(
    () => aggregateTeamReports(latestByMelder),
    [latestByMelder]
  );

  // Role performance breakdown
  const rolePerf = useMemo(() => {
    const byRole = new Map<string, MonthlyReport[]>();
    for (const r of latestByMelder) {
      if (!byRole.has(r.roleId)) byRole.set(r.roleId, []);
      byRole.get(r.roleId)!.push(r);
    }
    return Array.from(byRole.entries())
      .map(([roleId, rpts]) => ({
        roleId,
        roleName: roles.find((r) => r.id === roleId)?.fullName ?? roleId,
        avgOAP: rpts.reduce((s, r) => s + r.oapResult.oap, 0) / rpts.length,
        avgCAP: rpts.reduce((s, r) => s + r.capResult.cap, 0) / rpts.length,
        avgRatio: rpts.reduce((s, r) => s + r.ratioResult.ratio, 0) / rpts.length,
        count: rpts.length,
      }))
      .sort((a, b) => b.avgOAP - a.avgOAP);
  }, [latestByMelder, roles]);

  // Trend deltas: most recent vs previous month
  const trendDeltas = useMemo(() => {
    if (monthlyTrends.length < 2) return null;
    const last = monthlyTrends[monthlyTrends.length - 1];
    const prev = monthlyTrends[monthlyTrends.length - 2];
    return {
      oap: last.avgOAP - prev.avgOAP,
      cap: last.avgCAP - prev.avgCAP,
      ratio: last.avgRatio - prev.avgRatio,
    };
  }, [monthlyTrends]);

  const melderMap = useMemo(
    () => Object.fromEntries(melders.map((m) => [m.id, m])),
    [melders]
  );

  // ── Empty state ──
  if (melders.length === 0 || reports.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Header title="Analytics" subtitle="Team-wide performance and compensation insights" />
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-[#dceefa] flex items-center justify-center mb-4">
            <PieChart className="w-8 h-8 text-[#1175CC]" />
          </div>
          <h2 className="text-lg font-bold text-slate-700 mb-2">No data yet</h2>
          <p className="text-slate-400 text-sm mb-6 max-w-sm text-center">
            Add Melders and save reports to unlock team-wide analytics, quadrant analysis, and pattern detection.
          </p>
          <Link
            to="/calculator"
            className="px-5 py-2.5 bg-[#1175CC] text-white text-sm font-medium rounded-xl hover:bg-[#0d62b0]"
          >
            Create First Report
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Header
        title="Analytics"
        subtitle={`${latestByMelder.length} Melders · ${filteredReports.length} report${filteredReports.length !== 1 ? 's' : ''}${period !== 'all' ? ` in last ${period} months` : ' all time'}`}
        actions={
          <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
            {(['3', '6', '12', 'all'] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  period === p
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p === 'all' ? 'All Time' : `${p}mo`}
              </button>
            ))}
          </div>
        }
      />

      {/* 1 — Team Pulse */}
      {teamSummary && (
        <section>
          <SectionLabel>Team Pulse — Current State</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PulseCard
              abbreviation="OAP"
              label="Avg Outcome Attainment"
              question="Did the team deliver to plan?"
              value={teamSummary.avgOAP}
              health={teamSummary.oapHealth}
              delta={trendDeltas?.oap}
              accentColor="#1175CC"
            />
            <PulseCard
              abbreviation="CAP"
              label="Avg Compensation Attainment"
              question="Did pay reflect delivery?"
              value={teamSummary.avgCAP}
              health={teamSummary.capHealth}
              delta={trendDeltas?.cap}
              accentColor="#10b981"
            />
            <PulseCard
              abbreviation="Ratio"
              label="Avg Market Ratio"
              question="Are we paying competitively?"
              value={teamSummary.avgRatio}
              health={teamSummary.ratioHealth}
              delta={trendDeltas?.ratio}
              accentColor="#f59e0b"
            />
          </div>
        </section>
      )}

      {/* 2 — Quadrant + Health Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <SectionLabel>Performance vs Pay — Quadrant Analysis</SectionLabel>
          <QuadrantChart reports={latestByMelder} melderMap={melderMap} />
        </div>
        <div className="xl:col-span-2">
          <SectionLabel>Health Distribution</SectionLabel>
          <HealthDistributionBars dist={healthDist} total={latestByMelder.length} />
        </div>
      </div>

      {/* 3 — Team Trend */}
      {monthlyTrends.length >= 2 && (
        <section>
          <SectionLabel>Team Trend — Month Over Month</SectionLabel>
          <TeamTrendChart trends={monthlyTrends} />
        </section>
      )}

      {/* 4 — Alert Breakdown + Role Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <SectionLabel>Alert Pattern Frequency</SectionLabel>
          <AlertFrequencyChart alerts={alertFreq} total={latestByMelder.length} />
        </div>
        <div>
          <SectionLabel>Performance by Role</SectionLabel>
          <RolePerformanceTable roles={rolePerf} />
        </div>
      </div>

      {/* 5 — At-Risk Roster */}
      <AtRiskRoster reports={latestByMelder} />
    </div>
  );
}

// ─── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
      {children}
    </h2>
  );
}

// ─── Team Pulse Card ───────────────────────────────────────────────────────────

const healthGradient: Record<HealthColor, string> = {
  green: 'from-emerald-500 to-green-600',
  yellow: 'from-amber-400 to-yellow-500',
  red: 'from-red-500 to-rose-600',
  blue: 'from-[#1175CC] to-[#0a3d52]',
};

function PulseCard({
  abbreviation,
  label,
  question,
  value,
  health,
  delta,
  accentColor,
}: {
  abbreviation: string;
  label: string;
  question: string;
  value: number;
  health: HealthColor;
  delta?: number | null;
  accentColor: string;
}) {
  const grad = healthGradient[health];
  const isUp = delta != null && delta > 0.5;
  const hasDelta = delta != null && Math.abs(delta) > 0.5;

  // Progress bar: value mapped to 0–130% range
  const barFill = Math.min((value / 130) * 100, 100);
  const target100 = Math.min((100 / 130) * 100, 100);
  const target90 = Math.min((90 / 130) * 100, 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div
        className="h-1.5"
        style={{ background: `linear-gradient(to right, ${accentColor}, ${accentColor}cc)` }}
      />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {abbreviation}
              </span>
              <HealthBadge health={health} size="sm" />
            </div>
            <p className="text-sm font-semibold text-slate-700 leading-tight">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{question}</p>
          </div>
          {hasDelta && (
            <div
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                isUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {isUp ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(delta!).toFixed(1)}pts
            </div>
          )}
        </div>

        <p
          className={`text-4xl font-black bg-gradient-to-br ${grad} bg-clip-text text-transparent`}
        >
          {value.toFixed(1)}%
        </p>

        {/* Progress bar with threshold markers */}
        <div className="mt-4">
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${barFill}%`,
                background: `linear-gradient(to right, ${accentColor}, ${accentColor}bb)`,
              }}
            />
          </div>
          {/* Marker ticks */}
          <div className="relative h-2 -mt-2 pointer-events-none">
            <div
              className="absolute top-0 w-0.5 h-3 bg-amber-400 rounded"
              style={{ left: `${target90}%` }}
              title="90% threshold"
            />
            <div
              className="absolute top-0 w-0.5 h-3 bg-slate-400 rounded"
              style={{ left: `${target100}%` }}
              title="100% target"
            />
          </div>
          <div className="flex justify-between text-xs mt-2">
            <span className="text-slate-300">0%</span>
            <span className="text-amber-400 font-medium">90%</span>
            <span className="text-slate-400 font-medium">100%</span>
            <span className="text-slate-300">130%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quadrant Scatter Plot ─────────────────────────────────────────────────────

function QuadrantChart({
  reports,
  melderMap,
}: {
  reports: MonthlyReport[];
  melderMap: Record<string, { name: string }>;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const W = 520, H = 390;
  const pad = { top: 38, right: 28, bottom: 58, left: 62 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;
  const AXIS_MIN = 55, AXIS_MAX = 135;

  function toX(v: number) {
    return pad.left + ((Math.min(Math.max(v, AXIS_MIN), AXIS_MAX) - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * iW;
  }
  function toY(v: number) {
    return pad.top + iH - ((Math.min(Math.max(v, AXIS_MIN), AXIS_MAX) - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * iH;
  }

  const qX = toX(90); // OAP=90 x-boundary
  const qY = toY(90); // CAP=90 y-boundary

  function dotColor(r: MonthlyReport): string {
    const types = r.alerts.map((a) => a.type);
    if (types.includes('flight_risk')) return '#ef4444';
    if (types.includes('comp_structure_broken')) return '#f97316';
    if (types.includes('overpaid_underperformer')) return '#f59e0b';
    if (r.alerts.length === 1 && types[0] === 'sweet_spot') return '#10b981';
    return '#1175CC';
  }

  const gridLines = [60, 70, 80, 90, 100, 110, 120, 130];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
        {[
          { color: '#ef4444', label: 'Flight Risk' },
          { color: '#f97316', label: 'Comp Broken' },
          { color: '#f59e0b', label: 'Pay Issue' },
          { color: '#10b981', label: 'Sweet Spot' },
          { color: '#1175CC', label: 'Other' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
        <span className="text-xs text-slate-400 ml-auto">Hover a dot for details</span>
      </div>

      <div className="overflow-x-auto">
        <svg width={W} height={H}>
          <defs>
            <clipPath id="qc-clip">
              <rect x={pad.left} y={pad.top} width={iW} height={iH} />
            </clipPath>
          </defs>

          {/* Quadrant zone fills */}
          {/* Sweet Spot: OAP≥90, CAP≥90 — top-right */}
          <rect x={qX} y={pad.top} width={iW - (qX - pad.left)} height={qY - pad.top} fill="#f0fdf4" />
          {/* Flight Risk: OAP≥90, CAP<90 — bottom-right */}
          <rect x={qX} y={qY} width={iW - (qX - pad.left)} height={iH - (qY - pad.top)} fill="#fef2f2" />
          {/* Overpaid: OAP<90, CAP≥90 — top-left */}
          <rect x={pad.left} y={pad.top} width={qX - pad.left} height={qY - pad.top} fill="#fffbeb" />
          {/* Needs Dev: OAP<90, CAP<90 — bottom-left */}
          <rect x={pad.left} y={qY} width={qX - pad.left} height={iH - (qY - pad.top)} fill="#f8fafc" />

          {/* Chart border */}
          <rect
            x={pad.left}
            y={pad.top}
            width={iW}
            height={iH}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1}
          />

          {/* Quadrant labels */}
          <text
            x={(pad.left + qX) / 2}
            y={pad.top + 16}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="#d97706"
          >
            Overpaid vs Output
          </text>
          <text
            x={(qX + pad.left + iW) / 2}
            y={pad.top + 16}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="#059669"
          >
            Sweet Spot
          </text>
          <text
            x={(pad.left + qX) / 2}
            y={H - pad.bottom - 6}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="#94a3b8"
          >
            Needs Development
          </text>
          <text
            x={(qX + pad.left + iW) / 2}
            y={H - pad.bottom - 6}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="#ef4444"
          >
            Flight Risk
          </text>

          {/* Grid lines */}
          {gridLines.map((v) => (
            <g key={`g-${v}`}>
              <line
                x1={pad.left}
                y1={toY(v)}
                x2={pad.left + iW}
                y2={toY(v)}
                stroke={v === 90 || v === 100 ? '#cbd5e1' : '#f1f5f9'}
                strokeWidth={v === 90 ? 1.5 : 1}
                strokeDasharray={v === 90 ? '4 2' : v === 100 ? '2 3' : undefined}
                clipPath="url(#qc-clip)"
              />
              <text x={pad.left - 6} y={toY(v) + 4} textAnchor="end" fontSize={9} fill="#94a3b8">
                {v}%
              </text>
              <line
                x1={toX(v)}
                y1={pad.top}
                x2={toX(v)}
                y2={pad.top + iH}
                stroke={v === 90 || v === 100 ? '#cbd5e1' : '#f1f5f9'}
                strokeWidth={v === 90 ? 1.5 : 1}
                strokeDasharray={v === 90 ? '4 2' : v === 100 ? '2 3' : undefined}
                clipPath="url(#qc-clip)"
              />
              <text
                x={toX(v)}
                y={H - pad.bottom + 16}
                textAnchor="middle"
                fontSize={9}
                fill="#94a3b8"
              >
                {v}%
              </text>
            </g>
          ))}

          {/* Axis titles */}
          <text
            x={W / 2}
            y={H - 6}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill="#64748b"
          >
            OAP — Outcome Attainment %
          </text>
          <text
            x={12}
            y={H / 2}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill="#64748b"
            transform={`rotate(-90, 12, ${H / 2})`}
          >
            CAP — Comp Attainment %
          </text>

          {/* Dots */}
          {reports.map((r) => {
            const cx = toX(r.oapResult.oap);
            const cy = toY(r.capResult.cap);
            const color = dotColor(r);
            const isHov = hovered === r.id;
            const name = melderMap[r.melderId]?.name ?? r.melderName;
            const tipX = cx > W - 150 ? cx - 148 : cx + 14;
            const tipY = cy > H - 80 ? cy - 75 : cy - 36;

            return (
              <g
                key={r.id}
                onMouseEnter={() => setHovered(r.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                {isHov && <circle cx={cx} cy={cy} r={13} fill={color} opacity={0.12} />}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHov ? 7 : 5.5}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                />
                {isHov && (
                  <g>
                    <rect
                      x={tipX}
                      y={tipY}
                      width={134}
                      height={72}
                      rx={7}
                      fill="white"
                      stroke="#e2e8f0"
                      strokeWidth={1}
                      filter="drop-shadow(0 2px 10px rgba(0,0,0,0.14))"
                    />
                    <text x={tipX + 10} y={tipY + 18} fontSize={11} fontWeight={700} fill="#1e293b">
                      {name.length > 16 ? name.slice(0, 15) + '…' : name}
                    </text>
                    <text x={tipX + 10} y={tipY + 34} fontSize={10} fill="#64748b">
                      OAP: {r.oapResult.oap.toFixed(1)}%
                    </text>
                    <text x={tipX + 10} y={tipY + 48} fontSize={10} fill="#64748b">
                      CAP: {r.capResult.cap.toFixed(1)}%
                    </text>
                    <text x={tipX + 10} y={tipY + 62} fontSize={10} fill="#64748b">
                      Ratio: {r.ratioResult.ratio.toFixed(1)}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Health Distribution Bars ──────────────────────────────────────────────────

const HEALTH_COLORS: Record<HealthColor, { bar: string; label: string }> = {
  red: { bar: '#ef4444', label: 'Below threshold' },
  yellow: { bar: '#f59e0b', label: 'Near threshold' },
  green: { bar: '#10b981', label: 'On target' },
  blue: { bar: '#1175CC', label: 'Above market' },
};

function HealthDistributionBars({
  dist,
  total,
}: {
  dist: {
    oap: Record<HealthColor, number>;
    cap: Record<HealthColor, number>;
    ratio: Record<HealthColor, number>;
  };
  total: number;
}) {
  const rows: Array<{ label: string; key: 'oap' | 'cap' | 'ratio'; question: string }> = [
    { label: 'OAP', key: 'oap', question: 'Did we deliver?' },
    { label: 'CAP', key: 'cap', question: 'Did pay reflect it?' },
    { label: 'Ratio', key: 'ratio', question: 'Competitive pay?' },
  ];
  const order: HealthColor[] = ['red', 'yellow', 'green', 'blue'];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full flex flex-col">
      <div className="space-y-6 flex-1">
        {rows.map((row) => {
          const counts = dist[row.key];
          return (
            <div key={row.key}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-bold text-slate-700">{row.label}</span>
                  <p className="text-xs text-slate-400">{row.question}</p>
                </div>
                <span className="text-xs text-slate-400">{total}</span>
              </div>
              {/* Stacked bar */}
              <div className="h-7 flex rounded-lg overflow-hidden gap-px bg-slate-100">
                {order.map((health) => {
                  const count = counts[health];
                  if (count === 0) return null;
                  const pct = (count / total) * 100;
                  return (
                    <div
                      key={health}
                      className="flex items-center justify-center text-white text-xs font-bold"
                      style={{
                        width: `${pct}%`,
                        background: HEALTH_COLORS[health].bar,
                        minWidth: '20px',
                      }}
                      title={`${HEALTH_COLORS[health].label}: ${count} (${pct.toFixed(0)}%)`}
                    >
                      {count}
                    </div>
                  );
                })}
              </div>
              {/* Mini legend */}
              <div className="flex gap-3 mt-1.5 flex-wrap">
                {order
                  .filter((h) => counts[h] > 0)
                  .map((health) => (
                    <div key={health} className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-sm"
                        style={{ background: HEALTH_COLORS[health].bar }}
                      />
                      <span className="text-xs text-slate-500">
                        {counts[health]} {HEALTH_COLORS[health].label}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-insight */}
      {total > 0 && (
        <div className="mt-5 p-3 bg-slate-50 rounded-xl">
          <p className="text-xs font-semibold text-slate-600 mb-1">Quick Read</p>
          {(() => {
            const onTarget = dist.oap.green + dist.oap.blue;
            const atRisk = dist.oap.red;
            const pct = Math.round((onTarget / total) * 100);
            if (pct >= 80)
              return (
                <p className="text-xs text-green-700">
                  Strong — {pct}% of Melders meeting or exceeding OAP target.
                </p>
              );
            if (atRisk > total / 2)
              return (
                <p className="text-xs text-red-700">
                  {atRisk} of {total} Melders below OAP threshold — systemic risk.
                </p>
              );
            return (
              <p className="text-xs text-amber-700">
                {100 - pct}% of Melders below OAP target. Review coaching plans.
              </p>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Team Trend Chart ──────────────────────────────────────────────────────────

function TeamTrendChart({
  trends,
}: {
  trends: Array<{
    label: string;
    avgOAP: number;
    avgCAP: number;
    avgRatio: number;
    count: number;
  }>;
}) {
  const W = 860,
    H = 250;
  const pad = { top: 30, right: 30, bottom: 46, left: 52 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;
  const VMIN = 55,
    VMAX = 135;

  function toX(i: number) {
    return pad.left + (trends.length > 1 ? (i / (trends.length - 1)) * iW : iW / 2);
  }
  function toY(v: number) {
    const clamped = Math.min(Math.max(v, VMIN), VMAX);
    return pad.top + iH - ((clamped - VMIN) / (VMAX - VMIN)) * iH;
  }
  function makePath(vals: number[]) {
    return vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)},${toY(v)}`).join(' ');
  }
  function makeArea(vals: number[]) {
    const pts = vals.map((v, i) => `${toX(i)},${toY(v)}`).join(' L ');
    return `M ${pts} L ${toX(vals.length - 1)},${pad.top + iH} L ${toX(0)},${pad.top + iH} Z`;
  }

  const lines = [
    { key: 'oap', label: 'Avg OAP', color: '#1175CC', vals: trends.map((t) => t.avgOAP) },
    { key: 'cap', label: 'Avg CAP', color: '#10b981', vals: trends.map((t) => t.avgCAP) },
    { key: 'ratio', label: 'Avg Ratio', color: '#f59e0b', vals: trends.map((t) => t.avgRatio) },
  ];
  const gridYs = [60, 70, 80, 90, 100, 110, 120];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-400">
          Team averages per month. Green band = target zone (90–100%).
        </p>
        <div className="flex gap-4">
          {lines.map((l) => (
            <div key={l.key} className="flex items-center gap-1.5">
              <div className="w-4 h-1.5 rounded-full" style={{ background: l.color }} />
              <span className="text-xs font-medium text-slate-600">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg width={W} height={H}>
          <defs>
            {lines.map((l) => (
              <linearGradient key={l.key} id={`ttgrad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={l.color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={l.color} stopOpacity={0.01} />
              </linearGradient>
            ))}
            <clipPath id="tt-clip">
              <rect x={pad.left} y={pad.top} width={iW} height={iH} />
            </clipPath>
          </defs>

          {/* Target zone band (90-100%) */}
          <rect
            x={pad.left}
            y={toY(100)}
            width={iW}
            height={toY(90) - toY(100)}
            fill="#f0fdf4"
            opacity={0.7}
            clipPath="url(#tt-clip)"
          />

          {/* Grid lines */}
          {gridYs.map((v) => (
            <g key={`tty-${v}`}>
              <line
                x1={pad.left}
                y1={toY(v)}
                x2={pad.left + iW}
                y2={toY(v)}
                stroke={v === 90 || v === 100 ? '#94a3b8' : '#f1f5f9'}
                strokeWidth={v === 90 || v === 100 ? 1.5 : 1}
                strokeDasharray={v === 90 || v === 100 ? '4 2' : undefined}
              />
              <text
                x={pad.left - 6}
                y={toY(v) + 4}
                textAnchor="end"
                fontSize={9}
                fill={v === 90 || v === 100 ? '#94a3b8' : '#cbd5e1'}
              >
                {v}%
              </text>
            </g>
          ))}

          {/* X labels */}
          {trends.map((t, i) => (
            <text
              key={t.label}
              x={toX(i)}
              y={H - pad.bottom + 16}
              textAnchor="middle"
              fontSize={9}
              fill="#94a3b8"
            >
              {t.label}
            </text>
          ))}

          {/* Area fills */}
          {lines.map((l) => (
            <path
              key={`ta-${l.key}`}
              d={makeArea(l.vals)}
              fill={`url(#ttgrad-${l.key})`}
              clipPath="url(#tt-clip)"
            />
          ))}

          {/* Lines */}
          {lines.map((l) => (
            <path
              key={`tl-${l.key}`}
              d={makePath(l.vals)}
              fill="none"
              stroke={l.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              clipPath="url(#tt-clip)"
            />
          ))}

          {/* Dots with tooltips */}
          {lines.map((l) =>
            l.vals.map((v, i) => (
              <circle
                key={`td-${l.key}-${i}`}
                cx={toX(i)}
                cy={toY(v)}
                r={3.5}
                fill={l.color}
                stroke="white"
                strokeWidth={1.5}
              >
                <title>
                  {l.label}: {v.toFixed(1)}% ({trends[i].label}, n={trends[i].count})
                </title>
              </circle>
            ))
          )}
        </svg>
      </div>
    </div>
  );
}

// ─── Alert Frequency Chart ─────────────────────────────────────────────────────

function AlertFrequencyChart({
  alerts,
  total,
}: {
  alerts: [string, number][];
  total: number;
}) {
  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-center h-48">
        <p className="text-slate-400 text-sm">No alert patterns detected.</p>
      </div>
    );
  }

  const maxCount = Math.max(...alerts.map(([, c]) => c));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="text-xs text-slate-400 mb-4">
        Frequency across active Melders. Patterns surface systemic comp or performance issues.
      </p>
      <div className="space-y-3">
        {alerts.map(([type, count]) => {
          const label = ALERT_LABELS[type] ?? type;
          const barColor = ALERT_BAR_COLORS[type] ?? '#94a3b8';
          const textColor = ALERT_TEXT_COLORS[type] ?? 'text-slate-700';
          const barPct = (count / maxCount) * 100;
          const affectedPct = Math.round((count / total) * 100);
          return (
            <div key={type}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
                <span className="text-xs text-slate-400">
                  {count} Melder{count !== 1 ? 's' : ''} ({affectedPct}%)
                </span>
              </div>
              <div className="h-5 bg-slate-100 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg flex items-center justify-end pr-2 transition-all"
                  style={{
                    width: `${barPct}%`,
                    background: barColor,
                    minWidth: '24px',
                  }}
                >
                  {count > 1 && (
                    <span className="text-white text-xs font-bold">{count}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Role Performance Table ────────────────────────────────────────────────────

function RolePerformanceTable({
  roles,
}: {
  roles: Array<{
    roleId: string;
    roleName: string;
    avgOAP: number;
    avgCAP: number;
    avgRatio: number;
    count: number;
  }>;
}) {
  if (roles.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-center h-48">
        <p className="text-slate-400 text-sm">No role data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
              Role
            </th>
            <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
              n
            </th>
            <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
              OAP
            </th>
            <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
              CAP
            </th>
            <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
              Ratio
            </th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.roleId} className="border-b border-slate-50 hover:bg-slate-50/50">
              <td className="px-5 py-3">
                <p className="font-semibold text-slate-900">{role.roleId}</p>
                <p className="text-xs text-slate-400 truncate max-w-[140px]">{role.roleName}</p>
              </td>
              <td className="px-4 py-3 text-right text-slate-400 text-xs">{role.count}</td>
              <td className="px-4 py-3 text-right">
                <HealthBadge
                  health={getOAPHealth(role.avgOAP)}
                  label={fmtPct(role.avgOAP)}
                  size="sm"
                />
              </td>
              <td className="px-4 py-3 text-right">
                <HealthBadge
                  health={getCAPHealth(role.avgCAP)}
                  label={fmtPct(role.avgCAP)}
                  size="sm"
                />
              </td>
              <td className="px-4 py-3 text-right">
                <HealthBadge
                  health={getRatioHealth(role.avgRatio)}
                  label={fmtPct(role.avgRatio)}
                  size="sm"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── At-Risk Roster ────────────────────────────────────────────────────────────

function AtRiskRoster({ reports }: { reports: MonthlyReport[] }) {
  const atRisk = reports
    .filter((r) => r.alerts.some((a) => a.severity === 'critical'))
    .sort(
      (a, b) =>
        b.alerts.filter((al) => al.severity === 'critical').length -
        a.alerts.filter((al) => al.severity === 'critical').length
    );

  if (atRisk.length === 0) return null;

  return (
    <section>
      <SectionLabel>At-Risk Roster — Needs Immediate Attention</SectionLabel>
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-bold text-red-700">
            {atRisk.length} Melder{atRisk.length !== 1 ? 's' : ''} with critical alerts
          </span>
        </div>
        <div className="divide-y divide-slate-50">
          {atRisk.map((r) => {
            const critical = r.alerts.filter((a) => a.severity === 'critical');
            return (
              <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <p className="font-bold text-slate-900">{r.melderName}</p>
                    <span className="text-xs text-slate-400">
                      {r.roleId} · {MONTHS[r.month - 1]} {r.year}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {critical.map((a, i) => (
                      <span
                        key={i}
                        className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium"
                      >
                        {a.title}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{critical[0]?.description}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="hidden sm:flex gap-2 flex-wrap justify-end">
                    <HealthBadge
                      health={r.oapResult.health}
                      label={`OAP ${r.oapResult.oap.toFixed(0)}%`}
                      size="sm"
                    />
                    <HealthBadge
                      health={r.capResult.health}
                      label={`CAP ${r.capResult.cap.toFixed(0)}%`}
                      size="sm"
                    />
                  </div>
                  <Link
                    to={`/history/${r.melderId}`}
                    className="text-xs font-medium text-[#1175CC] bg-[#eef5fc] px-3 py-1.5 rounded-xl hover:bg-[#dceefa] transition-colors whitespace-nowrap"
                  >
                    View History →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Suppress unused import warning — TeamSummary used implicitly via aggregateTeamReports return type
type _TS = TeamSummary;
void (undefined as unknown as _TS);
