import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react';
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
import { SEED_REPORTS_2025, SEED_MELDER_MAP } from '../data/seed2025';

interface Props {
  storage: AppStorage;
}

type PeriodFilter = '3' | '6' | '12' | 'all';

// ─── Brand tokens ───────────────────────────────────────────────────────────────
const MELD_BLUE = '#1175CC';
const MELD_DARK = '#022935';
const MELD_LIGHT = '#B0E3FF';

const HEALTH_COLOR: Record<HealthColor, string> = {
  red:    '#ef4444',
  yellow: '#f59e0b',
  green:  '#22c55e',
  blue:   MELD_BLUE,
};

const HEALTH_LABEL: Record<HealthColor, string> = {
  red:    'Below threshold',
  yellow: 'Near threshold',
  green:  'On target',
  blue:   'Above market',
};

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
  sweet_spot: MELD_BLUE,
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

  const isUsingSeed = reports.length === 0;
  const activeReports = isUsingSeed ? SEED_REPORTS_2025 : reports;

  const filteredReports = useMemo(() => {
    if (period === 'all') return activeReports;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - parseInt(period));
    return activeReports.filter((r) => new Date(r.year, r.month - 1) >= cutoff);
  }, [activeReports, period]);

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
          year, month,
          label: `${MONTHS[month - 1].slice(0, 3)} '${String(year).slice(2)}`,
          avgOAP:   rpts.reduce((s, r) => s + r.oapResult.oap,      0) / rpts.length,
          avgCAP:   rpts.reduce((s, r) => s + r.capResult.cap,      0) / rpts.length,
          avgRatio: rpts.reduce((s, r) => s + r.ratioResult.ratio,  0) / rpts.length,
          count: rpts.length,
        };
      });
  }, [filteredReports]);

  const healthDist = useMemo(() => {
    const d = {
      oap:   { red: 0, yellow: 0, green: 0, blue: 0 } as Record<HealthColor, number>,
      cap:   { red: 0, yellow: 0, green: 0, blue: 0 } as Record<HealthColor, number>,
      ratio: { red: 0, yellow: 0, green: 0, blue: 0 } as Record<HealthColor, number>,
    };
    for (const r of latestByMelder) {
      d.oap[r.oapResult.health]++;
      d.cap[r.capResult.health]++;
      d.ratio[r.ratioResult.health]++;
    }
    return d;
  }, [latestByMelder]);

  const alertFreq = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const r of latestByMelder) {
      const seen = new Set<string>();
      for (const a of r.alerts) {
        if (!seen.has(a.type)) { freq[a.type] = (freq[a.type] || 0) + 1; seen.add(a.type); }
      }
    }
    return Object.entries(freq).sort(([, a], [, b]) => b - a);
  }, [latestByMelder]);

  const teamSummary = useMemo(() => aggregateTeamReports(latestByMelder), [latestByMelder]);

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
        avgOAP:   rpts.reduce((s, r) => s + r.oapResult.oap,     0) / rpts.length,
        avgCAP:   rpts.reduce((s, r) => s + r.capResult.cap,     0) / rpts.length,
        avgRatio: rpts.reduce((s, r) => s + r.ratioResult.ratio, 0) / rpts.length,
        count: rpts.length,
      }))
      .sort((a, b) => b.avgOAP - a.avgOAP);
  }, [latestByMelder, roles]);

  const trendDeltas = useMemo(() => {
    if (monthlyTrends.length < 2) return null;
    const last = monthlyTrends[monthlyTrends.length - 1];
    const prev = monthlyTrends[monthlyTrends.length - 2];
    return {
      oap:   last.avgOAP   - prev.avgOAP,
      cap:   last.avgCAP   - prev.avgCAP,
      ratio: last.avgRatio - prev.avgRatio,
    };
  }, [monthlyTrends]);

  const melderMap = useMemo(
    () => ({ ...SEED_MELDER_MAP, ...Object.fromEntries(melders.map((m) => [m.id, m])) }),
    [melders]
  );

  return (
    <div className="min-h-screen" style={{ background: '#F1F1F1' }}>

      {/* ── Hero ── */}
      <div
        className="px-8 pt-8 pb-8"
        style={{ background: `linear-gradient(135deg, ${MELD_DARK} 0%, #0d4a6b 60%, ${MELD_BLUE} 100%)` }}
      >
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MELD_LIGHT, fontFamily: 'Rubik, sans-serif' }}>
            Property Meld · OTP System
          </p>

          {/* Title row */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Analytics
              </h1>
              <p className="text-sm" style={{ color: MELD_LIGHT }}>
                {isUsingSeed
                  ? <>2025 Annual Review baseline · {latestByMelder.length} Melders · <Link to="/calculator" className="underline decoration-dotted opacity-70 hover:opacity-100">save a report</Link> to switch to live data</>
                  : <>{latestByMelder.length} Melders · {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}{period !== 'all' ? ` · last ${period} months` : ''}</>
                }
              </p>
            </div>

            {/* Period filter */}
            <div className="flex gap-1 p-1 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
              {(['3', '6', '12', 'all'] as PeriodFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                  style={period === p
                    ? { background: 'white', color: MELD_DARK }
                    : { color: 'rgba(176,227,255,0.65)' }
                  }
                >
                  {p === 'all' ? 'All Time' : `${p}mo`}
                </button>
              ))}
            </div>
          </div>

          {/* Team Pulse — three metric cards in hero */}
          {teamSummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PulseCard
                abbreviation="OAP"
                label="Avg Outcome Attainment"
                question="Did the team deliver to plan?"
                value={teamSummary.avgOAP}
                health={teamSummary.oapHealth}
                delta={trendDeltas?.oap}
              />
              <PulseCard
                abbreviation="CAP%"
                label="Avg Compensation Attainment"
                question="Did pay reflect delivery?"
                value={teamSummary.avgCAP}
                health={teamSummary.capHealth}
                delta={trendDeltas?.cap}
              />
              <PulseCard
                abbreviation="Ratio"
                label="Avg Market Ratio"
                question="Are we paying competitively?"
                value={teamSummary.avgRatio}
                health={teamSummary.ratioHealth}
                delta={trendDeltas?.ratio}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">

        {/* Quadrant + Health Distribution */}
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

        {/* Team Trend */}
        {monthlyTrends.length >= 2 && (
          <section>
            <SectionLabel>Team Trend — Month Over Month</SectionLabel>
            <TeamTrendChart trends={monthlyTrends} />
          </section>
        )}

        {/* Alert Frequency + Role Performance */}
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

        {/* At-Risk Roster */}
        <AtRiskRoster reports={latestByMelder} />
      </div>
    </div>
  );
}

// ─── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-bold uppercase tracking-widest mb-3"
      style={{ color: MELD_DARK, fontFamily: 'Poppins, sans-serif', opacity: 0.5 }}
    >
      {children}
    </h2>
  );
}

// ─── Team Pulse Card (lives in hero) ──────────────────────────────────────────

function PulseCard({
  abbreviation, label, question, value, health, delta,
}: {
  abbreviation: string;
  label: string;
  question: string;
  value: number;
  health: HealthColor;
  delta?: number | null;
}) {
  const color = HEALTH_COLOR[health];
  const isUp = delta != null && delta > 0.5;
  const hasDelta = delta != null && Math.abs(delta) > 0.5;
  const barFill = Math.min((value / 130) * 100, 100);
  const mark90 = (90 / 130) * 100;
  const mark100 = (100 / 130) * 100;

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.16)' }}
    >
      {/* Top row: abbreviation + health badge */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: MELD_LIGHT, fontFamily: 'Rubik, sans-serif' }}>
            {abbreviation}
          </p>
          <p className="text-sm font-semibold text-white leading-tight">{label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(176,227,255,0.55)' }}>{question}</p>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0 ml-2"
          style={{ background: color + '28', border: `1px solid ${color}55` }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-xs font-semibold whitespace-nowrap" style={{ color }}>{HEALTH_LABEL[health]}</span>
        </div>
      </div>

      {/* Value */}
      <div className="flex items-end gap-3">
        <p className="text-4xl font-black leading-none" style={{ color, fontFamily: 'Poppins, sans-serif' }}>
          {value.toFixed(1)}%
        </p>
        {hasDelta && (
          <div
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg mb-0.5"
            style={isUp
              ? { background: 'rgba(34,197,94,0.15)', color: '#4ade80' }
              : { background: 'rgba(239,68,68,0.15)', color: '#f87171' }
            }
          >
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(delta!).toFixed(1)}pts
          </div>
        )}
      </div>

      {/* Progress bar with threshold markers */}
      <div>
        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${barFill}%`, background: color }} />
        </div>
        {/* Tick marks */}
        <div className="relative h-0 pointer-events-none">
          <div className="absolute -top-2 w-0.5 h-3 rounded-full" style={{ left: `${mark90}%`, background: '#f59e0b', opacity: 0.7 }} />
          <div className="absolute -top-2 w-0.5 h-3 rounded-full" style={{ left: `${mark100}%`, background: 'rgba(255,255,255,0.4)' }} />
        </div>
        <div className="flex justify-between text-xs mt-2" style={{ color: 'rgba(176,227,255,0.4)' }}>
          <span>0%</span>
          <span style={{ color: '#f59e0b', opacity: 0.8 }}>90%</span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>100%</span>
          <span>130%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Quadrant Scatter Plot ─────────────────────────────────────────────────────

function QuadrantChart({
  reports, melderMap,
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

  function toX(v: number) { return pad.left + ((Math.min(Math.max(v, AXIS_MIN), AXIS_MAX) - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * iW; }
  function toY(v: number) { return pad.top + iH - ((Math.min(Math.max(v, AXIS_MIN), AXIS_MAX) - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * iH; }

  const qX = toX(90);
  const qY = toY(90);

  function dotColor(r: MonthlyReport): string {
    const types = r.alerts.map((a) => a.type);
    if (types.includes('flight_risk')) return '#ef4444';
    if (types.includes('comp_structure_broken')) return '#f97316';
    if (types.includes('overpaid_underperformer')) return '#f59e0b';
    if (r.alerts.length === 1 && types[0] === 'sweet_spot') return '#22c55e';
    return MELD_BLUE;
  }

  const gridLines = [60, 70, 80, 90, 100, 110, 120, 130];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
        {[
          { color: '#ef4444', label: 'Flight Risk' },
          { color: '#f97316', label: 'Comp Broken' },
          { color: '#f59e0b', label: 'Pay Issue' },
          { color: '#22c55e', label: 'Sweet Spot' },
          { color: MELD_BLUE,  label: 'Other' },
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

          {/* Quadrant fills — use brand-aligned health colors at low opacity */}
          <rect x={qX} y={pad.top} width={iW - (qX - pad.left)} height={qY - pad.top} fill="#f0fdf4" />
          <rect x={qX} y={qY} width={iW - (qX - pad.left)} height={iH - (qY - pad.top)} fill="#fef2f2" />
          <rect x={pad.left} y={pad.top} width={qX - pad.left} height={qY - pad.top} fill="#fffbeb" />
          <rect x={pad.left} y={qY} width={qX - pad.left} height={iH - (qY - pad.top)} fill="#f8fafc" />

          <rect x={pad.left} y={pad.top} width={iW} height={iH} fill="none" stroke="#e2e8f0" strokeWidth={1} />

          {/* Quadrant labels */}
          <text x={(pad.left + qX) / 2} y={pad.top + 16} textAnchor="middle" fontSize={10} fontWeight={700} fill="#d97706">Overpaid vs Output</text>
          <text x={(qX + pad.left + iW) / 2} y={pad.top + 16} textAnchor="middle" fontSize={10} fontWeight={700} fill="#059669">Sweet Spot</text>
          <text x={(pad.left + qX) / 2} y={H - pad.bottom - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill="#94a3b8">Needs Development</text>
          <text x={(qX + pad.left + iW) / 2} y={H - pad.bottom - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill="#ef4444">Flight Risk</text>

          {/* Grid */}
          {gridLines.map((v) => (
            <g key={`g-${v}`}>
              <line x1={pad.left} y1={toY(v)} x2={pad.left + iW} y2={toY(v)} stroke={v === 90 || v === 100 ? '#cbd5e1' : '#f1f5f9'} strokeWidth={v === 90 ? 1.5 : 1} strokeDasharray={v === 90 ? '4 2' : v === 100 ? '2 3' : undefined} clipPath="url(#qc-clip)" />
              <text x={pad.left - 6} y={toY(v) + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{v}%</text>
              <line x1={toX(v)} y1={pad.top} x2={toX(v)} y2={pad.top + iH} stroke={v === 90 || v === 100 ? '#cbd5e1' : '#f1f5f9'} strokeWidth={v === 90 ? 1.5 : 1} strokeDasharray={v === 90 ? '4 2' : v === 100 ? '2 3' : undefined} clipPath="url(#qc-clip)" />
              <text x={toX(v)} y={H - pad.bottom + 16} textAnchor="middle" fontSize={9} fill="#94a3b8">{v}%</text>
            </g>
          ))}

          <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="#64748b">OAP — Outcome Attainment %</text>
          <text x={12} y={H / 2} textAnchor="middle" fontSize={11} fontWeight={600} fill="#64748b" transform={`rotate(-90, 12, ${H / 2})`}>CAP — Comp Attainment %</text>

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
              <g key={r.id} onMouseEnter={() => setHovered(r.id)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
                {isHov && <circle cx={cx} cy={cy} r={13} fill={color} opacity={0.12} />}
                <circle cx={cx} cy={cy} r={isHov ? 7 : 5.5} fill={color} stroke="white" strokeWidth={2} />
                {isHov && (
                  <g>
                    <rect x={tipX} y={tipY} width={134} height={72} rx={7} fill="white" stroke="#e2e8f0" strokeWidth={1} filter="drop-shadow(0 2px 10px rgba(0,0,0,0.14))" />
                    <text x={tipX + 10} y={tipY + 18} fontSize={11} fontWeight={700} fill="#1e293b">{name.length > 16 ? name.slice(0, 15) + '…' : name}</text>
                    <text x={tipX + 10} y={tipY + 34} fontSize={10} fill="#64748b">OAP: {r.oapResult.oap.toFixed(1)}%</text>
                    <text x={tipX + 10} y={tipY + 48} fontSize={10} fill="#64748b">CAP: {r.capResult.cap.toFixed(1)}%</text>
                    <text x={tipX + 10} y={tipY + 62} fontSize={10} fill="#64748b">Ratio: {r.ratioResult.ratio.toFixed(1)}%</text>
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

function HealthDistributionBars({
  dist, total,
}: {
  dist: { oap: Record<HealthColor, number>; cap: Record<HealthColor, number>; ratio: Record<HealthColor, number> };
  total: number;
}) {
  const rows: Array<{ label: string; key: 'oap' | 'cap' | 'ratio'; question: string }> = [
    { label: 'OAP',   key: 'oap',   question: 'Did we deliver?' },
    { label: 'CAP%',  key: 'cap',   question: 'Did pay reflect it?' },
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
                  <span className="text-sm font-bold" style={{ color: MELD_DARK }}>{row.label}</span>
                  <p className="text-xs text-slate-400">{row.question}</p>
                </div>
                <span className="text-xs text-slate-400">{total} melders</span>
              </div>
              {/* Stacked bar */}
              <div className="h-8 flex rounded-xl overflow-hidden gap-px" style={{ background: '#f1f5f9' }}>
                {order.map((health) => {
                  const count = counts[health];
                  if (count === 0) return null;
                  const pct = (count / total) * 100;
                  return (
                    <div
                      key={health}
                      className="flex items-center justify-center text-white text-xs font-bold transition-all"
                      style={{ width: `${pct}%`, background: HEALTH_COLOR[health], minWidth: '22px' }}
                      title={`${HEALTH_LABEL[health]}: ${count} (${pct.toFixed(0)}%)`}
                    >
                      {count}
                    </div>
                  );
                })}
              </div>
              {/* Legend dots */}
              <div className="flex gap-3 mt-2 flex-wrap">
                {order.filter((h) => counts[h] > 0).map((health) => (
                  <div key={health} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: HEALTH_COLOR[health] }} />
                    <span className="text-xs text-slate-500">{counts[health]} {HEALTH_LABEL[health]}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-insight */}
      {total > 0 && (
        <div className="mt-5 p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: MELD_DARK, opacity: 0.5, fontFamily: 'Poppins, sans-serif' }}>Quick Read</p>
          {(() => {
            const onTarget = dist.oap.green + dist.oap.blue;
            const atRisk = dist.oap.red;
            const pct = Math.round((onTarget / total) * 100);
            if (pct >= 80) return <p className="text-xs text-green-700">Strong — {pct}% of Melders meeting or exceeding OAP target.</p>;
            if (atRisk > total / 2) return <p className="text-xs text-red-700">{atRisk} of {total} Melders below OAP threshold — systemic risk.</p>;
            return <p className="text-xs text-amber-700">{100 - pct}% of Melders below OAP target. Review coaching plans.</p>;
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Team Trend Chart ──────────────────────────────────────────────────────────

function TeamTrendChart({ trends }: { trends: Array<{ label: string; avgOAP: number; avgCAP: number; avgRatio: number; count: number }> }) {
  const W = 860, H = 250;
  const pad = { top: 30, right: 30, bottom: 46, left: 52 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;
  const VMIN = 55, VMAX = 135;

  function toX(i: number) { return pad.left + (trends.length > 1 ? (i / (trends.length - 1)) * iW : iW / 2); }
  function toY(v: number) { const c = Math.min(Math.max(v, VMIN), VMAX); return pad.top + iH - ((c - VMIN) / (VMAX - VMIN)) * iH; }
  function makePath(vals: number[]) { return vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)},${toY(v)}`).join(' '); }
  function makeArea(vals: number[]) {
    const pts = vals.map((v, i) => `${toX(i)},${toY(v)}`).join(' L ');
    return `M ${pts} L ${toX(vals.length - 1)},${pad.top + iH} L ${toX(0)},${pad.top + iH} Z`;
  }

  const lines = [
    { key: 'oap',   label: 'Avg OAP',   color: MELD_BLUE,  vals: trends.map((t) => t.avgOAP) },
    { key: 'cap',   label: 'Avg CAP%',  color: '#22c55e',  vals: trends.map((t) => t.avgCAP) },
    { key: 'ratio', label: 'Avg Ratio', color: '#f59e0b',  vals: trends.map((t) => t.avgRatio) },
  ];
  const gridYs = [60, 70, 80, 90, 100, 110, 120];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-400">Team averages per month. Green band = target zone (90–100%).</p>
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
            <clipPath id="tt-clip"><rect x={pad.left} y={pad.top} width={iW} height={iH} /></clipPath>
          </defs>

          <rect x={pad.left} y={toY(100)} width={iW} height={toY(90) - toY(100)} fill="#f0fdf4" opacity={0.7} clipPath="url(#tt-clip)" />

          {gridYs.map((v) => (
            <g key={`tty-${v}`}>
              <line x1={pad.left} y1={toY(v)} x2={pad.left + iW} y2={toY(v)} stroke={v === 90 || v === 100 ? '#94a3b8' : '#f1f5f9'} strokeWidth={v === 90 || v === 100 ? 1.5 : 1} strokeDasharray={v === 90 || v === 100 ? '4 2' : undefined} />
              <text x={pad.left - 6} y={toY(v) + 4} textAnchor="end" fontSize={9} fill={v === 90 || v === 100 ? '#94a3b8' : '#cbd5e1'}>{v}%</text>
            </g>
          ))}

          {trends.map((t, i) => (
            <text key={t.label} x={toX(i)} y={H - pad.bottom + 16} textAnchor="middle" fontSize={9} fill="#94a3b8">{t.label}</text>
          ))}

          {lines.map((l) => <path key={`ta-${l.key}`} d={makeArea(l.vals)} fill={`url(#ttgrad-${l.key})`} clipPath="url(#tt-clip)" />)}
          {lines.map((l) => <path key={`tl-${l.key}`} d={makePath(l.vals)} fill="none" stroke={l.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" clipPath="url(#tt-clip)" />)}
          {lines.map((l) => l.vals.map((v, i) => (
            <circle key={`td-${l.key}-${i}`} cx={toX(i)} cy={toY(v)} r={3.5} fill={l.color} stroke="white" strokeWidth={1.5}>
              <title>{l.label}: {v.toFixed(1)}% ({trends[i].label}, n={trends[i].count})</title>
            </circle>
          )))}
        </svg>
      </div>
    </div>
  );
}

// ─── Alert Frequency Chart ─────────────────────────────────────────────────────

function AlertFrequencyChart({ alerts, total }: { alerts: [string, number][]; total: number }) {
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
      <p className="text-xs text-slate-400 mb-4">Frequency across active Melders. Patterns surface systemic comp or performance issues.</p>
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
                <span className="text-xs text-slate-400">{count} Melder{count !== 1 ? 's' : ''} ({affectedPct}%)</span>
              </div>
              <div className="h-5 rounded-lg overflow-hidden" style={{ background: '#f1f5f9' }}>
                <div className="h-full rounded-lg flex items-center justify-end pr-2 transition-all" style={{ width: `${barPct}%`, background: barColor, minWidth: '24px' }}>
                  {count > 1 && <span className="text-white text-xs font-bold">{count}</span>}
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

function RolePerformanceTable({ roles }: { roles: Array<{ roleId: string; roleName: string; avgOAP: number; avgCAP: number; avgRatio: number; count: number }> }) {
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
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Role</th>
            <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">n</th>
            <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">OAP</th>
            <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">CAP%</th>
            <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Ratio</th>
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
              <td className="px-4 py-3 text-right"><HealthBadge health={getOAPHealth(role.avgOAP)}   label={fmtPct(role.avgOAP)}   size="sm" /></td>
              <td className="px-4 py-3 text-right"><HealthBadge health={getCAPHealth(role.avgCAP)}   label={fmtPct(role.avgCAP)}   size="sm" /></td>
              <td className="px-4 py-3 text-right"><HealthBadge health={getRatioHealth(role.avgRatio)} label={fmtPct(role.avgRatio)} size="sm" /></td>
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
    .sort((a, b) =>
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
                    <span className="text-xs text-slate-400">{r.roleId} · {MONTHS[r.month - 1]} {r.year}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {critical.map((a, i) => (
                      <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">{a.title}</span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{critical[0]?.description}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="hidden sm:flex gap-2 flex-wrap justify-end">
                    <HealthBadge health={r.oapResult.health} label={`OAP ${r.oapResult.oap.toFixed(0)}%`} size="sm" />
                    <HealthBadge health={r.capResult.health} label={`CAP ${r.capResult.cap.toFixed(0)}%`} size="sm" />
                  </div>
                  <Link
                    to={`/history/${r.melderId}`}
                    className="text-xs font-medium px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap"
                    style={{ color: MELD_BLUE, background: '#eef5fc' }}
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

// Suppress unused import warning
type _TS = TeamSummary;
void (undefined as unknown as _TS);
