import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
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
type SortKey = 'name' | 'oap' | 'cap' | 'ratio';

// ─── Brand tokens ────────────────────────────────────────────────────────────
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function Analytics({ storage }: Props) {
  const { melders, reports, roles } = storage;
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('oap');
  const [sortAsc, setSortAsc] = useState(false);

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

  const sortedRoster = useMemo(() => {
    const arr = [...latestByMelder];
    arr.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'name') diff = a.melderName.localeCompare(b.melderName);
      else if (sortKey === 'oap')   diff = a.oapResult.oap   - b.oapResult.oap;
      else if (sortKey === 'cap')   diff = a.capResult.cap   - b.capResult.cap;
      else if (sortKey === 'ratio') diff = a.ratioResult.ratio - b.ratioResult.ratio;
      return sortAsc ? diff : -diff;
    });
    return arr;
  }, [latestByMelder, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F1F1F1' }}>

      {/* ── Hero ── */}
      <div
        className="px-8 pt-8 pb-8"
        style={{ background: `linear-gradient(135deg, ${MELD_DARK} 0%, #0d4a6b 60%, ${MELD_BLUE} 100%)` }}
      >
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MELD_LIGHT, fontFamily: 'Rubik, sans-serif' }}>
            Property Meld · OTP System
          </p>

          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Analytics
              </h1>
              <p className="text-sm" style={{ color: MELD_LIGHT }}>
                {isUsingSeed
                  ? <>2025 Annual Review baseline · {latestByMelder.length} Melders · <Link to="/calculator" className="underline decoration-dotted opacity-70 hover:opacity-100">save a report</Link> to use live data</>
                  : <>{latestByMelder.length} Melders · {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}{period !== 'all' ? ` · last ${period} months` : ''}</>
                }
              </p>
            </div>

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

          {/* Compact pulse row */}
          {teamSummary && (
            <div className="grid grid-cols-3 gap-4">
              <PulseCard
                abbreviation="OAP"
                label="Outcome Attainment"
                value={teamSummary.avgOAP}
                health={teamSummary.oapHealth}
                delta={trendDeltas?.oap}
              />
              <PulseCard
                abbreviation="CAP%"
                label="Comp Attainment"
                value={teamSummary.avgCAP}
                health={teamSummary.capHealth}
                delta={trendDeltas?.cap}
              />
              <PulseCard
                abbreviation="Ratio"
                label="Market Ratio"
                value={teamSummary.avgRatio}
                health={teamSummary.ratioHealth}
                delta={trendDeltas?.ratio}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">

        {/* Health Distribution + Role Performance side by side */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <div className="xl:col-span-2">
            <HealthDistributionBars dist={healthDist} total={latestByMelder.length} />
          </div>
          <div className="xl:col-span-3">
            <RolePerformanceTable roles={rolePerf} />
          </div>
        </div>

        {/* Team Trend */}
        {monthlyTrends.length >= 2 && (
          <TeamTrendChart trends={monthlyTrends} />
        )}

        {/* Melder Roster */}
        <MelderRoster
          reports={sortedRoster}
          melderMap={melderMap}
          sortKey={sortKey}
          sortAsc={sortAsc}
          onSort={toggleSort}
        />
      </div>
    </div>
  );
}

// ─── Compact Pulse Card (in hero) ─────────────────────────────────────────────

function PulseCard({
  abbreviation, label, value, health, delta,
}: {
  abbreviation: string;
  label: string;
  value: number;
  health: HealthColor;
  delta?: number | null;
}) {
  const color = HEALTH_COLOR[health];
  const isUp = delta != null && delta > 0.5;
  const hasDelta = delta != null && Math.abs(delta) > 0.5;

  return (
    <div
      className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
      style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.16)' }}
    >
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: MELD_LIGHT, fontFamily: 'Rubik, sans-serif' }}>
          {abbreviation}
        </p>
        <p className="text-xs text-white/60">{label}</p>
      </div>

      <div className="text-right flex items-end gap-2">
        <p className="text-3xl font-black leading-none" style={{ color, fontFamily: 'Poppins, sans-serif' }}>
          {value.toFixed(1)}%
        </p>
        {hasDelta && (
          <div
            className="flex items-center gap-0.5 text-xs font-semibold mb-0.5"
            style={isUp ? { color: '#4ade80' } : { color: '#f87171' }}
          >
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(delta!).toFixed(1)}
          </div>
        )}
      </div>

      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ background: color + '28', border: `1px solid ${color}55` }}
      >
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color }}>{HEALTH_LABEL[health]}</span>
      </div>
    </div>
  );
}

// ─── Health Distribution Bars ─────────────────────────────────────────────────

function HealthDistributionBars({
  dist, total,
}: {
  dist: { oap: Record<HealthColor, number>; cap: Record<HealthColor, number>; ratio: Record<HealthColor, number> };
  total: number;
}) {
  const rows: Array<{ label: string; key: 'oap' | 'cap' | 'ratio' }> = [
    { label: 'OAP',   key: 'oap' },
    { label: 'CAP%',  key: 'cap' },
    { label: 'Ratio', key: 'ratio' },
  ];
  const order: HealthColor[] = ['red', 'yellow', 'green', 'blue'];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full">
      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: MELD_DARK, fontFamily: 'Poppins, sans-serif', opacity: 0.45 }}>
        Health Distribution
      </p>
      <div className="space-y-5">
        {rows.map((row) => {
          const counts = dist[row.key];
          return (
            <div key={row.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold" style={{ color: MELD_DARK }}>{row.label}</span>
                <span className="text-xs text-slate-400">{total} melders</span>
              </div>
              <div className="h-7 flex rounded-xl overflow-hidden gap-px" style={{ background: '#f1f5f9' }}>
                {order.map((health) => {
                  const count = counts[health];
                  if (count === 0) return null;
                  const pct = (count / total) * 100;
                  return (
                    <div
                      key={health}
                      className="flex items-center justify-center text-white text-xs font-bold"
                      style={{ width: `${pct}%`, background: HEALTH_COLOR[health], minWidth: '22px' }}
                      title={`${HEALTH_LABEL[health]}: ${count}`}
                    >
                      {count}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-1.5 flex-wrap">
                {order.filter((h) => counts[h] > 0).map((h) => (
                  <div key={h} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: HEALTH_COLOR[h] }} />
                    <span className="text-[10px] text-slate-400">{counts[h]} {HEALTH_LABEL[h]}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Role Performance Table ───────────────────────────────────────────────────

function RolePerformanceTable({ roles }: { roles: Array<{ roleId: string; roleName: string; avgOAP: number; avgCAP: number; avgRatio: number; count: number }> }) {
  if (roles.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-slate-50">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: MELD_DARK, fontFamily: 'Poppins, sans-serif', opacity: 0.45 }}>
          Performance by Role
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid #f8fafc' }}>
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-400">Role</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400">n</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400">OAP</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400">CAP%</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400">Ratio</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.roleId} className="border-b border-slate-50 hover:bg-slate-50/50">
              <td className="px-5 py-3">
                <p className="font-semibold text-slate-800 text-xs">{role.roleId}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{role.roleName !== role.roleId ? role.roleName : ''}</p>
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

// ─── Team Trend Chart ─────────────────────────────────────────────────────────

function TeamTrendChart({ trends }: { trends: Array<{ label: string; avgOAP: number; avgCAP: number; avgRatio: number; count: number }> }) {
  const W = 820, H = 220;
  const pad = { top: 28, right: 28, bottom: 42, left: 48 };
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
  const gridYs = [70, 80, 90, 100, 110, 120];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: MELD_DARK, fontFamily: 'Poppins, sans-serif', opacity: 0.45 }}>
          Team Trend — Month over Month
        </p>
        <div className="flex gap-4">
          {lines.map((l) => (
            <div key={l.key} className="flex items-center gap-1.5">
              <div className="w-3 h-1 rounded-full" style={{ background: l.color }} />
              <span className="text-[10px] text-slate-500">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg width={W} height={H}>
          <defs>
            {lines.map((l) => (
              <linearGradient key={l.key} id={`ttg-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={l.color} stopOpacity={0.12} />
                <stop offset="100%" stopColor={l.color} stopOpacity={0} />
              </linearGradient>
            ))}
            <clipPath id="tt-clip"><rect x={pad.left} y={pad.top} width={iW} height={iH} /></clipPath>
          </defs>

          <rect x={pad.left} y={toY(100)} width={iW} height={toY(90) - toY(100)} fill="#f0fdf4" opacity={0.6} clipPath="url(#tt-clip)" />

          {gridYs.map((v) => (
            <g key={v}>
              <line x1={pad.left} y1={toY(v)} x2={pad.left + iW} y2={toY(v)} stroke={v === 90 || v === 100 ? '#cbd5e1' : '#f1f5f9'} strokeWidth={1} strokeDasharray={v === 90 || v === 100 ? '3 2' : undefined} />
              <text x={pad.left - 6} y={toY(v) + 4} textAnchor="end" fontSize={9} fill="#cbd5e1">{v}%</text>
            </g>
          ))}

          {trends.map((t, i) => (
            <text key={t.label} x={toX(i)} y={H - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">{t.label}</text>
          ))}

          {lines.map((l) => <path key={`ta-${l.key}`} d={makeArea(l.vals)} fill={`url(#ttg-${l.key})`} clipPath="url(#tt-clip)" />)}
          {lines.map((l) => <path key={`tl-${l.key}`} d={makePath(l.vals)} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" clipPath="url(#tt-clip)" />)}
          {lines.map((l) => l.vals.map((v, i) => (
            <circle key={`td-${l.key}-${i}`} cx={toX(i)} cy={toY(v)} r={3} fill={l.color} stroke="white" strokeWidth={1.5}>
              <title>{l.label}: {v.toFixed(1)}% ({trends[i].label})</title>
            </circle>
          )))}
        </svg>
      </div>
    </div>
  );
}

// ─── Melder Roster ────────────────────────────────────────────────────────────

function MelderRoster({
  reports, melderMap, sortKey, sortAsc, onSort,
}: {
  reports: MonthlyReport[];
  melderMap: Record<string, { name: string }>;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
}) {
  if (reports.length === 0) return null;

  function SortArrow({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="ml-1 opacity-20">↕</span>;
    return <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-50">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: MELD_DARK, fontFamily: 'Poppins, sans-serif', opacity: 0.45 }}>
          Melder Roster — {reports.length} Melders
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #f8fafc' }}>
              <th className="text-left px-5 py-2.5">
                <button className="text-xs font-semibold text-slate-400 hover:text-slate-600" onClick={() => onSort('name')}>
                  Name<SortArrow k="name" />
                </button>
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400">Role</th>
              <th className="text-right px-4 py-2.5">
                <button className="text-xs font-semibold text-slate-400 hover:text-slate-600" onClick={() => onSort('oap')}>
                  OAP<SortArrow k="oap" />
                </button>
              </th>
              <th className="text-right px-4 py-2.5">
                <button className="text-xs font-semibold text-slate-400 hover:text-slate-600" onClick={() => onSort('cap')}>
                  CAP%<SortArrow k="cap" />
                </button>
              </th>
              <th className="text-right px-4 py-2.5">
                <button className="text-xs font-semibold text-slate-400 hover:text-slate-600" onClick={() => onSort('ratio')}>
                  Ratio<SortArrow k="ratio" />
                </button>
              </th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-400">Period</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const name = melderMap[r.melderId]?.name ?? r.melderName;
              return (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/40">
                  <td className="px-5 py-3 font-medium text-slate-800">{name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{r.roleId}</td>
                  <td className="px-4 py-3 text-right">
                    <HealthBadge health={r.oapResult.health} label={fmtPct(r.oapResult.oap)} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <HealthBadge health={r.capResult.health} label={fmtPct(r.capResult.cap)} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <HealthBadge health={r.ratioResult.health} label={fmtPct(r.ratioResult.ratio)} size="sm" />
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-slate-400">
                    {MONTHS[r.month - 1].slice(0, 3)} '{String(r.year).slice(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Suppress unused import warning
type _TS = TeamSummary;
void (undefined as unknown as _TS);
