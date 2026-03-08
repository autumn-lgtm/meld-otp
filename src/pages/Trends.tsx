import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { HealthBadge } from '../components/shared/HealthBadge';
import type { AppStorage, MonthlyReport } from '../types';
import { MONTHS } from '../types';
import { fmtPct } from '../utils/calculations';

interface Props {
  storage: AppStorage;
}

type Metric = 'oap' | 'cap' | 'ratio';

export function Trends({ storage }: Props) {
  const { melders, reports, roles } = storage;
  const [selectedMelder, setSelectedMelder] = useState<string>(melders[0]?.id ?? '');

  const melder = melders.find((m) => m.id === selectedMelder);
  const roleName = roles.find((r) => r.id === melder?.roleId)?.fullName ?? melder?.roleId ?? '';

  const melderReports = reports
    .filter((r) => r.melderId === selectedMelder)
    .sort((a, b) => a.year - b.year || a.month - b.month);

  const metrics: { key: Metric; label: string; color: string }[] = [
    { key: 'oap', label: 'OAP', color: '#1175CC' },
    { key: 'cap', label: 'CAP', color: '#10b981' },
    { key: 'ratio', label: 'Ratio', color: '#f59e0b' },
  ];

  // Momentum: compare most recent 2 months
  const momentum = useMemo(() => {
    if (melderReports.length < 2) return null;
    const last = melderReports[melderReports.length - 1];
    const prev = melderReports[melderReports.length - 2];
    return {
      oap: last.oapResult.oap - prev.oapResult.oap,
      cap: last.capResult.cap - prev.capResult.cap,
      ratio: last.ratioResult.ratio - prev.ratioResult.ratio,
      lastPeriod: `${MONTHS[last.month - 1]} ${last.year}`,
      prevPeriod: `${MONTHS[prev.month - 1]} ${prev.year}`,
    };
  }, [melderReports]);

  function getValue(r: MonthlyReport, metric: Metric): number {
    if (metric === 'oap') return r.oapResult.oap;
    if (metric === 'cap') return r.capResult.cap;
    return r.ratioResult.ratio;
  }

  // SVG chart dimensions
  const chartWidth = 700;
  const chartHeight = 220;
  const padding = { top: 28, right: 24, bottom: 42, left: 52 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  function buildPath(metricKey: Metric): string {
    if (melderReports.length < 2) return '';
    const points = melderReports.map((r, i) => {
      const x = padding.left + (i / (melderReports.length - 1)) * innerW;
      const val = Math.min(getValue(r, metricKey), 150);
      const y = padding.top + innerH - ((val - 0) / 150) * innerH;
      return `${x},${y}`;
    });
    return 'M ' + points.join(' L ');
  }

  function buildDots(metricKey: Metric) {
    return melderReports.map((r, i) => {
      const x = padding.left + (melderReports.length > 1 ? (i / (melderReports.length - 1)) * innerW : innerW / 2);
      const val = Math.min(getValue(r, metricKey), 150);
      const y = padding.top + innerH - ((val - 0) / 150) * innerH;
      return { x, y, val: getValue(r, metricKey), r };
    });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Header
        title="Trends"
        subtitle="Month-over-month performance trajectory"
        actions={
          <select
            value={selectedMelder}
            onChange={(e) => setSelectedMelder(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
          >
            {melders.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        }
      />

      {melders.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-400 text-sm">No Melders added yet.</p>
        </div>
      )}

      {melder && melderReports.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-400 text-sm">No reports for {melder.name} yet. Create one in the Calculator.</p>
        </div>
      )}

      {melder && melderReports.length > 0 && (
        <div className="space-y-6">
          {/* Momentum Cards */}
          {momentum && (
            <div className="grid grid-cols-3 gap-4">
              {(
                [
                  { key: 'oap', label: 'OAP', delta: momentum.oap, color: '#1175CC' },
                  { key: 'cap', label: 'CAP', delta: momentum.cap, color: '#10b981' },
                  { key: 'ratio', label: 'Ratio', delta: momentum.ratio, color: '#f59e0b' },
                ] as const
              ).map(({ key, label, delta, color }) => {
                const isUp = delta > 0.5;
                const isDown = delta < -0.5;
                return (
                  <div key={key} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        {label} Momentum
                      </span>
                      <div
                        className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg ${
                          isUp
                            ? 'bg-green-50 text-green-700'
                            : isDown
                            ? 'bg-red-50 text-red-700'
                            : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        {isUp ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : isDown ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        {isUp ? '+' : ''}{delta.toFixed(1)}pts
                      </div>
                    </div>
                    <p
                      className="text-2xl font-black"
                      style={{ color }}
                    >
                      {getValue(melderReports[melderReports.length - 1], key).toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      vs {momentum.prevPeriod}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-900">{melder.name}</h2>
                <p className="text-sm text-slate-400">{roleName} · {melderReports.length} month{melderReports.length !== 1 ? 's' : ''} of data</p>
              </div>
              <div className="flex gap-4">
                {metrics.map((m) => (
                  <div key={m.key} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: m.color }} />
                    <span className="text-xs font-medium text-slate-600">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <svg width={chartWidth} height={chartHeight} className="max-w-full">
                <defs>
                  <clipPath id="trends-clip">
                    <rect x={padding.left} y={padding.top} width={innerW} height={innerH} />
                  </clipPath>
                </defs>

                {/* Green target zone band (90–100%) */}
                {(() => {
                  const y100 = padding.top + innerH - ((100 / 150) * innerH);
                  const y90 = padding.top + innerH - ((90 / 150) * innerH);
                  return (
                    <rect
                      x={padding.left}
                      y={y100}
                      width={innerW}
                      height={y90 - y100}
                      fill="#f0fdf4"
                      opacity={0.8}
                      clipPath="url(#trends-clip)"
                    />
                  );
                })()}

                {/* Reference lines */}
                {[70, 80, 90, 100, 110, 120].map((yv) => {
                  const cy = padding.top + innerH - ((yv / 150) * innerH);
                  const isMajor = yv === 90 || yv === 100;
                  return (
                    <g key={yv}>
                      <line
                        x1={padding.left}
                        y1={cy}
                        x2={padding.left + innerW}
                        y2={cy}
                        stroke={isMajor ? '#94a3b8' : '#f1f5f9'}
                        strokeWidth={isMajor ? 1.5 : 1}
                        strokeDasharray={isMajor ? '4 2' : undefined}
                      />
                      <text
                        x={padding.left - 6}
                        y={cy + 4}
                        textAnchor="end"
                        fontSize={9}
                        fill={isMajor ? '#94a3b8' : '#cbd5e1'}
                      >
                        {yv}%
                      </text>
                    </g>
                  );
                })}

                {/* Y axis label */}
                <text
                  x={13}
                  y={chartHeight / 2}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#94a3b8"
                  transform={`rotate(-90, 13, ${chartHeight / 2})`}
                >
                  %
                </text>

                {/* X axis labels */}
                {melderReports.map((r, i) => {
                  const x =
                    padding.left +
                    (melderReports.length > 1
                      ? (i / (melderReports.length - 1)) * innerW
                      : innerW / 2);
                  return (
                    <text
                      key={r.id}
                      x={x}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#94a3b8"
                    >
                      {MONTHS[r.month - 1].slice(0, 3)} {String(r.year).slice(2)}
                    </text>
                  );
                })}

                {/* Lines */}
                {metrics.map((m) => (
                  <path
                    key={m.key}
                    d={buildPath(m.key)}
                    fill="none"
                    stroke={m.color}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    clipPath="url(#trends-clip)"
                  />
                ))}

                {/* Dots */}
                {metrics.map((m) =>
                  buildDots(m.key).map((dot, i) => (
                    <circle
                      key={`${m.key}-${i}`}
                      cx={dot.x}
                      cy={dot.y}
                      r={4}
                      fill={m.color}
                      stroke="white"
                      strokeWidth={2}
                    >
                      <title>
                        {m.label}: {dot.val.toFixed(1)}%
                      </title>
                    </circle>
                  ))
                )}
              </svg>
            </div>
          </div>

          {/* Data table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Monthly Detail</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Period</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">OAP</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">CAP</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Ratio</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Alerts</th>
                </tr>
              </thead>
              <tbody>
                {[...melderReports].reverse().map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-700">{MONTHS[r.month - 1]} {r.year}</td>
                    <td className="px-5 py-3">
                      <HealthBadge health={r.oapResult.health} label={fmtPct(r.oapResult.oap)} size="sm" />
                    </td>
                    <td className="px-5 py-3">
                      <HealthBadge health={r.capResult.health} label={fmtPct(r.capResult.cap)} size="sm" />
                    </td>
                    <td className="px-5 py-3">
                      <HealthBadge health={r.ratioResult.health} label={fmtPct(r.ratioResult.ratio)} size="sm" />
                    </td>
                    <td className="px-5 py-3">
                      {r.alerts.length === 0 ? (
                        <span className="text-slate-300 text-xs">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {r.alerts.map((a, i) => (
                            <span
                              key={i}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.severity === 'critical' ? 'bg-red-100 text-red-600' : a.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}
                            >
                              {a.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
