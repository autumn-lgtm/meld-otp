import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSalaryVisible } from '../hooks/useSalaryVisible';
import { useParams } from 'react-router-dom';
import { AlertBanner } from '../components/shared/AlertBanner';
import { HealthBadge } from '../components/shared/HealthBadge';
import { Header } from '../components/layout/Header';
import type { AppStorage, MonthlyReport } from '../types';
import { MONTHS } from '../types';
import { fmtCurrency, fmtPct } from '../utils/calculations';
import { exportReportPDF } from '../utils/pdf';
import { deleteReport } from '../utils/storage';

interface Props {
  storage: AppStorage;
  onSave: (updater: (s: AppStorage) => AppStorage) => void;
}

export function History({ storage, onSave }: Props) {
  const { melderId } = useParams<{ melderId?: string }>();
  const { melders, reports, roles } = storage;
  const { salaryVisible } = useSalaryVisible();

  const [selectedMelder, setSelectedMelder] = useState<string>(melderId ?? '');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const filtered = reports
    .filter((r) => !selectedMelder || r.melderId === selectedMelder)
    .sort((a, b) => b.year - a.year || b.month - a.month);

  async function handleExport(report: MonthlyReport) {
    setExporting(report.id);
    // Render report into hidden div
    try {
      // Use a simplified approach - inject into DOM briefly
      const el = document.createElement('div');
      el.id = `pdf-report-${report.id}`;
      el.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;background:#f1f5f9;padding:32px;';
      el.innerHTML = buildReportHTML(report);
      document.body.appendChild(el);
      await exportReportPDF(`pdf-report-${report.id}`, report);
      document.body.removeChild(el);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Header
        title="Report History"
        subtitle="All saved monthly OTP reports"
        actions={
          <select
            value={selectedMelder}
            onChange={(e) => setSelectedMelder(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
          >
            <option value="">All Melders</option>
            {melders.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        }
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-400 text-sm">No reports found. Create one in the Calculator.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const isExpanded = expandedReport === report.id;
            const roleName = roles.find((r) => r.id === report.roleId)?.fullName ?? report.roleId;

            return (
              <div key={report.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-bold text-slate-900">{report.melderName}</p>
                      <p className="text-xs text-slate-400">{roleName} · {MONTHS[report.month - 1]} {report.year}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3">
                      <Metric label="OAP" value={report.oapResult.oap} health={report.oapResult.health} />
                      <Metric label="CAP" value={report.capResult.cap} health={report.capResult.health} />
                      <Metric label="Ratio" value={report.ratioResult.ratio} health={report.ratioResult.health} />
                    </div>
                    {report.alerts.some((a) => a.severity === 'critical') && (
                      <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-1 rounded-lg">Alert</span>
                    )}
                    <span className="text-slate-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-5 space-y-5">
                    {/* Three metric pills */}
                    <div className="grid grid-cols-3 gap-4">
                      <ReportMetricBox
                        title="OAP"
                        value={report.oapResult.oap}
                        health={report.oapResult.health}
                        sub={`Actual comp: ${salaryVisible ? fmtCurrency(report.actualCompensation) : '$••••'}`}
                      />
                      <ReportMetricBox
                        title="CAP"
                        value={report.capResult.cap}
                        health={report.capResult.health}
                        sub={salaryVisible ? `${fmtCurrency(report.actualCompensation)} / ${fmtCurrency(report.targetCompensation)}` : '$•••• / $••••'}
                      />
                      <ReportMetricBox
                        title="Ratio"
                        value={report.ratioResult.ratio}
                        health={report.ratioResult.health}
                        sub={`Market: ${salaryVisible ? fmtCurrency(report.marketRate) : '$••••'}`}
                      />
                    </div>

                    {/* OAP breakdown */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Metric Breakdown</h4>
                      <div className="space-y-2">
                        {report.oapResult.metricResults.map((r) => (
                          <div key={r.metricId} className="flex items-center justify-between text-sm bg-slate-50 px-4 py-2 rounded-xl">
                            <span className="text-slate-600">{r.metricName}</span>
                            <span className="text-slate-400 text-xs">{r.actual} / {r.target} ({(r.weight * 100).toFixed(0)}% weight)</span>
                            <span className="font-semibold text-slate-800">{fmtPct(r.attainmentPct)} → +{fmtPct(r.weightedContribution)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Alerts */}
                    <AlertBanner alerts={report.alerts} />

                    {/* Notes */}
                    {report.notes && (
                      <div className="text-sm text-slate-500 bg-slate-50 px-4 py-3 rounded-xl">
                        <span className="font-semibold text-slate-700">Notes: </span>{report.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => handleExport(report)}
                        disabled={exporting === report.id}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" />
                        {exporting === report.id ? 'Exporting...' : 'Export PDF'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(report.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <h3 className="font-bold text-slate-900 mb-2">Delete this report?</h3>
            <p className="text-slate-500 text-sm mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
              <button
                onClick={() => { onSave((s) => deleteReport(s, deleteConfirm!)); setDeleteConfirm(null); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, health }: { label: string; value: number; health: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <HealthBadge health={health as any} label={`${value.toFixed(1)}%`} size="sm" />
    </div>
  );
}

function ReportMetricBox({ title, value, health, sub }: { title: string; value: number; health: string; sub: string }) {
  const colors = { red: 'bg-red-50 border-red-200', yellow: 'bg-yellow-50 border-yellow-200', green: 'bg-green-50 border-green-200', blue: 'bg-blue-50 border-blue-200' };
  const textColors = { red: 'text-red-700', yellow: 'text-yellow-700', green: 'text-green-700', blue: 'text-blue-700' };
  const c = colors[health as keyof typeof colors] ?? colors.green;
  const t = textColors[health as keyof typeof textColors] ?? textColors.green;
  return (
    <div className={`rounded-xl border p-4 ${c}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${t}`}>{title}</p>
      <p className={`text-2xl font-black ${t} mt-1`}>{value.toFixed(1)}%</p>
      <p className={`text-xs mt-1 ${t} opacity-70`}>{sub}</p>
    </div>
  );
}

function buildReportHTML(report: MonthlyReport): string {
  return `<div style="font-family:system-ui,sans-serif;color:#1e293b">
    <h1 style="font-size:24px;font-weight:900">${report.melderName} — OTP Report</h1>
    <p style="color:#64748b">${report.roleId} · ${MONTHS[report.month - 1]} ${report.year}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:20px 0">
      <div style="background:#f0fdf4;border:2px solid #34d399;border-radius:12px;padding:16px">
        <p style="font-size:11px;font-weight:700;color:#065f46;margin:0">OAP</p>
        <p style="font-size:32px;font-weight:900;color:#065f46;margin:8px 0">${report.oapResult.oap.toFixed(1)}%</p>
      </div>
      <div style="background:#eff6ff;border:2px solid #60a5fa;border-radius:12px;padding:16px">
        <p style="font-size:11px;font-weight:700;color:#1e40af;margin:0">CAP</p>
        <p style="font-size:32px;font-weight:900;color:#1e40af;margin:8px 0">${report.capResult.cap.toFixed(1)}%</p>
      </div>
      <div style="background:#fefce8;border:2px solid #fbbf24;border-radius:12px;padding:16px">
        <p style="font-size:11px;font-weight:700;color:#92400e;margin:0">Ratio</p>
        <p style="font-size:32px;font-weight:900;color:#92400e;margin:8px 0">${report.ratioResult.ratio.toFixed(1)}%</p>
      </div>
    </div>
    ${report.alerts.map((a) => `<div style="margin-bottom:8px;padding:12px;background:#fef2f2;border-radius:8px"><p style="font-weight:600;margin:0">${a.title}</p><p style="margin:4px 0 0;opacity:0.8">${a.description}</p></div>`).join('')}
  </div>`;
}
